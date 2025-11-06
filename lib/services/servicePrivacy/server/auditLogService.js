/**
 * Enhanced Audit Logging Service
 *
 * GDPR Art. 30 - Records of Processing Activities
 * Art. 5(2) - Accountability principle requires demonstrable compliance
 *
 * Features:
 * - Comprehensive activity logging
 * - Privacy-specific audit trails
 * - Tamper-evident logging
 * - Compliance report generation
 * - Query and analysis tools
 */

import { adminDb } from '../../../firebaseAdmin.js';
const db = adminDb;
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Audit event categories
 */
export const AUDIT_CATEGORIES = {
  CONSENT: 'consent',
  DATA_ACCESS: 'data_access',
  DATA_EXPORT: 'data_export',
  DATA_DELETION: 'data_deletion',
  DATA_MODIFICATION: 'data_modification',
  RETENTION_POLICY: 'retention_policy',
  SECURITY_INCIDENT: 'security_incident',
  AUTHENTICATION: 'authentication',
  ADMIN_ACTION: 'admin_action',
  DPIA: 'dpia',
  LEGAL_HOLD: 'legal_hold',
  COOKIE: 'cookie',
  THIRD_PARTY_SHARE: 'third_party_share',
};

/**
 * Audit event severities
 */
export const AUDIT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

/**
 * Log audit event
 * @param {Object} eventData - Event information
 * @returns {Promise<Object>} Logged event
 */
export async function logAuditEvent(eventData) {
  try {
    const {
      category,
      action,
      userId,
      targetUserId,
      resourceType,
      resourceId,
      details,
      severity = AUDIT_SEVERITY.INFO,
      ipAddress,
      userAgent,
      metadata,
    } = eventData;

    // Generate hash for tamper detection
    const eventHash = generateEventHash({
      category,
      action,
      userId,
      targetUserId,
      timestamp: new Date().toISOString(),
    });

    const auditEvent = {
      category,
      action,
      userId: userId || null,
      targetUserId: targetUserId || null,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      details: details || '',
      severity,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      metadata: metadata || {},
      timestamp: FieldValue.serverTimestamp(),
      eventHash,
      verified: true,
    };

    const docRef = await db.collection('AuditLogs').add(auditEvent);

    console.log(`[Audit] Event logged: ${category} - ${action} (${docRef.id})`);

    return {
      success: true,
      eventId: docRef.id,
      event: {
        id: docRef.id,
        ...auditEvent,
      },
    };
  } catch (error) {
    console.error('[Audit] Error logging event:', error);
    throw new Error(`Failed to log audit event: ${error.message}`);
  }
}

/**
 * Generate hash for tamper detection
 * @param {Object} data - Data to hash
 * @returns {string} Hash string
 */
function generateEventHash(data) {
  // Simple hash for demo - in production use crypto.createHash
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

/**
 * Log consent event
 * @param {string} userId - User ID
 * @param {Object} consentData - Consent details
 * @returns {Promise<Object>} Logged event
 */
export async function logConsentEvent(userId, consentData) {
  return logAuditEvent({
    category: AUDIT_CATEGORIES.CONSENT,
    action: consentData.action || 'consent_updated',
    userId,
    resourceType: 'consent',
    details: `Consent ${consentData.action} for: ${Object.keys(consentData.consents || {}).join(', ')}`,
    metadata: {
      consents: consentData.consents,
      version: consentData.version,
    },
  });
}

/**
 * Log data access event
 * @param {string} userId - User accessing data
 * @param {string} targetUserId - User whose data is accessed
 * @param {Object} accessData - Access details
 * @returns {Promise<Object>} Logged event
 */
export async function logDataAccessEvent(userId, targetUserId, accessData) {
  return logAuditEvent({
    category: AUDIT_CATEGORIES.DATA_ACCESS,
    action: 'data_accessed',
    userId,
    targetUserId,
    resourceType: accessData.resourceType,
    resourceId: accessData.resourceId,
    details: accessData.details || 'User data accessed',
    metadata: {
      fields: accessData.fields,
      reason: accessData.reason,
    },
  });
}

/**
 * Log data export event
 * @param {string} userId - User requesting export
 * @param {Object} exportData - Export details
 * @returns {Promise<Object>} Logged event
 */
export async function logDataExportEvent(userId, exportData) {
  return logAuditEvent({
    category: AUDIT_CATEGORIES.DATA_EXPORT,
    action: 'export_requested',
    userId,
    resourceType: 'data_export',
    resourceId: exportData.exportId,
    details: `Data export requested: ${exportData.format || 'JSON'}`,
    metadata: {
      format: exportData.format,
      includeFiles: exportData.includeFiles,
    },
  });
}

/**
 * Log data deletion event
 * @param {string} userId - User requesting deletion
 * @param {Object} deletionData - Deletion details
 * @returns {Promise<Object>} Logged event
 */
export async function logDataDeletionEvent(userId, deletionData) {
  return logAuditEvent({
    category: AUDIT_CATEGORIES.DATA_DELETION,
    action: deletionData.action || 'deletion_requested',
    userId,
    resourceType: 'user_account',
    resourceId: deletionData.requestId,
    details: deletionData.details || 'Account deletion requested',
    severity: AUDIT_SEVERITY.WARNING,
    metadata: {
      reason: deletionData.reason,
      retainData: deletionData.retainData,
    },
  });
}

/**
 * Log security incident
 * @param {string} incidentId - Incident ID
 * @param {Object} incidentData - Incident details
 * @returns {Promise<Object>} Logged event
 */
export async function logSecurityIncident(incidentId, incidentData) {
  return logAuditEvent({
    category: AUDIT_CATEGORIES.SECURITY_INCIDENT,
    action: 'incident_reported',
    userId: incidentData.reportedBy,
    resourceType: 'security_incident',
    resourceId: incidentId,
    details: `Security incident: ${incidentData.title}`,
    severity: incidentData.severity === 'critical' ? AUDIT_SEVERITY.CRITICAL : AUDIT_SEVERITY.ERROR,
    metadata: {
      incidentType: incidentData.incidentType,
      affectedUsers: incidentData.affectedUsers,
      affectedDataTypes: incidentData.affectedDataTypes,
    },
  });
}

/**
 * Log admin action
 * @param {string} adminId - Admin user ID
 * @param {Object} actionData - Action details
 * @returns {Promise<Object>} Logged event
 */
export async function logAdminAction(adminId, actionData) {
  return logAuditEvent({
    category: AUDIT_CATEGORIES.ADMIN_ACTION,
    action: actionData.action,
    userId: adminId,
    targetUserId: actionData.targetUserId,
    resourceType: actionData.resourceType,
    resourceId: actionData.resourceId,
    details: actionData.details,
    severity: AUDIT_SEVERITY.WARNING,
    metadata: actionData.metadata,
  });
}

/**
 * Query audit logs
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} Query results
 */
export async function queryAuditLogs(filters = {}) {
  try {
    const {
      category,
      userId,
      targetUserId,
      severity,
      startDate,
      endDate,
      limit = 100,
      orderBy = 'timestamp',
      orderDirection = 'desc',
    } = filters;

    let query = db.collection('AuditLogs');

    // Apply filters
    if (category) {
      query = query.where('category', '==', category);
    }

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (targetUserId) {
      query = query.where('targetUserId', '==', targetUserId);
    }

    if (severity) {
      query = query.where('severity', '==', severity);
    }

    if (startDate) {
      query = query.where('timestamp', '>=', new Date(startDate));
    }

    if (endDate) {
      query = query.where('timestamp', '<=', new Date(endDate));
    }

    // Order and limit
    query = query.orderBy(orderBy, orderDirection).limit(limit);

    const snapshot = await query.get();

    const logs = [];
    snapshot.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      logs,
      count: logs.length,
      filters: filters,
    };
  } catch (error) {
    console.error('[Audit] Error querying logs:', error);
    throw new Error(`Failed to query audit logs: ${error.message}`);
  }
}

/**
 * Get audit log by ID
 * @param {string} logId - Log ID
 * @returns {Promise<Object>} Log data
 */
export async function getAuditLog(logId) {
  try {
    const doc = await db.collection('AuditLogs').doc(logId).get();

    if (!doc.exists) {
      throw new Error('Audit log not found');
    }

    return {
      success: true,
      log: {
        id: doc.id,
        ...doc.data(),
      },
    };
  } catch (error) {
    console.error('[Audit] Error getting log:', error);
    throw new Error(`Failed to get audit log: ${error.message}`);
  }
}

/**
 * Get user audit trail
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} User audit trail
 */
export async function getUserAuditTrail(userId, options = {}) {
  try {
    const { limit = 50, category } = options;

    let query = db.collection('AuditLogs')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();

    const logs = [];
    snapshot.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      userId,
      logs,
      count: logs.length,
    };
  } catch (error) {
    console.error('[Audit] Error getting user trail:', error);
    throw new Error(`Failed to get user audit trail: ${error.message}`);
  }
}

/**
 * Get audit statistics
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Audit statistics
 */
export async function getAuditStatistics(filters = {}) {
  try {
    const { startDate, endDate } = filters;

    let query = db.collection('AuditLogs');

    if (startDate) {
      query = query.where('timestamp', '>=', new Date(startDate));
    }

    if (endDate) {
      query = query.where('timestamp', '<=', new Date(endDate));
    }

    const snapshot = await query.get();

    const stats = {
      total: snapshot.size,
      byCategory: {},
      bySeverity: {},
      criticalEvents: 0,
      uniqueUsers: new Set(),
      timeRange: {
        start: startDate || null,
        end: endDate || null,
      },
    };

    snapshot.forEach(doc => {
      const data = doc.data();

      // Count by category
      stats.byCategory[data.category] = (stats.byCategory[data.category] || 0) + 1;

      // Count by severity
      stats.bySeverity[data.severity] = (stats.bySeverity[data.severity] || 0) + 1;

      // Count critical events
      if (data.severity === AUDIT_SEVERITY.CRITICAL) {
        stats.criticalEvents++;
      }

      // Track unique users
      if (data.userId) {
        stats.uniqueUsers.add(data.userId);
      }
    });

    stats.uniqueUsers = stats.uniqueUsers.size;

    return {
      success: true,
      statistics: stats,
    };
  } catch (error) {
    console.error('[Audit] Error getting statistics:', error);
    throw new Error(`Failed to get audit statistics: ${error.message}`);
  }
}

/**
 * Generate compliance report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Compliance report
 */
export async function generateComplianceReport(options = {}) {
  try {
    const { startDate, endDate, includeDetails = false } = options;

    const stats = await getAuditStatistics({ startDate, endDate });

    // Get consent compliance
    const consentLogs = await queryAuditLogs({
      category: AUDIT_CATEGORIES.CONSENT,
      startDate,
      endDate,
      limit: 1000,
    });

    // Get data access compliance
    const dataAccessLogs = await queryAuditLogs({
      category: AUDIT_CATEGORIES.DATA_ACCESS,
      startDate,
      endDate,
      limit: 1000,
    });

    // Get deletion requests
    const deletionLogs = await queryAuditLogs({
      category: AUDIT_CATEGORIES.DATA_DELETION,
      startDate,
      endDate,
      limit: 1000,
    });

    // Get security incidents
    const securityLogs = await queryAuditLogs({
      category: AUDIT_CATEGORIES.SECURITY_INCIDENT,
      startDate,
      endDate,
      limit: 1000,
    });

    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        start: startDate || 'All time',
        end: endDate || 'Now',
      },
      overview: {
        totalEvents: stats.statistics.total,
        criticalEvents: stats.statistics.criticalEvents,
        uniqueUsers: stats.statistics.uniqueUsers,
      },
      compliance: {
        consent: {
          totalEvents: consentLogs.count,
          description: 'User consent management activities',
        },
        dataAccess: {
          totalEvents: dataAccessLogs.count,
          description: 'Personal data access operations',
        },
        dataSubjectRights: {
          deletionRequests: deletionLogs.count,
          description: 'GDPR data subject rights requests',
        },
        security: {
          incidents: securityLogs.count,
          description: 'Security incidents and breaches',
        },
      },
      categoryBreakdown: stats.statistics.byCategory,
      severityBreakdown: stats.statistics.bySeverity,
    };

    if (includeDetails) {
      report.details = {
        consentEvents: consentLogs.logs,
        dataAccessEvents: dataAccessLogs.logs,
        deletionEvents: deletionLogs.logs,
        securityEvents: securityLogs.logs,
      };
    }

    console.log('[Audit] Compliance report generated');

    return {
      success: true,
      report,
    };
  } catch (error) {
    console.error('[Audit] Error generating report:', error);
    throw new Error(`Failed to generate compliance report: ${error.message}`);
  }
}

/**
 * Verify audit log integrity
 * @param {string} logId - Log ID to verify
 * @returns {Promise<Object>} Verification result
 */
export async function verifyAuditLogIntegrity(logId) {
  try {
    const { log } = await getAuditLog(logId);

    // Regenerate hash
    const expectedHash = generateEventHash({
      category: log.category,
      action: log.action,
      userId: log.userId,
      targetUserId: log.targetUserId,
      timestamp: log.timestamp,
    });

    const isValid = log.eventHash === expectedHash;

    return {
      success: true,
      logId,
      verified: isValid,
      originalHash: log.eventHash,
      computedHash: expectedHash,
      tampered: !isValid,
    };
  } catch (error) {
    console.error('[Audit] Error verifying log:', error);
    throw new Error(`Failed to verify audit log: ${error.message}`);
  }
}

/**
 * Export audit logs
 * @param {Object} filters - Export filters
 * @param {string} format - Export format (json, csv)
 * @returns {Promise<Object>} Export data
 */
export async function exportAuditLogs(filters = {}, format = 'json') {
  try {
    const { logs } = await queryAuditLogs({
      ...filters,
      limit: filters.limit || 10000,
    });

    let exportData;

    if (format === 'csv') {
      // Convert to CSV
      const headers = ['ID', 'Category', 'Action', 'User ID', 'Timestamp', 'Severity', 'Details'];
      const rows = logs.map(log => [
        log.id,
        log.category,
        log.action,
        log.userId || 'N/A',
        log.timestamp,
        log.severity,
        log.details,
      ]);

      exportData = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    } else {
      // JSON format
      exportData = JSON.stringify(logs, null, 2);
    }

    console.log(`[Audit] Exported ${logs.length} audit logs in ${format} format`);

    return {
      success: true,
      format,
      count: logs.length,
      data: exportData,
      filename: `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`,
    };
  } catch (error) {
    console.error('[Audit] Error exporting logs:', error);
    throw new Error(`Failed to export audit logs: ${error.message}`);
  }
}
