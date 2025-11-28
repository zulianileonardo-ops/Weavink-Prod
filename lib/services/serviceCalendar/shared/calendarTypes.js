/**
 * Calendar Integration Type Definitions (JSDoc)
 * Sprint 6: Event Discovery & Automation
 */

// ============================================================================
// CALENDAR TOKEN TYPES
// ============================================================================

/**
 * @typedef {Object} CalendarToken
 * @property {string} provider - Calendar provider ('google', 'outlook')
 * @property {string} accessToken - OAuth access token
 * @property {string} refreshToken - OAuth refresh token
 * @property {number} expiryDate - Token expiry timestamp (ms)
 * @property {string} scope - Granted OAuth scopes
 * @property {string} email - Associated email address
 * @property {Date} connectedAt - When the calendar was connected
 * @property {Date|null} lastSyncAt - Last successful sync timestamp
 * @property {string} status - Connection status
 */

/**
 * @typedef {Object} TokenRefreshResult
 * @property {boolean} success - Whether refresh was successful
 * @property {string} [accessToken] - New access token if successful
 * @property {number} [expiryDate] - New expiry timestamp if successful
 * @property {string} [error] - Error message if failed
 */

// ============================================================================
// SYNC TYPES
// ============================================================================

/**
 * @typedef {Object} SyncResult
 * @property {boolean} success - Whether sync completed successfully
 * @property {number} imported - Number of events imported
 * @property {number} skipped - Number of events skipped (duplicates, no location)
 * @property {number} updated - Number of events updated
 * @property {number} failed - Number of events that failed to import
 * @property {SyncError[]} errors - Array of sync errors
 * @property {Date} syncedAt - Timestamp of sync
 * @property {string} [nextSyncToken] - Token for incremental sync
 */

/**
 * @typedef {Object} SyncError
 * @property {string} eventId - ID of the event that failed
 * @property {string} eventTitle - Title of the event
 * @property {string} error - Error message
 * @property {string} [code] - Error code
 */

/**
 * @typedef {Object} SyncOptions
 * @property {boolean} [fullSync=false] - Force full sync instead of incremental
 * @property {Date} [startDate] - Start date for sync window
 * @property {Date} [endDate] - End date for sync window
 * @property {string[]} [calendarIds] - Specific calendars to sync
 * @property {boolean} [skipExisting=true] - Skip events already imported
 */

// ============================================================================
// GOOGLE CALENDAR TYPES
// ============================================================================

/**
 * @typedef {Object} GoogleCalendarEvent
 * @property {string} id - Google event ID
 * @property {string} summary - Event title
 * @property {string} [description] - Event description
 * @property {GoogleDateTime} start - Start date/time
 * @property {GoogleDateTime} end - End date/time
 * @property {string} [location] - Location string
 * @property {string} status - Event status ('confirmed', 'tentative', 'cancelled')
 * @property {string} htmlLink - Link to event in Google Calendar
 * @property {GoogleAttendee[]} [attendees] - Event attendees
 * @property {GoogleOrganizer} [organizer] - Event organizer
 * @property {string[]} [recurrence] - Recurrence rules
 * @property {string} [recurringEventId] - Parent recurring event ID
 * @property {GoogleConferenceData} [conferenceData] - Video conference info
 */

/**
 * @typedef {Object} GoogleDateTime
 * @property {string} [dateTime] - ISO datetime for timed events
 * @property {string} [date] - Date string for all-day events
 * @property {string} [timeZone] - Timezone
 */

/**
 * @typedef {Object} GoogleAttendee
 * @property {string} email - Attendee email
 * @property {string} [displayName] - Display name
 * @property {string} responseStatus - 'needsAction', 'declined', 'tentative', 'accepted'
 * @property {boolean} [organizer] - Is this the organizer
 * @property {boolean} [self] - Is this the current user
 */

/**
 * @typedef {Object} GoogleOrganizer
 * @property {string} email - Organizer email
 * @property {string} [displayName] - Organizer display name
 * @property {boolean} [self] - Is current user the organizer
 */

/**
 * @typedef {Object} GoogleConferenceData
 * @property {string} conferenceId - Conference ID
 * @property {GoogleEntryPoint[]} entryPoints - Ways to join
 */

/**
 * @typedef {Object} GoogleEntryPoint
 * @property {string} entryPointType - 'video', 'phone', 'sip', 'more'
 * @property {string} uri - Entry point URI
 * @property {string} [label] - Display label
 */

/**
 * @typedef {Object} GoogleCalendar
 * @property {string} id - Calendar ID
 * @property {string} summary - Calendar name
 * @property {string} [description] - Calendar description
 * @property {string} timeZone - Calendar timezone
 * @property {boolean} primary - Is this the primary calendar
 * @property {string} backgroundColor - Calendar color
 * @property {string} accessRole - 'owner', 'writer', 'reader', 'freeBusyReader'
 */

// ============================================================================
// EVENTBRITE TYPES
// ============================================================================

/**
 * @typedef {Object} EventbriteEvent
 * @property {string} id - Eventbrite event ID
 * @property {EventbriteText} name - Event name
 * @property {EventbriteText} [description] - Event description
 * @property {EventbriteDateTime} start - Start date/time
 * @property {EventbriteDateTime} end - End date/time
 * @property {string} url - Eventbrite event URL
 * @property {EventbriteVenue} [venue] - Venue information
 * @property {EventbriteCategory} [category] - Event category
 * @property {boolean} is_free - Is the event free
 * @property {number} [capacity] - Event capacity
 * @property {string} status - Event status
 * @property {EventbriteLogo} [logo] - Event logo/image
 */

/**
 * @typedef {Object} EventbriteText
 * @property {string} text - Plain text
 * @property {string} [html] - HTML formatted text
 */

/**
 * @typedef {Object} EventbriteDateTime
 * @property {string} timezone - Timezone
 * @property {string} local - Local time string
 * @property {string} utc - UTC time string
 */

/**
 * @typedef {Object} EventbriteVenue
 * @property {string} id - Venue ID
 * @property {string} name - Venue name
 * @property {EventbriteAddress} address - Venue address
 * @property {string} [latitude] - Latitude
 * @property {string} [longitude] - Longitude
 */

/**
 * @typedef {Object} EventbriteAddress
 * @property {string} [address_1] - Street address line 1
 * @property {string} [address_2] - Street address line 2
 * @property {string} [city] - City
 * @property {string} [region] - State/Region
 * @property {string} [postal_code] - Postal code
 * @property {string} [country] - Country code
 * @property {string} localized_address_display - Formatted address string
 */

/**
 * @typedef {Object} EventbriteCategory
 * @property {string} id - Category ID
 * @property {string} name - Category name
 */

/**
 * @typedef {Object} EventbriteLogo
 * @property {string} id - Logo ID
 * @property {string} url - Logo URL
 * @property {EventbriteImage} [original] - Original image
 */

/**
 * @typedef {Object} EventbriteImage
 * @property {string} url - Image URL
 * @property {number} width - Image width
 * @property {number} height - Image height
 */

// ============================================================================
// GEOCODING TYPES
// ============================================================================

/**
 * @typedef {Object} GeocodedLocation
 * @property {string} address - Original address string
 * @property {string} formattedAddress - Google-formatted address
 * @property {number} latitude - Latitude coordinate
 * @property {number} longitude - Longitude coordinate
 * @property {string} [placeId] - Google Place ID
 * @property {string} [venue] - Venue name if detected
 * @property {string} [city] - City name
 * @property {string} [region] - State/Region
 * @property {string} [country] - Country name
 * @property {string} [countryCode] - ISO country code
 * @property {string} [postalCode] - Postal code
 */

/**
 * @typedef {Object} GeocodeResult
 * @property {boolean} success - Whether geocoding was successful
 * @property {GeocodedLocation} [location] - Geocoded location if successful
 * @property {string} [error] - Error message if failed
 * @property {string} [errorCode] - Error code ('ZERO_RESULTS', 'OVER_QUOTA', etc.)
 */

// ============================================================================
// USER PREFERENCES TYPES
// ============================================================================

/**
 * @typedef {Object} CalendarPreferences
 * @property {boolean} autoSyncEnabled - Enable automatic sync
 * @property {'manual'|'hourly'|'daily'|'weekly'} syncInterval - Sync frequency
 * @property {string[]} excludedCalendars - Calendar IDs to exclude from sync
 * @property {number} autoDiscoverRadius - Radius in km for event discovery
 * @property {string[]} preferredCategories - Preferred event categories
 * @property {boolean} requireLocation - Only import events with location
 * @property {boolean} importOnlyWithLocation - Skip events without geocodable location
 * @property {boolean} skipPersonalEvents - Skip events that look personal
 */

/**
 * @typedef {Object} CalendarConnection
 * @property {string} provider - Provider name
 * @property {string} email - Connected email
 * @property {'disconnected'|'connected'|'syncing'|'error'|'token_expired'} status - Connection status
 * @property {Date|null} lastSyncAt - Last sync timestamp
 * @property {number} eventsImported - Total events imported
 * @property {string} [error] - Error message if status is 'error'
 */

// ============================================================================
// DISCOVERY TYPES
// ============================================================================

/**
 * @typedef {Object} DiscoveryQuery
 * @property {number} latitude - Center latitude
 * @property {number} longitude - Center longitude
 * @property {number} [radius=25] - Radius in km
 * @property {string[]} [categories] - Category filters
 * @property {Date} [startDate] - Start date filter
 * @property {Date} [endDate] - End date filter
 * @property {string} [keyword] - Keyword search
 * @property {number} [limit=50] - Max results
 */

/**
 * @typedef {Object} DiscoveryResult
 * @property {boolean} success
 * @property {DiscoveredEvent[]} events - Discovered events
 * @property {number} total - Total matching events
 * @property {boolean} hasMore - More results available
 * @property {string} [source] - Source of events ('eventbrite', 'meetup', etc.)
 */

/**
 * @typedef {Object} DiscoveredEvent
 * @property {string} id - External event ID
 * @property {string} source - Source platform
 * @property {string} name - Event name
 * @property {string} [description] - Event description
 * @property {Date} startDate - Start date
 * @property {Date} endDate - End date
 * @property {GeocodedLocation} [location] - Event location
 * @property {string} [url] - Event URL
 * @property {string} [imageUrl] - Event image
 * @property {string[]} tags - Auto-detected tags
 * @property {boolean} isFree - Is event free
 * @property {number} [attendeeCount] - Number of attendees
 * @property {boolean} alreadyImported - Already in user's events
 */

// ============================================================================
// IMPORT TYPES
// ============================================================================

/**
 * @typedef {Object} ImportRequest
 * @property {string} source - Source platform
 * @property {string} externalId - External event ID
 * @property {boolean} [isPublic=false] - Make event public (admin only)
 */

/**
 * @typedef {Object} ImportResult
 * @property {boolean} success
 * @property {string} [eventId] - Created event ID if successful
 * @property {string} [error] - Error message if failed
 * @property {boolean} [alreadyExists] - Event already imported
 */

const calendarTypes = {};
export default calendarTypes;
