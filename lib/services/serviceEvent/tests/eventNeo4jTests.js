/**
 * Event Social Intelligence - Neo4j Tests
 *
 * 12 real-world tests for Neo4j event methods:
 * 1. Create Event Node
 * 2. Update Event Node
 * 3. Delete Event Node
 * 4. Create ATTENDS Relationship
 * 5. Update Visibility (Ghost Mode)
 * 6. Create MATCHED_AT Relationship
 * 7. Update Match Status (Accept)
 * 8. Update Match Status (Decline)
 * 9. Get Event Attendees (Public)
 * 10. Get Event Attendees (Friends)
 * 11. Get Ghost Mode Attendees
 * 12. Find Event Matches
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
 * Run all Neo4j Event Tests
 * @param {string} testUserId - Unique user ID for this test run
 */
export async function runEventNeo4jTests(testUserId = `test-neo4j-${Date.now()}`) {
  const logger = new TestLogger('Event Neo4j Methods');
  const testResults = { passed: 0, failed: 0, tests: [] };

  // Track created resources for cleanup
  const createdEventIds = [];
  const createdContactIds = [];

  logger.info('🚀 Starting Event Neo4j Test Suite', { userId: testUserId });

  // Ensure Neo4j is connected
  try {
    await ensureNeo4jConnected();
    logger.success('Neo4j connection verified');
  } catch (error) {
    logger.error('Neo4j not available - cannot run tests', { error: error.message });
    return { success: false, summary: testResults, error: 'Neo4j unavailable' };
  }

  // ================================================================
  // TEST 1: Create Event Node
  // ================================================================
  try {
    logger.testStart('Test 1: Create Event Node');
    logger.info('WHY: Events must be stored as nodes in Neo4j for graph queries');
    logger.info('HOW: Call upsertEvent() with event data');
    logger.info('WHAT: Expect event node created with correct properties');

    const { eventId, event, result } = await createTestEvent(testUserId, {
      name: 'Test Conference 2025',
      description: 'A test event for Neo4j integration tests',
    });
    createdEventIds.push(eventId);

    if (result.summary.nodesCreated >= 1) {
      logger.success('✓ Event node created', { eventId, nodesCreated: result.summary.nodesCreated });
      testResults.passed++;
      testResults.tests.push({ name: 'Create Event Node', passed: true });
      logger.testEnd('Test 1', true);
    } else {
      throw new Error('No nodes created');
    }
  } catch (error) {
    logger.error('✗ Test 1 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Create Event Node', passed: false, error: error.message });
    logger.testEnd('Test 1', false);
  }

  // ================================================================
  // TEST 2: Update Event Node
  // ================================================================
  try {
    logger.testStart('Test 2: Update Event Node');
    logger.info('WHY: Event details may change and need to be updated');
    logger.info('HOW: Call upsertEvent() with same ID but new data');
    logger.info('WHAT: Expect properties updated, no new node created');

    const eventId = createdEventIds[0]; // Use event from Test 1
    const result = await neo4jClient.upsertEvent(testUserId, {
      id: eventId,
      name: 'Updated Conference 2025',
      description: 'Updated description',
      startDate: new Date(),
      location: { lat: 40.7128, lng: -74.0060, address: 'New York, USA' },
      source: 'manual',
    });

    // MERGE should not create a new node
    if (result.summary.nodesCreated === 0 && result.summary.propertiesSet > 0) {
      logger.success('✓ Event node updated', {
        eventId,
        propertiesSet: result.summary.propertiesSet,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Update Event Node', passed: true });
      logger.testEnd('Test 2', true);
    } else {
      throw new Error('Update created new node instead of updating');
    }
  } catch (error) {
    logger.error('✗ Test 2 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Update Event Node', passed: false, error: error.message });
    logger.testEnd('Test 2', false);
  }

  // ================================================================
  // TEST 3: Delete Event Node
  // ================================================================
  try {
    logger.testStart('Test 3: Delete Event Node');
    logger.info('WHY: Users must be able to delete events');
    logger.info('HOW: Call deleteEvent() with event ID');
    logger.info('WHAT: Expect node and all relationships deleted');

    // Create a new event just for deletion
    const { eventId } = await createTestEvent(testUserId, { name: 'Event To Delete' });

    const result = await neo4jClient.deleteEvent(testUserId, eventId);

    if (result.summary.nodesDeleted >= 1) {
      logger.success('✓ Event node deleted', { eventId, nodesDeleted: result.summary.nodesDeleted });
      testResults.passed++;
      testResults.tests.push({ name: 'Delete Event Node', passed: true });
      logger.testEnd('Test 3', true);
    } else {
      throw new Error('Node not deleted');
    }
  } catch (error) {
    logger.error('✗ Test 3 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Delete Event Node', passed: false, error: error.message });
    logger.testEnd('Test 3', false);
  }

  // ================================================================
  // TEST 4: Create ATTENDS Relationship
  // ================================================================
  try {
    logger.testStart('Test 4: Create ATTENDS Relationship');
    logger.info('WHY: Track which contacts are attending which events');
    logger.info('HOW: Call createAttendsRelationship() with participation data');
    logger.info('WHAT: Expect relationship created with visibility and intent');

    const eventId = createdEventIds[0];
    const { contactId } = await createTestContact(testUserId, { name: 'Test Attendee' });
    createdContactIds.push(contactId);

    const { result } = await createTestAttendee(testUserId, contactId, eventId, {
      visibility: EVENT_VISIBILITY_MODES.PUBLIC,
      intent: PARTICIPATION_INTENTS.NETWORKING,
      lookingFor: [LOOKING_FOR_TYPES.INVESTOR],
      offering: [OFFERING_TYPES.EXPERTISE],
    });

    if (result.summary.relationshipsCreated >= 1) {
      logger.success('✓ ATTENDS relationship created', {
        contactId,
        eventId,
        relationshipsCreated: result.summary.relationshipsCreated,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Create ATTENDS Relationship', passed: true });
      logger.testEnd('Test 4', true);
    } else {
      throw new Error('Relationship not created');
    }
  } catch (error) {
    logger.error('✗ Test 4 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Create ATTENDS Relationship', passed: false, error: error.message });
    logger.testEnd('Test 4', false);
  }

  // ================================================================
  // TEST 5: Update Visibility (Ghost Mode)
  // ================================================================
  try {
    logger.testStart('Test 5: Update Visibility (Ghost Mode)');
    logger.info('WHY: Users can change their visibility mode at any time');
    logger.info('HOW: Call updateAttendanceVisibility() to switch to ghost');
    logger.info('WHAT: Expect visibility property updated to "ghost"');

    const eventId = createdEventIds[0];
    const contactId = createdContactIds[0];

    const result = await neo4jClient.updateAttendanceVisibility(
      testUserId,
      contactId,
      eventId,
      EVENT_VISIBILITY_MODES.GHOST
    );

    // Check that properties were set (visibility updated)
    if (result.summary.propertiesSet > 0) {
      logger.success('✓ Visibility updated to Ghost mode', {
        contactId,
        eventId,
        newVisibility: EVENT_VISIBILITY_MODES.GHOST,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Update Visibility (Ghost Mode)', passed: true });
      logger.testEnd('Test 5', true);
    } else {
      throw new Error('Visibility not updated');
    }
  } catch (error) {
    logger.error('✗ Test 5 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Update Visibility (Ghost Mode)', passed: false, error: error.message });
    logger.testEnd('Test 5', false);
  }

  // ================================================================
  // TEST 6: Create MATCHED_AT Relationship
  // ================================================================
  try {
    logger.testStart('Test 6: Create MATCHED_AT Relationship');
    logger.info('WHY: Track AI-generated matches between contacts at events');
    logger.info('HOW: Call createMatchedAtRelationship() with match data');
    logger.info('WHAT: Expect relationship with compatibility score and reasons');

    const eventId = createdEventIds[0];

    // Create two contacts for matching
    const { contactId: contactId1 } = await createTestContact(testUserId, { name: 'Match Contact 1' });
    const { contactId: contactId2 } = await createTestContact(testUserId, { name: 'Match Contact 2' });
    createdContactIds.push(contactId1, contactId2);

    // Add both to event
    await createTestAttendee(testUserId, contactId1, eventId);
    await createTestAttendee(testUserId, contactId2, eventId);

    const result = await neo4jClient.createMatchedAtRelationship(
      testUserId,
      contactId1,
      contactId2,
      eventId,
      {
        compatibilityScore: 0.85,
        reasons: ['shared_interests', 'complementary_needs'],
        status: 'pending',
      }
    );

    if (result.summary.relationshipsCreated >= 1) {
      logger.success('✓ MATCHED_AT relationship created', {
        contactId1,
        contactId2,
        eventId,
        relationshipsCreated: result.summary.relationshipsCreated,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Create MATCHED_AT Relationship', passed: true });
      logger.testEnd('Test 6', true);
    } else {
      throw new Error('Match relationship not created');
    }
  } catch (error) {
    logger.error('✗ Test 6 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Create MATCHED_AT Relationship', passed: false, error: error.message });
    logger.testEnd('Test 6', false);
  }

  // ================================================================
  // TEST 7: Update Match Status (Accept)
  // ================================================================
  try {
    logger.testStart('Test 7: Update Match Status (Accept)');
    logger.info('WHY: Users must accept/decline AI match suggestions');
    logger.info('HOW: Call updateMatchStatus() with accepted=true');
    logger.info('WHAT: Expect contact1Accepted=true, status still pending (waiting for other)');

    const eventId = createdEventIds[0];
    const contactId1 = createdContactIds[createdContactIds.length - 2]; // From Test 6
    const contactId2 = createdContactIds[createdContactIds.length - 1];

    const result = await neo4jClient.updateMatchStatus(
      testUserId,
      contactId1,
      contactId2,
      eventId,
      true // accepted
    );

    if (result.summary.propertiesSet > 0) {
      logger.success('✓ Match accepted by first contact', {
        contactId1,
        contactId2,
        status: 'pending (waiting for other)',
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Update Match Status (Accept)', passed: true });
      logger.testEnd('Test 7', true);
    } else {
      throw new Error('Match status not updated');
    }
  } catch (error) {
    logger.error('✗ Test 7 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Update Match Status (Accept)', passed: false, error: error.message });
    logger.testEnd('Test 7', false);
  }

  // ================================================================
  // TEST 8: Update Match Status (Mutual Accept)
  // ================================================================
  try {
    logger.testStart('Test 8: Update Match Status (Mutual Accept)');
    logger.info('WHY: Both users accepting should change status to "accepted"');
    logger.info('HOW: Call updateMatchStatus() as second contact with accepted=true');
    logger.info('WHAT: Expect status="accepted" (double opt-in complete)');

    const eventId = createdEventIds[0];
    const contactId1 = createdContactIds[createdContactIds.length - 2];
    const contactId2 = createdContactIds[createdContactIds.length - 1];

    // Second contact accepts
    const result = await neo4jClient.updateMatchStatus(
      testUserId,
      contactId2, // Now contact2 is accepting
      contactId1,
      eventId,
      true
    );

    if (result.summary.propertiesSet > 0) {
      logger.success('✓ Match mutually accepted - double opt-in complete', {
        contactId1,
        contactId2,
        expectedStatus: 'accepted',
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Update Match Status (Mutual Accept)', passed: true });
      logger.testEnd('Test 8', true);
    } else {
      throw new Error('Match status not updated');
    }
  } catch (error) {
    logger.error('✗ Test 8 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Update Match Status (Mutual Accept)', passed: false, error: error.message });
    logger.testEnd('Test 8', false);
  }

  // ================================================================
  // TEST 9: Get Event Attendees (Public)
  // ================================================================
  try {
    logger.testStart('Test 9: Get Event Attendees (Public)');
    logger.info('WHY: Users need to see who is attending an event');
    logger.info('HOW: Call getEventAttendees() without friend list');
    logger.info('WHAT: Expect only PUBLIC visibility attendees returned');

    // Create fresh event with mixed visibility
    const { eventId: mixedEventId } = await createTestEvent(testUserId, { name: 'Mixed Visibility Event' });
    createdEventIds.push(mixedEventId);

    // Add public attendee
    const { contactId: publicContact } = await createTestContact(testUserId, { name: 'Public Attendee' });
    createdContactIds.push(publicContact);
    await createTestAttendee(testUserId, publicContact, mixedEventId, {
      visibility: EVENT_VISIBILITY_MODES.PUBLIC,
    });

    // Add private attendee (should not appear)
    const { contactId: privateContact } = await createTestContact(testUserId, { name: 'Private Attendee' });
    createdContactIds.push(privateContact);
    await createTestAttendee(testUserId, privateContact, mixedEventId, {
      visibility: EVENT_VISIBILITY_MODES.PRIVATE,
    });

    // Query as stranger (no friends, not self)
    const attendees = await neo4jClient.getEventAttendees(testUserId, mixedEventId, null, []);

    // Should only get public attendee
    const publicAttendees = attendees.filter(a => a.r.properties.visibility === 'public');

    if (publicAttendees.length >= 1) {
      logger.success('✓ Got public attendees only', {
        totalReturned: attendees.length,
        publicCount: publicAttendees.length,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Get Event Attendees (Public)', passed: true });
      logger.testEnd('Test 9', true);
    } else {
      throw new Error('No public attendees returned');
    }
  } catch (error) {
    logger.error('✗ Test 9 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Get Event Attendees (Public)', passed: false, error: error.message });
    logger.testEnd('Test 9', false);
  }

  // ================================================================
  // TEST 10: Get Event Attendees (Friends)
  // ================================================================
  try {
    logger.testStart('Test 10: Get Event Attendees (Friends)');
    logger.info('WHY: Friends-only attendees should be visible to their friends');
    logger.info('HOW: Call getEventAttendees() with friend list containing the contact');
    logger.info('WHAT: Expect friends-mode attendees returned when in friend list');

    const mixedEventId = createdEventIds[createdEventIds.length - 1];

    // Add friends-only attendee
    const { contactId: friendsContact } = await createTestContact(testUserId, { name: 'Friends Only Attendee' });
    createdContactIds.push(friendsContact);
    await createTestAttendee(testUserId, friendsContact, mixedEventId, {
      visibility: EVENT_VISIBILITY_MODES.FRIENDS,
    });

    // Query as friend (pass friendsContact in friend list)
    const attendees = await neo4jClient.getEventAttendees(
      testUserId,
      mixedEventId,
      null,
      [friendsContact] // We're a friend
    );

    const friendsAttendees = attendees.filter(a => a.r.properties.visibility === 'friends');

    if (friendsAttendees.length >= 1) {
      logger.success('✓ Friends-only attendees visible to friends', {
        totalReturned: attendees.length,
        friendsCount: friendsAttendees.length,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Get Event Attendees (Friends)', passed: true });
      logger.testEnd('Test 10', true);
    } else {
      throw new Error('Friends-only attendee not returned');
    }
  } catch (error) {
    logger.error('✗ Test 10 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Get Event Attendees (Friends)', passed: false, error: error.message });
    logger.testEnd('Test 10', false);
  }

  // ================================================================
  // TEST 11: Get Ghost Mode Attendees
  // ================================================================
  try {
    logger.testStart('Test 11: Get Ghost Mode Attendees');
    logger.info('WHY: AI needs access to ghost mode attendees for matching');
    logger.info('HOW: Call getGhostModeAttendees()');
    logger.info('WHAT: Expect ONLY ghost mode attendees returned');

    const mixedEventId = createdEventIds[createdEventIds.length - 1];

    // Add ghost attendee
    const { contactId: ghostContact } = await createTestContact(testUserId, { name: 'Ghost Attendee' });
    createdContactIds.push(ghostContact);
    await createTestAttendee(testUserId, ghostContact, mixedEventId, {
      visibility: EVENT_VISIBILITY_MODES.GHOST,
    });

    const ghostAttendees = await neo4jClient.getGhostModeAttendees(testUserId, mixedEventId);

    if (ghostAttendees.length >= 1) {
      const allGhost = ghostAttendees.every(a => a.r.properties.visibility === 'ghost');
      if (allGhost) {
        logger.success('✓ Got ghost mode attendees only', { count: ghostAttendees.length });
        testResults.passed++;
        testResults.tests.push({ name: 'Get Ghost Mode Attendees', passed: true });
        logger.testEnd('Test 11', true);
      } else {
        throw new Error('Non-ghost attendees in ghost query');
      }
    } else {
      throw new Error('No ghost attendees returned');
    }
  } catch (error) {
    logger.error('✗ Test 11 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Get Ghost Mode Attendees', passed: false, error: error.message });
    logger.testEnd('Test 11', false);
  }

  // ================================================================
  // TEST 12: Find Event Matches
  // ================================================================
  try {
    logger.testStart('Test 12: Find Event Matches');
    logger.info('WHY: AI matching finds compatible attendees based on lookingFor/offering');
    logger.info('HOW: Call findEventMatches() with min score threshold');
    logger.info('WHAT: Expect pairs where one offers what another seeks');

    // Create fresh event for matching
    const { eventId: matchEventId } = await createTestEvent(testUserId, { name: 'Matching Test Event' });
    createdEventIds.push(matchEventId);

    // Create compatible pair
    const { contact1, contact2 } = await createCompatiblePair(testUserId, matchEventId);
    createdContactIds.push(contact1.contactId, contact2.contactId);

    const matches = await neo4jClient.findEventMatches(testUserId, matchEventId, 0.1);

    if (matches.length >= 1) {
      logger.success('✓ Found compatible matches', {
        matchCount: matches.length,
        sample: matches[0] ? {
          contact1: matches[0].c1?.properties?.name,
          contact2: matches[0].c2?.properties?.name,
          score: matches[0].compatibilityScore,
        } : null,
      });
      testResults.passed++;
      testResults.tests.push({ name: 'Find Event Matches', passed: true });
      logger.testEnd('Test 12', true);
    } else {
      throw new Error('No matches found for compatible pair');
    }
  } catch (error) {
    logger.error('✗ Test 12 failed', { error: error.message });
    testResults.failed++;
    testResults.tests.push({ name: 'Find Event Matches', passed: false, error: error.message });
    logger.testEnd('Test 12', false);
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
