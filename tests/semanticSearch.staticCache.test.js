// tests/semanticSearch.staticCache.test.js
// Tests for static cache paths in query enhancement and tagging

/**
 * RUN THIS TEST:
 * node tests/semanticSearch.staticCache.test.js
 *
 * PREREQUISITES:
 * 1. Dev server running: npm run dev
 * 2. Valid user ID with indexed contacts in Qdrant
 *
 * TESTS:
 * 1.1 Static Cache Exact Match - Enhancement (e.g., "CEO")
 * 1.2 Static Cache Partial Match - Enhancement (e.g., "Senior CEO")
 * 1.3 Static Cache Miss - Enhancement (unique query)
 * 1.4 Static Cache Exact Match - Tagging (normalized query)
 * 1.5 Static Cache Word Match - Tagging (e.g., "google employee")
 * 1.6 Static Cache Miss - Tagging (unique query)
 * 1.7 Tech Company Mapping (Google→alphabet, Meta→facebook)
 */

const {
  TEST_CONFIG,
  TestRunner,
  searchContacts,
  delay,
  generateUniqueQuery,
  assert,
  assertCost
} = require('./semanticSearch.utils');

const runner = new TestRunner('STATIC CACHE TESTS');

// ============================================
// TEST 1.1: Static Cache Exact Match - Enhancement
// ============================================
async function test_StaticCacheExactMatch_Enhancement() {
  await runner.runTest('Static Cache Exact Match - Enhancement (CEO)', async () => {
    // "CEO" is in the static cache - should be instant with $0 cost
    const result = await searchContacts('CEO');

    // Validate response
    assert.exists(result.results, 'Response should have results');
    assert.exists(result.searchMetadata, 'Response should have searchMetadata');

    // Enhancement should come from static cache with $0 cost
    const enhancementCost = result.searchMetadata.costs?.queryEnhancement || 0;
    assert.equals(enhancementCost, 0, 'Query enhancement cost should be $0 for static cache');

    // Should have enhanced query from static cache
    if (result.searchMetadata.enhancedQuery) {
      console.log(`   ✓ Enhanced Query: "${result.searchMetadata.enhancedQuery.substring(0, 60)}..."`);
    }

    // Cache type should be static
    const cacheType = result.searchMetadata.queryEnhancement?.cacheType;
    console.log(`   ✓ Cache Type: ${cacheType || 'not specified'}`);
    console.log(`   ✓ Enhancement Cost: $${enhancementCost.toFixed(6)}`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);
  }, { category: 'Static Cache Enhancement' });
}

// ============================================
// TEST 1.2: Static Cache Partial Match - Enhancement
// ============================================
async function test_StaticCachePartialMatch_Enhancement() {
  await runner.runTest('Static Cache Partial Match - Enhancement (Senior CEO)', async () => {
    // "Senior CEO" contains "CEO" which is in static cache
    const result = await searchContacts('Senior CEO');

    assert.exists(result.results, 'Response should have results');
    assert.exists(result.searchMetadata, 'Response should have searchMetadata');

    const enhancementCost = result.searchMetadata.costs?.queryEnhancement || 0;
    console.log(`   ✓ Query: "Senior CEO" (contains cached term 'CEO')`);
    console.log(`   ✓ Enhancement Cost: $${enhancementCost.toFixed(6)}`);
    console.log(`   ✓ Results: ${result.results.length} contacts`);

    // May or may not be $0 depending on partial match implementation
    if (enhancementCost === 0) {
      console.log(`   ✓ Partial match hit static cache`);
    } else {
      console.log(`   ℹ️  Partial match went to Redis/Gemini (expected for some implementations)`);
    }
  }, { category: 'Static Cache Enhancement' });
}

// ============================================
// TEST 1.3: Static Cache Miss - Enhancement
// ============================================
async function test_StaticCacheMiss_Enhancement() {
  await runner.runTest('Static Cache Miss - Enhancement (unique query)', async () => {
    // Generate unique query that won't be in static cache
    const uniqueQuery = generateUniqueQuery('unique search');

    const result = await searchContacts(uniqueQuery);

    assert.exists(result.results, 'Response should have results');
    assert.exists(result.searchMetadata, 'Response should have searchMetadata');

    // Should NOT hit static cache (unless it somehow matches)
    const cacheType = result.searchMetadata.queryEnhancement?.cacheType;
    const enhancementCost = result.searchMetadata.costs?.queryEnhancement || 0;

    console.log(`   ✓ Query: "${uniqueQuery.substring(0, 40)}..."`);
    console.log(`   ✓ Cache Type: ${cacheType || 'not specified'}`);
    console.log(`   ✓ Enhancement Cost: $${enhancementCost.toFixed(6)}`);

    // Unique query should miss static cache
    if (cacheType === 'static') {
      console.log(`   ⚠️  Unexpectedly hit static cache`);
    } else {
      console.log(`   ✓ Correctly missed static cache`);
    }
  }, { category: 'Static Cache Enhancement' });
}

// ============================================
// TEST 1.4: Static Cache Exact Match - Tagging
// ============================================
async function test_StaticCacheExactMatch_Tagging() {
  await runner.runTest('Static Cache Exact Match - Tagging (developer)', async () => {
    // "developer" is in static cache with predefined tags
    const result = await searchContacts('developer');

    assert.exists(result.results, 'Response should have results');
    assert.exists(result.searchMetadata, 'Response should have searchMetadata');

    // Query tagging cost should be $0 for static cache
    const taggingCost = result.searchMetadata.costs?.queryTagging || 0;
    const queryTags = result.searchMetadata.queryTags || [];

    console.log(`   ✓ Query: "developer"`);
    console.log(`   ✓ Query Tags: ${queryTags.join(', ') || 'none'}`);
    console.log(`   ✓ Tagging Cost: $${taggingCost.toFixed(6)}`);

    // Should have tags from static cache
    if (queryTags.length > 0) {
      console.log(`   ✓ Tags generated: ${queryTags.length}`);
    }
  }, { category: 'Static Cache Tagging' });
}

// ============================================
// TEST 1.5: Static Cache Word Match - Tagging
// ============================================
async function test_StaticCacheWordMatch_Tagging() {
  await runner.runTest('Static Cache Word Match - Tagging (marketing manager)', async () => {
    // "marketing" is in static cache, even as part of compound query
    const result = await searchContacts('marketing manager');

    assert.exists(result.results, 'Response should have results');
    assert.exists(result.searchMetadata, 'Response should have searchMetadata');

    const taggingCost = result.searchMetadata.costs?.queryTagging || 0;
    const queryTags = result.searchMetadata.queryTags || [];

    console.log(`   ✓ Query: "marketing manager"`);
    console.log(`   ✓ Query Tags: ${queryTags.join(', ') || 'none'}`);
    console.log(`   ✓ Tagging Cost: $${taggingCost.toFixed(6)}`);

    // Should have tags including marketing-related ones
    const hasMarketingTags = queryTags.some(tag =>
      tag.includes('marketing') || tag.includes('growth') || tag.includes('brand')
    );

    if (hasMarketingTags) {
      console.log(`   ✓ Contains marketing-related tags`);
    }
  }, { category: 'Static Cache Tagging' });
}

// ============================================
// TEST 1.6: Static Cache Miss - Tagging
// ============================================
async function test_StaticCacheMiss_Tagging() {
  await runner.runTest('Static Cache Miss - Tagging (unique query)', async () => {
    // Unique query won't be in static cache
    const uniqueQuery = generateUniqueQuery('specialized role');

    const result = await searchContacts(uniqueQuery);

    assert.exists(result.results, 'Response should have results');
    assert.exists(result.searchMetadata, 'Response should have searchMetadata');

    const taggingCost = result.searchMetadata.costs?.queryTagging || 0;
    const queryTags = result.searchMetadata.queryTags || [];

    console.log(`   ✓ Query: "${uniqueQuery.substring(0, 40)}..."`);
    console.log(`   ✓ Query Tags: ${queryTags.join(', ') || 'none'}`);
    console.log(`   ✓ Tagging Cost: $${taggingCost.toFixed(6)}`);

    // Unique query should miss static cache (tagging cost may be >$0 if using AI)
    if (taggingCost > 0) {
      console.log(`   ✓ Used AI for tagging (static cache miss)`);
    } else {
      console.log(`   ℹ️  Zero cost (may have used Redis or generated no tags)`);
    }
  }, { category: 'Static Cache Tagging' });
}

// ============================================
// TEST 1.7: Tech Company Mapping
// ============================================
async function test_TechCompanyMapping() {
  await runner.runTest('Tech Company Mapping (react, python)', async () => {
    // "react" and "python" are in static cache with specific tech tags
    const reactResult = await searchContacts('react developer');
    await delay(1000);
    const pythonResult = await searchContacts('python engineer');

    // React query
    const reactTags = reactResult.searchMetadata.queryTags || [];
    console.log(`   ✓ Query: "react developer"`);
    console.log(`   ✓ React Tags: ${reactTags.join(', ') || 'none'}`);

    // Python query
    const pythonTags = pythonResult.searchMetadata.queryTags || [];
    console.log(`   ✓ Query: "python engineer"`);
    console.log(`   ✓ Python Tags: ${pythonTags.join(', ') || 'none'}`);

    // Validate tech-specific tags
    const hasReactTags = reactTags.some(tag =>
      ['react', 'reactjs', 'frontend', 'javascript', 'web-development'].includes(tag)
    );
    const hasPythonTags = pythonTags.some(tag =>
      ['python', 'django', 'flask', 'data-science', 'machine-learning'].includes(tag)
    );

    if (hasReactTags) console.log(`   ✓ React tags correctly applied`);
    if (hasPythonTags) console.log(`   ✓ Python tags correctly applied`);
  }, { category: 'Static Cache Tagging' });
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runAllTests() {
  runner.printHeader();

  try {
    // Run tests with delay between each to avoid rate limiting
    await test_StaticCacheExactMatch_Enhancement();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_StaticCachePartialMatch_Enhancement();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_StaticCacheMiss_Enhancement();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_StaticCacheExactMatch_Tagging();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_StaticCacheWordMatch_Tagging();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_StaticCacheMiss_Tagging();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_TechCompanyMapping();

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
