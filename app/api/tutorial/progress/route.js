import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { SettingsService } from '@/lib/services/serviceSetting/server/settingsService';
import { rateLimit } from '@/lib/rateLimiter';

/**
 * Tutorial Progress API Endpoint
 * POST /api/tutorial/progress
 *
 * Saves user's tutorial progress after each step
 * Allows resuming tutorial from last completed step
 *
 * Authentication: Required (Firebase Bearer Token)
 *
 * Request Body:
 * {
 *   currentStep: 2,
 *   completedSteps: ["welcome", "navbar"]
 * }
 *
 * Response:
 * {
 *   success: true,
 *   currentStep: 2,
 *   updatedAt: "2024-01-15T10:30:00.000Z"
 * }
 */

/**
 * POST handler - Save tutorial progress
 */
export async function POST(request) {
  try {
    // ============================================
    // 1. AUTHENTICATION
    // ============================================
    const session = await createApiSession(request);

    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // ============================================
    // 2. CSRF PROTECTION
    // ============================================
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    if (!allowedOrigins.includes(origin)) {
      return NextResponse.json(
        { error: 'Invalid origin' },
        { status: 403 }
      );
    }

    // ============================================
    // 3. RATE LIMITING (Higher limit for progress)
    // ============================================
    const rateLimitResult = rateLimit(session.userId, {
      maxRequests: 20,
      windowMs: 60000,
      metadata: {
        eventType: 'tutorial_progress',
        userId: session.userId,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      }
    });
    if (!rateLimitResult.allowed) {
      console.warn('⚠️ Rate limit exceeded for user:', session.userId);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // ============================================
    // 4. PARSE REQUEST BODY
    // ============================================
    const body = await request.json();
    const { currentStep, completedSteps } = body;

    // Validate input
    if (typeof currentStep !== 'number' || !Array.isArray(completedSteps)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    console.log('📝 Tutorial progress update:', {
      userId: session.userId,
      currentStep,
      completedSteps,
    });

    // ============================================
    // 5. UPDATE PROGRESS
    // ============================================
    const result = await SettingsService.updateTutorialProgress({
      currentStep,
      completedSteps,
      session,
    });

    // ============================================
    // 6. RETURN SUCCESS
    // ============================================
    return NextResponse.json({
      success: true,
      currentStep: result.currentStep,
      updatedAt: result.updatedAt,
    });

  } catch (error) {
    console.error('💥 API Error in POST /api/tutorial/progress:', error);

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
