// lib/services/serviceEvent/client/constants/eventConstants.js
/**
 * @file Event Social Intelligence Constants
 * @description Constants for the event-based networking intelligence system
 *
 * Features:
 * - Contextual & Predictive Event Mapping
 * - Granular Visibility System (4 modes including Ghost Mode)
 * - Event Semantic Search Engine
 * - Dynamic Clustering & Meeting Zones
 *
 * @see /documentation/features/EVENT_SOCIAL_INTELLIGENCE_SPEC.md
 */

// Use relative import for Node.js compatibility in tests
// Next.js also supports relative imports
import { SUBSCRIPTION_LEVELS } from '../../../core/constants.js';

// ============================================================
// VISIBILITY MODES
// ============================================================

/**
 * Event visibility modes for participants
 * Controls who can see a user at an event
 *
 * @type {Object}
 */
export const EVENT_VISIBILITY_MODES = {
  /** Visible to all event participants */
  PUBLIC: 'public',
  /** Only visible to existing Weavink contacts */
  FRIENDS: 'friends',
  /** Completely invisible - just for personal organization */
  PRIVATE: 'private',
  /** AI-only visibility - invisible to humans, AI can detect synergies */
  GHOST: 'ghost'
};

/**
 * Human-readable descriptions for visibility modes
 * Used in UI explanations
 *
 * @type {Object}
 */
export const EVENT_VISIBILITY_DESCRIPTIONS = {
  [EVENT_VISIBILITY_MODES.PUBLIC]: {
    title: 'Public',
    description: 'Everyone at the event can see your profile',
    icon: 'Globe',
    recommendation: 'Best for open networking'
  },
  [EVENT_VISIBILITY_MODES.FRIENDS]: {
    title: 'Friends Only',
    description: 'Only your existing Weavink contacts can see you',
    icon: 'Users',
    recommendation: 'Quality over quantity'
  },
  [EVENT_VISIBILITY_MODES.PRIVATE]: {
    title: 'Private',
    description: 'Nobody can see you - use the app for organization only',
    icon: 'EyeOff',
    recommendation: 'When you just want to track events'
  },
  [EVENT_VISIBILITY_MODES.GHOST]: {
    title: 'Ghost Mode',
    description: 'Invisible to people, but AI can find compatible matches for you',
    icon: 'Ghost',
    recommendation: 'Privacy + quality introductions'
  }
};

// ============================================================
// PARTICIPATION INTENTS
// ============================================================

/**
 * Why is the user attending this event?
 * Used for AI matching and filtering
 *
 * @type {Object}
 */
export const PARTICIPATION_INTENTS = {
  RECRUITING: 'recruiting',
  NETWORKING: 'networking',
  MARKET_RESEARCH: 'market_research',
  LEARNING: 'learning',
  PARTNERSHIP: 'partnership',
  INVESTMENT: 'investment',
  SALES: 'sales',
  MENTORSHIP: 'mentorship',
  SPEAKING: 'speaking',
  EXHIBITING: 'exhibiting'
};

/**
 * Human-readable labels and icons for participation intents
 *
 * @type {Object}
 */
export const PARTICIPATION_INTENT_LABELS = {
  [PARTICIPATION_INTENTS.RECRUITING]: {
    label: 'Recruiting',
    icon: 'UserPlus',
    color: 'blue'
  },
  [PARTICIPATION_INTENTS.NETWORKING]: {
    label: 'Networking',
    icon: 'Network',
    color: 'green'
  },
  [PARTICIPATION_INTENTS.MARKET_RESEARCH]: {
    label: 'Market Research',
    icon: 'Search',
    color: 'purple'
  },
  [PARTICIPATION_INTENTS.LEARNING]: {
    label: 'Learning',
    icon: 'GraduationCap',
    color: 'orange'
  },
  [PARTICIPATION_INTENTS.PARTNERSHIP]: {
    label: 'Finding Partners',
    icon: 'Handshake',
    color: 'teal'
  },
  [PARTICIPATION_INTENTS.INVESTMENT]: {
    label: 'Investing',
    icon: 'DollarSign',
    color: 'yellow'
  },
  [PARTICIPATION_INTENTS.SALES]: {
    label: 'Sales',
    icon: 'ShoppingBag',
    color: 'red'
  },
  [PARTICIPATION_INTENTS.MENTORSHIP]: {
    label: 'Mentoring',
    icon: 'Heart',
    color: 'pink'
  },
  [PARTICIPATION_INTENTS.SPEAKING]: {
    label: 'Speaking',
    icon: 'Mic',
    color: 'indigo'
  },
  [PARTICIPATION_INTENTS.EXHIBITING]: {
    label: 'Exhibiting',
    icon: 'Store',
    color: 'cyan'
  }
};

// ============================================================
// LOOKING FOR / OFFERING TYPES
// ============================================================

/**
 * What kind of people is the user looking for?
 * Used for AI matching
 *
 * @type {Object}
 */
export const LOOKING_FOR_TYPES = {
  COFOUNDER: 'cofounder',
  INVESTOR: 'investor',
  MENTOR: 'mentor',
  EMPLOYEE: 'employee',
  PARTNER: 'partner',
  CLIENT: 'client',
  ADVISOR: 'advisor',
  SUPPLIER: 'supplier',
  PRESS: 'press',
  COLLABORATOR: 'collaborator'
};

/**
 * What can the user offer to others?
 * Used for AI matching - complements LOOKING_FOR_TYPES
 *
 * @type {Object}
 */
export const OFFERING_TYPES = {
  MENTORSHIP: 'mentorship',
  INVESTMENT: 'investment',
  PARTNERSHIP: 'partnership',
  JOB_OPPORTUNITY: 'job_opportunity',
  EXPERTISE: 'expertise',
  CONNECTIONS: 'connections',
  SERVICES: 'services',
  EQUITY: 'equity',
  ADVICE: 'advice',
  COLLABORATION: 'collaboration'
};

/**
 * Labels for looking for types
 *
 * @type {Object}
 */
export const LOOKING_FOR_LABELS = {
  [LOOKING_FOR_TYPES.COFOUNDER]: 'Co-founder',
  [LOOKING_FOR_TYPES.INVESTOR]: 'Investor',
  [LOOKING_FOR_TYPES.MENTOR]: 'Mentor',
  [LOOKING_FOR_TYPES.EMPLOYEE]: 'Employee / Talent',
  [LOOKING_FOR_TYPES.PARTNER]: 'Business Partner',
  [LOOKING_FOR_TYPES.CLIENT]: 'Client / Customer',
  [LOOKING_FOR_TYPES.ADVISOR]: 'Advisor',
  [LOOKING_FOR_TYPES.SUPPLIER]: 'Supplier / Vendor',
  [LOOKING_FOR_TYPES.PRESS]: 'Press / Media',
  [LOOKING_FOR_TYPES.COLLABORATOR]: 'Collaborator'
};

/**
 * Labels for offering types
 *
 * @type {Object}
 */
export const OFFERING_LABELS = {
  [OFFERING_TYPES.MENTORSHIP]: 'Mentorship',
  [OFFERING_TYPES.INVESTMENT]: 'Investment',
  [OFFERING_TYPES.PARTNERSHIP]: 'Partnership Opportunity',
  [OFFERING_TYPES.JOB_OPPORTUNITY]: 'Job Opportunity',
  [OFFERING_TYPES.EXPERTISE]: 'Technical Expertise',
  [OFFERING_TYPES.CONNECTIONS]: 'Industry Connections',
  [OFFERING_TYPES.SERVICES]: 'Services',
  [OFFERING_TYPES.EQUITY]: 'Equity',
  [OFFERING_TYPES.ADVICE]: 'Advice',
  [OFFERING_TYPES.COLLABORATION]: 'Collaboration'
};

// ============================================================
// COMPATIBILITY MATRIX
// ============================================================

/**
 * Defines which "looking for" types match with which "offering" types
 * Used by AI matchmaking to calculate complementary scores
 * Score: 0-1 (1 = perfect match)
 *
 * @type {Object}
 */
export const COMPATIBILITY_MATRIX = {
  [LOOKING_FOR_TYPES.COFOUNDER]: {
    [OFFERING_TYPES.PARTNERSHIP]: 1.0,
    [OFFERING_TYPES.EXPERTISE]: 0.8,
    [OFFERING_TYPES.EQUITY]: 0.7,
    [OFFERING_TYPES.COLLABORATION]: 0.6
  },
  [LOOKING_FOR_TYPES.INVESTOR]: {
    [OFFERING_TYPES.INVESTMENT]: 1.0,
    [OFFERING_TYPES.ADVICE]: 0.5,
    [OFFERING_TYPES.CONNECTIONS]: 0.6
  },
  [LOOKING_FOR_TYPES.MENTOR]: {
    [OFFERING_TYPES.MENTORSHIP]: 1.0,
    [OFFERING_TYPES.ADVICE]: 0.8,
    [OFFERING_TYPES.EXPERTISE]: 0.6
  },
  [LOOKING_FOR_TYPES.EMPLOYEE]: {
    [OFFERING_TYPES.JOB_OPPORTUNITY]: 1.0,
    [OFFERING_TYPES.EXPERTISE]: 0.3
  },
  [LOOKING_FOR_TYPES.PARTNER]: {
    [OFFERING_TYPES.PARTNERSHIP]: 1.0,
    [OFFERING_TYPES.COLLABORATION]: 0.8,
    [OFFERING_TYPES.SERVICES]: 0.6
  },
  [LOOKING_FOR_TYPES.CLIENT]: {
    [OFFERING_TYPES.SERVICES]: 0.3 // Lower because this is sales-oriented
  },
  [LOOKING_FOR_TYPES.ADVISOR]: {
    [OFFERING_TYPES.ADVICE]: 1.0,
    [OFFERING_TYPES.MENTORSHIP]: 0.7,
    [OFFERING_TYPES.EXPERTISE]: 0.6
  }
};

// ============================================================
// EVENT FEATURES
// ============================================================

/**
 * Feature flags for event functionality
 * Used for subscription tier gating
 *
 * @type {Object}
 */
export const EVENT_FEATURES = {
  /** Basic event viewing and joining */
  BASIC_EVENTS: 'basic_events',
  /** See events on the map */
  EVENT_MAP_VIEW: 'event_map_view',
  /** Show participation signals (intents, looking for) */
  PARTICIPATION_SIGNALS: 'participation_signals',
  /** Friends-only visibility mode */
  FRIENDS_VISIBILITY: 'friends_visibility',
  /** Ghost Mode - AI-only visibility */
  GHOST_MODE: 'ghost_mode',
  /** AI-powered matchmaking */
  AI_MATCHMAKING: 'ai_matchmaking',
  /** Meeting zone generation */
  MEETING_ZONES: 'meeting_zones',
  /** Natural language search within events */
  EVENT_SEMANTIC_SEARCH: 'event_semantic_search',
  /** Google Calendar integration */
  CALENDAR_INTEGRATION: 'calendar_integration'
};

// ============================================================
// SUBSCRIPTION TIER LIMITS
// ============================================================

/**
 * Event limits and features per subscription level
 *
 * Tier Distribution:
 * - BASE: No access (contact page is Pro+)
 * - PRO: All non-AI features including Ghost Mode visibility, Meeting Zones
 * - PREMIUM+: AI features (matchmaking, semantic search)
 *
 * @type {Object}
 */
export const EVENT_LIMITS = {
  [SUBSCRIPTION_LEVELS.BASE]: {
    maxEventsPerMonth: 0,
    maxParticipationsPerMonth: 0,
    features: []  // No access - contact page is Pro+ only
  },
  [SUBSCRIPTION_LEVELS.PRO]: {
    maxEventsPerMonth: 10,
    maxParticipationsPerMonth: 20,
    features: [
      EVENT_FEATURES.BASIC_EVENTS,
      EVENT_FEATURES.EVENT_MAP_VIEW,
      EVENT_FEATURES.PARTICIPATION_SIGNALS,
      EVENT_FEATURES.FRIENDS_VISIBILITY,
      EVENT_FEATURES.GHOST_MODE,           // Privacy modes available at Pro
      EVENT_FEATURES.MEETING_ZONES,        // Non-AI meeting zones at Pro
      EVENT_FEATURES.CALENDAR_INTEGRATION
    ]
  },
  [SUBSCRIPTION_LEVELS.PREMIUM]: {
    maxEventsPerMonth: 30,
    maxParticipationsPerMonth: 60,
    features: [
      EVENT_FEATURES.BASIC_EVENTS,
      EVENT_FEATURES.EVENT_MAP_VIEW,
      EVENT_FEATURES.PARTICIPATION_SIGNALS,
      EVENT_FEATURES.FRIENDS_VISIBILITY,
      EVENT_FEATURES.GHOST_MODE,
      EVENT_FEATURES.MEETING_ZONES,
      EVENT_FEATURES.CALENDAR_INTEGRATION,
      EVENT_FEATURES.AI_MATCHMAKING,       // AI features start at Premium
      EVENT_FEATURES.EVENT_SEMANTIC_SEARCH // AI semantic search at Premium
    ]
  },
  [SUBSCRIPTION_LEVELS.BUSINESS]: {
    maxEventsPerMonth: 100,
    maxParticipationsPerMonth: 200,
    features: [
      EVENT_FEATURES.BASIC_EVENTS,
      EVENT_FEATURES.EVENT_MAP_VIEW,
      EVENT_FEATURES.PARTICIPATION_SIGNALS,
      EVENT_FEATURES.FRIENDS_VISIBILITY,
      EVENT_FEATURES.GHOST_MODE,
      EVENT_FEATURES.AI_MATCHMAKING,
      EVENT_FEATURES.MEETING_ZONES,
      EVENT_FEATURES.EVENT_SEMANTIC_SEARCH,
      EVENT_FEATURES.CALENDAR_INTEGRATION
    ]
  },
  [SUBSCRIPTION_LEVELS.ENTERPRISE]: {
    maxEventsPerMonth: -1,   // Unlimited
    maxParticipationsPerMonth: -1,
    features: [
      EVENT_FEATURES.BASIC_EVENTS,
      EVENT_FEATURES.EVENT_MAP_VIEW,
      EVENT_FEATURES.PARTICIPATION_SIGNALS,
      EVENT_FEATURES.FRIENDS_VISIBILITY,
      EVENT_FEATURES.GHOST_MODE,
      EVENT_FEATURES.AI_MATCHMAKING,
      EVENT_FEATURES.MEETING_ZONES,
      EVENT_FEATURES.EVENT_SEMANTIC_SEARCH,
      EVENT_FEATURES.CALENDAR_INTEGRATION
    ]
  }
};

// ============================================================
// AI MATCHING THRESHOLDS
// ============================================================

/**
 * Thresholds for AI matchmaking
 *
 * @type {Object}
 */
export const EVENT_MATCH_THRESHOLDS = {
  /** Minimum score to create a match request (0-1) */
  MIN_MATCH_SCORE: 0.65,
  /** High confidence match threshold */
  HIGH_CONFIDENCE_SCORE: 0.85,
  /** Maximum matches per user per event */
  MAX_MATCHES_PER_USER: 10,
  /** Match request expiration (hours after event ends) */
  MATCH_EXPIRATION_HOURS: 48,
  /** Minimum semantic similarity for tag matching */
  MIN_TAG_SIMILARITY: 0.5
};

/**
 * Weights for different signals in compatibility scoring
 *
 * @type {Object}
 */
export const MATCH_SIGNAL_WEIGHTS = {
  /** Weight for looking_for/offering complementarity */
  COMPLEMENTARY_NEEDS: 0.35,
  /** Weight for semantic similarity (Qdrant vectors) */
  SEMANTIC_SIMILARITY: 0.25,
  /** Weight for shared tags */
  TAG_OVERLAP: 0.15,
  /** Weight for industry/category match */
  INDUSTRY_MATCH: 0.15,
  /** Weight for Neo4j graph proximity (shared connections) */
  GRAPH_PROXIMITY: 0.10
};

// ============================================================
// EVENT SOURCES
// ============================================================

/**
 * Sources from which events can be imported
 *
 * @type {Object}
 */
export const EVENT_SOURCES = {
  MANUAL: 'manual',
  GOOGLE_CALENDAR: 'google_calendar',
  EVENTBRITE: 'eventbrite',
  MEETUP: 'meetup',
  LINKEDIN: 'linkedin'
};

// ============================================================
// EVENT CATEGORIES
// ============================================================

/**
 * Predefined event categories for classification
 *
 * @type {Object}
 */
export const EVENT_CATEGORIES = {
  TECH: 'tech',
  STARTUP: 'startup',
  NETWORKING: 'networking',
  CONFERENCE: 'conference',
  WORKSHOP: 'workshop',
  MEETUP: 'meetup',
  HACKATHON: 'hackathon',
  SUMMIT: 'summit',
  TRADE_SHOW: 'trade_show',
  SEMINAR: 'seminar',
  WEBINAR: 'webinar',
  FUNDRAISING: 'fundraising',
  INDUSTRY: 'industry'
};

// ============================================================
// MATCH REQUEST STATUSES
// ============================================================

/**
 * Possible statuses for match requests
 *
 * @type {Object}
 */
export const MATCH_REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired'
};

// ============================================================
// MEETING ZONE CONFIG
// ============================================================

/**
 * Configuration for meeting zone generation
 *
 * @type {Object}
 */
export const MEETING_ZONE_CONFIG = {
  /** Minimum cluster size */
  MIN_CLUSTER_SIZE: 3,
  /** Maximum cluster size */
  MAX_CLUSTER_SIZE: 5,
  /** Maximum zones per event */
  MAX_ZONES_PER_EVENT: 20,
  /** Regeneration interval (minutes) */
  REGENERATION_INTERVAL_MINUTES: 30,
  /** Minimum compatibility score for zone inclusion */
  MIN_ZONE_COMPATIBILITY: 0.6
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if a subscription level has a specific event feature
 *
 * @param {string} subscriptionLevel - The subscription level to check
 * @param {string} feature - The feature to check for
 * @returns {boolean} True if the feature is available
 */
export function hasEventFeature(subscriptionLevel, feature) {
  const level = subscriptionLevel?.toLowerCase() || 'base';
  const config = EVENT_LIMITS[level];
  return config?.features?.includes(feature) || false;
}

/**
 * Get the event limits for a subscription level
 *
 * @param {string} subscriptionLevel - The subscription level
 * @returns {Object} The limits configuration
 */
export function getEventLimits(subscriptionLevel) {
  const level = subscriptionLevel?.toLowerCase() || 'base';
  return EVENT_LIMITS[level] || EVENT_LIMITS[SUBSCRIPTION_LEVELS.BASE];
}

/**
 * Calculate compatibility score between looking_for and offering
 *
 * @param {string[]} lookingFor - What one user is looking for
 * @param {string[]} offering - What the other user is offering
 * @returns {number} Compatibility score (0-1)
 */
export function calculateComplementaryScore(lookingFor, offering) {
  if (!lookingFor?.length || !offering?.length) return 0;

  let totalScore = 0;
  let matchCount = 0;

  for (const need of lookingFor) {
    const offeringScores = COMPATIBILITY_MATRIX[need];
    if (offeringScores) {
      for (const offer of offering) {
        if (offeringScores[offer]) {
          totalScore += offeringScores[offer];
          matchCount++;
        }
      }
    }
  }

  return matchCount > 0 ? totalScore / matchCount : 0;
}

/**
 * Get visibility mode description
 *
 * @param {string} mode - The visibility mode
 * @returns {Object} The mode description
 */
export function getVisibilityDescription(mode) {
  return EVENT_VISIBILITY_DESCRIPTIONS[mode] || EVENT_VISIBILITY_DESCRIPTIONS[EVENT_VISIBILITY_MODES.PUBLIC];
}
