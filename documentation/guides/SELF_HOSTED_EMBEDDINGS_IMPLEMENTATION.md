# Self-Hosted Embeddings & Reranking Implementation Guide

**Created**: December 4, 2025
**Updated**: December 5, 2025
**Status**: Implemented
**Hardware**: 32GB RAM, 16 cores, CPU-only

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Performance Targets](#2-performance-targets)
3. [Phase 1: Deploy Embed-Service](#3-phase-1-deploy-embed-service)
4. [Phase 2: Deploy Rerank-Service](#4-phase-2-deploy-rerank-service)
5. [Phase 3: Update Embedding Service](#5-phase-3-update-embedding-service)
6. [Phase 4: Update Rerank Service](#6-phase-4-update-rerank-service)
7. [Phase 5: Re-embed All Vectors](#7-phase-5-re-embed-all-vectors)
8. [Phase 6: Update Constants](#8-phase-6-update-constants)
9. [Phase 7: Optimizations](#9-phase-7-optimizations)
10. [Testing & Validation](#10-testing--validation)
11. [Rollback Plan](#11-rollback-plan)

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

### Target Architecture (Self-Hosted - Two Services)

```
┌─────────────┐     HTTP (~5ms)         ┌─────────────────┐
│   Weavink   │ ───────────────────────▶│  embed-service  │ Port 5555
│    App      │    Docker network       │  E5-large       │ 6 CPU, 6GB
│             │◀─────────────────────── │  4 workers × 2  │
│             │                         └─────────────────┘
│             │                               $0
│             │     HTTP (~5ms)         ┌─────────────────┐
│             │ ───────────────────────▶│  rerank-service │ Port 5556
│             │    Docker network       │  BGE-reranker   │ 4 CPU, 4GB
│             │◀─────────────────────── │  2 workers × 2  │
└─────────────┘                         └─────────────────┘
     │                                        $0
     ▼
┌─────────────┐     ┌─────────────┐
│   Qdrant    │     │    Redis    │
│  (vectors)  │     │  (cache)    │
└─────────────┘     └─────────────┘
```

### Why Two Separate Services?

| Factor | Benefit |
|--------|---------|
| Fault Isolation | Rerank crash doesn't kill embeddings |
| Independent Scaling | Scale each service based on load |
| Resource Tuning | Optimized CPU/memory per workload |
| Maintenance | Update one without affecting other |

### Models Used

| Purpose | Model | Dimensions | RAM Usage | Service |
|---------|-------|------------|-----------|---------|
| Embeddings | `intfloat/multilingual-e5-large` | 1024 | ~2.5GB | embed-service |
| Reranking | `BAAI/bge-reranker-base` | N/A | ~1.5GB | rerank-service |

### Resource Allocation (32GB Total)

| Component | CPU | RAM |
|-----------|-----|-----|
| embed-service | 6 | 6GB |
| rerank-service | 4 | 4GB |
| Redis cache | 2 | 4GB |
| Qdrant | 2 | 4GB |
| Weavink app | 2 | 4GB |
| OS + buffer | - | 10GB |
| **Total** | **16** | **32GB** |

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

### Concurrent Capacity

| Service | Workers | Threads | Concurrent Requests |
|---------|---------|---------|---------------------|
| embed-service | 4 | 2 | 8 |
| rerank-service | 2 | 2 | 4 |

---

## 3. Phase 1: Deploy Embed-Service

### 3.1 Create embed-service.py

**File**: `scripts/embed-service.py`

```python
#!/usr/bin/env python3
"""
Embedding Service - E5-large only
Separated from reranking for fault isolation and independent scaling.

Run with gunicorn:
  gunicorn --bind 0.0.0.0:5555 --workers 4 --threads 2 --worker-class gthread --preload embed-service:app
"""
from flask import Flask, request, jsonify
import time
import logging
import os

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Model cache - loaded once at startup (shared via --preload)
embedding_model = None
MODEL_NAME = 'intfloat/multilingual-e5-large'
MODEL_DIMENSION = 1024


def get_model():
    """Get or load the E5-large embedding model (cached)."""
    global embedding_model
    if embedding_model is None:
        from fastembed import TextEmbedding
        logger.info(f"Loading embedding model: {MODEL_NAME}")
        start = time.perf_counter()
        embedding_model = TextEmbedding(model_name=MODEL_NAME)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(f"Embedding model loaded in {elapsed:.0f}ms (dim={MODEL_DIMENSION})")
    return embedding_model


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'embed-service',
        'model': MODEL_NAME,
        'model_loaded': embedding_model is not None,
        'dimension': MODEL_DIMENSION,
    })


@app.route('/embed', methods=['POST'])
def embed():
    """Generate embedding for a single text."""
    data = request.json
    text = data.get('text')

    if not text:
        return jsonify({'error': 'Missing required field: text'}), 400

    start = time.perf_counter()
    model = get_model()
    embeddings = list(model.embed([text]))
    elapsed = (time.perf_counter() - start) * 1000

    return jsonify({
        'embedding': embeddings[0].tolist(),
        'dimension': len(embeddings[0]),
        'latency_ms': round(elapsed, 2),
    })


@app.route('/embed/batch', methods=['POST'])
def embed_batch():
    """Generate embeddings for multiple texts."""
    data = request.json
    texts = data.get('texts', [])

    if not texts:
        return jsonify({'error': 'Missing required field: texts'}), 400

    start = time.perf_counter()
    model = get_model()
    embeddings = list(model.embed(texts))
    elapsed = (time.perf_counter() - start) * 1000

    return jsonify({
        'embeddings': [emb.tolist() for emb in embeddings],
        'count': len(embeddings),
        'dimension': len(embeddings[0]) if embeddings else 0,
        'latency_ms': round(elapsed, 2),
    })


# Pre-load model when running with gunicorn --preload
def preload_model():
    logger.info("Pre-loading embedding model for gunicorn workers...")
    get_model()
    logger.info("Embedding model pre-loaded successfully")


if os.environ.get('GUNICORN_PRELOAD') == '1' or __name__ != '__main__':
    try:
        preload_model()
    except Exception as e:
        logger.warning(f"Pre-load failed (will load on first request): {e}")


if __name__ == '__main__':
    preload_model()
    app.run(host='0.0.0.0', port=5555, debug=False, threaded=True)
```

### 3.2 Create Dockerfile.embed

**File**: `docker/embed-server/Dockerfile.embed`

```dockerfile
# Embedding Service Dockerfile
# E5-large only - separated for fault isolation and independent scaling

FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies (embedding only)
RUN pip install --no-cache-dir \
    flask==3.0.0 \
    gunicorn==21.2.0 \
    fastembed==0.3.6

# Copy embedding service
COPY scripts/embed-service.py /app/embed-service.py

# Pre-download E5-large model at build time (~2.5GB)
RUN python -c "\
from fastembed import TextEmbedding; \
import time; \
print('Downloading intfloat/multilingual-e5-large...'); \
start = time.time(); \
model = TextEmbedding('intfloat/multilingual-e5-large'); \
print(f'Model downloaded in {time.time() - start:.1f}s'); \
print('Running warmup inference...'); \
_ = list(model.embed(['warmup text'])); \
print('Done!'); \
"

EXPOSE 5555

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:5555/health || exit 1

# Environment
ENV PYTHONUNBUFFERED=1
ENV OMP_NUM_THREADS=4
ENV TOKENIZERS_PARALLELISM=false

# Gunicorn: 4 workers, 2 threads, --preload for memory sharing
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5555", \
     "--workers", "4", \
     "--threads", "2", \
     "--worker-class", "gthread", \
     "--preload", \
     "--timeout", "60", \
     "--graceful-timeout", "30", \
     "--keep-alive", "5", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "100", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "embed-service:app"]
```

### 3.3 Build and Deploy

```bash
# Build
docker build -t embed-service:latest -f docker/embed-server/Dockerfile.embed .

# Run
docker run -d \
  --name embed-service \
  --restart unless-stopped \
  -p 5555:5555 \
  --memory=6g \
  --cpus=6 \
  embed-service:latest
```

---

## 4. Phase 2: Deploy Rerank-Service

### 4.1 Create rerank-service.py

**File**: `scripts/rerank-service.py`

```python
#!/usr/bin/env python3
"""
Reranking Service - BGE-reranker-base only
Separated from embedding for fault isolation and independent scaling.

Run with gunicorn:
  gunicorn --bind 0.0.0.0:5556 --workers 2 --threads 2 --worker-class gthread --preload rerank-service:app
"""
from flask import Flask, request, jsonify
import time
import logging
import os

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Model cache
reranker_model = None
MODEL_NAME = 'BAAI/bge-reranker-base'


def get_model():
    """Get or load the BGE reranker model (cached)."""
    global reranker_model
    if reranker_model is None:
        from fastembed.rerank.cross_encoder import TextCrossEncoder
        logger.info(f"Loading reranker model: {MODEL_NAME}")
        start = time.perf_counter()
        reranker_model = TextCrossEncoder(model_name=MODEL_NAME)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(f"Reranker loaded in {elapsed:.0f}ms")
    return reranker_model


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'rerank-service',
        'model': MODEL_NAME,
        'model_loaded': reranker_model is not None,
    })


@app.route('/rerank', methods=['POST'])
def rerank():
    """Rerank documents given a query."""
    data = request.json
    query = data.get('query')
    documents = data.get('documents', [])
    top_n = data.get('top_n')

    if not query:
        return jsonify({'error': 'Missing required field: query'}), 400
    if not documents:
        return jsonify({'error': 'Missing required field: documents'}), 400

    start = time.perf_counter()
    model = get_model()

    # fastembed returns raw scores in same order as input
    scores = list(model.rerank(query, documents))

    # Pair with indices and sort descending
    indexed_scores = [(i, float(score)) for i, score in enumerate(scores)]
    indexed_scores.sort(key=lambda x: x[1], reverse=True)

    if top_n:
        indexed_scores = indexed_scores[:top_n]

    results = [
        {'index': idx, 'score': score, 'document': documents[idx]}
        for idx, score in indexed_scores
    ]

    elapsed = (time.perf_counter() - start) * 1000

    return jsonify({
        'results': results,
        'count': len(results),
        'latency_ms': round(elapsed, 2),
    })


# Pre-load model with gunicorn --preload
def preload_model():
    logger.info("Pre-loading reranker model for gunicorn workers...")
    get_model()
    logger.info("Reranker model pre-loaded successfully")


if os.environ.get('GUNICORN_PRELOAD') == '1' or __name__ != '__main__':
    try:
        preload_model()
    except Exception as e:
        logger.warning(f"Pre-load failed (will load on first request): {e}")


if __name__ == '__main__':
    preload_model()
    app.run(host='0.0.0.0', port=5556, debug=False, threaded=True)
```

### 4.2 Create Dockerfile.rerank

**File**: `docker/embed-server/Dockerfile.rerank`

```dockerfile
# Reranking Service Dockerfile
# BGE-reranker-base only - separated for fault isolation

FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies (reranking only)
RUN pip install --no-cache-dir \
    flask==3.0.0 \
    gunicorn==21.2.0 \
    fastembed==0.3.6

# Copy reranking service
COPY scripts/rerank-service.py /app/rerank-service.py

# Pre-download BGE-reranker model at build time (~1.5GB)
RUN python -c "\
from fastembed.rerank.cross_encoder import TextCrossEncoder; \
import time; \
print('Downloading BAAI/bge-reranker-base...'); \
start = time.time(); \
model = TextCrossEncoder('BAAI/bge-reranker-base'); \
print(f'Model downloaded in {time.time() - start:.1f}s'); \
print('Running warmup inference...'); \
_ = list(model.rerank('warmup query', ['warmup document'])); \
print('Done!'); \
"

EXPOSE 5556

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:5556/health || exit 1

# Environment
ENV PYTHONUNBUFFERED=1
ENV OMP_NUM_THREADS=2
ENV TOKENIZERS_PARALLELISM=false

# Gunicorn: 2 workers, 2 threads (reranking is heavier)
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5556", \
     "--workers", "2", \
     "--threads", "2", \
     "--worker-class", "gthread", \
     "--preload", \
     "--timeout", "120", \
     "--graceful-timeout", "60", \
     "--keep-alive", "5", \
     "--max-requests", "500", \
     "--max-requests-jitter", "50", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "rerank-service:app"]
```

### 4.3 Build and Deploy

```bash
# Build
docker build -t rerank-service:latest -f docker/embed-server/Dockerfile.rerank .

# Run
docker run -d \
  --name rerank-service \
  --restart unless-stopped \
  -p 5556:5556 \
  --memory=4g \
  --cpus=4 \
  rerank-service:latest
```

### 4.4 Docker Compose (Production)

**File**: `docker/embed-server/docker-compose.production.yml`

```yaml
version: '3.8'

services:
  embed-service:
    build:
      context: ../..
      dockerfile: docker/embed-server/Dockerfile.embed
    container_name: embed-service
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '6'
          memory: 6G
        reservations:
          cpus: '4'
          memory: 4G
    ports:
      - "5555:5555"
    networks:
      - weavink-internal
    volumes:
      - embed-cache:/root/.cache
    environment:
      - PYTHONUNBUFFERED=1
      - OMP_NUM_THREADS=4
      - TOKENIZERS_PARALLELISM=false
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5555/health"]
      interval: 30s
      timeout: 10s
      start_period: 120s
      retries: 3

  rerank-service:
    build:
      context: ../..
      dockerfile: docker/embed-server/Dockerfile.rerank
    container_name: rerank-service
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G
    ports:
      - "5556:5556"
    networks:
      - weavink-internal
    volumes:
      - rerank-cache:/root/.cache
    environment:
      - PYTHONUNBUFFERED=1
      - OMP_NUM_THREADS=2
      - TOKENIZERS_PARALLELISM=false
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5556/health"]
      interval: 30s
      timeout: 10s
      start_period: 90s
      retries: 3

networks:
  weavink-internal:
    driver: bridge

volumes:
  embed-cache:
  rerank-cache:
```

### 4.5 Environment Variables (Main App)

Add to Weavink app's environment:

```env
EMBED_SERVICE_URL=http://embed-service:5555
RERANK_SERVICE_URL=http://rerank-service:5556
```

---

## 5. Phase 3: Update Embedding Service

### 5.1 New Code (Self-Hosted with Redis Cache)

**File**: `lib/services/serviceContact/server/embeddingService.js`

```javascript
/**
 * Embedding Service - Self-Hosted E5-large
 * MIGRATION: 2025-12-04 - Switched from Cohere API to self-hosted embed-service
 * ARCHITECTURE: Separate embed-service (port 5555) for fault isolation
 */

import { createHash } from 'crypto';
import http from 'http';
import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';
import { redisClient } from './redisClient';

// Embed service configuration (separate from rerank-service)
const EMBED_SERVICE_URL = process.env.EMBED_SERVICE_URL || 'http://embed-service:5555';

// Cache configuration
const EMBEDDING_CACHE_TTL = 86400; // 24 hours
const EMBEDDING_CACHE_PREFIX = 'emb:';

// HTTP keep-alive agent
const keepAliveAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 30000,
});

export class EmbeddingService {
  /**
   * Generate embedding for text with Redis caching.
   */
  static async generateEmbedding(text, options = {}) {
    const cleanText = text.replace(/\n/g, ' ').trim();
    if (!cleanText) throw new Error('Cannot generate embedding for empty text');

    // Check cache
    const cacheKey = this._getCacheKey(cleanText);
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return cached;
    } catch (e) {
      console.warn('[EmbeddingService] Cache read error:', e.message);
    }

    // Generate via embed-service
    const embedding = await this._callEmbedServer(cleanText);

    // Cache async
    this._cacheEmbedding(cacheKey, embedding).catch(() => {});

    return embedding;
  }

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

  static async batchGenerateEmbeddings(texts, options = {}) {
    if (!texts || texts.length === 0) return [];

    const results = new Array(texts.length);
    const uncachedIndices = [];
    const uncachedTexts = [];

    // Check cache
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

    // Batch generate uncached
    if (uncachedTexts.length > 0) {
      const response = await fetch(`${EMBED_SERVICE_URL}/embed/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        agent: keepAliveAgent,
        body: JSON.stringify({ texts: uncachedTexts }),
      });

      if (!response.ok) {
        throw new Error(`Embed server error: ${response.status}`);
      }

      const data = await response.json();

      uncachedIndices.forEach((originalIndex, j) => {
        const embedding = data.embeddings[j];
        results[originalIndex] = embedding;

        const cacheKey = this._getCacheKey(uncachedTexts[j]);
        this._cacheEmbedding(cacheKey, embedding).catch(() => {});
      });
    }

    return results;
  }

  static _getCacheKey(text) {
    const hash = createHash('sha256')
      .update(text.toLowerCase().trim())
      .digest('hex')
      .slice(0, 16);
    return `${EMBEDDING_CACHE_PREFIX}${hash}`;
  }

  static async _cacheEmbedding(key, embedding) {
    await redisClient.set(key, embedding, EMBEDDING_CACHE_TTL);
  }
}
```

---

## 6. Phase 4: Update Rerank Service

### 6.1 New Code (Self-Hosted BGE)

**File**: `lib/services/serviceContact/server/rerankService.js`

```javascript
/**
 * Rerank Service - Self-Hosted BGE-reranker-base
 * MIGRATION: 2025-12-04 - Switched from Cohere to self-hosted BGE reranker
 * ARCHITECTURE: 2025-12-05 - Separated rerank-service from embed-service
 */

import http from 'http';
import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';

// Rerank service configuration (separate from embed-service)
const RERANK_SERVICE_URL = process.env.RERANK_SERVICE_URL || 'http://rerank-service:5556';

const MAX_RERANK_CANDIDATES = 20;

const keepAliveAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 30000,
});

export class RerankService {
  static async rerankContacts(query, contacts, options = {}) {
    const { topN = 10 } = options;

    if (!contacts || contacts.length === 0) return { results: [], metadata: {} };

    const candidatesToRerank = contacts.slice(0, MAX_RERANK_CANDIDATES);
    const documents = candidatesToRerank.map(c => this._buildSearchableText(c));

    try {
      const response = await fetch(`${RERANK_SERVICE_URL}/rerank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        agent: keepAliveAgent,
        body: JSON.stringify({
          query,
          documents,
          top_n: Math.min(topN, candidatesToRerank.length),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Rerank service error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      const rerankedContacts = data.results.map((result, rank) => ({
        ...candidatesToRerank[result.index],
        searchMetadata: {
          rerankScore: result.score,
          rerankRank: rank + 1,
          rerankModel: 'BAAI/bge-reranker-base',
          provider: 'self-hosted',
        },
      }));

      return {
        results: rerankedContacts,
        metadata: {
          cost: 0,
          model: 'BAAI/bge-reranker-base',
          provider: 'self-hosted',
          documentsReranked: documents.length,
          latency_ms: data.latency_ms,
        },
      };
    } catch (error) {
      console.error('[RerankService] Failed, falling back to vector scores:', error.message);
      return {
        results: contacts.slice(0, topN),
        metadata: { error: error.message, fallbackUsed: true },
      };
    }
  }

  static _buildSearchableText(contact) {
    const parts = [];
    if (contact.name) parts.push(contact.name);
    if (contact.jobTitle) parts.push(contact.jobTitle);
    if (contact.company) parts.push(contact.company);
    if (contact.notes) parts.push(contact.notes.substring(0, 500));
    if (contact.tags?.length) parts.push(contact.tags.join(', '));
    return parts.join(' - ');
  }

  static async checkHealth() {
    try {
      const response = await fetch(`${RERANK_SERVICE_URL}/health`, { agent: keepAliveAgent });
      const data = await response.json();
      return {
        healthy: data.status === 'ok',
        model: data.model,
        modelLoaded: data.model_loaded,
        provider: 'self-hosted',
      };
    } catch (error) {
      return { healthy: false, error: error.message, provider: 'self-hosted' };
    }
  }
}
```

---

## 7. Phase 5: Re-embed All Vectors

### 7.1 Migration Script

**File**: `scripts/migrate-to-e5-embeddings.mjs`

See the full migration script in the deployment guide. Key points:

- Uses `EMBED_SERVICE_URL` (port 5555)
- Batch processing for efficiency
- Dry-run mode for testing
- Per-user migration support

```bash
# Dry run
node scripts/migrate-to-e5-embeddings.mjs --dry-run

# Single user test
node scripts/migrate-to-e5-embeddings.mjs --user-id=YOUR_USER_ID

# Full migration
node scripts/migrate-to-e5-embeddings.mjs
```

---

## 8. Phase 6: Update Constants

### 8.1 Contact Constants

**File**: `lib/services/serviceContact/client/constants/contactConstants.js`

```javascript
SEMANTIC_SEARCH_CONFIG: {
  // Embedding model
  EMBEDDING_MODEL: 'intfloat/multilingual-e5-large',
  EMBEDDING_DIMENSION: 1024,
  EMBEDDING_PROVIDER: 'self-hosted',

  // Reranking model
  RERANK_MODEL: 'BAAI/bge-reranker-base',
  RERANK_PROVIDER: 'self-hosted',

  // Performance tuning
  MAX_RERANK_CANDIDATES: 20,

  // Quality metrics (from benchmark)
  EXPECTED_RECALL_AT_3: 0.56,
  EXPECTED_TOP_1_ACCURACY: 0.94,
}
```

### 8.2 API Costs

**File**: `lib/services/constants/apiCosts.js`

```javascript
SELF_HOSTED: {
  EMBEDDING_COST: 0,
  RERANK_COST: 0,
  PROVIDER: 'self-hosted',
}
```

---

## 9. Phase 7: Optimizations

### 9.1 Redis Cache Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     REDIS CACHE LAYERS                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Query Embedding Cache (emb:*)                      │
│  ├─ Key: emb:{sha256(query)[:16]}                           │
│  ├─ Value: [1024-dim vector]                                │
│  ├─ TTL: 24 hours                                           │
│  └─ Size: ~4.5KB per entry                                  │
│                                                              │
│  Layer 2: Search Results Cache (search:*)                    │
│  ├─ Key: search:{userId}:{sha256(query)[:16]}               │
│  ├─ Value: {contactIds, scores, timestamp}                  │
│  ├─ TTL: 5 minutes                                          │
│  └─ Size: ~1KB per entry                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Testing & Validation

### 10.1 Manual Testing Commands

```bash
# Test embed-service health
curl http://localhost:5555/health | jq

# Test rerank-service health
curl http://localhost:5556/health | jq

# Test embedding
curl -X POST http://localhost:5555/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "Test embedding"}' | jq '.dimension, .latency_ms'

# Test reranking
curl -X POST http://localhost:5556/rerank \
  -H "Content-Type: application/json" \
  -d '{
    "query": "software engineer",
    "documents": ["John - Software Engineer", "Mary - Chef"]
  }' | jq '.results[0]'
```

### 10.2 Validation Checklist

- [ ] embed-service container starts successfully
- [ ] rerank-service container starts successfully
- [ ] Both `/health` endpoints return `{ "status": "ok" }`
- [ ] Models pre-loaded on startup (check logs)
- [ ] Embedding returns 1024-dim vector
- [ ] Reranking returns sorted results
- [ ] Redis caching works
- [ ] Migration script completes

---

## 11. Rollback Plan

### If Issues Arise

1. **Stop Services**
   ```bash
   docker stop embed-service rerank-service
   ```

2. **Remove Environment Variables**
   ```
   EMBED_SERVICE_URL=...
   RERANK_SERVICE_URL=...
   ```

3. **Revert Code Changes**
   ```bash
   git checkout main -- lib/services/serviceContact/server/embeddingService.js
   git checkout main -- lib/services/serviceContact/server/rerankService.js
   ```

4. **Re-embed with Cohere** (if vectors corrupted)
   ```bash
   node scripts/migrate-to-cohere-embeddings.mjs
   ```

---

## Summary

### Files Created

| File | Purpose |
|------|---------|
| `scripts/embed-service.py` | Embedding-only Flask app |
| `scripts/rerank-service.py` | Reranking-only Flask app |
| `docker/embed-server/Dockerfile.embed` | Embed container (4 workers) |
| `docker/embed-server/Dockerfile.rerank` | Rerank container (2 workers) |
| `docker/embed-server/docker-compose.production.yml` | Production compose |

### Files Modified

| File | Change |
|------|--------|
| `embeddingService.js` | Use embed-service + cache |
| `rerankService.js` | Use rerank-service |
| `contactConstants.js` | Update model names |

### Expected Performance

| Metric | Before (Cohere) | After (Self-Hosted) |
|--------|-----------------|---------------------|
| First search | ~605ms | ~210ms |
| Cached search | ~605ms | ~10ms |
| Monthly cost | ~$50-100 | $0 |
| Concurrent capacity | Limited by API | 12 requests |

### Quality Trade-off

| Metric | Cohere | Self-Hosted |
|--------|--------|-------------|
| Recall@3 | 100% | 56% |
| Top-1 Accuracy | 100% | 94% |

The top result is correct 94% of the time - acceptable for most use cases.
