// lib/services/serviceContact/server/searchCacheService.js
/**
 * Search Results Cache Service
 *
 * Caches full search results to avoid repeated vector search + rerank.
 * Short TTL (5 min) since contact data may change.
 *
 * Per-user isolation: Each user has their own cache namespace.
 */

import { createHash } from 'crypto';
import { redisClient } from './redisClient';

const SEARCH_CACHE_TTL = 300; // 5 minutes
const SEARCH_CACHE_PREFIX = 'search:';

// Per-user cache limits
const MAX_CACHED_SEARCHES_PER_USER = 100;

export class SearchCacheService {
  /**
   * Get cached search results.
   *
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @returns {Promise<Object|null>} - Cached results or null
   */
  static async get(userId, query) {
    const key = this._getCacheKey(userId, query);

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        // Check if still valid (within TTL)
        if (Date.now() - cached.timestamp < SEARCH_CACHE_TTL * 1000) {
          console.log(`✅ [SearchCache] HIT for user ${userId.slice(0, 8)}...`);
          return cached.results;
        }
      }
    } catch (error) {
      console.warn('[SearchCache] Read error:', error.message);
    }

    console.log(`❌ [SearchCache] MISS for user ${userId.slice(0, 8)}...`);
    return null;
  }

  /**
   * Cache search results.
   *
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {Array} results - Search results to cache
   */
  static async set(userId, query, results) {
    const key = this._getCacheKey(userId, query);

    try {
      // Store with timestamp for freshness check
      const data = {
        results: results.map(r => ({
          id: r.id,
          score: r.score,
          rerankScore: r.rerankScore,
        })),
        timestamp: Date.now(),
      };

      await redisClient.set(key, data, SEARCH_CACHE_TTL);

      // Enforce per-user limit (LRU eviction)
      await this._enforceUserLimit(userId);

      console.log(`✅ [SearchCache] SET for user ${userId.slice(0, 8)}... (${results.length} results)`);

    } catch (error) {
      console.warn('[SearchCache] Write error:', error.message);
    }
  }

  /**
   * Invalidate cache for a user (call when contacts change).
   *
   * @param {string} userId - User ID
   */
  static async invalidateUser(userId) {
    const pattern = `${SEARCH_CACHE_PREFIX}${userId}:*`;

    try {
      const count = await redisClient.clearPattern(pattern);
      console.log(`🗑️ [SearchCache] Invalidated ${count} searches for user ${userId.slice(0, 8)}...`);
      return count;
    } catch (error) {
      console.warn('[SearchCache] Invalidation error:', error.message);
      return 0;
    }
  }

  /**
   * Invalidate single query cache (call when specific contacts change).
   *
   * @param {string} userId - User ID
   * @param {string} query - Query to invalidate
   */
  static async invalidateQuery(userId, query) {
    const key = this._getCacheKey(userId, query);

    try {
      await redisClient.delete(key);
      console.log(`🗑️ [SearchCache] Invalidated query for user ${userId.slice(0, 8)}...`);
    } catch (error) {
      console.warn('[SearchCache] Query invalidation error:', error.message);
    }
  }

  /**
   * Get cache key.
   * @private
   */
  static _getCacheKey(userId, query) {
    const queryHash = createHash('sha256')
      .update(query.toLowerCase().trim())
      .digest('hex')
      .slice(0, 16);
    return `${SEARCH_CACHE_PREFIX}${userId}:${queryHash}`;
  }

  /**
   * Enforce per-user cache limit.
   * Evicts oldest entries when limit exceeded.
   * @private
   */
  static async _enforceUserLimit(userId) {
    const pattern = `${SEARCH_CACHE_PREFIX}${userId}:*`;

    try {
      const client = await redisClient.getClient();
      const keys = await client.keys(pattern);

      if (keys.length > MAX_CACHED_SEARCHES_PER_USER) {
        // Get TTLs to find oldest entries
        const ttls = await Promise.all(keys.map(k => client.ttl(k)));
        const keysWithTtl = keys.map((k, i) => ({ key: k, ttl: ttls[i] }));

        // Sort by TTL descending (oldest = lowest remaining TTL)
        keysWithTtl.sort((a, b) => a.ttl - b.ttl);

        // Delete oldest entries to get under limit
        const toDelete = keysWithTtl
          .slice(0, keys.length - MAX_CACHED_SEARCHES_PER_USER)
          .map(k => k.key);

        if (toDelete.length > 0) {
          await client.del(toDelete);
          console.log(`🗑️ [SearchCache] Evicted ${toDelete.length} old entries for user ${userId.slice(0, 8)}...`);
        }
      }
    } catch (error) {
      console.warn('[SearchCache] Limit enforcement error:', error.message);
    }
  }

  /**
   * Get cache statistics.
   */
  static async getStats() {
    try {
      const client = await redisClient.getClient();
      const allKeys = await client.keys(`${SEARCH_CACHE_PREFIX}*`);
      const userCounts = {};

      for (const key of allKeys) {
        const userId = key.split(':')[1];
        userCounts[userId] = (userCounts[userId] || 0) + 1;
      }

      return {
        totalCachedSearches: allKeys.length,
        usersWithCache: Object.keys(userCounts).length,
        avgSearchesPerUser: allKeys.length / Object.keys(userCounts).length || 0,
        estimatedMemoryKB: (allKeys.length * 1).toFixed(1), // ~1KB per entry
      };
    } catch (error) {
      console.error('[SearchCache] Stats error:', error.message);
      return { totalCachedSearches: 0, usersWithCache: 0, avgSearchesPerUser: 0, estimatedMemoryKB: '0' };
    }
  }
}
