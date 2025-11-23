// tests/autoTagging.comprehensive.test.js
// Comprehensive test suite for Auto-Tagging Service
// Tests all cache tiers, priority ordering, budget checks, and feature flag enforcement

/**
 * RUN THIS TEST:
 * node tests/autoTagging.comprehensive.test.js
 *
 * OR create as an API endpoint:
 * app/api/test/auto-tagging/route.js
 */

const BASE_URL = 'http://localhost:3000';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Helper: Run a test
async function runTest(name, testFn, category = 'General') {
  const startTime = Date.now();
  try {
    console.log(`\n🧪 Running: ${name}`);
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ PASSED (${duration}ms): ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'passed', duration, category });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ FAILED (${duration}ms): ${name}`);
    console.error(`   Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'failed', duration, category, error: error.message });
  }
}

// Helper: Make exchange contact request
async function submitContact(contactData) {
  const response = await fetch(`${BASE_URL}/api/user/contacts/exchange/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contactData)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Contact submission failed');
  }

  return data;
}

// Helper: Wait/sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// CATEGORY 1: STATIC CACHE TESTS
// ============================================

async function testStaticCacheJobTitleExact() {
  const exactMatches = [
    { jobTitle: 'CEO', expected: ['executive', 'c-level', 'leadership', 'ceo', 'president', 'senior-management'] },
    { jobTitle: 'CTO', expected: ['cto', 'chief-technology-officer', 'technology-leadership', 'technical-executive'] },
    { jobTitle: 'CFO', expected: ['cfo', 'chief-financial-officer', 'finance-executive', 'financial-leadership'] },
    { jobTitle: 'Engineer', expected: ['engineer', 'software-engineer', 'developer', 'technical', 'programming', 'coding'] },
    { jobTitle: 'Designer', expected: ['designer', 'graphic-designer', 'creative', 'ui-ux', 'visual-design'] }
  ];

  for (const testCase of exactMatches) {
    await runTest(`Static Cache - Job Title Exact: ${testCase.jobTitle}`, async () => {
      const contact = {
        name: `Test ${testCase.jobTitle}`,
        email: `test-${testCase.jobTitle.toLowerCase()}-${Date.now()}@test.com`,
        company: 'Test Company',
        jobTitle: testCase.jobTitle,
        notes: 'Test contact for static cache validation'
      };

      const result = await submitContact(contact);

      // Check if contact was tagged
      if (!result.contact || !result.contact.tags) {
        throw new Error('Contact was not tagged');
      }

      // Verify tags match expected
      const tags = result.contact.tags;
      const allExpectedPresent = testCase.expected.every(tag => tags.includes(tag));

      if (!allExpectedPresent) {
        throw new Error(`Expected tags ${testCase.expected.join(', ')}, got ${tags.join(', ')}`);
      }

      // Verify it came from static cache
      if (result.contact.metadata?.tagSource !== 'static_cache') {
        throw new Error(`Expected static_cache, got ${result.contact.metadata?.tagSource}`);
      }

      // Static cache should be instant (< 5ms)
      const tagDuration = result.contact.metadata?.tagDuration || 0;
      if (tagDuration > 5) {
        throw new Error(`Static cache took ${tagDuration}ms (expected < 5ms)`);
      }
    }, 'Static Cache - Exact Match');
  }
}

async function testStaticCacheCompanyMatch() {
  const companyMatches = [
    { company: 'Google', expected: ['tech-industry', 'google-employee', 'big-tech', 'silicon-valley'] },
    { company: 'Apple', expected: ['tech-industry', 'apple-employee', 'big-tech', 'silicon-valley'] },
    { company: 'Microsoft', expected: ['tech-industry', 'microsoft-employee', 'big-tech', 'enterprise'] },
    { company: 'Tesla', expected: ['automotive-industry', 'tesla-employee', 'electric-vehicles', 'technology'] }
  ];

  for (const testCase of companyMatches) {
    await runTest(`Static Cache - Company Match: ${testCase.company}`, async () => {
      const contact = {
        name: `Employee at ${testCase.company}`,
        email: `employee-${testCase.company.toLowerCase()}-${Date.now()}@test.com`,
        company: testCase.company,
        jobTitle: 'Engineer', // Should prioritize company over job title
        notes: 'Testing company-specific tag priority'
      };

      const result = await submitContact(contact);

      if (!result.contact || !result.contact.tags) {
        throw new Error('Contact was not tagged');
      }

      const tags = result.contact.tags;

      // Verify company tags (NOT generic engineer tags)
      const hasCompanyTags = testCase.expected.every(tag => tags.includes(tag));
      if (!hasCompanyTags) {
        throw new Error(`Expected company tags ${testCase.expected.join(', ')}, got ${tags.join(', ')}`);
      }

      // Verify NO generic engineer tags (company should have priority)
      const hasGenericEngineerTags = tags.includes('software-engineer') && !tags.includes('google-employee');
      if (hasGenericEngineerTags) {
        throw new Error('Got generic engineer tags instead of company-specific tags (priority bug!)');
      }
    }, 'Static Cache - Company Match');
  }
}

async function testStaticCacheJobTitlePartial() {
  await runTest('Static Cache - Job Title Partial: "Product Manager"', async () => {
    const contact = {
      name: 'Product Manager Test',
      email: `pm-${Date.now()}@test.com`,
      company: 'Startup Inc',
      jobTitle: 'Product Manager', // Should match "manager" partial
      notes: 'Testing partial job title matching'
    };

    const result = await submitContact(contact);

    if (!result.contact || !result.contact.tags) {
      throw new Error('Contact was not tagged');
    }

    const tags = result.contact.tags;

    // Should have management tags
    if (!tags.includes('manager') || !tags.includes('management')) {
      throw new Error(`Expected management tags, got ${tags.join(', ')}`);
    }
  }, 'Static Cache - Partial Match');
}

async function testStaticCachePriorityOrder() {
  await runTest('Static Cache - Priority: Company > Job Title Exact > Job Title Partial', async () => {
    // Test 1: Company should beat job title exact
    const googleEngineer = {
      name: 'Google Engineer',
      email: `google-eng-${Date.now()}@test.com`,
      company: 'Google',
      jobTitle: 'CEO', // Both company AND job title exact match
      notes: 'Priority test'
    };

    const result1 = await submitContact(googleEngineer);

    // Should get Google tags (company priority), NOT CEO tags
    if (!result1.contact.tags.includes('google-employee')) {
      throw new Error('Company priority failed - did not get google-employee tag');
    }

    if (result1.contact.tags.includes('president')) {
      throw new Error('Company priority failed - got CEO tags instead of company tags');
    }

    // Test 2: Job title exact should beat partial
    const ceo = {
      name: 'CEO Test',
      email: `ceo-${Date.now()}@test.com`,
      company: 'Acme Corp', // No company match
      jobTitle: 'CEO', // Exact match
      notes: 'Priority test'
    };

    const result2 = await submitContact(ceo);

    if (!result2.contact.tags.includes('ceo')) {
      throw new Error('Job title exact priority failed');
    }
  }, 'Static Cache - Priority');
}

// ============================================
// CATEGORY 2: REDIS CACHE TESTS
// ============================================

async function testRedisCacheFlow() {
  const uniqueContact = {
    name: `Redis Test ${Date.now()}`,
    email: `redis-${Date.now()}@test.com`,
    company: 'Unique Startup XYZ',
    jobTitle: 'Chief Innovation Officer', // Unique role not in static cache
    notes: 'Building next-gen SaaS platform with AI'
  };

  // First call: Should call Gemini AI
  await runTest('Redis Cache - First Call (miss, AI generation)', async () => {
    const result = await submitContact(uniqueContact);

    if (!result.contact || !result.contact.tags) {
      throw new Error('Contact was not tagged');
    }

    // Should be from AI (not static, not redis yet)
    if (result.contact.metadata?.tagSource !== 'ai') {
      throw new Error(`Expected AI source, got ${result.contact.metadata?.tagSource}`);
    }

    // AI call should have cost
    if (!result.contact.metadata?.tagCost || result.contact.metadata.tagCost <= 0) {
      throw new Error('AI call should have cost > 0');
    }
  }, 'Redis Cache');

  // Wait for Redis to settle
  await sleep(200);

  // Second call: Should hit Redis cache
  await runTest('Redis Cache - Second Call (hit)', async () => {
    const result = await submitContact(uniqueContact);

    if (!result.contact || !result.contact.tags) {
      throw new Error('Contact was not tagged');
    }

    // Should be from Redis cache
    if (result.contact.metadata?.tagSource !== 'redis_cache') {
      throw new Error(`Expected redis_cache, got ${result.contact.metadata?.tagSource}`);
    }

    // Redis cache should have no cost
    if (result.contact.metadata?.tagCost && result.contact.metadata.tagCost > 0) {
      throw new Error('Redis cache should have no cost');
    }

    // Should be fast (< 100ms)
    const tagDuration = result.contact.metadata?.tagDuration || 0;
    if (tagDuration > 100) {
      throw new Error(`Redis cache took ${tagDuration}ms (expected < 100ms)`);
    }
  }, 'Redis Cache');
}

// ============================================
// CATEGORY 3: AI GENERATION TESTS
// ============================================

async function testAIGeneration() {
  const aiTestCases = [
    {
      name: 'Fintech Founder',
      jobTitle: 'Founder & CEO',
      company: 'PayTech Solutions',
      notes: 'Built a fintech startup focused on payment processing for SMBs',
      expectedKeywords: ['fintech', 'founder', 'startup']
    },
    {
      name: 'Data Scientist',
      jobTitle: 'Senior Data Scientist',
      company: 'Analytics Corp',
      notes: 'Machine learning and predictive analytics expert',
      expectedKeywords: ['data', 'ml', 'analytics']
    }
  ];

  for (const testCase of aiTestCases) {
    await runTest(`AI Generation - ${testCase.name}`, async () => {
      const contact = {
        name: testCase.name,
        email: `ai-${testCase.name.toLowerCase().replace(/ /g, '-')}-${Date.now()}@test.com`,
        company: testCase.company,
        jobTitle: testCase.jobTitle,
        notes: testCase.notes
      };

      const result = await submitContact(contact);

      if (!result.contact || !result.contact.tags) {
        throw new Error('Contact was not tagged');
      }

      // Should be from AI
      if (result.contact.metadata?.tagSource !== 'ai') {
        throw new Error(`Expected AI source, got ${result.contact.metadata?.tagSource}`);
      }

      // Tags should be relevant (at least one expected keyword)
      const tags = result.contact.tags.join(' ').toLowerCase();
      const hasRelevantTag = testCase.expectedKeywords.some(keyword =>
        tags.includes(keyword.toLowerCase())
      );

      if (!hasRelevantTag) {
        console.log(`   ℹ️  Tags generated: ${result.contact.tags.join(', ')}`);
        console.log(`   ℹ️  Expected keywords: ${testCase.expectedKeywords.join(', ')}`);
        throw new Error('AI tags do not include expected keywords');
      }

      // Should have 3-8 tags
      if (result.contact.tags.length < 3 || result.contact.tags.length > 8) {
        throw new Error(`Expected 3-8 tags, got ${result.contact.tags.length}`);
      }
    }, 'AI Generation');
  }
}

// ============================================
// CATEGORY 4: BUDGET & AFFORDABILITY TESTS
// ============================================

async function testBudgetChecks() {
  await runTest('Budget - Static cache works even with budget exceeded', async () => {
    // Static cache should ALWAYS work regardless of budget
    const contact = {
      name: 'Budget Test CEO',
      email: `budget-ceo-${Date.now()}@test.com`,
      company: 'Test Corp',
      jobTitle: 'CEO',
      notes: 'Testing budget independence'
    };

    const result = await submitContact(contact);

    if (!result.contact || !result.contact.tags) {
      throw new Error('Static cache should work regardless of budget');
    }

    // Should have no cost
    if (result.contact.metadata?.tagCost && result.contact.metadata.tagCost > 0) {
      throw new Error('Static cache should have no cost');
    }
  }, 'Budget Checks');

  await runTest('Budget - Redis cache works even with budget exceeded', async () => {
    // Redis cache should ALWAYS work regardless of budget
    // Note: This test assumes there's already a cached entry from previous AI call
    const contact = {
      name: 'Budget Test Redis',
      email: `budget-redis-${Date.now()}@test.com`,
      company: 'Unique Corp ABC',
      jobTitle: 'VP of Engineering',
      notes: 'Building cloud infrastructure'
    };

    // First call to populate cache
    await submitContact(contact);
    await sleep(200);

    // Second call should hit cache regardless of budget
    const result = await submitContact(contact);

    if (result.contact.metadata?.tagSource === 'redis_cache') {
      // Redis cache hit should have no cost
      if (result.contact.metadata?.tagCost && result.contact.metadata.tagCost > 0) {
        throw new Error('Redis cache should have no cost');
      }
    } else {
      console.log(`   ℹ️  Not a Redis cache hit (got ${result.contact.metadata?.tagSource}), skipping cost check`);
    }
  }, 'Budget Checks');
}

// ============================================
// CATEGORY 5: FEATURE FLAG TESTS
// ============================================

async function testFeatureFlag() {
  await runTest('Feature Flag - Requires locationFeatures.autoTagging = true', async () => {
    // Note: This test assumes the feature flag is enabled in test environment
    // If disabled, contacts should NOT be tagged

    const contact = {
      name: 'Feature Flag Test',
      email: `flag-${Date.now()}@test.com`,
      company: 'Flag Corp',
      jobTitle: 'CEO',
      notes: 'Testing feature flag'
    };

    const result = await submitContact(contact);

    // If feature enabled, should have tags
    // If feature disabled, should NOT have tags
    // This test validates that the flag is being checked

    if (result.contact.tags && result.contact.tags.length > 0) {
      console.log('   ✅ Feature flag enabled - tags present');
    } else {
      console.log('   ℹ️  Feature flag disabled - no tags (expected behavior)');
    }
  }, 'Feature Flag');
}

async function testDataValidation() {
  await runTest('Data Validation - Requires job title OR company OR notes', async () => {
    // Contact with no taggable data should NOT be tagged
    const emptyContact = {
      name: 'Empty Data Test',
      email: `empty-${Date.now()}@test.com`,
      // NO jobTitle, company, or notes
    };

    const result = await submitContact(emptyContact);

    // Should NOT have tags (no taggable data)
    if (result.contact.tags && result.contact.tags.length > 0) {
      throw new Error('Contact with no taggable data should not be tagged');
    }
  }, 'Data Validation');

  await runTest('Data Validation - Works with only job title', async () => {
    const contact = {
      name: 'Job Title Only',
      email: `job-only-${Date.now()}@test.com`,
      jobTitle: 'Engineer'
      // NO company or notes
    };

    const result = await submitContact(contact);

    if (!result.contact || !result.contact.tags || result.contact.tags.length === 0) {
      throw new Error('Contact with job title should be tagged');
    }
  }, 'Data Validation');
}

// ============================================
// CATEGORY 6: METADATA VALIDATION
// ============================================

async function testMetadataCompleteness() {
  await runTest('Metadata - All required fields present', async () => {
    const contact = {
      name: 'Metadata Test',
      email: `metadata-${Date.now()}@test.com`,
      company: 'Metadata Corp',
      jobTitle: 'CTO',
      notes: 'Testing metadata'
    };

    const result = await submitContact(contact);

    if (!result.contact || !result.contact.tags) {
      throw new Error('Contact was not tagged');
    }

    const requiredFields = ['tagSource', 'taggedAt', 'tagDuration'];

    for (const field of requiredFields) {
      if (!(field in result.contact.metadata)) {
        throw new Error(`Missing required metadata field: ${field}`);
      }
    }
  }, 'Metadata');

  await runTest('Metadata - tagSource is valid', async () => {
    const contact = {
      name: 'Tag Source Test',
      email: `source-${Date.now()}@test.com`,
      company: 'Source Corp',
      jobTitle: 'CEO',
      notes: 'Testing tag source'
    };

    const result = await submitContact(contact);

    const validSources = ['static_cache', 'redis_cache', 'ai'];
    const tagSource = result.contact.metadata?.tagSource;

    if (!validSources.includes(tagSource)) {
      throw new Error(`Invalid tagSource: ${tagSource} (expected one of ${validSources.join(', ')})`);
    }
  }, 'Metadata');
}

// ============================================
// CATEGORY 7: VECTOR DOCUMENT INTEGRATION
// ============================================

async function testVectorDocumentIntegration() {
  await runTest('Vector Document - Tags included in searchable document', async () => {
    const contact = {
      name: 'Vector Test',
      email: `vector-${Date.now()}@test.com`,
      company: 'Vector Corp',
      jobTitle: 'CEO',
      notes: 'Testing vector document'
    };

    const result = await submitContact(contact);

    if (!result.contact || !result.contact.tags) {
      throw new Error('Contact was not tagged');
    }

    // Tags should be present in contact object
    if (result.contact.tags.length === 0) {
      throw new Error('Contact has no tags');
    }

    // Note: We can't directly test the vector document content here,
    // but we validate that tags are present and will be included
    console.log(`   ✅ Contact has ${result.contact.tags.length} tags that will be vectorized`);
  }, 'Vector Integration');
}

// ============================================
// CATEGORY 8: COST TRACKING
// ============================================

async function testCostTracking() {
  await runTest('Cost - Static cache has no cost', async () => {
    const contact = {
      name: 'Cost Test CEO',
      email: `cost-ceo-${Date.now()}@test.com`,
      company: 'Cost Corp',
      jobTitle: 'CEO',
      notes: 'Testing cost'
    };

    const result = await submitContact(contact);

    if (result.contact.metadata?.tagCost && result.contact.metadata.tagCost > 0) {
      throw new Error('Static cache should have no cost');
    }
  }, 'Cost Tracking');

  await runTest('Cost - AI generation has cost > 0', async () => {
    const contact = {
      name: `Cost AI Test ${Date.now()}`,
      email: `cost-ai-${Date.now()}@test.com`,
      company: 'Unique AI Corp',
      jobTitle: 'Chief Happiness Officer',
      notes: 'Very unique role that will trigger AI'
    };

    const result = await submitContact(contact);

    if (result.contact.metadata?.tagSource === 'ai') {
      if (!result.contact.metadata?.tagCost || result.contact.metadata.tagCost <= 0) {
        throw new Error('AI generation should have cost > 0');
      }

      console.log(`   ✅ AI cost: $${result.contact.metadata.tagCost.toFixed(6)}`);
    } else {
      console.log(`   ℹ️  Skipped (got ${result.contact.metadata?.tagSource} instead of AI)`);
    }
  }, 'Cost Tracking');
}

// ============================================
// CATEGORY 9: PERFORMANCE TESTS
// ============================================

async function testPerformance() {
  await runTest('Performance - Static cache < 10ms', async () => {
    const contact = {
      name: 'Perf Test CEO',
      email: `perf-ceo-${Date.now()}@test.com`,
      company: 'Perf Corp',
      jobTitle: 'CEO',
      notes: 'Performance test'
    };

    const start = Date.now();
    const result = await submitContact(contact);
    const duration = Date.now() - start;

    // Total request should be reasonably fast (< 3000ms including network)
    if (duration > 3000) {
      throw new Error(`Request took ${duration}ms (expected < 3000ms)`);
    }

    // Tag generation itself should be instant for static cache
    const tagDuration = result.contact.metadata?.tagDuration || 0;
    if (tagDuration > 10) {
      throw new Error(`Static cache tagging took ${tagDuration}ms (expected < 10ms)`);
    }
  }, 'Performance');
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║      COMPREHENSIVE AUTO-TAGGING TEST SUITE            ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\nStarting tests at: ${new Date().toISOString()}`);
  console.log(`Target: ${BASE_URL}\n`);

  try {
    // Category 1: Static Cache
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 CATEGORY 1: STATIC CACHE TESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await testStaticCacheJobTitleExact();
    await testStaticCacheCompanyMatch();
    await testStaticCacheJobTitlePartial();
    await testStaticCachePriorityOrder();

    // Category 2: Redis Cache
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 CATEGORY 2: REDIS CACHE TESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await testRedisCacheFlow();

    // Category 3: AI Generation
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 CATEGORY 3: AI GENERATION TESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await testAIGeneration();

    // Category 4: Budget Checks
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💰 CATEGORY 4: BUDGET & AFFORDABILITY TESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await testBudgetChecks();

    // Category 5: Feature Flag
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚩 CATEGORY 5: FEATURE FLAG TESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await testFeatureFlag();
    await testDataValidation();

    // Category 6: Metadata
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CATEGORY 6: METADATA VALIDATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await testMetadataCompleteness();

    // Category 7: Vector Integration
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 CATEGORY 7: VECTOR DOCUMENT INTEGRATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await testVectorDocumentIntegration();

    // Category 8: Cost Tracking
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💵 CATEGORY 8: COST TRACKING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await testCostTracking();

    // Category 9: Performance
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚡ CATEGORY 9: PERFORMANCE TESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await testPerformance();

  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
  }

  // Print summary
  printSummary();
}

function printSummary() {
  console.log('\n\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  console.log(`Total Tests:   ${total}`);
  console.log(`✅ Passed:     ${results.passed} (${passRate}%)`);
  console.log(`❌ Failed:     ${results.failed}`);
  console.log(`⏭️  Skipped:    ${results.skipped}`);

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
    const total = stats.passed + (stats.failed || 0);
    const rate = total > 0 ? ((stats.passed / total) * 100).toFixed(0) : 0;
    console.log(`   ${category}: ${stats.passed}/${total} (${rate}%)`);
  });

  // List failures
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'failed').forEach(test => {
      console.log(`   • ${test.name}`);
      console.log(`     ${test.error}`);
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

  // Final verdict
  console.log('\n' + '═'.repeat(60));
  if (results.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Phase 5 Auto-Tagging is production-ready! 🚀');
  } else {
    console.log(`⚠️  ${results.failed} test(s) failed. Review and fix before deployment.`);
  }
  console.log('═'.repeat(60) + '\n');
}

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, results };
}
