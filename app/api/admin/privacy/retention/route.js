/**
 * Retention Policy API
 *
 * Admin endpoint for managing retention policies and cleanup
 *
 * Routes:
 * - GET /api/admin/privacy/retention - Get policies and statistics
 * - POST /api/admin/privacy/retention - Execute cleanup or update policies
 * - PUT /api/admin/privacy/retention - Update retention policy
 */

import { NextResponse } from 'next/server';
import {
  getRetentionPolicies,
  updateRetentionPolicy,
  findEligibleDataForDeletion,
  executeRetentionCleanup,
  getRetentionStatistics,
  scheduleRetentionCleanup,
  addLegalHold,
  removeLegalHold,
} from '../../../../../lib/services/servicePrivacy/server/retentionPolicyService.js';

/**
 * GET /api/admin/privacy/retention
 * Get retention policies and statistics
 */
export async function GET(request) {
  try {
    // TODO: Add admin authentication check

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'statistics':
        const stats = await getRetentionStatistics();
        return NextResponse.json(stats);

      case 'eligible':
        const eligible = await findEligibleDataForDeletion();
        return NextResponse.json(eligible);

      default:
        // Get all policies
        const policies = await getRetentionPolicies();
        return NextResponse.json(policies);
    }
  } catch (error) {
    console.error('[API] Retention policy GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch retention data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/privacy/retention
 * Execute retention cleanup or schedule
 */
export async function POST(request) {
  try {
    // TODO: Add admin authentication check

    const body = await request.json();
    const { action, options } = body;

    switch (action) {
      case 'cleanup':
        console.log('[API] Executing retention cleanup...');
        const cleanup = await executeRetentionCleanup(options);
        return NextResponse.json(cleanup);

      case 'schedule':
        const { frequency } = options || {};
        const schedule = await scheduleRetentionCleanup(frequency);
        return NextResponse.json(schedule);

      case 'legal-hold':
        const { userId, reason, expiresAt } = options || {};
        const hold = await addLegalHold(userId, reason, expiresAt);
        return NextResponse.json(hold);

      case 'remove-hold':
        const { holdId } = options || {};
        const removed = await removeLegalHold(holdId);
        return NextResponse.json(removed);

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Retention policy POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute retention action',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/privacy/retention
 * Update retention policy
 */
export async function PUT(request) {
  try {
    // TODO: Add admin authentication check

    const body = await request.json();
    const { policyId, updates } = body;

    if (!policyId || !updates) {
      return NextResponse.json(
        { error: 'Missing policyId or updates' },
        { status: 400 }
      );
    }

    const result = await updateRetentionPolicy(policyId, updates);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Retention policy PUT error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update retention policy',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
