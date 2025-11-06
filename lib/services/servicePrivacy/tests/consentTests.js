/**
 * RGPD Phase 1-2: Consent Management Tests
 *
 * Tests all consent management functionality:
 * - Granting consent
 * - Withdrawing consent
 * - Batch consent operations
 * - Consent history tracking
 * - Consent export
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
 * Test Suite: Consent Management
 */
export async function runConsentTests(testUserId = 'test-user-consent-001') {
  const logger = new TestLogger('Consent Management');
  const testResults = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  logger.info('🚀 Starting Consent Management Test Suite', {
    userId: testUserId,
    timestamp: new Date().toISOString(),
  });

  // Create test user before running tests
  try {
    logger.info('Creating test user for consent tests');
    await createTestUser(testUserId);
    logger.success('Test user created successfully');
  } catch (error) {
    logger.error('Failed to create test user', { error: error.message });
  }

  // Test 1: Grant Individual Consent
  try {
    logger.testStart('Test 1: Grant Marketing Email Consent');
    logger.info('WHY: Users must be able to grant consent for marketing emails');
    logger.info('HOW: Call recordConsent with MARKETING_EMAILS type and GRANTED action');
    logger.info('WHAT: Expect success response with consent log ID');

    const result = await recordConsent(
      testUserId,
      CONSENT_TYPES.MARKETING_EMAILS,
      CONSENT_ACTIONS.GRANTED,
      {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        consentText: 'I agree to receive marketing emails',
        version: '1.0',
      }
    );

    if (result.success && result.logId) {
      logger.success('✓ Consent granted successfully', {
        logId: result.logId,
        consentType: CONSENT_TYPES.MARKETING_EMAILS,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Grant Individual Consent', passed: true });
      logger.testEnd('Test 1', true);
    } else {
      throw new Error('Failed to grant consent');
    }
  } catch (error) {
    logger.error('✗ Test 1 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Grant Individual Consent', passed: false, error: error.message });
    logger.testEnd('Test 1', false);
  }

  // Test 2: Verify Consent Status
  try {
    logger.testStart('Test 2: Verify Consent Status');
    logger.info('WHY: Users should be able to check their current consent status');
    logger.info('HOW: Call getUserConsents to retrieve all consent statuses');
    logger.info('WHAT: Expect marketing_emails to be true, others to be false');

    const result = await getUserConsents(testUserId);

    if (result.success && result.consents[CONSENT_TYPES.MARKETING_EMAILS].status === true) {
      logger.success('✓ Consent status verified', {
        marketingEmails: result.consents[CONSENT_TYPES.MARKETING_EMAILS],
        totalConsents: Object.keys(result.consents).length,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Verify Consent Status', passed: true });
      logger.testEnd('Test 2', true);
    } else {
      throw new Error('Consent status mismatch');
    }
  } catch (error) {
    logger.error('✗ Test 2 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Verify Consent Status', passed: false, error: error.message });
    logger.testEnd('Test 2', false);
  }

  // Test 3: Check Specific Consent
  try {
    logger.testStart('Test 3: Check Specific Consent (hasConsent)');
    logger.info('WHY: Quick check if user has granted a specific consent');
    logger.info('HOW: Call hasConsent with consent type');
    logger.info('WHAT: Expect true for granted consent, false for others');

    const hasMarketing = await hasConsent(testUserId, CONSENT_TYPES.MARKETING_EMAILS);
    const hasAnalytics = await hasConsent(testUserId, CONSENT_TYPES.ANALYTICS_DETAILED);

    if (hasMarketing === true && hasAnalytics === false) {
      logger.success('✓ Specific consent check working', {
        marketingEmails: hasMarketing,
        analyticsDetailed: hasAnalytics,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Check Specific Consent', passed: true });
      logger.testEnd('Test 3', true);
    } else {
      throw new Error('Consent check returned incorrect values');
    }
  } catch (error) {
    logger.error('✗ Test 3 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Check Specific Consent', passed: false, error: error.message });
    logger.testEnd('Test 3', false);
  }

  // Test 4: Batch Grant Consents
  try {
    logger.testStart('Test 4: Batch Grant Multiple Consents');
    logger.info('WHY: During signup, users often grant multiple consents at once');
    logger.info('HOW: Call batchGrantConsents with array of consent types');
    logger.info('WHAT: Expect all consents to be granted successfully');

    const consentsToGrant = [
      CONSENT_TYPES.TERMS_OF_SERVICE,
      CONSENT_TYPES.PRIVACY_POLICY,
      CONSENT_TYPES.ANALYTICS_BASIC,
    ];

    const result = await batchGrantConsents(testUserId, consentsToGrant, {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 Test Browser',
    });

    if (result.success && result.count === 3) {
      logger.success('✓ Batch consent grant successful', {
        count: result.count,
        consents: consentsToGrant,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Batch Grant Consents', passed: true });
      logger.testEnd('Test 4', true);
    } else {
      throw new Error('Batch consent grant failed');
    }
  } catch (error) {
    logger.error('✗ Test 4 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Batch Grant Consents', passed: false, error: error.message });
    logger.testEnd('Test 4', false);
  }

  // Test 5: Get Consent History
  try {
    logger.testStart('Test 5: Retrieve Consent History');
    logger.info('WHY: GDPR requires maintaining audit trail of consent changes');
    logger.info('HOW: Call getConsentHistory to get all consent logs');
    logger.info('WHAT: Expect at least 4 consent log entries (1 individual + 3 batch)');

    const result = await getConsentHistory(testUserId, { limit: 100 });

    if (result.success && result.count >= 4) {
      logger.success('✓ Consent history retrieved', {
        totalEntries: result.count,
        sample: result.history[0],
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Get Consent History', passed: true });
      logger.testEnd('Test 5', true);
    } else {
      throw new Error('Consent history incomplete');
    }
  } catch (error) {
    logger.error('✗ Test 5 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Get Consent History', passed: false, error: error.message });
    logger.testEnd('Test 5', false);
  }

  // Test 6: Withdraw Consent
  try {
    logger.testStart('Test 6: Withdraw Consent (Right to Withdraw - Art. 7.3)');
    logger.info('WHY: Users must be able to withdraw consent as easily as granting it');
    logger.info('HOW: Call withdrawConsent to revoke marketing email consent');
    logger.info('WHAT: Expect consent to be withdrawn and status updated to false');

    const result = await withdrawConsent(testUserId, CONSENT_TYPES.MARKETING_EMAILS, {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 Test Browser',
    });

    // Verify withdrawal
    const hasMarketing = await hasConsent(testUserId, CONSENT_TYPES.MARKETING_EMAILS);

    if (result.success && hasMarketing === false) {
      logger.success('✓ Consent withdrawn successfully', {
        consentType: CONSENT_TYPES.MARKETING_EMAILS,
        newStatus: false,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Withdraw Consent', passed: true });
      logger.testEnd('Test 6', true);
    } else {
      throw new Error('Consent withdrawal failed');
    }
  } catch (error) {
    logger.error('✗ Test 6 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Withdraw Consent', passed: false, error: error.message });
    logger.testEnd('Test 6', false);
  }

  // Test 7: Export Consent Data
  try {
    logger.testStart('Test 7: Export All Consent Data');
    logger.info('WHY: Users have right to receive all their consent data');
    logger.info('HOW: Call exportConsentData to get complete consent package');
    logger.info('WHAT: Expect current consents + full history');

    const result = await exportConsentData(testUserId);

    if (result.currentConsents && result.history && result.exportDate) {
      logger.success('✓ Consent data exported', {
        currentConsentsCount: Object.keys(result.currentConsents).length,
        historyCount: result.history.length,
        exportDate: result.exportDate,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Export Consent Data', passed: true });
      logger.testEnd('Test 7', true);
    } else {
      throw new Error('Consent export incomplete');
    }
  } catch (error) {
    logger.error('✗ Test 7 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Export Consent Data', passed: false, error: error.message });
    logger.testEnd('Test 7', false);
  }

  // Test 8: Invalid Consent Type
  try {
    logger.testStart('Test 8: Reject Invalid Consent Type');
    logger.info('WHY: System must validate consent types to maintain data integrity');
    logger.info('HOW: Attempt to record consent with invalid type');
    logger.info('WHAT: Expect error to be thrown');

    let errorThrown = false;
    try {
      await recordConsent(testUserId, 'INVALID_CONSENT_TYPE', CONSENT_ACTIONS.GRANTED, {});
    } catch (err) {
      errorThrown = true;
    }

    if (errorThrown) {
      logger.success('✓ Invalid consent type correctly rejected');
      testResults.passed++;
      testResults.tests.push({ name: 'Reject Invalid Consent Type', passed: true });
      logger.testEnd('Test 8', true);
    } else {
      throw new Error('Invalid consent type was not rejected');
    }
  } catch (error) {
    logger.error('✗ Test 8 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Reject Invalid Consent Type', passed: false, error: error.message });
    logger.testEnd('Test 8', false);
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
