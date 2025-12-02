// tests/semanticSearch.utils.js
// Shared utilities for semantic search test suite

/**
 * USAGE:
 * const { TEST_CONFIG, TestRunner, searchContacts, delay } = require('./semanticSearch.utils');
 */

// ============================================
// CONFIGURATION
// ============================================
const TEST_CONFIG = {
  userId: process.env.TEST_USER_ID || 'IFxPCgSA8NapEq5W8jh6yHrtJGJ2',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Rate limiting - Cohere trial key limited to 10 API calls/minute
  rateLimitDelay: 7000,  // 7 seconds between tests

  // Timeouts
  requestTimeout: 30000,  // 30 seconds for API requests

  // Static cache keys (from commonContactTags.js)
  staticCacheKeys: [
    // Executive roles - English
    'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CISO', 'CIO', 'CPO', 'CHRO', 'CDO',
    // Executive roles - French
    'PDG', 'DG', 'DAF', 'DRH', 'DSI',
    // Common roles - English
    'founder', 'engineer', 'manager', 'developer', 'designer', 'analyst', 'consultant', 'director', 'VP', 'lead',
    // Common roles - French
    'fondateur', 'ingénieur', 'développeur', 'responsable', 'directeur',
    // Technologies
    'AI', 'blockchain', 'cloud', 'data science', 'cybersecurity', 'fintech', 'marketing', 'sales', 'product', 'startup',
    // Programming
    'javascript', 'python', 'java', 'react', 'nodejs',
    // Industries
    'healthcare', 'ecommerce', 'education', 'real estate', 'logistics'
  ]
};

// ============================================
// TEST RUNNER CLASS
// ============================================
class TestRunner {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
    this.startTime = Date.now();
  }

  async runTest(name, testFn, options = {}) {
    const { skip = false, category = 'General' } = options;
    const testStart = Date.now();

    if (skip) {
      console.log(`\n⏭️  SKIPPED: ${name}`);
      this.results.skipped++;
      this.results.tests.push({ name, status: 'skipped', duration: 0, category });
      return;
    }

    try {
      console.log(`\n🧪 Running: ${name}`);
      await testFn();
      const duration = Date.now() - testStart;
      console.log(`✅ PASSED (${duration}ms): ${name}`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'passed', duration, category });
    } catch (error) {
      const duration = Date.now() - testStart;
      console.error(`❌ FAILED (${duration}ms): ${name}`);
      console.error(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'failed', duration, category, error: error.message });
    }
  }

  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const total = this.results.passed + this.results.failed + this.results.skipped;
    const passRate = total > 0 ? ((this.results.passed / (total - this.results.skipped)) * 100).toFixed(1) : 0;

    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log(`║  ${this.suiteName.padEnd(60)}║`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Total Tests:   ${total}`);
    console.log(`✅ Passed:     ${this.results.passed} (${passRate}%)`);
    console.log(`❌ Failed:     ${this.results.failed}`);
    console.log(`⏭️  Skipped:    ${this.results.skipped}`);
    console.log(`⏱️  Duration:   ${(totalDuration / 1000).toFixed(1)}s`);

    // List failures
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests.filter(t => t.status === 'failed').forEach(test => {
        console.log(`   • ${test.name}`);
        console.log(`     Error: ${test.error}`);
      });
    }

    // Final verdict
    console.log('\n' + '═'.repeat(68));
    if (this.results.failed === 0) {
      console.log(`🎉 ALL TESTS PASSED! (${this.suiteName})`);
    } else {
      console.log(`⚠️  ${this.results.failed} test(s) failed.`);
    }
    console.log('═'.repeat(68) + '\n');

    return this.results;
  }

  printHeader() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log(`║  ${this.suiteName.padEnd(60)}║`);
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`\nStarting tests at: ${new Date().toISOString()}`);
    console.log(`API Target: ${TEST_CONFIG.baseUrl}`);
    console.log(`Test User: ${TEST_CONFIG.userId}`);
    console.log(`\n${'─'.repeat(70)}\n`);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Make semantic search API request
 */
async function searchContacts(query, options = {}) {
  const {
    enhanceQuery = true,
    disableQueryTags = false,
    minVectorScore = null,
    minRerankScore = null,
    maxResults = 10,
    trackSteps = true,
    includeRerank = true,
    userId = TEST_CONFIG.userId
  } = options;

  const response = await fetch(
    `${TEST_CONFIG.baseUrl}/api/test/semantic-search`,
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
        userId
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

/**
 * Delay helper for rate limiting
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate unique query to ensure cache miss
 */
function generateUniqueQuery(prefix = 'test') {
  return `${prefix} ${Date.now()} ${Math.random().toString(36).substr(2, 4)}`;
}

/**
 * Assert helpers
 */
const assert = {
  equals(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  },

  true(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed: condition is not true');
    }
  },

  false(condition, message) {
    if (condition) {
      throw new Error(message || 'Assertion failed: condition is not false');
    }
  },

  exists(value, message) {
    if (value === null || value === undefined) {
      throw new Error(message || 'Assertion failed: value does not exist');
    }
  },

  greaterThan(actual, expected, message) {
    if (actual <= expected) {
      throw new Error(`${message}: expected > ${expected}, got ${actual}`);
    }
  },

  lessThan(actual, expected, message) {
    if (actual >= expected) {
      throw new Error(`${message}: expected < ${expected}, got ${actual}`);
    }
  },

  greaterThanOrEqual(actual, expected, message) {
    if (actual < expected) {
      throw new Error(`${message}: expected >= ${expected}, got ${actual}`);
    }
  },

  includes(arr, item, message) {
    if (!arr || !arr.includes(item)) {
      throw new Error(`${message}: array does not include ${item}`);
    }
  },

  isArray(value, message) {
    if (!Array.isArray(value)) {
      throw new Error(message || 'Assertion failed: value is not an array');
    }
  },

  isNumber(value, message) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`${message}: expected number, got ${typeof value}`);
    }
  },

  isObject(value, message) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(message || 'Assertion failed: value is not an object');
    }
  },

  hasProperty(obj, prop, message) {
    if (!obj || !(prop in obj)) {
      throw new Error(`${message}: object does not have property '${prop}'`);
    }
  },

  inRange(value, min, max, message) {
    if (value < min || value > max) {
      throw new Error(`${message}: ${value} is not in range [${min}, ${max}]`);
    }
  }
};

/**
 * Cost assertion helpers
 */
const assertCost = {
  isZero(costs, step, message) {
    const cost = costs?.[step] || 0;
    if (cost !== 0) {
      throw new Error(`${message || `Cost for ${step} should be $0`}: got $${cost.toFixed(6)}`);
    }
  },

  isGreaterThanZero(costs, step, message) {
    const cost = costs?.[step] || 0;
    if (cost <= 0) {
      throw new Error(`${message || `Cost for ${step} should be > $0`}: got $${cost.toFixed(6)}`);
    }
  },

  isLessThan(costs, step, maxCost, message) {
    const cost = costs?.[step] || 0;
    if (cost >= maxCost) {
      throw new Error(`${message || `Cost for ${step} should be < $${maxCost}`}: got $${cost.toFixed(6)}`);
    }
  }
};

/**
 * Cache type assertion helpers
 */
const assertCacheType = {
  isStatic(metadata, message) {
    const cacheType = metadata?.queryEnhancement?.cacheType || metadata?.cacheType;
    if (cacheType !== 'static') {
      throw new Error(`${message || 'Expected static cache'}: got '${cacheType}'`);
    }
  },

  isRedis(metadata, message) {
    const cacheType = metadata?.queryEnhancement?.cacheType || metadata?.cacheType;
    if (cacheType !== 'redis') {
      throw new Error(`${message || 'Expected redis cache'}: got '${cacheType}'`);
    }
  },

  isGemini(metadata, message) {
    const cacheType = metadata?.queryEnhancement?.cacheType || metadata?.cacheType;
    if (cacheType !== 'gemini' && cacheType !== 'ai') {
      throw new Error(`${message || 'Expected gemini/ai'}: got '${cacheType}'`);
    }
  },

  isCached(metadata, message) {
    const cached = metadata?.queryEnhancement?.cached;
    if (!cached) {
      throw new Error(message || 'Expected cache hit, got miss');
    }
  },

  isNotCached(metadata, message) {
    const cached = metadata?.queryEnhancement?.cached;
    if (cached) {
      throw new Error(message || 'Expected cache miss, got hit');
    }
  }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  TEST_CONFIG,
  TestRunner,
  searchContacts,
  delay,
  generateUniqueQuery,
  assert,
  assertCost,
  assertCacheType
};
