// lib/services/constants/apiCosts.js
// Centralized API cost constants for third-party services

/**
 * API Cost Constants
 *
 * This file centralizes all third-party API pricing information.
 * Update these values when pricing changes.
 *
 * All costs are in USD.
 * Source: Official API pricing pages (as of 2024-2025)
 */

export const API_COSTS = {
  // Google Maps Platform
  // Source: https://developers.google.com/maps/billing-and-pricing/pricing
  GOOGLE_MAPS: {
    // Autocomplete - Per Session pricing
    PLACES_AUTOCOMPLETE: {
      // Cost for 1000 requests
      PER_1000: 2.83,
      // Cost per individual request
      PER_REQUEST: 0.00283
    },
    // Place Details - Basic Data
    PLACES_DETAILS: {
      // Cost for 1000 requests
      PER_1000: 17.00,
      // Cost per individual request
      PER_REQUEST: 0.017
    },
    // Nearby Search - Contact-Based Requests
    PLACES_NEARBY_SEARCH: {
      // Cost for 1000 requests
      PER_1000: 32.00,
      // Cost per individual request
      PER_REQUEST: 0.032
    },
    // Geocoding API - Convert coordinates to addresses
    GEOCODING: {
      // Cost for 1000 requests
      PER_1000: 5.00,
      // Cost per individual request
      PER_REQUEST: 0.005
    }
  },

  // Google Cloud Vision
  // Source: https://cloud.google.com/vision/pricing
  GOOGLE_VISION: {
    // First 1,000 units/month are free.
    // Price shown is for 1,001 - 5,000,000 units per month.
    // Each page in a multi-page file (e.g., PDF) is treated as a single unit.
    DOCUMENT_TEXT_DETECTION: {
      // Cost for 1000 requests (units)
      PER_1000: 1.50,
      // Cost per individual request (unit)
      PER_REQUEST: 0.0015
    }
  },

  // Qdrant Vector Database (Self-hosted on Hetzner VPS)
  // Source: Self-hosted, no API costs
  // Performance: 23x faster than Pinecone (123ms → 5.3ms search latency)
  QDRANT: {
    STORAGE_PER_GB: 0,  // Self-hosted, included in VPS cost
    QUERY_BASE: 0,       // Self-hosted, no per-query cost
    UPSERT: {
      PER_1000: 0,
      PER_REQUEST: 0
    }
  },

  // Self-Hosted Embeddings & Reranking (2025-12-04)
  // Replaces Cohere API with self-hosted embed-server
  // Models: E5-large (embedding), BGE-reranker-base (reranking)
  SELF_HOSTED_EMBEDDINGS: {
    EMBEDDING: {
      MODEL: 'intfloat/multilingual-e5-large',
      DIMENSION: 1024,
      PER_MILLION: 0,           // $0 - self-hosted
      PER_TOKEN: 0,
    },
    RERANKING: {
      MODEL: 'BAAI/bge-reranker-base',
      PER_1000: 0,              // $0 - self-hosted
      PER_REQUEST: 0,
    },
    // Performance metrics vs Cohere baseline
    QUALITY: {
      RERANK_TOP_1_ACCURACY: 0.94,  // 94% vs Cohere 100%
      RERANK_RECALL_AT_3: 0.56,     // 56% vs Cohere 100%
    }
  },

  // Cohere Embeddings API (DEPRECATED - kept for reference)
  // Source: https://cohere.com/pricing
  // Migration: 2025-12-04 - Switched to self-hosted embed-server
  COHERE: {
    // Multilingual embeddings (embed-multilingual-v3.0)
    // 1024 dimensions, supports 100+ languages
    EMBEDDING: {
      PER_MILLION: 0.08,        // $0.08 per million tokens (DEPRECATED)
      PER_TOKEN: 0.00000008,
      FREE_TIER_TOKENS: 0,
      DEPRECATED: true,
      REPLACED_BY: 'SELF_HOSTED_EMBEDDINGS'
    },
    // English-only embeddings (embed-english-v3.0)
    EMBEDDING_ENGLISH: {
      PER_MILLION: 0.04,        // $0.04 per million tokens (DEPRECATED)
      PER_TOKEN: 0.00000004,
      FREE_TIER_TOKENS: 0,
      DEPRECATED: true
    }
  },

  // Cohere Rerank API (DEPRECATED - kept for reference)
  // Source: https://cohere.com/pricing
  // Migration: 2025-12-04 - Switched to self-hosted BGE reranker
  COHERE_RERANK: {
    // English rerank model (best for English queries)
    RERANK_ENGLISH_V3: {
      PER_1000: 1.00,              // $1.00 per 1,000 searches (DEPRECATED)
      PER_REQUEST: 0.001,
      FREE_TIER_REQUESTS: 0,
      DEPRECATED: true,
      REPLACED_BY: 'SELF_HOSTED_EMBEDDINGS.RERANKING'
    },
    // Multilingual rerank model (100+ languages)
    RERANK_MULTILINGUAL_V3: {
      PER_1000: 2.00,              // $2.00 per 1,000 searches (DEPRECATED)
      PER_REQUEST: 0.002,
      FREE_TIER_REQUESTS: 0,
      DEPRECATED: true
    },
    // Multilingual rerank v3.5 model (improved, 100+ languages)
    RERANK_V35: {
      PER_1000: 2.00,              // $2.00 per 1,000 searches (DEPRECATED)
      PER_REQUEST: 0.002,
      FREE_TIER_REQUESTS: 0,
      DEPRECATED: true
    }
  },

  // Neo4j Graph Database
  // Source: https://neo4j.com/pricing/
  // To be implemented when Neo4j integration is added
  NEO4J: {
    // Example structure for future implementation:
    // QUERY: {
    //   PER_1000: 0.00,
    //   PER_REQUEST: 0.00
    // }
  },

  // Resource Limits for Self-hosted Services
  // Replaces cost tracking with resource usage metrics
  // Applied to: Qdrant (vector storage)
  RESOURCE_LIMITS: {
    QDRANT: {
      MAX_VECTORS_PER_USER: 10000,           // Soft limit per user collection
      MAX_QUERIES_PER_MINUTE: 60,            // Rate limiting threshold
      VECTOR_STORAGE_WARNING_GB: 10,         // Alert when storage exceeds this
      COLLECTION_SIZE_WARNING: 5000,         // Alert when collection > 5K vectors
      CONCURRENT_QUERIES_LIMIT: 20           // Max parallel queries
    },
    NEO4J: {
      MAX_NODES_PER_USER: 50000,             // Soft limit per user
      MAX_RELATIONSHIPS_PER_USER: 200000,    // Soft limit per user
      QUERY_TIMEOUT_MS: 30000                // 30 second query timeout
    }
  }
};

/**
 * Helper function to get cost for a specific API operation
 * @param {string} provider - The API provider (e.g., 'GOOGLE_MAPS')
 * @param {string} operation - The operation (e.g., 'PLACES_AUTOCOMPLETE')
 * @returns {number} Cost per request
 */
export function getApiCost(provider, operation) {
  try {
    return API_COSTS[provider]?.[operation]?.PER_REQUEST || 0;
  } catch (error) {
    console.error(`[ApiCosts] Error getting cost for ${provider}.${operation}:`, error);
    return 0;
  }
}