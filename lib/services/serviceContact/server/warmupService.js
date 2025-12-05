// lib/services/serviceContact/server/warmupService.js
/**
 * Warmup Service - Ensures embed-server models are loaded.
 *
 * Call this on app startup to ensure first search is fast.
 */

import http from 'http';

const EMBED_SERVER_URL = process.env.EMBED_SERVER_URL || 'http://embed-server:5555';

const keepAliveAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 30000,
});

export class WarmupService {
  /**
   * Warm up all models on embed-server.
   * Call this once on app startup.
   */
  static async warmupModels() {
    console.log('[Warmup] Starting embed-server warmup...');

    try {
      const response = await fetch(`${EMBED_SERVER_URL}/warmup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        agent: keepAliveAgent,
        body: JSON.stringify({
          models: [
            { method: 'fastembed', model: 'intfloat/multilingual-e5-large' }
          ],
          rerankers: [
            { method: 'fastembed', model: 'BAAI/bge-reranker-base' }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`Warmup failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('[Warmup] Complete:', result);
      return result;

    } catch (error) {
      console.error('[Warmup] Failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if embed-server is healthy and models are loaded.
   */
  static async checkHealth() {
    try {
      const response = await fetch(`${EMBED_SERVER_URL}/health`, {
        agent: keepAliveAgent,
      });
      const data = await response.json();

      return {
        healthy: data.status === 'ok',
        embeddingModelLoaded: data.fastembed_loaded?.includes('intfloat/multilingual-e5-large'),
        rerankerModelLoaded: data.reranker_loaded?.includes('fastembed:BAAI/bge-reranker-base'),
        models: {
          fastembed: data.fastembed_loaded || [],
          reranker: data.reranker_loaded || [],
        }
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Wait for embed-server to be ready (with retries).
   */
  static async waitForReady(maxRetries = 30, delayMs = 2000) {
    console.log('[Warmup] Waiting for embed-server to be ready...');

    for (let i = 0; i < maxRetries; i++) {
      const health = await this.checkHealth();

      if (health.healthy && health.embeddingModelLoaded && health.rerankerModelLoaded) {
        console.log('[Warmup] Embed-server is ready!');
        console.log(`  - Embedding model: ${health.models.fastembed.join(', ')}`);
        console.log(`  - Reranker model: ${health.models.reranker.join(', ')}`);
        return true;
      }

      if (health.healthy) {
        console.log(`[Warmup] Server healthy but models loading (attempt ${i + 1}/${maxRetries})...`);
        console.log(`  - Embedding: ${health.embeddingModelLoaded ? '✓' : '⏳'}`);
        console.log(`  - Reranker: ${health.rerankerModelLoaded ? '✓' : '⏳'}`);
      } else {
        console.log(`[Warmup] Not ready yet (attempt ${i + 1}/${maxRetries}): ${health.error || 'unknown'}`);
      }

      await new Promise(r => setTimeout(r, delayMs));
    }

    throw new Error('Embed-server failed to become ready');
  }

  /**
   * Run a quick performance test to verify model latency.
   */
  static async runLatencyTest() {
    console.log('[Warmup] Running latency test...');

    try {
      // Test embedding
      const embedStart = Date.now();
      const embedResponse = await fetch(`${EMBED_SERVER_URL}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        agent: keepAliveAgent,
        body: JSON.stringify({
          method: 'fastembed',
          model: 'intfloat/multilingual-e5-large',
          text: 'This is a test embedding for latency measurement.',
        }),
      });
      const embedData = await embedResponse.json();
      const embedLatency = Date.now() - embedStart;

      // Test reranking
      const rerankStart = Date.now();
      const rerankResponse = await fetch(`${EMBED_SERVER_URL}/rerank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        agent: keepAliveAgent,
        body: JSON.stringify({
          method: 'fastembed',
          model: 'BAAI/bge-reranker-base',
          query: 'software engineer',
          documents: [
            'John Smith - Software Engineer at Google',
            'Jane Doe - Marketing Manager at Apple',
            'Bob Johnson - Full Stack Developer',
          ],
          top_n: 3,
        }),
      });
      const rerankData = await rerankResponse.json();
      const rerankLatency = Date.now() - rerankStart;

      const results = {
        embedding: {
          latency: embedLatency,
          serverLatency: embedData.latency_ms,
          dimension: embedData.dimension,
        },
        reranking: {
          latency: rerankLatency,
          serverLatency: rerankData.latency_ms,
          count: rerankData.count,
        },
      };

      console.log('[Warmup] Latency test results:');
      console.log(`  - Embedding: ${embedLatency}ms (server: ${embedData.latency_ms}ms)`);
      console.log(`  - Reranking: ${rerankLatency}ms (server: ${rerankData.latency_ms}ms)`);

      return results;

    } catch (error) {
      console.error('[Warmup] Latency test failed:', error.message);
      throw error;
    }
  }
}
