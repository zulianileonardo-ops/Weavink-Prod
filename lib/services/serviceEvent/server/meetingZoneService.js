// lib/services/serviceEvent/server/meetingZoneService.js
/**
 * Meeting Zone Service - AI-powered micro-clusters for event networking
 *
 * Creates clusters of 3-5 compatible attendees using greedy compatibility clustering.
 * Uses existing 5-signal compatibility scoring from MatchingService.
 *
 * Algorithm: Greedy Compatibility Clustering
 * 1. Build NxN compatibility matrix using MatchingService scores
 * 2. Start with highest-scoring pairs
 * 3. Greedily add members that maximize group cohesion
 * 4. Stop when cluster reaches 5 members or cohesion drops below threshold
 * 5. Repeat until all participants assigned or can't form valid clusters
 *
 * @see documentation/features/EVENT_SOCIAL_INTELLIGENCE.md
 */

import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { EventService } from './eventService.js';
import { VisibilityService } from './visibilityService.js';
import { MatchingService } from './matchingService.js';
import { GroupNamingService } from '../../serviceContact/server/neo4j/GroupNamingService.js';
import {
  MEETING_ZONE_CONFIG,
  hasEventFeature,
  EVENT_FEATURES,
} from '../client/constants/eventConstants.js';

/**
 * Generate unique zone ID with timestamp
 * @returns {string} Unique zone ID
 */
function generateZoneId() {
  return `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * MeetingZoneService - AI-powered micro-cluster generation
 */
export class MeetingZoneService {
  // =========================================================================
  // ZONE GENERATION
  // =========================================================================

  /**
   * Generate meeting zones for an event
   *
   * @param {{ userId: string, eventId: string, session: Object, force?: boolean }} params
   * @returns {Promise<Object>} Generated zones response
   */
  static async generateZonesForEvent({ userId, eventId, session, force = false }) {
    console.log('[MeetingZoneService] Generating zones for event:', eventId);

    // Check subscription tier for MEETING_ZONES
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.MEETING_ZONES)) {
      throw new Error('Meeting zones feature not available in your subscription plan');
    }

    // Check if we can use cached zones
    if (!force) {
      const existingZones = await this.getExistingZones(userId, eventId);
      if (existingZones.length > 0 && !this.shouldRegenerateZones(existingZones)) {
        console.log('[MeetingZoneService] Using cached zones');
        return {
          zones: existingZones,
          total: existingZones.length,
          eventId,
          generatedAt: existingZones[0]?.createdAt,
          cached: true,
        };
      }
    }

    // Get all AI-visible participants (excludes PRIVATE)
    const allParticipants = await EventService.getEventAttendees({ eventId, session });
    const aiVisibleParticipants = VisibilityService.getAIVisibleParticipants({
      participants: allParticipants,
    });

    console.log('[MeetingZoneService] AI-visible participants:', aiVisibleParticipants.length);

    // Need at least MIN_CLUSTER_SIZE participants
    if (aiVisibleParticipants.length < MEETING_ZONE_CONFIG.MIN_CLUSTER_SIZE) {
      console.log('[MeetingZoneService] Insufficient participants for zones');
      return {
        zones: [],
        total: 0,
        eventId,
        generatedAt: new Date().toISOString(),
        cached: false,
        message: `Need at least ${MEETING_ZONE_CONFIG.MIN_CLUSTER_SIZE} visible participants to generate meeting zones`,
      };
    }

    // Get contact data for all participants
    const participantData = await this.enrichParticipantsWithContactData(
      aiVisibleParticipants,
      userId
    );

    // Build compatibility matrix
    const matrix = await this.buildCompatibilityMatrix(participantData, userId);

    // Run greedy clustering algorithm
    const clusters = this.clusterParticipants(participantData, matrix);

    // Split any clusters that are too large
    const validClusters = this.splitLargeClusters(clusters, matrix);

    // Generate AI names for zones
    const namedZones = await this.generateZoneNames(validClusters, participantData);

    // Save zones to Firestore
    const savedZones = await this.saveZones(userId, eventId, namedZones);

    console.log('[MeetingZoneService] Generated zones:', savedZones.length);

    return {
      zones: savedZones,
      total: savedZones.length,
      eventId,
      generatedAt: new Date().toISOString(),
      cached: false,
    };
  }

  /**
   * Get zones for an event (read-only, from cache)
   *
   * @param {{ userId: string, eventId: string }} params
   * @returns {Promise<Object>} Zones response
   */
  static async getZonesForEvent({ userId, eventId }) {
    console.log('[MeetingZoneService] Getting zones for event:', eventId);

    const zones = await this.getExistingZones(userId, eventId);

    return {
      zones,
      total: zones.length,
      eventId,
      generatedAt: zones.length > 0 ? zones[0]?.createdAt : null,
    };
  }

  // =========================================================================
  // COMPATIBILITY MATRIX
  // =========================================================================

  /**
   * Build NxN compatibility matrix for all participants
   *
   * @param {Object[]} participants - Participant data with contacts
   * @param {string} userId - User ID for Pinecone lookup
   * @returns {Promise<Map>} Map of contactId -> Map of contactId -> score
   */
  static async buildCompatibilityMatrix(participants, userId) {
    console.log('[MeetingZoneService] Building compatibility matrix for', participants.length, 'participants');

    const matrix = new Map();

    // Initialize matrix with empty maps
    for (const p of participants) {
      matrix.set(p.contactId, new Map());
    }

    // Calculate pairwise compatibility scores
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const p1 = participants[i];
        const p2 = participants[j];

        try {
          const { score } = await MatchingService.calculateCompatibilityScore(
            p1.contact,
            p2.contact,
            p1.attendance,
            p2.attendance,
            userId
          );

          // Symmetric matrix
          matrix.get(p1.contactId).set(p2.contactId, score);
          matrix.get(p2.contactId).set(p1.contactId, score);
        } catch (error) {
          console.error('[MeetingZoneService] Score calculation error:', error.message);
          // Default to 0 on error
          matrix.get(p1.contactId).set(p2.contactId, 0);
          matrix.get(p2.contactId).set(p1.contactId, 0);
        }
      }
    }

    return matrix;
  }

  // =========================================================================
  // CLUSTERING ALGORITHM
  // =========================================================================

  /**
   * Greedy compatibility clustering algorithm
   *
   * @param {Object[]} participants - All participants
   * @param {Map} matrix - Compatibility matrix
   * @returns {Object[]} Array of clusters
   */
  static clusterParticipants(participants, matrix) {
    console.log('[MeetingZoneService] Running greedy clustering');

    const { MIN_CLUSTER_SIZE, MAX_CLUSTER_SIZE, MAX_ZONES_PER_EVENT, MIN_ZONE_COMPATIBILITY } = MEETING_ZONE_CONFIG;

    const clusters = [];
    const assigned = new Set();

    // Sort all pairs by compatibility score (descending)
    const pairs = [];
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const p1 = participants[i].contactId;
        const p2 = participants[j].contactId;
        const score = matrix.get(p1)?.get(p2) || 0;
        pairs.push({ p1, p2, score });
      }
    }
    pairs.sort((a, b) => b.score - a.score);

    // Build clusters starting from highest-scoring pairs
    for (const pair of pairs) {
      // Stop if we have max zones
      if (clusters.length >= MAX_ZONES_PER_EVENT) break;

      // Skip if either already assigned
      if (assigned.has(pair.p1) || assigned.has(pair.p2)) continue;

      // Skip if pair score is below threshold
      if (pair.score < MIN_ZONE_COMPATIBILITY) continue;

      // Start a new cluster
      const cluster = {
        members: [pair.p1, pair.p2],
        totalScore: pair.score,
        pairCount: 1,
      };

      assigned.add(pair.p1);
      assigned.add(pair.p2);

      // Try to grow the cluster
      this.growCluster(cluster, participants, matrix, assigned, MAX_CLUSTER_SIZE, MIN_ZONE_COMPATIBILITY);

      // Only keep clusters that meet minimum size
      if (cluster.members.length >= MIN_CLUSTER_SIZE) {
        cluster.cohesionScore = cluster.totalScore / cluster.pairCount;
        clusters.push(cluster);
      } else {
        // Release members back to pool
        cluster.members.forEach(m => assigned.delete(m));
      }
    }

    // Try to form clusters from remaining unassigned participants
    const remaining = participants.filter(p => !assigned.has(p.contactId));
    if (remaining.length >= MIN_CLUSTER_SIZE && clusters.length < MAX_ZONES_PER_EVENT) {
      const remainingCluster = this.formClusterFromRemaining(remaining, matrix, MIN_ZONE_COMPATIBILITY);
      if (remainingCluster && remainingCluster.members.length >= MIN_CLUSTER_SIZE) {
        clusters.push(remainingCluster);
      }
    }

    console.log('[MeetingZoneService] Formed', clusters.length, 'clusters');
    return clusters;
  }

  /**
   * Grow a cluster by adding compatible members
   *
   * @param {Object} cluster - Current cluster
   * @param {Object[]} participants - All participants
   * @param {Map} matrix - Compatibility matrix
   * @param {Set} assigned - Already assigned contact IDs
   * @param {number} maxSize - Maximum cluster size
   * @param {number} minCompatibility - Minimum compatibility threshold
   */
  static growCluster(cluster, participants, matrix, assigned, maxSize, minCompatibility) {
    while (cluster.members.length < maxSize) {
      let bestCandidate = null;
      let bestAvgScore = 0;

      // Find best unassigned candidate
      for (const p of participants) {
        if (assigned.has(p.contactId)) continue;

        // Calculate average compatibility with current members
        let totalScore = 0;
        let validPairs = 0;

        for (const memberId of cluster.members) {
          const score = matrix.get(p.contactId)?.get(memberId) || 0;
          totalScore += score;
          validPairs++;
        }

        const avgScore = validPairs > 0 ? totalScore / validPairs : 0;

        if (avgScore > bestAvgScore && avgScore >= minCompatibility) {
          bestCandidate = p.contactId;
          bestAvgScore = avgScore;
        }
      }

      // No suitable candidate found
      if (!bestCandidate) break;

      // Add candidate to cluster
      cluster.members.push(bestCandidate);
      assigned.add(bestCandidate);

      // Update cluster scores
      for (const memberId of cluster.members) {
        if (memberId === bestCandidate) continue;
        const score = matrix.get(bestCandidate)?.get(memberId) || 0;
        cluster.totalScore += score;
        cluster.pairCount++;
      }
    }
  }

  /**
   * Form a cluster from remaining unassigned participants
   *
   * @param {Object[]} remaining - Unassigned participants
   * @param {Map} matrix - Compatibility matrix
   * @param {number} minCompatibility - Minimum compatibility threshold
   * @returns {Object|null} Cluster or null
   */
  static formClusterFromRemaining(remaining, matrix, minCompatibility) {
    if (remaining.length < MEETING_ZONE_CONFIG.MIN_CLUSTER_SIZE) {
      return null;
    }

    // Just group remaining together (fallback)
    const members = remaining.slice(0, MEETING_ZONE_CONFIG.MAX_CLUSTER_SIZE).map(p => p.contactId);

    // Calculate cohesion score
    let totalScore = 0;
    let pairCount = 0;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const score = matrix.get(members[i])?.get(members[j]) || 0;
        totalScore += score;
        pairCount++;
      }
    }

    const cohesionScore = pairCount > 0 ? totalScore / pairCount : 0;

    // Only return if above threshold
    if (cohesionScore < minCompatibility * 0.8) { // Slightly lower threshold for remaining
      return null;
    }

    return {
      members,
      totalScore,
      pairCount,
      cohesionScore,
    };
  }

  /**
   * Split clusters that are too large into balanced sub-clusters
   *
   * @param {Object[]} clusters - Array of clusters
   * @param {Map} matrix - Compatibility matrix
   * @returns {Object[]} Valid-sized clusters
   */
  static splitLargeClusters(clusters, matrix) {
    const { MAX_CLUSTER_SIZE, MIN_CLUSTER_SIZE } = MEETING_ZONE_CONFIG;
    const result = [];

    for (const cluster of clusters) {
      if (cluster.members.length <= MAX_CLUSTER_SIZE) {
        result.push(cluster);
        continue;
      }

      // Split large cluster into sub-clusters
      const members = [...cluster.members];
      while (members.length >= MIN_CLUSTER_SIZE) {
        const subCluster = members.splice(0, MAX_CLUSTER_SIZE);

        // Calculate cohesion for sub-cluster
        let totalScore = 0;
        let pairCount = 0;

        for (let i = 0; i < subCluster.length; i++) {
          for (let j = i + 1; j < subCluster.length; j++) {
            const score = matrix.get(subCluster[i])?.get(subCluster[j]) || 0;
            totalScore += score;
            pairCount++;
          }
        }

        result.push({
          members: subCluster,
          totalScore,
          pairCount,
          cohesionScore: pairCount > 0 ? totalScore / pairCount : 0,
        });
      }
    }

    return result;
  }

  // =========================================================================
  // AI NAMING
  // =========================================================================

  /**
   * Generate AI names and descriptions for zones
   *
   * @param {Object[]} clusters - Clusters to name
   * @param {Object[]} participants - Participant data
   * @returns {Promise<Object[]>} Zones with names
   */
  static async generateZoneNames(clusters, participants) {
    console.log('[MeetingZoneService] Generating zone names');

    const participantMap = new Map(participants.map(p => [p.contactId, p]));

    const zonesWithNames = await Promise.all(clusters.map(async (cluster, index) => {
      const members = cluster.members.map(id => participantMap.get(id)).filter(Boolean);

      // Build zone characteristics for naming
      const characteristics = this.buildZoneCharacteristics(members);

      // Use GroupNamingService for AI naming
      const suggestion = {
        type: 'meeting_zone',
        members: members.map(m => ({
          id: m.contactId,
          name: m.contact?.name || 'Unknown',
          company: m.contact?.company,
        })),
        metadata: {
          intents: characteristics.commonIntents,
          industries: characteristics.commonIndustries,
          lookingFor: characteristics.commonLookingFor,
        },
        reason: `Event meeting zone with ${characteristics.commonIntents.join(', ')} intents`,
      };

      try {
        const name = await GroupNamingService.generateGroupName(suggestion);
        return {
          ...cluster,
          name,
          description: this.generateZoneDescription(characteristics),
          ...characteristics,
        };
      } catch (error) {
        console.error('[MeetingZoneService] Naming error:', error.message);
        return {
          ...cluster,
          name: `Meeting Zone ${index + 1}`,
          description: `A group of ${cluster.members.length} compatible attendees`,
          ...characteristics,
        };
      }
    }));

    return zonesWithNames;
  }

  /**
   * Build characteristics for a zone from its members
   *
   * @param {Object[]} members - Zone members with full data
   * @returns {Object} Zone characteristics
   */
  static buildZoneCharacteristics(members) {
    const intents = [];
    const industries = [];
    const lookingFor = [];
    const offering = [];

    for (const member of members) {
      if (member.attendance?.intent) {
        intents.push(member.attendance.intent);
      }
      if (member.contact?.industry) {
        industries.push(member.contact.industry);
      }
      if (member.contact?.industries) {
        industries.push(...member.contact.industries);
      }
      if (member.attendance?.lookingFor) {
        lookingFor.push(...member.attendance.lookingFor);
      }
      if (member.attendance?.offering) {
        offering.push(...member.attendance.offering);
      }
    }

    // Find common values (appearing in majority)
    const threshold = Math.ceil(members.length / 2);

    return {
      commonIntents: this.findCommonValues(intents, threshold),
      commonIndustries: this.findCommonValues(industries, threshold),
      commonLookingFor: this.findCommonValues(lookingFor, threshold),
      commonOffering: this.findCommonValues(offering, threshold),
    };
  }

  /**
   * Find values that appear at least threshold times
   *
   * @param {string[]} values - Array of values
   * @param {number} threshold - Minimum occurrences
   * @returns {string[]} Common values
   */
  static findCommonValues(values, threshold) {
    const counts = {};
    for (const v of values) {
      counts[v] = (counts[v] || 0) + 1;
    }

    return Object.entries(counts)
      .filter(([_, count]) => count >= threshold)
      .map(([value]) => value)
      .slice(0, 3); // Limit to top 3
  }

  /**
   * Generate a human-readable description for a zone
   *
   * @param {Object} characteristics - Zone characteristics
   * @returns {string} Zone description
   */
  static generateZoneDescription(characteristics) {
    const parts = [];

    if (characteristics.commonIntents.length > 0) {
      parts.push(`focused on ${characteristics.commonIntents.join(' & ')}`);
    }

    if (characteristics.commonIndustries.length > 0) {
      parts.push(`in ${characteristics.commonIndustries.join(', ')}`);
    }

    if (parts.length === 0) {
      return 'A curated group of compatible attendees';
    }

    return `A group ${parts.join(' ')}`;
  }

  // =========================================================================
  // STORAGE
  // =========================================================================

  /**
   * Save zones to Firestore
   *
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   * @param {Object[]} zones - Zones to save
   * @returns {Promise<Object[]>} Saved zones
   */
  static async saveZones(userId, eventId, zones) {
    console.log('[MeetingZoneService] Saving', zones.length, 'zones');

    // Delete existing zones first
    const existingZonesRef = adminDb
      .collection('events')
      .doc(eventId)
      .collection('meeting_zones');

    const existingSnapshot = await existingZonesRef.get();
    const deleteBatch = adminDb.batch();
    existingSnapshot.docs.forEach(doc => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();

    // Save new zones
    const savedZones = [];
    const now = new Date().toISOString();
    const saveBatch = adminDb.batch();

    for (const zone of zones) {
      const zoneId = generateZoneId();
      const zoneData = {
        id: zoneId,
        eventId,
        userId,
        name: zone.name,
        description: zone.description || '',
        memberContactIds: zone.members,
        memberCount: zone.members.length,
        commonIntents: zone.commonIntents || [],
        commonIndustries: zone.commonIndustries || [],
        cohesionScore: Math.round((zone.cohesionScore || 0) * 100) / 100,
        createdAt: now,
        generatedBy: 'system',
      };

      const zoneRef = existingZonesRef.doc(zoneId);
      saveBatch.set(zoneRef, zoneData);
      savedZones.push(zoneData);
    }

    await saveBatch.commit();

    console.log('[MeetingZoneService] Zones saved:', savedZones.length);
    return savedZones;
  }

  /**
   * Get existing zones from Firestore
   *
   * @param {string} userId - User ID
   * @param {string} eventId - Event ID
   * @returns {Promise<Object[]>} Existing zones
   */
  static async getExistingZones(userId, eventId) {
    const zonesRef = adminDb
      .collection('events')
      .doc(eventId)
      .collection('meeting_zones')
      .where('userId', '==', userId)
      .orderBy('cohesionScore', 'desc');

    const snapshot = await zonesRef.get();
    return snapshot.docs.map(doc => doc.data());
  }

  /**
   * Check if zones should be regenerated based on age
   *
   * @param {Object[]} zones - Existing zones
   * @returns {boolean} True if zones should be regenerated
   */
  static shouldRegenerateZones(zones) {
    if (zones.length === 0) return true;

    const oldestZone = zones[zones.length - 1];
    const createdAt = new Date(oldestZone.createdAt);
    const now = new Date();
    const ageMinutes = (now - createdAt) / (1000 * 60);

    return ageMinutes >= MEETING_ZONE_CONFIG.REGENERATION_INTERVAL_MINUTES;
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  /**
   * Enrich participant attendance records with contact data
   *
   * @param {Object[]} participants - Attendance records
   * @param {string} userId - User ID
   * @returns {Promise<Object[]>} Enriched participants
   */
  static async enrichParticipantsWithContactData(participants, userId) {
    // Get contacts document
    const contactsDoc = await adminDb.collection('Contacts').doc(userId).get();
    const contacts = contactsDoc.exists ? (contactsDoc.data()?.contacts || []) : [];
    const contactMap = new Map(contacts.map(c => [c.id, c]));

    // Enrich each participant
    return participants.map(attendance => ({
      contactId: attendance.contactId,
      attendance,
      contact: contactMap.get(attendance.contactId) || {
        id: attendance.contactId,
        name: 'Unknown',
      },
    }));
  }

  /**
   * Get zone details with member information
   *
   * @param {{ userId: string, eventId: string, zoneId: string }} params
   * @returns {Promise<Object|null>} Zone with member details
   */
  static async getZoneWithMembers({ userId, eventId, zoneId }) {
    const zoneRef = adminDb
      .collection('events')
      .doc(eventId)
      .collection('meeting_zones')
      .doc(zoneId);

    const zoneDoc = await zoneRef.get();
    if (!zoneDoc.exists) return null;

    const zone = zoneDoc.data();

    // Verify ownership
    if (zone.userId !== userId) {
      throw new Error('Access denied');
    }

    // Get contact data for members
    const contactsDoc = await adminDb.collection('Contacts').doc(userId).get();
    const contacts = contactsDoc.exists ? (contactsDoc.data()?.contacts || []) : [];
    const contactMap = new Map(contacts.map(c => [c.id, c]));

    const members = zone.memberContactIds.map(id => {
      const contact = contactMap.get(id) || { id, name: 'Unknown' };
      return {
        contactId: id,
        name: contact.name,
        company: contact.company,
        jobTitle: contact.jobTitle,
        avatarUrl: contact.avatarUrl,
      };
    });

    return {
      ...zone,
      members,
    };
  }

  /**
   * Delete all zones for an event
   *
   * @param {{ userId: string, eventId: string }} params
   * @returns {Promise<{ deleted: number }>}
   */
  static async deleteZonesForEvent({ userId, eventId }) {
    console.log('[MeetingZoneService] Deleting zones for event:', eventId);

    const zonesRef = adminDb
      .collection('events')
      .doc(eventId)
      .collection('meeting_zones')
      .where('userId', '==', userId);

    const snapshot = await zonesRef.get();
    const batch = adminDb.batch();

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log('[MeetingZoneService] Deleted zones:', snapshot.size);
    return { deleted: snapshot.size };
  }
}

export default MeetingZoneService;
