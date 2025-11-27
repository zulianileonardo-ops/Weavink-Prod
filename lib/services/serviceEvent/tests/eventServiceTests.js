/**
 * EventService Firestore Tests
 *
 * Real-world tests for EventService CRUD + Attendance operations
 * Tests hit REAL Firestore database - no mocks!
 *
 * Tests:
 * 1. Create Event - Valid
 * 2. Create Event - Missing Name
 * 3. Create Event - Missing StartDate
 * 4. Get Event - Existing
 * 5. Get Event - Non-existent
 * 6. Get Event - Wrong User
 * 7. Get User Events - With Filters
 * 8. Get Upcoming Events
 * 9. Update Event - Valid
 * 10. Update Event - Invalid Dates
 * 11. Delete Event
 * 12. Register Attendance
 * 13. Register Attendance - Duplicate
 * 14. Update Attendance - Change Visibility
 * 15. Remove Attendance
 */

import { EventService } from '../server/eventService.js';
import {
  TestLogger,
  generateTestId,
  createMockSession,
  createTestEventFirestore,
  createTestParticipantFirestore,
  cleanupFirestoreTestData,
  ensureFirestoreConnected,
} from './testHelpers.js';
import { EVENT_VISIBILITY_MODES, PARTICIPATION_INTENTS } from '../client/constants/eventConstants.js';

/**
 * Run all EventService Firestore tests
 * @param {string} testUserId - User ID for test isolation
 * @returns {Promise<Object>} Test results
 */
export async function runEventServiceTests(testUserId = `test-evtsvc-${Date.now()}`) {
  const logger = new TestLogger('EventService Firestore Tests');
  const testResults = { passed: 0, failed: 0, tests: [] };

  // Track created resources for cleanup
  const createdEventIds = [];

  // Create session for all tests
  const session = createMockSession(testUserId, 'pro');

  try {
    // Ensure Firestore is connected
    logger.info('Verifying Firestore connection...');
    await ensureFirestoreConnected();
    logger.success('Firestore connected');

    // =========================================================================
    // TEST 1: Create Event - Valid
    // =========================================================================
    logger.testStart('Create Event - Valid');
    try {
      const eventData = {
        name: 'Test Conference 2024',
        description: 'A test conference for integration testing',
        startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endDate: new Date(Date.now() + 90000000).toISOString(),
        location: { lat: 48.8566, lng: 2.3522, address: 'Paris, France' },
        tags: ['tech', 'networking'],
      };

      const event = await EventService.createEvent({ eventData, session });
      createdEventIds.push(event.id);

      if (event.id && event.name === eventData.name && event.userId === testUserId) {
        logger.success('Event created successfully', { eventId: event.id });
        testResults.passed++;
        testResults.tests.push({ name: 'Create Event - Valid', passed: true });
      } else {
        throw new Error('Event data mismatch');
      }
    } catch (error) {
      logger.error('Create Event - Valid FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Create Event - Valid', passed: false, error: error.message });
    }
    logger.testEnd('Create Event - Valid', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 2: Create Event - Missing Name
    // =========================================================================
    logger.testStart('Create Event - Missing Name');
    try {
      const eventData = {
        // name is missing
        startDate: new Date().toISOString(),
      };

      await EventService.createEvent({ eventData, session });

      // Should not reach here
      logger.error('Create Event - Missing Name FAILED - Expected error not thrown');
      testResults.failed++;
      testResults.tests.push({ name: 'Create Event - Missing Name', passed: false, error: 'Expected validation error' });
    } catch (error) {
      if (error.message.includes('name is required') || error.message.includes('Invalid event data')) {
        logger.success('Correctly rejected event without name', { error: error.message });
        testResults.passed++;
        testResults.tests.push({ name: 'Create Event - Missing Name', passed: true });
      } else {
        logger.error('Create Event - Missing Name FAILED', { error: error.message });
        testResults.failed++;
        testResults.tests.push({ name: 'Create Event - Missing Name', passed: false, error: error.message });
      }
    }
    logger.testEnd('Create Event - Missing Name', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 3: Create Event - Missing StartDate
    // =========================================================================
    logger.testStart('Create Event - Missing StartDate');
    try {
      const eventData = {
        name: 'Event Without Start Date',
        // startDate is missing
      };

      await EventService.createEvent({ eventData, session });

      // Should not reach here
      logger.error('Create Event - Missing StartDate FAILED - Expected error not thrown');
      testResults.failed++;
      testResults.tests.push({ name: 'Create Event - Missing StartDate', passed: false, error: 'Expected validation error' });
    } catch (error) {
      if (error.message.toLowerCase().includes('start date is required') || error.message.includes('Invalid event data')) {
        logger.success('Correctly rejected event without start date', { error: error.message });
        testResults.passed++;
        testResults.tests.push({ name: 'Create Event - Missing StartDate', passed: true });
      } else {
        logger.error('Create Event - Missing StartDate FAILED', { error: error.message });
        testResults.failed++;
        testResults.tests.push({ name: 'Create Event - Missing StartDate', passed: false, error: error.message });
      }
    }
    logger.testEnd('Create Event - Missing StartDate', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 4: Get Event - Existing
    // =========================================================================
    logger.testStart('Get Event - Existing');
    try {
      // Create a test event first
      const { eventId, event: createdEvent } = await createTestEventFirestore(testUserId, {
        name: 'Get Event Test',
      });
      createdEventIds.push(eventId);

      const retrievedEvent = await EventService.getEvent({ eventId, session });

      if (retrievedEvent && retrievedEvent.id === eventId && retrievedEvent.name === 'Get Event Test') {
        logger.success('Event retrieved successfully', { eventId });
        testResults.passed++;
        testResults.tests.push({ name: 'Get Event - Existing', passed: true });
      } else {
        throw new Error('Retrieved event does not match');
      }
    } catch (error) {
      logger.error('Get Event - Existing FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Get Event - Existing', passed: false, error: error.message });
    }
    logger.testEnd('Get Event - Existing', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 5: Get Event - Non-existent
    // =========================================================================
    logger.testStart('Get Event - Non-existent');
    try {
      const fakeEventId = 'event_nonexistent_123456789';
      const event = await EventService.getEvent({ eventId: fakeEventId, session });

      if (event === null) {
        logger.success('Correctly returned null for non-existent event');
        testResults.passed++;
        testResults.tests.push({ name: 'Get Event - Non-existent', passed: true });
      } else {
        throw new Error('Expected null but got event');
      }
    } catch (error) {
      logger.error('Get Event - Non-existent FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Get Event - Non-existent', passed: false, error: error.message });
    }
    logger.testEnd('Get Event - Non-existent', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 6: Get Event - Wrong User
    // =========================================================================
    logger.testStart('Get Event - Wrong User');
    try {
      // Create event for a different user
      const otherUserId = `other-user-${Date.now()}`;
      const { eventId } = await createTestEventFirestore(otherUserId, {
        name: 'Other User Event',
      });
      createdEventIds.push(eventId);

      // Try to get it with our session (different user)
      await EventService.getEvent({ eventId, session });

      // Should not reach here
      logger.error('Get Event - Wrong User FAILED - Expected access denied');
      testResults.failed++;
      testResults.tests.push({ name: 'Get Event - Wrong User', passed: false, error: 'Expected access denied' });
    } catch (error) {
      if (error.message.includes('Access denied')) {
        logger.success('Correctly denied access to other user event', { error: error.message });
        testResults.passed++;
        testResults.tests.push({ name: 'Get Event - Wrong User', passed: true });
      } else {
        logger.error('Get Event - Wrong User FAILED', { error: error.message });
        testResults.failed++;
        testResults.tests.push({ name: 'Get Event - Wrong User', passed: false, error: error.message });
      }
    }
    logger.testEnd('Get Event - Wrong User', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 7: Get User Events - With Filters
    // =========================================================================
    logger.testStart('Get User Events - With Filters');
    try {
      // Create events with different sources
      const { eventId: manualEventId } = await createTestEventFirestore(testUserId, {
        name: 'Manual Event',
        source: 'manual',
        startDate: new Date(Date.now() + 86400000).toISOString(),
      });
      createdEventIds.push(manualEventId);

      const { eventId: googleEventId } = await createTestEventFirestore(testUserId, {
        name: 'Google Event',
        source: 'google_calendar',
        startDate: new Date(Date.now() + 172800000).toISOString(),
      });
      createdEventIds.push(googleEventId);

      // Get only manual events
      const result = await EventService.getUserEvents({
        session,
        options: { source: 'manual' },
      });

      const hasManualEvent = result.events.some(e => e.source === 'manual');
      const hasGoogleEvent = result.events.some(e => e.source === 'google_calendar');

      if (hasManualEvent && !hasGoogleEvent) {
        logger.success('Filtered events by source correctly', { count: result.events.length });
        testResults.passed++;
        testResults.tests.push({ name: 'Get User Events - With Filters', passed: true });
      } else {
        throw new Error('Filter did not work correctly');
      }
    } catch (error) {
      logger.error('Get User Events - With Filters FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Get User Events - With Filters', passed: false, error: error.message });
    }
    logger.testEnd('Get User Events - With Filters', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 8: Get Upcoming Events
    // =========================================================================
    logger.testStart('Get Upcoming Events');
    try {
      // Create future and past events
      const { eventId: futureEventId } = await createTestEventFirestore(testUserId, {
        name: 'Future Event',
        startDate: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
      });
      createdEventIds.push(futureEventId);

      const { eventId: pastEventId } = await createTestEventFirestore(testUserId, {
        name: 'Past Event',
        startDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      });
      createdEventIds.push(pastEventId);

      const upcomingEvents = await EventService.getUpcomingEvents({ session, limit: 50 });

      const hasFuture = upcomingEvents.some(e => e.id === futureEventId);
      const hasPast = upcomingEvents.some(e => e.id === pastEventId);

      if (hasFuture && !hasPast) {
        logger.success('Upcoming events filter working', { count: upcomingEvents.length });
        testResults.passed++;
        testResults.tests.push({ name: 'Get Upcoming Events', passed: true });
      } else {
        throw new Error(`Expected future=${hasFuture}, past=${hasPast} to be true/false`);
      }
    } catch (error) {
      logger.error('Get Upcoming Events FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Get Upcoming Events', passed: false, error: error.message });
    }
    logger.testEnd('Get Upcoming Events', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 9: Update Event - Valid
    // =========================================================================
    logger.testStart('Update Event - Valid');
    try {
      // Create event to update
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Original Name',
        description: 'Original description',
      });
      createdEventIds.push(eventId);

      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const updatedEvent = await EventService.updateEvent({
        eventId,
        eventData: updates,
        session,
      });

      if (updatedEvent.name === 'Updated Name' && updatedEvent.description === 'Updated description') {
        logger.success('Event updated successfully', { eventId });
        testResults.passed++;
        testResults.tests.push({ name: 'Update Event - Valid', passed: true });
      } else {
        throw new Error('Update did not apply correctly');
      }
    } catch (error) {
      logger.error('Update Event - Valid FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Update Event - Valid', passed: false, error: error.message });
    }
    logger.testEnd('Update Event - Valid', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 10: Update Event - Invalid Dates
    // =========================================================================
    logger.testStart('Update Event - Invalid Dates');
    try {
      // Create event to update
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Date Test Event',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
      });
      createdEventIds.push(eventId);

      // Try to set end date before start date
      const updates = {
        startDate: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
        endDate: new Date(Date.now() + 86400000).toISOString(),    // 1 day from now (before start!)
      };

      await EventService.updateEvent({ eventId, eventData: updates, session });

      // Should not reach here
      logger.error('Update Event - Invalid Dates FAILED - Expected validation error');
      testResults.failed++;
      testResults.tests.push({ name: 'Update Event - Invalid Dates', passed: false, error: 'Expected validation error' });
    } catch (error) {
      if (error.message.includes('End date must be after start date') || error.message.includes('Invalid event data')) {
        logger.success('Correctly rejected invalid date range', { error: error.message });
        testResults.passed++;
        testResults.tests.push({ name: 'Update Event - Invalid Dates', passed: true });
      } else {
        logger.error('Update Event - Invalid Dates FAILED', { error: error.message });
        testResults.failed++;
        testResults.tests.push({ name: 'Update Event - Invalid Dates', passed: false, error: error.message });
      }
    }
    logger.testEnd('Update Event - Invalid Dates', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 11: Delete Event
    // =========================================================================
    logger.testStart('Delete Event');
    try {
      // Create event to delete
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Event To Delete',
      });
      // Don't add to cleanup - we're deleting it

      // Add a participant to verify cascade delete
      await createTestParticipantFirestore(eventId, 'contact-123', { userId: testUserId });

      const result = await EventService.deleteEvent({ eventId, session });

      // Verify event is gone
      const deletedEvent = await EventService.getEvent({ eventId, session });

      if (result.success && deletedEvent === null) {
        logger.success('Event deleted successfully', { eventId });
        testResults.passed++;
        testResults.tests.push({ name: 'Delete Event', passed: true });
      } else {
        throw new Error('Event still exists after deletion');
      }
    } catch (error) {
      logger.error('Delete Event FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Delete Event', passed: false, error: error.message });
    }
    logger.testEnd('Delete Event', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 12: Register Attendance
    // =========================================================================
    logger.testStart('Register Attendance');
    try {
      // Create event for attendance test
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Attendance Test Event',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');
      const participation = {
        visibility: EVENT_VISIBILITY_MODES.PUBLIC,
        intent: PARTICIPATION_INTENTS.NETWORKING,
        lookingFor: ['mentorship'],
        offering: ['expertise'],
        status: 'confirmed',
      };

      const result = await EventService.registerAttendance({
        eventId,
        contactId,
        participation,
        session,
      });

      if (
        result.contactId === contactId &&
        result.visibility === EVENT_VISIBILITY_MODES.PUBLIC &&
        result.intent === PARTICIPATION_INTENTS.NETWORKING
      ) {
        logger.success('Attendance registered successfully', { contactId });
        testResults.passed++;
        testResults.tests.push({ name: 'Register Attendance', passed: true });
      } else {
        throw new Error('Attendance data mismatch');
      }
    } catch (error) {
      logger.error('Register Attendance FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Register Attendance', passed: false, error: error.message });
    }
    logger.testEnd('Register Attendance', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 13: Register Attendance - Duplicate
    // =========================================================================
    logger.testStart('Register Attendance - Duplicate');
    try {
      // Create event
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Duplicate Attendance Test',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');

      // Register first time
      await EventService.registerAttendance({
        eventId,
        contactId,
        participation: { visibility: EVENT_VISIBILITY_MODES.PUBLIC },
        session,
      });

      // Try to register again
      await EventService.registerAttendance({
        eventId,
        contactId,
        participation: { visibility: EVENT_VISIBILITY_MODES.FRIENDS },
        session,
      });

      // Should not reach here
      logger.error('Register Attendance - Duplicate FAILED - Expected error');
      testResults.failed++;
      testResults.tests.push({ name: 'Register Attendance - Duplicate', passed: false, error: 'Expected duplicate error' });
    } catch (error) {
      if (error.message.includes('already registered')) {
        logger.success('Correctly rejected duplicate registration', { error: error.message });
        testResults.passed++;
        testResults.tests.push({ name: 'Register Attendance - Duplicate', passed: true });
      } else {
        logger.error('Register Attendance - Duplicate FAILED', { error: error.message });
        testResults.failed++;
        testResults.tests.push({ name: 'Register Attendance - Duplicate', passed: false, error: error.message });
      }
    }
    logger.testEnd('Register Attendance - Duplicate', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 14: Update Attendance - Change Visibility
    // =========================================================================
    logger.testStart('Update Attendance - Change Visibility');
    try {
      // Create event and register attendance
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Update Attendance Test',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');

      await EventService.registerAttendance({
        eventId,
        contactId,
        participation: { visibility: EVENT_VISIBILITY_MODES.PUBLIC },
        session,
      });

      // Update visibility from PUBLIC to GHOST
      const updated = await EventService.updateAttendance({
        eventId,
        contactId,
        updates: { visibility: EVENT_VISIBILITY_MODES.GHOST },
        session,
      });

      if (updated.visibility === EVENT_VISIBILITY_MODES.GHOST) {
        logger.success('Visibility updated successfully', { from: 'public', to: 'ghost' });
        testResults.passed++;
        testResults.tests.push({ name: 'Update Attendance - Change Visibility', passed: true });
      } else {
        throw new Error(`Expected ghost visibility, got: ${updated.visibility}`);
      }
    } catch (error) {
      logger.error('Update Attendance - Change Visibility FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Update Attendance - Change Visibility', passed: false, error: error.message });
    }
    logger.testEnd('Update Attendance - Change Visibility', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 15: Remove Attendance
    // =========================================================================
    logger.testStart('Remove Attendance');
    try {
      // Create event and register attendance
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Remove Attendance Test',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');

      await EventService.registerAttendance({
        eventId,
        contactId,
        participation: { visibility: EVENT_VISIBILITY_MODES.PUBLIC },
        session,
      });

      // Remove attendance
      const result = await EventService.removeAttendance({ eventId, contactId, session });

      // Verify attendance is gone
      const attendance = await EventService.getAttendance({ eventId, contactId, session });

      if (result.success && attendance === null) {
        logger.success('Attendance removed successfully', { contactId });
        testResults.passed++;
        testResults.tests.push({ name: 'Remove Attendance', passed: true });
      } else {
        throw new Error('Attendance still exists after removal');
      }
    } catch (error) {
      logger.error('Remove Attendance FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Remove Attendance', passed: false, error: error.message });
    }
    logger.testEnd('Remove Attendance', testResults.tests[testResults.tests.length - 1].passed);

  } finally {
    // =========================================================================
    // CLEANUP
    // =========================================================================
    logger.info('Cleaning up test data...');
    try {
      await cleanupFirestoreTestData(createdEventIds);
      logger.success('Cleanup complete', { eventsCleaned: createdEventIds.length });
    } catch (error) {
      logger.warning('Cleanup had errors', { error: error.message });
    }
  }

  // Return results
  const summary = logger.getSummary();
  console.log('\n========================================');
  console.log(`🔥 ${summary.testSuite} Complete`);
  console.log(`   Duration: ${summary.duration}`);
  console.log(`   Passed: ${testResults.passed}/${testResults.passed + testResults.failed}`);
  console.log(`   Failed: ${testResults.failed}`);
  console.log('========================================\n');

  return {
    success: testResults.failed === 0,
    passed: testResults.passed,
    failed: testResults.failed,
    tests: testResults.tests,
    duration: summary.duration,
  };
}

export default { runEventServiceTests };
