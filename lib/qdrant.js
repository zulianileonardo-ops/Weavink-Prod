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

// Export for testing/debugging
export default qdrantClient;
