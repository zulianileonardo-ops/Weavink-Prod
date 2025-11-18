// app/api/onboarding/complete/route.js
import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { SettingsService } from '@/lib/services/serviceSetting/server/settingsService';
import { rateLimit } from '@/lib/rateLimiter';

export async function POST(request) {
    try {
        const session = await createApiSession(request);

        // CSRF/Rate limit checks
        const origin = request.headers.get('origin');
        const allowedOrigins = [
            process.env.NEXT_PUBLIC_APP_URL,
            process.env.NEXT_PUBLIC_BASE_URL,
            'http://localhost:3000',
            'http://localhost:3001'
        ];
        if (!allowedOrigins.includes(origin)) {
            return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
        }

        const rateLimitResult = rateLimit(session.userId, {
            maxRequests: 5,
            windowMs: 60000,
            metadata: {
                eventType: 'onboarding_complete',
                userId: session.userId,
                ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
                userAgent: request.headers.get('user-agent') || null,
            }
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
        }

        const body = await request.json();
        const { answers } = body;

        if (!answers) {
            return NextResponse.json(
                { error: 'Missing onboarding answers' },
                { status: 400 }
            );
        }

        // Complete onboarding
        const result = await SettingsService.completeOnboarding({
            answers,
            session
        });

        console.log('✅ Onboarding completed via API for user:', session.userId);

        return NextResponse.json({
            success: true,
            message: 'Onboarding completed successfully',
            completedAt: result.completedAt
        });

    } catch (error) {
        console.error('💥 API Error in POST /api/onboarding/complete:', error.message);

        if (error.message.includes('not found')) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        const status = error.message.includes('Authorization') || error.message.includes('token') ? 401 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}
