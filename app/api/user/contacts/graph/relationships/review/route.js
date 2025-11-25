// app/api/user/contacts/graph/relationships/review/route.js
// POST - Approve or reject relationships

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { RelationshipReviewService } from '@/lib/services/serviceContact/server/neo4j/RelationshipReviewService';

/**
 * POST /api/user/contacts/graph/relationships/review
 * Approve or reject one or more relationships
 *
 * Body:
 * - action: 'approve' | 'reject' - Action to perform
 * - relationships: Array - Relationships to process
 * - jobId: string - The discovery job ID
 *
 * Response:
 * - { success, action, approved/rejected: number, failed: number }
 */
export async function POST(request) {
  try {
    // 1. Authenticate
    const session = await createApiSession(request);

    // 2. Parse request body
    const body = await request.json();
    const { action, relationships, jobId } = body;

    // 3. Validate
    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'Missing jobId'
      }, { status: 400 });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"'
      }, { status: 400 });
    }

    if (!relationships || !Array.isArray(relationships) || relationships.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No relationships provided'
      }, { status: 400 });
    }

    // 4. Process relationships
    let result;

    if (action === 'approve') {
      if (relationships.length === 1) {
        // Single approval
        const singleResult = await RelationshipReviewService.approveRelationship(
          session.userId,
          relationships[0],
          jobId
        );
        result = {
          success: singleResult.success,
          action: 'approve',
          approved: singleResult.success ? 1 : 0,
          failed: singleResult.success ? 0 : 1,
          error: singleResult.error
        };
      } else {
        // Batch approval
        result = await RelationshipReviewService.batchApprove(
          session.userId,
          relationships,
          jobId
        );
        result.action = 'approve';
      }
    } else {
      if (relationships.length === 1) {
        // Single rejection
        const singleResult = await RelationshipReviewService.rejectRelationship(
          session.userId,
          relationships[0],
          jobId
        );
        result = {
          success: singleResult.success,
          action: 'reject',
          rejected: singleResult.success ? 1 : 0,
          failed: singleResult.success ? 0 : 1,
          error: singleResult.error
        };
      } else {
        // Batch rejection
        result = await RelationshipReviewService.batchReject(
          session.userId,
          relationships,
          jobId
        );
        result.action = 'reject';
      }
    }

    // 5. Get updated summary
    const summary = await RelationshipReviewService.getReviewSummary(session.userId, jobId);

    return NextResponse.json({
      ...result,
      summary: summary.success ? summary.summary : undefined
    });

  } catch (error) {
    console.error('❌ API Error in POST /api/user/contacts/graph/relationships/review:', error);

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to process relationships',
      details: error.message
    }, { status: 500 });
  }
}
