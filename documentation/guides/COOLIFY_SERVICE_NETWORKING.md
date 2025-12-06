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
9. [Cloudflare Tunnels](#9-cloudflare-tunnels)
10. [Testing Connectivity](#10-testing-connectivity)
11. [Troubleshooting](#11-troubleshooting)
12. [Testing Scripts](#12-testing-scripts)
13. [Future Updates](#13-future-updates)

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

### Container Names & Network Commands

| Service | Container Name | Status | Network Command |
|---------|----------------|--------|-----------------|
| Redis | `s40swk408s00s4s4k8kso0gk` | ✅ Done | `docker network connect weavink-internal s40swk408s00s4s4k8kso0gk` |
| Qdrant | `qdrant-n8ck4s8oww0o8ckwoc0kgsc0` | ✅ Done | `docker network connect weavink-internal qdrant-n8ck4s8oww0o8ckwoc0kgsc0` |
| embed-service | `e0g4c0g8wsswskosgo0o00k0-124929708495` | ✅ Done | `docker network connect weavink-internal e0g4c0g8wsswskosgo0o00k0-124929708495` |
| rerank-service | `gko04o4448o44cwgw4gk080w-133339492322` | ✅ Done | `docker network connect weavink-internal gko04o4448o44cwgw4gk080w-133339492322` |
| Weavink App | `<pending>` | ⏳ Pending | `docker network connect weavink-internal <container-name>` |

### Architecture Diagram

```mermaid
flowchart TB
    subgraph Internet["🌐 Internet"]
        User["👤 User<br/>Browser"]
    end

    subgraph CloudflareLayer["🟠 Cloudflare (glidlink.com)"]
        CF["☁️ Cloudflare Edge<br/>TLS Termination"]
        Tunnel["🔒 Cloudflare Tunnel<br/>Encrypted Connection"]
    end

    subgraph Server["🖥️ Server (46.224.102.247)"]
        subgraph Coolify["☁️ Coolify / Traefik"]
            Traefik["🔀 Traefik Proxy<br/>Port 443 (HTTPS)<br/>Origin Certificate"]
        end

        subgraph DockerNetwork["🔒 Docker Network: weavink-internal"]
            subgraph WeavinkApp["📦 Weavink App ⏳"]
                NextJS["⚛️ Next.js<br/>Port 3000<br/><i>Public via Traefik</i>"]
            end

            subgraph MLServices["🤖 ML Services (fastembed 0.5.1)"]
                Embed["📊 embed-service ✅<br/>Port 5555<br/>E5-large (1024D)<br/><i>e0g4c0g8wsswskosgo0o00k0-...</i>"]
                Rerank["🔄 rerank-service ✅<br/>Port 5556<br/>BGE-reranker-base<br/><i>gko04o4448o44cwgw4gk080w-...</i>"]
            end

            subgraph DataStores["💾 Data Stores"]
                Redis["🔴 Redis ✅<br/>Port 6379<br/><i>s40swk408s00s4s4k8kso0gk</i>"]
                Qdrant["🔷 Qdrant ✅<br/>Port 6333<br/><i>qdrant-n8ck4s8oww0o8ckwoc0kgsc0</i>"]
            end
        end
    end

    %% External connections (Full TLS)
    User -->|"HTTPS"| CF
    CF -->|"Encrypted"| Tunnel
    Tunnel -->|"HTTPS :443"| Traefik
    Traefik -->|"HTTP :3000"| NextJS

    %% Internal connections from Weavink
    NextJS -->|"POST /embed"| Embed
    NextJS -->|"POST /rerank"| Rerank
    NextJS -->|"redis:// + Password"| Redis
    NextJS -->|"HTTP + API Key"| Qdrant

    %% Styling
    classDef internet fill:#e1f5fe,stroke:#01579b
    classDef cloudflare fill:#fff3e0,stroke:#f48120
    classDef proxy fill:#fff3e0,stroke:#e65100
    classDef app fill:#e8f5e9,stroke:#2e7d32
    classDef deployed fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    classDef deploying fill:#bbdefb,stroke:#1976d2,stroke-dasharray: 5 5
    classDef pending fill:#fff9c4,stroke:#f9a825,stroke-dasharray: 5 5
    classDef data fill:#fce4ec,stroke:#c2185b

    class User internet
    class CF,Tunnel cloudflare
    class Traefik proxy
    class NextJS pending
    class Embed deployed
    class Rerank deployed
    class Redis,Qdrant deployed
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

```mermaid
flowchart TB
    subgraph External["🌐 EXTERNAL (Internet → Coolify)"]
        HTTPS["HTTPS :443<br/>User auth via session cookies"]
    end

    subgraph Internal["🔒 INTERNAL (Docker Network: weavink-internal)"]
        subgraph NoAuth["No Authentication"]
            Embed["📊 embed-service :5555<br/>POST /embed, /embed/batch"]
            Rerank["🔄 rerank-service :5556<br/>POST /rerank"]
        end

        subgraph WithAuth["With Authentication"]
            RedisAuth["🔴 Redis :6379<br/>Password in URL<br/><code>redis://default:PASS@host:6379</code>"]
            QdrantAuth["🔷 Qdrant :6333<br/>API Key Header<br/><code>api-key: &lt;key&gt;</code>"]
        end
    end

    External --> Internal

    classDef external fill:#e3f2fd,stroke:#1565c0
    classDef noauth fill:#fff3e0,stroke:#ef6c00
    classDef withauth fill:#e8f5e9,stroke:#2e7d32

    class HTTPS external
    class Embed,Rerank noauth
    class RedisAuth,QdrantAuth withauth
```

> **Why ML services have no auth:**
> - Only accessible within Docker network
> - No external port exposure
> - Network isolation = security boundary

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

1. **New Resource** → **Git Based** → Select your Weavink repo
2. **Settings**:
   - **Build Pack**: `Dockerfile`
   - **Base Directory**: `/docker/embed-service`
   - **Ports Mappings**: Leave empty (internal only!)
   - **Make it publicly available**: OFF
3. **Resources**:
   - CPU Limit: 6
   - Memory Limit: 6GB
4. **Deploy** (first build takes ~10 min to download E5-large model)
5. **Connect to network via SSH**:
   ```bash
   # SSH into server
   ssh root@46.224.102.247

   # Find the container name
   docker ps | grep embed

   # Connect to network
   docker network connect weavink-internal <container-name>

   # Verify connection
   docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'
   ```

### Step 5: Deploy rerank-service

1. **New Resource** → **Git Based** → Select your Weavink repo
2. **Settings**:
   - **Build Pack**: `Dockerfile`
   - **Base Directory**: `/docker/rerank-service`
   - **Ports Mappings**: Leave empty (internal only!)
   - **Make it publicly available**: OFF
3. **Resources**:
   - CPU Limit: 4
   - Memory Limit: 4GB
4. **Deploy** (first build takes ~5 min to download BGE-reranker model)
5. **Connect to network via SSH**:
   ```bash
   # SSH into server
   ssh root@46.224.102.247

   # Find the container name
   docker ps | grep rerank

   # Connect to network
   docker network connect weavink-internal <container-name>

   # Verify connection
   docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'
   ```

### Important: fastembed Version

The rerank-service requires `fastembed>=0.4.0` for the `fastembed.rerank.cross_encoder` module. The Dockerfiles use `fastembed==0.5.1`.

If you encounter `ModuleNotFoundError: No module named 'fastembed.rerank'`, the Docker cache may be using an old version. The Dockerfile includes a cache-bust ARG to force rebuilds.

### Step 6: Deploy Weavink App

1. **New Resource** → Your app repository
2. **Settings**:
   - **Make it publicly available**: ON (this is your public app)
   - Configure domain in Coolify
3. **Environment Variables**: See Section 6
4. **Deploy** and note the container name

---

## 5. Connecting Services to Network

**IMPORTANT**: After deploying each service in Coolify, you must manually connect it to the `weavink-internal` network via SSH.

### SSH Commands Reference

```bash
# SSH into server
ssh root@46.224.102.247

# Create network (only once, if not exists)
docker network create weavink-internal

# Connect a container to network
docker network connect weavink-internal <container-name>

# Disconnect a container from network
docker network disconnect weavink-internal <container-name>

# List all containers on the network
docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'

# Full network details
docker network inspect weavink-internal
```

### The Process (For Each Service)

#### Step 1: Find the container name

```bash
# SSH into server
ssh root@46.224.102.247

# List all containers
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

# Or find specific services:
docker ps | grep redis
docker ps | grep qdrant
docker ps | grep embed
docker ps | grep rerank
```

Example output:
```
NAMES                                    IMAGE                    STATUS
s40swk408s00s4s4k8kso0gk                redis:7.2                Up 5 minutes
qdrant-n8ck4s8oww0o8ckwoc0kgsc0         qdrant/qdrant:v1.12      Up 3 minutes
e0g4c0g8wsswskosgo0o00k0-124929708495   embed-service            Up 2 minutes
```

#### Step 2: Connect each container to the network

```bash
# Connect Redis
docker network connect weavink-internal s40swk408s00s4s4k8kso0gk

# Connect Qdrant
docker network connect weavink-internal qdrant-n8ck4s8oww0o8ckwoc0kgsc0

# Connect embed-service
docker network connect weavink-internal e0g4c0g8wsswskosgo0o00k0-124929708495

# Connect rerank-service (replace with actual name after deployment)
docker network connect weavink-internal <rerank-container-name>

# Connect Weavink app (replace with actual name after deployment)
docker network connect weavink-internal <weavink-container-name>
```

**Note**: If you see `Error response from daemon: endpoint with name ... already exists in network`, the container is already connected.

#### Step 3: Verify all services are connected

```bash
docker network inspect weavink-internal --format '{{range .Containers}}{{.Name}} {{end}}'
```

Expected output (all on one line):
```
s40swk408s00s4s4k8kso0gk qdrant-n8ck4s8oww0o8ckwoc0kgsc0 e0g4c0g8wsswskosgo0o00k0-124929708495 <rerank> <weavink>
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

### UFW Firewall Configuration

The server firewall is configured to only allow necessary ports:

```bash
# Current UFW Status (as of Dec 5, 2025)
Status: active

To                         Action      From
--                         ------      ----
22                         ALLOW       Anywhere        # SSH
80                         ALLOW       Anywhere        # HTTP
443                        ALLOW       Anywhere        # HTTPS
8000                       ALLOW       Anywhere        # Coolify Dashboard
6001:6002/tcp              ALLOW       Anywhere        # Coolify Realtime (WebSocket)
```

### Setting Up UFW Firewall

```bash
# Enable UFW with default deny incoming
ufw default deny incoming
ufw default allow outgoing

# Allow required ports
ufw allow 22        # SSH
ufw allow 80        # HTTP
ufw allow 443       # HTTPS
ufw allow 8000      # Coolify Dashboard
ufw allow 6001:6002/tcp  # Coolify Realtime

# Enable firewall
ufw --force enable

# Check status
ufw status
```

### Optional: Restrict Coolify Dashboard to Your IP

```bash
# Find your IP first (run on your local machine)
curl ifconfig.me

# Then on the server, restrict port 8000 to your IP only
ufw delete allow 8000
ufw allow from YOUR_IP to any port 8000
```

**Warning**: Only do this if you have a static IP, otherwise you may lock yourself out.

### Security Audit Results (Dec 5, 2025)

| Check | Status | Details |
|-------|--------|---------|
| Internal ports (5555, 5556, 6333, 6379) bound to 0.0.0.0 | ✅ PASS | Not exposed |
| Docker port bindings | ✅ PASS | Internal services have no host port mappings |
| Redis authentication | ✅ PASS | Password required (`NOAUTH Authentication required`) |
| Localhost access to internal services | ✅ PASS | All return "NOT ACCESSIBLE" |
| Network isolation | ✅ PASS | All 4 services on `weavink-internal` |
| UFW Firewall | ✅ ACTIVE | Only ports 22, 80, 443, 8000, 6001-6002 allowed |

### Port Exposure Summary

| Port | Service | Bound To | Accessible From Internet |
|------|---------|----------|--------------------------|
| 22 | SSH | 0.0.0.0 | ✅ Yes (allowed) |
| 80 | HTTP/Traefik | 0.0.0.0 | ✅ Yes (allowed) |
| 443 | HTTPS/Traefik | 0.0.0.0 | ✅ Yes (allowed) |
| 8000 | Coolify Dashboard | 0.0.0.0 | ✅ Yes (allowed) |
| 6001-6002 | Coolify Realtime | 0.0.0.0 | ✅ Yes (allowed) |
| 5555 | embed-service | Internal only | 🔒 No |
| 5556 | rerank-service | Internal only | 🔒 No |
| 6333 | Qdrant | Internal only | 🔒 No |
| 6379 | Redis | Internal only | 🔒 No |

### Network Isolation

Services on `weavink-internal` network CANNOT be reached from:
- The internet
- Other Docker networks
- Other projects in Coolify
- The host machine's localhost (verified)

### Security Audit Script

Run this script to verify security configuration:

```bash
cat > /root/security-audit.sh << 'EOF'
#!/bin/bash
echo "========================================"
echo "  WEAVINK SECURITY AUDIT"
echo "  Server: $(hostname)"
echo "  Date: $(date)"
echo "========================================"

echo ""
echo "=== 1. LISTENING PORTS ==="
ss -tlnp | grep LISTEN

echo ""
echo "=== 2. DOCKER PORT BINDINGS ==="
docker ps --format "table {{.Names}}\t{{.Ports}}"

echo ""
echo "=== 3. FIREWALL STATUS ==="
sudo ufw status verbose 2>/dev/null || echo "UFW not installed"

echo ""
echo "=== 4. LOCALHOST ACCESS TEST ==="
echo -n "embed-service (5555): "
curl -s --connect-timeout 2 http://localhost:5555/health 2>/dev/null || echo "NOT ACCESSIBLE (good)"
echo -n "rerank-service (5556): "
curl -s --connect-timeout 2 http://localhost:5556/health 2>/dev/null || echo "NOT ACCESSIBLE (good)"
echo -n "qdrant (6333): "
curl -s --connect-timeout 2 http://localhost:6333/collections 2>/dev/null || echo "NOT ACCESSIBLE (good)"

echo ""
echo "=== 5. NETWORK MEMBERS ==="
docker network inspect weavink-internal --format '{{range .Containers}}  - {{.Name}}{{"\n"}}{{end}}'

echo ""
echo "=== 6. REDIS AUTH TEST ==="
docker exec s40swk408s00s4s4k8kso0gk redis-cli ping 2>/dev/null || echo "Auth required (good)"

echo ""
echo "=== 7. EXTERNAL PORT CHECK ==="
ss -tlnp | grep -E ":5555|:5556|:6333|:6379" | grep "0.0.0.0" && echo "WARNING!" || echo "OK: Internal ports not exposed"

echo ""
echo "========================================"
EOF
chmod +x /root/security-audit.sh
```

Run with: `/root/security-audit.sh`

---

## 9. Cloudflare Tunnels

Our deployment uses **Cloudflare Tunnels** with **Full TLS** to securely expose services through `glidlink.com` without exposing the server's IP address.

### What is Cloudflare Tunnel?

Cloudflare Tunnel creates an encrypted connection between your server and Cloudflare's edge network. This means:

| Benefit | Description |
|---------|-------------|
| **Hidden Server IP** | Your server's real IP (46.224.102.247) is never exposed to the internet |
| **No Port Forwarding** | No need to open ports on your router/firewall for public access |
| **DDoS Protection** | Cloudflare's edge network absorbs attacks before they reach your server |
| **Automatic SSL** | Cloudflare handles certificate issuance and renewal |
| **Works with Dynamic IP** | Even if your server IP changes, the tunnel keeps working |

### Current Configuration

| Setting | Value |
|---------|-------|
| **Domain** | glidlink.com |
| **TLS Mode** | Full (Strict) - End-to-end HTTPS |
| **Tunnel Type** | Cloudflared container in Coolify |
| **Origin Certificate** | Wildcard (*.glidlink.com), 15 years validity |

### Architecture with Cloudflare Tunnel

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 User
    participant CF as ☁️ Cloudflare Edge
    participant T as 🔒 Tunnel
    participant TR as 🔀 Traefik
    participant W as ⚛️ Weavink App

    Note over U,W: Full TLS - Encrypted End-to-End

    U->>+CF: HTTPS (glidlink.com)
    Note right of CF: Cloudflare TLS<br/>DDoS Protection
    CF->>+T: Encrypted Tunnel
    Note right of T: Cloudflared Container<br/>Outbound Connection
    T->>+TR: HTTPS :443
    Note right of TR: Origin Certificate<br/>(*.glidlink.com)
    TR->>+W: HTTP :3000
    W-->>-TR: Response
    TR-->>-T: HTTPS Response
    T-->>-CF: Encrypted
    CF-->>-U: HTTPS Response
```

### Full TLS Setup (Reference)

This is how the Full TLS configuration was set up:

#### Step 1: Create Cloudflare Tunnel

1. Go to **Cloudflare Zero Trust** → **Networks** → **Tunnels**
2. Click **Create a tunnel** → Select **Cloudflared**
3. Name the tunnel (e.g., `glidlink-coolify`)
4. Copy the tunnel token (starts with `eyJ...`)

#### Step 2: Create Origin Certificate

1. Go to **Cloudflare Dashboard** → **SSL/TLS** → **Origin Server**
2. Click **Create Certificate**
3. Settings:
   - **Private key type**: RSA (2048)
   - **Hostnames**: `*.glidlink.com`, `glidlink.com`
   - **Certificate Validity**: 15 years
4. Click **Create** and download both:
   - Certificate (PEM) → save as `glidlink.cert`
   - Private Key (PEM) → save as `glidlink.key`

#### Step 3: Install Certificate on Server

```bash
# SSH into server
ssh root@46.224.102.247

# Create certs directory
mkdir -p /data/coolify/proxy/certs

# Upload certificate files (from your local machine)
scp glidlink.cert root@46.224.102.247:/data/coolify/proxy/certs/
scp glidlink.key root@46.224.102.247:/data/coolify/proxy/certs/

# Verify files
ls -la /data/coolify/proxy/certs/
```

#### Step 4: Configure Traefik for TLS

In Coolify Dashboard → **Servers** → **Proxy** → **Dynamic Configuration**:

```yaml
tls:
  certificates:
    - certFile: /traefik/certs/glidlink.cert
      keyFile: /traefik/certs/glidlink.key
```

#### Step 5: Set Cloudflare SSL Mode

1. Go to **Cloudflare Dashboard** → **SSL/TLS** → **Overview**
2. Select **Full (strict)**

#### Step 6: Configure Tunnel Hostname

In Cloudflare Zero Trust → Tunnels → Your Tunnel → **Public Hostname**:

| Field | Value |
|-------|-------|
| **Subdomain** | `*` (wildcard) |
| **Domain** | glidlink.com |
| **Type** | HTTPS |
| **URL** | localhost:443 |

Under **TLS Settings**:
- **Origin Server Name**: glidlink.com

#### Step 7: Deploy Cloudflared in Coolify

1. **New Resource** → Search for **Cloudflared**
2. Add environment variable:
   ```
   TUNNEL_TOKEN=eyJ... (your tunnel token)
   ```
3. Deploy

#### Step 8: Enable Always HTTPS

1. Go to **Cloudflare Dashboard** → **SSL/TLS** → **Edge Certificates**
2. Enable **Always Use HTTPS**

### Verifying the Setup

```bash
# Check tunnel is running
docker ps | grep cloudflared

# Test HTTPS externally
curl -I https://glidlink.com

# Check certificate
openssl s_client -connect glidlink.com:443 -servername glidlink.com 2>/dev/null | openssl x509 -noout -issuer -dates
```

### When NOT to Use Cloudflare Tunnels

Consider alternatives if you:
- Need direct server access without proxy intermediaries
- Want SSL certificates from non-Cloudflare authorities (Let's Encrypt, etc.)
- Prefer not routing traffic through Cloudflare's infrastructure
- Have strict data residency requirements

### Troubleshooting Cloudflare Tunnels

#### Problem: TOO_MANY_REDIRECTS

**Cause**: SSL mode mismatch between Cloudflare and Traefik.

**Solution**: Ensure Cloudflare SSL is set to "Full (strict)" and tunnel points to HTTPS:443.

#### Problem: Tunnel shows "Unhealthy"

**Cause**: Cloudflared container not running or token invalid.

**Solution**:
```bash
# Check container logs
docker logs $(docker ps -q --filter name=cloudflared)

# Verify token is correct
docker exec $(docker ps -q --filter name=cloudflared) printenv TUNNEL_TOKEN
```

#### Problem: Certificate errors

**Cause**: Origin certificate not properly installed or hostname mismatch.

**Solution**:
```bash
# Verify certificate files exist
ls -la /data/coolify/proxy/certs/

# Check certificate hostnames
openssl x509 -in /data/coolify/proxy/certs/glidlink.cert -noout -text | grep DNS
```

---

## 10. Testing Connectivity

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

## 11. Troubleshooting

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

| Service | Container Name | Port | Auth | Network Status |
|---------|----------------|------|------|----------------|
| Redis | `s40swk408s00s4s4k8kso0gk` | 6379 | Password | ✅ Connected |
| Qdrant | `qdrant-n8ck4s8oww0o8ckwoc0kgsc0` | 6333 | API Key | ✅ Connected |
| embed-service | `e0g4c0g8wsswskosgo0o00k0-124929708495` | 5555 | None | ✅ Connected |
| rerank-service | `gko04o4448o44cwgw4gk080w-133339492322` | 5556 | None | ✅ Connected |
| Weavink App | `<pending>` | 3000 | Session | ⏳ Pending |

### Environment Variables Reference

```bash
# Redis (copy from Coolify Redis URL)
REDIS_URL=redis://default:<password>@s40swk408s00s4s4k8kso0gk:6379/0

# Qdrant
QDRANT_URL=http://qdrant-n8ck4s8oww0o8ckwoc0kgsc0:6333
QDRANT_API_KEY=di6jD05MiglTsccUwAHVXOmJQcz67fsm

# ML Services (fastembed 0.5.1)
EMBED_SERVICE_URL=http://e0g4c0g8wsswskosgo0o00k0-124929708495:5555
RERANK_SERVICE_URL=http://gko04o4448o44cwgw4gk080w-133339492322:5556
```

---

## 12. Testing Scripts

> **Note**: These scripts are stored in this documentation for reference. They are NOT kept on the server to keep it clean. Copy and run them when needed, then delete after use.

### Last Test Results (Dec 5, 2025)

All services passed connectivity tests:
```
1. Testing Redis...      ✅ Redis: OK (auth required)
2. Testing Qdrant...     ✅ Qdrant: OK
3. Testing embed-service... ✅ embed-service: OK
4. Testing rerank-service... ✅ rerank-service: OK
```

### Test Embed Service

Create this script on your server to test the embed-service:

```bash
cat > /root/test-embed.sh << 'EOF'
#!/bin/bash
EMBED_URL="http://e0g4c0g8wsswskosgo0o00k0-124929708495:5555"

echo "=== Health Check ==="
docker run --rm --network weavink-internal curlimages/curl "$EMBED_URL/health"

echo ""
echo "=== Single Embedding ==="
docker run --rm --network weavink-internal curlimages/curl -X POST "$EMBED_URL/embed" -H "Content-Type: application/json" -d '{"text":"React developer"}'

echo ""
echo "=== Batch Embedding ==="
docker run --rm --network weavink-internal curlimages/curl -X POST "$EMBED_URL/embed/batch" -H "Content-Type: application/json" -d '{"texts":["React dev","Python dev"]}'
EOF
chmod +x /root/test-embed.sh
```

Run with: `/root/test-embed.sh`

### Test Rerank Service

```bash
cat > /root/test-rerank.sh << 'EOF'
#!/bin/bash
RERANK_URL="http://gko04o4448o44cwgw4gk080w-133339492322:5556"

echo "=== Health Check ==="
docker run --rm --network weavink-internal curlimages/curl "$RERANK_URL/health"

echo ""
echo "=== Reranking Test ==="
docker run --rm --network weavink-internal curlimages/curl -X POST "$RERANK_URL/rerank" -H "Content-Type: application/json" -d '{"query":"React developer","documents":["John is a React expert","Marie works in marketing","Carlos knows Node.js"],"top_n":2}'
EOF
chmod +x /root/test-rerank.sh
```

### Test All Services

```bash
cat > /root/test-all-services.sh << 'EOF'
#!/bin/bash
echo "========================================"
echo "  WEAVINK SERVICES CONNECTIVITY TEST"
echo "========================================"
echo ""

# Service containers
REDIS_CONTAINER="s40swk408s00s4s4k8kso0gk"
QDRANT_CONTAINER="qdrant-n8ck4s8oww0o8ckwoc0kgsc0"
EMBED_CONTAINER="e0g4c0g8wsswskosgo0o00k0-124929708495"
RERANK_CONTAINER="gko04o4448o44cwgw4gk080w-133339492322"
QDRANT_API_KEY="di6jD05MiglTsccUwAHVXOmJQcz67fsm"

echo "1. Testing Redis..."
docker exec $REDIS_CONTAINER redis-cli ping 2>/dev/null && echo "   ✅ Redis: OK" || echo "   ❌ Redis: FAILED"

echo ""
echo "2. Testing Qdrant..."
docker run --rm --network weavink-internal curlimages/curl -s -H "api-key: $QDRANT_API_KEY" "http://$QDRANT_CONTAINER:6333/collections" | grep -q "result" && echo "   ✅ Qdrant: OK" || echo "   ❌ Qdrant: FAILED"

echo ""
echo "3. Testing embed-service..."
docker run --rm --network weavink-internal curlimages/curl -s "http://$EMBED_CONTAINER:5555/health" | grep -q "ok" && echo "   ✅ embed-service: OK" || echo "   ❌ embed-service: FAILED"

echo ""
echo "4. Testing rerank-service..."
docker run --rm --network weavink-internal curlimages/curl -s "http://$RERANK_CONTAINER:5556/health" | grep -q "ok" && echo "   ✅ rerank-service: OK" || echo "   ❌ rerank-service: FAILED"

echo ""
echo "5. Network members:"
docker network inspect weavink-internal --format '{{range .Containers}}   - {{.Name}}{{"\n"}}{{end}}'

echo ""
echo "========================================"
EOF
chmod +x /root/test-all-services.sh
```

Run with: `/root/test-all-services.sh`

---

## 13. Future Updates

### Planned: Firebase → Supabase Migration

A future migration from Firebase to self-hosted Supabase is planned. This section documents the information needed for that migration.

#### Supabase Service Stack (Coolify)

Coolify provides a pre-configured Supabase stack with the following services:

| Service | Image | Purpose |
|---------|-------|---------|
| **Kong** | `kong:2.8.1` | API Gateway - routes all requests |
| **Studio** | `supabase/studio:2025.06.02` | Dashboard UI (like Firebase console) |
| **PostgreSQL** | `supabase/postgres:15.8.1.048` | Main database (replaces Firestore) |
| **PostgREST** | `postgrest/postgrest:v12.2.12` | Auto-generates REST API from DB schema |
| **GoTrue (Auth)** | `supabase/gotrue:v2.174.0` | Authentication (replaces Firebase Auth) |
| **Realtime** | `supabase/realtime:v2.34.47` | WebSocket subscriptions |
| **Storage** | `supabase/storage-api:v1.14.6` | File storage (replaces Firebase Storage) |
| **Edge Functions** | `supabase/edge-runtime:v1.67.4` | Serverless functions (replaces Cloud Functions) |
| **Supavisor** | `supabase/supavisor:2.5.1` | Connection pooler for PostgreSQL |
| **MinIO** | `minio:RELEASE.2025-10-15` | S3-compatible storage backend |
| **Analytics** | `supabase/logflare:1.4.0` | Logging & analytics |
| **Vector** | `timberio/vector:0.28.1-alpine` | Log collection |
| **Imgproxy** | `darthsim/imgproxy:v3.8.0` | Image transformations |
| **Postgres-Meta** | `supabase/postgres-meta:v0.89.3` | Database management API |

#### Coolify Supabase Configuration

```
Service Name: supabase-xc444cgkow0gw4kgkwcg0cgo

Credentials (from Coolify):
- Dashboard User: 0kSZLqeJl19owZqY
- Dashboard Password: [stored in Coolify]
- MinIO Admin User: Q2WuRfq2qN8wBQxh
- MinIO Admin Password: [stored in Coolify]
- PostgreSQL Database: postgres
- PostgreSQL Password: [stored in Coolify]
```

#### Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 8GB | 16GB |
| CPU | 4 cores | 8 cores |
| Disk | 50GB | 100GB+ |

#### Network Integration

After deploying Supabase, connect all containers to `weavink-internal`:

```bash
# Get all Supabase container names
docker ps --format "{{.Names}}" | grep supabase

# Connect each to the network
docker network connect weavink-internal supabasekong-xc444cgkow0gw4kgkwcg0cgo
docker network connect weavink-internal supabasedb-xc444cgkow0gw4kgkwcg0cgo
# ... repeat for all Supabase containers
```

#### Environment Variables for Weavink App

When migrating, update these environment variables:

```bash
# Current (Firebase)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...

# Future (Supabase)
NEXT_PUBLIC_SUPABASE_URL=http://supabasekong-xc444cgkow0gw4kgkwcg0cgo:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-supabase-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from-supabase-dashboard>
DATABASE_URL=postgresql://postgres:<password>@supabasedb-xc444cgkow0gw4kgkwcg0cgo:5432/postgres
```

#### Migration Checklist

- [ ] Deploy Supabase stack in Coolify
- [ ] Connect all Supabase containers to `weavink-internal` network
- [ ] Configure Supabase Studio dashboard
- [ ] Set up PostgreSQL schema (migrate from Firestore)
- [ ] Migrate Firebase Auth users to Supabase Auth
- [ ] Migrate Firebase Storage files to Supabase Storage
- [ ] Update Weavink App environment variables
- [ ] Update application code to use Supabase SDK
- [ ] Test all functionality
- [ ] Decommission Firebase

#### Firebase Features to Migrate

| Firebase Feature | Supabase Equivalent |
|------------------|---------------------|
| Firebase Auth | Supabase Auth (GoTrue) |
| Firestore | PostgreSQL + PostgREST |
| Firebase Storage | Supabase Storage + MinIO |
| Cloud Functions | Edge Functions |
| Realtime Database | Supabase Realtime |

#### Architecture After Migration

```mermaid
flowchart TB
    subgraph DockerNetwork["🔒 Docker Network: weavink-internal"]
        subgraph WeavinkApp["📦 Weavink App"]
            NextJS["⚛️ Next.js<br/>Port 3000"]
        end

        subgraph Supabase["🗄️ Supabase Stack"]
            subgraph SupabaseTop["API & UI Layer"]
                Kong["🔀 Kong<br/>:8000"]
                Studio["📊 Studio<br/>:3000"]
                Auth["🔐 Auth<br/>:9999"]
            end
            subgraph SupabaseBottom["Data Layer"]
                Postgres["🐘 Postgres<br/>:5432"]
                Storage["📁 Storage<br/>:5000"]
                Realtime["⚡ Realtime<br/>:4000"]
            end
        end

        subgraph MLServices["🤖 ML Services"]
            Embed["📊 embed-service<br/>:5555"]
            Rerank["🔄 rerank-service<br/>:5556"]
        end

        subgraph DataStores["💾 Data Stores"]
            Redis["🔴 Redis<br/>:6379"]
            Qdrant["🔷 Qdrant<br/>:6333"]
        end

        NextJS --> Kong
        NextJS --> Embed
        NextJS --> Rerank
        NextJS --> Redis
        NextJS --> Qdrant
    end

    classDef app fill:#e8f5e9,stroke:#2e7d32
    classDef supabase fill:#e3f2fd,stroke:#1565c0
    classDef ml fill:#fff3e0,stroke:#ef6c00
    classDef data fill:#fce4ec,stroke:#c2185b

    class NextJS app
    class Kong,Studio,Auth,Postgres,Storage,Realtime supabase
    class Embed,Rerank ml
    class Redis,Qdrant data
```

#### Important Notes

1. **Don't deploy Supabase yet** - Complete Weavink App deployment first
2. **Resource planning** - Supabase adds significant resource overhead
3. **Data migration** - Plan for Firestore → PostgreSQL schema design
4. **Downtime** - Plan for migration window with potential downtime
5. **Rollback plan** - Keep Firebase running until Supabase is fully tested
