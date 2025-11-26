/**
 * EventPanel API Integration Tests
 *
 * Real-world tests for the EventPanel.jsx RSVP flow
 * Tests hit REAL Firestore database - no mocks!
 *
 * Tests:
 * 1. RSVP with confirmed status
 * 2. RSVP with maybe status
 * 3. RSVP with declined status
 * 4. Set primary intent (networking)
 * 5. Set secondary intents (max 3)
 * 6. Set visibility mode - all 4 modes
 * 7. Set looking for options
 * 8. Set offering options
 * 9. Update RSVP status (confirmed → maybe)
 * 10. Remove RSVP
 */

import { EventService } from '../server/eventService.js';
import {
  TestLogger,
  generateTestId,
  createMockSession,
  createTestEventFirestore,
  cleanupFirestoreTestData,
  ensureFirestoreConnected,
} from './testHelpers.js';
import {
  EVENT_VISIBILITY_MODES,
  PARTICIPATION_INTENTS,
  LOOKING_FOR_TYPES,
  OFFERING_TYPES,
} from '../client/constants/eventConstants.js';

/**
 * Run all EventPanel API Integration tests
 * @param {string} testUserId - User ID for test isolation
 * @returns {Promise<Object>} Test results
 */
export async function runEventPanelApiTests(testUserId = `test-panel-${Date.now()}`) {
  const logger = new TestLogger('EventPanel API Integration');
  const testResults = { passed: 0, failed: 0, tests: [] };

  // Track created resources for cleanup
  const createdEventIds = [];

  // Create session for all tests (Pro subscription for all features)
  const session = createMockSession(testUserId, 'pro');

  try {
    // Ensure Firestore is connected
    logger.info('Verifying Firestore connection...');
    await ensureFirestoreConnected();
    logger.success('Firestore connected');

    // =========================================================================
    // TEST 1: RSVP with confirmed status
    // =========================================================================
    logger.testStart('RSVP with confirmed status');
    try {
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Confirmed Status Test Event',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');
      const participation = {
        status: 'confirmed',
        visibility: EVENT_VISIBILITY_MODES.PUBLIC,
      };

      const result = await EventService.registerAttendance({
        eventId,
        contactId,
        participation,
        session,
      });

      if (result.status === 'confirmed' && result.contactId === contactId) {
        logger.success('RSVP confirmed status works', { status: result.status });
        testResults.passed++;
        testResults.tests.push({ name: 'RSVP with confirmed status', passed: true });
      } else {
        throw new Error(`Expected status=confirmed, got ${result.status}`);
      }
    } catch (error) {
      logger.error('RSVP with confirmed status FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'RSVP with confirmed status', passed: false, error: error.message });
    }
    logger.testEnd('RSVP with confirmed status', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 2: RSVP with maybe status
    // =========================================================================
    logger.testStart('RSVP with maybe status');
    try {
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Maybe Status Test Event',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');
      const participation = {
        status: 'maybe',
        visibility: EVENT_VISIBILITY_MODES.PUBLIC,
      };

      const result = await EventService.registerAttendance({
        eventId,
        contactId,
        participation,
        session,
      });

      if (result.status === 'maybe') {
        logger.success('RSVP maybe status works', { status: result.status });
        testResults.passed++;
        testResults.tests.push({ name: 'RSVP with maybe status', passed: true });
      } else {
        throw new Error(`Expected status=maybe, got ${result.status}`);
      }
    } catch (error) {
      logger.error('RSVP with maybe status FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'RSVP with maybe status', passed: false, error: error.message });
    }
    logger.testEnd('RSVP with maybe status', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 3: RSVP with declined status
    // =========================================================================
    logger.testStart('RSVP with declined status');
    try {
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Declined Status Test Event',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');
      const participation = {
        status: 'declined',
        visibility: EVENT_VISIBILITY_MODES.PRIVATE, // Declined users typically go private
      };

      const result = await EventService.registerAttendance({
        eventId,
        contactId,
        participation,
        session,
      });

      if (result.status === 'declined') {
        logger.success('RSVP declined status works', { status: result.status });
        testResults.passed++;
        testResults.tests.push({ name: 'RSVP with declined status', passed: true });
      } else {
        throw new Error(`Expected status=declined, got ${result.status}`);
      }
    } catch (error) {
      logger.error('RSVP with declined status FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'RSVP with declined status', passed: false, error: error.message });
    }
    logger.testEnd('RSVP with declined status', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 4: Set primary intent (networking)
    // =========================================================================
    logger.testStart('Set primary intent');
    try {
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Primary Intent Test Event',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');
      const participation = {
        status: 'confirmed',
        visibility: EVENT_VISIBILITY_MODES.PUBLIC,
        intent: PARTICIPATION_INTENTS.NETWORKING,
      };

      const result = await EventService.registerAttendance({
        eventId,
        contactId,
        participation,
        session,
      });

      if (result.intent === PARTICIPATION_INTENTS.NETWORKING) {
        logger.success('Primary intent set correctly', { intent: result.intent });
        testResults.passed++;
        testResults.tests.push({ name: 'Set primary intent', passed: true });
      } else {
        throw new Error(`Expected intent=networking, got ${result.intent}`);
      }
    } catch (error) {
      logger.error('Set primary intent FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Set primary intent', passed: false, error: error.message });
    }
    logger.testEnd('Set primary intent', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 5: Set secondary intents (max 3)
    // =========================================================================
    logger.testStart('Set secondary intents');
    try {
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Secondary Intents Test Event',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');
      const secondaryIntents = [
        PARTICIPATION_INTENTS.RECRUITING,
        PARTICIPATION_INTENTS.LEARNING,
        PARTICIPATION_INTENTS.PARTNERSHIP,
      ];

      const participation = {
        status: 'confirmed',
        visibility: EVENT_VISIBILITY_MODES.PUBLIC,
        intent: PARTICIPATION_INTENTS.NETWORKING,
        secondaryIntents,
      };

      const result = await EventService.registerAttendance({
        eventId,
        contactId,
        participation,
        session,
      });

      if (
        result.secondaryIntents &&
        result.secondaryIntents.length === 3 &&
        result.secondaryIntents.includes(PARTICIPATION_INTENTS.RECRUITING)
      ) {
        logger.success('Secondary intents set correctly', { count: result.secondaryIntents.length });
        testResults.passed++;
        testResults.tests.push({ name: 'Set secondary intents', passed: true });
      } else {
        throw new Error(`Expected 3 secondary intents, got ${result.secondaryIntents?.length || 0}`);
      }
    } catch (error) {
      logger.error('Set secondary intents FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Set secondary intents', passed: false, error: error.message });
    }
    logger.testEnd('Set secondary intents', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 6: Set visibility mode - all 4 modes
    // =========================================================================
    logger.testStart('Set visibility mode - all 4 modes');
    try {
      const modes = [
        EVENT_VISIBILITY_MODES.PUBLIC,
        EVENT_VISIBILITY_MODES.FRIENDS,
        EVENT_VISIBILITY_MODES.PRIVATE,
        EVENT_VISIBILITY_MODES.GHOST,
      ];

      let allPassed = true;
      const results = [];

      for (const mode of modes) {
        const { eventId } = await createTestEventFirestore(testUserId, {
          name: `Visibility ${mode} Test`,
        });
        createdEventIds.push(eventId);

        const contactId = generateTestId('contact');
        const participation = {
          status: 'confirmed',
          visibility: mode,
        };

        const result = await EventService.registerAttendance({
          eventId,
          contactId,
          participation,
          session,
        });

        if (result.visibility !== mode) {
          allPassed = false;
          results.push({ mode, expected: mode, got: result.visibility });
        } else {
          results.push({ mode, passed: true });
        }
      }

      if (allPassed) {
        logger.success('All 4 visibility modes work correctly', { modes: modes.length });
        testResults.passed++;
        testResults.tests.push({ name: 'Set visibility mode - all 4 modes', passed: true });
      } else {
        const failedModes = results.filter(r => !r.passed);
        throw new Error(`Some visibility modes failed: ${JSON.stringify(failedModes)}`);
      }
    } catch (error) {
      logger.error('Set visibility mode - all 4 modes FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Set visibility mode - all 4 modes', passed: false, error: error.message });
    }
    logger.testEnd('Set visibility mode - all 4 modes', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 7: Set looking for options
    // =========================================================================
    logger.testStart('Set looking for options');
    try {
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Looking For Test Event',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');
      const lookingForOptions = [
        LOOKING_FOR_TYPES.COFOUNDER,
        LOOKING_FOR_TYPES.INVESTOR,
        LOOKING_FOR_TYPES.MENTOR,
      ];

      const participation = {
        status: 'confirmed',
        visibility: EVENT_VISIBILITY_MODES.PUBLIC,
        lookingFor: lookingForOptions,
      };

      const result = await EventService.registerAttendance({
        eventId,
        contactId,
        participation,
        session,
      });

      if (
        result.lookingFor &&
        result.lookingFor.length === 3 &&
        result.lookingFor.includes(LOOKING_FOR_TYPES.COFOUNDER)
      ) {
        logger.success('Looking for options set correctly', { count: result.lookingFor.length });
        testResults.passed++;
        testResults.tests.push({ name: 'Set looking for options', passed: true });
      } else {
        throw new Error(`Expected 3 looking for options, got ${result.lookingFor?.length || 0}`);
      }
    } catch (error) {
      logger.error('Set looking for options FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Set looking for options', passed: false, error: error.message });
    }
    logger.testEnd('Set looking for options', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 8: Set offering options
    // =========================================================================
    logger.testStart('Set offering options');
    try {
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Offering Test Event',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');
      const offeringOptions = [
        OFFERING_TYPES.MENTORSHIP,
        OFFERING_TYPES.EXPERTISE,
        OFFERING_TYPES.CONNECTIONS,
      ];

      const participation = {
        status: 'confirmed',
        visibility: EVENT_VISIBILITY_MODES.PUBLIC,
        offering: offeringOptions,
      };

      const result = await EventService.registerAttendance({
        eventId,
        contactId,
        participation,
        session,
      });

      if (
        result.offering &&
        result.offering.length === 3 &&
        result.offering.includes(OFFERING_TYPES.MENTORSHIP)
      ) {
        logger.success('Offering options set correctly', { count: result.offering.length });
        testResults.passed++;
        testResults.tests.push({ name: 'Set offering options', passed: true });
      } else {
        throw new Error(`Expected 3 offering options, got ${result.offering?.length || 0}`);
      }
    } catch (error) {
      logger.error('Set offering options FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Set offering options', passed: false, error: error.message });
    }
    logger.testEnd('Set offering options', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 9: Update RSVP status (confirmed → maybe)
    // =========================================================================
    logger.testStart('Update RSVP status');
    try {
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Update RSVP Test Event',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');

      // First register with confirmed
      await EventService.registerAttendance({
        eventId,
        contactId,
        participation: {
          status: 'confirmed',
          visibility: EVENT_VISIBILITY_MODES.PUBLIC,
        },
        session,
      });

      // Update to maybe
      const updated = await EventService.updateAttendance({
        eventId,
        contactId,
        updates: {
          status: 'maybe',
          notes: 'Changed my mind, might have a conflict',
        },
        session,
      });

      if (updated.status === 'maybe' && updated.notes.includes('conflict')) {
        logger.success('RSVP status updated from confirmed to maybe', { newStatus: updated.status });
        testResults.passed++;
        testResults.tests.push({ name: 'Update RSVP status', passed: true });
      } else {
        throw new Error(`Expected status=maybe, got ${updated.status}`);
      }
    } catch (error) {
      logger.error('Update RSVP status FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Update RSVP status', passed: false, error: error.message });
    }
    logger.testEnd('Update RSVP status', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 10: Remove RSVP
    // =========================================================================
    logger.testStart('Remove RSVP');
    try {
      const { eventId } = await createTestEventFirestore(testUserId, {
        name: 'Remove RSVP Test Event',
      });
      createdEventIds.push(eventId);

      const contactId = generateTestId('contact');

      // Register attendance
      await EventService.registerAttendance({
        eventId,
        contactId,
        participation: {
          status: 'confirmed',
          visibility: EVENT_VISIBILITY_MODES.PUBLIC,
        },
        session,
      });

      // Remove attendance (like clicking "Remove" in EventPanel)
      const result = await EventService.removeAttendance({
        eventId,
        contactId,
        session,
      });

      // Verify it's gone
      const attendance = await EventService.getAttendance({
        eventId,
        contactId,
        session,
      });

      if (result.success && attendance === null) {
        logger.success('RSVP removed successfully');
        testResults.passed++;
        testResults.tests.push({ name: 'Remove RSVP', passed: true });
      } else {
        throw new Error('Attendance still exists after removal');
      }
    } catch (error) {
      logger.error('Remove RSVP FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'Remove RSVP', passed: false, error: error.message });
    }
    logger.testEnd('Remove RSVP', testResults.tests[testResults.tests.length - 1].passed);

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
  console.log(`📱 ${summary.testSuite} Complete`);
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

export default { runEventPanelApiTests };
