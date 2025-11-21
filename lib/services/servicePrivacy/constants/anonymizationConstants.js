/**
 * Contact Anonymization Constants
 *
 * Defines which dynamic fields to keep vs delete when anonymizing contacts
 * for GDPR Article 17 (Right to be Forgotten) compliance.
 *
 * Strategy: Option B - Preserve Context
 * - Delete all PII (personal identifiers)
 * - Keep business context (company, job title, department, industry)
 * - Keep User B's own data (notes, tags)
 */

// Dynamic fields that represent business context (non-PII) - KEEP these
export const DYNAMIC_FIELDS_TO_KEEP = [
  'department',
  'industry',
  'specialty',
  'businessCategory',
  'sector',
  'field',
  'expertise',
  'businessType',
  'companySize',
  'role'
];

// Dynamic fields that contain personal identifiers (PII) - DELETE these
export const DYNAMIC_FIELDS_TO_DELETE = [
  'linkedin',
  'twitter',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'github',
  'medium',
  'personalEmail',
  'officePhone',
  'mobilePhone',
  'cellPhone',
  'personalWebsite',
  'blog',
  'portfolio',
  'whatsapp',
  'telegram',
  'skype',
  'slack',
  'discord'
];

// Metadata fields to delete (tracking/PII data)
export const METADATA_FIELDS_TO_ANONYMIZE = [
  'ip',
  'userAgent',
  'referrer',
  'sessionId',
  'timezone'
];

// Metadata fields to keep (non-sensitive)
export const METADATA_FIELDS_TO_KEEP = [
  'language',
  'submissionTime',
  'hasScannedData'
];

// Placeholder for anonymized fields
export const ANONYMIZED_PLACEHOLDER = '[deleted]';

// Deletion notice template
export const DELETION_NOTICE_TEMPLATE = (date) =>
  `\n\n⚠️ This contact deleted their Weavink account on ${date}. Some contact details have been removed for privacy compliance.`;

// Name anonymization template
export const ANONYMIZED_NAME_TEMPLATE = (date) =>
  `[Contact Deleted - ${date}]`;
