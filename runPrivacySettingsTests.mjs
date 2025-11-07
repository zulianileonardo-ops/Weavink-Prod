/**
 * Privacy Settings Test Runner
 * Standalone script to run privacy settings tests
 */

import { config } from 'dotenv';
config();

import { runPrivacySettingsTests } from './lib/services/servicePrivacy/tests/privacySettingsTests.js';

async function main() {
  console.log('🚀 Starting Privacy Settings Tests...\n');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Firebase Project:', process.env.FIREBASE_PROJECT_ID);
  console.log('='.repeat(80));

  try {
    const results = await runPrivacySettingsTests();

    console.log('\n📊 Final Results:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(results, null, 2));
    console.log('='.repeat(80));

    if (results.success) {
      console.log('\n✅ All privacy settings tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some privacy settings tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Privacy settings test suite crashed:', error);
    process.exit(1);
  }
}

main();
