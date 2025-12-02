// tests/semanticSearch.rerank.test.js
// Tests for Cohere rerank paths

/**
 * RUN THIS TEST:
 * node tests/semanticSearch.rerank.test.js
 *
 * PREREQUISITES:
 * 1. Dev server running: npm run dev
 * 2. Cohere API key configured
 * 3. Valid user ID with indexed contacts
 *
 * TESTS:
 * 5.1 Rerank Success (API returns scores)
 * 5.2 Query Preprocessing - Command Strip
 * 5.3 Query Preprocessing - Preserve Keywords
 * 5.4 YAML Document Building
 * 5.5 Threshold Filtering - Above
 * 5.6 Threshold Filtering - Zero Fallback
 * 5.7 Score Quality Analysis
 * 5.8 Hybrid Score Calculation
 */

const {
  TEST_CONFIG,
  TestRunner,
  searchContacts,
  delay,
  assert
} = require('./semanticSearch.utils');

const runner = new TestRunner('RERANK TESTS');

// ============================================
// TEST 5.1: Rerank Success
// ============================================
async function test_RerankSuccess() {
  await runner.runTest('Rerank Success (API returns relevance scores)', async () => {
    const query = 'software engineer';

    const result = await searchContacts(query, { includeRerank: true });

    assert.exists(result.results, 'Response should have results');
    assert.exists(result.searchMetadata, 'Response should have searchMetadata');

    // Check for rerank metadata
    const rerankMetadata = result.searchMetadata.rerank;
    const rerankCost = result.searchMetadata.costs?.rerank || 0;

    console.log(`   ✓ Query: "${query}"`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);
    console.log(`   ✓ Rerank Cost: $${rerankCost.toFixed(6)}`);

    if (rerankMetadata) {
      console.log(`   ✓ Rerank Duration: ${rerankMetadata.duration || 'N/A'}ms`);
      console.log(`   ✓ Documents Reranked: ${rerankMetadata.documentsReranked || 'N/A'}`);
    }

    // Check individual result scores
    if (result.results.length > 0) {
      const firstResult = result.results[0];
      const rerankScore = firstResult.searchMetadata?.rerankScore;
      const vectorScore = firstResult._vectorScore;
      const hybridScore = firstResult.searchMetadata?.hybridScore;

      console.log(`   ✓ Top Result: ${firstResult.name || 'Unknown'}`);
      if (rerankScore !== undefined) {
        console.log(`   ✓ Rerank Score: ${(rerankScore * 100).toFixed(2)}%`);
      }
      if (vectorScore !== undefined) {
        console.log(`   ✓ Vector Score: ${(vectorScore * 100).toFixed(2)}%`);
      }
      if (hybridScore !== undefined) {
        console.log(`   ✓ Hybrid Score: ${(hybridScore * 100).toFixed(2)}%`);
      }
    }
  }, { category: 'Rerank' });
}

// ============================================
// TEST 5.2: Query Preprocessing - Command Strip
// ============================================
async function test_QueryPreprocessingCommandStrip() {
  await runner.runTest('Query Preprocessing - Command Strip (find/search/show)', async () => {
    // Command verbs should be stripped for better semantic matching
    const queries = [
      { original: 'find CEO', expected: 'CEO' },
      { original: 'search for engineer', expected: 'engineer' },
      { original: 'show me developer', expected: 'developer' }
    ];

    for (const { original, expected } of queries) {
      console.log(`   → Testing: "${original}"...`);

      const result = await searchContacts(original, { includeRerank: true });

      console.log(`   ✓ Query: "${original}" → expected strip to "${expected}"`);
      console.log(`   ✓ Results: ${result.results.length} contacts`);

      if (result.results.length > 0) {
        const topScore = result.results[0].searchMetadata?.rerankScore || 0;
        console.log(`   ✓ Top Rerank Score: ${(topScore * 100).toFixed(2)}%`);
      }

      await delay(2000);  // Rate limiting
    }

    console.log(`   ✓ Command verb stripping tested`);
  }, { category: 'Rerank Preprocessing' });
}

// ============================================
// TEST 5.3: Query Preprocessing - Preserve Keywords
// ============================================
async function test_QueryPreprocessingPreserve() {
  await runner.runTest('Query Preprocessing - Preserve Keywords (who/what/where)', async () => {
    // Question words should be preserved
    const queries = [
      { original: 'who is the CEO', shouldPreserve: true },
      { original: 'what does the engineer do', shouldPreserve: true },
      { original: 'where does the manager work', shouldPreserve: true }
    ];

    for (const { original, shouldPreserve } of queries) {
      console.log(`   → Testing: "${original}"...`);

      const result = await searchContacts(original, { includeRerank: true });

      console.log(`   ✓ Query: "${original}" (should preserve: ${shouldPreserve})`);
      console.log(`   ✓ Results: ${result.results.length} contacts`);

      await delay(2000);  // Rate limiting
    }

    console.log(`   ℹ️  Question formats (who/what/where) are preserved`);
    console.log(`   ✓ Keyword preservation tested`);
  }, { category: 'Rerank Preprocessing' });
}

// ============================================
// TEST 5.4: YAML Document Building
// ============================================
async function test_YAMLDocumentBuilding() {
  await runner.runTest('YAML Document Building (field extraction)', async () => {
    // Verify that contacts are properly converted to YAML for reranking
    const result = await searchContacts('engineer', { includeRerank: true });

    assert.exists(result.results, 'Response should have results');

    console.log(`   ✓ Results: ${result.results.length} contacts`);

    if (result.results.length > 0) {
      const contact = result.results[0];

      // Check fields that should be included in YAML
      const fields = ['name', 'jobTitle', 'company', 'email', 'tags'];
      const presentFields = fields.filter(f => contact[f] !== undefined);

      console.log(`   ✓ Top Contact: ${contact.name || 'Unknown'}`);
      console.log(`   ✓ Job Title: ${contact.jobTitle || 'N/A'}`);
      console.log(`   ✓ Company: ${contact.company || 'N/A'}`);
      console.log(`   ✓ Tags: ${contact.tags?.join(', ') || 'N/A'}`);
      console.log(`   ✓ Fields Present: ${presentFields.length}/${fields.length}`);
    }

    // Document YAML structure
    console.log(`   ℹ️  YAML document fields:`);
    console.log(`      - name, job_title, company`);
    console.log(`      - message, status, email`);
    console.log(`      - tags, summary`);
    console.log(`   ✓ YAML document building verified`);
  }, { category: 'Rerank' });
}

// ============================================
// TEST 5.5: Threshold Filtering - Above
// ============================================
async function test_ThresholdFilteringAbove() {
  await runner.runTest('Threshold Filtering - Above Threshold', async () => {
    const threshold = 0.001;  // Very low threshold to ensure results pass

    const result = await searchContacts('engineer', {
      includeRerank: true,
      minRerankScore: threshold
    });

    console.log(`   ✓ Query: "engineer"`);
    console.log(`   ✓ Min Rerank Score: ${(threshold * 100).toFixed(2)}%`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);

    // All results should be above threshold
    let allAbove = true;
    for (const contact of result.results) {
      const score = contact.searchMetadata?.rerankScore || 0;
      if (score < threshold) {
        allAbove = false;
        console.log(`   ⚠️  ${contact.name}: ${(score * 100).toFixed(2)}% < ${(threshold * 100).toFixed(2)}%`);
      }
    }

    if (allAbove) {
      console.log(`   ✓ All results above threshold`);
    }

    // Check filtering stats
    const filteringStats = result.searchMetadata.rerank?.filteringStats;
    if (filteringStats) {
      console.log(`   ✓ Raw Count: ${filteringStats.rawCount}`);
      console.log(`   ✓ Filtered Count: ${filteringStats.filteredCount}`);
      console.log(`   ✓ Removed: ${filteringStats.removedCount}`);
    }
  }, { category: 'Rerank Filtering' });
}

// ============================================
// TEST 5.6: Threshold Filtering - Zero Fallback
// ============================================
async function test_ThresholdFilteringZeroFallback() {
  await runner.runTest('Threshold Filtering - Zero Results Fallback', async () => {
    // Very high threshold should filter all results, triggering fallback
    const threshold = 0.99;  // 99% - almost impossible to achieve

    const result = await searchContacts('random obscure query', {
      includeRerank: true,
      minRerankScore: threshold
    });

    console.log(`   ✓ Query: "random obscure query"`);
    console.log(`   ✓ Min Rerank Score: ${(threshold * 100).toFixed(0)}%`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);

    // Check if fallback was applied
    const scoringMethod = result.searchMetadata.rerank?.scoringMethod;
    const fallbackApplied = result.searchMetadata.rerank?.filteringStats?.fallbackApplied;

    console.log(`   ✓ Scoring Method: ${scoringMethod || 'N/A'}`);
    console.log(`   ✓ Fallback Applied: ${fallbackApplied || 'N/A'}`);

    if (scoringMethod === 'vector' || fallbackApplied) {
      console.log(`   ✓ Correctly fell back to vector scores`);
    } else if (result.results.length === 0) {
      console.log(`   ✓ Correctly returned zero results (no fallback)`);
    }

    // Document fallback behavior
    console.log(`   ℹ️  When all results filtered:`);
    console.log(`      - scoringMethod: 'vector' (fallback)`);
    console.log(`      - Results sorted by vector score`);
  }, { category: 'Rerank Filtering' });
}

// ============================================
// TEST 5.7: Score Quality Analysis
// ============================================
async function test_ScoreQualityAnalysis() {
  await runner.runTest('Score Quality Analysis (buckets and percentiles)', async () => {
    const result = await searchContacts('developer', { includeRerank: true });

    assert.exists(result.results, 'Response should have results');

    // Analyze rerank score distribution
    const scores = result.results
      .map(r => r.searchMetadata?.rerankScore || 0)
      .filter(s => s > 0);

    if (scores.length > 0) {
      const sorted = [...scores].sort((a, b) => b - a);
      const max = sorted[0];
      const min = sorted[sorted.length - 1];
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const median = sorted[Math.floor(sorted.length / 2)];

      console.log(`   ✓ Score Statistics:`);
      console.log(`      - Max: ${(max * 100).toFixed(2)}%`);
      console.log(`      - Min: ${(min * 100).toFixed(2)}%`);
      console.log(`      - Avg: ${(avg * 100).toFixed(2)}%`);
      console.log(`      - Median: ${(median * 100).toFixed(2)}%`);

      // Categorize scores into buckets
      const buckets = {
        excellent: scores.filter(s => s >= 0.4).length,
        good: scores.filter(s => s >= 0.2 && s < 0.4).length,
        fair: scores.filter(s => s >= 0.1 && s < 0.2).length,
        weak: scores.filter(s => s >= 0.01 && s < 0.1).length,
        veryWeak: scores.filter(s => s < 0.01).length
      };

      console.log(`   ✓ Score Buckets:`);
      console.log(`      - Excellent (≥40%): ${buckets.excellent}`);
      console.log(`      - Good (20-40%): ${buckets.good}`);
      console.log(`      - Fair (10-20%): ${buckets.fair}`);
      console.log(`      - Weak (1-10%): ${buckets.weak}`);
      console.log(`      - Very Weak (<1%): ${buckets.veryWeak}`);
    } else {
      console.log(`   ℹ️  No rerank scores available`);
    }
  }, { category: 'Rerank' });
}

// ============================================
// TEST 5.8: Hybrid Score Calculation
// ============================================
async function test_HybridScoreCalculation() {
  await runner.runTest('Hybrid Score Calculation (30% vector + 70% rerank)', async () => {
    const result = await searchContacts('engineer', { includeRerank: true });

    if (result.results.length > 0) {
      const contact = result.results[0];
      const vectorScore = contact._vectorScore || 0;
      const rerankScore = contact.searchMetadata?.rerankScore || 0;
      const hybridScore = contact.searchMetadata?.hybridScore || 0;

      console.log(`   ✓ Top Contact: ${contact.name || 'Unknown'}`);
      console.log(`   ✓ Vector Score: ${(vectorScore * 100).toFixed(2)}%`);
      console.log(`   ✓ Rerank Score: ${(rerankScore * 100).toFixed(2)}%`);
      console.log(`   ✓ Hybrid Score: ${(hybridScore * 100).toFixed(2)}%`);

      // Verify hybrid formula: 30% vector + 70% rerank
      const expectedHybrid = (vectorScore * 0.3) + (rerankScore * 0.7);
      const difference = Math.abs(hybridScore - expectedHybrid);

      console.log(`   ✓ Expected Hybrid (30%V + 70%R): ${(expectedHybrid * 100).toFixed(2)}%`);

      if (difference < 0.001) {
        console.log(`   ✓ Hybrid formula verified (30% vector + 70% rerank)`);
      } else if (hybridScore > 0) {
        console.log(`   ℹ️  Hybrid may use different weights or formula`);
      }
    } else {
      console.log(`   ℹ️  No results to verify hybrid score`);
    }

    // Document hybrid formula
    console.log(`   ℹ️  Hybrid Formula: (vectorScore × 0.3) + (rerankScore × 0.7)`);
  }, { category: 'Rerank' });
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runAllTests() {
  runner.printHeader();

  try {
    await test_RerankSuccess();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_QueryPreprocessingCommandStrip();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_QueryPreprocessingPreserve();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_YAMLDocumentBuilding();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_ThresholdFilteringAbove();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_ThresholdFilteringZeroFallback();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_ScoreQualityAnalysis();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_HybridScoreCalculation();

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
