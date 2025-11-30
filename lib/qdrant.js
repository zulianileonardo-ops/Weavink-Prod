// lib/qdrant.js
// Centralized Qdrant client initialization for Weavink
// Replaces Pinecone for vector storage in self-hosted infrastructure

import { QdrantClient } from '@qdrant/js-client-rest';

// Validate required environment variable
if (!process.env.QDRANT_URL) {
  throw new Error('QDRANT_URL environment variable is required. Expected: http://qdrant-qkkkc8kskocgwo0o8c444cgo:6333');
}

// Initialize Qdrant client
// No API key needed for internal Docker network
export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
});

console.log(`✅ [Qdrant] Client initialized: ${process.env.QDRANT_URL}`);

// Export for testing/debugging
export default qdrantClient;
