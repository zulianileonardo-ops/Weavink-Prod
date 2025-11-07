/**
 * Phase 3 Privacy Service Tests
 *
 * Comprehensive tests for:
 * - Data Minimization Audits
 * - Retention Policy Automation
 * - Privacy Impact Assessments (DPIA)
 * - Security Incident Reporting
 * - Enhanced Audit Logging
 */

import {
  runDataMinimizationAudit,
  getLatestAuditReport,
  getMinimizationStatistics,
} from '../server/dataMinimizationService.js';

import {
  getRetentionPolicies,
  updateRetentionPolicy,
  findEligibleDataForDeletion,
  executeRetentionCleanup,
  addLegalHold,
  removeLegalHold,
  getRetentionStatistics,
} from '../server/retentionPolicyService.js';

import {
  createDPIA,
  submitDPIAAssessment,
  addMitigationMeasure,
  requestDPIAApproval,
  approveDPIA,
  getDPIA,
  listDPIAs,
  getDPIAStatistics,
} from '../server/dpiaService.js';

import {
  reportIncident,
  addContainmentAction,
  updateIncidentStatus,
  notifyCNIL,
  notifyAffectedUsers,
  getIncident,
  listIncidents,
  getIncidentStatistics,
  generateCNILNotificationTemplate,
} from '../server/incidentReportingService.js';

import {
  logAuditEvent,
  logConsentEvent,
  logDataAccessEvent,
  logDataExportEvent,
  logDataDeletionEvent,
  queryAuditLogs,
  getUserAuditTrail,
  getAuditStatistics,
  generateComplianceReport,
  exportAuditLogs,
} from '../server/auditLogService.js';

import { adminDb } from '../../../firebaseAdmin.js';
import { createTestUser, cleanupTestUser } from './testHelpers.js';

const db = adminDb;

// Test user IDs
const TEST_USER_ID = 'phase3_test_user_001';
const TEST_ADMIN_ID = 'phase3_admin_001';

/**
 * Test suite runner
 */
export async function runPhase3Tests() {
  console.log('\n========================================');
  console.log('🧪 PHASE 3 PRIVACY SERVICE TESTS');
  console.log('========================================\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Create test users
  await createTestUser(TEST_USER_ID);
  await createTestUser(TEST_ADMIN_ID, { role: 'admin' });

  // Run all test suites
  await runDataMinimizationTests(results);
  await runRetentionPolicyTests(results);
  await runDPIATests(results);
  await runIncidentReportingTests(results);
  await runAuditLoggingTests(results);

  // Cleanup
  await cleanupTestUser(TEST_USER_ID);
  await cleanupTestUser(TEST_ADMIN_ID);

  // Print summary
  console.log('\n========================================');
  console.log('📊 PHASE 3 TEST SUMMARY');
  console.log('========================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`);
  console.log('========================================\n');

  return results;
}

/**
 * Data Minimization Tests
 */
async function runDataMinimizationTests(results) {
  console.log('📦 DATA MINIMIZATION TESTS\n');

  // Test 1: Run audit
  await runTest(
    results,
    'Run data minimization audit',
    async () => {
      const result = await runDataMinimizationAudit();
      return result.success && result.audit && Array.isArray(result.audit.recommendations);
    }
  );

  // Test 2: Get latest audit report
  await runTest(
    results,
    'Get latest audit report',
    async () => {
      const result = await getLatestAuditReport();
      return result.success && (result.audit !== null || result.audit === null);
    }
  );

  // Test 3: Get minimization statistics
  await runTest(
    results,
    'Get minimization statistics',
    async () => {
      const result = await getMinimizationStatistics();
      return result.success && result.statistics && typeof result.statistics.totalAuditsRun === 'number';
    }
  );

  console.log('');
}

/**
 * Retention Policy Tests
 */
async function runRetentionPolicyTests(results) {
  console.log('⏰ RETENTION POLICY TESTS\n');

  let holdId;

  // Test 1: Get retention policies
  await runTest(
    results,
    'Get retention policies',
    async () => {
      const result = await getRetentionPolicies();
      return result.success && result.policies && Object.keys(result.policies).length > 0;
    }
  );

  // Test 2: Update retention policy
  await runTest(
    results,
    'Update retention policy',
    async () => {
      const result = await updateRetentionPolicy('user_profile', {
        retentionDays: 1000,
        notifyBeforeDays: 20,
      });
      return result.success && result.policy.retentionDays === 1000;
    }
  );

  // Test 3: Find eligible data for deletion
  await runTest(
    results,
    'Find eligible data for deletion',
    async () => {
      const result = await findEligibleDataForDeletion();
      return result && result.eligibleData !== undefined;
    }
  );

  // Test 4: Execute retention cleanup (dry run)
  await runTest(
    results,
    'Execute retention cleanup (dry run)',
    async () => {
      const result = await executeRetentionCleanup({ dryRun: true });
      return result && result.success && result.results.dryRun === true;
    }
  );

  // Test 5: Add legal hold
  await runTest(
    results,
    'Add legal hold',
    async () => {
      const result = await addLegalHold(
        TEST_USER_ID,
        'Litigation pending',
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      );
      holdId = result.holdId;
      return result.success && result.holdId;
    }
  );

  // Test 6: Remove legal hold
  await runTest(
    results,
    'Remove legal hold',
    async () => {
      if (!holdId) return false;
      const result = await removeLegalHold(holdId);
      return result.success;
    }
  );

  // Test 7: Get retention statistics
  await runTest(
    results,
    'Get retention statistics',
    async () => {
      const result = await getRetentionStatistics();
      return result.success && result.statistics && typeof result.statistics.totalPolicies === 'number';
    }
  );

  console.log('');
}

/**
 * DPIA Tests
 */
async function runDPIATests(results) {
  console.log('🔒 DPIA TESTS\n');

  let dpiaId;
  let approvalId;

  // Test 1: Create DPIA
  await runTest(
    results,
    'Create DPIA',
    async () => {
      const result = await createDPIA({
        projectName: 'Test Project',
        projectDescription: 'Testing DPIA system',
        dataController: 'Test Controller',
        processingPurpose: 'Testing',
        legalBasis: 'Consent',
        createdBy: TEST_ADMIN_ID,
      });
      dpiaId = result.dpiaId;
      return result.success && result.dpiaId;
    }
  );

  // Test 2: Submit DPIA assessment
  await runTest(
    results,
    'Submit DPIA assessment',
    async () => {
      if (!dpiaId) return false;
      const result = await submitDPIAAssessment(dpiaId, {
        dataTypes: 'basic',
        dataVolume: 'small',
        automatedDecisions: 'no',
        dataMinimization: 'yes',
        thirdPartySharing: 'no',
        internationalTransfer: 'no',
      });
      return result.success && result.riskScore !== undefined && result.riskLevel;
    }
  );

  // Test 3: Add mitigation measure
  await runTest(
    results,
    'Add mitigation measure',
    async () => {
      if (!dpiaId) return false;
      const result = await addMitigationMeasure(dpiaId, {
        measure: 'Encryption',
        description: 'Encrypt all data at rest',
        responsible: TEST_ADMIN_ID,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      return result.success && result.mitigation;
    }
  );

  // Test 4: Request DPIA approval
  await runTest(
    results,
    'Request DPIA approval',
    async () => {
      if (!dpiaId) return false;
      const result = await requestDPIAApproval(dpiaId, TEST_ADMIN_ID);
      approvalId = result.approval?.id;
      return result.success && result.approval;
    }
  );

  // Test 5: Approve DPIA
  await runTest(
    results,
    'Approve DPIA',
    async () => {
      if (!dpiaId || !approvalId) return false;
      const result = await approveDPIA(dpiaId, approvalId, true, 'Approved for testing');
      return result.success && result.approved === true;
    }
  );

  // Test 6: Get DPIA
  await runTest(
    results,
    'Get DPIA by ID',
    async () => {
      if (!dpiaId) return false;
      const result = await getDPIA(dpiaId);
      return result.success && result.dpia && result.dpia.id === dpiaId;
    }
  );

  // Test 7: List DPIAs
  await runTest(
    results,
    'List DPIAs',
    async () => {
      const result = await listDPIAs();
      return result.success && Array.isArray(result.dpias);
    }
  );

  // Test 8: Get DPIA statistics
  await runTest(
    results,
    'Get DPIA statistics',
    async () => {
      const result = await getDPIAStatistics();
      return result.success && result.statistics && typeof result.statistics.total === 'number';
    }
  );

  console.log('');
}

/**
 * Incident Reporting Tests
 */
async function runIncidentReportingTests(results) {
  console.log('🚨 INCIDENT REPORTING TESTS\n');

  let incidentId;

  // Test 1: Report incident
  await runTest(
    results,
    'Report security incident',
    async () => {
      const result = await reportIncident({
        title: 'Test Security Incident',
        description: 'Testing incident reporting system',
        incidentType: 'unauthorized_access',
        severity: 'medium',
        affectedUsers: 10,
        affectedDataTypes: ['basic'],
        reportedBy: TEST_ADMIN_ID,
      });
      incidentId = result.incidentId;
      return result.success && result.incidentId && result.incident;
    }
  );

  // Test 2: Add containment action
  await runTest(
    results,
    'Add containment action',
    async () => {
      if (!incidentId) return false;
      const result = await addContainmentAction(incidentId, {
        actionTaken: 'Blocked suspicious IP addresses',
        takenBy: TEST_ADMIN_ID,
      });
      return result.success && result.action;
    }
  );

  // Test 3: Update incident status
  await runTest(
    results,
    'Update incident status',
    async () => {
      if (!incidentId) return false;
      const result = await updateIncidentStatus(incidentId, 'investigating', {
        resolution: 'Investigation in progress',
      });
      return result.success && result.status === 'investigating';
    }
  );

  // Test 4: Get incident
  await runTest(
    results,
    'Get incident by ID',
    async () => {
      if (!incidentId) return false;
      const result = await getIncident(incidentId);
      return result.success && result.incident && result.incident.id === incidentId;
    }
  );

  // Test 5: List incidents
  await runTest(
    results,
    'List incidents',
    async () => {
      const result = await listIncidents();
      return result.success && Array.isArray(result.incidents);
    }
  );

  // Test 6: Get incident statistics
  await runTest(
    results,
    'Get incident statistics',
    async () => {
      const result = await getIncidentStatistics();
      return result.success && result.statistics && typeof result.statistics.total === 'number';
    }
  );

  // Test 7: Generate CNIL notification template
  await runTest(
    results,
    'Generate CNIL notification template',
    async () => {
      if (!incidentId) return false;
      const result = await generateCNILNotificationTemplate(incidentId);
      return result.success && result.template && result.template.includes('NOTIFICATION DE VIOLATION');
    }
  );

  // Test 8: Notify CNIL
  await runTest(
    results,
    'Notify CNIL',
    async () => {
      if (!incidentId) return false;
      const result = await notifyCNIL(incidentId, {
        notificationMethod: 'email',
        referenceNumber: 'TEST-REF-001',
        notifiedBy: TEST_ADMIN_ID,
      });
      return result.success;
    }
  );

  // Test 9: Notify affected users
  await runTest(
    results,
    'Notify affected users',
    async () => {
      if (!incidentId) return false;
      const result = await notifyAffectedUsers(incidentId, [TEST_USER_ID]);
      return result.success && result.notifiedCount === 1;
    }
  );

  console.log('');
}

/**
 * Audit Logging Tests
 */
async function runAuditLoggingTests(results) {
  console.log('📝 AUDIT LOGGING TESTS\n');

  let eventId;

  // Test 1: Log general audit event
  await runTest(
    results,
    'Log audit event',
    async () => {
      const result = await logAuditEvent({
        category: 'admin_action',
        action: 'test_action',
        userId: TEST_ADMIN_ID,
        details: 'Testing audit logging',
      });
      eventId = result.eventId;
      return result.success && result.eventId;
    }
  );

  // Test 2: Log consent event
  await runTest(
    results,
    'Log consent event',
    async () => {
      const result = await logConsentEvent(TEST_USER_ID, {
        action: 'consent_granted',
        consents: { analytics: true },
        version: '1.0',
      });
      return result.success && result.eventId;
    }
  );

  // Test 3: Log data access event
  await runTest(
    results,
    'Log data access event',
    async () => {
      const result = await logDataAccessEvent(TEST_ADMIN_ID, TEST_USER_ID, {
        resourceType: 'user_profile',
        resourceId: TEST_USER_ID,
        details: 'Admin viewed user profile',
        fields: ['name', 'email'],
        reason: 'Support request',
      });
      return result.success && result.eventId;
    }
  );

  // Test 4: Log data export event
  await runTest(
    results,
    'Log data export event',
    async () => {
      const result = await logDataExportEvent(TEST_USER_ID, {
        exportId: 'test-export-001',
        format: 'JSON',
        includeFiles: false,
      });
      return result.success && result.eventId;
    }
  );

  // Test 5: Log data deletion event
  await runTest(
    results,
    'Log data deletion event',
    async () => {
      const result = await logDataDeletionEvent(TEST_USER_ID, {
        action: 'deletion_requested',
        requestId: 'test-delete-001',
        details: 'User requested account deletion',
        reason: 'No longer using service',
      });
      return result.success && result.eventId;
    }
  );

  // Test 6: Query audit logs
  await runTest(
    results,
    'Query audit logs',
    async () => {
      const result = await queryAuditLogs({
        userId: TEST_USER_ID,
        limit: 10,
      });
      return result.success && Array.isArray(result.logs);
    }
  );

  // Test 7: Get user audit trail
  await runTest(
    results,
    'Get user audit trail',
    async () => {
      const result = await getUserAuditTrail(TEST_USER_ID);
      return result.success && Array.isArray(result.logs) && result.userId === TEST_USER_ID;
    }
  );

  // Test 8: Get audit statistics
  await runTest(
    results,
    'Get audit statistics',
    async () => {
      const result = await getAuditStatistics();
      return result.success && result.statistics && typeof result.statistics.total === 'number';
    }
  );

  // Test 9: Generate compliance report
  await runTest(
    results,
    'Generate compliance report',
    async () => {
      const result = await generateComplianceReport();
      return result.success && result.report && result.report.overview && result.report.compliance;
    }
  );

  // Test 10: Export audit logs (JSON)
  await runTest(
    results,
    'Export audit logs (JSON)',
    async () => {
      const result = await exportAuditLogs({ limit: 10 }, 'json');
      return result.success && result.format === 'json' && result.data;
    }
  );

  // Test 11: Export audit logs (CSV)
  await runTest(
    results,
    'Export audit logs (CSV)',
    async () => {
      const result = await exportAuditLogs({ limit: 10 }, 'csv');
      return result.success && result.format === 'csv' && result.data;
    }
  );

  console.log('');
}

/**
 * Helper function to run a single test
 */
async function runTest(results, testName, testFn) {
  results.total++;
  process.stdout.write(`  ${testName}... `);

  try {
    const passed = await testFn();
    if (passed) {
      console.log('✅ PASS');
      results.passed++;
      results.tests.push({ name: testName, status: 'PASS' });
    } else {
      console.log('❌ FAIL (returned false)');
      results.failed++;
      results.tests.push({ name: testName, status: 'FAIL', error: 'Test returned false' });
    }
  } catch (error) {
    console.log(`❌ FAIL (${error.message})`);
    results.failed++;
    results.tests.push({ name: testName, status: 'FAIL', error: error.message });
  }
}

// Export for use in test runner
export default runPhase3Tests;
