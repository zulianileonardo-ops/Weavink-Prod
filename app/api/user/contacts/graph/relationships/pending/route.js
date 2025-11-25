// app/api/user/contacts/graph/relationships/pending/route.js
// GET - Retrieve pending relationships for user review

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { RelationshipReviewService } from '@/lib/services/serviceContact/server/neo4j/RelationshipReviewService';

/**
 * GET /api/user/contacts/graph/relationships/pending?jobId=xxx&tier=medium
 * Returns pending relationships for user review
 *
 * Query params:
 * - jobId: string - The discovery job ID
 * - tier: string - Confidence tier ('medium' or 'low'), default: 'medium'
 *
 * Response:
 * - { success, relationships: [], total, reviewed, tier }
 */
export async function GET(request) {
  try {
    // 1. Authenticate
    const session = await createApiSession(request);

    // 2. Get query params
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const tier = searchParams.get('tier') || 'medium';

    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'Missing jobId parameter'
      }, { status: 400 });
    }

    if (!['medium', 'low'].includes(tier)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid tier. Must be "medium" or "low"'
      }, { status: 400 });
    }

    // 3. Get pending relationships
    const result = await RelationshipReviewService.getPendingRelationships(
      session.userId,
      jobId,
      tier
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 404 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ API Error in GET /api/user/contacts/graph/relationships/pending:', error);

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get pending relationships',
      details: error.message
    }, { status: 500 });
  }
}
