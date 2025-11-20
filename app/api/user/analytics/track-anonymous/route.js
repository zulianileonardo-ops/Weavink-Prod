/**
 * Anonymous Analytics Tracking Endpoint
 *
 * Public API endpoint (no authentication required) for anonymous analytics tracking.
 * GDPR Compliant: Legitimate interest basis (Article 6(1)(f)) for system monitoring.
 *
 * Endpoint: POST /api/user/analytics/track-anonymous
 *
 * @module track-anonymous
 */

import { NextResponse } from 'next/server';
import { AnonymousAnalyticsService } from '@/lib/services/serviceUser/server/services/AnonymousAnalyticsService';
import {
  ANONYMOUS_EVENT_TYPES,
  LINK_TYPES,
  ANONYMOUS_ERRORS
} from '@/lib/services/serviceAnalytics/constants/anonymousAnalyticsConstants';
import { translateServerSide } from '@/lib/services/server/translationService';

/**
 * POST /api/user/analytics/track-anonymous
 *
 * Track anonymous analytics event without user identification.
 *
 * This is a PUBLIC endpoint - no authentication required.
 * Follows the same pattern as /api/user/privacy/consent/public/:username
 *
 * Request Body:
 * {
 *   eventType: string,     // Required: 'view' | 'click' | 'share' | 'qr_scan'
 *   linkType?: string,     // Optional: Link type for click events
 *   language?: string      // Optional: User's language for error messages
 * }
 *
 * Response (Success):
 * {
 *   success: true,
 *   tracked: 'anonymous'
 * }
 *
 * Response (Error):
 * {
 *   error: string,
 *   message?: string
 * }
 *
 * @param {Request} request - Next.js request object
 * @returns {Promise<NextResponse>} JSON response
 *
 * @example
 * // Track anonymous view
 * fetch('/api/user/analytics/track-anonymous', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ eventType: 'view' })
 * });
 *
 * @example
 * // Track anonymous click
 * fetch('/api/user/analytics/track-anonymous', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     eventType: 'click',
 *     linkType: 'linkedin'
 *   })
 * });
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { eventType, linkType, language } = body;

    // Default language for error messages
    const userLanguage = language || 'en';

    // Validate required fields
    if (!eventType) {
      const errorMessage = await getTranslatedError(
        ANONYMOUS_ERRORS.MISSING_PARAMETERS,
        userLanguage
      );

      return NextResponse.json(
        {
          error: errorMessage || 'Event type is required',
          code: ANONYMOUS_ERRORS.MISSING_PARAMETERS
        },
        { status: 400 }
      );
    }

    // Validate event type
    if (!Object.values(ANONYMOUS_EVENT_TYPES).includes(eventType)) {
      const errorMessage = await getTranslatedError(
        ANONYMOUS_ERRORS.INVALID_EVENT_TYPE,
        userLanguage
      );

      console.warn(`[AnonymousAnalytics API] Invalid event type: ${eventType}`);

      return NextResponse.json(
        {
          error: errorMessage || 'Invalid event type',
          code: ANONYMOUS_ERRORS.INVALID_EVENT_TYPE,
          validTypes: Object.values(ANONYMOUS_EVENT_TYPES)
        },
        { status: 400 }
      );
    }

    // Validate link type if provided (for click events)
    if (linkType && !Object.values(LINK_TYPES).includes(linkType.toLowerCase())) {
      console.warn(`[AnonymousAnalytics API] Invalid link type: ${linkType}, using 'other'`);
      // Don't reject - just use 'other' as fallback
    }

    // Build metadata object
    const metadata = {};
    if (linkType) {
      metadata.linkType = linkType.toLowerCase();
    }

    // Track the anonymous event
    await AnonymousAnalyticsService.trackEvent(eventType, metadata);

    // Log successful tracking
    console.log(`[AnonymousAnalytics API] ✅ Tracked ${eventType} event anonymously`);

    // Return success response
    return NextResponse.json({
      success: true,
      tracked: 'anonymous',
      eventType: eventType
    });

  } catch (error) {
    // Log error details (but don't expose to client)
    console.error('[AnonymousAnalytics API] ❌ Endpoint error:', error);

    // Return generic error message to client
    const errorMessage = await getTranslatedError(
      ANONYMOUS_ERRORS.DATABASE_ERROR,
      'en'
    );

    return NextResponse.json(
      {
        error: errorMessage || 'Internal server error',
        code: ANONYMOUS_ERRORS.DATABASE_ERROR
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Get translated error message
 *
 * Uses TranslationService to return error messages in user's preferred language.
 * Falls back to English if translation fails.
 *
 * @param {string} errorCode - Error code constant
 * @param {string} language - Language code (en, fr, es, ch, vm)
 * @returns {Promise<string>} Translated error message
 */
async function getTranslatedError(errorCode, language) {
  try {
    // Map error codes to translation keys
    const translationKeyMap = {
      [ANONYMOUS_ERRORS.INVALID_EVENT_TYPE]: 'errors.invalid_event_type',
      [ANONYMOUS_ERRORS.RATE_LIMIT_EXCEEDED]: 'errors.rate_limit_exceeded',
      [ANONYMOUS_ERRORS.DATABASE_ERROR]: 'errors.database_error',
      [ANONYMOUS_ERRORS.INVALID_LINK_TYPE]: 'errors.invalid_link_type',
      [ANONYMOUS_ERRORS.MISSING_PARAMETERS]: 'errors.missing_parameters'
    };

    const translationKey = translationKeyMap[errorCode];

    if (!translationKey) {
      return null;
    }

    return await translateServerSide(translationKey, language);

  } catch (error) {
    console.warn('[AnonymousAnalytics API] Translation failed:', error);
    return null; // Let calling code use fallback
  }
}

/**
 * OPTIONS /api/user/analytics/track-anonymous
 *
 * Handle CORS preflight requests.
 * Required for cross-origin requests from external domains.
 *
 * @returns {NextResponse} CORS headers response
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400' // 24 hours
      }
    }
  );
}

/**
 * GET /api/user/analytics/track-anonymous
 *
 * Method not allowed - only POST is supported.
 *
 * @returns {NextResponse} 405 Method Not Allowed
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests',
      allowedMethods: ['POST']
    },
    {
      status: 405,
      headers: {
        'Allow': 'POST, OPTIONS'
      }
    }
  );
}
