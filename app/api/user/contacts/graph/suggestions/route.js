// app/api/user/contacts/graph/suggestions/route.js
// GET - Group suggestions based on discovered relationships

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import RelationshipDiscoveryService from '@/lib/services/serviceContact/server/neo4j/RelationshipDiscoveryService';
import Neo4jSyncService from '@/lib/services/serviceContact/server/neo4j/Neo4jSyncService';

/**
 * GET /api/user/contacts/graph/suggestions
 * Returns AI-suggested groups based on discovered relationships
 *
 * Query params:
 * - minSimilarity: number - Minimum similarity score (default: 0.75)
 * - maxSuggestions: number - Maximum suggestions to return (default: 10)
 */
export async function GET(request) {
  console.log('🔍 GET /api/user/contacts/graph/suggestions - Request received');

  try {
    // 1. Authenticate
    const session = await createApiSession(request);
    console.log('✅ Session created for user:', session.userId);

    // 2. Check if Neo4j is enabled
    if (!Neo4jSyncService.isEnabled()) {
      return NextResponse.json({
        success: false,
        error: 'Graph features are not enabled',
        reason: 'NEO4J_URI not configured'
      }, { status: 503 });
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url);
    const options = {
      minSimilarity: parseFloat(searchParams.get('minSimilarity')) || 0.75,
      maxSuggestions: parseInt(searchParams.get('maxSuggestions')) || 10
    };

    // 4. Get suggestions
    console.log('💡 Fetching group suggestions for user:', session.userId);
    const suggestions = await RelationshipDiscoveryService.getSuggestedGroups(
      session.userId,
      options
    );

    // Limit to maxSuggestions
    const limitedSuggestions = suggestions.slice(0, options.maxSuggestions);

    console.log(`✅ Found ${limitedSuggestions.length} suggestions`);

    return NextResponse.json({
      success: true,
      suggestions: limitedSuggestions,
      metadata: {
        totalSuggestions: suggestions.length,
        returnedSuggestions: limitedSuggestions.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ API Error in GET /api/user/contacts/graph/suggestions:', error);

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      error: 'Failed to get group suggestions',
      details: error.message
    }, { status: 500 });
  }
}
