/**
 * Data Minimization Audit API
 *
 * Admin endpoint for running and reviewing data minimization audits
 *
 * Routes:
 * - GET /api/admin/privacy/audit - Get latest audit report
 * - POST /api/admin/privacy/audit - Run new audit
 */

import { NextResponse } from 'next/server';
import {
  runDataMinimizationAudit,
  getLatestAuditReport,
  getMinimizationStatistics,
  scheduleAutomatedAudit,
} from '../../../../../lib/services/servicePrivacy/server/dataMinimizationService.js';

/**
 * GET /api/admin/privacy/audit
 * Get latest audit report and statistics
 */
export async function GET(request) {
  try {
    // TODO: Add admin authentication check
    // const isAdmin = await checkAdminAuth(request);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'statistics') {
      const result = await getMinimizationStatistics();
      return NextResponse.json(result);
    }

    // Default: Get latest report
    const result = await getLatestAuditReport();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Data minimization audit GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch audit data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/privacy/audit
 * Run new data minimization audit
 */
export async function POST(request) {
  try {
    // TODO: Add admin authentication check
    // const isAdmin = await checkAdminAuth(request);
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    const body = await request.json();
    const { action, options } = body;

    if (action === 'schedule') {
      const { frequency } = options || {};
      const result = await scheduleAutomatedAudit(frequency);
      return NextResponse.json(result);
    }

    // Default: Run audit
    console.log('[API] Starting data minimization audit...');
    const result = await runDataMinimizationAudit(options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Data minimization audit POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to run audit',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
