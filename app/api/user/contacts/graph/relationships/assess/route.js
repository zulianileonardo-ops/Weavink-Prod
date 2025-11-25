// app/api/user/contacts/graph/relationships/assess/route.js
// POST - Get LLM assessment for a relationship

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { RelationshipReviewService } from '@/lib/services/serviceContact/server/neo4j/RelationshipReviewService';

/**
 * POST /api/user/contacts/graph/relationships/assess
 * Get LLM assessment for a medium-confidence relationship
 *
 * Body:
 * - sourceId: string - Source contact ID
 * - targetId: string - Target contact ID
 * - jobId: string - The discovery job ID
 *
 * Response:
 * - { success, assessment: { explanation, connectionType, confidence, suggestedAction }, cached }
 */
export async function POST(request) {
  try {
    // 1. Authenticate
    const session = await createApiSession(request);

    // 2. Parse request body
    const body = await request.json();
    const { sourceId, targetId, jobId } = body;

    // 3. Validate
    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: 'Missing jobId'
      }, { status: 400 });
    }

    if (!sourceId || !targetId) {
      return NextResponse.json({
        success: false,
        error: 'Missing sourceId or targetId'
      }, { status: 400 });
    }

    // 4. Get LLM assessment
    const result = await RelationshipReviewService.assessRelationship(
      session.userId,
      sourceId,
      targetId,
      jobId
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: result.error === 'Contact(s) not found' ? 404 : 500 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ API Error in POST /api/user/contacts/graph/relationships/assess:', error);

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for Gemini API errors
    if (error.message.includes('API key') || error.message.includes('Gemini')) {
      return NextResponse.json({
        success: false,
        error: 'AI assessment unavailable',
        details: 'Gemini API not configured'
      }, { status: 503 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to assess relationship',
      details: error.message
    }, { status: 500 });
  }
}
