/**
 * RGPD: Consent Category Tests
 *
 * Tests consent management for all logical consent categories:
 * - Essential (TERMS_OF_SERVICE, PRIVACY_POLICY)
 * - AI Features (AI_SEMANTIC_SEARCH, AI_AUTO_GROUPING, AI_BUSINESS_CARD_ENHANCEMENT)
 * - Analytics (ANALYTICS_BASIC, ANALYTICS_DETAILED, COOKIES_ANALYTICS)
 * - Communication (MARKETING_EMAILS, CONTACT_RECOMMENDATIONS)
 * - Personalization (PROFILE_PUBLIC, COOKIES_PERSONALIZATION)
 */

import {
  recordConsent,
  getUserConsents,
  getConsentHistory,
  hasConsent,
  batchGrantConsents,
  withdrawConsent,
  exportConsentData,
  CONSENT_TYPES,
  CONSENT_ACTIONS,
} from '../server/consentService.js';
import { createTestUser, deleteTestUser } from './testHelpers.js';

/**
 * Consent Categories - Logical grouping of consent types
 */
export const CONSENT_CATEGORIES = {
  ESSENTIAL: {
    name: 'Essential',
    description: 'Required for the application to function properly',
    types: [
      CONSENT_TYPES.TERMS_OF_SERVICE,
      CONSENT_TYPES.PRIVACY_POLICY,
    ],
  },
  AI_FEATURES: {
    name: 'AI Features',
    description: 'Artificial intelligence powered enhancements',
    types: [
      CONSENT_TYPES.AI_SEMANTIC_SEARCH,
      CONSENT_TYPES.AI_AUTO_GROUPING,
      CONSENT_TYPES.AI_BUSINESS_CARD_ENHANCEMENT,
    ],
  },
  ANALYTICS: {
    name: 'Analytics',
    description: 'Usage analytics and performance tracking',
    types: [
      CONSENT_TYPES.ANALYTICS_BASIC,
      CONSENT_TYPES.ANALYTICS_DETAILED,
      CONSENT_TYPES.COOKIES_ANALYTICS,
    ],
  },
  COMMUNICATION: {
    name: 'Communication',
    description: 'Email communications and recommendations',
    types: [
      CONSENT_TYPES.MARKETING_EMAILS,
      CONSENT_TYPES.CONTACT_RECOMMENDATIONS,
    ],
  },
  PERSONALIZATION: {
    name: 'Personalization',
    description: 'Personalized experience and profile settings',
    types: [
      CONSENT_TYPES.PROFILE_PUBLIC,
      CONSENT_TYPES.COOKIES_PERSONALIZATION,
    ],
  },
};

/**
 * Test Results Logger
 */
class TestLogger {
  constructor(testSuiteName) {
    this.testSuiteName = testSuiteName;
    this.results = [];
    this.startTime = Date.now();
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
    };

    const emoji = {
      SUCCESS: '✅',
      ERROR: '❌',
      INFO: 'ℹ️',
      WARNING: '⚠️',
      TEST_START: '🧪',
      TEST_END: '🏁',
    }[level] || '📝';

    console.log(`${emoji} [${this.testSuiteName}] ${message}`, data || '');
    this.results.push(logEntry);
  }

  success(message, data) {
    this.log('SUCCESS', message, data);
  }

  error(message, data) {
    this.log('ERROR', message, data);
  }

  info(message, data) {
    this.log('INFO', message, data);
  }

  warning(message, data) {
    this.log('WARNING', message, data);
  }

  testStart(testName) {
    this.log('TEST_START', `Starting test: ${testName}`);
  }

  testEnd(testName, passed) {
    this.log('TEST_END', `Test ${passed ? 'PASSED' : 'FAILED'}: ${testName}`);
  }

  getSummary() {
    const duration = Date.now() - this.startTime;
    const summary = {
      testSuite: this.testSuiteName,
      duration: `${duration}ms`,
      totalLogs: this.results.length,
      successCount: this.results.filter(r => r.level === 'SUCCESS').length,
      errorCount: this.results.filter(r => r.level === 'ERROR').length,
      results: this.results,
    };
    return summary;
  }
}

/**
 * Test Suite: Consent Category Management
 */
export async function runConsentCategoryTests(testUserId = 'test-user-consent-categories-001') {
  const logger = new TestLogger('Consent Categories');
  const testResults = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  logger.info('🚀 Starting Consent Category Management Test Suite', {
    userId: testUserId,
    timestamp: new Date().toISOString(),
    categories: Object.keys(CONSENT_CATEGORIES).length,
  });

  // Create test user before running tests
  try {
    logger.info('Creating test user for consent category tests');
    await createTestUser(testUserId);
    logger.success('Test user created successfully');
  } catch (error) {
    logger.error('Failed to create test user', { error: error.message });
  }

  // Test 1: Grant All Essential Consents
  try {
    logger.testStart('Test 1: Grant All Essential Category Consents');
    logger.info('WHY: Essential consents are required for app to function');
    logger.info('HOW: Batch grant TERMS_OF_SERVICE and PRIVACY_POLICY');
    logger.info('WHAT: Expect both essential consents to be granted');

    const result = await batchGrantConsents(
      testUserId,
      CONSENT_CATEGORIES.ESSENTIAL.types,
      {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      }
    );

    if (result.success && result.count === CONSENT_CATEGORIES.ESSENTIAL.types.length) {
      logger.success('✓ All Essential consents granted', {
        count: result.count,
        types: CONSENT_CATEGORIES.ESSENTIAL.types,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Grant Essential Category', passed: true });
      logger.testEnd('Test 1', true);
    } else {
      throw new Error('Failed to grant all Essential consents');
    }
  } catch (error) {
    logger.error('✗ Test 1 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Grant Essential Category', passed: false, error: error.message });
    logger.testEnd('Test 1', false);
  }

  // Test 2: Grant All AI Features Consents
  try {
    logger.testStart('Test 2: Grant All AI Features Category Consents');
    logger.info('WHY: Users should be able to enable all AI features at once');
    logger.info('HOW: Batch grant all 3 AI feature consents');
    logger.info('WHAT: Expect AI_SEMANTIC_SEARCH, AI_AUTO_GROUPING, AI_BUSINESS_CARD_ENHANCEMENT granted');

    const result = await batchGrantConsents(
      testUserId,
      CONSENT_CATEGORIES.AI_FEATURES.types,
      {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      }
    );

    if (result.success && result.count === CONSENT_CATEGORIES.AI_FEATURES.types.length) {
      logger.success('✓ All AI Features consents granted', {
        count: result.count,
        types: CONSENT_CATEGORIES.AI_FEATURES.types,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Grant AI Features Category', passed: true });
      logger.testEnd('Test 2', true);
    } else {
      throw new Error('Failed to grant all AI Features consents');
    }
  } catch (error) {
    logger.error('✗ Test 2 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Grant AI Features Category', passed: false, error: error.message });
    logger.testEnd('Test 2', false);
  }

  // Test 3: Grant All Analytics Consents
  try {
    logger.testStart('Test 3: Grant All Analytics Category Consents');
    logger.info('WHY: Users should be able to enable all analytics tracking');
    logger.info('HOW: Batch grant ANALYTICS_BASIC, ANALYTICS_DETAILED, COOKIES_ANALYTICS');
    logger.info('WHAT: Expect all 3 analytics consents to be granted');

    const result = await batchGrantConsents(
      testUserId,
      CONSENT_CATEGORIES.ANALYTICS.types,
      {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      }
    );

    if (result.success && result.count === CONSENT_CATEGORIES.ANALYTICS.types.length) {
      logger.success('✓ All Analytics consents granted', {
        count: result.count,
        types: CONSENT_CATEGORIES.ANALYTICS.types,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Grant Analytics Category', passed: true });
      logger.testEnd('Test 3', true);
    } else {
      throw new Error('Failed to grant all Analytics consents');
    }
  } catch (error) {
    logger.error('✗ Test 3 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Grant Analytics Category', passed: false, error: error.message });
    logger.testEnd('Test 3', false);
  }

  // Test 4: Grant All Communication Consents
  try {
    logger.testStart('Test 4: Grant All Communication Category Consents');
    logger.info('WHY: Users should be able to enable all communication preferences');
    logger.info('HOW: Batch grant MARKETING_EMAILS and CONTACT_RECOMMENDATIONS');
    logger.info('WHAT: Expect both communication consents to be granted');

    const result = await batchGrantConsents(
      testUserId,
      CONSENT_CATEGORIES.COMMUNICATION.types,
      {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      }
    );

    if (result.success && result.count === CONSENT_CATEGORIES.COMMUNICATION.types.length) {
      logger.success('✓ All Communication consents granted', {
        count: result.count,
        types: CONSENT_CATEGORIES.COMMUNICATION.types,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Grant Communication Category', passed: true });
      logger.testEnd('Test 4', true);
    } else {
      throw new Error('Failed to grant all Communication consents');
    }
  } catch (error) {
    logger.error('✗ Test 4 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Grant Communication Category', passed: false, error: error.message });
    logger.testEnd('Test 4', false);
  }

  // Test 5: Grant All Personalization Consents
  try {
    logger.testStart('Test 5: Grant All Personalization Category Consents');
    logger.info('WHY: Users should be able to enable personalization features');
    logger.info('HOW: Batch grant PROFILE_PUBLIC and COOKIES_PERSONALIZATION');
    logger.info('WHAT: Expect both personalization consents to be granted');

    const result = await batchGrantConsents(
      testUserId,
      CONSENT_CATEGORIES.PERSONALIZATION.types,
      {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      }
    );

    if (result.success && result.count === CONSENT_CATEGORIES.PERSONALIZATION.types.length) {
      logger.success('✓ All Personalization consents granted', {
        count: result.count,
        types: CONSENT_CATEGORIES.PERSONALIZATION.types,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Grant Personalization Category', passed: true });
      logger.testEnd('Test 5', true);
    } else {
      throw new Error('Failed to grant all Personalization consents');
    }
  } catch (error) {
    logger.error('✗ Test 5 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Grant Personalization Category', passed: false, error: error.message });
    logger.testEnd('Test 5', false);
  }

  // Test 6: Verify All Consents Are Granted
  try {
    logger.testStart('Test 6: Verify All 12 Consent Types Are Granted');
    logger.info('WHY: Ensure all consents across all categories are correctly stored');
    logger.info('HOW: Call getUserConsents and check all 12 consent types');
    logger.info('WHAT: Expect all 12 consents to have status = true');

    const result = await getUserConsents(testUserId);
    const allTypes = Object.values(CONSENT_CATEGORIES).flatMap(cat => cat.types);
    const allGranted = allTypes.every(type => result.consents[type]?.status === true);

    if (result.success && allGranted) {
      logger.success('✓ All 12 consent types verified as granted', {
        totalConsents: Object.keys(result.consents).length,
        allGranted: true,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Verify All Consents Granted', passed: true });
      logger.testEnd('Test 6', true);
    } else {
      throw new Error('Not all consents are granted');
    }
  } catch (error) {
    logger.error('✗ Test 6 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Verify All Consents Granted', passed: false, error: error.message });
    logger.testEnd('Test 6', false);
  }

  // Test 7: Withdraw Entire AI Features Category
  try {
    logger.testStart('Test 7: Withdraw Entire AI Features Category');
    logger.info('WHY: Users should be able to disable all AI features at once');
    logger.info('HOW: Withdraw all 3 AI feature consents individually');
    logger.info('WHAT: Expect all AI consents to be withdrawn (status = false)');

    for (const type of CONSENT_CATEGORIES.AI_FEATURES.types) {
      await withdrawConsent(testUserId, type, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      });
    }

    // Verify all AI consents are withdrawn
    const aiSearchStatus = await hasConsent(testUserId, CONSENT_TYPES.AI_SEMANTIC_SEARCH);
    const aiGroupingStatus = await hasConsent(testUserId, CONSENT_TYPES.AI_AUTO_GROUPING);
    const aiCardStatus = await hasConsent(testUserId, CONSENT_TYPES.AI_BUSINESS_CARD_ENHANCEMENT);

    if (aiSearchStatus === false && aiGroupingStatus === false && aiCardStatus === false) {
      logger.success('✓ AI Features category fully withdrawn', {
        aiSemanticSearch: false,
        aiAutoGrouping: false,
        aiBusinessCardEnhancement: false,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Withdraw AI Features Category', passed: true });
      logger.testEnd('Test 7', true);
    } else {
      throw new Error('Failed to withdraw all AI Features consents');
    }
  } catch (error) {
    logger.error('✗ Test 7 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Withdraw AI Features Category', passed: false, error: error.message });
    logger.testEnd('Test 7', false);
  }

  // Test 8: Verify Mixed Consent States
  try {
    logger.testStart('Test 8: Verify Mixed Consent States Across Categories');
    logger.info('WHY: System must handle different consent states for different categories');
    logger.info('HOW: Check that AI Features are withdrawn while others remain granted');
    logger.info('WHAT: Expect AI=false, Essential/Analytics/Communication/Personalization=true');

    const consents = await getUserConsents(testUserId);

    const aiWithdrawn = CONSENT_CATEGORIES.AI_FEATURES.types.every(
      type => consents.consents[type]?.status === false
    );
    const essentialGranted = CONSENT_CATEGORIES.ESSENTIAL.types.every(
      type => consents.consents[type]?.status === true
    );
    const analyticsGranted = CONSENT_CATEGORIES.ANALYTICS.types.every(
      type => consents.consents[type]?.status === true
    );

    if (aiWithdrawn && essentialGranted && analyticsGranted) {
      logger.success('✓ Mixed consent states working correctly', {
        aiFeatures: 'withdrawn',
        essential: 'granted',
        analytics: 'granted',
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Verify Mixed Consent States', passed: true });
      logger.testEnd('Test 8', true);
    } else {
      throw new Error('Mixed consent states not working correctly');
    }
  } catch (error) {
    logger.error('✗ Test 8 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Verify Mixed Consent States', passed: false, error: error.message });
    logger.testEnd('Test 8', false);
  }

  // Test 9: Consent History for All Categories
  try {
    logger.testStart('Test 9: Verify Consent History Covers All Categories');
    logger.info('WHY: GDPR requires complete audit trail of all consent changes');
    logger.info('HOW: Get consent history and verify it includes entries for all categories');
    logger.info('WHAT: Expect history to contain grants for all 12 types + 3 withdrawals for AI');

    const result = await getConsentHistory(testUserId, { limit: 100 });

    // Should have 12 grants + 3 withdrawals = 15 entries minimum
    const hasEnoughEntries = result.count >= 15;
    const hasAIWithdrawals = result.history.some(
      entry => entry.action === CONSENT_ACTIONS.WITHDRAWN &&
               CONSENT_CATEGORIES.AI_FEATURES.types.includes(entry.consentType)
    );

    if (result.success && hasEnoughEntries && hasAIWithdrawals) {
      logger.success('✓ Complete consent history verified', {
        totalEntries: result.count,
        includesWithdrawals: hasAIWithdrawals,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Consent History All Categories', passed: true });
      logger.testEnd('Test 9', true);
    } else {
      throw new Error('Consent history incomplete');
    }
  } catch (error) {
    logger.error('✗ Test 9 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Consent History All Categories', passed: false, error: error.message });
    logger.testEnd('Test 9', false);
  }

  // Test 10: Export Data Includes All Category Consents
  try {
    logger.testStart('Test 10: Export Data Contains All Category Consents');
    logger.info('WHY: Data portability must include all consent information');
    logger.info('HOW: Export consent data and verify all categories are represented');
    logger.info('WHAT: Expect export to contain current status for all 12 consent types');

    const exportData = await exportConsentData(testUserId);
    const allTypesPresent = Object.values(CONSENT_CATEGORIES)
      .flatMap(cat => cat.types)
      .every(type => type in exportData.currentConsents);

    if (exportData.currentConsents && allTypesPresent && exportData.history.length >= 15) {
      logger.success('✓ Export contains all category consents', {
        consentTypes: Object.keys(exportData.currentConsents).length,
        historyEntries: exportData.history.length,
        categories: Object.keys(CONSENT_CATEGORIES).length,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Export All Category Consents', passed: true });
      logger.testEnd('Test 10', true);
    } else {
      throw new Error('Export missing consent data');
    }
  } catch (error) {
    logger.error('✗ Test 10 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Export All Category Consents', passed: false, error: error.message });
    logger.testEnd('Test 10', false);
  }

  // Test 11: Re-grant Previously Withdrawn AI Features
  try {
    logger.testStart('Test 11: Re-grant Previously Withdrawn AI Features Category');
    logger.info('WHY: Users should be able to re-enable features they previously disabled');
    logger.info('HOW: Batch grant AI Features consents again');
    logger.info('WHAT: Expect AI consents to be granted again with new log entries');

    const result = await batchGrantConsents(
      testUserId,
      CONSENT_CATEGORIES.AI_FEATURES.types,
      {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      }
    );

    // Verify re-grant worked
    const aiSearchStatus = await hasConsent(testUserId, CONSENT_TYPES.AI_SEMANTIC_SEARCH);

    if (result.success && aiSearchStatus === true) {
      logger.success('✓ AI Features successfully re-granted', {
        count: result.count,
        aiSemanticSearch: aiSearchStatus,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Re-grant AI Features', passed: true });
      logger.testEnd('Test 11', true);
    } else {
      throw new Error('Failed to re-grant AI Features');
    }
  } catch (error) {
    logger.error('✗ Test 11 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Re-grant AI Features', passed: false, error: error.message });
    logger.testEnd('Test 11', false);
  }

  // Test 12: Category-Based Consent Check Helper
  try {
    logger.testStart('Test 12: Check If Entire Category Is Enabled');
    logger.info('WHY: App needs to know if all consents in a category are granted');
    logger.info('HOW: Check if all AI Features consents are granted');
    logger.info('WHAT: Expect all AI Features to return true');

    const consents = await getUserConsents(testUserId);
    const aiCategoryFullyEnabled = CONSENT_CATEGORIES.AI_FEATURES.types.every(
      type => consents.consents[type]?.status === true
    );
    const analyticsCategoryFullyEnabled = CONSENT_CATEGORIES.ANALYTICS.types.every(
      type => consents.consents[type]?.status === true
    );

    if (aiCategoryFullyEnabled && analyticsCategoryFullyEnabled) {
      logger.success('✓ Category-level consent check working', {
        aiFeatures: 'fully enabled',
        analytics: 'fully enabled',
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Category-Based Consent Check', passed: true });
      logger.testEnd('Test 12', true);
    } else {
      throw new Error('Category-level check failed');
    }
  } catch (error) {
    logger.error('✗ Test 12 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Category-Based Consent Check', passed: false, error: error.message });
    logger.testEnd('Test 12', false);
  }

  // Cleanup test user
  try {
    logger.info('🧹 Cleanup: Deleting test user');
    await deleteTestUser(testUserId);
    logger.info('✓ Cleanup complete');
  } catch (error) {
    logger.warning('Cleanup failed', { error: error.message });
  }

  // Final Summary
  const summary = logger.getSummary();
  logger.info('🏁 Test Suite Complete', {
    passed: testResults.passed,
    failed: testResults.failed,
    total: testResults.passed + testResults.failed,
    successRate: `${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`,
  });

  return {
    success: testResults.failed === 0,
    summary: testResults,
    logs: summary,
  };
}
