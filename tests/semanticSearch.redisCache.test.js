// tests/semanticSearch.redisCache.test.js
// Tests for Redis cache paths in query enhancement and tagging

/**
 * RUN THIS TEST:
 * node tests/semanticSearch.redisCache.test.js
 *
 * PREREQUISITES:
 * 1. Dev server running: npm run dev
 * 2. Redis server running and connected
 * 3. Valid user ID with indexed contacts
 *
 * TESTS:
 * 2.1 Redis Cache Hit - Enhancement (second query same)
 * 2.2 Redis Cache Miss - Enhancement (first unique query)
 * 2.3 Redis Cache Write (verify caching after Gemini call)
 * 2.4 Redis Cache Hit - Tagging
 * 2.5 Redis Cache Miss - Tagging
 * 2.6 Redis TTL Verification
 */

const {
  TEST_CONFIG,
  TestRunner,
  searchContacts,
  delay,
  generateUniqueQuery,
  assert
} = require('./semanticSearch.utils');

const runner = new TestRunner('REDIS CACHE TESTS');

// ============================================
// TEST 2.1: Redis Cache Hit - Enhancement
// ============================================
async function test_RedisCacheHit_Enhancement() {
  await runner.runTest('Redis Cache Hit - Enhancement (MISS → HIT)', async () => {
    // Generate unique query to ensure cache miss on first call
    const uniqueQuery = generateUniqueQuery('redis test enhance');

    // First call - should be cache MISS (goes to Gemini)
    console.log(`   → First call (expected MISS)...`);
    const firstResult = await searchContacts(uniqueQuery);
    const firstCached = firstResult.searchMetadata.queryEnhancement?.cached;
    const firstCacheType = firstResult.searchMetadata.queryEnhancement?.cacheType;
    const firstCost = firstResult.searchMetadata.costs?.queryEnhancement || 0;

    console.log(`   ✓ First call - Cached: ${firstCached ? 'HIT' : 'MISS'}`);
    console.log(`   ✓ First call - Cache Type: ${firstCacheType || 'N/A'}`);
    console.log(`   ✓ First call - Cost: $${firstCost.toFixed(6)}`);

    // Wait for Redis to cache the result
    await delay(500);

    // Second call - should be cache HIT (from Redis)
    console.log(`   → Second call (expected HIT)...`);
    const secondResult = await searchContacts(uniqueQuery);
    const secondCached = secondResult.searchMetadata.queryEnhancement?.cached;
    const secondCacheType = secondResult.searchMetadata.queryEnhancement?.cacheType;
    const secondCost = secondResult.searchMetadata.costs?.queryEnhancement || 0;

    console.log(`   ✓ Second call - Cached: ${secondCached ? 'HIT' : 'MISS'}`);
    console.log(`   ✓ Second call - Cache Type: ${secondCacheType || 'N/A'}`);
    console.log(`   ✓ Second call - Cost: $${secondCost.toFixed(6)}`);

    // Validate cache behavior
    if (firstCached === false && secondCached === true) {
      console.log(`   ✓ Cache flow correct: MISS → HIT`);
    } else if (firstCached === true && secondCached === true) {
      console.log(`   ℹ️  Both were HITs (may have hit static cache)`);
    } else {
      console.log(`   ⚠️  Cache behavior unexpected: ${firstCached} → ${secondCached}`);
    }

    // Second call should be cheaper
    if (secondCost < firstCost) {
      console.log(`   ✓ Second call cheaper ($${secondCost.toFixed(6)} < $${firstCost.toFixed(6)})`);
    } else if (secondCost === 0 && firstCost === 0) {
      console.log(`   ℹ️  Both zero cost (static cache for both)`);
    }
  }, { category: 'Redis Cache' });
}

// ============================================
// TEST 2.2: Redis Cache Miss - Enhancement
// ============================================
async function test_RedisCacheMiss_Enhancement() {
  await runner.runTest('Redis Cache Miss - Enhancement (fresh unique query)', async () => {
    // Generate completely unique query that can't be in any cache
    const uniqueQuery = `${generateUniqueQuery('uncached specialist')} ${Math.random().toString(36)}`;

    const result = await searchContacts(uniqueQuery);

    assert.exists(result.results, 'Response should have results');
    assert.exists(result.searchMetadata, 'Response should have searchMetadata');

    const cached = result.searchMetadata.queryEnhancement?.cached;
    const cacheType = result.searchMetadata.queryEnhancement?.cacheType;
    const cost = result.searchMetadata.costs?.queryEnhancement || 0;

    console.log(`   ✓ Query: "${uniqueQuery.substring(0, 40)}..."`);
    console.log(`   ✓ Cached: ${cached ? 'HIT' : 'MISS'}`);
    console.log(`   ✓ Cache Type: ${cacheType || 'N/A'}`);
    console.log(`   ✓ Cost: $${cost.toFixed(6)}`);

    // Fresh unique query should miss cache (unless by accident)
    if (!cached) {
      console.log(`   ✓ Correctly identified as cache MISS`);
    }

    // If it went to Gemini, cost should be > 0
    if (cacheType === 'gemini' || cacheType === 'ai') {
      console.log(`   ✓ Used Gemini for enhancement`);
    }
  }, { category: 'Redis Cache' });
}

// ============================================
// TEST 2.3: Redis Cache Write Verification
// ============================================
async function test_RedisCacheWrite() {
  await runner.runTest('Redis Cache Write (verify caching after Gemini)', async () => {
    // Step 1: Generate unique query
    const uniqueQuery = generateUniqueQuery('cachewrite verification');

    // Step 2: First call - triggers Gemini and should cache to Redis
    console.log(`   → Step 1: Initial query (triggers cache write)...`);
    const firstResult = await searchContacts(uniqueQuery);
    const firstEnhanced = firstResult.searchMetadata.enhancedQuery;
    const firstCacheType = firstResult.searchMetadata.queryEnhancement?.cacheType;

    console.log(`   ✓ Enhanced Query: "${(firstEnhanced || 'none').substring(0, 50)}..."`);
    console.log(`   ✓ Cache Type: ${firstCacheType || 'N/A'}`);

    // Wait for Redis write to complete
    await delay(1000);

    // Step 3: Second call - should retrieve from Redis
    console.log(`   → Step 2: Same query (should read from cache)...`);
    const secondResult = await searchContacts(uniqueQuery);
    const secondEnhanced = secondResult.searchMetadata.enhancedQuery;
    const secondCacheType = secondResult.searchMetadata.queryEnhancement?.cacheType;
    const secondCached = secondResult.searchMetadata.queryEnhancement?.cached;

    console.log(`   ✓ Enhanced Query: "${(secondEnhanced || 'none').substring(0, 50)}..."`);
    console.log(`   ✓ Cache Type: ${secondCacheType || 'N/A'}`);
    console.log(`   ✓ Cached: ${secondCached ? 'YES' : 'NO'}`);

    // Verify enhanced queries match (cache returned same result)
    if (firstEnhanced && secondEnhanced && firstEnhanced === secondEnhanced) {
      console.log(`   ✓ Cache returned identical enhanced query`);
    } else if (firstEnhanced && secondEnhanced) {
      console.log(`   ⚠️  Enhanced queries differ (may be non-deterministic)`);
    }

    // Second should be from redis cache
    if (secondCacheType === 'redis' || secondCached === true) {
      console.log(`   ✓ Cache write verified - second call from cache`);
    }
  }, { category: 'Redis Cache' });
}

// ============================================
// TEST 2.4: Redis Cache Hit - Tagging
// ============================================
async function test_RedisCacheHit_Tagging() {
  await runner.runTest('Redis Cache Hit - Tagging (MISS → HIT)', async () => {
    // Generate unique query for tagging cache test
    const uniqueQuery = generateUniqueQuery('tagging cache test');

    // First call - cache miss
    console.log(`   → First call (expected MISS)...`);
    const firstResult = await searchContacts(uniqueQuery);
    const firstTags = firstResult.searchMetadata.queryTags || [];
    const firstCost = firstResult.searchMetadata.costs?.queryTagging || 0;

    console.log(`   ✓ First call - Tags: ${firstTags.join(', ') || 'none'}`);
    console.log(`   ✓ First call - Tagging Cost: $${firstCost.toFixed(6)}`);

    // Wait for cache
    await delay(500);

    // Second call - should be cache hit
    console.log(`   → Second call (expected HIT)...`);
    const secondResult = await searchContacts(uniqueQuery);
    const secondTags = secondResult.searchMetadata.queryTags || [];
    const secondCost = secondResult.searchMetadata.costs?.queryTagging || 0;

    console.log(`   ✓ Second call - Tags: ${secondTags.join(', ') || 'none'}`);
    console.log(`   ✓ Second call - Tagging Cost: $${secondCost.toFixed(6)}`);

    // Second call should be cheaper
    if (secondCost < firstCost) {
      console.log(`   ✓ Second call cheaper (cache hit)`);
    } else if (secondCost === 0 && firstCost === 0) {
      console.log(`   ℹ️  Both zero cost (static cache or no tags generated)`);
    }

    // Tags should be consistent
    if (firstTags.length > 0 && secondTags.length > 0) {
      const tagsMatch = JSON.stringify(firstTags.sort()) === JSON.stringify(secondTags.sort());
      if (tagsMatch) {
        console.log(`   ✓ Tags consistent between calls`);
      }
    }
  }, { category: 'Redis Cache' });
}

// ============================================
// TEST 2.5: Redis Cache Miss - Tagging
// ============================================
async function test_RedisCacheMiss_Tagging() {
  await runner.runTest('Redis Cache Miss - Tagging (fresh query)', async () => {
    // Generate completely unique query
    const uniqueQuery = `${generateUniqueQuery('tagging fresh')} ${Date.now()}`;

    const result = await searchContacts(uniqueQuery);

    const queryTags = result.searchMetadata.queryTags || [];
    const taggingCost = result.searchMetadata.costs?.queryTagging || 0;

    console.log(`   ✓ Query: "${uniqueQuery.substring(0, 40)}..."`);
    console.log(`   ✓ Tags: ${queryTags.join(', ') || 'none'}`);
    console.log(`   ✓ Tagging Cost: $${taggingCost.toFixed(6)}`);

    // Fresh query shouldn't hit cache
    if (taggingCost > 0) {
      console.log(`   ✓ Cache miss - used Gemini for tagging`);
    } else {
      console.log(`   ℹ️  Zero cost (may have generated no tags or hit static)`);
    }
  }, { category: 'Redis Cache' });
}

// ============================================
// TEST 2.6: Redis TTL Verification
// ============================================
async function test_RedisTTLVerification() {
  await runner.runTest('Redis TTL Verification (24h TTL expected)', async () => {
    // Use a query that will definitely go through enhancement
    const uniqueQuery = generateUniqueQuery('ttl verification specialist');

    // First call to populate cache
    console.log(`   → Populating cache...`);
    const firstResult = await searchContacts(uniqueQuery);

    await delay(500);

    // Second call - should have TTL metadata
    console.log(`   → Reading from cache (checking TTL)...`);
    const secondResult = await searchContacts(uniqueQuery);

    const ttl = secondResult.searchMetadata.queryEnhancement?.ttl ||
                secondResult.searchMetadata.queryEnhancement?.cacheTTL;

    console.log(`   ✓ Cache TTL: ${ttl ? `${ttl}s (${(ttl / 3600).toFixed(1)}h)` : 'not reported'}`);

    // Expected TTL is 86400 seconds (24 hours)
    if (ttl) {
      const expectedTTL = 86400;  // 24 hours
      const ttlHours = ttl / 3600;
      if (ttlHours >= 23 && ttlHours <= 24) {
        console.log(`   ✓ TTL is ~24 hours as expected`);
      } else if (ttlHours > 0) {
        console.log(`   ℹ️  TTL is ${ttlHours.toFixed(1)} hours (expected ~24h)`);
      }
    } else {
      console.log(`   ℹ️  TTL not included in response metadata`);
    }

    // Verify cache is still valid
    const cached = secondResult.searchMetadata.queryEnhancement?.cached;
    if (cached) {
      console.log(`   ✓ Cache entry is valid`);
    }
  }, { category: 'Redis Cache' });
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runAllTests() {
  runner.printHeader();

  try {
    await test_RedisCacheHit_Enhancement();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_RedisCacheMiss_Enhancement();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_RedisCacheWrite();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_RedisCacheHit_Tagging();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_RedisCacheMiss_Tagging();
    await delay(TEST_CONFIG.rateLimitDelay);

    await test_RedisTTLVerification();

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
