/**
 * Event Social Intelligence Test Helpers
 *
 * Provides utilities for real-world testing:
 * - Create/cleanup test events in Neo4j
 * - Create/cleanup test contacts in Neo4j
 * - Create ATTENDS relationships with participation data
 * - Create MATCHED_AT relationships for AI matching tests
 * - Create/cleanup test events in Firestore
 * - Mock session objects for service tests
 *
 * All operations hit the REAL databases (Neo4j + Firestore) - no mocks!
 */

import { neo4jClient } from '../../serviceContact/server/neo4j/neo4jClient.js';
import { adminDb } from '../../../firebaseAdmin.js';
import {
  EVENT_VISIBILITY_MODES,
  PARTICIPATION_INTENTS,
  LOOKING_FOR_TYPES,
  OFFERING_TYPES,
} from '../client/constants/eventConstants.js';

/**
 * Test Results Logger (consistent with RGPD tests)
 */
export class TestLogger {
  constructor(testSuiteName) {
    this.testSuiteName = testSuiteName;
    this.results = [];
    this.startTime = Date.now();
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data };

    const emoji = {
      SUCCESS: '✅',
      ERROR: '❌',
      INFO: 'ℹ️',
      WARNING: '⚠️',
      TEST_START: '🧪',
      TEST_END: '🏁',
    }[level] || '📝';

    console.log(`${emoji} [${this.testSuiteName}] ${message}`, data || '');
    this.results.push(logEntry);
  }

  success(message, data) { this.log('SUCCESS', message, data); }
  error(message, data) { this.log('ERROR', message, data); }
  info(message, data) { this.log('INFO', message, data); }
  warning(message, data) { this.log('WARNING', message, data); }
  testStart(testName) { this.log('TEST_START', `Starting test: ${testName}`); }
  testEnd(testName, passed) { this.log('TEST_END', `Test ${passed ? 'PASSED' : 'FAILED'}: ${testName}`); }

  getSummary() {
    const duration = Date.now() - this.startTime;
    return {
      testSuite: this.testSuiteName,
      duration: `${duration}ms`,
      totalLogs: this.results.length,
      successCount: this.results.filter(r => r.level === 'SUCCESS').length,
      errorCount: this.results.filter(r => r.level === 'ERROR').length,
      results: this.results,
    };
  }
}

/**
 * Generate unique test ID with timestamp
 */
export function generateTestId(prefix = 'test') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a test event in Neo4j
 * @param {string} userId - User ID for multi-tenancy
 * @param {Object} eventData - Event data overrides
 * @returns {Promise<Object>} Created event result
 */
export async function createTestEvent(userId, eventData = {}) {
  const eventId = eventData.id || generateTestId('event');

  const event = {
    id: eventId,
    name: eventData.name || 'Test Event',
    description: eventData.description || 'Test event for integration tests',
    startDate: eventData.startDate || new Date(),
    endDate: eventData.endDate || new Date(Date.now() + 3600000), // +1 hour
    location: eventData.location || {
      lat: 48.8566,
      lng: 2.3522,
      address: 'Paris, France',
    },
    source: eventData.source || 'manual',
  };

  const result = await neo4jClient.upsertEvent(userId, event);

  return {
    eventId,
    event,
    result,
  };
}

/**
 * Create a test contact in Neo4j
 * @param {string} userId - User ID for multi-tenancy
 * @param {Object} contactData - Contact data overrides
 * @returns {Promise<Object>} Created contact result
 */
export async function createTestContact(userId, contactData = {}) {
  const contactId = contactData.id || generateTestId('contact');

  const contact = {
    id: contactId,
    name: contactData.name || `Test Contact ${contactId.slice(-4)}`,
    email: contactData.email || `${contactId}@test.weavink.com`,
    company: contactData.company || 'Test Company',
    jobTitle: contactData.jobTitle || 'Test Role',
    tags: contactData.tags || ['test', 'integration'],
  };

  const result = await neo4jClient.upsertContact(userId, contact);

  return {
    contactId,
    contact,
    result,
  };
}

/**
 * Create an ATTENDS relationship between a contact and event
 * @param {string} userId - User ID for multi-tenancy
 * @param {string} contactId - Contact ID
 * @param {string} eventId - Event ID
 * @param {Object} participation - Participation details
 * @returns {Promise<Object>} Created relationship result
 */
export async function createTestAttendee(userId, contactId, eventId, participation = {}) {
  const participationData = {
    visibility: participation.visibility || EVENT_VISIBILITY_MODES.PUBLIC,
    intent: participation.intent || PARTICIPATION_INTENTS.NETWORKING,
    lookingFor: participation.lookingFor || [],
    offering: participation.offering || [],
    status: participation.status || 'confirmed',
  };

  const result = await neo4jClient.createAttendsRelationship(
    userId,
    contactId,
    eventId,
    participationData
  );

  return {
    contactId,
    eventId,
    participation: participationData,
    result,
  };
}

/**
 * Create a compatible pair of contacts for matching tests
 * One looking for X, the other offering X
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Created pair with IDs and participation data
 */
export async function createCompatiblePair(userId, eventId) {
  // Contact 1: Looking for investor, offering expertise
  const contact1 = await createTestContact(userId, {
    name: 'Startup Founder',
    company: 'TestStartup Inc',
    jobTitle: 'CEO',
    tags: ['startup', 'AI', 'seeking_funding'],
  });

  // Contact 2: Looking for collaborator, offering investment
  const contact2 = await createTestContact(userId, {
    name: 'Angel Investor',
    company: 'VC Partners',
    jobTitle: 'Partner',
    tags: ['investor', 'AI', 'mentor'],
  });

  // Add both to event with complementary needs
  // Note: Neo4j query does DIRECT STRING MATCHING between lookingFor and offering
  // So we use the SAME string values on both sides for matches to work
  const attendee1 = await createTestAttendee(userId, contact1.contactId, eventId, {
    visibility: EVENT_VISIBILITY_MODES.PUBLIC,
    intent: PARTICIPATION_INTENTS.INVESTMENT,
    lookingFor: ['funding'],     // Contact 1 seeks funding
    offering: ['expertise'],     // Contact 1 offers expertise
  });

  const attendee2 = await createTestAttendee(userId, contact2.contactId, eventId, {
    visibility: EVENT_VISIBILITY_MODES.PUBLIC,
    intent: PARTICIPATION_INTENTS.MENTORSHIP,
    lookingFor: ['expertise'],   // Contact 2 seeks expertise (matches Contact 1's offering!)
    offering: ['funding'],       // Contact 2 offers funding (matches Contact 1's lookingFor!)
  });

  return {
    contact1: { ...contact1, participation: attendee1.participation },
    contact2: { ...contact2, participation: attendee2.participation },
    isCompatible: true, // They should match: founder looking for investor, investor offering investment
  };
}

/**
 * Create an incompatible pair (no matching needs)
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Created pair
 */
export async function createIncompatiblePair(userId, eventId) {
  // Contact 1: Looking for mentor
  const contact1 = await createTestContact(userId, {
    name: 'Looking for Mentor',
    company: 'Company A',
    tags: ['needs_guidance'],
  });

  // Contact 2: Also looking for mentor (neither offers what other wants)
  const contact2 = await createTestContact(userId, {
    name: 'Also Looking for Mentor',
    company: 'Company B',
    tags: ['needs_guidance'],
  });

  const attendee1 = await createTestAttendee(userId, contact1.contactId, eventId, {
    visibility: EVENT_VISIBILITY_MODES.PUBLIC,
    lookingFor: [LOOKING_FOR_TYPES.MENTOR],
    offering: [], // Nothing to offer
  });

  const attendee2 = await createTestAttendee(userId, contact2.contactId, eventId, {
    visibility: EVENT_VISIBILITY_MODES.PUBLIC,
    lookingFor: [LOOKING_FOR_TYPES.MENTOR],
    offering: [], // Nothing to offer either
  });

  return {
    contact1: { ...contact1, participation: attendee1.participation },
    contact2: { ...contact2, participation: attendee2.participation },
    isCompatible: false,
  };
}

/**
 * Create contacts with different visibility modes
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Contacts by visibility mode
 */
export async function createMixedVisibilityAttendees(userId, eventId) {
  const contacts = {};

  for (const mode of Object.values(EVENT_VISIBILITY_MODES)) {
    const contact = await createTestContact(userId, {
      name: `${mode.charAt(0).toUpperCase() + mode.slice(1)} User`,
      tags: [mode, 'test_visibility'],
    });

    await createTestAttendee(userId, contact.contactId, eventId, {
      visibility: mode,
      intent: PARTICIPATION_INTENTS.NETWORKING,
    });

    contacts[mode] = contact;
  }

  return contacts;
}

/**
 * Cleanup all test data for a user
 * @param {string} userId - User ID
 * @param {Array<string>} eventIds - Event IDs to delete
 * @param {Array<string>} contactIds - Contact IDs to delete
 */
export async function cleanupTestData(userId, eventIds = [], contactIds = []) {
  const errors = [];

  // Delete events first (removes ATTENDS relationships)
  for (const eventId of eventIds) {
    try {
      await neo4jClient.deleteEvent(userId, eventId);
    } catch (error) {
      errors.push({ type: 'event', id: eventId, error: error.message });
    }
  }

  // Delete contacts
  for (const contactId of contactIds) {
    try {
      await neo4jClient.deleteContact(userId, contactId);
    } catch (error) {
      errors.push({ type: 'contact', id: contactId, error: error.message });
    }
  }

  if (errors.length > 0) {
    console.warn('⚠️ Cleanup had some errors:', errors);
  }

  return { success: errors.length === 0, errors };
}

/**
 * Wait for Neo4j to be ready
 */
export async function ensureNeo4jConnected() {
  try {
    const health = await neo4jClient.healthCheck();
    if (!health.healthy) {
      throw new Error('Neo4j is not healthy');
    }
    return true;
  } catch (error) {
    console.error('❌ Neo4j connection failed:', error.message);
    throw new Error('Neo4j must be available for real-world tests');
  }
}

// =========================================================================
// FIRESTORE TEST HELPERS
// =========================================================================

/**
 * Create a mock session object for service tests
 * Real sessions require authentication, but services just need userId + subscriptionLevel
 *
 * @param {string} userId - User ID
 * @param {string} subscriptionLevel - Subscription level ('free', 'starter', 'pro', 'business')
 * @returns {Object} Mock session object
 */
export function createMockSession(userId, subscriptionLevel = 'pro') {
  return {
    userId,
    subscriptionLevel,
    permissions: [],
  };
}

/**
 * Create a test event directly in Firestore (bypasses EventService validation)
 * Use this when you need to setup test data without triggering side effects
 *
 * @param {string} userId - User ID for multi-tenancy
 * @param {Object} eventData - Event data overrides
 * @returns {Promise<Object>} Created event with ID
 */
export async function createTestEventFirestore(userId, eventData = {}) {
  const eventId = eventData.id || generateTestId('event');
  const now = new Date().toISOString();

  const event = {
    id: eventId,
    userId,
    name: eventData.name || 'Test Event',
    description: eventData.description || 'Test event for integration tests',
    startDate: eventData.startDate || new Date().toISOString(),
    endDate: eventData.endDate || new Date(Date.now() + 3600000).toISOString(),
    location: eventData.location || {
      lat: 48.8566,
      lng: 2.3522,
      address: 'Paris, France',
    },
    source: eventData.source || 'manual',
    sourceId: eventData.sourceId || null,
    tags: eventData.tags || [],
    isRecurring: eventData.isRecurring || false,
    recurrenceRule: eventData.recurrenceRule || null,
    createdAt: eventData.createdAt || now,
    updatedAt: eventData.updatedAt || now,
  };

  const eventRef = adminDb.collection('events').doc(eventId);
  await eventRef.set(event);

  return { eventId, event };
}

/**
 * Create a participant record directly in Firestore
 *
 * @param {string} eventId - Event ID
 * @param {string} contactId - Contact ID
 * @param {Object} participationData - Participation details
 * @returns {Promise<Object>} Created participant record
 */
export async function createTestParticipantFirestore(eventId, contactId, participationData = {}) {
  const now = new Date().toISOString();

  const participant = {
    contactId,
    eventId,
    userId: participationData.userId || 'test-user',
    visibility: participationData.visibility || EVENT_VISIBILITY_MODES.PUBLIC,
    intent: participationData.intent || null,
    secondaryIntents: participationData.secondaryIntents || [],
    lookingFor: participationData.lookingFor || [],
    offering: participationData.offering || [],
    status: participationData.status || 'confirmed',
    notes: participationData.notes || '',
    confirmedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const participantRef = adminDb
    .collection('events')
    .doc(eventId)
    .collection('participants')
    .doc(contactId);

  await participantRef.set(participant);

  return { contactId, participant };
}

/**
 * Cleanup Firestore test data
 * Deletes events and their participants subcollections
 *
 * @param {Array<string>} eventIds - Event IDs to delete
 * @returns {Promise<Object>} Cleanup result
 */
export async function cleanupFirestoreTestData(eventIds = []) {
  const errors = [];

  for (const eventId of eventIds) {
    try {
      // Delete participants subcollection first
      const participantsRef = adminDb.collection('events').doc(eventId).collection('participants');
      const snapshot = await participantsRef.get();

      if (!snapshot.empty) {
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      // Delete event document
      await adminDb.collection('events').doc(eventId).delete();
    } catch (error) {
      errors.push({ eventId, error: error.message });
    }
  }

  if (errors.length > 0) {
    console.warn('⚠️ Firestore cleanup had some errors:', errors);
  }

  return { success: errors.length === 0, errors };
}

/**
 * Verify Firestore is connected and accessible
 */
export async function ensureFirestoreConnected() {
  try {
    // Try to access Firestore
    const testRef = adminDb.collection('_test').doc('connection_check');
    await testRef.set({ timestamp: new Date().toISOString() });
    await testRef.delete();
    return true;
  } catch (error) {
    console.error('❌ Firestore connection failed:', error.message);
    throw new Error('Firestore must be available for real-world tests');
  }
}

export default {
  TestLogger,
  generateTestId,
  createTestEvent,
  createTestContact,
  createTestAttendee,
  createCompatiblePair,
  createIncompatiblePair,
  createMixedVisibilityAttendees,
  cleanupTestData,
  ensureNeo4jConnected,
  // Firestore helpers
  createMockSession,
  createTestEventFirestore,
  createTestParticipantFirestore,
  cleanupFirestoreTestData,
  ensureFirestoreConnected,
};
