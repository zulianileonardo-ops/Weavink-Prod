// app/api/user/contacts/graph/route.js
// GET graph data for visualization

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createApiSession } from '@/lib/server/session';
import RelationshipDiscoveryService from '@/lib/services/serviceContact/server/neo4j/RelationshipDiscoveryService';
import Neo4jSyncService from '@/lib/services/serviceContact/server/neo4j/Neo4jSyncService';

/**
 * GET /api/user/contacts/graph
 * Returns graph data (nodes and edges) for visualization
 *
 * Query params:
 * - nodeTypes: comma-separated node types to include (Contact,Company,Tag)
 * - relationshipTypes: comma-separated relationship types (WORKS_AT,SIMILAR_TO,HAS_TAG)
 */
export async function GET(request) {
  console.log('🔍 GET /api/user/contacts/graph - Request received');

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
    const options = {};

    if (searchParams.get('nodeTypes')) {
      options.nodeTypes = searchParams.get('nodeTypes').split(',');
    }
    if (searchParams.get('relationshipTypes')) {
      options.relationshipTypes = searchParams.get('relationshipTypes').split(',');
    }

    // 4. Get graph data
    console.log('📊 Fetching graph data for user:', session.userId);
    const graphData = await RelationshipDiscoveryService.getGraphData(session.userId, options);

    console.log(`✅ Graph data fetched: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);

    return NextResponse.json({
      success: true,
      graph: graphData,
      metadata: {
        nodeCount: graphData.nodes.length,
        edgeCount: graphData.edges.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ API Error in GET /api/user/contacts/graph:', error);

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      error: 'Failed to get graph data',
      details: error.message
    }, { status: 500 });
  }
}
