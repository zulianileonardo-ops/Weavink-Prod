#!/bin/bash
# Quick Qdrant test - run on VPS server
# Usage: ssh root@159.69.215.143 'bash -s' < quick-test-qdrant.sh

echo "🔍 Quick Qdrant Health Check"
echo "============================="
echo ""

# 1. Container status
echo "1️⃣  Container Status:"
docker ps | grep qdrant || echo "❌ Qdrant container not running!"
echo ""

# 2. Health check
echo "2️⃣  Health Check:"
curl -s http://10.0.4.2:6333/healthz
echo ""
echo ""

# 3. Collections
echo "3️⃣  Collections:"
curl -s http://10.0.4.2:6333/collections | jq -r '.result.collections[] | .name'
echo ""

# 4. Vector counts
echo "4️⃣  Vector Counts:"
echo -n "   User 1 (IFxPCgSA8NapEq5W8jh6yHrtJGJ2): "
curl -s http://10.0.4.2:6333/collections/IFxPCgSA8NapEq5W8jh6yHrtJGJ2 | jq -r '.result.points_count'

echo -n "   User 2 (ScmVq6p8ubQ9JFbniF2Vg5ocmbv2): "
curl -s http://10.0.4.2:6333/collections/ScmVq6p8ubQ9JFbniF2Vg5ocmbv2 | jq -r '.result.points_count'
echo ""

# 5. Network check
echo "5️⃣  Network Configuration:"
echo -n "   Qdrant networks: "
docker inspect qdrant-qkkkc8kskocgwo0o8c444cgo | jq -r '.[].NetworkSettings.Networks | keys | join(", ")'
echo ""

echo "✅ Quick test complete!"
