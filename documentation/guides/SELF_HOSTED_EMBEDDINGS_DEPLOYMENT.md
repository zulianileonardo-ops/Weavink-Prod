# Self-Hosted Embeddings Deployment Guide

This guide walks you through deploying the self-hosted embedding and reranking infrastructure that replaces Cohere API.

## Architecture Overview

```
┌─────────────────┐      ┌─────────────────────┐
│  Weavink App    │─────▶│  embed-service      │ Port 5555
│  (Next.js)      │      │  E5-large (2.5GB)   │ 6 CPU, 6GB RAM
│                 │      │  4 workers × 2 thr  │
│                 │      └─────────────────────┘
│                 │
│                 │      ┌─────────────────────┐
│                 │─────▶│  rerank-service     │ Port 5556
│                 │      │  BGE-reranker(1.5GB)│ 4 CPU, 4GB RAM
└─────────────────┘      │  2 workers × 2 thr  │
                         └─────────────────────┘
```

### Why Two Services?

| Factor | Benefit |
|--------|---------|
| Fault Isolation | Rerank crash doesn't kill embeddings |
| Independent Scaling | Scale each based on load |
| Resource Tuning | Optimized CPU/memory per workload |
| Maintenance | Update one without affecting other |

### Component Overview

| Component | Purpose | Port | Resources |
|-----------|---------|------|-----------|
| embed-service | E5-large embeddings | 5555 | 6 CPU, 6GB RAM |
| rerank-service | BGE reranking | 5556 | 4 CPU, 4GB RAM |
| Redis | Embedding cache | 6379 | 2 CPU, 4GB RAM |
| Qdrant | Vector database | 6333 | 2 CPU, 4GB RAM |

---

## Prerequisites

- Docker installed on your server
- SSH access to your server
- Redis running (for embedding cache)
- Qdrant running (for vector storage)
- At least 16 CPU cores and 20GB RAM available

---

## Step 1: Build Docker Images

### 1.1 Build Both Images Locally

From the project root:

```bash
cd /home/leo/Syncthing/Code-Weavink

# Build embed-service
docker build -t embed-service:latest -f docker/embed-server/Dockerfile.embed .

# Build rerank-service
docker build -t rerank-service:latest -f docker/embed-server/Dockerfile.rerank .
```

**Build time:**
- embed-service: ~10 minutes (downloads E5-large ~2.5GB)
- rerank-service: ~8 minutes (downloads BGE-reranker ~1.5GB)

### 1.2 Save and Transfer to Server

```bash
# Save images
docker save embed-service:latest | gzip > embed-service.tar.gz
docker save rerank-service:latest | gzip > rerank-service.tar.gz

# Transfer to server
scp embed-service.tar.gz rerank-service.tar.gz root@your-server-ip:/root/
```

### 1.3 Load Images on Server

```bash
ssh root@your-server-ip

# Load images
gunzip -c /root/embed-service.tar.gz | docker load
gunzip -c /root/rerank-service.tar.gz | docker load

# Verify
docker images | grep -E "embed-service|rerank-service"
```

---

## Step 2: Deploy Services

### Option A: Docker Compose (Recommended)

Copy `docker/embed-server/docker-compose.production.yml` to your server:

```bash
scp docker/embed-server/docker-compose.production.yml root@your-server-ip:/opt/weavink-ml/
```

On your server:

```bash
cd /opt/weavink-ml
docker compose -f docker-compose.production.yml up -d
```

### Option B: Manual Docker Run

```bash
# Create network
docker network create weavink-internal

# Run embed-service
docker run -d \
  --name embed-service \
  --network weavink-internal \
  --restart unless-stopped \
  -p 5555:5555 \
  --memory=6g \
  --cpus=6 \
  embed-service:latest

# Run rerank-service
docker run -d \
  --name rerank-service \
  --network weavink-internal \
  --restart unless-stopped \
  -p 5556:5556 \
  --memory=4g \
  --cpus=4 \
  rerank-service:latest
```

### 2.1 Verify Services are Running

```bash
# Check status
docker ps | grep -E "embed-service|rerank-service"

# Check embed-service logs
docker logs -f embed-service

# Expected output:
# Pre-loading embedding model for gunicorn workers...
# Loading embedding model: intfloat/multilingual-e5-large
# Embedding model loaded in 8500ms (dim=1024)
# Embedding model pre-loaded successfully

# Check rerank-service logs
docker logs -f rerank-service

# Expected output:
# Pre-loading reranker model for gunicorn workers...
# Loading reranker model: BAAI/bge-reranker-base
# Reranker loaded in 6200ms
# Reranker model pre-loaded successfully
```

### 2.2 Test Health Endpoints

```bash
# Test embed-service
curl http://localhost:5555/health | jq

# Expected:
# {
#   "status": "ok",
#   "service": "embed-service",
#   "model": "intfloat/multilingual-e5-large",
#   "model_loaded": true,
#   "dimension": 1024
# }

# Test rerank-service
curl http://localhost:5556/health | jq

# Expected:
# {
#   "status": "ok",
#   "service": "rerank-service",
#   "model": "BAAI/bge-reranker-base",
#   "model_loaded": true
# }
```

### 2.3 Quick Functionality Test

```bash
# Test embedding
curl -X POST http://localhost:5555/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world test"}' | jq '.dimension, .latency_ms'

# Expected: 1024, <100

# Test reranking
curl -X POST http://localhost:5556/rerank \
  -H "Content-Type: application/json" \
  -d '{
    "query": "software engineer",
    "documents": ["John is a software engineer", "Mary is a chef"]
  }' | jq '.results[0]'

# Expected: {"index": 0, "score": 0.95+, "document": "John is a software engineer"}
```

---

## Step 3: Configure Environment Variables

### 3.1 Local Development (.env)

Add to your `.env` file:

```bash
# Self-hosted ML Services (separated for fault isolation)
EMBED_SERVICE_URL=http://localhost:5555
RERANK_SERVICE_URL=http://localhost:5556
```

For local development options:
- Run services locally via Docker
- SSH tunnel: `ssh -L 5555:localhost:5555 -L 5556:localhost:5556 root@your-server`

### 3.2 Production Environment

**For Coolify:**

Add environment variables in your service settings:
```
EMBED_SERVICE_URL=http://embed-service:5555
RERANK_SERVICE_URL=http://rerank-service:5556
```

Ensure all services are on the same Docker network.

**For Docker Compose:**

```yaml
services:
  weavink:
    environment:
      - EMBED_SERVICE_URL=http://embed-service:5555
      - RERANK_SERVICE_URL=http://rerank-service:5556
    depends_on:
      - embed-service
      - rerank-service
```

### 3.3 Network Configuration

If services are on different machines:

1. **Firewall rules** (internal only, NOT public!):
   ```bash
   ufw allow from 10.0.0.0/8 to any port 5555
   ufw allow from 10.0.0.0/8 to any port 5556
   ```

2. **Use internal IPs** for better performance:
   ```bash
   ip addr show | grep "inet 10\."
   ```

---

## Step 4: Run Migration Script

### 4.1 Prerequisites

Before running migration:

1. **Backup Qdrant data** (recommended):
   ```bash
   docker exec qdrant qdrant-backup create pre-migration
   ```

2. **Ensure both services are healthy**:
   ```bash
   curl http://your-embed-server:5555/health
   curl http://your-rerank-server:5556/health
   ```

### 4.2 Dry Run First

```bash
cd /home/leo/Syncthing/Code-Weavink

# Install dependencies if needed
npm install @qdrant/js-client-rest firebase-admin dotenv

# Dry run
node scripts/migrate-to-e5-embeddings.mjs --dry-run
```

### 4.3 Run Actual Migration

```bash
# Full migration
node scripts/migrate-to-e5-embeddings.mjs

# Or specific user first
node scripts/migrate-to-e5-embeddings.mjs --user-id=YOUR_USER_ID

# Custom batch size
node scripts/migrate-to-e5-embeddings.mjs --batch-size=100
```

### 4.4 Migration Time Estimates

| Contacts | Estimated Time |
|----------|----------------|
| 1,000 | ~2 minutes |
| 10,000 | ~15 minutes |
| 100,000 | ~2.5 hours |

---

## Step 5: Verify with Performance Test

```bash
# Basic test
node scripts/test-search-performance.mjs

# Thorough test
node scripts/test-search-performance.mjs --iterations=20
```

### Performance Targets

| Metric | Target | Acceptable |
|--------|--------|------------|
| Single Embedding | <50ms | <100ms |
| Batch (per doc) | <25ms | <50ms |
| Rerank (20 docs) | <150ms | <250ms |
| P95 Embedding | <100ms | <150ms |
| P95 Rerank | <200ms | <300ms |

---

## Troubleshooting

### High Latency

```bash
# Check CPU usage
docker stats embed-service rerank-service

# If CPU maxed
docker update --cpus=8 embed-service
docker update --cpus=6 rerank-service
```

### Memory Issues

```bash
# Check memory
docker stats embed-service rerank-service

# If OOM
docker update --memory=8g embed-service
docker update --memory=6g rerank-service
```

### Service Won't Start

```bash
# Check logs for errors
docker logs embed-service --tail 100
docker logs rerank-service --tail 100

# Common issues:
# - Port already in use
# - Not enough memory for model loading
# - Model download failed (retry)
```

### One Service Down

The beauty of separate services: if rerank-service crashes, embed-service continues working. The app will fall back to vector-only scoring until rerank recovers.

---

## Monitoring

### Health Checks

Both services expose health endpoints:
- `GET /health` - Basic health status
- `GET /ready` - Readiness (model loaded and working)
- `GET /live` - Liveness (process running)

### Docker Health Checks

Both Dockerfiles include built-in health checks:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5555/health"]
  interval: 30s
  timeout: 10s
  start_period: 120s  # Allow time for model loading
  retries: 3
```

### Log Monitoring

```bash
# Watch both services
docker logs -f embed-service &
docker logs -f rerank-service
```

---

## Scaling

### Horizontal Scaling

For higher throughput, run multiple instances behind a load balancer:

```yaml
services:
  embed-service:
    deploy:
      replicas: 2
    # ... rest of config
```

### Vertical Scaling

Increase gunicorn workers by modifying the CMD in Dockerfiles:
- `--workers 6` for embed-service (more parallelism)
- `--workers 4` for rerank-service

---

## Rollback Plan

If issues occur:

1. Set environment to fall back (remove URL variables)
2. The app will fail to connect (no automatic Cohere fallback)
3. Fix the services or revert code changes

**Important:** Cohere and E5-large produce different embeddings. If reverting to Cohere, you'll need to re-migrate all vectors.

---

## Cost Comparison

| Service | Before (Cohere) | After (Self-Hosted) |
|---------|-----------------|---------------------|
| Embeddings | ~$15/month | $0 |
| Reranking | ~$40/month | $0 |
| Server (shared) | $0 | ~$20/month |
| **Total** | **~$55/month** | **~$20/month** |

**Net Savings: ~$35/month** (and better scaling)

---

## Post-Deployment Checklist

- [ ] Both containers running with `--restart unless-stopped`
- [ ] Both health endpoints return `status: ok`
- [ ] `EMBED_SERVICE_URL` set in all environments
- [ ] `RERANK_SERVICE_URL` set in all environments
- [ ] Migration completed for all users
- [ ] Performance test shows acceptable latency
- [ ] Firewall configured (ports 5555/5556 internal only)
- [ ] Monitoring/alerting configured
- [ ] Both services on same Docker network as app
