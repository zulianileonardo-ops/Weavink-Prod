/**
 * Data Export API Endpoint
 * GDPR Art. 20 - Right to Data Portability
 *
 * Allows users to download all their personal data in machine-readable formats
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { rateLimit } from '@/lib/rateLimiter';
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
    // Create session (includes authentication)
    const session = await createApiSession(request);
    const userId = session.userId;

    // Rate limiting
    if (!rateLimit(userId, 10, 60000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const history = searchParams.get('history');

    // If requesting history of exports
    if (history === 'true') {
      const requests = await getUserExportRequests(userId);
      return NextResponse.json({
        success: true,
        requests,
        count: requests.length,
      });
    }

    // If requesting specific export request status
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

    // Otherwise, return instructions
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
    console.error('Error in GET /api/user/privacy/export:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
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
 *   includeConsents: boolean (optional, default: true)
 * }
 */
export async function POST(request) {
  try {
    // Create session (includes authentication)
    const session = await createApiSession(request);
    const userId = session.userId;

    // Rate limiting - stricter for export (resource-intensive operation)
    if (!rateLimit(userId, 3, 3600000)) {
      // Max 3 exports per hour
      return NextResponse.json(
        {
          error: 'Export rate limit exceeded',
          message: 'You can request a maximum of 3 data exports per hour. Please try again later.',
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const options = {
      includeContacts: body.includeContacts !== false,
      includeAnalytics: body.includeAnalytics !== false,
      includeConsents: body.includeConsents !== false,
      includeSettings: body.includeSettings !== false,
      includeGroups: body.includeGroups !== false,
    };

    console.log(`[DataExport] Starting export for user ${userId}`, options);

    // Create export request record
    const exportRequest = await createExportRequest(userId, {
      ipAddress: session.requestMetadata?.ipAddress,
      userAgent: session.requestMetadata?.userAgent,
    });

    // Perform the export (for smaller datasets, do it synchronously)
    // For production with larger datasets, this should be offloaded to a background job
    try {
      const exportResult = await exportAllUserData(userId, options);

      // Update request status
      await updateExportRequest(exportRequest.requestId, 'completed', {
        exportData: exportResult.exportPackage,
        summary: exportResult.summary,
      });

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

      throw exportError;
    }
  } catch (error) {
    console.error('Error in POST /api/user/privacy/export:', error);
    return NextResponse.json(
      {
        error: 'Failed to export data',
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
    // Create session (includes authentication)
    const session = await createApiSession(request);
    const userId = session.userId;

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    // Get export request
    const exportRequest = await getExportRequest(requestId);

    // Verify ownership
    if (exportRequest.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Can only cancel pending requests
    if (exportRequest.status !== 'pending') {
      return NextResponse.json(
        {
          error: 'Cannot cancel export',
          message: `Export is already ${exportRequest.status}`,
        },
        { status: 400 }
      );
    }

    // Update status to cancelled
    await updateExportRequest(requestId, 'cancelled');

    return NextResponse.json({
      success: true,
      message: 'Export request cancelled successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/user/privacy/export:', error);
    return NextResponse.json(
      { error: 'Failed to cancel export', details: error.message },
      { status: 500 }
    );
  }
}
