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

  // Cohere Embeddings API (Replaces Pinecone Inference)
  // Source: https://cohere.com/pricing
  // Migration: 2025-01-30 - Switched from Pinecone Inference to Cohere
  COHERE: {
    // Multilingual embeddings (embed-multilingual-v3.0)
    // 1024 dimensions, supports 100+ languages
    EMBEDDING: {
      PER_MILLION: 0.08,        // $0.08 per million tokens (same as Pinecone Inference)
      PER_TOKEN: 0.00000008,
      FREE_TIER_TOKENS: 0       // No free tier
    },
    // English-only embeddings (embed-english-v3.0)
    EMBEDDING_ENGLISH: {
      PER_MILLION: 0.04,        // $0.04 per million tokens
      PER_TOKEN: 0.00000004,
      FREE_TIER_TOKENS: 0       // No free tier
    }
  },

  // Cohere Rerank API (Direct) - MIGRATION 2025-01-16
  // Source: https://cohere.com/pricing
  // Switched from Pinecone rerank due to poor scores (0.0000-0.0121)
  // Cohere provides much better semantic matching (0.6-0.9 expected)
  COHERE_RERANK: {
    // English rerank model (best for English queries)
    RERANK_ENGLISH_V3: {
      PER_1000: 1.00,              // $1.00 per 1,000 searches
      PER_REQUEST: 0.001,
      FREE_TIER_REQUESTS: 0        // No free tier
    },
    // Multilingual rerank model (100+ languages)
    RERANK_MULTILINGUAL_V3: {
      PER_1000: 2.00,              // $2.00 per 1,000 searches
      PER_REQUEST: 0.002,
      FREE_TIER_REQUESTS: 0        // No free tier
    },
    // Multilingual rerank v3.5 model (improved, 100+ languages)
    RERANK_V35: {
      PER_1000: 2.00,              // $2.00 per 1,000 searches
      PER_REQUEST: 0.002,
      FREE_TIER_REQUESTS: 0        // No free tier
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