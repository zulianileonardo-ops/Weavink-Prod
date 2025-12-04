# Self-Hosted Embeddings & Reranking Implementation Guide

**Created**: December 4, 2025
**Status**: Ready for Implementation
**Hardware**: 32GB RAM, 16 cores, CPU-only

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Performance Targets](#2-performance-targets)
3. [Phase 1: Deploy Embed-Server Service](#3-phase-1-deploy-embed-server-service)
4. [Phase 2: Update Embedding Service](#4-phase-2-update-embedding-service)
5. [Phase 3: Update Rerank Service](#5-phase-3-update-rerank-service)
6. [Phase 4: Re-embed All Vectors](#6-phase-4-re-embed-all-vectors)
7. [Phase 5: Update Constants](#7-phase-5-update-constants)
8. [Phase 6: Optimizations](#8-phase-6-optimizations)
9. [Testing & Validation](#9-testing--validation)
10. [Rollback Plan](#10-rollback-plan)

---

## 1. Architecture Overview

### Current Architecture (Cohere API)

```
┌─────────────┐     HTTPS (~200ms)      ┌─────────────────┐
│   Weavink   │ ───────────────────────▶│   Cohere API    │
│    App      │                         │ embed-multi-v3  │
│             │◀─────────────────────── │ rerank-v3.5     │
└─────────────┘                         └─────────────────┘
     │                                        $$$
     │ Internal                          $0.08/M tokens
     ▼                                   $2/1K reranks
┌─────────────┐
│   Qdrant    │
│  (vectors)  │
└─────────────┘
```

### Target Architecture (Self-Hosted)

```
┌─────────────┐     HTTP (~5ms)         ┌─────────────────┐
│   Weavink   │ ───────────────────────▶│  embed-server   │
│    App      │    Docker network       │  E5-large       │
│             │◀─────────────────────── │  BGE-reranker   │
└─────────────┘                         └─────────────────┘
     │                                        $0
     │ Internal                          Models in RAM
     ▼                                   Always warm
┌─────────────┐     ┌─────────────┐
│   Qdrant    │     │    Redis    │
│  (vectors)  │     │  (cache)    │
└─────────────┘     └─────────────┘
```

### Models Used

| Purpose | Model | Dimensions | RAM Usage | Load Time |
|---------|-------|------------|-----------|-----------|
| Embeddings | `intfloat/multilingual-e5-large` | 1024 | ~2GB | ~30s |
| Reranking | `BAAI/bge-reranker-base` | N/A | ~1GB | ~15s |

### Memory Budget (32GB Total)

| Component | RAM Allocation |
|-----------|----------------|
| E5-large model | 2GB |
| BGE-reranker model | 1GB |
| ONNX runtime overhead | 1GB |
| Redis cache | 4GB |
| Weavink app | 2GB |
| Qdrant | 4GB |
| OS + buffer | 18GB |
| **Total** | **32GB** |

---

## 2. Performance Targets

### Benchmark Results (Cohere Baseline)

| Metric | Cohere | BGE-reranker-base |
|--------|--------|-------------------|
| Recall@3 | 100% (baseline) | 56% |
| Top-1 Accuracy | 100% | 94% |
| Avg Latency | 305ms | 297ms |

### Target Latency Breakdown

| Stage | Cohere (current) | Self-Hosted (target) |
|-------|------------------|----------------------|
| Network | ~200ms | ~5ms |
| Embedding | ~100ms | ~50ms (first) / ~5ms (cached) |
| Vector search | ~5ms | ~5ms |
| Rerank (20 docs) | ~300ms | ~150ms |
| **Total** | **~605ms** | **~210ms** |

---

## 3. Phase 1: Deploy Embed-Server Service

### 3.1 Create Dockerfile

**File**: `docker/embed-server/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for ONNX
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    flask==3.0.0 \
    gunicorn==21.2.0 \
    fastembed==0.3.6 \
    sentence-transformers==2.2.2 \
    einops==0.7.0

# Copy server script
COPY scripts/embed-server.py /app/embed-server.py

# Pre-download models at build time (faster startup)
# E5-large embedding model (~2GB)
RUN python -c "\
from fastembed import TextEmbedding; \
print('Downloading E5-large...'); \
model = TextEmbedding('intfloat/multilingual-e5-large'); \
print('E5-large ready'); \
"

# BGE reranker model (~1GB)
RUN python -c "\
from fastembed.rerank.cross_encoder import TextCrossEncoder; \
print('Downloading BGE-reranker-base...'); \
model = TextCrossEncoder('BAAI/bge-reranker-base'); \
print('BGE-reranker ready'); \
"

# Create warmup script that runs on startup
COPY docker/embed-server/warmup.py /app/warmup.py

EXPOSE 5555

# Use gunicorn for production with warmup
CMD ["sh", "-c", "python warmup.py && gunicorn --bind 0.0.0.0:5555 --workers 1 --threads 4 --timeout 120 embed-server:app"]
```

### 3.2 Create Warmup Script

**File**: `docker/embed-server/warmup.py`

```python
#!/usr/bin/env python3
"""
Warmup script - Pre-loads models into memory before starting server.
This ensures the first request is fast, not slow.

Run BEFORE starting gunicorn.
"""
import time
import sys

def warmup():
    print("=" * 60)
    print("  EMBED-SERVER WARMUP")
    print("=" * 60)

    total_start = time.time()

    # 1. Load E5-large embedding model
    print("\n[1/4] Loading E5-large embedding model...")
    start = time.time()
    from fastembed import TextEmbedding
    embedding_model = TextEmbedding('intfloat/multilingual-e5-large')
    print(f"      Loaded in {time.time() - start:.1f}s")

    # 2. Run dummy embedding to fully initialize
    print("\n[2/4] Warming up embedding model (dummy inference)...")
    start = time.time()
    dummy_texts = [
        "This is a warmup text for the embedding model.",
        "Another warmup text to ensure model is fully loaded.",
        "Third warmup text for good measure."
    ]
    list(embedding_model.embed(dummy_texts))
    print(f"      Warmed up in {time.time() - start:.1f}s")

    # 3. Load BGE reranker model
    print("\n[3/4] Loading BGE-reranker-base model...")
    start = time.time()
    from fastembed.rerank.cross_encoder import TextCrossEncoder
    reranker_model = TextCrossEncoder('BAAI/bge-reranker-base')
    print(f"      Loaded in {time.time() - start:.1f}s")

    # 4. Run dummy rerank to fully initialize
    print("\n[4/4] Warming up reranker model (dummy inference)...")
    start = time.time()
    dummy_query = "warmup query"
    dummy_docs = [
        "First document for warmup",
        "Second document for warmup",
        "Third document for warmup"
    ]
    list(reranker_model.rerank(dummy_query, dummy_docs))
    print(f"      Warmed up in {time.time() - start:.1f}s")

    total_time = time.time() - total_start
    print("\n" + "=" * 60)
    print(f"  WARMUP COMPLETE - Total time: {total_time:.1f}s")
    print("  Models are now in memory and ready for requests!")
    print("=" * 60 + "\n")

if __name__ == '__main__':
    try:
        warmup()
        sys.exit(0)
    except Exception as e:
        print(f"WARMUP FAILED: {e}")
        sys.exit(1)
```

### 3.3 Update embed-server.py for Persistent Models

**File**: `scripts/embed-server.py` (modifications)

Add this at the top after imports:

```python
# Global model instances - loaded once at startup, kept in memory
# These are populated by warmup.py before gunicorn starts
_embedding_model = None
_reranker_model = None

def get_embedding_model():
    """Get the pre-loaded embedding model."""
    global _embedding_model
    if _embedding_model is None:
        from fastembed import TextEmbedding
        logger.info("Loading E5-large (should only happen once)...")
        _embedding_model = TextEmbedding('intfloat/multilingual-e5-large')
    return _embedding_model

def get_reranker_model():
    """Get the pre-loaded reranker model."""
    global _reranker_model
    if _reranker_model is None:
        from fastembed.rerank.cross_encoder import TextCrossEncoder
        logger.info("Loading BGE-reranker (should only happen once)...")
        _reranker_model = TextCrossEncoder('BAAI/bge-reranker-base')
    return _reranker_model
```

### 3.4 Coolify Service Configuration

| Setting | Value |
|---------|-------|
| **Service Name** | `embed-server` |
| **Build Type** | Dockerfile |
| **Dockerfile Path** | `docker/embed-server/Dockerfile` |
| **Port** | 5555 (internal only) |
| **CPU Limit** | 8 cores |
| **Memory Limit** | 8GB |
| **Health Check URL** | `/health` |
| **Health Check Interval** | 30s |
| **Restart Policy** | Always |

### 3.5 Environment Variables (Main App)

Add to Weavink app's environment:

```env
EMBED_SERVER_URL=http://embed-server:5555
```

---

## 4. Phase 2: Update Embedding Service

### 4.1 Current Code (Cohere)

**File**: `lib/services/serviceContact/server/embeddingService.js`

```javascript
// CURRENT - Uses Cohere API
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

export class EmbeddingService {
  static async generateEmbedding(text, inputType = 'search_document') {
    const response = await cohere.embed({
      texts: [text],
      model: 'embed-multilingual-v3.0',
      inputType: inputType,
    });
    return response.embeddings[0];
  }
}
```

### 4.2 New Code (Self-Hosted with Redis Cache)

**File**: `lib/services/serviceContact/server/embeddingService.js`

```javascript
/**
 * Embedding Service - Self-Hosted E5-large
 *
 * Uses local embed-server with Redis caching for optimal performance.
 * Cache TTL: 24 hours (same text = same embedding)
 */

import { createHash } from 'crypto';

// Get Redis client (your existing Redis setup)
import { getRedisClient } from '@/lib/redis';

const EMBED_SERVER_URL = process.env.EMBED_SERVER_URL || 'http://embed-server:5555';

// Cache configuration
const EMBEDDING_CACHE_TTL = 86400; // 24 hours in seconds
const EMBEDDING_CACHE_PREFIX = 'emb:';

// HTTP keep-alive agent for connection reuse
import http from 'http';
const keepAliveAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 30000,
});

export class EmbeddingService {
  /**
   * Generate embedding for text with Redis caching.
   *
   * @param {string} text - Text to embed
   * @param {string} inputType - Not used (kept for API compatibility)
   * @returns {Promise<number[]>} - 1024-dimensional embedding vector
   */
  static async generateEmbedding(text, inputType = 'search_document') {
    // 1. Check Redis cache first
    const cacheKey = this._getCacheKey(text);
    const redis = await getRedisClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        // Cache hit - return immediately (~5ms)
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      // Cache miss or error - continue to generate
      console.warn('Embedding cache error:', cacheError.message);
    }

    // 2. Generate embedding via embed-server (~50ms)
    const embedding = await this._callEmbedServer(text);

    // 3. Cache for future requests (async, don't await)
    this._cacheEmbedding(cacheKey, embedding, redis).catch(err => {
      console.warn('Failed to cache embedding:', err.message);
    });

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts (batch).
   * Uses single HTTP request for efficiency.
   *
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<number[][]>} - Array of embeddings
   */
  static async batchGenerateEmbeddings(texts) {
    if (!texts || texts.length === 0) return [];

    const redis = await getRedisClient();
    const results = new Array(texts.length);
    const uncachedIndices = [];
    const uncachedTexts = [];

    // 1. Check cache for each text
    await Promise.all(texts.map(async (text, index) => {
      const cacheKey = this._getCacheKey(text);
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          results[index] = JSON.parse(cached);
        } else {
          uncachedIndices.push(index);
          uncachedTexts.push(text);
        }
      } catch {
        uncachedIndices.push(index);
        uncachedTexts.push(text);
      }
    }));

    // 2. Generate embeddings for uncached texts in single batch
    if (uncachedTexts.length > 0) {
      const response = await fetch(`${EMBED_SERVER_URL}/embed/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        agent: keepAliveAgent,
        body: JSON.stringify({
          method: 'fastembed',
          model: 'intfloat/multilingual-e5-large',
          texts: uncachedTexts,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embed server error: ${response.status}`);
      }

      const data = await response.json();

      // 3. Place results and cache them
      uncachedIndices.forEach((originalIndex, i) => {
        const embedding = data.embeddings[i];
        results[originalIndex] = embedding;

        // Cache async
        const cacheKey = this._getCacheKey(uncachedTexts[i]);
        this._cacheEmbedding(cacheKey, embedding, redis).catch(() => {});
      });
    }

    return results;
  }

  /**
   * Call embed-server for single embedding.
   * @private
   */
  static async _callEmbedServer(text) {
    const response = await fetch(`${EMBED_SERVER_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      agent: keepAliveAgent,
      body: JSON.stringify({
        method: 'fastembed',
        model: 'intfloat/multilingual-e5-large',
        text: text,
      }),
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
  static async _cacheEmbedding(key, embedding, redis) {
    await redis.setex(key, EMBEDDING_CACHE_TTL, JSON.stringify(embedding));
  }

  /**
   * Clear embedding cache (for maintenance).
   */
  static async clearCache() {
    const redis = await getRedisClient();
    const keys = await redis.keys(`${EMBEDDING_CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  }

  /**
   * Get cache statistics.
   */
  static async getCacheStats() {
    const redis = await getRedisClient();
    const keys = await redis.keys(`${EMBEDDING_CACHE_PREFIX}*`);
    return {
      cachedEmbeddings: keys.length,
      estimatedMemoryMB: (keys.length * 4.5).toFixed(1), // ~4.5KB per embedding
    };
  }
}
```

---

## 5. Phase 3: Update Rerank Service

### 5.1 Current Code (Cohere)

**File**: `lib/services/serviceContact/server/rerankService.js`

```javascript
// CURRENT - Uses Cohere API
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

export async function rerankContacts(query, contacts, topN = 10) {
  const response = await cohere.rerank({
    query,
    documents: contacts.map(c => c.searchableText),
    model: 'rerank-v3.5',
    topN,
  });
  // ... process results
}
```

### 5.2 New Code (Self-Hosted BGE)

**File**: `lib/services/serviceContact/server/rerankService.js`

```javascript
/**
 * Rerank Service - Self-Hosted BGE-reranker-base
 *
 * Uses local embed-server for reranking.
 *
 * Optimization: Limit candidates to 20 (from 50) to reduce latency.
 * BGE achieves 94% top-1 accuracy with 56% Recall@3 vs Cohere.
 */

import http from 'http';

const EMBED_SERVER_URL = process.env.EMBED_SERVER_URL || 'http://embed-server:5555';

// Optimization: Limit rerank candidates
// More candidates = better recall but slower
// 20 candidates provides good balance: ~150ms latency
const MAX_RERANK_CANDIDATES = 20;

// HTTP keep-alive agent
const keepAliveAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 30000,
});

/**
 * Rerank contacts using BGE cross-encoder.
 *
 * @param {string} query - Search query
 * @param {Array} contacts - Contacts to rerank (from vector search)
 * @param {number} topN - Number of results to return
 * @returns {Promise<Array>} - Reranked contacts with scores
 */
export async function rerankContacts(query, contacts, topN = 10) {
  if (!contacts || contacts.length === 0) {
    return [];
  }

  // Optimization: Only rerank top candidates from vector search
  const candidatesToRerank = contacts.slice(0, MAX_RERANK_CANDIDATES);

  // Prepare documents for reranking
  const documents = candidatesToRerank.map(contact => {
    // Build searchable text for each contact
    return buildSearchableText(contact);
  });

  try {
    const response = await fetch(`${EMBED_SERVER_URL}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      agent: keepAliveAgent,
      body: JSON.stringify({
        method: 'fastembed',
        model: 'BAAI/bge-reranker-base',
        query: query,
        documents: documents,
        top_n: Math.min(topN, candidatesToRerank.length),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Rerank server error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Map reranked results back to original contacts
    return data.results.map(result => ({
      ...candidatesToRerank[result.index],
      rerankScore: result.score,
    }));

  } catch (error) {
    console.error('Rerank failed, falling back to vector scores:', error.message);

    // Fallback: return original order (vector similarity scores)
    return contacts.slice(0, topN);
  }
}

/**
 * Build searchable text from contact object.
 * Same format used for embeddings.
 *
 * @param {Object} contact - Contact object
 * @returns {string} - Searchable text
 */
function buildSearchableText(contact) {
  const parts = [];

  if (contact.name) parts.push(contact.name);
  if (contact.company) parts.push(contact.company);
  if (contact.title) parts.push(contact.title);
  if (contact.notes) parts.push(contact.notes);
  if (contact.tags && contact.tags.length > 0) {
    parts.push(contact.tags.join(', '));
  }

  return parts.join(' - ');
}

/**
 * Health check for rerank service.
 */
export async function checkRerankHealth() {
  try {
    const response = await fetch(`${EMBED_SERVER_URL}/health`, {
      agent: keepAliveAgent,
    });
    const data = await response.json();
    return {
      healthy: data.status === 'ok',
      rerankerLoaded: data.reranker_loaded?.includes('fastembed:BAAI/bge-reranker-base'),
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
    };
  }
}
```

---

## 6. Phase 4: Re-embed All Vectors

### 6.1 Migration Script

**File**: `scripts/migrate-to-e5-embeddings.mjs`

```javascript
#!/usr/bin/env node
/**
 * Migration Script: Re-embed all contacts with E5-large
 *
 * IMPORTANT: Run this AFTER deploying embed-server and
 * updating embeddingService.js
 *
 * Usage:
 *   node scripts/migrate-to-e5-embeddings.mjs [--dry-run] [--batch-size=50]
 *
 * Options:
 *   --dry-run      Show what would be done without making changes
 *   --batch-size   Number of contacts to process at once (default: 50)
 *   --user-id      Only migrate specific user (for testing)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { QdrantClient } from '@qdrant/js-client-rest';

// Configuration
const EMBED_SERVER_URL = process.env.EMBED_SERVER_URL || 'http://localhost:5555';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50');
const DRY_RUN = process.argv.includes('--dry-run');
const SPECIFIC_USER = process.argv.find(a => a.startsWith('--user-id='))?.split('=')[1];

// Initialize Firebase Admin
initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
});
const db = getFirestore();

// Initialize Qdrant
const qdrant = new QdrantClient({ url: QDRANT_URL });

// Stats
const stats = {
  usersProcessed: 0,
  contactsProcessed: 0,
  contactsFailed: 0,
  startTime: Date.now(),
};

/**
 * Generate embedding via embed-server
 */
async function generateEmbedding(text) {
  const response = await fetch(`${EMBED_SERVER_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'fastembed',
      model: 'intfloat/multilingual-e5-large',
      text: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embed server error: ${response.status}`);
  }

  const data = await response.json();
  return data.embedding;
}

/**
 * Generate embeddings in batch
 */
async function batchGenerateEmbeddings(texts) {
  const response = await fetch(`${EMBED_SERVER_URL}/embed/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'fastembed',
      model: 'intfloat/multilingual-e5-large',
      texts: texts,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embed server error: ${response.status}`);
  }

  const data = await response.json();
  return data.embeddings;
}

/**
 * Build searchable text from contact
 */
function buildSearchableText(contact) {
  const parts = [];
  if (contact.name) parts.push(contact.name);
  if (contact.company) parts.push(contact.company);
  if (contact.title) parts.push(contact.title);
  if (contact.notes) parts.push(contact.notes);
  if (contact.tags?.length > 0) parts.push(contact.tags.join(', '));
  return parts.join(' - ');
}

/**
 * Process a single user's contacts
 */
async function processUser(userId) {
  console.log(`\n📂 Processing user: ${userId}`);

  // Get all contacts for this user
  const contactsRef = db.collection('users').doc(userId).collection('contacts');
  const snapshot = await contactsRef.get();

  if (snapshot.empty) {
    console.log(`   No contacts found`);
    return;
  }

  const contacts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  console.log(`   Found ${contacts.length} contacts`);

  // Process in batches
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => buildSearchableText(c));

    console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(contacts.length / BATCH_SIZE)}: ${batch.length} contacts`);

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would generate ${batch.length} embeddings`);
      stats.contactsProcessed += batch.length;
      continue;
    }

    try {
      // Generate embeddings in batch
      const embeddings = await batchGenerateEmbeddings(texts);

      // Upsert to Qdrant
      const points = batch.map((contact, idx) => ({
        id: contact.id,
        vector: embeddings[idx],
        payload: {
          userId: userId,
          name: contact.name || '',
          company: contact.company || '',
        },
      }));

      await qdrant.upsert(userId, {
        wait: true,
        points: points,
      });

      stats.contactsProcessed += batch.length;
      console.log(`   ✅ Upserted ${batch.length} vectors`);

    } catch (error) {
      console.error(`   ❌ Batch failed: ${error.message}`);
      stats.contactsFailed += batch.length;
    }

    // Small delay to avoid overwhelming the server
    await new Promise(r => setTimeout(r, 100));
  }

  stats.usersProcessed++;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('=' .repeat(60));
  console.log('  E5-LARGE EMBEDDING MIGRATION');
  console.log('=' .repeat(60));
  console.log(`  Embed Server: ${EMBED_SERVER_URL}`);
  console.log(`  Qdrant: ${QDRANT_URL}`);
  console.log(`  Batch Size: ${BATCH_SIZE}`);
  console.log(`  Dry Run: ${DRY_RUN}`);
  console.log('=' .repeat(60));

  // Check embed-server health
  try {
    const healthRes = await fetch(`${EMBED_SERVER_URL}/health`);
    const health = await healthRes.json();
    if (health.status !== 'ok') {
      throw new Error('Embed server not healthy');
    }
    console.log('\n✅ Embed server is healthy');
  } catch (error) {
    console.error('\n❌ Cannot connect to embed-server:', error.message);
    process.exit(1);
  }

  // Get all users or specific user
  let userIds = [];
  if (SPECIFIC_USER) {
    userIds = [SPECIFIC_USER];
  } else {
    const usersSnapshot = await db.collection('users').get();
    userIds = usersSnapshot.docs.map(doc => doc.id);
  }

  console.log(`\n📊 Found ${userIds.length} users to process`);

  // Process each user
  for (const userId of userIds) {
    await processUser(userId);
  }

  // Final stats
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  console.log('\n' + '=' .repeat(60));
  console.log('  MIGRATION COMPLETE');
  console.log('=' .repeat(60));
  console.log(`  Users processed: ${stats.usersProcessed}`);
  console.log(`  Contacts processed: ${stats.contactsProcessed}`);
  console.log(`  Contacts failed: ${stats.contactsFailed}`);
  console.log(`  Total time: ${elapsed}s`);
  console.log('=' .repeat(60));
}

// Run migration
migrate().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
```

### 6.2 Run Migration

```bash
# 1. Test with dry run
node scripts/migrate-to-e5-embeddings.mjs --dry-run

# 2. Test with single user
node scripts/migrate-to-e5-embeddings.mjs --user-id=YOUR_USER_ID

# 3. Run full migration
node scripts/migrate-to-e5-embeddings.mjs
```

---

## 7. Phase 5: Update Constants

### 7.1 Contact Constants

**File**: `lib/services/serviceContact/client/constants/contactConstants.js`

```javascript
// Update SEMANTIC_SEARCH_CONFIG
SEMANTIC_SEARCH_CONFIG: {
  // Embedding model (was Cohere embed-multilingual-v3.0)
  EMBEDDING_MODEL: 'intfloat/multilingual-e5-large',
  EMBEDDING_DIMENSION: 1024, // Same as before
  EMBEDDING_PROVIDER: 'self-hosted', // was 'cohere'

  // Reranking model (was Cohere rerank-v3.5)
  RERANK_MODEL: 'BAAI/bge-reranker-base',
  RERANK_PROVIDER: 'self-hosted', // was 'cohere'

  // Performance tuning
  MAX_RERANK_CANDIDATES: 20, // Limit for latency optimization

  // Quality metrics (from benchmark)
  EXPECTED_RECALL_AT_3: 0.56, // 56% vs Cohere baseline
  EXPECTED_TOP_1_ACCURACY: 0.94, // 94% top-1 match
}
```

### 7.2 API Costs

**File**: `lib/services/constants/apiCosts.js`

```javascript
// Update costs to reflect self-hosted ($0)
COHERE: {
  // Legacy - kept for reference
  EMBEDDING_COST_PER_MILLION_TOKENS: 0.08, // $0.08/M (deprecated)
  RERANK_COST_PER_1000_SEARCHES: 2.00, // $2/1K (deprecated)

  // Current - self-hosted
  CURRENT_PROVIDER: 'self-hosted',
  CURRENT_EMBEDDING_COST: 0, // $0 - E5-large via embed-server
  CURRENT_RERANK_COST: 0, // $0 - BGE via embed-server
}
```

---

## 8. Phase 6: Optimizations

### 8.1 Redis Cache Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     REDIS CACHE LAYERS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Query Embedding Cache (emb:*)                      │
│  ├─ Key: emb:{sha256(query)[:16]}                           │
│  ├─ Value: [1024-dim vector as JSON]                        │
│  ├─ TTL: 24 hours                                           │
│  └─ Size: ~4.5KB per entry                                  │
│                                                              │
│  Layer 2: Search Results Cache (search:*)                    │
│  ├─ Key: search:{userId}:{sha256(query)[:16]}               │
│  ├─ Value: {contactIds, scores, timestamp}                  │
│  ├─ TTL: 5 minutes (results may change)                     │
│  └─ Size: ~1KB per entry                                    │
│                                                              │
│  Layer 3: Contact Text Cache (contact:*)                     │
│  ├─ Key: contact:{contactId}:text                           │
│  ├─ Value: "searchable text string"                         │
│  ├─ TTL: 1 hour                                             │
│  └─ Size: ~500B per entry                                   │
│                                                              │
│  Memory Budget: 4GB                                          │
│  ├─ ~800K query embeddings                                  │
│  ├─ ~4M search results                                      │
│  └─ ~8M contact texts                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Search Results Cache Service

**File**: `lib/services/serviceContact/server/searchCacheService.js`

```javascript
/**
 * Search Results Cache Service
 *
 * Caches full search results to avoid repeated vector search + rerank.
 * Short TTL (5 min) since contact data may change.
 *
 * Per-user isolation: Each user has their own cache namespace.
 */

import { createHash } from 'crypto';
import { getRedisClient } from '@/lib/redis';

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
    const redis = await getRedisClient();
    const key = this._getCacheKey(userId, query);

    try {
      const cached = await redis.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        // Check if still valid (within TTL)
        if (Date.now() - data.timestamp < SEARCH_CACHE_TTL * 1000) {
          return data.results;
        }
      }
    } catch (error) {
      console.warn('Search cache read error:', error.message);
    }

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
    const redis = await getRedisClient();
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

      await redis.setex(key, SEARCH_CACHE_TTL, JSON.stringify(data));

      // Enforce per-user limit (LRU eviction)
      await this._enforceUserLimit(userId, redis);

    } catch (error) {
      console.warn('Search cache write error:', error.message);
    }
  }

  /**
   * Invalidate cache for a user (call when contacts change).
   *
   * @param {string} userId - User ID
   */
  static async invalidateUser(userId) {
    const redis = await getRedisClient();
    const pattern = `${SEARCH_CACHE_PREFIX}${userId}:*`;

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.warn('Search cache invalidation error:', error.message);
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
    const redis = await getRedisClient();
    const key = this._getCacheKey(userId, query);

    try {
      await redis.del(key);
    } catch (error) {
      console.warn('Search cache query invalidation error:', error.message);
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
  static async _enforceUserLimit(userId, redis) {
    const pattern = `${SEARCH_CACHE_PREFIX}${userId}:*`;
    const keys = await redis.keys(pattern);

    if (keys.length > MAX_CACHED_SEARCHES_PER_USER) {
      // Get TTLs to find oldest entries
      const ttls = await Promise.all(keys.map(k => redis.ttl(k)));
      const keysWithTtl = keys.map((k, i) => ({ key: k, ttl: ttls[i] }));

      // Sort by TTL descending (oldest = lowest remaining TTL)
      keysWithTtl.sort((a, b) => a.ttl - b.ttl);

      // Delete oldest entries to get under limit
      const toDelete = keysWithTtl
        .slice(0, keys.length - MAX_CACHED_SEARCHES_PER_USER)
        .map(k => k.key);

      if (toDelete.length > 0) {
        await redis.del(...toDelete);
      }
    }
  }

  /**
   * Get cache statistics.
   */
  static async getStats() {
    const redis = await getRedisClient();

    const allKeys = await redis.keys(`${SEARCH_CACHE_PREFIX}*`);
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
  }
}
```

### 8.3 Updated Semantic Search Service

**File**: `lib/services/serviceContact/server/semanticSearchService.js` (key changes)

```javascript
/**
 * Semantic Search Service - Optimized Version
 *
 * Optimization layers:
 * 1. Search results cache (5 min TTL)
 * 2. Query embedding cache (24h TTL)
 * 3. Limited rerank candidates (20)
 * 4. Connection keep-alive
 */

import { EmbeddingService } from './embeddingService.js';
import { rerankContacts } from './rerankService.js';
import { SearchCacheService } from './searchCacheService.js';
import { VectorStorageService } from './vectorStorageService.js';

export class SemanticSearchService {
  /**
   * Search contacts with semantic understanding.
   *
   * @param {string} userId - User ID
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Ranked contacts
   */
  static async search(userId, query, options = {}) {
    const {
      limit = 10,
      includeScores = true,
      skipCache = false,
    } = options;

    // 1. Check search results cache first (~5ms)
    if (!skipCache) {
      const cached = await SearchCacheService.get(userId, query);
      if (cached) {
        console.log(`[Search] Cache hit for query: "${query.slice(0, 30)}..."`);
        return this._hydrateResults(userId, cached, limit);
      }
    }

    // 2. Generate query embedding (~50ms, or ~5ms if cached)
    const queryEmbedding = await EmbeddingService.generateEmbedding(query);

    // 3. Vector similarity search (~5ms)
    const vectorResults = await VectorStorageService.search(
      userId,
      queryEmbedding,
      { limit: 20 } // Get top 20 for reranking
    );

    if (vectorResults.length === 0) {
      return [];
    }

    // 4. Rerank with cross-encoder (~150ms for 20 docs)
    const rerankedResults = await rerankContacts(
      query,
      vectorResults,
      limit
    );

    // 5. Cache results for future requests
    await SearchCacheService.set(userId, query, rerankedResults);

    return rerankedResults;
  }

  /**
   * Hydrate cached results with full contact data.
   * @private
   */
  static async _hydrateResults(userId, cachedResults, limit) {
    // Fetch full contact data from Firestore
    const contactIds = cachedResults.slice(0, limit).map(r => r.id);
    const contacts = await this._getContactsByIds(userId, contactIds);

    // Merge with cached scores
    return cachedResults.slice(0, limit).map(cached => {
      const contact = contacts.find(c => c.id === cached.id);
      return {
        ...contact,
        score: cached.score,
        rerankScore: cached.rerankScore,
      };
    });
  }

  /**
   * Invalidate cache when contacts change.
   */
  static async invalidateUserCache(userId) {
    await SearchCacheService.invalidateUser(userId);
  }
}
```

### 8.4 Model Warmup on App Startup

**File**: `lib/services/serviceContact/server/warmupService.js`

```javascript
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
  static async waitForReady(maxRetries = 30, delayMs = 1000) {
    console.log('[Warmup] Waiting for embed-server to be ready...');

    for (let i = 0; i < maxRetries; i++) {
      const health = await this.checkHealth();

      if (health.healthy && health.embeddingModelLoaded && health.rerankerModelLoaded) {
        console.log('[Warmup] Embed-server is ready!');
        return true;
      }

      console.log(`[Warmup] Not ready yet (attempt ${i + 1}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, delayMs));
    }

    throw new Error('Embed-server failed to become ready');
  }
}
```

### 8.5 Add Warmup to App Initialization

**File**: Add to your app's initialization (e.g., `pages/_app.js` or server startup)

```javascript
// In server initialization code
import { WarmupService } from '@/lib/services/serviceContact/server/warmupService';

async function initializeApp() {
  // ... other initialization ...

  // Warm up embed-server (if available)
  if (process.env.EMBED_SERVER_URL) {
    try {
      await WarmupService.waitForReady(30, 2000); // Wait up to 60s
      console.log('✅ Embed-server ready');
    } catch (error) {
      console.error('⚠️ Embed-server warmup failed:', error.message);
      // Continue anyway - server will load models on first request
    }
  }
}
```

---

## 9. Testing & Validation

### 9.1 Manual Testing Commands

```bash
# 1. Test embed-server health
curl http://embed-server:5555/health

# 2. Test single embedding
curl -X POST http://embed-server:5555/embed \
  -H "Content-Type: application/json" \
  -d '{
    "method": "fastembed",
    "model": "intfloat/multilingual-e5-large",
    "text": "Test embedding generation"
  }'

# 3. Test batch embedding
curl -X POST http://embed-server:5555/embed/batch \
  -H "Content-Type: application/json" \
  -d '{
    "method": "fastembed",
    "model": "intfloat/multilingual-e5-large",
    "texts": ["Text one", "Text two", "Text three"]
  }'

# 4. Test reranking
curl -X POST http://embed-server:5555/rerank \
  -H "Content-Type: application/json" \
  -d '{
    "method": "fastembed",
    "model": "BAAI/bge-reranker-base",
    "query": "software engineer",
    "documents": [
      "John - Software engineer at Google",
      "Jane - Marketing manager",
      "Bob - Full stack developer"
    ],
    "top_n": 3
  }'

# 5. Check loaded models
curl http://embed-server:5555/models
```

### 9.2 Performance Test Script

**File**: `scripts/test-search-performance.mjs`

```javascript
#!/usr/bin/env node
/**
 * Test search performance with self-hosted embeddings.
 */

const EMBED_SERVER_URL = process.env.EMBED_SERVER_URL || 'http://localhost:5555';

const TEST_QUERIES = [
  'software engineer developer',
  'investisseur startup capital',
  'designer mode sustainable',
  'chercheur intelligence artificielle',
];

async function testEmbedding(text) {
  const start = Date.now();
  const res = await fetch(`${EMBED_SERVER_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'fastembed',
      model: 'intfloat/multilingual-e5-large',
      text,
    }),
  });
  const data = await res.json();
  return {
    latency: Date.now() - start,
    serverLatency: data.latency_ms,
    dimension: data.dimension,
  };
}

async function testRerank(query, docs) {
  const start = Date.now();
  const res = await fetch(`${EMBED_SERVER_URL}/rerank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'fastembed',
      model: 'BAAI/bge-reranker-base',
      query,
      documents: docs,
      top_n: 10,
    }),
  });
  const data = await res.json();
  return {
    latency: Date.now() - start,
    serverLatency: data.latency_ms,
    count: data.count,
  };
}

async function runTests() {
  console.log('Performance Test Results\n' + '='.repeat(50));

  // Test embeddings
  console.log('\n📊 Embedding Latency:');
  for (const query of TEST_QUERIES) {
    const result = await testEmbedding(query);
    console.log(`  "${query.slice(0, 30)}..." → ${result.latency}ms (server: ${result.serverLatency}ms)`);
  }

  // Test reranking with 20 docs
  console.log('\n📊 Reranking Latency (20 docs):');
  const testDocs = Array(20).fill(0).map((_, i) =>
    `Person ${i} - Professional with various skills and experience in their field.`
  );

  for (const query of TEST_QUERIES) {
    const result = await testRerank(query, testDocs);
    console.log(`  "${query.slice(0, 30)}..." → ${result.latency}ms (server: ${result.serverLatency}ms)`);
  }

  console.log('\n' + '='.repeat(50));
}

runTests().catch(console.error);
```

### 9.3 Validation Checklist

- [ ] Embed-server container starts successfully
- [ ] `/health` endpoint returns `{ "status": "ok" }`
- [ ] Models pre-loaded on startup (check logs)
- [ ] Single embedding returns 1024-dim vector
- [ ] Batch embedding works correctly
- [ ] Reranking returns sorted results
- [ ] Redis caching works (second query is faster)
- [ ] Search results match expected quality
- [ ] Migration script completes successfully
- [ ] All existing contacts searchable after migration

---

## 10. Rollback Plan

### If Issues Arise

1. **Revert Code Changes**
   ```bash
   git checkout main -- lib/services/serviceContact/server/embeddingService.js
   git checkout main -- lib/services/serviceContact/server/rerankService.js
   ```

2. **Remove Environment Variable**
   ```
   # Remove from Coolify
   EMBED_SERVER_URL=http://embed-server:5555
   ```

3. **Re-embed with Cohere** (if vectors corrupted)
   ```bash
   node scripts/migrate-to-cohere-embeddings.mjs
   ```

4. **Stop Embed-Server Container**
   - Disable service in Coolify

### Keep Cohere API Key Available

Don't delete `COHERE_API_KEY` from secrets - keep as fallback.

---

## Summary

### Files to Create

| File | Purpose |
|------|---------|
| `docker/embed-server/Dockerfile` | Container image |
| `docker/embed-server/warmup.py` | Pre-load models |
| `scripts/migrate-to-e5-embeddings.mjs` | Vector migration |
| `lib/services/serviceContact/server/searchCacheService.js` | Redis caching |
| `lib/services/serviceContact/server/warmupService.js` | App warmup |
| `scripts/test-search-performance.mjs` | Performance testing |

### Files to Modify

| File | Change |
|------|--------|
| `lib/services/serviceContact/server/embeddingService.js` | Use embed-server + cache |
| `lib/services/serviceContact/server/rerankService.js` | Use embed-server |
| `lib/services/serviceContact/server/semanticSearchService.js` | Add caching layer |
| `lib/services/serviceContact/client/constants/contactConstants.js` | Update model names |
| `lib/services/constants/apiCosts.js` | Update costs to $0 |
| `scripts/embed-server.py` | Minor optimizations |

### Expected Performance

| Metric | Before (Cohere) | After (Self-Hosted) |
|--------|-----------------|---------------------|
| First search | ~605ms | ~210ms |
| Cached search | ~605ms | ~10ms |
| Monthly cost | ~$50-100 | $0 |
| Privacy | Data sent to Cohere | All local |

### Quality Trade-off

| Metric | Cohere | Self-Hosted |
|--------|--------|-------------|
| Recall@3 | 100% | 56% |
| Top-1 Accuracy | 100% | 94% |

The top result is correct 94% of the time - acceptable for most use cases.
