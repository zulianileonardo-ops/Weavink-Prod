/**
 * Data Export API Endpoint
 * GDPR Art. 20 - Right to Data Portability
 *
 * Allows users to download all their personal data in machine-readable formats
 * Supports multiple formats (JSON, CSV, vCard, XML, PDF)
 */

import { NextResponse } from 'next/server';
import { createApiSession, SessionManager } from '@/lib/server/session';
import { rateLimit } from '@/lib/rateLimiter';
import {
  PRIVACY_PERMISSIONS,
  PRIVACY_RATE_LIMITS,
  PRIVACY_ERROR_MESSAGES,
} from '@/lib/services/constants';
import {
  exportAllUserData,
  createExportRequest,
  updateExportRequest,
  getExportRequest,
  getUserExportRequests,
} from '../../../../../lib/services/servicePrivacy/server/dataExportService.js';

/**
 * GET - Retrieve export request status or download export
 */
export async function GET(request) {
  try {
    // 1. Create session (includes authentication)
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    const userId = session.userId;

    // 2. Permission check
    if (!session.permissions[PRIVACY_PERMISSIONS.CAN_EXPORT_DATA]) {
      return NextResponse.json(
        {
          error: PRIVACY_ERROR_MESSAGES.PERMISSION_DENIED,
          upgrade: 'Data export requires a subscription upgrade',
        },
        { status: 403 }
      );
    }

    // 3. Rate limiting
    const { max, window } = PRIVACY_RATE_LIMITS.EXPORT_STATUS_CHECK;
    const rateLimitResult = rateLimit(userId, {
      maxRequests: max,
      windowMs: window,
      metadata: {
        eventType: 'data_export_status',
        userId: userId,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      }
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const history = searchParams.get('history');

    // 4. If requesting history of exports
    if (history === 'true') {
      const requests = await getUserExportRequests(userId);
      return NextResponse.json({
        success: true,
        requests,
        count: requests.length,
      });
    }

    // 5. If requesting specific export request status
    if (requestId) {
      const exportRequest = await getExportRequest(requestId);

      // Verify ownership
      if (exportRequest.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      return NextResponse.json({
        success: true,
        exportRequest,
      });
    }

    // 6. Otherwise, return instructions
    return NextResponse.json({
      message: 'To request a data export, send a POST request',
      endpoint: '/api/user/privacy/export',
      documentation: {
        'GET ?history=true': 'View your export history',
        'GET ?requestId=xxx': 'Check status of a specific export',
        'POST': 'Request a new data export',
      },
    });
  } catch (error) {
    console.error('❌ [DataExportAPI] Error in GET:', error);
    return NextResponse.json(
      { error: PRIVACY_ERROR_MESSAGES.EXPORT_FAILED, details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Request a new data export
 * Body: {
 *   format: 'json' | 'zip' (optional, default: 'json'),
 *   includeContacts: boolean (optional, default: true),
 *   includeAnalytics: boolean (optional, default: true),
 *   includeConsents: boolean (optional, default: true),
 *   includeSettings: boolean (optional, default: true),
 *   includeGroups: boolean (optional, default: true)
 * }
 */
export async function POST(request) {
  try {
    // 1. Create session (includes authentication)
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    const userId = session.userId;

    // 2. Permission check
    if (!session.permissions[PRIVACY_PERMISSIONS.CAN_EXPORT_DATA]) {
      return NextResponse.json(
        {
          error: PRIVACY_ERROR_MESSAGES.PERMISSION_DENIED,
          upgrade: 'Data export requires a subscription upgrade',
        },
        { status: 403 }
      );
    }

    // 3. Rate limiting - stricter for export (resource-intensive operation)
    const { max, window } = PRIVACY_RATE_LIMITS.DATA_EXPORTS;
    const rateLimitResult = rateLimit(userId, {
      maxRequests: max,
      windowMs: window,
      metadata: {
        eventType: 'data_export_request',
        userId: userId,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      }
    });
    if (!rateLimitResult.allowed) {
      const responsePayload = {
        error: PRIVACY_ERROR_MESSAGES.EXPORT_RATE_LIMIT,
        message: `You can request a maximum of ${max} data exports per hour. Please try again later.`,
        retryAfter: rateLimitResult.retryAfter,  // Seconds until reset
        resetTime: rateLimitResult.resetTime,     // Unix timestamp
        limit: {
          max: max,
          windowHours: 1  // 1 hour window
        }
      };

      // Log the 429 response for debugging
      console.log('📤 [DataExportAPI] Sending 429 response:', {
        userId,
        retryAfter: rateLimitResult.retryAfter,
        retryAfterMinutes: Math.floor(rateLimitResult.retryAfter / 60),
        resetTime: rateLimitResult.resetTime,
        resetTimeFormatted: new Date(rateLimitResult.resetTime).toISOString(),
        now: Date.now(),
        nowFormatted: new Date().toISOString(),
        payload: responsePayload
      });

      return NextResponse.json(responsePayload, {
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.retryAfter.toString()  // Standard HTTP header
        }
      });
    }

    const body = await request.json().catch(() => ({}));

    // 4. Parse export options
    const options = {
      includeContacts: body.includeContacts !== false,
      includeAnalytics: body.includeAnalytics !== false,
      includeConsents: body.includeConsents !== false,
      includeSettings: body.includeSettings !== false,
      includeGroups: body.includeGroups !== false,
    };

    console.log(`✅ [DataExportAPI] Starting export for user ${userId}`, options);

    // 5. Create export request record
    const exportRequest = await createExportRequest(userId, {
      ipAddress: session.requestMetadata?.ipAddress,
      userAgent: session.requestMetadata?.userAgent,
    });

    // 6. Perform the export (for smaller datasets, do it synchronously)
    // For production with larger datasets, this should be offloaded to a background job
    try {
      const exportResult = await exportAllUserData(userId, options);

      // Update request status
      await updateExportRequest(exportRequest.requestId, 'completed', {
        exportData: exportResult.exportPackage,
        summary: exportResult.summary,
      });

      console.log(`✅ [DataExportAPI] Export completed for user ${userId}:`, exportResult.summary);

      // Return the export data immediately
      // In production, you might want to:
      // 1. Upload files to Cloud Storage
      // 2. Generate a secure download URL
      // 3. Send an email notification
      // 4. Return just the download URL instead of full data

      return NextResponse.json({
        success: true,
        message: 'Data export completed successfully',
        requestId: exportRequest.requestId,
        exportData: exportResult.exportPackage,
        summary: exportResult.summary,
        files: exportResult.exportPackage.files,
        instructions: {
          download: 'The "files" object contains all your data in multiple formats',
          formats: {
            json: 'Machine-readable JSON format',
            csv: 'Excel-compatible spreadsheet format',
            vcf: 'vCard format (compatible with all contact managers)',
          },
          retention: 'This export is available for download for 24 hours',
          privacy: 'Your data is exported securely and only accessible to you',
        },
      });
    } catch (exportError) {
      // Update request status to failed
      await updateExportRequest(exportRequest.requestId, 'failed', {
        error: exportError.message,
      });

      console.error(`❌ [DataExportAPI] Export failed for user ${userId}:`, exportError);

      throw exportError;
    }
  } catch (error) {
    console.error('❌ [DataExportAPI] Error in POST:', error);
    return NextResponse.json(
      {
        error: PRIVACY_ERROR_MESSAGES.EXPORT_FAILED,
        details: error.message,
        troubleshooting: {
          largeDataset: 'If you have a large number of contacts, the export may take longer',
          retryLater: 'Please try again in a few minutes',
          contact: 'If the problem persists, contact support@weavink.io',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Cancel a pending export request
 */
export async function DELETE(request) {
  try {
    // 1. Create session (includes authentication)
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    const userId = session.userId;

    // 2. Permission check
    if (!session.permissions[PRIVACY_PERMISSIONS.CAN_EXPORT_DATA]) {
      return NextResponse.json(
        { error: PRIVACY_ERROR_MESSAGES.PERMISSION_DENIED },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    // 3. Get export request
    const exportRequest = await getExportRequest(requestId);

    // Verify ownership
    if (exportRequest.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 4. Can only cancel pending requests
    if (exportRequest.status !== 'pending') {
      return NextResponse.json(
        {
          error: 'Cannot cancel export',
          message: `Export is already ${exportRequest.status}`,
        },
        { status: 400 }
      );
    }

    // 5. Update status to cancelled
    await updateExportRequest(requestId, 'cancelled');

    console.log(`✅ [DataExportAPI] Export cancelled for user ${userId}: ${requestId}`);

    return NextResponse.json({
      success: true,
      message: 'Export request cancelled successfully',
    });
  } catch (error) {
    console.error('❌ [DataExportAPI] Error in DELETE:', error);
    return NextResponse.json(
      { error: 'Failed to cancel export', details: error.message },
      { status: 500 }
    );
  }
}
