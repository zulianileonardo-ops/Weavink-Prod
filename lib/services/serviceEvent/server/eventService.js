// lib/services/serviceEvent/server/eventService.js
/**
 * Event Service - Server-side CRUD operations
 *
 * Provides core event management functionality:
 * - Create, read, update, delete events
 * - Firestore storage with Neo4j graph sync
 * - User-scoped event access (multi-tenancy)
 *
 * @see documentation/features/EVENT_SOCIAL_INTELLIGENCE.md
 */

import { adminDb } from '../../../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { neo4jClient } from '../../serviceContact/server/neo4j/neo4jClient.js';
import { AdminService } from '../../serviceAdmin/server/adminService.js';
import {
  EVENT_VISIBILITY_MODES,
  EVENT_SOURCES,
  getEventLimits,
  hasEventFeature,
  EVENT_FEATURES,
} from '../client/constants/eventConstants.js';

/**
 * Generate unique event ID with timestamp
 * @returns {string} Unique event ID
 */
function generateEventId() {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate event data before saving
 * @param {Object} eventData - Event data to validate
 * @throws {Error} If validation fails
 */
function validateEventData(eventData) {
  if (!eventData.name || typeof eventData.name !== 'string' || !eventData.name.trim()) {
    throw new Error('Event name is required');
  }

  if (!eventData.startDate) {
    throw new Error('Event start date is required');
  }

  // Validate dates are valid ISO strings or Date objects
  const startDate = new Date(eventData.startDate);
  if (isNaN(startDate.getTime())) {
    throw new Error('Invalid start date format');
  }

  if (eventData.endDate) {
    const endDate = new Date(eventData.endDate);
    if (isNaN(endDate.getTime())) {
      throw new Error('Invalid end date format');
    }
    if (endDate < startDate) {
      throw new Error('End date must be after start date');
    }
  }

  // Validate location if provided
  if (eventData.location) {
    if (typeof eventData.location !== 'object') {
      throw new Error('Location must be an object');
    }
    if (eventData.location.latitude !== undefined) {
      const lat = Number(eventData.location.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new Error('Invalid latitude');
      }
    }
    if (eventData.location.longitude !== undefined) {
      const lon = Number(eventData.location.longitude);
      if (isNaN(lon) || lon < -180 || lon > 180) {
        throw new Error('Invalid longitude');
      }
    }
  }
}

/**
 * Sync event to Neo4j graph (fire-and-forget)
 * @param {string} userId - User ID
 * @param {Object} event - Event data
 */
function syncEventToNeo4j(userId, event) {
  neo4jClient.upsertEvent(userId, event)
    .then(() => console.log(`[Neo4j] Event ${event.id} synced to graph`))
    .catch(err => console.error(`[Neo4j] Event sync failed:`, err.message));
}

/**
 * Delete event from Neo4j graph (fire-and-forget)
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 */
function deleteEventFromNeo4j(userId, eventId) {
  neo4jClient.deleteEvent(userId, eventId)
    .then(() => console.log(`[Neo4j] Event ${eventId} deleted from graph`))
    .catch(err => console.error(`[Neo4j] Event deletion failed:`, err.message));
}

/**
 * EventService - Server-side event CRUD operations
 */
export class EventService {
  /**
   * Create a new event
   * @param {{ eventData: Object, session: Object }} params
   * @returns {Promise<Object>} Created event
   */
  static async createEvent({ eventData, session }) {
    console.log('[EventService] Creating event for user:', session.userId);

    // 1. Validate event data BEFORE processing
    validateEventData(eventData);

    // 2. Check subscription limits
    const limits = getEventLimits(session.subscriptionLevel);
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.BASIC_EVENTS)) {
      throw new Error('Event feature not available in your subscription plan');
    }

    // 3. Admin-only check for public events
    if (eventData.isPublic === true) {
      if (!AdminService.isServerAdmin(session.email)) {
        throw new Error('Only administrators can create public events');
      }
      console.log('[EventService] Admin creating public event:', eventData.name);
    }

    const eventId = eventData.id || generateEventId();
    const now = new Date().toISOString();

    // Build event document
    const event = {
      id: eventId,
      userId: session.userId,
      isPublic: eventData.isPublic || false, // Public events visible to all users
      name: eventData.name.trim(),
      description: eventData.description?.trim() || '',
      startDate: new Date(eventData.startDate).toISOString(),
      endDate: eventData.endDate ? new Date(eventData.endDate).toISOString() : null,
      location: eventData.location || null,
      source: eventData.source || EVENT_SOURCES.MANUAL,
      sourceId: eventData.sourceId || null,
      tags: eventData.tags || [],
      isRecurring: eventData.isRecurring || false,
      recurrenceRule: eventData.recurrenceRule || null,
      createdAt: now,
      updatedAt: now,
    };

    // Save to Firestore
    const eventRef = adminDb.collection('events').doc(eventId);
    await eventRef.set(event);

    console.log('[EventService] Event created:', eventId, event.isPublic ? '(PUBLIC)' : '(PRIVATE)');

    // Sync to Neo4j (fire-and-forget)
    syncEventToNeo4j(session.userId, event);

    return event;
  }

  /**
   * Get a single event by ID
   * @param {{ eventId: string, session: Object }} params
   * @returns {Promise<Object|null>} Event or null if not found
   */
  static async getEvent({ eventId, session }) {
    console.log('[EventService] Getting event:', eventId);

    const eventRef = adminDb.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return null;
    }

    const event = eventDoc.data();

    // Allow access if: (1) user owns it, OR (2) it's a public event
    if (event.userId !== session.userId && !event.isPublic) {
      throw new Error('Access denied: Event belongs to another user');
    }

    return event;
  }

  /**
   * Get all events for a user with optional filtering
   * @param {{ session: Object, options?: Object }} params
   * @param {string} [options.source] - Filter by source
   * @param {Date} [options.startAfter] - Filter events starting after this date
   * @param {Date} [options.startBefore] - Filter events starting before this date
   * @param {number} [options.limit] - Maximum events to return (default: 50)
   * @param {string} [options.orderBy] - Order by field (default: 'startDate')
   * @param {string} [options.orderDir] - Order direction 'asc' or 'desc' (default: 'asc')
   * @returns {Promise<Object>} Events list with metadata
   */
  static async getUserEvents({ session, options = {} }) {
    console.log('[EventService] Getting events for user:', session.userId);

    const {
      source,
      startAfter,
      startBefore,
      limit = 50,
      orderBy = 'startDate',
      orderDir = 'asc',
    } = options;

    // Query 1: User's own events
    let userQuery = adminDb.collection('events')
      .where('userId', '==', session.userId);

    // Apply filters
    if (source) userQuery = userQuery.where('source', '==', source);
    if (startAfter) userQuery = userQuery.where('startDate', '>=', new Date(startAfter).toISOString());
    if (startBefore) userQuery = userQuery.where('startDate', '<=', new Date(startBefore).toISOString());

    // Query 2: Public events
    let publicQuery = adminDb.collection('events')
      .where('isPublic', '==', true);

    // Apply same filters
    if (source) publicQuery = publicQuery.where('source', '==', source);
    if (startAfter) publicQuery = publicQuery.where('startDate', '>=', new Date(startAfter).toISOString());
    if (startBefore) publicQuery = publicQuery.where('startDate', '<=', new Date(startBefore).toISOString());

    // Execute both queries in parallel
    const [userSnapshot, publicSnapshot] = await Promise.all([
      userQuery.get(),
      publicQuery.get()
    ]);

    // Combine results (remove duplicates by ID)
    const eventsMap = new Map();
    userSnapshot.docs.forEach(doc => eventsMap.set(doc.id, doc.data()));
    publicSnapshot.docs.forEach(doc => eventsMap.set(doc.id, doc.data()));

    // Convert to array and sort
    const events = Array.from(eventsMap.values())
      .sort((a, b) => {
        const aVal = a[orderBy];
        const bVal = b[orderBy];
        return orderDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      })
      .slice(0, limit);

    console.log('[EventService] Found events:', events.length, '(user:', userSnapshot.size, 'public:', publicSnapshot.size, ')');

    return {
      events,
      total: events.length,
      hasMore: events.length === limit,
    };
  }

  /**
   * Get upcoming events for a user
   * @param {{ session: Object, limit?: number }} params
   * @returns {Promise<Object[]>} Upcoming events
   */
  static async getUpcomingEvents({ session, limit = 20 }) {
    const now = new Date().toISOString();

    const query = adminDb.collection('events')
      .where('userId', '==', session.userId)
      .where('startDate', '>=', now)
      .orderBy('startDate', 'asc')
      .limit(limit);

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data());
  }

  /**
   * Update an existing event
   * @param {{ eventId: string, eventData: Object, session: Object }} params
   * @returns {Promise<Object>} Updated event
   */
  static async updateEvent({ eventId, eventData, session }) {
    console.log('[EventService] Updating event:', eventId);

    // Get existing event
    const existingEvent = await this.getEvent({ eventId, session });
    if (!existingEvent) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    // Validate updates (throws on error)
    const updateData = { ...existingEvent, ...eventData };
    validateEventData(updateData);

    // Build update object (only allowed fields)
    const updates = {
      name: eventData.name?.trim() ?? existingEvent.name,
      description: eventData.description?.trim() ?? existingEvent.description,
      startDate: eventData.startDate ? new Date(eventData.startDate).toISOString() : existingEvent.startDate,
      endDate: eventData.endDate ? new Date(eventData.endDate).toISOString() : existingEvent.endDate,
      location: eventData.location ?? existingEvent.location,
      tags: eventData.tags ?? existingEvent.tags,
      isRecurring: eventData.isRecurring ?? existingEvent.isRecurring,
      recurrenceRule: eventData.recurrenceRule ?? existingEvent.recurrenceRule,
      updatedAt: new Date().toISOString(),
    };

    // Update in Firestore
    const eventRef = adminDb.collection('events').doc(eventId);
    await eventRef.update(updates);

    const updatedEvent = { ...existingEvent, ...updates };

    console.log('[EventService] Event updated:', eventId);

    // Sync to Neo4j (fire-and-forget)
    syncEventToNeo4j(session.userId, updatedEvent);

    return updatedEvent;
  }

  /**
   * Delete an event
   * @param {{ eventId: string, session: Object }} params
   * @returns {Promise<{ success: boolean }>}
   */
  static async deleteEvent({ eventId, session }) {
    console.log('[EventService] Deleting event:', eventId);

    // Verify event exists and belongs to user
    const existingEvent = await this.getEvent({ eventId, session });
    if (!existingEvent) {
      // Already deleted or doesn't exist
      return { success: true };
    }

    // Delete participants subcollection first
    const participantsRef = adminDb.collection('events').doc(eventId).collection('participants');
    const participantsSnapshot = await participantsRef.get();

    const batch = adminDb.batch();
    participantsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the event document
    batch.delete(adminDb.collection('events').doc(eventId));
    await batch.commit();

    console.log('[EventService] Event deleted:', eventId);

    // Delete from Neo4j (fire-and-forget)
    deleteEventFromNeo4j(session.userId, eventId);

    return { success: true };
  }

  /**
   * Get events within a geographic radius
   * Note: This is a simplified implementation. For production,
   * consider using Firestore GeoPoints with geohash or a dedicated
   * geo-search service.
   *
   * @param {{ lat: number, lng: number, radiusKm: number, session: Object }} params
   * @returns {Promise<Object[]>} Events within radius
   */
  static async getEventsInRadius({ lat, lng, radiusKm, session }) {
    console.log(`[EventService] Finding events within ${radiusKm}km of (${lat}, ${lng})`);

    // Get all upcoming user events with location
    const { events } = await this.getUserEvents({
      session,
      options: {
        startAfter: new Date(),
        limit: 200,
      },
    });

    // Filter events with location within radius
    const eventsInRadius = events.filter(event => {
      if (!event.location?.latitude || !event.location?.longitude) {
        return false;
      }

      const distance = this.calculateDistance(
        lat,
        lng,
        event.location.latitude,
        event.location.longitude
      );

      return distance <= radiusKm;
    });

    // Add distance to each event
    return eventsInRadius.map(event => ({
      ...event,
      distance: this.calculateDistance(
        lat,
        lng,
        event.location.latitude,
        event.location.longitude
      ),
    })).sort((a, b) => a.distance - b.distance);
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lng1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lng2 - Longitude of point 2
   * @returns {number} Distance in kilometers
   */
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get event statistics for a user
   * @param {{ session: Object }} params
   * @returns {Promise<Object>} Event statistics
   */
  static async getEventStats({ session }) {
    const now = new Date().toISOString();

    // Get counts using aggregation queries
    const eventsRef = adminDb.collection('events')
      .where('userId', '==', session.userId);

    const [totalSnapshot, upcomingSnapshot] = await Promise.all([
      eventsRef.count().get(),
      eventsRef.where('startDate', '>=', now).count().get(),
    ]);

    return {
      totalEvents: totalSnapshot.data().count,
      upcomingEvents: upcomingSnapshot.data().count,
    };
  }

  // =========================================================================
  // ATTENDANCE MANAGEMENT
  // =========================================================================

  /**
   * Register attendance at an event
   * Creates a participant record with visibility and intent settings
   *
   * @param {{ eventId: string, contactId: string, participation: Object, session: Object }} params
   * @param {string} participation.visibility - Visibility mode (public, friends, private, ghost)
   * @param {string} participation.intent - Participation intent
   * @param {string[]} participation.lookingFor - What they're looking for
   * @param {string[]} participation.offering - What they're offering
   * @param {string} participation.status - Attendance status (confirmed, maybe, declined)
   * @returns {Promise<Object>} Created participation record
   */
  static async registerAttendance({ eventId, contactId, participation = {}, session }) {
    console.log('[EventService] Registering attendance:', { eventId, contactId });

    // Verify event exists and belongs to user
    const event = await this.getEvent({ eventId, session });
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    // Check if already registered
    const participantRef = adminDb
      .collection('events')
      .doc(eventId)
      .collection('participants')
      .doc(contactId);

    const existingParticipant = await participantRef.get();
    if (existingParticipant.exists) {
      throw new Error('Contact is already registered for this event');
    }

    const now = new Date().toISOString();

    // Build participation record
    const participationData = {
      contactId,
      eventId,
      userId: session.userId,
      visibility: participation.visibility || EVENT_VISIBILITY_MODES.FRIENDS,
      intent: participation.intent || null,
      secondaryIntents: participation.secondaryIntents || [],
      lookingFor: participation.lookingFor || [],
      offering: participation.offering || [],
      status: participation.status || 'confirmed',
      notes: participation.notes || '',
      confirmedAt: participation.status === 'confirmed' ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    // Save to Firestore
    await participantRef.set(participationData);

    console.log('[EventService] Attendance registered:', { eventId, contactId });

    // Sync to Neo4j (fire-and-forget)
    neo4jClient.createAttendsRelationship(session.userId, contactId, eventId, participationData)
      .then(() => console.log(`[Neo4j] ATTENDS relationship created for ${contactId} -> ${eventId}`))
      .catch(err => console.error('[Neo4j] ATTENDS sync failed:', err.message));

    return participationData;
  }

  /**
   * Update attendance participation details
   *
   * @param {{ eventId: string, contactId: string, updates: Object, session: Object }} params
   * @returns {Promise<Object>} Updated participation record
   */
  static async updateAttendance({ eventId, contactId, updates, session }) {
    console.log('[EventService] Updating attendance:', { eventId, contactId });

    // Verify event exists and belongs to user
    const event = await this.getEvent({ eventId, session });
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const participantRef = adminDb
      .collection('events')
      .doc(eventId)
      .collection('participants')
      .doc(contactId);

    const existingDoc = await participantRef.get();
    if (!existingDoc.exists) {
      throw new Error('Attendance record not found');
    }

    const existing = existingDoc.data();
    const now = new Date().toISOString();

    // Build update object (only allowed fields)
    const updateData = {
      visibility: updates.visibility ?? existing.visibility,
      intent: updates.intent ?? existing.intent,
      secondaryIntents: updates.secondaryIntents ?? existing.secondaryIntents,
      lookingFor: updates.lookingFor ?? existing.lookingFor,
      offering: updates.offering ?? existing.offering,
      status: updates.status ?? existing.status,
      notes: updates.notes ?? existing.notes,
      updatedAt: now,
    };

    // Update confirmedAt if status changed to confirmed
    if (updates.status === 'confirmed' && existing.status !== 'confirmed') {
      updateData.confirmedAt = now;
    }

    await participantRef.update(updateData);

    const updatedParticipation = { ...existing, ...updateData };

    console.log('[EventService] Attendance updated:', { eventId, contactId });

    // Sync visibility to Neo4j if changed (fire-and-forget)
    if (updates.visibility && updates.visibility !== existing.visibility) {
      neo4jClient.updateAttendanceVisibility(session.userId, contactId, eventId, updates.visibility)
        .then(() => console.log(`[Neo4j] Visibility updated for ${contactId} at ${eventId}`))
        .catch(err => console.error('[Neo4j] Visibility sync failed:', err.message));
    }

    return updatedParticipation;
  }

  /**
   * Remove attendance from an event
   *
   * @param {{ eventId: string, contactId: string, session: Object }} params
   * @returns {Promise<{ success: boolean }>}
   */
  static async removeAttendance({ eventId, contactId, session }) {
    console.log('[EventService] Removing attendance:', { eventId, contactId });

    // Verify event exists and belongs to user
    const event = await this.getEvent({ eventId, session });
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const participantRef = adminDb
      .collection('events')
      .doc(eventId)
      .collection('participants')
      .doc(contactId);

    const existingDoc = await participantRef.get();
    if (!existingDoc.exists) {
      // Already removed
      return { success: true };
    }

    await participantRef.delete();

    console.log('[EventService] Attendance removed:', { eventId, contactId });

    // Note: Neo4j ATTENDS relationship will be cleaned up when event is deleted
    // For individual removal, we would need a deleteAttendsRelationship method

    return { success: true };
  }

  /**
   * Get all attendees for an event
   * Raw method without visibility filtering - use with VisibilityService
   *
   * @param {{ eventId: string, session: Object }} params
   * @returns {Promise<Object[]>} All participant records
   */
  static async getEventAttendees({ eventId, session }) {
    console.log('[EventService] Getting attendees for event:', eventId);

    // Verify event exists and belongs to user
    const event = await this.getEvent({ eventId, session });
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const participantsRef = adminDb
      .collection('events')
      .doc(eventId)
      .collection('participants');

    const snapshot = await participantsRef.get();
    const participants = snapshot.docs.map(doc => doc.data());

    console.log('[EventService] Found attendees:', participants.length);

    return participants;
  }

  /**
   * Get a single participant's attendance record
   *
   * @param {{ eventId: string, contactId: string, session: Object }} params
   * @returns {Promise<Object|null>} Participation record or null
   */
  static async getAttendance({ eventId, contactId, session }) {
    // Verify event exists and belongs to user
    const event = await this.getEvent({ eventId, session });
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const participantRef = adminDb
      .collection('events')
      .doc(eventId)
      .collection('participants')
      .doc(contactId);

    const doc = await participantRef.get();

    if (!doc.exists) {
      return null;
    }

    return doc.data();
  }

  /**
   * Get attendee count for an event
   *
   * @param {{ eventId: string, session: Object }} params
   * @returns {Promise<number>} Attendee count
   */
  static async getAttendeeCount({ eventId, session }) {
    // Verify event exists and belongs to user
    const event = await this.getEvent({ eventId, session });
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const snapshot = await adminDb
      .collection('events')
      .doc(eventId)
      .collection('participants')
      .count()
      .get();

    return snapshot.data().count;
  }

  /**
   * Bulk register multiple contacts as attendees
   *
   * @param {{ eventId: string, contactIds: string[], defaultParticipation: Object, session: Object }} params
   * @returns {Promise<{ success: number, failed: number, errors: Object[] }>}
   */
  static async bulkRegisterAttendance({ eventId, contactIds, defaultParticipation = {}, session }) {
    console.log('[EventService] Bulk registering attendance:', { eventId, count: contactIds.length });

    // Verify event exists and belongs to user
    const event = await this.getEvent({ eventId, session });
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    const results = { success: 0, failed: 0, errors: [] };
    const batch = adminDb.batch();
    const now = new Date().toISOString();

    for (const contactId of contactIds) {
      try {
        const participantRef = adminDb
          .collection('events')
          .doc(eventId)
          .collection('participants')
          .doc(contactId);

        const participationData = {
          contactId,
          eventId,
          userId: session.userId,
          visibility: defaultParticipation.visibility || EVENT_VISIBILITY_MODES.FRIENDS,
          intent: defaultParticipation.intent || null,
          secondaryIntents: defaultParticipation.secondaryIntents || [],
          lookingFor: defaultParticipation.lookingFor || [],
          offering: defaultParticipation.offering || [],
          status: defaultParticipation.status || 'confirmed',
          notes: '',
          confirmedAt: now,
          createdAt: now,
          updatedAt: now,
        };

        batch.set(participantRef, participationData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ contactId, error: error.message });
      }
    }

    await batch.commit();

    console.log('[EventService] Bulk registration complete:', results);

    return results;
  }

  /**
   * Bulk create multiple events
   * Reuses createEvent() for validation and admin checks
   * @param {{ events: Object[], session: Object }} params
   * @returns {Promise<{ success: number, failed: number, events: Object[], errors: Object[] }>}
   */
  static async bulkCreateEvents({ events, session }) {
    console.log('[EventService] Bulk creating', events.length, 'events');

    const results = {
      success: 0,
      failed: 0,
      events: [],
      errors: []
    };

    for (const eventData of events) {
      try {
        const event = await this.createEvent({ eventData, session });
        results.success++;
        results.events.push(event);
        console.log('[EventService] ✅ Created:', event.name);
      } catch (error) {
        results.failed++;
        results.errors.push({
          eventData: { name: eventData.name, startDate: eventData.startDate },
          error: error.message
        });
        console.error('[EventService] ❌ Failed:', eventData.name, error.message);
      }
    }

    console.log('[EventService] Bulk import complete:', results);
    return results;
  }
}

export default EventService;
