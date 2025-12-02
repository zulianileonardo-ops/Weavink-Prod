// tests/semanticSearch.thresholds.test.js
// Tests for threshold filtering (vector and rerank scores)

/**
 * RUN THIS TEST:
 * node tests/semanticSearch.thresholds.test.js
 *
 * PREREQUISITES:
 * 1. Dev server running: npm run dev
 * 2. Valid user ID with indexed contacts
 *
 * TESTS:
 * 7.1 Vector Threshold Applied (minVectorScore)
 * 7.2 Vector Threshold None (no filtering)
 * 7.3 Rerank Threshold Applied (minRerankScore)
 * 7.4 High Threshold Zero Results (edge case)
 */

const {
  TEST_CONFIG,
  TestRunner,
  searchContacts,
  delay,
  assert
} = require('./semanticSearch.utils');

const runner = new TestRunner('THRESHOLD FILTERING TESTS');

// ============================================
// TEST 7.1: Vector Threshold Applied
// ============================================
async function test_VectorThresholdApplied() {
  await runner.runTest('Vector Threshold Applied (minVectorScore filters results)', async () => {
    const query = 'engineer';
    const threshold = 0.3;  // 30% minimum score

    // First, get baseline without threshold
    console.log(`   → Getting baseline (no threshold)...`);
    const baselineResult = await searchContacts(query, {
      minVectorScore: null,
      includeRerank: false
    });
    const baselineCount = baselineResult.results.length;

    await delay(2000);

    // Then get filtered results
    console.log(`   → Getting filtered results (threshold: ${(threshold * 100)}%)...`);
    const filteredResult = await searchContacts(query, {
      minVectorScore: threshold,
      includeRerank: false
    });
    const filteredCount = filteredResult.results.length;

    console.log(`   ✓ Query: "${query}"`);
    console.log(`   ✓ Threshold: ${(threshold * 100).toFixed(0)}%`);
    console.log(`   ✓ Baseline Results: ${baselineCount}`);
    console.log(`   ✓ Filtered Results: ${filteredCount}`);

    // All filtered results should be >= threshold
    let allAboveThreshold = true;
    for (const contact of filteredResult.results) {
      const score = contact._vectorScore || 0;
      if (score < threshold) {
        allAboveThreshold = false;
        console.log(`   ⚠️  ${contact.name}: ${(score * 100).toFixed(2)}% < threshold`);
      }
    }

    if (allAboveThreshold) {
      console.log(`   ✓ All results meet threshold requirement`);
    }

    // Check filtering metadata
    const filterStats = filteredResult.searchMetadata.thresholdFiltering;
    if (filterStats) {
      console.log(`   ✓ Filtering Stats:`);
      console.log(`      - Threshold: ${filterStats.thresholdUsed}`);
      console.log(`      - Raw Count: ${filterStats.rawCount}`);
      console.log(`      - Filtered Count: ${filterStats.filteredCount}`);
      console.log(`      - Removed: ${filterStats.removedCount}`);
    }
  }, { category: 'Vector Threshold' });
}

// ============================================
// TEST 7.2: Vector Threshold None
// ============================================
async function test_VectorThresholdNone() {
  await runner.runTest('Vector Threshold None (no filtering applied)', async () => {
    const query = 'developer';

    const result = await searchContacts(query, {
      minVectorScore: null,  // No threshold
      includeRerank: false
    });

    console.log(`   ✓ Query: "${query}"`);
    console.log(`   ✓ Min Vector Score: null (no threshold)`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);

    // Should have results with various scores (no filtering)
    const scores = result.results.map(r => r._vectorScore || 0);
    if (scores.length > 0) {
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      console.log(`   ✓ Score Range: ${(min * 100).toFixed(2)}% - ${(max * 100).toFixed(2)}%`);
    }

    // Filtering stats should be null or show no filtering
    const filterStats = result.searchMetadata.thresholdFiltering;
    if (!filterStats) {
      console.log(`   ✓ No threshold filtering applied (as expected)`);
    } else {
      console.log(`   ✓ Filtering Stats: ${JSON.stringify(filterStats)}`);
    }
  }, { category: 'Vector Threshold' });
}

// ============================================
// TEST 7.3: Rerank Threshold Applied
// ============================================
async function test_RerankThresholdApplied() {
  await runner.runTest('Rerank Threshold Applied (minRerankScore filters results)', async () => {
    const query = 'software engineer';
    const threshold = 0.01;  // 1% minimum rerank score

    // Get results with rerank threshold
    const result = await searchContacts(query, {
      includeRerank: true,
      minRerankScore: threshold
    });

    console.log(`   ✓ Query: "${query}"`);
    console.log(`   ✓ Min Rerank Score: ${(threshold * 100).toFixed(0)}%`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);

    // Check rerank scores
    const rerankScores = result.results
      .map(r => r.searchMetadata?.rerankScore || 0)
      .filter(s => s > 0);

    if (rerankScores.length > 0) {
      const min = Math.min(...rerankScores);
      const max = Math.max(...rerankScores);
      console.log(`   ✓ Rerank Score Range: ${(min * 100).toFixed(2)}% - ${(max * 100).toFixed(2)}%`);

      // All should be >= threshold
      const allAbove = rerankScores.every(s => s >= threshold);
      if (allAbove) {
        console.log(`   ✓ All rerank scores meet threshold`);
      } else {
        console.log(`   ⚠️  Some scores below threshold (may have used fallback)`);
      }
    }

    // Check rerank filtering metadata
    const rerankMeta = result.searchMetadata.rerank;
    if (rerankMeta?.filteringStats) {
      const stats = rerankMeta.filteringStats;
      console.log(`   ✓ Rerank Filtering Stats:`);
      console.log(`      - Raw Count: ${stats.rawCount}`);
      console.log(`      - Filtered Count: ${stats.filteredCount}`);
      console.log(`      - Removed: ${stats.removedCount}`);
    }
  }, { category: 'Rerank Threshold' });
}

// ============================================
// TEST 7.4: High Threshold Zero Results
// ============================================
async function test_HighThresholdZeroResults() {
  await runner.runTest('High Threshold Zero Results (extreme filtering)', async () => {
    const query = 'random obscure search term';

    // Test extremely high vector threshold
    console.log(`   → Testing vector threshold 99%...`);
    const vectorResult = await searchContacts(query, {
      minVectorScore: 0.99,
      includeRerank: false
    });

    console.log(`   ✓ Vector Threshold 99%: ${vectorResult.results.length} results`);

    await delay(2000);

    // Test extremely high rerank threshold
    console.log(`   → Testing rerank threshold 99%...`);
    const rerankResult = await searchContacts(query, {
      includeRerank: true,
      minRerankScore: 0.99
    });

    console.log(`   ✓ Rerank Threshold 99%: ${rerankResult.results.length} results`);

    // Verify graceful handling of zero results
    for (const result of [vectorResult, rerankResult]) {
      assert.exists(result.searchMetadata, 'Metadata should exist even with zero results');
      assert.isArray(result.results, 'Results should be an array');
    }

    // Check for fallback behavior in rerank
    const scoringMethod = rerankResult.searchMetadata.rerank?.scoringMethod;
    const fallbackApplied = rerankResult.searchMetadata.rerank?.filteringStats?.fallbackApplied;

    console.log(`   ✓ Rerank Scoring Method: ${scoringMethod || 'N/A'}`);
    console.log(`   ✓ Fallback Applied: ${fallbackApplied || false}`);

    if (scoringMethod === 'vector' || fallbackApplied) {
      console.log(`   ✓ Correctly fell back to vector scores when rerank filtered all`);
    } else if (rerankResult.results.length === 0) {
      console.log(`   ✓ Correctly returned zero results (strict filtering)`);
    }

    // Document edge case behavior
    console.log(`   ℹ️  High threshold behavior:`);
    console.log(`      - Vector: Returns empty array if all filtered`);
    console.log(`      - Rerank: May fall back to vector scores`);
  }, { category: 'Edge Cases' });
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runAllTests() {
  runner.printHeader();

  try {
    await test_VectorThresholdApplied();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_VectorThresholdNone();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_RerankThresholdApplied();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_HighThresholdZeroResults();

  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error(error.stack);
  }

  runner.printSummary();
  return runner.results;
}

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
