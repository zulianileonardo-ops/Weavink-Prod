# Coolify Service Networking Guide

**Created**: December 5, 2025
**Updated**: December 5, 2025
**Purpose**: How services communicate in Coolify deployments
**Server**: 46.224.102.247

---

## Table of Contents

1. [Overview](#1-overview)
2. [Docker Networking Basics](#2-docker-networking-basics)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Coolify Setup - Step by Step](#4-coolify-setup---step-by-step)
5. [Connecting Services to Network](#5-connecting-services-to-network)
6. [Environment Variables](#6-environment-variables)
7. [Service Restart Behavior](#7-service-restart-behavior)
8. [Security Best Practices](#8-security-best-practices)
9. [Testing Connectivity](#9-testing-connectivity)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Overview

When deploying multiple services (Weavink app, embed-service, rerank-service, Redis, Qdrant) in Coolify, they communicate through Docker's internal networking. This guide explains how to configure this properly.

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Internal Network** | Services talk over private Docker network |
| **DNS by Name** | Containers discover each other by container name |
| **No External Exposure** | ML services stay internal (no public ports) |
| **Manual Network Connection** | In Coolify, you must manually connect each service to the shared network |

### Important: Coolify Behavior

Coolify generates **random container names** like `s40swk408s00s4s4k8kso0gk` instead of simple names like `redis`. This means:

1. You must note down the container name after deployment
2. You must manually connect each container to your shared network
3. Your environment variables must use the actual container name (or the Coolify-provided internal URL)

---

## 2. Docker Networking Basics

### How It Works

Docker creates a virtual network where containers can communicate. Each container gets:

1. **Internal IP**: Private IP (e.g., 172.18.0.5) - changes on restart
2. **DNS Name**: Container name (e.g., `s40swk408s00s4s4k8kso0gk`) - stays constant

When your app calls `http://s40swk408s00s4s4k8kso0gk:6379`, Docker's internal DNS resolves that name to the container's IP.

### Network Types

| Type | Use Case | Our Choice |
|------|----------|------------|
| `bridge` | Default, isolated network | Yes |
| `host` | Share host network (no isolation) | No |
| `overlay` | Multi-host (Docker Swarm) | No |

We use a **bridge network** (`weavink-internal`) for isolation and security.

---

## 3. Architecture Diagram

### ASCII Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                        Docker Network: weavink-internal                  │
│                        (Private - Not accessible from internet)          │
│                                                                          │
│   ┌────────────────┐                                                     │
│   │                │     http://<embed-container>:5555                   │
│   │    Weavink     │─────────────────────────────┐                       │
│   │    (Next.js)   │                             │                       │
│   │                │     http://<rerank-container>:5556                  │
│   │   Port 3000    │─────────────────────────────┼───┐                   │
│   │                │                             │   │                   │
│   └───────┬────────┘                             │   │                   │
│           │                                      ▼   ▼                   │
│           │                             ┌────────────────┐               │
│           │   redis://...@<redis>:6379  │ embed-service  │               │
│           │◄────────────────────────────│   Port 5555    │               │
│           │                             │  (internal)    │               │
│           │                             └────────────────┘               │
│           │                                                              │
│           │   http://<qdrant>:6333      ┌────────────────┐               │
│           │◄────────────────────────────│ rerank-service │               │
│           │                             │   Port 5556    │               │
│           ▼                             │  (internal)    │               │
│   ┌───────────────┐                     └────────────────┘               │
│   │     Redis     │                                                      │
│   │   Port 6379   │                     ┌────────────────┐               │
│   │  (internal)   │                     │    Qdrant      │               │
│   └───────────────┘                     │   Port 6333    │               │
│                                         │  (internal)    │               │
│                                         └────────────────┘               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ ONLY this is exposed
                                    ▼
                    ┌───────────────────────────────┐
                    │        INTERNET               │
                    │                               │
                    │   https://app.weavink.io      │
                    │   (Port 443 via Coolify)      │
                    └───────────────────────────────┘
```

### Mermaid Diagram (Interactive)

```mermaid
flowchart TB
    subgraph Internet["🌐 Internet"]
        User["👤 User<br/>Browser"]
    end

    subgraph Coolify["☁️ Coolify / Traefik"]
        Traefik["🔀 Traefik Proxy<br/>Port 443 (HTTPS)"]
    end

    subgraph DockerNetwork["🔒 Docker Network: weavink-internal"]
        subgraph WeavinkApp["📦 Weavink App"]
            NextJS["⚛️ Next.js<br/>Port 3000<br/><i>Public via Traefik</i>"]
        end

        subgraph MLServices["🤖 ML Services"]
            Embed["📊 embed-service<br/>Port 5555<br/><i>No Auth</i>"]
            Rerank["🔄 rerank-service<br/>Port 5556<br/><i>No Auth</i>"]
        end

        subgraph DataStores["💾 Data Stores"]
            Redis["🔴 Redis<br/>Port 6379<br/><i>Password Auth</i>"]
            Qdrant["🔷 Qdrant<br/>Port 6333<br/><i>API Key Auth</i>"]
        end
    end

    %% External connections
    User -->|"HTTPS :443"| Traefik
    Traefik -->|"HTTP :3000"| NextJS

    %% Internal connections from Weavink
    NextJS -->|"HTTP :5555<br/>POST /embed"| Embed
    NextJS -->|"HTTP :5556<br/>POST /rerank"| Rerank
    NextJS -->|"redis:// :6379<br/>Password Auth"| Redis
    NextJS -->|"HTTP :6333<br/>API Key Header"| Qdrant

    %% Styling
    classDef internet fill:#e1f5fe,stroke:#01579b
    classDef proxy fill:#fff3e0,stroke:#e65100
    classDef app fill:#e8f5e9,stroke:#2e7d32
    classDef ml fill:#f3e5f5,stroke:#7b1fa2
    classDef data fill:#fce4ec,stroke:#c2185b
    classDef network fill:#f5f5f5,stroke:#616161,stroke-dasharray: 5 5

    class User internet
    class Traefik proxy
    class NextJS app
    class Embed,Rerank ml
    class Redis,Qdrant data
```

### Service Communication Matrix

| From → To | Protocol | Port | Auth Required | Auth Method |
|-----------|----------|------|---------------|-------------|
| Internet → Weavink | HTTPS | 443 | Yes | User session |
| Weavink → embed-service | HTTP | 5555 | No | - |
| Weavink → rerank-service | HTTP | 5556 | No | - |
| Weavink → Redis | redis:// | 6379 | Yes | Password in URL |
| Weavink → Qdrant | HTTP | 6333 | Yes | `api-key` header |

### Request Flow Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 User
    participant T as 🔀 Traefik
    participant W as ⚛️ Weavink App
    participant E as 📊 embed-service
    participant R as 🔄 rerank-service
    participant Q as 🔷 Qdrant
    participant RD as 🔴 Redis

    Note over U,RD: Semantic Search Flow

    U->>+T: HTTPS :443 (Search Query)
    T->>+W: HTTP :3000

    W->>+RD: Check cache (redis:// :6379 + Password)
    RD-->>-W: Cache miss

    W->>+E: POST /embed :5555 (No Auth)
    Note right of E: Generate query embedding<br/>E5-large model
    E-->>-W: 1024-dim vector

    W->>+Q: POST /points/search :6333
    Note right of Q: Header: api-key: xxx
    Q-->>-W: Top 50 matches

    W->>+R: POST /rerank :5556 (No Auth)
    Note right of R: Rerank with BGE-reranker
    R-->>-W: Reranked results

    W->>+RD: Cache results (TTL: 1h)
    RD-->>-W: OK

    W-->>-T: JSON Response
    T-->>-U: HTTPS Response

    Note over U,RD: All internal traffic is HTTP (not HTTPS)
```

### Port & Auth Summary

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     SERVICE AUTHENTICATION SUMMARY                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🌐 EXTERNAL (Internet → Coolify)                                        │
│  ────────────────────────────────                                        │
│  • HTTPS :443 → User authentication via session cookies                  │
│                                                                          │
│  🔒 INTERNAL (Docker Network: weavink-internal)                          │
│  ──────────────────────────────────────────────                          │
│                                                                          │
│  embed-service :5555   │ No Auth    │ POST /embed, /embed/batch          │
│  rerank-service :5556  │ No Auth    │ POST /rerank                        │
│  Redis :6379           │ Password   │ redis://default:PASS@host:6379     │
│  Qdrant :6333          │ API Key    │ Header: api-key: <key>             │
│                                                                          │
│  ⚠️  ML services have no auth because:                                   │
│     - Only accessible within Docker network                              │
│     - No external port exposure                                          │
│     - Network isolation = security boundary                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Coolify Setup - Step by Step

### Step 1: Create the Shared Network (Once)

SSH into your server and create the network:

```bash
ssh root@46.224.102.247

# Create network (only do this once)
docker network create weavink-internal
```

### Step 2: Deploy Redis

In Coolify Dashboard:

1. **New Resource** → **Database** → **Redis**
2. **Settings**:
   - Image: `redis:7.2`
   - **Ports Mappings**: Leave empty (internal only!)
   - **Make it publicly available**: OFF
3. **Custom Redis Configuration**:
   ```
   maxmemory 4gb
   maxmemory-policy allkeys-lru
   appendonly yes
   ```
4. **Deploy** and note the container name from the "Redis URL (internal)" field

**Example**: Coolify shows:
```
redis://default:PASSWORD@s40swk408s00s4s4k8kso0gk:6379/0
```
Container name is: `s40swk408s00s4s4k8kso0gk`

### Step 3: Deploy Qdrant

1. **New Resource** → **Service** → **Qdrant**
2. **Edit Compose File**:
   ```yaml
   services:
     qdrant:
       image: 'qdrant/qdrant:latest'
       environment:
         - 'QDRANT__SERVICE__API_KEY=${SERVICE_PASSWORD_QDRANTAPIKEY}'
       volumes:
         - 'qdrant-storage:/qdrant/storage'
       healthcheck:
         test:
           - CMD-SHELL
           - "bash -c ':> /dev/tcp/127.0.0.1/6333' || exit 1"
         interval: 5s
         timeout: 5s
         retries: 3
   ```
3. **Environment Variables**: Keep only `SERVICE_PASSWORD_QDRANTAPIKEY` (delete others)
4. **Settings**:
   - **Ports Mappings**: Leave empty (internal only!)
   - **Make it publicly available**: OFF
5. **Deploy** and note the container name
6. **Save the API key** - you'll need it for `QDRANT_API_KEY` in Weavink app

### Step 4: Deploy embed-service

1. **New Resource** → **Dockerfile** (from your repo)
2. **Settings**:
   - Dockerfile Path: `docker/embed-server/Dockerfile.embed`
   - **Ports Mappings**: Leave empty (internal only!)
   - **Make it publicly available**: OFF
3. **Resources**:
   - CPU Limit: 6
   - Memory Limit: 6GB
4. **Deploy** and note the container name

### Step 5: Deploy rerank-service

1. **New Resource** → **Dockerfile** (from your repo)
2. **Settings**:
   - Dockerfile Path: `docker/embed-server/Dockerfile.rerank`
   - **Ports Mappings**: Leave empty (internal only!)
   - **Make it publicly available**: OFF
3. **Resources**:
   - CPU Limit: 4
   - Memory Limit: 4GB
4. **Deploy** and note the container name

### Step 6: Deploy Weavink App

1. **New Resource** → Your app repository
2. **Settings**:
   - **Make it publicly available**: ON (this is your public app)
   - Configure domain in Coolify
3. **Environment Variables**: See Section 6
4. **Deploy** and note the container name

---

## 5. Connecting Services to Network

**IMPORTANT**: After deploying each service in Coolify, you must manually connect it to the `weavink-internal` network.

### The Process (For Each Service)

#### Step 1: Find the container name

```bash
# SSH into server
ssh root@46.224.102.247

# List all containers
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
```

Example output:
```
NAMES                           IMAGE                    STATUS
s40swk408s00s4s4k8kso0gk       redis:7.2                Up 5 minutes
abc123xyz                       qdrant/qdrant:v1.7.4     Up 3 minutes
def456uvw                       embed-service:latest     Up 2 minutes
```

#### Step 2: Connect each container to the network

```bash
# Connect Redis
docker network connect weavink-internal s40swk408s00s4s4k8kso0gk

# Connect Qdrant
docker network connect weavink-internal abc123xyz

# Connect embed-service
docker network connect weavink-internal def456uvw

# Connect rerank-service
docker network connect weavink-internal ghi789rst

# Connect Weavink app
docker network connect weavink-internal jkl012mno
```

#### Step 3: Verify all services are connected

```bash
docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'
```

Expected output:
```
s40swk408s00s4s4k8kso0gk abc123xyz def456uvw ghi789rst jkl012mno
```

### Quick Script for Network Connection

```bash
#!/bin/bash
# connect-all-services.sh
# Run after deploying all services

NETWORK="weavink-internal"

# Get all container names (adjust grep patterns as needed)
CONTAINERS=$(docker ps --format "{{.Names}}")

for container in $CONTAINERS; do
  echo "Connecting $container to $NETWORK..."
  docker network connect $NETWORK $container 2>/dev/null || echo "  Already connected or failed"
done

echo ""
echo "Services on $NETWORK:"
docker network inspect $NETWORK --format '{{range .Containers}}{{.Name}} {{end}}'
```

---

## 6. Environment Variables

### For Weavink App

Coolify provides internal URLs with auto-generated container names. Use these in your environment:

```bash
# Redis (use the full URL from Coolify)
REDIS_URL=redis://default:o6tlaPpsXCilJ7FgCE4YoIoYHpOM3s7NgTt3Uq0yYosAXkQyW7kXbq8eSghSAkB4@s40swk408s00s4s4k8kso0gk:6379/0

# Qdrant (use container name from docker ps)
QDRANT_URL=http://<qdrant-container-name>:6333

# ML Services (use container names from docker ps)
EMBED_SERVICE_URL=http://<embed-container-name>:5555
RERANK_SERVICE_URL=http://<rerank-container-name>:5556
```

### Finding Container Names

```bash
# Find Redis container
docker ps | grep redis
# Output: s40swk408s00s4s4k8kso0gk

# Find Qdrant container
docker ps | grep qdrant
# Output: abc123xyz

# Find embed-service container
docker ps | grep embed
# Output: def456uvw

# Find rerank-service container
docker ps | grep rerank
# Output: ghi789rst
```

### URL Format

```
http://s40swk408s00s4s4k8kso0gk:6379
 │      │                      │
 │      │                      └── Port the service listens on
 │      └── Coolify-generated container name (DNS)
 └── Protocol (http for internal, NOT https)
```

**Important**: Use `http://` NOT `https://` for internal services. HTTPS is only for external traffic.

---

## 7. Service Restart Behavior

### What Happens When a Service Restarts?

When you restart a service in Coolify:

1. Container stops
2. New container starts with **same name** (Coolify preserves the name)
3. Docker DNS updates automatically
4. Connections resume

**However**: If you **redeploy** (rebuild), the container name might change. You'd need to:
1. Update environment variables with new container name
2. Reconnect to `weavink-internal` network

### Handling Temporary Failures

Your app should have retry logic:

```javascript
// embeddingService.js - already handles failures
static async _callEmbedServer(text) {
  const response = await fetch(`${EMBED_SERVICE_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Embed server error: ${response.status}`);
  }

  return (await response.json()).embedding;
}
```

---

## 8. Security Best Practices

### DO: Keep ML Services Internal

- **Ports Mappings**: Leave empty
- **Make it publicly available**: OFF

### DON'T: Expose Internal Services

Never add port mappings for:
- Redis (6379)
- Qdrant (6333)
- embed-service (5555)
- rerank-service (5556)

### Firewall Rules

On your server, only these ports should be open:

| Port | Purpose | Open To |
|------|---------|---------|
| 22 | SSH | Your IP only |
| 80 | HTTP (redirects to 443) | Public |
| 443 | HTTPS (your app) | Public |
| 8000 | Coolify Dashboard | Your IP only |

```bash
# Check open ports
sudo ufw status

# Secure Coolify dashboard (optional but recommended)
sudo ufw allow from YOUR_IP to any port 8000
sudo ufw deny 8000
```

### Network Isolation

Services on `weavink-internal` network CANNOT be reached from:
- The internet
- Other Docker networks
- Other projects in Coolify

---

## 9. Testing Connectivity

### From Your Server (SSH)

```bash
ssh root@46.224.102.247

# Check all services are running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check network exists and see connected containers
docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'

# Test connectivity between containers
# Replace <container-names> with actual names

# Test from Weavink to embed-service
docker exec <weavink-container> curl -s http://<embed-container>:5555/health

# Test from Weavink to rerank-service
docker exec <weavink-container> curl -s http://<rerank-container>:5556/health

# Test from Weavink to Redis
docker exec <weavink-container> redis-cli -h <redis-container> -a <password> ping

# Test from Weavink to Qdrant
docker exec <weavink-container> curl -s http://<qdrant-container>:6333/collections
```

### Quick Connectivity Test Script

Save this on your server:

```bash
#!/bin/bash
# /root/test-connectivity.sh

echo "=== Weavink Service Connectivity Test ==="
echo ""

# Get container names (adjust these to your actual container names)
WEAVINK=$(docker ps --format "{{.Names}}" | grep -E "weavink|nextjs" | head -1)
REDIS=$(docker ps --format "{{.Names}}" | grep -i redis | head -1)
QDRANT=$(docker ps --format "{{.Names}}" | grep -i qdrant | head -1)
EMBED=$(docker ps --format "{{.Names}}" | grep -i embed | head -1)
RERANK=$(docker ps --format "{{.Names}}" | grep -i rerank | head -1)

echo "Detected containers:"
echo "  Weavink: $WEAVINK"
echo "  Redis: $REDIS"
echo "  Qdrant: $QDRANT"
echo "  Embed: $EMBED"
echo "  Rerank: $RERANK"
echo ""

echo "Network status:"
docker network inspect weavink-internal --format '{{range .Containers}}  - {{.Name}}{{"\n"}}{{end}}'
echo ""

if [ -n "$EMBED" ]; then
  echo -n "Testing embed-service... "
  docker exec $EMBED curl -sf http://localhost:5555/health > /dev/null && echo "OK" || echo "FAILED"
fi

if [ -n "$RERANK" ]; then
  echo -n "Testing rerank-service... "
  docker exec $RERANK curl -sf http://localhost:5556/health > /dev/null && echo "OK" || echo "FAILED"
fi

if [ -n "$QDRANT" ]; then
  echo -n "Testing Qdrant... "
  docker exec $QDRANT curl -sf http://localhost:6333/collections > /dev/null && echo "OK" || echo "FAILED"
fi

if [ -n "$REDIS" ]; then
  echo -n "Testing Redis... "
  docker exec $REDIS redis-cli ping > /dev/null 2>&1 && echo "OK" || echo "FAILED"
fi

echo ""
echo "=== Test Complete ==="
```

Make it executable:
```bash
chmod +x /root/test-connectivity.sh
```

---

## 10. Troubleshooting

### Problem: "Connection refused" errors

**Cause**: Service not running or not on same network.

**Solution**:
```bash
# Check if service is running
docker ps | grep <service-name>

# Check if on weavink-internal network
docker network inspect weavink-internal

# If not on network, connect it
docker network connect weavink-internal <container-name>
```

### Problem: DNS resolution fails / "Name does not resolve"

**Cause**: Containers not on same network.

**Solution**:
```bash
# Verify both containers are on weavink-internal
docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'

# If missing, connect them
docker network connect weavink-internal <container-name>
```

### Problem: Container name changed after redeploy

**Cause**: Coolify generates new container name on rebuild.

**Solution**:
```bash
# Find new container name
docker ps --format "{{.Names}}\t{{.Image}}"

# Update environment variables in Coolify with new name
# Reconnect to network
docker network connect weavink-internal <new-container-name>
```

### Problem: Service starts then crashes (OOM)

**Cause**: Out of memory (model too large).

**Solution**:
```bash
# Check logs
docker logs <container-name> --tail 100

# Check memory usage
docker stats <container-name>

# Increase memory limit in Coolify service settings
```

### Problem: Health checks failing in Coolify

**Cause**: Service not ready yet (model still loading).

**Solution**:
- Increase "Start Period" in Coolify health check settings
- embed-service: 120-180 seconds
- rerank-service: 90-120 seconds

---

## Quick Reference

### Deployment Checklist

For **each service** you deploy:

- [ ] Deploy in Coolify
- [ ] Note container name from `docker ps`
- [ ] Connect to network: `docker network connect weavink-internal <name>`
- [ ] Verify: `docker network inspect weavink-internal`
- [ ] Update environment variables if needed

### Commands Cheat Sheet

```bash
# View all containers
docker ps -a

# View container logs
docker logs <container-name> -f

# Restart container
docker restart <container-name>

# Connect to network
docker network connect weavink-internal <container-name>

# Check network members
docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'

# View resource usage
docker stats

# Find container name by image
docker ps --filter ancestor=redis:7.2 --format "{{.Names}}"
```

### Service Ports (Internal Only)

| Service | Internal Port | Exposed? |
|---------|---------------|----------|
| Weavink App | 3000 | Yes (via Coolify/Traefik) |
| embed-service | 5555 | No |
| rerank-service | 5556 | No |
| Redis | 6379 | No |
| Qdrant | 6333 | No |

### Current Deployed Services

Update this table as you deploy:

| Service | Container Name | Port | Auth | Network Status |
|---------|----------------|------|------|----------------|
| Redis | `s40swk408s00s4s4k8kso0gk` | 6379 | Password | ✅ Connected |
| Qdrant | `qdrant-n8ck4s8oww0o8ckwoc0kgsc0` | 6333 | API Key | ✅ Connected |
| embed-service | `<pending>` | 5555 | None | ⏳ Pending |
| rerank-service | `<pending>` | 5556 | None | ⏳ Pending |
| Weavink App | `<pending>` | 3000 | Session | ⏳ Pending |

### Environment Variables Reference

```bash
# Redis (copy from Coolify Redis URL)
REDIS_URL=redis://default:<password>@s40swk408s00s4s4k8kso0gk:6379/0

# Qdrant
QDRANT_URL=http://qdrant-n8ck4s8oww0o8ckwoc0kgsc0:6333
QDRANT_API_KEY=di6jD05MiglTsccUwAHVXOmJQcz67fsm

# ML Services (update after deployment)
EMBED_SERVICE_URL=http://<embed-container>:5555
RERANK_SERVICE_URL=http://<rerank-container>:5556
```
