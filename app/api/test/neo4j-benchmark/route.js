// app/api/test/neo4j-benchmark/route.js
// API endpoint to benchmark Neo4j latency
// Access: GET http://localhost:3000/api/test/neo4j-benchmark?iterations=20

// Prevent static generation - this route connects to Neo4j
export const dynamic = 'force-dynamic';

import { neo4jClient } from '@/lib/services/serviceContact/server/neo4j/neo4jClient';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const iterations = parseInt(searchParams.get('iterations') || '20');

  try {
    const result = await neo4jClient.benchmark(iterations);

    if (!result) {
      return Response.json(
        { error: 'Benchmark failed - check server logs' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      benchmark: result,
      summary: {
        type: result.type,
        uri: result.uri,
        avgPingLatency: `${result.ping.avg}ms`,
        avgReadLatency: `${result.read.avg}ms`,
        avgWriteLatency: `${result.write.avg}ms`,
        avgDeleteLatency: `${result.delete.avg}ms`,
      }
    });

  } catch (error) {
    console.error('❌ [Neo4j Benchmark] Error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
