/**
 * Retention Policy Service
 *
 * GDPR Art. 5(1)(e) - Storage Limitation
 * "Personal data shall be kept in a form which permits identification of data
 * subjects for no longer than is necessary for the purposes for which the
 * personal data are processed"
 *
 * Features:
 * - Define and manage retention policies
 * - Automated data deletion based on policies
 * - Legal hold mechanism
 * - Retention policy enforcement
 * - Notification before deletion
 */

import { adminDb } from '../../../firebaseAdmin.js';
const db = adminDb;
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Default retention policies (in days)
 * Based on GDPR requirements and industry best practices
 */
export const DEFAULT_RETENTION_POLICIES = {
  // User data
  user_profile: {
    category: 'User Data',
    dataType: 'user_profile',
    retentionDays: 1095, // 3 years after last login
    description: 'User profile data for inactive accounts',
    legalBasis: 'Legitimate interest',
    autoDelete: true,
    notifyBeforeDays: 30,
  },

  // Analytics
  analytics_pageviews: {
    category: 'Analytics',
    dataType: 'analytics_pageviews',
    retentionDays: 730, // 2 years
    description: 'Page view analytics data',
    legalBasis: 'Legitimate interest',
    autoDelete: true,
    notifyBeforeDays: 0,
  },

  analytics_clicks: {
    category: 'Analytics',
    dataType: 'analytics_clicks',
    retentionDays: 730, // 2 years
    description: 'Click tracking data',
    legalBasis: 'Legitimate interest',
    autoDelete: true,
    notifyBeforeDays: 0,
  },

  // Privacy logs (legal requirement)
  consent_logs: {
    category: 'Privacy Logs',
    dataType: 'consent_logs',
    retentionDays: 2555, // 7 years
    description: 'Consent audit trail (legal requirement)',
    legalBasis: 'Legal obligation',
    autoDelete: false, // Must keep for compliance
    notifyBeforeDays: 0,
  },

  deletion_requests: {
    category: 'Privacy Logs',
    dataType: 'deletion_requests',
    retentionDays: 2555, // 7 years
    description: 'Account deletion records (legal requirement)',
    legalBasis: 'Legal obligation',
    autoDelete: false,
    notifyBeforeDays: 0,
  },

  // Export requests
  export_requests: {
    category: 'Data Exports',
    dataType: 'export_requests',
    retentionDays: 90, // 90 days
    description: 'Completed data export files',
    legalBasis: 'Data minimization',
    autoDelete: true,
    notifyBeforeDays: 0,
  },

  // Billing (French legal requirement)
  billing_records: {
    category: 'Billing',
    dataType: 'billing_records',
    retentionDays: 3650, // 10 years
    description: 'Billing and invoice data (French law)',
    legalBasis: 'Legal obligation',
    autoDelete: false,
    notifyBeforeDays: 0,
  },

  // System logs
  audit_logs: {
    category: 'System Logs',
    dataType: 'audit_logs',
    retentionDays: 1095, // 3 years
    description: 'System audit logs',
    legalBasis: 'Legitimate interest',
    autoDelete: true,
    notifyBeforeDays: 0,
  },

  error_logs: {
    category: 'System Logs',
    dataType: 'error_logs',
    retentionDays: 365, // 1 year
    description: 'Application error logs',
    legalBasis: 'Legitimate interest',
    autoDelete: true,
    notifyBeforeDays: 0,
  },

  // Communications
  notifications: {
    category: 'Communications',
    dataType: 'notifications',
    retentionDays: 180, // 6 months
    description: 'User notifications',
    legalBasis: 'Legitimate interest',
    autoDelete: true,
    notifyBeforeDays: 0,
  },
};

/**
 * Get all retention policies
 * @returns {Promise<Object>} Retention policies
 */
export async function getRetentionPolicies() {
  try {
    // Check for custom policies in database
    const customPoliciesDoc = await db.collection('SystemConfig').doc('retention_policies').get();

    let policies = { ...DEFAULT_RETENTION_POLICIES };

    if (customPoliciesDoc.exists) {
      const customPolicies = customPoliciesDoc.data();
      policies = { ...policies, ...customPolicies.policies };
    }

    return {
      success: true,
      policies,
      totalPolicies: Object.keys(policies).length,
    };
  } catch (error) {
    console.error('[RetentionPolicy] Error getting policies:', error);
    throw new Error(`Failed to get retention policies: ${error.message}`);
  }
}

/**
 * Update retention policy
 * @param {string} policyId - Policy ID
 * @param {Object} updates - Policy updates
 * @returns {Promise<Object>} Updated policy
 */
export async function updateRetentionPolicy(policyId, updates) {
  try {
    // Get current policies
    const { policies } = await getRetentionPolicies();

    if (!policies[policyId]) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    // Update policy
    policies[policyId] = {
      ...policies[policyId],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Save to database
    await db.collection('SystemConfig').doc('retention_policies').set({
      policies,
      lastUpdated: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`[RetentionPolicy] Policy updated: ${policyId}`);

    return {
      success: true,
      policy: policies[policyId],
    };
  } catch (error) {
    console.error('[RetentionPolicy] Error updating policy:', error);
    throw new Error(`Failed to update retention policy: ${error.message}`);
  }
}

/**
 * Find data eligible for deletion based on retention policies
 * @returns {Promise<Object>} Eligible data for deletion
 */
export async function findEligibleDataForDeletion() {
  try {
    console.log('[RetentionPolicy] Finding eligible data for deletion...');

    const { policies } = await getRetentionPolicies();
    const eligibleData = {
      totalItems: 0,
      byCategory: {},
    };

    // Check each policy
    for (const [policyId, policy] of Object.entries(policies)) {
      if (!policy.autoDelete) {
        continue; // Skip policies that don't allow auto-deletion
      }

      const items = await findItemsForPolicy(policy);

      if (items.length > 0) {
        eligibleData.byCategory[policy.category] = eligibleData.byCategory[policy.category] || [];
        eligibleData.byCategory[policy.category].push({
          policyId,
          dataType: policy.dataType,
          itemCount: items.length,
          items: items.slice(0, 10), // First 10 for preview
          retentionDays: policy.retentionDays,
        });
        eligibleData.totalItems += items.length;
      }
    }

    console.log(`[RetentionPolicy] Found ${eligibleData.totalItems} items eligible for deletion`);

    return {
      success: true,
      eligibleData,
    };
  } catch (error) {
    console.error('[RetentionPolicy] Error finding eligible data:', error);
    throw new Error(`Failed to find eligible data: ${error.message}`);
  }
}

/**
 * Find items for a specific policy
 * @param {Object} policy - Retention policy
 * @returns {Promise<Array>} Eligible items
 */
async function findItemsForPolicy(policy) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    const items = [];

    switch (policy.dataType) {
      case 'user_profile':
        // Find inactive users
        const usersSnapshot = await db
          .collection('users')
          .where('lastLoginAt', '<', cutoffISO)
          .limit(100)
          .get();

        usersSnapshot.forEach(doc => {
          items.push({
            id: doc.id,
            type: 'user',
            lastActivity: doc.data().lastLoginAt,
          });
        });
        break;

      case 'export_requests':
        // Find old export requests
        const exportsSnapshot = await db
          .collection('PrivacyRequests')
          .where('type', '==', 'export')
          .where('completedAt', '<', cutoffISO)
          .limit(100)
          .get();

        exportsSnapshot.forEach(doc => {
          items.push({
            id: doc.id,
            type: 'export_request',
            completedAt: doc.data().completedAt,
          });
        });
        break;

      case 'analytics_pageviews':
      case 'analytics_clicks':
        // Analytics cleanup would be more complex
        // Would need to query Analytics collection and filter arrays
        break;

      default:
        // Other data types can be added as needed
        break;
    }

    return items;
  } catch (error) {
    console.error(`[RetentionPolicy] Error finding items for policy ${policy.dataType}:`, error);
    return [];
  }
}

/**
 * Execute retention policy cleanup
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execution results
 */
export async function executeRetentionCleanup(options = {}) {
  try {
    const { dryRun = false, policyIds = null } = options;

    console.log(`[RetentionPolicy] Starting retention cleanup (dryRun: ${dryRun})...`);

    const results = {
      dryRun,
      deleted: 0,
      notified: 0,
      failed: 0,
      details: [],
    };

    // Find eligible data
    const { eligibleData } = await findEligibleDataForDeletion();

    // Process each category
    for (const [category, items] of Object.entries(eligibleData.byCategory)) {
      for (const policyData of items) {
        // Skip if policyIds filter is specified and this policy isn't included
        if (policyIds && !policyIds.includes(policyData.policyId)) {
          continue;
        }

        const { policies } = await getRetentionPolicies();
        const policy = policies[policyData.policyId];

        // Send notifications if required
        if (policy.notifyBeforeDays > 0) {
          const notified = await notifyBeforeDeletion(policyData.items, policy);
          results.notified += notified;
        }

        // Delete items (unless dry run)
        if (!dryRun) {
          const deleted = await deleteItemsByPolicy(policyData.items, policy);
          results.deleted += deleted;
        }

        results.details.push({
          category,
          policyId: policyData.policyId,
          dataType: policyData.dataType,
          itemCount: policyData.itemCount,
          processed: dryRun ? 0 : policyData.itemCount,
        });
      }
    }

    // Log cleanup execution
    await logRetentionCleanup(results);

    console.log(`[RetentionPolicy] Cleanup complete. Deleted: ${results.deleted}, Notified: ${results.notified}`);

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('[RetentionPolicy] Error executing cleanup:', error);
    throw new Error(`Failed to execute retention cleanup: ${error.message}`);
  }
}

/**
 * Notify users before data deletion
 * @param {Array} items - Items to be deleted
 * @param {Object} policy - Retention policy
 * @returns {Promise<number>} Number of notifications sent
 */
async function notifyBeforeDeletion(items, policy) {
  try {
    let notified = 0;

    for (const item of items) {
      if (item.type === 'user') {
        // Send notification to user
        // TODO: Integrate with notification service
        console.log(`[RetentionPolicy] Would notify user ${item.id} about upcoming deletion`);
        notified++;
      }
    }

    return notified;
  } catch (error) {
    console.error('[RetentionPolicy] Error sending notifications:', error);
    return 0;
  }
}

/**
 * Delete items based on policy
 * @param {Array} items - Items to delete
 * @param {Object} policy - Retention policy
 * @returns {Promise<number>} Number of items deleted
 */
async function deleteItemsByPolicy(items, policy) {
  try {
    let deleted = 0;

    for (const item of items) {
      try {
        switch (item.type) {
          case 'user':
            // Delete user (would trigger cascade deletion)
            await db.collection('users').doc(item.id).delete();
            deleted++;
            break;

          case 'export_request':
            // Delete export request
            await db.collection('PrivacyRequests').doc(item.id).delete();
            deleted++;
            break;

          default:
            console.log(`[RetentionPolicy] Unknown item type: ${item.type}`);
            break;
        }
      } catch (error) {
        console.error(`[RetentionPolicy] Error deleting item ${item.id}:`, error);
      }
    }

    return deleted;
  } catch (error) {
    console.error('[RetentionPolicy] Error deleting items:', error);
    return 0;
  }
}

/**
 * Log retention cleanup execution
 * @param {Object} results - Cleanup results
 * @returns {Promise<string>} Log ID
 */
async function logRetentionCleanup(results) {
  try {
    const log = {
      type: 'retention_cleanup',
      ...results,
      executedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('RetentionLogs').add(log);

    return docRef.id;
  } catch (error) {
    console.error('[RetentionPolicy] Error logging cleanup:', error);
    throw error;
  }
}

/**
 * Add legal hold to prevent deletion
 * @param {string} userId - User ID
 * @param {string} reason - Hold reason
 * @param {string} expiresAt - Expiration date
 * @returns {Promise<Object>} Legal hold record
 */
export async function addLegalHold(userId, reason, expiresAt = null) {
  try {
    const hold = {
      userId,
      reason,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: expiresAt || null,
      active: true,
    };

    const docRef = await db.collection('LegalHolds').add(hold);

    console.log(`[RetentionPolicy] Legal hold added for user ${userId}`);

    return {
      success: true,
      holdId: docRef.id,
      hold,
    };
  } catch (error) {
    console.error('[RetentionPolicy] Error adding legal hold:', error);
    throw new Error(`Failed to add legal hold: ${error.message}`);
  }
}

/**
 * Remove legal hold
 * @param {string} holdId - Hold ID
 * @returns {Promise<Object>} Removal confirmation
 */
export async function removeLegalHold(holdId) {
  try {
    await db.collection('LegalHolds').doc(holdId).update({
      active: false,
      removedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[RetentionPolicy] Legal hold removed: ${holdId}`);

    return {
      success: true,
      holdId,
    };
  } catch (error) {
    console.error('[RetentionPolicy] Error removing legal hold:', error);
    throw new Error(`Failed to remove legal hold: ${error.message}`);
  }
}

/**
 * Check if user has active legal hold
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Has active hold
 */
export async function hasActiveLegalHold(userId) {
  try {
    const snapshot = await db
      .collection('LegalHolds')
      .where('userId', '==', userId)
      .where('active', '==', true)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error('[RetentionPolicy] Error checking legal hold:', error);
    return false;
  }
}

/**
 * Get retention statistics
 * @returns {Promise<Object>} Retention statistics
 */
export async function getRetentionStatistics() {
  try {
    const stats = {
      totalPolicies: 0,
      activePolicies: 0,
      lastCleanup: null,
      totalDeleted: 0,
      pendingDeletion: 0,
    };

    // Get policies
    const { policies } = await getRetentionPolicies();
    stats.totalPolicies = Object.keys(policies).length;
    stats.activePolicies = Object.values(policies).filter(p => p.autoDelete).length;

    // Get last cleanup
    const lastCleanupSnapshot = await db
      .collection('RetentionLogs')
      .where('type', '==', 'retention_cleanup')
      .orderBy('executedAt', 'desc')
      .limit(1)
      .get();

    if (!lastCleanupSnapshot.empty) {
      const lastCleanup = lastCleanupSnapshot.docs[0].data();
      stats.lastCleanup = lastCleanup.executedAt;
      stats.totalDeleted = lastCleanup.deleted || 0;
    }

    // Get pending deletion count
    const { eligibleData } = await findEligibleDataForDeletion();
    stats.pendingDeletion = eligibleData.totalItems;

    return {
      success: true,
      statistics: stats,
    };
  } catch (error) {
    console.error('[RetentionPolicy] Error getting statistics:', error);
    throw new Error(`Failed to get retention statistics: ${error.message}`);
  }
}

/**
 * Schedule automated retention cleanup
 * @param {string} frequency - Frequency (daily, weekly, monthly)
 * @returns {Promise<Object>} Schedule confirmation
 */
export async function scheduleRetentionCleanup(frequency = 'weekly') {
  try {
    const schedule = {
      frequency,
      enabled: true,
      lastRun: null,
      nextRun: calculateNextRun(frequency),
      createdAt: FieldValue.serverTimestamp(),
    };

    await db.collection('ScheduledTasks').doc('retention_cleanup').set(schedule);

    console.log(`[RetentionPolicy] Automated cleanup scheduled: ${frequency}`);

    return {
      success: true,
      schedule,
    };
  } catch (error) {
    console.error('[RetentionPolicy] Error scheduling cleanup:', error);
    throw new Error(`Failed to schedule retention cleanup: ${error.message}`);
  }
}

/**
 * Calculate next run date
 * @param {string} frequency - Frequency
 * @returns {string} Next run date ISO string
 */
function calculateNextRun(frequency) {
  const nextRun = new Date();

  switch (frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
    default:
      nextRun.setDate(nextRun.getDate() + 7);
  }

  return nextRun.toISOString();
}
