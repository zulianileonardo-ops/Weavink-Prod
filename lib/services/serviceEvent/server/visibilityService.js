// lib/services/serviceEvent/server/visibilityService.js
/**
 * Visibility Service - Event participant visibility rules
 *
 * Implements the 4-tier visibility system:
 * - PUBLIC: Visible to all event attendees
 * - FRIENDS: Visible only to existing Weavink contacts
 * - PRIVATE: Not visible to anyone (personal organization only)
 * - GHOST: Invisible to humans, but AI can see for intelligent matching
 *
 * @see documentation/features/EVENT_SOCIAL_INTELLIGENCE.md
 */

import { adminDb } from '../../../firebaseAdmin.js';
import { EVENT_VISIBILITY_MODES } from '../client/constants/eventConstants.js';

/**
 * VisibilityService - Event participant visibility rules
 */
export class VisibilityService {
  /**
   * Check if a viewer can see a participant at an event
   *
   * Visibility Rules:
   * - PUBLIC: Everyone at the event can see
   * - FRIENDS: Only viewer's existing contacts can see
   * - PRIVATE: Nobody can see (except the participant themselves)
   * - GHOST: Only AI can see (for matching purposes)
   *
   * @param {{ viewerId: string, participantId: string, participantVisibility: string, viewerContactIds?: string[], isAIContext?: boolean }} params
   * @returns {boolean} True if viewer can see participant
   */
  static canUserSeeParticipant({
    viewerId,
    participantId,
    participantVisibility,
    viewerContactIds = [],
    isAIContext = false,
  }) {
    // Users can always see themselves
    if (viewerId === participantId) {
      return true;
    }

    switch (participantVisibility) {
      case EVENT_VISIBILITY_MODES.PUBLIC:
        // Public visibility - everyone can see
        return true;

      case EVENT_VISIBILITY_MODES.FRIENDS:
        // Friends only - check if participant is in viewer's contacts
        return viewerContactIds.includes(participantId);

      case EVENT_VISIBILITY_MODES.PRIVATE:
        // Private - nobody can see except themselves
        return false;

      case EVENT_VISIBILITY_MODES.GHOST:
        // Ghost mode - only AI context can see
        return isAIContext;

      default:
        // Unknown visibility mode - default to private for safety
        console.warn(`[VisibilityService] Unknown visibility mode: ${participantVisibility}`);
        return false;
    }
  }

  /**
   * Filter a list of participants based on visibility rules
   *
   * @param {{ participants: Object[], viewerId: string, viewerContactIds?: string[], isAIContext?: boolean, includeHidden?: boolean }} params
   * @returns {Object[]} Filtered list of visible participants
   */
  static filterParticipantsByVisibility({
    participants,
    viewerId,
    viewerContactIds = [],
    isAIContext = false,
    includeHidden = false,
  }) {
    return participants.filter(participant => {
      const canSee = this.canUserSeeParticipant({
        viewerId,
        participantId: participant.contactId || participant.id,
        participantVisibility: participant.visibility || participant.participation?.visibility,
        viewerContactIds,
        isAIContext,
      });

      // If includeHidden is true, mark hidden participants but include them
      if (includeHidden && !canSee) {
        participant._hidden = true;
        return true;
      }

      return canSee;
    });
  }

  /**
   * Get visibility counts for event participants
   * Useful for UI display (e.g., "5 public, 3 friends-only, 2 in ghost mode")
   *
   * @param {{ participants: Object[] }} params
   * @returns {Object} Counts by visibility mode
   */
  static getVisibilityCounts({ participants }) {
    const counts = {
      [EVENT_VISIBILITY_MODES.PUBLIC]: 0,
      [EVENT_VISIBILITY_MODES.FRIENDS]: 0,
      [EVENT_VISIBILITY_MODES.PRIVATE]: 0,
      [EVENT_VISIBILITY_MODES.GHOST]: 0,
      total: 0,
    };

    for (const participant of participants) {
      const visibility = participant.visibility || participant.participation?.visibility;
      if (visibility && counts.hasOwnProperty(visibility)) {
        counts[visibility]++;
      }
      counts.total++;
    }

    return counts;
  }

  /**
   * Get visible count for a specific viewer
   * Takes into account visibility rules
   *
   * @param {{ participants: Object[], viewerId: string, viewerContactIds?: string[] }} params
   * @returns {Object} Visible and hidden counts
   */
  static getVisibleCountForViewer({
    participants,
    viewerId,
    viewerContactIds = [],
  }) {
    let visibleCount = 0;
    let hiddenCount = 0;
    let ghostCount = 0;

    for (const participant of participants) {
      const visibility = participant.visibility || participant.participation?.visibility;

      if (visibility === EVENT_VISIBILITY_MODES.GHOST) {
        ghostCount++;
        continue;
      }

      const canSee = this.canUserSeeParticipant({
        viewerId,
        participantId: participant.contactId || participant.id,
        participantVisibility: visibility,
        viewerContactIds,
        isAIContext: false,
      });

      if (canSee) {
        visibleCount++;
      } else {
        hiddenCount++;
      }
    }

    return {
      visible: visibleCount,
      hidden: hiddenCount,
      ghost: ghostCount,
      total: participants.length,
      // For UI messaging
      hasHiddenParticipants: hiddenCount > 0 || ghostCount > 0,
    };
  }

  /**
   * Get participants visible to AI for matching
   * Returns both public and ghost mode participants
   *
   * @param {{ participants: Object[] }} params
   * @returns {Object[]} Participants available for AI matching
   */
  static getAIVisibleParticipants({ participants }) {
    return participants.filter(participant => {
      const visibility = participant.visibility || participant.participation?.visibility;
      // AI can see public, friends, and ghost mode participants
      // Private participants are excluded even from AI
      return visibility !== EVENT_VISIBILITY_MODES.PRIVATE;
    });
  }

  /**
   * Get only ghost mode participants
   * These are only visible to AI for anonymous matching
   *
   * @param {{ participants: Object[] }} params
   * @returns {Object[]} Ghost mode participants only
   */
  static getGhostModeParticipants({ participants }) {
    return participants.filter(participant => {
      const visibility = participant.visibility || participant.participation?.visibility;
      return visibility === EVENT_VISIBILITY_MODES.GHOST;
    });
  }

  /**
   * Load viewer's contact IDs for visibility checks
   * Helper method to get the list of contacts for a user
   *
   * @param {{ userId: string }} params
   * @returns {Promise<string[]>} Array of contact IDs
   */
  static async loadViewerContactIds({ userId }) {
    try {
      const contactsDoc = await adminDb.collection('Contacts').doc(userId).get();

      if (!contactsDoc.exists) {
        return [];
      }

      const contacts = contactsDoc.data()?.contacts || [];
      return contacts.map(contact => contact.id);
    } catch (error) {
      console.error('[VisibilityService] Error loading contacts:', error.message);
      return [];
    }
  }

  /**
   * Apply visibility rules and return enriched participants list
   * Used for API responses that need full visibility context
   *
   * @param {{ participants: Object[], viewerId: string, session: Object }} params
   * @returns {Promise<Object>} Enriched response with visibility info
   */
  static async applyVisibilityRules({ participants, viewerId, session }) {
    // Load viewer's contacts for friends-only checks
    const viewerContactIds = await this.loadViewerContactIds({ userId: session.userId });

    // Filter participants based on visibility
    const visibleParticipants = this.filterParticipantsByVisibility({
      participants,
      viewerId,
      viewerContactIds,
      isAIContext: false,
    });

    // Get counts for UI
    const counts = this.getVisibleCountForViewer({
      participants,
      viewerId,
      viewerContactIds,
    });

    return {
      participants: visibleParticipants,
      counts,
      viewerContactCount: viewerContactIds.length,
    };
  }

  /**
   * Validate visibility mode value
   *
   * @param {string} visibility - Visibility mode to validate
   * @returns {{ isValid: boolean, error?: string }}
   */
  static validateVisibilityMode(visibility) {
    const validModes = Object.values(EVENT_VISIBILITY_MODES);

    if (!visibility) {
      return { isValid: false, error: 'Visibility mode is required' };
    }

    if (!validModes.includes(visibility)) {
      return {
        isValid: false,
        error: `Invalid visibility mode. Must be one of: ${validModes.join(', ')}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Get default visibility mode
   * Defaults to FRIENDS for privacy-first approach
   *
   * @returns {string} Default visibility mode
   */
  static getDefaultVisibility() {
    return EVENT_VISIBILITY_MODES.FRIENDS;
  }

  /**
   * Get visibility options for UI display
   * Returns array suitable for dropdown/radio selection
   *
   * @param {{ includeGhost?: boolean }} params
   * @returns {Object[]} Visibility options
   */
  static getVisibilityOptions({ includeGhost = true } = {}) {
    const options = [
      {
        value: EVENT_VISIBILITY_MODES.PUBLIC,
        label: 'Public',
        description: 'Everyone at the event can see your profile',
        icon: 'Globe',
      },
      {
        value: EVENT_VISIBILITY_MODES.FRIENDS,
        label: 'Friends Only',
        description: 'Only your existing Weavink contacts can see you',
        icon: 'Users',
      },
      {
        value: EVENT_VISIBILITY_MODES.PRIVATE,
        label: 'Private',
        description: 'Nobody can see you - for personal organization only',
        icon: 'EyeOff',
      },
    ];

    if (includeGhost) {
      options.push({
        value: EVENT_VISIBILITY_MODES.GHOST,
        label: 'Ghost Mode',
        description: 'Invisible to people, but AI can find compatible matches',
        icon: 'Ghost',
      });
    }

    return options;
  }
}

export default VisibilityService;
