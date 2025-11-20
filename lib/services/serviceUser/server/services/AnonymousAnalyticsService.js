/**
 * Anonymous Analytics Service (Server-Side)
 *
 * Aggregates anonymous analytics data in Firestore without any user identification.
 * GDPR Compliant: No personal data stored, legitimate interest basis (Article 6(1)(f))
 *
 * @module AnonymousAnalyticsService
 */

import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  ANONYMOUS_EVENT_TYPES,
  DATA_RETENTION,
  ANONYMOUS_COLLECTIONS,
  ANONYMOUS_FIELDS,
  INCREMENT_VALUES
} from '@/lib/services/serviceAnalytics/constants/anonymousAnalyticsConstants';
import { translateServerSide } from '@/lib/services/server/translationService';

/**
 * Anonymous Analytics Service Class
 *
 * Provides methods for tracking anonymous, aggregated analytics events.
 * All methods are static as this is a stateless service.
 */
export class AnonymousAnalyticsService {

  /**
   * Track anonymous event
   *
   * Aggregates event data without any user identification.
   * Writes to two Firestore locations:
   * 1. Daily aggregates: /Analytics_Anonymous/daily/dates/{YYYY-MM-DD}
   * 2. Global summary: /Analytics_Anonymous/global/summary/totals
   *
   * @param {string} eventType - Type of event (view, click, share, qr_scan)
   * @param {Object} metadata - Optional metadata (linkType for clicks, etc.)
   * @param {string} [metadata.linkType] - Type of link clicked (linkedin, website, etc.)
   * @returns {Promise<void>}
   *
   * @example
   * // Track anonymous view
   * await AnonymousAnalyticsService.trackEvent('view');
   *
   * @example
   * // Track anonymous click
   * await AnonymousAnalyticsService.trackEvent('click', { linkType: 'linkedin' });
   */
  static async trackEvent(eventType, metadata = {}) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const hour = new Date().getHours(); // 0-23

    try {
      // Validate event type
      if (!Object.values(ANONYMOUS_EVENT_TYPES).includes(eventType)) {
        console.error(`[AnonymousAnalytics] Invalid event type: ${eventType}`);
        return;
      }

      // Calculate expiration date (26 months from now for GDPR compliance)
      const expireAt = this._calculateExpirationDate();

      // Update daily aggregates
      await this._updateDailyAggregates(today, hour, eventType, metadata, expireAt);

      // Update global summary
      await this._updateGlobalSummary(today, eventType);

      console.log(`[AnonymousAnalytics] ✅ Tracked ${eventType} event anonymously`);

    } catch (error) {
      // Use TranslationService for multilingual error logging
      const errorMessage = await this._getTranslatedError(
        'errors.anonymous_analytics_failed',
        'en',
        { error: error.message }
      );

      console.error('[AnonymousAnalytics] ❌ Failed to track event:', errorMessage, error);

      // Don't throw - analytics failures shouldn't break the app
      // This is a non-blocking operation
    }
  }

  /**
   * Update daily aggregates collection
   *
   * Writes to: /Analytics_Anonymous/daily/dates/{YYYY-MM-DD}
   *
   * @private
   * @param {string} date - Date string (YYYY-MM-DD)
   * @param {number} hour - Hour of day (0-23)
   * @param {string} eventType - Event type (view, click, etc.)
   * @param {Object} metadata - Event metadata
   * @param {Date} expireAt - TTL expiration date
   * @returns {Promise<void>}
   */
  static async _updateDailyAggregates(date, hour, eventType, metadata, expireAt) {
    const dailyRef = adminDb
      .collection(ANONYMOUS_COLLECTIONS.ROOT)
      .doc(ANONYMOUS_COLLECTIONS.DAILY)
      .collection(ANONYMOUS_COLLECTIONS.DATES)
      .doc(date);

    // Build update object
    const updateData = {
      [ANONYMOUS_FIELDS.DATE]: date,
      [ANONYMOUS_FIELDS.TIMESTAMP]: FieldValue.serverTimestamp(),
      [ANONYMOUS_FIELDS.EXPIRE_AT]: expireAt
    };

    // Increment total count for this event type
    const totalField = this._getTotalFieldName(eventType);
    updateData[totalField] = FieldValue.increment(INCREMENT_VALUES[eventType.toUpperCase()] || 1);

    // Increment hourly distribution
    updateData[`${ANONYMOUS_FIELDS.HOURLY_DISTRIBUTION}.${hour}`] = FieldValue.increment(1);

    // If click event, track link type
    if (eventType === ANONYMOUS_EVENT_TYPES.CLICK && metadata.linkType) {
      const linkType = metadata.linkType.toLowerCase();
      updateData[`${ANONYMOUS_FIELDS.LINK_TYPES}.${linkType}.clicks`] = FieldValue.increment(1);
    }

    // Write to Firestore with merge to preserve existing data
    await dailyRef.set(updateData, { merge: true });
  }

  /**
   * Update global summary collection
   *
   * Writes to: /Analytics_Anonymous/global/summary/totals
   *
   * @private
   * @param {string} date - Date string (YYYY-MM-DD)
   * @param {string} eventType - Event type (view, click, etc.)
   * @returns {Promise<void>}
   */
  static async _updateGlobalSummary(date, eventType) {
    const summaryRef = adminDb
      .collection(ANONYMOUS_COLLECTIONS.ROOT)
      .doc(ANONYMOUS_COLLECTIONS.GLOBAL)
      .collection(ANONYMOUS_COLLECTIONS.SUMMARY)
      .doc(ANONYMOUS_COLLECTIONS.TOTALS);

    // Build update object
    const updateData = {
      [ANONYMOUS_FIELDS.LAST_UPDATED]: FieldValue.serverTimestamp()
    };

    // Increment global total
    const totalField = this._getTotalFieldName(eventType);
    updateData[totalField] = FieldValue.increment(INCREMENT_VALUES[eventType.toUpperCase()] || 1);

    // Increment daily stats for this specific date
    const eventField = `${eventType}s`; // views, clicks, shares, qrScans
    updateData[`${ANONYMOUS_FIELDS.DAILY_STATS}.${date}.${eventField}`] = FieldValue.increment(1);

    // Write to Firestore with merge
    await summaryRef.set(updateData, { merge: true });
  }

  /**
   * Calculate expiration date for TTL
   *
   * Returns date 26 months (780 days) in the future for GDPR compliance.
   * Firestore TTL will automatically delete documents when expireAt is reached.
   *
   * @private
   * @returns {Date} Expiration date
   */
  static _calculateExpirationDate() {
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + DATA_RETENTION.DAILY_DATA_DAYS);
    return expireAt;
  }

  /**
   * Get total field name for event type
   *
   * Converts event type to Firestore field name.
   * Examples: view → totalViews, click → totalClicks
   *
   * @private
   * @param {string} eventType - Event type (view, click, share, qr_scan)
   * @returns {string} Field name (totalViews, totalClicks, etc.)
   */
  static _getTotalFieldName(eventType) {
    switch (eventType) {
      case ANONYMOUS_EVENT_TYPES.VIEW:
        return ANONYMOUS_FIELDS.TOTAL_VIEWS;
      case ANONYMOUS_EVENT_TYPES.CLICK:
        return ANONYMOUS_FIELDS.TOTAL_CLICKS;
      case ANONYMOUS_EVENT_TYPES.SHARE:
        return ANONYMOUS_FIELDS.TOTAL_SHARES;
      case ANONYMOUS_EVENT_TYPES.QR_SCAN:
        return ANONYMOUS_FIELDS.TOTAL_QR_SCANS;
      default:
        return `total${this._capitalize(eventType)}s`;
    }
  }

  /**
   * Get translated error message
   *
   * Uses TranslationService for multilingual error messages.
   * Falls back to English if translation fails.
   *
   * @private
   * @param {string} key - Translation key
   * @param {string} locale - Language code (en, fr, es, ch, vm)
   * @param {Object} variables - Variables for interpolation
   * @returns {Promise<string>} Translated error message
   */
  static async _getTranslatedError(key, locale, variables) {
    try {
      return await translateServerSide(key, locale, variables);
    } catch (error) {
      // Fallback to English if translation fails
      return `Anonymous analytics failed: ${variables.error}`;
    }
  }

  /**
   * Capitalize first letter of string
   *
   * @private
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  static _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get anonymous analytics stats for a specific date
   *
   * Public method for retrieving anonymous analytics data (for admin dashboards, etc.)
   *
   * @param {string} date - Date string (YYYY-MM-DD)
   * @returns {Promise<Object|null>} Daily stats or null if not found
   *
   * @example
   * const stats = await AnonymousAnalyticsService.getDaily Stats('2025-11-20');
   * console.log(stats.totalViews, stats.totalClicks);
   */
  static async getDailyStats(date) {
    try {
      const dailyRef = adminDb
        .collection(ANONYMOUS_COLLECTIONS.ROOT)
        .doc(ANONYMOUS_COLLECTIONS.DAILY)
        .collection(ANONYMOUS_COLLECTIONS.DATES)
        .doc(date);

      const doc = await dailyRef.get();

      if (!doc.exists) {
        return null;
      }

      return doc.data();
    } catch (error) {
      console.error('[AnonymousAnalytics] Failed to get daily stats:', error);
      return null;
    }
  }

  /**
   * Get global summary stats
   *
   * Public method for retrieving global analytics summary (for admin dashboards, etc.)
   *
   * @returns {Promise<Object|null>} Global stats or null if not found
   *
   * @example
   * const stats = await AnonymousAnalyticsService.getGlobalStats();
   * console.log(stats.totalViews, stats.totalClicks);
   */
  static async getGlobalStats() {
    try {
      const summaryRef = adminDb
        .collection(ANONYMOUS_COLLECTIONS.ROOT)
        .doc(ANONYMOUS_COLLECTIONS.GLOBAL)
        .collection(ANONYMOUS_COLLECTIONS.SUMMARY)
        .doc(ANONYMOUS_COLLECTIONS.TOTALS);

      const doc = await summaryRef.get();

      if (!doc.exists) {
        return null;
      }

      return doc.data();
    } catch (error) {
      console.error('[AnonymousAnalytics] Failed to get global stats:', error);
      return null;
    }
  }
}

/**
 * Export singleton instance for convenience
 */
export default AnonymousAnalyticsService;
