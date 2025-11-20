---
id: testing-anonymous-analytics-033
title: Anonymous Analytics System - Manual Test Guide (Phase 3.3)
category: testing
tags: [analytics, consent, gdpr, anonymous, firestore, rgpd, privacy, ttl]
status: active
created: 2025-11-20
updated: 2025-11-20
version: 1.0.0
related:
  - ANONYMOUS_ANALYTICS_PLAN.md
  - RGPD_TESTING_GUIDE.md
  - ACCOUNT_PRIVACY_TESTING_GUIDE.md
  - EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md
  - RATE_LIMIT_TESTING.md
---

# Anonymous Analytics System - Manual Test Guide (Phase 3.3)

## 📋 Table of Contents

1. [Overview & Purpose](#overview--purpose)
2. [Prerequisites & Environment Setup](#prerequisites--environment-setup)
3. [Test Category 1: Consent Withdrawal Scenarios](#test-category-1-consent-withdrawal-scenarios)
4. [Test Category 2: Firestore Verification Procedures](#test-category-2-firestore-verification-procedures)
5. [Test Category 3: Data Retention & TTL Verification](#test-category-3-data-retention--ttl-verification)
6. [Test Category 4: GDPR Compliance Validation](#test-category-4-gdpr-compliance-validation)
7. [Test Category 5: Multi-Language Testing](#test-category-5-multi-language-testing)
8. [Test Category 6: Rate Limiting Verification](#test-category-6-rate-limiting-verification)
9. [Test Category 7: Edge Cases & Error Scenarios](#test-category-7-edge-cases--error-scenarios)
10. [Test Category 8: Client-Side Integration](#test-category-8-client-side-integration)
11. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
12. [Test Results Template](#test-results-template)
13. [Appendix: Technical References](#appendix-technical-references)

---

## Overview & Purpose

### 🎯 Purpose

This manual test guide validates the **Anonymous Analytics System** implementation, which provides GDPR-compliant analytics tracking for users who withdraw consent. The system uses **legitimate interest** (GDPR Article 6(1)(f)) as legal basis for anonymous, aggregated analytics.

### 🔑 Key Features Being Tested

- ✅ Anonymous event tracking (view, click, share, QR scan)
- ✅ Automatic fallback when consent is withdrawn
- ✅ Firestore aggregation without personal data
- ✅ 26-month data retention with TTL
- ✅ Rate limiting for public endpoints
- ✅ Multi-language error messages
- ✅ Silent failure handling
- ✅ GDPR compliance (no PII)

### 📊 System Architecture

```
User (No Consent) → Client Service → Anonymous API → Server Service → Firestore
                                                                           ↓
                                                                     Aggregates
                                                                   (No PII, TTL)
```

**Legal Basis:** Legitimate interest (Article 6(1)(f) GDPR)
**Data Retention:** 26 months (CNIL compliant)
**Data Classification:** Anonymous aggregates only

---

## Prerequisites & Environment Setup

### 🔧 Required Access

- [ ] **Firebase Console Access**
  - Project: `tapit-dev-e0eed`
  - Required permissions: Firestore read/write
  - Collections: `Analytics_Anonymous`

- [ ] **Development Environment**
  - Local server running on `http://localhost:3000`
  - OR deployed environment URL

- [ ] **Browser Tools**
  - Chrome/Firefox DevTools
  - Network tab enabled
  - Console tab enabled
  - Preserve log enabled

- [ ] **Command Line Access**
  - `gcloud` CLI installed and authenticated
  - `firebase` CLI installed (optional)
  - `curl` or Postman for API testing

### 👤 Test Accounts

Create or use test accounts with the following configurations:

| Account | Email | Consent Status | Purpose |
|---------|-------|----------------|---------|
| Test User 1 | test-consent@example.com | All consents granted | Baseline comparison |
| Test User 2 | test-no-consent@example.com | All consents withdrawn | Primary test account |
| Test User 3 | test-partial@example.com | Basic only (no detailed) | Partial consent testing |

### 🌐 Environment Variables

Verify the following environment variables are set:

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_key_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tapit-dev-e0eed
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here

# Server-side
FIREBASE_PROJECT_ID=tapit-dev-e0eed
FIREBASE_CLIENT_EMAIL=your_service_account_email
```

### 📱 Browser Setup

1. **Clear Browser State**
   ```javascript
   // Open DevTools Console and run:
   localStorage.clear();
   sessionStorage.clear();
   // Then hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   ```

2. **Enable Console Logging**
   - Open DevTools (F12)
   - Go to Console tab
   - Enable "Preserve log"
   - Set log level to "Verbose"

3. **Network Tab Setup**
   - Open DevTools Network tab
   - Enable "Preserve log"
   - Filter by "Fetch/XHR"
   - Clear existing logs

### 🔥 Firebase Console Setup

1. Navigate to: https://console.firebase.google.com/project/tapit-dev-e0eed/firestore
2. Locate collections:
   - `Analytics_Anonymous/`
   - `Users/` (for consent verification)
3. Keep console open in separate tab for verification

---

## Test Category 1: Consent Withdrawal Scenarios

### Test 1.1: Withdraw Basic Analytics Consent

**Objective:** Verify that withdrawing basic analytics consent triggers anonymous tracking

**Prerequisites:**
- User logged in with all consents initially granted
- Profile is public and viewable

**Steps:**

1. **Navigate to Consent Settings**
   ```
   Dashboard → Account & Privacy → Privacy & Consents tab
   ```

2. **Locate Analytics Consent Toggle**
   - Find "Analytics Tracking" section
   - Current state should be: ✅ Enabled (green)

3. **Withdraw Consent**
   - Click the toggle to disable
   - Observe modal/confirmation (if any)
   - Click "Save" or confirm action

4. **Verify Consent State in Database**
   ```
   Firebase Console → Firestore → Users → [userId] → consents
   ```
   Expected document:
   ```json
   {
     "analytics_basic": {
       "status": false,
       "timestamp": "2025-11-20T...",
       "version": "1.0"
     }
   }
   ```

5. **Open a New Incognito Tab**
   - Navigate to your public profile: `http://localhost:3000/[username]`
   - Open DevTools Console (F12)
   - Observe console logs

**Expected Console Output:**

```javascript
📊 Analytics: No consent - tracking anonymously
[AnonymousAnalytics] ✅ Tracked view anonymously
```

**Expected Network Request:**

```http
POST /api/user/analytics/track-anonymous
Content-Type: application/json

{
  "eventType": "view"
}

Response 200 OK:
{
  "success": true,
  "tracked": "anonymous",
  "eventType": "view"
}
```

**Verification Checklist:**

- [ ] Consent toggle changed to OFF (❌ red/grey)
- [ ] Database shows `analytics_basic.status: false`
- [ ] Console shows "No consent - tracking anonymously"
- [ ] Network tab shows POST to `/api/user/analytics/track-anonymous`
- [ ] Response status: 200 OK
- [ ] Response contains `"tracked": "anonymous"`
- [ ] No 403 Forbidden errors
- [ ] No personal data (userId, username) in request body

**Firestore Verification:**

Navigate to: `Analytics_Anonymous/daily/dates/[YYYY-MM-DD]`

Expected document structure:
```json
{
  "date": "2025-11-20",
  "totalViews": 1,  // Incremented by 1
  "hourlyDistribution": {
    "14": 1  // Current hour incremented
  },
  "timestamp": Timestamp,
  "expireAt": Timestamp  // ~780 days from now
}
```

**Pass Criteria:**
✅ All checklist items verified
✅ Firestore document updated correctly
✅ No personal data in anonymous collection

---

### Test 1.2: Withdraw Detailed Analytics Consent

**Objective:** Verify that withdrawing detailed consent stops session tracking but allows basic anonymous tracking

**Prerequisites:**
- User has basic consent: ✅
- User has detailed consent: ✅
- User has cookies consent: ✅

**Steps:**

1. **Navigate to Consent Settings**
   ```
   Dashboard → Account & Privacy → Privacy & Consents tab
   ```

2. **Withdraw Only Detailed Analytics**
   - Leave "Analytics Tracking" (basic): ✅ ON
   - Toggle OFF "Detailed Analytics": ❌ OFF
   - Click "Save"

3. **Verify Consent State**
   ```
   Firebase Console → Users → [userId] → consents
   ```
   Expected:
   ```json
   {
     "analytics_basic": { "status": true },
     "analytics_detailed": { "status": false },
     "cookies_analytics": { "status": true }
   }
   ```

4. **Visit Public Profile (Incognito)**
   - Navigate to `http://localhost:3000/[username]`
   - Open DevTools Console

**Expected Console Output:**

```javascript
📊 Analytics: Tracking view for [username] ([userId]) [consent: basic]
✅ Analytics: View tracked via sendBeacon (basic mode)
```

**Expected Behavior:**

- ✅ **Basic tracking**: Profile views recorded
- ❌ **Session data**: NOT collected (no sessionId, no referrer, no UTM)
- ❌ **Time tracking**: NOT enabled (requires detailed consent)
- ✅ **Link clicks**: Tracked (linkType only, no specific URL)

**Network Request Verification:**

```http
POST /api/user/analytics/track-event
Content-Type: application/json

{
  "userId": "[userId]",
  "username": "[username]",
  "eventType": "view",
  "sessionData": null,  // ← NULL because detailed consent withdrawn
  "timestamp": "2025-11-20T..."
}
```

**Verification Checklist:**

- [ ] Basic analytics consent: ✅ ON
- [ ] Detailed analytics consent: ❌ OFF
- [ ] Database shows correct consent states
- [ ] Console shows "[consent: basic]"
- [ ] sessionData is NULL in request
- [ ] No session tracking in localStorage
- [ ] Profile views still recorded
- [ ] Link clicks tracked (type only)
- [ ] Time tracking NOT active

**Pass Criteria:**
✅ Basic tracking works
✅ Session data NOT collected
✅ User still identifiable (consented to basic)

---

### Test 1.3: Withdraw Analytics Cookies Consent

**Objective:** Verify that withdrawing cookies consent clears analytics session storage

**Prerequisites:**
- User has analytics cookies consent: ✅
- Session exists in localStorage: `analytics_session`

**Steps:**

1. **Verify Existing Session**
   ```javascript
   // DevTools Console
   localStorage.getItem('analytics_session')
   // Should return: "{sessionId: 'sess_...', startTime: ...}"
   ```

2. **Navigate to Consent Settings**
   ```
   Dashboard → Account & Privacy → Privacy & Consents tab
   ```

3. **Withdraw Analytics Cookies**
   - Toggle OFF "Analytics Cookies": ❌
   - Click "Save"

4. **Verify Session Cleared**
   ```javascript
   // DevTools Console
   localStorage.getItem('analytics_session')
   // Should return: null
   ```

**Expected Console Output:**

```javascript
📊 SessionManager: Session creation blocked (no cookies consent)
📊 SessionManager: Session cleared
```

**Verification Checklist:**

- [ ] Cookies consent withdrawn successfully
- [ ] localStorage.getItem('analytics_session') returns null
- [ ] Console shows "Session creation blocked"
- [ ] No new session created on page reload
- [ ] Existing session removed immediately
- [ ] User can still track anonymously if basic consent withdrawn

**Pass Criteria:**
✅ Session cleared immediately
✅ No new sessions created
✅ GDPR ePrivacy Directive compliance

---

### Test 1.4: Re-grant Consent After Withdrawal

**Objective:** Verify that re-granting consent restores full analytics functionality

**Prerequisites:**
- User has all consents withdrawn: ❌❌❌
- Anonymous tracking is currently active

**Steps:**

1. **Verify Current Anonymous Tracking**
   - Visit public profile (incognito)
   - Console should show: "No consent - tracking anonymously"

2. **Re-grant All Consents**
   ```
   Dashboard → Account & Privacy → Privacy & Consents tab
   ```
   - Toggle ON: Analytics Tracking ✅
   - Toggle ON: Detailed Analytics ✅
   - Toggle ON: Analytics Cookies ✅
   - Click "Save"

3. **Verify Consent State Updated**
   ```
   Firebase Console → Users → [userId] → consents
   ```
   All should have `status: true`

4. **Visit Public Profile Again (New Incognito Tab)**
   - Navigate to profile
   - Observe console logs

**Expected Console Output:**

```javascript
📊 Analytics: Tracking view for [username] ([userId]) [consent: detailed]
📊 SessionManager: Session created (sessionId: sess_...)
✅ Analytics: View tracked via sendBeacon (detailed mode)
```

**Expected Behavior:**

- ✅ Full analytics tracking restored
- ✅ Session data collected (sessionId, referrer, UTM)
- ✅ Time tracking enabled
- ✅ Personal analytics (userId, username) recorded
- ❌ Anonymous tracking NOT used

**Network Request Verification:**

```http
POST /api/user/analytics/track-event

{
  "userId": "[userId]",
  "username": "[username]",
  "eventType": "view",
  "sessionData": {  // ← Full session data now present
    "sessionId": "sess_...",
    "startTime": 1700000000000,
    "referrer": "...",
    "trafficSource": {...},
    "utm": {...}
  }
}
```

**Verification Checklist:**

- [ ] All consent toggles show ✅ ON
- [ ] Database shows all consents: `status: true`
- [ ] Console shows "[consent: detailed]"
- [ ] sessionData is PRESENT in request
- [ ] Session stored in localStorage
- [ ] Time tracking heartbeat active
- [ ] Personal analytics collection active
- [ ] NO requests to `/track-anonymous`

**Pass Criteria:**
✅ Full analytics functionality restored
✅ Session tracking works
✅ No anonymous tracking used

---

### Test 1.5: Multi-Tab Consent Synchronization

**Objective:** Verify that consent changes propagate across multiple browser tabs

**Prerequisites:**
- User logged in
- Two browser tabs open to the dashboard

**Steps:**

1. **Open Two Tabs**
   - Tab A: Dashboard → Account & Privacy
   - Tab B: Dashboard (any page)

2. **Withdraw Consent in Tab A**
   - Toggle OFF "Analytics Tracking"
   - Click "Save"
   - Observe confirmation

3. **Switch to Tab B (Do NOT Refresh)**
   - Observe UI changes
   - Check console for synchronization messages

4. **Visit Public Profile in Tab C (Incognito)**
   - Open new incognito tab
   - Navigate to public profile
   - Verify anonymous tracking is active

**Expected Console Output (Tab B):**

```javascript
🔄 Consent synchronization: Analytics consent updated
📊 Analytics: Consent withdrawn - switching to anonymous mode
```

**Verification Checklist:**

- [ ] Tab A shows consent withdrawn immediately
- [ ] Tab B reflects change without manual refresh
- [ ] Tab C (incognito) uses anonymous tracking
- [ ] All tabs show consistent consent state
- [ ] Database has single source of truth
- [ ] No race conditions or conflicts

**Pass Criteria:**
✅ Real-time synchronization works
✅ Consistent state across tabs

---

### Test 1.6: Consent State Persistence After Logout

**Objective:** Verify that consent preferences persist after user logs out and back in

**Prerequisites:**
- User logged in with specific consent configuration

**Steps:**

1. **Set Specific Consent Configuration**
   ```
   Analytics Tracking: ❌ OFF
   Detailed Analytics: ❌ OFF
   Analytics Cookies: ❌ OFF
   ```
   - Click "Save"

2. **Verify Configuration Saved**
   ```
   Firebase Console → Users → [userId] → consents
   ```

3. **Log Out**
   ```
   Dashboard → Log Out
   ```

4. **Log Back In**
   - Enter credentials
   - Navigate to Account & Privacy

5. **Verify Consent State Persisted**
   - All toggles should remain: ❌ OFF
   - Database should match UI state

**Verification Checklist:**

- [ ] Consent state saved before logout
- [ ] After login, all toggles show correct state
- [ ] Database matches UI state
- [ ] No reset to default values
- [ ] Anonymous tracking still active for this user
- [ ] No "force re-consent" prompt

**Pass Criteria:**
✅ Consent preferences persist across sessions
✅ No data loss on logout/login

---

## Test Category 2: Firestore Verification Procedures

### Test 2.1: Daily Aggregates Collection Structure

**Objective:** Verify correct structure of daily anonymous analytics aggregates

**Prerequisites:**
- At least one anonymous event tracked today
- Firebase Console access

**Steps:**

1. **Navigate to Firestore Collection**
   ```
   Firebase Console → Firestore Database
   → Analytics_Anonymous (collection)
   → daily (document)
   → dates (subcollection)
   → [YYYY-MM-DD] (document)
   ```

2. **Verify Document Exists**
   - Today's date document should exist
   - Example: `2025-11-20`

3. **Inspect Document Structure**

**Expected Document Structure:**

```json
{
  "date": "2025-11-20",
  "totalViews": 15,
  "totalClicks": 8,
  "totalShares": 2,
  "totalQRScans": 1,
  "hourlyDistribution": {
    "0": 0,
    "1": 0,
    "2": 0,
    ...
    "14": 15,  // Current hour has activity
    "15": 0,
    ...
    "23": 0
  },
  "linkTypeDistribution": {
    "linkedin": 5,
    "website": 2,
    "email": 1,
    "other": 0
  },
  "timestamp": Timestamp Nov 20, 2025 at 2:34:56 PM UTC,
  "expireAt": Timestamp Jul 15, 2027 at 11:59:59 PM UTC
}
```

**Field Validation:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `date` | string | ✅ | Format: YYYY-MM-DD |
| `totalViews` | number | ✅ | >= 0, integer |
| `totalClicks` | number | ✅ | >= 0, integer |
| `totalShares` | number | ✅ | >= 0, integer |
| `totalQRScans` | number | ✅ | >= 0, integer |
| `hourlyDistribution` | object | ✅ | 24 keys (0-23), all >= 0 |
| `linkTypeDistribution` | object | ✅ | Valid link types only |
| `timestamp` | Timestamp | ✅ | Recent date |
| `expireAt` | Timestamp | ✅ | ~780 days from `timestamp` |

**Verification Checklist:**

- [ ] Document exists for today's date
- [ ] All required fields present
- [ ] `date` field matches document ID
- [ ] `totalViews` is correct integer
- [ ] `hourlyDistribution` has 24 keys
- [ ] Current hour shows activity
- [ ] `linkTypeDistribution` has valid types only
- [ ] `timestamp` is recent
- [ ] `expireAt` is ~780 days from now (26 months)
- [ ] No personal data fields (userId, email, IP, etc.)

**No PII Verification:**

The following fields should **NOT** exist:
- ❌ `userId`
- ❌ `username`
- ❌ `email`
- ❌ `ip`
- ❌ `sessionId`
- ❌ `userAgent`
- ❌ `referrer` (specific URLs)
- ❌ `linkUrl` (specific URLs)

**Pass Criteria:**
✅ Document structure matches specification
✅ All counters are valid integers
✅ No personal data present
✅ expireAt field set correctly

---

### Test 2.2: Global Summary Updates

**Objective:** Verify that global summary aggregates update correctly

**Prerequisites:**
- Multiple anonymous events tracked
- Firebase Console access

**Steps:**

1. **Record Initial State**
   ```
   Firebase Console → Firestore
   → Analytics_Anonymous (collection)
   → global (document)
   → summary (subcollection)
   → totals (document)
   ```

   Record current values:
   ```json
   {
     "totalViews": 1234,
     "totalClicks": 567,
     "totalShares": 89,
     "totalQRScans": 12
   }
   ```

2. **Trigger Anonymous Events**
   - Open incognito tab (no consent)
   - Visit 3 different profiles (3 views)
   - Click 2 links (2 clicks)

3. **Verify Global Summary Updated**
   - Refresh Firestore console
   - Navigate back to `totals` document

**Expected Updated Values:**

```json
{
  "totalViews": 1237,      // +3
  "totalClicks": 569,      // +2
  "totalShares": 89,       // No change
  "totalQRScans": 12,      // No change
  "dailyStats": {
    "2025-11-20": {
      "views": 3,
      "clicks": 2,
      "shares": 0,
      "qrScans": 0
    },
    "2025-11-19": { ... }
  },
  "lastUpdated": Timestamp Nov 20, 2025 at 2:45:00 PM UTC
}
```

**Verification Checklist:**

- [ ] `totalViews` incremented by exact count (3)
- [ ] `totalClicks` incremented by exact count (2)
- [ ] Other counters unchanged
- [ ] `dailyStats` contains today's breakdown
- [ ] `lastUpdated` timestamp is recent
- [ ] No duplicate increments
- [ ] Atomic updates (no race conditions)

**Concurrent Update Test:**

1. Open 5 incognito tabs simultaneously
2. Visit same profile in all 5 tabs at once
3. Wait 5 seconds
4. Check `totalViews` counter

**Expected:** Counter should increment by exactly 5 (no lost updates)

**Pass Criteria:**
✅ Global counters accurate
✅ Daily breakdown correct
✅ Atomic updates verified
✅ No lost increments

---

### Test 2.3: Hourly Distribution Tracking

**Objective:** Verify that events are categorized by hour correctly

**Prerequisites:**
- Ability to track events at different times
- System time is correct

**Steps:**

1. **Track Events at Known Hour**
   - Note current hour (e.g., 14:00 = hour 14)
   - Track 5 anonymous view events
   - Wait for Firestore to update

2. **Verify Hourly Distribution**
   ```
   Firebase Console → Analytics_Anonymous/daily/dates/[today]
   ```

   Check `hourlyDistribution`:
   ```json
   {
     "hourlyDistribution": {
       "0": 0,
       ...
       "14": 5,  // ← Current hour should have 5 events
       "15": 0,
       ...
     }
   }
   ```

3. **Verify Other Hours Unchanged**
   - All other hours should remain at previous values
   - No "bleeding" into adjacent hours

**Edge Case: Hour Boundary Test**

1. Track event at 14:59:55 (5 seconds before hour change)
2. Wait 10 seconds (now 15:00:05)
3. Track another event
4. Verify:
   ```json
   {
     "14": X,    // First event counted here
     "15": Y     // Second event counted here
   }
   ```

**Verification Checklist:**

- [ ] Events tracked in correct hour bucket
- [ ] Hour key matches current UTC hour
- [ ] Previous hours unchanged
- [ ] Future hours remain 0
- [ ] Boundary transitions work correctly
- [ ] No timezone confusion (UTC only)

**Pass Criteria:**
✅ Hourly tracking accurate
✅ Boundary transitions correct
✅ UTC timezone used

---

### Test 2.4: Link Type Categorization

**Objective:** Verify that link clicks are categorized by type correctly

**Prerequisites:**
- Test profile with multiple link types
- Anonymous tracking active (no consent)

**Steps:**

1. **Create Test Profile with Various Links**
   - LinkedIn link
   - Website link
   - Email link
   - Custom link (should be "other")

2. **Track Anonymous Clicks**
   - Incognito tab (no consent)
   - Click LinkedIn link → Check Firestore
   - Click Website link → Check Firestore
   - Click Email link → Check Firestore

3. **Verify Link Type Distribution**
   ```
   Firebase Console → Analytics_Anonymous/daily/dates/[today]
   ```

   Check `linkTypeDistribution`:
   ```json
   {
     "linkTypeDistribution": {
       "linkedin": 1,
       "website": 1,
       "email": 1,
       "other": 0,
       "phone": 0,
       ...
     }
   }
   ```

**Valid Link Types** (from `anonymousAnalyticsConstants.js:29-45`):
- `linkedin`, `website`, `email`, `phone`
- `twitter`, `instagram`, `facebook`, `github`
- `youtube`, `tiktok`, `whatsapp`, `telegram`
- `discord`, `snapchat`, `twitch`, `other`

**Invalid Link Type Test:**

1. Manually call API with invalid linkType:
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": "click", "linkType": "invalid_type_xyz"}'
   ```

2. Check Firestore:
   ```json
   {
     "linkTypeDistribution": {
       "other": 1  // ← Should be normalized to "other"
     }
   }
   ```

**Verification Checklist:**

- [ ] Valid link types categorized correctly
- [ ] Invalid link types normalized to "other"
- [ ] No custom/unexpected keys in distribution
- [ ] All link types from constants file present (0 if unused)
- [ ] Case-insensitive matching works

**Pass Criteria:**
✅ Link types categorized accurately
✅ Invalid types handled gracefully
✅ No data corruption

---

### Test 2.5: Event Type Aggregation

**Objective:** Verify that different event types (view, click, share, QR scan) aggregate separately

**Prerequisites:**
- Anonymous tracking active
- Ability to trigger all event types

**Steps:**

1. **Record Initial Counters**
   ```
   Firebase Console → Analytics_Anonymous/daily/dates/[today]
   ```
   Note: `totalViews`, `totalClicks`, `totalShares`, `totalQRScans`

2. **Trigger Each Event Type**

   **View Event:**
   - Visit public profile (incognito, no consent)
   - Expected increment: `totalViews + 1`

   **Click Event:**
   - Click a link on profile (incognito, no consent)
   - Expected increment: `totalClicks + 1`

   **Share Event:**
   - Click share button (if anonymous tracking implemented)
   - Expected increment: `totalShares + 1`

   **QR Scan Event:**
   - Scan QR code (if anonymous tracking implemented)
   - Expected increment: `totalQRScans + 1`

3. **Verify Counters Updated Correctly**
   ```json
   {
     "totalViews": X + 1,
     "totalClicks": Y + 1,
     "totalShares": Z + 1,
     "totalQRScans": W + 1
   }
   ```

**Verification Checklist:**

- [ ] Each event type has separate counter
- [ ] Counters are independent (no cross-contamination)
- [ ] All counters increment atomically
- [ ] No counter decrements (only increments)
- [ ] Event types match constants: `ANONYMOUS_EVENT_TYPES`

**Pass Criteria:**
✅ Event types aggregate separately
✅ Counters are accurate
✅ No cross-contamination

---

### Test 2.6: No Personal Data Verification (Comprehensive)

**Objective:** Exhaustively verify that no personal data exists in anonymous analytics collection

**Prerequisites:**
- Firebase Console access
- Admin SDK access (optional, for automated scanning)

**Steps:**

1. **Manual Collection Scan**
   ```
   Firebase Console → Firestore → Analytics_Anonymous
   ```

   Browse through:
   - `Analytics_Anonymous/daily/dates/*` (all date documents)
   - `Analytics_Anonymous/global/summary/totals`

2. **Search for Forbidden Fields**

   The following fields should **NEVER** appear:

   **Personal Identifiers:**
   - ❌ `userId`
   - ❌ `username`
   - ❌ `email`
   - ❌ `displayName`
   - ❌ `phoneNumber`

   **Session Identifiers:**
   - ❌ `sessionId`
   - ❌ `fingerprint`
   - ❌ `deviceId`

   **Network Data:**
   - ❌ `ip` / `ipAddress`
   - ❌ `userAgent` (full string)
   - ❌ `referrer` (specific URLs)

   **Location Data:**
   - ❌ `geoLocation`
   - ❌ `latitude` / `longitude`
   - ❌ `city` / `country` (if identifiable)

   **Specific URLs:**
   - ❌ `linkUrl` (full URL)
   - ❌ `pageUrl` (full URL with query params)

3. **Allowed Aggregated Data Only**

   The following fields **ARE ALLOWED** (aggregated, non-identifying):

   ✅ `date` (YYYY-MM-DD)
   ✅ `totalViews`, `totalClicks`, `totalShares`, `totalQRScans` (counts only)
   ✅ `hourlyDistribution` (0-23 hours, counts only)
   ✅ `linkTypeDistribution` (categories: "linkedin", "website", etc.)
   ✅ `timestamp` (when document created)
   ✅ `expireAt` (TTL field)

**Automated Scan Script** (Optional):

```javascript
// Run in Firebase Functions or Admin SDK script
const forbiddenFields = [
  'userId', 'username', 'email', 'displayName', 'phoneNumber',
  'sessionId', 'fingerprint', 'deviceId',
  'ip', 'ipAddress', 'userAgent',
  'geoLocation', 'latitude', 'longitude',
  'linkUrl', 'pageUrl'
];

const snapshot = await db.collection('Analytics_Anonymous')
  .doc('daily')
  .collection('dates')
  .get();

snapshot.forEach(doc => {
  const data = doc.data();
  forbiddenFields.forEach(field => {
    if (field in data) {
      console.error(`❌ VIOLATION: Found '${field}' in ${doc.id}`);
    }
  });
});
```

**Verification Checklist:**

- [ ] No `userId` in any document
- [ ] No `username` in any document
- [ ] No `email` in any document
- [ ] No `sessionId` in any document
- [ ] No `ip` or `ipAddress` in any document
- [ ] No full `userAgent` strings
- [ ] No specific URLs (only types)
- [ ] No geolocation data
- [ ] Only aggregated counts present
- [ ] All data is anonymous and non-identifying

**GDPR Compliance Check:**

✅ **Data Minimization** (Article 5(1)(c)): Only necessary data collected
✅ **Purpose Limitation** (Article 5(1)(b)): Data used only for system monitoring
✅ **Storage Limitation** (Article 5(1)(e)): 26-month retention with TTL
✅ **Integrity & Confidentiality** (Article 5(1)(f)): No PII to protect

**Pass Criteria:**
✅ Zero personal data found
✅ Only aggregated metrics present
✅ GDPR Article 5 principles complied with

---

## Test Category 3: Data Retention & TTL Verification

### Test 3.1: ExpireAt Field Creation

**Objective:** Verify that every anonymous analytics document has an `expireAt` field for automatic deletion

**Prerequisites:**
- Anonymous event tracked today
- Firebase Console access

**Steps:**

1. **Track Anonymous Event**
   - Incognito tab, no consent
   - Visit public profile
   - Wait for Firestore update

2. **Verify ExpireAt Field Exists**
   ```
   Firebase Console → Analytics_Anonymous/daily/dates/[today]
   ```

   Check for `expireAt` field:
   ```json
   {
     "date": "2025-11-20",
     "totalViews": 1,
     ...
     "timestamp": Timestamp Nov 20, 2025 at 2:34:56 PM UTC,
     "expireAt": Timestamp Jul 15, 2027 at 11:59:59 PM UTC
   }
   ```

3. **Calculate Retention Period**
   ```javascript
   // In DevTools Console or Node.js
   const timestamp = new Date('2025-11-20T14:34:56Z');
   const expireAt = new Date('2027-07-15T23:59:59Z');
   const diffDays = (expireAt - timestamp) / (1000 * 60 * 60 * 24);
   console.log(`Retention: ${diffDays} days`);
   // Expected: ~780 days (26 months)
   ```

4. **Verify TTL Configuration**
   ```bash
   # Command line
   gcloud firestore fields ttls list --collection-group=dates

   # Expected output:
   # name: projects/tapit-dev-e0eed/databases/(default)/collectionGroups/dates/fields/expireAt
   # ttlConfig:
   #   state: ACTIVE
   ```

**Expected Values:**

| Field | Value |
|-------|-------|
| Field name | `expireAt` |
| Field type | Timestamp |
| Retention period | 780 days (26 months) |
| TTL state | ACTIVE |
| Collection group | `dates` |

**Calculation Validation:**

```javascript
// From AnonymousAnalyticsService.js:67-69
const expireAt = new Date();
expireAt.setDate(expireAt.getDate() + DATA_RETENTION.DAILY_DATA_DAYS);
// DATA_RETENTION.DAILY_DATA_DAYS = 26 * 30 = 780 days
```

**Verification Checklist:**

- [ ] `expireAt` field exists in document
- [ ] `expireAt` is a Firestore Timestamp type
- [ ] `expireAt` is ~780 days from `timestamp`
- [ ] TTL is configured on `dates` collection group
- [ ] TTL state is ACTIVE (not CREATING or FAILED)
- [ ] All new documents have `expireAt` field
- [ ] Old documents (if any) also have `expireAt`

**Pass Criteria:**
✅ ExpireAt field present and correct
✅ TTL configuration active
✅ 26-month retention verified

---

### Test 3.2: TTL Configuration Status

**Objective:** Verify that Firestore TTL is correctly configured and active

**Prerequisites:**
- `gcloud` CLI installed and authenticated
- Project ID: `tapit-dev-e0eed`

**Steps:**

1. **Check TTL Configuration**
   ```bash
   gcloud firestore fields ttls list \
     --project=tapit-dev-e0eed \
     --collection-group=dates
   ```

**Expected Output:**

```yaml
name: projects/tapit-dev-e0eed/databases/(default)/collectionGroups/dates/fields/expireAt
ttlConfig:
  state: ACTIVE
```

2. **Verify Field Details**
   ```bash
   gcloud firestore fields describe expireAt \
     --collection-group=dates \
     --project=tapit-dev-e0eed
   ```

**Expected Output:**

```yaml
name: projects/tapit-dev-e0eed/databases/(default)/collectionGroups/dates/fields/expireAt
ttlConfig:
  state: ACTIVE
```

3. **Check for Multiple Collection Groups** (Should only be `dates`)**
   ```bash
   gcloud firestore fields ttls list --project=tapit-dev-e0eed
   ```

   Only ONE TTL should be listed (for `dates` collection group)

**TTL States:**

| State | Meaning | Action Required |
|-------|---------|-----------------|
| `ACTIVE` | ✅ TTL is working | None - all good |
| `CREATING` | ⏳ TTL being set up | Wait for completion |
| `NEEDS_REPAIR` | ⚠️ TTL needs fixing | Run update command |
| `DISABLED` | ❌ TTL turned off | Enable TTL |
| (not listed) | ❌ TTL not configured | Configure TTL |

**Troubleshooting: If TTL is Not ACTIVE**

```bash
# Enable/update TTL
gcloud firestore fields ttls update expireAt \
  --collection-group=dates \
  --enable-ttl \
  --project=tapit-dev-e0eed

# Wait for operation to complete (can take several minutes)
# Check status again
gcloud firestore fields ttls list --collection-group=dates
```

**Verification Checklist:**

- [ ] `gcloud` command executes successfully
- [ ] TTL configuration exists
- [ ] Field name is `expireAt` (exact match)
- [ ] Collection group is `dates` (exact match)
- [ ] State is `ACTIVE`
- [ ] No errors or warnings in output
- [ ] Only one TTL configured (for `dates`)

**Pass Criteria:**
✅ TTL state is ACTIVE
✅ Configuration is correct
✅ No errors in gcloud output

---

### Test 3.3: 26-Month Retention Calculation Verification

**Objective:** Verify that the retention period is exactly 780 days (26 months) as per CNIL guidelines

**Prerequisites:**
- Access to codebase
- Calculator or JavaScript console

**Steps:**

1. **Verify Constant Definition**
   ```javascript
   // File: lib/services/serviceAnalytics/constants/anonymousAnalyticsConstants.js:66-71
   export const DATA_RETENTION = {
     DAILY_DATA_DAYS: 26 * 30,  // 780 days
     HOURLY_DATA_DAYS: 90,
     GLOBAL_SUMMARY_RETENTION: 'indefinite'
   };
   ```

2. **Verify Calculation in Service**
   ```javascript
   // File: lib/services/serviceUser/server/services/AnonymousAnalyticsService.js:67-69
   const expireAt = new Date();
   expireAt.setDate(expireAt.getDate() + DATA_RETENTION.DAILY_DATA_DAYS);
   // DATA_RETENTION.DAILY_DATA_DAYS = 780
   ```

3. **Test Calculation Manually**
   ```javascript
   // DevTools Console or Node.js
   const DAILY_DATA_DAYS = 26 * 30;
   console.log(`Retention days: ${DAILY_DATA_DAYS}`);  // 780

   const today = new Date('2025-11-20');
   const expireAt = new Date(today);
   expireAt.setDate(expireAt.getDate() + DAILY_DATA_DAYS);

   console.log(`Today: ${today.toISOString()}`);
   console.log(`Expire: ${expireAt.toISOString()}`);
   console.log(`Months: ${(expireAt - today) / (1000*60*60*24*30)}`);  // ~26
   ```

4. **Verify Against CNIL Guidelines**
   - CNIL recommendation: ≤ 26 months for audience analytics
   - Our retention: 780 days = 26 * 30 = 26 months ✅

**Mathematical Verification:**

```
Calculation:
-----------
26 months × 30 days/month = 780 days
780 days ÷ 365 days/year = 2.137 years
2.137 years × 12 months/year = 25.64 months ≈ 26 months

Actual Implementation:
---------------------
const expireAt = new Date();
expireAt.setDate(expireAt.getDate() + 780);

Example:
--------
Start: November 20, 2025
+780 days = July 15, 2027 (or July 14, depending on leap years)

Leap year adjustment:
2024: Leap year (+1 day)
2025: Not leap year
2026: Not leap year
2027: Not leap year
Result: ~780 days (exactly 26 months)
```

**CNIL Compliance Reference:**

> **CNIL Recommendation:** Audience measurement data should be retained for a maximum of **26 months** to balance statistical significance with privacy principles.
>
> Source: CNIL Guidelines on Cookies and Tracking Technologies (2020)

**Verification Checklist:**

- [ ] Constant `DAILY_DATA_DAYS` equals 780
- [ ] Calculation: `26 * 30 = 780` is correct
- [ ] Code uses `DATA_RETENTION.DAILY_DATA_DAYS`
- [ ] expireAt calculated as: today + 780 days
- [ ] Retention period ≤ 26 months (CNIL compliant)
- [ ] No hardcoded magic numbers in service code

**Pass Criteria:**
✅ Retention exactly 780 days
✅ CNIL 26-month guideline met
✅ Calculation is correct and documented

---

### Test 3.4: Automated Deletion Verification (Future Date Test)

**Objective:** Verify that documents with expired `expireAt` are automatically deleted by Firestore TTL

**Prerequisites:**
- Firebase admin access
- Ability to create test documents
- Understanding of TTL mechanics

**Important Note:**
> Firestore TTL deletion is **not instantaneous**. Documents are typically deleted within **72 hours** after the `expireAt` timestamp. This test verifies the mechanism, not real-time deletion.

**Steps:**

1. **Create Test Document with Past ExpireAt** (Requires Admin SDK)**
   ```javascript
   // Node.js script with Firebase Admin SDK
   const admin = require('firebase-admin');
   admin.initializeApp();
   const db = admin.firestore();

   // Create test document with expireAt in the past
   const testDocRef = db
     .collection('Analytics_Anonymous')
     .doc('daily')
     .collection('dates')
     .doc('test-ttl-2023-01-01');

   await testDocRef.set({
     date: '2023-01-01',
     totalViews: 999,
     timestamp: admin.firestore.Timestamp.now(),
     expireAt: admin.firestore.Timestamp.fromDate(
       new Date('2023-01-01')  // Far in the past
     )
   });

   console.log('Test document created with past expireAt');
   ```

2. **Wait for TTL Deletion**
   - Firestore TTL runs **daily** (approximately)
   - Check document after 24-72 hours

3. **Verify Document Deleted**
   ```bash
   # Check if document still exists after 72 hours
   # Firebase Console → Analytics_Anonymous/daily/dates/test-ttl-2023-01-01
   # Should return: "Document does not exist"
   ```

**Alternative: Verify Existing Old Data**

If historical data exists (older than 780 days):

1. Check for documents with dates > 780 days ago
   ```
   Firebase Console → Analytics_Anonymous/daily/dates/
   ```

2. Look for documents from 2023 or earlier (if today is 2025)

3. These should be automatically deleted within 72 hours of their `expireAt`

**Verification Checklist:**

- [ ] TTL configuration is ACTIVE
- [ ] Test document created with past `expireAt`
- [ ] Document exists immediately after creation
- [ ] After 24-72 hours, document is deleted
- [ ] No manual deletion required
- [ ] Deletion is automatic and silent

**Limitations:**

⚠️ **TTL Deletion Timing:**
- Not guaranteed to be instant
- Typically within 24-72 hours
- Best-effort service by Firestore
- Cannot be forced or accelerated

**Pass Criteria:**
✅ TTL mechanism is active
✅ Documents with past expireAt are eventually deleted
✅ Deletion is automatic (no manual intervention)

---

## Test Category 4: GDPR Compliance Validation

### Test 4.1: No PII in Anonymous Collection (Comprehensive Scan)

**Objective:** Exhaustively verify that zero personal data exists in the anonymous analytics system

**Prerequisites:**
- Firebase Console access
- Understanding of GDPR Article 4(1) - Definition of Personal Data

**GDPR Definition of Personal Data:**

> Any information relating to an **identified or identifiable natural person** ('data subject'); an identifiable natural person is one who can be identified, directly or indirectly, particularly by reference to an identifier such as a name, an identification number, location data, an online identifier or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural or social identity of that natural person.

**Steps:**

1. **Review All Anonymous Collections**
   ```
   Firebase Console → Analytics_Anonymous/
   ```

   Collections to scan:
   - `daily/dates/*` (all date documents)
   - `global/summary/totals` (global aggregates)

2. **Forbidden Data Categories**

   **Category 1: Direct Identifiers** (Must be absent)
   - ❌ Full name
   - ❌ Email address
   - ❌ Phone number
   - ❌ Government ID numbers
   - ❌ Social security numbers
   - ❌ Passport numbers

   **Category 2: Online Identifiers** (Must be absent)
   - ❌ IP addresses (full or partial)
   - ❌ Device IDs
   - ❌ Cookie identifiers
   - ❌ Session IDs
   - ❌ User IDs
   - ❌ Account names/usernames
   - ❌ Advertising IDs

   **Category 3: Location Data** (Must be absent)
   - ❌ GPS coordinates
   - ❌ Street addresses
   - ❌ Zip/postal codes (full)
   - ❌ Geolocation data
   - ❌ IP-based location

   **Category 4: Behavioral Data** (Must be absent)
   - ❌ Browsing history (specific URLs)
   - ❌ Search queries
   - ❌ Clickstream data (user-specific)
   - ❌ Session recordings
   - ❌ Heatmap data (user-specific)

   **Category 5: Device/Browser Data** (Must be absent)
   - ❌ Full User-Agent strings
   - ❌ Screen resolution (when combined with other data)
   - ❌ Browser fingerprints
   - ❌ Font lists
   - ❌ Plugin lists

3. **Allowed Aggregated Data** (Non-identifying)

   ✅ **Aggregated counts only:**
   - Total views (all users combined)
   - Total clicks (all users combined)
   - Hourly distribution (counts, no user IDs)
   - Link type categories (not specific URLs)

   ✅ **Temporal data:**
   - Date (YYYY-MM-DD)
   - Hour (0-23, aggregate only)
   - Timestamp (document creation time)

   ✅ **Category data:**
   - Link types ("linkedin", "website", etc.)
   - Event types ("view", "click", etc.)

4. **Scan Each Document**

   For every document in `Analytics_Anonymous/daily/dates/*`:

   ```json
   // ✅ GOOD: Only aggregated, non-identifying data
   {
     "date": "2025-11-20",
     "totalViews": 150,
     "hourlyDistribution": { "14": 25, "15": 30 },
     "linkTypeDistribution": { "linkedin": 10, "website": 5 }
   }

   // ❌ BAD: Contains identifying data
   {
     "date": "2025-11-20",
     "views": [
       { "userId": "abc123", "timestamp": "..." },  // ← PII!
       { "userId": "def456", "timestamp": "..." }   // ← PII!
     ]
   }
   ```

**Anonymization Techniques Verified:**

✅ **Aggregation:** Individual events combined into totals
✅ **Suppression:** Personal identifiers removed entirely
✅ **Generalization:** Specific data → categories (URL → linkType)
✅ **Data minimization:** Only necessary fields collected

**Verification Checklist:**

- [ ] No `userId` fields anywhere
- [ ] No `email` fields anywhere
- [ ] No `username` fields anywhere
- [ ] No `sessionId` fields anywhere
- [ ] No IP addresses (full or partial)
- [ ] No device IDs or fingerprints
- [ ] No specific URLs (only types)
- [ ] No geolocation data
- [ ] No full User-Agent strings
- [ ] Only aggregated counts present
- [ ] Data cannot re-identify individuals
- [ ] Even with auxiliary data, re-identification is impossible

**Re-identification Test:**

Question: "Can I identify a specific user from this data?"

```json
{
  "date": "2025-11-20",
  "totalViews": 150,
  "hourlyDistribution": { "14": 25 }
}
```

Answer: **NO**
- No user-specific data
- Cannot determine who the 25 views came from
- Cannot link to other datasets
- Cannot re-identify with auxiliary information

**Pass Criteria:**
✅ Zero personal data found
✅ Re-identification impossible
✅ GDPR Article 4(1) compliance verified

---

### Test 4.2: Legitimate Interest Legal Basis Verification

**Objective:** Verify that anonymous analytics tracking complies with GDPR Article 6(1)(f) - Legitimate Interest

**Prerequisites:**
- Understanding of GDPR legal bases
- Access to privacy policy documentation

**GDPR Article 6(1)(f) - Legitimate Interest:**

> Processing is lawful if: "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data, in particular where the data subject is a child."

**Three-Part Test for Legitimate Interest:**

**Part 1: Purpose Test** ✅
- **Question:** Do we have a legitimate interest?
- **Answer:** YES - System monitoring and service improvement
- **Justification:** Understanding platform usage patterns is necessary for:
  - Service optimization
  - System reliability monitoring
  - Security and fraud prevention
  - Business analytics (aggregate trends)

**Part 2: Necessity Test** ✅
- **Question:** Is data processing necessary for this purpose?
- **Answer:** YES - But ONLY anonymous aggregates are necessary
- **Evidence:**
  - Personal data is NOT necessary (users withdrew consent)
  - Aggregate metrics sufficient for system monitoring
  - No alternative less intrusive method exists for system health monitoring

**Part 3: Balancing Test** ✅
- **Question:** Do user rights override our legitimate interest?
- **Answer:** NO - User rights are protected
- **Evidence:**
  - Zero personal data collected (see Test 4.1)
  - No privacy risk (anonymous aggregates)
  - User explicitly withdrew consent (their rights respected)
  - Transparent about anonymous tracking (privacy policy)
  - Minimal data collected (only what's necessary)

**Steps:**

1. **Verify Privacy Policy Documentation**

   Check that privacy policy includes:
   ```markdown
   ## Anonymous Analytics (Legitimate Interest)

   When you withdraw analytics consent, we collect anonymous, aggregated
   analytics for system monitoring purposes under GDPR Article 6(1)(f) -
   Legitimate Interest.

   **What we collect:**
   - Anonymous view counts (no user identification)
   - Anonymous click counts (link types only, no specific URLs)
   - Date and time aggregates (hourly distribution)

   **What we DO NOT collect:**
   - Your user ID
   - Your username
   - Your email address
   - Your IP address
   - Session identifiers
   - Specific URLs you visit

   **Legal basis:** Legitimate interest in system monitoring and service improvement.

   **Your rights:** You can object to this processing by contacting us at privacy@weavink.com
   ```

2. **Verify Documentation in Code**
   ```javascript
   // File: lib/services/serviceAnalytics/constants/anonymousAnalyticsConstants.js:1-8
   /**
    * Anonymous Analytics Constants
    *
    * Constants for anonymous, aggregated analytics tracking when users withdraw consent.
    * GDPR Compliant: No personal data, legitimate interest basis (Article 6(1)(f))
    *
    * @module anonymousAnalyticsConstants
    */
   ```

3. **Verify API Endpoint Comments**
   ```javascript
   // File: app/api/user/analytics/track-anonymous/route.js:1-7
   /**
    * Anonymous Analytics Tracking API Route
    *
    * PUBLIC ENDPOINT (no authentication required)
    * Legal basis: Legitimate interest (GDPR Article 6(1)(f))
    * ...
    */
   ```

**Verification Checklist:**

- [ ] Privacy policy documents legitimate interest
- [ ] Privacy policy explains what data is collected
- [ ] Privacy policy explains what data is NOT collected
- [ ] Users informed about anonymous tracking
- [ ] Right to object is provided
- [ ] Contact email for objections provided
- [ ] Code comments reference GDPR Article 6(1)(f)
- [ ] Three-part test satisfied:
  - [ ] Legitimate interest exists (system monitoring)
  - [ ] Processing is necessary (no alternative method)
  - [ ] User rights do not override (no PII, low risk)

**Legitimate Interest Assessment (LIA) Record:**

| Element | Assessment |
|---------|------------|
| **Purpose** | System monitoring, service improvement, security |
| **Necessity** | Anonymous aggregates necessary, personal data is not |
| **User Rights** | Protected - zero PII collected |
| **Risk to Users** | Minimal - cannot re-identify individuals |
| **Transparency** | Clear documentation in privacy policy |
| **Opt-Out** | Right to object provided via email |
| **Conclusion** | Legitimate interest justified ✅ |

**Pass Criteria:**
✅ Three-part test satisfied
✅ Privacy policy compliant
✅ Article 6(1)(f) requirements met

---

### Test 4.3: Data Minimization Verification (Article 5(1)(c))

**Objective:** Verify that only the minimum necessary data is collected for anonymous analytics

**GDPR Article 5(1)(c) - Data Minimization:**

> Personal data shall be "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed ('data minimisation')."

**Steps:**

1. **Define Purpose**
   - **Purpose:** System monitoring and aggregate usage statistics
   - **NOT Purpose:** User profiling, targeted advertising, tracking individuals

2. **Identify Minimum Required Data**

   For system monitoring, we need:
   - ✅ Event type (view, click, share, qr_scan) - **Necessary**
   - ✅ Date (YYYY-MM-DD) - **Necessary** for temporal trends
   - ✅ Hour (0-23) - **Necessary** for load distribution
   - ✅ Link type category - **Necessary** for link performance
   - ✅ Aggregate counts - **Necessary** for usage metrics

   We do NOT need:
   - ❌ User ID - **Not necessary** (aggregate only)
   - ❌ Username - **Not necessary** (aggregate only)
   - ❌ IP address - **Not necessary** (no user tracking)
   - ❌ Session ID - **Not necessary** (no session analysis)
   - ❌ Specific URLs - **Not necessary** (types sufficient)
   - ❌ Referrer - **Not necessary** (no attribution)
   - ❌ User-Agent - **Not necessary** (no device profiling)

3. **Verify Implementation Matches Minimum**

   Check API request payload:
   ```javascript
   // Client: lib/services/serviceUser/client/services/AnonymousAnalyticsService.js:42-44
   {
     "eventType": "view"  // Only event type, nothing else!
   }
   ```

   Check server storage:
   ```javascript
   // Server: lib/services/serviceUser/server/services/AnonymousAnalyticsService.js:67-89
   {
     "date": "2025-11-20",         // ✅ Necessary
     "totalViews": FieldValue.increment(1),  // ✅ Necessary
     "hourlyDistribution.14": FieldValue.increment(1),  // ✅ Necessary
     "timestamp": FieldValue.serverTimestamp(),  // ✅ Necessary
     "expireAt": new Date(...)     // ✅ Necessary (for deletion)
   }
   ```

**Data Minimization Checklist:**

For each field, ask: "Is this field necessary for system monitoring?"

| Field | Necessary? | Justification |
|-------|-----------|---------------|
| `eventType` | ✅ YES | Distinguish views, clicks, shares, QR scans |
| `date` | ✅ YES | Temporal trends, daily aggregates |
| `hour` | ✅ YES | Load distribution, peak hours |
| `linkType` | ✅ YES | Link performance by category |
| `totalViews` | ✅ YES | Usage volume |
| `timestamp` | ✅ YES | Document creation time |
| `expireAt` | ✅ YES | Automatic deletion (privacy) |
| `userId` | ❌ NO | Not needed for aggregates |
| `username` | ❌ NO | Not needed for aggregates |
| `sessionId` | ❌ NO | Not tracking sessions |
| `ip` | ❌ NO | Not needed for system monitoring |
| `referrer` | ❌ NO | Not needed for basic analytics |
| `userAgent` | ❌ NO | Not profiling devices |
| `linkUrl` | ❌ NO | Link types are sufficient |

**Verification Steps:**

- [ ] Review all fields in anonymous collection
- [ ] Each field has clear justification
- [ ] No "nice to have" fields (only necessary)
- [ ] No fields for future use (YAGNI principle)
- [ ] No redundant data
- [ ] Absolute minimum for stated purpose

**Comparison: Personal vs Anonymous Analytics**

| Data Point | Personal Analytics (With Consent) | Anonymous Analytics (No Consent) |
|------------|-----------------------------------|----------------------------------|
| User ID | ✅ Collected | ❌ Not collected |
| Username | ✅ Collected | ❌ Not collected |
| Session data | ✅ Collected | ❌ Not collected |
| Referrer | ✅ Collected | ❌ Not collected |
| UTM params | ✅ Collected | ❌ Not collected |
| Specific URLs | ✅ Collected | ❌ Not collected (types only) |
| Event counts | ✅ Collected | ✅ Collected (aggregate) |

**Pass Criteria:**
✅ Every field is necessary
✅ No extraneous data collected
✅ Article 5(1)(c) compliance verified

---

### Test 4.4: Storage Limitation Compliance (Article 5(1)(e))

**Objective:** Verify that anonymous analytics data is not kept longer than necessary

**GDPR Article 5(1)(e) - Storage Limitation:**

> Personal data shall be "kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which the personal data are processed."

**Note:** While anonymous data is technically not "personal data", we apply this principle proactively for privacy best practices.

**Steps:**

1. **Verify Retention Period is Justified**

   **Our retention:** 26 months (780 days)

   **Justification:**
   - Industry standard: Google Analytics retains data for 26 months
   - CNIL recommendation: ≤ 26 months for audience measurement
   - Statistical significance: 2+ years allows year-over-year comparison
   - Business need: Long-term trend analysis
   - Reasonable expectation: Users expect historical data for dashboards

   **Alternative retention periods considered:**
   - ❌ 12 months: Too short for year-over-year analysis
   - ❌ 36 months: Exceeds CNIL guidelines
   - ✅ 26 months: Balanced approach

2. **Verify Automatic Deletion Mechanism**

   Check that TTL is configured (see Test 3.2):
   ```bash
   gcloud firestore fields ttls list --collection-group=dates
   # Expected: state: ACTIVE
   ```

3. **Verify No "Indefinite" Retention**

   Global summary has different retention:
   ```javascript
   // File: anonymousAnalyticsConstants.js:80-83
   export const DATA_RETENTION = {
     DAILY_DATA_DAYS: 26 * 30,  // 780 days - Deleted
     HOURLY_DATA_DAYS: 90,       // 90 days - Deleted
     GLOBAL_SUMMARY_RETENTION: 'indefinite'  // Totals only, no dates
   };
   ```

   **Justification for indefinite global summary:**
   - ✅ Only totals (no temporal data)
   - ✅ Cannot link to specific dates or users
   - ✅ Used for system-wide statistics
   - ✅ Truly anonymous (see Test 4.1)

4. **Verify Deletion Process**

   - **Automatic:** Firestore TTL handles deletion (no manual process)
   - **Guaranteed:** expireAt field on every document
   - **Irreversible:** Deleted data cannot be recovered
   - **Auditable:** Deletion logs in Firestore audit logs (if enabled)

**Verification Checklist:**

- [ ] Retention period: 780 days (26 months)
- [ ] Retention period is justified (CNIL compliance)
- [ ] TTL is configured and ACTIVE
- [ ] Every document has expireAt field
- [ ] Deletion is automatic (no manual intervention)
- [ ] Global summary retention is justified
- [ ] No documents older than 780 days exist
- [ ] Deletion is irreversible (privacy by design)

**Retention Period Validation:**

```javascript
// Check oldest document in collection
// Firebase Console → Analytics_Anonymous/daily/dates/

// Sort by date ascending
// Oldest document should be ≤ 780 days old

const oldestDate = new Date('2025-11-20');  // Oldest doc found
const today = new Date();
const ageDays = (today - oldestDate) / (1000 * 60 * 60 * 24);

console.log(`Oldest document age: ${ageDays} days`);
// Expected: ≤ 780 days
```

**Pass Criteria:**
✅ Retention period justified and documented
✅ Automatic deletion active
✅ Article 5(1)(e) principles applied

---

## Test Category 5: Multi-Language Testing

### Test 5.1: Error Messages in All 5 Languages

**Objective:** Verify that anonymous analytics error messages are translated correctly in all supported languages

**Prerequisites:**
- Translation files exist for: en, fr, es, ch (zh), vm (vi)
- Translation keys added to all files (Phase 3.1)

**Supported Languages:**

| Code | Language | File |
|------|----------|------|
| `en` | English | `/public/locales/en/common.json` |
| `fr` | French | `/public/locales/fr/common.json` |
| `es` | Spanish | `/public/locales/es/common.json` |
| `ch` | Chinese (Simplified) | `/public/locales/ch/common.json` |
| `vm` | Vietnamese | `/public/locales/vm/common.json` |

**Translation Keys** (from Phase 3.1):

```json
{
  "analytics": {
    "errors": {
      "invalid_event_type": "...",
      "rate_limit_exceeded": "...",
      "database_error": "...",
      "invalid_link_type": "...",
      "missing_parameters": "..."
    }
  }
}
```

**Steps:**

1. **Test Invalid Event Type Error - English**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -H "Accept-Language: en" \
     -d '{"eventType": "invalid_type", "language": "en"}'
   ```

   **Expected Response:**
   ```json
   {
     "error": "Invalid event type"
   }
   ```

2. **Test Invalid Event Type Error - French**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -H "Accept-Language: fr" \
     -d '{"eventType": "invalid_type", "language": "fr"}'
   ```

   **Expected Response:**
   ```json
   {
     "error": "Type d'événement invalide"
   }
   ```

3. **Test Invalid Event Type Error - Spanish**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -H "Accept-Language: es" \
     -d '{"eventType": "invalid_type", "language": "es"}'
   ```

   **Expected Response:**
   ```json
   {
     "error": "Tipo de evento inválido"
   }
   ```

4. **Test Invalid Event Type Error - Chinese**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -H "Accept-Language: zh" \
     -d '{"eventType": "invalid_type", "language": "ch"}'
   ```

   **Expected Response:**
   ```json
   {
     "error": "无效的事件类型"
   }
   ```

5. **Test Invalid Event Type Error - Vietnamese**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -H "Accept-Language: vi" \
     -d '{"eventType": "invalid_type", "language": "vm"}'
   ```

   **Expected Response:**
   ```json
   {
     "error": "Loại sự kiện không hợp lệ"
   }
   ```

**Complete Translation Matrix:**

| Error Key | English | French | Spanish | Chinese | Vietnamese |
|-----------|---------|--------|---------|---------|------------|
| `invalid_event_type` | Invalid event type | Type d'événement invalide | Tipo de evento inválido | 无效的事件类型 | Loại sự kiện không hợp lệ |
| `rate_limit_exceeded` | Too many requests. Please try again later | Trop de requêtes. Veuillez réessayer plus tard | Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde | 请求过多。请稍后再试 | Quá nhiều yêu cầu. Vui lòng thử lại sau |
| `database_error` | An error occurred while saving analytics data | Une erreur s'est produite lors de l'enregistrement des données analytiques | Ocurrió un error al guardar los datos analíticos | 保存分析数据时发生错误 | Đã xảy ra lỗi khi lưu dữ liệu phân tích |
| `invalid_link_type` | Invalid link type | Type de lien invalide | Tipo de enlace inválido | 无效的链接类型 | Loại liên kết không hợp lệ |
| `missing_parameters` | Missing required parameters | Paramètres requis manquants | Faltan parámetros requeridos | 缺少必需的参数 | Thiếu tham số bắt buộc |

**Verification Checklist:**

For each language:
- [ ] `invalid_event_type` translates correctly
- [ ] `rate_limit_exceeded` translates correctly
- [ ] `database_error` translates correctly
- [ ] `invalid_link_type` translates correctly
- [ ] `missing_parameters` translates correctly
- [ ] No English fallback (language-specific message)
- [ ] Special characters render correctly (é, ñ, 无, etc.)
- [ ] Message is grammatically correct
- [ ] Message is culturally appropriate

**Pass Criteria:**
✅ All 5 languages translate correctly
✅ No English fallbacks
✅ Special characters display properly

---

### Test 5.2: Console Output Verification Per Language

**Objective:** Verify that console logs show anonymous tracking messages in development mode

**Prerequisites:**
- Development environment running
- Browser DevTools open

**Steps:**

1. **English Console Output**
   - User language: English
   - Withdraw consent
   - Visit public profile (incognito)

   **Expected Console:**
   ```javascript
   📊 Analytics: No consent - tracking anonymously
   [AnonymousAnalytics] ✅ Tracked view anonymously
   ```

2. **French Console Output**

   Currently console logs are in English only (not localized).
   This is acceptable for development logs.

   **Expected:** Same as English (development logs)

**Verification Checklist:**

- [ ] Console shows "No consent - tracking anonymously"
- [ ] Console shows success message
- [ ] Console logs are clear and helpful
- [ ] No error logs appear
- [ ] Logs include emoji indicators (📊 ✅ ❌)

**Note:** Console logs are typically not localized (development/debugging feature).
User-facing error messages (API responses) ARE localized (see Test 5.1).

**Pass Criteria:**
✅ Console logs are clear and consistent
✅ API errors are localized properly

---

## Test Category 6: Rate Limiting Verification

### Test 6.1: Rapid Request Testing

**Objective:** Verify that rate limiting protects the anonymous analytics endpoint from abuse

**Prerequisites:**
- Anonymous analytics endpoint: `/api/user/analytics/track-anonymous`
- Rate limits configured (from `anonymousAnalyticsConstants.js:54-58`):
  ```javascript
  ANONYMOUS_RATE_LIMITS = {
    REQUESTS_PER_MINUTE: 100,
    REQUESTS_PER_HOUR: 1000,
    REQUESTS_PER_DAY: 10000
  }
  ```

**Steps:**

1. **Send Rapid Requests (Within Limit)**
   ```bash
   # Send 50 requests quickly (within 100/min limit)
   for i in {1..50}; do
     curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
       -H "Content-Type: application/json" \
       -d '{"eventType": "view"}' &
   done
   wait
   ```

   **Expected:** All requests return 200 OK

2. **Send Requests Exceeding Limit**
   ```bash
   # Send 150 requests quickly (exceeds 100/min limit)
   for i in {1..150}; do
     curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
       -H "Content-Type: application/json" \
       -d '{"eventType": "view"}' \
       -s -w "\n%{http_code}" &
   done | grep -E "^(200|429)$" | sort | uniq -c
   ```

   **Expected Output:**
   ```
   100 200  ← First 100 requests succeed
   50 429   ← Next 50 requests rate limited
   ```

3. **Verify Rate Limit Response**
   ```bash
   # After exceeding limit
   curl -v -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": "view"}'
   ```

   **Expected Response:**
   ```http
   HTTP/1.1 429 Too Many Requests
   Retry-After: 60
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: 1700000060
   Content-Type: application/json

   {
     "error": "Too many requests. Please try again later",
     "retryAfter": 60,
     "resetTime": 1700000060
   }
   ```

**Verification Checklist:**

- [ ] First 100 requests/minute succeed (200 OK)
- [ ] Requests beyond 100/min are rate limited (429)
- [ ] Response includes `Retry-After` header
- [ ] Response includes `X-RateLimit-Remaining` header
- [ ] Response includes `X-RateLimit-Reset` header
- [ ] Error message is user-friendly
- [ ] Rate limit resets after specified time

**Pass Criteria:**
✅ Rate limiting is active
✅ Limits are enforced correctly
✅ Headers provide useful information

---

### Test 6.2: Rate Limit Header Validation

**Objective:** Verify that rate limit headers provide accurate information

**Prerequisites:**
- Rate limiting is active (Test 6.1 passed)

**Steps:**

1. **Send Single Request**
   ```bash
   curl -v -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": "view"}'
   ```

2. **Inspect Response Headers**

   **Expected Headers:**
   ```http
   X-RateLimit-Remaining: 99  ← 100 - 1 = 99 remaining
   X-RateLimit-Reset: 1700000060  ← Unix timestamp of reset time
   ```

3. **Send 10 More Requests**
   ```bash
   for i in {1..10}; do
     curl -v -X POST http://localhost:3000/api/user/analytics/track-anonymous \
       -H "Content-Type: application/json" \
       -d '{"eventType": "view"}' 2>&1 | grep -E "X-RateLimit-Remaining"
   done
   ```

   **Expected Output:**
   ```
   X-RateLimit-Remaining: 89  ← Decrements with each request
   X-RateLimit-Remaining: 88
   X-RateLimit-Remaining: 87
   ...
   ```

4. **Verify Reset Time Accuracy**
   ```bash
   # Get reset time from header
   RESET_TIME=$(curl -s -D - -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": "view"}' | grep X-RateLimit-Reset | awk '{print $2}')

   # Convert to human-readable
   date -d @$RESET_TIME
   # Expected: ~60 seconds from now
   ```

**Verification Checklist:**

- [ ] `X-RateLimit-Remaining` header present
- [ ] `X-RateLimit-Remaining` decrements correctly
- [ ] `X-RateLimit-Reset` header present
- [ ] `X-RateLimit-Reset` is valid Unix timestamp
- [ ] Reset time is reasonable (~60 seconds)
- [ ] Headers consistent across requests

**Pass Criteria:**
✅ Headers are accurate
✅ Clients can use headers to avoid rate limits

---

### Test 6.3: 429 Error Handling (Client-Side)

**Objective:** Verify that client-side code handles 429 errors gracefully (silent failure)

**Prerequisites:**
- Rate limit exceeded (Test 6.1)

**Steps:**

1. **Trigger Rate Limit**
   ```bash
   # Exceed rate limit
   for i in {1..150}; do
     curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
       -H "Content-Type: application/json" \
       -d '{"eventType": "view"}' &
   done
   ```

2. **Open Browser (Incognito, No Consent)**
   - Visit public profile
   - Open DevTools Console

3. **Observe Console Output**

   **Expected Console (Silent Failure):**
   ```javascript
   📊 Analytics: No consent - tracking anonymously
   ⚠️ Analytics: Server returned error: 429
   ```

   **No user-visible errors:**
   - ❌ No alert() popups
   - ❌ No error modals
   - ❌ No broken UI
   - ✅ Page loads normally
   - ✅ User can interact with page

4. **Verify Client Code**
   ```javascript
   // File: lib/services/serviceUser/client/services/AnonymousAnalyticsService.js:53-58
   catch (error) {
     // Silent fail - analytics failures should never break user experience
     if (process.env.NODE_ENV === 'development') {
       console.warn('[AnonymousAnalytics] ❌ Failed to track:', error);
     }
   }
   ```

**Verification Checklist:**

- [ ] 429 error does NOT break user experience
- [ ] No visible error messages to user
- [ ] Page loads and functions normally
- [ ] Console shows warning (development mode only)
- [ ] Production mode: completely silent
- [ ] No alert() or modal dialogs
- [ ] Tracking failure is non-blocking

**Pass Criteria:**
✅ Silent failure implemented correctly
✅ User experience unaffected by analytics errors

---

### Test 6.4: Retry-After Header Verification

**Objective:** Verify that clients can use Retry-After header to retry requests

**Prerequisites:**
- Rate limit exceeded (429 response)

**Steps:**

1. **Get Retry-After Value**
   ```bash
   curl -v -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": "view"}' 2>&1 | grep Retry-After
   ```

   **Expected:**
   ```
   Retry-After: 60
   ```

2. **Wait for Retry-After Duration**
   ```bash
   echo "Waiting 60 seconds..."
   sleep 60
   ```

3. **Retry Request**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": "view"}'
   ```

   **Expected:** 200 OK (rate limit reset)

**Verification Checklist:**

- [ ] Retry-After header is present in 429 response
- [ ] Retry-After value is reasonable (60 seconds)
- [ ] After waiting, request succeeds (200 OK)
- [ ] Rate limit counter resets properly

**Pass Criteria:**
✅ Retry-After header is accurate
✅ Clients can retry successfully after waiting

---

## Test Category 7: Edge Cases & Error Scenarios

### Test 7.1: Invalid Event Types

**Objective:** Verify proper handling of invalid event types

**Steps:**

1. **Empty Event Type**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": ""}'
   ```

   **Expected:** 400 Bad Request, error message

2. **Null Event Type**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": null}'
   ```

   **Expected:** 400 Bad Request

3. **Numeric Event Type**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": 12345}'
   ```

   **Expected:** 400 Bad Request

4. **SQL Injection Attempt**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": "view; DROP TABLE users; --"}'
   ```

   **Expected:** 400 Bad Request, no database corruption

5. **XSS Attempt**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": "<script>alert(1)</script>"}'
   ```

   **Expected:** 400 Bad Request, no XSS executed

**Verification Checklist:**

- [ ] Empty strings rejected
- [ ] Null values rejected
- [ ] Non-string types rejected
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] Only valid event types accepted
- [ ] Error messages are safe (no script execution)

**Pass Criteria:**
✅ All invalid inputs rejected safely
✅ No security vulnerabilities

---

### Test 7.2: Missing Parameters

**Objective:** Verify handling of missing required parameters

**Steps:**

1. **Completely Empty Body**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

   **Expected:** 400 Bad Request, "Missing required parameters"

2. **Missing eventType**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"linkType": "linkedin"}'
   ```

   **Expected:** 400 Bad Request

3. **Valid eventType, Invalid linkType for Click Event**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": "click"}'
   ```

   **Expected:** 200 OK (linkType normalized to "other")

**Verification Checklist:**

- [ ] Empty body rejected
- [ ] Missing eventType rejected
- [ ] Missing optional parameters handled gracefully
- [ ] Error messages are helpful

**Pass Criteria:**
✅ Required parameters enforced
✅ Optional parameters handled gracefully

---

### Test 7.3: Network Failures (Silent Failure)

**Objective:** Verify client-side handling of network failures

**Steps:**

1. **Simulate Offline Mode**
   - Open browser (incognito, no consent)
   - Open DevTools → Network tab
   - Enable "Offline" mode
   - Visit public profile

   **Expected:**
   - Page loads (cached or shows offline message)
   - Console: "❌ Failed to track anonymous view: NetworkError"
   - No user-facing errors
   - No broken UI

2. **Simulate Slow Network (Timeout)**
   - DevTools → Network tab
   - Throttle to "Slow 3G"
   - Visit public profile

   **Expected:**
   - Analytics tracking may timeout
   - User experience unaffected
   - Page loads (even if analytics fails)

**Verification Checklist:**

- [ ] Offline mode doesn't break page
- [ ] Console shows error (development only)
- [ ] Production mode is silent
- [ ] Page loads and functions normally
- [ ] No blocking requests

**Pass Criteria:**
✅ Network failures handled gracefully
✅ User experience unaffected

---

### Test 7.4: Malformed Requests

**Objective:** Verify server handling of malformed JSON and HTTP requests

**Steps:**

1. **Invalid JSON**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d 'invalid json {'
   ```

   **Expected:** 400 Bad Request

2. **Wrong Content-Type**
   ```bash
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: text/plain" \
     -d '{"eventType": "view"}'
   ```

   **Expected:** 400 Bad Request or 415 Unsupported Media Type

3. **GET Request (Should be POST)**
   ```bash
   curl -X GET http://localhost:3000/api/user/analytics/track-anonymous
   ```

   **Expected:** 405 Method Not Allowed

**Verification Checklist:**

- [ ] Invalid JSON rejected
- [ ] Wrong Content-Type rejected
- [ ] GET requests rejected (405)
- [ ] PUT/PATCH/DELETE rejected (405)
- [ ] Only POST requests accepted

**Pass Criteria:**
✅ Malformed requests rejected safely
✅ Appropriate error codes returned

---

### Test 7.5: Server Errors (500)

**Objective:** Verify client-side handling of server errors

**Prerequisites:**
- Ability to simulate server error (e.g., database down)

**Steps:**

1. **Simulate Database Error** (Requires Admin Access)
   - Temporarily revoke Firestore write permissions
   - OR inject error in service code

2. **Trigger Anonymous Event**
   - Visit public profile (incognito, no consent)

3. **Observe Behavior**

   **Expected Console (Development):**
   ```javascript
   📊 Analytics: No consent - tracking anonymously
   ❌ Analytics: Server returned error: 500
   [AnonymousAnalytics] ❌ Failed to track view: Internal Server Error
   ```

   **Expected User Experience:**
   - ✅ Page loads normally
   - ✅ No error messages shown to user
   - ✅ All features work (analytics is non-critical)

4. **Verify Error Response**
   ```bash
   # With database error simulated
   curl -X POST http://localhost:3000/api/user/analytics/track-anonymous \
     -H "Content-Type: application/json" \
     -d '{"eventType": "view"}'
   ```

   **Expected:**
   ```json
   HTTP/1.1 500 Internal Server Error
   {
     "error": "Internal server error"
     // No stack trace or sensitive info exposed
   }
   ```

**Verification Checklist:**

- [ ] Server errors don't break user experience
- [ ] Console shows error (development only)
- [ ] Production mode: no stack traces exposed
- [ ] Error messages are generic (no sensitive info)
- [ ] Page loads normally despite error
- [ ] Analytics failure is non-blocking

**Pass Criteria:**
✅ Server errors handled gracefully
✅ No sensitive information leaked
✅ User experience unaffected

---

## Test Category 8: Client-Side Integration

### Test 8.1: TrackAnalyticsService Integration

**Objective:** Verify that TrackAnalyticsService correctly falls back to anonymous tracking when consent is withdrawn

**Prerequisites:**
- User with consent withdrawn
- Browser with DevTools open

**Steps:**

1. **Verify Service Integration**

   Check code:
   ```javascript
   // File: lib/services/serviceUser/client/services/TrackAnalyticsService.js:294-298
   if (!hasAnalyticsConsent(userConsents, 'basic')) {
     console.log('📊 Analytics: No consent - tracking anonymously');
     await AnonymousAnalyticsService.trackAnonymousView();
     return;
   }
   ```

2. **Test View Tracking**
   - Visit public profile (incognito, no consent)
   - Observe console

   **Expected Console:**
   ```javascript
   📊 Analytics: No consent - tracking anonymously
   [AnonymousAnalytics] ✅ Tracked view anonymously
   ```

3. **Test Click Tracking**
   - Click a link on profile (incognito, no consent)
   - Observe console

   **Expected Console:**
   ```javascript
   📊 Analytics: No consent - tracking click anonymously
   [AnonymousAnalytics] ✅ Tracked linkedin click anonymously
   ```

**Verification Checklist:**

- [ ] TrackAnalyticsService checks consent
- [ ] When no consent: calls AnonymousAnalyticsService
- [ ] When consent exists: uses personal analytics
- [ ] No duplicate tracking (either personal OR anonymous, not both)
- [ ] Console logs are clear
- [ ] Integration is seamless

**Pass Criteria:**
✅ Fallback to anonymous tracking works
✅ No duplicate tracking
✅ Clear console logs

---

### Test 8.2: AnonymousAnalyticsService Fallback

**Objective:** Verify that AnonymousAnalyticsService is used as intended when consent is absent

**Steps:**

1. **Direct Service Call Test**
   ```javascript
   // Browser DevTools Console
   import { AnonymousAnalyticsService } from '@/lib/services/serviceUser/client/services/AnonymousAnalyticsService';

   await AnonymousAnalyticsService.trackAnonymousView();
   // Expected console: "✅ Tracked view anonymously"
   ```

2. **Verify Service Methods Exist**
   ```javascript
   // Browser DevTools Console
   console.log(typeof AnonymousAnalyticsService.trackAnonymousView);  // "function"
   console.log(typeof AnonymousAnalyticsService.trackAnonymousClick);  // "function"
   console.log(typeof AnonymousAnalyticsService.trackAnonymousShare);  // "function"
   console.log(typeof AnonymousAnalyticsService.trackAnonymousQRScan);  // "function"
   ```

**Verification Checklist:**

- [ ] AnonymousAnalyticsService is importable
- [ ] All methods exist and are callable
- [ ] Methods return Promises
- [ ] Silent failure on error
- [ ] No external dependencies (self-contained)

**Pass Criteria:**
✅ Service is fully functional
✅ All methods work independently

---

### Test 8.3: Silent Failure Handling

**Objective:** Verify that analytics failures never break the user experience

**Steps:**

1. **Test with Invalid API URL**
   ```javascript
   // Temporarily modify AnonymousAnalyticsService.js
   // Change API URL to invalid endpoint
   fetch('/api/user/analytics/INVALID_ENDPOINT', {...})
   ```

   **Expected:**
   - Console warning (development mode)
   - No user-facing errors
   - Page loads normally

2. **Test with Network Error**
   - Enable offline mode in DevTools
   - Trigger anonymous tracking

   **Expected:**
   - Console warning (development mode)
   - No user-facing errors
   - Page loads normally

3. **Test with CORS Error** (if applicable)
   - Trigger tracking from different origin

   **Expected:**
   - Console CORS error (development mode)
   - No user-facing errors
   - Page loads normally

**Verification Checklist:**

- [ ] Network errors don't break UI
- [ ] Server errors don't break UI
- [ ] Invalid responses don't break UI
- [ ] Errors logged to console (development only)
- [ ] Production mode is silent
- [ ] User can still interact with page
- [ ] No alert() or modal dialogs

**Pass Criteria:**
✅ All errors are handled silently
✅ User experience never impacted

---

### Test 8.4: sendBeacon vs fetch Fallback

**Objective:** Verify that sendBeacon is used with fetch as fallback

**Prerequisites:**
- Modern browser with sendBeacon support

**Steps:**

1. **Verify sendBeacon Usage**
   ```javascript
   // File: lib/services/serviceUser/client/services/AnonymousAnalyticsService.js:84-95

   if (navigator.sendBeacon) {
     const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
     const sent = navigator.sendBeacon('/api/user/analytics/track-anonymous', blob);

     if (sent) {
       // Success
     } else {
       // Fallback to fetch
     }
   } else {
     // Fallback to fetch
   }
   ```

2. **Test in Modern Browser**
   - Open Chrome/Firefox (has sendBeacon)
   - Visit profile (no consent)
   - Check Network tab

   **Expected:**
   - Request sent via sendBeacon (Type: "beacon")
   - No XHR/fetch request

3. **Test Fallback** (Requires Code Modification)
   ```javascript
   // Temporarily disable sendBeacon
   navigator.sendBeacon = null;
   ```

   - Visit profile (no consent)
   - Check Network tab

   **Expected:**
   - Request sent via fetch
   - Type: "fetch" or "xhr"

**Verification Checklist:**

- [ ] sendBeacon is used when available
- [ ] fetch is used as fallback
- [ ] keepalive flag set on fetch (persistent)
- [ ] Both methods work correctly
- [ ] No double-sends (sendBeacon then fetch)

**Pass Criteria:**
✅ sendBeacon used preferentially
✅ fetch fallback works
✅ Requests are reliable

---

## Common Issues & Troubleshooting

### Issue 1: "Firebase permission denied" error

**Symptoms:**
- Console error: `FirebaseError: Missing or insufficient permissions`
- Anonymous events not recorded
- 500 error from API

**Root Cause:**
- Firestore security rules not configured
- Service account lacks write permissions
- Collection doesn't exist

**Resolution:**

1. **Check Firestore Rules**
   ```javascript
   // Firebase Console → Firestore → Rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /Analytics_Anonymous/{document=**} {
         allow write: if true;  // Allow server-side writes
         allow read: if request.auth != null;  // Admin only
       }
     }
   }
   ```

2. **Verify Service Account Permissions**
   ```bash
   # Check service account has Firestore Admin role
   gcloud projects get-iam-policy tapit-dev-e0eed \
     --flatten="bindings[].members" \
     --filter="bindings.role:roles/datastore.user"
   ```

3. **Create Collection Manually** (if needed)
   ```
   Firebase Console → Firestore → Start collection
   Collection ID: Analytics_Anonymous
   Document ID: daily
   Field: initialized = true
   ```

**Code Reference:** `lib/services/serviceUser/server/services/AnonymousAnalyticsService.js:75-89`

---

### Issue 2: "Rate limit exceeded" for single request

**Symptoms:**
- First request of the day returns 429
- User hasn't exceeded limit
- Rate limit resets immediately

**Root Cause:**
- Rate limiter cache not clearing
- IP address mismatch (proxy/load balancer)
- Clock skew (server time incorrect)

**Resolution:**

1. **Check Rate Limiter Configuration**
   ```javascript
   // File: lib/rateLimiter.js
   // Verify limits are correct
   ```

2. **Clear Rate Limiter Cache**
   ```bash
   # If using Redis
   redis-cli FLUSHALL

   # If using in-memory
   # Restart server
   npm run dev
   ```

3. **Check Server Time**
   ```bash
   date
   # Should be accurate (use NTP)
   ```

4. **Verify IP Address Detection**
   ```javascript
   // File: lib/rateLimiter.js
   // Check X-Forwarded-For header handling
   const ip = request.headers.get('x-forwarded-for') || request.ip;
   ```

**Code Reference:** `lib/rateLimiter.js` (rate limiting logic)

---

### Issue 3: TTL not deleting old documents

**Symptoms:**
- Documents older than 780 days still exist
- expireAt field is present
- TTL shows ACTIVE

**Root Cause:**
- TTL deletion is delayed (up to 72 hours)
- expireAt field format incorrect
- TTL configuration needs repair

**Resolution:**

1. **Verify TTL Configuration**
   ```bash
   gcloud firestore fields ttls list --collection-group=dates
   # Expected: state: ACTIVE
   ```

2. **Check expireAt Field Type**
   ```
   Firebase Console → Analytics_Anonymous/daily/dates/[doc]
   # expireAt should be type: Timestamp (not string/number)
   ```

3. **Repair TTL** (if needed)
   ```bash
   gcloud firestore fields ttls update expireAt \
     --collection-group=dates \
     --enable-ttl
   ```

4. **Wait for Deletion** (24-72 hours)
   - TTL deletion is not instant
   - Check again after 72 hours

**Code Reference:** `lib/services/serviceUser/server/services/AnonymousAnalyticsService.js:67-69`

---

### Issue 4: Console shows personal data in anonymous tracking

**Symptoms:**
- Console log shows userId or username
- Anonymous API called but personal data visible
- Firestore has personal data in Analytics_Anonymous

**Root Cause:**
- Code modification introduced PII
- Debugging code left in production
- Incorrect service called

**Resolution:**

1. **Verify Console Logs**
   ```javascript
   // Should show:
   📊 Analytics: No consent - tracking anonymously

   // Should NOT show:
   📊 Analytics: Tracking for userId: abc123  ← WRONG!
   ```

2. **Check API Request**
   ```javascript
   // DevTools → Network tab → track-anonymous request
   // Body should be:
   { "eventType": "view" }

   // Should NOT include:
   { "eventType": "view", "userId": "abc123" }  ← WRONG!
   ```

3. **Verify Service Code**
   ```javascript
   // File: lib/services/serviceUser/client/services/AnonymousAnalyticsService.js:42-44
   body: JSON.stringify({
     eventType: ANONYMOUS_EVENT_TYPES.VIEW
     // ← No userId, username, email, etc.
   })
   ```

4. **Check Firestore Data**
   ```
   Firebase Console → Analytics_Anonymous/daily/dates/[today]
   # Should NOT contain: userId, username, email, sessionId, ip
   ```

**Code Reference:**
- `lib/services/serviceUser/client/services/AnonymousAnalyticsService.js:35-60`
- `lib/services/serviceUser/server/services/AnonymousAnalyticsService.js:45-100`

---

### Issue 5: Translations not working (English fallback)

**Symptoms:**
- All error messages in English regardless of language
- Translation keys not found
- Missing translations in common.json

**Root Cause:**
- Translation keys not added to all 5 languages
- Translation service not finding keys
- Language code mismatch

**Resolution:**

1. **Verify Translation Keys Exist**
   ```bash
   # Check all 5 files
   grep -r "invalid_event_type" public/locales/*/common.json

   # Expected: 5 matches (en, fr, es, ch, vm)
   ```

2. **Check Translation Path**
   ```javascript
   // Should be:
   analytics.errors.invalid_event_type

   // File structure:
   {
     "analytics": {
       "errors": {
         "invalid_event_type": "..."
       }
     }
   }
   ```

3. **Verify Language Code**
   ```javascript
   // Code uses: "ch" for Chinese
   // Translation file: /public/locales/ch/common.json
   // Make sure they match!
   ```

4. **Test Translation Service**
   ```javascript
   // File: app/api/user/analytics/track-anonymous/route.js:31-37
   const errorMessage = await getTranslatedError(
     ANONYMOUS_ERRORS.INVALID_EVENT_TYPE,
     userLanguage
   );
   ```

**Code Reference:**
- `/public/locales/{en,fr,es,ch,vm}/common.json:838-844` (English)
- `app/api/user/analytics/track-anonymous/route.js:31-37`

---

### Issue 6: Anonymous tracking not firing when consent withdrawn

**Symptoms:**
- User withdraws consent
- No console logs appear
- Network tab shows no anonymous requests
- Firestore not updated

**Root Cause:**
- Service integration not working
- Code not checking consent correctly
- Service import error

**Resolution:**

1. **Check Console for Errors**
   ```javascript
   // DevTools Console
   // Look for import errors or service errors
   ```

2. **Verify Service Import**
   ```javascript
   // File: lib/services/serviceUser/client/services/TrackAnalyticsService.js:31
   import { AnonymousAnalyticsService } from './AnonymousAnalyticsService';
   ```

3. **Check Consent Check Logic**
   ```javascript
   // File: TrackAnalyticsService.js:294-298
   if (!hasAnalyticsConsent(userConsents, 'basic')) {
     console.log('📊 Analytics: No consent - tracking anonymously');
     await AnonymousAnalyticsService.trackAnonymousView();
     return;  // ← Important: return here!
   }
   ```

4. **Test Service Directly**
   ```javascript
   // Browser DevTools Console
   import { AnonymousAnalyticsService } from '@/lib/services/serviceUser/client/services/AnonymousAnalyticsService';
   await AnonymousAnalyticsService.trackAnonymousView();
   // Should show: "✅ Tracked view anonymously"
   ```

5. **Check Build Output**
   ```bash
   # Rebuild project
   npm run build
   # Look for compilation errors
   ```

**Code Reference:**
- `lib/services/serviceUser/client/services/TrackAnalyticsService.js:294-298, 361-365`
- `lib/services/serviceUser/client/services/AnonymousAnalyticsService.js:35-60`

---

## Test Results Template

Use this template to record your test results:

```markdown
# Anonymous Analytics Manual Test Results

**Tester:** [Your Name]
**Date:** [YYYY-MM-DD]
**Environment:** [Development / Staging / Production]
**Browser:** [Chrome/Firefox/Safari] [Version]

---

## Test Category 1: Consent Withdrawal Scenarios

### Test 1.1: Withdraw Basic Analytics Consent
- [ ] PASS / [ ] FAIL
- **Notes:** _______________________________
- **Issues:** _______________________________

### Test 1.2: Withdraw Detailed Analytics Consent
- [ ] PASS / [ ] FAIL
- **Notes:** _______________________________

### Test 1.3: Withdraw Analytics Cookies Consent
- [ ] PASS / [ ] FAIL
- **Notes:** _______________________________

### Test 1.4: Re-grant Consent After Withdrawal
- [ ] PASS / [ ] FAIL
- **Notes:** _______________________________

### Test 1.5: Multi-Tab Consent Synchronization
- [ ] PASS / [ ] FAIL
- **Notes:** _______________________________

### Test 1.6: Consent State Persistence After Logout
- [ ] PASS / [ ] FAIL
- **Notes:** _______________________________

---

## Test Category 2: Firestore Verification Procedures

### Test 2.1: Daily Aggregates Collection Structure
- [ ] PASS / [ ] FAIL
- **Firestore Document ID:** _______________________________
- **Notes:** _______________________________

### Test 2.2: Global Summary Updates
- [ ] PASS / [ ] FAIL
- **Initial totalViews:** _______ **Final totalViews:** _______
- **Notes:** _______________________________

### Test 2.3: Hourly Distribution Tracking
- [ ] PASS / [ ] FAIL
- **Hour tested:** _______ **Count:** _______
- **Notes:** _______________________________

### Test 2.4: Link Type Categorization
- [ ] PASS / [ ] FAIL
- **Link types tested:** _______________________________
- **Notes:** _______________________________

### Test 2.5: Event Type Aggregation
- [ ] PASS / [ ] FAIL
- **Notes:** _______________________________

### Test 2.6: No Personal Data Verification
- [ ] PASS / [ ] FAIL
- **PII found:** [ ] YES (FAIL) / [ ] NO (PASS)
- **Details:** _______________________________

---

## Test Category 3: Data Retention & TTL Verification

### Test 3.1: ExpireAt Field Creation
- [ ] PASS / [ ] FAIL
- **expireAt value:** _______________________________
- **Retention days:** _______________________________

### Test 3.2: TTL Configuration Status
- [ ] PASS / [ ] FAIL
- **TTL state:** _______________________________
- **gcloud output:** _______________________________

### Test 3.3: 26-Month Retention Calculation
- [ ] PASS / [ ] FAIL
- **Calculated retention:** _______ days
- **Expected:** 780 days

### Test 3.4: Automated Deletion Verification
- [ ] PASS / [ ] FAIL / [ ] PENDING (waiting 72 hours)
- **Notes:** _______________________________

---

## Test Category 4: GDPR Compliance Validation

### Test 4.1: No PII in Anonymous Collection
- [ ] PASS / [ ] FAIL
- **PII found:** [ ] YES (FAIL) / [ ] NO (PASS)
- **Details:** _______________________________

### Test 4.2: Legitimate Interest Legal Basis
- [ ] PASS / [ ] FAIL
- **Documentation complete:** [ ] YES / [ ] NO
- **Notes:** _______________________________

### Test 4.3: Data Minimization Verification
- [ ] PASS / [ ] FAIL
- **Unnecessary fields found:** _______________________________

### Test 4.4: Storage Limitation Compliance
- [ ] PASS / [ ] FAIL
- **Retention period:** _______ days
- **TTL active:** [ ] YES / [ ] NO

---

## Test Category 5: Multi-Language Testing

### Test 5.1: Error Messages in All 5 Languages
- [ ] English: PASS / FAIL
- [ ] French: PASS / FAIL
- [ ] Spanish: PASS / FAIL
- [ ] Chinese: PASS / FAIL
- [ ] Vietnamese: PASS / FAIL

### Test 5.2: Console Output Verification
- [ ] PASS / [ ] FAIL
- **Notes:** _______________________________

---

## Test Category 6: Rate Limiting Verification

### Test 6.1: Rapid Request Testing
- [ ] PASS / [ ] FAIL
- **Requests sent:** _______ **Success:** _______ **Rate limited:** _______

### Test 6.2: Rate Limit Header Validation
- [ ] PASS / [ ] FAIL
- **X-RateLimit-Remaining:** _______
- **X-RateLimit-Reset:** _______

### Test 6.3: 429 Error Handling (Client-Side)
- [ ] PASS / [ ] FAIL
- **User experience affected:** [ ] YES (FAIL) / [ ] NO (PASS)

### Test 6.4: Retry-After Header Verification
- [ ] PASS / [ ] FAIL
- **Retry-After value:** _______

---

## Test Category 7: Edge Cases & Error Scenarios

### Test 7.1: Invalid Event Types
- [ ] PASS / [ ] FAIL
- **Tests completed:** _______________________________

### Test 7.2: Missing Parameters
- [ ] PASS / [ ] FAIL
- **Notes:** _______________________________

### Test 7.3: Network Failures (Silent Failure)
- [ ] PASS / [ ] FAIL
- **User experience affected:** [ ] YES (FAIL) / [ ] NO (PASS)

### Test 7.4: Malformed Requests
- [ ] PASS / [ ] FAIL
- **Notes:** _______________________________

### Test 7.5: Server Errors (500)
- [ ] PASS / [ ] FAIL
- **User experience affected:** [ ] YES (FAIL) / [ ] NO (PASS)

---

## Test Category 8: Client-Side Integration

### Test 8.1: TrackAnalyticsService Integration
- [ ] PASS / [ ] FAIL
- **Fallback working:** [ ] YES / [ ] NO

### Test 8.2: AnonymousAnalyticsService Fallback
- [ ] PASS / [ ] FAIL
- **Notes:** _______________________________

### Test 8.3: Silent Failure Handling
- [ ] PASS / [ ] FAIL
- **User experience affected:** [ ] YES (FAIL) / [ ] NO (PASS)

### Test 8.4: sendBeacon vs fetch Fallback
- [ ] PASS / [ ] FAIL
- **sendBeacon used:** [ ] YES / [ ] NO
- **Notes:** _______________________________

---

## Summary

**Total Tests:** 38
**Passed:** _______
**Failed:** _______
**Pending:** _______

**Overall Status:** [ ] PASS / [ ] FAIL

**Critical Issues:** _______________________________
_______________________________

**Minor Issues:** _______________________________
_______________________________

**Recommendations:** _______________________________
_______________________________

---

## Sign-Off

**Tested by:** _______________________________
**Date:** _______________________________
**Signature:** _______________________________

**Reviewed by:** _______________________________
**Date:** _______________________________
**Signature:** _______________________________
```

---

## Appendix: Technical References

### File Paths & Line Numbers

| File | Purpose | Key Lines |
|------|---------|-----------|
| `lib/services/serviceAnalytics/constants/anonymousAnalyticsConstants.js` | Constants definition | All |
| `lib/services/serviceUser/server/services/AnonymousAnalyticsService.js` | Server-side aggregation | 45-100 |
| `app/api/user/analytics/track-anonymous/route.js` | Public API endpoint | 27-246 |
| `lib/services/serviceUser/client/services/AnonymousAnalyticsService.js` | Client-side service | 35-236 |
| `lib/services/serviceUser/client/services/TrackAnalyticsService.js` | Main analytics service | 294-298, 361-365 |
| `lib/services/analyticsService.js` | Deprecated service (backward compatibility) | 115-119, 149-153 |

### API Endpoints

| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `/api/user/analytics/track-anonymous` | POST | ❌ No | Anonymous event tracking |
| `/api/user/analytics/track-event` | POST | ❌ No (checks consent) | Personal analytics tracking |
| `/api/user/privacy/consent` | GET/POST | ✅ Yes | Consent management |

### Firestore Collections

| Collection Path | Purpose | TTL |
|-----------------|---------|-----|
| `Analytics_Anonymous/daily/dates/{YYYY-MM-DD}` | Daily aggregates | 780 days |
| `Analytics_Anonymous/global/summary/totals` | Global totals | Indefinite |

### gcloud Commands

```bash
# List TTL configurations
gcloud firestore fields ttls list --project=tapit-dev-e0eed

# Enable TTL for dates collection
gcloud firestore fields ttls update expireAt \
  --collection-group=dates \
  --enable-ttl \
  --project=tapit-dev-e0eed

# Check TTL status
gcloud firestore fields describe expireAt \
  --collection-group=dates \
  --project=tapit-dev-e0eed
```

### Related Documentation

- [ANONYMOUS_ANALYTICS_PLAN.md](../admin/ANONYMOUS_ANALYTICS_PLAN.md) - Technical specification
- [RGPD_TESTING_GUIDE.md](../rgpd/RGPD_TESTING_GUIDE.md) - GDPR compliance testing
- [ACCOUNT_PRIVACY_TESTING_GUIDE.md](../rgpd/ACCOUNT_PRIVACY_TESTING_GUIDE.md) - Consent testing patterns
- [RATE_LIMIT_TESTING.md](./RATE_LIMIT_TESTING.md) - Rate limiting verification

---

**End of Manual Test Guide**

*Document Version: 1.0.0*
*Last Updated: 2025-11-20*
*Estimated Test Duration: 4-6 hours (comprehensive)*
*Estimated Test Duration: 1-2 hours (critical tests only)*
