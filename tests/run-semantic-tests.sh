#!/bin/bash
# tests/run-semantic-tests.sh
# Run all semantic search test files with delays to avoid rate limiting

set -e  # Exit on error

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     SEMANTIC SEARCH TEST SUITE RUNNER                         ║"
echo "║     Running all test files with rate limiting delays          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Started at: $(date)"
echo ""

# Test file order (least to most API-intensive)
TEST_FILES=(
  "staticCache"
  "thresholds"
  "vectorSearch"
  "redisCache"
  "gemini"
  "embedding"
  "rerank"
  "costTracking"
  "errorHandling"
  "integration"
)

# Delay between test files (seconds)
INTER_FILE_DELAY=15

# Results tracking
TOTAL_PASSED=0
TOTAL_FAILED=0
RESULTS=()

cd "$(dirname "$0")/.." || exit 1

echo "Working directory: $(pwd)"
echo ""

# Check if dev server is running
echo "Checking dev server..."
if curl -s "http://localhost:3000" > /dev/null 2>&1; then
  echo "✅ Dev server is running"
else
  echo "⚠️  Dev server may not be running at localhost:3000"
  echo "   Make sure to run 'npm run dev' in another terminal"
fi
echo ""

# Run each test file
for test in "${TEST_FILES[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Running: semanticSearch.$test.test.js"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Run test and capture output
  if node "tests/semanticSearch.$test.test.js"; then
    RESULTS+=("✅ $test: PASSED")
    ((TOTAL_PASSED++)) || true
  else
    RESULTS+=("❌ $test: FAILED")
    ((TOTAL_FAILED++)) || true
  fi

  echo ""

  # Don't wait after the last test
  if [ "$test" != "${TEST_FILES[-1]}" ]; then
    echo "⏳ Waiting ${INTER_FILE_DELAY}s before next test file (rate limiting)..."
    sleep $INTER_FILE_DELAY
    echo ""
  fi
done

# Print summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    OVERALL SUMMARY                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Finished at: $(date)"
echo ""

for result in "${RESULTS[@]}"; do
  echo "   $result"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total: $TOTAL_PASSED passed, $TOTAL_FAILED failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $TOTAL_FAILED -eq 0 ]; then
  echo "🎉 ALL TEST SUITES PASSED!"
  exit 0
else
  echo "⚠️  Some test suites failed. Review output above."
  exit 1
fi
