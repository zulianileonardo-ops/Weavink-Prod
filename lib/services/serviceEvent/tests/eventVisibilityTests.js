/**
 * Event Social Intelligence - Visibility System Tests
 *
 * 8 real-world tests for the 4-tier visibility system:
 * 1. Public visibility visible to all
 * 2. Friends visibility to friends only
 * 3. Private visibility hidden from all
 * 4. Ghost mode hidden from humans
 * 5. Ghost mode visible to AI
 * 6. Visibility mode change
 * 7. Mixed visibility attendees
 * 8. Self always visible
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
  createMixedVisibilityAttendees,
  cleanupTestData,
  ensureNeo4jConnected,
} from './testHelpers.js';
import { EVENT_VISIBILITY_MODES } from '../client/constants/eventConstants.js';

/**
 * Run all Visibility System Tests
 * @param {string} testUserId - Unique user ID for this test run
 */
export async function runEventVisibilityTests(testUserId = `test-vis-${Date.now()}`) {
  const logger = new TestLogger('Event Visibility System');
  const testResults = { passed: 0, failed: 0, tests: [] };

  // Track created resources for cleanup
  const createdEventIds = [];
  const createdContactIds = [];

  logger.info('🚀 Starting Event Visibility Test Suite', { userId: testUserId });

  // Ensure Neo4j is connected
  try {
    await ensureNeo4jConnected();
    logger.success('Neo4j connection verified');
  } catch (error) {
    logger.error('Neo4j not available - cannot run tests', { error: error.message });
    return { success: false, summary: testResults, error: 'Neo4j unavailable' };
  }

  // Create main test event for visibility tests
  let mainEventId;
  try {
    const { eventId } = await createTestEvent(testUserId, { name: 'Visibility Test Event' });
    mainEventId = eventId;
    createdEventIds.push(eventId);
    logger.info('Created test event', { eventId });
  } catch (error) {
    logger.error('Failed to create test event', { error: error.message });
    return { success: false, summary: testResults, error: 'Setup failed' };
  }

  // ================================================================
  // TEST 1: Public visibility visible to all
  // ================================================================
  try {
    logger.testStart('Test 1: Public Visibility Visible to All');
    logger.info('WHY: PUBLIC mode attendees should be visible to everyone');
    logger.info('HOW: Create PUBLIC attendee, query as stranger (no friends, not self)');
    logger.info('WHAT: Expect attendee returned in results');

    const { contactId: publicContact } = await createTestContact(testUserId, { name: 'Public Person' });
    createdContactIds.push(publicContact);

    await createTestAttendee(testUserId, publicContact, mainEventId, {
      visibility: EVENT_VISIBILITY_MODES.PUBLIC,
    });

    // Query as stranger
    const attendees = await neo4jClient.getEventAttendees(testUserId, mainEventId, null, []);
    const foundPublic = attendees.some(a => a.c.properties.id === publicContact);

    if (foundPublic) {
      logger.success('✓ Public attendee visible to stranger');
      testResults.passed++;
      testResults.tests.push({ name: 'Public Visibility Visible to All', passed: true });
      logger.testEnd('Test 1', true);
    } else {
      throw new Error('Public attendee not visible');
    }
  } catch (error) {
    logger.error('✗ Test 1 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Public Visibility Visible to All', passed: false, error: error.message });
    logger.testEnd('Test 1', false);
  }

  // ================================================================
  // TEST 2: Friends visibility to friends only
  // ================================================================
  try {
    logger.testStart('Test 2: Friends Visibility to Friends Only');
    logger.info('WHY: FRIENDS mode attendees should only be visible to their connections');
    logger.info('HOW: Create FRIENDS attendee, query without and with friend list');
    logger.info('WHAT: Expect hidden when not friend, visible when friend');

    const { contactId: friendsContact } = await createTestContact(testUserId, { name: 'Friends Only Person' });
    createdContactIds.push(friendsContact);

    await createTestAttendee(testUserId, friendsContact, mainEventId, {
      visibility: EVENT_VISIBILITY_MODES.FRIENDS,
    });

    // Query as stranger - should NOT see
    const strangersView = await neo4jClient.getEventAttendees(testUserId, mainEventId, null, []);
    const visibleToStranger = strangersView.some(a => a.c.properties.id === friendsContact);

    // Query as friend - should see
    const friendsView = await neo4jClient.getEventAttendees(testUserId, mainEventId, null, [friendsContact]);
    const visibleToFriend = friendsView.some(a => a.c.properties.id === friendsContact);

    if (!visibleToStranger && visibleToFriend) {
      logger.success('✓ Friends attendee: hidden from stranger, visible to friend');
      testResults.passed++;
      testResults.tests.push({ name: 'Friends Visibility to Friends Only', passed: true });
      logger.testEnd('Test 2', true);
    } else {
      throw new Error(`Unexpected visibility: stranger=${visibleToStranger}, friend=${visibleToFriend}`);
    }
  } catch (error) {
    logger.error('✗ Test 2 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Friends Visibility to Friends Only', passed: false, error: error.message });
    logger.testEnd('Test 2', false);
  }

  // ================================================================
  // TEST 3: Private visibility hidden from all
  // ================================================================
  try {
    logger.testStart('Test 3: Private Visibility Hidden from All');
    logger.info('WHY: PRIVATE mode attendees should be invisible to everyone');
    logger.info('HOW: Create PRIVATE attendee, query with various access levels');
    logger.info('WHAT: Expect never returned (except possibly self)');

    const { contactId: privateContact } = await createTestContact(testUserId, { name: 'Private Person' });
    createdContactIds.push(privateContact);

    await createTestAttendee(testUserId, privateContact, mainEventId, {
      visibility: EVENT_VISIBILITY_MODES.PRIVATE,
    });

    // Query as stranger
    const strangersView = await neo4jClient.getEventAttendees(testUserId, mainEventId, null, []);
    const visibleToStranger = strangersView.some(a => a.c.properties.id === privateContact);

    // Query as "friend" (but private overrides)
    const friendsView = await neo4jClient.getEventAttendees(testUserId, mainEventId, null, [privateContact]);
    const visibleToFriend = friendsView.some(a => a.c.properties.id === privateContact);

    if (!visibleToStranger && !visibleToFriend) {
      logger.success('✓ Private attendee hidden from all');
      testResults.passed++;
      testResults.tests.push({ name: 'Private Visibility Hidden from All', passed: true });
      logger.testEnd('Test 3', true);
    } else {
      throw new Error(`Private attendee visible: stranger=${visibleToStranger}, friend=${visibleToFriend}`);
    }
  } catch (error) {
    logger.error('✗ Test 3 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Private Visibility Hidden from All', passed: false, error: error.message });
    logger.testEnd('Test 3', false);
  }

  // ================================================================
  // TEST 4: Ghost mode hidden from humans
  // ================================================================
  try {
    logger.testStart('Test 4: Ghost Mode Hidden from Humans');
    logger.info('WHY: GHOST mode attendees should be invisible to human queries');
    logger.info('HOW: Create GHOST attendee, query via getEventAttendees');
    logger.info('WHAT: Expect NOT returned in regular attendee list');

    const { contactId: ghostContact } = await createTestContact(testUserId, { name: 'Ghost Person' });
    createdContactIds.push(ghostContact);

    await createTestAttendee(testUserId, ghostContact, mainEventId, {
      visibility: EVENT_VISIBILITY_MODES.GHOST,
    });

    // Query regular attendees
    const humanView = await neo4jClient.getEventAttendees(testUserId, mainEventId, null, []);
    const visibleToHumans = humanView.some(a => a.c.properties.id === ghostContact);

    if (!visibleToHumans) {
      logger.success('✓ Ghost attendee hidden from human queries');
      testResults.passed++;
      testResults.tests.push({ name: 'Ghost Mode Hidden from Humans', passed: true });
      logger.testEnd('Test 4', true);
    } else {
      throw new Error('Ghost attendee visible to humans');
    }
  } catch (error) {
    logger.error('✗ Test 4 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Ghost Mode Hidden from Humans', passed: false, error: error.message });
    logger.testEnd('Test 4', false);
  }

  // ================================================================
  // TEST 5: Ghost mode visible to AI
  // ================================================================
  try {
    logger.testStart('Test 5: Ghost Mode Visible to AI');
    logger.info('WHY: AI needs to see GHOST attendees for matching');
    logger.info('HOW: Query via getGhostModeAttendees()');
    logger.info('WHAT: Expect ghost attendee returned');

    // Get last ghost contact from Test 4
    const ghostContact = createdContactIds[createdContactIds.length - 1];

    const aiView = await neo4jClient.getGhostModeAttendees(testUserId, mainEventId);
    const visibleToAI = aiView.some(a => a.c.properties.id === ghostContact);

    if (visibleToAI) {
      logger.success('✓ Ghost attendee visible to AI queries');
      testResults.passed++;
      testResults.tests.push({ name: 'Ghost Mode Visible to AI', passed: true });
      logger.testEnd('Test 5', true);
    } else {
      throw new Error('Ghost attendee not visible to AI');
    }
  } catch (error) {
    logger.error('✗ Test 5 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Ghost Mode Visible to AI', passed: false, error: error.message });
    logger.testEnd('Test 5', false);
  }

  // ================================================================
  // TEST 6: Visibility mode change
  // ================================================================
  try {
    logger.testStart('Test 6: Visibility Mode Change');
    logger.info('WHY: Users must be able to change their visibility at any time');
    logger.info('HOW: Create PUBLIC attendee, change to GHOST');
    logger.info('WHAT: Expect initially visible, then hidden after change');

    const { contactId: changingContact } = await createTestContact(testUserId, { name: 'Changing Visibility' });
    createdContactIds.push(changingContact);

    await createTestAttendee(testUserId, changingContact, mainEventId, {
      visibility: EVENT_VISIBILITY_MODES.PUBLIC,
    });

    // Initially visible
    const before = await neo4jClient.getEventAttendees(testUserId, mainEventId, null, []);
    const visibleBefore = before.some(a => a.c.properties.id === changingContact);

    // Change to ghost
    await neo4jClient.updateAttendanceVisibility(
      testUserId,
      changingContact,
      mainEventId,
      EVENT_VISIBILITY_MODES.GHOST
    );

    // Should now be hidden
    const after = await neo4jClient.getEventAttendees(testUserId, mainEventId, null, []);
    const visibleAfter = after.some(a => a.c.properties.id === changingContact);

    // But visible to AI
    const aiView = await neo4jClient.getGhostModeAttendees(testUserId, mainEventId);
    const visibleToAI = aiView.some(a => a.c.properties.id === changingContact);

    if (visibleBefore && !visibleAfter && visibleToAI) {
      logger.success('✓ Visibility change worked: public→ghost');
      testResults.passed++;
      testResults.tests.push({ name: 'Visibility Mode Change', passed: true });
      logger.testEnd('Test 6', true);
    } else {
      throw new Error(`Visibility change failed: before=${visibleBefore}, after=${visibleAfter}, ai=${visibleToAI}`);
    }
  } catch (error) {
    logger.error('✗ Test 6 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Visibility Mode Change', passed: false, error: error.message });
    logger.testEnd('Test 6', false);
  }

  // ================================================================
  // TEST 7: Mixed visibility attendees
  // ================================================================
  try {
    logger.testStart('Test 7: Mixed Visibility Attendees');
    logger.info('WHY: Real events have attendees with different visibility modes');
    logger.info('HOW: Create one of each mode, query from different perspectives');
    logger.info('WHAT: Expect correct filtering for each visibility mode');

    // Create new event for clean test
    const { eventId: mixedEventId } = await createTestEvent(testUserId, { name: 'Mixed Visibility Event' });
    createdEventIds.push(mixedEventId);

    // Create one attendee of each visibility mode
    const contacts = await createMixedVisibilityAttendees(testUserId, mixedEventId);
    Object.values(contacts).forEach(c => createdContactIds.push(c.contactId));

    // Query as stranger (no friends)
    const strangerView = await neo4jClient.getEventAttendees(testUserId, mixedEventId, null, []);
    const strangerSees = strangerView.map(a => a.r.properties.visibility);

    // Should only see public
    const strangerSeesPublic = strangerSees.includes('public');
    const strangerSeesFriends = strangerSees.includes('friends');
    const strangerSeesPrivate = strangerSees.includes('private');
    const strangerSeesGhost = strangerSees.includes('ghost');

    if (strangerSeesPublic && !strangerSeesFriends && !strangerSeesPrivate && !strangerSeesGhost) {
      logger.success('✓ Mixed visibility filtering works correctly');
      testResults.passed++;
      testResults.tests.push({ name: 'Mixed Visibility Attendees', passed: true });
      logger.testEnd('Test 7', true);
    } else {
      throw new Error(`Incorrect filtering: public=${strangerSeesPublic}, friends=${strangerSeesFriends}, private=${strangerSeesPrivate}, ghost=${strangerSeesGhost}`);
    }
  } catch (error) {
    logger.error('✗ Test 7 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Mixed Visibility Attendees', passed: false, error: error.message });
    logger.testEnd('Test 7', false);
  }

  // ================================================================
  // TEST 8: Self always visible
  // ================================================================
  try {
    logger.testStart('Test 8: Self Always Visible');
    logger.info('WHY: Users should always see their own participation');
    logger.info('HOW: Create PRIVATE attendee, query as self');
    logger.info('WHAT: Expect to see own participation even in private mode');

    const { contactId: selfContact } = await createTestContact(testUserId, { name: 'Self Test User' });
    createdContactIds.push(selfContact);

    await createTestAttendee(testUserId, selfContact, mainEventId, {
      visibility: EVENT_VISIBILITY_MODES.PRIVATE,
    });

    // Query as self
    const selfView = await neo4jClient.getEventAttendees(testUserId, mainEventId, selfContact, []);
    const visibleToSelf = selfView.some(a => a.c.properties.id === selfContact);

    if (visibleToSelf) {
      logger.success('✓ Private attendee visible to self');
      testResults.passed++;
      testResults.tests.push({ name: 'Self Always Visible', passed: true });
      logger.testEnd('Test 8', true);
    } else {
      throw new Error('Self not visible in private mode');
    }
  } catch (error) {
    logger.error('✗ Test 8 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Self Always Visible', passed: false, error: error.message });
    logger.testEnd('Test 8', false);
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
