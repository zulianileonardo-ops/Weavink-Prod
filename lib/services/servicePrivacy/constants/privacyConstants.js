/**
 * Privacy & GDPR/RGPD Constants
 *
 * This file centralizes all constants related to privacy, GDPR compliance,
 * and data protection features in the Weavink application.
 *
 * @see documentation/rgpd/RGPD_COMPLIANCE_MATRIX.md for full compliance documentation
 * @see code-manager-skill for architectural patterns
 */

// ============================================================================
// CONSENT MANAGEMENT (GDPR Art. 7 - Conditions for consent)
// ============================================================================

/**
 * Available consent types in the system
 * Each type represents a distinct consent that users can grant or withdraw
 */
export const CONSENT_TYPES = {
  // Legal & Policy Consents
  TERMS_OF_SERVICE: 'terms_of_service',
  PRIVACY_POLICY: 'privacy_policy',

  // Marketing & Communications
  MARKETING_EMAILS: 'marketing_emails',

  // AI Feature Consents
  AI_SEMANTIC_SEARCH: 'ai_semantic_search',
  AI_AUTO_GROUPING: 'ai_auto_grouping',
  AI_BUSINESS_CARD_ENHANCEMENT: 'ai_business_card_enhancement',

  // Analytics Consents
  ANALYTICS_DETAILED: 'analytics_detailed',
  ANALYTICS_BASIC: 'analytics_basic',

  // Cookie Consents
  COOKIES_ANALYTICS: 'cookies_analytics',
  COOKIES_PERSONALIZATION: 'cookies_personalization',

  // Profile & Social Consents
  PROFILE_PUBLIC: 'profile_public',
  CONTACT_RECOMMENDATIONS: 'contact_recommendations',
};

/**
 * Consent actions that can be performed
 */
export const CONSENT_ACTIONS = {
  GRANTED: 'granted',
  WITHDRAWN: 'withdrawn',
  UPDATED: 'updated',
};

/**
 * Consent categories for grouping related consents
 */
export const CONSENT_CATEGORIES = {
  ESSENTIAL: 'essential',
  FUNCTIONAL: 'functional',
  ANALYTICS: 'analytics',
  MARKETING: 'marketing',
  AI_FEATURES: 'ai_features',
};

// ============================================================================
// DATA EXPORT & PORTABILITY (GDPR Art. 20 - Right to Data Portability)
// ============================================================================

/**
 * Supported export formats for data portability (Privacy-specific)
 * Ensures data can be exported in machine-readable formats
 */
export const PRIVACY_EXPORT_FORMATS = {
  JSON: 'json',
  CSV: 'csv',
  XML: 'xml',
  PDF: 'pdf',
  VCARD: 'vcard',
};

/**
 * Supported import sources for data portability
 */
export const IMPORT_SOURCES = {
  GOOGLE_CONTACTS: 'google_contacts',
  OUTLOOK: 'outlook',
  APPLE_CONTACTS: 'apple_contacts',
  GENERIC_CSV: 'generic_csv',
  GENERIC_VCARD: 'generic_vcard',
};

/**
 * Export request statuses
 */
export const EXPORT_REQUEST_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
};

// ============================================================================
// ACCOUNT DELETION (GDPR Art. 17 - Right to Erasure)
// ============================================================================

/**
 * Required confirmation texts for account deletion per language
 * Must be typed exactly by the user to confirm deletion
 * Supports multilingual account deletion confirmation
 * @type {Object<string, string>}
 */
export const DELETION_CONFIRMATION_TEXTS = {
  en: 'DELETE MY ACCOUNT',
  fr: 'SUPPRIMER MON COMPTE',
  es: 'ELIMINAR MI CUENTA',
  zh: '删除我的账户',
  vm: 'DELETE MY ACCOUNT'
};

/**
 * @deprecated Use DELETION_CONFIRMATION_TEXTS with locale parameter instead
 * Legacy English-only confirmation text for backward compatibility
 */
export const DELETION_CONFIRMATION_TEXT = DELETION_CONFIRMATION_TEXTS.en;

/**
 * Account deletion request statuses
 */
export const DELETION_REQUEST_STATUS = {
  PENDING: 'pending',
  GRACE_PERIOD: 'grace_period',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};

/**
 * Grace period for account deletion (in days)
 */
export const DELETION_GRACE_PERIOD_DAYS = 30;

// ============================================================================
// PRIVACY PERMISSIONS
// ============================================================================

/**
 * Privacy-related permissions for access control
 * Used with SessionManager to check user permissions
 */
export const PRIVACY_PERMISSIONS = {
  // Consent Management
  CAN_MANAGE_CONSENTS: 'privacy:manage_consents',
  CAN_VIEW_CONSENT_HISTORY: 'privacy:view_consent_history',

  // Data Export
  CAN_EXPORT_DATA: 'privacy:export_data',
  CAN_EXPORT_TEAM_DATA: 'privacy:export_team_data',
  CAN_SCHEDULE_EXPORTS: 'privacy:schedule_exports',

  // Account Deletion
  CAN_DELETE_ACCOUNT: 'privacy:delete_account',
  CAN_DELETE_TEAM_ACCOUNTS: 'privacy:delete_team_accounts',

  // Advanced Privacy Features
  CAN_ACCESS_AUDIT_LOGS: 'privacy:access_audit_logs',
  CAN_MANAGE_RETENTION_POLICIES: 'privacy:manage_retention_policies',
  CAN_VIEW_DPIA: 'privacy:view_dpia',
  CAN_MANAGE_PROCESSORS: 'privacy:manage_processors',
  CAN_REPORT_BREACHES: 'privacy:report_breaches',
};

// ============================================================================
// RATE LIMITS
// ============================================================================

/**
 * Rate limits for privacy-related API endpoints
 * Format: { max: number of requests, window: time window in milliseconds }
 */
export const PRIVACY_RATE_LIMITS = {
  // Consent operations (relatively frequent)
  CONSENT_READ: { max: 30, window: 60000 }, // 30 reads per minute
  CONSENT_UPDATES: { max: 20, window: 60000 }, // 20 updates per minute

  // Data export operations (resource-intensive)
  DATA_EXPORTS: { max: 3, window: 3600000 }, // 3 exports per hour
  EXPORT_STATUS_CHECK: { max: 10, window: 60000 }, // 10 status checks per minute

  // Account deletion (very sensitive)
  ACCOUNT_DELETIONS: { max: 4, window: 3600000 }, // 2 deletion requests per hour

  // Audit log access
  AUDIT_LOG_ACCESS: { max: 20, window: 60000 }, // 20 requests per minute

  // Breach notifications
  BREACH_REPORTS: { max: 5, window: 3600000 }, // 5 reports per hour
};

// ============================================================================
// PRIVACY REQUEST TYPES
// ============================================================================

/**
 * Types of privacy requests users can make
 * Based on GDPR data subject rights (Chapter III, Articles 12-23)
 */
export const PRIVACY_REQUEST_TYPES = {
  ACCESS: 'access', // Art. 15 - Right of access
  RECTIFICATION: 'rectification', // Art. 16 - Right to rectification
  ERASURE: 'erasure', // Art. 17 - Right to erasure (right to be forgotten)
  RESTRICTION: 'restriction', // Art. 18 - Right to restriction of processing
  PORTABILITY: 'portability', // Art. 20 - Right to data portability
  OBJECTION: 'objection', // Art. 21 - Right to object
  AUTOMATED_DECISION: 'automated_decision', // Art. 22 - Automated individual decision-making
};

// ============================================================================
// GDPR ARTICLE REFERENCES
// ============================================================================

/**
 * GDPR article references for documentation and compliance tracking
 * Useful for audit trails and compliance reports
 */
export const GDPR_ARTICLES = {
  // Principles (Art. 5)
  LAWFULNESS: 'Art. 5(1)(a)',
  PURPOSE_LIMITATION: 'Art. 5(1)(b)',
  DATA_MINIMIZATION: 'Art. 5(1)(c)',
  ACCURACY: 'Art. 5(1)(d)',
  STORAGE_LIMITATION: 'Art. 5(1)(e)',
  INTEGRITY_CONFIDENTIALITY: 'Art. 5(1)(f)',

  // Consent (Art. 6-7)
  LEGAL_BASIS: 'Art. 6',
  CONDITIONS_FOR_CONSENT: 'Art. 7',

  // Data Subject Rights (Art. 12-23)
  TRANSPARENT_INFORMATION: 'Art. 12',
  RIGHT_OF_ACCESS: 'Art. 15',
  RIGHT_TO_RECTIFICATION: 'Art. 16',
  RIGHT_TO_ERASURE: 'Art. 17',
  RIGHT_TO_RESTRICTION: 'Art. 18',
  NOTIFICATION_OBLIGATION: 'Art. 19',
  RIGHT_TO_PORTABILITY: 'Art. 20',
  RIGHT_TO_OBJECT: 'Art. 21',
  AUTOMATED_DECISION_MAKING: 'Art. 22',

  // Security (Art. 32)
  SECURITY_OF_PROCESSING: 'Art. 32',

  // Breach Notification (Art. 33-34)
  BREACH_NOTIFICATION_AUTHORITY: 'Art. 33',
  BREACH_NOTIFICATION_SUBJECT: 'Art. 34',

  // DPO (Art. 37-39)
  DPO_DESIGNATION: 'Art. 37',
  DPO_POSITION: 'Art. 38',
  DPO_TASKS: 'Art. 39',
};

// ============================================================================
// DATA RETENTION PERIODS
// ============================================================================

/**
 * Standard data retention periods (in days)
 * Based on legal requirements and business needs
 */
export const DATA_RETENTION_PERIODS = {
  // Consent logs - indefinite (legal requirement)
  CONSENT_LOGS: null, // null = indefinite

  // Audit logs - 7 years (standard compliance)
  AUDIT_LOGS: 365 * 7,

  // Billing records - 10 years (legal requirement in France)
  BILLING_RECORDS: 365 * 10,

  // Export downloads - 24 hours
  EXPORT_DOWNLOADS: 1,

  // Deletion grace period - 30 days
  DELETION_GRACE_PERIOD: 30,

  // Breach notification records - 5 years
  BREACH_RECORDS: 365 * 5,

  // DPIA records - 3 years after processing ceases
  DPIA_RECORDS: 365 * 3,
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

/**
 * Standardized error message KEYS for privacy operations
 * These are translation keys that will be translated server-side based on user's language
 *
 * IMPORTANT: These are now translation keys, not English text!
 * Use translateServerSide(PRIVACY_ERROR_MESSAGES.XXX, locale) in API routes
 *
 * @see /lib/services/server/translationService.js
 */
export const PRIVACY_ERROR_MESSAGES = {
  // Consent errors
  CONSENT_INVALID_TYPE: 'privacy.errors.consent.invalid_type',
  CONSENT_INVALID_ACTION: 'privacy.errors.consent.invalid_action',
  CONSENT_UPDATE_FAILED: 'privacy.errors.consent.update_failed',

  // Export errors
  EXPORT_FAILED: 'privacy.errors.export.failed',
  EXPORT_RATE_LIMIT: 'privacy.errors.export.rate_limit',

  // Deletion errors
  DELETION_FAILED: 'privacy.errors.deletion.failed',
  DELETION_INVALID_CONFIRMATION: 'privacy.errors.deletion.invalid_confirmation',
  DELETION_ALREADY_PENDING: 'privacy.errors.deletion.already_pending',
  DELETION_RATE_LIMIT: 'privacy.errors.deletion.rate_limit',

  // Permission errors
  PERMISSION_DENIED: 'privacy.errors.permission.denied',
};

// ============================================================================
// SUBSCRIPTION TIER LIMITS (for privacy features)
// ============================================================================

/**
 * Privacy feature limits based on subscription tier
 */
export const PRIVACY_FEATURE_LIMITS = {
  BASE: {
    exportsPerMonth: 3,
    auditLogRetention: 30, // days
    exportFormats: [PRIVACY_EXPORT_FORMATS.JSON],
    advancedFeatures: false,
  },
  PRO: {
    exportsPerMonth: 10,
    auditLogRetention: 180, // days
    exportFormats: [PRIVACY_EXPORT_FORMATS.JSON, PRIVACY_EXPORT_FORMATS.CSV, PRIVACY_EXPORT_FORMATS.VCARD],
    advancedFeatures: false,
  },
  PREMIUM: {
    exportsPerMonth: 50,
    auditLogRetention: 365, // days
    exportFormats: [
      PRIVACY_EXPORT_FORMATS.JSON,
      PRIVACY_EXPORT_FORMATS.CSV,
      PRIVACY_EXPORT_FORMATS.XML,
      PRIVACY_EXPORT_FORMATS.PDF,
      PRIVACY_EXPORT_FORMATS.VCARD,
    ],
    advancedFeatures: true,
  },
  ENTERPRISE: {
    exportsPerMonth: null, // unlimited
    auditLogRetention: 365 * 7, // 7 years
    exportFormats: [
      PRIVACY_EXPORT_FORMATS.JSON,
      PRIVACY_EXPORT_FORMATS.CSV,
      PRIVACY_EXPORT_FORMATS.XML,
      PRIVACY_EXPORT_FORMATS.PDF,
      PRIVACY_EXPORT_FORMATS.VCARD,
    ],
    advancedFeatures: true,
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

const PrivacyConstants = {
  CONSENT_TYPES,
  CONSENT_ACTIONS,
  CONSENT_CATEGORIES,
  PRIVACY_EXPORT_FORMATS,
  IMPORT_SOURCES,
  EXPORT_REQUEST_STATUS,
  DELETION_CONFIRMATION_TEXTS,
  DELETION_CONFIRMATION_TEXT,
  DELETION_REQUEST_STATUS,
  DELETION_GRACE_PERIOD_DAYS,
  PRIVACY_PERMISSIONS,
  PRIVACY_RATE_LIMITS,
  PRIVACY_REQUEST_TYPES,
  GDPR_ARTICLES,
  DATA_RETENTION_PERIODS,
  PRIVACY_ERROR_MESSAGES,
  PRIVACY_FEATURE_LIMITS,
};

export default PrivacyConstants;
