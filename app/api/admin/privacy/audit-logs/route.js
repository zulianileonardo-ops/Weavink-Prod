/**
 * Enhanced Audit Logging API
 *
 * Admin endpoint for querying and managing audit logs
 *
 * Routes:
 * - GET /api/admin/privacy/audit-logs - Query logs, get statistics, or compliance report
 * - POST /api/admin/privacy/audit-logs - Log event or export logs
 */

import { NextResponse } from 'next/server';
import {
  logAuditEvent,
  queryAuditLogs,
  getAuditLog,
  getUserAuditTrail,
  getAuditStatistics,
  generateComplianceReport,
  verifyAuditLogIntegrity,
  exportAuditLogs,
  AUDIT_CATEGORIES,
  AUDIT_SEVERITY,
} from '../../../../../lib/services/servicePrivacy/server/auditLogService.js';

/**
 * GET /api/admin/privacy/audit-logs
 * Query logs, get statistics, or generate compliance report
 */
export async function GET(request) {
  try {
    // TODO: Add admin authentication check

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'statistics':
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const stats = await getAuditStatistics({ startDate, endDate });
        return NextResponse.json(stats);

      case 'compliance-report':
        const reportStart = searchParams.get('startDate');
        const reportEnd = searchParams.get('endDate');
        const includeDetails = searchParams.get('includeDetails') === 'true';
        const report = await generateComplianceReport({
          startDate: reportStart,
          endDate: reportEnd,
          includeDetails,
        });
        return NextResponse.json(report);

      case 'user-trail':
        const userId = searchParams.get('userId');
        if (!userId) {
          return NextResponse.json(
            { error: 'Missing userId' },
            { status: 400 }
          );
        }
        const category = searchParams.get('category');
        const limit = parseInt(searchParams.get('limit') || '50');
        const trail = await getUserAuditTrail(userId, { category, limit });
        return NextResponse.json(trail);

      case 'verify':
        const logId = searchParams.get('logId');
        if (!logId) {
          return NextResponse.json(
            { error: 'Missing logId' },
            { status: 400 }
          );
        }
        const verification = await verifyAuditLogIntegrity(logId);
        return NextResponse.json(verification);

      case 'get':
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json(
            { error: 'Missing log ID' },
            { status: 400 }
          );
        }
        const log = await getAuditLog(id);
        return NextResponse.json(log);

      case 'categories':
        return NextResponse.json({
          success: true,
          categories: AUDIT_CATEGORIES,
          severities: AUDIT_SEVERITY,
        });

      default:
        // Query logs with filters
        const filters = {
          category: searchParams.get('category'),
          userId: searchParams.get('userId'),
          targetUserId: searchParams.get('targetUserId'),
          severity: searchParams.get('severity'),
          startDate: searchParams.get('startDate'),
          endDate: searchParams.get('endDate'),
          limit: parseInt(searchParams.get('limit') || '100'),
          orderBy: searchParams.get('orderBy') || 'timestamp',
          orderDirection: searchParams.get('orderDirection') || 'desc',
        };

        // Remove null/undefined values
        Object.keys(filters).forEach(key => {
          if (filters[key] === null || filters[key] === undefined || filters[key] === 'null') {
            delete filters[key];
          }
        });

        const result = await queryAuditLogs(filters);
        return NextResponse.json(result);
    }
  } catch (error) {
    console.error('[API] Audit logs GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch audit logs',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/privacy/audit-logs
 * Log event or export logs
 */
export async function POST(request) {
  try {
    // TODO: Add admin authentication check

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'log':
        console.log('[API] Logging audit event...');
        const logged = await logAuditEvent(data);
        return NextResponse.json(logged);

      case 'export':
        const { filters, format } = data;
        if (!format) {
          return NextResponse.json(
            { error: 'Missing export format' },
            { status: 400 }
          );
        }
        const exported = await exportAuditLogs(filters || {}, format);
        return NextResponse.json(exported);

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Audit logs POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute audit log action',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
