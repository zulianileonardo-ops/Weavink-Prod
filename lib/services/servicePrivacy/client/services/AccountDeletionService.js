'use client';

/**
 * Client-side service for managing account deletion operations
 * Handles GDPR right to erasure requests (Article 17)
 *
 * @class AccountDeletionService
 * @description Provides methods to:
 * - Check account deletion status
 * - Request account deletion (with 30-day grace period)
 * - Cancel pending account deletion
 */

import { ContactApiClient } from '@/lib/services/core/ApiClient';
import { DELETION_CONFIRMATION_TEXTS } from '@/lib/services/constants';

export class AccountDeletionService {
  /**
   * Get the current account deletion status
   * @returns {Promise<Object>} Deletion status information
   * @throws {Error} If the API request fails
   *
   * @example
   * const status = await AccountDeletionService.getDeletionStatus();
   * // Returns:
   * // {
   * //   hasPendingDeletion: true,
   * //   requestId: 'del_123456',
   * //   scheduledDate: '2025-12-08T00:00:00Z',
   * //   daysRemaining: 25,
   * //   reason: 'User request'
   * // }
   * // or
   * // { hasPendingDeletion: false }
   */
  static async getDeletionStatus() {
    try {
      return await ContactApiClient.get('/api/user/privacy/delete-account');
    } catch (error) {
      console.error('❌ [AccountDeletionService] Error fetching account deletion status:', error);
      throw error;
    }
  }

  /**
   * Request account deletion
   * @param {string} confirmation - Confirmation text (must match locale-specific text exactly)
   * @param {string} reason - Reason for deletion
   * @param {boolean} immediate - Whether to delete immediately (default: false - uses 30-day grace period)
   * @param {string} locale - User's current language locale (en, fr, es, zh, vm). Defaults to 'en'
   * @returns {Promise<Object>} Deletion request confirmation
   * @throws {Error} If the API request fails or confirmation is invalid
   *
   * @example
   * // Request deletion with 30-day grace period (English)
   * const result = await AccountDeletionService.requestDeletion(
   *   'DELETE MY ACCOUNT',
   *   'No longer needed',
   *   false,
   *   'en'
   * );
   *
   * @example
   * // Request deletion in French
   * const result = await AccountDeletionService.requestDeletion(
   *   'SUPPRIMER MON COMPTE',
   *   'Je ne veux plus utiliser le service',
   *   false,
   *   'fr'
   * );
   */
  static async requestDeletion(confirmation, reason, immediate = false, locale = 'en') {
    try {
      // Get the expected confirmation text for the user's locale
      const expectedConfirmation = DELETION_CONFIRMATION_TEXTS[locale] || DELETION_CONFIRMATION_TEXTS.en;

      // Validate confirmation text
      if (confirmation !== expectedConfirmation) {
        throw new Error(`Invalid confirmation. Please type "${expectedConfirmation}" exactly.`);
      }

      if (!reason || reason.trim().length === 0) {
        throw new Error('Deletion reason is required');
      }

      const payload = {
        confirmation,
        reason: reason.trim(),
        immediate,
        locale,
      };

      return await ContactApiClient.post('/api/user/privacy/delete-account', payload);
    } catch (error) {
      console.error('❌ [AccountDeletionService] Error requesting account deletion:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending account deletion request
   * @returns {Promise<Object>} Cancellation confirmation
   * @throws {Error} If the API request fails or no deletion is pending
   *
   * @example
   * const result = await AccountDeletionService.cancelDeletion();
   * // Returns:
   * // {
   * //   success: true,
   * //   message: 'Account deletion cancelled successfully'
   * // }
   */
  static async cancelDeletion() {
    try {
      return await ContactApiClient.delete('/api/user/privacy/delete-account');
    } catch (error) {
      console.error('❌ [AccountDeletionService] Error cancelling account deletion:', error);
      throw error;
    }
  }

  /**
   * Get deletion request details by ID
   * @param {string} requestId - The deletion request ID
   * @returns {Promise<Object>} Deletion request details
   * @throws {Error} If the API request fails
   *
   * @example
   * const details = await AccountDeletionService.getDeletionDetails('del_123456');
   */
  static async getDeletionDetails(requestId) {
    try {
      return await ContactApiClient.get(`/api/user/privacy/delete-account?requestId=${requestId}`);
    } catch (error) {
      console.error(`❌ [AccountDeletionService] Error fetching deletion details for ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a contact has a pending account deletion
   * Used to display warnings when viewing/editing contacts whose accounts are scheduled for deletion
   * @param {string} contactUserId - The Weavink user ID of the contact (optional if email provided)
   * @param {string} contactEmail - The email address of the contact (optional if userId provided)
   * @returns {Promise<Object>} Deletion status information
   * @throws {Error} If the API request fails
   *
   * @example
   * const status = await AccountDeletionService.getContactDeletionStatus('user123', 'user@example.com');
   * // Returns:
   * // {
   * //   hasPendingDeletion: true,
   * //   userName: 'John Doe',
   * //   scheduledDate: '2025-12-19T00:00:00Z'
   * // }
   * // or
   * // { hasPendingDeletion: false }
   */
  static async getContactDeletionStatus(contactUserId, contactEmail) {
    try {
      if (!contactUserId && !contactEmail) {
        return { hasPendingDeletion: false };
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (contactUserId) params.append('contactUserId', contactUserId);
      if (contactEmail) params.append('contactEmail', contactEmail);

      return await ContactApiClient.get(`/api/user/contacts/deletion-status?${params.toString()}`);
    } catch (error) {
      console.error(`❌ [AccountDeletionService] Error checking contact deletion status:`, error);
      // Return false on error instead of throwing - non-critical feature
      return { hasPendingDeletion: false };
    }
  }
}
