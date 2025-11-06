/**
 * Security Incident Reporting Service
 *
 * GDPR Art. 33 - Notification of Personal Data Breach
 * Data breaches must be reported to supervisory authority
 * within 72 hours when feasible
 *
 * Features:
 * - Incident logging and tracking
 * - 72-hour notification countdown
 * - Severity classification
 * - Automated DPO notification
 * - CNIL notification templates
 */

import { adminDb } from '../../../firebaseAdmin.js';
const db = adminDb;
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Incident severity levels
 */
export const INCIDENT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Incident types
 */
export const INCIDENT_TYPES = {
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  DATA_BREACH: 'data_breach',
  DATA_LOSS: 'data_loss',
  SYSTEM_COMPROMISE: 'system_compromise',
  MALWARE: 'malware',
  PHISHING: 'phishing',
  INSIDER_THREAT: 'insider_threat',
  OTHER: 'other',
};

/**
 * Report security incident
 * @param {Object} incidentData - Incident information
 * @returns {Promise<Object>} Incident report
 */
export async function reportIncident(incidentData) {
  try {
    const {
      title,
      description,
      incidentType,
      severity,
      affectedUsers,
      affectedDataTypes,
      discoveredAt,
      reportedBy,
    } = incidentData;

    // Calculate 72-hour deadline
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 72);

    const incident = {
      title,
      description,
      incidentType,
      severity,
      affectedUsers: affectedUsers || 0,
      affectedDataTypes: affectedDataTypes || [],
      discoveredAt: discoveredAt || new Date().toISOString(),
      reportedBy,
      reportedAt: FieldValue.serverTimestamp(),
      status: 'reported',
      cnilNotificationDeadline: deadline.toISOString(),
      cnilNotified: false,
      cnilNotificationDate: null,
      usersNotified: false,
      userNotificationDate: null,
      containmentActions: [],
      investigationNotes: [],
      resolution: null,
      closedAt: null,
    };

    const docRef = await db.collection('SecurityIncidents').add(incident);

    console.log(`[Incident] Security incident reported: ${docRef.id} - ${title}`);

    // Auto-notify DPO if severity is high or critical
    if (severity === INCIDENT_SEVERITY.HIGH || severity === INCIDENT_SEVERITY.CRITICAL) {
      await notifyDPO(docRef.id, incident);
    }

    return {
      success: true,
      incidentId: docRef.id,
      incident: {
        id: docRef.id,
        ...incident,
      },
      requiresCNILNotification: shouldNotifyCNIL(incident),
    };
  } catch (error) {
    console.error('[Incident] Error reporting incident:', error);
    throw new Error(`Failed to report incident: ${error.message}`);
  }
}

/**
 * Determine if CNIL notification is required
 * @param {Object} incident - Incident data
 * @returns {boolean} Requires CNIL notification
 */
function shouldNotifyCNIL(incident) {
  // CNIL notification required if:
  // 1. Severity is high or critical
  // 2. More than 100 users affected
  // 3. Sensitive data types involved

  if (incident.severity === INCIDENT_SEVERITY.HIGH || incident.severity === INCIDENT_SEVERITY.CRITICAL) {
    return true;
  }

  if (incident.affectedUsers > 100) {
    return true;
  }

  const sensitiveDataTypes = ['health', 'financial', 'biometric', 'children'];
  if (incident.affectedDataTypes.some(type => sensitiveDataTypes.includes(type))) {
    return true;
  }

  return false;
}

/**
 * Notify DPO about incident
 * @param {string} incidentId - Incident ID
 * @param {Object} incident - Incident data
 * @returns {Promise<void>}
 */
async function notifyDPO(incidentId, incident) {
  try {
    // TODO: Integrate with email/notification service
    console.log(`[Incident] DPO notified about incident ${incidentId}`);

    await db.collection('SecurityIncidents').doc(incidentId).update({
      dpoNotified: true,
      dpoNotificationDate: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('[Incident] Error notifying DPO:', error);
  }
}

/**
 * Add containment action
 * @param {string} incidentId - Incident ID
 * @param {Object} action - Containment action
 * @returns {Promise<Object>} Updated incident
 */
export async function addContainmentAction(incidentId, action) {
  try {
    const { actionTaken, takenBy, timestamp } = action;

    const containmentAction = {
      id: `action_${Date.now()}`,
      actionTaken,
      takenBy,
      timestamp: timestamp || new Date().toISOString(),
    };

    await db.collection('SecurityIncidents').doc(incidentId).update({
      containmentActions: FieldValue.arrayUnion(containmentAction),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[Incident] Containment action added to incident ${incidentId}`);

    return {
      success: true,
      action: containmentAction,
    };
  } catch (error) {
    console.error('[Incident] Error adding containment action:', error);
    throw new Error(`Failed to add containment action: ${error.message}`);
  }
}

/**
 * Update incident status
 * @param {string} incidentId - Incident ID
 * @param {string} status - New status
 * @param {Object} details - Additional details
 * @returns {Promise<Object>} Updated incident
 */
export async function updateIncidentStatus(incidentId, status, details = {}) {
  try {
    const updates = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
      ...details,
    };

    if (status === 'closed' || status === 'resolved') {
      updates.closedAt = FieldValue.serverTimestamp();
    }

    await db.collection('SecurityIncidents').doc(incidentId).update(updates);

    console.log(`[Incident] Status updated for incident ${incidentId}: ${status}`);

    return {
      success: true,
      incidentId,
      status,
    };
  } catch (error) {
    console.error('[Incident] Error updating status:', error);
    throw new Error(`Failed to update incident status: ${error.message}`);
  }
}

/**
 * Notify CNIL about breach
 * @param {string} incidentId - Incident ID
 * @param {Object} notificationData - Notification details
 * @returns {Promise<Object>} Notification confirmation
 */
export async function notifyCNIL(incidentId, notificationData) {
  try {
    const { notificationMethod, referenceNumber, notifiedBy } = notificationData;

    await db.collection('SecurityIncidents').doc(incidentId).update({
      cnilNotified: true,
      cnilNotificationDate: FieldValue.serverTimestamp(),
      cnilNotificationMethod: notificationMethod,
      cnilReferenceNumber: referenceNumber,
      cnilNotifiedBy: notifiedBy,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[Incident] CNIL notified for incident ${incidentId}`);

    return {
      success: true,
      incidentId,
      notificationDate: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Incident] Error notifying CNIL:', error);
    throw new Error(`Failed to notify CNIL: ${error.message}`);
  }
}

/**
 * Notify affected users
 * @param {string} incidentId - Incident ID
 * @param {Array<string>} userIds - Affected user IDs
 * @returns {Promise<Object>} Notification result
 */
export async function notifyAffectedUsers(incidentId, userIds) {
  try {
    // TODO: Integrate with notification service

    await db.collection('SecurityIncidents').doc(incidentId).update({
      usersNotified: true,
      userNotificationDate: FieldValue.serverTimestamp(),
      notifiedUserCount: userIds.length,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[Incident] ${userIds.length} users notified for incident ${incidentId}`);

    return {
      success: true,
      notifiedCount: userIds.length,
    };
  } catch (error) {
    console.error('[Incident] Error notifying users:', error);
    throw new Error(`Failed to notify users: ${error.message}`);
  }
}

/**
 * Get incident by ID
 * @param {string} incidentId - Incident ID
 * @returns {Promise<Object>} Incident data
 */
export async function getIncident(incidentId) {
  try {
    const doc = await db.collection('SecurityIncidents').doc(incidentId).get();

    if (!doc.exists) {
      throw new Error('Incident not found');
    }

    const incident = {
      id: doc.id,
      ...doc.data(),
    };

    // Calculate time remaining for CNIL notification
    if (!incident.cnilNotified && incident.cnilNotificationDeadline) {
      const deadline = new Date(incident.cnilNotificationDeadline);
      const now = new Date();
      const hoursRemaining = Math.max(0, (deadline - now) / (1000 * 60 * 60));
      incident.hoursRemainingForCNIL = Math.round(hoursRemaining * 10) / 10;
    }

    return {
      success: true,
      incident,
    };
  } catch (error) {
    console.error('[Incident] Error getting incident:', error);
    throw new Error(`Failed to get incident: ${error.message}`);
  }
}

/**
 * List all incidents
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} List of incidents
 */
export async function listIncidents(filters = {}) {
  try {
    const { status, severity, limit = 50 } = filters;

    let query = db.collection('SecurityIncidents').orderBy('reportedAt', 'desc').limit(limit);

    if (status) {
      query = query.where('status', '==', status);
    }

    if (severity) {
      query = query.where('severity', '==', severity);
    }

    const snapshot = await query.get();

    const incidents = [];
    snapshot.forEach(doc => {
      incidents.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      incidents,
      count: incidents.length,
    };
  } catch (error) {
    console.error('[Incident] Error listing incidents:', error);
    throw new Error(`Failed to list incidents: ${error.message}`);
  }
}

/**
 * Get incident statistics
 * @returns {Promise<Object>} Incident statistics
 */
export async function getIncidentStatistics() {
  try {
    const snapshot = await db.collection('SecurityIncidents').get();

    const stats = {
      total: snapshot.size,
      bySeverity: {},
      byStatus: {},
      pendingCNILNotification: 0,
      averageResponseTime: null,
    };

    snapshot.forEach(doc => {
      const data = doc.data();

      // Count by severity
      stats.bySeverity[data.severity] = (stats.bySeverity[data.severity] || 0) + 1;

      // Count by status
      stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1;

      // Count pending CNIL notifications
      if (!data.cnilNotified && shouldNotifyCNIL(data)) {
        stats.pendingCNILNotification++;
      }
    });

    return {
      success: true,
      statistics: stats,
    };
  } catch (error) {
    console.error('[Incident] Error getting statistics:', error);
    throw new Error(`Failed to get incident statistics: ${error.message}`);
  }
}

/**
 * Generate CNIL notification template
 * @param {string} incidentId - Incident ID
 * @returns {Promise<Object>} Notification template
 */
export async function generateCNILNotificationTemplate(incidentId) {
  try {
    const { incident } = await getIncident(incidentId);

    const template = `
NOTIFICATION DE VIOLATION DE DONNÉES PERSONNELLES
Conformément à l'article 33 du RGPD

1. IDENTIFICATION DU RESPONSABLE DE TRAITEMENT
   Organisation: Weavink
   Contact DPO: dpo@weavink.io

2. NATURE DE LA VIOLATION
   Type: ${incident.incidentType}
   Description: ${incident.description}
   Date de découverte: ${incident.discoveredAt}

3. DONNÉES CONCERNÉES
   Nombre de personnes affectées: ${incident.affectedUsers}
   Types de données: ${incident.affectedDataTypes.join(', ')}

4. CONSÉQUENCES PROBABLES
   Gravité: ${incident.severity}

5. MESURES PRISES
${incident.containmentActions.map((action, i) => `   ${i + 1}. ${action.actionTaken}`).join('\n')}

6. MESURES DE REMÉDIATION
   [À compléter]

Date de notification: ${new Date().toISOString()}
`;

    return {
      success: true,
      template,
    };
  } catch (error) {
    console.error('[Incident] Error generating template:', error);
    throw new Error(`Failed to generate CNIL notification template: ${error.message}`);
  }
}
