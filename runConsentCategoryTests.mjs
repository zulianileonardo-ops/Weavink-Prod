/**
 * Direct Test Runner for Consent Category Tests
 * Run with: node runConsentCategoryTests.mjs
 */

// Load environment variables
import { config } from 'dotenv';
config();

import { runConsentCategoryTests } from './lib/services/servicePrivacy/tests/consentCategoryTests.js';

console.log('\n=================================');
console.log('🧪 CONSENT CATEGORY TEST RUNNER');
console.log('=================================\n');

try {
  const testUserId = `test-consent-category-${Date.now()}`;
  console.log(`Test User ID: ${testUserId}\n`);

  const results = await runConsentCategoryTests(testUserId);

  console.log('\n=================================');
  console.log('🏁 TEST RESULTS');
  console.log('=================================');
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Total: ${results.summary.passed + results.summary.failed}`);
  console.log(`Success: ${results.success ? '✅ YES' : '❌ NO'}`);
  console.log('=================================\n');

  if (results.success) {
    console.log('✅ ALL CONSENT CATEGORY TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED!\n');
    console.log('Failed tests:');
    results.summary.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    console.log('');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ TEST RUNNER ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
