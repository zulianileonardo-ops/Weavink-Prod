// tests/contactAnonymization.test.js
/**
 * Comprehensive Test Suite for Contact Anonymization System
 *
 * Tests GDPR Article 17 compliance including:
 * - Contact field anonymization (PII removal)
 * - Business context preservation
 * - Dynamic fields selective handling
 * - Metadata anonymization
 * - Edge cases and validation
 *
 * RUN THIS TEST:
 * node tests/contactAnonymization.test.js
 */

import { ContactAnonymizationService } from '../lib/services/servicePrivacy/server/contactAnonymizationService.js';
import {
  DYNAMIC_FIELDS_TO_KEEP,
  DYNAMIC_FIELDS_TO_DELETE,
  ANONYMIZED_PLACEHOLDER,
  ANONYMIZED_NAME_TEMPLATE,
  DELETION_NOTICE_TEMPLATE
} from '../lib/services/servicePrivacy/constants/anonymizationConstants.js';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Helper: Run a test
async function runTest(name, testFn, category = 'General') {
  const startTime = Date.now();
  try {
    console.log(`\n🧪 Running: ${name}`);
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ PASSED (${duration}ms): ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'passed', duration, category });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ FAILED (${duration}ms): ${name}`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    results.failed++;
    results.tests.push({ name, status: 'failed', duration, category, error: error.message });
  }
}

// Helper: Assert
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Helper: Deep equality check
function deepEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

// ============================================================================
// TEST CATEGORY 1: ContactAnonymizationService.anonymizeContact (20 tests)
// ============================================================================

async function testAnonymizeContactBasic() {
  const contact = {
    id: 'contact123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    company: 'Acme Corp',
    jobTitle: 'CEO',
    status: 'active'
  };

  const deletionDate = '2025-01-15T10:00:00Z';
  const result = ContactAnonymizationService.anonymizeContact(contact, deletionDate);

  // Check anonymized fields
  assert(result.name === '[Contact Deleted - 2025-01-15]', 'Name should be anonymized with date');
  assert(result.email === '[deleted]', 'Email should be anonymized');
  assert(result.phone === '[deleted]', 'Phone should be anonymized');

  // Check preserved fields
  assert(result.company === 'Acme Corp', 'Company should be preserved');
  assert(result.jobTitle === 'CEO', 'Job title should be preserved');
  assert(result.status === 'active', 'Status should be preserved');
  assert(result.id === 'contact123', 'ID should be preserved');

  // Check tracking fields
  assert(result.isAnonymized === true, 'Should be marked as anonymized');
  assert(result.anonymizedDate !== undefined, 'Should have anonymization date');
  assert(result.originalName === 'John Doe', 'Should preserve original name for audit');

  console.log('   ✓ Basic contact anonymization works correctly');
}

async function testAnonymizeContactPreservesCompany() {
  const contact = {
    id: 'contact1',
    name: 'Jane Smith',
    email: 'jane@example.com',
    company: 'Tech Innovations Ltd'
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  assert(result.company === 'Tech Innovations Ltd', 'Company name should be preserved (business context)');
  console.log('   ✓ Company field preserved as business context');
}

async function testAnonymizeContactPreservesJobTitle() {
  const contact = {
    id: 'contact2',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    jobTitle: 'Senior Software Engineer'
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  assert(result.jobTitle === 'Senior Software Engineer', 'Job title should be preserved (business context)');
  console.log('   ✓ Job title preserved as business context');
}

async function testAnonymizeContactRemovesUserId() {
  const contact = {
    id: 'contact3',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    userId: 'user123',
    weavinkUserId: 'weavink456'
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  assert(result.userId === null, 'userId should be anonymized (PII)');
  assert(result.weavinkUserId === null, 'weavinkUserId should be anonymized (PII)');
  console.log('   ✓ User IDs removed (PII)');
}

async function testAnonymizeContactRemovesPhoneNumbers() {
  const contact = {
    id: 'contact4',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    phone: '+1111111111',
    phoneNumbers: ['+1111111111', '+2222222222']
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  assert(result.phone === '[deleted]', 'Phone should be anonymized');
  assert(Array.isArray(result.phoneNumbers), 'Phone numbers should be an array');
  assert(result.phoneNumbers.length === 0, 'Phone numbers array should be empty');
  console.log('   ✓ Phone numbers removed (PII)');
}

async function testAnonymizeContactRemovesWebsite() {
  const contact = {
    id: 'contact5',
    name: 'Diana Prince',
    email: 'diana@example.com',
    website: 'https://diana-portfolio.com'
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  assert(result.website === '[deleted]', 'Website should be anonymized (personal website = PII)');
  console.log('   ✓ Website removed (PII)');
}

async function testAnonymizeContactRemovesMessage() {
  const contact = {
    id: 'contact6',
    name: 'Eve Adams',
    email: 'eve@example.com',
    message: 'I would like to discuss a potential collaboration'
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  assert(result.message === '[deleted]', 'Message should be anonymized (personal communication)');
  console.log('   ✓ Message removed (PII)');
}

async function testAnonymizeContactLocationGPS() {
  const contact = {
    id: 'contact7',
    name: 'Frank Miller',
    email: 'frank@example.com',
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      address: '123 Main St, San Francisco, CA',
      venue: 'TechConf 2025',
      accuracy: 10
    }
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  // GPS and address should be removed
  assert(result.location.latitude === null, 'GPS latitude should be removed (PII)');
  assert(result.location.longitude === null, 'GPS longitude should be removed (PII)');
  assert(result.location.address === '[deleted]', 'Address should be removed (PII)');

  // Venue and accuracy should be preserved
  assert(result.location.venue === 'TechConf 2025', 'Event venue should be preserved (business context)');
  assert(result.location.accuracy === 10, 'Location accuracy should be preserved (technical metadata)');

  console.log('   ✓ Location GPS/address removed, venue preserved');
}

async function testAnonymizeContactLocationNull() {
  const contact = {
    id: 'contact8',
    name: 'Grace Lee',
    email: 'grace@example.com',
    location: null
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  assert(result.location === null, 'Null location should remain null');
  console.log('   ✓ Null location handled correctly');
}

async function testAnonymizeContactRemovesDetailsArray() {
  const contact = {
    id: 'contact9',
    name: 'Henry Ford',
    email: 'henry@example.com',
    details: [
      { label: 'LinkedIn', value: 'https://linkedin.com/in/henry' },
      { label: 'Twitter', value: '@henry' }
    ]
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  assert(Array.isArray(result.details), 'Details should be an array');
  assert(result.details.length === 0, 'Details array should be empty (legacy custom fields)');
  console.log('   ✓ Legacy details array removed');
}

async function testAnonymizeContactPreservesUserBNotes() {
  const contact = {
    id: 'contact10',
    name: 'Irene Walker',
    email: 'irene@example.com',
    notes: 'Met at conference. Discussed partnership opportunities.'
  };

  const deletionDate = '2025-01-20T12:00:00Z';
  const result = ContactAnonymizationService.anonymizeContact(contact, deletionDate);

  // Notes should be preserved with deletion notice appended
  assert(result.notes.includes('Met at conference'), 'Original notes should be preserved (User B data)');
  assert(result.notes.includes('deleted their Weavink account on 2025-01-20'), 'Deletion notice should be appended');
  assert(result.notes.includes('⚠️'), 'Deletion notice should have warning emoji');

  console.log('   ✓ User B notes preserved with deletion notice');
}

async function testAnonymizeContactEmptyNotes() {
  const contact = {
    id: 'contact11',
    name: 'Jack Ryan',
    email: 'jack@example.com',
    notes: ''
  };

  const deletionDate = '2025-01-21T09:00:00Z';
  const result = ContactAnonymizationService.anonymizeContact(contact, deletionDate);

  // Should contain only the deletion notice (trimmed)
  assert(result.notes.includes('deleted their Weavink account on 2025-01-21'), 'Should contain deletion notice');
  assert(!result.notes.startsWith('\n'), 'Should be trimmed when no original notes');

  console.log('   ✓ Empty notes handled correctly');
}

async function testAnonymizeContactPreservesTags() {
  const contact = {
    id: 'contact12',
    name: 'Karen White',
    email: 'karen@example.com',
    tags: ['potential-client', 'VIP', 'tech-industry']
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  assert(Array.isArray(result.tags), 'Tags should be an array');
  assert(result.tags.length === 3, 'All tags should be preserved');
  assert(result.tags.includes('potential-client'), 'Tags should be preserved (User B data)');

  console.log('   ✓ User B tags preserved');
}

async function testAnonymizeContactPreservesStatus() {
  const contact = {
    id: 'contact13',
    name: 'Leo Martinez',
    email: 'leo@example.com',
    status: 'contacted'
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  assert(result.status === 'contacted', 'Status should be preserved (technical metadata)');
  console.log('   ✓ Status preserved');
}

async function testAnonymizeContactPreservesSource() {
  const contact = {
    id: 'contact14',
    name: 'Maria Garcia',
    email: 'maria@example.com',
    source: 'business-card-scan'
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  assert(result.source === 'business-card-scan', 'Source should be preserved (technical metadata)');
  console.log('   ✓ Source preserved');
}

async function testAnonymizeContactPreservesTimestamps() {
  const contact = {
    id: 'contact15',
    name: 'Nathan Drake',
    email: 'nathan@example.com',
    submittedAt: '2024-01-01T10:00:00Z',
    lastModified: '2024-06-15T14:30:00Z',
    createdBy: 'user789'
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  assert(result.submittedAt === '2024-01-01T10:00:00Z', 'Submitted timestamp should be preserved');
  assert(result.lastModified === '2024-06-15T14:30:00Z', 'Modified timestamp should be preserved');
  assert(result.createdBy === 'user789', 'Created by should be preserved (technical metadata)');

  console.log('   ✓ Timestamps and createdBy preserved');
}

async function testAnonymizeContactDynamicFieldsSelective() {
  const contact = {
    id: 'contact16',
    name: 'Olivia Brown',
    email: 'olivia@example.com',
    dynamicFields: {
      linkedin: 'https://linkedin.com/in/olivia',
      twitter: '@olivia',
      department: 'Engineering',
      industry: 'Software',
      specialty: 'AI/ML'
    }
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  // PII social media should be removed
  assert(result.dynamicFields.linkedin === undefined, 'LinkedIn should be removed (PII)');
  assert(result.dynamicFields.twitter === undefined, 'Twitter should be removed (PII)');

  // Business context should be preserved
  assert(result.dynamicFields.department === 'Engineering', 'Department should be preserved');
  assert(result.dynamicFields.industry === 'Software', 'Industry should be preserved');
  assert(result.dynamicFields.specialty === 'AI/ML', 'Specialty should be preserved');

  console.log('   ✓ Dynamic fields selectively anonymized');
}

async function testAnonymizeContactMetadataSelective() {
  const contact = {
    id: 'contact17',
    name: 'Peter Parker',
    email: 'peter@example.com',
    metadata: {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      language: 'en',
      submissionTime: '2024-01-01T10:00:00Z',
      hasScannedData: true
    }
  };

  const result = ContactAnonymizationService.anonymizeContact(contact, new Date().toISOString());

  // PII tracking data should be removed
  assert(result.metadata.ip === undefined, 'IP address should be removed (PII)');
  assert(result.metadata.userAgent === undefined, 'User agent should be removed (PII)');

  // Non-sensitive metadata should be preserved
  assert(result.metadata.language === 'en', 'Language should be preserved');
  assert(result.metadata.submissionTime === '2024-01-01T10:00:00Z', 'Submission time should be preserved');
  assert(result.metadata.hasScannedData === true, 'Scanned data flag should be preserved');

  console.log('   ✓ Metadata selectively anonymized');
}

async function testAnonymizeContactDateFormatting() {
  const contact = {
    id: 'contact18',
    name: 'Quinn Adams',
    email: 'quinn@example.com'
  };

  const deletionDate = '2025-11-20T15:45:30.123Z';
  const result = ContactAnonymizationService.anonymizeContact(contact, deletionDate);

  // Check date formatting (should be YYYY-MM-DD)
  assert(result.name === '[Contact Deleted - 2025-11-20]', 'Date should be formatted as YYYY-MM-DD');
  assert(result.notes.includes('2025-11-20'), 'Deletion notice should use formatted date');

  console.log('   ✓ Date formatting correct (YYYY-MM-DD)');
}

async function testAnonymizeContactIdempotent() {
  const contact = {
    id: 'contact19',
    name: 'Rachel Green',
    email: 'rachel@example.com',
    company: 'Fashion Corp'
  };

  const deletionDate = '2025-01-15T10:00:00Z';

  // Run anonymization twice
  const result1 = ContactAnonymizationService.anonymizeContact(contact, deletionDate);
  const result2 = ContactAnonymizationService.anonymizeContact(result1, deletionDate);

  // Should be idempotent (running twice produces consistent results)
  assert(result2.name === '[Contact Deleted - 2025-01-15]', 'Name should remain anonymized');
  assert(result2.email === '[deleted]', 'Email should remain anonymized');
  assert(result2.company === 'Fashion Corp', 'Company should remain preserved');

  console.log('   ✓ Anonymization is idempotent');
}

// ============================================================================
// TEST CATEGORY 2: ContactAnonymizationService.anonymizeDynamicFields (6 tests)
// ============================================================================

async function testAnonymizeDynamicFieldsKeepsBusiness() {
  const dynamicFields = {
    department: 'Sales',
    industry: 'Finance',
    specialty: 'Investment Banking',
    businessCategory: 'B2B',
    role: 'Account Manager'
  };

  const result = ContactAnonymizationService.anonymizeDynamicFields(dynamicFields);

  assert(result.department === 'Sales', 'Department should be kept');
  assert(result.industry === 'Finance', 'Industry should be kept');
  assert(result.specialty === 'Investment Banking', 'Specialty should be kept');
  assert(result.businessCategory === 'B2B', 'Business category should be kept');
  assert(result.role === 'Account Manager', 'Role should be kept');

  console.log('   ✓ Business context fields kept');
}

async function testAnonymizeDynamicFieldsDeletesPII() {
  const dynamicFields = {
    linkedin: 'https://linkedin.com/in/test',
    twitter: '@testuser',
    facebook: 'https://facebook.com/test',
    personalEmail: 'test@personal.com',
    mobilePhone: '+1234567890'
  };

  const result = ContactAnonymizationService.anonymizeDynamicFields(dynamicFields);

  assert(result.linkedin === undefined, 'LinkedIn should be deleted');
  assert(result.twitter === undefined, 'Twitter should be deleted');
  assert(result.facebook === undefined, 'Facebook should be deleted');
  assert(result.personalEmail === undefined, 'Personal email should be deleted');
  assert(result.mobilePhone === undefined, 'Mobile phone should be deleted');
  assert(Object.keys(result).length === 0, 'Result should be empty (all PII)');

  console.log('   ✓ PII fields deleted');
}

async function testAnonymizeDynamicFieldsMixed() {
  const dynamicFields = {
    department: 'Engineering',
    linkedin: 'https://linkedin.com/in/engineer',
    industry: 'Tech',
    twitter: '@engineer',
    specialty: 'Cloud Architecture'
  };

  const result = ContactAnonymizationService.anonymizeDynamicFields(dynamicFields);

  // Business fields kept
  assert(result.department === 'Engineering', 'Department should be kept');
  assert(result.industry === 'Tech', 'Industry should be kept');
  assert(result.specialty === 'Cloud Architecture', 'Specialty should be kept');

  // PII fields deleted
  assert(result.linkedin === undefined, 'LinkedIn should be deleted');
  assert(result.twitter === undefined, 'Twitter should be deleted');

  assert(Object.keys(result).length === 3, 'Should have 3 business fields');

  console.log('   ✓ Mixed fields handled correctly');
}

async function testAnonymizeDynamicFieldsCaseInsensitive() {
  const dynamicFields = {
    DEPARTMENT: 'HR',
    LinkedIn: 'https://linkedin.com/in/test',
    Industry: 'Healthcare',
    Twitter: '@test'
  };

  const result = ContactAnonymizationService.anonymizeDynamicFields(dynamicFields);

  // Should match case-insensitively
  assert(result.DEPARTMENT === 'HR', 'Department (uppercase) should be kept');
  assert(result.Industry === 'Healthcare', 'Industry (mixed case) should be kept');
  assert(result.LinkedIn === undefined, 'LinkedIn (mixed case) should be deleted');
  assert(result.Twitter === undefined, 'Twitter (mixed case) should be deleted');

  console.log('   ✓ Case-insensitive matching works');
}

async function testAnonymizeDynamicFieldsUnknownFieldsDeleted() {
  const dynamicFields = {
    department: 'Marketing',
    unknownAttribute1: 'some value',
    unknownAttribute2: 'another value',
    customThing: 'data'
  };

  const result = ContactAnonymizationService.anonymizeDynamicFields(dynamicFields);

  // Only explicitly allowed fields should be kept
  assert(result.department === 'Marketing', 'Department should be kept');
  assert(result.unknownAttribute1 === undefined, 'Unknown fields should be deleted (safe default)');
  assert(result.unknownAttribute2 === undefined, 'Unknown fields should be deleted (safe default)');
  assert(result.customThing === undefined, 'Unknown fields should be deleted (safe default)');
  assert(Object.keys(result).length === 1, 'Only known business fields should remain');

  console.log('   ✓ Unknown fields deleted by default (GDPR safe)');
}

async function testAnonymizeDynamicFieldsInvalidInput() {
  // Test null
  const result1 = ContactAnonymizationService.anonymizeDynamicFields(null);
  assert(deepEqual(result1, {}), 'Null input should return empty object');

  // Test undefined
  const result2 = ContactAnonymizationService.anonymizeDynamicFields(undefined);
  assert(deepEqual(result2, {}), 'Undefined input should return empty object');

  // Test non-object
  const result3 = ContactAnonymizationService.anonymizeDynamicFields('not an object');
  assert(deepEqual(result3, {}), 'Non-object input should return empty object');

  // Test empty object
  const result4 = ContactAnonymizationService.anonymizeDynamicFields({});
  assert(deepEqual(result4, {}), 'Empty object should return empty object');

  console.log('   ✓ Invalid inputs handled gracefully');
}

// ============================================================================
// TEST CATEGORY 3: ContactAnonymizationService.anonymizeMetadata (4 tests)
// ============================================================================

async function testAnonymizeMetadataKeepsAllowed() {
  const metadata = {
    language: 'en',
    submissionTime: '2024-01-01T10:00:00Z',
    hasScannedData: true
  };

  const result = ContactAnonymizationService.anonymizeMetadata(metadata);

  assert(result.language === 'en', 'Language should be kept');
  assert(result.submissionTime === '2024-01-01T10:00:00Z', 'Submission time should be kept');
  assert(result.hasScannedData === true, 'Scanned data flag should be kept');
  assert(Object.keys(result).length === 3, 'All allowed fields should be present');

  console.log('   ✓ Allowed metadata fields kept');
}

async function testAnonymizeMetadataDeletesForbidden() {
  const metadata = {
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    referrer: 'https://google.com',
    sessionId: 'session123',
    timezone: 'America/New_York'
  };

  const result = ContactAnonymizationService.anonymizeMetadata(metadata);

  assert(result.ip === undefined, 'IP should be deleted');
  assert(result.userAgent === undefined, 'User agent should be deleted');
  assert(result.referrer === undefined, 'Referrer should be deleted');
  assert(result.sessionId === undefined, 'Session ID should be deleted');
  assert(result.timezone === undefined, 'Timezone should be deleted');
  assert(Object.keys(result).length === 0, 'No forbidden fields should remain');

  console.log('   ✓ Forbidden metadata fields deleted');
}

async function testAnonymizeMetadataMixed() {
  const metadata = {
    language: 'fr',
    ip: '10.0.0.1',
    submissionTime: '2024-06-15T14:30:00Z',
    userAgent: 'Chrome/120.0',
    hasScannedData: false,
    sessionId: 'abc123'
  };

  const result = ContactAnonymizationService.anonymizeMetadata(metadata);

  // Allowed fields kept
  assert(result.language === 'fr', 'Language should be kept');
  assert(result.submissionTime === '2024-06-15T14:30:00Z', 'Submission time should be kept');
  assert(result.hasScannedData === false, 'Scanned data flag should be kept');

  // Forbidden fields deleted
  assert(result.ip === undefined, 'IP should be deleted');
  assert(result.userAgent === undefined, 'User agent should be deleted');
  assert(result.sessionId === undefined, 'Session ID should be deleted');

  assert(Object.keys(result).length === 3, 'Only 3 allowed fields should remain');

  console.log('   ✓ Mixed metadata handled correctly');
}

async function testAnonymizeMetadataInvalidInput() {
  // Test null
  const result1 = ContactAnonymizationService.anonymizeMetadata(null);
  assert(deepEqual(result1, {}), 'Null input should return empty object');

  // Test undefined
  const result2 = ContactAnonymizationService.anonymizeMetadata(undefined);
  assert(deepEqual(result2, {}), 'Undefined input should return empty object');

  // Test non-object
  const result3 = ContactAnonymizationService.anonymizeMetadata('not an object');
  assert(deepEqual(result3, {}), 'Non-object input should return empty object');

  // Test empty object
  const result4 = ContactAnonymizationService.anonymizeMetadata({});
  assert(deepEqual(result4, {}), 'Empty object should return empty object');

  console.log('   ✓ Invalid inputs handled gracefully');
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Contact Anonymization Test Suite - GDPR Article 17           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // Category 1: anonymizeContact (20 tests)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 CATEGORY 1: ContactAnonymizationService.anonymizeContact (20 tests)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await runTest('1.1: Basic contact anonymization', testAnonymizeContactBasic, 'anonymizeContact');
  await runTest('1.2: Preserve company field', testAnonymizeContactPreservesCompany, 'anonymizeContact');
  await runTest('1.3: Preserve job title field', testAnonymizeContactPreservesJobTitle, 'anonymizeContact');
  await runTest('1.4: Remove user IDs', testAnonymizeContactRemovesUserId, 'anonymizeContact');
  await runTest('1.5: Remove phone numbers', testAnonymizeContactRemovesPhoneNumbers, 'anonymizeContact');
  await runTest('1.6: Remove website', testAnonymizeContactRemovesWebsite, 'anonymizeContact');
  await runTest('1.7: Remove message', testAnonymizeContactRemovesMessage, 'anonymizeContact');
  await runTest('1.8: Location GPS/address removed, venue preserved', testAnonymizeContactLocationGPS, 'anonymizeContact');
  await runTest('1.9: Null location handled', testAnonymizeContactLocationNull, 'anonymizeContact');
  await runTest('1.10: Legacy details array removed', testAnonymizeContactRemovesDetailsArray, 'anonymizeContact');
  await runTest('1.11: User B notes preserved with notice', testAnonymizeContactPreservesUserBNotes, 'anonymizeContact');
  await runTest('1.12: Empty notes handled', testAnonymizeContactEmptyNotes, 'anonymizeContact');
  await runTest('1.13: User B tags preserved', testAnonymizeContactPreservesTags, 'anonymizeContact');
  await runTest('1.14: Status preserved', testAnonymizeContactPreservesStatus, 'anonymizeContact');
  await runTest('1.15: Source preserved', testAnonymizeContactPreservesSource, 'anonymizeContact');
  await runTest('1.16: Timestamps preserved', testAnonymizeContactPreservesTimestamps, 'anonymizeContact');
  await runTest('1.17: Dynamic fields selective', testAnonymizeContactDynamicFieldsSelective, 'anonymizeContact');
  await runTest('1.18: Metadata selective', testAnonymizeContactMetadataSelective, 'anonymizeContact');
  await runTest('1.19: Date formatting', testAnonymizeContactDateFormatting, 'anonymizeContact');
  await runTest('1.20: Idempotent anonymization', testAnonymizeContactIdempotent, 'anonymizeContact');

  // Category 2: anonymizeDynamicFields (6 tests)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 CATEGORY 2: ContactAnonymizationService.anonymizeDynamicFields (6 tests)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await runTest('2.1: Keep business context fields', testAnonymizeDynamicFieldsKeepsBusiness, 'anonymizeDynamicFields');
  await runTest('2.2: Delete PII fields', testAnonymizeDynamicFieldsDeletesPII, 'anonymizeDynamicFields');
  await runTest('2.3: Mixed fields', testAnonymizeDynamicFieldsMixed, 'anonymizeDynamicFields');
  await runTest('2.4: Case-insensitive matching', testAnonymizeDynamicFieldsCaseInsensitive, 'anonymizeDynamicFields');
  await runTest('2.5: Unknown fields deleted', testAnonymizeDynamicFieldsUnknownFieldsDeleted, 'anonymizeDynamicFields');
  await runTest('2.6: Invalid inputs', testAnonymizeDynamicFieldsInvalidInput, 'anonymizeDynamicFields');

  // Category 3: anonymizeMetadata (4 tests)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 CATEGORY 3: ContactAnonymizationService.anonymizeMetadata (4 tests)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await runTest('3.1: Keep allowed metadata', testAnonymizeMetadataKeepsAllowed, 'anonymizeMetadata');
  await runTest('3.2: Delete forbidden metadata', testAnonymizeMetadataDeletesForbidden, 'anonymizeMetadata');
  await runTest('3.3: Mixed metadata', testAnonymizeMetadataMixed, 'anonymizeMetadata');
  await runTest('3.4: Invalid inputs', testAnonymizeMetadataInvalidInput, 'anonymizeMetadata');

  // Print summary
  const totalDuration = Date.now() - startTime;

  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                       TEST SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`Total Tests:    ${results.passed + results.failed}`);
  console.log(`✅ Passed:      ${results.passed}`);
  console.log(`❌ Failed:      ${results.failed}`);
  console.log(`⏭️  Skipped:     ${results.skipped}`);
  console.log(`⏱️  Duration:    ${totalDuration}ms\n`);

  // Category breakdown
  const categories = {};
  results.tests.forEach(test => {
    if (!categories[test.category]) {
      categories[test.category] = { passed: 0, failed: 0 };
    }
    categories[test.category][test.status]++;
  });

  console.log('Category Breakdown:');
  Object.entries(categories).forEach(([category, stats]) => {
    console.log(`  ${category}: ${stats.passed} passed, ${stats.failed} failed`);
  });

  // Exit with appropriate code
  if (results.failed > 0) {
    console.log('\n❌ Some tests failed. Please review errors above.\n');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed! Contact anonymization is GDPR compliant.\n');
    process.exit(0);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('\n❌ Fatal error running tests:');
  console.error(error);
  process.exit(1);
});
