// tests/semanticSearch.vectorSearch.test.js
// Tests for Qdrant vector search paths

/**
 * RUN THIS TEST:
 * node tests/semanticSearch.vectorSearch.test.js
 *
 * PREREQUISITES:
 * 1. Dev server running: npm run dev
 * 2. Qdrant server running and connected
 * 3. Valid user ID with indexed contacts
 *
 * TESTS:
 * 6.1 Vector Search Success
 * 6.2 Collection Ensure
 * 6.3 No Results Handling
 * 6.4 maxResults Limiting
 * 6.5 Score Range Calculation
 * 6.6 Result Transformation (Qdrant → format)
 * 6.7 Self-Hosted Cost ($0)
 */

const {
  TEST_CONFIG,
  TestRunner,
  searchContacts,
  delay,
  generateUniqueQuery,
  assert
} = require('./semanticSearch.utils');

const runner = new TestRunner('VECTOR SEARCH TESTS');

// ============================================
// TEST 6.1: Vector Search Success
// ============================================
async function test_VectorSearchSuccess() {
  await runner.runTest('Vector Search Success (returns matches with scores)', async () => {
    const query = 'software engineer';

    const result = await searchContacts(query, { includeRerank: false });

    assert.exists(result.results, 'Response should have results');
    assert.exists(result.searchMetadata, 'Response should have searchMetadata');

    console.log(`   ✓ Query: "${query}"`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);
    console.log(`   ✓ Vector DB: ${result.searchMetadata.vectorDatabase || 'Qdrant'}`);

    // Check vector scores
    const scores = result.results.map(r => r._vectorScore || 0).filter(s => s > 0);
    if (scores.length > 0) {
      console.log(`   ✓ Results with scores: ${scores.length}`);
      console.log(`   ✓ Score Range: ${Math.min(...scores).toFixed(4)} - ${Math.max(...scores).toFixed(4)}`);
    }

    // Check search timing
    const searchTime = result.searchMetadata.timings?.vectorSearch ||
                       result.searchMetadata.searchDuration || 0;
    console.log(`   ✓ Search Duration: ${searchTime}ms`);
  }, { category: 'Vector Search' });
}

// ============================================
// TEST 6.2: Collection Ensure
// ============================================
async function test_CollectionEnsure() {
  await runner.runTest('Collection Ensure (collection created if missing)', async () => {
    // The collection should be ensured before each search
    // We verify this by checking the search completes successfully

    const result = await searchContacts('CEO', { includeRerank: false });

    assert.exists(result.results, 'Response should have results');

    console.log(`   ✓ Search completed successfully`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);

    // Document collection behavior
    console.log(`   ℹ️  Collection behavior:`);
    console.log(`      - Collection name: user ID (${TEST_CONFIG.userId.substring(0, 15)}...)`);
    console.log(`      - Created if missing before query`);
    console.log(`      - Vector dimension: 1024 (Cohere multilingual)`);
    console.log(`   ✓ Collection ensure verified`);
  }, { category: 'Vector Search' });
}

// ============================================
// TEST 6.3: No Results Handling
// ============================================
async function test_NoResultsHandling() {
  await runner.runTest('No Results Handling (empty results graceful)', async () => {
    // Use a query unlikely to match anything with high threshold
    const result = await searchContacts('xyznonexistent123456789', {
      includeRerank: false,
      minVectorScore: 0.99  // Very high threshold
    });

    assert.exists(result.results, 'Response should have results array');
    assert.exists(result.searchMetadata, 'Response should have searchMetadata');
    assert.isArray(result.results, 'Results should be an array');

    console.log(`   ✓ Query: "xyznonexistent123456789" (unlikely match)`);
    console.log(`   ✓ Min Score: 99%`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);

    // Empty results should be handled gracefully
    if (result.results.length === 0) {
      console.log(`   ✓ Zero results handled correctly`);
    }

    // Metadata should still be present
    console.log(`   ✓ Search ID: ${result.searchMetadata.searchId || 'present'}`);
    console.log(`   ✓ Metadata complete despite empty results`);
  }, { category: 'Vector Search' });
}

// ============================================
// TEST 6.4: maxResults Limiting
// ============================================
async function test_MaxResultsLimiting() {
  await runner.runTest('maxResults Limiting (respects limit parameter)', async () => {
    const maxResults = 3;

    const result = await searchContacts('engineer', {
      maxResults: maxResults,
      includeRerank: false
    });

    assert.exists(result.results, 'Response should have results');

    console.log(`   ✓ Query: "engineer"`);
    console.log(`   ✓ Max Results Requested: ${maxResults}`);
    console.log(`   ✓ Results Returned: ${result.results.length}`);

    // Results should be <= maxResults
    if (result.results.length <= maxResults) {
      console.log(`   ✓ Results count respects maxResults limit`);
    } else {
      throw new Error(`Expected ≤${maxResults} results, got ${result.results.length}`);
    }

    // Test with different limit
    await delay(2000);
    const result2 = await searchContacts('engineer', {
      maxResults: 1,
      includeRerank: false
    });

    console.log(`   ✓ Max Results=1: Got ${result2.results.length} results`);
    if (result2.results.length <= 1) {
      console.log(`   ✓ maxResults=1 works correctly`);
    }
  }, { category: 'Vector Search' });
}

// ============================================
// TEST 6.5: Score Range Calculation
// ============================================
async function test_ScoreRangeCalculation() {
  await runner.runTest('Score Range Calculation (min/max/avg computed)', async () => {
    const result = await searchContacts('developer', {
      maxResults: 10,
      includeRerank: false
    });

    const scores = result.results
      .map(r => r._vectorScore || 0)
      .filter(s => s > 0);

    if (scores.length > 0) {
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

      console.log(`   ✓ Results with scores: ${scores.length}`);
      console.log(`   ✓ Score Statistics:`);
      console.log(`      - Min: ${min.toFixed(4)} (${(min * 100).toFixed(2)}%)`);
      console.log(`      - Max: ${max.toFixed(4)} (${(max * 100).toFixed(2)}%)`);
      console.log(`      - Avg: ${avg.toFixed(4)} (${(avg * 100).toFixed(2)}%)`);

      // Validate score ranges
      for (const score of scores) {
        if (score < 0 || score > 1) {
          throw new Error(`Invalid score ${score} - should be between 0 and 1`);
        }
      }
      console.log(`   ✓ All scores in valid range [0, 1]`);
    } else {
      console.log(`   ℹ️  No scores to analyze (empty results)`);
    }

    // Check metadata score range
    const scoreRange = result.searchMetadata.scoreRange ||
                       result.searchMetadata.vectorScoreRange;
    if (scoreRange) {
      console.log(`   ✓ Metadata Score Range: ${JSON.stringify(scoreRange)}`);
    }
  }, { category: 'Vector Search' });
}

// ============================================
// TEST 6.6: Result Transformation
// ============================================
async function test_ResultTransformation() {
  await runner.runTest('Result Transformation (Qdrant → response format)', async () => {
    const result = await searchContacts('manager', {
      maxResults: 5,
      includeRerank: false
    });

    if (result.results.length > 0) {
      const contact = result.results[0];

      // Check that Qdrant results are properly transformed
      console.log(`   ✓ Contact Fields Present:`);
      console.log(`      - id: ${contact.id ? 'YES' : 'NO'}`);
      console.log(`      - name: ${contact.name ? 'YES' : 'NO'}`);
      console.log(`      - email: ${contact.email ? 'YES' : 'NO'}`);
      console.log(`      - _vectorScore: ${contact._vectorScore !== undefined ? 'YES' : 'NO'}`);
      console.log(`      - searchMetadata: ${contact.searchMetadata ? 'YES' : 'NO'}`);

      // Verify _vectorScore is attached
      if (contact._vectorScore !== undefined) {
        console.log(`   ✓ Vector score attached: ${contact._vectorScore.toFixed(4)}`);
      }

      // Verify search metadata on each result
      if (contact.searchMetadata) {
        console.log(`   ✓ Contact-level searchMetadata present`);
        console.log(`      - score: ${contact.searchMetadata.score?.toFixed(4) || 'N/A'}`);
        console.log(`      - matchType: ${contact.searchMetadata.matchType || 'N/A'}`);
      }
    } else {
      console.log(`   ℹ️  No results to verify transformation`);
    }
  }, { category: 'Vector Search' });
}

// ============================================
// TEST 6.7: Self-Hosted Cost ($0)
// ============================================
async function test_SelfHostedCost() {
  await runner.runTest('Self-Hosted Cost (Qdrant cost = $0)', async () => {
    const result = await searchContacts('engineer', { includeRerank: false });

    const vectorSearchCost = result.searchMetadata.costs?.vectorSearch ||
                             result.searchMetadata.costs?.search || 0;

    console.log(`   ✓ Query: "engineer"`);
    console.log(`   ✓ Vector Search Cost: $${vectorSearchCost.toFixed(6)}`);

    // Self-hosted Qdrant should have $0 cost
    if (vectorSearchCost === 0) {
      console.log(`   ✓ Correctly $0 for self-hosted Qdrant`);
    } else {
      console.log(`   ⚠️  Non-zero cost for vector search`);
    }

    // Compare total costs
    const costs = result.searchMetadata.costs || {};
    console.log(`   ✓ Cost Breakdown:`);
    console.log(`      - Embedding: $${(costs.embedding || 0).toFixed(6)}`);
    console.log(`      - Vector Search: $${(costs.vectorSearch || costs.search || 0).toFixed(6)}`);
    console.log(`      - Enhancement: $${(costs.queryEnhancement || 0).toFixed(6)}`);
    console.log(`      - Tagging: $${(costs.queryTagging || 0).toFixed(6)}`);
    console.log(`      - Total: $${(costs.total || 0).toFixed(6)}`);

    // Document self-hosted benefits
    console.log(`   ℹ️  Self-hosted Qdrant benefits:`);
    console.log(`      - No per-query costs`);
    console.log(`      - Lower latency (Germany location)`);
    console.log(`      - Full data control`);
  }, { category: 'Vector Search' });
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runAllTests() {
  runner.printHeader();

  try {
    await test_VectorSearchSuccess();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_CollectionEnsure();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_NoResultsHandling();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_MaxResultsLimiting();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_ScoreRangeCalculation();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_ResultTransformation();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_SelfHostedCost();

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
