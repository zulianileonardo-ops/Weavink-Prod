/**
 * Track Download API Endpoint
 * Logs when users download their exported data files
 * GDPR Audit Requirement: Track all data access actions
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import {
  logAuditEvent,
  AUDIT_CATEGORIES,
} from '@/lib/services/servicePrivacy/server/auditLogService';

/**
 * POST /api/user/privacy/export/track-download
 * Logs a download event to AuditLogs collection
 *
 * @body {string} requestId - Export request ID
 * @body {string} filename - Name of downloaded file
 * @returns {Object} Success confirmation
 */
export async function POST(request) {
  try {
    // Authenticate user
    const session = await createApiSession(request);
    const userId = session.userId;

    // Parse request body
    const body = await request.json();
    const { requestId, filename } = body;

    if (!requestId || !filename) {
      return NextResponse.json(
        { error: 'Missing requestId or filename' },
        { status: 400 }
      );
    }

    // Get request metadata
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    // Log download event to AuditLogs
    await logAuditEvent({
      category: AUDIT_CATEGORIES.DATA_EXPORT,
      action: 'export_downloaded',
      userId: userId,
      resourceType: 'data_export',
      resourceId: requestId,
      details: `Downloaded file: ${filename}`,
      ipAddress: ipAddress,
      userAgent: userAgent,
      metadata: {
        requestId: requestId,
        fileName: filename,
        downloadedAt: new Date().toISOString(),
      },
    });

    console.log(
      `✅ [TrackDownload] Logged download for user ${userId}: ${filename}`
    );

    return NextResponse.json({
      success: true,
      message: 'Download tracked successfully',
    });
  } catch (error) {
    console.error('❌ [TrackDownload] Error tracking download:', error);

    // Don't fail the request if audit logging fails
    // User should still be able to download even if tracking fails
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track download',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
