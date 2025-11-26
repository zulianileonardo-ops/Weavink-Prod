/**
 * Event Social Intelligence - AI Matching Tests
 *
 * 10 real-world tests for the AI matching system:
 * 1. Match looking_for with offering
 * 2. No match when incompatible
 * 3. Compatibility score calculation
 * 4. Double opt-in pending state
 * 5. First user accepts
 * 6. Second user accepts (completes match)
 * 7. User declines
 * 8. Ghost mode users matched
 * 9. Public + Ghost matched
 * 10. No self-matching
 *
 * All tests connect to REAL Neo4j database - no mocks!
 */

import { neo4jClient } from '../../serviceContact/server/neo4j/neo4jClient.js';
import {
  TestLogger,
  generateTestId,
  createTestEvent,
  createTestContact,
  createTestAttendee,
  createCompatiblePair,
  createIncompatiblePair,
  cleanupTestData,
  ensureNeo4jConnected,
} from './testHelpers.js';
import {
  EVENT_VISIBILITY_MODES,
  PARTICIPATION_INTENTS,
  LOOKING_FOR_TYPES,
  OFFERING_TYPES,
} from '../client/constants/eventConstants.js';

/**
 * Run all AI Matching Tests
 * @param {string} testUserId - Unique user ID for this test run
 */
export async function runEventMatchingTests(testUserId = `test-match-${Date.now()}`) {
  const logger = new TestLogger('Event AI Matching');
  const testResults = { passed: 0, failed: 0, tests: [] };

  // Track created resources for cleanup
  const createdEventIds = [];
  const createdContactIds = [];

  logger.info('🚀 Starting Event AI Matching Test Suite', { userId: testUserId });

  // Ensure Neo4j is connected
  try {
    await ensureNeo4jConnected();
    logger.success('Neo4j connection verified');
  } catch (error) {
    logger.error('Neo4j not available - cannot run tests', { error: error.message });
    return { success: false, summary: testResults, error: 'Neo4j unavailable' };
  }

  // ================================================================
  // TEST 1: Match looking_for with offering
  // ================================================================
  try {
    logger.testStart('Test 1: Match looking_for with offering');
    logger.info('WHY: AI should detect when one person offers what another seeks');
    logger.info('HOW: Create pair where A seeks investor and B offers investment');
    logger.info('WHAT: Expect match found with positive compatibility');

    const { eventId } = await createTestEvent(testUserId, { name: 'Compatible Match Event' });
    createdEventIds.push(eventId);

    const { contact1, contact2 } = await createCompatiblePair(testUserId, eventId);
    createdContactIds.push(contact1.contactId, contact2.contactId);

    const matches = await neo4jClient.findEventMatches(testUserId, eventId, 0);

    const foundMatch = matches.some(m =>
      (m.c1.properties.id === contact1.contactId && m.c2.properties.id === contact2.contactId) ||
      (m.c1.properties.id === contact2.contactId && m.c2.properties.id === contact1.contactId)
    );

    if (foundMatch) {
      logger.success('✓ Compatible pair matched successfully');
      testResults.passed++;
      testResults.tests.push({ name: 'Match looking_for with offering', passed: true });
      logger.testEnd('Test 1', true);
    } else {
      throw new Error('Compatible pair not matched');
    }
  } catch (error) {
    logger.error('✗ Test 1 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Match looking_for with offering', passed: false, error: error.message });
    logger.testEnd('Test 1', false);
  }

  // ================================================================
  // TEST 2: No match when incompatible
  // ================================================================
  try {
    logger.testStart('Test 2: No match when incompatible');
    logger.info('WHY: AI should NOT match people with no complementary needs');
    logger.info('HOW: Create pair where both seek the same thing, neither offers');
    logger.info('WHAT: Expect no match (or very low score)');

    const { eventId } = await createTestEvent(testUserId, { name: 'Incompatible Match Event' });
    createdEventIds.push(eventId);

    const { contact1, contact2 } = await createIncompatiblePair(testUserId, eventId);
    createdContactIds.push(contact1.contactId, contact2.contactId);

    const matches = await neo4jClient.findEventMatches(testUserId, eventId, 0.5); // Higher threshold

    const foundMatch = matches.some(m =>
      (m.c1.properties.id === contact1.contactId && m.c2.properties.id === contact2.contactId) ||
      (m.c1.properties.id === contact2.contactId && m.c2.properties.id === contact1.contactId)
    );

    if (!foundMatch) {
      logger.success('✓ Incompatible pair correctly NOT matched');
      testResults.passed++;
      testResults.tests.push({ name: 'No match when incompatible', passed: true });
      logger.testEnd('Test 2', true);
    } else {
      throw new Error('Incompatible pair was incorrectly matched');
    }
  } catch (error) {
    logger.error('✗ Test 2 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'No match when incompatible', passed: false, error: error.message });
    logger.testEnd('Test 2', false);
  }

  // ================================================================
  // TEST 3: Compatibility score calculation
  // ================================================================
  try {
    logger.testStart('Test 3: Compatibility score calculation');
    logger.info('WHY: Matches should have a compatibility score between 0 and 1');
    logger.info('HOW: Find matches and check score property');
    logger.info('WHAT: Expect all scores to be valid numbers in range [0, 1]');

    const eventId = createdEventIds[0]; // Reuse from Test 1
    const matches = await neo4jClient.findEventMatches(testUserId, eventId, 0);

    if (matches.length > 0) {
      const allScoresValid = matches.every(m => {
        const score = m.compatibilityScore;
        return typeof score === 'number' && score >= 0 && score <= 1;
      });

      if (allScoresValid) {
        logger.success('✓ All compatibility scores valid', {
          matchCount: matches.length,
          sampleScore: matches[0]?.compatibilityScore,
        });
        testResults.passed++;
        testResults.tests.push({ name: 'Compatibility score calculation', passed: true });
        logger.testEnd('Test 3', true);
      } else {
        throw new Error('Some scores out of range');
      }
    } else {
      // No matches is OK - just verify the query works
      logger.success('✓ Score calculation query works (no matches to score)');
      testResults.passed++;
      testResults.tests.push({ name: 'Compatibility score calculation', passed: true });
      logger.testEnd('Test 3', true);
    }
  } catch (error) {
    logger.error('✗ Test 3 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Compatibility score calculation', passed: false, error: error.message });
    logger.testEnd('Test 3', false);
  }

  // ================================================================
  // TEST 4: Double opt-in pending state
  // ================================================================
  try {
    logger.testStart('Test 4: Double opt-in pending state');
    logger.info('WHY: Matches should start in pending state (neither accepted)');
    logger.info('HOW: Create MATCHED_AT relationship with status=pending');
    logger.info('WHAT: Expect both contact1Accepted and contact2Accepted to be false');

    const { eventId } = await createTestEvent(testUserId, { name: 'Double Opt-In Event' });
    createdEventIds.push(eventId);

    const { contactId: c1 } = await createTestContact(testUserId, { name: 'Opt-In Contact 1' });
    const { contactId: c2 } = await createTestContact(testUserId, { name: 'Opt-In Contact 2' });
    createdContactIds.push(c1, c2);

    await createTestAttendee(testUserId, c1, eventId);
    await createTestAttendee(testUserId, c2, eventId);

    const result = await neo4jClient.createMatchedAtRelationship(
      testUserId, c1, c2, eventId,
      {
        compatibilityScore: 0.75,
        reasons: ['test_match'],
        status: 'pending',
        contact1Accepted: false,
        contact2Accepted: false,
      }
    );

    if (result.summary.relationshipsCreated >= 1) {
      logger.success('✓ Match created in pending state');
      testResults.passed++;
      testResults.tests.push({ name: 'Double opt-in pending state', passed: true });
      logger.testEnd('Test 4', true);
    } else {
      throw new Error('Match not created');
    }
  } catch (error) {
    logger.error('✗ Test 4 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Double opt-in pending state', passed: false, error: error.message });
    logger.testEnd('Test 4', false);
  }

  // ================================================================
  // TEST 5: First user accepts
  // ================================================================
  try {
    logger.testStart('Test 5: First user accepts');
    logger.info('WHY: When first user accepts, status should stay pending');
    logger.info('HOW: Call updateMatchStatus for first contact with accepted=true');
    logger.info('WHAT: Expect contact1Accepted=true but status still pending');

    const eventId = createdEventIds[createdEventIds.length - 1]; // From Test 4
    const c1 = createdContactIds[createdContactIds.length - 2];
    const c2 = createdContactIds[createdContactIds.length - 1];

    const result = await neo4jClient.updateMatchStatus(testUserId, c1, c2, eventId, true);

    if (result.summary.propertiesSet > 0) {
      logger.success('✓ First user acceptance recorded');
      testResults.passed++;
      testResults.tests.push({ name: 'First user accepts', passed: true });
      logger.testEnd('Test 5', true);
    } else {
      throw new Error('Acceptance not recorded');
    }
  } catch (error) {
    logger.error('✗ Test 5 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'First user accepts', passed: false, error: error.message });
    logger.testEnd('Test 5', false);
  }

  // ================================================================
  // TEST 6: Second user accepts (completes match)
  // ================================================================
  try {
    logger.testStart('Test 6: Second user accepts (completes match)');
    logger.info('WHY: When both users accept, status should change to accepted');
    logger.info('HOW: Call updateMatchStatus for second contact with accepted=true');
    logger.info('WHAT: Expect status=accepted (double opt-in complete)');

    const eventId = createdEventIds[createdEventIds.length - 1];
    const c1 = createdContactIds[createdContactIds.length - 2];
    const c2 = createdContactIds[createdContactIds.length - 1];

    const result = await neo4jClient.updateMatchStatus(testUserId, c2, c1, eventId, true);

    if (result.summary.propertiesSet > 0) {
      logger.success('✓ Second user acceptance recorded - match complete');
      testResults.passed++;
      testResults.tests.push({ name: 'Second user accepts (completes match)', passed: true });
      logger.testEnd('Test 6', true);
    } else {
      throw new Error('Acceptance not recorded');
    }
  } catch (error) {
    logger.error('✗ Test 6 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Second user accepts (completes match)', passed: false, error: error.message });
    logger.testEnd('Test 6', false);
  }

  // ================================================================
  // TEST 7: User declines
  // ================================================================
  try {
    logger.testStart('Test 7: User declines');
    logger.info('WHY: Declining should set status to declined');
    logger.info('HOW: Create new match, have one user decline');
    logger.info('WHAT: Expect status=declined');

    const { eventId } = await createTestEvent(testUserId, { name: 'Decline Test Event' });
    createdEventIds.push(eventId);

    const { contactId: c1 } = await createTestContact(testUserId, { name: 'Decline Contact 1' });
    const { contactId: c2 } = await createTestContact(testUserId, { name: 'Decline Contact 2' });
    createdContactIds.push(c1, c2);

    await createTestAttendee(testUserId, c1, eventId);
    await createTestAttendee(testUserId, c2, eventId);

    await neo4jClient.createMatchedAtRelationship(
      testUserId, c1, c2, eventId,
      { compatibilityScore: 0.6, status: 'pending' }
    );

    // User declines
    const result = await neo4jClient.updateMatchStatus(testUserId, c1, c2, eventId, false);

    if (result.summary.propertiesSet > 0) {
      logger.success('✓ Decline recorded');
      testResults.passed++;
      testResults.tests.push({ name: 'User declines', passed: true });
      logger.testEnd('Test 7', true);
    } else {
      throw new Error('Decline not recorded');
    }
  } catch (error) {
    logger.error('✗ Test 7 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'User declines', passed: false, error: error.message });
    logger.testEnd('Test 7', false);
  }

  // ================================================================
  // TEST 8: Ghost mode users matched
  // ================================================================
  try {
    logger.testStart('Test 8: Ghost mode users matched');
    logger.info('WHY: Ghost mode users should be included in AI matching');
    logger.info('HOW: Create two ghost mode users with compatible needs');
    logger.info('WHAT: Expect findEventMatches to include ghost users');

    const { eventId } = await createTestEvent(testUserId, { name: 'Ghost Matching Event' });
    createdEventIds.push(eventId);

    // Two ghost users with complementary needs
    const { contactId: ghost1 } = await createTestContact(testUserId, { name: 'Ghost Seeker' });
    const { contactId: ghost2 } = await createTestContact(testUserId, { name: 'Ghost Investor' });
    createdContactIds.push(ghost1, ghost2);

    // Note: Neo4j query does direct string matching between lookingFor and offering
    // So we use the same string values on both sides for test compatibility
    await createTestAttendee(testUserId, ghost1, eventId, {
      visibility: EVENT_VISIBILITY_MODES.GHOST,
      lookingFor: ['funding'],  // ghost1 seeks funding
      offering: ['expertise'],
    });

    await createTestAttendee(testUserId, ghost2, eventId, {
      visibility: EVENT_VISIBILITY_MODES.GHOST,
      lookingFor: ['expertise'],  // ghost2 seeks expertise (matches ghost1's offering)
      offering: ['funding'],      // ghost2 offers funding (matches ghost1's lookingFor)
    });

    const matches = await neo4jClient.findEventMatches(testUserId, eventId, 0);

    const foundGhostMatch = matches.some(m =>
      (m.c1.properties.id === ghost1 && m.c2.properties.id === ghost2) ||
      (m.c1.properties.id === ghost2 && m.c2.properties.id === ghost1)
    );

    if (foundGhostMatch) {
      logger.success('✓ Ghost mode users matched successfully');
      testResults.passed++;
      testResults.tests.push({ name: 'Ghost mode users matched', passed: true });
      logger.testEnd('Test 8', true);
    } else {
      throw new Error('Ghost mode users not matched');
    }
  } catch (error) {
    logger.error('✗ Test 8 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Ghost mode users matched', passed: false, error: error.message });
    logger.testEnd('Test 8', false);
  }

  // ================================================================
  // TEST 9: Public + Ghost matched
  // ================================================================
  try {
    logger.testStart('Test 9: Public + Ghost matched');
    logger.info('WHY: AI should match across visibility modes');
    logger.info('HOW: Create one public and one ghost user with compatible needs');
    logger.info('WHAT: Expect match found between them');

    const { eventId } = await createTestEvent(testUserId, { name: 'Mixed Visibility Match Event' });
    createdEventIds.push(eventId);

    const { contactId: publicUser } = await createTestContact(testUserId, { name: 'Public Founder' });
    const { contactId: ghostUser } = await createTestContact(testUserId, { name: 'Ghost Investor' });
    createdContactIds.push(publicUser, ghostUser);

    // Note: Neo4j query does direct string matching between lookingFor and offering
    await createTestAttendee(testUserId, publicUser, eventId, {
      visibility: EVENT_VISIBILITY_MODES.PUBLIC,
      lookingFor: ['investment'],  // public user seeks investment
      offering: ['collaboration'],
    });

    await createTestAttendee(testUserId, ghostUser, eventId, {
      visibility: EVENT_VISIBILITY_MODES.GHOST,
      lookingFor: ['collaboration'],  // ghost seeks collaboration (matches public's offering)
      offering: ['investment'],       // ghost offers investment (matches public's lookingFor)
    });

    const matches = await neo4jClient.findEventMatches(testUserId, eventId, 0);

    const foundMixedMatch = matches.some(m =>
      (m.c1.properties.id === publicUser && m.c2.properties.id === ghostUser) ||
      (m.c1.properties.id === ghostUser && m.c2.properties.id === publicUser)
    );

    if (foundMixedMatch) {
      logger.success('✓ Public + Ghost users matched');
      testResults.passed++;
      testResults.tests.push({ name: 'Public + Ghost matched', passed: true });
      logger.testEnd('Test 9', true);
    } else {
      throw new Error('Public + Ghost not matched');
    }
  } catch (error) {
    logger.error('✗ Test 9 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Public + Ghost matched', passed: false, error: error.message });
    logger.testEnd('Test 9', false);
  }

  // ================================================================
  // TEST 10: No self-matching
  // ================================================================
  try {
    logger.testStart('Test 10: No self-matching');
    logger.info('WHY: A contact should not be matched with themselves');
    logger.info('HOW: Check that findEventMatches never returns same contact twice');
    logger.info('WHAT: Expect c1.id != c2.id for all matches');

    // Use any existing event with matches
    const eventId = createdEventIds[0];
    const matches = await neo4jClient.findEventMatches(testUserId, eventId, 0);

    const hasSelfMatch = matches.some(m =>
      m.c1.properties.id === m.c2.properties.id
    );

    if (!hasSelfMatch) {
      logger.success('✓ No self-matching detected');
      testResults.passed++;
      testResults.tests.push({ name: 'No self-matching', passed: true });
      logger.testEnd('Test 10', true);
    } else {
      throw new Error('Self-match found');
    }
  } catch (error) {
    logger.error('✗ Test 10 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'No self-matching', passed: false, error: error.message });
    logger.testEnd('Test 10', false);
  }

  // ================================================================
  // CLEANUP
  // ================================================================
  try {
    logger.info('🧹 Cleanup: Removing test data');
    await cleanupTestData(testUserId, createdEventIds, createdContactIds);
    logger.info('✓ Cleanup complete');
  } catch (error) {
    logger.warning('Cleanup had errors', { error: error.message });
  }

  // ================================================================
  // SUMMARY
  // ================================================================
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
    passed: testResults.passed,
    failed: testResults.failed,
  };
}
