/**
 * Cookie Consent API Endpoint
 * Syncs cookie consent preferences to Firestore for GDPR audit trail
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { rateLimit } from '@/lib/rateLimiter';
import { ConsentService, CONSENT_TYPES } from '../../../../../lib/services/servicePrivacy/server/consentService.js';

/**
 * POST - Save cookie consent preferences
 * Body: {
 *   categories: {
 *     analytics: boolean,
 *     personalization: boolean
 *   }
 * }
 */
export async function POST(request) {
  try {
    // Create session (includes authentication)
    const session = await createApiSession(request);
    const userId = session.userId;

    // Rate limiting
    if (!rateLimit(userId, 10, 60000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { categories } = body;

    if (!categories || typeof categories !== 'object') {
      return NextResponse.json({ error: 'Invalid categories' }, { status: 400 });
    }

    // Get metadata from session
    const metadata = {
      ipAddress: session.requestMetadata?.ipAddress || null,
      userAgent: session.requestMetadata?.userAgent || null,
    };

    const results = [];

    // Record consent for analytics cookies
    if (categories.analytics !== undefined) {
      const result = await ConsentService.recordConsent(
        userId,
        CONSENT_TYPES.COOKIES_ANALYTICS,
        categories.analytics ? 'granted' : 'withdrawn',
        {
          ...metadata,
          consentText: categories.analytics
            ? 'User accepted analytics cookies'
            : 'User rejected analytics cookies',
        }
      );
      results.push(result);
    }

    // Record consent for personalization cookies
    if (categories.personalization !== undefined) {
      const result = await ConsentService.recordConsent(
        userId,
        CONSENT_TYPES.COOKIES_PERSONALIZATION,
        categories.personalization ? 'granted' : 'withdrawn',
        {
          ...metadata,
          consentText: categories.personalization
            ? 'User accepted personalization cookies'
            : 'User rejected personalization cookies',
        }
      );
      results.push(result);
    }

    console.log(`[CookieConsent] Saved consent for user ${userId}:`, categories);

    return NextResponse.json({
      success: true,
      message: 'Cookie preferences saved successfully',
      results,
    });
  } catch (error) {
    console.error('Error in POST /api/user/privacy/cookies:', error);
    return NextResponse.json(
      { error: 'Failed to save cookie preferences', details: error.message },
      { status: 500 }
    );
  }
}
