// lib/services/serviceEvent/shared/eventTypes.js
/**
 * Event Social Intelligence Type Definitions
 *
 * This file provides JSDoc type definitions for the Event Social Intelligence feature.
 * Used for type checking, IDE autocompletion, and documentation.
 *
 * @see documentation/features/EVENT_SOCIAL_INTELLIGENCE.md
 * @see lib/services/serviceEvent/client/constants/eventConstants.js
 */

import {
  EVENT_VISIBILITY_MODES,
  PARTICIPATION_INTENTS,
  LOOKING_FOR_TYPES,
  OFFERING_TYPES,
  ATTENDANCE_STATUS,
  MATCH_STATUS,
  EVENT_SOURCE_TYPES,
} from '../client/constants/eventConstants';

// ============================================================================
// VISIBILITY TYPES
// ============================================================================

/**
 * @typedef {'public' | 'friends' | 'private' | 'ghost'} EventVisibilityMode
 * Visibility modes for event participation
 * - public: Visible to all attendees
 * - friends: Visible only to friends/connections
 * - private: Invisible to others (only you see your participation)
 * - ghost: Invisible to humans, but AI can detect synergies for opt-in intros
 */

/**
 * @typedef {Object} VisibilitySettings
 * @property {EventVisibilityMode} mode - Current visibility mode
 * @property {boolean} shareIntent - Whether to share participation intent
 * @property {boolean} shareLookingFor - Whether to share what you're looking for
 * @property {boolean} shareOffering - Whether to share what you're offering
 * @property {string[]} [visibleToContactIds] - Specific contacts who can see (for friends mode)
 */

// ============================================================================
// PARTICIPATION TYPES
// ============================================================================

/**
 * @typedef {'recruiting' | 'networking' | 'market_research' | 'learning' | 'partnership' | 'investment' | 'mentorship' | 'speaking' | 'sponsoring' | 'attending_only'} ParticipationIntent
 * Why someone is attending an event
 */

/**
 * @typedef {'cofounder' | 'investor' | 'mentor' | 'employee' | 'client' | 'partner' | 'freelancer' | 'advisor' | 'supplier'} LookingForType
 * What someone is looking for at an event
 */

/**
 * @typedef {'mentorship' | 'investment' | 'job_opportunities' | 'services' | 'expertise' | 'partnership' | 'introduction' | 'collaboration'} OfferingType
 * What someone can offer at an event
 */

/**
 * @typedef {'confirmed' | 'maybe' | 'declined' | 'interested'} AttendanceStatus
 * Status of event attendance
 */

/**
 * @typedef {Object} ParticipationDetails
 * @property {EventVisibilityMode} visibility - How visible is this participation
 * @property {ParticipationIntent} intent - Primary reason for attending
 * @property {ParticipationIntent[]} [secondaryIntents] - Additional reasons
 * @property {LookingForType[]} lookingFor - What they're looking for
 * @property {OfferingType[]} offering - What they're offering
 * @property {AttendanceStatus} status - Attendance status
 * @property {string} [notes] - Personal notes about participation
 * @property {Date} [confirmedAt] - When attendance was confirmed
 * @property {Date} updatedAt - Last update timestamp
 */

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * @typedef {'google_calendar' | 'manual' | 'outlook' | 'ical_import' | 'eventbrite' | 'meetup'} EventSourceType
 * Source of the event data
 */

/**
 * @typedef {Object} EventLocation
 * @property {string} [address] - Full address string
 * @property {string} [venue] - Venue name
 * @property {string} [city] - City name
 * @property {string} [country] - Country name
 * @property {number} [latitude] - GPS latitude
 * @property {number} [longitude] - GPS longitude
 * @property {string} [placeId] - Google Places ID
 * @property {boolean} [isOnline] - Whether event is online/virtual
 * @property {string} [onlineUrl] - URL for online events
 */

/**
 * @typedef {Object} Event
 * @property {string} id - Unique event identifier
 * @property {string} userId - Owner user ID (creator of the event)
 * @property {boolean} [isPublic] - If true, event is visible to ALL users (default: false, admin-only)
 * @property {string} name - Event name/title
 * @property {string} [description] - Event description
 * @property {Date} startDate - Event start date/time
 * @property {Date} [endDate] - Event end date/time
 * @property {EventLocation} [location] - Event location details
 * @property {EventSourceType} source - Where the event came from
 * @property {string} [sourceId] - ID in the source system (e.g., Google Calendar event ID)
 * @property {string[]} [tags] - Event tags/categories
 * @property {boolean} [isRecurring] - Whether event recurs
 * @property {string} [recurrenceRule] - RRULE for recurring events
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} EventWithAttendees
 * @property {Event} event - The event details
 * @property {EventAttendee[]} attendees - List of attendees
 * @property {number} attendeeCount - Total attendee count
 * @property {number} publicCount - Attendees with public visibility
 * @property {number} ghostCount - Attendees in ghost mode (for AI matching)
 */

// ============================================================================
// ATTENDEE TYPES
// ============================================================================

/**
 * @typedef {Object} EventAttendee
 * @property {string} contactId - Contact ID
 * @property {string} eventId - Event ID
 * @property {string} name - Contact name
 * @property {string} [email] - Contact email
 * @property {string} [company] - Contact company
 * @property {string} [jobTitle] - Contact job title
 * @property {string} [avatarUrl] - Contact avatar URL
 * @property {ParticipationDetails} participation - Participation details
 */

/**
 * @typedef {Object} AttendeeMapMarker
 * @property {string} contactId - Contact ID
 * @property {string} name - Display name
 * @property {string} [avatarUrl] - Avatar URL
 * @property {number} latitude - Marker latitude
 * @property {number} longitude - Marker longitude
 * @property {ParticipationIntent} intent - Participation intent (for icon/color)
 * @property {boolean} isGhostMode - Whether in ghost mode (hidden from map)
 */

// ============================================================================
// AI MATCHING TYPES
// ============================================================================

/**
 * @typedef {'pending' | 'accepted' | 'declined' | 'expired'} MatchStatus
 * Status of an AI-generated match
 */

/**
 * @typedef {Object} MatchReason
 * @property {string} type - Reason type (e.g., 'looking_for_match', 'industry_overlap')
 * @property {string} description - Human-readable description
 * @property {number} weight - How much this reason contributed to match score
 */

/**
 * @typedef {Object} EventMatch
 * @property {string} id - Match unique identifier
 * @property {string} eventId - Event where match was generated
 * @property {string} contact1Id - First contact ID
 * @property {string} contact2Id - Second contact ID
 * @property {number} compatibilityScore - AI compatibility score (0-1)
 * @property {MatchReason[]} reasons - Why they were matched
 * @property {MatchStatus} status - Overall match status
 * @property {boolean} contact1Accepted - Whether contact 1 accepted
 * @property {boolean} contact2Accepted - Whether contact 2 accepted
 * @property {Date} createdAt - When match was generated
 * @property {Date} [acceptedAt] - When both accepted
 * @property {Date} [expiresAt] - When match invitation expires
 */

/**
 * @typedef {Object} MatchNotification
 * @property {string} matchId - The match ID
 * @property {string} eventName - Event name for context
 * @property {string} matchedContactName - Name of matched contact
 * @property {string} [matchedContactAvatar] - Avatar URL
 * @property {string} [matchedContactCompany] - Company name
 * @property {string} [matchedContactTitle] - Job title
 * @property {MatchReason[]} reasons - Why you were matched
 * @property {number} compatibilityScore - Compatibility percentage
 * @property {boolean} requiresResponse - Whether user needs to accept/decline
 */

// ============================================================================
// MEETING ZONE TYPES
// ============================================================================

/**
 * @typedef {Object} MeetingZone
 * @property {string} id - Zone unique identifier
 * @property {string} eventId - Parent event ID
 * @property {string} name - AI-generated zone name (e.g., "Startup Founders Corner")
 * @property {string} [description] - Zone description
 * @property {string[]} memberContactIds - Contact IDs in this zone
 * @property {number} memberCount - Number of members (3-5 optimal)
 * @property {string[]} commonIntents - Shared intents among members
 * @property {string[]} commonIndustries - Shared industries
 * @property {number} cohesionScore - How well-matched the group is (0-1)
 * @property {EventLocation} [suggestedLocation] - Where to meet
 * @property {Date} [suggestedTime] - When to meet
 * @property {Date} createdAt - When zone was generated
 */

/**
 * @typedef {Object} MeetingZoneMember
 * @property {string} contactId - Contact ID
 * @property {string} name - Contact name
 * @property {string} [company] - Company name
 * @property {string} [title] - Job title
 * @property {ParticipationIntent} intent - Their participation intent
 * @property {LookingForType[]} lookingFor - What they're looking for
 * @property {OfferingType[]} offering - What they're offering
 */

// ============================================================================
// COMPATIBILITY MATRIX TYPES
// ============================================================================

/**
 * @typedef {Object} CompatibilityScore
 * @property {number} total - Overall compatibility (0-1)
 * @property {number} lookingForMatch - Score from looking_for/offering alignment
 * @property {number} intentMatch - Score from participation intent alignment
 * @property {number} industryMatch - Score from industry overlap
 * @property {number} companyMatch - Score from company relationship
 * @property {number} tagMatch - Score from shared tags
 * @property {number} semanticMatch - Score from semantic profile similarity
 */

/**
 * @typedef {Object} CompatibilityMatrix
 * @property {Object.<string, Object.<string, number>>} matrix - contact1Id -> contact2Id -> score
 * @property {string} eventId - Event this matrix is for
 * @property {Date} generatedAt - When matrix was generated
 * @property {number} contactCount - Number of contacts in matrix
 */

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * @typedef {Object} EventListResponse
 * @property {Event[]} events - List of events
 * @property {number} total - Total count
 * @property {number} page - Current page
 * @property {number} pageSize - Items per page
 * @property {boolean} hasMore - Whether more pages exist
 */

/**
 * @typedef {Object} EventAttendeesResponse
 * @property {EventAttendee[]} attendees - Visible attendees
 * @property {number} total - Total attendee count
 * @property {number} publicCount - Public visibility count
 * @property {number} friendsCount - Friends-only count
 * @property {boolean} hasGhostMode - Whether any ghost mode attendees exist (for AI)
 */

/**
 * @typedef {Object} EventMatchesResponse
 * @property {EventMatch[]} matches - List of matches
 * @property {number} total - Total match count
 * @property {number} pendingCount - Pending response count
 * @property {number} acceptedCount - Mutually accepted count
 */

/**
 * @typedef {Object} MeetingZonesResponse
 * @property {MeetingZone[]} zones - List of meeting zones
 * @property {number} total - Total zone count
 * @property {string} eventId - Event ID
 * @property {Date} generatedAt - When zones were generated
 */

// ============================================================================
// EXPORTS (for JSDoc reference)
// ============================================================================

/**
 * Export empty object - this file is for type definitions only
 * Import types using JSDoc: @type {import('./eventTypes').Event}
 */
export default {};
