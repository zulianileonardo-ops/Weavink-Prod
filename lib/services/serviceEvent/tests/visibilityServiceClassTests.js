/**
 * VisibilityService Class Tests
 *
 * Real-world tests for VisibilityService static methods
 * Tests the 4-tier visibility system logic
 *
 * Tests:
 * 1. canUserSeeParticipant - PUBLIC
 * 2. canUserSeeParticipant - FRIENDS (is friend)
 * 3. canUserSeeParticipant - FRIENDS (not friend)
 * 4. canUserSeeParticipant - PRIVATE
 * 5. canUserSeeParticipant - GHOST (human context)
 * 6. canUserSeeParticipant - GHOST (AI context)
 * 7. filterParticipantsByVisibility
 * 8. getVisibilityCounts
 * 9. getAIVisibleParticipants
 * 10. validateVisibilityMode
 */

import { VisibilityService } from '../server/visibilityService.js';
import { TestLogger, generateTestId } from './testHelpers.js';
import { EVENT_VISIBILITY_MODES, PARTICIPATION_INTENTS } from '../client/constants/eventConstants.js';

/**
 * Create mock participants for testing
 * @param {number} count - Number of participants per visibility mode
 * @returns {Object[]} Array of mock participants
 */
function createMockParticipants() {
  return [
    // PUBLIC participants
    {
      contactId: 'contact-public-1',
      visibility: EVENT_VISIBILITY_MODES.PUBLIC,
      intent: PARTICIPATION_INTENTS.NETWORKING,
    },
    {
      contactId: 'contact-public-2',
      visibility: EVENT_VISIBILITY_MODES.PUBLIC,
      intent: PARTICIPATION_INTENTS.INVESTMENT,
    },
    // FRIENDS participants
    {
      contactId: 'contact-friends-1',
      visibility: EVENT_VISIBILITY_MODES.FRIENDS,
      intent: PARTICIPATION_INTENTS.MENTORSHIP,
    },
    {
      contactId: 'contact-friends-2',
      visibility: EVENT_VISIBILITY_MODES.FRIENDS,
      intent: PARTICIPATION_INTENTS.COLLABORATION,
    },
    // PRIVATE participants
    {
      contactId: 'contact-private-1',
      visibility: EVENT_VISIBILITY_MODES.PRIVATE,
      intent: PARTICIPATION_INTENTS.NETWORKING,
    },
    // GHOST participants
    {
      contactId: 'contact-ghost-1',
      visibility: EVENT_VISIBILITY_MODES.GHOST,
      intent: PARTICIPATION_INTENTS.INVESTMENT,
    },
    {
      contactId: 'contact-ghost-2',
      visibility: EVENT_VISIBILITY_MODES.GHOST,
      intent: PARTICIPATION_INTENTS.MENTORSHIP,
    },
  ];
}

/**
 * Run all VisibilityService class tests
 * @param {string} testUserId - User ID for test context
 * @returns {Promise<Object>} Test results
 */
export async function runVisibilityServiceClassTests(testUserId = `test-vissvc-${Date.now()}`) {
  const logger = new TestLogger('VisibilityService Class Tests');
  const testResults = { passed: 0, failed: 0, tests: [] };

  // Viewer's contacts list (for FRIENDS visibility tests)
  const viewerContactIds = ['contact-friends-1']; // Only one friend

  try {
    // =========================================================================
    // TEST 1: canUserSeeParticipant - PUBLIC
    // =========================================================================
    logger.testStart('canUserSeeParticipant - PUBLIC');
    try {
      const canSee = VisibilityService.canUserSeeParticipant({
        viewerId: testUserId,
        participantId: 'contact-public-1',
        participantVisibility: EVENT_VISIBILITY_MODES.PUBLIC,
        viewerContactIds: [],
        isAIContext: false,
      });

      if (canSee === true) {
        logger.success('PUBLIC visibility returns true for all viewers');
        testResults.passed++;
        testResults.tests.push({ name: 'canUserSeeParticipant - PUBLIC', passed: true });
      } else {
        throw new Error(`Expected true, got ${canSee}`);
      }
    } catch (error) {
      logger.error('canUserSeeParticipant - PUBLIC FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'canUserSeeParticipant - PUBLIC', passed: false, error: error.message });
    }
    logger.testEnd('canUserSeeParticipant - PUBLIC', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 2: canUserSeeParticipant - FRIENDS (is friend)
    // =========================================================================
    logger.testStart('canUserSeeParticipant - FRIENDS (is friend)');
    try {
      const canSee = VisibilityService.canUserSeeParticipant({
        viewerId: testUserId,
        participantId: 'contact-friends-1',
        participantVisibility: EVENT_VISIBILITY_MODES.FRIENDS,
        viewerContactIds: ['contact-friends-1', 'other-contact'],
        isAIContext: false,
      });

      if (canSee === true) {
        logger.success('FRIENDS visibility returns true when viewer has participant as contact');
        testResults.passed++;
        testResults.tests.push({ name: 'canUserSeeParticipant - FRIENDS (is friend)', passed: true });
      } else {
        throw new Error(`Expected true, got ${canSee}`);
      }
    } catch (error) {
      logger.error('canUserSeeParticipant - FRIENDS (is friend) FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'canUserSeeParticipant - FRIENDS (is friend)', passed: false, error: error.message });
    }
    logger.testEnd('canUserSeeParticipant - FRIENDS (is friend)', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 3: canUserSeeParticipant - FRIENDS (not friend)
    // =========================================================================
    logger.testStart('canUserSeeParticipant - FRIENDS (not friend)');
    try {
      const canSee = VisibilityService.canUserSeeParticipant({
        viewerId: testUserId,
        participantId: 'contact-friends-2',
        participantVisibility: EVENT_VISIBILITY_MODES.FRIENDS,
        viewerContactIds: ['other-contact-a', 'other-contact-b'], // NOT including contact-friends-2
        isAIContext: false,
      });

      if (canSee === false) {
        logger.success('FRIENDS visibility returns false when viewer does not have participant as contact');
        testResults.passed++;
        testResults.tests.push({ name: 'canUserSeeParticipant - FRIENDS (not friend)', passed: true });
      } else {
        throw new Error(`Expected false, got ${canSee}`);
      }
    } catch (error) {
      logger.error('canUserSeeParticipant - FRIENDS (not friend) FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'canUserSeeParticipant - FRIENDS (not friend)', passed: false, error: error.message });
    }
    logger.testEnd('canUserSeeParticipant - FRIENDS (not friend)', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 4: canUserSeeParticipant - PRIVATE
    // =========================================================================
    logger.testStart('canUserSeeParticipant - PRIVATE');
    try {
      const canSee = VisibilityService.canUserSeeParticipant({
        viewerId: testUserId,
        participantId: 'contact-private-1',
        participantVisibility: EVENT_VISIBILITY_MODES.PRIVATE,
        viewerContactIds: ['contact-private-1'], // Even if they're a contact
        isAIContext: false,
      });

      if (canSee === false) {
        logger.success('PRIVATE visibility returns false for everyone');
        testResults.passed++;
        testResults.tests.push({ name: 'canUserSeeParticipant - PRIVATE', passed: true });
      } else {
        throw new Error(`Expected false, got ${canSee}`);
      }
    } catch (error) {
      logger.error('canUserSeeParticipant - PRIVATE FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'canUserSeeParticipant - PRIVATE', passed: false, error: error.message });
    }
    logger.testEnd('canUserSeeParticipant - PRIVATE', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 5: canUserSeeParticipant - GHOST (human context)
    // =========================================================================
    logger.testStart('canUserSeeParticipant - GHOST (human context)');
    try {
      const canSee = VisibilityService.canUserSeeParticipant({
        viewerId: testUserId,
        participantId: 'contact-ghost-1',
        participantVisibility: EVENT_VISIBILITY_MODES.GHOST,
        viewerContactIds: [],
        isAIContext: false, // Human context
      });

      if (canSee === false) {
        logger.success('GHOST visibility returns false for human context');
        testResults.passed++;
        testResults.tests.push({ name: 'canUserSeeParticipant - GHOST (human context)', passed: true });
      } else {
        throw new Error(`Expected false, got ${canSee}`);
      }
    } catch (error) {
      logger.error('canUserSeeParticipant - GHOST (human context) FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'canUserSeeParticipant - GHOST (human context)', passed: false, error: error.message });
    }
    logger.testEnd('canUserSeeParticipant - GHOST (human context)', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 6: canUserSeeParticipant - GHOST (AI context)
    // =========================================================================
    logger.testStart('canUserSeeParticipant - GHOST (AI context)');
    try {
      const canSee = VisibilityService.canUserSeeParticipant({
        viewerId: testUserId,
        participantId: 'contact-ghost-1',
        participantVisibility: EVENT_VISIBILITY_MODES.GHOST,
        viewerContactIds: [],
        isAIContext: true, // AI context
      });

      if (canSee === true) {
        logger.success('GHOST visibility returns true for AI context');
        testResults.passed++;
        testResults.tests.push({ name: 'canUserSeeParticipant - GHOST (AI context)', passed: true });
      } else {
        throw new Error(`Expected true, got ${canSee}`);
      }
    } catch (error) {
      logger.error('canUserSeeParticipant - GHOST (AI context) FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'canUserSeeParticipant - GHOST (AI context)', passed: false, error: error.message });
    }
    logger.testEnd('canUserSeeParticipant - GHOST (AI context)', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 7: filterParticipantsByVisibility
    // =========================================================================
    logger.testStart('filterParticipantsByVisibility');
    try {
      const participants = createMockParticipants();

      const filtered = VisibilityService.filterParticipantsByVisibility({
        participants,
        viewerId: testUserId,
        viewerContactIds: ['contact-friends-1'], // Only one friend
        isAIContext: false,
      });

      // Expected: 2 public + 1 friends (the one we have as contact) = 3
      // PRIVATE and GHOST should be excluded in human context
      const publicCount = filtered.filter(p => p.visibility === EVENT_VISIBILITY_MODES.PUBLIC).length;
      const friendsCount = filtered.filter(p => p.visibility === EVENT_VISIBILITY_MODES.FRIENDS).length;
      const privateCount = filtered.filter(p => p.visibility === EVENT_VISIBILITY_MODES.PRIVATE).length;
      const ghostCount = filtered.filter(p => p.visibility === EVENT_VISIBILITY_MODES.GHOST).length;

      if (publicCount === 2 && friendsCount === 1 && privateCount === 0 && ghostCount === 0) {
        logger.success('filterParticipantsByVisibility correctly filters mixed list', {
          public: publicCount,
          friends: friendsCount,
          private: privateCount,
          ghost: ghostCount,
          total: filtered.length,
        });
        testResults.passed++;
        testResults.tests.push({ name: 'filterParticipantsByVisibility', passed: true });
      } else {
        throw new Error(`Unexpected counts: public=${publicCount}, friends=${friendsCount}, private=${privateCount}, ghost=${ghostCount}`);
      }
    } catch (error) {
      logger.error('filterParticipantsByVisibility FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'filterParticipantsByVisibility', passed: false, error: error.message });
    }
    logger.testEnd('filterParticipantsByVisibility', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 8: getVisibilityCounts
    // =========================================================================
    logger.testStart('getVisibilityCounts');
    try {
      const participants = createMockParticipants();

      const counts = VisibilityService.getVisibilityCounts({ participants });

      // Expected: 2 public, 2 friends, 1 private, 2 ghost, 7 total
      if (
        counts[EVENT_VISIBILITY_MODES.PUBLIC] === 2 &&
        counts[EVENT_VISIBILITY_MODES.FRIENDS] === 2 &&
        counts[EVENT_VISIBILITY_MODES.PRIVATE] === 1 &&
        counts[EVENT_VISIBILITY_MODES.GHOST] === 2 &&
        counts.total === 7
      ) {
        logger.success('getVisibilityCounts returns correct counts', counts);
        testResults.passed++;
        testResults.tests.push({ name: 'getVisibilityCounts', passed: true });
      } else {
        throw new Error(`Unexpected counts: ${JSON.stringify(counts)}`);
      }
    } catch (error) {
      logger.error('getVisibilityCounts FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'getVisibilityCounts', passed: false, error: error.message });
    }
    logger.testEnd('getVisibilityCounts', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 9: getAIVisibleParticipants
    // =========================================================================
    logger.testStart('getAIVisibleParticipants');
    try {
      const participants = createMockParticipants();

      const aiVisible = VisibilityService.getAIVisibleParticipants({ participants });

      // AI can see: public (2) + friends (2) + ghost (2) = 6
      // AI cannot see: private (1)
      const hasPrivate = aiVisible.some(p => p.visibility === EVENT_VISIBILITY_MODES.PRIVATE);
      const hasPublic = aiVisible.filter(p => p.visibility === EVENT_VISIBILITY_MODES.PUBLIC).length;
      const hasGhost = aiVisible.filter(p => p.visibility === EVENT_VISIBILITY_MODES.GHOST).length;

      if (aiVisible.length === 6 && !hasPrivate && hasPublic === 2 && hasGhost === 2) {
        logger.success('getAIVisibleParticipants includes public + ghost, excludes private', {
          total: aiVisible.length,
          public: hasPublic,
          ghost: hasGhost,
        });
        testResults.passed++;
        testResults.tests.push({ name: 'getAIVisibleParticipants', passed: true });
      } else {
        throw new Error(`Unexpected AI visible count: ${aiVisible.length}, hasPrivate=${hasPrivate}`);
      }
    } catch (error) {
      logger.error('getAIVisibleParticipants FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'getAIVisibleParticipants', passed: false, error: error.message });
    }
    logger.testEnd('getAIVisibleParticipants', testResults.tests[testResults.tests.length - 1].passed);

    // =========================================================================
    // TEST 10: validateVisibilityMode
    // =========================================================================
    logger.testStart('validateVisibilityMode');
    try {
      // Test valid modes
      const validResults = [
        VisibilityService.validateVisibilityMode(EVENT_VISIBILITY_MODES.PUBLIC),
        VisibilityService.validateVisibilityMode(EVENT_VISIBILITY_MODES.FRIENDS),
        VisibilityService.validateVisibilityMode(EVENT_VISIBILITY_MODES.PRIVATE),
        VisibilityService.validateVisibilityMode(EVENT_VISIBILITY_MODES.GHOST),
      ];

      const allValid = validResults.every(r => r.isValid === true);

      // Test invalid modes
      const invalidResult1 = VisibilityService.validateVisibilityMode('invalid');
      const invalidResult2 = VisibilityService.validateVisibilityMode('');
      const invalidResult3 = VisibilityService.validateVisibilityMode(null);

      const allInvalid = !invalidResult1.isValid && !invalidResult2.isValid && !invalidResult3.isValid;

      if (allValid && allInvalid) {
        logger.success('validateVisibilityMode correctly validates modes', {
          validModes: validResults.length,
          invalidRejected: 3,
        });
        testResults.passed++;
        testResults.tests.push({ name: 'validateVisibilityMode', passed: true });
      } else {
        throw new Error(`Validation failed: allValid=${allValid}, allInvalid=${allInvalid}`);
      }
    } catch (error) {
      logger.error('validateVisibilityMode FAILED', { error: error.message });
      testResults.failed++;
      testResults.tests.push({ name: 'validateVisibilityMode', passed: false, error: error.message });
    }
    logger.testEnd('validateVisibilityMode', testResults.tests[testResults.tests.length - 1].passed);

  } catch (error) {
    logger.error('Unexpected test error', { error: error.message });
  }

  // Return results
  const summary = logger.getSummary();
  console.log('\n========================================');
  console.log(`🔐 ${summary.testSuite} Complete`);
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

export default { runVisibilityServiceClassTests };
