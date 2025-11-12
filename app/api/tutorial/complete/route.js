import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { SettingsService } from '@/lib/services/serviceSetting/server/settingsService';

/**
 * Tutorial Complete API Endpoint
 * POST /api/tutorial/complete
 *
 * Marks user's tutorial as complete and saves completion timestamp
 *
 * Authentication: Required (Firebase Bearer Token)
 *
 * Request Body:
 * {
 *   completedSteps: ["welcome", "navbar", "create_link", ...]
 * }
 *
 * Response:
 * {
 *   success: true,
 *   completedAt: "2024-01-15T10:30:00.000Z"
 * }
 */

// Rate limiting map (in-memory, simple implementation)
const rateLimitMap = new Map();

/**
 * Simple rate limiter
 * @param {string} userId - User ID
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} Whether request is allowed
 */
function rateLimit(userId, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];

  // Filter out requests outside the time window
  const recentRequests = userRequests.filter(
    (timestamp) => now - timestamp < windowMs
  );

  if (recentRequests.length >= maxRequests) {
    return false;
  }

  // Add current request
  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);

  // Clean up old entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.every((timestamp) => now - timestamp > windowMs)) {
        rateLimitMap.delete(key);
      }
    }
  }

  return true;
}

/**
 * POST handler - Mark tutorial as complete
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

    // ============================================
    // 4. PARSE REQUEST BODY
    // ============================================
    const body = await request.json();
    const { completedSteps } = body;

    console.log('✅ Tutorial completion request:', {
      userId: session.userId,
      completedSteps,
    });

    // ============================================
    // 5. COMPLETE TUTORIAL
    // ============================================
    const result = await SettingsService.completeTutorial({
      completedSteps,
      session,
    });

    console.log('✅ Tutorial completed successfully:', {
      userId: session.userId,
      completedAt: result.completedAt,
    });

    // ============================================
    // 6. RETURN SUCCESS
    // ============================================
    return NextResponse.json({
      success: true,
      completedAt: result.completedAt,
      message: 'Tutorial completed successfully',
    });

  } catch (error) {
    console.error('💥 API Error in POST /api/tutorial/complete:', error);

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
