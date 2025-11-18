/**
 * Consent Management API Endpoint
 * Handles user consent operations for GDPR compliance
 *
 * Routes:
 * - GET: Get current consent status
 * - POST: Grant or withdraw consent
 * - PUT: Update multiple consents at once
 * - DELETE: Withdraw a specific consent
 *
 * Compliance: GDPR Art. 7 (Conditions for consent)
 */

import { NextResponse } from 'next/server';
import { createApiSession, SessionManager } from '@/lib/server/session';
import { rateLimit } from '@/lib/rateLimiter';
import {
  CONSENT_TYPES,
  CONSENT_ACTIONS,
  PRIVACY_PERMISSIONS,
  PRIVACY_RATE_LIMITS,
  PRIVACY_ERROR_MESSAGES,
} from '@/lib/services/constants';
import { ConsentService } from '../../../../../lib/services/servicePrivacy/server/consentService.js';

/**
 * GET - Retrieve user's current consent status or history
 */
export async function GET(request) {
  try {
    // 1. Create session (includes authentication)
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    const userId = session.userId;

    // 2. Permission check
    if (!session.permissions[PRIVACY_PERMISSIONS.CAN_MANAGE_CONSENTS]) {
      return NextResponse.json(
        { error: PRIVACY_ERROR_MESSAGES.PERMISSION_DENIED },
        { status: 403 }
      );
    }

    // 3. Rate limiting
    const { max, window } = PRIVACY_RATE_LIMITS.CONSENT_READ;
    if (!rateLimit(userId, max, window)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const history = searchParams.get('history');
    const consentType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');

    // 4. Check history permission if requesting history
    if (history === 'true') {
      if (!session.permissions[PRIVACY_PERMISSIONS.CAN_VIEW_CONSENT_HISTORY]) {
        return NextResponse.json(
          { error: 'You do not have permission to view consent history' },
          { status: 403 }
        );
      }

      const options = { limit };
      if (consentType) {
        options.consentType = consentType;
      }

      const result = await ConsentService.getConsentHistory(userId, options);
      return NextResponse.json(result);
    }

    // 5. Return current consent status
    const result = await ConsentService.getUserConsents(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [ConsentAPI] Error in GET:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve consent data', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Grant or withdraw consent
 * Body: {
 *   consentType: string (from CONSENT_TYPES),
 *   action: 'granted' | 'withdrawn',
 *   version: string (optional, version of terms/policy),
 *   consentText: string (optional, text of consent)
 * }
 */
export async function POST(request) {
  try {
    // 1. Create session (includes authentication)
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    const userId = session.userId;

    // 2. Permission check
    if (!session.permissions[PRIVACY_PERMISSIONS.CAN_MANAGE_CONSENTS]) {
      return NextResponse.json(
        { error: PRIVACY_ERROR_MESSAGES.PERMISSION_DENIED },
        { status: 403 }
      );
    }

    // 3. Rate limiting
    const { max, window } = PRIVACY_RATE_LIMITS.CONSENT_UPDATES;
    if (!rateLimit(userId, max, window)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    // 4. Validate request body
    const { consentType, action, version, consentText } = body;

    if (!consentType) {
      return NextResponse.json({ error: 'consentType is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    // 5. Validate consent type
    if (!Object.values(CONSENT_TYPES).includes(consentType)) {
      return NextResponse.json(
        { error: PRIVACY_ERROR_MESSAGES.CONSENT_INVALID_TYPE },
        { status: 400 }
      );
    }

    // 6. Validate action
    if (!Object.values(CONSENT_ACTIONS).includes(action)) {
      return NextResponse.json(
        { error: PRIVACY_ERROR_MESSAGES.CONSENT_INVALID_ACTION },
        { status: 400 }
      );
    }

    // 7. Get metadata from session
    const metadata = {
      ipAddress: session.requestMetadata?.ipAddress || null,
      userAgent: session.requestMetadata?.userAgent || null,
      version: version || '1.0',
      consentText: consentText || null,
    };

    // 8. Record consent
    const result = await ConsentService.recordConsent(userId, consentType, action, metadata);

    // 9. Log the consent change
    console.log(`✅ [ConsentAPI] Consent ${action} for user ${userId}: ${consentType}`);

    return NextResponse.json({
      success: true,
      message: `Consent ${action} successfully`,
      data: result,
    });
  } catch (error) {
    console.error('❌ [ConsentAPI] Error in POST:', error);
    return NextResponse.json(
      { error: PRIVACY_ERROR_MESSAGES.CONSENT_UPDATE_FAILED, details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update multiple consents at once
 * Body: {
 *   consents: [
 *     { consentType: string, action: string },
 *     ...
 *   ]
 * }
 */
export async function PUT(request) {
  try {
    // 1. Create session (includes authentication)
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    const userId = session.userId;

    // 2. Permission check
    if (!session.permissions[PRIVACY_PERMISSIONS.CAN_MANAGE_CONSENTS]) {
      return NextResponse.json(
        { error: PRIVACY_ERROR_MESSAGES.PERMISSION_DENIED },
        { status: 403 }
      );
    }

    // 3. Rate limiting
    const { max, window } = PRIVACY_RATE_LIMITS.CONSENT_UPDATES;
    if (!rateLimit(userId, max, window)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    // 4. Validate request body
    const { consents } = body;

    if (!consents || !Array.isArray(consents)) {
      return NextResponse.json({ error: 'consents array is required' }, { status: 400 });
    }

    // 5. Get metadata from session
    const metadata = {
      ipAddress: session.requestMetadata?.ipAddress || null,
      userAgent: session.requestMetadata?.userAgent || null,
    };

    // 6. Process each consent
    const results = [];
    const errors = [];

    for (const consent of consents) {
      try {
        const { consentType, action, version, consentText } = consent;

        if (!consentType || !action) {
          errors.push({ consentType, error: 'Missing consentType or action' });
          continue;
        }

        const result = await ConsentService.recordConsent(userId, consentType, action, {
          ...metadata,
          version: version || '1.0',
          consentText: consentText || null,
        });

        results.push({ consentType, success: true, result });
      } catch (error) {
        errors.push({ consentType: consent.consentType, error: error.message });
      }
    }

    console.log(`✅ [ConsentAPI] Batch consent update for user ${userId}: ${results.length} succeeded, ${errors.length} failed`);

    return NextResponse.json({
      success: errors.length === 0,
      processed: results.length,
      errors: errors.length,
      results,
      errorDetails: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('❌ [ConsentAPI] Error in PUT:', error);
    return NextResponse.json(
      { error: PRIVACY_ERROR_MESSAGES.CONSENT_UPDATE_FAILED, details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Withdraw a specific consent (convenience method)
 */
export async function DELETE(request) {
  try {
    // 1. Create session (includes authentication)
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    const userId = session.userId;

    // 2. Permission check
    if (!session.permissions[PRIVACY_PERMISSIONS.CAN_MANAGE_CONSENTS]) {
      return NextResponse.json(
        { error: PRIVACY_ERROR_MESSAGES.PERMISSION_DENIED },
        { status: 403 }
      );
    }

    // 3. Rate limiting
    const { max, window } = PRIVACY_RATE_LIMITS.CONSENT_UPDATES;
    if (!rateLimit(userId, max, window)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const consentType = searchParams.get('type');

    if (!consentType) {
      return NextResponse.json({ error: 'consentType is required' }, { status: 400 });
    }

    // 4. Get metadata from session
    const metadata = {
      ipAddress: session.requestMetadata?.ipAddress || null,
      userAgent: session.requestMetadata?.userAgent || null,
    };

    // 5. Withdraw consent
    const result = await ConsentService.withdrawConsent(userId, consentType, metadata);

    console.log(`✅ [ConsentAPI] Consent withdrawn for user ${userId}: ${consentType}`);

    return NextResponse.json({
      success: true,
      message: 'Consent withdrawn successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ [ConsentAPI] Error in DELETE:', error);
    return NextResponse.json(
      { error: PRIVACY_ERROR_MESSAGES.CONSENT_UPDATE_FAILED, details: error.message },
      { status: 500 }
    );
  }
}
