/**
 * Data Export Service
 * Handles GDPR Art. 20 (Right to Data Portability) compliance
 * Exports all user data in machine-readable formats
 */

import { db } from '../../../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { exportContactsToVCard } from '../../../utils/vCardGenerator.js';
import { exportConsentData } from './consentService.js';

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

    const exportPackage = {
      exportDate: new Date().toISOString(),
      userId,
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
      exportPackage.dataCategories.consents = await exportConsentData(userId);
    }

    // 6. Settings
    if (includeSettings) {
      exportPackage.dataCategories.settings = await exportUserSettings(userId);
    }

    // 7. Generate file manifests
    exportPackage.files = await generateExportFiles(exportPackage);

    console.log(`[DataExport] Export completed for user: ${userId}`);

    return {
      success: true,
      exportPackage,
      summary: {
        totalDataCategories: Object.keys(exportPackage.dataCategories).length,
        contactCount: exportPackage.dataCategories.contacts?.contacts?.length || 0,
        groupCount: exportPackage.dataCategories.groups?.groups?.length || 0,
        consentCount: exportPackage.dataCategories.consents?.history?.length || 0,
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
      return { contacts: [], formats: {} };
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
  const files = {
    'user_profile.json': {
      description: 'Your complete user profile and account information',
      format: 'JSON',
      content: JSON.stringify(exportPackage.dataCategories.profile, null, 2),
    },
    'README.txt': {
      description: 'Information about your data export',
      format: 'TEXT',
      content: generateReadmeContent(exportPackage),
    },
  };

  // Add contacts files if available
  if (exportPackage.dataCategories.contacts) {
    files['contacts.json'] = {
      description: 'Your contacts in JSON format',
      format: 'JSON',
      content: JSON.stringify(exportPackage.dataCategories.contacts.contacts, null, 2),
    };

    files['contacts.csv'] = {
      description: 'Your contacts in CSV format (Excel compatible)',
      format: 'CSV',
      content: exportPackage.dataCategories.contacts.formats.csv,
    };

    files['contacts.vcf'] = {
      description: 'Your contacts in vCard format (compatible with all contact managers)',
      format: 'vCard',
      content: exportPackage.dataCategories.contacts.formats.vcard,
    };
  }

  // Add groups if available
  if (exportPackage.dataCategories.groups?.groups?.length > 0) {
    files['groups.json'] = {
      description: 'Your contact groups and categories',
      format: 'JSON',
      content: JSON.stringify(exportPackage.dataCategories.groups.groups, null, 2),
    };
  }

  // Add analytics if available
  if (exportPackage.dataCategories.analytics?.analytics) {
    files['analytics.json'] = {
      description: 'Your profile analytics data (anonymized)',
      format: 'JSON',
      content: JSON.stringify(exportPackage.dataCategories.analytics.analytics, null, 2),
    };
  }

  // Add consents if available
  if (exportPackage.dataCategories.consents) {
    files['consent_history.json'] = {
      description: 'Your consent history and preferences',
      format: 'JSON',
      content: JSON.stringify(exportPackage.dataCategories.consents, null, 2),
    };
  }

  // Add settings if available
  if (exportPackage.dataCategories.settings) {
    files['settings.json'] = {
      description: 'Your application settings and preferences',
      format: 'JSON',
      content: JSON.stringify(exportPackage.dataCategories.settings, null, 2),
    };
  }

  return files;
}

/**
 * Generate README content for export package
 * @param {Object} exportPackage - Export package
 * @returns {string} README content
 */
function generateReadmeContent(exportPackage) {
  return `
═══════════════════════════════════════════════════════════════
  WEAVINK DATA EXPORT
  Your Personal Data Package
═══════════════════════════════════════════════════════════════

Export Date: ${new Date(exportPackage.exportDate).toLocaleString()}
User ID: ${exportPackage.userId}

This package contains all your personal data stored in Weavink,
exported in compliance with GDPR Article 20 (Right to Data Portability).

───────────────────────────────────────────────────────────────
  FILES IN THIS PACKAGE
───────────────────────────────────────────────────────────────

📄 user_profile.json
   Your complete user profile and account information

📇 contacts.json
   All your contacts in JSON format (machine-readable)

📊 contacts.csv
   All your contacts in CSV format (Excel compatible)

📇 contacts.vcf
   All your contacts in vCard format (compatible with:
   - Google Contacts
   - Apple Contacts
   - Microsoft Outlook
   - All major CRM systems)

📂 groups.json
   Your contact groups and categories

📊 analytics.json
   Your profile analytics data (IP addresses anonymized)

✅ consent_history.json
   Complete history of your privacy consents

⚙️  settings.json
   Your application settings and preferences

───────────────────────────────────────────────────────────────
  WHAT YOU CAN DO WITH THIS DATA
───────────────────────────────────────────────────────────────

✓ Import contacts into any contact management system
✓ Migrate to a competitor service (no vendor lock-in)
✓ Keep a local backup of your data
✓ Review what data Weavink stores about you
✓ Transfer to another GDPR-compliant service

───────────────────────────────────────────────────────────────
  DATA RETENTION & DELETION
───────────────────────────────────────────────────────────────

This export does NOT delete your data from Weavink.
To delete your account and all associated data:

1. Go to Settings → Privacy Center
2. Click "Delete My Account"
3. Confirm deletion

Deletion is permanent and cannot be undone.

───────────────────────────────────────────────────────────────
  YOUR RIGHTS UNDER GDPR
───────────────────────────────────────────────────────────────

✓ Right to access (Art. 15) - YOU ARE HERE
✓ Right to rectification (Art. 16) - Edit your data
✓ Right to erasure (Art. 17) - Delete your account
✓ Right to portability (Art. 20) - This export
✓ Right to object (Art. 21) - Opt-out of processing
✓ Right to restriction (Art. 18) - Limit processing

───────────────────────────────────────────────────────────────
  QUESTIONS OR CONCERNS?
───────────────────────────────────────────────────────────────

Data Protection Officer: dpo@weavink.io
Privacy Policy: https://weavink.io/privacy-policy
Support: support@weavink.io

───────────────────────────────────────────────────────────────

This export was generated automatically by Weavink's GDPR
compliance system. All data has been exported in standard,
machine-readable formats to ensure portability.

Thank you for trusting Weavink with your professional network!

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
