import {
  DYNAMIC_FIELDS_TO_KEEP,
  DYNAMIC_FIELDS_TO_DELETE,
  METADATA_FIELDS_TO_ANONYMIZE,
  METADATA_FIELDS_TO_KEEP,
  ANONYMIZED_PLACEHOLDER,
  DELETION_NOTICE_TEMPLATE,
  ANONYMIZED_NAME_TEMPLATE
} from '../constants/anonymizationConstants.js';

/**
 * Contact Anonymization Service
 *
 * Handles anonymization of contact fields for GDPR Article 17 compliance.
 * Implements Option B (Preserve Context) strategy:
 * - Anonymizes all PII (personal identifiers)
 * - Preserves business context (company, jobTitle, department, industry)
 * - Preserves User B's own data (notes, tags)
 */
export class ContactAnonymizationService {

  /**
   * Anonymize dynamic fields object
   * Selectively keeps business context fields, deletes PII fields
   *
   * @param {Object} dynamicFields - Original dynamic fields object
   * @returns {Object} Anonymized dynamic fields (only non-PII fields)
   */
  static anonymizeDynamicFields(dynamicFields) {
    // Validation
    if (!dynamicFields || typeof dynamicFields !== 'object') {
      return {};
    }

    const anonymized = {};

    // Iterate through all fields and selectively keep/delete
    for (const [key, value] of Object.entries(dynamicFields)) {
      const lowerKey = key.toLowerCase();

      // Keep explicitly allowed fields (business context)
      if (DYNAMIC_FIELDS_TO_KEEP.some(allowed => lowerKey.includes(allowed.toLowerCase()))) {
        anonymized[key] = value;
        continue;
      }

      // Delete explicitly forbidden fields (PII)
      if (DYNAMIC_FIELDS_TO_DELETE.some(forbidden => lowerKey.includes(forbidden.toLowerCase()))) {
        continue; // Don't include in anonymized object
      }

      // Unknown field - delete by default (safe approach for GDPR)
      // If it's not explicitly allowed, we don't keep it
      continue;
    }

    return anonymized;
  }

  /**
   * Anonymize metadata object
   * Keeps only non-sensitive metadata fields
   *
   * @param {Object} metadata - Original metadata object
   * @returns {Object} Anonymized metadata (only non-sensitive fields)
   */
  static anonymizeMetadata(metadata) {
    // Validation
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    const anonymized = {};

    // Only keep explicitly allowed metadata fields
    for (const field of METADATA_FIELDS_TO_KEEP) {
      if (metadata[field] !== undefined) {
        anonymized[field] = metadata[field];
      }
    }

    return anonymized;
  }

  /**
   * Anonymize a complete contact object
   * Applies comprehensive anonymization according to GDPR Article 17
   *
   * Fields Anonymized (17 fields):
   * - name, email, phone, phoneNumbers[], website, message
   * - userId, weavinkUserId
   * - location.latitude, location.longitude, location.address
   * - dynamicFields (selective - removes social media, keeps business context)
   * - details[] (entire array)
   * - metadata (selective - removes IP, userAgent, etc.)
   *
   * Fields Preserved (13+ fields):
   * - company, jobTitle
   * - location.venue, location.accuracy
   * - dynamicFields (selective - keeps department, industry, etc.)
   * - notes (with appended deletion notice), tags
   * - status, source, timestamps, createdBy
   *
   * @param {Object} contact - Original contact object
   * @param {string} deletionDate - ISO date string of deletion
   * @returns {Object} Anonymized contact object
   */
  static anonymizeContact(contact, deletionDate) {
    const formattedDate = deletionDate.split('T')[0]; // YYYY-MM-DD

    return {
      // Copy all original fields first
      ...contact,

      // === Anonymized fields ===

      // Direct identifiers
      name: ANONYMIZED_NAME_TEMPLATE(formattedDate),
      email: ANONYMIZED_PLACEHOLDER,
      phone: ANONYMIZED_PLACEHOLDER,
      phoneNumbers: [], // Delete entire array
      website: ANONYMIZED_PLACEHOLDER,
      message: ANONYMIZED_PLACEHOLDER,
      userId: null,
      weavinkUserId: null,

      // Location data (selective)
      location: contact.location ? {
        ...contact.location,
        latitude: null,           // GPS coordinate - PII
        longitude: null,          // GPS coordinate - PII
        address: ANONYMIZED_PLACEHOLDER,  // Physical address - PII
        // Keep: accuracy (technical metadata), venue (event location - business context)
      } : null,

      // Dynamic fields (selective anonymization)
      dynamicFields: this.anonymizeDynamicFields(contact.dynamicFields),

      // Legacy custom fields (delete entire array)
      details: [],

      // Metadata (selective anonymization)
      metadata: this.anonymizeMetadata(contact.metadata),

      // Notes - append deletion notice
      // User B's notes are their own data, so we preserve them
      notes: contact.notes
        ? contact.notes + DELETION_NOTICE_TEMPLATE(formattedDate)
        : DELETION_NOTICE_TEMPLATE(formattedDate).trim(),

      // === Preserved fields (no changes) ===
      // These are inherited from the spread operator above:
      // - company (business entity - not PII)
      // - jobTitle (professional context without name)
      // - tags (User B's categorization)
      // - status, source (technical metadata)
      // - submittedAt, lastModified, createdBy (technical metadata)

      // === Anonymization tracking (NEW fields) ===
      isAnonymized: true,
      anonymizedDate: new Date().toISOString(),
      originalName: contact.name || 'Unknown' // For audit trail only, not displayed to User B
    };
  }
}
