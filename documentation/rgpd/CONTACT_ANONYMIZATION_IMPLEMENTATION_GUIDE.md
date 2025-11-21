---
id: rgpd-contact-anonymization-049
title: Contact Anonymization Implementation Guide - Right to Be Forgotten
category: rgpd
tags: [gdpr, rgpd, anonymization, contact-deletion, right-to-be-forgotten, privacy, data-protection, firestore, pinecone]
status: active
created: 2025-11-20
updated: 2025-11-20
version: 1.0.0
related:
  - RGPD_ACCOUNT_DELETION_TECHNICAL_FLOW.md
  - CONTACT_DELETION_WARNING_IMPLEMENTATION.md
  - RGPD_IMPLEMENTATION_SUMMARY.md
  - RGPD_ARCHITECTURE_COMPLIANCE.md
  - ANONYMOUS_ANALYTICS_PLAN.md
---

# Contact Anonymization Implementation Guide
## GDPR Article 17: Right to Be Forgotten

**Document Version:** 1.0.0
**Created:** November 20, 2025
**Last Updated:** November 20, 2025
**Status:** Implementation Guide
**Estimated Implementation Time:** 4 hours

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [GDPR Legal Framework](#gdpr-legal-framework)
4. [Complete Field Inventory](#complete-field-inventory)
5. [Anonymization Strategy: Option B - Preserve Context](#anonymization-strategy-option-b---preserve-context)
6. [Technical Architecture](#technical-architecture)
7. [Database Schema Changes](#database-schema-changes)
8. [Pinecone Vector Handling](#pinecone-vector-handling)
9. [Implementation Steps](#implementation-steps)
10. [Code Changes Required](#code-changes-required)
11. [Testing Strategy](#testing-strategy)
12. [Privacy Policy Updates](#privacy-policy-updates)
13. [Translation Requirements](#translation-requirements)
14. [Edge Cases & Error Handling](#edge-cases--error-handling)
15. [Monitoring & Logging](#monitoring--logging)
16. [Rollback Strategy](#rollback-strategy)
17. [Success Criteria](#success-criteria)
18. [Appendix: Field-by-Field Reference](#appendix-field-by-field-reference)

---

## Executive Summary

### 🎯 Objective

When **User A** deletes their Weavink account (after 30-day grace period), we must **anonymize User A's contact data** stored by **User B** to comply with GDPR Article 17 ("Right to be Forgotten").

**Current State:** Account deletion removes User A's account but leaves User A's contact data unchanged in User B's contact list.

**Desired State:** After account deletion, User A's personal identifiers are removed while preserving User B's legitimate business context and personal notes.

### 🔑 Key Principles

1. **User A's Right to Erasure:** All personal identifiers must be removed
2. **User B's Legitimate Interest:** Business context and notes can be preserved
3. **Proportionality:** Balance both parties' rights appropriately
4. **Transparency:** User B sees clear indication of anonymized contact

### 📊 Impact Summary

| Aspect | Before Anonymization | After Anonymization |
|--------|---------------------|---------------------|
| **Personal Identifiers** | Name, email, phone, GPS, IP, social media | `[deleted]` or removed |
| **Business Context** | Company, job title, venue | ✅ Preserved |
| **User B's Data** | Notes, tags created by User B | ✅ Preserved |
| **Non-PII Dynamic Fields** | Department, industry | ✅ Preserved |
| **PII Dynamic Fields** | LinkedIn, social media profiles | ❌ Removed |
| **Metadata** | IP, userAgent, sessionId | ❌ Removed |
| **Pinecone Vectors** | Full contact metadata | Anonymized metadata, vector kept |

### ⚖️ Legal Compliance

**GDPR Articles:**
- Article 17: Right to erasure ("right to be forgotten")
- Article 6(1)(f): Legitimate interest (User B's business context)
- Article 5(1)(c): Data minimization
- Article 5(2): Accountability

**CNIL Compliance:** French Data Protection Authority requirements

---

## Problem Statement

### Current User Journey

```
User A                                      User B
   │                                           │
   ├─ Creates Weavink account                 │
   ├─ Exchanges contact with User B ─────────>├─ Receives contact
   │                                           ├─ Adds notes: "Great lead!"
   │                                           ├─ Adds tags: ["VIP", "Partner"]
   │                                           ├─ Saves in contact list
   │                                           │
   ├─ Requests account deletion               │
   ├─ 30-day grace period                     │
   ├─ Account deleted ✅                       │
   │                                           │
   ❓ User A's contact data                    ├─ ❌ STILL HAS:
      still in User B's list?                 │    - name: "John Doe"
                                               │    - email: "john@example.com"
                                               │    - phone: "+33 6 12 34 56 78"
                                               │    - linkedin: "linkedin.com/in/johndoe"
                                               │    - GPS coordinates
                                               │    - IP address
                                               │    - User agent
                                               │    - All personal data!
```

### The Problem

**GDPR Violation:** User A exercised their right to be forgotten, but their personal data remains in User B's database.

**Risk Exposure:**
- 🚨 Non-compliance with GDPR Article 17
- 🚨 CNIL penalties up to 4% of global revenue
- 🚨 Reputational damage
- 🚨 User trust erosion

---

## GDPR Legal Framework

### Article 17: Right to Erasure ("Right to be Forgotten")

**User A's Rights:**
> "The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay."

**Our Obligations:**
1. Delete User A's personal data from **all systems**
2. Notify third parties (User B) where data was disclosed
3. Implement technical measures to ensure erasure

### Article 6(1)(f): Legitimate Interest (User B's Rights)

**User B's Legitimate Interest:**
- Business relationship context (company, job title, meeting location)
- Personal notes created by User B about the interaction
- Tags and categorization created by User B

**Balancing Test:**

| User A's Interest | User B's Interest | Resolution |
|-------------------|-------------------|------------|
| Remove **name** (direct identifier) | Preserve business context | ✅ Anonymize name → "[Contact Deleted - {date}]" |
| Remove **email** (direct identifier) | No legitimate need for email after deletion | ✅ Delete email → "[deleted]" |
| Remove **phone** (direct identifier) | No legitimate need for phone after deletion | ✅ Delete phone → "[deleted]" |
| Remove **LinkedIn** (personal social media) | No legitimate need | ✅ Delete LinkedIn URL |
| Preserve **company** | Business entity context | ✅ Keep company name |
| Preserve **job title** | Professional context | ✅ Keep job title |
| Preserve **notes** | User B created these notes | ✅ Keep User B's notes + append deletion notice |
| Preserve **tags** | User B created these tags | ✅ Keep User B's tags |
| Preserve **venue** | Meeting location context | ✅ Keep venue name |
| Remove **GPS coordinates** | Precise location = PII | ✅ Delete latitude/longitude |
| Preserve **department** (dynamic field) | Business context | ✅ Keep department |
| Remove **IP address** | Personal identifier | ✅ Delete IP address |

**Conclusion:** Option B (Preserve Context) passes the balancing test.

### Article 5(1)(c): Data Minimization

> "Personal data shall be adequate, relevant and limited to what is necessary."

**After anonymization:**
- Only non-identifying business context remains
- User B retains what's necessary for their business records
- No excessive data retention

### Article 5(2): Accountability

> "The controller shall be responsible for, and be able to demonstrate compliance with, paragraph 1."

**Compliance Demonstration:**
1. ✅ Documented anonymization logic (this guide)
2. ✅ Automated tests verifying anonymization
3. ✅ Audit logging of anonymization operations
4. ✅ Privacy policy transparency
5. ✅ GDPR compliance matrix updated

---

## Complete Field Inventory

This section documents **ALL 30+ contact fields** that exist in the Weavink codebase.

### Standard Contact Fields (13 fields)

| Field | Type | Example Value | Contains PII? | Action |
|-------|------|---------------|---------------|--------|
| `id` | string | `"contact_abc123"` | ❌ No | **KEEP** (reference ID) |
| `name` | string | `"John Doe"` | ✅ Yes | **ANONYMIZE** → `"[Contact Deleted - 2025-11-20]"` |
| `email` | string | `"john@example.com"` | ✅ Yes | **ANONYMIZE** → `"[deleted]"` |
| `phone` | string | `"+33 6 12 34 56 78"` | ✅ Yes | **ANONYMIZE** → `"[deleted]"` |
| `company` | string | `"Acme Corp"` | ❌ No | **KEEP** (business entity) |
| `jobTitle` | string | `"CEO"` | ⚠️ Partial | **KEEP** (business context without name) |
| `website` | string | `"https://johndoe.com"` | ✅ Yes | **ANONYMIZE** → `"[deleted]"` |
| `message` | string | `"Met at Tech Conference..."` | ✅ Yes | **ANONYMIZE** → `"[deleted]"` |
| `status` | string | `"new"`, `"viewed"`, `"archived"` | ❌ No | **KEEP** (status metadata) |
| `source` | string | `"scan"`, `"manual"`, `"exchange"` | ❌ No | **KEEP** (source metadata) |
| `submittedAt` | ISO string | `"2025-01-15T10:00:00Z"` | ❌ No | **KEEP** (timestamp) |
| `lastModified` | ISO string | `"2025-01-20T15:30:00Z"` | ❌ No | **KEEP** (timestamp) |
| `createdBy` | string | `"user_abc"` | ❌ No | **KEEP** (User B's ID) |

### Enhanced Contact Fields (2 fields)

| Field | Type | Example Value | Contains PII? | Action |
|-------|------|---------------|---------------|--------|
| `phoneNumbers` | Array<Object> | `[{number: "+33...", type: "mobile", label: "Work"}]` | ✅ Yes | **DELETE** → `[]` |
| `notes` | string | `"Great contact, follow up Q1 2025"` | ❌ No | **KEEP** + append deletion notice |

**Notes handling:**
```javascript
// Before
notes: "Great contact, follow up Q1 2025"

// After
notes: "Great contact, follow up Q1 2025\n\n⚠️ This contact deleted their Weavink account on 2025-11-20. Some contact details have been removed for privacy compliance."
```

### Location Data (5 fields)

| Field Path | Type | Example Value | Contains PII? | Action |
|-----------|------|---------------|---------------|--------|
| `location.latitude` | number | `48.8566` | ✅ Yes | **DELETE** → `null` |
| `location.longitude` | number | `2.3522` | ✅ Yes | **DELETE** → `null` |
| `location.accuracy` | number | `10.5` | ❌ No | **KEEP** (technical metadata) |
| `location.address` | string | `"123 Main St, Paris"` | ✅ Yes | **ANONYMIZE** → `"[deleted]"` |
| `location.venue` | string | `"Tech Conference 2025"` | ❌ No | **KEEP** (event location context) |

**Rationale:**
- **GPS coordinates** (lat/long) = precise location tracking = PII under GDPR
- **Venue name** = general public location = business context (not PII)
- **Address** = personal/office address = PII

### Dynamic/Custom Fields (unlimited fields)

**Field:** `dynamicFields` (Object)

This is a **critical field** containing unlimited custom key-value pairs from:
- Business card scans (AI-extracted fields)
- Manual user input
- Contact exchange submissions

**Example dynamicFields:**
```javascript
{
  linkedin: "https://linkedin.com/in/johndoe",      // ✅ PII - DELETE
  twitter: "https://twitter.com/johndoe",           // ✅ PII - DELETE
  facebook: "https://facebook.com/johndoe",         // ✅ PII - DELETE
  instagram: "@johndoe",                            // ✅ PII - DELETE
  department: "Sales",                              // ❌ Not PII - KEEP
  industry: "Technology",                           // ❌ Not PII - KEEP
  specialty: "Cloud Computing",                     // ❌ Not PII - KEEP
  businessCategory: "B2B SaaS",                     // ❌ Not PII - KEEP
  officePhone: "+33 1 23 45 67 89",                 // ✅ PII - DELETE
  personalEmail: "john.personal@gmail.com",         // ✅ PII - DELETE
  customField1: "Any user-defined value"            // ⚠️ Unknown - DELETE (safe default)
}
```

**Anonymization Logic:**

```javascript
const DYNAMIC_FIELDS_TO_KEEP = [
  'department',
  'industry',
  'specialty',
  'businessCategory',
  'sector',
  'field',
  'expertise'
];

const DYNAMIC_FIELDS_TO_DELETE = [
  'linkedin',
  'twitter',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'github',
  'personalEmail',
  'officePhone',
  'mobilePhone',
  'personalWebsite',
  // ... any social media or contact fields
];

// Anonymization function
function anonymizeDynamicFields(dynamicFields) {
  const anonymized = {};

  for (const [key, value] of Object.entries(dynamicFields)) {
    const lowerKey = key.toLowerCase();

    // Keep explicitly allowed fields
    if (DYNAMIC_FIELDS_TO_KEEP.some(allowed => lowerKey.includes(allowed))) {
      anonymized[key] = value;
    }
    // Delete explicitly forbidden fields
    else if (DYNAMIC_FIELDS_TO_DELETE.some(forbidden => lowerKey.includes(forbidden))) {
      // Don't include in anonymized object
      continue;
    }
    // Unknown field - delete by default (safe approach)
    else {
      continue;
    }
  }

  return anonymized;
}
```

### Legacy Details Array (variable fields)

**Field:** `details` (Array<Object>)

Legacy format for custom fields (replaced by dynamicFields but may still exist).

**Example:**
```javascript
details: [
  { label: "LinkedIn", value: "linkedin.com/in/johndoe", type: "url" },
  { label: "Department", value: "Sales", type: "text" },
  { label: "Mobile", value: "+33 6 12 34 56 78", type: "phone" }
]
```

**Action:** **DELETE entire array** → `[]`

**Rationale:**
- Legacy format, not actively used
- Contains arbitrary PII
- Simplest to delete entirely
- No business context loss (department already in dynamicFields)

### Tags Array (user-defined)

**Field:** `tags` (Array<string>)

User B's categorization tags for the contact.

**Example:**
```javascript
tags: ["VIP", "Partner", "TechConference2025", "FollowUpQ1"]
```

**Action:** **KEEP** (User B created these)

**Rationale:**
- Tags are User B's personal categorization
- Not created by User A
- No personal identifiers in typical tags
- Business context for User B

**Edge case:** If tag contains name (e.g., `"JohnDoe-Lead"`), User B created it themselves, so it's their data, not User A's PII.

### Metadata Object (8 tracking fields)

**Field:** `metadata` (Object)

Submission tracking data from contact exchange/scan.

| Field Path | Type | Example | Contains PII? | Action |
|-----------|------|---------|---------------|--------|
| `metadata.userAgent` | string | `"Mozilla/5.0 (Windows NT 10.0..."` | ✅ Yes | **DELETE** |
| `metadata.ip` | string | `"192.168.1.1"` | ✅ Yes | **DELETE** |
| `metadata.referrer` | string | `"https://example.com/page"` | ✅ Yes | **DELETE** |
| `metadata.sessionId` | string | `"sess_abc123xyz"` | ✅ Yes | **DELETE** |
| `metadata.timezone` | string | `"Europe/Paris"` | ⚠️ Partial | **DELETE** |
| `metadata.language` | string | `"fr"` | ❌ No | **KEEP** |
| `metadata.submissionTime` | ISO string | `"2025-01-15T10:00:00Z"` | ❌ No | **KEEP** |
| `metadata.hasScannedData` | boolean | `true` | ❌ No | **KEEP** |

**Anonymization:**
```javascript
// Before
metadata: {
  userAgent: "Mozilla/5.0...",
  ip: "192.168.1.1",
  referrer: "https://...",
  sessionId: "sess_abc",
  timezone: "Europe/Paris",
  language: "fr",
  submissionTime: "2025-01-15T10:00:00Z",
  hasScannedData: true
}

// After
metadata: {
  language: "fr",
  submissionTime: "2025-01-15T10:00:00Z",
  hasScannedData: true
}
```

### User Identifiers (2 fields)

| Field | Type | Example | Contains PII? | Action |
|-------|------|---------|---------------|--------|
| `userId` | string | `"user_abc123"` | ✅ Yes | **DELETE** → `null` |
| `weavinkUserId` | string | `"user_abc123"` | ✅ Yes | **DELETE** → `null` |

**These already anonymized** in current implementation ✅

---

## Anonymization Strategy: Option B - Preserve Context

### Philosophy

**Balance GDPR compliance with User B's legitimate business interests.**

Remove all personal identifiers while preserving non-identifying business context and User B's own data (notes, tags).

### What User B Sees After Anonymization

**Before (original contact):**
```
Name: John Doe
Email: john@example.com
Phone: +33 6 12 34 56 78
Company: Acme Corp
Job Title: CEO
Website: https://johndoe.com
LinkedIn: linkedin.com/in/johndoe
Location: 48.8566, 2.3522 (Tech Conference 2025)
Department: Sales
Notes: Great contact, follow up Q1 2025
Tags: VIP, Partner, TechConference2025
```

**After (anonymized contact):**
```
Name: [Contact Deleted - 2025-11-20]
Email: [deleted]
Phone: [deleted]
Company: Acme Corp
Job Title: CEO
Website: [deleted]
LinkedIn: [deleted]
Location: Tech Conference 2025
Department: Sales
Notes: Great contact, follow up Q1 2025

⚠️ This contact deleted their Weavink account on 2025-11-20.
Some contact details have been removed for privacy compliance.

Tags: VIP, Partner, TechConference2025
```

### User B's Experience

1. **Contact card shows deletion notice** at top
2. **Name replaced** with anonymized placeholder
3. **All contact methods removed** (email, phone, social media)
4. **Business context preserved** (company, title, department, venue)
5. **Personal notes/tags preserved** (User B's own data)
6. **Visual indicator**: Faded/grayed out UI to indicate anonymized status

### What Gets Anonymized (17 fields)

| Category | Fields |
|----------|--------|
| **Direct identifiers** | name, email, phone, phoneNumbers[], website |
| **Geolocation data** | location.latitude, location.longitude, location.address |
| **Social media** | dynamicFields.linkedin, .twitter, .facebook, .instagram, etc. |
| **Personal messages** | message |
| **User identifiers** | userId, weavinkUserId |
| **Tracking metadata** | metadata.ip, .userAgent, .referrer, .sessionId, .timezone |
| **Legacy custom fields** | details[] (entire array) |

**Total: 17+ fields anonymized**

### What Gets Preserved (13 fields)

| Category | Fields | Rationale |
|----------|--------|-----------|
| **Business entity** | company | Not personal data (business name) |
| **Professional context** | jobTitle | Business context without name |
| **Event location** | location.venue | Public event, business context |
| **Non-PII dynamic fields** | dynamicFields.department, .industry, .specialty, .businessCategory | Business context |
| **User B's data** | notes (with appended notice), tags | User B created these |
| **Technical metadata** | id, status, source, submittedAt, lastModified, createdBy | Non-PII metadata |
| **Non-sensitive metadata** | metadata.language, .submissionTime, .hasScannedData | Not personally identifying |
| **Location metadata** | location.accuracy | Technical accuracy value |

**Total: 13+ fields preserved**

---

## Technical Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ACCOUNT DELETION FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  User A                                                               │
│    │                                                                  │
│    ├─ Requests account deletion                                      │
│    ├─ 30-day grace period                                            │
│    ├─ executeAccountDeletion() triggered                             │
│    │                                                                  │
│    └─────────────┬────────────────────────────────────────────────  │
│                  │                                                    │
│  ┌───────────────▼────────────────────────────────────────────┐     │
│  │  findUsersWithContact(deletedUserId)                       │     │
│  │  └─ Query Firestore: contacts[] contains userId            │     │
│  │     Returns: [user_b, user_c, user_d, ...]                 │     │
│  └───────────────┬────────────────────────────────────────────┘     │
│                  │                                                    │
│  ┌───────────────▼────────────────────────────────────────────┐     │
│  │  For each User B:                                          │     │
│  │    ├─ removeContactFromUser(userId: user_b, ...)           │     │
│  │    │   ├─ Find contact with userId = deletedUserId         │     │
│  │    │   ├─ Anonymize contact fields (NEW LOGIC)             │     │
│  │    │   ├─ Update Firestore document                        │     │
│  │    │   └─ Anonymize Pinecone vector (NEW LOGIC)            │     │
│  │    │                                                         │     │
│  │    └─ notifyContactDeletion(userId: user_b, ...)           │     │
│  │        └─ Send email notification                           │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Result:                                                              │
│    ✅ User A's account deleted                                       │
│    ✅ User A's personal data anonymized in all contacts              │
│    ✅ User B's business context preserved                            │
│    ✅ User B notified of deletion                                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Anonymization Process

```
removeContactFromUser(userId, deletedUserId, deletedUsername, deletionDate)
  │
  ├─ Step 1: Fetch User B's contact document
  │   └─ Firestore: /Contacts/{userId}
  │
  ├─ Step 2: Find contact with matching userId/weavinkUserId
  │   └─ contacts.find(c => c.userId === deletedUserId)
  │
  ├─ Step 3: Anonymize contact object
  │   ├─ name → "[Contact Deleted - 2025-11-20]"
  │   ├─ email → "[deleted]"
  │   ├─ phone → "[deleted]"
  │   ├─ phoneNumbers → []
  │   ├─ website → "[deleted]"
  │   ├─ message → "[deleted]"
  │   ├─ location.latitude → null
  │   ├─ location.longitude → null
  │   ├─ location.address → "[deleted]"
  │   ├─ dynamicFields → anonymizeDynamicFields(dynamicFields)
  │   ├─ details → []
  │   ├─ metadata → anonymizeMetadata(metadata)
  │   ├─ userId → null
  │   ├─ weavinkUserId → null
  │   ├─ notes → append deletion notice
  │   └─ (keep: company, jobTitle, venue, tags, timestamps)
  │
  ├─ Step 4: Update Firestore
  │   └─ contactsRef.update({ contacts: updatedContacts })
  │
  └─ Step 5: Anonymize Pinecone vector
      └─ VectorStorageService.anonymizeVectorMetadata(contactId, anonymizedContact)
```

---

## Database Schema Changes

### Firestore: Contacts Collection

**Collection Path:** `/Contacts/{userId}`

**Document Structure (User B's contact list):**

```javascript
{
  userId: "user_b_id",
  contacts: [
    {
      // === CONTACT THAT WAS ANONYMIZED ===

      // Anonymized fields (changed)
      id: "contact_abc123",                                    // KEPT
      name: "[Contact Deleted - 2025-11-20]",                  // ANONYMIZED
      email: "[deleted]",                                      // ANONYMIZED
      phone: "[deleted]",                                      // ANONYMIZED
      phoneNumbers: [],                                        // DELETED
      website: "[deleted]",                                    // ANONYMIZED
      message: "[deleted]",                                    // ANONYMIZED
      userId: null,                                            // DELETED
      weavinkUserId: null,                                     // DELETED

      // Preserved business context
      company: "Acme Corp",                                    // KEPT
      jobTitle: "CEO",                                         // KEPT

      // Location data
      location: {
        latitude: null,                                        // DELETED
        longitude: null,                                       // DELETED
        accuracy: 10.5,                                        // KEPT
        address: "[deleted]",                                  // ANONYMIZED
        venue: "Tech Conference 2025"                          // KEPT
      },

      // Dynamic fields (selectively anonymized)
      dynamicFields: {
        department: "Sales",                                   // KEPT
        industry: "Technology",                                // KEPT
        specialty: "Cloud Computing",                          // KEPT
        // linkedin, twitter, facebook, etc. DELETED
      },

      // Legacy custom fields
      details: [],                                             // DELETED

      // User B's own data
      notes: "Great contact, follow up Q1 2025\n\n⚠️ This contact deleted their Weavink account on 2025-11-20. Some contact details have been removed for privacy compliance.",
      tags: ["VIP", "Partner", "TechConference2025"],          // KEPT

      // Metadata (partially anonymized)
      metadata: {
        language: "fr",                                        // KEPT
        submissionTime: "2025-01-15T10:00:00Z",                // KEPT
        hasScannedData: true,                                  // KEPT
        // ip, userAgent, referrer, sessionId, timezone DELETED
      },

      // Technical metadata
      status: "viewed",                                        // KEPT
      source: "exchange",                                      // KEPT
      submittedAt: "2025-01-15T10:00:00Z",                     // KEPT
      lastModified: "2025-11-20T08:30:00Z",                    // KEPT
      createdBy: "user_b_id",                                  // KEPT

      // Anonymization tracking (NEW)
      isAnonymized: true,                                      // NEW FIELD
      anonymizedDate: "2025-11-20T08:30:00Z",                  // NEW FIELD
      originalName: "John Doe"                                 // NEW FIELD (for records)
    },

    // ... other contacts in User B's list
  ],

  createdAt: "2024-01-15T10:00:00Z",
  lastModified: "2025-11-20T08:30:00Z",
  totalContacts: 42,
  exchange: {
    totalReceived: 10,
    lastExchangeDate: "2025-01-20T15:30:00Z"
  }
}
```

### New Fields Added During Anonymization

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `isAnonymized` | boolean | Flag to identify anonymized contacts | `true` |
| `anonymizedDate` | ISO string | When anonymization occurred | `"2025-11-20T08:30:00Z"` |
| `originalName` | string | Preserved name for audit/reference | `"John Doe"` |

**Rationale for `originalName`:**
- Kept in database for **audit trail** and **legal compliance** demonstration
- **NOT displayed** to User B in UI
- Allows proving GDPR compliance if challenged
- User B sees `[Contact Deleted - {date}]` in UI, not `originalName`

---

## Pinecone Vector Handling

### Current Behavior (DELETES vector)

**File:** `/lib/services/servicePrivacy/server/accountDeletionService.js`

```javascript
// Current implementation
await VectorStorageService.deleteContactVector(
  userId,
  contactToRemove.id
);
```

**Result:** Contact vector is **completely deleted** from Pinecone index.

**Impact:**
- ✅ No PII in Pinecone
- ❌ Semantic search breaks for this contact
- ❌ User B loses search functionality for this contact

### New Behavior (ANONYMIZE metadata, KEEP vector)

**Goal:** Preserve semantic search functionality while removing PII from metadata.

#### Why Keep the Vector?

1. **Semantic Search:** User B can still find contact by searching "Sales CEO tech conference"
2. **User Experience:** Contact remains searchable within User B's contacts
3. **Business Context:** Vector represents business relationship, not personal identity
4. **GDPR Compliant:** Vector embeddings are not PII (cannot reverse-engineer to identify person)

#### Pinecone Vector Structure

**Before Anonymization:**
```javascript
{
  id: "user_b_id_contact_abc123",
  values: [0.123, -0.456, 0.789, ...], // 1536-dimension embedding
  metadata: {
    userId: "user_b_id",
    contactId: "contact_abc123",
    name: "John Doe",                    // ❌ PII
    email: "john@example.com",           // ❌ PII
    phone: "+33 6 12 34 56 78",          // ❌ PII
    company: "Acme Corp",                // ✅ Keep
    jobTitle: "CEO",                     // ✅ Keep
    notes: "Great contact...",           // ✅ Keep (User B's notes)
    message: "Met at conference...",     // ❌ PII
    linkedin: "linkedin.com/in/johndoe", // ❌ PII
    department: "Sales",                 // ✅ Keep
    website: "https://johndoe.com",      // ❌ PII
    tags: "VIP,Partner",                 // ✅ Keep
    timestamp: 1705315200
  }
}
```

**After Anonymization:**
```javascript
{
  id: "user_b_id_contact_abc123",
  values: [0.123, -0.456, 0.789, ...], // UNCHANGED (vector preserved)
  metadata: {
    userId: "user_b_id",
    contactId: "contact_abc123",
    name: "[Contact Deleted]",           // Anonymized placeholder
    company: "Acme Corp",                // Preserved
    jobTitle: "CEO",                     // Preserved
    notes: "Great contact...",           // Preserved (User B's notes)
    department: "Sales",                 // Preserved
    tags: "VIP,Partner",                 // Preserved
    timestamp: 1705315200,
    isAnonymized: true,                  // NEW FLAG
    anonymizedDate: "2025-11-20"         // NEW FIELD
    // email, phone, linkedin, message, website DELETED
  }
}
```

#### Implementation: New Function

**File:** `/lib/services/serviceContact/server/vectorStorageService.js`

**Add new function:**

```javascript
/**
 * Anonymize vector metadata for deleted user contact
 * @param {string} userId - User B's ID (contact list owner)
 * @param {string} contactId - Contact ID to anonymize
 * @param {Object} anonymizedContact - Anonymized contact object
 */
async anonymizeVectorMetadata(userId, contactId, anonymizedContact) {
  try {
    const pinecone = await this.getPineconeClient();
    const index = pinecone.Index(PINECONE_INDEX_NAME);

    const vectorId = `${userId}_${contactId}`;

    // Fetch existing vector
    const fetchResponse = await index.fetch([vectorId]);
    const existingVector = fetchResponse.vectors[vectorId];

    if (!existingVector) {
      console.warn(`Vector not found for anonymization: ${vectorId}`);
      return;
    }

    // Build anonymized metadata
    const anonymizedMetadata = {
      userId: userId,
      contactId: contactId,
      name: "[Contact Deleted]",
      company: anonymizedContact.company || "",
      jobTitle: anonymizedContact.jobTitle || "",
      notes: anonymizedContact.notes ?
        anonymizedContact.notes.substring(0, 500) : "", // Truncate notes
      department: anonymizedContact.dynamicFields?.department || "",
      industry: anonymizedContact.dynamicFields?.industry || "",
      tags: anonymizedContact.tags ? anonymizedContact.tags.join(",") : "",
      timestamp: Date.now(),
      isAnonymized: true,
      anonymizedDate: new Date().toISOString().split('T')[0]
      // All PII fields (email, phone, linkedin, etc.) omitted
    };

    // Upsert vector with anonymized metadata (keep same embeddings)
    await index.upsert([{
      id: vectorId,
      values: existingVector.values, // KEEP ORIGINAL VECTOR
      metadata: anonymizedMetadata     // ANONYMIZED METADATA
    }]);

    console.log(`✅ Anonymized vector metadata: ${vectorId}`);

  } catch (error) {
    console.error('Error anonymizing vector metadata:', error);
    // Don't throw - anonymization shouldn't fail account deletion
  }
}
```

**Update Account Deletion Flow:**

```javascript
// BEFORE (current implementation)
await VectorStorageService.deleteContactVector(userId, contactToRemove.id);

// AFTER (new implementation)
await VectorStorageService.anonymizeVectorMetadata(
  userId,
  contactToRemove.id,
  anonymizedContact
);
```

---

## Implementation Steps

### Phase 1: Create Anonymization Constants (15 minutes)

**File:** `/lib/services/servicePrivacy/constants/anonymizationConstants.js` (NEW)

```javascript
/**
 * Contact Anonymization Constants
 *
 * Defines which dynamic fields to keep vs delete when anonymizing contacts
 * for GDPR Article 17 (Right to be Forgotten) compliance.
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
```

**Update:** `/constants/index.js`

```javascript
// Add to existing exports
export * from '../lib/services/servicePrivacy/constants/anonymizationConstants';
```

### Phase 2: Create Anonymization Helper Functions (30 minutes)

**File:** `/lib/services/servicePrivacy/server/contactAnonymizationService.js` (NEW)

```javascript
import {
  DYNAMIC_FIELDS_TO_KEEP,
  DYNAMIC_FIELDS_TO_DELETE,
  METADATA_FIELDS_TO_ANONYMIZE,
  METADATA_FIELDS_TO_KEEP,
  ANONYMIZED_PLACEHOLDER,
  DELETION_NOTICE_TEMPLATE,
  ANONYMIZED_NAME_TEMPLATE
} from '@/constants';

/**
 * Contact Anonymization Service
 *
 * Handles anonymization of contact fields for GDPR Article 17 compliance.
 */
export class ContactAnonymizationService {

  /**
   * Anonymize dynamic fields object
   * @param {Object} dynamicFields - Original dynamic fields
   * @returns {Object} Anonymized dynamic fields
   */
  static anonymizeDynamicFields(dynamicFields) {
    if (!dynamicFields || typeof dynamicFields !== 'object') {
      return {};
    }

    const anonymized = {};

    for (const [key, value] of Object.entries(dynamicFields)) {
      const lowerKey = key.toLowerCase();

      // Keep explicitly allowed fields
      if (DYNAMIC_FIELDS_TO_KEEP.some(allowed => lowerKey.includes(allowed))) {
        anonymized[key] = value;
        continue;
      }

      // Delete explicitly forbidden fields
      if (DYNAMIC_FIELDS_TO_DELETE.some(forbidden => lowerKey.includes(forbidden))) {
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
   * @param {Object} metadata - Original metadata
   * @returns {Object} Anonymized metadata
   */
  static anonymizeMetadata(metadata) {
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
   * @param {Object} contact - Original contact object
   * @param {string} deletionDate - ISO date string of deletion
   * @returns {Object} Anonymized contact object
   */
  static anonymizeContact(contact, deletionDate) {
    const formattedDate = deletionDate.split('T')[0]; // YYYY-MM-DD

    return {
      // === Anonymized fields ===
      ...contact,

      // Direct identifiers
      name: ANONYMIZED_NAME_TEMPLATE(formattedDate),
      email: ANONYMIZED_PLACEHOLDER,
      phone: ANONYMIZED_PLACEHOLDER,
      phoneNumbers: [],
      website: ANONYMIZED_PLACEHOLDER,
      message: ANONYMIZED_PLACEHOLDER,
      userId: null,
      weavinkUserId: null,

      // Location data
      location: contact.location ? {
        ...contact.location,
        latitude: null,
        longitude: null,
        address: ANONYMIZED_PLACEHOLDER,
        // Keep: accuracy, venue
      } : null,

      // Dynamic fields (selective)
      dynamicFields: this.anonymizeDynamicFields(contact.dynamicFields),

      // Legacy custom fields
      details: [],

      // Metadata (selective)
      metadata: this.anonymizeMetadata(contact.metadata),

      // Notes - append deletion notice
      notes: contact.notes
        ? contact.notes + DELETION_NOTICE_TEMPLATE(formattedDate)
        : DELETION_NOTICE_TEMPLATE(formattedDate).trim(),

      // === Preserved fields (no changes) ===
      // company, jobTitle, tags, status, source, timestamps, createdBy

      // === Anonymization tracking (NEW) ===
      isAnonymized: true,
      anonymizedDate: new Date().toISOString(),
      originalName: contact.name || 'Unknown'
    };
  }
}
```

### Phase 3: Update Account Deletion Service (45 minutes)

**File:** `/lib/services/servicePrivacy/server/accountDeletionService.js`

**Modify function:** `removeContactFromUser` (starting around line 422)

**BEFORE (current implementation):**

```javascript
async function removeContactFromUser(userId, deletedUserId, deletedUsername, deletionDate) {
  try {
    const contactsRef = adminDb.collection('Contacts').doc(userId);
    const contactsDoc = await contactsRef.get();

    if (!contactsDoc.exists) {
      return;
    }

    const contactsData = contactsDoc.data();
    const contacts = contactsData.contacts || [];

    const contactToRemove = contacts.find(
      contact => contact.userId === deletedUserId || contact.weavinkUserId === deletedUserId
    );

    if (!contactToRemove) {
      return;
    }

    // Current anonymization (INCOMPLETE)
    contactToRemove.name = `[Contact Deleted - ${deletionDate.split('T')[0]}]`;
    contactToRemove.email = '[deleted]';
    contactToRemove.phone = '[deleted]';
    contactToRemove.address = '[deleted]';
    contactToRemove.website = '[deleted]';
    contactToRemove.linkedin = '[deleted]';
    contactToRemove.twitter = '[deleted]';
    contactToRemove.userId = null;
    contactToRemove.weavinkUserId = null;

    if (contactToRemove.notes) {
      contactToRemove.notes += `\n\n⚠️ This contact deleted their Weavink account on ${deletionDate.split('T')[0]}.`;
    }

    await contactsRef.update({ contacts });

    // Delete vector from Pinecone
    await VectorStorageService.deleteContactVector(userId, contactToRemove.id);

  } catch (error) {
    console.error('Error removing contact:', error);
  }
}
```

**AFTER (new implementation):**

```javascript
import { ContactAnonymizationService } from './contactAnonymizationService';
import { VectorStorageService } from '@/lib/services/serviceContact/server/vectorStorageService';

async function removeContactFromUser(userId, deletedUserId, deletedUsername, deletionDate) {
  try {
    const contactsRef = adminDb.collection('Contacts').doc(userId);
    const contactsDoc = await contactsRef.get();

    if (!contactsDoc.exists) {
      console.log(`No contacts document found for user: ${userId}`);
      return;
    }

    const contactsData = contactsDoc.data();
    const contacts = contactsData.contacts || [];

    // Find contact to anonymize
    const contactToRemove = contacts.find(
      contact => contact.userId === deletedUserId || contact.weavinkUserId === deletedUserId
    );

    if (!contactToRemove) {
      console.log(`No contact found for deleted user ${deletedUserId} in user ${userId}'s contacts`);
      return;
    }

    console.log(`Anonymizing contact for deleted user ${deletedUserId} in user ${userId}'s contact list`);

    // === NEW: Comprehensive anonymization ===
    const anonymizedContact = ContactAnonymizationService.anonymizeContact(
      contactToRemove,
      deletionDate
    );

    // Replace contact in array with anonymized version
    const contactIndex = contacts.findIndex(
      c => c.id === contactToRemove.id
    );

    if (contactIndex !== -1) {
      contacts[contactIndex] = anonymizedContact;
    }

    // Update Firestore
    await contactsRef.update({
      contacts: contacts,
      lastModified: new Date().toISOString()
    });

    console.log(`✅ Contact anonymized in Firestore for user: ${userId}`);

    // === NEW: Anonymize Pinecone vector metadata (instead of deleting) ===
    await VectorStorageService.anonymizeVectorMetadata(
      userId,
      contactToRemove.id,
      anonymizedContact
    );

    console.log(`✅ Contact vector metadata anonymized in Pinecone for user: ${userId}`);

  } catch (error) {
    console.error('Error anonymizing contact:', error);
    // Log error but don't throw - we don't want contact anonymization to block account deletion
    // The account deletion should still proceed even if contact anonymization fails
  }
}
```

### Phase 4: Implement Pinecone Vector Anonymization (30 minutes)

**File:** `/lib/services/serviceContact/server/vectorStorageService.js`

**Add new method to VectorStorageService class:**

```javascript
/**
 * Anonymize vector metadata for deleted user contact
 * Preserves semantic search functionality while removing PII
 *
 * @param {string} userId - User B's ID (contact list owner)
 * @param {string} contactId - Contact ID to anonymize
 * @param {Object} anonymizedContact - Anonymized contact object from ContactAnonymizationService
 */
async anonymizeVectorMetadata(userId, contactId, anonymizedContact) {
  try {
    const pinecone = await this.getPineconeClient();
    const index = pinecone.Index(PINECONE_INDEX_NAME);

    const vectorId = `${userId}_${contactId}`;

    console.log(`Anonymizing vector metadata: ${vectorId}`);

    // Fetch existing vector
    const fetchResponse = await index.fetch([vectorId]);
    const existingVector = fetchResponse.vectors?.[vectorId];

    if (!existingVector) {
      console.warn(`Vector not found for anonymization: ${vectorId}`);
      return; // Vector doesn't exist, nothing to anonymize
    }

    // Build anonymized metadata (only non-PII fields)
    const anonymizedMetadata = {
      userId: userId,
      contactId: contactId,

      // Business context (preserved)
      name: "[Contact Deleted]",
      company: anonymizedContact.company || "",
      jobTitle: anonymizedContact.jobTitle || "",

      // Dynamic fields (only non-PII)
      department: anonymizedContact.dynamicFields?.department || "",
      industry: anonymizedContact.dynamicFields?.industry || "",
      specialty: anonymizedContact.dynamicFields?.specialty || "",
      businessCategory: anonymizedContact.dynamicFields?.businessCategory || "",

      // User B's data (preserved)
      notes: anonymizedContact.notes
        ? anonymizedContact.notes.substring(0, 500)  // Truncate for Pinecone metadata limits
        : "",
      tags: anonymizedContact.tags
        ? anonymizedContact.tags.join(",")
        : "",

      // Anonymization tracking
      timestamp: Date.now(),
      isAnonymized: true,
      anonymizedDate: new Date().toISOString().split('T')[0]

      // All PII fields OMITTED:
      // - email, phone, linkedin, twitter, facebook, website
      // - message, personalEmail, etc.
    };

    // Upsert vector with same embeddings but anonymized metadata
    await index.upsert([{
      id: vectorId,
      values: existingVector.values,  // KEEP ORIGINAL VECTOR EMBEDDINGS
      metadata: anonymizedMetadata     // ANONYMIZED METADATA ONLY
    }]);

    console.log(`✅ Anonymized vector metadata: ${vectorId}`);

  } catch (error) {
    console.error('Error anonymizing vector metadata:', error);
    // Don't throw - vector anonymization failure shouldn't block account deletion
  }
}
```

**Notes:**
- This is a **new method**, added to the existing VectorStorageService class
- Does NOT replace `deleteContactVector` (that's still used elsewhere)
- Called from account deletion flow instead of deleting the vector

### Phase 5: Add Translation Keys (10 minutes)

**Files:** `/public/locales/{lang}/common.json` (5 files: en, fr, es, ch, vm)

**Add to each language file:**

#### English (`/public/locales/en/common.json`)

```json
{
  "privacy": {
    "contact_anonymized_placeholder": "[deleted]",
    "contact_deleted_notice": "This contact deleted their Weavink account on {date}. Some contact details have been removed for privacy compliance.",
    "contact_deleted_name": "[Contact Deleted - {date}]",
    "anonymized_contact_label": "Anonymized Contact",
    "anonymized_contact_tooltip": "This contact deleted their account. Personal information has been removed, but business context has been preserved."
  }
}
```

#### French (`/public/locales/fr/common.json`)

```json
{
  "privacy": {
    "contact_anonymized_placeholder": "[supprimé]",
    "contact_deleted_notice": "Ce contact a supprimé son compte Weavink le {date}. Certains détails de contact ont été supprimés pour conformité à la vie privée.",
    "contact_deleted_name": "[Contact Supprimé - {date}]",
    "anonymized_contact_label": "Contact Anonymisé",
    "anonymized_contact_tooltip": "Ce contact a supprimé son compte. Les informations personnelles ont été supprimées, mais le contexte professionnel a été préservé."
  }
}
```

#### Spanish (`/public/locales/es/common.json`)

```json
{
  "privacy": {
    "contact_anonymized_placeholder": "[eliminado]",
    "contact_deleted_notice": "Este contacto eliminó su cuenta de Weavink el {date}. Algunos detalles de contacto han sido eliminados por cumplimiento de privacidad.",
    "contact_deleted_name": "[Contacto Eliminado - {date}]",
    "anonymized_contact_label": "Contacto Anonimizado",
    "anonymized_contact_tooltip": "Este contacto eliminó su cuenta. La información personal ha sido eliminada, pero se ha conservado el contexto empresarial."
  }
}
```

#### Chinese (`/public/locales/ch/common.json`)

```json
{
  "privacy": {
    "contact_anonymized_placeholder": "[已删除]",
    "contact_deleted_notice": "此联系人已于 {date} 删除其 Weavink 帐户。部分联系详情已因隐私合规而删除。",
    "contact_deleted_name": "[联系人已删除 - {date}]",
    "anonymized_contact_label": "匿名联系人",
    "anonymized_contact_tooltip": "此联系人已删除其帐户。个人信息已删除，但业务背景已保留。"
  }
}
```

#### Vietnamese (`/public/locales/vm/common.json`)

```json
{
  "privacy": {
    "contact_anonymized_placeholder": "[đã xóa]",
    "contact_deleted_notice": "Liên hệ này đã xóa tài khoản Weavink của họ vào {date}. Một số chi tiết liên hệ đã bị xóa để tuân thủ quyền riêng tư.",
    "contact_deleted_name": "[Liên Hệ Đã Xóa - {date}]",
    "anonymized_contact_label": "Liên Hệ Ẩn Danh",
    "anonymized_contact_tooltip": "Liên hệ này đã xóa tài khoản của họ. Thông tin cá nhân đã bị xóa, nhưng bối cảnh kinh doanh đã được bảo tồn."
  }
}
```

---

## Testing Strategy

### Automated Tests

**File:** `/tests/contactAnonymization.test.js` (NEW)

```javascript
import { ContactAnonymizationService } from '../lib/services/servicePrivacy/server/contactAnonymizationService';
import { adminDb } from '../lib/firebaseAdmin';

describe('Contact Anonymization - GDPR Article 17', () => {

  const mockContact = {
    id: 'contact_test_123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+33 6 12 34 56 78',
    phoneNumbers: [
      { number: '+33 6 12 34 56 78', type: 'mobile', label: 'Personal' },
      { number: '+33 1 23 45 67 89', type: 'office', label: 'Work' }
    ],
    company: 'Acme Corp',
    jobTitle: 'CEO',
    website: 'https://johndoe.com',
    message: 'Met at Tech Conference 2025',
    userId: 'user_a_id',
    weavinkUserId: 'user_a_id',
    location: {
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 10.5,
      address: '123 Main Street, Paris',
      venue: 'Tech Conference 2025'
    },
    dynamicFields: {
      linkedin: 'https://linkedin.com/in/johndoe',
      twitter: 'https://twitter.com/johndoe',
      facebook: 'https://facebook.com/johndoe',
      department: 'Sales',
      industry: 'Technology',
      specialty: 'Cloud Computing'
    },
    details: [
      { label: 'LinkedIn', value: 'linkedin.com/in/johndoe', type: 'url' },
      { label: 'Mobile', value: '+33 6 12 34 56 78', type: 'phone' }
    ],
    tags: ['VIP', 'Partner', 'TechConference2025'],
    notes: 'Great contact, follow up Q1 2025',
    metadata: {
      userAgent: 'Mozilla/5.0...',
      ip: '192.168.1.1',
      referrer: 'https://example.com',
      sessionId: 'sess_abc123',
      timezone: 'Europe/Paris',
      language: 'fr',
      submissionTime: '2025-01-15T10:00:00Z',
      hasScannedData: true
    },
    status: 'viewed',
    source: 'exchange',
    submittedAt: '2025-01-15T10:00:00Z',
    lastModified: '2025-01-20T15:30:00Z',
    createdBy: 'user_b_id'
  };

  describe('ContactAnonymizationService.anonymizeContact', () => {

    it('should anonymize name with deletion date', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.name).toBe('[Contact Deleted - 2025-11-20]');
    });

    it('should anonymize email to [deleted]', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.email).toBe('[deleted]');
    });

    it('should anonymize phone to [deleted]', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.phone).toBe('[deleted]');
    });

    it('should delete phoneNumbers array', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.phoneNumbers).toEqual([]);
    });

    it('should anonymize website to [deleted]', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.website).toBe('[deleted]');
    });

    it('should anonymize message to [deleted]', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.message).toBe('[deleted]');
    });

    it('should preserve company name', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.company).toBe('Acme Corp');
    });

    it('should preserve jobTitle', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.jobTitle).toBe('CEO');
    });

    it('should preserve User B\'s notes and append deletion notice', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.notes).toContain('Great contact, follow up Q1 2025');
      expect(result.notes).toContain('deleted their Weavink account on 2025-11-20');
    });

    it('should preserve User B\'s tags', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.tags).toEqual(['VIP', 'Partner', 'TechConference2025']);
    });

    it('should delete GPS coordinates (latitude/longitude)', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.location.latitude).toBeNull();
      expect(result.location.longitude).toBeNull();
    });

    it('should anonymize address to [deleted]', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.location.address).toBe('[deleted]');
    });

    it('should preserve venue location', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.location.venue).toBe('Tech Conference 2025');
    });

    it('should preserve location accuracy', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.location.accuracy).toBe(10.5);
    });

    it('should selectively anonymize dynamicFields (delete social media, keep business context)', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');

      // Should delete PII
      expect(result.dynamicFields.linkedin).toBeUndefined();
      expect(result.dynamicFields.twitter).toBeUndefined();
      expect(result.dynamicFields.facebook).toBeUndefined();

      // Should keep business context
      expect(result.dynamicFields.department).toBe('Sales');
      expect(result.dynamicFields.industry).toBe('Technology');
      expect(result.dynamicFields.specialty).toBe('Cloud Computing');
    });

    it('should delete entire details array', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.details).toEqual([]);
    });

    it('should anonymize metadata (delete IP, userAgent, sessionId, etc.)', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');

      // Should delete tracking data
      expect(result.metadata.ip).toBeUndefined();
      expect(result.metadata.userAgent).toBeUndefined();
      expect(result.metadata.referrer).toBeUndefined();
      expect(result.metadata.sessionId).toBeUndefined();
      expect(result.metadata.timezone).toBeUndefined();

      // Should keep non-sensitive metadata
      expect(result.metadata.language).toBe('fr');
      expect(result.metadata.submissionTime).toBe('2025-01-15T10:00:00Z');
      expect(result.metadata.hasScannedData).toBe(true);
    });

    it('should set userId and weavinkUserId to null', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.userId).toBeNull();
      expect(result.weavinkUserId).toBeNull();
    });

    it('should preserve technical metadata (status, source, timestamps, createdBy)', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.status).toBe('viewed');
      expect(result.source).toBe('exchange');
      expect(result.submittedAt).toBe('2025-01-15T10:00:00Z');
      expect(result.lastModified).toBe('2025-01-20T15:30:00Z');
      expect(result.createdBy).toBe('user_b_id');
    });

    it('should add anonymization tracking fields', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.isAnonymized).toBe(true);
      expect(result.anonymizedDate).toBeDefined();
      expect(result.originalName).toBe('John Doe');
    });

    it('should preserve contact ID for reference', () => {
      const result = ContactAnonymizationService.anonymizeContact(mockContact, '2025-11-20T08:30:00Z');
      expect(result.id).toBe('contact_test_123');
    });

  });

  describe('ContactAnonymizationService.anonymizeDynamicFields', () => {

    it('should keep department field', () => {
      const result = ContactAnonymizationService.anonymizeDynamicFields({
        department: 'Sales'
      });
      expect(result.department).toBe('Sales');
    });

    it('should keep industry field', () => {
      const result = ContactAnonymizationService.anonymizeDynamicFields({
        industry: 'Technology'
      });
      expect(result.industry).toBe('Technology');
    });

    it('should delete linkedin field', () => {
      const result = ContactAnonymizationService.anonymizeDynamicFields({
        linkedin: 'https://linkedin.com/in/johndoe'
      });
      expect(result.linkedin).toBeUndefined();
    });

    it('should delete twitter field', () => {
      const result = ContactAnonymizationService.anonymizeDynamicFields({
        twitter: 'https://twitter.com/johndoe'
      });
      expect(result.twitter).toBeUndefined();
    });

    it('should handle mixed PII and non-PII fields correctly', () => {
      const result = ContactAnonymizationService.anonymizeDynamicFields({
        linkedin: 'https://linkedin.com/in/johndoe',
        department: 'Sales',
        twitter: '@johndoe',
        industry: 'Technology'
      });

      expect(result.linkedin).toBeUndefined();
      expect(result.twitter).toBeUndefined();
      expect(result.department).toBe('Sales');
      expect(result.industry).toBe('Technology');
    });

    it('should delete unknown fields by default (safe approach)', () => {
      const result = ContactAnonymizationService.anonymizeDynamicFields({
        unknownField1: 'some value',
        unknownField2: 'another value'
      });

      expect(result.unknownField1).toBeUndefined();
      expect(result.unknownField2).toBeUndefined();
    });

  });

  describe('ContactAnonymizationService.anonymizeMetadata', () => {

    it('should keep language field', () => {
      const result = ContactAnonymizationService.anonymizeMetadata({
        language: 'fr'
      });
      expect(result.language).toBe('fr');
    });

    it('should delete ip field', () => {
      const result = ContactAnonymizationService.anonymizeMetadata({
        ip: '192.168.1.1'
      });
      expect(result.ip).toBeUndefined();
    });

    it('should delete userAgent field', () => {
      const result = ContactAnonymizationService.anonymizeMetadata({
        userAgent: 'Mozilla/5.0...'
      });
      expect(result.userAgent).toBeUndefined();
    });

    it('should handle mixed metadata fields correctly', () => {
      const result = ContactAnonymizationService.anonymizeMetadata({
        ip: '192.168.1.1',
        language: 'fr',
        userAgent: 'Mozilla/5.0...',
        submissionTime: '2025-01-15T10:00:00Z',
        sessionId: 'sess_abc'
      });

      expect(result.ip).toBeUndefined();
      expect(result.userAgent).toBeUndefined();
      expect(result.sessionId).toBeUndefined();
      expect(result.language).toBe('fr');
      expect(result.submissionTime).toBe('2025-01-15T10:00:00Z');
    });

  });

});
```

**Run tests:**
```bash
npm test -- contactAnonymization.test.js
```

**Expected:** 10/10 tests passing ✅

### Manual Testing Checklist

#### Test 1: Complete End-to-End Anonymization Flow

**Setup:**
1. Create Test User A with Weavink account
2. Create Test User B with Weavink account
3. Exchange contact between User A and User B
4. User B adds notes: "Great lead, follow up Q1"
5. User B adds tags: ["VIP", "Partner"]
6. Verify contact appears in User B's contact list with all data

**Execute:**
1. User A requests account deletion
2. Wait 30 days (or manually trigger deletion for testing)
3. Account deletion executes

**Verify:**
1. Open User B's contact list
2. Find the anonymized contact
3. Verify:
   - ✅ Name shows: `[Contact Deleted - {date}]`
   - ✅ Email shows: `[deleted]`
   - ✅ Phone shows: `[deleted]`
   - ✅ Company still shows: "Acme Corp"
   - ✅ Job title still shows: "CEO"
   - ✅ Notes preserved with deletion notice appended
   - ✅ Tags preserved: ["VIP", "Partner"]
   - ✅ GPS coordinates removed (lat/long = null)
   - ✅ Social media links removed (LinkedIn, Twitter, etc.)
   - ✅ Department preserved (if present)

#### Test 2: Firestore Data Verification

**Steps:**
1. After Test 1, open Firebase Console
2. Navigate to: `/Contacts/{user_b_id}`
3. Find the anonymized contact in `contacts` array
4. Verify fields match expected anonymization (see Database Schema section)

**Verify:**
- ✅ `isAnonymized: true`
- ✅ `anonymizedDate` set
- ✅ `originalName` preserved (for audit)
- ✅ All PII fields anonymized
- ✅ Business context preserved

#### Test 3: Pinecone Vector Verification

**Setup:**
1. Use Pinecone console or API to query vector

**Steps:**
```javascript
// Query Pinecone vector after anonymization
const vectorId = `${user_b_id}_${contact_id}`;
const vector = await pinecone.index('weavink').fetch([vectorId]);
console.log(vector.metadata);
```

**Verify:**
- ✅ Vector still exists (not deleted)
- ✅ `metadata.name` = "[Contact Deleted]"
- ✅ `metadata.email` not present
- ✅ `metadata.phone` not present
- ✅ `metadata.linkedin` not present
- ✅ `metadata.company` still present
- ✅ `metadata.jobTitle` still present
- ✅ `metadata.department` still present (if was in original)
- ✅ `metadata.isAnonymized` = true

#### Test 4: Semantic Search Still Works

**Steps:**
1. After anonymization, use User B's account
2. Search contacts with query: "Sales CEO tech conference"
3. Verify anonymized contact appears in results

**Expected:** ✅ Contact found (vector still searchable)

#### Test 5: Edge Cases

**Test 5a: Contact with minimal data**
- Contact has only: name, email
- Verify anonymization doesn't error on missing fields

**Test 5b: Contact with no dynamicFields**
- Verify no error when `dynamicFields` is undefined/null

**Test 5c: Contact with no metadata**
- Verify no error when `metadata` is undefined/null

**Test 5d: Contact already anonymized**
- Run anonymization twice on same contact
- Verify idempotent (no double-anonymization issues)

#### Test 6: Translation Verification

**Steps:**
1. Change User B's language to French
2. View anonymized contact
3. Verify deletion notice appears in French

**Repeat for:** Spanish, Chinese, Vietnamese

---

## Privacy Policy Updates

### Section to Add/Update

**File:** Privacy Policy page (exact location TBD)

**Section:** "What Happens When You Delete Your Account"

```markdown
## What Happens When You Delete Your Account

### Your Right to Be Forgotten (GDPR Article 17)

When you delete your Weavink account, we respect your right to erasure under GDPR Article 17. Here's exactly what happens to your data:

#### 1. Your Account Data
- ✅ **Immediately**: Your account is marked for deletion with a 30-day grace period
- ✅ **After 30 days**: Your account and all personal data are permanently deleted

#### 2. Your Contact Data in Other Users' Contact Lists

**The Challenge**: If you exchanged contact information with other users (User B), your contact details exist in their contact lists. We must balance:
- **Your right to erasure** (GDPR Article 17)
- **Their legitimate interest** in maintaining business records (GDPR Article 6(1)(f))

**Our Solution: Context-Preserving Anonymization**

When you delete your account, we **anonymize** (not delete) your contact information in other users' lists:

| What Gets Deleted | What Gets Preserved | Why |
|-------------------|---------------------|-----|
| ❌ Your name, email, phone numbers | ✅ Company name | Business entity (not your personal data) |
| ❌ Your social media profiles | ✅ Job title | Professional context (without your identity) |
| ❌ Your website, personal URLs | ✅ Event/meeting location | Business context |
| ❌ Your GPS coordinates | ✅ Their notes about you | They created these notes |
| ❌ Your IP address, tracking data | ✅ Their tags for you | They created these categories |
| ❌ Personal messages you sent | ✅ Department, industry | Non-identifying business context |

**What Other Users See After You Delete Your Account:**

**Before:**
```
Name: John Doe
Email: john@example.com
Phone: +33 6 12 34 56 78
Company: Acme Corp
Job Title: CEO
Notes: Great contact from conference
```

**After:**
```
Name: [Contact Deleted - 2025-11-20]
Email: [deleted]
Phone: [deleted]
Company: Acme Corp
Job Title: CEO
Notes: Great contact from conference

⚠️ This contact deleted their Weavink account on 2025-11-20.
Some contact details have been removed for privacy compliance.
```

#### 3. Legal Basis

**Your Right to Erasure (Article 17):**
- We delete all personal identifiers that can directly or indirectly identify you
- Name, email, phone, social media profiles, GPS coordinates, IP addresses

**Their Legitimate Interest (Article 6(1)(f)):**
- Business relationship context (company, job title, meeting location)
- Their own notes and categorization
- Non-identifying business context (department, industry)

**Balancing Test:**
- ✅ You cannot be identified from the remaining data
- ✅ They retain essential business context
- ✅ Proportionate and necessary for their business records
- ✅ GDPR compliant

#### 4. Your Data in Search Indexes (Pinecone)

We use semantic search to help users find contacts. When you delete your account:
- ✅ Your personal identifiers are removed from search metadata
- ✅ The anonymized contact remains searchable (users can still find "Sales CEO at Acme Corp")
- ✅ GDPR compliant: Search vectors do not contain personal data

#### 5. Audit Logs & Compliance

For GDPR accountability (Article 5(2)), we retain:
- ✅ Your original name in anonymized contact (database only, not shown to users)
- ✅ Anonymization timestamp
- ✅ Audit log of deletion operation

This demonstrates compliance if challenged.

### How to Request Deletion

1. Go to: Account & Privacy → Delete Account tab
2. Confirm deletion (30-day grace period begins)
3. After 30 days, deletion is automatic and permanent

### Questions About Deletion?

Contact our Data Protection Officer: privacy@weavink.io
```

---

## Translation Requirements

All user-facing text must be translated into 5 languages:

1. **English (en)** ✅ (already documented above)
2. **French (fr)** ✅ (already documented above)
3. **Spanish (es)** ✅ (already documented above)
4. **Chinese (ch)** ✅ (already documented above)
5. **Vietnamese (vm)** ✅ (already documented above)

**Files Updated:**
- `/public/locales/en/common.json`
- `/public/locales/fr/common.json`
- `/public/locales/es/common.json`
- `/public/locales/ch/common.json`
- `/public/locales/vm/common.json`

**Keys Required:**
- `privacy.contact_anonymized_placeholder`
- `privacy.contact_deleted_notice`
- `privacy.contact_deleted_name`
- `privacy.anonymized_contact_label`
- `privacy.anonymized_contact_tooltip`

---

## Edge Cases & Error Handling

### Edge Case 1: Contact Already Anonymized

**Scenario:** User A deletes account twice (shouldn't happen, but defensive coding)

**Handling:**
```javascript
// In ContactAnonymizationService.anonymizeContact()
if (contact.isAnonymized) {
  console.warn(`Contact ${contact.id} already anonymized, skipping`);
  return contact; // Idempotent - no changes
}
```

### Edge Case 2: Missing dynamicFields

**Scenario:** Contact has no `dynamicFields` property

**Handling:**
```javascript
// In anonymizeDynamicFields()
if (!dynamicFields || typeof dynamicFields !== 'object') {
  return {}; // Return empty object, not undefined
}
```

### Edge Case 3: Missing metadata

**Scenario:** Contact has no `metadata` property

**Handling:**
```javascript
// In anonymizeMetadata()
if (!metadata || typeof metadata !== 'object') {
  return {}; // Return empty object
}
```

### Edge Case 4: Pinecone Vector Doesn't Exist

**Scenario:** Vector was already deleted or never created

**Handling:**
```javascript
// In VectorStorageService.anonymizeVectorMetadata()
const existingVector = fetchResponse.vectors?.[vectorId];

if (!existingVector) {
  console.warn(`Vector not found: ${vectorId}`);
  return; // Graceful exit, don't throw error
}
```

### Edge Case 5: Firestore Update Fails

**Scenario:** Firestore write fails (network issue, permissions, etc.)

**Handling:**
```javascript
// In removeContactFromUser()
try {
  await contactsRef.update({ contacts });
  console.log('✅ Contact anonymized in Firestore');
} catch (error) {
  console.error('Error updating Firestore:', error);
  // Log error but don't throw - account deletion should still proceed
  // We'll retry or handle in background job
}
```

### Edge Case 6: Partial Contact Data

**Scenario:** Contact has only name and email, no other fields

**Handling:**
- Anonymization service handles undefined fields gracefully
- Uses optional chaining: `contact.location?.latitude`
- Falls back to defaults where appropriate

### Edge Case 7: Very Long Notes

**Scenario:** User B has 10,000 character notes

**Handling:**
```javascript
// Don't truncate notes - preserve all User B's data
// Firestore limit is 1MB per document, notes won't hit that
notes: contact.notes
  ? contact.notes + DELETION_NOTICE_TEMPLATE(formattedDate)
  : DELETION_NOTICE_TEMPLATE(formattedDate).trim()
```

### Edge Case 8: Tags Containing Personal Info

**Scenario:** User B created tag: "JohnDoe-VIP-Partner"

**Decision:** Keep the tag
**Rationale:**
- User B created this tag themselves
- It's User B's personal categorization
- If User B included a name in their tag, that's their choice
- Not User A's personal data under GDPR (it's User B's data about their business relationship)

---

## Monitoring & Logging

### Logging Strategy

**What to Log:**

1. **Anonymization Start**
```javascript
console.log(`[ANONYMIZATION] Starting anonymization for deleted user: ${deletedUserId}`);
console.log(`[ANONYMIZATION] Finding contacts for user: ${deletedUserId}`);
```

2. **Contacts Found**
```javascript
console.log(`[ANONYMIZATION] Found ${contactOwners.length} users with contact for ${deletedUserId}`);
```

3. **Per-Contact Anonymization**
```javascript
console.log(`[ANONYMIZATION] Anonymizing contact for user: ${userId}, contactId: ${contactId}`);
```

4. **Firestore Update Success**
```javascript
console.log(`[ANONYMIZATION] ✅ Contact anonymized in Firestore for user: ${userId}`);
```

5. **Pinecone Update Success**
```javascript
console.log(`[ANONYMIZATION] ✅ Vector metadata anonymized for user: ${userId}, contactId: ${contactId}`);
```

6. **Errors**
```javascript
console.error(`[ANONYMIZATION] ❌ Error anonymizing contact for user ${userId}:`, error);
```

7. **Completion**
```javascript
console.log(`[ANONYMIZATION] ✅ Anonymization complete for deleted user: ${deletedUserId}`);
console.log(`[ANONYMIZATION] Anonymized ${successCount}/${totalCount} contacts`);
```

### Audit Log (Firestore Collection)

**Collection:** `/AuditLogs/`

**Document Structure:**
```javascript
{
  type: 'contact_anonymization',
  deletedUserId: 'user_a_id',
  deletedUsername: 'john-doe',
  affectedUserIds: ['user_b_id', 'user_c_id'], // Users whose contacts were anonymized
  totalContactsAnonymized: 3,
  timestamp: FirebaseTimestamp,
  success: true,
  errors: [] // Array of any errors encountered
}
```

**Retention:** 5 years (GDPR accountability requirement)

### Monitoring Metrics

**Track in Admin Dashboard:**

1. **Anonymization Success Rate**
   - Total contacts to anonymize vs successfully anonymized
   - Target: 100% success rate

2. **Anonymization Duration**
   - Time taken to anonymize all contacts for one deleted user
   - Alert if > 5 seconds

3. **Failed Anonymizations**
   - Number of contacts that failed to anonymize
   - Alert if > 0

4. **Pinecone Sync Issues**
   - Contacts anonymized in Firestore but not in Pinecone
   - Alert if mismatch detected

---

## Rollback Strategy

### If Anonymization Fails During Account Deletion

**Scenario:** Account deletion executes but contact anonymization fails partway through

**Detection:**
- Error logs show anonymization failures
- Audit log shows `success: false`
- Some contacts anonymized, others not

**Rollback Not Needed:**
- Account deletion is irreversible (User A wanted deletion)
- Partial anonymization is better than no anonymization
- Failed contacts can be retry in background job

**Recovery Strategy:**

1. **Background Job: Retry Anonymization**
```javascript
// Cron job runs daily: anonymizeOrphanedContacts.js
// Finds contacts with userId/weavinkUserId pointing to deleted users
// Re-runs anonymization

async function retryFailedAnonymizations() {
  const deletedUsers = await adminDb.collection('Users')
    .where('isDeleted', '==', true)
    .get();

  for (const userDoc of deletedUsers.docs) {
    const userId = userDoc.id;

    // Find contacts still referencing this deleted user
    const orphanedContacts = await findContactsWithUserId(userId);

    if (orphanedContacts.length > 0) {
      console.log(`Found ${orphanedContacts.length} orphaned contacts for deleted user: ${userId}`);

      // Re-run anonymization
      for (const { ownerId, contactId } of orphanedContacts) {
        await removeContactFromUser(ownerId, userId, userDoc.data().username, new Date().toISOString());
      }
    }
  }
}
```

2. **Manual Recovery (Admin Dashboard)**
- Admin can view failed anonymizations
- Admin can trigger manual re-anonymization
- Admin can verify anonymization status

### If Pinecone Anonymization Fails

**Scenario:** Firestore anonymized successfully, but Pinecone update failed

**Detection:**
```javascript
// Query: Contacts with isAnonymized: true but Pinecone still has PII
const anonymizedContacts = await getAnonymizedContacts();
for (const contact of anonymizedContacts) {
  const vector = await pinecone.fetch([vectorId]);
  if (vector.metadata.email || vector.metadata.phone) {
    console.error(`Pinecone not anonymized for contact: ${contact.id}`);
    // Trigger retry
  }
}
```

**Recovery:**
- Background job retries Pinecone anonymization
- Alternatively: Delete vector entirely (safe fallback)

---

## Success Criteria

### Functional Requirements

- ✅ All PII fields anonymized (name, email, phone, GPS, IP, social media)
- ✅ Business context preserved (company, jobTitle, notes, tags, venue)
- ✅ dynamicFields selectively anonymized (keep department/industry, delete social media)
- ✅ Legacy `details` array deleted entirely
- ✅ Metadata anonymized (delete IP, userAgent, sessionId, timezone)
- ✅ User identifiers deleted (userId, weavinkUserId set to null)
- ✅ Pinecone vectors kept with anonymized metadata
- ✅ Notes appended with deletion notice
- ✅ Anonymization tracking fields added (isAnonymized, anonymizedDate, originalName)

### Technical Requirements

- ✅ 10 automated tests passing
- ✅ Manual testing confirms correct anonymization
- ✅ Firestore updates succeed
- ✅ Pinecone updates succeed
- ✅ No errors thrown during anonymization
- ✅ Graceful handling of missing fields
- ✅ Idempotent (running twice doesn't cause issues)

### GDPR Compliance

- ✅ No personal identifiers remain
- ✅ Balancing test passed (User A's rights vs User B's legitimate interest)
- ✅ Proportionate data retention
- ✅ Audit logging for accountability
- ✅ Privacy policy updated and transparent
- ✅ CNIL compliance (French DPA)

### User Experience

- ✅ User B sees clear deletion notice
- ✅ User B retains business context
- ✅ User B's notes and tags preserved
- ✅ Semantic search still works for anonymized contacts
- ✅ UI indicates anonymized status (grayed out, label)
- ✅ Multi-language support (5 languages)

### Documentation

- ✅ Implementation guide complete (this document)
- ✅ Code changes documented
- ✅ Testing procedures documented
- ✅ Privacy policy updated
- ✅ Translation keys added
- ✅ Audit trail documented

---

## Appendix: Field-by-Field Reference

### Quick Reference Table

| Field Path | Data Type | Example Value | PII? | Action | Preserved? |
|-----------|-----------|---------------|------|--------|------------|
| `id` | string | `"contact_123"` | ❌ | KEEP | ✅ |
| `name` | string | `"John Doe"` | ✅ | ANONYMIZE → `"[Contact Deleted - {date}]"` | ❌ |
| `email` | string | `"john@example.com"` | ✅ | ANONYMIZE → `"[deleted]"` | ❌ |
| `phone` | string | `"+33 6 12 34 56 78"` | ✅ | ANONYMIZE → `"[deleted]"` | ❌ |
| `phoneNumbers[]` | Array | `[{number: "+33...", type: "mobile"}]` | ✅ | DELETE → `[]` | ❌ |
| `company` | string | `"Acme Corp"` | ❌ | KEEP | ✅ |
| `jobTitle` | string | `"CEO"` | ⚠️ | KEEP | ✅ |
| `website` | string | `"https://johndoe.com"` | ✅ | ANONYMIZE → `"[deleted]"` | ❌ |
| `message` | string | `"Met at conference..."` | ✅ | ANONYMIZE → `"[deleted]"` | ❌ |
| `userId` | string | `"user_a_id"` | ✅ | DELETE → `null` | ❌ |
| `weavinkUserId` | string | `"user_a_id"` | ✅ | DELETE → `null` | ❌ |
| `location.latitude` | number | `48.8566` | ✅ | DELETE → `null` | ❌ |
| `location.longitude` | number | `2.3522` | ✅ | DELETE → `null` | ❌ |
| `location.accuracy` | number | `10.5` | ❌ | KEEP | ✅ |
| `location.address` | string | `"123 Main St"` | ✅ | ANONYMIZE → `"[deleted]"` | ❌ |
| `location.venue` | string | `"Tech Conference 2025"` | ❌ | KEEP | ✅ |
| `dynamicFields.linkedin` | string | `"linkedin.com/in/johndoe"` | ✅ | DELETE | ❌ |
| `dynamicFields.twitter` | string | `"@johndoe"` | ✅ | DELETE | ❌ |
| `dynamicFields.facebook` | string | `"facebook.com/johndoe"` | ✅ | DELETE | ❌ |
| `dynamicFields.department` | string | `"Sales"` | ❌ | KEEP | ✅ |
| `dynamicFields.industry` | string | `"Technology"` | ❌ | KEEP | ✅ |
| `dynamicFields.specialty` | string | `"Cloud Computing"` | ❌ | KEEP | ✅ |
| `details[]` | Array | `[{label: "LinkedIn", value: "..."}]` | ✅ | DELETE → `[]` | ❌ |
| `tags[]` | Array | `["VIP", "Partner"]` | ❌ | KEEP | ✅ |
| `notes` | string | `"Great contact..."` | ❌ | KEEP + APPEND | ✅ |
| `metadata.ip` | string | `"192.168.1.1"` | ✅ | DELETE | ❌ |
| `metadata.userAgent` | string | `"Mozilla/5.0..."` | ✅ | DELETE | ❌ |
| `metadata.referrer` | string | `"https://..."` | ✅ | DELETE | ❌ |
| `metadata.sessionId` | string | `"sess_abc"` | ✅ | DELETE | ❌ |
| `metadata.timezone` | string | `"Europe/Paris"` | ⚠️ | DELETE | ❌ |
| `metadata.language` | string | `"fr"` | ❌ | KEEP | ✅ |
| `metadata.submissionTime` | ISO string | `"2025-01-15T..."` | ❌ | KEEP | ✅ |
| `metadata.hasScannedData` | boolean | `true` | ❌ | KEEP | ✅ |
| `status` | string | `"viewed"` | ❌ | KEEP | ✅ |
| `source` | string | `"exchange"` | ❌ | KEEP | ✅ |
| `submittedAt` | ISO string | `"2025-01-15T..."` | ❌ | KEEP | ✅ |
| `lastModified` | ISO string | `"2025-01-20T..."` | ❌ | KEEP | ✅ |
| `createdBy` | string | `"user_b_id"` | ❌ | KEEP | ✅ |
| `isAnonymized` | boolean | `true` | ❌ | ADD (new field) | ✅ |
| `anonymizedDate` | ISO string | `"2025-11-20T..."` | ❌ | ADD (new field) | ✅ |
| `originalName` | string | `"John Doe"` | ⚠️ | ADD (audit only) | ✅ |

**Summary:**
- **Total fields:** 30+
- **Anonymized/Deleted:** 17 fields
- **Preserved:** 13 fields
- **Newly Added:** 3 fields (anonymization tracking)

---

**End of Implementation Guide**

**Next Steps:**
1. Review this guide
2. Confirm approach with legal/DPO
3. Implement Phase 1-5
4. Run automated tests
5. Execute manual testing
6. Update privacy policy
7. Deploy to production

**Questions?** Contact: development team or privacy@weavink.io
