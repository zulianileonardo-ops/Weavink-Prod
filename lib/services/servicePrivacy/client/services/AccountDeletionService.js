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
export class AccountDeletionService {
  /**
   * Get authentication token from Firebase
   * @private
   * @returns {Promise<string>} Firebase ID token
   * @throws {Error} If user is not authenticated
   */
  static async getAuthToken() {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User must be authenticated to access account deletion services');
    }

    return await user.getIdToken();
  }

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
      const token = await this.getAuthToken();

      const response = await fetch('/api/user/privacy/delete-account', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch deletion status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching account deletion status:', error);
      throw error;
    }
  }

  /**
   * Request account deletion
   * @param {string} confirmation - Confirmation text (must be "DELETE MY ACCOUNT")
   * @param {string} reason - Reason for deletion
   * @param {boolean} immediate - Whether to delete immediately (default: false - uses 30-day grace period)
   * @returns {Promise<Object>} Deletion request confirmation
   * @throws {Error} If the API request fails or confirmation is invalid
   *
   * @example
   * // Request deletion with 30-day grace period
   * const result = await AccountDeletionService.requestDeletion(
   *   'DELETE MY ACCOUNT',
   *   'No longer needed',
   *   false
   * );
   * // Returns:
   * // {
   * //   success: true,
   * //   requestId: 'del_123456',
   * //   scheduledDate: '2025-12-08T00:00:00Z',
   * //   message: 'Account deletion scheduled...'
   * // }
   *
   * @example
   * // Request immediate deletion (no grace period)
   * const result = await AccountDeletionService.requestDeletion(
   *   'DELETE MY ACCOUNT',
   *   'Immediate deletion required',
   *   true
   * );
   */
  static async requestDeletion(confirmation, reason, immediate = false) {
    try {
      // Validate confirmation text
      if (confirmation !== 'DELETE MY ACCOUNT') {
        throw new Error('Invalid confirmation. Please type "DELETE MY ACCOUNT" exactly.');
      }

      if (!reason || reason.trim().length === 0) {
        throw new Error('Deletion reason is required');
      }

      const token = await this.getAuthToken();

      const response = await fetch('/api/user/privacy/delete-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmation,
          reason: reason.trim(),
          immediate
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to request account deletion: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error requesting account deletion:', error);
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
      const token = await this.getAuthToken();

      const response = await fetch('/api/user/privacy/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to cancel account deletion: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error cancelling account deletion:', error);
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
      const token = await this.getAuthToken();

      const response = await fetch(`/api/user/privacy/delete-account?requestId=${requestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch deletion details: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching deletion details for ${requestId}:`, error);
      throw error;
    }
  }
}
