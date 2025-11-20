/**
 * Account Deletion Service
 * Handles GDPR Art. 17 (Right to Erasure / "Right to be Forgotten")
 * Implements cascade deletion and anonymization
 */

import { adminDb, adminAuth } from '../../../firebaseAdmin.js';

// Alias adminDb as db for compatibility
const db = adminDb;
import { FieldValue } from 'firebase-admin/firestore';
import { EmailService } from '../../server/emailService.js';

/**
 * Request account deletion
 * Creates a deletion request and initiates the process
 * @param {string} userId - User ID to delete
 * @param {Object} metadata - Request metadata
 * @param {Object} options - Deletion options
 * @returns {Promise<Object>} Deletion request details
 */
export async function requestAccountDeletion(userId, metadata = {}, options = {}) {
  try {
    const {
      reason = null,
      immediate = false, // If true, skip waiting period
      keepBillingData = true, // Required by law for 10 years
    } = options;

    console.log(`[AccountDeletion] Deletion requested for user: ${userId}`);

    // 1. Verify user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();

    // 2. Create deletion request record
    const deletionRequest = {
      userId,
      userEmail: userData.email,
      userName: userData.profile?.displayName || userData.username || 'Unknown',
      requestedAt: FieldValue.serverTimestamp(),
      status: 'pending',
      reason,
      immediate,
      keepBillingData,
      scheduledDeletionDate: immediate
        ? new Date()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      completedAt: null,
      steps: {
        userDataDeleted: false,
        contactsNotified: false,
        cascadeCompleted: false,
        billingArchived: false,
        authDeleted: false,
      },
    };

    const docRef = await db.collection('PrivacyRequests').add({
      ...deletionRequest,
      type: 'deletion',
    });

    // 3. Find all users who have this person as a contact
    const usersWithContact = await findUsersWithContact(userId, userData.email);

    // 4. Notify these users about the deletion request
    if (usersWithContact.length > 0) {
      await notifyContactDeletion(userId, usersWithContact, deletionRequest, docRef.id);
    }

    // 5. Mark user account as "pending deletion"
    await db.collection('users').doc(userId).update({
      'privacy.pendingDeletion': true,
      'privacy.deletionRequestId': docRef.id,
      'privacy.deletionRequestedAt': FieldValue.serverTimestamp(),
      'privacy.deletionScheduledFor': deletionRequest.scheduledDeletionDate,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 5.5. Send confirmation email
    try {
      const userLanguage = userData.settings?.defaultLanguage || 'en';
      await EmailService.sendAccountDeletionConfirmationEmail(
        userData.email,
        userData.profile?.displayName || userData.username || 'User',
        deletionRequest.scheduledDeletionDate,
        docRef.id,
        immediate,
        userLanguage
      );
    } catch (emailError) {
      console.error('Failed to send deletion confirmation email:', emailError);
      // Non-blocking: continue even if email fails
    }

    // 6. If immediate deletion, execute it now
    if (immediate) {
      await executeAccountDeletion(userId, docRef.id);
    }

    console.log(`[AccountDeletion] Deletion request created: ${docRef.id}`);

    return {
      success: true,
      requestId: docRef.id,
      deletionRequest: {
        ...deletionRequest,
        id: docRef.id,
      },
      affectedUsers: usersWithContact.length,
      message: immediate
        ? 'Account deletion initiated immediately'
        : 'Account deletion scheduled for 30 days from now',
    };
  } catch (error) {
    console.error('Error requesting account deletion:', error);
    throw new Error(`Failed to request account deletion: ${error.message}`);
  }
}

/**
 * Execute account deletion (called after waiting period or immediately)
 * @param {string} userId - User ID
 * @param {string} requestId - Deletion request ID
 * @returns {Promise<Object>} Deletion result
 */
export async function executeAccountDeletion(userId, requestId) {
  try {
    console.log(`[AccountDeletion] Executing deletion for user: ${userId}`);

    const deletionSteps = [];

    // Step 1: Delete user's own data
    deletionSteps.push(await deleteUserOwnData(userId));

    // Step 2: Cascade delete/anonymize in other users' contact lists
    deletionSteps.push(await cascadeDeleteContact(userId));

    // Step 3: Archive billing data (legal requirement)
    deletionSteps.push(await archiveBillingData(userId));

    // Step 3.5: Send account deletion completed email
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const userLanguage = userData.settings?.defaultLanguage || 'en';
        await EmailService.sendAccountDeletionCompletedEmail(
          userData.email,
          userData.profile?.displayName || userData.username || 'User',
          userLanguage
        );
      }
    } catch (emailError) {
      console.error('Failed to send deletion completed email:', emailError);
      // Non-blocking: continue even if email fails
    }

    // Step 4: Delete Firebase Auth account
    deletionSteps.push(await deleteAuthAccount(userId));

    // Step 5: Update deletion request status
    await db.collection('PrivacyRequests').doc(requestId).update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      steps: {
        userDataDeleted: true,
        contactsNotified: true,
        cascadeCompleted: true,
        billingArchived: true,
        authDeleted: true,
      },
    });

    console.log(`[AccountDeletion] Deletion completed for user: ${userId}`);

    return {
      success: true,
      deletedUserId: userId,
      deletionSteps,
      message: 'Account and all associated data have been deleted',
    };
  } catch (error) {
    console.error('Error executing account deletion:', error);

    // Update request status to failed
    await db.collection('PrivacyRequests').doc(requestId).update({
      status: 'failed',
      error: error.message,
      failedAt: FieldValue.serverTimestamp(),
    });

    throw new Error(`Failed to execute account deletion: ${error.message}`);
  }
}

/**
 * Delete user's own data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deletion result
 */
async function deleteUserOwnData(userId) {
  try {
    console.log(`[AccountDeletion] Deleting user's own data: ${userId}`);

    // 1. Delete user profile
    await db.collection('users').doc(userId).delete();

    // 2. Delete user's contacts
    await db.collection('Contacts').doc(userId).delete();

    // 3. Delete user's groups
    const groupsSnapshot = await db
      .collection('groups')
      .doc(userId)
      .collection('groups')
      .get();

    const groupDeletions = [];
    groupsSnapshot.forEach((doc) => {
      groupDeletions.push(doc.ref.delete());
    });
    await Promise.all(groupDeletions);

    // Delete parent groups document
    await db.collection('groups').doc(userId).delete();

    // 4. Anonymize analytics (keep aggregated data, remove PII)
    await anonymizeAnalytics(userId);

    // 5. Delete consent logs (keep audit trail for 12 months per legal requirement)
    // We'll mark them as "deleted user" instead of fully deleting
    await db.collection('ConsentLogs').where('userId', '==', userId).get().then((snapshot) => {
      const updates = [];
      snapshot.forEach((doc) => {
        updates.push(
          doc.ref.update({
            userId: `[deleted-${userId}]`,
            anonymized: true,
          })
        );
      });
      return Promise.all(updates);
    });

    // 6. Delete privacy requests (except this deletion request)
    const requestsSnapshot = await db
      .collection('PrivacyRequests')
      .where('userId', '==', userId)
      .where('type', '!=', 'deletion')
      .get();

    const requestDeletions = [];
    requestsSnapshot.forEach((doc) => {
      requestDeletions.push(doc.ref.delete());
    });
    await Promise.all(requestDeletions);

    return {
      step: 'deleteUserOwnData',
      success: true,
      deletedCollections: [
        'users',
        'Contacts',
        'groups',
        'Analytics (anonymized)',
        'ConsentLogs (anonymized)',
        'PrivacyRequests',
      ],
    };
  } catch (error) {
    console.error('Error deleting user own data:', error);
    return {
      step: 'deleteUserOwnData',
      success: false,
      error: error.message,
    };
  }
}

/**
 * Cascade delete/anonymize contact in other users' address books
 * @param {string} userId - User ID being deleted
 * @returns {Promise<Object>} Cascade result
 */
async function cascadeDeleteContact(userId) {
  try {
    console.log(`[AccountDeletion] Cascade deleting contact: ${userId}`);

    // Get user data for matching
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      // User already deleted, skip
      return { step: 'cascadeDeleteContact', success: true, affectedUsers: 0 };
    }

    const userData = userDoc.data();
    const userEmail = userData.email;
    const userName = userData.profile?.displayName || userData.username;

    // Find all users who have this person as a contact
    const usersWithContact = await findUsersWithContact(userId, userEmail);

    console.log(`[AccountDeletion] Found ${usersWithContact.length} users with this contact`);

    // For each user, remove or anonymize the contact
    const updates = [];
    for (const otherUserId of usersWithContact) {
      updates.push(removeContactFromUser(otherUserId, userId, userEmail, userName));
    }

    await Promise.all(updates);

    return {
      step: 'cascadeDeleteContact',
      success: true,
      affectedUsers: usersWithContact.length,
    };
  } catch (error) {
    console.error('Error in cascade delete:', error);
    return {
      step: 'cascadeDeleteContact',
      success: false,
      error: error.message,
    };
  }
}

/**
 * Find all users who have this person as a contact
 * @param {string} userId - User ID to search for
 * @param {string} email - User email to search for
 * @returns {Promise<Array<string>>} Array of user IDs
 */
async function findUsersWithContact(userId, email) {
  try {
    // This is expensive - in production, you'd want to maintain an index
    // For now, we'll query all Contacts documents

    const allContactsDocs = await db.collection('Contacts').get();
    const usersWithContact = [];

    allContactsDocs.forEach((doc) => {
      const contactsData = doc.data();
      const contacts = contactsData.contacts || [];

      // Check if any contact matches the user being deleted
      const hasContact = contacts.some(
        (contact) =>
          contact.userId === userId ||
          contact.email === email ||
          contact.weavinkUserId === userId
      );

      if (hasContact) {
        usersWithContact.push(doc.id);
      }
    });

    return usersWithContact;
  } catch (error) {
    console.error('Error finding users with contact:', error);
    return [];
  }
}

/**
 * Remove or anonymize contact from a user's address book
 * @param {string} ownerUserId - User ID who owns the contact list
 * @param {string} deletedUserId - User ID being deleted
 * @param {string} deletedEmail - Email of deleted user
 * @param {string} deletedName - Name of deleted user
 * @returns {Promise<void>}
 */
async function removeContactFromUser(ownerUserId, deletedUserId, deletedEmail, deletedName) {
  try {
    const contactsDoc = await db.collection('Contacts').doc(ownerUserId).get();

    if (!contactsDoc.exists) {
      return;
    }

    const contactsData = contactsDoc.data();
    let contacts = contactsData.contacts || [];

    // Find and anonymize the contact
    contacts = contacts.map((contact) => {
      const isMatch =
        contact.userId === deletedUserId ||
        contact.email === deletedEmail ||
        contact.weavinkUserId === deletedUserId;

      if (isMatch) {
        // Anonymize the contact instead of deleting (preserves notes)
        return {
          ...contact,
          id: contact.id, // Keep original ID for reference
          name: `[Contact Deleted - ${new Date().toLocaleDateString()}]`,
          email: '[deleted]',
          phone: '[deleted]',
          company: contact.company || '[deleted]', // Keep company if they want to remember
          position: '[deleted]',
          address: '[deleted]',
          website: '[deleted]',
          linkedin: '[deleted]',
          twitter: '[deleted]',
          notes: contact.notes
            ? `${contact.notes}\n\n[Original contact "${deletedName}" deleted their Weavink account on ${new Date().toLocaleString()}]`
            : `[Original contact "${deletedName}" deleted their Weavink account on ${new Date().toLocaleString()}]`,
          deletedAt: new Date().toISOString(),
          originalName: deletedName,
          userId: null,
          weavinkUserId: null,
        };
      }

      return contact;
    });

    // Update the contacts document
    await db.collection('Contacts').doc(ownerUserId).update({
      contacts,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error removing contact from user ${ownerUserId}:`, error);
  }
}

/**
 * Notify users about contact deletion
 * @param {string} deletedUserId - User ID being deleted
 * @param {Array<string>} userIds - Array of user IDs to notify
 * @param {Object} deletionRequest - Deletion request details
 * @param {string} requestId - Deletion request ID
 * @returns {Promise<void>}
 */
async function notifyContactDeletion(deletedUserId, userIds, deletionRequest, requestId) {
  try {
    console.log(`[AccountDeletion] Notifying ${userIds.length} users about contact deletion`);

    // Create notifications in Firestore
    // In production, you'd also send emails here
    const notifications = userIds.map((userId) => {
      return db.collection('users').doc(userId).collection('notifications').add({
        type: 'contact_deletion',
        title: 'Contact Deletion Notice',
        message: `${deletionRequest.userName} has requested deletion of their Weavink account. Their contact information will be anonymized in 30 days.`,
        deletedUserId,
        deletedUserName: deletionRequest.userName,
        deletedUserEmail: deletionRequest.userEmail,
        scheduledDate: deletionRequest.scheduledDeletionDate,
        createdAt: FieldValue.serverTimestamp(),
        read: false,
        action: {
          type: 'view_contact',
          contactId: deletedUserId,
        },
      });
    });

    await Promise.all(notifications);

    // Send email notifications to affected users
    const emailPromises = [];
    for (const userId of userIds) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const userLanguage = userData.settings?.defaultLanguage || 'en';

          emailPromises.push(
            EmailService.sendContactDeletionNoticeEmail(
              userData.email,
              userData.profile?.displayName || userData.username || 'User',
              deletionRequest.userName,
              deletionRequest.scheduledDeletionDate,
              requestId,
              userLanguage
            ).catch(error => {
              console.error(`Failed to send contact deletion notice to ${userId}:`, error);
              // Non-blocking: continue even if individual email fails
            })
          );
        }
      } catch (error) {
        console.error(`Error fetching user data for ${userId}:`, error);
      }
    }

    // Send all emails in parallel (non-blocking)
    await Promise.allSettled(emailPromises);
  } catch (error) {
    console.error('Error notifying users:', error);
  }
}

/**
 * Anonymize analytics data
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function anonymizeAnalytics(userId) {
  try {
    const analyticsDoc = await db.collection('Analytics').doc(userId).get();

    if (!analyticsDoc.exists) {
      return;
    }

    // Keep aggregated stats but remove PII
    const analyticsData = analyticsDoc.data();

    const anonymizedData = {
      ...analyticsData,
      anonymized: true,
      anonymizedAt: new Date().toISOString(),
      userId: `[deleted-${userId}]`,
      // Remove IP addresses from events
      pageViews: (analyticsData.pageViews || []).map((view) => ({
        ...view,
        ipAddress: '[anonymized]',
        userAgent: '[anonymized]',
      })),
      clicks: (analyticsData.clicks || []).map((click) => ({
        ...click,
        ipAddress: '[anonymized]',
        userAgent: '[anonymized]',
      })),
    };

    await db.collection('Analytics').doc(userId).set(anonymizedData);
  } catch (error) {
    console.error('Error anonymizing analytics:', error);
  }
}

/**
 * Archive billing data (legal requirement - 10 years retention)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Archive result
 */
async function archiveBillingData(userId) {
  try {
    // Get user's billing data
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return { step: 'archiveBillingData', success: true, archived: false };
    }

    const userData = userDoc.data();

    // Check if user has any billing history
    const hasBillingData =
      userData.accountType !== 'base' || userData.stripeCustomerId || userData.subscriptionId;

    if (!hasBillingData) {
      return { step: 'archiveBillingData', success: true, archived: false };
    }

    // Archive to separate collection with 10-year retention
    const archiveData = {
      originalUserId: userId,
      email: userData.email,
      accountType: userData.accountType,
      stripeCustomerId: userData.stripeCustomerId || null,
      subscriptionId: userData.subscriptionId || null,
      billingHistory: userData.billingHistory || [],
      archivedAt: FieldValue.serverTimestamp(),
      retainUntil: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
      reason: 'Legal requirement - fiscal records',
    };

    await db.collection('BillingArchive').add(archiveData);

    return { step: 'archiveBillingData', success: true, archived: true };
  } catch (error) {
    console.error('Error archiving billing data:', error);
    return { step: 'archiveBillingData', success: false, error: error.message };
  }
}

/**
 * Delete Firebase Auth account
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deletion result
 */
async function deleteAuthAccount(userId) {
  try {
    await adminAuth.deleteUser(userId);

    return { step: 'deleteAuthAccount', success: true };
  } catch (error) {
    console.error('Error deleting auth account:', error);
    return { step: 'deleteAuthAccount', success: false, error: error.message };
  }
}

/**
 * Cancel account deletion request
 * @param {string} userId - User ID
 * @param {string} requestId - Deletion request ID
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelAccountDeletion(userId, requestId) {
  try {
    // Get deletion request
    const requestDoc = await db.collection('PrivacyRequests').doc(requestId).get();

    if (!requestDoc.exists) {
      throw new Error('Deletion request not found');
    }

    const requestData = requestDoc.data();

    // Verify ownership
    if (requestData.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Can only cancel pending requests
    if (requestData.status !== 'pending') {
      throw new Error(`Cannot cancel request with status: ${requestData.status}`);
    }

    // Update request status
    await db.collection('PrivacyRequests').doc(requestId).update({
      status: 'cancelled',
      cancelledAt: FieldValue.serverTimestamp(),
    });

    // Remove pending deletion flag from user
    await db.collection('users').doc(userId).update({
      'privacy.pendingDeletion': false,
      'privacy.deletionRequestId': null,
      'privacy.deletionCancelledAt': FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Send cancellation confirmation email
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const userLanguage = userData.settings?.defaultLanguage || 'en';
        await EmailService.sendAccountDeletionCancelledEmail(
          userData.email,
          userData.profile?.displayName || userData.username || 'User',
          requestId,
          userLanguage
        );
      }
    } catch (emailError) {
      console.error('Failed to send deletion cancelled email:', emailError);
      // Non-blocking: continue even if email fails
    }

    // Notify contacts about cancellation
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();

        // Find all users who received deletion notifications
        const usersWithContact = await findUsersWithContact(userId, userData.email);

        if (usersWithContact.length > 0) {
          console.log(`🔔 Notifying ${usersWithContact.length} contacts about deletion cancellation`);

          // Delete notifications from User B's collections
          const notificationDeletions = [];

          for (const otherUserId of usersWithContact) {
            const notificationsQuery = db
              .collection('users')
              .doc(otherUserId)
              .collection('notifications')
              .where('type', '==', 'contact_deletion')
              .where('deletedUserId', '==', userId);

            const snapshot = await notificationsQuery.get();

            snapshot.forEach(doc => {
              notificationDeletions.push(doc.ref.delete());
            });
          }

          await Promise.all(notificationDeletions);
          console.log(`✅ Deleted ${notificationDeletions.length} notifications`);

          // Send cancellation emails to affected users
          const emailPromises = [];

          for (const otherUserId of usersWithContact) {
            try {
              const otherUserDoc = await db.collection('users').doc(otherUserId).get();

              if (otherUserDoc.exists) {
                const otherUserData = otherUserDoc.data();
                const otherUserLanguage = otherUserData.settings?.defaultLanguage || 'en';

                emailPromises.push(
                  EmailService.sendContactDeletionCancelledEmail(
                    otherUserData.email,
                    otherUserData.profile?.displayName || otherUserData.username || 'User',
                    userData.profile?.displayName || userData.username || 'User',
                    otherUserLanguage
                  ).catch(error => {
                    console.error(`Failed to send cancellation notice to ${otherUserId}:`, error);
                    // Non-blocking: continue even if individual email fails
                  })
                );
              }
            } catch (error) {
              console.error(`Error fetching user data for ${otherUserId}:`, error);
            }
          }

          // Send all emails in parallel (non-blocking)
          await Promise.allSettled(emailPromises);
          console.log(`✅ Sent ${emailPromises.length} cancellation notice emails`);
        }
      }
    } catch (notificationError) {
      console.error('Failed to notify contacts about cancellation:', notificationError);
      // Non-blocking: continue even if notification cleanup fails
    }

    return {
      success: true,
      message: 'Account deletion cancelled successfully',
    };
  } catch (error) {
    console.error('Error cancelling account deletion:', error);
    throw new Error(`Failed to cancel account deletion: ${error.message}`);
  }
}

/**
 * Get deletion request by ID
 * @param {string} requestId - Request ID
 * @returns {Promise<Object>} Deletion request
 */
export async function getDeletionRequest(requestId) {
  try {
    const doc = await db.collection('PrivacyRequests').doc(requestId).get();

    if (!doc.exists) {
      throw new Error('Deletion request not found');
    }

    const data = doc.data();

    if (data.type !== 'deletion') {
      throw new Error('Not a deletion request');
    }

    return {
      id: doc.id,
      ...data,
    };
  } catch (error) {
    console.error('Error getting deletion request:', error);
    throw error;
  }
}

/**
 * Get user's deletion request (if any)
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Deletion request or null
 */
export async function getUserDeletionRequest(userId) {
  try {
    const snapshot = await db
      .collection('PrivacyRequests')
      .where('userId', '==', userId)
      .where('type', '==', 'deletion')
      .where('status', 'in', ['pending', 'processing'])
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error('Error getting user deletion request:', error);
    return null;
  }
}
