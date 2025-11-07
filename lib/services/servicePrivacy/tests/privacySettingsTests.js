/**
 * RGPD: Privacy Settings Tests
 *
 * Tests privacy settings management:
 * - Profile visibility (isPublic)
 * - Messaging settings (allowMessages)
 * - Notification preferences (email, push)
 * - Settings persistence and retrieval
 */

import { adminDb } from '../../../firebaseAdmin.js';
import { createTestUser, deleteTestUser } from './testHelpers.js';

// Direct database access for settings operations (bypassing Next.js API)
const db = adminDb;

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

    console.log(`${emoji} [${level}] ${message}`);
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }

    this.results.push(logEntry);
  }

  logTestStart(testName, testNumber, totalTests) {
    console.log('\n' + '='.repeat(80));
    console.log(`🧪 TEST ${testNumber}/${totalTests}: ${testName}`);
    console.log('='.repeat(80));
    this.log('TEST_START', `Starting test: ${testName}`);
  }

  logTestEnd(testName, success, error = null) {
    const status = success ? '✅ PASSED' : '❌ FAILED';
    console.log(`\n${status}: ${testName}`);
    if (error) {
      console.log(`Error: ${error.message}`);
    }
    console.log('='.repeat(80));
    this.log('TEST_END', `Test ${success ? 'passed' : 'failed'}: ${testName}`, { error });
  }

  getSummary() {
    const duration = Date.now() - this.startTime;
    const passed = this.results.filter((r) => r.level === 'TEST_END' && !r.data?.error).length;
    const failed = this.results.filter((r) => r.level === 'TEST_END' && r.data?.error).length;

    return {
      testSuite: this.testSuiteName,
      duration: `${(duration / 1000).toFixed(2)}s`,
      total: passed + failed,
      passed,
      failed,
      successRate: `${((passed / (passed + failed)) * 100).toFixed(2)}%`,
      results: this.results,
    };
  }
}

/**
 * Privacy Settings Test Suite
 */
export async function runPrivacySettingsTests(userId) {
  const logger = new TestLogger('Privacy Settings Tests');
  const testResults = {
    userId,
    tests: [],
  };

  let testUserId = userId;
  const totalTests = 8;
  let userCreated = false;

  try {
    // Always create test user for privacy settings tests
    if (!userId) {
      testUserId = `test-privacy-settings-${Date.now()}`;
    }

    logger.log('INFO', 'Creating test user for Privacy Settings tests...');
    await createTestUser(testUserId, {
      settings: {
        isPublic: true,
        allowMessages: true,
        notifications: {
          email: true,
          push: true,
        },
      },
    });
    userCreated = true;
    logger.log('SUCCESS', `Test user created: ${testUserId}`);

    // Test 1: Get Initial Privacy Settings
    await runTest(
      logger,
      testResults,
      1,
      totalTests,
      'Get Initial Privacy Settings',
      'Retrieve current privacy settings for user',
      'Verify that settings can be fetched and contain expected fields',
      async () => {
        const userDoc = await db.collection('users').doc(testUserId).get();
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const settingsData = userData.settings || {};

        // Verify expected fields exist
        if (typeof settingsData.isPublic !== 'boolean') {
          throw new Error('isPublic field missing or invalid');
        }
        if (typeof settingsData.allowMessages !== 'boolean') {
          throw new Error('allowMessages field missing or invalid');
        }
        if (!settingsData.notifications || typeof settingsData.notifications !== 'object') {
          throw new Error('notifications field missing or invalid');
        }

        return {
          isPublic: settingsData.isPublic,
          allowMessages: settingsData.allowMessages,
          notifications: settingsData.notifications,
        };
      }
    );

    // Test 2: Update Profile Visibility to Private
    await runTest(
      logger,
      testResults,
      2,
      totalTests,
      'Update Profile Visibility to Private',
      'Set profile visibility to private (isPublic = false)',
      'Verify profile can be made private',
      async () => {
        await db.collection('users').doc(testUserId).update({
          'settings.isPublic': false,
        });

        // Verify update
        const userDoc = await db.collection('users').doc(testUserId).get();
        const settings = userDoc.data().settings || {};
        if (settings.isPublic !== false) {
          throw new Error('isPublic was not updated to false');
        }

        return { isPublic: settings.isPublic };
      }
    );

    // Test 3: Update Profile Visibility to Public
    await runTest(
      logger,
      testResults,
      3,
      totalTests,
      'Update Profile Visibility to Public',
      'Set profile visibility to public (isPublic = true)',
      'Verify profile can be made public',
      async () => {
        await db.collection('users').doc(testUserId).update({
          'settings.isPublic': true,
        });

        // Verify update
        const userDoc = await db.collection('users').doc(testUserId).get();
        const settings = userDoc.data().settings || {};
        if (settings.isPublic !== true) {
          throw new Error('isPublic was not updated to true');
        }

        return { isPublic: settings.isPublic };
      }
    );

    // Test 4: Disable Messaging (allowMessages = false)
    await runTest(
      logger,
      testResults,
      4,
      totalTests,
      'Disable Messaging',
      'Disable user messaging (allowMessages = false)',
      'Verify messaging can be disabled',
      async () => {
        await db.collection('users').doc(testUserId).update({
          'settings.allowMessages': false,
        });

        // Verify update
        const userDoc = await db.collection('users').doc(testUserId).get();
        const settings = userDoc.data().settings || {};
        if (settings.allowMessages !== false) {
          throw new Error('allowMessages was not updated to false');
        }

        return { allowMessages: settings.allowMessages };
      }
    );

    // Test 5: Enable Messaging (allowMessages = true)
    await runTest(
      logger,
      testResults,
      5,
      totalTests,
      'Enable Messaging',
      'Enable user messaging (allowMessages = true)',
      'Verify messaging can be enabled',
      async () => {
        await db.collection('users').doc(testUserId).update({
          'settings.allowMessages': true,
        });

        // Verify update
        const userDoc = await db.collection('users').doc(testUserId).get();
        const settings = userDoc.data().settings || {};
        if (settings.allowMessages !== true) {
          throw new Error('allowMessages was not updated to true');
        }

        return { allowMessages: settings.allowMessages };
      }
    );

    // Test 6: Update Notification Preferences - Disable Email
    await runTest(
      logger,
      testResults,
      6,
      totalTests,
      'Update Notification Preferences - Disable Email',
      'Disable email notifications while keeping push enabled',
      'Verify individual notification settings can be updated',
      async () => {
        await db.collection('users').doc(testUserId).update({
          'settings.notifications': {
            email: false,
            push: true,
          },
        });

        // Verify update
        const userDoc = await db.collection('users').doc(testUserId).get();
        const settings = userDoc.data().settings || {};
        if (settings.notifications.email !== false) {
          throw new Error('Email notifications were not disabled');
        }
        if (settings.notifications.push !== true) {
          throw new Error('Push notifications should remain enabled');
        }

        return { notifications: settings.notifications };
      }
    );

    // Test 7: Update Notification Preferences - Disable All
    await runTest(
      logger,
      testResults,
      7,
      totalTests,
      'Update Notification Preferences - Disable All',
      'Disable both email and push notifications',
      'Verify all notifications can be disabled',
      async () => {
        await db.collection('users').doc(testUserId).update({
          'settings.notifications': {
            email: false,
            push: false,
          },
        });

        // Verify update
        const userDoc = await db.collection('users').doc(testUserId).get();
        const settings = userDoc.data().settings || {};
        if (settings.notifications.email !== false || settings.notifications.push !== false) {
          throw new Error('All notifications were not disabled');
        }

        return { notifications: settings.notifications };
      }
    );

    // Test 8: Batch Update Privacy Settings
    await runTest(
      logger,
      testResults,
      8,
      totalTests,
      'Batch Update Privacy Settings',
      'Update multiple privacy settings in one request',
      'Verify batch updates work correctly',
      async () => {
        // Batch update all settings
        await db.collection('users').doc(testUserId).update({
          'settings.isPublic': false,
          'settings.allowMessages': false,
          'settings.notifications': {
            email: true,
            push: true,
          },
        });

        // Verify all updates
        const userDoc = await db.collection('users').doc(testUserId).get();
        const settings = userDoc.data().settings || {};
        if (settings.isPublic !== false) {
          throw new Error('isPublic was not updated');
        }
        if (settings.allowMessages !== false) {
          throw new Error('allowMessages was not updated');
        }
        if (settings.notifications.email !== true || settings.notifications.push !== true) {
          throw new Error('Notifications were not updated');
        }

        return {
          isPublic: settings.isPublic,
          allowMessages: settings.allowMessages,
          notifications: settings.notifications,
        };
      }
    );

    // Cleanup: Delete test user since we always create it
    if (userCreated) {
      logger.log('INFO', 'Cleaning up test user...');
      await deleteTestUser(testUserId);
      logger.log('SUCCESS', 'Test user deleted successfully');
    }

    // Generate summary
    const summary = logger.getSummary();
    console.log('\n' + '='.repeat(80));
    console.log('📊 PRIVACY SETTINGS TEST SUITE SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed} ✅`);
    console.log(`Failed: ${summary.failed} ❌`);
    console.log(`Success Rate: ${summary.successRate}`);
    console.log(`Duration: ${summary.duration}`);
    console.log('='.repeat(80));

    return {
      success: summary.failed === 0,
      summary,
      tests: testResults.tests,
    };
  } catch (error) {
    logger.log('ERROR', 'Privacy Settings test suite failed', { error: error.message });
    console.error('Fatal error in test suite:', error);

    // Attempt cleanup if we created the user
    if (userCreated && testUserId) {
      try {
        await deleteTestUser(testUserId);
      } catch (cleanupError) {
        console.error('Failed to cleanup test user:', cleanupError);
      }
    }

    return {
      success: false,
      error: error.message,
      tests: testResults.tests,
    };
  }
}

/**
 * Helper function to run a single test
 */
async function runTest(logger, testResults, testNumber, totalTests, testName, what, why, testFn) {
  logger.logTestStart(testName, testNumber, totalTests);
  logger.log('INFO', `What: ${what}`);
  logger.log('INFO', `Why: ${why}`);

  try {
    const result = await testFn();
    logger.log('SUCCESS', 'Test completed successfully', result);
    logger.logTestEnd(testName, true);

    testResults.tests.push({
      testNumber,
      testName,
      what,
      why,
      status: 'passed',
      result,
    });

    return result;
  } catch (error) {
    logger.log('ERROR', `Test failed: ${error.message}`, { error: error.stack });
    logger.logTestEnd(testName, false, error);

    testResults.tests.push({
      testNumber,
      testName,
      what,
      why,
      status: 'failed',
      error: error.message,
    });

    throw error;
  }
}

// Export for direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Running Privacy Settings Tests...\n');
  runPrivacySettingsTests()
    .then((results) => {
      console.log('\n✅ Privacy Settings tests completed');
      console.log(JSON.stringify(results, null, 2));
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n❌ Privacy Settings tests failed:', error);
      process.exit(1);
    });
}
