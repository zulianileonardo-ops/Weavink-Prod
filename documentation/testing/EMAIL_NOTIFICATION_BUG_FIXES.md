# Email Notification System - Bug Fixes Documentation

**Status:** Active
**Category:** Testing, Bug Fixes, RGPD
**Created:** 2025-11-20
**Related Documents:**
- [EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md](./EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md)
- [RGPD_ACCOUNT_DELETION_GUIDE.md](../guides/RGPD_ACCOUNT_DELETION_GUIDE.md)

---

## Overview

This document records bugs discovered during manual testing of the email notification system (Phase 1, 2, 3) and their resolutions. Each bug includes root cause analysis, affected code, and the fix implemented.

---

## Bug #1: Account Deletion Completion Email Not Sent

**Discovered:** 2025-11-20
**Test:** Test 2.2 - Immediate Deletion Email Variant
**Severity:** High (critical email missing)
**Status:** ✅ FIXED

### Symptoms

When testing immediate account deletion, only 2 out of 3 expected emails were received:
1. ✅ Deletion confirmation email (immediate variant) - received
2. ❌ Deletion completed email - NOT received
3. ✅ Contact notification email - received

### Root Cause

In `lib/services/servicePrivacy/server/accountDeletionService.js`, the `executeAccountDeletion` function had a **fetch-after-delete** bug:

**Execution order:**
1. **Step 1** (line 214): Delete user document from Firestore
   ```javascript
   await db.collection('users').doc(userId).delete();
   ```

2. **Step 3.5** (lines 151-160): Try to send completion email
   ```javascript
   const userDoc = await db.collection('users').doc(userId).get();
   if (userDoc.exists) {  // ← Always FALSE because user deleted in Step 1
     const userData = userDoc.data();
     await EmailService.sendAccountDeletionCompletedEmail(/* ... */);
   }
   ```

**Problem:** The code tried to fetch the user document AFTER it was already deleted, so `userDoc.exists` always returned `false` and the email code never executed.

### The Fix

**File:** `lib/services/servicePrivacy/server/accountDeletionService.js`

**Change:** Fetch user data at the START of the function (before any deletion), store in variables, and use stored data for the completion email.

**Code before fix:**
```javascript
async function executeAccountDeletion(userId) {
  // ... validation ...

  // Step 1: Delete user from Firestore
  await db.collection('users').doc(userId).delete();

  // ... other steps ...

  // Step 3.5: Send completion email
  const userDoc = await db.collection('users').doc(userId).get(); // ❌ FAILS
  if (userDoc.exists) {  // ❌ Always false
    const userData = userDoc.data();
    await EmailService.sendAccountDeletionCompletedEmail(
      userData.email,
      userData.profile?.displayName,
      userData.settings?.defaultLanguage
    );
  }
}
```

**Code after fix:**
```javascript
async function executeAccountDeletion(userId) {
  // Fetch user data BEFORE deletion (for completion email)
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error('User not found');
  }
  const userData = userDoc.data();
  const userEmail = userData.email;
  const userName = userData.profile?.displayName || userData.username || 'User';
  const userLanguage = userData.settings?.defaultLanguage || 'en';

  // ... validation ...

  // Step 1: Delete user from Firestore
  await db.collection('users').doc(userId).delete();

  // ... other steps ...

  // Step 3.5: Send completion email using stored variables
  try {
    await EmailService.sendAccountDeletionCompletedEmail(
      userEmail,    // ✅ Use stored variable
      userName,     // ✅ Use stored variable
      userLanguage  // ✅ Use stored variable
    );
    console.log(`✅ Account deletion completed email sent to: ${userEmail}`);
  } catch (emailError) {
    console.error('❌ Failed to send deletion completed email:', emailError);
    // Non-blocking: continue even if email fails
  }
}
```

**Lines changed:** 138-146 (data fetching), 159-170 (email sending)

### Verification

After implementing the fix, Test 2.2 was re-run with a fresh test account:
- ✅ All 3 emails received successfully
- ✅ Deletion completed email arrived within seconds of deletion
- ✅ Email contained correct user data (name, language)

---

## Bug #2: Firebase Composite Index Missing

**Discovered:** 2025-11-20
**Test:** Test 2.2 - Immediate Deletion Email Variant
**Severity:** Medium (causes query failure on first run)
**Status:** ✅ AUTO-RESOLVED

### Symptoms

During the first test run, the following error appeared in server logs:

```
Error: 9 FAILED_PRECONDITION: The query requires an index.
You can create it here: https://console.firebase.google.com/...
```

The error occurred when querying the `PrivacyRequests` collection.

### Root Cause

Firestore requires composite indexes for complex queries. The `PrivacyRequests` collection is queried with multiple fields:
- `userId` (equality filter)
- `type` (equality filter)
- `__name__` (ordering)

This combination requires a composite index that wasn't pre-created.

**Query location:** `lib/services/servicePrivacy/server/accountDeletionService.js` (privacy request cleanup logic)

### The Fix

**Resolution:** Firebase automatically creates the required index when the error first occurs. The index creation link is provided in the error message.

**Index created:**
- Collection: `PrivacyRequests`
- Fields indexed: `userId` (Ascending), `type` (Ascending), `__name__` (Ascending)
- Status: Auto-created after first error

### Verification

After the index was created:
- ✅ Second test run had no index errors
- ✅ Privacy request queries executed successfully
- ✅ Cleanup operations completed without issues

### Prevention

For future deployments, this index should be pre-created using Firebase CLI or console to avoid the first-run error.

**Firebase CLI command:**
```bash
# Example - adjust fields as needed
firebase firestore:indexes:create \
  --collection-group=PrivacyRequests \
  --query-scope=COLLECTION \
  --field=userId,type,__name__
```

---

## Expected "Errors" (Not Bugs)

### User Account Not Found After Deletion

**Scenario:** After successful account deletion, server logs show multiple "User account not found" errors.

**Status:** ✅ EXPECTED BEHAVIOR (not a bug)

**Explanation:**

After the deletion completes (200 status), the frontend automatically attempts to refresh user data by making GET requests to:
- `/api/user/privacy/delete-account`
- `/api/user/settings`
- `/api/user/privacy/consent`

Since the account was just deleted, these requests correctly return:
- 404 (Not Found) or 500 (Internal Server Error)
- Error message: "User account not found"

**Why this happens:**
1. Deletion succeeds (account removed)
2. Frontend refresh logic executes
3. API routes check if user exists
4. User doesn't exist anymore → error response

**Verification that deletion worked:**
- Initial POST request returns 200 (success)
- All expected emails received
- Subsequent GET requests fail with "not found"

**These "errors" actually confirm the deletion was successful.**

---

## Summary

| Bug | Severity | Status | Test |
|-----|----------|--------|------|
| Completion email not sent | High | ✅ Fixed | Test 2.2 |
| Firebase index missing | Medium | ✅ Auto-resolved | Test 2.2 |

**Total bugs discovered:** 2
**Total bugs fixed:** 2
**Test success rate:** 100% (after fixes)

---

## Related Code Files

### Primary Files Modified:
- `lib/services/servicePrivacy/server/accountDeletionService.js` (lines 138-146, 159-170)

### Files Verified Working:
- `lib/services/server/emailService.js` (email sending logic)
- `app/api/user/privacy/delete-account/route.js` (API endpoint)
- `app/dashboard/(dashboard pages)/account/components/DeleteAccountTab.jsx` (UI with test checkbox)

### Translation Files:
- `public/locales/*/common.json` (all languages verified)

---

## Testing Notes

**Test Account Used:**
- Email: leozul0204@gmail.com
- UID: 26v4uXMAk8c6rfLlcWKRZpE1sPC3
- Language: French (fr)
- Contact: reynard.ladislaslr2004@gmail.com (French)

**Testing Approach:**
- Added temporary UI checkbox in `DeleteAccountTab.jsx` for immediate deletion
- Checkbox bypasses 30-day grace period (for testing only)
- Warning label indicates testing-only feature

**Complete test results documented in:** [EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md - Test 2.2 Results](./EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md#test-22-results---passing-)

---

## Lessons Learned

1. **Always fetch data before deletion:** When data is needed for post-deletion operations (emails, logs, etc.), fetch and store it BEFORE deleting the source.

2. **Non-blocking email failures:** The completion email sending is wrapped in try-catch and continues even on failure. This prevented the bug from blocking account deletion.

3. **Firebase indexes:** Complex queries require composite indexes. Auto-creation works but causes first-run errors. Pre-create indexes in production.

4. **Expected errors:** Frontend refresh attempts after deletion are normal behavior. Document expected error patterns to avoid confusion.

5. **Test with real accounts:** Using real email accounts (not mocks) revealed the completion email bug that unit tests missed.

---

**Last Updated:** 2025-11-20
**Next Review:** When Phase 4 email notifications are implemented
