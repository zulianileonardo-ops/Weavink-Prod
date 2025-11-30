// lib/services/serviceEvent/server/matchingService.js
/**
 * Matching Service - AI-powered event participant matching
 *
 * Features:
 * - 5-signal compatibility scoring (40% complementary, 25% intent, 15% industry, 10% tags, 10% semantic)
 * - Double opt-in flow for privacy
 * - Ghost mode integration (invisible to humans, visible to AI)
 * - Email + in-app notifications
 *
 * @see documentation/features/EVENT_SOCIAL_INTELLIGENCE.md
 */

import { adminDb } from '../../../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { neo4jClient } from '../../serviceContact/server/neo4j/neo4jClient.js';
import { IndexManagementService } from '../../serviceContact/server/indexManagementService.js';
import { EmbeddingService } from '../../serviceContact/server/embeddingService.js';
import { qdrantClient } from '../../../qdrant.js';
import { EventService } from './eventService.js';
import { VisibilityService } from './visibilityService.js';
import { EmailService } from '../../server/emailService.js';
import {
  EVENT_VISIBILITY_MODES,
  COMPATIBILITY_MATRIX,
  MATCH_SIGNAL_WEIGHTS,
  EVENT_MATCH_THRESHOLDS,
  MATCH_REQUEST_STATUS,
  PARTICIPATION_INTENTS,
  hasEventFeature,
  EVENT_FEATURES,
  calculateComplementaryScore,
} from '../client/constants/eventConstants.js';

/**
 * Intent compatibility matrix for matching algorithm
 * Score 0-1 where 1 = perfect complementary intents
 */
const INTENT_COMPATIBILITY_MATRIX = {
  [PARTICIPATION_INTENTS.RECRUITING]: {
    [PARTICIPATION_INTENTS.NETWORKING]: 0.9,      // Recruiters want networkers
    [PARTICIPATION_INTENTS.LEARNING]: 0.7,        // Learning = potential hires
    [PARTICIPATION_INTENTS.MENTORSHIP]: 0.5,
  },
  [PARTICIPATION_INTENTS.NETWORKING]: {
    [PARTICIPATION_INTENTS.RECRUITING]: 0.9,
    [PARTICIPATION_INTENTS.PARTNERSHIP]: 0.85,
    [PARTICIPATION_INTENTS.INVESTMENT]: 0.8,
    [PARTICIPATION_INTENTS.NETWORKING]: 0.75,     // Networkers match each other
    [PARTICIPATION_INTENTS.SALES]: 0.6,
    [PARTICIPATION_INTENTS.MENTORSHIP]: 0.7,
  },
  [PARTICIPATION_INTENTS.INVESTMENT]: {
    [PARTICIPATION_INTENTS.PARTNERSHIP]: 0.95,    // Investors looking for founders
    [PARTICIPATION_INTENTS.NETWORKING]: 0.8,
    [PARTICIPATION_INTENTS.INVESTMENT]: 0.6,      // Co-invest opportunities
    [PARTICIPATION_INTENTS.EXHIBITING]: 0.7,
  },
  [PARTICIPATION_INTENTS.PARTNERSHIP]: {
    [PARTICIPATION_INTENTS.INVESTMENT]: 0.95,
    [PARTICIPATION_INTENTS.PARTNERSHIP]: 0.85,
    [PARTICIPATION_INTENTS.NETWORKING]: 0.8,
    [PARTICIPATION_INTENTS.SALES]: 0.6,
  },
  [PARTICIPATION_INTENTS.SALES]: {
    [PARTICIPATION_INTENTS.NETWORKING]: 0.7,
    [PARTICIPATION_INTENTS.MARKET_RESEARCH]: 0.6,
  },
  [PARTICIPATION_INTENTS.MENTORSHIP]: {
    [PARTICIPATION_INTENTS.LEARNING]: 0.95,       // Perfect match
    [PARTICIPATION_INTENTS.NETWORKING]: 0.7,
    [PARTICIPATION_INTENTS.MENTORSHIP]: 0.5,      // Peer mentorship
  },
  [PARTICIPATION_INTENTS.LEARNING]: {
    [PARTICIPATION_INTENTS.MENTORSHIP]: 0.95,
    [PARTICIPATION_INTENTS.SPEAKING]: 0.8,
    [PARTICIPATION_INTENTS.NETWORKING]: 0.6,
  },
  [PARTICIPATION_INTENTS.SPEAKING]: {
    [PARTICIPATION_INTENTS.LEARNING]: 0.8,
    [PARTICIPATION_INTENTS.NETWORKING]: 0.7,
  },
  [PARTICIPATION_INTENTS.MARKET_RESEARCH]: {
    [PARTICIPATION_INTENTS.EXHIBITING]: 0.8,
    [PARTICIPATION_INTENTS.NETWORKING]: 0.6,
  },
  [PARTICIPATION_INTENTS.EXHIBITING]: {
    [PARTICIPATION_INTENTS.MARKET_RESEARCH]: 0.8,
    [PARTICIPATION_INTENTS.INVESTMENT]: 0.7,
    [PARTICIPATION_INTENTS.NETWORKING]: 0.6,
  },
};

/**
 * Generate unique match ID with timestamp
 * @returns {string} Unique match ID
 */
function generateMatchId() {
  return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate Jaccard similarity between two arrays
 * @param {string[]} arr1 - First array
 * @param {string[]} arr2 - Second array
 * @returns {number} Similarity score 0-1
 */
function jaccardSimilarity(arr1, arr2) {
  if (!arr1?.length || !arr2?.length) return 0;

  const set1 = new Set(arr1.map(s => s.toLowerCase()));
  const set2 = new Set(arr2.map(s => s.toLowerCase()));

  const intersection = [...set1].filter(x => set2.has(x)).length;
  const union = new Set([...set1, ...set2]).size;

  return union > 0 ? intersection / union : 0;
}

/**
 * MatchingService - AI-powered event participant matching
 */
export class MatchingService {
  // =========================================================================
  // SCORING METHODS
  // =========================================================================

  /**
   * Calculate complementary score (lookingFor ↔ offering)
   * Uses COMPATIBILITY_MATRIX for semantic matching
   *
   * @param {string[]} lookingFor1 - Contact 1 looking for
   * @param {string[]} offering1 - Contact 1 offering
   * @param {string[]} lookingFor2 - Contact 2 looking for
   * @param {string[]} offering2 - Contact 2 offering
   * @returns {number} Score 0-1
   */
  static calculateComplementaryScore(lookingFor1, offering1, lookingFor2, offering2) {
    // Bidirectional: A looking for what B offers AND B looking for what A offers
    const score1to2 = calculateComplementaryScore(lookingFor1, offering2);
    const score2to1 = calculateComplementaryScore(lookingFor2, offering1);

    // Average bidirectional scores, with bonus for mutual complementarity
    const avgScore = (score1to2 + score2to1) / 2;
    const mutualBonus = (score1to2 > 0 && score2to1 > 0) ? 0.1 : 0;

    return Math.min(1, avgScore + mutualBonus);
  }

  /**
   * Calculate intent compatibility score
   * Uses INTENT_COMPATIBILITY_MATRIX
   *
   * @param {string} intent1 - Contact 1 primary intent
   * @param {string} intent2 - Contact 2 primary intent
   * @returns {number} Score 0-1
   */
  static calculateIntentScore(intent1, intent2) {
    if (!intent1 || !intent2) return 0;

    // Direct lookup
    const score1 = INTENT_COMPATIBILITY_MATRIX[intent1]?.[intent2] || 0;
    const score2 = INTENT_COMPATIBILITY_MATRIX[intent2]?.[intent1] || 0;

    // Return the higher of the two (asymmetric compatibility)
    return Math.max(score1, score2);
  }

  /**
   * Calculate tag overlap score (Jaccard)
   *
   * @param {string[]} tags1 - Contact 1 tags
   * @param {string[]} tags2 - Contact 2 tags
   * @returns {number} Score 0-1
   */
  static calculateTagScore(tags1, tags2) {
    return jaccardSimilarity(tags1, tags2);
  }

  /**
   * Calculate industry overlap score (Jaccard)
   *
   * @param {string[]} industries1 - Contact 1 industries
   * @param {string[]} industries2 - Contact 2 industries
   * @returns {number} Score 0-1
   */
  static calculateIndustryScore(industries1, industries2) {
    return jaccardSimilarity(industries1, industries2);
  }

  /**
   * Calculate semantic similarity score using Qdrant vectors
   *
   * @param {string} contactId1 - Contact 1 ID
   * @param {string} contactId2 - Contact 2 ID
   * @param {string} userId - User ID for collection lookup
   * @returns {Promise<number>} Score 0-1
   */
  static async calculateSemanticScore(contactId1, contactId2, userId) {
    try {
      const collectionName = userId;  // Direct userId = collection name

      // Check if collection exists
      const collectionExists = await IndexManagementService.collectionExists(collectionName);
      if (!collectionExists) {
        console.log('[MatchingService] Qdrant collection does not exist, skipping semantic score');
        return 0;
      }

      // Fetch both vectors using scroll + filter by originalId
      const [vector1Result, vector2Result] = await Promise.all([
        qdrantClient.scroll(collectionName, {
          filter: {
            must: [{ key: 'originalId', match: { value: contactId1 } }]
          },
          limit: 1,
          with_payload: false,
          with_vector: true
        }),
        qdrantClient.scroll(collectionName, {
          filter: {
            must: [{ key: 'originalId', match: { value: contactId2 } }]
          },
          limit: 1,
          with_payload: false,
          with_vector: true
        })
      ]);

      const vector1 = vector1Result.points?.[0]?.vector;
      const vector2 = vector2Result.points?.[0]?.vector;

      if (!vector1 || !vector2) {
        console.log('[MatchingService] Missing vectors for semantic comparison');
        return 0;
      }

      // Calculate cosine similarity
      const dotProduct = vector1.reduce((sum, v, i) => sum + v * vector2[i], 0);
      const norm1 = Math.sqrt(vector1.reduce((sum, v) => sum + v * v, 0));
      const norm2 = Math.sqrt(vector2.reduce((sum, v) => sum + v * v, 0));

      const cosineSim = dotProduct / (norm1 * norm2);

      // Normalize to 0-1 (cosine can be -1 to 1)
      return Math.max(0, cosineSim);
    } catch (error) {
      console.error('[MatchingService] Semantic score error:', error.message);
      return 0;
    }
  }

  /**
   * Calculate full compatibility score using 5 signals
   *
   * @param {Object} contact1 - Contact 1 data
   * @param {Object} contact2 - Contact 2 data
   * @param {Object} attendance1 - Contact 1 attendance record
   * @param {Object} attendance2 - Contact 2 attendance record
   * @param {string} userId - User ID for Pinecone lookup
   * @returns {Promise<{ score: number, breakdown: Object, reasons: string[] }>}
   */
  static async calculateCompatibilityScore(contact1, contact2, attendance1, attendance2, userId) {
    const weights = {
      complementary: 0.40,
      intent: 0.25,
      industry: 0.15,
      tags: 0.10,
      semantic: 0.10,
    };

    // Calculate individual scores
    const complementaryScore = this.calculateComplementaryScore(
      attendance1.lookingFor || [],
      attendance1.offering || [],
      attendance2.lookingFor || [],
      attendance2.offering || []
    );

    const intentScore = this.calculateIntentScore(
      attendance1.intent,
      attendance2.intent
    );

    const industryScore = this.calculateIndustryScore(
      contact1.industries || contact1.industry ? [contact1.industry] : [],
      contact2.industries || contact2.industry ? [contact2.industry] : []
    );

    const tagScore = this.calculateTagScore(
      contact1.tags || [],
      contact2.tags || []
    );

    const semanticScore = await this.calculateSemanticScore(
      contact1.id,
      contact2.id,
      userId
    );

    // Weighted total
    const totalScore =
      complementaryScore * weights.complementary +
      intentScore * weights.intent +
      industryScore * weights.industry +
      tagScore * weights.tags +
      semanticScore * weights.semantic;

    // Generate human-readable reasons
    const reasons = [];
    if (complementaryScore > 0.5) {
      reasons.push('Complementary needs: what you seek, they offer');
    }
    if (intentScore > 0.6) {
      reasons.push('Aligned participation goals');
    }
    if (industryScore > 0.3) {
      reasons.push('Shared industry background');
    }
    if (tagScore > 0.3) {
      reasons.push('Common interests and expertise');
    }
    if (semanticScore > 0.5) {
      reasons.push('Similar professional profiles');
    }

    return {
      score: Math.round(totalScore * 100) / 100,
      breakdown: {
        complementary: complementaryScore,
        intent: intentScore,
        industry: industryScore,
        tags: tagScore,
        semantic: semanticScore,
      },
      reasons,
    };
  }

  // =========================================================================
  // MATCH FINDING
  // =========================================================================

  /**
   * Find potential matches for a user at an event
   * Called when user RSVPs to an event
   *
   * @param {{ userId: string, eventId: string, contactId: string, session: Object }} params
   * @returns {Promise<Object[]>} Array of potential matches
   */
  static async findMatchesForUser({ userId, eventId, contactId, session }) {
    console.log('[MatchingService] Finding matches for user at event:', { eventId, contactId });

    // Check subscription tier for AI_MATCHMAKING
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.AI_MATCHMAKING)) {
      console.log('[MatchingService] AI matchmaking not available for tier:', session.subscriptionLevel);
      return [];
    }

    // Get all attendees for the event
    const allParticipants = await EventService.getEventAttendees({ eventId, session });

    // Get AI-visible participants (excludes PRIVATE)
    const aiVisibleParticipants = VisibilityService.getAIVisibleParticipants({
      participants: allParticipants,
    });

    // Get the user's attendance record
    const userAttendance = allParticipants.find(p => p.contactId === contactId);
    if (!userAttendance) {
      console.log('[MatchingService] User attendance not found');
      return [];
    }

    // Get user's contact data for profile matching
    const userContact = await this.getContactData(userId, contactId);
    if (!userContact) {
      console.log('[MatchingService] User contact not found');
      return [];
    }

    // Get existing matches to avoid duplicates
    const existingMatches = await this.getExistingMatchesForContact({ userId, eventId, contactId });
    const existingMatchedIds = new Set(existingMatches.map(m =>
      m.contact1Id === contactId ? m.contact2Id : m.contact1Id
    ));

    const potentialMatches = [];

    // Score each other participant
    for (const participant of aiVisibleParticipants) {
      // Skip self
      if (participant.contactId === contactId) continue;

      // Skip already matched
      if (existingMatchedIds.has(participant.contactId)) continue;

      // Get their contact data
      const otherContact = await this.getContactData(userId, participant.contactId);
      if (!otherContact) continue;

      // Calculate compatibility
      const { score, breakdown, reasons } = await this.calculateCompatibilityScore(
        userContact,
        otherContact,
        userAttendance,
        participant,
        userId
      );

      // Only include if above threshold
      if (score >= EVENT_MATCH_THRESHOLDS.MIN_MATCH_SCORE) {
        potentialMatches.push({
          contactId: participant.contactId,
          contactName: otherContact.name || 'Anonymous',
          visibility: participant.visibility,
          score,
          breakdown,
          reasons,
          isHighConfidence: score >= EVENT_MATCH_THRESHOLDS.HIGH_CONFIDENCE_SCORE,
        });
      }
    }

    // Sort by score descending and limit
    potentialMatches.sort((a, b) => b.score - a.score);
    const limitedMatches = potentialMatches.slice(0, EVENT_MATCH_THRESHOLDS.MAX_MATCHES_PER_USER);

    console.log('[MatchingService] Found potential matches:', limitedMatches.length);

    return limitedMatches;
  }

  /**
   * Get contact data from Firestore
   * @private
   */
  static async getContactData(userId, contactId) {
    try {
      const contactsDoc = await adminDb.collection('Contacts').doc(userId).get();
      if (!contactsDoc.exists) return null;

      const contacts = contactsDoc.data()?.contacts || [];
      return contacts.find(c => c.id === contactId);
    } catch (error) {
      console.error('[MatchingService] Error getting contact:', error.message);
      return null;
    }
  }

  // =========================================================================
  // MATCH MANAGEMENT
  // =========================================================================

  /**
   * Create a new match record
   *
   * @param {{ userId: string, eventId: string, contact1Id: string, contact2Id: string, score: number, reasons: string[], session: Object }} params
   * @returns {Promise<Object>} Created match
   */
  static async createMatch({ userId, eventId, contact1Id, contact2Id, score, reasons, session }) {
    console.log('[MatchingService] Creating match:', { eventId, contact1Id, contact2Id, score });

    // Get event for expiration calculation
    const event = await EventService.getEvent({ eventId, session });
    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    const matchId = generateMatchId();
    const now = new Date();

    // Calculate expiration (48h after event ends)
    const eventEnd = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
    const expiresAt = new Date(eventEnd.getTime() + (EVENT_MATCH_THRESHOLDS.MATCH_EXPIRATION_HOURS * 60 * 60 * 1000));

    const matchData = {
      id: matchId,
      userId,
      eventId,
      eventName: event.name,
      contact1Id,
      contact2Id,
      compatibilityScore: score,
      reasons,
      status: MATCH_REQUEST_STATUS.PENDING,
      contact1Accepted: false,
      contact2Accepted: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      acceptedAt: null,
      expiresAt: expiresAt.toISOString(),
    };

    // Save to Firestore
    const matchRef = adminDb.collection('event_matches').doc(matchId);
    await matchRef.set(matchData);

    console.log('[MatchingService] Match created in Firestore:', matchId);

    // Sync to Neo4j (fire-and-forget)
    neo4jClient.createMatchedAtRelationship(userId, contact1Id, contact2Id, eventId, {
      compatibilityScore: score,
      reasons,
      status: MATCH_REQUEST_STATUS.PENDING,
      contact1Accepted: false,
      contact2Accepted: false,
    })
      .then(() => console.log(`[Neo4j] MATCHED_AT relationship created for ${contact1Id} <-> ${contact2Id}`))
      .catch(err => console.error('[Neo4j] MATCHED_AT sync failed:', err.message));

    return matchData;
  }

  /**
   * Get matches for a contact at an event
   *
   * @param {{ userId: string, eventId: string, contactId: string }} params
   * @returns {Promise<Object[]>} Matches
   */
  static async getMatchesForContact({ userId, eventId, contactId }) {
    console.log('[MatchingService] Getting matches for contact:', { eventId, contactId });

    const query = adminDb.collection('event_matches')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId);

    const snapshot = await query.get();
    const allMatches = snapshot.docs.map(doc => doc.data());

    // Filter to matches involving this contact
    const contactMatches = allMatches.filter(m =>
      m.contact1Id === contactId || m.contact2Id === contactId
    );

    // Enrich with other contact info
    const enrichedMatches = await Promise.all(contactMatches.map(async (match) => {
      const otherContactId = match.contact1Id === contactId ? match.contact2Id : match.contact1Id;
      const otherContact = await this.getContactData(userId, otherContactId);

      // Determine if this contact has accepted
      const hasAccepted = match.contact1Id === contactId
        ? match.contact1Accepted
        : match.contact2Accepted;

      // Determine if other contact has accepted
      const otherHasAccepted = match.contact1Id === contactId
        ? match.contact2Accepted
        : match.contact1Accepted;

      // Only reveal identity if both accepted
      const isRevealed = match.status === MATCH_REQUEST_STATUS.ACCEPTED;

      return {
        ...match,
        otherContactId,
        otherContactName: isRevealed ? (otherContact?.name || 'Unknown') : 'Hidden until both accept',
        otherContactEmail: isRevealed ? otherContact?.email : null,
        hasAccepted,
        otherHasAccepted,
        isRevealed,
      };
    }));

    return enrichedMatches;
  }

  /**
   * Get existing matches to avoid duplicates
   * @private
   */
  static async getExistingMatchesForContact({ userId, eventId, contactId }) {
    const query = adminDb.collection('event_matches')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId);

    const snapshot = await query.get();
    const allMatches = snapshot.docs.map(doc => doc.data());

    return allMatches.filter(m =>
      m.contact1Id === contactId || m.contact2Id === contactId
    );
  }

  /**
   * Get all pending matches for a user across all events
   *
   * @param {{ userId: string, contactId: string }} params
   * @returns {Promise<Object[]>} Pending matches
   */
  static async getPendingMatches({ userId, contactId }) {
    console.log('[MatchingService] Getting pending matches for:', contactId);

    const query = adminDb.collection('event_matches')
      .where('userId', '==', userId)
      .where('status', '==', MATCH_REQUEST_STATUS.PENDING);

    const snapshot = await query.get();
    const allPending = snapshot.docs.map(doc => doc.data());

    // Filter to matches involving this contact
    const contactPending = allPending.filter(m =>
      m.contact1Id === contactId || m.contact2Id === contactId
    );

    // Enrich
    const enrichedPending = await Promise.all(contactPending.map(async (match) => {
      const otherContactId = match.contact1Id === contactId ? match.contact2Id : match.contact1Id;
      const otherContact = await this.getContactData(userId, otherContactId);

      const hasAccepted = match.contact1Id === contactId
        ? match.contact1Accepted
        : match.contact2Accepted;

      return {
        ...match,
        otherContactId,
        otherContactName: 'Hidden until both accept',
        hasAccepted,
        waitingForOther: hasAccepted,
      };
    }));

    return enrichedPending;
  }

  /**
   * Respond to a match (accept or decline)
   *
   * @param {{ userId: string, matchId: string, contactId: string, accepted: boolean }} params
   * @returns {Promise<Object>} Updated match
   */
  static async respondToMatch({ userId, matchId, contactId, accepted }) {
    console.log('[MatchingService] Responding to match:', { matchId, contactId, accepted });

    const matchRef = adminDb.collection('event_matches').doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      throw new Error(`Match ${matchId} not found`);
    }

    const match = matchDoc.data();

    // Verify ownership
    if (match.userId !== userId) {
      throw new Error('Access denied');
    }

    // Verify contact is part of this match
    const isContact1 = match.contact1Id === contactId;
    const isContact2 = match.contact2Id === contactId;

    if (!isContact1 && !isContact2) {
      throw new Error('Contact is not part of this match');
    }

    // Check if already responded
    const alreadyResponded = isContact1 ? match.contact1Accepted : match.contact2Accepted;
    if (alreadyResponded !== false && match.status !== MATCH_REQUEST_STATUS.PENDING) {
      throw new Error('Already responded to this match');
    }

    const now = new Date().toISOString();
    const updates = {
      updatedAt: now,
    };

    if (isContact1) {
      updates.contact1Accepted = accepted;
    } else {
      updates.contact2Accepted = accepted;
    }

    // Determine new status
    if (!accepted) {
      updates.status = MATCH_REQUEST_STATUS.DECLINED;
    } else {
      // Check if other also accepted
      const otherAccepted = isContact1 ? match.contact2Accepted : match.contact1Accepted;
      if (otherAccepted) {
        updates.status = MATCH_REQUEST_STATUS.ACCEPTED;
        updates.acceptedAt = now;
      }
      // Otherwise stays pending
    }

    await matchRef.update(updates);

    const updatedMatch = { ...match, ...updates };

    console.log('[MatchingService] Match response recorded:', {
      matchId,
      newStatus: updates.status || match.status,
    });

    // Sync to Neo4j (fire-and-forget)
    neo4jClient.updateMatchStatus(userId, contactId,
      isContact1 ? match.contact2Id : match.contact1Id,
      match.eventId, accepted
    )
      .then(() => console.log(`[Neo4j] Match status updated`))
      .catch(err => console.error('[Neo4j] Match status sync failed:', err.message));

    // Send notifications
    await this.sendMatchResponseNotifications(updatedMatch, contactId, accepted);

    return updatedMatch;
  }

  // =========================================================================
  // NOTIFICATIONS
  // =========================================================================

  /**
   * Send notifications for a new match
   *
   * @param {Object} match - Match data
   * @param {string} contact1Name - Contact 1 name
   * @param {string} contact2Name - Contact 2 name
   */
  static async sendNewMatchNotifications(match, contact1, contact2) {
    console.log('[MatchingService] Sending new match notifications');

    // Send to contact1
    await this.createInAppNotification({
      userId: match.userId,
      recipientContactId: match.contact1Id,
      type: 'match_notification',
      matchId: match.id,
      eventId: match.eventId,
      eventName: match.eventName,
      compatibilityScore: match.compatibilityScore,
      reasons: match.reasons,
    });

    // Send to contact2
    await this.createInAppNotification({
      userId: match.userId,
      recipientContactId: match.contact2Id,
      type: 'match_notification',
      matchId: match.id,
      eventId: match.eventId,
      eventName: match.eventName,
      compatibilityScore: match.compatibilityScore,
      reasons: match.reasons,
    });

    // Send emails if contacts have email
    if (contact1?.email) {
      await this.sendMatchNotificationEmail(contact1, match);
    }
    if (contact2?.email) {
      await this.sendMatchNotificationEmail(contact2, match);
    }
  }

  /**
   * Send notifications when someone responds to a match
   *
   * @param {Object} match - Updated match data
   * @param {string} responderId - Contact who responded
   * @param {boolean} accepted - Whether they accepted
   */
  static async sendMatchResponseNotifications(match, responderId, accepted) {
    const otherContactId = match.contact1Id === responderId ? match.contact2Id : match.contact1Id;

    if (match.status === MATCH_REQUEST_STATUS.ACCEPTED) {
      // Both accepted! Send reveal notifications
      const contact1 = await this.getContactData(match.userId, match.contact1Id);
      const contact2 = await this.getContactData(match.userId, match.contact2Id);

      await this.createInAppNotification({
        userId: match.userId,
        recipientContactId: match.contact1Id,
        type: 'match_accepted',
        matchId: match.id,
        eventId: match.eventId,
        eventName: match.eventName,
        otherContactId: match.contact2Id,
        otherContactName: contact2?.name || 'Your match',
        otherContactEmail: contact2?.email,
      });

      await this.createInAppNotification({
        userId: match.userId,
        recipientContactId: match.contact2Id,
        type: 'match_accepted',
        matchId: match.id,
        eventId: match.eventId,
        eventName: match.eventName,
        otherContactId: match.contact1Id,
        otherContactName: contact1?.name || 'Your match',
        otherContactEmail: contact1?.email,
      });

      // Send emails
      if (contact1?.email && contact2) {
        await this.sendMatchAcceptedEmail(contact1, contact2, match);
      }
      if (contact2?.email && contact1) {
        await this.sendMatchAcceptedEmail(contact2, contact1, match);
      }
    } else if (match.status === MATCH_REQUEST_STATUS.DECLINED) {
      // Notify the other person that match was declined (anonymously)
      await this.createInAppNotification({
        userId: match.userId,
        recipientContactId: otherContactId,
        type: 'match_declined',
        matchId: match.id,
        eventId: match.eventId,
        eventName: match.eventName,
      });
    }
  }

  /**
   * Create in-app notification
   * @private
   */
  static async createInAppNotification({
    userId,
    recipientContactId,
    type,
    matchId,
    eventId,
    eventName,
    compatibilityScore,
    reasons,
    otherContactId,
    otherContactName,
    otherContactEmail,
  }) {
    try {
      const notification = {
        type,
        matchId,
        eventId,
        eventName,
        otherContactId: otherContactId || null,
        otherContactName: otherContactName || 'Hidden',
        otherContactEmail: otherContactEmail || null,
        compatibilityScore: compatibilityScore || null,
        reasons: reasons || [],
        status: 'pending',
        read: false,
        createdAt: new Date().toISOString(),
      };

      // Store in user's notifications subcollection
      // Note: Using recipientContactId as we're notifying based on contact, not user
      await adminDb
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .add(notification);

      console.log('[MatchingService] In-app notification created:', { type, recipientContactId });
    } catch (error) {
      console.error('[MatchingService] Failed to create notification:', error.message);
    }
  }

  /**
   * Send match notification email
   * @private
   */
  static async sendMatchNotificationEmail(contact, match) {
    try {
      const subject = `Potential match at ${match.eventName}`;
      const scorePercent = Math.round(match.compatibilityScore * 100);
      const reasonsList = match.reasons.slice(0, 3).join(', ');

      const htmlContent = `
        <div style="font-family: 'Nunito', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img alt="Weavink Logo" width="155" src="https://firebasestorage.googleapis.com/v0/b/tapit-dev-e0eed.firebasestorage.app/o/Images-Weavink%2Ffull-logo.png?alt=media&token=1ca917c6-cf13-43df-9efa-567b6e6b97b0" style="padding: 1rem">

          <h2 style="color: #674299;">AI Match Found!</h2>

          <p>Hi ${contact.name || 'there'},</p>

          <p>Our AI has identified a potential professional match for you at <strong>${match.eventName}</strong>.</p>

          <div style="background: #f8f9fa; border-left: 4px solid #674299; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Compatibility Score:</strong> ${scorePercent}%</p>
            <p style="margin: 10px 0 0 0;"><strong>Why you match:</strong> ${reasonsList}</p>
          </div>

          <p>Your match's identity is currently hidden for privacy. Once <strong>both of you accept</strong>, you'll be able to see each other's profiles and connect!</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/events/${match.eventId}/matches"
               style="background-color: #674299; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block;">
              View Match
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            This match will expire 48 hours after the event ends.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px;">
            You received this email because you enabled AI matchmaking for events. You can disable this in your settings.
          </p>
        </div>
      `;

      await EmailService.sendEmail(
        contact.name || 'Weavink User',
        contact.email,
        subject,
        htmlContent
      );

      console.log('[MatchingService] Match notification email sent to:', contact.email);
    } catch (error) {
      console.error('[MatchingService] Failed to send match email:', error.message);
    }
  }

  /**
   * Send match accepted email (both parties accepted)
   * @private
   */
  static async sendMatchAcceptedEmail(recipient, matchedContact, match) {
    try {
      const subject = `Match confirmed at ${match.eventName}!`;

      const htmlContent = `
        <div style="font-family: 'Nunito', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img alt="Weavink Logo" width="155" src="https://firebasestorage.googleapis.com/v0/b/tapit-dev-e0eed.firebasestorage.app/o/Images-Weavink%2Ffull-logo.png?alt=media&token=1ca917c6-cf13-43df-9efa-567b6e6b97b0" style="padding: 1rem">

          <h2 style="color: #4caf50;">It's a Match!</h2>

          <p>Hi ${recipient.name || 'there'},</p>

          <p>Great news! Both you and <strong>${matchedContact.name}</strong> have accepted the match at <strong>${match.eventName}</strong>.</p>

          <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Your Match:</strong> ${matchedContact.name}</p>
            ${matchedContact.email ? `<p style="margin: 10px 0 0 0;"><strong>Email:</strong> ${matchedContact.email}</p>` : ''}
            ${matchedContact.company ? `<p style="margin: 10px 0 0 0;"><strong>Company:</strong> ${matchedContact.company}</p>` : ''}
          </div>

          <p>You can now view their full profile and reach out to connect!</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/contacts/${matchedContact.id}"
               style="background-color: #4caf50; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block;">
              View Profile
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">
            We recommend reaching out before or during the event to arrange a meetup!
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px;">
            The Weavink Team
          </p>
        </div>
      `;

      await EmailService.sendEmail(
        recipient.name || 'Weavink User',
        recipient.email,
        subject,
        htmlContent
      );

      console.log('[MatchingService] Match accepted email sent to:', recipient.email);
    } catch (error) {
      console.error('[MatchingService] Failed to send accepted email:', error.message);
    }
  }

  // =========================================================================
  // BATCH OPERATIONS
  // =========================================================================

  /**
   * Run matching for all AI-visible participants at an event
   * Used for initial event setup or manual refresh
   *
   * @param {{ userId: string, eventId: string, session: Object }} params
   * @returns {Promise<{ matchesCreated: number, errors: number }>}
   */
  static async runMatchingForEvent({ userId, eventId, session }) {
    console.log('[MatchingService] Running full matching for event:', eventId);

    const stats = { matchesCreated: 0, errors: 0 };

    try {
      // Get all AI-visible participants
      const allParticipants = await EventService.getEventAttendees({ eventId, session });
      const aiVisible = VisibilityService.getAIVisibleParticipants({ participants: allParticipants });

      console.log('[MatchingService] Processing', aiVisible.length, 'AI-visible participants');

      // Get all existing matches to avoid duplicates
      const existingQuery = adminDb.collection('event_matches')
        .where('userId', '==', userId)
        .where('eventId', '==', eventId);
      const existingSnapshot = await existingQuery.get();
      const existingPairs = new Set(
        existingSnapshot.docs.map(doc => {
          const m = doc.data();
          return [m.contact1Id, m.contact2Id].sort().join('::');
        })
      );

      // Compare all pairs
      for (let i = 0; i < aiVisible.length; i++) {
        for (let j = i + 1; j < aiVisible.length; j++) {
          const p1 = aiVisible[i];
          const p2 = aiVisible[j];

          // Check if already matched
          const pairKey = [p1.contactId, p2.contactId].sort().join('::');
          if (existingPairs.has(pairKey)) continue;

          try {
            // Get contact data
            const contact1 = await this.getContactData(userId, p1.contactId);
            const contact2 = await this.getContactData(userId, p2.contactId);

            if (!contact1 || !contact2) continue;

            // Calculate score
            const { score, reasons } = await this.calculateCompatibilityScore(
              contact1, contact2, p1, p2, userId
            );

            // Create match if above threshold
            if (score >= EVENT_MATCH_THRESHOLDS.MIN_MATCH_SCORE) {
              const match = await this.createMatch({
                userId,
                eventId,
                contact1Id: p1.contactId,
                contact2Id: p2.contactId,
                score,
                reasons,
                session,
              });

              // Send notifications
              await this.sendNewMatchNotifications(match, contact1, contact2);

              stats.matchesCreated++;
              existingPairs.add(pairKey);
            }
          } catch (error) {
            console.error('[MatchingService] Error processing pair:', error.message);
            stats.errors++;
          }
        }
      }

      console.log('[MatchingService] Event matching complete:', stats);
      return stats;
    } catch (error) {
      console.error('[MatchingService] Event matching failed:', error);
      throw error;
    }
  }

  /**
   * Expire old matches that have passed their expiration date
   *
   * @param {{ userId: string }} params
   * @returns {Promise<number>} Number of matches expired
   */
  static async expireOldMatches({ userId }) {
    console.log('[MatchingService] Expiring old matches for user:', userId);

    const now = new Date().toISOString();

    const query = adminDb.collection('event_matches')
      .where('userId', '==', userId)
      .where('status', '==', MATCH_REQUEST_STATUS.PENDING)
      .where('expiresAt', '<', now);

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log('[MatchingService] No matches to expire');
      return 0;
    }

    const batch = adminDb.batch();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: MATCH_REQUEST_STATUS.EXPIRED,
        updatedAt: now,
      });
    });

    await batch.commit();

    console.log('[MatchingService] Expired matches:', snapshot.size);
    return snapshot.size;
  }
}

export default MatchingService;

// Export INTENT_COMPATIBILITY_MATRIX for tests
export { INTENT_COMPATIBILITY_MATRIX };
