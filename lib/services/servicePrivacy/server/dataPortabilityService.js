/**
 * Data Portability Enhancement Service
 *
 * GDPR Art. 20 - Right to Data Portability (Enhanced)
 * Extends basic export with additional formats and import capabilities
 *
 * Features:
 * - XML and PDF export formats
 * - Import from competitors (Google, Outlook, etc.)
 * - API for automated exports
 * - Export scheduling and versioning
 * - Format conversion utilities
 */

import { adminDb } from '../../../firebaseAdmin.js';
const db = adminDb;
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Supported export formats
 */
export const EXPORT_FORMATS = {
  JSON: 'json',
  CSV: 'csv',
  XML: 'xml',
  PDF: 'pdf',
  VCARD: 'vcard',
};

/**
 * Supported import sources
 */
export const IMPORT_SOURCES = {
  GOOGLE_CONTACTS: 'google_contacts',
  OUTLOOK: 'outlook',
  APPLE_CONTACTS: 'apple_contacts',
  GENERIC_CSV: 'generic_csv',
  GENERIC_VCARD: 'generic_vcard',
};

/**
 * Export user data in XML format
 * @param {string} userId - User ID
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Export result
 */
export async function exportToXML(userId, options = {}) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();

    // Build XML structure
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<userExport>\n';
    xml += '  <metadata>\n';
    xml += `    <exportDate>${new Date().toISOString()}</exportDate>\n`;
    xml += `    <userId>${userId}</userId>\n`;
    xml += `    <format>XML</format>\n`;
    xml += '  </metadata>\n';

    // User profile
    xml += '  <profile>\n';
    xml += `    <email>${escapeXml(userData.email || '')}</email>\n`;
    xml += `    <displayName>${escapeXml(userData.displayName || '')}</displayName>\n`;
    if (userData.profile) {
      xml += `    <firstName>${escapeXml(userData.profile.firstName || '')}</firstName>\n`;
      xml += `    <lastName>${escapeXml(userData.profile.lastName || '')}</lastName>\n`;
    }
    xml += '  </profile>\n';

    // Consents
    if (userData.consents) {
      xml += '  <consents>\n';
      for (const [key, value] of Object.entries(userData.consents)) {
        xml += `    <consent type="${escapeXml(key)}" granted="${value}" />\n`;
      }
      xml += '  </consents>\n';
    }

    // Get contacts if requested
    if (options.includeContacts) {
      const contactsSnapshot = await db.collection('contacts')
        .where('userId', '==', userId)
        .get();

      xml += '  <contacts>\n';
      contactsSnapshot.forEach(doc => {
        const contact = doc.data();
        xml += '    <contact>\n';
        xml += `      <id>${doc.id}</id>\n`;
        xml += `      <firstName>${escapeXml(contact.firstName || '')}</firstName>\n`;
        xml += `      <lastName>${escapeXml(contact.lastName || '')}</lastName>\n`;
        xml += `      <email>${escapeXml(contact.email || '')}</email>\n`;
        xml += `      <phone>${escapeXml(contact.phone || '')}</phone>\n`;
        xml += '    </contact>\n';
      });
      xml += '  </contacts>\n';
    }

    xml += '</userExport>';

    console.log(`[Portability] XML export created for user ${userId}`);

    return {
      success: true,
      format: 'xml',
      content: xml,
      filename: `user_data_${userId}_${Date.now()}.xml`,
      size: Buffer.byteLength(xml, 'utf8'),
    };
  } catch (error) {
    console.error('[Portability] Error exporting to XML:', error);
    throw new Error(`Failed to export to XML: ${error.message}`);
  }
}

/**
 * Export user data in PDF format
 * @param {string} userId - User ID
 * @param {Object} options - Export options
 * @returns {Promise<Object>} Export result
 */
export async function exportToPDF(userId, options = {}) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();

    // Generate HTML that can be converted to PDF
    // In production, use a library like puppeteer or pdfkit
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>User Data Export</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
    th { background-color: #f8f9fa; font-weight: bold; }
    .metadata { background-color: #e9ecef; padding: 15px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>Personal Data Export</h1>

  <div class="metadata">
    <p><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>User ID:</strong> ${userId}</p>
    <p><strong>Format:</strong> PDF</p>
  </div>

  <h2>Profile Information</h2>
  <table>
    <tr><th>Field</th><th>Value</th></tr>
    <tr><td>Email</td><td>${userData.email || 'N/A'}</td></tr>
    <tr><td>Display Name</td><td>${userData.displayName || 'N/A'}</td></tr>
    <tr><td>First Name</td><td>${userData.profile?.firstName || 'N/A'}</td></tr>
    <tr><td>Last Name</td><td>${userData.profile?.lastName || 'N/A'}</td></tr>
  </table>

  <h2>Privacy Consents</h2>
  <table>
    <tr><th>Consent Type</th><th>Status</th></tr>
    ${Object.entries(userData.consents || {}).map(([key, value]) =>
      `<tr><td>${key}</td><td>${value ? 'Granted' : 'Denied'}</td></tr>`
    ).join('')}
  </table>

  <p style="margin-top: 50px; text-align: center; color: #666;">
    Generated by Weavink RGPD Compliance System<br>
    This document contains your personal data as per GDPR Art. 20
  </p>
</body>
</html>`;

    console.log(`[Portability] PDF export (HTML) created for user ${userId}`);

    return {
      success: true,
      format: 'pdf',
      content: html,
      contentType: 'text/html', // In production, convert to actual PDF
      filename: `user_data_${userId}_${Date.now()}.pdf`,
      size: Buffer.byteLength(html, 'utf8'),
      note: 'HTML format - convert to PDF using PDF library in production',
    };
  } catch (error) {
    console.error('[Portability] Error exporting to PDF:', error);
    throw new Error(`Failed to export to PDF: ${error.message}`);
  }
}

/**
 * Import contacts from external source
 * @param {string} userId - User ID
 * @param {Object} importData - Import data and metadata
 * @returns {Promise<Object>} Import result
 */
export async function importContacts(userId, importData) {
  try {
    const { source, data, options = {} } = importData;

    let contacts = [];
    let importedCount = 0;
    let errors = [];

    // Parse based on source
    switch (source) {
      case IMPORT_SOURCES.GOOGLE_CONTACTS:
        contacts = parseGoogleContacts(data);
        break;

      case IMPORT_SOURCES.OUTLOOK:
        contacts = parseOutlookContacts(data);
        break;

      case IMPORT_SOURCES.GENERIC_CSV:
        contacts = parseGenericCSV(data);
        break;

      case IMPORT_SOURCES.GENERIC_VCARD:
        contacts = parseVCard(data);
        break;

      default:
        throw new Error(`Unsupported import source: ${source}`);
    }

    // Import contacts
    const batch = db.batch();

    for (const contact of contacts) {
      try {
        // Validate and sanitize contact data
        const sanitizedContact = {
          userId,
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email || '',
          phone: contact.phone || '',
          company: contact.company || '',
          importedFrom: source,
          importedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        };

        // Check for duplicates if requested
        if (options.checkDuplicates) {
          const existingContact = await db.collection('contacts')
            .where('userId', '==', userId)
            .where('email', '==', sanitizedContact.email)
            .limit(1)
            .get();

          if (!existingContact.empty) {
            errors.push({
              contact: sanitizedContact,
              error: 'Duplicate email address',
            });
            continue;
          }
        }

        const docRef = db.collection('contacts').doc();
        batch.set(docRef, sanitizedContact);
        importedCount++;
      } catch (error) {
        errors.push({
          contact,
          error: error.message,
        });
      }
    }

    await batch.commit();

    // Log import activity
    await db.collection('ImportLogs').add({
      userId,
      source,
      importedCount,
      totalContacts: contacts.length,
      errorCount: errors.length,
      timestamp: FieldValue.serverTimestamp(),
    });

    console.log(`[Portability] Imported ${importedCount}/${contacts.length} contacts for user ${userId}`);

    return {
      success: true,
      imported: importedCount,
      total: contacts.length,
      errors,
      source,
    };
  } catch (error) {
    console.error('[Portability] Error importing contacts:', error);
    throw new Error(`Failed to import contacts: ${error.message}`);
  }
}

/**
 * Parse Google Contacts format
 * @param {string} data - CSV data from Google
 * @returns {Array} Parsed contacts
 */
function parseGoogleContacts(data) {
  const contacts = [];
  const lines = data.split('\n');

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(',');
    if (fields.length >= 3) {
      contacts.push({
        firstName: fields[0]?.trim(),
        lastName: fields[1]?.trim(),
        email: fields[2]?.trim(),
        phone: fields[3]?.trim(),
      });
    }
  }

  return contacts;
}

/**
 * Parse Outlook contacts format
 * @param {string} data - CSV data from Outlook
 * @returns {Array} Parsed contacts
 */
function parseOutlookContacts(data) {
  const contacts = [];
  const lines = data.split('\n');

  // Outlook CSV format: First Name,Last Name,Email,Business Phone
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(',');
    if (fields.length >= 3) {
      contacts.push({
        firstName: fields[0]?.trim(),
        lastName: fields[1]?.trim(),
        email: fields[2]?.trim(),
        phone: fields[3]?.trim(),
      });
    }
  }

  return contacts;
}

/**
 * Parse generic CSV format
 * @param {string} data - Generic CSV data
 * @returns {Array} Parsed contacts
 */
function parseGenericCSV(data) {
  const contacts = [];
  const lines = data.split('\n');

  // Assume: firstName,lastName,email,phone
  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(',');
    if (fields.length >= 2) {
      contacts.push({
        firstName: fields[0]?.trim(),
        lastName: fields[1]?.trim(),
        email: fields[2]?.trim(),
        phone: fields[3]?.trim(),
      });
    }
  }

  return contacts;
}

/**
 * Parse vCard format
 * @param {string} data - vCard data
 * @returns {Array} Parsed contacts
 */
function parseVCard(data) {
  const contacts = [];
  const vcards = data.split('BEGIN:VCARD');

  for (const vcard of vcards) {
    if (!vcard.trim()) continue;

    const contact = {};
    const lines = vcard.split('\n');

    for (const line of lines) {
      if (line.startsWith('FN:')) {
        const fullName = line.substring(3).trim();
        const parts = fullName.split(' ');
        contact.firstName = parts[0] || '';
        contact.lastName = parts.slice(1).join(' ') || '';
      } else if (line.startsWith('EMAIL:')) {
        contact.email = line.substring(6).trim();
      } else if (line.startsWith('TEL:')) {
        contact.phone = line.substring(4).trim();
      }
    }

    if (contact.firstName || contact.lastName || contact.email) {
      contacts.push(contact);
    }
  }

  return contacts;
}

/**
 * Schedule automated export
 * @param {string} userId - User ID
 * @param {Object} schedule - Schedule configuration
 * @returns {Promise<Object>} Schedule result
 */
export async function scheduleExport(userId, schedule) {
  try {
    const { frequency, format, includeContacts = false } = schedule;

    const exportSchedule = {
      userId,
      frequency, // 'daily', 'weekly', 'monthly'
      format,
      includeContacts,
      enabled: true,
      lastExport: null,
      nextExport: calculateNextExport(frequency),
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('ExportSchedules').add(exportSchedule);

    console.log(`[Portability] Export scheduled for user ${userId}: ${frequency}`);

    return {
      success: true,
      scheduleId: docRef.id,
      schedule: {
        id: docRef.id,
        ...exportSchedule,
      },
    };
  } catch (error) {
    console.error('[Portability] Error scheduling export:', error);
    throw new Error(`Failed to schedule export: ${error.message}`);
  }
}

/**
 * Get export history
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Export history
 */
export async function getExportHistory(userId, options = {}) {
  try {
    const { limit = 20 } = options;

    const snapshot = await db.collection('PrivacyRequests')
      .where('userId', '==', userId)
      .where('type', '==', 'export')
      .orderBy('requestedAt', 'desc')
      .limit(limit)
      .get();

    const exports = [];
    snapshot.forEach(doc => {
      exports.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      exports,
      count: exports.length,
    };
  } catch (error) {
    console.error('[Portability] Error getting export history:', error);
    throw new Error(`Failed to get export history: ${error.message}`);
  }
}

/**
 * Calculate next export date based on frequency
 * @param {string} frequency - Export frequency
 * @returns {string} Next export ISO date
 */
function calculateNextExport(frequency) {
  const now = new Date();

  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    default:
      now.setDate(now.getDate() + 7); // Default to weekly
  }

  return now.toISOString();
}

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
