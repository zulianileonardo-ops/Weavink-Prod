// lib/qdrant.js
// Centralized Qdrant client initialization for Weavink
// Replaces Pinecone for vector storage in self-hosted infrastructure

import { QdrantClient } from '@qdrant/js-client-rest';

// Lazy initialization - client is created only when first accessed
// This prevents build-time errors when QDRANT_URL is not available
let _qdrantClient = null;

// Use Proxy for transparent lazy initialization
// This maintains the same API as before (no breaking changes)
export const qdrantClient = new Proxy({}, {
  get(target, prop) {
    // Initialize client on first access
    if (!_qdrantClient) {
      // Validate required environment variable at runtime
      if (!process.env.QDRANT_URL) {
        throw new Error('QDRANT_URL environment variable is required. Expected: http://qdrant-qkkkc8kskocgwo0o8c444cgo:6333');
      }

      // Initialize Qdrant client
      // No API key needed for internal Docker network
      _qdrantClient = new QdrantClient({
        url: process.env.QDRANT_URL,
      });

      console.log(`✅ [Qdrant] Client initialized: ${process.env.QDRANT_URL}`);
    }

    return _qdrantClient[prop];
  }
});

/**
 * Run latency benchmark for Qdrant - useful for comparing cloud vs self-hosted
 * @param {number} iterations - Number of operations per test (default: 10)
 * @param {string} collectionName - Collection to use for read/write tests (optional)
 */
export async function qdrantBenchmark(iterations = 10, collectionName = null) {
  const qdrantUrl = process.env.QDRANT_URL || 'unknown';
  const isCloud = qdrantUrl.includes('cloud.qdrant.io');

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  🏎️  QDRANT LATENCY BENCHMARK`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`  URL: ${qdrantUrl}`);
  console.log(`  Type: ${isCloud ? '☁️ Qdrant Cloud' : '🏠 Self-Hosted'}`);
  console.log(`  Iterations: ${iterations}`);
  console.log(`${'─'.repeat(70)}`);

  try {
    const pingTimes = [];
    const listTimes = [];
    const searchTimes = [];
    const upsertTimes = [];
    const deleteTimes = [];

    // Warm-up
    await qdrantClient.getCollections();

    // PING benchmark (cluster info)
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await qdrantClient.getCollections();
      pingTimes.push(performance.now() - start);
    }

    // LIST benchmark (list collections)
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await qdrantClient.getCollections();
      listTimes.push(performance.now() - start);
    }

    // If collection provided, do read/write benchmarks
    if (collectionName) {
      // Get collection info to determine vector size
      let vectorSize = 1024; // default for Weavink (Gemini embeddings)
      try {
        const info = await qdrantClient.getCollection(collectionName);
        // Handle different response structures
        const vectors = info.config?.params?.vectors || info.result?.config?.params?.vectors;
        if (vectors?.size) {
          vectorSize = vectors.size;
        }
        console.log(`  📐 Vector size: ${vectorSize}`);
      } catch (e) {
        console.log(`  ⚠️ Could not get collection info, using default vector size ${vectorSize}`);
      }

      // Generate UUID-like IDs for benchmark points
      const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
      const testPointIds = Array(iterations).fill(0).map(() => generateUUID());

      // UPSERT benchmark
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await qdrantClient.upsert(collectionName, {
          wait: true,
          points: [{
            id: testPointIds[i],
            vector: Array(vectorSize).fill(0).map(() => Math.random()),
            payload: { benchmark: true, iteration: i, timestamp: new Date().toISOString() }
          }]
        });
        upsertTimes.push(performance.now() - start);
      }

      // SEARCH benchmark (no filter to avoid empty results)
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await qdrantClient.search(collectionName, {
          vector: Array(vectorSize).fill(0).map(() => Math.random()),
          limit: 5
        });
        searchTimes.push(performance.now() - start);
      }

      // DELETE benchmark
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await qdrantClient.delete(collectionName, {
          wait: true,
          points: [testPointIds[i]]
        });
        deleteTimes.push(performance.now() - start);
      }
    }

    // Calculate stats
    const calcStats = (times) => {
      if (times.length === 0) return { min: 'N/A', max: 'N/A', avg: 'N/A', p50: 'N/A', p99: 'N/A' };
      const sorted = [...times].sort((a, b) => a - b);
      return {
        min: Math.min(...times).toFixed(2),
        max: Math.max(...times).toFixed(2),
        avg: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
        p50: sorted[Math.floor(sorted.length / 2)].toFixed(2),
        p99: sorted[Math.floor(sorted.length * 0.99)].toFixed(2)
      };
    };

    const pingStats = calcStats(pingTimes);
    const listStats = calcStats(listTimes);
    const searchStats = calcStats(searchTimes);
    const upsertStats = calcStats(upsertTimes);
    const deleteStats = calcStats(deleteTimes);

    console.log(`\n  📊 RESULTS (${iterations} iterations each):`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`  Operation      │   Min    │   Avg    │   P50    │   P99    │   Max`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`  PING (info)    │ ${String(pingStats.min).padStart(6)}ms │ ${String(pingStats.avg).padStart(6)}ms │ ${String(pingStats.p50).padStart(6)}ms │ ${String(pingStats.p99).padStart(6)}ms │ ${String(pingStats.max).padStart(6)}ms`);
    console.log(`  LIST (colls)   │ ${String(listStats.min).padStart(6)}ms │ ${String(listStats.avg).padStart(6)}ms │ ${String(listStats.p50).padStart(6)}ms │ ${String(listStats.p99).padStart(6)}ms │ ${String(listStats.max).padStart(6)}ms`);
    if (collectionName) {
      console.log(`  UPSERT (point) │ ${String(upsertStats.min).padStart(6)}ms │ ${String(upsertStats.avg).padStart(6)}ms │ ${String(upsertStats.p50).padStart(6)}ms │ ${String(upsertStats.p99).padStart(6)}ms │ ${String(upsertStats.max).padStart(6)}ms`);
      console.log(`  SEARCH (vec)   │ ${String(searchStats.min).padStart(6)}ms │ ${String(searchStats.avg).padStart(6)}ms │ ${String(searchStats.p50).padStart(6)}ms │ ${String(searchStats.p99).padStart(6)}ms │ ${String(searchStats.max).padStart(6)}ms`);
      console.log(`  DELETE (point) │ ${String(deleteStats.min).padStart(6)}ms │ ${String(deleteStats.avg).padStart(6)}ms │ ${String(deleteStats.p50).padStart(6)}ms │ ${String(deleteStats.p99).padStart(6)}ms │ ${String(deleteStats.max).padStart(6)}ms`);
    } else {
      console.log(`  (Provide ?collection=NAME to test UPSERT/SEARCH/DELETE)`);
    }
    console.log(`${'═'.repeat(70)}\n`);

    return {
      url: qdrantUrl,
      type: isCloud ? 'cloud' : 'self-hosted',
      iterations,
      collection: collectionName,
      ping: pingStats,
      list: listStats,
      upsert: collectionName ? upsertStats : null,
      search: collectionName ? searchStats : null,
      delete: collectionName ? deleteStats : null
    };

  } catch (error) {
    console.error('❌ [Qdrant] Benchmark error:', error.message);
    return null;
  }
}

// Export for testing/debugging
export default qdrantClient;
