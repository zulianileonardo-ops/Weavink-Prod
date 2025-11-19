---
id: testing-email-notifications-065
title: Email Notification System - Manual Test Guide (Phase 1 & 2)
category: testing
tags: [email, notifications, multilingual, i18n, rgpd, manual-testing, phase1, phase2]
status: active
created: 2025-11-19
updated: 2025-11-19
related:
  - RGPD_TESTING_GUIDE.md
  - ACCOUNT_PRIVACY_TESTING_GUIDE.md
  - RGPD_IMPLEMENTATION_SUMMARY.md
---

# Email Notification System - Manual Test Guide (Phase 1 & 2)

## Purpose

This guide provides focused manual testing procedures for the multilingual email notification system implementation. It covers:
- **Phase 1**: i18n bug fixes (text and date interpolation + multilingual validation)
- **Phase 2**: Account deletion email notifications (4 email types)

Use this guide to verify the system works correctly before moving to Phase 3 (data export emails).

---

## Test Environment Setup

### Prerequisites

**Required:**
1. Access to Weavink application (local or staging)
2. Brevo API key configured in environment (`NEXT_PUBLIC_SMTP_API`)
3. Access to email inbox for test accounts
4. Firebase console access
5. Browser developer tools (for debugging)

**Test Accounts Required:**

| Account | Language | Purpose |
|---------|----------|---------|
| User A | French (fr) | Primary testing account |
| User B | English (en) | Contact of User A |
| User C | Spanish (es) | Multilingual validation |
| User D | Chinese (zh) | Multilingual validation |
| User E | Vietnamese (vm) | Multilingual validation |

**Setting User Language:**
1. Log in to Firebase Console
2. Navigate to Firestore Database
3. Go to `users/{userId}` document
4. Update: `settings.defaultLanguage = 'fr'` (or 'en', 'es', 'zh', 'vm')

---

## Phase 1: i18n Bug Fixes

### Test 1.1: Delete Confirmation Text Interpolation

**Bug Fixed:** `{{text}}` appearing literally instead of actual confirmation text

**Steps:**
1. Log in with User A (French account: `settings.defaultLanguage = 'fr'`)
2. Navigate to: Account Settings → Privacy Tab → Delete Account section
3. Look at the confirmation instruction text above the input field

**Expected Result:**
```
Tapez SUPPRIMER MON COMPTE pour confirmer :
```

**NOT:**
```
Tapez {{text}} pour confirmer :
```

**✅ Pass Criteria:**
- Actual deletion confirmation text appears (in French: "SUPPRIMER MON COMPTE")
- No `{{text}}` placeholder visible
- Text matches the user's locale

**❌ Fail Criteria:**
- `{{text}}` appears literally
- Wrong language displayed
- Empty text field instruction

**File:** `app/dashboard/(dashboard pages)/account/components/DeleteAccountTab.jsx:103`

---

### Test 1.2: Pending Deletion Date Interpolation

**Bug Fixed:** `{{date}}` appearing literally in pending deletion message

**Setup Steps:**
1. Request account deletion (don't complete - we'll cancel it later)
2. Type the confirmation text
3. Click "Request Deletion" button
4. Page should show pending deletion warning

**Expected Result (French):**
```
Suppression de Compte en Attente
Votre compte est programmé pour suppression le 19 décembre 2025.
Vous pouvez annuler cela à tout moment avant cette date.
```

**NOT:**
```
Votre compte est programmé pour suppression le {{date}}.
```

**Expected Result (English):**
```
Account Deletion Pending
Your account is scheduled for deletion on December 19, 2025.
You can cancel this at any time before that date.
```

**✅ Pass Criteria:**
- Actual formatted date appears
- Date format matches locale:
  - French: "19 décembre 2025"
  - English: "December 19, 2025"
  - Spanish: "19 de diciembre de 2025"
- No `{{date}}` placeholder visible
- Date is 30 days from request time

**❌ Fail Criteria:**
- `{{date}}` appears literally
- Date in wrong format
- Date missing entirely

**File:** `app/dashboard/(dashboard pages)/account/components/DeleteAccountTab.jsx:57`

---

### Test 1.3: Multilingual Deletion Confirmation Validation

**Bug Fixed:** Backend only accepted English "DELETE MY ACCOUNT"

**Test Cases:**

#### Test 1.3.1: French Validation
1. Log in as User A (French: locale = 'fr')
2. Go to Account Settings → Delete Account
3. Type in input field: `SUPPRIMER MON COMPTE` (exact match required)
4. Add reason: "Testing multilingual validation"
5. Click delete button

**Expected:**
- ✅ Request accepted
- Pending deletion message appears
- Email sent (see Phase 2)

#### Test 1.3.2: Spanish Validation
1. Log in as User C (Spanish: locale = 'es')
2. Go to Delete Account section
3. Type: `ELIMINAR MI CUENTA`
4. Click delete button

**Expected:**
- ✅ Request accepted

#### Test 1.3.3: Chinese Validation
1. Log in as User D (Chinese: locale = 'zh')
2. Type: `删除我的账户`
3. Click delete button

**Expected:**
- ✅ Request accepted

#### Test 1.3.4: Vietnamese Validation
1. Log in as User E (Vietnamese: locale = 'vm')
2. Type: `DELETE MY ACCOUNT` (Vietnamese uses English text)
3. Click delete button

**Expected:**
- ✅ Request accepted

#### Test 1.3.5: Wrong Text Validation
1. Log in as any user
2. Type: `wrong text` or `delete my account` (lowercase)
3. Click delete button

**Expected:**
- ❌ Validation error appears
- Error message in user's language:
  - French: "Confirmation invalide. Veuillez taper 'SUPPRIMER MON COMPTE' exactement."
  - English: "Invalid confirmation. Please type 'DELETE MY ACCOUNT' exactly."
- Request NOT created in database

**Confirmation Texts Reference:**

| Language | Locale Code | Confirmation Text |
|----------|-------------|-------------------|
| English | en | DELETE MY ACCOUNT |
| French | fr | SUPPRIMER MON COMPTE |
| Spanish | es | ELIMINAR MI CUENTA |
| Chinese | zh | 删除我的账户 |
| Vietnamese | vm | DELETE MY ACCOUNT |

**✅ Pass Criteria:**
- Each language accepts its own confirmation text
- Wrong text rejected with locale-specific error
- Validation case-sensitive
- Backend validates against correct locale

**❌ Fail Criteria:**
- Only English accepted
- Case-insensitive validation
- Generic error message
- Wrong language error message

**Files:**
- Frontend: `lib/services/servicePrivacy/client/services/AccountDeletionService.js:72-83`
- Backend: `app/api/user/privacy/delete-account/route.js:125-140`
- Constants: `lib/services/servicePrivacy/constants/privacyConstants.js:113-125`

---

## Phase 2: Account Deletion Emails

### Email Testing Prerequisites

**Email Inbox Access:**
- Use real email addresses for test accounts
- Ensure emails not blocked by spam filters
- Check both inbox and spam folders

**Brevo Configuration:**
- API key configured correctly
- Sender email verified in Brevo
- Sending domain verified (if using custom domain)

**Database Access:**
- Firebase console open for verification
- Check `PrivacyRequests` collection
- Check user's `settings.defaultLanguage`

---

### Test 2.1: Deletion Confirmation Email (Standard 30-day)

**Email Type:** Account deletion confirmation with grace period

**Test Steps:**
1. Log in as User A (French account)
2. Go to Account Settings → Delete Account
3. Type: `SUPPRIMER MON COMPTE`
4. Reason: "Testing email notifications - Phase 2.1"
5. Click "Demander la suppression" button
6. Wait 5-10 seconds
7. Check User A's email inbox

**Expected Email:**

**To:** User A's email
**From:** Weavink <noreply@weavink.io> (or configured sender)
**Subject:** `Demande de suppression de compte confirmée - Weavink`
**Language:** French throughout

**Email Content Should Include:**

✅ **Headline:** "Suppression de compte programmée"
✅ **Intro:** "Nous avons reçu votre demande de suppression de votre compte Weavink. Votre compte est programmé pour suppression le [DATE FORMATTED IN FRENCH]."
✅ **Grace Period Warning:** "Vous avez 30 jours pour changer d'avis. Vous pouvez annuler cette demande à tout moment avant [DATE]."
✅ **What Will Be Deleted:**
   - "Tous vos contacts et groupes"
   - "Paramètres de profil et préférences"
   - "Historique d'activité et analyses"
✅ **Export Reminder:** "Si vous ne l'avez pas déjà fait, nous vous recommandons d'exporter vos données avant la date de suppression."
✅ **Cancel Instructions:** "Pour annuler cette demande, visitez les paramètres de votre compte..."
✅ **Button:** "Annuler la suppression" (should be a styled button/link)
✅ **Footer:** "Merci d'avoir utilisé Weavink."

**Verification Checklist:**

- [ ] Email received within 30 seconds
- [ ] Subject line in French
- [ ] All body text in French
- [ ] Date formatted as: "19 décembre 2025" (French format)
- [ ] Date is exactly 30 days from request
- [ ] HTML renders correctly (no broken formatting)
- [ ] "Annuler la suppression" button present
- [ ] Button links to account settings page
- [ ] Weavink branding consistent
- [ ] No tracking pixels (GDPR compliance)

**Database Verification:**
1. Open Firebase Console → `PrivacyRequests` collection
2. Find latest deletion request document
3. Verify fields:
```javascript
{
  type: 'deletion',
  userId: '[User A ID]',
  userEmail: '[User A email]',
  status: 'pending',
  scheduledDeletionDate: [30 days from now],
  locale: 'fr',  // ← Should match user's language
  requestedAt: [timestamp]
}
```

**✅ Pass Criteria:**
- Email received in correct language
- All text translated properly
- Date formatting locale-specific
- HTML renders without issues
- Button functional

**❌ Fail Criteria:**
- No email received after 60 seconds
- Email in wrong language
- English text mixed with French
- Date in wrong format (English style in French email)
- Broken HTML/formatting
- {{date}} or other placeholders visible

**Files:**
- EmailService: `lib/services/server/emailService.js:285-310` (method)
- Template: `lib/services/server/emailService.js:978-1115` (HTML generator)
- Integration: `lib/services/servicePrivacy/server/accountDeletionService.js:87-101`
- Translations: `public/locales/fr/common.json:3212-3232`

---

### Test 2.2: Immediate Deletion Email Variant

**Difference from 2.1:** Tests immediate deletion (no grace period)

**Note:** This requires backend/API access or code modification to test, as the UI doesn't expose immediate deletion option.

**API Test (using curl or Postman):**
```bash
# Set immediate: true in request body
POST /api/user/privacy/delete-account
{
  "confirmation": "DELETE MY ACCOUNT",
  "reason": "Testing immediate deletion email",
  "immediate": true,
  "locale": "en"
}
```

**Expected Email Differences:**

**Subject:** "Account Deletion Request Confirmed - Weavink" (English)
**Headline:** "Account Deletion In Progress" (NOT "scheduled")
**Intro:** "We are processing your request to delete your Weavink account immediately." (NOT "scheduled for...")
**NO grace period warning** (section removed)
**Rest same as Test 2.1**

**✅ Pass Criteria:**
- Headline shows "In Progress" not "Scheduled"
- No 30-day grace period mentioned
- No scheduled date in intro
- Still includes export reminder

**Skip if:** You cannot trigger immediate deletion (requires backend modification)

---

### Test 2.3: Contact Deletion Notice Email (Cascade Notifications)

**Email Type:** Notification sent to users who have the deleting account in their contacts

**Setup:**
1. Ensure User B (English) has User A (French) in their contact list
2. To verify: Log in as User B → Contacts → Check if User A is listed

**Test Steps:**
1. Log in as User A (French)
2. Request account deletion: Type `SUPPRIMER MON COMPTE`
3. Reason: "Testing cascade notification - Phase 2.3"
4. Click delete button
5. **Check User B's email inbox** (NOT User A)

**Expected Email to User B:**

**To:** User B's email
**Subject:** "Contact Deletion Notice - Weavink" (ENGLISH - User B's language, not User A's)
**Language:** English (recipient's language)

**Email Content:**

✅ **Headline:** "Contact Deletion Notice"
✅ **Intro:** "We wanted to inform you that [User A's Display Name] has requested deletion of their Weavink account."
✅ **Deletion Date:** "Their account will be deleted on [DATE FORMATTED IN ENGLISH]."
✅ **Impact Section:** "This means:"
   - "They will be removed from your contact list"
   - "You will no longer be able to contact them through Weavink"
   - "Any data shared with them will no longer be available to them"
✅ **Export Suggestion:** "If you need to keep any information related to this contact, we recommend you export your data now."
✅ **Button:** "Export My Data"
✅ **Footer:** "Thank you for your understanding."

**Verification Checklist:**

- [ ] Email sent to User B (the contact owner)
- [ ] Email in User B's language (English) NOT User A's (French)
- [ ] User A's display name appears correctly
- [ ] Deletion date in User B's locale format
- [ ] "Export My Data" button present and functional
- [ ] If User A has multiple contacts, each receives email in THEIR OWN language

**Multi-Contact Test (Optional but Recommended):**
1. Add User A to User C (Spanish) and User D (Chinese) contact lists
2. Request User A's deletion
3. Verify:
   - User B receives email in English
   - User C receives email in Spanish ("Aviso de eliminación de contacto")
   - User D receives email in Chinese
   - All emails sent within 30 seconds

**Database Verification:**
1. Check User B → `notifications` subcollection
2. Verify notification document created:
```javascript
{
  type: 'contact_deletion',
  title: 'Contact Deletion Notice',
  message: '[User A] has requested deletion...',
  deletedUserId: '[User A ID]',
  deletedUserName: '[User A name]',
  scheduledDate: [deletion date],
  read: false,
  createdAt: [timestamp]
}
```

**✅ Pass Criteria:**
- Each affected user receives ONE email
- Each email in recipient's own language
- Deleting user's name appears correctly
- Batch processing completes within 1 minute (even with 10+ contacts)
- Non-blocking: deletion request still created if emails fail

**❌ Fail Criteria:**
- User B receives email in French (deleting user's language)
- No email sent to contacts
- Multiple duplicate emails sent
- Email failures block the deletion request

**Files:**
- EmailService: `lib/services/server/emailService.js:312-337`
- Template: `lib/services/server/emailService.js:1117-1248`
- Integration: `lib/services/servicePrivacy/server/accountDeletionService.js:469-497`
- Batch processing: Uses `Promise.allSettled()` for non-blocking parallel sends

---

### Test 2.4: Account Deletion Completed Email

**Email Type:** Final confirmation sent when account is actually deleted

**Important:** This email is sent BEFORE the Firebase Auth account is deleted, so the user can still receive it.

**Test Setup:**

**Option A: Immediate Deletion (Fastest)**
1. Use API to request immediate deletion (see Test 2.2)
2. Email sent immediately after execution

**Option B: Modify Grace Period (For Testing)**
1. Temporarily modify `scheduledDeletionDate` in code to `new Date()` (immediate)
2. Request deletion
3. Email sent during execution

**Option C: Wait 30 Days (Not Practical)**
- Skip this unless you have a scheduled deletion function running

**For Testing Purposes - API Call:**
```bash
# Trigger immediate deletion
POST /api/user/privacy/delete-account
{
  "confirmation": "DELETE MY ACCOUNT",
  "reason": "Testing completion email",
  "immediate": true,
  "locale": "en"
}
```

**Expected Email:**

**To:** User's email
**Subject:** "Your Account Has Been Deleted - Weavink"
**Language:** User's locale

**Email Content:**

✅ **Headline:** "Account Deleted"
✅ **Intro:** "Your Weavink account has been permanently deleted as per your request."
✅ **What Was Deleted:**
   - "Your account and profile"
   - "All contacts and groups"
   - "Settings and preferences"
   - "Activity history and analytics"
✅ **GDPR Note:** "This deletion complies with GDPR Article 17 (Right to Erasure)."
✅ **Return Message:** "If you change your mind, you can always create a new account, but your previous data cannot be recovered."
✅ **Button:** "Create New Account"
✅ **Footer:** "Goodbye and good luck!"

**Verification Checklist:**

- [ ] Email received BEFORE auth account deleted (timing critical)
- [ ] All data deletion items listed
- [ ] GDPR Article 17 reference present
- [ ] Positive/final tone (not threatening)
- [ ] "Create New Account" button functional

**Database Verification:**
1. Verify `PrivacyRequests` document updated:
```javascript
{
  status: 'completed',  // Changed from 'pending'
  completedAt: [timestamp],
  steps: {
    userDataDeleted: true,
    contactsNotified: true,
    cascadeCompleted: true,
    billingArchived: true,
    authDeleted: true
  }
}
```

2. Verify user document DELETED from `users` collection
3. Verify Firebase Auth user DELETED (cannot log in)

**✅ Pass Criteria:**
- Email sent before auth deletion
- User receives final confirmation
- GDPR compliance noted
- Tone is professional and final

**❌ Fail Criteria:**
- Email not received (auth deleted first)
- Missing GDPR reference
- Harsh/negative tone

**Files:**
- EmailService: `lib/services/server/emailService.js:339-364`
- Template: `lib/services/server/emailService.js:1250-1377`
- Integration: `lib/services/servicePrivacy/server/accountDeletionService.js:149-164`

---

### Test 2.5: Account Deletion Cancelled Email

**Email Type:** Confirmation when user cancels their deletion request

**Test Steps:**
1. Request account deletion (see Test 2.1)
2. Verify pending deletion message appears
3. Click "Cancel Deletion" button (or use API)
4. Confirm cancellation
5. Check email inbox

**Expected Email:**

**To:** User's email
**Subject:** "Account Deletion Request Cancelled - Weavink"
**Language:** User's locale

**Email Content:**

✅ **Headline:** "Account Deletion Cancelled"
✅ **Intro:** "Good to have you back! Your account deletion request has been successfully cancelled."
✅ **Status Message:** "Your account remains active and all your data has been preserved:"
   - "All contacts and groups"
   - "Your profile settings and preferences"
   - "Your activity history and analytics"
✅ **Next Steps:** "You can continue using Weavink as normal. If you have any questions, don't hesitate to contact our support team."
✅ **Button:** "Go to Dashboard"
✅ **Footer:** "Thank you for staying with us!"

**Verification Checklist:**

- [ ] Email received within 30 seconds
- [ ] Welcoming/positive tone
- [ ] All preserved data items listed
- [ ] "Go to Dashboard" button functional
- [ ] Thank you message present

**Database Verification:**
1. Verify `PrivacyRequests` document updated:
```javascript
{
  status: 'cancelled',  // Changed from 'pending'
  cancelledAt: [timestamp]
}
```

2. Verify user document flags cleared:
```javascript
{
  privacy: {
    pendingDeletion: false,  // Changed from true
    deletionRequestId: null,  // Cleared
    deletionCancelledAt: [timestamp]
  }
}
```

3. Verify user CAN still log in
4. Verify all data still intact

**✅ Pass Criteria:**
- Positive, welcoming tone
- User reassured data is safe
- Account fully restored
- Button links to dashboard

**❌ Fail Criteria:**
- No email sent
- Negative/warning tone
- Account still marked pending deletion
- Button doesn't work

**Files:**
- EmailService: `lib/services/server/emailService.js:366-391`
- Template: `lib/services/server/emailService.js:1379-1506`
- Integration: `lib/services/servicePrivacy/server/accountDeletionService.js:646-661`

---

## Common Issues & Troubleshooting

### Issue 1: No Emails Received

**Possible Causes:**
1. Brevo API key not configured
2. Email in spam folder
3. Sender email not verified in Brevo
4. Rate limiting by Brevo
5. Email service failure (check logs)

**Debug Steps:**
1. Check browser console for errors
2. Check server logs for "EmailService" messages
3. Look for: `✅ Account deletion confirmation email sent to: [email]`
4. Or: `❌ Failed to send deletion confirmation email:`
5. Check Brevo dashboard for send statistics
6. Verify NEXT_PUBLIC_SMTP_API environment variable set

**Non-Blocking Design:**
- Even if emails fail, account deletion should still proceed
- Check logs for: "Failed to send ... email" (logged but not blocking)

### Issue 2: Emails in Wrong Language

**Possible Causes:**
1. User's `settings.defaultLanguage` not set in Firestore
2. Fallback to English occurring
3. Translation file missing
4. Wrong locale code used

**Debug Steps:**
1. Check Firestore: `users/{userId}/settings.defaultLanguage`
2. Valid codes: 'en', 'fr', 'es', 'zh', 'vm' (not 'ch' - use 'zh')
3. Check server logs for: "Failed to load translations for locale X"
4. Verify translation file exists: `/public/locales/{locale}/common.json`
5. Check `emails` section exists in translation file

### Issue 3: {{date}} or {{text}} Still Showing

**Possible Causes:**
1. Translation key missing interpolation variable
2. Wrong parameter passed to t() function
3. Cache issue (old translation loaded)

**Debug Steps:**
1. Check translation file has {{date}} in template: `"intro": "...le {{date}}."`
2. Check t() call passes variable: `t('key', { date: formattedDate })`
3. Hard refresh browser (Ctrl+Shift+R)
4. Check browser console for i18n errors

### Issue 4: Validation Not Working

**Possible Causes:**
1. DELETION_CONFIRMATION_TEXTS constant not loaded
2. Locale not passed to backend
3. Case mismatch (lowercase instead of uppercase)

**Debug Steps:**
1. Check network tab: DELETE request should include `locale: 'fr'`
2. Check backend logs for validation error
3. Verify confirmation text is EXACT match (case-sensitive)
4. Check privacyConstants.js exports DELETION_CONFIRMATION_TEXTS

### Issue 5: Contact Notices Not Sent

**Possible Causes:**
1. No users have deleting account in contacts
2. Batch processing failed
3. User language not found (fallback to English)

**Debug Steps:**
1. Verify User B has User A in contacts (Firestore: `Contacts/{userBId}/contacts` array)
2. Check server logs for: "Notifying X users about contact deletion"
3. Check logs for individual email failures
4. Verify findUsersWithContact() returns user IDs

---

## Test Results Template

Use this template to record your test results:

```markdown
# Email Notification Testing Results - Phase 1 & 2
**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Environment:** [Local / Staging / Production]

## Phase 1: i18n Bug Fixes

### Test 1.1: Delete Confirmation Text
- [ ] PASS / [ ] FAIL
- Notes:

### Test 1.2: Date Interpolation
- [ ] PASS / [ ] FAIL
- Notes:

### Test 1.3: Multilingual Validation
- [ ] French: PASS / FAIL
- [ ] Spanish: PASS / FAIL
- [ ] Chinese: PASS / FAIL
- [ ] Vietnamese: PASS / FAIL
- [ ] Invalid text: PASS / FAIL
- Notes:

## Phase 2: Account Deletion Emails

### Test 2.1: Deletion Confirmation Email
- [ ] PASS / [ ] FAIL
- Language tested: [French / English / Spanish / etc.]
- Email received: YES / NO
- Correct language: YES / NO
- Date format correct: YES / NO
- Notes:

### Test 2.3: Contact Deletion Notices
- [ ] PASS / [ ] FAIL
- Contacts notified: [X users]
- Each in correct language: YES / NO
- Notes:

### Test 2.4: Deletion Completed Email
- [ ] PASS / [ ] FAIL / [ ] SKIPPED
- Notes:

### Test 2.5: Deletion Cancelled Email
- [ ] PASS / [ ] FAIL
- Notes:

## Issues Found
1. [Describe any issues]
2. [With reproduction steps]

## Overall Status
- [ ] All Phase 1 tests passing
- [ ] All Phase 2 tests passing
- [ ] Ready for Phase 3 testing
```

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Mark this phase as complete
2. Proceed to Phase 3 testing (Data Export Emails)
3. Update RGPD compliance documentation
4. Consider automated testing for regression

### If Tests Fail ❌
1. Document failures using template above
2. Check Common Issues section for solutions
3. Review server logs for errors
4. Check code references in each test section
5. Re-test after fixes applied

### Phase 3 Preview
Next testing phase will cover:
- Data export completion email (1 email type)
- Summary verification
- Format listing
- GDPR Article 20 compliance

---

## File Reference Summary

**Frontend Files:**
- `app/dashboard/(dashboard pages)/account/components/DeleteAccountTab.jsx` - UI with i18n fixes
- `app/dashboard/(dashboard pages)/account/AccountContext.js` - Locale passthrough
- `lib/services/servicePrivacy/client/services/AccountDeletionService.js` - Client service

**Backend Files:**
- `lib/services/server/emailService.js` - Email service with 5 methods + templates
- `lib/services/servicePrivacy/server/accountDeletionService.js` - Server service with integrations
- `app/api/user/privacy/delete-account/route.js` - API endpoint with validation

**Constants:**
- `lib/services/servicePrivacy/constants/privacyConstants.js` - DELETION_CONFIRMATION_TEXTS

**Translations:**
- `public/locales/en/common.json` - English emails section
- `public/locales/fr/common.json` - French emails section
- `public/locales/es/common.json` - Spanish emails section
- `public/locales/ch/common.json` - Chinese emails section
- `public/locales/vm/common.json` - Vietnamese emails section

---

**Last Updated:** 2025-11-19
**Status:** Active
**Coverage:** Phase 1 (i18n fixes) + Phase 2 (Account deletion emails)
