#!/bin/bash
# Fix duplicate vectors in Qdrant by deleting collections and preparing for re-migration
# Run on VPS: ssh root@159.69.215.143 'bash -s' < fix-duplicate-vectors.sh

set -e

echo "🔧 Fixing Duplicate Vectors in Qdrant"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Create backups
echo "1️⃣  Creating snapshot backups (safety measure)..."
echo ""

echo -n "Creating snapshot for User 1 collection... "
SNAPSHOT1=$(curl -s -X POST http://10.0.4.2:6333/collections/IFxPCgSA8NapEq5W8jh6yHrtJGJ2/snapshots)
if echo "$SNAPSHOT1" | grep -q "result"; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
    echo "Response: $SNAPSHOT1"
fi

echo -n "Creating snapshot for User 2 collection... "
SNAPSHOT2=$(curl -s -X POST http://10.0.4.2:6333/collections/ScmVq6p8ubQ9JFbniF2Vg5ocmbv2/snapshots)
if echo "$SNAPSHOT2" | grep -q "result"; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
    echo "Response: $SNAPSHOT2"
fi

echo ""
echo "Snapshots created. You can list them with:"
echo "  curl http://10.0.4.2:6333/collections/IFxPCgSA8NapEq5W8jh6yHrtJGJ2/snapshots"
echo ""

# Step 2: Show current state
echo "2️⃣  Current vector counts (before deletion):"
echo ""

COUNT1=$(curl -s http://10.0.4.2:6333/collections/IFxPCgSA8NapEq5W8jh6yHrtJGJ2 | jq -r '.result.points_count' 2>/dev/null || echo "error")
COUNT2=$(curl -s http://10.0.4.2:6333/collections/ScmVq6p8ubQ9JFbniF2Vg5ocmbv2 | jq -r '.result.points_count' 2>/dev/null || echo "error")
TOTAL=$((COUNT1 + COUNT2))

echo "   User 1 (IFxPCgSA8NapEq5W8jh6yHrtJGJ2): $COUNT1 vectors"
echo "   User 2 (ScmVq6p8ubQ9JFbniF2Vg5ocmbv2): $COUNT2 vectors"
echo -e "   ${YELLOW}Total: $TOTAL vectors${NC} (expected: 103)"
echo ""

# Step 3: Confirm deletion
echo -e "${YELLOW}⚠️  WARNING: About to delete both collections!${NC}"
echo "This will remove all duplicate vectors. You can restore from snapshots if needed."
echo ""
read -p "Continue with deletion? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Aborted.${NC} No changes made."
    exit 1
fi

echo ""

# Step 4: Delete collections
echo "3️⃣  Deleting collections..."
echo ""

echo -n "Deleting User 1 collection... "
DELETE1=$(curl -s -X DELETE http://10.0.4.2:6333/collections/IFxPCgSA8NapEq5W8jh6yHrtJGJ2)
if echo "$DELETE1" | grep -q "true"; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
    echo "Response: $DELETE1"
fi

echo -n "Deleting User 2 collection... "
DELETE2=$(curl -s -X DELETE http://10.0.4.2:6333/collections/ScmVq6p8ubQ9JFbniF2Vg5ocmbv2)
if echo "$DELETE2" | grep -q "true"; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
    echo "Response: $DELETE2"
fi

# Step 5: Wait for deletion to propagate
echo ""
echo "Waiting for deletion to complete..."
sleep 2

# Step 6: Verify deletion
echo ""
echo "4️⃣  Verifying deletion..."
echo ""

COLLECTIONS=$(curl -s http://10.0.4.2:6333/collections | jq -r '.result.collections | length' 2>/dev/null || echo "error")

if [ "$COLLECTIONS" = "0" ]; then
    echo -e "${GREEN}✅ Success!${NC} All collections deleted."
else
    echo -e "${YELLOW}⚠️  Found $COLLECTIONS collections remaining.${NC}"
    curl -s http://10.0.4.2:6333/collections | jq -r '.result.collections[] | .name'
fi

# Step 7: Next steps
echo ""
echo "======================================"
echo -e "${GREEN}✅ Collections deleted successfully!${NC}"
echo "======================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. SSH to your server:"
echo "   ssh root@159.69.215.143"
echo ""
echo "2. Enter the app container:"
echo "   docker exec -it u8088g48cwkw4gso8o40o48o-141312250841 sh"
echo ""
echo "3. Run the migration script (ONCE!):"
echo "   node /root/migrate-pinecone-to-qdrant.mjs"
echo ""
echo "4. Exit the container:"
echo "   exit"
echo ""
echo "5. Verify the fix:"
echo "   bash test-qdrant-migration.sh"
echo ""
echo "Expected result: 102 + 1 = 103 vectors total"
echo ""
