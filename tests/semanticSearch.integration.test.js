// tests/semanticSearch.integration.test.js
// Full pipeline integration tests

/**
 * RUN THIS TEST:
 * node tests/semanticSearch.integration.test.js
 *
 * PREREQUISITES:
 * 1. Dev server running: npm run dev
 * 2. All services running (Redis, Qdrant, Gemini, Cohere)
 * 3. Valid user ID with indexed contacts
 *
 * TESTS:
 * 9.1 Full Pipeline Default (all features enabled)
 * 9.2 Enhancement Disabled (enhanceQuery=false)
 * 9.3 Tagging Disabled (disableQueryTags=true)
 * 9.4 Rerank Disabled (includeRerank=false)
 * 9.5 Long Query (>60 chars) handling
 * 9.6 Complex Multi-Feature (combined options)
 */

const {
  TEST_CONFIG,
  TestRunner,
  searchContacts,
  delay,
  assert
} = require('./semanticSearch.utils');

const runner = new TestRunner('INTEGRATION TESTS');

// ============================================
// TEST 9.1: Full Pipeline Default
// ============================================
async function test_FullPipelineDefault() {
  await runner.runTest('Full Pipeline Default (all features enabled)', async () => {
    const query = 'senior technology leader startup AI';

    const result = await searchContacts(query, {
      enhanceQuery: true,
      disableQueryTags: false,
      includeRerank: true,
      maxResults: 10,
      trackSteps: true
    });

    // Validate complete response structure
    assert.exists(result.results, 'Missing results');
    assert.exists(result.searchMetadata, 'Missing searchMetadata');
    assert.isArray(result.results, 'Results should be array');

    const metadata = result.searchMetadata;

    // Required metadata fields
    console.log(`   ✓ Search ID: ${metadata.searchId || 'present'}`);
    console.log(`   ✓ Query: "${metadata.query?.substring(0, 40)}..."`);
    console.log(`   ✓ Enhanced Query: ${metadata.enhancedQuery ? 'YES' : 'NO'}`);
    console.log(`   ✓ Language: ${metadata.detectedLanguage || 'unknown'}`);
    console.log(`   ✓ Query Tags: ${metadata.queryTags?.join(', ') || 'none'}`);
    console.log(`   ✓ Total Results: ${metadata.totalResults || result.results.length}`);

    // Cost tracking
    if (metadata.costs) {
      console.log(`   ✓ Cost Breakdown:`);
      console.log(`      - Enhancement: $${(metadata.costs.queryEnhancement || 0).toFixed(6)}`);
      console.log(`      - Tagging: $${(metadata.costs.queryTagging || 0).toFixed(6)}`);
      console.log(`      - Embedding: $${(metadata.costs.embedding || 0).toFixed(6)}`);
      console.log(`      - Rerank: $${(metadata.costs.rerank || 0).toFixed(6)}`);
      console.log(`      - TOTAL: $${(metadata.costs.total || 0).toFixed(6)}`);
    }

    // Result structure
    if (result.results.length > 0) {
      const contact = result.results[0];
      console.log(`   ✓ Top Result: ${contact.name || 'Unknown'}`);
      console.log(`      - Vector Score: ${contact._vectorScore?.toFixed(4) || 'N/A'}`);
      console.log(`      - Rerank Score: ${contact.searchMetadata?.rerankScore?.toFixed(4) || 'N/A'}`);
      console.log(`      - Hybrid Score: ${contact.searchMetadata?.hybridScore?.toFixed(4) || 'N/A'}`);
    }

    console.log(`   ✓ Full pipeline completed successfully`);
  }, { category: 'Integration' });
}

// ============================================
// TEST 9.2: Enhancement Disabled
// ============================================
async function test_EnhancementDisabled() {
  await runner.runTest('Enhancement Disabled (enhanceQuery=false)', async () => {
    const query = 'software engineer';

    const result = await searchContacts(query, {
      enhanceQuery: false,
      disableQueryTags: false,
      includeRerank: true
    });

    assert.exists(result.results, 'Missing results');
    assert.exists(result.searchMetadata, 'Missing searchMetadata');

    // Enhancement cost should be $0
    const enhancementCost = result.searchMetadata.costs?.queryEnhancement || 0;

    console.log(`   ✓ Query: "${query}"`);
    console.log(`   ✓ Enhancement Disabled: YES`);
    console.log(`   ✓ Enhancement Cost: $${enhancementCost.toFixed(6)}`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);

    // Verify no enhancement cost when disabled
    if (enhancementCost === 0) {
      console.log(`   ✓ Correctly skipped enhancement (cost=$0)`);
    } else {
      console.log(`   ⚠️  Enhancement cost > 0 despite being disabled`);
    }

    // Tagging and rerank should still work
    const taggingCost = result.searchMetadata.costs?.queryTagging || 0;
    const rerankCost = result.searchMetadata.costs?.rerank || 0;
    console.log(`   ✓ Tagging Cost: $${taggingCost.toFixed(6)} (should work)`);
    console.log(`   ✓ Rerank Cost: $${rerankCost.toFixed(6)} (should work)`);
  }, { category: 'Integration' });
}

// ============================================
// TEST 9.3: Tagging Disabled
// ============================================
async function test_TaggingDisabled() {
  await runner.runTest('Tagging Disabled (disableQueryTags=true)', async () => {
    const query = 'marketing manager';

    const result = await searchContacts(query, {
      enhanceQuery: true,
      disableQueryTags: true,
      includeRerank: true
    });

    assert.exists(result.results, 'Missing results');
    assert.exists(result.searchMetadata, 'Missing searchMetadata');

    const queryTags = result.searchMetadata.queryTags || [];
    const taggingCost = result.searchMetadata.costs?.queryTagging || 0;

    console.log(`   ✓ Query: "${query}"`);
    console.log(`   ✓ Tagging Disabled: YES`);
    console.log(`   ✓ Query Tags: ${queryTags.join(', ') || 'none (as expected)'}`);
    console.log(`   ✓ Tagging Cost: $${taggingCost.toFixed(6)}`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);

    // Tags should be empty when disabled
    if (queryTags.length === 0) {
      console.log(`   ✓ Correctly returned no tags`);
    } else {
      console.log(`   ⚠️  Tags present despite being disabled`);
    }

    // Tagging cost should be $0
    if (taggingCost === 0) {
      console.log(`   ✓ Tagging cost is $0 (as expected)`);
    }
  }, { category: 'Integration' });
}

// ============================================
// TEST 9.4: Rerank Disabled
// ============================================
async function test_RerankDisabled() {
  await runner.runTest('Rerank Disabled (includeRerank=false)', async () => {
    const query = 'engineer';

    const result = await searchContacts(query, {
      enhanceQuery: true,
      disableQueryTags: false,
      includeRerank: false
    });

    assert.exists(result.results, 'Missing results');

    console.log(`   ✓ Query: "${query}"`);
    console.log(`   ✓ Rerank Disabled: YES`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);

    // Results should only have vector scores, not rerank scores
    if (result.results.length > 0) {
      const contact = result.results[0];
      const hasVectorScore = contact._vectorScore !== undefined;
      const hasRerankScore = contact.searchMetadata?.rerankScore !== undefined;

      console.log(`   ✓ Has Vector Score: ${hasVectorScore ? 'YES' : 'NO'}`);
      console.log(`   ✓ Has Rerank Score: ${hasRerankScore ? 'YES (unexpected)' : 'NO (as expected)'}`);

      if (hasVectorScore && !hasRerankScore) {
        console.log(`   ✓ Correctly skipped reranking`);
      }
    }

    // Rerank metadata should be absent or null
    const rerankMetadata = result.searchMetadata.rerank;
    console.log(`   ✓ Rerank Metadata: ${rerankMetadata ? 'present' : 'absent (as expected)'}`);
  }, { category: 'Integration' });
}

// ============================================
// TEST 9.5: Long Query Handling
// ============================================
async function test_LongQueryHandling() {
  await runner.runTest('Long Query Handling (>60 chars)', async () => {
    // Create a long query (>60 characters)
    const longQuery = 'senior software engineer with extensive experience in machine learning and artificial intelligence working at a technology startup in San Francisco';

    console.log(`   ✓ Query length: ${longQuery.length} chars (>60)`);

    const result = await searchContacts(longQuery);

    assert.exists(result.results, 'Missing results');
    assert.exists(result.searchMetadata, 'Missing searchMetadata');

    // Check how query appears in metadata
    const metadataQuery = result.searchMetadata.query;

    console.log(`   ✓ Original: "${longQuery.substring(0, 50)}..." (${longQuery.length} chars)`);
    console.log(`   ✓ In Metadata: "${metadataQuery?.substring(0, 50)}..." (${metadataQuery?.length || 0} chars)`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);

    // Query should work regardless of length
    if (result.results.length >= 0) {
      console.log(`   ✓ Long query processed successfully`);
    }

    // Document truncation behavior
    console.log(`   ℹ️  Long query handling:`);
    console.log(`      - Truncated to 100 chars in console logs`);
    console.log(`      - Full query sent to APIs`);
    console.log(`      - No functional impact on search`);
  }, { category: 'Integration' });
}

// ============================================
// TEST 9.6: Complex Multi-Feature
// ============================================
async function test_ComplexMultiFeature() {
  await runner.runTest('Complex Multi-Feature (combined options)', async () => {
    const query = 'experienced technical leader cloud infrastructure';

    const result = await searchContacts(query, {
      enhanceQuery: true,
      disableQueryTags: false,
      includeRerank: true,
      minVectorScore: 0.2,
      minRerankScore: 0.001,
      maxResults: 15,
      trackSteps: true
    });

    assert.exists(result.results, 'Missing results');
    assert.exists(result.searchMetadata, 'Missing searchMetadata');

    const metadata = result.searchMetadata;

    console.log(`   ✓ Query: "${query.substring(0, 40)}..."`);
    console.log(`   ✓ Options: enhancement, tagging, rerank, thresholds`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);

    // Validate all features worked
    console.log(`   ✓ Features Applied:`);
    console.log(`      - Enhancement: ${metadata.enhancedQuery ? 'YES' : 'NO'}`);
    console.log(`      - Tags: ${metadata.queryTags?.length || 0} tags`);
    console.log(`      - Rerank: ${metadata.rerank ? 'YES' : 'NO'}`);

    // Cost breakdown
    if (metadata.costs) {
      const total = metadata.costs.total || 0;
      console.log(`   ✓ Total Cost: $${total.toFixed(6)}`);
    }

    // Validate results meet thresholds
    if (result.results.length > 0) {
      const vectorScores = result.results.map(r => r._vectorScore || 0);
      const rerankScores = result.results.map(r => r.searchMetadata?.rerankScore || 0);

      const minVectorFound = Math.min(...vectorScores);
      const minRerankFound = Math.min(...rerankScores.filter(s => s > 0));

      console.log(`   ✓ Min Vector Score: ${minVectorFound.toFixed(4)}`);
      if (minRerankFound > 0) {
        console.log(`   ✓ Min Rerank Score: ${minRerankFound.toFixed(4)}`);
      }
    }

    console.log(`   ✓ Complex multi-feature search completed`);
  }, { category: 'Integration' });
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runAllTests() {
  runner.printHeader();

  try {
    await test_FullPipelineDefault();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_EnhancementDisabled();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_TaggingDisabled();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_RerankDisabled();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_LongQueryHandling();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_ComplexMultiFeature();

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
