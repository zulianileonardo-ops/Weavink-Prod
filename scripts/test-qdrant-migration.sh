#!/bin/bash
# Test script for Qdrant migration verification
# Run this on your VPS: ssh root@159.69.215.143 'bash -s' < test-qdrant-migration.sh

set -e

echo "🧪 Qdrant Migration Test Suite"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function for tests
test_command() {
    local test_name="$1"
    local command="$2"
    local expected="$3"

    echo -n "Testing: $test_name... "

    if output=$(eval "$command" 2>&1); then
        if [ -n "$expected" ]; then
            if echo "$output" | grep -q "$expected"; then
                echo -e "${GREEN}✅ PASS${NC}"
                TESTS_PASSED=$((TESTS_PASSED + 1))
                return 0
            else
                echo -e "${RED}❌ FAIL${NC} (expected: $expected)"
                echo "  Output: $output"
                TESTS_FAILED=$((TESTS_FAILED + 1))
                return 1
            fi
        else
            echo -e "${GREEN}✅ PASS${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            return 0
        fi
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Error: $output"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "📋 Test 1: Container Status"
echo "----------------------------"

# Test 1.1: Qdrant container running
test_command "Qdrant container is running" \
    "docker ps | grep qdrant" \
    "qdrant"

# Test 1.2: App container running
test_command "App container is running" \
    "docker ps | grep -E 'u8088g48|weavink'" \
    ""

echo ""
echo "📋 Test 2: Network Configuration"
echo "---------------------------------"

# Test 2.1: Qdrant on coolify network
test_command "Qdrant connected to coolify network" \
    "docker inspect qdrant-qkkkc8kskocgwo0o8c444cgo | grep -A 5 'coolify'" \
    "coolify"

# Test 2.2: Qdrant has two networks
QDRANT_NETWORKS=$(docker inspect qdrant-qkkkc8kskocgwo0o8c444cgo 2>/dev/null | jq -r '.[] | .NetworkSettings.Networks | keys | length' 2>/dev/null || echo "0")
if [ "$QDRANT_NETWORKS" -eq 2 ]; then
    echo -e "Testing: Qdrant has 2 networks... ${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "Testing: Qdrant has 2 networks... ${RED}❌ FAIL${NC} (found: $QDRANT_NETWORKS)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "📋 Test 3: Qdrant Connectivity"
echo "-------------------------------"

# Test 3.1: Health check from VPS host
test_command "Health check (direct IP)" \
    "curl -s --connect-timeout 3 http://10.0.4.2:6333/healthz" \
    "healthz check passed"

# Test 3.2: List collections
test_command "List collections API" \
    "curl -s --connect-timeout 3 http://10.0.4.2:6333/collections" \
    "collections"

echo ""
echo "📋 Test 4: Data Migration Verification"
echo "---------------------------------------"

# Test 4.1: Collection exists for user 1
test_command "Collection IFxPCgSA8NapEq5W8jh6yHrtJGJ2 exists" \
    "curl -s http://10.0.4.2:6333/collections/IFxPCgSA8NapEq5W8jh6yHrtJGJ2" \
    "points_count"

# Test 4.2: Verify vector count for user 1
VECTOR_COUNT_1=$(curl -s http://10.0.4.2:6333/collections/IFxPCgSA8NapEq5W8jh6yHrtJGJ2 2>/dev/null | jq -r '.result.points_count' 2>/dev/null || echo "0")
if [ "$VECTOR_COUNT_1" -eq 102 ]; then
    echo -e "Testing: User 1 has 102 vectors... ${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "Testing: User 1 has 102 vectors... ${RED}❌ FAIL${NC} (found: $VECTOR_COUNT_1)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 4.3: Collection exists for user 2
test_command "Collection ScmVq6p8ubQ9JFbniF2Vg5ocmbv2 exists" \
    "curl -s http://10.0.4.2:6333/collections/ScmVq6p8ubQ9JFbniF2Vg5ocmbv2" \
    "points_count"

# Test 4.4: Verify vector count for user 2
VECTOR_COUNT_2=$(curl -s http://10.0.4.2:6333/collections/ScmVq6p8ubQ9JFbniF2Vg5ocmbv2 2>/dev/null | jq -r '.result.points_count' 2>/dev/null || echo "0")
if [ "$VECTOR_COUNT_2" -eq 1 ]; then
    echo -e "Testing: User 2 has 1 vector... ${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "Testing: User 2 has 1 vector... ${RED}❌ FAIL${NC} (found: $VECTOR_COUNT_2)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 4.5: Total vector count
TOTAL_VECTORS=$((VECTOR_COUNT_1 + VECTOR_COUNT_2))
if [ "$TOTAL_VECTORS" -eq 103 ]; then
    echo -e "Testing: Total vectors = 103... ${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "Testing: Total vectors = 103... ${RED}❌ FAIL${NC} (found: $TOTAL_VECTORS)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "📋 Test 5: Container-to-Container Communication"
echo "------------------------------------------------"

# Get app container name
APP_CONTAINER=$(docker ps | grep -E 'u8088g48|weavink' | awk '{print $1}' | head -1)

if [ -n "$APP_CONTAINER" ]; then
    # Test 5.1: DNS resolution from app container
    test_command "DNS resolves qdrant hostname from app container" \
        "docker exec $APP_CONTAINER nslookup qdrant-qkkkc8kskocgwo0o8c444cgo 2>&1 | grep -v 'can.*resolve'" \
        "Name:"

    # Test 5.2: HTTP connectivity from app container
    test_command "HTTP request from app container to Qdrant" \
        "docker exec $APP_CONTAINER sh -c 'command -v curl >/dev/null 2>&1 && curl -s --connect-timeout 3 http://qdrant-qkkkc8kskocgwo0o8c444cgo:6333/healthz || echo \"curl not available\"'" \
        "healthz"
else
    echo -e "Testing: App container communication... ${YELLOW}⚠️  SKIP${NC} (app container not found)"
fi

echo ""
echo "📋 Test 6: Search Performance"
echo "------------------------------"

# Test 6.1: Measure search latency
START_TIME=$(date +%s%3N)
curl -s http://10.0.4.2:6333/collections >/dev/null 2>&1
END_TIME=$(date +%s%3N)
LATENCY=$((END_TIME - START_TIME))

echo -n "Testing: Collection list latency < 100ms... "
if [ "$LATENCY" -lt 100 ]; then
    echo -e "${GREEN}✅ PASS${NC} (${LATENCY}ms)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠️  SLOW${NC} (${LATENCY}ms)"
fi

echo ""
echo "📋 Test 7: Environment Configuration"
echo "-------------------------------------"

# Test 7.1: QDRANT_URL set in app container
if [ -n "$APP_CONTAINER" ]; then
    test_command "QDRANT_URL environment variable set" \
        "docker exec $APP_CONTAINER env | grep QDRANT_URL" \
        "QDRANT_URL"
else
    echo -e "Testing: QDRANT_URL environment... ${YELLOW}⚠️  SKIP${NC} (app container not found)"
fi

echo ""
echo "📋 Test 8: Resource Usage"
echo "--------------------------"

# Test 8.1: Qdrant memory usage
QDRANT_MEM=$(docker stats qdrant-qkkkc8kskocgwo0o8c444cgo --no-stream --format "{{.MemUsage}}" 2>/dev/null | awk '{print $1}' | sed 's/MiB//g' || echo "0")
echo -n "Testing: Qdrant memory usage... "
echo -e "${GREEN}ℹ️  INFO${NC} (${QDRANT_MEM}MB)"

# Test 8.2: Qdrant disk usage
QDRANT_DISK=$(docker exec qdrant-qkkkc8kskocgwo0o8c444cgo du -sh /qdrant/storage 2>/dev/null | awk '{print $1}' || echo "unknown")
echo -n "Testing: Qdrant disk usage... "
echo -e "${GREEN}ℹ️  INFO${NC} (${QDRANT_DISK})"

echo ""
echo "================================"
echo "📊 Test Summary"
echo "================================"
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Qdrant migration is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
