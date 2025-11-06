/**
 * Consent Management API Endpoint
 * Handles user consent operations for GDPR compliance
 *
 * Routes:
 * - GET: Get current consent status
 * - POST: Grant or withdraw consent
 * - GET with ?history=true: Get consent history
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { rateLimit } from '@/lib/rateLimiter';
import {
  recordConsent,
  getUserConsents,
  getConsentHistory,
  withdrawConsent,
  CONSENT_TYPES,
  CONSENT_ACTIONS,
} from '../../../../../lib/services/servicePrivacy/server/consentService.js';

/**
 * GET - Retrieve user's current consent status or history
 */
export async function GET(request) {
  try {
    // Create session (includes authentication)
    const session = await createApiSession(request);
    const userId = session.userId;

    // Rate limiting
    if (!rateLimit(userId, 30, 60000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    const { searchParams } = new URL(request.url);
    const history = searchParams.get('history');
    const consentType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');

    // If requesting history
    if (history === 'true') {
      const options = { limit };
      if (consentType) {
        options.consentType = consentType;
      }

      const result = await getConsentHistory(userId, options);
      return NextResponse.json(result);
    }

    // Otherwise, return current consent status
    const result = await getUserConsents(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/user/privacy/consent:', error);
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
    // Create session (includes authentication)
    const session = await createApiSession(request);
    const userId = session.userId;

    // Rate limiting
    if (!rateLimit(userId, 20, 60000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    // Validate request body
    const { consentType, action, version, consentText } = body;

    if (!consentType) {
      return NextResponse.json({ error: 'consentType is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    // Validate consent type
    if (!Object.values(CONSENT_TYPES).includes(consentType)) {
      return NextResponse.json({ error: 'Invalid consent type' }, { status: 400 });
    }

    // Validate action
    if (!Object.values(CONSENT_ACTIONS).includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get metadata from session
    const metadata = {
      ipAddress: session.requestMetadata?.ipAddress || null,
      userAgent: session.requestMetadata?.userAgent || null,
      version: version || '1.0',
      consentText: consentText || null,
    };

    // Record consent
    const result = await recordConsent(userId, consentType, action, metadata);

    // Log the consent change
    console.log(`Consent ${action} for user ${userId}: ${consentType}`);

    return NextResponse.json({
      success: true,
      message: `Consent ${action} successfully`,
      data: result,
    });
  } catch (error) {
    console.error('Error in POST /api/user/privacy/consent:', error);
    return NextResponse.json(
      { error: 'Failed to record consent', details: error.message },
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
    // Create session (includes authentication)
    const session = await createApiSession(request);
    const userId = session.userId;

    // Rate limiting
    if (!rateLimit(userId, 20, 60000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();

    // Validate request body
    const { consents } = body;

    if (!consents || !Array.isArray(consents)) {
      return NextResponse.json({ error: 'consents array is required' }, { status: 400 });
    }

    // Get metadata from session
    const metadata = {
      ipAddress: session.requestMetadata?.ipAddress || null,
      userAgent: session.requestMetadata?.userAgent || null,
    };

    // Process each consent
    const results = [];
    const errors = [];

    for (const consent of consents) {
      try {
        const { consentType, action, version, consentText } = consent;

        if (!consentType || !action) {
          errors.push({ consentType, error: 'Missing consentType or action' });
          continue;
        }

        const result = await recordConsent(userId, consentType, action, {
          ...metadata,
          version: version || '1.0',
          consentText: consentText || null,
        });

        results.push({ consentType, success: true, result });
      } catch (error) {
        errors.push({ consentType: consent.consentType, error: error.message });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      processed: results.length,
      errors: errors.length,
      results,
      errorDetails: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in PUT /api/user/privacy/consent:', error);
    return NextResponse.json(
      { error: 'Failed to update consents', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Withdraw a specific consent (convenience method)
 */
export async function DELETE(request) {
  try {
    // Create session (includes authentication)
    const session = await createApiSession(request);
    const userId = session.userId;

    // Rate limiting
    if (!rateLimit(userId, 20, 60000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const consentType = searchParams.get('type');

    if (!consentType) {
      return NextResponse.json({ error: 'consentType is required' }, { status: 400 });
    }

    // Get metadata from session
    const metadata = {
      ipAddress: session.requestMetadata?.ipAddress || null,
      userAgent: session.requestMetadata?.userAgent || null,
    };

    // Withdraw consent
    const result = await withdrawConsent(userId, consentType, metadata);

    return NextResponse.json({
      success: true,
      message: 'Consent withdrawn successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in DELETE /api/user/privacy/consent:', error);
    return NextResponse.json(
      { error: 'Failed to withdraw consent', details: error.message },
      { status: 500 }
    );
  }
}
