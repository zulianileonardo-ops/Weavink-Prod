/**
 * Anonymous Analytics Constants
 *
 * Constants for anonymous, aggregated analytics tracking when users withdraw consent.
 * GDPR Compliant: No personal data, legitimate interest basis (Article 6(1)(f))
 *
 * @module anonymousAnalyticsConstants
 */

/**
 * Anonymous Event Types
 *
 * Events that can be tracked anonymously without user consent.
 * Only aggregate counts, no personal attribution.
 */
export const ANONYMOUS_EVENT_TYPES = {
  VIEW: 'view',           // Profile view (anonymous)
  CLICK: 'click',         // Link click (type only, no URL)
  SHARE: 'share',         // Profile share event
  QR_SCAN: 'qr_scan'      // QR code scan event
};

/**
 * Link Types for Anonymous Click Tracking
 *
 * Categories of links for aggregate analysis.
 * No specific URLs tracked - only link type categories.
 */
export const LINK_TYPES = {
  LINKEDIN: 'linkedin',
  WEBSITE: 'website',
  EMAIL: 'email',
  PHONE: 'phone',
  TWITTER: 'twitter',
  INSTAGRAM: 'instagram',
  FACEBOOK: 'facebook',
  GITHUB: 'github',
  YOUTUBE: 'youtube',
  TIKTOK: 'tiktok',
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
  DISCORD: 'discord',
  SNAPCHAT: 'snapchat',
  TWITCH: 'twitch',
  OTHER: 'other'
};

/**
 * Rate Limits for Anonymous Endpoint
 *
 * Prevents abuse of public (unauthenticated) anonymous analytics endpoint.
 * Stricter than personal analytics due to lack of authentication.
 */
export const ANONYMOUS_RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 100,     // Max requests per minute from single IP
  REQUESTS_PER_HOUR: 1000,      // Max requests per hour from single IP
  REQUESTS_PER_DAY: 10000       // Max requests per day from single IP
};

/**
 * Data Retention Periods
 *
 * GDPR Article 5(1)(e) - Storage Limitation Principle
 * CNIL Compliance: ≤ 26 months for analytics data
 */
export const DATA_RETENTION = {
  /**
   * Daily aggregated data retention
   * 26 months = 780 days (GDPR/CNIL compliant)
   */
  DAILY_DATA_DAYS: 26 * 30,  // 780 days

  /**
   * Hourly distribution data retention
   * 90 days for granular time analysis
   */
  HOURLY_DATA_DAYS: 90,

  /**
   * Global summary retention
   * Indefinite (aggregates only, no PII)
   */
  GLOBAL_SUMMARY_RETENTION: 'indefinite'
};

/**
 * Firestore Collection Paths
 *
 * Database structure for anonymous analytics.
 * Completely separate from personal analytics (/Analytics/{userId}/)
 */
export const ANONYMOUS_COLLECTIONS = {
  ROOT: 'Analytics_Anonymous',
  DAILY: 'daily',
  DATES: 'dates',
  GLOBAL: 'global',
  SUMMARY: 'summary',
  TOTALS: 'totals'
};

/**
 * Anonymous Data Field Names
 *
 * Standardized field names for Firestore documents.
 * Ensures consistency across all anonymous analytics operations.
 */
export const ANONYMOUS_FIELDS = {
  DATE: 'date',
  TOTAL_VIEWS: 'totalViews',
  TOTAL_CLICKS: 'totalClicks',
  TOTAL_SHARES: 'totalShares',
  TOTAL_QR_SCANS: 'totalQrScans',
  HOURLY_DISTRIBUTION: 'hourlyDistribution',
  LINK_TYPES: 'linkTypes',
  TIMESTAMP: 'timestamp',
  EXPIRE_AT: 'expireAt',          // TTL field for automatic deletion
  LAST_UPDATED: 'lastUpdated',
  DAILY_STATS: 'dailyStats'
};

/**
 * Aggregate Increment Values
 *
 * Standard increment amounts for counters.
 * All use 1 for simple counting, but defined as constants for clarity.
 */
export const INCREMENT_VALUES = {
  VIEW: 1,
  CLICK: 1,
  SHARE: 1,
  QR_SCAN: 1
};

/**
 * Error Messages for Anonymous Analytics
 *
 * Standardized error messages (will be translated via TranslationService)
 */
export const ANONYMOUS_ERRORS = {
  INVALID_EVENT_TYPE: 'invalid_event_type',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  DATABASE_ERROR: 'database_error',
  INVALID_LINK_TYPE: 'invalid_link_type',
  MISSING_PARAMETERS: 'missing_parameters'
};

/**
 * Validation Rules
 */
export const VALIDATION = {
  MAX_LINK_TYPE_LENGTH: 50,
  MIN_EVENT_TYPE_LENGTH: 3,
  MAX_EVENT_TYPE_LENGTH: 20
};
