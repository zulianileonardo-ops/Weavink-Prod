/**
 * Automated Data Breach Notification Service
 *
 * GDPR Art. 34 - Communication of Personal Data Breach to Data Subject
 * Automates notification of affected users when breach impacts their rights
 *
 * Features:
 * - Automated user notifications (email/in-app)
 * - Multi-language support
 * - SMS integration for critical breaches
 * - Notification tracking and acknowledgment
 * - Template management
 * - Batch notification processing
 */

import { adminDb } from '../../../firebaseAdmin.js';
const db = adminDb;
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Notification channels
 */
export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  IN_APP: 'in_app',
  SMS: 'sms',
  PUSH: 'push',
};

/**
 * Notification languages
 */
export const LANGUAGES = {
  EN: 'en',
  FR: 'fr',
  ES: 'es',
  DE: 'de',
};

/**
 * Notification templates
 */
export const BREACH_TEMPLATES = {
  en: {
    subject: 'Important: Data Security Incident Notification',
    body: `
Dear {{userName}},

We are writing to inform you of a security incident that may have affected your personal data.

Incident Details:
- Date Discovered: {{discoveredAt}}
- Type: {{incidentType}}
- Affected Data: {{affectedData}}

What Happened:
{{description}}

Data Potentially Affected:
{{dataTypes}}

Actions We've Taken:
{{containmentActions}}

What You Should Do:
{{recommendations}}

If you have any questions or concerns, please contact our Data Protection Officer at dpo@weavink.io.

We sincerely apologize for this incident and are taking all necessary steps to prevent future occurrences.

Best regards,
Weavink Security Team

This notification is sent in compliance with GDPR Art. 34.
    `,
  },
  fr: {
    subject: 'Important : Notification d\'incident de sécurité des données',
    body: `
Cher/Chère {{userName}},

Nous vous écrivons pour vous informer d'un incident de sécurité qui pourrait avoir affecté vos données personnelles.

Détails de l'incident:
- Date de découverte: {{discoveredAt}}
- Type: {{incidentType}}
- Données affectées: {{affectedData}}

Ce qui s'est passé:
{{description}}

Données potentiellement affectées:
{{dataTypes}}

Actions entreprises:
{{containmentActions}}

Ce que vous devez faire:
{{recommendations}}

Si vous avez des questions, contactez notre DPO à dpo@weavink.io.

Nous nous excusons sincèrement pour cet incident.

Cordialement,
Équipe Sécurité Weavink

Cette notification est envoyée conformément à l'Art. 34 du RGPD.
    `,
  },
};

/**
 * Send breach notification to affected users
 * @param {string} incidentId - Security incident ID
 * @param {Object} notificationData - Notification configuration
 * @returns {Promise<Object>} Notification result
 */
export async function sendBreachNotifications(incidentId, notificationData) {
  try {
    const {
      userIds,
      channels = [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP],
      language = LANGUAGES.EN,
      includeSMS = false,
    } = notificationData;

    // Get incident details
    const incidentDoc = await db.collection('SecurityIncidents').doc(incidentId).get();

    if (!incidentDoc.exists) {
      throw new Error('Security incident not found');
    }

    const incident = incidentDoc.data();

    // Prepare notification template
    const template = BREACH_TEMPLATES[language] || BREACH_TEMPLATES.en;

    const notifications = [];
    const errors = [];

    // Process each affected user
    for (const userId of userIds) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
          errors.push({ userId, error: 'User not found' });
          continue;
        }

        const user = userDoc.data();

        // Prepare personalized message
        const personalizedMessage = prepareMessage(template, incident, user);

        // Send via each channel
        const channelResults = {};

        for (const channel of channels) {
          try {
            switch (channel) {
              case NOTIFICATION_CHANNELS.EMAIL:
                channelResults.email = await sendEmailNotification(user, personalizedMessage);
                break;

              case NOTIFICATION_CHANNELS.IN_APP:
                channelResults.inApp = await sendInAppNotification(userId, personalizedMessage, incidentId);
                break;

              case NOTIFICATION_CHANNELS.SMS:
                if (includeSMS && user.phone) {
                  channelResults.sms = await sendSMSNotification(user.phone, personalizedMessage);
                }
                break;

              case NOTIFICATION_CHANNELS.PUSH:
                channelResults.push = await sendPushNotification(userId, personalizedMessage);
                break;
            }
          } catch (channelError) {
            console.error(`[Breach] Error sending via ${channel}:`, channelError);
            channelResults[channel] = { success: false, error: channelError.message };
          }
        }

        // Log notification
        const notificationRecord = {
          incidentId,
          userId,
          channels: channelResults,
          sentAt: FieldValue.serverTimestamp(),
          acknowledged: false,
          acknowledgedAt: null,
          language,
        };

        const docRef = await db.collection('BreachNotifications').add(notificationRecord);

        notifications.push({
          userId,
          notificationId: docRef.id,
          channels: channelResults,
        });
      } catch (error) {
        errors.push({ userId, error: error.message });
      }
    }

    // Update incident with notification status
    await db.collection('SecurityIncidents').doc(incidentId).update({
      usersNotified: true,
      userNotificationDate: FieldValue.serverTimestamp(),
      notifiedUserCount: notifications.length,
      notificationErrors: errors.length,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[Breach] Sent ${notifications.length} notifications for incident ${incidentId}`);

    return {
      success: true,
      incidentId,
      notificationsSent: notifications.length,
      errors,
      notifications,
    };
  } catch (error) {
    console.error('[Breach] Error sending breach notifications:', error);
    throw new Error(`Failed to send breach notifications: ${error.message}`);
  }
}

/**
 * Prepare personalized message from template
 * @param {Object} template - Message template
 * @param {Object} incident - Incident data
 * @param {Object} user - User data
 * @returns {Object} Personalized message
 */
function prepareMessage(template, incident, user) {
  const containmentActions = incident.containmentActions
    ?.map((action, i) => `${i + 1}. ${action.actionTaken}`)
    .join('\n') || 'Investigation ongoing';

  const dataTypes = incident.affectedDataTypes?.join(', ') || 'Under investigation';

  const recommendations = generateRecommendations(incident);

  const replacements = {
    '{{userName}}': user.displayName || user.email,
    '{{discoveredAt}}': new Date(incident.discoveredAt).toLocaleDateString(),
    '{{incidentType}}': incident.incidentType,
    '{{affectedData}}': dataTypes,
    '{{description}}': incident.description,
    '{{dataTypes}}': dataTypes,
    '{{containmentActions}}': containmentActions,
    '{{recommendations}}': recommendations,
  };

  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(replacements)) {
    subject = subject.replace(key, value);
    body = body.replace(new RegExp(key, 'g'), value);
  }

  return { subject, body };
}

/**
 * Generate recommendations based on incident type
 * @param {Object} incident - Incident data
 * @returns {string} Recommendations text
 */
function generateRecommendations(incident) {
  const baseRecommendations = [
    '- Monitor your account for any suspicious activity',
    '- Review your account settings and recent activity',
    '- Contact us immediately if you notice anything unusual',
  ];

  // Add specific recommendations based on incident type
  if (incident.affectedDataTypes?.includes('password') || incident.incidentType === 'unauthorized_access') {
    baseRecommendations.unshift('- Change your password immediately');
    baseRecommendations.push('- Enable two-factor authentication if not already enabled');
  }

  if (incident.affectedDataTypes?.includes('financial')) {
    baseRecommendations.push('- Monitor your bank statements for unauthorized transactions');
    baseRecommendations.push('- Consider placing a fraud alert on your credit reports');
  }

  if (incident.affectedDataTypes?.includes('email')) {
    baseRecommendations.push('- Be cautious of phishing emails claiming to be from us');
    baseRecommendations.push('- Verify the sender before clicking any links');
  }

  return baseRecommendations.join('\n');
}

/**
 * Send email notification (mock - integrate with actual email service)
 * @param {Object} user - User data
 * @param {Object} message - Message content
 * @returns {Promise<Object>} Send result
 */
async function sendEmailNotification(user, message) {
  // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
  console.log(`[Breach] Email notification sent to: ${user.email}`);
  console.log(`Subject: ${message.subject}`);

  return {
    success: true,
    channel: 'email',
    recipient: user.email,
    sentAt: new Date().toISOString(),
  };
}

/**
 * Send in-app notification
 * @param {string} userId - User ID
 * @param {Object} message - Message content
 * @param {string} incidentId - Incident ID
 * @returns {Promise<Object>} Send result
 */
async function sendInAppNotification(userId, message, incidentId) {
  try {
    await db.collection('Notifications').add({
      userId,
      type: 'security_breach',
      priority: 'high',
      title: message.subject,
      body: message.body,
      incidentId,
      read: false,
      acknowledged: false,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: null, // Critical notifications don't expire
    });

    return {
      success: true,
      channel: 'in_app',
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Breach] Error sending in-app notification:', error);
    throw error;
  }
}

/**
 * Send SMS notification (mock - integrate with SMS service)
 * @param {string} phone - Phone number
 * @param {Object} message - Message content
 * @returns {Promise<Object>} Send result
 */
async function sendSMSNotification(phone, message) {
  // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
  const smsText = `SECURITY ALERT: ${message.subject}. Check your email for details. Contact dpo@weavink.io for questions.`;

  console.log(`[Breach] SMS notification sent to: ${phone}`);
  console.log(`Text: ${smsText}`);

  return {
    success: true,
    channel: 'sms',
    recipient: phone,
    sentAt: new Date().toISOString(),
  };
}

/**
 * Send push notification (mock - integrate with push service)
 * @param {string} userId - User ID
 * @param {Object} message - Message content
 * @returns {Promise<Object>} Send result
 */
async function sendPushNotification(userId, message) {
  // TODO: Integrate with push notification service (FCM, APNs, etc.)
  console.log(`[Breach] Push notification sent to user: ${userId}`);

  return {
    success: true,
    channel: 'push',
    sentAt: new Date().toISOString(),
  };
}

/**
 * Acknowledge breach notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Acknowledgment result
 */
export async function acknowledgeNotification(notificationId, userId) {
  try {
    await db.collection('BreachNotifications').doc(notificationId).update({
      acknowledged: true,
      acknowledgedAt: FieldValue.serverTimestamp(),
      acknowledgedBy: userId,
    });

    console.log(`[Breach] Notification ${notificationId} acknowledged by user ${userId}`);

    return {
      success: true,
      notificationId,
      acknowledgedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Breach] Error acknowledging notification:', error);
    throw new Error(`Failed to acknowledge notification: ${error.message}`);
  }
}

/**
 * Get notification status for incident
 * @param {string} incidentId - Incident ID
 * @returns {Promise<Object>} Notification status
 */
export async function getNotificationStatus(incidentId) {
  try {
    const snapshot = await db.collection('BreachNotifications')
      .where('incidentId', '==', incidentId)
      .get();

    const notifications = [];
    let acknowledgedCount = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data,
      });

      if (data.acknowledged) {
        acknowledgedCount++;
      }
    });

    return {
      success: true,
      incidentId,
      totalNotifications: notifications.length,
      acknowledged: acknowledgedCount,
      pending: notifications.length - acknowledgedCount,
      acknowledgmentRate: notifications.length > 0
        ? ((acknowledgedCount / notifications.length) * 100).toFixed(2) + '%'
        : '0%',
      notifications,
    };
  } catch (error) {
    console.error('[Breach] Error getting notification status:', error);
    throw new Error(`Failed to get notification status: ${error.message}`);
  }
}

/**
 * Get user's breach notifications
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} User notifications
 */
export async function getUserBreachNotifications(userId, options = {}) {
  try {
    const { limit = 10, includeAcknowledged = true } = options;

    let query = db.collection('BreachNotifications')
      .where('userId', '==', userId)
      .orderBy('sentAt', 'desc')
      .limit(limit);

    if (!includeAcknowledged) {
      query = query.where('acknowledged', '==', false);
    }

    const snapshot = await query.get();

    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      userId,
      notifications,
      count: notifications.length,
    };
  } catch (error) {
    console.error('[Breach] Error getting user notifications:', error);
    throw new Error(`Failed to get user notifications: ${error.message}`);
  }
}

/**
 * Create custom notification template
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
export async function createNotificationTemplate(templateData) {
  try {
    const {
      name,
      language,
      subject,
      body,
      incidentTypes = [],
      createdBy,
    } = templateData;

    const template = {
      name,
      language,
      subject,
      body,
      incidentTypes,
      active: true,
      createdBy,
      createdAt: FieldValue.serverTimestamp(),
      lastModified: FieldValue.serverTimestamp(),
      usageCount: 0,
    };

    const docRef = await db.collection('NotificationTemplates').add(template);

    console.log(`[Breach] Notification template created: ${docRef.id}`);

    return {
      success: true,
      templateId: docRef.id,
      template: {
        id: docRef.id,
        ...template,
      },
    };
  } catch (error) {
    console.error('[Breach] Error creating template:', error);
    throw new Error(`Failed to create notification template: ${error.message}`);
  }
}

/**
 * Get notification statistics
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Notification statistics
 */
export async function getNotificationStatistics(filters = {}) {
  try {
    const { startDate, endDate } = filters;

    let query = db.collection('BreachNotifications');

    if (startDate) {
      query = query.where('sentAt', '>=', new Date(startDate));
    }

    if (endDate) {
      query = query.where('sentAt', '<=', new Date(endDate));
    }

    const snapshot = await query.get();

    const stats = {
      total: snapshot.size,
      acknowledged: 0,
      pending: 0,
      byChannel: {},
      byLanguage: {},
      averageAcknowledgmentTime: null,
    };

    const acknowledgmentTimes = [];

    snapshot.forEach(doc => {
      const data = doc.data();

      if (data.acknowledged) {
        stats.acknowledged++;

        // Calculate acknowledgment time
        if (data.sentAt && data.acknowledgedAt) {
          const sentTime = data.sentAt.toDate ? data.sentAt.toDate() : new Date(data.sentAt);
          const ackTime = data.acknowledgedAt.toDate ? data.acknowledgedAt.toDate() : new Date(data.acknowledgedAt);
          const timeDiff = (ackTime - sentTime) / (1000 * 60 * 60); // Hours
          acknowledgmentTimes.push(timeDiff);
        }
      } else {
        stats.pending++;
      }

      // Count by channel
      if (data.channels) {
        for (const channel of Object.keys(data.channels)) {
          stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
        }
      }

      // Count by language
      stats.byLanguage[data.language] = (stats.byLanguage[data.language] || 0) + 1;
    });

    // Calculate average acknowledgment time
    if (acknowledgmentTimes.length > 0) {
      const sum = acknowledgmentTimes.reduce((a, b) => a + b, 0);
      stats.averageAcknowledgmentTime = `${(sum / acknowledgmentTimes.length).toFixed(2)} hours`;
    }

    stats.acknowledgmentRate = stats.total > 0
      ? `${((stats.acknowledged / stats.total) * 100).toFixed(2)}%`
      : '0%';

    return {
      success: true,
      statistics: stats,
      period: {
        start: startDate || 'All time',
        end: endDate || 'Now',
      },
    };
  } catch (error) {
    console.error('[Breach] Error getting statistics:', error);
    throw new Error(`Failed to get notification statistics: ${error.message}`);
  }
}

/**
 * Notify data subjects about a breach
 * @param {string} incidentId - Incident ID
 * @param {Object} options - Notification options
 * @returns {Promise<Object>} Notification result
 */
export async function notifyDataSubjects(incidentId, options = {}) {
  try {
    const { affectedUserIds, notificationMethod = 'email', customMessage } = options;

    const channels = notificationMethod === 'email'
      ? [NOTIFICATION_CHANNELS.EMAIL, NOTIFICATION_CHANNELS.IN_APP]
      : [NOTIFICATION_CHANNELS.IN_APP];

    const result = await sendBreachNotifications(incidentId, {
      userIds: affectedUserIds,
      channels,
      language: LANGUAGES.EN,
    });

    return {
      success: true,
      notified: result.notificationsSent,
      failed: result.errors.length,
      notificationId: `NOTIFY-${incidentId}-${Date.now()}`,
    };
  } catch (error) {
    console.error('[Breach] Error notifying data subjects:', error);
    throw new Error(`Failed to notify data subjects: ${error.message}`);
  }
}

/**
 * Notify authorities about a breach
 * @param {string} incidentId - Incident ID
 * @param {Object} options - Notification options
 * @returns {Promise<Object>} Notification result
 */
export async function notifyAuthorities(incidentId, options = {}) {
  try {
    const { authorities, urgency = 'normal', additionalInfo } = options;

    // Create authority notification record
    const notificationRecord = {
      incidentId,
      authorities: authorities || [],
      urgency,
      additionalInfo: additionalInfo || '',
      notifiedAt: FieldValue.serverTimestamp(),
      status: 'sent',
    };

    const docRef = await db.collection('AuthorityNotifications').add(notificationRecord);

    console.log(`[Breach] Authorities notified for incident ${incidentId}`);

    return {
      success: true,
      notified: authorities?.length || 0,
      notificationId: docRef.id,
    };
  } catch (error) {
    console.error('[Breach] Error notifying authorities:', error);
    throw new Error(`Failed to notify authorities: ${error.message}`);
  }
}

/**
 * Update notification status
 * @param {string} notificationId - Notification ID
 * @param {string} status - New status
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Update result
 */
export async function updateNotificationStatus(notificationId, status, notes) {
  try {
    const updateData = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    await db.collection('BreachNotifications').doc(notificationId).update(updateData);

    console.log(`[Breach] Notification ${notificationId} status updated to ${status}`);

    return {
      success: true,
      notificationId,
      status,
    };
  } catch (error) {
    console.error('[Breach] Error updating notification status:', error);
    throw new Error(`Failed to update notification status: ${error.message}`);
  }
}

/**
 * Get breach notification history
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Notification history
 */
export async function getBreachNotificationHistory(options = {}) {
  try {
    const { incidentId, limit = 50 } = options;

    let query = db.collection('BreachNotifications')
      .orderBy('sentAt', 'desc')
      .limit(limit);

    if (incidentId) {
      query = query.where('incidentId', '==', incidentId);
    }

    const snapshot = await query.get();

    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      notifications,
      count: notifications.length,
    };
  } catch (error) {
    console.error('[Breach] Error getting notification history:', error);
    throw new Error(`Failed to get notification history: ${error.message}`);
  }
}
