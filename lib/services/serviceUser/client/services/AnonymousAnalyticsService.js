/**
 * Anonymous Analytics Service (Client-Side)
 *
 * Client-side service for tracking anonymous, aggregated analytics events.
 * GDPR Compliant: No personal data sent, legitimate interest basis (Article 6(1)(f))
 *
 * @module AnonymousAnalyticsService (Client)
 */

import {
  ANONYMOUS_EVENT_TYPES,
  LINK_TYPES
} from '@/lib/services/serviceAnalytics/constants/anonymousAnalyticsConstants';

/**
 * Anonymous Analytics Service Class
 *
 * Provides methods for sending anonymous analytics events to the server.
 * All methods are static as this is a stateless client-side service.
 */
export class AnonymousAnalyticsService {

  /**
   * Track anonymous view event
   *
   * Called when a user views a profile but has NO analytics consent.
   * Sends only the event type - no user identification data.
   *
   * @returns {Promise<void>}
   *
   * @example
   * // When user has no consent
   * await AnonymousAnalyticsService.trackAnonymousView();
   */
  static async trackAnonymousView() {
    try {
      await fetch('/api/user/analytics/track-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType: ANONYMOUS_EVENT_TYPES.VIEW
        }),
        keepalive: true // Ensure request completes even if page unloads
      });

      // Silent success - no need to log in production
      if (process.env.NODE_ENV === 'development') {
        console.log('[AnonymousAnalytics] ✅ Tracked view anonymously');
      }

    } catch (error) {
      // Silent fail - analytics failures should never break user experience
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AnonymousAnalytics] ❌ Failed to track anonymous view:', error);
      }
    }
  }

  /**
   * Track anonymous click event
   *
   * Called when a user clicks a link but has NO analytics consent.
   * Sends only the link type category - no specific URL or personal data.
   *
   * @param {string} linkType - Type of link clicked (linkedin, website, email, etc.)
   * @returns {Promise<void>}
   *
   * @example
   * // When user clicks LinkedIn link without consent
   * await AnonymousAnalyticsService.trackAnonymousClick('linkedin');
   *
   * @example
   * // When user clicks custom link without consent
   * await AnonymousAnalyticsService.trackAnonymousClick('website');
   */
  static async trackAnonymousClick(linkType) {
    try {
      // Validate link type (fallback to 'other' if invalid)
      const validatedLinkType = this._validateLinkType(linkType);

      await fetch('/api/user/analytics/track-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType: ANONYMOUS_EVENT_TYPES.CLICK,
          linkType: validatedLinkType
        }),
        keepalive: true
      });

      // Silent success - no need to log in production
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AnonymousAnalytics] ✅ Tracked ${validatedLinkType} click anonymously`);
      }

    } catch (error) {
      // Silent fail - analytics failures should never break user experience
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AnonymousAnalytics] ❌ Failed to track anonymous click:', error);
      }
    }
  }

  /**
   * Track anonymous share event
   *
   * Called when a user shares a profile but has NO analytics consent.
   * Sends only the event type - no share destination or personal data.
   *
   * @returns {Promise<void>}
   *
   * @example
   * // When user shares profile without consent
   * await AnonymousAnalyticsService.trackAnonymousShare();
   */
  static async trackAnonymousShare() {
    try {
      await fetch('/api/user/analytics/track-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType: ANONYMOUS_EVENT_TYPES.SHARE
        }),
        keepalive: true
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[AnonymousAnalytics] ✅ Tracked share anonymously');
      }

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AnonymousAnalytics] ❌ Failed to track anonymous share:', error);
      }
    }
  }

  /**
   * Track anonymous QR scan event
   *
   * Called when a user scans a QR code but has NO analytics consent.
   * Sends only the event type - no QR code identifier or personal data.
   *
   * @returns {Promise<void>}
   *
   * @example
   * // When QR code is scanned without consent
   * await AnonymousAnalyticsService.trackAnonymousQRScan();
   */
  static async trackAnonymousQRScan() {
    try {
      await fetch('/api/user/analytics/track-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType: ANONYMOUS_EVENT_TYPES.QR_SCAN
        }),
        keepalive: true
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[AnonymousAnalytics] ✅ Tracked QR scan anonymously');
      }

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AnonymousAnalytics] ❌ Failed to track anonymous QR scan:', error);
      }
    }
  }

  /**
   * Validate link type
   *
   * Ensures link type is one of the valid LINK_TYPES constants.
   * Falls back to 'other' if invalid.
   *
   * @private
   * @param {string} linkType - Link type to validate
   * @returns {string} Validated link type
   */
  static _validateLinkType(linkType) {
    if (!linkType) {
      return LINK_TYPES.OTHER;
    }

    const normalizedType = linkType.toLowerCase().trim();

    // Check if it's a valid link type
    const validTypes = Object.values(LINK_TYPES);
    if (validTypes.includes(normalizedType)) {
      return normalizedType;
    }

    // Fallback to 'other' for unknown types
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[AnonymousAnalytics] Unknown link type: ${linkType}, using 'other'`);
    }

    return LINK_TYPES.OTHER;
  }

  /**
   * Check if anonymous analytics is available
   *
   * Utility method to check if the anonymous analytics endpoint is reachable.
   * Useful for debugging or health checks.
   *
   * @returns {Promise<boolean>} True if anonymous analytics is available
   *
   * @example
   * const isAvailable = await AnonymousAnalyticsService.isAvailable();
   * console.log('Anonymous analytics:', isAvailable ? 'available' : 'unavailable');
   */
  static async isAvailable() {
    try {
      const response = await fetch('/api/user/analytics/track-anonymous', {
        method: 'OPTIONS'
      });

      return response.ok;

    } catch (error) {
      return false;
    }
  }
}

/**
 * Export singleton instance for convenience
 */
export default AnonymousAnalyticsService;
