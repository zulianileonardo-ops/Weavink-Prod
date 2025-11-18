'use client';

/**
 * Client-side service for managing user consent operations
 * Handles all consent-related API calls following GDPR compliance
 *
 * @class ConsentService
 * @description Provides methods to:
 * - Retrieve user consents
 * - Grant new consents
 * - Withdraw existing consents
 * - Access consent history
 */

import { ContactApiClient } from '@/lib/services/core/ApiClient';
import { CONSENT_ACTIONS } from '@/lib/services/constants';

export class ConsentService {
  /**
   * Retrieve all consents for the current user
   * @returns {Promise<Object>} User consent data including all consent types and their status
   * @throws {Error} If the API request fails
   *
   * @example
   * const consents = await ConsentService.getUserConsents();
   * // Returns: { analytics_basic: { status: 'granted', timestamp: '...' }, ... }
   */
  static async getUserConsents() {
    try {
      return await ContactApiClient.get('/api/user/privacy/consent');
    } catch (error) {
      console.error('❌ [ConsentService] Error fetching user consents:', error);
      throw error;
    }
  }

  /**
   * Grant a specific consent type
   * @param {string} consentType - The type of consent to grant (e.g., 'analytics_basic', 'marketing')
   * @param {Object} metadata - Additional metadata for the consent record
   * @param {string} metadata.version - Consent version (default: '1.0')
   * @param {string} metadata.source - Source of the consent (default: 'user_settings')
   * @returns {Promise<Object>} Confirmation of the granted consent
   * @throws {Error} If the API request fails
   *
   * @example
   * await ConsentService.grantConsent('analytics_basic', {
   *   version: '1.0',
   *   source: 'privacy_settings'
   * });
   */
  static async grantConsent(consentType, metadata = {}) {
    try {
      const payload = {
        consentType,
        action: CONSENT_ACTIONS.GRANTED,
        version: metadata.version || '1.0',
        source: metadata.source || 'user_settings',
        ...metadata,
      };

      return await ContactApiClient.post('/api/user/privacy/consent', payload);
    } catch (error) {
      console.error(`❌ [ConsentService] Error granting consent for ${consentType}:`, error);
      throw error;
    }
  }

  /**
   * Withdraw a specific consent type
   * @param {string} consentType - The type of consent to withdraw
   * @param {Object} metadata - Additional metadata for the withdrawal record
   * @param {string} metadata.reason - Reason for withdrawal (optional)
   * @param {string} metadata.source - Source of the withdrawal (default: 'user_settings')
   * @returns {Promise<Object>} Confirmation of the withdrawn consent
   * @throws {Error} If the API request fails
   *
   * @example
   * await ConsentService.withdrawConsent('analytics_basic', {
   *   reason: 'User opted out',
   *   source: 'privacy_settings'
   * });
   */
  static async withdrawConsent(consentType, metadata = {}) {
    try {
      const payload = {
        consentType,
        action: CONSENT_ACTIONS.WITHDRAWN,
        reason: metadata.reason || 'User request',
        source: metadata.source || 'user_settings',
        ...metadata,
      };

      return await ContactApiClient.post('/api/user/privacy/consent', payload);
    } catch (error) {
      console.error(`❌ [ConsentService] Error withdrawing consent for ${consentType}:`, error);
      throw error;
    }
  }

  /**
   * Get consent history for a specific consent type or all consents
   * @param {string|null} consentType - The type of consent to get history for (null for all)
   * @param {number} limit - Maximum number of history records to retrieve (default: 50)
   * @returns {Promise<Array>} Array of consent history records
   * @throws {Error} If the API request fails
   *
   * @example
   * // Get history for specific consent type
   * const history = await ConsentService.getConsentHistory('analytics_basic', 100);
   *
   * // Get all consent history
   * const allHistory = await ConsentService.getConsentHistory(null, 50);
   */
  static async getConsentHistory(consentType = null, limit = 50) {
    try {
      // Build query parameters
      const params = new URLSearchParams({
        history: 'true',
        limit: limit.toString(),
      });

      if (consentType) {
        params.append('type', consentType);
      }

      return await ContactApiClient.get(`/api/user/privacy/consent?${params.toString()}`);
    } catch (error) {
      console.error('❌ [ConsentService] Error fetching consent history:', error);
      throw error;
    }
  }
}
