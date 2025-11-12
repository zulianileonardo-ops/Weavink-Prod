import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { SettingsService } from '@/lib/services/serviceSetting/server/settingsService';

/**
 * Tutorial Skip API Endpoint
 * POST /api/tutorial/skip
 *
 * Marks tutorial as skipped (user chose not to complete it)
 * Prevents tutorial from showing again
 *
 * Authentication: Required (Firebase Bearer Token)
 *
 * Response:
 * {
 *   success: true,
 *   skipped: true,
 *   skippedAt: "2024-01-15T10:30:00.000Z"
 * }
 */

// Rate limiting map
const rateLimitMap = new Map();

/**
 * Rate limiter
 */
function rateLimit(userId, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];

  const recentRequests = userRequests.filter(
    (timestamp) => now - timestamp < windowMs
  );

  if (recentRequests.length >= maxRequests) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);

  return true;
}

/**
 * POST handler - Skip tutorial
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
      console.warn('⚠️ Invalid origin:', origin);
      return NextResponse.json(
        { error: 'Invalid origin' },
        { status: 403 }
      );
    }

    // ============================================
    // 3. RATE LIMITING
    // ============================================
    if (!rateLimit(session.userId, 5, 60000)) {
      console.warn('⚠️ Rate limit exceeded for user:', session.userId);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    console.log('⏭️ Tutorial skip request:', {
      userId: session.userId,
    });

    // ============================================
    // 4. SKIP TUTORIAL
    // ============================================
    const result = await SettingsService.skipTutorial({
      session,
    });

    console.log('✅ Tutorial skipped successfully:', {
      userId: session.userId,
      skippedAt: result.skippedAt,
    });

    // ============================================
    // 5. RETURN SUCCESS
    // ============================================
    return NextResponse.json({
      success: true,
      skipped: true,
      skippedAt: result.skippedAt,
      message: 'Tutorial skipped successfully',
    });

  } catch (error) {
    console.error('💥 API Error in POST /api/tutorial/skip:', error);

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
