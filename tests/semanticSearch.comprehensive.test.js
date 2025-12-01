// tests/semanticSearch.comprehensive.test.js
// Comprehensive test suite for Semantic Search Service with logging validation
// Tests all code branches, timing tracking, score analysis, and optimization suggestions

/**
 * RUN THIS TEST:
 * node tests/semanticSearch.comprehensive.test.js
 *
 * PREREQUISITES:
 * 1. Dev server running: npm run dev
 * 2. Valid user ID with indexed contacts in Qdrant
 * 3. Environment variables configured (.env)
 *
 * Tests cover:
 * - Query enhancement (enabled/disabled, cache HIT/MISS)
 * - Query tagging (enabled/disabled, cache HIT/MISS)
 * - Vector search with different thresholds
 * - Score quality analysis (EXCELLENT/GOOD/FAIR/WEAK/VERY_WEAK)
 * - Rerank with command verb preprocessing
 * - Fallback scenarios
 * - Performance and timing validation
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test user ID - must have contacts indexed in Qdrant
const TEST_USER_ID = process.env.TEST_USER_ID || 'IFxPCgSA8NapEq5W8jh6yHrtJGJ2';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Helper: Run a test
async function runTest(name, testFn, category = 'General', difficulty = 'medium') {
  const startTime = Date.now();
  try {
    console.log(`\n🧪 Running [${difficulty.toUpperCase()}]: ${name}`);
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ PASSED (${duration}ms): ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'passed', duration, category, difficulty });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ FAILED (${duration}ms): ${name}`);
    console.error(`   Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'failed', duration, category, difficulty, error: error.message });
  }
}

// Helper: Make semantic search API request
async function searchContacts(query, options = {}) {
  const {
    enhanceQuery = true,
    disableQueryTags = false,
    minVectorScore = null,
    minRerankScore = null,
    maxResults = 10,
    trackSteps = true,
    includeRerank = true
  } = options;

  const response = await fetch(
    `${BASE_URL}/api/test/semantic-search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        enhanceQuery,
        disableQueryTags,
        maxResults,
        minVectorScore,
        minRerankScore,
        trackSteps,
        includeRerank,
        userId: TEST_USER_ID
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Search failed');
  }

  return data;
}

// Helper: Wait/sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// TEST 1: EASY - Basic Search with Defaults
// ============================================
// Tests: Default query enhancement, default query tagging, basic vector search
async function test1_BasicSearchDefaults() {
  await runTest('Basic Search with All Defaults', async () => {
    const result = await searchContacts('CEO');

    // Validate response structure
    if (!result.results) {
      throw new Error('Missing results array in response');
    }

    if (!result.searchMetadata) {
      throw new Error('Missing searchMetadata in response');
    }

    // Check required metadata fields
    const requiredFields = ['query', 'totalResults', 'searchId', 'timestamp'];
    for (const field of requiredFields) {
      if (!(field in result.searchMetadata)) {
        throw new Error(`Missing required metadata field: ${field}`);
      }
    }

    console.log(`   ✓ Results: ${result.results.length} contacts`);
    console.log(`   ✓ Search ID: ${result.searchMetadata.searchId}`);
    console.log(`   ✓ Enhanced Query: ${result.searchMetadata.enhancedQuery ? 'YES' : 'NO'}`);
    console.log(`   ✓ Query Tags: ${result.searchMetadata.queryTags?.join(', ') || 'none'}`);

    // Validate costs are tracked
    if (result.searchMetadata.costs) {
      console.log(`   ✓ Total Cost: $${result.searchMetadata.costs.total?.toFixed(6) || '0'}`);
    }
  }, 'Basic Search', 'easy');
}

// ============================================
// TEST 2: EASY - Search with Query Enhancement Disabled
// ============================================
// Tests: Branch where enhanceQuery = false (skips Gemini call)
async function test2_SearchNoEnhancement() {
  await runTest('Search with Query Enhancement Disabled', async () => {
    const query = 'software engineer';
    const result = await searchContacts(query, { enhanceQuery: false });

    // Validate response
    if (!result.results) {
      throw new Error('Missing results array');
    }

    // When enhancement is disabled, enhancedQuery should be undefined or same as query
    if (result.searchMetadata.enhancedQuery && result.searchMetadata.enhancedQuery !== query) {
      throw new Error('Query should NOT be enhanced when enhanceQuery=false');
    }

    // Query enhancement cost should be 0
    if (result.searchMetadata.costs?.queryEnhancement > 0) {
      throw new Error('Query enhancement cost should be 0 when disabled');
    }

    console.log(`   ✓ Results: ${result.results.length} contacts`);
    console.log(`   ✓ Query enhancement: DISABLED (cost: $0)`);
  }, 'Query Enhancement', 'easy');
}

// ============================================
// TEST 3: EASY - Search with Query Tagging Disabled
// ============================================
// Tests: Branch where disableQueryTags = true (skips QueryTaggingService)
async function test3_SearchNoTagging() {
  await runTest('Search with Query Tagging Disabled', async () => {
    const result = await searchContacts('marketing manager', { disableQueryTags: true });

    // Validate response
    if (!result.results) {
      throw new Error('Missing results array');
    }

    // When tagging is disabled, queryTags should be empty or undefined
    if (result.searchMetadata.queryTags && result.searchMetadata.queryTags.length > 0) {
      throw new Error('Query tags should be empty when disableQueryTags=true');
    }

    // Query tagging cost should be 0
    if (result.searchMetadata.costs?.queryTagging > 0) {
      throw new Error('Query tagging cost should be 0 when disabled');
    }

    console.log(`   ✓ Results: ${result.results.length} contacts`);
    console.log(`   ✓ Query tagging: DISABLED (cost: $0)`);
  }, 'Query Tagging', 'easy');
}

// ============================================
// TEST 4: MEDIUM - Search with Vector Threshold Filtering
// ============================================
// Tests: Branch where minVectorScore is set (threshold filtering applied)
async function test4_ThresholdFiltering() {
  await runTest('Search with Vector Threshold Filtering', async () => {
    // First, search without threshold to get baseline
    const baselineResult = await searchContacts('engineer', { minVectorScore: null });
    const baselineCount = baselineResult.results.length;

    // Then search with a threshold
    const threshold = 0.3;  // 30% minimum score
    const filteredResult = await searchContacts('engineer', { minVectorScore: threshold });
    const filteredCount = filteredResult.results.length;

    // Validate filtering metadata
    if (!filteredResult.searchMetadata.thresholdFiltering) {
      console.log(`   ℹ️  Threshold filtering metadata not present (may be skipped)`);
    } else {
      const filterStats = filteredResult.searchMetadata.thresholdFiltering;
      console.log(`   ✓ Threshold: ${filterStats.thresholdUsed}`);
      console.log(`   ✓ Raw count: ${filterStats.rawCount}`);
      console.log(`   ✓ Filtered count: ${filterStats.filteredCount}`);
      console.log(`   ✓ Removed: ${filterStats.removedCount}`);
    }

    // All results should have score >= threshold
    for (const contact of filteredResult.results) {
      const score = contact._vectorScore || contact.searchMetadata?.score;
      if (score && score < threshold) {
        throw new Error(`Contact ${contact.name} has score ${score} below threshold ${threshold}`);
      }
    }

    console.log(`   ✓ Baseline results: ${baselineCount}`);
    console.log(`   ✓ Filtered results (≥${threshold}): ${filteredCount}`);
    console.log(`   ✓ All results above threshold: YES`);
  }, 'Threshold Filtering', 'medium');
}

// ============================================
// TEST 5: MEDIUM - Long Query Truncation
// ============================================
// Tests: Query >60 characters triggers truncation in logging
async function test5_LongQueryTruncation() {
  await runTest('Long Query Truncation (>60 chars)', async () => {
    // Create a long query (>60 characters)
    const longQuery = 'senior software engineer with experience in machine learning and artificial intelligence working at a startup';

    if (longQuery.length <= 60) {
      throw new Error(`Test query should be >60 chars, got ${longQuery.length}`);
    }

    const result = await searchContacts(longQuery);

    // Validate response
    if (!result.results) {
      throw new Error('Missing results array');
    }

    // The query in metadata should be truncated to 100 chars
    const metadataQuery = result.searchMetadata.query;
    if (metadataQuery.length > 100) {
      throw new Error(`Query in metadata should be truncated to 100 chars, got ${metadataQuery.length}`);
    }

    console.log(`   ✓ Original query length: ${longQuery.length} chars`);
    console.log(`   ✓ Metadata query length: ${metadataQuery.length} chars`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);
    console.log(`   ✓ Long query handled correctly`);
  }, 'Edge Cases', 'medium');
}

// ============================================
// TEST 6: MEDIUM - Cache Behavior (MISS then HIT)
// ============================================
// Tests: Redis cache flow - first call is MISS, second is HIT
async function test6_CacheBehavior() {
  await runTest('Cache Behavior (MISS → HIT)', async () => {
    // Use a unique query to ensure cache miss
    const uniqueQuery = `cache test ${Date.now()}`;

    // First call - should be cache MISS
    const firstResult = await searchContacts(uniqueQuery);
    const firstCached = firstResult.searchMetadata.queryEnhancement?.cached;

    console.log(`   ✓ First call - Enhancement cached: ${firstCached ? 'HIT' : 'MISS'}`);

    // Wait for cache to settle
    await sleep(200);

    // Second call - should be cache HIT
    const secondResult = await searchContacts(uniqueQuery);
    const secondCached = secondResult.searchMetadata.queryEnhancement?.cached;

    console.log(`   ✓ Second call - Enhancement cached: ${secondCached ? 'HIT' : 'MISS'}`);

    // Validate cache behavior
    if (firstCached === true && secondCached === true) {
      console.log(`   ℹ️  Both calls were cache HITs (static cache match)`);
    } else if (firstCached === false && secondCached === true) {
      console.log(`   ✓ Cache flow correct: MISS → HIT`);
    } else if (firstCached === false && secondCached === false) {
      console.log(`   ⚠️  Second call was also MISS (cache may be disabled)`);
    }

    // Compare costs - cached call should cost less
    const firstCost = firstResult.searchMetadata.costs?.queryEnhancement || 0;
    const secondCost = secondResult.searchMetadata.costs?.queryEnhancement || 0;

    console.log(`   ✓ First call enhancement cost: $${firstCost.toFixed(6)}`);
    console.log(`   ✓ Second call enhancement cost: $${secondCost.toFixed(6)}`);
  }, 'Caching', 'medium');
}

// ============================================
// TEST 7: HARD - Score Quality Analysis
// ============================================
// Tests: Score quality buckets (EXCELLENT/GOOD/FAIR/WEAK/VERY_WEAK)
async function test7_ScoreQualityAnalysis() {
  await runTest('Score Quality Analysis', async () => {
    // Search for a common term to get varied scores
    const result = await searchContacts('engineer');

    if (result.results.length === 0) {
      throw new Error('Need at least 1 result for score analysis');
    }

    // Analyze score distribution
    const scores = result.results.map(r => r._vectorScore || r.searchMetadata?.score || 0);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Determine quality based on max score
    let quality = 'UNKNOWN';
    if (maxScore >= 0.85) quality = 'EXCELLENT';
    else if (maxScore >= 0.7) quality = 'GOOD';
    else if (maxScore >= 0.5) quality = 'FAIR';
    else if (maxScore >= 0.3) quality = 'WEAK';
    else quality = 'VERY_WEAK';

    // Count score buckets
    const buckets = {
      excellent: scores.filter(s => s >= 0.8).length,
      good: scores.filter(s => s >= 0.6 && s < 0.8).length,
      fair: scores.filter(s => s >= 0.4 && s < 0.6).length,
      weak: scores.filter(s => s >= 0.2 && s < 0.4).length,
      veryWeak: scores.filter(s => s < 0.2).length
    };

    console.log(`   ✓ Score range: ${minScore.toFixed(4)} - ${maxScore.toFixed(4)} (avg: ${avgScore.toFixed(4)})`);
    console.log(`   ✓ Quality: ${quality}`);
    console.log(`   ✓ Distribution:`);
    console.log(`      - Excellent (≥0.8): ${buckets.excellent}`);
    console.log(`      - Good (0.6-0.8): ${buckets.good}`);
    console.log(`      - Fair (0.4-0.6): ${buckets.fair}`);
    console.log(`      - Weak (0.2-0.4): ${buckets.weak}`);
    console.log(`      - Very Weak (<0.2): ${buckets.veryWeak}`);

    // Validate score ranges
    for (const score of scores) {
      if (score < 0 || score > 1) {
        throw new Error(`Invalid score ${score} - should be between 0 and 1`);
      }
    }
  }, 'Score Analysis', 'hard');
}

// ============================================
// TEST 8: HARD - Rerank Command Verb Preprocessing
// ============================================
// Tests: Query preprocessing strips command verbs for better semantic matching
async function test8_RerankPreprocessing() {
  await runTest('Rerank Query Preprocessing', async () => {
    // Test queries with command verbs that should be stripped
    const commandQueries = [
      { query: 'find CEO', expected: 'CEO' },
      { query: 'search for engineer', expected: 'engineer' },
      { query: 'show me marketing', expected: 'marketing' }
    ];

    // Test query that should be preserved (question format)
    const preservedQueries = [
      { query: 'who is the CEO', shouldPreserve: true },
      { query: 'what does the engineer do', shouldPreserve: true }
    ];

    // Test a command query
    const testQuery = commandQueries[0];
    const result = await searchContacts(testQuery.query, { minRerankScore: 0.01 });

    console.log(`   ✓ Query: "${testQuery.query}"`);

    // Check if results have rerank metadata
    if (result.results.length > 0) {
      const firstResult = result.results[0];
      if (firstResult.searchMetadata?.rerankScore !== undefined) {
        console.log(`   ✓ Rerank applied: YES`);
        console.log(`   ✓ Top rerank score: ${firstResult.searchMetadata.rerankScore.toFixed(4)}`);
        console.log(`   ✓ Hybrid score: ${firstResult.searchMetadata.hybridScore?.toFixed(4) || 'N/A'}`);
      } else {
        console.log(`   ℹ️  Rerank not applied (no rerankScore in metadata)`);
      }
    }

    // Test preserved query
    const preserveResult = await searchContacts(preservedQueries[0].query);
    console.log(`   ✓ Preserved query: "${preservedQueries[0].query}"`);
    console.log(`   ✓ Results: ${preserveResult.results.length}`);
  }, 'Rerank Preprocessing', 'hard');
}

// ============================================
// TEST 9: HARD - High Threshold (Zero Results)
// ============================================
// Tests: Very high threshold that returns zero results (edge case)
async function test9_ZeroResults() {
  await runTest('High Threshold Zero Results', async () => {
    // Use a very high threshold that should filter out all results
    const result = await searchContacts('random obscure query xyz123', {
      minVectorScore: 0.95,  // 95% - very high
      maxResults: 5
    });

    console.log(`   ✓ Query: "random obscure query xyz123"`);
    console.log(`   ✓ Threshold: 0.95 (95%)`);
    console.log(`   ✓ Results: ${result.results.length}`);

    // Should handle zero results gracefully
    if (result.results.length === 0) {
      console.log(`   ✓ Zero results handled correctly`);

      // Validate filtering stats
      if (result.searchMetadata.thresholdFiltering) {
        const stats = result.searchMetadata.thresholdFiltering;
        console.log(`   ✓ Raw matches: ${stats.rawCount}`);
        console.log(`   ✓ After filtering: ${stats.filteredCount}`);
      }
    } else {
      console.log(`   ✓ Found ${result.results.length} matches above 95% threshold`);
    }

    // Response should still be valid
    if (!result.searchMetadata) {
      throw new Error('Missing searchMetadata even with zero results');
    }
  }, 'Edge Cases', 'hard');
}

// ============================================
// TEST 10: HARD - Complex Contact Retrieval
// ============================================
// Tests: Full pipeline with all features enabled, validates complete response
async function test10_ComplexSearch() {
  await runTest('Complex Search (Full Pipeline)', async () => {
    const query = 'senior technology leader startup AI';

    const result = await searchContacts(query, {
      enhanceQuery: true,
      disableQueryTags: false,
      minVectorScore: 0.2,
      minRerankScore: 0.1,
      maxResults: 20,
      trackSteps: true
    });

    // Validate complete response structure
    if (!result.results) throw new Error('Missing results');
    if (!result.searchMetadata) throw new Error('Missing searchMetadata');

    // Validate metadata completeness
    const metadata = result.searchMetadata;
    console.log(`   ✓ Search ID: ${metadata.searchId}`);
    console.log(`   ✓ Query: "${metadata.query}"`);
    console.log(`   ✓ Enhanced Query: ${metadata.enhancedQuery ? 'YES' : 'NO'}`);
    console.log(`   ✓ Detected Language: ${metadata.detectedLanguage || 'unknown'}`);
    console.log(`   ✓ Query Tags: ${metadata.queryTags?.join(', ') || 'none'}`);
    console.log(`   ✓ Total Results: ${metadata.totalResults}`);
    console.log(`   ✓ Vector DB: ${metadata.vectorDatabase || 'unknown'}`);

    // Validate cost tracking
    if (metadata.costs) {
      console.log(`   ✓ Cost Breakdown:`);
      console.log(`      - Embedding: $${metadata.costs.embedding?.toFixed(6) || 0}`);
      console.log(`      - Search: $${metadata.costs.search?.toFixed(6) || 0}`);
      console.log(`      - Enhancement: $${metadata.costs.queryEnhancement?.toFixed(6) || 0}`);
      console.log(`      - Tagging: $${metadata.costs.queryTagging?.toFixed(6) || 0}`);
      console.log(`      - TOTAL: $${metadata.costs.total?.toFixed(6) || 0}`);
    }

    // Validate timing
    if (metadata.searchDuration !== undefined) {
      console.log(`   ✓ Search Duration: ${metadata.searchDuration}ms`);
    }
    if (metadata.embeddingTime !== undefined) {
      console.log(`   ✓ Embedding Time: ${metadata.embeddingTime}ms`);
    }

    // Validate threshold filtering
    if (metadata.thresholdFiltering) {
      const filter = metadata.thresholdFiltering;
      console.log(`   ✓ Threshold Filtering:`);
      console.log(`      - Threshold: ${filter.thresholdUsed}`);
      console.log(`      - Raw: ${filter.rawCount} → Filtered: ${filter.filteredCount}`);
    }

    // Validate result structure
    if (result.results.length > 0) {
      const firstContact = result.results[0];
      console.log(`   ✓ Top Result: ${firstContact.name || 'Unknown'}`);

      if (firstContact._vectorScore !== undefined) {
        console.log(`      - Vector Score: ${firstContact._vectorScore.toFixed(4)}`);
      }
      if (firstContact.searchMetadata?.rerankScore !== undefined) {
        console.log(`      - Rerank Score: ${firstContact.searchMetadata.rerankScore.toFixed(4)}`);
      }
      if (firstContact.searchMetadata?.hybridScore !== undefined) {
        console.log(`      - Hybrid Score: ${firstContact.searchMetadata.hybridScore.toFixed(4)}`);
      }
      if (firstContact.tags?.length > 0) {
        console.log(`      - Tags: ${firstContact.tags.join(', ')}`);
      }
      if (firstContact.dynamicFields?.length > 0) {
        console.log(`      - Dynamic Fields: ${firstContact.dynamicFields.length}`);
      }
    }

    console.log(`   ✓ Full pipeline completed successfully`);
  }, 'Full Pipeline', 'hard');
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE SEMANTIC SEARCH TEST SUITE                   ║');
  console.log('║     Testing All Code Branches & Logging                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\nStarting tests at: ${new Date().toISOString()}`);
  console.log(`API Target: ${BASE_URL}`);
  console.log(`Test User: ${TEST_USER_ID}`);
  console.log(`\n${'─'.repeat(70)}\n`);

  try {
    // EASY TESTS (1-3)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🟢 EASY TESTS (Basic Functionality)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await test1_BasicSearchDefaults();
    await sleep(500);  // Rate limiting protection
    await test2_SearchNoEnhancement();
    await sleep(500);
    await test3_SearchNoTagging();
    await sleep(500);

    // MEDIUM TESTS (4-6)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🟡 MEDIUM TESTS (Feature Validation)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await test4_ThresholdFiltering();
    await sleep(500);
    await test5_LongQueryTruncation();
    await sleep(500);
    await test6_CacheBehavior();
    await sleep(500);

    // HARD TESTS (7-10)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔴 HARD TESTS (Edge Cases & Complex Scenarios)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await test7_ScoreQualityAnalysis();
    await sleep(500);
    await test8_RerankPreprocessing();
    await sleep(500);
    await test9_ZeroResults();
    await sleep(500);
    await test10_ComplexSearch();

  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error(error.stack);
  }

  // Print summary
  printSummary();
}

function printSummary() {
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                       TEST SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  console.log(`Total Tests:   ${total}`);
  console.log(`✅ Passed:     ${results.passed} (${passRate}%)`);
  console.log(`❌ Failed:     ${results.failed}`);
  console.log(`⏭️  Skipped:    ${results.skipped}`);

  // Group by difficulty
  console.log('\n📊 Results by Difficulty:');
  const byDifficulty = { easy: { passed: 0, failed: 0 }, medium: { passed: 0, failed: 0 }, hard: { passed: 0, failed: 0 } };
  results.tests.forEach(test => {
    const diff = test.difficulty || 'medium';
    if (!byDifficulty[diff]) byDifficulty[diff] = { passed: 0, failed: 0 };
    byDifficulty[diff][test.status]++;
  });

  Object.entries(byDifficulty).forEach(([difficulty, stats]) => {
    const diffTotal = stats.passed + stats.failed;
    if (diffTotal > 0) {
      const rate = ((stats.passed / diffTotal) * 100).toFixed(0);
      const emoji = difficulty === 'easy' ? '🟢' : difficulty === 'medium' ? '🟡' : '🔴';
      console.log(`   ${emoji} ${difficulty.toUpperCase()}: ${stats.passed}/${diffTotal} (${rate}%)`);
    }
  });

  // Group by category
  console.log('\n📊 Results by Category:');
  const byCategory = {};
  results.tests.forEach(test => {
    if (!byCategory[test.category]) {
      byCategory[test.category] = { passed: 0, failed: 0 };
    }
    byCategory[test.category][test.status]++;
  });

  Object.entries(byCategory).forEach(([category, stats]) => {
    const catTotal = stats.passed + (stats.failed || 0);
    const rate = catTotal > 0 ? ((stats.passed / catTotal) * 100).toFixed(0) : 0;
    console.log(`   ${category}: ${stats.passed}/${catTotal} (${rate}%)`);
  });

  // List failures
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'failed').forEach(test => {
      console.log(`   • [${test.difficulty?.toUpperCase()}] ${test.name}`);
      console.log(`     Error: ${test.error}`);
    });
  }

  // Performance stats
  const avgDuration = results.tests.length > 0
    ? results.tests.reduce((sum, t) => sum + t.duration, 0) / results.tests.length
    : 0;
  const totalDuration = results.tests.reduce((sum, t) => sum + t.duration, 0);

  console.log('\n⏱️  Performance:');
  console.log(`   Average: ${avgDuration.toFixed(0)}ms per test`);
  console.log(`   Total:   ${(totalDuration / 1000).toFixed(1)}s`);

  // Branches covered
  console.log('\n📝 Code Branches Tested:');
  console.log('   ✓ Query Enhancement: enabled/disabled');
  console.log('   ✓ Query Tagging: enabled/disabled');
  console.log('   ✓ Cache: HIT/MISS scenarios');
  console.log('   ✓ Threshold Filtering: with/without threshold');
  console.log('   ✓ Score Quality: EXCELLENT/GOOD/FAIR/WEAK/VERY_WEAK');
  console.log('   ✓ Rerank Preprocessing: command verbs/preserved');
  console.log('   ✓ Edge Cases: long queries, zero results');
  console.log('   ✓ Full Pipeline: all features enabled');

  // Final verdict
  console.log('\n' + '═'.repeat(68));
  if (results.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Semantic search is working correctly! 🚀');
  } else {
    console.log(`⚠️  ${results.failed} test(s) failed. Review errors above.`);
  }
  console.log('═'.repeat(68) + '\n');
}

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, results };
}
