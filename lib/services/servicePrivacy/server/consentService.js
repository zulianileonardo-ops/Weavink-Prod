/**
 * Consent Management Service
 * Handles GDPR consent tracking and management
 * Compliant with RGPD Art. 7 (Conditions for consent)
 */

import { adminDb } from '../../../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { CONSENT_TYPES, CONSENT_ACTIONS } from '../../constants.js';

// Alias adminDb as db for compatibility
const db = adminDb;

/**
 * Consent Management Service
 * Static class for managing user consents and consent history
 */
class ConsentService {
  /**
   * Grant or update consent
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent (from CONSENT_TYPES)
   * @param {string} action - Action (granted, withdrawn, updated)
   * @param {Object} metadata - Additional metadata (IP, user agent, etc.)
   * @returns {Promise<Object>} Consent log entry
   */
  static async recordConsent(userId, consentType, action, metadata = {}) {
    try {
      // Validate consent type
      if (!Object.values(CONSENT_TYPES).includes(consentType)) {
        throw new Error(`Invalid consent type: ${consentType}`);
      }

      // Validate action
      if (!Object.values(CONSENT_ACTIONS).includes(action)) {
        throw new Error(`Invalid consent action: ${action}`);
      }

      // Create consent log entry
      const consentLog = {
        userId,
        consentType,
        action,
        timestamp: FieldValue.serverTimestamp(),
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
        consentText: metadata.consentText || null,
        version: metadata.version || '1.0', // Version of terms/policy
        metadata: metadata.additionalData || {},
      };

      // Add to ConsentLogs collection
      const docRef = await db.collection('ConsentLogs').add(consentLog);

      // Update user's current consent status
      const userConsentRef = db.collection('users').doc(userId);
      const consentUpdate = {
        [`consents.${consentType}`]: {
          status: action === CONSENT_ACTIONS.GRANTED ? true : false,
          lastUpdated: FieldValue.serverTimestamp(),
          version: metadata.version || '1.0',
        },
        updatedAt: FieldValue.serverTimestamp(),
      };

      await userConsentRef.update(consentUpdate);

      console.log(`✅ [ConsentService] Consent ${action} for user ${userId}: ${consentType}`);

      return {
        success: true,
        logId: docRef.id,
        consentLog: {
          ...consentLog,
          id: docRef.id,
        },
      };
    } catch (error) {
      console.error('❌ [ConsentService] Error recording consent:', error);
      throw new Error(`Failed to record consent: ${error.message}`);
    }
  }

  /**
   * Get user's current consent status
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Current consent status for all types
   */
  static async getUserConsents(userId) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const consents = userData.consents || {};

      // Build consent status object
      const consentStatus = {};
      for (const [key, value] of Object.entries(CONSENT_TYPES)) {
        consentStatus[value] = consents[value] || {
          status: false,
          lastUpdated: null,
          version: null,
        };
      }

      return {
        success: true,
        consents: consentStatus,
      };
    } catch (error) {
      console.error('❌ [ConsentService] Error getting user consents:', error);
      throw new Error(`Failed to get user consents: ${error.message}`);
    }
  }

  /**
   * Get consent history for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options (limit, consentType, startDate, endDate)
   * @returns {Promise<Array>} Array of consent log entries
   */
  static async getConsentHistory(userId, options = {}) {
    try {
      const { limit = 100, consentType = null, startDate = null, endDate = null } = options;

      let query = db.collection('ConsentLogs').where('userId', '==', userId);

      // Filter by consent type if specified
      if (consentType) {
        query = query.where('consentType', '==', consentType);
      }

      // Filter by date range if specified
      if (startDate) {
        query = query.where('timestamp', '>=', startDate);
      }
      if (endDate) {
        query = query.where('timestamp', '<=', endDate);
      }

      // Order by timestamp descending and limit
      query = query.orderBy('timestamp', 'desc').limit(limit);

      const snapshot = await query.get();
      const history = [];

      snapshot.forEach((doc) => {
        history.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return {
        success: true,
        history,
        count: history.length,
      };
    } catch (error) {
      console.error('❌ [ConsentService] Error getting consent history:', error);
      throw new Error(`Failed to get consent history: ${error.message}`);
    }
  }

  /**
   * Check if user has granted a specific consent
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent to check
   * @returns {Promise<boolean>} True if consent is granted
   */
  static async hasConsent(userId, consentType) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        return false;
      }

      const userData = userDoc.data();
      const consents = userData.consents || {};

      return consents[consentType]?.status === true;
    } catch (error) {
      console.error('❌ [ConsentService] Error checking consent:', error);
      return false;
    }
  }

  /**
   * Batch grant multiple consents (used during signup)
   * @param {string} userId - User ID
   * @param {Array<string>} consentTypes - Array of consent types to grant
   * @param {Object} metadata - Metadata (IP, user agent, etc.)
   * @returns {Promise<Object>} Result of batch operation
   */
  static async batchGrantConsents(userId, consentTypes, metadata = {}) {
    try {
      const results = [];

      for (const consentType of consentTypes) {
        const result = await this.recordConsent(userId, consentType, CONSENT_ACTIONS.GRANTED, metadata);
        results.push(result);
      }

      console.log(`✅ [ConsentService] Batch granted ${results.length} consents for user ${userId}`);

      return {
        success: true,
        count: results.length,
        results,
      };
    } catch (error) {
      console.error('❌ [ConsentService] Error in batch grant consents:', error);
      throw new Error(`Failed to batch grant consents: ${error.message}`);
    }
  }

  /**
   * Withdraw consent (GDPR right to withdraw consent - Art. 7.3)
   * @param {string} userId - User ID
   * @param {string} consentType - Type of consent to withdraw
   * @param {Object} metadata - Metadata
   * @returns {Promise<Object>} Result of withdrawal
   */
  static async withdrawConsent(userId, consentType, metadata = {}) {
    try {
      return await this.recordConsent(userId, consentType, CONSENT_ACTIONS.WITHDRAWN, metadata);
    } catch (error) {
      console.error('❌ [ConsentService] Error withdrawing consent:', error);
      throw new Error(`Failed to withdraw consent: ${error.message}`);
    }
  }

  /**
   * Get consent statistics for admin dashboard
   * @returns {Promise<Object>} Consent statistics
   */
  static async getConsentStatistics() {
    try {
      const stats = {};

      // Get total users
      const usersSnapshot = await db.collection('users').count().get();
      const totalUsers = usersSnapshot.data().count;

      // For each consent type, count how many users have granted it
      for (const consentType of Object.values(CONSENT_TYPES)) {
        const grantedSnapshot = await db
          .collection('users')
          .where(`consents.${consentType}.status`, '==', true)
          .count()
          .get();

        stats[consentType] = {
          granted: grantedSnapshot.data().count,
          percentage: totalUsers > 0 ? ((grantedSnapshot.data().count / totalUsers) * 100).toFixed(2) : 0,
        };
      }

      return {
        success: true,
        totalUsers,
        consentStats: stats,
      };
    } catch (error) {
      console.error('❌ [ConsentService] Error getting consent statistics:', error);
      throw new Error(`Failed to get consent statistics: ${error.message}`);
    }
  }

  /**
   * Export consent history for a user (for GDPR data export)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Complete consent data
   */
  static async exportConsentData(userId) {
    try {
      const currentConsents = await this.getUserConsents(userId);
      const history = await this.getConsentHistory(userId, { limit: 1000 });

      return {
        currentConsents: currentConsents.consents,
        history: history.history,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ [ConsentService] Error exporting consent data:', error);
      throw new Error(`Failed to export consent data: ${error.message}`);
    }
  }
}

export { ConsentService };

// For backwards compatibility, also export constants
// (though they should be imported from @/lib/services/constants)
export { CONSENT_TYPES, CONSENT_ACTIONS };
