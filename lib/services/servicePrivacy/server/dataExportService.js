/**
 * Data Export Service
 * Handles GDPR Art. 20 (Right to Data Portability) compliance
 * Exports all user data in machine-readable formats
 */

import { adminDb } from '../../../firebaseAdmin.js';

// Alias adminDb as db for compatibility
const db = adminDb;
import { FieldValue } from 'firebase-admin/firestore';
import { exportContactsToVCard } from '../../../utils/vCardGenerator.js';
import { ConsentService } from './consentService.js';
import { logAuditEvent, AUDIT_CATEGORIES } from './auditLogService.js';
import { translateServerSide } from '../../server/translationService.js';

/**
 * Export all user data in multiple formats
 * @param {string} userId - User ID
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Export data package
 */
export async function exportAllUserData(userId, options = {}) {
  try {
    const {
      includeContacts = true,
      includeAnalytics = true,
      includeConsents = true,
      includeSettings = true,
      includeGroups = true,
    } = options;

    console.log(`[DataExport] Starting full data export for user: ${userId}`);

    // Fetch user's language preference for internationalized export
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userLanguage = userData?.settings?.defaultLanguage || 'en';
    console.log(`[DataExport] User language: ${userLanguage}`);

    const exportPackage = {
      exportDate: new Date().toISOString(),
      userId,
      userLanguage,
      dataCategories: {},
    };

    // 1. User Profile Data
    exportPackage.dataCategories.profile = await exportUserProfile(userId);

    // 2. Contacts
    if (includeContacts) {
      exportPackage.dataCategories.contacts = await exportUserContacts(userId);
    }

    // 3. Groups
    if (includeGroups) {
      exportPackage.dataCategories.groups = await exportUserGroups(userId);
    }

    // 4. Analytics
    if (includeAnalytics) {
      exportPackage.dataCategories.analytics = await exportUserAnalytics(userId);
    }

    // 5. Consents
    if (includeConsents) {
      exportPackage.dataCategories.consents = await ConsentService.exportConsentData(userId);

      // DEBUG: Log actual consent data structure
      console.log('🔍 [DataExport] Full consent data:', JSON.stringify(exportPackage.dataCategories.consents, null, 2));
      console.log('🔍 [DataExport] currentConsents exists?:', !!exportPackage.dataCategories.consents?.currentConsents);
      console.log('🔍 [DataExport] currentConsents keys:', Object.keys(exportPackage.dataCategories.consents?.currentConsents || {}));
      console.log('🔍 [DataExport] Active consents:',
        Object.entries(exportPackage.dataCategories.consents?.currentConsents || {})
          .filter(([key, val]) => val.status === true)
          .map(([key, val]) => ({ key, status: val.status, statusType: typeof val.status }))
      );
    }

    // 6. Settings
    if (includeSettings) {
      exportPackage.dataCategories.settings = await exportUserSettings(userId);
    }

    // 7. Generate file manifests
    exportPackage.files = await generateExportFiles(exportPackage);

    console.log(`[DataExport] Export completed for user: ${userId}`);

    // DEBUG: Calculate and log consent count
    const calculatedConsentCount = exportPackage.dataCategories.consents?.currentConsents
      ? Object.values(exportPackage.dataCategories.consents.currentConsents)
          .filter(consent => consent.status === true).length
      : 0;
    console.log('🔍 [DataExport] Calculated consent count:', calculatedConsentCount);

    return {
      success: true,
      exportPackage,
      summary: {
        totalDataCategories: Object.keys(exportPackage.dataCategories).length,
        contactCount: exportPackage.dataCategories.contacts?.contacts?.length || 0,
        groupCount: exportPackage.dataCategories.groups?.groups?.length || 0,
        consentCount: calculatedConsentCount,
      },
    };
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw new Error(`Failed to export user data: ${error.message}`);
  }
}

/**
 * Export user profile data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile data
 */
export async function exportUserProfile(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();

    // Remove sensitive/internal fields
    const sanitizedData = {
      uid: userId,
      email: userData.email,
      emailVerified: userData.emailVerified,
      createdAt: userData.createdAt,
      lastLoginAt: userData.lastLoginAt,
      username: userData.username,

      profile: userData.profile || {},

      accountType: userData.accountType,
      onboardingCompleted: userData.onboardingCompleted,

      links: userData.links || [],
      socials: userData.socials || [],

      appearance: userData.appearance || {},

      settings: {
        isPublic: userData.settings?.isPublic,
        allowMessages: userData.settings?.allowMessages,
        theme: userData.settings?.theme,
        notifications: userData.settings?.notifications,
      },
    };

    return sanitizedData;
  } catch (error) {
    console.error('Error exporting user profile:', error);
    throw error;
  }
}

/**
 * Export all user contacts
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Contacts data with multiple formats
 */
export async function exportUserContacts(userId) {
  try {
    // Get contacts from Firestore
    const contactsDoc = await db.collection('Contacts').doc(userId).get();

    if (!contactsDoc.exists) {
      return {
        contacts: [],
        formats: {
          json: [],
          csv: '',
          vcard: ''
        }
      };
    }

    const contactsData = contactsDoc.data();
    const contacts = contactsData.contacts || [];

    // Generate different formats
    const formats = {
      json: contacts, // Already in JSON format
      csv: generateContactsCSV(contacts),
      vcard: exportContactsToVCard(contacts),
    };

    return {
      contacts,
      totalCount: contacts.length,
      formats,
    };
  } catch (error) {
    console.error('Error exporting user contacts:', error);
    throw error;
  }
}

/**
 * Export user groups
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Groups data
 */
export async function exportUserGroups(userId) {
  try {
    const groupsSnapshot = await db
      .collection('groups')
      .doc(userId)
      .collection('groups')
      .get();

    const groups = [];
    groupsSnapshot.forEach((doc) => {
      groups.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      groups,
      totalCount: groups.length,
    };
  } catch (error) {
    console.error('Error exporting user groups:', error);
    return { groups: [], totalCount: 0 };
  }
}

/**
 * Export user analytics data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Analytics data
 */
export async function exportUserAnalytics(userId) {
  try {
    const analyticsDoc = await db.collection('Analytics').doc(userId).get();

    if (!analyticsDoc.exists) {
      return { analytics: null };
    }

    const analyticsData = analyticsDoc.data();

    // Anonymize IP addresses if present
    const sanitizedAnalytics = {
      ...analyticsData,
      // Remove any PII from analytics
      pageViews: analyticsData.pageViews ? anonymizeAnalyticsData(analyticsData.pageViews) : [],
      clicks: analyticsData.clicks ? anonymizeAnalyticsData(analyticsData.clicks) : [],
    };

    return {
      analytics: sanitizedAnalytics,
    };
  } catch (error) {
    console.error('Error exporting user analytics:', error);
    return { analytics: null };
  }
}

/**
 * Export user settings
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Settings data
 */
export async function exportUserSettings(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return { settings: null };
    }

    const userData = userDoc.data();

    return {
      settings: userData.settings || {},
      appearance: userData.appearance || {},
      preferences: userData.preferences || {},
    };
  } catch (error) {
    console.error('Error exporting user settings:', error);
    return { settings: null };
  }
}

/**
 * Generate CSV from contacts array
 * @param {Array<Object>} contacts - Array of contacts
 * @returns {string} CSV formatted string
 */
function generateContactsCSV(contacts) {
  if (!contacts || contacts.length === 0) {
    return '';
  }

  // Define CSV headers
  const headers = [
    'Name',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Company',
    'Position',
    'Address',
    'Website',
    'LinkedIn',
    'Twitter',
    'Notes',
    'Tags',
    'Met At',
    'Location Met',
    'Created Date',
  ];

  // Build CSV rows
  const rows = [headers.join(',')];

  contacts.forEach((contact) => {
    const row = [
      csvEscape(contact.name || ''),
      csvEscape(contact.firstName || ''),
      csvEscape(contact.lastName || ''),
      csvEscape(contact.email || ''),
      csvEscape(contact.phone || contact.phoneNumber || ''),
      csvEscape(contact.company || contact.organization || ''),
      csvEscape(contact.position || contact.jobTitle || ''),
      csvEscape(typeof contact.address === 'string' ? contact.address : contact.location || ''),
      csvEscape(contact.website || contact.url || ''),
      csvEscape(contact.linkedin || contact.linkedinUrl || ''),
      csvEscape(contact.twitter || contact.twitterHandle || ''),
      csvEscape(contact.notes || contact.note || ''),
      csvEscape(Array.isArray(contact.tags) ? contact.tags.join('; ') : ''),
      csvEscape(contact.metAt || contact.whereWeMet || ''),
      csvEscape(contact.locationMet || ''),
      csvEscape(contact.createdAt ? new Date(contact.createdAt).toISOString() : ''),
    ];

    rows.push(row.join(','));
  });

  return rows.join('\n');
}

/**
 * Escape special characters for CSV
 * @param {string} value - Value to escape
 * @returns {string} CSV-safe value
 */
function csvEscape(value) {
  if (!value) return '""';

  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return `"${str}"`;
}

/**
 * Anonymize analytics data (remove IP addresses)
 * @param {Array} analyticsArray - Array of analytics events
 * @returns {Array} Anonymized analytics
 */
function anonymizeAnalyticsData(analyticsArray) {
  if (!Array.isArray(analyticsArray)) {
    return [];
  }

  return analyticsArray.map((event) => {
    const { ipAddress, ...rest } = event;
    return {
      ...rest,
      ipAddress: ipAddress ? '[anonymized]' : null,
    };
  });
}

/**
 * Generate export files manifest
 * @param {Object} exportPackage - Export package
 * @returns {Promise<Object>} Files manifest
 */
async function generateExportFiles(exportPackage) {
  const locale = exportPackage.userLanguage || 'en';

  const files = {
    'user_profile.json': {
      description: translateServerSide('privacy.export.files.user_profile.description', locale),
      format: 'JSON',
      content: JSON.stringify(exportPackage.dataCategories.profile, null, 2),
    },
    'README.txt': {
      description: translateServerSide('privacy.export.files.readme.description', locale),
      format: 'TEXT',
      content: generateReadmeContent(exportPackage, locale),
    },
  };

  // Add contacts files if available
  if (exportPackage.dataCategories.contacts) {
    files['contacts.json'] = {
      description: translateServerSide('privacy.export.files.contacts_json.description', locale),
      format: 'JSON',
      content: JSON.stringify(exportPackage.dataCategories.contacts.contacts, null, 2),
    };

    files['contacts.csv'] = {
      description: translateServerSide('privacy.export.files.contacts_csv.description', locale),
      format: 'CSV',
      content: exportPackage.dataCategories.contacts.formats.csv,
    };

    files['contacts.vcf'] = {
      description: translateServerSide('privacy.export.files.contacts_vcf.description', locale),
      format: 'vCard',
      content: exportPackage.dataCategories.contacts.formats.vcard,
    };
  }

  // Add groups if available
  if (exportPackage.dataCategories.groups?.groups?.length > 0) {
    files['groups.json'] = {
      description: translateServerSide('privacy.export.files.groups.description', locale),
      format: 'JSON',
      content: JSON.stringify(exportPackage.dataCategories.groups.groups, null, 2),
    };
  }

  // Add analytics if available
  if (exportPackage.dataCategories.analytics?.analytics) {
    files['analytics.json'] = {
      description: translateServerSide('privacy.export.files.analytics.description', locale),
      format: 'JSON',
      content: JSON.stringify(exportPackage.dataCategories.analytics.analytics, null, 2),
    };
  }

  // Add consents if available
  if (exportPackage.dataCategories.consents) {
    files['consent_history.json'] = {
      description: translateServerSide('privacy.export.files.consent_history.description', locale),
      format: 'JSON',
      content: JSON.stringify(exportPackage.dataCategories.consents, null, 2),
    };
  }

  // Add settings if available
  if (exportPackage.dataCategories.settings) {
    files['settings.json'] = {
      description: translateServerSide('privacy.export.files.settings.description', locale),
      format: 'JSON',
      content: JSON.stringify(exportPackage.dataCategories.settings, null, 2),
    };
  }

  return files;
}

/**
 * Generate README content for export package
 * @param {Object} exportPackage - Export package
 * @param {string} locale - User's language locale
 * @returns {string} README content
 */
function generateReadmeContent(exportPackage, locale = 'en') {
  const t = (key) => translateServerSide(key, locale);

  return `
═══════════════════════════════════════════════════════════════
  ${t('privacy.export.readme.title')}
  ${t('privacy.export.readme.subtitle')}
═══════════════════════════════════════════════════════════════

Export Date: ${new Date(exportPackage.exportDate).toLocaleString(locale)}
User ID: ${exportPackage.userId}

${t('privacy.export.readme.intro')}

───────────────────────────────────────────────────────────────
  ${t('privacy.export.readme.sections.files.title')}
───────────────────────────────────────────────────────────────

${t('privacy.export.readme.sections.files.user_profile')}

${t('privacy.export.readme.sections.files.contacts_json')}

${t('privacy.export.readme.sections.files.contacts_csv')}

${t('privacy.export.readme.sections.files.contacts_vcf')}

${t('privacy.export.readme.sections.files.groups')}

${t('privacy.export.readme.sections.files.analytics')}

${t('privacy.export.readme.sections.files.consent_history')}

${t('privacy.export.readme.sections.files.settings')}

───────────────────────────────────────────────────────────────
  ${t('privacy.export.readme.sections.usage.title')}
───────────────────────────────────────────────────────────────

${t('privacy.export.readme.sections.usage.import')}
${t('privacy.export.readme.sections.usage.migrate')}
${t('privacy.export.readme.sections.usage.backup')}
${t('privacy.export.readme.sections.usage.review')}
${t('privacy.export.readme.sections.usage.transfer')}

───────────────────────────────────────────────────────────────
  ${t('privacy.export.readme.sections.deletion.title')}
───────────────────────────────────────────────────────────────

${t('privacy.export.readme.sections.deletion.note')}

${t('privacy.export.readme.sections.deletion.step1')}
${t('privacy.export.readme.sections.deletion.step2')}
${t('privacy.export.readme.sections.deletion.step3')}

${t('privacy.export.readme.sections.deletion.warning')}

───────────────────────────────────────────────────────────────
  ${t('privacy.export.readme.sections.rights.title')}
───────────────────────────────────────────────────────────────

${t('privacy.export.readme.sections.rights.access')}
${t('privacy.export.readme.sections.rights.rectification')}
${t('privacy.export.readme.sections.rights.erasure')}
${t('privacy.export.readme.sections.rights.portability')}
${t('privacy.export.readme.sections.rights.object')}
${t('privacy.export.readme.sections.rights.restriction')}

───────────────────────────────────────────────────────────────
  ${t('privacy.export.readme.sections.contact.title')}
───────────────────────────────────────────────────────────────

${t('privacy.export.readme.sections.contact.dpo')}
${t('privacy.export.readme.sections.contact.privacy_policy')}
${t('privacy.export.readme.sections.contact.support')}

───────────────────────────────────────────────────────────────

${t('privacy.export.readme.sections.footer.generated')}

${t('privacy.export.readme.sections.footer.thanks')}

═══════════════════════════════════════════════════════════════
`;
}

/**
 * Create export request record (for tracking)
 * @param {string} userId - User ID
 * @param {Object} metadata - Request metadata
 * @returns {Promise<Object>} Export request record
 */
export async function createExportRequest(userId, metadata = {}) {
  try {
    const exportRequest = {
      userId,
      requestedAt: FieldValue.serverTimestamp(),
      status: 'pending',
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      completedAt: null,
      downloadUrl: null,
      expiresAt: null,
    };

    const docRef = await db.collection('PrivacyRequests').add(exportRequest);

    // Create audit log for export request
    await logAuditEvent({
      category: AUDIT_CATEGORIES.DATA_EXPORT,
      action: 'export_requested',
      userId: userId,
      resourceType: 'data_export',
      resourceId: docRef.id,
      details: 'Data export requested',
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      metadata: {
        requestId: docRef.id,
        status: 'pending',
      },
    });

    return {
      success: true,
      requestId: docRef.id,
      exportRequest,
    };
  } catch (error) {
    console.error('Error creating export request:', error);
    throw error;
  }
}

/**
 * Update export request status
 * @param {string} requestId - Request ID
 * @param {string} status - New status
 * @param {Object} updates - Additional updates
 * @returns {Promise<void>}
 */
export async function updateExportRequest(requestId, status, updates = {}) {
  try {
    const updateData = {
      status,
      ...updates,
    };

    if (status === 'completed') {
      updateData.completedAt = FieldValue.serverTimestamp();
      // Set expiration to 24 hours from now
      updateData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    await db.collection('PrivacyRequests').doc(requestId).update(updateData);

    // Create audit log for completed exports
    if (status === 'completed') {
      // Get export request to retrieve userId
      const exportDoc = await db.collection('PrivacyRequests').doc(requestId).get();
      const exportData = exportDoc.data();

      // Count files generated
      const filesGenerated = updates.exportData?.files
        ? Object.keys(updates.exportData.files).length
        : 0;

      await logAuditEvent({
        category: AUDIT_CATEGORIES.DATA_EXPORT,
        action: 'export_completed',
        userId: exportData.userId,
        resourceType: 'data_export',
        resourceId: requestId,
        details: `Data export completed successfully - ${filesGenerated} files generated`,
        ipAddress: exportData.ipAddress,
        userAgent: exportData.userAgent,
        metadata: {
          requestId: requestId,
          filesGenerated: filesGenerated,
          contactCount: updates.summary?.contactCount || 0,
          groupCount: updates.summary?.groupCount || 0,
          consentCount: updates.summary?.consentCount || 0,
          totalDataCategories: updates.summary?.totalDataCategories || 0,
        },
      });
    }
  } catch (error) {
    console.error('Error updating export request:', error);
    throw error;
  }
}

/**
 * Get export request by ID
 * @param {string} requestId - Request ID
 * @returns {Promise<Object>} Export request
 */
export async function getExportRequest(requestId) {
  try {
    const doc = await db.collection('PrivacyRequests').doc(requestId).get();

    if (!doc.exists) {
      throw new Error('Export request not found');
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error('Error getting export request:', error);
    throw error;
  }
}

/**
 * Get all export requests for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Export requests
 */
export async function getUserExportRequests(userId) {
  try {
    const snapshot = await db
      .collection('PrivacyRequests')
      .where('userId', '==', userId)
      .where('type', '==', 'export')
      .orderBy('requestedAt', 'desc')
      .limit(10)
      .get();

    const requests = [];
    snapshot.forEach((doc) => {
      requests.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return requests;
  } catch (error) {
    console.error('Error getting user export requests:', error);
    return [];
  }
}
