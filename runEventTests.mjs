/**
 * Event Social Intelligence Test Runner
 *
 * Runs all 95+ tests across 8 test suites:
 * - Neo4j Event Methods (12 tests)
 * - Visibility System (8 tests)
 * - AI Matching (10 tests)
 * - EventService Firestore (15 tests)
 * - VisibilityService Class (10 tests)
 * - EventPanel API Integration (10 tests) - Sprint 3
 * - MatchingService (15 tests) - Sprint 4
 * - MeetingZoneService (15 tests) - Sprint 5
 *
 * All tests connect to REAL databases (Neo4j + Firestore) - no mocks!
 *
 * Run with: node -r dotenv/config runEventTests.mjs
 */

// Load environment variables
import { config } from 'dotenv';
config();

import { runEventNeo4jTests } from './lib/services/serviceEvent/tests/eventNeo4jTests.js';
import { runEventVisibilityTests } from './lib/services/serviceEvent/tests/eventVisibilityTests.js';
import { runEventMatchingTests } from './lib/services/serviceEvent/tests/eventMatchingTests.js';
import { runEventServiceTests } from './lib/services/serviceEvent/tests/eventServiceTests.js';
import { runVisibilityServiceClassTests } from './lib/services/serviceEvent/tests/visibilityServiceClassTests.js';
import { runEventPanelApiTests } from './lib/services/serviceEvent/tests/eventPanelApiTests.js';
import { runMatchingServiceTests } from './lib/services/serviceEvent/tests/matchingServiceTests.js';
import { runMeetingZoneServiceTests } from './lib/services/serviceEvent/tests/meetingZoneServiceTests.js';

console.log('\n========================================');
console.log('🎯 EVENT SOCIAL INTELLIGENCE TEST RUNNER');
console.log('========================================');
console.log('Running all 95+ tests across 8 suites\n');
console.log('Prerequisites:');
console.log('  - NEO4J_URI set in .env');
console.log('  - NEO4J_USERNAME set in .env');
console.log('  - NEO4J_PASSWORD set in .env');
console.log('  - FIREBASE_PROJECT_ID set in .env');
console.log('  - GOOGLE_APPLICATION_CREDENTIALS set');
console.log('========================================\n');

const startTime = Date.now();
const results = {
  suites: {},
  totalPassed: 0,
  totalFailed: 0,
  totalTests: 0
};

try {
  // ================================================================
  // Suite 1: Neo4j Event Methods (12 tests)
  // ================================================================
  console.log('\n📊 Running Neo4j Event Methods Tests (12 tests)...');
  const neo4jResults = await runEventNeo4jTests(`test-neo4j-${Date.now()}`);
  results.suites.neo4j = {
    name: 'Neo4j Event Methods',
    passed: neo4jResults.passed,
    failed: neo4jResults.failed,
    total: neo4jResults.passed + neo4jResults.failed,
    success: neo4jResults.success
  };
  results.totalPassed += neo4jResults.passed;
  results.totalFailed += neo4jResults.failed;
  console.log(`${neo4jResults.success ? '✅' : '❌'} Neo4j: ${neo4jResults.passed}/${neo4jResults.passed + neo4jResults.failed} passed`);

  // ================================================================
  // Suite 2: Visibility System (8 tests)
  // ================================================================
  console.log('\n👁️  Running Visibility System Tests (8 tests)...');
  const visibilityResults = await runEventVisibilityTests(`test-vis-${Date.now()}`);
  results.suites.visibility = {
    name: 'Visibility System',
    passed: visibilityResults.passed,
    failed: visibilityResults.failed,
    total: visibilityResults.passed + visibilityResults.failed,
    success: visibilityResults.success
  };
  results.totalPassed += visibilityResults.passed;
  results.totalFailed += visibilityResults.failed;
  console.log(`${visibilityResults.success ? '✅' : '❌'} Visibility: ${visibilityResults.passed}/${visibilityResults.passed + visibilityResults.failed} passed`);

  // ================================================================
  // Suite 3: AI Matching (10 tests)
  // ================================================================
  console.log('\n🤖 Running AI Matching Tests (10 tests)...');
  const matchingResults = await runEventMatchingTests(`test-match-${Date.now()}`);
  results.suites.matching = {
    name: 'AI Matching',
    passed: matchingResults.passed,
    failed: matchingResults.failed,
    total: matchingResults.passed + matchingResults.failed,
    success: matchingResults.success
  };
  results.totalPassed += matchingResults.passed;
  results.totalFailed += matchingResults.failed;
  console.log(`${matchingResults.success ? '✅' : '❌'} Matching: ${matchingResults.passed}/${matchingResults.passed + matchingResults.failed} passed`);

  // ================================================================
  // Suite 4: EventService Firestore (15 tests)
  // ================================================================
  console.log('\n🔥 Running EventService Firestore Tests (15 tests)...');
  const eventServiceResults = await runEventServiceTests(`test-evtsvc-${Date.now()}`);
  results.suites.eventService = {
    name: 'EventService Firestore',
    passed: eventServiceResults.passed,
    failed: eventServiceResults.failed,
    total: eventServiceResults.passed + eventServiceResults.failed,
    success: eventServiceResults.success
  };
  results.totalPassed += eventServiceResults.passed;
  results.totalFailed += eventServiceResults.failed;
  console.log(`${eventServiceResults.success ? '✅' : '❌'} EventService: ${eventServiceResults.passed}/${eventServiceResults.passed + eventServiceResults.failed} passed`);

  // ================================================================
  // Suite 5: VisibilityService Class (10 tests)
  // ================================================================
  console.log('\n🔐 Running VisibilityService Class Tests (10 tests)...');
  const visibilityClassResults = await runVisibilityServiceClassTests(`test-vissvc-${Date.now()}`);
  results.suites.visibilityClass = {
    name: 'VisibilityService Class',
    passed: visibilityClassResults.passed,
    failed: visibilityClassResults.failed,
    total: visibilityClassResults.passed + visibilityClassResults.failed,
    success: visibilityClassResults.success
  };
  results.totalPassed += visibilityClassResults.passed;
  results.totalFailed += visibilityClassResults.failed;
  console.log(`${visibilityClassResults.success ? '✅' : '❌'} VisibilityService: ${visibilityClassResults.passed}/${visibilityClassResults.passed + visibilityClassResults.failed} passed`);

  // ================================================================
  // Suite 6: EventPanel API Integration (10 tests) - Sprint 3
  // ================================================================
  console.log('\n📱 Running EventPanel API Integration Tests (10 tests)...');
  const eventPanelResults = await runEventPanelApiTests(`test-panel-${Date.now()}`);
  results.suites.eventPanel = {
    name: 'EventPanel API Integration',
    passed: eventPanelResults.passed,
    failed: eventPanelResults.failed,
    total: eventPanelResults.passed + eventPanelResults.failed,
    success: eventPanelResults.success
  };
  results.totalPassed += eventPanelResults.passed;
  results.totalFailed += eventPanelResults.failed;
  console.log(`${eventPanelResults.success ? '✅' : '❌'} EventPanel: ${eventPanelResults.passed}/${eventPanelResults.passed + eventPanelResults.failed} passed`);

  // ================================================================
  // Suite 7: MatchingService (15 tests) - Sprint 4
  // ================================================================
  console.log('\n🎯 Running MatchingService Tests (15 tests)...');
  const matchingServiceResults = await runMatchingServiceTests(`test-matchsvc-${Date.now()}`);
  results.suites.matchingService = {
    name: 'MatchingService (Sprint 4)',
    passed: matchingServiceResults.summary.passed,
    failed: matchingServiceResults.summary.failed,
    total: matchingServiceResults.summary.passed + matchingServiceResults.summary.failed,
    success: matchingServiceResults.success
  };
  results.totalPassed += matchingServiceResults.summary.passed;
  results.totalFailed += matchingServiceResults.summary.failed;
  console.log(`${matchingServiceResults.success ? '✅' : '❌'} MatchingService: ${matchingServiceResults.summary.passed}/${matchingServiceResults.summary.passed + matchingServiceResults.summary.failed} passed`);

  // ================================================================
  // Suite 8: MeetingZoneService (15 tests) - Sprint 5
  // ================================================================
  console.log('\n🗺️  Running MeetingZoneService Tests (15 tests)...');
  const meetingZoneResults = await runMeetingZoneServiceTests(`test-mzsvc-${Date.now()}`);
  results.suites.meetingZone = {
    name: 'MeetingZoneService (Sprint 5)',
    passed: meetingZoneResults.summary.passed,
    failed: meetingZoneResults.summary.failed,
    total: meetingZoneResults.summary.passed + meetingZoneResults.summary.failed,
    success: meetingZoneResults.success
  };
  results.totalPassed += meetingZoneResults.summary.passed;
  results.totalFailed += meetingZoneResults.summary.failed;
  console.log(`${meetingZoneResults.success ? '✅' : '❌'} MeetingZoneService: ${meetingZoneResults.summary.passed}/${meetingZoneResults.summary.passed + meetingZoneResults.summary.failed} passed`);

  // ================================================================
  // Final Summary
  // ================================================================
  results.totalTests = results.totalPassed + results.totalFailed;
  const duration = Date.now() - startTime;
  const successRate = ((results.totalPassed / results.totalTests) * 100).toFixed(2);

  console.log('\n========================================');
  console.log('🏁 FINAL TEST RESULTS');
  console.log('========================================');
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.totalPassed}`);
  console.log(`❌ Failed: ${results.totalFailed}`);
  console.log(`📊 Success Rate: ${successRate}%`);
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log('========================================');

  // Per-suite breakdown
  console.log('\n📋 Test Suite Breakdown:');
  for (const [key, suite] of Object.entries(results.suites)) {
    const icon = suite.success ? '✅' : '❌';
    console.log(`${icon} ${suite.name}: ${suite.passed}/${suite.total} passed`);
  }

  console.log('\n========================================\n');

  if (results.totalFailed === 0) {
    console.log('🎉 ALL 95+ TESTS PASSED! EVENT SOCIAL INTELLIGENCE VERIFIED!\n');
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
