/**
 * Test Helper Functions
 *
 * Provides helper functions for RGPD tests including:
 * - Creating test users
 * - Cleaning up test data
 * - Mocking exports
 */

import { adminDb, adminAuth } from '../../../firebaseAdmin.js';
const db = adminDb;

/**
 * Create a test user in Firestore
 * @param {string} userId - User ID
 * @param {Object} userData - User data
 * @returns {Promise<void>}
 */
export async function createTestUser(userId, userData = {}) {
  try {
    const defaultUserData = {
      uid: userId,
      email: `${userId}@test.com`,
      displayName: 'Test User',
      createdAt: new Date().toISOString(),
      consents: {},
      settings: {
        isPublic: false,
      },
      profile: {
        firstName: 'Test',
        lastName: 'User',
      },
      ...userData,
    };

    await db.collection('users').doc(userId).set(defaultUserData);
    console.log(`✅ Test user created: ${userId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to create test user: ${userId}`, error);
    throw error;
  }
}

/**
 * Delete a test user and all associated data
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function deleteTestUser(userId) {
  try {
    // Delete user document
    await db.collection('users').doc(userId).delete();

    // Delete consent logs
    const consentLogs = await db.collection('ConsentLogs').where('userId', '==', userId).get();
    const batch1 = db.batch();
    consentLogs.forEach((doc) => {
      batch1.delete(doc.ref);
    });
    await batch1.commit();

    // Delete privacy requests
    const privacyRequests = await db.collection('PrivacyRequests').where('userId', '==', userId).get();
    const batch2 = db.batch();
    privacyRequests.forEach((doc) => {
      batch2.delete(doc.ref);
    });
    await batch2.commit();

    // Delete Phase 3 test data
    const auditLogs = await db.collection('AuditLogs').where('userId', '==', userId).get();
    const batch3 = db.batch();
    auditLogs.forEach((doc) => {
      batch3.delete(doc.ref);
    });
    await batch3.commit();

    const legalHolds = await db.collection('LegalHolds').where('userId', '==', userId).get();
    const batch4 = db.batch();
    legalHolds.forEach((doc) => {
      batch4.delete(doc.ref);
    });
    await batch4.commit();

    console.log(`✅ Test user deleted: ${userId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to delete test user: ${userId}`, error);
    // Don't throw - cleanup is best effort
    return { success: false, error: error.message };
  }
}

/**
 * Cleanup test user (alias for deleteTestUser)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function cleanupTestUser(userId) {
  return deleteTestUser(userId);
}

/**
 * Request data export (simplified for testing)
 * @param {string} userId - User ID
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Export result with files
 */
export async function requestDataExport(userId, options = {}) {
  try {
    // Create test user if doesn't exist
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      await createTestUser(userId);
    }

    // Generate mock export files
    const userData = userDoc.exists ? userDoc.data() : {};
    const files = {
      'user-data.json': {
        description: 'User profile data',
        format: 'JSON',
        content: JSON.stringify({
          user: {
            uid: userId,
            email: userData.email || `${userId}@test.com`,
            displayName: userData.displayName || 'Test User',
          },
          exportDate: new Date().toISOString(),
        }),
      },
      'README.txt': {
        description: 'Export information',
        format: 'TEXT',
        content: `GDPR Data Export\n\nExport Date: ${new Date().toISOString()}\n\nFiles Included:\n- user-data.json: Your profile data\n`,
      },
    };

    // Add contacts files if requested
    if (options.includeContacts) {
      files['contacts.json'] = {
        description: 'Your contacts',
        format: 'JSON',
        content: JSON.stringify([]),
      };

      files['contacts.csv'] = {
        description: 'Your contacts in CSV format',
        format: 'CSV',
        content: 'First Name,Last Name,Email,Phone\n',
      };

      files['contacts.vcf'] = {
        description: 'Your contacts in vCard format',
        format: 'vCard',
        content: 'BEGIN:VCARD\nVERSION:3.0\nEND:VCARD\n',
      };
    }

    // Create privacy request record
    const requestId = `export-${Date.now()}`;
    await db.collection('PrivacyRequests').doc(requestId).set({
      userId,
      type: 'export',
      status: 'completed',
      requestedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      files: files,
    });

    return {
      success: true,
      requestId,
      files,
    };
  } catch (error) {
    console.error('Error requesting data export:', error);
    throw error;
  }
}

/**
 * Get export status
 * @param {string} userId - User ID
 * @param {string} requestId - Request ID
 * @returns {Promise<Object>} Export status
 */
export async function getExportStatus(userId, requestId) {
  try {
    const doc = await db.collection('PrivacyRequests').doc(requestId).get();

    if (!doc.exists) {
      return {
        success: false,
        request: null,
      };
    }

    const request = doc.data();

    return {
      success: true,
      request: {
        ...request,
        id: doc.id,
      },
    };
  } catch (error) {
    console.error('Error getting export status:', error);
    throw error;
  }
}

/**
 * Delete export request
 * @param {string} userId - User ID
 * @param {string} requestId - Request ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteExportRequest(userId, requestId) {
  try {
    await db.collection('PrivacyRequests').doc(requestId).delete();

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting export request:', error);
    throw error;
  }
}

/**
 * Get deletion status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deletion status
 */
export async function getDeletionStatus(userId) {
  try {
    const snapshot = await db
      .collection('PrivacyRequests')
      .where('userId', '==', userId)
      .where('type', '==', 'deletion')
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return {
        hasPendingDeletion: false,
        deletionRequest: null,
      };
    }

    const doc = snapshot.docs[0];
    const request = doc.data();

    return {
      hasPendingDeletion: true,
      deletionRequest: {
        ...request,
        id: doc.id,
      },
    };
  } catch (error) {
    console.error('Error getting deletion status:', error);
    throw error;
  }
}

/**
 * Request account deletion
 * @param {string} userId - User ID
 * @param {Object} options - Deletion options
 * @returns {Promise<Object>} Deletion request
 */
export async function requestAccountDeletion(userId, options = {}) {
  try {
    const { confirmation, reason, ipAddress, userAgent } = options;

    // Validate confirmation
    if (confirmation !== 'DELETE MY ACCOUNT') {
      throw new Error('Invalid confirmation text. Must type "DELETE MY ACCOUNT"');
    }

    // Check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      // Create test user for testing
      await createTestUser(userId);
    }

    // Check for existing pending deletion
    const existingStatus = await getDeletionStatus(userId);
    if (existingStatus.hasPendingDeletion) {
      throw new Error('User already has a pending deletion request');
    }

    // Create deletion request
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30); // 30 days grace period

    const deletionRequest = {
      userId,
      type: 'deletion',
      status: 'pending',
      requestedAt: new Date().toISOString(),
      scheduledDeletionDate: scheduledDate.toISOString(),
      reason: reason || 'User requested',
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      confirmation: confirmation,
    };

    const docRef = await db.collection('PrivacyRequests').add(deletionRequest);

    return {
      success: true,
      gracePeriodDays: 30,
      deletionRequest: {
        ...deletionRequest,
        id: docRef.id,
      },
    };
  } catch (error) {
    console.error('Error requesting account deletion:', error);
    throw error;
  }
}

/**
 * Cancel deletion request
 * @param {string} userId - User ID
 * @param {Object} metadata - Cancellation metadata
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelDeletionRequest(userId, metadata = {}) {
  try {
    const status = await getDeletionStatus(userId);

    if (!status.hasPendingDeletion) {
      throw new Error('No pending deletion request found');
    }

    // Update status to cancelled
    await db.collection('PrivacyRequests').doc(status.deletionRequest.id).update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationIpAddress: metadata.ipAddress || null,
      cancellationUserAgent: metadata.userAgent || null,
    });

    return {
      success: true,
      cancelledAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error cancelling deletion request:', error);
    throw error;
  }
}

/**
 * Process pending deletions (mock for testing)
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
export async function processPendingDeletions(options = {}) {
  try {
    // Mock function - in real scenario would find and process expired deletions
    return {
      success: true,
      processed: 0,
      dryRun: options.dryRun || false,
    };
  } catch (error) {
    console.error('Error processing pending deletions:', error);
    throw error;
  }
}
