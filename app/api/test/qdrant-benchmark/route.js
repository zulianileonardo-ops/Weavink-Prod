// app/api/test/qdrant-benchmark/route.js
// API endpoint to benchmark Qdrant latency
// Access: GET http://localhost:3000/api/test/qdrant-benchmark?iterations=20&collection=YOUR_COLLECTION

// Prevent static generation - this route connects to Qdrant
export const dynamic = 'force-dynamic';

import { qdrantBenchmark } from '@/lib/qdrant';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const iterations = parseInt(searchParams.get('iterations') || '20');
  const collection = searchParams.get('collection') || null;

  try {
    const result = await qdrantBenchmark(iterations, collection);

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
        url: result.url,
        collection: result.collection,
        avgPingLatency: `${result.ping.avg}ms`,
        avgListLatency: `${result.list.avg}ms`,
        ...(result.upsert && { avgUpsertLatency: `${result.upsert.avg}ms` }),
        ...(result.search && { avgSearchLatency: `${result.search.avg}ms` }),
        ...(result.delete && { avgDeleteLatency: `${result.delete.avg}ms` }),
      }
    });

  } catch (error) {
    console.error('❌ [Qdrant Benchmark] Error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
