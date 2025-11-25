// app/api/user/contacts/graph/discover/status/route.js
// GET - Poll discovery job status

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { DiscoveryJobManager } from '@/lib/services/serviceContact/server/DiscoveryJobManager';

/**
 * GET /api/user/contacts/graph/discover/status?jobId=xxx
 * Returns the current status of a discovery job
 *
 * Query params:
 * - jobId: string - The job ID returned from POST /discover
 *
 * Response:
 * - { status: 'started'|'completed'|'failed', progress: 0-100, currentStep: string, result?, error? }
 */
export async function GET(request) {
  try {
    // 1. Authenticate
    const session = await createApiSession(request);

    // 2. Get jobId from query params
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({
        error: 'Missing jobId parameter'
      }, { status: 400 });
    }

    // 3. Get job with user verification
    const job = DiscoveryJobManager.getJobForUser(jobId, session.userId);

    if (!job) {
      return NextResponse.json({
        error: 'Job not found or unauthorized'
      }, { status: 404 });
    }

    // 4. Return job status with tiered relationship counts
    const response = {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      // Tiered relationship discovery fields
      relationshipCounts: job.relationshipCounts || { high: 0, medium: 0, low: 0, total: 0 },
      hasPendingRelationships: job.hasPendingRelationships || false
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ API Error in GET /api/user/contacts/graph/discover/status:', error);

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      error: 'Failed to get job status',
      details: error.message
    }, { status: 500 });
  }
}
