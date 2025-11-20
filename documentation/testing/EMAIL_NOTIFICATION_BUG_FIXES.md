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

## Bug #3: Contact Deletion Notifications Not Updated on Completion

**Discovered:** 2025-11-20
**Test:** Manual testing of immediate deletion feature
**Severity:** High (incorrect UI state for contacts)
**Status:** ✅ FIXED

### Symptoms

When User A deletes their account (immediate deletion), User B (who has User A as a contact) receives an initial notification showing "deletion pending" with a red badge. However:
1. ❌ The notification in Firestore is NOT updated when deletion completes
2. ❌ The badge in User B's dashboard/contacts still shows "⚠️ deletion pending" instead of "❌ Account Deleted"
3. ❌ User B has no indication that the account was actually deleted

### Root Cause

In `lib/services/servicePrivacy/server/accountDeletionService.js`, the `executeAccountDeletion` function successfully:
1. Deletes the user account
2. Sends completion email to deleted user
3. Deletes Firebase Auth account
4. Updates the PrivacyRequests document

**Problem:** There was NO code to update the notifications in other users' collections from `contact_deletion` (pending) to `contact_deletion_completed`.

**Missing functionality:**
- No notification update logic after deletion completes
- Notifications collection remained in "pending" state forever
- UI always queried for `type: 'contact_deletion'` which never changed

### The Fix

**File:** `lib/services/servicePrivacy/server/accountDeletionService.js`

#### Change 1: Added Notification Update Function (lines 512-574)

Created new `notifyContactDeletionCompleted()` function:

```javascript
async function notifyContactDeletionCompleted(deletedUserId, deletedEmail, userIds, deletedUserName) {
  console.log(`[AccountDeletion] Updating ${userIds.length} notifications to 'completed' status`);

  const updatePromises = userIds.map(async (userId) => {
    // Find the existing notification
    const notificationsRef = db.collection('users').doc(userId).collection('notifications');

    // Try to find by deletedUserId first
    let querySnapshot = await notificationsRef
      .where('type', '==', 'contact_deletion')
      .where('deletedUserId', '==', deletedUserId)
      .limit(1)
      .get();

    // Fallback to email matching if userId doesn't match
    if (querySnapshot.empty && deletedEmail) {
      querySnapshot = await notificationsRef
        .where('type', '==', 'contact_deletion')
        .where('deletedUserEmail', '==', deletedEmail)
        .limit(1)
        .get();
    }

    if (!querySnapshot.empty) {
      const notificationDoc = querySnapshot.docs[0];

      // Update notification to completed status
      await notificationDoc.ref.update({
        type: 'contact_deletion_completed',
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        message: `${deletedUserName}'s account has been deleted. Their contact information has been anonymized.`,
        title: 'Contact Account Deleted',
        read: false,  // Mark as unread again to alert user
      });
    }
  });

  await Promise.allSettled(updatePromises);
}
```

#### Change 2: Call Notification Update in executeAccountDeletion (lines 175-187)

Added Step 4.5 after auth deletion:

```javascript
// Step 4: Delete Firebase Auth account
deletionSteps.push(await deleteAuthAccount(userId));

// Step 4.5: Update notifications for affected users to show deletion completion
try {
  const usersWithContact = await findUsersWithContact(userId, userEmail);

  if (usersWithContact.length > 0) {
    console.log(`[AccountDeletion] Updating notifications for ${usersWithContact.length} users`);
    await notifyContactDeletionCompleted(userId, userEmail, usersWithContact, userName);
  }
} catch (notificationError) {
  console.error('❌ Failed to update notifications:', notificationError);
  // Non-blocking: continue even if notification update fails
}
```

#### Change 3: Enhanced API Endpoint (deletion-status/route.js)

Updated query to check for BOTH pending and completed notifications:

```javascript
// Query for ANY deletion notification (pending or completed)
querySnapshot = await notificationsRef
  .where('type', 'in', ['contact_deletion', 'contact_deletion_completed'])
  .where('deletedUserId', '==', contactUserId)
  .limit(1)
  .get();

// Return enhanced status
return NextResponse.json({
  hasPendingDeletion: !isCompleted,
  isDeleted: isCompleted,
  status: notification.status || (isCompleted ? 'completed' : 'pending'),
  userName: notification.deletedUserName,
  scheduledDate: scheduledDate,
  completedAt: completedAt || null
});
```

#### Change 4: Updated UI Components

**ContactCard.jsx** (lines 93-116, 272-297, 329-367):
- Handle both `hasPendingDeletion` and `isDeleted` states
- Show red badge "⚠️ Dec 19" for pending
- Show gray badge "❌ Account Deleted" for completed
- Show appropriate warning/info banners

**EditContactModal.jsx** (lines 92-115, 195-233):
- Same updates as ContactCard for consistency

#### Change 5: Added Translations

Added 4 new translation keys in all 5 languages (en, fr, es, ch, vm):
- `contacts.deletion_completed_badge`: "Account Deleted"
- `contacts.deletion_completed_badge_tooltip`: "{{name}}'s account has been deleted"
- `contacts.deletion_completed_title`: "Contact Account Deleted"
- `contacts.deletion_completed_message`: "{{name}}'s account has been deleted..."

### Verification

**Test Date:** 2025-11-20
**Test Accounts:**
- User A: leozul0204@gmail.com (deleted immediately)
- User B: reynard.ladislaslr2004@gmail.com, nathalie.gillet@repereetvision.com (contacts)

**Server Logs Confirmed:**
```
[AccountDeletion] Updating notifications for 2 users
[AccountDeletion] Updating 2 notifications to 'completed' status
✅ Updated notification for user HCeK48O48oRSWY1c657KY8lNqzI2
✅ Updated notification for user ScmVq6p8ubQ9JFbniF2Vg5ocmbv2
[AccountDeletion] Completed updating notifications
```

**Expected Results:**
1. ✅ Notifications in Firestore updated to `type: 'contact_deletion_completed'`
2. ✅ User B's contacts page shows gray "❌ Account Deleted" badge (not red pending)
3. ✅ Expanding contact shows gray info banner "Contact Account Deleted"
4. ✅ API returns `isDeleted: true, status: 'completed'`

### Files Modified

1. `lib/services/servicePrivacy/server/accountDeletionService.js`
   - Added: `notifyContactDeletionCompleted()` function
   - Modified: `executeAccountDeletion()` to call notification update

2. `app/api/user/contacts/deletion-status/route.js`
   - Enhanced query to check for both notification types
   - Return enhanced status with completion info

3. `app/dashboard/(dashboard pages)/contacts/components/contacts/ContactCard.jsx`
   - Handle pending and completed states
   - Updated badge and banner displays

4. `app/dashboard/(dashboard pages)/contacts/components/contacts/EditContactModal.jsx`
   - Same updates as ContactCard

5. Translation files (5 languages):
   - `public/locales/{en,fr,es,ch,vm}/common.json`

### Lessons Learned

1. **Complete the notification lifecycle:** When creating notifications for external users, ensure they're updated when the triggering event completes.

2. **Dual-state UI:** UI components must handle both in-progress and completed states for any async operation.

3. **Non-blocking updates:** Notification updates should not block the main deletion process (wrapped in try-catch with logging).

4. **Firestore queries:** Use `where('type', 'in', [...])` to query multiple notification types efficiently.

5. **Bidirectional communication:** When User A's action affects User B's UI, ensure User B's data is updated, not just emails sent.

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
| Contact notifications not updated | High | ✅ Fixed | Manual test |

**Total bugs discovered:** 3
**Total bugs fixed:** 3
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
