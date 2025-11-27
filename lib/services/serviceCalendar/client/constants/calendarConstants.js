/**
 * Calendar Integration Constants
 * Sprint 6: Event Discovery & Automation
 */

// ============================================================================
// CALENDAR PROVIDERS
// ============================================================================

export const CALENDAR_PROVIDERS = {
    GOOGLE: 'google',
    OUTLOOK: 'outlook',
    ICAL: 'ical'
};

export const CALENDAR_PROVIDER_LABELS = {
    [CALENDAR_PROVIDERS.GOOGLE]: 'Google Calendar',
    [CALENDAR_PROVIDERS.OUTLOOK]: 'Outlook Calendar',
    [CALENDAR_PROVIDERS.ICAL]: 'iCal Import'
};

// ============================================================================
// EVENT DISCOVERY SOURCES
// ============================================================================

export const EVENT_SOURCES = {
    MANUAL: 'manual',
    GOOGLE_CALENDAR: 'google_calendar',
    OUTLOOK: 'outlook',
    ICAL_IMPORT: 'ical_import',
    EVENTBRITE: 'eventbrite',
    MEETUP: 'meetup'
};

export const EVENT_SOURCE_LABELS = {
    [EVENT_SOURCES.MANUAL]: 'Manual Entry',
    [EVENT_SOURCES.GOOGLE_CALENDAR]: 'Google Calendar',
    [EVENT_SOURCES.OUTLOOK]: 'Outlook',
    [EVENT_SOURCES.ICAL_IMPORT]: 'iCal Import',
    [EVENT_SOURCES.EVENTBRITE]: 'Eventbrite',
    [EVENT_SOURCES.MEETUP]: 'Meetup'
};

// ============================================================================
// SYNC CONFIGURATION
// ============================================================================

export const SYNC_INTERVALS = {
    MANUAL: 'manual',
    HOURLY: 'hourly',
    DAILY: 'daily',
    WEEKLY: 'weekly'
};

export const SYNC_INTERVAL_MS = {
    [SYNC_INTERVALS.HOURLY]: 60 * 60 * 1000,
    [SYNC_INTERVALS.DAILY]: 24 * 60 * 60 * 1000,
    [SYNC_INTERVALS.WEEKLY]: 7 * 24 * 60 * 60 * 1000
};

export const SYNC_CONFIG = {
    MAX_EVENTS_PER_SYNC: 100,
    SYNC_WINDOW_DAYS: 90,           // Sync events up to 90 days in the future
    MIN_SYNC_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes minimum between syncs
    TOKEN_REFRESH_BUFFER_MS: 5 * 60 * 1000 // Refresh token 5 minutes before expiry
};

// ============================================================================
// EVENT CATEGORIES & AUTO-TAGGING
// ============================================================================

export const EVENT_CATEGORIES = {
    TECH: 'tech',
    STARTUP: 'startup',
    NETWORKING: 'networking',
    CONFERENCE: 'conference',
    WORKSHOP: 'workshop',
    AI: 'ai',
    BUSINESS: 'business',
    SOCIAL: 'social',
    WEBINAR: 'webinar',
    MEETUP: 'meetup'
};

export const CATEGORY_LABELS = {
    [EVENT_CATEGORIES.TECH]: 'Technology',
    [EVENT_CATEGORIES.STARTUP]: 'Startup',
    [EVENT_CATEGORIES.NETWORKING]: 'Networking',
    [EVENT_CATEGORIES.CONFERENCE]: 'Conference',
    [EVENT_CATEGORIES.WORKSHOP]: 'Workshop',
    [EVENT_CATEGORIES.AI]: 'AI / Machine Learning',
    [EVENT_CATEGORIES.BUSINESS]: 'Business',
    [EVENT_CATEGORIES.SOCIAL]: 'Social',
    [EVENT_CATEGORIES.WEBINAR]: 'Webinar',
    [EVENT_CATEGORIES.MEETUP]: 'Meetup'
};

/**
 * Keywords for auto-tagging events based on title/description
 */
export const TAG_KEYWORDS = {
    [EVENT_CATEGORIES.TECH]: ['tech', 'technology', 'software', 'coding', 'developer', 'dev', 'programming', 'code', 'engineering'],
    [EVENT_CATEGORIES.STARTUP]: ['startup', 'founder', 'entrepreneurship', 'entrepreneur', 'venture', 'pitch', 'incubator', 'accelerator'],
    [EVENT_CATEGORIES.NETWORKING]: ['networking', 'meetup', 'mixer', 'connect', 'community', 'afterwork', 'happy hour'],
    [EVENT_CATEGORIES.CONFERENCE]: ['conference', 'summit', 'expo', 'convention', 'forum', 'congress'],
    [EVENT_CATEGORIES.WORKSHOP]: ['workshop', 'training', 'seminar', 'bootcamp', 'masterclass', 'hands-on', 'tutorial'],
    [EVENT_CATEGORIES.AI]: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'llm', 'gpt', 'neural'],
    [EVENT_CATEGORIES.BUSINESS]: ['business', 'b2b', 'sales', 'marketing', 'growth', 'strategy', 'finance'],
    [EVENT_CATEGORIES.SOCIAL]: ['social', 'party', 'celebration', 'dinner', 'lunch', 'drinks'],
    [EVENT_CATEGORIES.WEBINAR]: ['webinar', 'online event', 'virtual', 'zoom', 'livestream'],
    [EVENT_CATEGORIES.MEETUP]: ['meetup', 'meet up', 'gathering', 'get-together']
};

// ============================================================================
// DISCOVERY SETTINGS
// ============================================================================

export const DISCOVERY_CONFIG = {
    DEFAULT_RADIUS_KM: 25,
    MAX_RADIUS_KM: 100,
    MIN_RADIUS_KM: 5,
    MAX_RESULTS: 50,
    DEFAULT_CATEGORIES: [EVENT_CATEGORIES.TECH, EVENT_CATEGORIES.NETWORKING, EVENT_CATEGORIES.STARTUP]
};

// ============================================================================
// EVENTBRITE CONFIGURATION
// ============================================================================

export const EVENTBRITE_CONFIG = {
    API_BASE_URL: 'https://www.eventbriteapi.com/v3',
    // Business & Tech category IDs
    CATEGORY_IDS: {
        BUSINESS: '101',
        SCIENCE_TECH: '102',
        MUSIC: '103',
        FILM_MEDIA: '104',
        PERFORMING_ARTS: '105'
    },
    DEFAULT_CATEGORIES: ['101', '102'], // Business, Science & Tech
    MAX_RESULTS_PER_PAGE: 50
};

// ============================================================================
// OAUTH SCOPES
// ============================================================================

export const GOOGLE_CALENDAR_SCOPES = {
    READ_ONLY: 'https://www.googleapis.com/auth/calendar.readonly',
    READ_WRITE: 'https://www.googleapis.com/auth/calendar.events',
    FULL_ACCESS: 'https://www.googleapis.com/auth/calendar'
};

// Default to read-only for privacy
export const DEFAULT_GOOGLE_SCOPES = [GOOGLE_CALENDAR_SCOPES.READ_ONLY];

// ============================================================================
// CONNECTION STATUS
// ============================================================================

export const CONNECTION_STATUS = {
    DISCONNECTED: 'disconnected',
    CONNECTED: 'connected',
    SYNCING: 'syncing',
    ERROR: 'error',
    TOKEN_EXPIRED: 'token_expired'
};

export const CONNECTION_STATUS_LABELS = {
    [CONNECTION_STATUS.DISCONNECTED]: 'Not Connected',
    [CONNECTION_STATUS.CONNECTED]: 'Connected',
    [CONNECTION_STATUS.SYNCING]: 'Syncing...',
    [CONNECTION_STATUS.ERROR]: 'Connection Error',
    [CONNECTION_STATUS.TOKEN_EXPIRED]: 'Reconnection Required'
};

// ============================================================================
// DEFAULT USER PREFERENCES
// ============================================================================

export const DEFAULT_CALENDAR_PREFERENCES = {
    autoSyncEnabled: false,
    syncInterval: SYNC_INTERVALS.DAILY,
    excludedCalendars: [],
    autoDiscoverRadius: DISCOVERY_CONFIG.DEFAULT_RADIUS_KM,
    preferredCategories: DISCOVERY_CONFIG.DEFAULT_CATEGORIES,
    requireLocation: true,
    importOnlyWithLocation: true,
    skipPersonalEvents: true
};

// ============================================================================
// SUBSCRIPTION LIMITS
// ============================================================================

export const CALENDAR_FEATURES = {
    GOOGLE_CALENDAR_SYNC: 'google_calendar_sync',
    EVENTBRITE_DISCOVERY: 'eventbrite_discovery',
    AUTO_SYNC: 'auto_sync',
    UNLIMITED_IMPORTS: 'unlimited_imports'
};

export const CALENDAR_LIMITS = {
    base: {
        features: [],
        maxImportsPerMonth: 0
    },
    pro: {
        features: [CALENDAR_FEATURES.GOOGLE_CALENDAR_SYNC],
        maxImportsPerMonth: 50
    },
    premium: {
        features: [
            CALENDAR_FEATURES.GOOGLE_CALENDAR_SYNC,
            CALENDAR_FEATURES.EVENTBRITE_DISCOVERY,
            CALENDAR_FEATURES.AUTO_SYNC
        ],
        maxImportsPerMonth: 200
    },
    business: {
        features: [
            CALENDAR_FEATURES.GOOGLE_CALENDAR_SYNC,
            CALENDAR_FEATURES.EVENTBRITE_DISCOVERY,
            CALENDAR_FEATURES.AUTO_SYNC,
            CALENDAR_FEATURES.UNLIMITED_IMPORTS
        ],
        maxImportsPerMonth: -1 // Unlimited
    },
    enterprise: {
        features: [
            CALENDAR_FEATURES.GOOGLE_CALENDAR_SYNC,
            CALENDAR_FEATURES.EVENTBRITE_DISCOVERY,
            CALENDAR_FEATURES.AUTO_SYNC,
            CALENDAR_FEATURES.UNLIMITED_IMPORTS
        ],
        maxImportsPerMonth: -1 // Unlimited
    }
};

/**
 * Check if a subscription level has a calendar feature
 * @param {string} subscriptionLevel - User's subscription level
 * @param {string} feature - Feature to check
 * @returns {boolean}
 */
export function hasCalendarFeature(subscriptionLevel, feature) {
    const limits = CALENDAR_LIMITS[subscriptionLevel];
    if (!limits) return false;
    return limits.features.includes(feature);
}

/**
 * Get max imports allowed per month for subscription level
 * @param {string} subscriptionLevel
 * @returns {number} -1 for unlimited
 */
export function getMaxImportsPerMonth(subscriptionLevel) {
    const limits = CALENDAR_LIMITS[subscriptionLevel];
    if (!limits) return 0;
    return limits.maxImportsPerMonth;
}
