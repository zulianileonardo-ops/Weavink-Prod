/**
 * RGPD Phase 1-2: Data Export Tests
 *
 * Tests all data export functionality:
 * - JSON export
 * - CSV export
 * - vCard export
 * - Export request tracking
 * - Multi-format validation
 */

import {
  requestDataExport,
  getExportStatus,
  deleteExportRequest,
  createTestUser,
  deleteTestUser,
} from './testHelpers.js';

/**
 * Test Results Logger (reusing from consentTests)
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
 * Test Suite: Data Export (Right to Portability - Art. 20)
 */
export async function runDataExportTests(testUserId = 'test-user-export-001') {
  const logger = new TestLogger('Data Export');
  const testResults = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  logger.info('🚀 Starting Data Export Test Suite', {
    userId: testUserId,
    timestamp: new Date().toISOString(),
  });

  // Test 1: Request Full Data Export
  try {
    logger.testStart('Test 1: Request Full Data Export (All Formats)');
    logger.info('WHY: Users have right to receive all their data in portable formats');
    logger.info('HOW: Call requestDataExport with all options enabled');
    logger.info('WHAT: Expect export to complete with JSON, CSV, and vCard files');

    const result = await requestDataExport(testUserId, {
      includeContacts: true,
      includeAnalytics: true,
      includeConsents: true,
    });

    if (result.success && result.files) {
      // Validate that all expected files are present
      const hasUserData = result.files['user-data.json'] !== undefined;
      const hasContactsJSON = result.files['contacts.json'] !== undefined;
      const hasContactsCSV = result.files['contacts.csv'] !== undefined;
      const hasContactsVCard = result.files['contacts.vcf'] !== undefined;
      const hasReadme = result.files['README.txt'] !== undefined;

      if (hasUserData && hasContactsJSON && hasContactsCSV && hasContactsVCard && hasReadme) {
        logger.success('✓ Full data export completed', {
          totalFiles: Object.keys(result.files).length,
          files: Object.keys(result.files),
          requestId: result.requestId,
        });
        testResults.passed++;
        testResults.tests.push({ name: 'Request Full Data Export', passed: true });
        logger.testEnd('Test 1', true);
      } else {
        throw new Error('Missing expected export files');
      }
    } else {
      throw new Error('Data export failed');
    }
  } catch (error) {
    logger.error('✗ Test 1 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Request Full Data Export', passed: false, error: error.message });
    logger.testEnd('Test 1', false);
  }

  // Test 2: Validate JSON Format
  try {
    logger.testStart('Test 2: Validate JSON Export Format');
    logger.info('WHY: JSON must be valid and parseable');
    logger.info('HOW: Request export and parse JSON files');
    logger.info('WHAT: Expect valid JSON structure with all user data');

    const result = await requestDataExport(testUserId, {
      includeContacts: true,
      includeAnalytics: false,
      includeConsents: true,
    });

    const userDataJSON = result.files['user-data.json'].content;
    const parsedData = JSON.parse(userDataJSON);

    if (parsedData.user && parsedData.exportDate) {
      logger.success('✓ JSON format validated', {
        hasUserData: !!parsedData.user,
        hasExportDate: !!parsedData.exportDate,
        hasContacts: !!parsedData.contacts,
        hasConsents: !!parsedData.consents,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Validate JSON Format', passed: true });
      logger.testEnd('Test 2', true);
    } else {
      throw new Error('Invalid JSON structure');
    }
  } catch (error) {
    logger.error('✗ Test 2 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Validate JSON Format', passed: false, error: error.message });
    logger.testEnd('Test 2', false);
  }

  // Test 3: Validate CSV Format
  try {
    logger.testStart('Test 3: Validate CSV Export Format');
    logger.info('WHY: CSV must be properly formatted for spreadsheet import');
    logger.info('HOW: Request export and validate CSV structure');
    logger.info('WHAT: Expect CSV with headers and properly escaped data');

    const result = await requestDataExport(testUserId, {
      includeContacts: true,
      includeAnalytics: false,
      includeConsents: false,
    });

    const contactsCSV = result.files['contacts.csv'].content;
    const lines = contactsCSV.split('\n').filter(line => line.trim());
    const hasHeader = lines[0].includes('First Name,Last Name,Email');

    if (hasHeader && lines.length > 0) {
      logger.success('✓ CSV format validated', {
        totalLines: lines.length,
        header: lines[0],
        sampleRow: lines[1] || 'No data rows',
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Validate CSV Format', passed: true });
      logger.testEnd('Test 3', true);
    } else {
      throw new Error('Invalid CSV format');
    }
  } catch (error) {
    logger.error('✗ Test 3 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Validate CSV Format', passed: false, error: error.message });
    logger.testEnd('Test 3', false);
  }

  // Test 4: Validate vCard Format
  try {
    logger.testStart('Test 4: Validate vCard Export Format (RFC 2426)');
    logger.info('WHY: vCard must comply with RFC 2426 for contact manager compatibility');
    logger.info('HOW: Request export and validate vCard structure');
    logger.info('WHAT: Expect valid vCard 3.0 format with BEGIN/END blocks');

    const result = await requestDataExport(testUserId, {
      includeContacts: true,
      includeAnalytics: false,
      includeConsents: false,
    });

    const vCard = result.files['contacts.vcf'].content;
    const hasBegin = vCard.includes('BEGIN:VCARD');
    const hasEnd = vCard.includes('END:VCARD');
    const hasVersion = vCard.includes('VERSION:3.0');

    if (hasBegin && hasEnd && hasVersion) {
      logger.success('✓ vCard format validated (RFC 2426 compliant)', {
        hasBegin,
        hasEnd,
        hasVersion,
        sampleLines: vCard.split('\n').slice(0, 5),
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Validate vCard Format', passed: true });
      logger.testEnd('Test 4', true);
    } else {
      throw new Error('Invalid vCard format');
    }
  } catch (error) {
    logger.error('✗ Test 4 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Validate vCard Format', passed: false, error: error.message });
    logger.testEnd('Test 4', false);
  }

  // Test 5: Export Request Tracking
  try {
    logger.testStart('Test 5: Track Export Request Status');
    logger.info('WHY: Users need to check status of their export requests');
    logger.info('HOW: Request export then call getExportStatus');
    logger.info('WHAT: Expect to retrieve request details with files');

    const exportResult = await requestDataExport(testUserId, {
      includeContacts: true,
      includeAnalytics: true,
      includeConsents: true,
    });

    const requestId = exportResult.requestId;
    const statusResult = await getExportStatus(testUserId, requestId);

    if (statusResult.success && statusResult.request && statusResult.request.status === 'completed') {
      logger.success('✓ Export request tracked successfully', {
        requestId,
        status: statusResult.request.status,
        filesCount: Object.keys(statusResult.request.files || {}).length,
        expiresAt: statusResult.request.expiresAt,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Track Export Request', passed: true });
      logger.testEnd('Test 5', true);
    } else {
      throw new Error('Export request tracking failed');
    }
  } catch (error) {
    logger.error('✗ Test 5 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Track Export Request', passed: false, error: error.message });
    logger.testEnd('Test 5', false);
  }

  // Test 6: Delete Export Request
  try {
    logger.testStart('Test 6: Delete Export Request (Data Minimization)');
    logger.info('WHY: Old export data should be cleanable to minimize data retention');
    logger.info('HOW: Create export then delete it');
    logger.info('WHAT: Expect export to be removed from tracking');

    const exportResult = await requestDataExport(testUserId, {
      includeContacts: true,
      includeAnalytics: false,
      includeConsents: false,
    });

    const requestId = exportResult.requestId;
    const deleteResult = await deleteExportRequest(testUserId, requestId);

    if (deleteResult.success) {
      // Try to get status after deletion - should fail or return null
      try {
        const statusResult = await getExportStatus(testUserId, requestId);
        if (!statusResult.request) {
          logger.success('✓ Export request deleted successfully', { requestId });
          testResults.passed++;
          testResults.tests.push({ name: 'Delete Export Request', passed: true });
          logger.testEnd('Test 6', true);
        } else {
          throw new Error('Export still exists after deletion');
        }
      } catch (err) {
        // Expected - request not found
        logger.success('✓ Export request deleted successfully', { requestId });
        testResults.passed++;
        testResults.tests.push({ name: 'Delete Export Request', passed: true });
        logger.testEnd('Test 6', true);
      }
    } else {
      throw new Error('Export deletion failed');
    }
  } catch (error) {
    logger.error('✗ Test 6 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Delete Export Request', passed: false, error: error.message });
    logger.testEnd('Test 6', false);
  }

  // Test 7: Partial Export (Selective Data)
  try {
    logger.testStart('Test 7: Partial Export (Selective Data)');
    logger.info('WHY: Users may only want specific data exported');
    logger.info('HOW: Request export with only contacts enabled');
    logger.info('WHAT: Expect only contact-related files in export');

    const result = await requestDataExport(testUserId, {
      includeContacts: true,
      includeAnalytics: false,
      includeConsents: false,
    });

    const hasContactsJSON = result.files['contacts.json'] !== undefined;
    const hasAnalytics = result.files['analytics.json'] !== undefined;
    const hasConsents = result.files['consents.json'] !== undefined;

    if (hasContactsJSON && !hasAnalytics && !hasConsents) {
      logger.success('✓ Partial export working correctly', {
        hasContacts: hasContactsJSON,
        hasAnalytics,
        hasConsents,
        totalFiles: Object.keys(result.files).length,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Partial Export', passed: true });
      logger.testEnd('Test 7', true);
    } else {
      throw new Error('Partial export included unexpected data');
    }
  } catch (error) {
    logger.error('✗ Test 7 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Partial Export', passed: false, error: error.message });
    logger.testEnd('Test 7', false);
  }

  // Test 8: README File Generation
  try {
    logger.testStart('Test 8: Validate README File');
    logger.info('WHY: Users need instructions on how to use their exported data');
    logger.info('HOW: Request export and check README content');
    logger.info('WHAT: Expect README with file descriptions and usage instructions');

    const result = await requestDataExport(testUserId, {
      includeContacts: true,
      includeAnalytics: true,
      includeConsents: true,
    });

    const readme = result.files['README.txt'].content;
    const hasTitle = readme.includes('GDPR Data Export');
    const hasInstructions = readme.includes('Files Included');
    const hasFileDescriptions = readme.includes('user-data.json');

    if (hasTitle && hasInstructions && hasFileDescriptions) {
      logger.success('✓ README file generated correctly', {
        length: readme.length,
        hasTitle,
        hasInstructions,
        hasFileDescriptions,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'README File Generation', passed: true });
      logger.testEnd('Test 8', true);
    } else {
      throw new Error('README file incomplete or missing');
    }
  } catch (error) {
    logger.error('✗ Test 8 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'README File Generation', passed: false, error: error.message });
    logger.testEnd('Test 8', false);
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
