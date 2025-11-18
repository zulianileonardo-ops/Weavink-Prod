/**
 * Phase 4 Tests - Advanced GDPR Features
 *
 * Tests for:
 * - Data Portability Enhancements (XML, PDF, Import)
 * - Automated Breach Notifications
 * - Privacy by Design Certifications
 * - Third-Party Processor Management
 * - Automated Compliance Monitoring
 */

import {
  exportToXML,
  exportToPDF,
  importContacts,
  scheduleExport,
  getExportHistory,
  IMPORT_SOURCES,
} from '../server/dataPortabilityService.js';
import { PRIVACY_EXPORT_FORMATS } from '../constants/privacyConstants.js';

import {
  sendBreachNotifications,
  getNotificationStatus,
  NOTIFICATION_CHANNELS,
} from '../server/breachNotificationService.js';

import {
  createCertification,
  updateChecklistItem,
  getCertificationById,
  listCertifications,
  getCertificationStatistics,
} from '../server/certificationTrackingService.js';

import {
  registerProcessor,
  updateProcessor,
  updateDPA,
  conductRiskAssessment,
  getProcessorById,
  getProcessors,
  getProcessorStatistics,
} from '../server/processorManagementService.js';

import {
  calculateComplianceScore,
  runComplianceChecks,
  getComplianceTrends,
  createActionItem,
  getActionItems,
  getComplianceDashboard,
} from '../server/complianceMonitoringService.js';

import { createTestUser, cleanupTestUser } from './testHelpers.js';
import { reportIncident } from '../server/incidentReportingService.js';

const TEST_USER_ID = 'test-phase4-' + Date.now();
const TEST_PROCESSOR_ID = 'test-processor-' + Date.now();

/**
 * Run all Phase 4 tests
 */
export async function runPhase4Tests() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: [],
  };

  console.log('ℹ️ [Phase 4] 🚀 Starting Phase 4 Test Suite');
  console.log('ℹ️ [Phase 4] Test User ID:', TEST_USER_ID);

  // Create test user
  await createTestUser(TEST_USER_ID);

  // Run all test suites
  await runDataPortabilityTests(results);
  await runBreachNotificationTests(results);
  await runCertificationTests(results);
  await runProcessorManagementTests(results);
  await runComplianceMonitoringTests(results);

  // Cleanup
  await cleanupTestUser(TEST_USER_ID);

  console.log('ℹ️ [Phase 4] 🏁 Phase 4 Test Suite Complete');
  console.log(`ℹ️ [Phase 4] Results: ${results.passed}/${results.total} passed (${((results.passed / results.total) * 100).toFixed(2)}%)`);

  return results;
}

/**
 * Test 1: Data Portability Enhancements
 */
async function runDataPortabilityTests(results) {
  console.log('\n📦 [Phase 4] Testing Data Portability Enhancements...\n');

  // Test 1.1: Export to XML
  try {
    console.log('🧪 [Portability] Test 1.1: Export user data to XML format');

    const xmlExport = await exportToXML(TEST_USER_ID, { includeContacts: false });

    const xmlValid = xmlExport.success &&
      xmlExport.format === 'xml' &&
      xmlExport.content.includes('<?xml version') &&
      xmlExport.content.includes('<userExport>') &&
      xmlExport.content.includes('</userExport>');

    if (xmlValid) {
      console.log('✅ [Portability] XML export successful');
      results.passed++;
    } else {
      console.log('❌ [Portability] XML export invalid');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Export to XML',
      passed: xmlValid,
      category: 'data_portability',
    });
  } catch (error) {
    console.log('❌ [Portability] XML export failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Export to XML',
      passed: false,
      category: 'data_portability',
      error: error.message,
    });
  }

  // Test 1.2: Export to PDF (HTML)
  try {
    console.log('🧪 [Portability] Test 1.2: Export user data to PDF format');

    const pdfExport = await exportToPDF(TEST_USER_ID, { includeContacts: false });

    const pdfValid = pdfExport.success &&
      pdfExport.format === 'pdf' &&
      pdfExport.content.includes('<!DOCTYPE html>') &&
      pdfExport.content.includes('Personal Data Export');

    if (pdfValid) {
      console.log('✅ [Portability] PDF export successful');
      results.passed++;
    } else {
      console.log('❌ [Portability] PDF export invalid');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Export to PDF',
      passed: pdfValid,
      category: 'data_portability',
    });
  } catch (error) {
    console.log('❌ [Portability] PDF export failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Export to PDF',
      passed: false,
      category: 'data_portability',
      error: error.message,
    });
  }

  // Test 1.3: Import contacts from CSV
  try {
    console.log('🧪 [Portability] Test 1.3: Import contacts from generic CSV');

    const csvData = 'John,Doe,john@example.com,555-1234\nJane,Smith,jane@example.com,555-5678';

    const importResult = await importContacts(TEST_USER_ID, {
      source: IMPORT_SOURCES.GENERIC_CSV,
      data: csvData,
      options: { checkDuplicates: false },
    });

    const importValid = importResult.success &&
      importResult.imported >= 2;

    if (importValid) {
      console.log(`✅ [Portability] CSV import successful (${importResult.imported} contacts)`);
      results.passed++;
    } else {
      console.log('❌ [Portability] CSV import failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Import Contacts from CSV',
      passed: importValid,
      category: 'data_portability',
    });
  } catch (error) {
    console.log('❌ [Portability] CSV import failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Import Contacts from CSV',
      passed: false,
      category: 'data_portability',
      error: error.message,
    });
  }

  // Test 1.4: Schedule automated export
  try {
    console.log('🧪 [Portability] Test 1.4: Schedule automated export');

    const scheduleResult = await scheduleExport(TEST_USER_ID, {
      frequency: 'monthly',
      format: 'json',
      includeContacts: true,
    });

    const scheduleValid = scheduleResult.success &&
      scheduleResult.scheduleId &&
      scheduleResult.schedule.frequency === 'monthly';

    if (scheduleValid) {
      console.log('✅ [Portability] Export scheduled successfully');
      results.passed++;
    } else {
      console.log('❌ [Portability] Export scheduling failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Schedule Automated Export',
      passed: scheduleValid,
      category: 'data_portability',
    });
  } catch (error) {
    console.log('❌ [Portability] Export scheduling failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Schedule Automated Export',
      passed: false,
      category: 'data_portability',
      error: error.message,
    });
  }
}

/**
 * Test 2: Breach Notifications
 */
async function runBreachNotificationTests(results) {
  console.log('\n🚨 [Phase 4] Testing Breach Notifications...\n');

  // Create test incident
  let testIncidentId;
  try {
    const incident = await reportIncident({
      reportedBy: 'test-admin',
      title: 'Test Incident for Notifications',
      description: 'Test incident for breach notifications',
      incidentType: 'data_breach',
      severity: 'medium',
      affectedUsers: 5,
      affectedDataTypes: ['personal_information'],
    });
    testIncidentId = incident.incidentId;
  } catch (error) {
    console.log('⚠️ [BreachNotif] Could not create test incident:', error.message);
  }

  // Test 2.1: Send breach notifications
  if (testIncidentId) {
    try {
      console.log('🧪 [BreachNotif] Test 2.1: Send breach notifications to users');

      const notifResult = await sendBreachNotifications(testIncidentId, {
        userIds: [TEST_USER_ID],
        channels: [NOTIFICATION_CHANNELS.EMAIL],
        language: 'en',
        includeSMS: false,
      });

      const notifValid = notifResult.success &&
        notifResult.notificationsSent >= 0;

      if (notifValid) {
        console.log(`✅ [BreachNotif] Notifications sent (${notifResult.notificationsSent} sent)`);
        results.passed++;
      } else {
        console.log('❌ [BreachNotif] Notification sending failed');
        results.failed++;
      }
      results.total++;
      results.tests.push({
        name: 'Send Breach Notifications',
        passed: notifValid,
        category: 'breach_notifications',
      });
    } catch (error) {
      console.log('❌ [BreachNotif] Notification sending failed:', error.message);
      results.failed++;
      results.total++;
      results.tests.push({
        name: 'Send Breach Notifications',
        passed: false,
        category: 'breach_notifications',
        error: error.message,
      });
    }

    // Test 2.2: Notify data subjects
    try {
      console.log('🧪 [BreachNotif] Test 2.2: Notify affected data subjects');

      const subjectNotif = await sendBreachNotifications(testIncidentId, {
        userIds: [TEST_USER_ID],
        channels: [NOTIFICATION_CHANNELS.EMAIL],
      });

      const subjectValid = subjectNotif.success &&
        typeof subjectNotif.notificationsSent === 'number' &&
        subjectNotif.notificationsSent >= 0;

      if (subjectValid) {
        console.log('✅ [BreachNotif] Data subjects notified');
        results.passed++;
      } else {
        console.log('❌ [BreachNotif] Data subject notification failed');
        results.failed++;
      }
      results.total++;
      results.tests.push({
        name: 'Notify Data Subjects',
        passed: subjectValid,
        category: 'breach_notifications',
      });
    } catch (error) {
      console.log('❌ [BreachNotif] Data subject notification failed:', error.message);
      results.failed++;
      results.total++;
      results.tests.push({
        name: 'Notify Data Subjects',
        passed: false,
        category: 'breach_notifications',
        error: error.message,
      });
    }
  } else {
    console.log('⚠️ [BreachNotif] Skipping notification tests (no incident created)');
    results.failed += 2;
    results.total += 2;
  }
}

/**
 * Test 3: Privacy Certifications
 */
async function runCertificationTests(results) {
  console.log('\n🔒 [Phase 4] Testing Privacy Certifications...\n');

  let testCertId;

  // Test 3.1: Create certification
  try {
    console.log('🧪 [Certification] Test 3.1: Create ISO 27001 certification');

    const cert = await createCertification({
      name: 'ISO 27001 Certification 2026',
      description: 'ISO 27001 Information Security Management System certification for 2026',
      type: 'iso_27001',
      targetDate: '2026-12-31',
      assignedTo: 'test-admin',
      scope: ['user_data', 'authentication'],
    });

    testCertId = cert.certificationId;

    const certValid = cert.success &&
      cert.certificationId &&
      cert.certification.type === 'iso_27001';

    if (certValid) {
      console.log('✅ [Certification] Certification created successfully');
      results.passed++;
    } else {
      console.log('❌ [Certification] Certification creation failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Create Certification',
      passed: certValid,
      category: 'certifications',
    });
  } catch (error) {
    console.log('❌ [Certification] Certification creation failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Create Certification',
      passed: false,
      category: 'certifications',
      error: error.message,
    });
  }

  // Test 3.2: Update checklist item
  if (testCertId) {
    try {
      console.log('🧪 [Certification] Test 3.2: Update checklist item');

      const update = await updateChecklistItem(
        testCertId,
        'A.5.1.1',
        'completed',
        'Policy document created and approved'
      );

      const updateValid = update.success &&
        update.status === 'completed' &&
        update.progress !== undefined;

      if (updateValid) {
        console.log(`✅ [Certification] Checklist updated (${update.progress}% complete)`);
        results.passed++;
      } else {
        console.log('❌ [Certification] Checklist update failed');
        results.failed++;
      }
      results.total++;
      results.tests.push({
        name: 'Update Checklist Item',
        passed: updateValid,
        category: 'certifications',
      });
    } catch (error) {
      console.log('❌ [Certification] Checklist update failed:', error.message);
      results.failed++;
      results.total++;
      results.tests.push({
        name: 'Update Checklist Item',
        passed: false,
        category: 'certifications',
        error: error.message,
      });
    }

    // Test 3.3: Get certification by ID
    try {
      console.log('🧪 [Certification] Test 3.3: Retrieve certification details');

      const retrieved = await getCertificationById(testCertId);

      const retrieveValid = retrieved.success &&
        retrieved.certification.id === testCertId;

      if (retrieveValid) {
        console.log('✅ [Certification] Certification retrieved successfully');
        results.passed++;
      } else {
        console.log('❌ [Certification] Certification retrieval failed');
        results.failed++;
      }
      results.total++;
      results.tests.push({
        name: 'Get Certification By ID',
        passed: retrieveValid,
        category: 'certifications',
      });
    } catch (error) {
      console.log('❌ [Certification] Certification retrieval failed:', error.message);
      results.failed++;
      results.total++;
      results.tests.push({
        name: 'Get Certification By ID',
        passed: false,
        category: 'certifications',
        error: error.message,
      });
    }
  }

  // Test 3.4: List certifications
  try {
    console.log('🧪 [Certification] Test 3.4: List all certifications');

    const list = await listCertifications({ limit: 10 });

    const listValid = list.success &&
      Array.isArray(list.certifications);

    if (listValid) {
      console.log(`✅ [Certification] Listed ${list.count} certifications`);
      results.passed++;
    } else {
      console.log('❌ [Certification] Certification listing failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'List Certifications',
      passed: listValid,
      category: 'certifications',
    });
  } catch (error) {
    console.log('❌ [Certification] Certification listing failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'List Certifications',
      passed: false,
      category: 'certifications',
      error: error.message,
    });
  }

  // Test 3.5: Get certification statistics
  try {
    console.log('🧪 [Certification] Test 3.5: Get certification statistics');

    const stats = await getCertificationStatistics();

    const statsValid = stats.success &&
      stats.statistics &&
      typeof stats.statistics.totalCertifications === 'number';

    if (statsValid) {
      console.log('✅ [Certification] Statistics retrieved successfully');
      results.passed++;
    } else {
      console.log('❌ [Certification] Statistics retrieval failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Get Certification Statistics',
      passed: statsValid,
      category: 'certifications',
    });
  } catch (error) {
    console.log('❌ [Certification] Statistics retrieval failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Get Certification Statistics',
      passed: false,
      category: 'certifications',
      error: error.message,
    });
  }
}

/**
 * Test 4: Processor Management
 */
async function runProcessorManagementTests(results) {
  console.log('\n🔧 [Phase 4] Testing Processor Management...\n');

  let testProcessorId;

  // Test 4.1: Register processor
  try {
    console.log('🧪 [Processor] Test 4.1: Register data processor');

    const processor = await registerProcessor({
      name: 'Test Cloud Storage',
      legalName: 'Test Cloud Storage Inc.',
      country: 'US',
      contactEmail: 'contact@testcloud.com',
      dataCategories: ['personal_information', 'contact_information'],
      processingPurposes: ['cloud_storage'],
    });

    testProcessorId = processor.processorId;

    const processorValid = processor.success &&
      processor.processorId &&
      processor.processor.name === 'Test Cloud Storage';

    if (processorValid) {
      console.log('✅ [Processor] Processor registered successfully');
      results.passed++;
    } else {
      console.log('❌ [Processor] Processor registration failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Register Processor',
      passed: processorValid,
      category: 'processor_management',
    });
  } catch (error) {
    console.log('❌ [Processor] Processor registration failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Register Processor',
      passed: false,
      category: 'processor_management',
      error: error.message,
    });
  }

  // Test 4.2: Update processor
  if (testProcessorId) {
    try {
      console.log('🧪 [Processor] Test 4.2: Update processor information');

      const update = await updateProcessor(testProcessorId, {
        status: 'active',
        certifications: ['ISO_27001', 'SOC_2'],
      });

      const updateValid = update.success &&
        Array.isArray(update.updated.certifications) &&
        update.updated.certifications.length > 0;

      if (updateValid) {
        console.log('✅ [Processor] Processor updated successfully');
        results.passed++;
      } else {
        console.log('❌ [Processor] Processor update failed');
        results.failed++;
      }
      results.total++;
      results.tests.push({
        name: 'Update Processor',
        passed: updateValid,
        category: 'processor_management',
      });
    } catch (error) {
      console.log('❌ [Processor] Processor update failed:', error.message);
      results.failed++;
      results.total++;
      results.tests.push({
        name: 'Update Processor',
        passed: false,
        category: 'processor_management',
        error: error.message,
      });
    }

    // Test 4.3: Conduct risk assessment
    try {
      console.log('🧪 [Processor] Test 4.3: Conduct risk assessment');

      const assessment = await conductRiskAssessment(testProcessorId, {
        assessedBy: 'test-admin',
        notes: 'Initial risk assessment',
      });

      const assessValid = assessment.success &&
        assessment.riskLevel &&
        typeof assessment.riskScore === 'number';

      if (assessValid) {
        console.log(`✅ [Processor] Risk assessment complete (${assessment.riskLevel}, score: ${assessment.riskScore})`);
        results.passed++;
      } else {
        console.log('❌ [Processor] Risk assessment failed');
        results.failed++;
      }
      results.total++;
      results.tests.push({
        name: 'Conduct Risk Assessment',
        passed: assessValid,
        category: 'processor_management',
      });
    } catch (error) {
      console.log('❌ [Processor] Risk assessment failed:', error.message);
      results.failed++;
      results.total++;
      results.tests.push({
        name: 'Conduct Risk Assessment',
        passed: false,
        category: 'processor_management',
        error: error.message,
      });
    }

    // Test 4.4: Get processor by ID
    try {
      console.log('🧪 [Processor] Test 4.4: Retrieve processor details');

      const retrieved = await getProcessorById(testProcessorId);

      const retrieveValid = retrieved.success &&
        retrieved.processor.id === testProcessorId;

      if (retrieveValid) {
        console.log('✅ [Processor] Processor retrieved successfully');
        results.passed++;
      } else {
        console.log('❌ [Processor] Processor retrieval failed');
        results.failed++;
      }
      results.total++;
      results.tests.push({
        name: 'Get Processor By ID',
        passed: retrieveValid,
        category: 'processor_management',
      });
    } catch (error) {
      console.log('❌ [Processor] Processor retrieval failed:', error.message);
      results.failed++;
      results.total++;
      results.tests.push({
        name: 'Get Processor By ID',
        passed: false,
        category: 'processor_management',
        error: error.message,
      });
    }
  }

  // Test 4.5: Get processor statistics
  try {
    console.log('🧪 [Processor] Test 4.5: Get processor statistics');

    const stats = await getProcessorStatistics();

    const statsValid = stats.success &&
      stats.statistics &&
      typeof stats.statistics.totalProcessors === 'number';

    if (statsValid) {
      console.log(`✅ [Processor] Statistics retrieved (${stats.statistics.totalProcessors} processors)`);
      results.passed++;
    } else {
      console.log('❌ [Processor] Statistics retrieval failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Get Processor Statistics',
      passed: statsValid,
      category: 'processor_management',
    });
  } catch (error) {
    console.log('❌ [Processor] Statistics retrieval failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Get Processor Statistics',
      passed: false,
      category: 'processor_management',
      error: error.message,
    });
  }
}

/**
 * Test 5: Compliance Monitoring
 */
async function runComplianceMonitoringTests(results) {
  console.log('\n📊 [Phase 4] Testing Compliance Monitoring...\n');

  // Test 5.1: Calculate compliance score
  try {
    console.log('🧪 [Compliance] Test 5.1: Calculate overall compliance score');

    const score = await calculateComplianceScore();

    const scoreValid = score.success &&
      typeof score.overallScore === 'number' &&
      score.overallScore >= 0 &&
      score.overallScore <= 100 &&
      typeof score.breakdown === 'object';

    if (scoreValid) {
      console.log(`✅ [Compliance] Compliance score calculated (${score.overallScore}/100, ${score.status})`);
      results.passed++;
    } else {
      console.log('❌ [Compliance] Score calculation failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Calculate Compliance Score',
      passed: scoreValid,
      category: 'compliance_monitoring',
    });
  } catch (error) {
    console.log('❌ [Compliance] Score calculation failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Calculate Compliance Score',
      passed: false,
      category: 'compliance_monitoring',
      error: error.message,
    });
  }

  // Test 5.2: Run compliance checks
  try {
    console.log('🧪 [Compliance] Test 5.2: Run automated compliance checks');

    const checks = await runComplianceChecks();

    const checksValid = checks.success &&
      checks.summary &&
      checks.checks &&
      Array.isArray(checks.checks);

    if (checksValid) {
      console.log(`✅ [Compliance] Compliance checks complete (${checks.summary.passed}/${checks.summary.totalChecks} passed)`);
      results.passed++;
    } else {
      console.log('❌ [Compliance] Compliance checks failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Run Compliance Checks',
      passed: checksValid,
      category: 'compliance_monitoring',
    });
  } catch (error) {
    console.log('❌ [Compliance] Compliance checks failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Run Compliance Checks',
      passed: false,
      category: 'compliance_monitoring',
      error: error.message,
    });
  }

  // Test 5.3: Get compliance trends
  try {
    console.log('🧪 [Compliance] Test 5.3: Analyze compliance trends');

    const trends = await getComplianceTrends(7); // Last 7 days

    const trendsValid = trends.success &&
      Array.isArray(trends.trends) &&
      typeof trends.trendDirection === 'string';

    if (trendsValid) {
      console.log(`✅ [Compliance] Trends analyzed (${trends.dataPoints} data points, ${trends.trendDirection})`);
      results.passed++;
    } else {
      console.log('❌ [Compliance] Trend analysis failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Get Compliance Trends',
      passed: trendsValid,
      category: 'compliance_monitoring',
    });
  } catch (error) {
    console.log('❌ [Compliance] Trend analysis failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Get Compliance Trends',
      passed: false,
      category: 'compliance_monitoring',
      error: error.message,
    });
  }

  // Test 5.4: Create action item
  try {
    console.log('🧪 [Compliance] Test 5.4: Create compliance action item');

    const action = await createActionItem({
      title: 'Test Action: Update Privacy Policy',
      description: 'Test action item for compliance',
      priority: 'medium',
      category: 'documentation',
      dueDate: '2026-01-31',
    });

    const actionValid = action.success &&
      action.actionId &&
      action.action.title.includes('Update Privacy Policy');

    if (actionValid) {
      console.log('✅ [Compliance] Action item created');
      results.passed++;
    } else {
      console.log('❌ [Compliance] Action item creation failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Create Action Item',
      passed: actionValid,
      category: 'compliance_monitoring',
    });
  } catch (error) {
    console.log('❌ [Compliance] Action item creation failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Create Action Item',
      passed: false,
      category: 'compliance_monitoring',
      error: error.message,
    });
  }

  // Test 5.5: Get action items
  try {
    console.log('🧪 [Compliance] Test 5.5: Retrieve action items');

    const actions = await getActionItems({ limit: 10 });

    const actionsValid = actions.success &&
      Array.isArray(actions.actions);

    if (actionsValid) {
      console.log(`✅ [Compliance] Retrieved ${actions.count} action items`);
      results.passed++;
    } else {
      console.log('❌ [Compliance] Action item retrieval failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Get Action Items',
      passed: actionsValid,
      category: 'compliance_monitoring',
    });
  } catch (error) {
    console.log('❌ [Compliance] Action item retrieval failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Get Action Items',
      passed: false,
      category: 'compliance_monitoring',
      error: error.message,
    });
  }

  // Test 5.6: Get compliance dashboard
  try {
    console.log('🧪 [Compliance] Test 5.6: Generate compliance dashboard');

    const dashboard = await getComplianceDashboard();

    const dashboardValid = dashboard.success &&
      dashboard.dashboard &&
      typeof dashboard.dashboard.score === 'object' &&
      typeof dashboard.dashboard.checks === 'object' &&
      typeof dashboard.dashboard.actions === 'object' &&
      typeof dashboard.dashboard.trends === 'object';

    if (dashboardValid) {
      console.log(`✅ [Compliance] Dashboard generated (score: ${dashboard.dashboard.score.current})`);
      results.passed++;
    } else {
      console.log('❌ [Compliance] Dashboard generation failed');
      results.failed++;
    }
    results.total++;
    results.tests.push({
      name: 'Get Compliance Dashboard',
      passed: dashboardValid,
      category: 'compliance_monitoring',
    });
  } catch (error) {
    console.log('❌ [Compliance] Dashboard generation failed:', error.message);
    results.failed++;
    results.total++;
    results.tests.push({
      name: 'Get Compliance Dashboard',
      passed: false,
      category: 'compliance_monitoring',
      error: error.message,
    });
  }
}
