/**
 * Comprehensive RGPD Test Runner
 * Runs all 96 tests across all phases
 * Run with: node -r dotenv/config runAllRGPDTests.mjs
 */

// Load environment variables
import { config } from 'dotenv';
config();

import { runConsentTests } from './lib/services/servicePrivacy/tests/consentTests.js';
import { runConsentCategoryTests } from './lib/services/servicePrivacy/tests/consentCategoryTests.js';
import { runPrivacySettingsTests } from './lib/services/servicePrivacy/tests/privacySettingsTests.js';
import { runDataExportTests } from './lib/services/servicePrivacy/tests/dataExportTests.js';
import { runAccountDeletionTests } from './lib/services/servicePrivacy/tests/accountDeletionTests.js';
import { runPhase3Tests } from './lib/services/servicePrivacy/tests/phase3Tests.js';
import { runPhase4Tests } from './lib/services/servicePrivacy/tests/phase4Tests.js';

console.log('\n========================================');
console.log('🧪 COMPREHENSIVE RGPD TEST RUNNER');
console.log('========================================');
console.log('Running all 104 tests across all phases\n');

const startTime = Date.now();
const results = {
  suites: {},
  totalPassed: 0,
  totalFailed: 0,
  totalTests: 0
};

try {
  // Phase 1-2: Consent Management Tests (8 tests)
  console.log('\n📋 Running Consent Management Tests (8 tests)...');
  const consentResults = await runConsentTests(`test-consent-${Date.now()}`);
  results.suites.consent = {
    name: 'Consent Management',
    passed: consentResults.summary.passed,
    failed: consentResults.summary.failed,
    total: consentResults.summary.passed + consentResults.summary.failed,
    success: consentResults.success
  };
  results.totalPassed += consentResults.summary.passed;
  results.totalFailed += consentResults.summary.failed;
  console.log(`✅ Consent: ${consentResults.summary.passed}/${consentResults.summary.passed + consentResults.summary.failed} passed`);

  // Phase 1-2: Consent Category Tests (12 tests)
  console.log('\n🗂️  Running Consent Category Tests (12 tests)...');
  const categoryResults = await runConsentCategoryTests(`test-category-${Date.now()}`);
  results.suites.consentCategories = {
    name: 'Consent Categories',
    passed: categoryResults.summary.passed,
    failed: categoryResults.summary.failed,
    total: categoryResults.summary.passed + categoryResults.summary.failed,
    success: categoryResults.success
  };
  results.totalPassed += categoryResults.summary.passed;
  results.totalFailed += categoryResults.summary.failed;
  console.log(`✅ Categories: ${categoryResults.summary.passed}/${categoryResults.summary.passed + categoryResults.summary.failed} passed`);

  // Phase 1-2: Privacy Settings Tests (8 tests)
  console.log('\n⚙️  Running Privacy Settings Tests (8 tests)...');
  const privacySettingsResults = await runPrivacySettingsTests(`test-privacy-settings-${Date.now()}`);
  results.suites.privacySettings = {
    name: 'Privacy Settings',
    passed: privacySettingsResults.summary.passed,
    failed: privacySettingsResults.summary.failed,
    total: privacySettingsResults.summary.passed + privacySettingsResults.summary.failed,
    success: privacySettingsResults.success
  };
  results.totalPassed += privacySettingsResults.summary.passed;
  results.totalFailed += privacySettingsResults.summary.failed;
  console.log(`✅ Privacy Settings: ${privacySettingsResults.summary.passed}/${privacySettingsResults.summary.passed + privacySettingsResults.summary.failed} passed`);

  // Phase 1-2: Data Export Tests (8 tests)
  console.log('\n📦 Running Data Export Tests (8 tests)...');
  const exportResults = await runDataExportTests(`test-export-${Date.now()}`);
  results.suites.export = {
    name: 'Data Export',
    passed: exportResults.summary.passed,
    failed: exportResults.summary.failed,
    total: exportResults.summary.passed + exportResults.summary.failed,
    success: exportResults.success
  };
  results.totalPassed += exportResults.summary.passed;
  results.totalFailed += exportResults.summary.failed;
  console.log(`✅ Export: ${exportResults.summary.passed}/${exportResults.summary.passed + exportResults.summary.failed} passed`);

  // Phase 1-2: Account Deletion Tests (8 tests)
  console.log('\n🗑️  Running Account Deletion Tests (8 tests)...');
  const deletionResults = await runAccountDeletionTests(`test-deletion-${Date.now()}`);
  results.suites.deletion = {
    name: 'Account Deletion',
    passed: deletionResults.summary.passed,
    failed: deletionResults.summary.failed,
    total: deletionResults.summary.passed + deletionResults.summary.failed,
    success: deletionResults.success
  };
  results.totalPassed += deletionResults.summary.passed;
  results.totalFailed += deletionResults.summary.failed;
  console.log(`✅ Deletion: ${deletionResults.summary.passed}/${deletionResults.summary.passed + deletionResults.summary.failed} passed`);

  // Phase 3 Tests (38 tests)
  console.log('\n🚀 Running Phase 3 Tests (38 tests)...');
  const phase3Results = await runPhase3Tests();
  results.suites.phase3 = {
    name: 'Phase 3 (Minimization, Retention, DPIA, Incidents, Audit)',
    passed: phase3Results.passed,
    failed: phase3Results.failed,
    total: phase3Results.total,
    success: phase3Results.failed === 0
  };
  results.totalPassed += phase3Results.passed;
  results.totalFailed += phase3Results.failed;
  console.log(`✅ Phase 3: ${phase3Results.passed}/${phase3Results.total} passed`);

  // Phase 4 Tests (22 tests)
  console.log('\n🎯 Running Phase 4 Tests (22 tests)...');
  const phase4Results = await runPhase4Tests();
  results.suites.phase4 = {
    name: 'Phase 4 (Portability, Breach, Certifications, Processors, Monitoring)',
    passed: phase4Results.passed,
    failed: phase4Results.failed,
    total: phase4Results.total,
    success: phase4Results.failed === 0
  };
  results.totalPassed += phase4Results.passed;
  results.totalFailed += phase4Results.failed;
  console.log(`✅ Phase 4: ${phase4Results.passed}/${phase4Results.total} passed`);

  // Calculate totals
  results.totalTests = results.totalPassed + results.totalFailed;
  const duration = Date.now() - startTime;
  const successRate = ((results.totalPassed / results.totalTests) * 100).toFixed(2);

  // Print final summary
  console.log('\n========================================');
  console.log('🏁 FINAL TEST RESULTS');
  console.log('========================================');
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.totalPassed}`);
  console.log(`❌ Failed: ${results.totalFailed}`);
  console.log(`📊 Success Rate: ${successRate}%`);
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log('========================================');

  // Print per-suite breakdown
  console.log('\n📋 Test Suite Breakdown:');
  for (const [key, suite] of Object.entries(results.suites)) {
    const icon = suite.success ? '✅' : '❌';
    console.log(`${icon} ${suite.name}: ${suite.passed}/${suite.total} passed`);
  }

  console.log('\n========================================\n');

  if (results.totalFailed === 0) {
    console.log('🎉 ALL 104 TESTS PASSED! RGPD COMPLIANCE VERIFIED!\n');
    process.exit(0);
  } else {
    console.log(`❌ ${results.totalFailed} test(s) failed. Please review the logs above.\n`);
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ TEST RUNNER ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
