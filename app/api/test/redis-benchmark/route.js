// app/api/test/redis-benchmark/route.js
// API endpoint to benchmark Redis latency
// Access: GET http://localhost:3000/api/test/redis-benchmark?iterations=20

// Prevent static generation - this route connects to Redis
export const dynamic = 'force-dynamic';

import { redisClient } from '@/lib/services/serviceContact/server/redisClient';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const iterations = parseInt(searchParams.get('iterations') || '20');

  try {
    const result = await redisClient.benchmark(iterations);

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
        host: result.host,
        avgPingLatency: `${result.ping.avg}ms`,
        avgGetLatency: `${result.get.avg}ms`,
        avgSetLatency: `${result.set.avg}ms`,
      }
    });

  } catch (error) {
    console.error('❌ [Redis Benchmark] Error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
