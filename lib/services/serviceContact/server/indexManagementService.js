// lib/services/serviceContact/server/indexManagementService.js
// Server-side service for Qdrant collection management
// Handles collection creation, caching, and statistics
// MIGRATION: 2025-01-30 - Switched from Pinecone indexes to Qdrant collections

import { qdrantClient } from '../../../qdrant.js';
import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';

/**
 * IndexManagementService
 *
 * Architecture:
 * - Server-side only (Qdrant operations)
 * - Manages Qdrant collection lifecycle
 * - Caches collection existence for performance
 * - Auto-creates collections if they don't exist
 *
 * Pinecone → Qdrant Mapping:
 * - Index → Qdrant instance (single server)
 * - Namespace → Collection (one per user: userId)
 * - index.namespace(user_123) → collection "123"
 */
export class IndexManagementService {
  // Private static cache for collection existence checks
  static _collectionCache = new Set();

  /**
   * Ensure collection exists for a user
   * Creates the collection if it doesn't exist
   * Uses collection name = userId (no 'user_' prefix)
   *
   * @param {string} userId - User ID (becomes collection name)
   * @returns {Promise<void>}
   */
  static async ensureCollection(userId) {
    const collectionName = userId;  // Direct use, no prefix
    const startTime = Date.now();

    try {
      // Check cache first
      if (this._collectionCache.has(collectionName)) {
        console.log(`📦 [IndexManagement] Using cached collection: ${collectionName}`);
        return;
      }

      console.log(`🔍 [IndexManagement] Checking if collection exists: ${collectionName}`);

      // Check if collection exists
      try {
        await qdrantClient.getCollection(collectionName);
        console.log(`✅ [IndexManagement] Collection exists: ${collectionName}`);
        this._collectionCache.add(collectionName);
      } catch (error) {
        // Collection doesn't exist (404 error)
        if (error.status === 404 || error.message?.includes('not found')) {
          console.log(`⚠️  [IndexManagement] Collection does not exist. Creating: ${collectionName}`);
          console.log(`📊 [IndexManagement] Using dimensions: ${SEMANTIC_SEARCH_CONFIG.EMBEDDING_DIMENSION} (${SEMANTIC_SEARCH_CONFIG.EMBEDDING_MODEL})`);

          const createStartTime = Date.now();

          await qdrantClient.createCollection(collectionName, {
            vectors: {
              size: SEMANTIC_SEARCH_CONFIG.EMBEDDING_DIMENSION,  // 1024 for embed-multilingual-v3.0
              distance: SEMANTIC_SEARCH_CONFIG.QDRANT_CONFIG.distance  // 'Cosine'
            },
            on_disk_payload: true  // Store payloads on disk for efficiency
          });

          const createDuration = Date.now() - createStartTime;
          console.log(`✅ [IndexManagement] Collection created in ${createDuration}ms`);

          // Add to cache
          this._collectionCache.add(collectionName);
        } else {
          // Real error, not 404
          throw error;
        }
      }

      const totalDuration = Date.now() - startTime;
      console.log(`✅ [IndexManagement] Collection ready in ${totalDuration}ms`);

    } catch (error) {
      console.error(`❌ [IndexManagement] Failed to ensure collection:`, {
        collectionName,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get collection statistics
   * Returns information about the collection including vector count, dimensions, etc.
   *
   * @param {string} userId - User ID (collection name)
   * @returns {Promise<object>} Collection statistics
   */
  static async getCollectionStats(userId) {
    const collectionName = userId;
    const startTime = Date.now();

    try {
      console.log(`📊 [IndexManagement] Fetching collection statistics for: ${collectionName}`);

      const collectionInfo = await qdrantClient.getCollection(collectionName);

      const duration = Date.now() - startTime;
      console.log(`✅ [IndexManagement] Stats fetched in ${duration}ms:`, {
        totalVectors: collectionInfo.points_count || 0,
        dimensions: collectionInfo.config?.params?.vectors?.size || SEMANTIC_SEARCH_CONFIG.EMBEDDING_DIMENSION,
        collectionName: collectionName
      });

      return {
        totalVectors: collectionInfo.points_count || 0,
        dimension: collectionInfo.config?.params?.vectors?.size || SEMANTIC_SEARCH_CONFIG.EMBEDDING_DIMENSION,
        distance: collectionInfo.config?.params?.vectors?.distance || 'Cosine',
        status: collectionInfo.status || 'unknown',
        config: collectionInfo.config
      };

    } catch (error) {
      console.error(`❌ [IndexManagement] Failed to get collection stats:`, {
        collectionName,
        message: error.message
      });
      return null;
    }
  }

  /**
   * Get all collections (replaces listIndexes)
   * Returns list of all collection names
   *
   * @returns {Promise<Array<string>>} Array of collection names
   */
  static async listCollections() {
    try {
      const result = await qdrantClient.getCollections();
      const collections = result.collections.map(c => c.name);
      console.log(`📋 [IndexManagement] Found ${collections.length} collections`);
      return collections;
    } catch (error) {
      console.error(`❌ [IndexManagement] Failed to list collections:`, error);
      return [];
    }
  }

  /**
   * Clear collection cache
   * Useful for testing or forcing fresh checks
   */
  static clearCache() {
    console.log(`🗑️  [IndexManagement] Clearing collection cache (${this._collectionCache.size} entries)`);
    this._collectionCache.clear();
  }

  /**
   * Check if collection exists
   *
   * @param {string} userId - User ID (collection name)
   * @returns {Promise<boolean>} True if collection exists
   */
  static async collectionExists(userId) {
    const collectionName = userId;

    try {
      // Check cache first
      if (this._collectionCache.has(collectionName)) {
        return true;
      }

      // Check with Qdrant
      await qdrantClient.getCollection(collectionName);
      this._collectionCache.add(collectionName);
      return true;
    } catch (error) {
      if (error.status === 404 || error.message?.includes('not found')) {
        return false;
      }
      console.error(`❌ [IndexManagement] Failed to check if collection exists:`, error);
      return false;
    }
  }

  /**
   * Delete collection
   * WARNING: Permanently deletes all vectors for a user
   *
   * @param {string} userId - User ID (collection name)
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteCollection(userId) {
    const collectionName = userId;

    try {
      console.log(`🗑️  [IndexManagement] Deleting collection: ${collectionName}`);
      await qdrantClient.deleteCollection(collectionName);
      this._collectionCache.delete(collectionName);
      console.log(`✅ [IndexManagement] Collection deleted: ${collectionName}`);
      return true;
    } catch (error) {
      if (error.status === 404 || error.message?.includes('not found')) {
        console.log(`ℹ️  [IndexManagement] Collection already deleted: ${collectionName}`);
        this._collectionCache.delete(collectionName);
        return true;
      }
      console.error(`❌ [IndexManagement] Failed to delete collection:`, error);
      return false;
    }
  }

  /**
   * Get Qdrant client instance
   * Exposed for advanced use cases
   *
   * @returns {QdrantClient} Qdrant client
   */
  static getClient() {
    return qdrantClient;
  }

  // ============================================================================
  // DEPRECATED METHODS (kept for backwards compatibility)
  // ============================================================================

  /**
   * @deprecated Use ensureCollection(userId) instead
   * Legacy method name for Pinecone compatibility
   */
  static async getOrCreateIndex() {
    console.warn('⚠️  getOrCreateIndex() is deprecated. Collections are created per-user now.');
    return qdrantClient;
  }

  /**
   * @deprecated Use getCollectionStats(userId) instead
   */
  static async getIndexStats() {
    console.warn('⚠️  getIndexStats() is deprecated. Use getCollectionStats(userId) instead.');
    const collections = await this.listCollections();
    return {
      totalCollections: collections.length,
      collections: collections
    };
  }

  /**
   * @deprecated Use ensureCollection(userId) directly
   * Kept for backwards compatibility
   */
  static async getNamespacedIndex(userId) {
    console.warn('⚠️  getNamespacedIndex() is deprecated. Use ensureCollection(userId) instead.');
    await this.ensureCollection(userId);
    return {
      userId,
      collectionName: userId,
      note: 'Collections are managed per-user in Qdrant'
    };
  }

  /**
   * @deprecated Qdrant doesn't have a single "index" concept
   */
  static async indexExists() {
    console.warn('⚠️  indexExists() is deprecated. Qdrant uses collections per-user.');
    return true;  // Qdrant is always available
  }
}
