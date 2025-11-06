/**
 * Data Protection Impact Assessment (DPIA) API
 *
 * Admin endpoint for managing DPIAs
 *
 * Routes:
 * - GET /api/admin/privacy/dpia - List DPIAs or get statistics
 * - POST /api/admin/privacy/dpia - Create DPIA or submit assessment
 * - PUT /api/admin/privacy/dpia - Update DPIA or add mitigation
 */

import { NextResponse } from 'next/server';
import {
  createDPIA,
  submitDPIAAssessment,
  addMitigationMeasure,
  requestDPIAApproval,
  approveDPIA,
  getDPIA,
  listDPIAs,
  getDPIAStatistics,
  DPIA_QUESTIONS,
} from '../../../../../lib/services/servicePrivacy/server/dpiaService.js';

/**
 * GET /api/admin/privacy/dpia
 * Get DPIAs, statistics, or questions
 */
export async function GET(request) {
  try {
    // TODO: Add admin authentication check

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const dpiaId = searchParams.get('id');

    switch (action) {
      case 'statistics':
        const stats = await getDPIAStatistics();
        return NextResponse.json(stats);

      case 'questions':
        return NextResponse.json({
          success: true,
          questions: DPIA_QUESTIONS,
        });

      case 'get':
        if (!dpiaId) {
          return NextResponse.json(
            { error: 'Missing DPIA ID' },
            { status: 400 }
          );
        }
        const dpia = await getDPIA(dpiaId);
        return NextResponse.json(dpia);

      default:
        // List all DPIAs
        const status = searchParams.get('status');
        const riskLevel = searchParams.get('riskLevel');
        const limit = parseInt(searchParams.get('limit') || '50');

        const result = await listDPIAs({ status, riskLevel, limit });
        return NextResponse.json(result);
    }
  } catch (error) {
    console.error('[API] DPIA GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch DPIA data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/privacy/dpia
 * Create DPIA, submit assessment, or request approval
 */
export async function POST(request) {
  try {
    // TODO: Add admin authentication check

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create':
        console.log('[API] Creating new DPIA...');
        const created = await createDPIA(data);
        return NextResponse.json(created);

      case 'assess':
        const { dpiaId, answers } = data;
        if (!dpiaId || !answers) {
          return NextResponse.json(
            { error: 'Missing dpiaId or answers' },
            { status: 400 }
          );
        }
        const assessed = await submitDPIAAssessment(dpiaId, answers);
        return NextResponse.json(assessed);

      case 'request-approval':
        const { dpiaId: dId, approverId } = data;
        if (!dId || !approverId) {
          return NextResponse.json(
            { error: 'Missing dpiaId or approverId' },
            { status: 400 }
          );
        }
        const approval = await requestDPIAApproval(dId, approverId);
        return NextResponse.json(approval);

      case 'approve':
        const { dpiaId: aId, approvalId, approved, comments } = data;
        if (!aId || !approvalId || approved === undefined) {
          return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
          );
        }
        const result = await approveDPIA(aId, approvalId, approved, comments);
        return NextResponse.json(result);

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] DPIA POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute DPIA action',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/privacy/dpia
 * Add mitigation measure
 */
export async function PUT(request) {
  try {
    // TODO: Add admin authentication check

    const body = await request.json();
    const { dpiaId, mitigation } = body;

    if (!dpiaId || !mitigation) {
      return NextResponse.json(
        { error: 'Missing dpiaId or mitigation' },
        { status: 400 }
      );
    }

    const result = await addMitigationMeasure(dpiaId, mitigation);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] DPIA PUT error:', error);
    return NextResponse.json(
      {
        error: 'Failed to add mitigation measure',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
