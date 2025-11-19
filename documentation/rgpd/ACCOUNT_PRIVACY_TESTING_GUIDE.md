# Account & Privacy Testing Guide
**Comprehensive Testing Reference for RGPD/GDPR Compliance**

> **Document Version:** 1.1
> **Last Updated:** 2025-11-18
> **Compliance Score:** 95/100 (Phase 4 Complete)
> **Test Coverage:** 154+ scenarios across 7 tabs (Added 8 rate limit timer tests)

---

## Table of Contents

1. [Overview](#overview)
2. [Tab 1: Aperçu (Overview)](#tab-1-aperçu-overview)
3. [Tab 2: Exporter les Données (Export Data)](#tab-2-exporter-les-données-export-data)
4. [Tab 3: Supprimer le Compte (Delete Account)](#tab-3-supprimer-le-compte-delete-account)
5. [Tab 4: Consentements (Consents)](#tab-4-consentements-consents)
6. [Tab 5: Paramètres de Confidentialité (Privacy Settings)](#tab-5-paramètres-de-confidentialité-privacy-settings)
7. [Tab 6: Téléchargement de Contact (Contact Download)](#tab-6-téléchargement-de-contact-contact-download)
8. [Tab 7: Configuration du Site Web (Website Configuration)](#tab-7-configuration-du-site-web-website-configuration)
9. [General RGPD Compliance Requirements](#general-rgpd-compliance-requirements)
10. [Comprehensive Audit Logging Matrix](#comprehensive-audit-logging-matrix)
11. [Database Collections Reference](#database-collections-reference)

---

## Overview

This guide provides exhaustive testing instructions for the Account & Privacy page, covering all RGPD/GDPR compliance requirements. Each section details:

- ✅ **Test Scenarios**: Step-by-step test cases
- 📊 **Expected Database State**: Before and after each action
- 🔄 **Database Changes**: Specific collection/field modifications
- ⚖️ **RGPD Compliance**: Relevant GDPR articles and CNIL guidelines
- 📋 **Audit Logging**: Required logging for accountability

### Testing Philosophy

1. **Privacy by Design**: Default settings should be most protective
2. **Transparency**: Every action must be clearly explained to users
3. **User Control**: Users must have complete control over their data
4. **Accountability**: All privacy actions must be logged for 5-7 years
5. **Data Minimization**: Collect and retain only what's necessary

### Key Constants Reference

From `/lib/services/servicePrivacy/constants/privacyConstants.js`:
- `DELETION_CONFIRMATION_TEXT`: "DELETE MY ACCOUNT"
- `GRACE_PERIOD_DAYS`: 30
- `EXPORT_EXPIRATION_HOURS`: 24
- `MAX_EXPORTS_PER_HOUR`: 3
- `CONSENT_LOG_RETENTION_YEARS`: 7
- `BILLING_RETENTION_YEARS`: 10 (French law)

---

## Tab 1: Aperçu (Overview)

### Purpose
Provides summary of all GDPR rights and privacy features available to users.

### Test Scenarios

#### 1.1 Display & Navigation
- [ ] **Test 1.1.1**: Tab displays correctly with Info icon
- [ ] **Test 1.1.2**: Overview content shows summary of all privacy features
- [ ] **Test 1.1.3**: Deep-linking works with `?tab=overview` URL parameter
- [ ] **Test 1.1.4**: All 8 GDPR rights are listed and explained
- [ ] **Test 1.1.5**: DPO contact information displays (`dpo@weavink.io`)
- [ ] **Test 1.1.6**: CNIL complaint link is present and functional

#### 1.2 Content Verification
Verify these 8 GDPR rights are displayed:

1. **Right to be informed** (Art. 13-14)
   - Clear privacy notice
   - Purpose of processing
   - Legal basis for processing

2. **Right of access** (Art. 15)
   - View all personal data
   - Know who has access

3. **Right to rectification** (Art. 16)
   - Correct inaccurate data
   - Complete incomplete data

4. **Right to erasure** (Art. 17)
   - "Right to be forgotten"
   - Account deletion with grace period

5. **Right to restrict processing** (Art. 18)
   - Limit how data is used
   - Withdraw specific consents

6. **Right to data portability** (Art. 20)
   - Export data in machine-readable format
   - Transfer to another service

7. **Right to object** (Art. 21)
   - Object to specific processing
   - Opt-out of marketing

8. **Rights related to automated decision making** (Art. 22)
   - Understand AI processing
   - Consent to AI features

### Expected Database State
**No database changes** (read-only informational tab)

### RGPD Compliance Requirements
- ✅ Display all 8 GDPR rights clearly
- ✅ Provide DPO contact information
- ✅ Link to full Privacy Policy
- ✅ Available in French (CNIL requirement)
- ✅ Explain how to exercise each right

---

## Tab 2: Exporter les Données (Export Data)

### Purpose
Implements GDPR Art. 20 (Right to data portability) - allows users to export all their personal data in machine-readable formats.

### Test Scenarios

#### 2.1 Basic Export Tests

##### Test 2.1.1: Export Button Visibility
- Navigate to Export Data tab
- Verify "Export All Data" button is visible
- Verify button shows proper icon (Download icon)
- Verify button is enabled

##### Test 2.1.2: Export Request Initiation
```
STEPS:
1. Click "Export All Data" button
2. Wait for processing indicator
3. Observe success message

EXPECTED:
- Loading spinner appears
- Request completes within 30 seconds
- Success message: "Export completed successfully"
- File list appears with all 9 files
```

##### Test 2.1.3: Export File Generation
Verify all 9 files are generated:

1. ✅ `user_profile.json` - User account data
2. ✅ `contacts.json` - All contacts in JSON
3. ✅ `contacts.csv` - All contacts in CSV
4. ✅ `contacts.vcf` - All contacts in vCard 3.0 (RFC 2426)
5. ✅ `groups.json` - Contact groups
6. ✅ `analytics.json` - Personal analytics (anonymized)
7. ✅ `consent_history.json` - Complete consent audit trail
8. ✅ `settings.json` - User preferences
9. ✅ `README.txt` - Human-readable guide

##### Test 2.1.4: File Format Validation

**JSON Files:**
```javascript
// Verify JSON is valid
const json = JSON.parse(fileContent);
// Should not throw error
```

**CSV File:**
```csv
Name,Email,Phone,Company,Title,CreatedAt
John Doe,john@example.com,+33612345678,Acme Inc,CEO,2025-01-01T10:00:00Z
```
- ✅ Headers present
- ✅ Proper escaping of commas in fields
- ✅ UTF-8 encoding

**vCard File:**
```vcard
BEGIN:VCARD
VERSION:3.0
FN:John Doe
EMAIL:john@example.com
TEL:+33612345678
ORG:Acme Inc
TITLE:CEO
END:VCARD
```
- ✅ Follows RFC 2426 standard
- ✅ Imports to Google Contacts
- ✅ Imports to Apple Contacts
- ✅ Imports to Microsoft Outlook

#### 2.2 Advanced Export Features

##### Test 2.2.1: Download All as ZIP
```
STEPS:
1. After export completes, verify "Download All as ZIP" button appears
2. Click "Download All as ZIP" button
3. Wait for ZIP generation
4. ZIP file downloads

EXPECTED:
- ZIP named: weavink-export-2025-01-18.zip
- Contains folder: weavink-data-export/
- All 9 files inside folder
- ZIP size < 50MB (typical user)
```

##### Test 2.2.2: Individual File Downloads
```
STEPS:
1. After export completes, verify individual download buttons
2. Click download button for each file type
3. Verify file downloads correctly

EXPECTED:
- Each file downloads separately
- Correct MIME types:
  - JSON: application/json
  - CSV: text/csv
  - vCard: text/vcard
  - TXT: text/plain
```

#### 2.3 Rate Limiting Tests

##### Test 2.3.1: Export Limit Enforcement
```
STEPS:
1. Request export (1st time)
2. Wait for completion
3. Request export (2nd time)
4. Wait for completion
5. Request export (3rd time)
6. Wait for completion
7. Request export (4th time) - should fail

EXPECTED:
- First 3 exports succeed
- 4th export triggers 429 response
- UI shows countdown timer
- Button is greyed out and disabled
- Rate limit counter resets after 1 hour
```

##### Test 2.3.2: Rate Limit Timer Display
```
STEPS:
1. Trigger rate limit (4th export within 1 hour)
2. Observe the UI changes

EXPECTED UI CHANGES:
- ✅ Orange/yellow alert box appears with AlertCircle icon
- ✅ Alert displays: "Rate Limit Reached"
- ✅ Message: "You've reached the maximum of 3 data exports per hour"
- ✅ Countdown timer displays with Timer icon
- ✅ Timer format: "Available in: 59m 45s" (or "1h 15m" format)
- ✅ Button changes:
  - Shows Clock/Timer icon (instead of Download icon)
  - Text changes to "Wait 59m 45s"
  - Button is greyed out (bg-gray-400)
  - Button is disabled (cursor-not-allowed)

ADDITIONAL CHECKS:
- Timer updates every second
- Time format adjusts (e.g., "45s", "2m 30s", "1h 15m")
- No generic error message shown (error state cleared)
```

##### Test 2.3.3: Rate Limit Timer Countdown
```
STEPS:
1. Trigger rate limit
2. Note the initial countdown time (e.g., 59m 42s)
3. Wait 10 seconds
4. Observe the timer

EXPECTED:
- Timer counts down accurately (59m 42s → 59m 32s)
- Timer updates every 1 second (no delays or jumps)
- Time format changes appropriately:
  - "59m 32s" when > 60 seconds
  - "45s" when < 60 seconds
  - "1h 5m" when >= 1 hour
  - "2h 15m" for longer periods
- No negative values shown
- Timer stops at 0s
```

##### Test 2.3.4: Rate Limit Persistence (localStorage)
```
STEPS:
1. Trigger rate limit
2. Note the countdown time (e.g., 59m 30s)
3. Refresh the page
4. Navigate back to Export Data tab

EXPECTED:
- Rate limit state persists after page refresh
- Timer resumes from where it left off (approximately same time)
- Timer shows accurate remaining time (NOT reset to 1 hour)
- Button remains greyed out and disabled
- Alert box still displays

BROWSER STORAGE CHECK:
- localStorage key: 'weavink_export_rate_limit'
- Data structure:
  {
    "resetTime": 1763501766237,  // Unix timestamp (ms)
    "limit": {
      "max": 3,
      "windowHours": 1
    },
    "timestamp": 1763498224237
  }

ACCURACY TEST:
- If rate limited at 12:00 PM
- Refresh at 12:05 PM (5 minutes later)
- Timer should show ~55 minutes remaining (NOT 60 minutes)
```

##### Test 2.3.5: localStorage Cleanup
```
STEPS:
1. Trigger rate limit
2. Wait until timer expires (or manually adjust system time forward)
3. Observe timer reaching 0

EXPECTED:
- Timer counts down to 0s
- Alert box disappears
- Button becomes enabled
- Button returns to normal state (blue, enabled)
- Button shows Download icon again
- localStorage key 'weavink_export_rate_limit' is removed
- Console log: "✅ Rate limit expired and cleared"
```

##### Test 2.3.6: Multi-Tab Synchronization
```
STEPS:
1. Open Account & Privacy page in Tab A
2. Open Account & Privacy page in Tab B (same browser)
3. In Tab A: Navigate to Export Data
4. In Tab A: Trigger rate limit (4th export)
5. Switch to Tab B
6. In Tab B: Navigate to Export Data
7. Observe Tab B's state

EXPECTED IN TAB B:
- Rate limit state immediately syncs from Tab A
- Countdown timer appears in Tab B
- Timer shows same remaining time as Tab A
- Button is greyed out and disabled in Tab B
- Both tabs' timers update in sync (within 1 second)

CLEANUP TEST:
- Let timer expire in Tab A
- Switch to Tab B
- Tab B should clear rate limit state
- Both tabs show enabled button

TECHNICAL:
- Uses storage events for cross-tab communication
- Changes in one tab trigger 'storage' event in other tabs
- localStorage acts as shared state
```

##### Test 2.3.7: Rate Limit Accuracy (Server vs Client)
```
STEPS:
1. Trigger rate limit at exactly 12:00:00 PM
2. Verify server response
3. Verify client displays correct time

SERVER RESPONSE (429):
{
  "error": "Rate limit exceeded",
  "retryAfter": 3600,        // 3600 seconds = 1 hour
  "resetTime": 1763516400000, // Absolute timestamp: 1:00:00 PM
  "limit": {
    "max": 3,
    "windowHours": 1
  }
}

CLIENT AT 12:00:00 PM:
- Should show: "59m 59s" or "1h" (approximately)

CLIENT AT 12:05:00 PM (5 minutes later):
- Should show: "55m" remaining (NOT 60m!)
- Calculated from resetTime, not retryAfter

VERIFICATION:
- Check browser DevTools → Network → Response for 429
- Verify resetTime field is present
- Verify client uses resetTime (absolute) not retryAfter (relative)
- Check console logs for accurate time calculations
```

##### Test 2.3.8: Rate Limit with Network Errors
```
STEPS:
1. Trigger 3 successful exports
2. Disconnect network (DevTools → Network → Offline)
3. Try 4th export

EXPECTED:
- Network error shown (not rate limit)
- No countdown timer displayed
- Button remains enabled after error
- Red error message: "Network error" or "Failed to export"
- No localStorage written

THEN:
1. Reconnect network
2. Try export again (should be 4th real attempt)

EXPECTED:
- Now triggers rate limit (429)
- Countdown timer appears
- Correct behavior as per previous tests
```

##### Test 2.3.9: Rate Limit Response Headers
```
STEPS:
1. Trigger rate limit (4th export)
2. Open DevTools → Network tab
3. Select the failed request
4. Check Response Headers

EXPECTED HEADERS:
- Status: 429 Too Many Requests
- Retry-After: 3542 (seconds until reset)
- Content-Type: application/json

RESPONSE BODY:
{
  "error": "Rate limit exceeded",
  "message": "You can request a maximum of 3 data exports per hour...",
  "retryAfter": 3542,
  "resetTime": 1763501766237,
  "limit": {
    "max": 3,
    "windowHours": 1
  }
}

VERIFICATION:
- Both retryAfter AND resetTime present
- resetTime is Unix timestamp in milliseconds
- retryAfter is seconds (not milliseconds)
```

#### 2.4 Permission Tests

##### Test 2.4.1: Free Tier Access
```
STEPS:
1. Login as Free tier user
2. Navigate to Export Data tab
3. Verify export button is enabled

EXPECTED:
- Export functionality available (GDPR mandates this for all users)
- No "Upgrade required" message
```

##### Test 2.4.2: Business Tier Benefits
```
STEPS:
1. Login as Business tier user
2. Check rate limits

EXPECTED:
- Same rate limit (3/hour) - GDPR applies equally
- Possibly priority processing (faster queue)
```

### Expected Database State

#### Before Export Request

```javascript
// No export request exists
// Query: db.collection('PrivacyRequests').where('userId', '==', userId).where('type', '==', 'export')
// Result: []
```

#### After Export Request (Pending)

```javascript
// Collection: /PrivacyRequests/{requestId}
{
  id: "req_export_1736889600_abc123",
  userId: "26v4uXMAk8c6rfLlcWKRZpE1sPC3",
  type: "export",
  status: "pending", // → "processing" → "completed"
  requestedAt: {
    _seconds: 1736889600,
    _nanoseconds: 0
  },
  completedAt: null,
  expiresAt: {
    _seconds: 1736976000, // +24 hours
    _nanoseconds: 0
  },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  files: null, // Populated when completed
  metadata: {
    options: {
      includeContacts: true,
      includeAnalytics: true,
      includeConsents: true,
      includeSettings: true
    }
  }
}
```

#### After Export Completion

```javascript
// Collection: /PrivacyRequests/{requestId}
{
  ...
  status: "completed",
  completedAt: {
    _seconds: 1736889615, // 15 seconds later
    _nanoseconds: 0
  },
  files: {
    "user_profile.json": {
      content: "{\"userId\":\"abc123\",\"email\":\"user@example.com\"...}",
      description: "User profile and account information",
      format: "JSON",
      size: 1234 // bytes
    },
    "contacts.csv": {
      content: "Name,Email,Phone...\nJohn Doe,john@example.com...",
      description: "All contacts in CSV format",
      format: "CSV",
      size: 5678
    },
    "contacts.vcf": {
      content: "BEGIN:VCARD\nVERSION:3.0...",
      description: "All contacts in vCard format",
      format: "vCard",
      size: 6789
    },
    // ... remaining 6 files
  }
}
```

#### After 24 Hours (Auto-Cleanup)

```javascript
// Collection: /PrivacyRequests/{requestId}
// Document: DELETED (data minimization)

// Cloud Storage: All export files deleted

// Audit Log Entry Created:
// Collection: /AuditLogs/{logId}
{
  category: "Data Export",
  action: "export_expired",
  userId: "abc123",
  requestId: "req_export_1736889600_abc123",
  timestamp: {
    _seconds: 1736976000,
    _nanoseconds: 0
  },
  details: {
    reason: "Automatic expiration after 24 hours",
    filesDeleted: 9
  }
}
```

### Database Changes Table

| Action | Collection | Field Changes | Cascade Effects | Audit Log |
|--------|-----------|---------------|-----------------|-----------|
| **Request Export** | `/PrivacyRequests/` | New document created | None | ✅ Logged: category="Data Export", action="export_requested" |
| **Export Completed** | `/PrivacyRequests/{id}` | `status:"completed"`, `completedAt`, `files:{...}` | None | ✅ Logged: action="export_completed", filesGenerated=9 |
| **Download File** | N/A (read-only) | N/A | None | ✅ Logged: action="export_downloaded", fileName |
| **Download ZIP** | N/A (client-side) | N/A | None | ✅ Logged: action="export_zip_downloaded" |
| **Auto-Expire** (24h) | `/PrivacyRequests/{id}` | Document DELETED | Cloud Storage files deleted | ✅ Logged: action="export_expired" |

---

#### Testing Automated Cleanup (Firebase Scheduled Function)

The 24-hour auto-cleanup is implemented via Firebase Scheduled Function: `cleanupExpiredExports`

**Function Details**:
- **Schedule**: Daily at 2:00 AM UTC
- **Implementation**: `/functions/scheduledCleanup.js`
- **Documentation**: See `FIREBASE_SCHEDULED_CLEANUP.md`

##### Manual Testing Steps

**Step 1: Create Test Export Request (Expired)**

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

// Create export request that expired 26 hours ago
const expiredDate = new Date(Date.now() - 26 * 60 * 60 * 1000);

await db.collection('PrivacyRequests').add({
  userId: 'test-user-123',
  type: 'export',
  status: 'completed',
  requestedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
  completedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
  expiresAt: expiredDate,
  exportData: { files: { /* ... */ } },
  downloadUrl: null,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0 (Test)'
});
```

**Step 2: Trigger Function Manually**

```bash
# Option 1: Firebase Console
# Navigate to Functions > cleanupExpiredExports > "Run now"

# Option 2: gcloud CLI
gcloud scheduler jobs run firebase-schedule-cleanupExpiredExports-us-central1 \
  --project=tapit-dev-e0eed
```

**Step 3: Verify Deletion**

```javascript
// Check if document was deleted
const snapshot = await db.collection('PrivacyRequests')
  .where('type', '==', 'export')
  .where('expiresAt', '<=', new Date(Date.now() - 25 * 60 * 60 * 1000))
  .get();

console.log(`Remaining expired exports: ${snapshot.size}`);
// Expected: 0 (all expired exports deleted)
```

**Step 4: Verify Audit Log**

```javascript
// Check for cleanup audit log
const auditSnapshot = await db.collection('AuditLogs')
  .where('category', '==', 'retention_policy')
  .where('action', '==', 'export_cleanup_scheduled')
  .orderBy('timestamp', 'desc')
  .limit(1)
  .get();

auditSnapshot.forEach(doc => {
  const data = doc.data();
  console.log('✅ Cleanup audit log found:');
  console.log(`   Deleted: ${data.metadata.deletedCount} exports`);
  console.log(`   Executed at: ${data.timestamp.toDate()}`);
  console.log(`   Cutoff: ${data.metadata.expirationCutoff}`);
});
```

##### Expected Audit Log Structure

```javascript
{
  category: "retention_policy",
  action: "export_cleanup_scheduled",
  userId: null,
  resourceType: "export_request",
  details: "Automated cleanup: deleted X expired export request(s)",
  severity: "info",
  ipAddress: "SYSTEM_SCHEDULED",
  userAgent: "Cloud Functions/scheduledCleanup",
  metadata: {
    deletedCount: 1,
    executedBy: "scheduled_function",
    expirationCutoff: "2025-11-18T01:00:00.000Z",
    deletedRequestIds: ["abc123"],
    executionTimeMs: 1234
  },
  timestamp: FieldValue.serverTimestamp(),
  verified: true
}
```

##### Monitoring Scheduled Runs

**View Function Logs**:
```bash
# Recent executions
firebase functions:log --only cleanupExpiredExports --limit 20

# Filter for errors
firebase functions:log --only cleanupExpiredExports | grep ERROR
```

**Cloud Logging Query** (Firebase Console):
```
resource.type="cloud_function"
resource.labels.function_name="cleanupExpiredExports"
```

##### Common Test Scenarios

**Scenario 1: No Expired Exports**
- **Setup**: No exports older than 25 hours
- **Expected**: `deletedCount: 0` in logs
- **Result**: ✅ Pass (normal behavior)

**Scenario 2: Multiple Expired Exports**
- **Setup**: Create 5 exports expired 26+ hours ago
- **Expected**: `deletedCount: 5` in audit log
- **Result**: ✅ Pass (all deleted)

**Scenario 3: Mixed Status Exports**
- **Setup**: Create expired exports with status "pending" and "completed"
- **Expected**: Only "completed" exports deleted
- **Result**: ✅ Pass (status filter works)

**Scenario 4: Borderline Expiration (24h exactly)**
- **Setup**: Create export expired exactly 24 hours ago
- **Expected**: NOT deleted (25-hour cutoff with buffer)
- **Result**: ✅ Pass (buffer prevents premature deletion)

---

### RGPD Compliance Requirements

#### GDPR Art. 20: Right to Data Portability

- ✅ **Machine-readable format**: JSON, CSV, vCard
- ✅ **Completeness**: All personal data included
- ✅ **Interoperability**: vCard works with competitors
- ✅ **Free of charge**: No payment required
- ✅ **Response time**: Maximum 1 month (we provide immediate)
- ✅ **Data minimization**: Files auto-deleted after 24h

#### CNIL Guidelines

- ✅ French language support
- ✅ Clear explanations of what's included
- ✅ README.txt in French
- ✅ DPO contact in export files

### Audit Logging Requirements

Every export action must create an audit log entry:

```javascript
// Collection: /AuditLogs/{logId}
{
  category: "Data Export",
  action: "export_requested|export_completed|export_downloaded|export_expired",
  userId: "abc123",
  requestId: "req_export_...",
  timestamp: FirebaseTimestamp,
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  details: {
    filesGenerated: 9,
    fileName: "contacts.csv", // for downloads
    totalSize: 12345, // bytes
    format: "JSON|CSV|vCard"
  },
  eventHash: "sha256_hash_for_tamper_detection"
}
```

**Retention**: 5 years (GDPR accountability requirement)

---

## Tab 3: Supprimer le Compte (Delete Account)

### Purpose
Implements GDPR Art. 17 (Right to erasure / "Right to be forgotten") with 30-day grace period and comprehensive cascade deletion.

### Test Scenarios

#### 3.1 Basic Deletion Request

##### Test 3.1.1: Delete Button Visibility
```
STEPS:
1. Navigate to Delete Account tab
2. Locate "Delete My Account" button

EXPECTED:
- Button visible with warning color (red)
- Warning icon displayed
- Warning text above button: "This action cannot be undone"
```

##### Test 3.1.2: Confirmation Modal
```
STEPS:
1. Click "Delete My Account"
2. Observe confirmation modal

EXPECTED MODAL CONTENT:
- ⚠️ Warning icon
- Severe warning messages:
  - "All your data will be permanently deleted"
  - "This action cannot be undone after 30 days"
  - "You will lose access to all contacts, groups, and settings"
- Explanation of 30-day grace period
- Text input field with placeholder: "Type DELETE MY ACCOUNT to confirm"
- Cancel button (gray)
- Confirm button (red, disabled until text matches)
```

##### Test 3.1.3: Confirmation Text Validation
```
TEST CASES:
1. Empty text → Button disabled
2. "delete my account" (lowercase) → Button disabled (case-sensitive)
3. "DELETE MY ACCOUNT " (extra space) → Button disabled (exact match required)
4. "DELETE MY ACCOUNT" (exact) → Button enabled

EXPECTED:
- Only exact text "DELETE MY ACCOUNT" enables confirmation
- From constant: DELETION_CONFIRMATION_TEXT = "DELETE MY ACCOUNT"
```

#### 3.2 Grace Period Tests

##### Test 3.2.1: Deletion Scheduled
```
STEPS:
1. Complete deletion request
2. Verify scheduling confirmation

EXPECTED DATABASE STATE:
// /users/{userId}
{
  privacy: {
    pendingDeletion: true,
    deletionRequestId: "req_deletion_...",
    deletionRequestedAt: "2025-01-18T10:00:00Z",
    deletionScheduledFor: "2025-02-17T10:00:00Z" // +30 days
  }
}

EXPECTED UI:
- Success message: "Account deletion scheduled for February 17, 2025"
- Warning banner on all pages: "⚠️ Your account will be deleted in 30 days"
- "Cancel Deletion" button prominently displayed
```

##### Test 3.2.2: Grace Period Countdown
```
STEPS:
1. After deletion request, reload pages
2. Check banner countdown

EXPECTED:
- Day 1: "Account will be deleted in 30 days"
- Day 15: "Account will be deleted in 15 days"
- Day 29: "Account will be deleted in 1 day"
- Day 30: "Account will be deleted today"
```

##### Test 3.2.3: Account Remains Accessible
```
STEPS DURING GRACE PERIOD:
1. Login
2. View contacts
3. Edit contacts
4. Change settings
5. Use all features

EXPECTED:
- ✅ Login works normally
- ✅ All features accessible
- ⚠️ Warning banner on every page
- ✅ Can export data
- ✅ Can cancel deletion
```

#### 3.3 Cancel Deletion Tests

##### Test 3.3.1: Cancel Button
```
STEPS:
1. During grace period, click "Cancel Deletion"
2. Confirm cancellation

EXPECTED DATABASE CHANGES:
// /users/{userId}
{
  privacy: {
    pendingDeletion: false, // Changed
    deletionRequestId: null, // Cleared
    deletionRequestedAt: null, // Cleared
    deletionScheduledFor: null // Cleared
  }
}

// /PrivacyRequests/{deletionRequestId}
{
  status: "cancelled", // Changed from "pending"
  cancelledAt: "2025-01-20T14:30:00Z",
  cancelledBy: "user"
}

EXPECTED UI:
- Success message: "Account deletion cancelled"
- Warning banner removed
- "Delete My Account" button available again
```

#### 3.4 Cascade Deletion Tests (Day 30 Auto-Execution)

##### Test 3.4.1: User Profile Deletion
```
VERIFY BEFORE DAY 30:
// /users/{userId}
{
  email: "user@example.com",
  displayName: "John Doe",
  // ... all profile data
}

VERIFY AFTER DAY 30:
// /users/{userId} → DELETED (document no longer exists)

AUDIT LOG:
{
  category: "Data Deletion",
  action: "user_profile_deleted",
  userId: "abc123",
  timestamp: "2025-02-17T10:00:00Z",
  deletedData: {
    fieldsDeleted: ["email", "displayName", "photoURL", "phone", ...],
    collectionsDeleted: ["contacts", "groups"]
  }
}
```

##### Test 3.4.2: Contacts Deletion
```
VERIFY BEFORE:
// /Contacts/{userId}/*
// Contains all user's contacts

VERIFY AFTER:
// /Contacts/{userId}/* → ENTIRE SUBCOLLECTION DELETED

CASCADE NOTIFICATION:
// Other users who have this user as a contact receive notification
// After 30 days of no response, contact anonymized:
{
  displayName: "Contact supprimé - 2025-02-17",
  email: null,
  phone: null,
  status: "deleted_user"
}
```

##### Test 3.4.3: Groups Deletion
```
VERIFY AFTER:
// /Groups/{userId}/* → ENTIRE SUBCOLLECTION DELETED
```

##### Test 3.4.4: Analytics Anonymization (NOT Deletion)
```
VERIFY BEFORE:
// /Analytics/{userId}/
{
  totalViews: 1234,
  dailyViews: {...},
  userId: "abc123" // Personal identifier
}

VERIFY AFTER (ANONYMIZED, NOT DELETED):
// /Analytics_Anonymous/aggregate/
{
  totalViews: 1234, // Data preserved
  dailyViews: {...},
  // userId removed - aggregated into anonymous stats
  anonymizedFrom: "2025-02-17"
}

REASON: GDPR allows retention for statistical purposes when anonymized
```

##### Test 3.4.5: Consent Logs Preservation (Legal Requirement)
```
VERIFY AFTER:
// /ConsentHistory/{userId}/* → PRESERVED (NOT DELETED)

REASON:
- GDPR Art. 7.1: Must prove consent was obtained
- French law: 7-year retention for legal accountability
- Exception to "right to erasure" under Art. 17.3(b)
```

##### Test 3.4.6: Billing Archive Creation
```
VERIFY BEFORE:
// No billing archive exists

VERIFY AFTER:
// /BillingArchive/{userId}/
{
  userId: "abc123_deleted",
  originalData: {
    subscriptionHistory: [...],
    invoices: [...],
    paymentMethods: [...] // Tokenized, no raw card data
  },
  archivedAt: "2025-02-17T10:00:00Z",
  retentionExpiresAt: "2035-02-17T10:00:00Z", // +10 years
  legalBasis: "French Commercial Code - Art. L.123-22"
}

REASON:
- French law: 10-year retention for accounting documents
- Exception to "right to erasure" under Art. 17.3(e)
```

##### Test 3.4.7: Firebase Auth Deletion
```
STEPS:
1. After 30 days, verify Firebase Auth

EXPECTED:
// Firebase Auth user → DELETED
// Login attempt returns: "User not found"
```

#### 3.5 Immediate Deletion Tests

##### Test 3.5.1: Skip Grace Period Option
```
STEPS:
1. In deletion modal, check for "Skip grace period" checkbox
2. Enable checkbox
3. Observe second confirmation

EXPECTED SECOND CONFIRMATION:
- ⚠️ Severe warning: "This will delete your account IMMEDIATELY"
- "Are you absolutely sure? This cannot be undone."
- Text input: "Type DELETE IMMEDIATELY to confirm"
- Confirm button (requires exact text match)
```

##### Test 3.5.2: Immediate Execution
```
STEPS:
1. Confirm immediate deletion
2. Wait for processing (30-60 seconds)
3. Attempt to login

EXPECTED:
- All cascade deletions execute immediately
- No grace period
- Cannot login after deletion
- All data deleted/anonymized/archived per cascade rules
```

#### 3.6 Error Handling Tests

##### Test 3.6.1: Active Subscription Block
```
STEPS:
1. User has active Pro subscription
2. Attempt to delete account

EXPECTED:
- Error message: "Please cancel your subscription first"
- Link to subscription management
- Deletion blocked until subscription cancelled
```

##### Test 3.6.2: Pending Payment Block
```
STEPS:
1. User has unpaid invoice
2. Attempt to delete account

EXPECTED:
- Error message: "Please settle outstanding balance first"
- Link to payment page
- Deletion blocked until payment cleared
```

### Expected Database State Flow

#### State 1: Normal Account (Before Deletion Request)
```javascript
// /users/{userId}
{
  email: "user@example.com",
  displayName: "John Doe",
  privacy: {
    pendingDeletion: false,
    deletionRequestId: null,
    deletionRequestedAt: null,
    deletionScheduledFor: null
  }
}

// /PrivacyRequests/ - no deletion request
```

#### State 2: Grace Period (After Request, Before 30 Days)
```javascript
// /users/{userId}
{
  email: "user@example.com",
  displayName: "John Doe",
  privacy: {
    pendingDeletion: true, // ← Changed
    deletionRequestId: "req_deletion_1736889600_abc", // ← Set
    deletionRequestedAt: {
      _seconds: 1736889600
    }, // ← Set
    deletionScheduledFor: {
      _seconds: 1739481600 // +30 days
    } // ← Set
  }
}

// /PrivacyRequests/{requestId}
{
  id: "req_deletion_1736889600_abc",
  userId: "abc123",
  type: "deletion",
  status: "pending", // → Will become "completed" or "cancelled"
  requestedAt: { _seconds: 1736889600 },
  scheduledDeletionDate: { _seconds: 1739481600 },
  gracePeriodDays: 30,
  confirmationText: "DELETE MY ACCOUNT",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  reason: "User requested deletion via privacy center",
  metadata: {
    immediate: false,
    activeSubscription: false,
    pendingPayments: false
  }
}
```

#### State 3: Deleted Account (After 30 Days)
```javascript
// /users/{userId} → DOCUMENT DELETED

// /Contacts/{userId}/* → ENTIRE SUBCOLLECTION DELETED

// /Groups/{userId}/* → ENTIRE SUBCOLLECTION DELETED

// /Analytics/{userId}/ → ANONYMIZED
// Data moved to /Analytics_Anonymous/aggregate/ without userId

// /ConsentHistory/{userId}/* → PRESERVED (legal requirement)

// /BillingArchive/{userId}/ → CREATED
{
  userId: "abc123_deleted",
  originalData: { /* billing info */ },
  archivedAt: { _seconds: 1739481600 },
  retentionExpiresAt: { _seconds: 2055121600 }, // +10 years
  legalBasis: "French Commercial Code - Art. L.123-22"
}

// /PrivacyRequests/{requestId}
{
  ...
  status: "completed", // ← Changed
  executedAt: { _seconds: 1739481600 },
  executionLog: {
    userProfileDeleted: true,
    contactsDeleted: 145,
    groupsDeleted: 12,
    analyticsAnonymized: true,
    consentsPreserved: 8,
    billingArchived: true,
    firebaseAuthDeleted: true
  }
}

// Firebase Auth → User deleted (cannot login)
```

### Database Changes Table

| Action | Collection | Changes | Cascade | Audit Log |
|--------|-----------|---------|---------|-----------|
| **Request Deletion** | `/users/{id}/privacy` | `pendingDeletion:true`, `deletionRequestId`, `deletionScheduledFor` | None | ✅ Logged |
| | `/PrivacyRequests/` | New deletion request created | None | ✅ Logged |
| **Cancel Deletion** | `/users/{id}/privacy` | `pendingDeletion:false`, fields cleared | None | ✅ Logged |
| | `/PrivacyRequests/{id}` | `status:"cancelled"`, `cancelledAt` | None | ✅ Logged |
| **Execute Deletion** (Day 30) | `/users/{id}` | DELETED | ⚠️ See below | ✅ Logged |
| | `/Contacts/{id}/*` | ALL DELETED | Notify other users | ✅ Logged |
| | `/Groups/{id}/*` | ALL DELETED | N/A | ✅ Logged |
| | `/Analytics/{id}/` | ANONYMIZED | Moved to aggregate | ✅ Logged |
| | `/ConsentHistory/` | PRESERVED | N/A | ✅ No log (legal) |
| | `/BillingArchive/` | CREATED | 10-year retention | ✅ Logged |
| | Firebase Auth | User deleted | N/A | ✅ Logged |

### Contact Anonymization Flow (In Other Users' Address Books)

When User A deletes their account, User A appears in User B's contacts:

#### Step 1: Notification (Day 0)
```javascript
// User B receives notification
{
  type: "contact_deletion_request",
  message: "Your contact [User A] has requested account deletion",
  contactId: "contact_abc",
  deletionDate: "2025-02-17",
  actions: {
    keep: "Keep contact information (business card justification)",
    delete: "Remove contact immediately"
  }
}
```

#### Step 2: No Response After 30 Days
```javascript
// User B's /Contacts/{userId}/{contactId}
// BEFORE:
{
  displayName: "User A",
  email: "usera@example.com",
  phone: "+33612345678",
  company: "Company A"
}

// AFTER (Auto-anonymized):
{
  displayName: "Contact supprimé - 2025-02-17",
  email: null,
  phone: null,
  company: "Company A", // Kept if business card justifies legitimate interest
  notes: "Contact deleted their account", // Added automatically
  status: "deleted_user",
  deletedAt: { _seconds: 1739481600 }
}
```

#### Step 3: If User B Chooses to Keep
```javascript
// User B's /Contacts/{userId}/{contactId}
{
  displayName: "User A",
  email: "usera@example.com", // Kept
  phone: "+33612345678", // Kept
  company: "Company A",
  notes: "Business contact - legitimate interest",
  legitimateInterest: {
    justification: "Business card received at conference",
    businessPurpose: true,
    declaredAt: { _seconds: 1736889600 }
  },
  deletedUserConsentOverride: true
}

// Audit log created for GDPR accountability
```

### RGPD Compliance Requirements

#### GDPR Art. 17: Right to Erasure

- ✅ **Must delete** when no longer necessary
- ✅ **Grace period**: 30 days (CNIL recommendation)
- ✅ **Exceptions allowed** (Art. 17.3):
  - (b) Legal obligation: Consent logs (7 years)
  - (e) Legal claims: Billing data (10 years)
  - Statistical purposes: Anonymous analytics

#### CNIL Guidelines (France-Specific)

- ✅ 30-day grace period recommended
- ✅ Clear warnings before deletion
- ✅ Case-sensitive confirmation text acceptable
- ✅ Must notify other users if their data affected

#### French Commercial Law

- ✅ Art. L.123-22: Accounting documents 10 years
- ✅ Billing data cannot be deleted (archive instead)

### Audit Logging Requirements

```javascript
// Collection: /AuditLogs/{logId}
{
  category: "Data Deletion",
  action: "deletion_requested|deletion_cancelled|deletion_executed",
  userId: "abc123",
  requestId: "req_deletion_...",
  timestamp: FirebaseTimestamp,
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  details: {
    confirmationText: "DELETE MY ACCOUNT",
    scheduledDate: "2025-02-17T10:00:00Z",
    gracePeriodDays: 30,
    immediate: false,

    // For executed deletions:
    deletionSummary: {
      userProfileDeleted: true,
      contactsDeleted: 145,
      groupsDeleted: 12,
      analyticsAnonymized: true,
      consentsPreserved: 8, // Legal requirement
      billingArchived: true, // Legal requirement
      firebaseAuthDeleted: true
    },

    // Legal justifications for preserved data:
    legalBasis: {
      consents: "GDPR Art. 17.3(b) - Legal obligation (7 years)",
      billing: "French Commercial Code Art. L.123-22 (10 years)"
    }
  },
  eventHash: "sha256_hash"
}
```

**Retention**: 5 years

---

## Tab 4: Consentements (Consents)

### Purpose
Implements GDPR Art. 6(1)(a) and Art. 7 - Consent management for all optional data processing activities. Provides granular control over 12 consent types across 5 categories.

### Consent Types Overview

| Category | Consent Type | Required | Legal Basis | Technologies |
|----------|-------------|----------|-------------|--------------|
| **Essential** | `terms_of_service` | ✅ Yes | GDPR Art. 6(1)(b) - Contract | N/A |
| | `privacy_policy` | ✅ Yes | GDPR Art. 6(1)(b) - Contract | N/A |
| **AI Features** | `ai_semantic_search` | ❌ No | GDPR Art. 6(1)(a) - Consent | Gemini 2.5, Pinecone, Cohere |
| | `ai_auto_grouping` | ❌ No | GDPR Art. 6(1)(a) - Consent | Google Places, Clustering |
| | `ai_business_card_enhancement` | ❌ No | GDPR Art. 6(1)(a) - Consent | Google Vision, Gemini 2.0 |
| **Analytics** | `analytics_basic` | ❌ No | GDPR Art. 6(1)(f) - Legitimate Interest | Custom analytics |
| | `analytics_detailed` | ❌ No | GDPR Art. 6(1)(a) - Consent | Custom analytics |
| | `cookies_analytics` | ❌ No | GDPR Art. 6(1)(a) - Consent | localStorage cookies |
| **Communication** | `marketing_emails` | ❌ No | GDPR Art. 6(1)(a) - Consent | Email provider |
| | `contact_recommendations` | ❌ No | GDPR Art. 6(1)(a) - Consent | ML algorithms |
| **Personalization** | `cookies_personalization` | ❌ No | GDPR Art. 6(1)(a) - Consent | localStorage cookies |
| | `profile_public` | ❌ No | GDPR Art. 6(1)(a) - Consent | Public profile |

### Test Scenarios

#### 4.1 Consent Display Tests

##### Test 4.1.1: Category Structure
```
VERIFY UI:
- 5 categories displayed with collapsible sections
- Essential (2 consents)
- AI Features (3 consents)
- Analytics (3 consents)
- Communication (2 consents)
- Personalization (2 consents)

VERIFY EACH CATEGORY HAS:
- Category name
- Category description
- Expand/collapse chevron icon
- Consent count indicator
```

##### Test 4.1.2: Consent Card Layout
```
VERIFY EACH CONSENT HAS:
- Icon (matches consent type)
- Consent name (translated)
- Description (clear, 1-2 sentences)
- GDPR article reference (e.g., "Art. 6(1)(a) - Consent")
- Technologies used (for AI consents)
- "Required" badge (for essential consents)
- Tier badge (e.g., "Premium+", "Business+")
- Toggle switch (disabled for required consents)
- Status badge ("Granted" or "Withdrawn")
- Last updated timestamp
```

##### Test 4.1.3: Initial Consent State
```
EXPECTED DEFAULT STATE (New User):
{
  // Essential - granted at signup
  terms_of_service: { status: true, grantedAt: "2025-01-01T10:00:00Z" },
  privacy_policy: { status: true, grantedAt: "2025-01-01T10:00:00Z" },

  // All optional - default to false
  ai_semantic_search: { status: false },
  ai_auto_grouping: { status: false },
  ai_business_card_enhancement: { status: false },
  analytics_basic: { status: false },
  analytics_detailed: { status: false },
  cookies_analytics: { status: false },
  marketing_emails: { status: false },
  contact_recommendations: { status: false },
  cookies_personalization: { status: false },
  profile_public: { status: false }
}
```

#### 4.2 Category A: Essential Consents

##### Test 4.2.1: Terms of Service
```
VERIFY:
- Always enabled (toggle disabled)
- "Required for service" label
- Cannot be withdrawn without deleting account
- Icon: CheckSquare
- GDPR Art. 6(1)(b) - Contract performance
```

##### Test 4.2.2: Privacy Policy
```
VERIFY:
- Always enabled (toggle disabled)
- "Required for service" label
- Cannot be withdrawn without deleting account
- Icon: Shield
- GDPR Art. 6(1)(b) - Contract performance
```

#### 4.3 Category B: AI Features Consents

##### Test 4.3.1: AI Semantic Search

**Initial State Test:**
```
VERIFY CONSENT OFF:
- Toggle: OFF (gray)
- Status: "Withdrawn"
- Search: Only basic keyword search available
- No contact embeddings in Pinecone
```

**Grant Consent Test:**
```
STEPS:
1. Toggle AI Semantic Search ON
2. Wait for processing (5-10 seconds)
3. Verify database changes

EXPECTED DATABASE CHANGES:
// /users/{userId}/consents
{
  ai_semantic_search: {
    status: true,
    grantedAt: { _seconds: 1736889600 },
    version: "1.0"
  }
}

// /ConsentHistory/{logId}
{
  userId: "abc123",
  consentType: "ai_semantic_search",
  action: "granted",
  timestamp: { _seconds: 1736889600 },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  version: "1.0"
}

// Pinecone Embeddings (side effect)
// All contacts sent to Pinecone for embedding generation
// Collection: External (Pinecone vector database)
namespace: "user_abc123",
vectors: [
  {id: "contact_1", values: [0.123, 0.456, ...], metadata: {...}},
  {id: "contact_2", values: [0.789, 0.012, ...], metadata: {...}},
  // ... all contacts
]
```

**Withdraw Consent Test:**
```
STEPS:
1. Toggle AI Semantic Search OFF
2. Confirm withdrawal
3. Verify database changes

EXPECTED DATABASE CHANGES:
// /users/{userId}/consents
{
  ai_semantic_search: {
    status: false,
    grantedAt: { _seconds: 1736889600 },
    withdrawnAt: { _seconds: 1736892000 }, // +40 minutes later
    version: "1.0"
  }
}

// Pinecone Embeddings (side effect)
// All embeddings deleted from Pinecone
namespace: "user_abc123" → DELETED

EXPECTED UI/FUNCTIONALITY:
- Semantic search disabled
- Only basic keyword search works
- No ML-powered search suggestions
```

##### Test 4.3.2: AI Auto-Grouping

**Grant Consent Test:**
```
EXPECTED SIDE EFFECTS:
- Contacts automatically grouped by:
  - Company
  - Location
  - Event/venue (using Google Places API)
  - Time-based patterns
- Groups created in /Groups/{userId}/ collection
```

**Withdraw Consent Test:**
```
EXPECTED SIDE EFFECTS:
- Auto-grouping disabled
- Existing auto-generated groups preserved (no deletion)
- Manual groups still work
- No new automatic groups created
```

##### Test 4.3.3: AI Business Card Enhancement

**Grant Consent Test:**
```
EXPECTED FUNCTIONALITY:
- Upload business card image
- Google Vision API extracts text (OCR)
- Gemini 2.0 Flash Lite structures data
- Contact auto-populated with extracted info

EXPECTED DATABASE:
// Contact created with metadata
{
  displayName: "John Doe",
  email: "john@example.com",
  phone: "+33612345678",
  company: "Acme Inc",
  metadata: {
    source: "ai_business_card",
    confidence: 0.95,
    extractedAt: "2025-01-18T10:00:00Z"
  }
}
```

**Withdraw Consent Test:**
```
EXPECTED FUNCTIONALITY:
- Business card upload still available
- No AI enhancement
- Manual entry required
- Existing AI-extracted contacts preserved
```

#### 4.4 Category C: Analytics Consents

##### Test 4.4.1: Analytics Basic

**Grant Consent Test:**
```
EXPECTED DATABASE:
// /Analytics/{userId}/
{
  totalViews: 0, // Will increment
  dailyViews: {
    "2025-01-18": 12,
    "2025-01-19": 8
  },
  linkClicks: {
    "link_1": 5,
    "link_2": 3
  },
  scanData: {
    qrScans: 10,
    nfcScans: 5
  }
}

EXPECTED UI:
- Dashboard shows personal analytics
- Charts and graphs populate
- View counts visible on profile
```

**Withdraw Consent Test:**
```
EXPECTED DATABASE:
// /Analytics/{userId}/ - NO NEW DATA TRACKED
// Existing data preserved (26-month retention for historical purposes)

EXPECTED UI:
- Dashboard shows: "Analytics disabled - grant consent to view"
- No new tracking
- Profile view counter frozen
```

**CRITICAL TEST 4.4.2: Anonymous Analytics Continue**
```
VERIFY (After Withdrawal):
// /Analytics_Anonymous/daily/2025-01-18
{
  totalViews: 12345, // Still increments (no userId)
  platformViews: {
    desktop: 8000,
    mobile: 4345
  },
  // NO userId field - anonymous only
}

LEGAL BASIS:
- GDPR Art. 6(1)(f) - Legitimate interest
- CNIL: Anonymous analytics exempt from consent if:
  1. No personal data collected
  2. No cross-site tracking
  3. Cannot re-identify users
  ✅ All conditions met
```

##### Test 4.4.3: Analytics Detailed

**Grant Consent Test:**
```
ADDITIONAL DATA TRACKED:
// /Analytics/{userId}/detailed
{
  referrers: [
    {url: "https://google.com", count: 5},
    {url: "https://linkedin.com", count: 3}
  ],
  trafficSources: {
    organic: 10,
    social: 8,
    direct: 5
  },
  utmParameters: [
    {campaign: "summer_2025", source: "email", medium: "newsletter"}
  ],
  deviceTypes: {
    iPhone: 5,
    Android: 3,
    Desktop: 2
  }
}
```

##### Test 4.4.4: Cookies Analytics

**Grant Consent Test:**
```
VERIFY localStorage:
// localStorage.setItem()
{
  "analytics_consent": "true",
  "analytics_id": "anon_abc123",
  "last_visit": "2025-01-18T10:00:00Z",
  "session_id": "session_xyz789"
}
```

**Withdraw Consent Test:**
```
VERIFY localStorage:
// All analytics cookies cleared
localStorage.getItem("analytics_consent") === null
localStorage.getItem("analytics_id") === null
// etc.
```

#### 4.5 Category D: Communication Consents

##### Test 4.5.1: Marketing Emails

**Grant Consent Test:**
```
EXPECTED DATABASE:
// /users/{userId}/marketing
{
  emailsEnabled: true,
  subscribedAt: { _seconds: 1736889600 },
  preferences: {
    productUpdates: true,
    newsletter: true,
    promotions: true
  }
}

EXPECTED EXTERNAL (Email Provider):
// Email added to marketing list
{
  email: "user@example.com",
  status: "subscribed",
  tags: ["product_updates", "newsletter"]
}

EXPECTED EMAILS RECEIVED:
- Weekly newsletter
- Product announcements
- Feature updates
- Promotional offers
```

**Withdraw Consent Test:**
```
EXPECTED DATABASE:
// /users/{userId}/marketing
{
  emailsEnabled: false,
  subscribedAt: { _seconds: 1736889600 },
  unsubscribedAt: { _seconds: 1736892000 }
}

EXPECTED EXTERNAL:
// Email removed from marketing list
{
  email: "user@example.com",
  status: "unsubscribed"
}

EXPECTED EMAILS:
- ✅ Transactional emails still sent (account security, billing)
- ❌ No marketing emails
- ✅ GDPR Art. 21 - Right to object respected
```

**Test 4.5.2: One-Click Unsubscribe (RGPD Requirement)**
```
VERIFY EVERY MARKETING EMAIL HAS:
- Unsubscribe link at bottom
- One-click unsubscribe (no login required)
- Confirmation: "You have been unsubscribed"
- GDPR Art. 7.3 compliance (withdrawal as easy as granting)
```

##### Test 4.5.3: Contact Recommendations

**Grant Consent Test:**
```
EXPECTED FUNCTIONALITY:
- "People you may know" suggestions on dashboard
- Based on:
  - Mutual contacts
  - Company affiliations
  - Event attendance
  - Location proximity

EXPECTED DATABASE:
// /Recommendations/{userId}/
{
  suggestions: [
    {
      userId: "user_xyz",
      displayName: "Jane Smith",
      reason: "3 mutual contacts",
      score: 0.85
    }
  ],
  generatedAt: { _seconds: 1736889600 }
}
```

**Withdraw Consent Test:**
```
EXPECTED UI:
- No recommendations displayed
- Suggestion widget hidden
- Existing suggestions deleted
```

#### 4.6 Category E: Personalization Consents

##### Test 4.6.1: Profile Public

**Grant Consent Test:**
```
EXPECTED DATABASE:
// /users/{userId}/settings
{
  isPublic: true
}

EXPECTED FUNCTIONALITY:
- Profile accessible at: https://weavink.io/{username}
- Public profile shows:
  - Name
  - Title
  - Company
  - Bio
  - Links
  - Contact form (if allowMessages enabled)
- SEO meta tags:
  <meta name="robots" content="index, follow">
  - Google can index profile
```

**Withdraw Consent Test:**
```
EXPECTED DATABASE:
// /users/{userId}/settings
{
  isPublic: false
}

EXPECTED FUNCTIONALITY:
- Profile URL returns 404
- SEO meta tags:
  <meta name="robots" content="noindex, nofollow">
- Cannot be found in search engines
- Direct links don't work
```

##### Test 4.6.2: Cookies Personalization

**Grant Consent Test:**
```
VERIFY localStorage:
{
  "theme": "dark", // User's theme preference
  "language": "fr",
  "layout": "centered",
  "qr_style": "rounded"
}

EXPECTED FUNCTIONALITY:
- Theme persists across sessions
- Language persists
- Layout customizations saved
```

**Withdraw Consent Test:**
```
VERIFY localStorage:
// All personalization cookies cleared
localStorage.getItem("theme") === null

EXPECTED FUNCTIONALITY:
- Default theme only (light theme)
- Default language (browser language)
- No customizations saved
- Each visit starts with defaults
```

#### 4.7 Consent History Tests

##### Test 4.7.1: View History Button
```
STEPS:
1. Click "View History" button on any consent
2. Verify modal opens

EXPECTED MODAL CONTENT:
- Consent name at top
- Chronological list of changes:
  - Date/time
  - Action (Granted/Withdrawn)
  - IP address
  - User agent (browser)
  - Version of consent text
```

##### Test 4.7.2: History Data Accuracy
```
VERIFY DATABASE:
// /ConsentHistory/ (query by userId + consentType)
[
  {
    logId: "log_1",
    userId: "abc123",
    consentType: "marketing_emails",
    action: "granted",
    timestamp: { _seconds: 1736889600 },
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0...",
    version: "1.0"
  },
  {
    logId: "log_2",
    userId: "abc123",
    consentType: "marketing_emails",
    action: "withdrawn",
    timestamp: { _seconds: 1736892000 },
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0...",
    version: "1.0"
  }
]

RETENTION: 7 years (GDPR accountability requirement)
```

##### Test 4.7.3: Export History
```
STEPS:
1. In history modal, click "Export as JSON"
2. Verify download

EXPECTED FILE (consent_history_marketing_emails.json):
{
  "consentType": "marketing_emails",
  "userId": "abc123",
  "history": [
    {
      "action": "granted",
      "timestamp": "2025-01-18T10:00:00Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    },
    {
      "action": "withdrawn",
      "timestamp": "2025-01-18T10:40:00Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "exportedAt": "2025-01-18T11:00:00Z"
}
```

#### 4.8 Batch Operations Tests

##### Test 4.8.1: Accept All
```
STEPS:
1. Click "Accept All" button at top of page
2. Confirm action
3. Verify all optional consents granted

EXPECTED DATABASE CHANGES:
// All optional consents set to true
// 10 consent logs created (one per optional consent)
// Essential consents unchanged (already true)

AUDIT LOGS:
// Single batch event + individual consent events
{
  category: "Consent",
  action: "batch_grant_all",
  userId: "abc123",
  timestamp: { _seconds: 1736889600 },
  details: {
    consentsGranted: [
      "ai_semantic_search",
      "ai_auto_grouping",
      // ... all 10 optional consents
    ]
  }
}
```

##### Test 4.8.2: Reject All
```
STEPS:
1. Click "Reject All" button
2. Confirm action
3. Verify all optional consents withdrawn

EXPECTED DATABASE CHANGES:
// All optional consents set to false
// Essential consents remain true (cannot reject)

VERIFY CNIL COMPLIANCE:
- ✅ No "Are you sure?" dialog (CNIL guideline)
- ✅ Withdrawal as easy as granting (GDPR Art. 7.3)
- ✅ No dark patterns
```

##### Test 4.8.3: Category-Level Toggle
```
STEPS:
1. Click category header (e.g., "AI Features")
2. Observe category toggle switch
3. Toggle ON → All 3 AI consents granted
4. Toggle OFF → All 3 AI consents withdrawn

EXPECTED DATABASE:
// 3 separate consent changes
// 3 separate audit logs
```

#### 4.9 Consent Withdrawal UX Tests (CNIL Guidelines)

##### Test 4.9.1: Withdrawal as Easy as Granting
```
VERIFY (GDPR Art. 7.3):
- ✅ Same UI element (toggle switch)
- ✅ Same number of clicks (1 click)
- ✅ No additional steps
- ✅ No "Are you sure?" dialog
- ✅ No delay or cooldown period
```

##### Test 4.9.2: No Dark Patterns
```
VERIFY:
- ❌ No hidden reject buttons
- ❌ No confusing language
- ❌ No pre-selected consents
- ❌ No bundling of consents
- ✅ Clear explanations
- ✅ Equal prominence for grant/withdraw
```

##### Test 4.9.3: Immediate Effect
```
VERIFY:
- Consent change takes effect within 1 hour
- Data processing stops immediately
- Features disabled/enabled instantly
- No grace period for withdrawal
```

### Expected Database State

#### Initial State (New User)
```javascript
// /users/{userId}/consents
{
  // Essential (granted at signup)
  terms_of_service: {
    status: true,
    grantedAt: { _seconds: 1736889600 },
    version: "1.0",
    required: true
  },
  privacy_policy: {
    status: true,
    grantedAt: { _seconds: 1736889600 },
    version: "1.0",
    required: true
  },

  // All optional default to false
  ai_semantic_search: { status: false },
  ai_auto_grouping: { status: false },
  ai_business_card_enhancement: { status: false },
  analytics_basic: { status: false },
  analytics_detailed: { status: false },
  cookies_analytics: { status: false },
  marketing_emails: { status: false },
  contact_recommendations: { status: false },
  cookies_personalization: { status: false },
  profile_public: { status: false }
}
```

#### After Granting AI Semantic Search
```javascript
// /users/{userId}/consents
{
  ...
  ai_semantic_search: {
    status: true,
    grantedAt: { _seconds: 1736892000 },
    version: "1.0"
  }
}

// /ConsentHistory/{logId}
{
  logId: "log_abc123",
  userId: "abc123",
  consentType: "ai_semantic_search",
  action: "granted",
  timestamp: { _seconds: 1736892000 },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  version: "1.0",
  metadata: {
    source: "privacy_center_ui",
    category: "ai_features"
  }
}

// Pinecone (External - Side Effect)
// Namespace: user_abc123
// Vectors created for all contacts
```

#### After Withdrawing AI Semantic Search
```javascript
// /users/{userId}/consents
{
  ...
  ai_semantic_search: {
    status: false,
    grantedAt: { _seconds: 1736892000 },
    withdrawnAt: { _seconds: 1736895600 }, // +1 hour later
    version: "1.0"
  }
}

// /ConsentHistory/{logId} - NEW ENTRY
{
  logId: "log_def456",
  userId: "abc123",
  consentType: "ai_semantic_search",
  action: "withdrawn",
  timestamp: { _seconds: 1736895600 },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  version: "1.0"
}

// Pinecone (External - Side Effect)
// Namespace: user_abc123 → DELETED
```

### Database Changes Table

| Action | Collection | Field Changes | Side Effects | Audit Log |
|--------|-----------|---------------|--------------|-----------|
| **Grant Consent** | `/users/{id}/consents` | `{type}.status:true`, `grantedAt:timestamp`, `version:"1.0"` | Feature enabled | ✅ Logged in `/ConsentHistory/` |
| **Withdraw Consent** | `/users/{id}/consents` | `{type}.status:false`, `withdrawnAt:timestamp` | Feature disabled | ✅ Logged |
| **Batch Grant** | `/users/{id}/consents` | Multiple consents updated | Multiple features enabled | ✅ Logged (batch event + individual logs) |
| **Batch Withdraw** | `/users/{id}/consents` | Multiple consents updated | Multiple features disabled | ✅ Logged (batch event + individual logs) |
| **AI Semantic Search** grant | Pinecone `/Embeddings/` | Contact embeddings created | Semantic search enabled | ✅ Logged |
| **AI Semantic Search** withdraw | Pinecone `/Embeddings/` | Namespace deleted | Semantic search disabled | ✅ Logged |
| **Analytics** grant | `/Analytics/{id}/` | Tracking starts | Dashboard populated | ✅ Logged |
| **Analytics** withdraw | `/Analytics/{id}/` | NO NEW DATA (existing data retained 26 months) | Dashboard shows "No consent" | ✅ Logged |
| **Marketing Emails** grant | Email Provider API | Email added to list | Marketing emails sent | ✅ Logged |
| **Marketing Emails** withdraw | Email Provider API | Email removed from list | No marketing emails | ✅ Logged |
| **Profile Public** grant | `/users/{id}/settings` | `isPublic:true` | Profile visible, SEO indexed | ✅ Logged |
| **Profile Public** withdraw | `/users/{id}/settings` | `isPublic:false` | Profile hidden, SEO noindex | ✅ Logged |

### RGPD Compliance Requirements

#### GDPR Art. 6(1)(a): Consent as Legal Basis
- ✅ **Freely given**: No bundling, each consent separate
- ✅ **Specific**: Each consent has specific purpose
- ✅ **Informed**: Clear explanations, GDPR article cited
- ✅ **Unambiguous**: Explicit opt-in (no pre-checked boxes)

#### GDPR Art. 7: Conditions for Consent
- ✅ **Art. 7.1**: Must be able to demonstrate consent was obtained (consent logs)
- ✅ **Art. 7.2**: Clear and distinguishable from other matters
- ✅ **Art. 7.3**: Withdrawal as easy as granting (same toggle, no extra steps)
- ✅ **Art. 7.4**: Conditional processing allowed only when necessary for service

#### ePrivacy Directive (Cookies)
- ✅ No pre-checked boxes
- ✅ Clear cookie explanations
- ✅ Separate consent for analytics cookies vs personalization cookies

#### CNIL Guidelines (France)
- ✅ No "Are you sure?" dialogs for withdrawal
- ✅ French translations of all consent text
- ✅ Clear explanations in simple language
- ✅ Withdrawal as easy as granting

#### Retention
- ✅ Consent logs: 7 years (GDPR accountability)
- ✅ Analytics data: 26 months maximum (CNIL recommendation)

### Audit Logging Requirements

Every consent change creates two log entries:

**1. ConsentHistory Collection (GDPR Accountability)**
```javascript
// /ConsentHistory/{logId}
{
  logId: "log_abc123",
  userId: "abc123",
  consentType: "ai_semantic_search",
  action: "granted|withdrawn",
  timestamp: { _seconds: 1736892000 },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  version: "1.0", // Consent text version
  metadata: {
    source: "privacy_center_ui|cookie_banner|api",
    category: "ai_features|analytics|communication|personalization"
  }
}
```
**Retention**: 7 years

**2. AuditLogs Collection (Tamper-Evident)**
```javascript
// /AuditLogs/{logId}
{
  category: "Consent",
  action: "consent_granted|consent_withdrawn",
  userId: "abc123",
  timestamp: { _seconds: 1736892000 },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  details: {
    consentType: "ai_semantic_search",
    action: "granted",
    version: "1.0",
    previousStatus: false,
    newStatus: true
  },
  eventHash: "sha256_hash_for_tamper_detection"
}
```
**Retention**: 5 years

---

## Tab 5: Paramètres de Confidentialité (Privacy Settings)

### Purpose
Provides user control over privacy-related account settings: profile visibility, messaging preferences, and notification settings.

### Test Scenarios

#### 5.1 Profile Visibility Tests

##### Test 5.1.1: Make Profile Public
```
STEPS:
1. Toggle "Make my profile public" ON
2. Wait for save confirmation
3. Visit profile URL in incognito window

EXPECTED DATABASE:
// /users/{userId}/settings
{
  isPublic: true
}

EXPECTED FUNCTIONALITY:
- Profile accessible at: https://weavink.io/{username}
- SEO meta tags allow indexing:
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="...">
- Google can find profile in search
- Public profile shows:
  - Name
  - Title
  - Company
  - Bio
  - Links
  - QR code
  - vCard download (if enabled)
```

##### Test 5.1.2: Make Profile Private
```
STEPS:
1. Toggle "Make my profile public" OFF
2. Wait for save confirmation
3. Visit profile URL in incognito window

EXPECTED DATABASE:
// /users/{userId}/settings
{
  isPublic: false
}

EXPECTED FUNCTIONALITY:
- Profile URL returns 404
- SEO meta tags prevent indexing:
  <meta name="robots" content="noindex, nofollow">
- Cannot be found in Google search
- Direct links don't work
- Only user can see their own profile when logged in
```

##### Test 5.1.3: Instant Effect
```
VERIFY:
1. Toggle public ON → Immediately accessible
2. Toggle public OFF → Immediately 404
3. No caching delay
4. CDN/cache invalidation works
```

#### 5.2 Messaging Settings Tests

##### Test 5.2.1: Enable Messages
```
STEPS:
1. Toggle "Allow messages from other users" ON
2. Visit public profile (if public)

EXPECTED DATABASE:
// /users/{userId}/settings
{
  allowMessages: true
}

EXPECTED UI (On Public Profile):
- Contact form appears
- Form fields:
  - Name (required)
  - Email (required)
  - Message (required, max 500 chars)
  - Submit button
- CAPTCHA/anti-spam protection
```

##### Test 5.2.2: Disable Messages
```
STEPS:
1. Toggle "Allow messages from other users" OFF
2. Visit public profile (if public)

EXPECTED UI (On Public Profile):
- Contact form hidden
- Message: "This user is not accepting messages"
- No way to contact user through website
```

##### Test 5.2.3: Message Delivery Test
```
STEPS (When messages enabled):
1. Someone fills out contact form
2. Submits message
3. Check user's email

EXPECTED:
- Email delivered to user's inbox
- Subject: "New message from [Sender Name]"
- Body includes:
  - Sender name
  - Sender email (for reply)
  - Message content
  - Timestamp
  - Anti-spam notice
- User can reply directly to sender
```

#### 5.3 Notification Preferences Tests

##### Test 5.3.1: Email Notifications
```
STEPS:
1. Toggle "Email notifications" ON
2. Perform actions that trigger emails

EXPECTED EMAILS RECEIVED:
- ✅ Security alerts (login from new device)
- ✅ Account changes (password changed)
- ✅ Billing notifications (subscription renewal)
- ✅ Contact form messages
- ✅ Sharing notifications (someone added you)
```

**Disable Email Notifications:**
```
STEPS:
1. Toggle "Email notifications" OFF
2. Perform actions that trigger emails

EXPECTED EMAILS RECEIVED:
- ✅ Security alerts (cannot be disabled - critical)
- ✅ Billing notifications (cannot be disabled - legal)
- ❌ Contact form messages (disabled)
- ❌ Sharing notifications (disabled)
- ❌ Product updates (disabled)
```

##### Test 5.3.2: Push Notifications
```
STEPS:
1. Toggle "Push notifications" ON
2. Grant browser permission when prompted

EXPECTED BROWSER BEHAVIOR:
- Browser requests notification permission
- If granted:
  - Service worker registered
  - Push subscription created
  - Test notification sent: "Push notifications enabled!"

EXPECTED DATABASE:
// /users/{userId}/settings
{
  notifications: {
    push: true,
    pushSubscription: {
      endpoint: "https://fcm.googleapis.com/...",
      keys: {
        p256dh: "...",
        auth: "..."
      }
    }
  }
}
```

**Disable Push Notifications:**
```
STEPS:
1. Toggle "Push notifications" OFF

EXPECTED:
- Push subscription removed from database
- No more browser notifications
- Service worker unregistered
```

#### 5.4 Batch Update Tests

##### Test 5.4.1: Save All Settings
```
STEPS:
1. Change multiple settings:
   - Profile: Public → Private
   - Messages: ON → OFF
   - Email notifications: ON → OFF
   - Push notifications: ON → OFF
2. Click "Save All Settings" button
3. Wait for confirmation

EXPECTED DATABASE (Single Update):
// /users/{userId}/settings
{
  isPublic: false,
  allowMessages: false,
  notifications: {
    email: false,
    push: false
  },
  updatedAt: { _seconds: 1736892000 }
}

EXPECTED UI:
- Success message: "Settings saved successfully"
- All changes take effect immediately
```

##### Test 5.4.2: Validation Errors
```
TEST INVALID SCENARIOS:
1. No changes made → "No changes to save"
2. Network error → "Failed to save settings. Please try again."
3. Session expired → "Please log in again"

EXPECTED:
- Error message displayed
- Settings not saved
- Original values restored
- User can retry
```

##### Test 5.4.3: Settings Persistence
```
STEPS:
1. Save settings
2. Logout
3. Login again
4. Navigate to Privacy Settings tab

EXPECTED:
- All settings load correctly
- Toggle states match database
- No defaults applied
- Settings persist across sessions
```

### Expected Database State

#### Initial State (Default Settings)
```javascript
// /users/{userId}/settings
{
  isPublic: false, // Default: private profile
  allowMessages: false, // Default: no messages
  notifications: {
    email: true, // Default: email on
    push: false // Default: push off
  },
  createdAt: { _seconds: 1736889600 },
  updatedAt: { _seconds: 1736889600 }
}
```

#### After Making Profile Public
```javascript
// /users/{userId}/settings
{
  isPublic: true, // ← Changed
  allowMessages: false,
  notifications: {
    email: true,
    push: false
  },
  updatedAt: { _seconds: 1736892000 } // ← Updated
}
```

#### After Enabling All Features
```javascript
// /users/{userId}/settings
{
  isPublic: true,
  allowMessages: true,
  notifications: {
    email: true,
    push: true,
    pushSubscription: {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      keys: {
        p256dh: "base64_encoded_key",
        auth: "base64_encoded_auth"
      }
    }
  },
  updatedAt: { _seconds: 1736895600 }
}
```

### Database Changes Table

| Action | Collection | Field Changes | Side Effects | Audit Log |
|--------|-----------|---------------|--------------|-----------|
| **Toggle Profile Public** | `/users/{id}/settings` | `isPublic: true/false`, `updatedAt` | Profile visibility, SEO indexing, URL access | ✅ Logged |
| **Toggle Messages** | `/users/{id}/settings` | `allowMessages: true/false`, `updatedAt` | Contact form visibility on profile | ✅ Logged |
| **Toggle Email Notifications** | `/users/{id}/settings` | `notifications.email: true/false`, `updatedAt` | Email sending (except critical) | ✅ Logged |
| **Toggle Push Notifications** | `/users/{id}/settings` | `notifications.push: true/false`, `notifications.pushSubscription`, `updatedAt` | Browser notifications, service worker | ✅ Logged |
| **Batch Update** | `/users/{id}/settings` | Multiple fields updated | Multiple effects | ✅ Logged (single event) |

### RGPD Compliance Requirements

#### GDPR Art. 5(1)(a): Lawfulness, Fairness, Transparency
- ✅ User has full control over privacy settings
- ✅ Clear explanations of what each setting does
- ✅ Immediate effect (no delays or tricks)

#### Privacy by Default (GDPR Art. 25)
- ✅ **Profile**: Default to private (most protective)
- ✅ **Messages**: Default to disabled (most protective)
- ✅ **Email**: Default to enabled (necessary for account management)
- ✅ **Push**: Default to disabled (most protective)

#### Transparency
- ✅ Each setting has clear description
- ✅ Impact of changes explained
- ✅ Examples provided (e.g., "Your profile will be visible at https://weavink.io/{username}")

### Audit Logging Requirements

```javascript
// /AuditLogs/{logId}
{
  category: "Privacy Settings",
  action: "settings_updated",
  userId: "abc123",
  timestamp: { _seconds: 1736892000 },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  details: {
    changes: [
      {
        setting: "isPublic",
        oldValue: false,
        newValue: true
      },
      {
        setting: "allowMessages",
        oldValue: false,
        newValue: true
      }
    ]
  },
  eventHash: "sha256_hash"
}
```

**Retention**: 5 years

---

## Tab 6: Téléchargement de Contact (Contact Download)

### Purpose
Provides quick access to download all contacts in various formats without going through the full data export process.

### Test Scenarios

#### 6.1 Contact Download Tests

##### Test 6.1.1: Download Button Visibility
```
VERIFY:
- "Download My Contacts" button visible
- Icon: Download icon
- Button enabled
- Format selector dropdown (vCard, CSV, JSON)
```

##### Test 6.1.2: vCard Download
```
STEPS:
1. Select "vCard" format
2. Click "Download My Contacts"
3. File downloads

EXPECTED FILE:
- Filename: contacts-2025-01-18.vcf
- Format: vCard 3.0 (RFC 2426)
- Content: All contacts in vCard format

SAMPLE CONTENT:
BEGIN:VCARD
VERSION:3.0
FN:John Doe
EMAIL:john@example.com
TEL:+33612345678
ORG:Acme Inc
TITLE:CEO
ADR:;;123 Main St;Paris;;75001;France
NOTE:Met at conference 2024
END:VCARD

BEGIN:VCARD
VERSION:3.0
FN:Jane Smith
...
END:VCARD
```

##### Test 6.1.3: CSV Download
```
EXPECTED FILE:
- Filename: contacts-2025-01-18.csv
- Format: UTF-8 encoded CSV
- Headers: Name,Email,Phone,Company,Title,Address,Notes,Created

SAMPLE CONTENT:
Name,Email,Phone,Company,Title,Address,Notes,Created
John Doe,john@example.com,+33612345678,Acme Inc,CEO,"123 Main St, Paris 75001",Met at conference 2024,2025-01-01T10:00:00Z
Jane Smith,jane@example.com,+33698765432,Beta Corp,CTO,"456 Oak Ave, Lyon 69001",Friend from university,2025-01-05T14:30:00Z
```

##### Test 6.1.4: JSON Download
```
EXPECTED FILE:
- Filename: contacts-2025-01-18.json
- Format: Valid JSON array
- Full contact objects with all fields

SAMPLE CONTENT:
[
  {
    "id": "contact_abc123",
    "displayName": "John Doe",
    "email": "john@example.com",
    "phone": "+33612345678",
    "company": "Acme Inc",
    "title": "CEO",
    "address": {
      "street": "123 Main St",
      "city": "Paris",
      "postalCode": "75001",
      "country": "France"
    },
    "notes": "Met at conference 2024",
    "createdAt": "2025-01-01T10:00:00Z",
    "updatedAt": "2025-01-15T09:00:00Z"
  },
  ...
]
```

#### 6.2 Import Compatibility Tests

##### Test 6.2.1: Import to Google Contacts
```
STEPS:
1. Download contacts as vCard
2. Go to contacts.google.com
3. Import → Upload vCard file
4. Verify import

EXPECTED:
- ✅ All contacts imported successfully
- ✅ Names correct
- ✅ Emails correct
- ✅ Phone numbers formatted correctly
- ✅ Company/title imported
- ✅ Addresses imported
- ✅ Notes imported
```

##### Test 6.2.2: Import to Apple Contacts
```
STEPS:
1. Download contacts as vCard
2. Open Contacts app (macOS/iOS)
3. Import vCard file
4. Verify import

EXPECTED:
- ✅ All contacts imported
- ✅ All fields populated correctly
- ✅ No encoding issues
```

##### Test 6.2.3: Import to Microsoft Outlook
```
STEPS:
1. Download contacts as CSV
2. Open Outlook
3. Import CSV file
4. Map fields correctly

EXPECTED:
- ✅ All contacts imported
- ✅ Field mapping works
- ✅ UTF-8 encoding preserved
```

#### 6.3 Contact Ownership Tests

##### Test 6.3.1: Only User's Contacts Downloaded
```
VERIFY DATABASE QUERY:
// Firestore query executed server-side
db.collection('Contacts')
  .where('ownerId', '==', userId) // ← Security: only user's contacts
  .get()

EXPECTED:
- ✅ Only contacts owned by authenticated user
- ❌ No other users' contacts
- ✅ Security enforced server-side
```

##### Test 6.3.2: Empty Contact List Handling
```
SCENARIO: User has 0 contacts

EXPECTED FILE (vCard):
// Empty vCard file with header comment
# Weavink Contact Export
# Exported: 2025-01-18T10:00:00Z
# Total Contacts: 0
# No contacts to export

EXPECTED FILE (CSV):
Name,Email,Phone,Company,Title,Address,Notes,Created
# No data rows

EXPECTED FILE (JSON):
[]
```

### Expected Database State

**No database changes** (read-only operation)

**Database Query:**
```javascript
// Collection: /Contacts/{userId}/*
// Read all documents in user's Contacts subcollection
// Transform to vCard/CSV/JSON format
// Return as downloadable file
```

### RGPD Compliance Requirements

#### GDPR Art. 20: Right to Data Portability
- ✅ Machine-readable formats (vCard, CSV, JSON)
- ✅ Interoperable with other platforms (Google, Apple, Microsoft)
- ✅ Free of charge (no payment required)
- ✅ Immediate download (no waiting period)

#### Data Minimization
- ✅ Only contacts belonging to user downloaded
- ✅ No temporary storage (generated on-demand)
- ✅ No retention of download files server-side

### Audit Logging Requirements

```javascript
// /AuditLogs/{logId}
{
  category: "Contact Export",
  action: "contacts_downloaded",
  userId: "abc123",
  timestamp: { _seconds: 1736892000 },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  details: {
    format: "vCard|CSV|JSON",
    contactCount: 145,
    fileSize: 45678, // bytes
    fileName: "contacts-2025-01-18.vcf"
  },
  eventHash: "sha256_hash"
}
```

**Retention**: 5 years

---

## Tab 7: Configuration du Site Web (Website Configuration)

### Purpose
Allows users to configure their public profile/website settings, including URL, theme, SEO, and QR code customization.

### Test Scenarios

#### 7.1 Profile URL Configuration

##### Test 7.1.1: Username Display
```
VERIFY:
- Current username displayed
- Profile URL preview: https://weavink.io/{username}
- "Change Username" button (if available)
```

##### Test 7.1.2: Custom Domain (Business+ Feature)
```
STEPS (Business+ users only):
1. Enter custom domain (e.g., contact.company.com)
2. Verify DNS instructions displayed
3. Save configuration

EXPECTED DATABASE:
// /users/{userId}/websiteConfig
{
  customDomain: "contact.company.com",
  domainVerified: false, // → true after DNS verification
  domainVerificationToken: "weavink_verify_abc123"
}

EXPECTED DNS INSTRUCTIONS:
- Add CNAME record: contact → weavink.io
- Add TXT record: weavink-verification=abc123
- Wait for propagation (up to 48 hours)
```

#### 7.2 Theme Configuration

##### Test 7.2.1: Theme Selection
```
VERIFY THEMES AVAILABLE:
- Default (light)
- Dark
- Minimal
- Professional
- Creative
- Custom (color picker)

STEPS:
1. Select theme
2. Preview shows changes
3. Save theme

EXPECTED DATABASE:
// /users/{userId}/websiteConfig
{
  theme: "dark",
  customColors: null // or color values for custom theme
}
```

##### Test 7.2.2: Custom Theme Colors
```
STEPS:
1. Select "Custom" theme
2. Choose colors:
   - Primary color (brand color)
   - Background color
   - Text color
   - Accent color
3. Preview changes
4. Save

EXPECTED DATABASE:
{
  theme: "custom",
  customColors: {
    primary: "#1E40AF",
    background: "#FFFFFF",
    text: "#1F2937",
    accent: "#3B82F6"
  }
}
```

#### 7.3 Layout Configuration

##### Test 7.3.1: Layout Options
```
VERIFY LAYOUTS:
- Centered (default)
- Left-aligned
- Right-aligned
- Grid (for multiple links)
- List (simple list)

EXPECTED DATABASE:
{
  layout: "centered|left|right|grid|list"
}
```

#### 7.4 QR Code Customization

##### Test 7.4.1: QR Code Style
```
VERIFY QR CODE OPTIONS:
- Default (black/white)
- Rounded corners
- Dots instead of squares
- Custom colors
- Logo in center (premium feature)

EXPECTED DATABASE:
{
  qrCodeStyle: {
    type: "rounded",
    foregroundColor: "#000000",
    backgroundColor: "#FFFFFF",
    logo: "https://storage.url/logo.png" // if uploaded
  }
}
```

##### Test 7.4.2: QR Code Preview
```
VERIFY:
- Live preview updates as options change
- Download button available
- QR code scans correctly (test with phone)
- QR code links to correct profile URL
```

#### 7.5 SEO Configuration

##### Test 7.5.1: Meta Title
```
STEPS:
1. Edit meta title (max 60 chars)
2. Preview shows how it appears in Google
3. Save

EXPECTED DATABASE:
{
  seo: {
    title: "John Doe - Digital Business Card"
  }
}

EXPECTED HTML (on public profile):
<title>John Doe - Digital Business Card</title>
<meta property="og:title" content="John Doe - Digital Business Card">
```

##### Test 7.5.2: Meta Description
```
STEPS:
1. Edit meta description (max 160 chars)
2. Preview shows Google snippet
3. Save

EXPECTED DATABASE:
{
  seo: {
    description: "Connect with me professionally. View my digital business card and contact information."
  }
}

EXPECTED HTML:
<meta name="description" content="Connect with me professionally...">
<meta property="og:description" content="Connect with me professionally...">
```

##### Test 7.5.3: Social Media Preview Image
```
STEPS:
1. Upload social media preview image (1200x630px recommended)
2. Preview shows how it appears when shared
3. Save

EXPECTED DATABASE:
{
  seo: {
    image: "https://storage.weavink.io/user_abc123/social-preview.jpg"
  }
}

EXPECTED HTML:
<meta property="og:image" content="https://storage.weavink.io/user_abc123/social-preview.jpg">
<meta name="twitter:image" content="https://storage.weavink.io/user_abc123/social-preview.jpg">
```

#### 7.6 NFC Card Configuration

##### Test 7.6.1: Link NFC Card
```
STEPS (If user has NFC card):
1. Enter NFC card serial number
2. Tap card to verify
3. Link card to profile

EXPECTED DATABASE:
{
  nfcCard: {
    serialNumber: "NFC_ABC123",
    linkedAt: { _seconds: 1736892000 },
    verified: true
  }
}

EXPECTED FUNCTIONALITY:
- Tapping NFC card redirects to profile URL
- Can unlink/relink to different profile
```

### Expected Database State

#### Initial State (Default Configuration)
```javascript
// /users/{userId}/websiteConfig
{
  customDomain: null,
  theme: "default",
  customColors: null,
  layout: "centered",
  qrCodeStyle: {
    type: "default",
    foregroundColor: "#000000",
    backgroundColor: "#FFFFFF",
    logo: null
  },
  seo: {
    title: "{displayName} - Digital Business Card",
    description: "Connect with me professionally.",
    image: null // Uses default Weavink image
  },
  nfcCard: null,
  createdAt: { _seconds: 1736889600 },
  updatedAt: { _seconds: 1736889600 }
}
```

#### After Full Customization
```javascript
// /users/{userId}/websiteConfig
{
  customDomain: "contact.company.com",
  domainVerified: true,
  theme: "custom",
  customColors: {
    primary: "#1E40AF",
    background: "#FFFFFF",
    text: "#1F2937",
    accent: "#3B82F6"
  },
  layout: "grid",
  qrCodeStyle: {
    type: "rounded",
    foregroundColor: "#1E40AF",
    backgroundColor: "#FFFFFF",
    logo: "https://storage.weavink.io/user_abc123/qr-logo.png"
  },
  seo: {
    title: "John Doe - CEO at Acme Inc | Digital Business Card",
    description: "Connect with John Doe, CEO at Acme Inc. View my digital business card, contact information, and professional links.",
    image: "https://storage.weavink.io/user_abc123/social-preview.jpg"
  },
  nfcCard: {
    serialNumber: "NFC_ABC123",
    linkedAt: { _seconds: 1736892000 },
    verified: true
  },
  updatedAt: { _seconds: 1736895600 }
}
```

### Database Changes Table

| Action | Collection | Field Changes | Side Effects | Audit Log |
|--------|-----------|---------------|--------------|-----------|
| **Change Theme** | `/users/{id}/websiteConfig` | `theme`, `customColors`, `updatedAt` | Public profile appearance | ✅ Logged |
| **Change Layout** | `/users/{id}/websiteConfig` | `layout`, `updatedAt` | Public profile layout | ✅ Logged |
| **Update QR Code** | `/users/{id}/websiteConfig` | `qrCodeStyle`, `updatedAt` | QR code regenerated | ✅ Logged |
| **Update SEO** | `/users/{id}/websiteConfig` | `seo.title/description/image`, `updatedAt` | HTML meta tags, Google indexing | ✅ Logged |
| **Link NFC Card** | `/users/{id}/websiteConfig` | `nfcCard`, `updatedAt` | NFC tap redirects to profile | ✅ Logged |
| **Add Custom Domain** | `/users/{id}/websiteConfig` | `customDomain`, `domainVerificationToken` | DNS verification required | ✅ Logged |
| **Verify Domain** | `/users/{id}/websiteConfig` | `domainVerified:true` | Profile accessible at custom domain | ✅ Logged |

### RGPD Compliance Requirements

#### GDPR Art. 5(1)(a): Transparency
- ✅ Public profile settings clearly explained
- ✅ Users understand what "public" means
- ✅ SEO implications explained

#### Privacy by Default (GDPR Art. 25)
- ✅ Default theme: Professional and minimal
- ✅ Default layout: Clean and simple
- ✅ Default SEO: Basic, non-promotional

### Audit Logging Requirements

```javascript
// /AuditLogs/{logId}
{
  category: "Website Configuration",
  action: "config_updated",
  userId: "abc123",
  timestamp: { _seconds: 1736892000 },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  details: {
    changes: [
      {
        setting: "theme",
        oldValue: "default",
        newValue: "dark"
      },
      {
        setting: "seo.title",
        oldValue: "John Doe - Digital Business Card",
        newValue: "John Doe - CEO at Acme Inc"
      }
    ]
  },
  eventHash: "sha256_hash"
}
```

**Retention**: 5 years

---

## General RGPD Compliance Requirements

### Cross-Tab Requirements

#### 1. Language Requirements (CNIL - France)

##### Mandatory French Support
- ✅ All tabs available in French
- ✅ All legal text in French:
  - Privacy Policy (Politique de Confidentialité)
  - Terms of Service (Conditions Générales d'Utilisation)
  - Cookie Policy (Politique des Cookies)
  - Consent text
  - Data deletion warnings
- ✅ RGPD rights explained in French
- ✅ Error messages in French
- ✅ Email notifications in French (or user's preferred language)

##### English Translation (Optional but Recommended)
- ✅ Available for international users
- ✅ Language switcher in UI
- ✅ User preference saved in `/users/{id}/settings.language`

**Test:**
```
VERIFY:
1. Default language: French (for users in France)
2. Language switcher works
3. All text translates correctly
4. Legal documents available in both languages
```

#### 2. Response Time Requirements (GDPR)

| Right | GDPR Requirement | Our Implementation | Status |
|-------|------------------|-------------------|--------|
| **Data Export** (Art. 20) | 1 month maximum | Immediate (< 1 minute) | ✅ Exceeds |
| **Account Deletion** (Art. 17) | 1 month maximum | 30 days (with grace period) | ✅ Compliant |
| **Consent Changes** (Art. 7) | Immediate | Immediate (< 1 hour) | ✅ Compliant |
| **Privacy Settings** (Art. 5) | Immediate | Immediate | ✅ Compliant |

**Test Response Times:**
```
BENCHMARKS:
- Data export request → completion: < 60 seconds
- Account deletion request → scheduled: < 5 seconds
- Consent grant/withdraw → database update: < 2 seconds
- Privacy settings change → effect: < 1 second
```

#### 3. Security Requirements

##### Session Management
```
VERIFY:
- All API endpoints use SessionManager
- Session validation on every request
- Proper error handling for expired sessions
- Logout clears all sessions
```

##### Permission Checks
```
VERIFY ALL ENDPOINTS:
// Example: /api/user/privacy/export
const session = await SessionManager.getSession(request);
if (!session) throw new Error('Unauthorized');

const permissions = await checkUserPermissions(session.userId);
if (!permissions.CAN_EXPORT_DATA) throw new Error('Forbidden');
```

##### Rate Limiting
```
VERIFY RATE LIMITS (from privacyConstants.js):
- Data export: 3 requests per hour
- Account deletion: 1 request per day
- Consent changes: 100 requests per hour (prevent abuse)
- API calls: 1000 requests per hour (general limit)
```

**Test Rate Limiting:**
```
STEPS:
1. Make 3 export requests → ✅ All succeed
2. Make 4th export request → ❌ Error: "Rate limit exceeded"
3. Wait 1 hour
4. Make export request → ✅ Succeeds (counter reset)
```

#### 4. UI/UX Requirements (CNIL Guidelines)

##### No Dark Patterns

**PROHIBITED:**
- ❌ Making "Reject" button less visible than "Accept"
- ❌ Hiding privacy settings in multiple nested menus
- ❌ Using confusing language ("Don't not accept" double negatives)
- ❌ Pre-selecting consents
- ❌ Bundling consents (must be granular)
- ❌ Making withdrawal harder than granting
- ❌ "Are you sure?" dialogs only for withdrawal (not for granting)

**REQUIRED:**
- ✅ Equal prominence for "Accept" and "Reject"
- ✅ Clear, simple language
- ✅ One-click consent grant/withdrawal
- ✅ Granular consent controls (12 separate types)
- ✅ No extra steps for withdrawal
- ✅ No confirmation dialogs for withdrawal (CNIL guideline)

**Test:**
```
VERIFY:
1. "Accept All" and "Reject All" buttons same size/color/prominence
2. Consent toggles work with single click (no modals)
3. No "Are you sure?" dialog for withdrawing consent
4. All consent text uses clear, simple French
5. Essential consents clearly marked as required
```

##### Privacy by Default

**VERIFY DEFAULT SETTINGS:**
```javascript
// Most protective defaults
{
  // Profile
  isPublic: false, // ✅ Private by default
  allowMessages: false, // ✅ Messages off by default

  // Notifications
  email: true, // ✅ Required for account management
  push: false, // ✅ Off by default

  // Consents (all optional default to false)
  ai_semantic_search: false,
  ai_auto_grouping: false,
  ai_business_card_enhancement: false,
  analytics_basic: false,
  analytics_detailed: false,
  cookies_analytics: false,
  marketing_emails: false,
  contact_recommendations: false,
  cookies_personalization: false,
  profile_public: false
}
```

**Test:**
```
STEPS:
1. Create new account
2. Navigate to Account & Privacy page
3. Verify all default settings

EXPECTED:
- Profile: Private
- Messages: Disabled
- Push notifications: Disabled
- All optional consents: Withdrawn
```

#### 5. Data Retention Requirements

| Data Type | Retention Period | Legal Basis | Exception to Deletion |
|-----------|------------------|-------------|----------------------|
| **User Profile** | Account active + 30 days | N/A | N/A |
| **Contacts** | Account active + 30 days | N/A | N/A |
| **Consent Logs** | 7 years | GDPR Art. 7.1 | ✅ Cannot be deleted |
| **Billing Data** | 10 years | French Commercial Code Art. L.123-22 | ✅ Cannot be deleted |
| **Analytics (Personal)** | 26 months | CNIL Recommendation | Can be deleted with consent withdrawal |
| **Analytics (Anonymous)** | 26 months | CNIL Exemption | Not subject to deletion (anonymous) |
| **Audit Logs** | 5 years | GDPR Accountability | ✅ Preserved for legal purposes |
| **Export Files** | 24 hours | Data Minimization | Auto-deleted after expiration |

**Test Retention:**
```
VERIFY AUTO-DELETION:
1. Export data → Files expire after 24h → ✅ Auto-deleted
2. Delete account → Analytics anonymized → ✅ UserID removed, data aggregated
3. Delete account → Consent logs preserved → ✅ Still exist after 30 days
4. Delete account → Billing archived → ✅ Created in /BillingArchive/
```

#### 6. Accountability Requirements

##### Audit Logging

**EVERY privacy action must log:**
- User ID
- Timestamp (precise to the second)
- IP address
- User agent (browser/device info)
- Action performed
- Old value → New value (for changes)
- Legal basis (for data processing)
- Event hash (tamper detection)

**Test Audit Logs:**
```
VERIFY LOGS CREATED FOR:
✅ Grant consent
✅ Withdraw consent
✅ Request data export
✅ Download export file
✅ Request account deletion
✅ Cancel deletion
✅ Execute deletion
✅ Change privacy settings
✅ Enable/disable profile visibility
✅ Configure website settings
```

##### Tamper-Evident Logs

**Implementation:**
```javascript
// Each audit log includes hash
eventHash: sha256(
  userId +
  action +
  timestamp +
  JSON.stringify(details) +
  previousEventHash // Chain of hashes
)

// Verifies integrity of entire audit trail
```

**Test:**
```
STEPS:
1. Create 10 audit log entries
2. Manually modify entry #5 in database
3. Run integrity check

EXPECTED:
- ❌ Hash mismatch detected
- ⚠️ Alert: "Audit log tampering detected"
- 📝 Incident logged
```

---

## 5-Year Audit Log Retention Testing (Firestore TTL)

### Purpose

Verify that audit logs are automatically deleted after 5 years using Firestore TTL and that the monthly monitoring function correctly tracks retention policy enforcement.

**GDPR Compliance**: Article 5(2) - Accountability (5-year audit trail)
**Implementation**: Firestore TTL + Monthly Monitoring Function
**Documentation**: See `FIREBASE_AUDIT_LOG_MONITORING.md`

---

### Test 10.1: Verify TTL Policy is Enabled

**Objective**: Confirm Firestore TTL policy is active on AuditLogs collection

**Test Steps**:

```bash
# 1. Check TTL policy status
gcloud firestore fields ttls list \
  --collection-group=AuditLogs \
  --project=tapit-dev-e0eed
```

**Expected Results**:

```yaml
---
name: projects/tapit-dev-e0eed/databases/(default)/collectionGroups/AuditLogs/fields/expireAt
ttlConfig:
  state: ACTIVE  # ✅ TTL enabled and operational
```

**Pass Criteria**:
- ✅ `state: ACTIVE` (TTL policy is enabled)
- ✅ Field name: `expireAt`
- ✅ Collection group: `AuditLogs`

**Failure Actions**:
- If `state: CREATING` → Wait 5-10 minutes and re-check
- If TTL not found → Re-run `gcloud firestore fields ttls update expireAt --collection-group=AuditLogs --enable-ttl`

---

### Test 10.2: Verify `expireAt` Field in New Audit Logs

**Objective**: Confirm all new audit logs have `expireAt` field set to 5 years in future

**Test Steps**:

1. **Create a new audit log** (trigger any privacy action):
   - Request data export in Privacy Center
   - OR grant/withdraw a consent
   - OR update privacy settings

2. **Check latest audit log in Firestore**:

```javascript
const db = admin.firestore();

const recentLog = await db.collection('AuditLogs')
  .orderBy('timestamp', 'desc')
  .limit(1)
  .get();

const logData = recentLog.docs[0].data();

console.log('Action:', logData.action);
console.log('Timestamp:', logData.timestamp.toDate());
console.log('ExpireAt:', logData.expireAt.toDate());

// Calculate retention period
const diffMs = logData.expireAt.getTime() - logData.timestamp.toDate().getTime();
const diffYears = diffMs / (365.25 * 24 * 60 * 60 * 1000);

console.log('Retention period:', diffYears.toFixed(2), 'years');
// Expected: ~5.00 years
```

**Expected Results**:
- ✅ `expireAt` field exists
- ✅ `expireAt` is a Firestore Timestamp (not null)
- ✅ Retention period = **5.00 years** (±0.01 year tolerance)
- ✅ `expireAt` > `timestamp` (expiry is in the future)

**Sample Log Structure**:
```javascript
{
  logId: "log_export_1732089600_xyz",
  category: "data_export",
  action: "export_requested",
  userId: "abc123",
  timestamp: Timestamp { _seconds: 1732089600 },  // Nov 19, 2025
  expireAt: Timestamp { _seconds: 1889769600 },   // Nov 19, 2030 (5 years later)
  // ... other fields
}
```

**Pass Criteria**:
- ✅ ALL new audit logs have `expireAt` field
- ✅ Retention period = 5 years (157,788,000,000 milliseconds)
- ✅ No audit logs with `expireAt: null`

---

### Test 10.3: Verify Monthly Monitoring Function

**Objective**: Confirm `monitorAuditLogRetention` function is deployed and creates monthly summaries

**Test Steps**:

1. **Check function exists**:

```bash
firebase functions:list | grep monitorAuditLogRetention

# Expected: monitorAuditLogRetention(us-central1) [SCHEDULED]
```

2. **Check Cloud Scheduler job**:

```bash
gcloud scheduler jobs list --project=tapit-dev-e0eed | grep monitorAuditLogRetention

# Expected: firebase-schedule-monitorAuditLogRetention-us-central1  0 4 1 * *  UTC  ENABLED
```

3. **Manually trigger function**:

```bash
gcloud functions call monitorAuditLogRetention \
  --region=us-central1 \
  --project=tapit-dev-e0eed
```

4. **Verify monitoring summary created**:

```javascript
const monitorLog = await db.collection('AuditLogs')
  .where('category', '==', 'retention_policy')
  .where('action', '==', 'audit_log_retention_check')
  .orderBy('timestamp', 'desc')
  .limit(1)
  .get();

if (monitorLog.empty) {
  console.log('❌ FAIL: No monitoring summary found');
} else {
  const data = monitorLog.docs[0].data();
  console.log('✅ PASS: Monitoring summary created');
  console.log('Check Date:', data.metadata.checkDate);
  console.log('Total Logs:', data.metadata.totalAuditLogs);
  console.log('Expired Logs:', data.metadata.expiredLogsFound);
  console.log('TTL Status:', data.metadata.ttlStatus);
  console.log('Severity:', data.severity);
}
```

**Expected Results**:
- ✅ Function exists and is scheduled
- ✅ Cloud Scheduler job is ENABLED
- ✅ Monitoring summary audit log created
- ✅ `category: "retention_policy"`
- ✅ `action: "audit_log_retention_check"`
- ✅ `metadata.totalAuditLogs` > 0
- ✅ `metadata.ttlStatus` = "healthy" (0-50 expired logs)

**Expected Monitoring Summary Structure**:
```javascript
{
  category: "retention_policy",
  action: "audit_log_retention_check",
  userId: null,
  details: "TTL policy working correctly - minimal old logs found",
  severity: "info",  // or "warning" or "error"
  ipAddress: "SYSTEM_SCHEDULED",
  userAgent: "Cloud Functions/auditLogMonitoring",
  metadata: {
    checkDate: "2025-12-01T04:00:00.000Z",
    totalAuditLogs: 125000,
    expiredLogsFound: 15,
    retentionPeriod: "5_years",
    fiveYearCutoff: "2020-12-01T04:00:00.000Z",
    ttlStatus: "healthy",  // healthy | degraded | unhealthy
    categoryBreakdown: {
      "data_export": 8,
      "consent": 5,
      "data_deletion": 2
    },
    executionTimeMs: 1234
  },
  timestamp: Timestamp { ... },
  expireAt: Timestamp { ... }  // 5 years from now
}
```

**TTL Status Meanings**:
- **"healthy"**: 0-50 expired logs found (TTL working normally)
- **"degraded"**: 51-100 expired logs found (TTL working but slow)
- **"unhealthy"**: 101+ expired logs found (TTL not working!)

**Pass Criteria**:
- ✅ Monitoring function exists and is scheduled
- ✅ Summary audit log created successfully
- ✅ `ttlStatus` = "healthy" or "degraded" (NOT "unhealthy")
- ✅ Execution time < 60 seconds

---

### Test 10.4: Verify TTL Health Over Time

**Objective**: Analyze monitoring summaries over multiple months to ensure TTL is consistently working

**Test Steps**:

1. **Query last 3 months of monitoring summaries**:

```javascript
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

const history = await db.collection('AuditLogs')
  .where('category', '==', 'retention_policy')
  .where('action', '==', 'audit_log_retention_check')
  .where('timestamp', '>=', threeMonthsAgo)
  .orderBy('timestamp', 'desc')
  .get();

console.log(`Found ${history.size} monthly checks in last 3 months`);

const expiredCounts = [];
history.forEach(doc => {
  const data = doc.data();
  const checkDate = new Date(data.metadata.checkDate);
  const month = checkDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  console.log(`${month}:`);
  console.log(`  - Total Logs: ${data.metadata.totalAuditLogs}`);
  console.log(`  - Expired Logs: ${data.metadata.expiredLogsFound}`);
  console.log(`  - Status: ${data.metadata.ttlStatus}`);

  expiredCounts.push(data.metadata.expiredLogsFound);
});

// Trend analysis
console.log('\nTrend Analysis:');
console.log('Expired log counts:', expiredCounts);

if (expiredCounts.length >= 2) {
  const increasing = expiredCounts.every((val, i) => i === 0 || val >= expiredCounts[i-1]);

  if (increasing && expiredCounts[0] > 50) {
    console.log('⚠️ WARNING: Expired logs are increasing - TTL may be degrading');
  } else {
    console.log('✅ PASS: TTL working normally');
  }
}
```

**Expected Results**:
- ✅ At least 2 monitoring summaries found (if system running for 2+ months)
- ✅ Expired log counts are stable or decreasing
- ✅ No month with `ttlStatus: "unhealthy"`
- ✅ Total audit logs increasing over time (normal growth)

**Pass Criteria**:
- ✅ Expired log counts < 50 in most recent month
- ✅ No increasing trend in expired counts
- ✅ All checks have `severity: "info"` or `severity: "warning"` (NOT "error")

---

### Test 10.5: Verify Export Cleanup Logs Have `expireAt`

**Objective**: Confirm export cleanup function (`cleanupExpiredExports`) creates audit logs with `expireAt` field

**Test Steps**:

1. **Create expired export request** (see Test 5.5 for setup)

2. **Trigger cleanup function** (or wait for scheduled run at 2 AM UTC)

3. **Check cleanup audit logs**:

```javascript
const cleanupLogs = await db.collection('AuditLogs')
  .where('category', '==', 'data_export')
  .where('action', '==', 'export_expired')
  .orderBy('timestamp', 'desc')
  .limit(5)
  .get();

console.log(`Found ${cleanupLogs.size} export cleanup logs`);

cleanupLogs.forEach(doc => {
  const data = doc.data();

  console.log(`\nLog ID: ${doc.id}`);
  console.log(`  - User ID: ${data.userId}`);
  console.log(`  - Request ID: ${data.metadata.requestId}`);
  console.log(`  - Timestamp: ${data.timestamp.toDate()}`);
  console.log(`  - ExpireAt: ${data.expireAt ? data.expireAt.toDate() : 'MISSING'}`);

  if (data.expireAt) {
    const retentionYears = (data.expireAt.toDate() - data.timestamp.toDate()) / (365.25 * 24 * 60 * 60 * 1000);
    console.log(`  - Retention: ${retentionYears.toFixed(2)} years`);
  }
});
```

**Expected Results**:
- ✅ ALL cleanup logs have `expireAt` field
- ✅ Retention period = 5 years
- ✅ `category: "data_export"`
- ✅ `action: "export_expired"`
- ✅ Individual logs per export (not bulk)

**Sample Cleanup Log Structure**:
```javascript
{
  category: "data_export",
  action: "export_expired",
  userId: "abc123",
  resourceType: "data_export",
  resourceId: "req_export_123",
  details: "Data export expired and deleted (24-hour retention policy)",
  severity: "info",
  ipAddress: "SYSTEM_SCHEDULED",
  userAgent: "Cloud Functions/scheduledCleanup",
  metadata: {
    requestId: "req_export_123",
    expiresAt: "2025-11-18T10:00:00.000Z",
    deletedAt: "2025-11-19T10:00:15.000Z",
    retentionPolicy: "24_hours"
  },
  timestamp: Timestamp { _seconds: 1732089615 },  // Nov 19, 2025
  expireAt: Timestamp { _seconds: 1889769615 },   // Nov 19, 2030 (5 years later)
  eventHash: "export_expired_req_export_123_1732089615",
  verified: true
}
```

**Pass Criteria**:
- ✅ 100% of export cleanup logs have `expireAt`
- ✅ All have 5-year retention period
- ✅ Logs created for EACH expired export (individual, not bulk)

---

### Test 10.6: Database State Verification

**Objective**: Comprehensive check of audit log collection for TTL compliance

**Test Steps**:

1. **Query recent audit logs**:

```javascript
const recentLogs = await db.collection('AuditLogs')
  .orderBy('timestamp', 'desc')
  .limit(100)
  .get();

let logsWithExpireAt = 0;
let logsWithoutExpireAt = 0;
const categories = {};

recentLogs.forEach(doc => {
  const data = doc.data();

  if (data.expireAt) {
    logsWithExpireAt++;
  } else {
    logsWithoutExpireAt++;
    console.log(`⚠️ Missing expireAt: ${doc.id} (action: ${data.action})`);
  }

  categories[data.category] = (categories[data.category] || 0) + 1;
});

console.log('\n=== Audit Log TTL Compliance Report ===');
console.log(`Total logs checked: ${recentLogs.size}`);
console.log(`With expireAt: ${logsWithExpireAt} (${(logsWithExpireAt / recentLogs.size * 100).toFixed(1)}%)`);
console.log(`Without expireAt: ${logsWithoutExpireAt} (${(logsWithoutExpireAt / recentLogs.size * 100).toFixed(1)}%)`);
console.log('\nBy Category:');
Object.entries(categories).forEach(([cat, count]) => {
  console.log(`  - ${cat}: ${count}`);
});

// PASS if 100% have expireAt
if (logsWithExpireAt === recentLogs.size) {
  console.log('\n✅ PASS: All recent audit logs have expireAt field');
} else {
  console.log('\n❌ FAIL: Some audit logs missing expireAt field');
}
```

**Expected Results**:
- ✅ 100% of recent logs have `expireAt` field
- ✅ No logs missing `expireAt`
- ✅ All categories represented (consent, data_export, data_deletion, etc.)

**Pass Criteria**:
- ✅ `logsWithExpireAt = 100` (100% compliance)
- ✅ `logsWithoutExpireAt = 0`

**Failure Actions**:
- If logs missing `expireAt`:
  - Check when code was deployed (old logs before deployment won't have field)
  - Verify `auditLogService.js` has `expireAt` line (line 93)
  - Re-deploy functions: `firebase deploy --only functions`

---

### Summary: 5-Year TTL Testing Checklist

Use this checklist to verify complete TTL implementation:

- [ ] **Test 10.1**: TTL policy is ACTIVE in Firestore
- [ ] **Test 10.2**: New audit logs have `expireAt` = 5 years
- [ ] **Test 10.3**: Monitoring function runs monthly and creates summaries
- [ ] **Test 10.4**: TTL status is "healthy" in recent monitoring summaries
- [ ] **Test 10.5**: Export cleanup logs have `expireAt` field
- [ ] **Test 10.6**: 100% of recent logs have `expireAt` field

**GDPR Compliance Status**:
- ✅ Article 5(1)(c): Data minimization (auto-delete after 5 years)
- ✅ Article 5(2): Accountability (monthly monitoring proves enforcement)
- ✅ CNIL requirement: 5-year audit trail maintained
- ✅ Automated enforcement: Zero manual intervention needed

**Documentation References**:
- `FIREBASE_AUDIT_LOG_MONITORING.md` - Comprehensive TTL implementation guide
- `RGPD_COMPLIANCE_MATRIX.md` (line 557) - Retention policies table
- `/functions/auditLogMonitoring.js` - Monthly monitoring function code
- `/lib/services/servicePrivacy/server/auditLogService.js` (line 93) - `expireAt` implementation

---

## Comprehensive Audit Logging Matrix

### Log Categories and Actions

| Category | Action | Severity | Required Fields | Retention | Purpose |
|----------|--------|----------|-----------------|-----------|---------|
| **Consent** | `consent_granted` | INFO | userId, consentType, version, IP, userAgent | 7 years | GDPR Art. 7.1 - Prove consent obtained |
| | `consent_withdrawn` | INFO | userId, consentType, IP, userAgent | 7 years | GDPR Art. 7.3 - Track withdrawal |
| | `batch_grant_all` | INFO | userId, consentTypes[], IP | 7 years | Track bulk consent changes |
| | `batch_withdraw_all` | INFO | userId, consentTypes[], IP | 7 years | Track bulk withdrawals |
| **Data Access** | `export_requested` | INFO | userId, requestId, IP, userAgent | 5 years | GDPR Art. 15 - Track access requests |
| | `export_completed` | INFO | userId, requestId, filesGenerated | 5 years | Track export completion |
| | `export_downloaded` | INFO | userId, requestId, fileName | 5 years | Track file downloads |
| | `export_expired` | INFO | userId, requestId | 5 years | Track auto-deletions |
| | `contacts_downloaded` | INFO | userId, format, contactCount | 5 years | Track contact downloads |
| **Data Deletion** | `deletion_requested` | WARNING | userId, scheduledDate, IP, userAgent, confirmationText | 5 years | GDPR Art. 17 - Track erasure requests |
| | `deletion_cancelled` | INFO | userId, requestId, IP | 5 years | Track cancellations |
| | `deletion_executed` | CRITICAL | userId, deletionSummary, legalBasis | 5 years | Track actual deletions |
| | `contact_anonymized` | INFO | userId, contactId, inUserList | 5 years | Track cascade anonymization |
| **Data Modification** | `settings_updated` | INFO | userId, changes[], IP, userAgent | 5 years | Track privacy setting changes |
| | `profile_visibility_changed` | INFO | userId, oldValue, newValue | 5 years | Track public/private changes |
| | `config_updated` | INFO | userId, changes[], IP | 5 years | Track website config changes |
| **AI Features** | `ai_processing_consent` | INFO | userId, featureType, action | 7 years | Track AI consent changes |
| | `embeddings_created` | INFO | userId, contactCount | 5 years | Track Pinecone operations |
| | `embeddings_deleted` | INFO | userId | 5 years | Track Pinecone deletions |
| **Analytics** | `analytics_tracking_started` | INFO | userId | 5 years | Track when tracking begins |
| | `analytics_tracking_stopped` | INFO | userId | 5 years | Track when tracking stops |
| | `anonymous_analytics` | DEBUG | NO userId, aggregateData | 26 months | Anonymous platform analytics |
| **Security** | `session_created` | INFO | userId, IP, userAgent | 5 years | Security monitoring |
| | `session_expired` | INFO | userId, sessionId | 5 years | Track expirations |
| | `unauthorized_access_attempt` | WARNING | IP, endpoint | 5 years | Security monitoring |
| | `rate_limit_exceeded` | WARNING | userId, endpoint, limit | 5 years | Abuse prevention |

### Sample Audit Log Entries

#### Consent Granted
```javascript
{
  logId: "log_consent_1736892000_abc",
  category: "Consent",
  action: "consent_granted",
  severity: "INFO",
  userId: "abc123",
  timestamp: { _seconds: 1736892000, _nanoseconds: 0 },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  details: {
    consentType: "ai_semantic_search",
    version: "1.0",
    previousStatus: false,
    newStatus: true,
    category: "ai_features",
    legalBasis: "GDPR Art. 6(1)(a) - Consent"
  },
  eventHash: "3f8a9b2c1d0e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0"
}
```

#### Data Export Requested
```javascript
{
  logId: "log_export_1736892000_xyz",
  category: "Data Access",
  action: "export_requested",
  severity: "INFO",
  userId: "abc123",
  timestamp: { _seconds: 1736892000 },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  details: {
    requestId: "req_export_1736892000_abc",
    options: {
      includeContacts: true,
      includeAnalytics: true,
      includeConsents: true,
      includeSettings: true
    },
    legalBasis: "GDPR Art. 20 - Right to data portability"
  },
  eventHash: "sha256_hash_here"
}
```

#### Account Deletion Executed
```javascript
{
  logId: "log_deletion_1736892000_critical",
  category: "Data Deletion",
  action: "deletion_executed",
  severity: "CRITICAL",
  userId: "abc123",
  timestamp: { _seconds: 1736892000 },
  ipAddress: "SYSTEM_AUTOMATED", // Executed by cron job
  userAgent: "Cloud Functions",
  details: {
    requestId: "req_deletion_1736889600_abc",
    scheduledDate: "2025-02-17T10:00:00Z",
    executionDate: "2025-02-17T10:00:15Z", // Actual execution
    deletionSummary: {
      userProfileDeleted: true,
      contactsDeleted: 145,
      groupsDeleted: 12,
      analyticsAnonymized: true,
      firebaseAuthDeleted: true
    },
    dataPreserved: {
      consents: {
        count: 8,
        legalBasis: "GDPR Art. 17.3(b) - Legal obligation (7 years)"
      },
      billing: {
        archived: true,
        legalBasis: "French Commercial Code Art. L.123-22 (10 years)"
      }
    },
    legalBasis: "GDPR Art. 17 - Right to erasure"
  },
  eventHash: "sha256_hash_here"
}
```

### Audit Log Integrity Verification

#### Hash Chain Verification
```javascript
// Each log entry references previous entry's hash
function verifyAuditLogIntegrity(logs) {
  let previousHash = null;

  for (const log of logs) {
    // Calculate expected hash
    const expectedHash = sha256(
      log.userId +
      log.action +
      log.timestamp +
      JSON.stringify(log.details) +
      (previousHash || 'GENESIS')
    );

    // Compare with stored hash
    if (log.eventHash !== expectedHash) {
      throw new Error(`Tampering detected at log ${log.logId}`);
    }

    previousHash = log.eventHash;
  }

  return true; // All logs verified
}
```

#### Automated Integrity Checks
```
SCHEDULE:
- Every 24 hours: Full audit log integrity check
- On deletion request: Verify all related logs
- On export: Include integrity report

ALERTS:
- If tampering detected → Email DPO immediately
- Critical logs (deletions) → Real-time monitoring
- Unusual patterns → Automated investigation
```

---

## Database Collections Reference

### Complete Collection Structure

#### 1. `/users/{userId}`
**Purpose**: Main user profile and settings

```javascript
{
  // Authentication (Firebase Auth + profile)
  uid: "abc123",
  email: "user@example.com",
  displayName: "John Doe",
  photoURL: "https://storage.url/...",
  phone: "+33612345678",

  // Privacy-related fields
  privacy: {
    pendingDeletion: false,
    deletionRequestId: null,
    deletionRequestedAt: null,
    deletionScheduledFor: null
  },

  // Settings (detailed in Tab 5)
  settings: {
    isPublic: false,
    allowMessages: false,
    notifications: {
      email: true,
      push: false,
      pushSubscription: {...}
    },
    language: "fr",
    theme: "dark"
  },

  // Website configuration (Tab 7)
  websiteConfig: {...},

  // Timestamps
  createdAt: FirebaseTimestamp,
  updatedAt: FirebaseTimestamp,
  lastLoginAt: FirebaseTimestamp
}
```

**Indexes:**
- `email` (unique)
- `uid` (unique)
- `privacy.deletionScheduledFor` (for scheduled deletions)

#### 2. `/users/{userId}/consents/{consentType}`
**Purpose**: User's consent records

```javascript
{
  consentType: "ai_semantic_search",
  status: true,
  grantedAt: FirebaseTimestamp,
  withdrawnAt: FirebaseTimestamp | null,
  version: "1.0",
  required: false,
  category: "ai_features",
  legalBasis: "GDPR Art. 6(1)(a) - Consent"
}
```

**Retention**: Active while account exists, preserved 7 years after deletion

#### 3. `/ConsentHistory/{logId}`
**Purpose**: Immutable audit trail of all consent changes

```javascript
{
  logId: "log_abc123",
  userId: "abc123",
  consentType: "ai_semantic_search",
  action: "granted|withdrawn",
  timestamp: FirebaseTimestamp,
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  version: "1.0",
  metadata: {
    source: "privacy_center_ui|cookie_banner|api",
    category: "ai_features"
  }
}
```

**Indexes:**
- `userId` (for user's consent history)
- `consentType` (for consent-specific history)
- `timestamp` (for chronological sorting)

**Retention**: 7 years (GDPR accountability requirement)

#### 4. `/PrivacyRequests/{requestId}`
**Purpose**: Export and deletion requests

```javascript
{
  id: "req_export_1736892000_abc",
  userId: "abc123",
  type: "export|deletion",
  status: "pending|processing|completed|failed|cancelled",

  // Common fields
  requestedAt: FirebaseTimestamp,
  completedAt: FirebaseTimestamp | null,
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",

  // Export-specific fields
  expiresAt: FirebaseTimestamp, // +24 hours
  files: {
    "user_profile.json": {...},
    "contacts.csv": {...},
    // ... all files
  },

  // Deletion-specific fields
  scheduledDeletionDate: FirebaseTimestamp, // +30 days
  gracePeriodDays: 30,
  confirmationText: "DELETE MY ACCOUNT",
  reason: "User requested deletion",
  immediate: false,

  // Execution log (for deletions)
  executionLog: {
    userProfileDeleted: true,
    contactsDeleted: 145,
    // ... details
  }
}
```

**Indexes:**
- `userId` (for user's requests)
- `type` (for export vs deletion)
- `status` (for pending requests)
- `scheduledDeletionDate` (for scheduled deletions)
- `expiresAt` (for auto-cleanup)

**Retention**: 3 years after completion

#### 5. `/Contacts/{userId}/{contactId}`
**Purpose**: User's contact list

```javascript
{
  contactId: "contact_abc123",
  ownerId: "abc123", // User who owns this contact

  // Contact fields
  displayName: "John Doe",
  email: "john@example.com",
  phone: "+33612345678",
  company: "Acme Inc",
  title: "CEO",
  address: {
    street: "123 Main St",
    city: "Paris",
    postalCode: "75001",
    country: "France"
  },
  notes: "Met at conference 2024",

  // Metadata
  source: "manual|ai_business_card|import",
  createdAt: FirebaseTimestamp,
  updatedAt: FirebaseTimestamp,

  // Deletion handling
  deletedUser: false, // True if contact deleted their account
  deletedUserNotifiedAt: FirebaseTimestamp | null
}
```

**Deletion behavior**:
- When user deletes account → Entire `/Contacts/{userId}/` subcollection deleted
- When contact appears in other users' lists → Anonymized after 30 days

#### 6. `/Groups/{userId}/{groupId}`
**Purpose**: Contact groups

```javascript
{
  groupId: "group_abc123",
  ownerId: "abc123",
  name: "Work Contacts",
  description: "People I work with",
  contactIds: ["contact_1", "contact_2", ...],
  color: "#3B82F6",
  icon: "briefcase",
  autoGenerated: false, // True if created by AI auto-grouping
  createdAt: FirebaseTimestamp,
  updatedAt: FirebaseTimestamp
}
```

**Deletion behavior**: Entire subcollection deleted with account

#### 7. `/Analytics/{userId}/`
**Purpose**: Personal analytics (WITH consent)

```javascript
{
  userId: "abc123",
  totalViews: 1234,
  dailyViews: {
    "2025-01-18": 45,
    "2025-01-19": 52
  },
  linkClicks: {
    "link_1": 123,
    "link_2": 89
  },
  scanData: {
    qrScans: 234,
    nfcScans: 45
  },
  referrers: [
    {url: "https://google.com", count: 100},
    {url: "https://linkedin.com", count: 80}
  ],
  deviceTypes: {
    desktop: 700,
    mobile: 534
  },
  lastUpdated: FirebaseTimestamp
}
```

**Consent required**: `analytics_basic` or `analytics_detailed`

**Deletion behavior**: Anonymized on account deletion (data aggregated into anonymous stats)

**Retention**: 26 months maximum (CNIL recommendation)

#### 8. `/Analytics_Anonymous/daily/{YYYY-MM-DD}`
**Purpose**: Anonymous platform analytics (NO consent required)

```javascript
{
  date: "2025-01-18",
  totalViews: 54321, // NO userId field
  hourlyDistribution: {
    "00": 123,
    "01": 89,
    // ... 24 hours
  },
  platformMetrics: {
    desktopViews: 35000,
    mobileViews: 19321
  },
  linkTypes: {
    website: 12000,
    email: 8000,
    phone: 5000
  }
  // NO personal identifiers
}
```

**Legal basis**: GDPR Art. 6(1)(f) - Legitimate interest (CNIL exempt when truly anonymous)

**Retention**: 26 months

#### 9. `/BillingArchive/{userId}/`
**Purpose**: Archived billing data (created on account deletion)

```javascript
{
  userId: "abc123_deleted", // Pseudonymized
  originalData: {
    subscriptionHistory: [
      {
        plan: "pro",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        amount: 99.99,
        currency: "EUR"
      }
    ],
    invoices: [
      {
        invoiceId: "INV_2025_001",
        date: "2025-01-01",
        amount: 99.99,
        pdfUrl: "https://storage.url/..."
      }
    ],
    paymentMethods: [
      // Tokenized only, no raw card numbers
      {
        type: "card",
        last4: "4242",
        brand: "Visa"
      }
    ]
  },
  archivedAt: FirebaseTimestamp,
  retentionExpiresAt: FirebaseTimestamp, // +10 years
  legalBasis: "French Commercial Code - Art. L.123-22",
  rgpdException: "GDPR Art. 17.3(e) - Legal claims"
}
```

**Retention**: 10 years (French law requirement)

**Cannot be deleted**: Legal obligation to preserve

#### 10. `/AuditLogs/{logId}`
**Purpose**: Tamper-evident audit trail

```javascript
{
  logId: "log_1736892000_abc123",
  category: "Consent|Data Access|Data Deletion|Data Modification|AI Features|Security",
  action: "consent_granted|export_requested|deletion_executed|...",
  severity: "DEBUG|INFO|WARNING|ERROR|CRITICAL",
  userId: "abc123",
  timestamp: FirebaseTimestamp,
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  details: {
    // Action-specific details (varies by action)
  },
  eventHash: "sha256_hash_linking_to_previous_log",
  previousEventHash: "sha256_hash_of_previous_log"
}
```

**Indexes:**
- `userId` (for user-specific logs)
- `category` (for filtering)
- `action` (for specific actions)
- `timestamp` (chronological)
- `severity` (for alerts)

**Retention**: 5 years

**Integrity**: Hash chain ensures tamper-evidence

---

## Summary & Testing Checklist

### Overall Testing Coverage

| Tab | Test Scenarios | Database Collections | RGPD Articles | Status |
|-----|---------------|---------------------|---------------|--------|
| **1. Aperçu** | 6 | 0 (read-only) | Art. 13-14, 15-22 | ✅ |
| **2. Exporter les Données** | 20 | 2 (`/PrivacyRequests/`, `/AuditLogs/`) | Art. 20 | ✅ |
| **3. Supprimer le Compte** | 30 | 8 (all collections affected) | Art. 17 | ✅ |
| **4. Consentements** | 52 | 3 (`/users/consents`, `/ConsentHistory/`, `/AuditLogs/`) | Art. 6, 7 | ✅ |
| **5. Paramètres** | 20 | 2 (`/users/settings`, `/AuditLogs/`) | Art. 5, 25 | ✅ |
| **6. Téléchargement** | 8 | 1 (`/Contacts/`) | Art. 20 | ✅ |
| **7. Configuration** | 10 | 2 (`/users/websiteConfig`, `/AuditLogs/`) | Art. 5 | ✅ |
| **TOTAL** | **146** | **10 collections** | **12 articles** | ✅ |

### Compliance Scorecard

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **GDPR Compliance** | 95/100 | Phase 4 complete, 116/116 tests passing |
| **CNIL Guidelines (France)** | ✅ Compliant | French translations, 30-day grace period, no dark patterns |
| **French Commercial Law** | ✅ Compliant | 10-year billing retention, archived billing data |
| **ePrivacy Directive** | ✅ Compliant | No pre-checked boxes, granular cookie consent |
| **Data Minimization** | ✅ Compliant | 24h export expiration, anonymous analytics |
| **Accountability** | ✅ Compliant | 7-year consent logs, 5-year audit logs, hash chain integrity |
| **Transparency** | ✅ Compliant | Clear explanations, French language, DPO contact |
| **User Control** | ✅ Compliant | Granular consents, instant changes, withdrawal as easy as granting |

### Remaining Tasks (to reach 100/100)

- [ ] **DPO Appointment**: Activate `dpo@weavink.io` email (prerequisite for CNIL compliance)
- [ ] **French Legal Pages**: Complete translations of Privacy Policy, Terms, Cookie Policy
- [ ] **Anonymous Analytics Implementation**: Phase 5 - separate personal from platform analytics
- [ ] **CNIL Registration**: Register data processing with CNIL (if processing >250 employees or sensitive data)
- [ ] **Data Protection Impact Assessment (DPIA)**: For AI features (Gemini, Pinecone) - GDPR Art. 35

### Quick Testing Commands

#### Test Export Flow
```bash
# 1. Request export
POST /api/user/privacy/export
{
  "includeContacts": true,
  "includeAnalytics": true,
  "includeConsents": true,
  "includeSettings": true
}

# 2. Check request status
GET /api/user/privacy/export?requestId=req_export_...

# 3. Download files
GET /api/user/privacy/export/download?requestId=req_export_...&file=contacts.csv

# 4. Verify auto-expiration (after 24h)
# Check /PrivacyRequests/ → Document should be deleted
```

#### Test Deletion Flow
```bash
# 1. Request deletion
POST /api/user/privacy/delete-account
{
  "confirmationText": "DELETE MY ACCOUNT",
  "reason": "Testing deletion flow",
  "immediate": false
}

# 2. Check scheduled deletion
GET /api/user/privacy/delete-account
# Response: deletionScheduledFor: 30 days from now

# 3. Cancel deletion (optional)
POST /api/user/privacy/delete-account/cancel

# 4. Verify deletion execution (after 30 days)
# Check all collections → User data should be deleted/anonymized/archived
```

#### Test Consent Flow
```bash
# 1. Grant consent
POST /api/user/privacy/consent
{
  "consentType": "ai_semantic_search",
  "action": "grant",
  "metadata": {"version": "1.0"}
}

# 2. Verify consent log
GET /api/user/privacy/consent/history?consentType=ai_semantic_search

# 3. Withdraw consent
POST /api/user/privacy/consent
{
  "consentType": "ai_semantic_search",
  "action": "withdraw"
}

# 4. Verify feature disabled
# Check: Semantic search should not work
```

### Database Verification Queries

```javascript
// Firestore console queries

// 1. Check user's consents
db.collection('users').doc(userId).collection('consents').get()

// 2. Check consent history
db.collection('ConsentHistory')
  .where('userId', '==', userId)
  .orderBy('timestamp', 'desc')
  .limit(10)
  .get()

// 3. Check pending exports
db.collection('PrivacyRequests')
  .where('userId', '==', userId)
  .where('type', '==', 'export')
  .where('status', '==', 'pending')
  .get()

// 4. Check pending deletions
db.collection('PrivacyRequests')
  .where('type', '==', 'deletion')
  .where('status', '==', 'pending')
  .where('scheduledDeletionDate', '<=', new Date())
  .get()

// 5. Check audit logs
db.collection('AuditLogs')
  .where('userId', '==', userId)
  .where('category', '==', 'Consent')
  .orderBy('timestamp', 'desc')
  .limit(20)
  .get()
```

---

## Conclusion

This comprehensive testing guide covers all aspects of the Account & Privacy page with:

- ✅ **146+ test scenarios** across 7 tabs
- ✅ **10 database collections** documented with expected states
- ✅ **12 GDPR articles** compliance verified
- ✅ **Complete audit logging** for accountability
- ✅ **French CNIL compliance** verified
- ✅ **7-year consent retention** implemented
- ✅ **10-year billing retention** implemented
- ✅ **Anonymous analytics** approach documented
- ✅ **Tamper-evident logs** with hash chains

**Current Compliance Score: 95/100** (Phase 4 Complete)

**Test Coverage: 116/116 passing** (100%)

Use this guide as the definitive reference for testing all Account & Privacy functionality and ensuring complete RGPD/GDPR compliance.

---

**Document End** | Version 1.0 | Last Updated: 2025-01-18
