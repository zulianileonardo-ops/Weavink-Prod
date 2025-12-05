// lib/services/serviceContact/server/embeddingService.js
// Server-side service for generating embeddings using self-hosted E5-large
// MIGRATION: 2025-12-04 - Switched from Cohere API to self-hosted embed-service
// ARCHITECTURE: Separate embed-service (port 5555) for fault isolation

import { createHash } from 'crypto';
import http from 'http';
import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';
import { CostTrackingService } from './costTrackingService';
import { redisClient } from './redisClient';

// Embed service configuration (separate from rerank-service)
const EMBED_SERVICE_URL = process.env.EMBED_SERVICE_URL || 'http://embed-service:5555';

// Cache configuration
const EMBEDDING_CACHE_TTL = 86400; // 24 hours in seconds
const EMBEDDING_CACHE_PREFIX = 'emb:';

// HTTP keep-alive agent for connection reuse
const keepAliveAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 30000,
});

/**
 * EmbeddingService
 *
 * Architecture:
 * - Server-side only (embed-server URL required)
 * - Generates embeddings using self-hosted E5-large model via embed-server
 * - Redis caching for performance optimization (24h TTL)
 * - Returns 1024-dimensional vectors (multilingual optimized)
 * - Falls back to Cohere if EMBED_SERVER_URL is not set
 */
export class EmbeddingService {
  /**
   * Generate embedding for text with Redis caching.
   *
   * @param {string} text - Text to embed
   * @param {object} options - Options for tracking
   * @param {string} options.sessionId - Session ID for tracking
   * @param {string} options.userId - User ID for tracking
   * @param {boolean} options.trackSteps - Enable granular step tracking
   * @param {string} options.feature - Feature name for tracking
   * @param {string} options.stepLabel - Step label for tracking
   * @param {string} options.inputType - Not used (kept for API compatibility)
   * @returns {Promise<Array<number>>} 1024-dimensional embedding vector
   */
  static async generateEmbedding(text, options = {}) {
    const {
      sessionId = null,
      userId = null,
      trackSteps = false,
      feature = 'semantic_search_embedding',
      stepLabel = 'Embedding Generation',
      budgetCheck = null,
      inputType = 'search_document'
    } = options;
    const startTime = Date.now();

    try {
      // Clean and validate input
      const cleanText = text.replace(/\n/g, ' ').trim();

      if (!cleanText || cleanText.length === 0) {
        throw new Error('Cannot generate embedding for empty text');
      }

      console.log(`🧠 [EmbeddingService] Generating embedding for text (${cleanText.length} chars)`);
      console.log(`📝 [EmbeddingService] Text preview: "${cleanText.substring(0, 100)}..."`);
      console.log(`🔧 [EmbeddingService] Using embed-service at ${EMBED_SERVICE_URL}`);

      // 1. Check Redis cache first
      const cacheKey = this._getCacheKey(cleanText);
      let embedding = null;
      let cacheHit = false;

      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          embedding = cached;
          cacheHit = true;
          console.log(`✅ [EmbeddingService] Cache HIT - returning cached embedding`);
        }
      } catch (cacheError) {
        console.warn('[EmbeddingService] Cache read error:', cacheError.message);
      }

      // 2. Generate embedding via embed-server if not cached
      if (!embedding) {
        embedding = await this._callEmbedServer(cleanText);

        // 3. Cache for future requests (async, don't await)
        this._cacheEmbedding(cacheKey, embedding).catch(err => {
          console.warn('[EmbeddingService] Failed to cache embedding:', err.message);
        });
      }

      const duration = Date.now() - startTime;

      // Log embedding details
      console.log(`✅ [EmbeddingService] Embedding generated successfully:`);
      console.log(`   - Model: ${SEMANTIC_SEARCH_CONFIG.EMBEDDING_MODEL}`);
      console.log(`   - Dimension: ${embedding.length}`);
      console.log(`   - Duration: ${duration}ms`);
      console.log(`   - Cache: ${cacheHit ? 'HIT' : 'MISS'}`);
      console.log(`   - First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
      console.log(`   - Vector magnitude: ${this._calculateMagnitude(embedding).toFixed(4)}`);

      // Validate embedding dimension
      if (embedding.length !== SEMANTIC_SEARCH_CONFIG.EMBEDDING_DIMENSION) {
        console.warn(`⚠️ [EmbeddingService] Unexpected embedding dimension: ${embedding.length} (expected ${SEMANTIC_SEARCH_CONFIG.EMBEDDING_DIMENSION})`);
      }

      // Record Embedding Generation (self-hosted = $0 cost)
      if (trackSteps && sessionId && userId) {
        try {
          const estimatedTokens = Math.ceil(cleanText.length / 4);

          const metadata = {
            model: SEMANTIC_SEARCH_CONFIG.EMBEDDING_MODEL,
            dimension: embedding.length,
            textLength: cleanText.length,
            estimatedTokens: estimatedTokens,
            vectorMagnitude: this._calculateMagnitude(embedding),
            provider: 'self-hosted',
            cacheHit: cacheHit
          };

          // Record usage - $0 for self-hosted
          await CostTrackingService.recordUsage({
            userId,
            usageType: 'ApiUsage',
            feature: feature,
            cost: 0, // Self-hosted = $0
            isBillableRun: false, // Not billable (self-hosted)
            provider: 'self-hosted',
            sessionId,
            stepLabel: stepLabel,
            budgetCheck: budgetCheck,
            metadata: metadata
          });
          console.log(`✅ [EmbeddingService] ${stepLabel} recorded (self-hosted, $0)`);
        } catch (stepError) {
          console.error(`❌ [EmbeddingService] Failed to record ${stepLabel}:`, stepError);
        }
      }

      return embedding;

    } catch (error) {
      console.error(`❌ [EmbeddingService] Embedding generation failed:`, {
        message: error.message,
        textLength: text?.length || 0,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Call embed-server for single embedding.
   * @private
   */
  static async _callEmbedServer(text) {
    const response = await fetch(`${EMBED_SERVICE_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      agent: keepAliveAgent,
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embed server error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  /**
   * Generate cache key from text (SHA256 hash).
   * @private
   */
  static _getCacheKey(text) {
    const hash = createHash('sha256')
      .update(text.toLowerCase().trim())
      .digest('hex')
      .slice(0, 16); // 16 chars is enough for uniqueness
    return `${EMBEDDING_CACHE_PREFIX}${hash}`;
  }

  /**
   * Cache embedding in Redis.
   * @private
   */
  static async _cacheEmbedding(key, embedding) {
    await redisClient.set(key, embedding, EMBEDDING_CACHE_TTL);
  }

  /**
   * Estimate cost of generating an embedding
   * Self-hosted = $0
   *
   * @param {string} text - Text to estimate cost for
   * @returns {object} Cost estimation details
   */
  static estimateCost(text) {
    const estimatedTokens = Math.ceil(text.length / 4);

    return {
      textLength: text.length,
      estimatedTokens,
      embeddingCost: 0, // Self-hosted = $0
      model: SEMANTIC_SEARCH_CONFIG.EMBEDDING_MODEL,
      provider: 'self-hosted'
    };
  }

  /**
   * Batch generate embeddings
   * Uses single HTTP request for efficiency.
   *
   * @param {Array<string>} texts - Array of texts to embed
   * @param {object} options - Options for batch processing
   * @returns {Promise<Array<Array<number>>>} Array of embeddings
   */
  static async batchGenerateEmbeddings(texts, options = {}) {
    const {
      batchSize = SEMANTIC_SEARCH_CONFIG.BATCH_SIZE,
      delayMs = SEMANTIC_SEARCH_CONFIG.BATCH_DELAY_MS,
      onProgress = null,
      inputType = 'search_document'
    } = options;

    if (!texts || texts.length === 0) return [];

    console.log(`📦 [EmbeddingService] Batch generating embeddings for ${texts.length} texts`);

    const results = new Array(texts.length);
    const uncachedIndices = [];
    const uncachedTexts = [];

    // 1. Check cache for each text
    await Promise.all(texts.map(async (text, index) => {
      const cleanText = text.replace(/\n/g, ' ').trim();
      const cacheKey = this._getCacheKey(cleanText);
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          results[index] = cached;
        } else {
          uncachedIndices.push(index);
          uncachedTexts.push(cleanText);
        }
      } catch {
        uncachedIndices.push(index);
        uncachedTexts.push(cleanText);
      }
    }));

    console.log(`📦 [EmbeddingService] Cache hits: ${texts.length - uncachedTexts.length}, misses: ${uncachedTexts.length}`);

    // 2. Generate embeddings for uncached texts in batches
    if (uncachedTexts.length > 0) {
      let processedCount = 0;

      for (let i = 0; i < uncachedTexts.length; i += batchSize) {
        const batch = uncachedTexts.slice(i, i + batchSize);
        const batchIndices = uncachedIndices.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(uncachedTexts.length / batchSize);

        console.log(`📦 [EmbeddingService] Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);

        try {
          const response = await fetch(`${EMBED_SERVICE_URL}/embed/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            agent: keepAliveAgent,
            body: JSON.stringify({ texts: batch }),
          });

          if (!response.ok) {
            throw new Error(`Embed server error: ${response.status}`);
          }

          const data = await response.json();

          // 3. Place results and cache them
          batchIndices.forEach((originalIndex, j) => {
            const embedding = data.embeddings[j];
            results[originalIndex] = embedding;

            // Cache async
            const cacheKey = this._getCacheKey(batch[j]);
            this._cacheEmbedding(cacheKey, embedding).catch(() => {});
          });

          processedCount += batch.length;

          // Call progress callback if provided
          if (onProgress) {
            onProgress({
              processed: processedCount,
              total: uncachedTexts.length,
              batchNumber,
              totalBatches
            });
          }

          // Delay between batches (except for last batch)
          if (i + batchSize < uncachedTexts.length) {
            console.log(`⏳ [EmbeddingService] Waiting ${delayMs}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }

        } catch (error) {
          console.error(`❌ [EmbeddingService] Batch ${batchNumber} failed:`, error);
          throw error;
        }
      }
    }

    console.log(`✅ [EmbeddingService] Batch complete: ${results.length} embeddings generated`);

    return results;
  }

  /**
   * Calculate vector magnitude (Euclidean norm)
   * @private
   */
  static _calculateMagnitude(vector) {
    return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  }

  /**
   * Calculate cosine similarity between two vectors
   * Useful for debugging and validation
   *
   * @param {Array<number>} vector1 - First vector
   * @param {Array<number>} vector2 - Second vector
   * @returns {number} Cosine similarity (-1 to 1)
   */
  static calculateCosineSimilarity(vector1, vector2) {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have the same dimension');
    }

    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = this._calculateMagnitude(vector1);
    const magnitude2 = this._calculateMagnitude(vector2);

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Clear embedding cache (for maintenance).
   */
  static async clearCache() {
    const count = await redisClient.clearPattern(`${EMBEDDING_CACHE_PREFIX}*`);
    console.log(`🗑️ [EmbeddingService] Cleared ${count} cached embeddings`);
    return count;
  }

  /**
   * Get cache statistics.
   */
  static async getCacheStats() {
    try {
      const client = await redisClient.getClient();
      const keys = await client.keys(`${EMBEDDING_CACHE_PREFIX}*`);
      return {
        cachedEmbeddings: keys.length,
        estimatedMemoryMB: (keys.length * 4.5 / 1024).toFixed(1), // ~4.5KB per embedding
      };
    } catch (error) {
      console.error('[EmbeddingService] Failed to get cache stats:', error.message);
      return { cachedEmbeddings: 0, estimatedMemoryMB: '0' };
    }
  }
}
