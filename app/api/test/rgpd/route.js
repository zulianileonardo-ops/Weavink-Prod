/**
 * RGPD Testing API Endpoint
 *
 * Provides console-accessible endpoint to run all RGPD Phase 1-2 tests
 *
 * Usage:
 *   POST /api/test/rgpd
 *   Body: {
 *     "suite": "all" | "consent" | "export" | "deletion",
 *     "userId": "optional-test-user-id"
 *   }
 */

import { NextResponse } from 'next/server';
import { runConsentTests } from '../../../../lib/services/servicePrivacy/tests/consentTests.js';
import { runDataExportTests } from '../../../../lib/services/servicePrivacy/tests/dataExportTests.js';
import { runAccountDeletionTests } from '../../../../lib/services/servicePrivacy/tests/accountDeletionTests.js';
import { runPhase3Tests } from '../../../../lib/services/servicePrivacy/tests/phase3Tests.js';

/**
 * POST /api/test/rgpd
 * Run RGPD compliance tests
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { suite = 'all', userId = null } = body;

    console.log('\n=================================');
    console.log('🧪 RGPD COMPLIANCE TEST RUNNER');
    console.log('=================================\n');

    const results = {
      timestamp: new Date().toISOString(),
      requestedSuite: suite,
      testUserId: userId,
      results: {},
    };

    // Generate unique test user IDs if not provided
    const consentUserId = userId || `test-consent-${Date.now()}`;
    const exportUserId = userId || `test-export-${Date.now()}`;
    const deletionUserId = userId || `test-deletion-${Date.now()}`;

    // Run Consent Tests
    if (suite === 'all' || suite === 'consent') {
      console.log('\n📋 Running Consent Management Tests...\n');
      const consentResults = await runConsentTests(consentUserId);
      results.results.consent = consentResults;
    }

    // Run Data Export Tests
    if (suite === 'all' || suite === 'export') {
      console.log('\n📦 Running Data Export Tests...\n');
      const exportResults = await runDataExportTests(exportUserId);
      results.results.export = exportResults;
    }

    // Run Account Deletion Tests
    if (suite === 'all' || suite === 'deletion') {
      console.log('\n🗑️  Running Account Deletion Tests...\n');
      const deletionResults = await runAccountDeletionTests(deletionUserId);
      results.results.deletion = deletionResults;
    }

    // Run Phase 3 Tests
    if (suite === 'all' || suite === 'phase3') {
      console.log('\n🚀 Running Phase 3 Tests...\n');
      const phase3Results = await runPhase3Tests();
      results.results.phase3 = {
        success: phase3Results.failed === 0,
        summary: {
          passed: phase3Results.passed,
          failed: phase3Results.failed,
          total: phase3Results.total,
        },
        tests: phase3Results.tests,
      };
    }

    // Cookie consent tests are frontend-only (not included in API tests)
    if (suite === 'cookie') {
      results.results.cookie = {
        success: false,
        message: 'Cookie consent tests must be run in browser console. See RGPD_TESTING_GUIDE.md',
      };
    }

    // Calculate overall results
    const allSuites = Object.values(results.results);
    const totalPassed = allSuites.reduce((sum, suite) => sum + (suite.summary?.passed || 0), 0);
    const totalFailed = allSuites.reduce((sum, suite) => sum + (suite.summary?.failed || 0), 0);
    const allSuccess = allSuites.every(suite => suite.success);

    results.summary = {
      totalTests: totalPassed + totalFailed,
      passed: totalPassed,
      failed: totalFailed,
      successRate: totalPassed + totalFailed > 0
        ? `${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2)}%`
        : '0%',
      allTestsPassed: allSuccess,
    };

    console.log('\n=================================');
    console.log('🏁 TEST SUMMARY');
    console.log('=================================');
    console.log(`Total Tests: ${results.summary.totalTests}`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`📊 Success Rate: ${results.summary.successRate}`);
    console.log(`${results.summary.allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('=================================\n');

    return NextResponse.json(results, {
      status: allSuccess ? 200 : 500,
    });
  } catch (error) {
    console.error('❌ Test runner error:', error);
    return NextResponse.json(
      {
        error: 'Test runner failed',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/rgpd
 * Get test documentation and available test suites
 */
export async function GET() {
  return NextResponse.json({
    message: 'RGPD Compliance Test API',
    version: '1.0.0',
    documentation: 'See RGPD_TESTING_GUIDE.md for detailed instructions',
    availableTests: {
      all: 'Run all RGPD compliance tests (Phase 1-3)',
      consent: 'Test consent management system',
      export: 'Test data export functionality',
      deletion: 'Test account deletion with grace period',
      phase3: 'Test Phase 3 features (minimization, retention, DPIA, incidents, audit logs)',
      cookie: 'Cookie consent tests (browser only)',
    },
    usage: {
      method: 'POST',
      endpoint: '/api/test/rgpd',
      body: {
        suite: 'all | consent | export | deletion',
        userId: 'optional-test-user-id (generated if omitted)',
      },
      example: `
        fetch('/api/test/rgpd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suite: 'all' })
        })
        .then(res => res.json())
        .then(data => console.log(data))
      `,
    },
    quickStart: {
      console: `
// Run all tests in browser console:
fetch('/api/test/rgpd', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ suite: 'all' })
})
.then(res => res.json())
.then(data => {
  console.log('Test Results:', data);
  console.log('Success Rate:', data.summary.successRate);
  if (data.summary.allTestsPassed) {
    console.log('✅ ALL TESTS PASSED!');
  } else {
    console.log('❌ Some tests failed. Check data.results for details.');
  }
})
.catch(err => console.error('Test error:', err));
      `,
    },
  });
}
