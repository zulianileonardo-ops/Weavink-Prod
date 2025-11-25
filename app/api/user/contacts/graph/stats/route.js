// app/api/user/contacts/graph/stats/route.js
// GET - Graph statistics

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import RelationshipDiscoveryService from '@/lib/services/serviceContact/server/neo4j/RelationshipDiscoveryService';
import Neo4jSyncService from '@/lib/services/serviceContact/server/neo4j/Neo4jSyncService';

/**
 * GET /api/user/contacts/graph/stats
 * Returns graph statistics (node counts, relationship counts)
 */
export async function GET(request) {
  console.log('🔍 GET /api/user/contacts/graph/stats - Request received');

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

    // 3. Get statistics
    console.log('📊 Fetching graph stats for user:', session.userId);
    const stats = await RelationshipDiscoveryService.getDiscoveryStats(session.userId);

    console.log('✅ Stats fetched:', stats);

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ API Error in GET /api/user/contacts/graph/stats:', error);

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      error: 'Failed to get graph stats',
      details: error.message
    }, { status: 500 });
  }
}
