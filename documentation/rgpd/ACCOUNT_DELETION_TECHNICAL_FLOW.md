---
id: rgpd-account-deletion-flow-047
title: Account Deletion Technical Flow - User Deletion to Contact Notification
category: rgpd
tags: [account-deletion, gdpr, notifications, cascade-deletion, email, firestore, privacy, technical-flow, database-operations, multilingual, cancellation]
status: active
created: 2025-11-19
updated: 2025-11-20
related:
  - EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md
  - RGPD_COMPLIANCE_MATRIX.md
  - RGPD_COMPLIANCE_MATRIX.PREVIOUS.md
  - RGPD_IMPLEMENTATION_SUMMARY.md
  - RGPD_ARCHITECTURE_COMPLIANCE.md
  - CONTACT_DELETION_WARNING_IMPLEMENTATION.md
functions:
  - requestAccountDeletion()
  - cancelAccountDeletion()
  - findUsersWithContact()
  - notifyContactDeletion()
  - notifyContactDeletionCancellation()
  - sendContactDeletionNoticeEmail()
  - sendContactDeletionCancelledEmail()
  - sendAccountDeletionConfirmationEmail()
  - sendAccountDeletionCancelledEmail()
components:
  - AccountDeletionService
  - EmailService
  - PrivacyRequests collection
  - notifications subcollection
---

# Account Deletion Technical Flow: User Deletion to Contact Notification

**Document Version**: 1.1
**Created**: 2025-11-19
**Last Updated**: 2025-11-20
**Status**: Active
**Category**: RGPD/GDPR Compliance

---

## Table of Contents

1. [Overview](#overview)
2. [Complete Technical Flow (11 Phases)](#complete-technical-flow-11-phases)
3. [Database Schema Changes](#database-schema-changes)
4. [Code References](#code-references)
5. [Timeline Analysis](#timeline-analysis)
6. [Technical Insights](#technical-insights)
7. [Future Revisions](#future-revisions)
8. [Related Documentation](#related-documentation)

---

## Overview

This document provides a complete technical walkthrough of the account deletion process in Weavink, from when **User A initiates account deletion** to when **User B (who has User A as a contact) receives both email and in-app notifications**.

### Key Stakeholders

- **Deleting User (User A)**: The account owner requesting deletion
- **Affected Contacts (User B, C, D...)**: Users who have User A in their contact lists
- **System Components**: API routes, services, Firestore collections, email system

### Process Summary

**Total Time**: ~2 seconds from request to completion
**Email Delivery**: Additional 2-5 seconds (SMTP dependent)
**Parallelization**: Notifications and emails sent concurrently using `Promise.all()` and `Promise.allSettled()`
**Language Handling**: Each recipient receives content in their own language, not the deleter's

---

## Complete Technical Flow (11 Phases)

### Phase 1: User A Initiates Deletion

**Location**: Frontend → API Route → `requestAccountDeletion()`
**File**: `/app/dashboard/(dashboard pages)/account` → `/api/user/privacy/delete-account` → `/lib/services/servicePrivacy/server/accountDeletionService.js:22`

#### Step 1.1: Frontend Request
```javascript
// User A clicks "Delete Account" button
const response = await fetch('/api/user/privacy/delete-account', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    confirmationText: 'SUPPRIMER MON COMPTE', // User's language
    reason: 'Testing cascade notification'
  })
});
```

#### Step 1.2: API Route Validation
```javascript
// File: /app/api/user/privacy/delete-account/route.js
- Validates deletion confirmation text matches
- Applies rate limiting (2 requests/hour)
- Extracts metadata (IP address, user agent)
- Calls requestAccountDeletion() service function
```

#### Step 1.3: Service Invocation
```javascript
// File: /lib/services/servicePrivacy/server/accountDeletionService.js:22
await requestAccountDeletion(userId, metadata, options);
```

**Timestamp**: T+0ms to T+100ms

---

### Phase 2: System Fetches User A's Data

**File**: `/lib/services/servicePrivacy/server/accountDeletionService.js:33-38`

#### Step 2.1: Query Firestore
```javascript
const userDoc = await db.collection('users').doc(userId).get();
if (!userDoc.exists) {
  throw new Error('User not found');
}

const userData = userDoc.data();
```

#### Step 2.2: Retrieved Data Structure
```javascript
{
  email: "userA@example.com",
  username: "usera",
  profile: {
    displayName: "User A",
    avatarUrl: "https://...",
  },
  settings: {
    defaultLanguage: "fr"  // French
  },
  // ... other fields
}
```

**Timestamp**: T+100ms to T+150ms

---

### Phase 3: Create Deletion Request Record

**File**: `/lib/services/servicePrivacy/server/accountDeletionService.js:41-68`

#### Step 3.1: Build Deletion Request Object
```javascript
const deletionRequest = {
  userId: "userA-id",
  userEmail: "userA@example.com",
  userName: "User A",
  requestedAt: FieldValue.serverTimestamp(),
  status: 'pending',
  scheduledDeletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  reason: "Testing cascade notification",
  immediate: false,
  keepBillingData: true,
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  completedAt: null,
  steps: {
    userDataDeleted: false,
    contactsNotified: false,
    cascadeCompleted: false,
    billingArchived: false,
    authDeleted: false
  }
};
```

#### Step 3.2: Write to Firestore
```javascript
const docRef = await db.collection('PrivacyRequests').add({
  ...deletionRequest,
  type: 'deletion'
});
```

**Database Result**:
```
Firestore:
└── PrivacyRequests
    └── {docRef.id}
        ├── userId: "userA-id"
        ├── userEmail: "userA@example.com"
        ├── userName: "User A"
        ├── status: "pending"
        ├── scheduledDeletionDate: Timestamp(2025-12-19)
        ├── type: "deletion"
        └── steps: {...}
```

**Timestamp**: T+150ms to T+200ms

---

### Phase 4: Find All Users With User A as Contact

**File**: `/lib/services/servicePrivacy/server/accountDeletionService.js:71, 342-371`

#### Step 4.1: Call findUsersWithContact()
```javascript
const usersWithContact = await findUsersWithContact(
  "userA-id",
  "userA@example.com"
);
```

#### Step 4.2: Query ALL Contacts Documents (Expensive Operation!)
```javascript
async function findUsersWithContact(userId, email) {
  // ⚠️ EXPENSIVE: Queries ALL Contacts documents
  const allContactsDocs = await db.collection('Contacts').get();
  const usersWithContact = [];

  allContactsDocs.forEach((doc) => {
    const contactsData = doc.data();
    const contacts = contactsData.contacts || [];

    // Check if any contact matches the user being deleted
    const hasContact = contacts.some(
      (contact) =>
        contact.userId === userId ||
        contact.email === email ||
        contact.weavinkUserId === userId
    );

    if (hasContact) {
      usersWithContact.push(doc.id); // e.g., "userB-id"
    }
  });

  return usersWithContact; // ['userB-id', 'userC-id']
}
```

#### Step 4.3: Match Example
```javascript
// In User B's Contacts document
{
  contacts: [
    {
      id: "contact-123",
      userId: "userA-id",          // ← MATCH!
      email: "userA@example.com",  // ← MATCH!
      weavinkUserId: "userA-id",   // ← MATCH!
      name: "User A",
      phone: "+33612345678",
      // ... other fields
    }
  ]
}
```

**Performance Note**: This query is expensive and should be optimized with Firestore indexes in production.

**Timestamp**: T+200ms to T+1500ms (slow due to full collection scan)

---

### Phase 5: Create Database Notifications for User B

**File**: `/lib/services/servicePrivacy/server/accountDeletionService.js:75, 444-467`

#### Step 5.1: Call notifyContactDeletion()
```javascript
if (usersWithContact.length > 0) {
  await notifyContactDeletion(
    "userA-id",                    // Deleted user
    ['userB-id', 'userC-id'],      // Affected users
    deletionRequest
  );
}
```

#### Step 5.2: Create Notifications in Parallel
```javascript
async function notifyContactDeletion(deletedUserId, userIds, deletionRequest) {
  console.log(`[AccountDeletion] Notifying ${userIds.length} users about contact deletion`);

  // Create notifications in Firestore
  const notifications = userIds.map((userId) => {
    return db.collection('users')
      .doc(userId)                    // e.g., 'userB-id'
      .collection('notifications')
      .add({
        type: 'contact_deletion',
        title: 'Contact Deletion Notice',
        message: `${deletionRequest.userName} has requested deletion of their Weavink account. Their contact information will be anonymized in 30 days.`,
        deletedUserId: deletedUserId,
        deletedUserName: deletionRequest.userName,
        scheduledDate: deletionRequest.scheduledDeletionDate,
        createdAt: FieldValue.serverTimestamp(),
        read: false,
        action: {
          type: 'view_contact',
          contactId: deletedUserId
        }
      });
  });

  await Promise.all(notifications);
}
```

#### Step 5.3: Database Result
```
Firestore:
└── users
    └── userB-id
        └── notifications
            └── {auto-generated-id}
                ├── type: 'contact_deletion'
                ├── title: 'Contact Deletion Notice'
                ├── message: 'User A has requested deletion...'
                ├── deletedUserId: 'userA-id'
                ├── deletedUserName: 'User A'
                ├── scheduledDate: Timestamp(2025-12-19)
                ├── createdAt: Timestamp(2025-11-19)
                ├── read: false
                └── action: {
                    type: 'view_contact',
                    contactId: 'userA-id'
                  }
```

**Timestamp**: T+1500ms to T+1600ms

---

### Phase 6: Send Emails to Affected Users

**File**: `/lib/services/servicePrivacy/server/accountDeletionService.js:469-497`

#### Step 6.1: Loop Through Affected Users
```javascript
const emailPromises = [];

for (const userId of ['userB-id', 'userC-id']) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const userLanguage = userData.settings?.defaultLanguage || 'en';

      // User B: language = 'en' (English)
      // User C: language = 'es' (Spanish)

      emailPromises.push(
        EmailService.sendContactDeletionNoticeEmail(
          userData.email,                     // 'userB@example.com'
          userData.profile?.displayName || userData.username || 'User',
          deletionRequest.userName,           // 'User A'
          deletionRequest.scheduledDeletionDate,
          userLanguage                        // 'en' (NOT User A's 'fr'!)
        ).catch(error => {
          console.error(`Failed to send contact deletion notice to ${userId}:`, error);
          // Non-blocking: continue even if individual email fails
        })
      );
    }
  } catch (error) {
    console.error(`Error fetching user data for ${userId}:`, error);
  }
}

// Send all emails in parallel (non-blocking)
await Promise.allSettled(emailPromises);
```

#### Step 6.2: Why Promise.allSettled()?
- **Non-blocking**: If User B's email fails, User C still receives theirs
- **Continues on SMTP errors**: Deletion request proceeds regardless
- **Parallel execution**: All emails sent simultaneously for speed

**Timestamp**: T+1600ms to T+1750ms (preparing emails)

---

### Phase 7: Email Template Generation (Multi-Language)

**File**: `/lib/services/server/emailService.js:sendContactDeletionNoticeEmail()`

#### Step 7.1: Generate HTML in Recipient's Language
```javascript
async sendContactDeletionNoticeEmail(
  recipientEmail,      // 'userB@example.com'
  recipientName,       // 'User B'
  deletedUserName,     // 'User A'
  scheduledDate,       // Timestamp(2025-12-19)
  locale               // 'en' (User B's language, NOT User A's 'fr'!)
) {
  // Load translations for RECIPIENT's language
  const translations = await loadTranslations(locale); // 'en'

  // Format date in RECIPIENT's locale
  const formattedDate = formatDateInLocale(scheduledDate, locale);
  // Result: "December 19, 2025" (English format)

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>${emailStyles}</style>
      </head>
      <body>
        <div class="container">
          <h1>${translations.emails.contact_deletion.headline}</h1>
          <!-- "Contact Deletion Notice" -->

          <p>
            ${translations.emails.contact_deletion.greeting.replace('{name}', recipientName)}
          </p>
          <!-- "Hi User B," -->

          <p>
            ${translations.emails.contact_deletion.message.replace('{userName}', deletedUserName)}
          </p>
          <!-- "We wanted to inform you that User A has requested deletion of their Weavink account." -->

          <p>
            ${translations.emails.contact_deletion.deletion_date.replace('{date}', formattedDate)}
          </p>
          <!-- "Their account will be deleted on December 19, 2025." -->

          <div class="impact-section">
            <h3>${translations.emails.contact_deletion.impact_title}</h3>
            <!-- "This means:" -->
            <ul>
              <li>${translations.emails.contact_deletion.impact_1}</li>
              <!-- "They will be removed from your contact list" -->
              <li>${translations.emails.contact_deletion.impact_2}</li>
              <!-- "You will no longer be able to contact them through Weavink" -->
              <li>${translations.emails.contact_deletion.impact_3}</li>
              <!-- "Any data shared with them will no longer be available to them" -->
            </ul>
          </div>

          <p>${translations.emails.contact_deletion.export_suggestion}</p>
          <!-- "If you need to keep any information related to this contact, we recommend you export your data now." -->

          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/account?tab=export" class="button">
            ${translations.emails.contact_deletion.export_button}
          </a>
          <!-- "Export My Data" -->

          <p>${translations.emails.contact_deletion.footer}</p>
          <!-- "Thank you for your understanding." -->

          <p class="footer">
            ${translations.emails.common.team_signature}
            <!-- "The Weavink Team" -->
          </p>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: recipientEmail,
    from: 'noreply@weavink.com',
    subject: translations.emails.contact_deletion.subject,
    html: htmlTemplate,
    text: stripHtml(htmlTemplate)
  });
}
```

**Critical Detail**: Email is generated in **User B's language ('en')**, NOT User A's language ('fr')!

**Timestamp**: T+1700ms to T+1800ms

---

### Phase 8: Mark User A's Account as Pending Deletion

**File**: `/lib/services/servicePrivacy/server/accountDeletionService.js:79-85`

#### Step 8.1: Update User Document
```javascript
await db.collection('users').doc('userA-id').update({
  'privacy.pendingDeletion': true,
  'privacy.deletionRequestId': docRef.id,
  'privacy.deletionRequestedAt': FieldValue.serverTimestamp(),
  'privacy.deletionScheduledFor': deletionRequest.scheduledDeletionDate,
  updatedAt: FieldValue.serverTimestamp()
});
```

#### Step 8.2: Database Result
```
Firestore:
└── users
    └── userA-id
        ├── email: "userA@example.com"
        ├── username: "usera"
        ├── profile: {...}
        ├── privacy
        │   ├── pendingDeletion: true               ← NEW
        │   ├── deletionRequestId: "req-123"        ← NEW
        │   ├── deletionRequestedAt: Timestamp      ← NEW
        │   └── deletionScheduledFor: Timestamp     ← NEW
        └── updatedAt: Timestamp
```

This flag enables:
- Deletion warning banner in NavBar
- Countdown timer on account page
- Restricted account actions
- Cancellation option display

**Timestamp**: T+1800ms to T+1850ms

---

### Phase 9: Send Confirmation Email to User A

**File**: `/lib/services/servicePrivacy/server/accountDeletionService.js:87-100`

#### Step 9.1: Send Email in User A's Language
```javascript
try {
  const userLanguage = userData.settings?.defaultLanguage || 'en';
  // User A's language: 'fr' (French)

  await EmailService.sendAccountDeletionConfirmationEmail(
    userData.email,                           // 'userA@example.com'
    userData.profile?.displayName || userData.username || 'User',
    deletionRequest.scheduledDeletionDate,
    docRef.id,                                // Deletion request ID
    false,                                    // immediate = false
    userLanguage                              // 'fr'
  );
} catch (emailError) {
  console.error('Failed to send deletion confirmation email:', emailError);
  // Non-blocking: continue even if email fails
}
```

#### Step 9.2: Email Content (in French for User A)
```
To: userA@example.com
Subject: Confirmation de Suppression de Compte - Weavink
Language: French

Body:
  Bonjour User A,

  Nous vous confirmons que votre demande de suppression de compte a été enregistrée.

  Date de suppression programmée : 19 décembre 2025

  Vous pouvez annuler cette demande à tout moment avant cette date.

  [Annuler la Suppression] → /dashboard/account?tab=delete

  Que se passera-t-il ?
  - Vos données personnelles seront supprimées
  - Votre profil ne sera plus accessible
  - Vos contacts seront notifiés

  Cordialement,
  L'équipe Weavink
```

**Timestamp**: T+1850ms to T+1900ms

---

### Phase 10: Return Success Response to Frontend

**File**: `/lib/services/servicePrivacy/server/accountDeletionService.js:104-112`

#### Step 10.1: Return Deletion Request Details
```javascript
return {
  success: true,
  message: 'Account deletion requested successfully',
  requestId: docRef.id,                     // 'req-123'
  scheduledDeletionDate: deletionRequest.scheduledDeletionDate,
  affectedContacts: usersWithContact.length // 2
};
```

#### Step 10.2: Frontend Receives Response
```javascript
const data = await response.json();

// Display success message
showToast({
  type: 'success',
  message: `Account deletion scheduled for ${formatDate(data.scheduledDeletionDate)}`,
  description: `${data.affectedContacts} contacts will be notified`
});

// Redirect to account page with deletion tab
router.push('/dashboard/account?tab=delete');
```

#### Step 10.3: Frontend Displays
- Success message
- Deletion countdown timer
- Scheduled date: "December 19, 2025"
- Number of affected contacts: "2 contacts notified"
- Cancellation option button
- Deletion warning banner in NavBar

**Timestamp**: T+1900ms (backend complete)

---

### Phase 11: Cancellation Flow (Optional - If User A Cancels)

**When**: User A cancels their deletion request before the 30-day grace period expires
**Location**: Frontend → API Route → `cancelAccountDeletion()`
**File**: `/lib/services/servicePrivacy/server/accountDeletionService.js:603-678`

#### Step 11.1: User A Initiates Cancellation

```javascript
// User A clicks "Cancel Deletion" button in account settings
const response = await fetch('/api/user/privacy/cancel-account-deletion', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  }
});
```

#### Step 11.2: Update Deletion Request Status

```javascript
// File: /lib/services/servicePrivacy/server/accountDeletionService.js:625-633
await db.collection('PrivacyRequests').doc(deletionRequestId).update({
  status: 'cancelled',
  cancelledAt: FieldValue.serverTimestamp(),
  cancelledBy: userId,
  cancelReason: 'User changed mind during grace period'
});
```

**Database Result**:
```
Firestore:
└── PrivacyRequests
    └── {deletionRequestId}
        ├── userId: "userA-id"
        ├── status: "cancelled" (changed from "pending")
        ├── cancelledAt: Timestamp(2025-11-20)
        └── cancelledBy: "userA-id"
```

#### Step 11.3: Clear User A's Pending Deletion Flags

```javascript
// File: /lib/services/servicePrivacy/server/accountDeletionService.js:635-642
await db.collection('users').doc(userId).update({
  'privacy.pendingDeletion': false,
  'privacy.deletionRequestId': null,
  'privacy.deletionCancelledAt': FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp()
});
```

**Database Result**:
```
Firestore:
└── users
    └── userA-id
        ├── privacy
        │   ├── pendingDeletion: false (changed from true)
        │   ├── deletionRequestId: null (cleared)
        │   └── deletionCancelledAt: Timestamp(2025-11-20)
        └── updatedAt: Timestamp
```

#### Step 11.4: Send Cancellation Email to User A

```javascript
// File: /lib/services/servicePrivacy/server/accountDeletionService.js:644-657
const userLanguage = userData.settings?.defaultLanguage || 'en';

await EmailService.sendAccountDeletionCancelledEmail(
  userData.email,                      // 'userA@example.com'
  userData.profile?.displayName,       // 'User A'
  userLanguage                         // 'fr' (French)
);
```

**Email Content (French for User A)**:
```
To: userA@example.com
Subject: Demande de suppression de compte annulée - Weavink
Language: French

Body:
  Bonjour User A,

  Nous sommes heureux de vous revoir ! Votre demande de suppression de compte a été annulée avec succès.

  Votre compte reste actif et toutes vos données ont été préservées :
  - Tous vos contacts et groupes
  - Vos paramètres de profil et préférences
  - Votre historique d'activité et analyses

  Vous pouvez continuer à utiliser Weavink normalement.

  [Aller au tableau de bord] → /dashboard

  Cordialement,
  L'équipe Weavink
```

#### Step 11.5: Find Users Who Were Notified About Deletion

```javascript
// File: /lib/services/servicePrivacy/server/accountDeletionService.js:659-665
// Reuse same findUsersWithContact() function from Phase 4
const usersWithContact = await findUsersWithContact(
  userId,
  userData.email
);
// Returns: ['userB-id', 'userC-id']
```

#### Step 11.6: Notify Contacts About Cancellation

```javascript
// File: /lib/services/servicePrivacy/server/accountDeletionService.js:667-678
if (usersWithContact.length > 0) {
  await notifyContactDeletionCancellation(
    userId,                    // 'userA-id'
    usersWithContact,         // ['userB-id', 'userC-id']
    userData.profile?.displayName || userData.username
  );
}
```

**Function Implementation**:
```javascript
async function notifyContactDeletionCancellation(deletedUserId, userIds, userName) {
  console.log(`[AccountDeletion] Notifying ${userIds.length} users about cancellation`);

  // Create notifications in parallel
  const notifications = userIds.map((userId) => {
    return db.collection('users')
      .doc(userId)
      .collection('notifications')
      .add({
        type: 'contact_deletion_cancelled',
        title: 'Contact Deletion Cancelled',
        message: `${userName} has cancelled their account deletion request. They will remain in your contact list.`,
        deletedUserId: deletedUserId,
        deletedUserName: userName,
        createdAt: FieldValue.serverTimestamp(),
        read: false
      });
  });

  await Promise.all(notifications);
}
```

**Database Result** (for each affected user):
```
Firestore:
└── users
    └── userB-id
        └── notifications
            └── {auto-generated-id}
                ├── type: 'contact_deletion_cancelled'
                ├── title: 'Contact Deletion Cancelled'
                ├── message: 'User A has cancelled their deletion...'
                ├── deletedUserId: 'userA-id'
                ├── deletedUserName: 'User A'
                ├── createdAt: Timestamp(2025-11-20)
                └── read: false
```

#### Step 11.7: Send Cancellation Emails to Contacts

```javascript
// File: /lib/services/servicePrivacy/server/accountDeletionService.js
const emailPromises = [];

for (const userId of usersWithContact) {
  const userDoc = await db.collection('users').doc(userId).get();

  if (userDoc.exists) {
    const contactUserData = userDoc.data();
    const contactUserLanguage = contactUserData.settings?.defaultLanguage || 'en';

    // Each contact gets email in THEIR language
    emailPromises.push(
      EmailService.sendContactDeletionCancelledEmail(
        contactUserData.email,                    // 'userB@example.com'
        contactUserData.profile?.displayName,     // 'User B'
        userData.profile?.displayName,            // 'User A'
        contactUserLanguage                       // 'en' (User B's language!)
      ).catch(error => {
        console.error(`Failed to send cancellation notice to ${userId}:`, error);
      })
    );
  }
}

await Promise.allSettled(emailPromises);
```

**Email Content to User B (English)**:
```
To: userB@example.com
Subject: Contact Deletion Cancelled - Weavink
Language: English

Body:
  Hi User B,

  Good news! User A has cancelled their account deletion request.

  This means:
  - They remain in your contact list
  - You can continue to contact them through Weavink
  - No changes to your shared data

  You can continue collaborating with User A as before. No action is required on your part.

  Best regards,
  The Weavink Team
```

**Critical Detail**: Email sent to User B in **English** (User B's language), NOT French (User A's language)!

#### Step 11.8: Return Success Response

```javascript
return {
  success: true,
  message: 'Account deletion cancelled successfully',
  affectedContacts: usersWithContact.length
};
```

**Frontend Result**:
- Deletion warning banner removed from NavBar
- Account page shows normal state (no pending deletion)
- Success toast: "Account deletion cancelled. X contacts were notified."
- User can continue using Weavink normally

**Total Cancellation Time**: ~1-2 seconds (same performance as deletion request)

**Timestamp**: Cancellation T+0 to T+2000ms

---

### Email Delivery (Asynchronous)

**Timestamp**: T+2000ms to T+5000ms (SMTP dependent)

User B receives email in their inbox:
- **Subject**: "Contact Deletion Notice - Weavink" (English)
- **Content**: All in English (User B's language)
- **Date Format**: "December 19, 2025" (English locale)
- **Button**: "Export My Data"

**Total Process Time**:
- Backend: ~2 seconds
- Email delivery: Additional 2-5 seconds

---

## Database Schema Changes

### Collections Created/Modified

#### 1. PrivacyRequests Collection
**Path**: `/PrivacyRequests/{requestId}`

**Document Structure**:
```javascript
{
  userId: "userA-id",
  userEmail: "userA@example.com",
  userName: "User A",
  requestedAt: Timestamp,
  status: "pending",
  type: "deletion",
  scheduledDeletionDate: Timestamp,
  reason: "Testing cascade notification",
  immediate: false,
  keepBillingData: true,
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  completedAt: null,
  steps: {
    userDataDeleted: false,
    contactsNotified: false,
    cascadeCompleted: false,
    billingArchived: false,
    authDeleted: false
  }
}
```

#### 2. users/{userId}/notifications Subcollection
**Path**: `/users/{userB-id}/notifications/{notificationId}`

**Document Structure**:
```javascript
{
  type: "contact_deletion",
  title: "Contact Deletion Notice",
  message: "User A has requested deletion of their Weavink account. Their contact information will be anonymized in 30 days.",
  deletedUserId: "userA-id",
  deletedUserName: "User A",
  scheduledDate: Timestamp(2025-12-19),
  createdAt: Timestamp(2025-11-19),
  read: false,
  action: {
    type: "view_contact",
    contactId: "userA-id"
  }
}
```

#### 3. users/{userId} Document Update
**Path**: `/users/{userA-id}`

**Fields Added**:
```javascript
{
  privacy: {
    pendingDeletion: true,
    deletionRequestId: "req-123",
    deletionRequestedAt: Timestamp,
    deletionScheduledFor: Timestamp
  },
  updatedAt: Timestamp
}
```

---

## Code References

### Main Service File
**File**: `/lib/services/servicePrivacy/server/accountDeletionService.js`

| Function | Lines | Purpose |
|----------|-------|---------|
| `requestAccountDeletion()` | 22-112 | Main orchestration function |
| `findUsersWithContact()` | 342-371 | Query all Contacts for user |
| `notifyContactDeletion()` | 444-501 | Create notifications + send emails |

### Email Service
**File**: `/lib/services/server/emailService.js`

| Function | Lines | Purpose |
|----------|-------|---------|
| `sendContactDeletionNoticeEmail()` | 312-337 | Send email to affected contacts |
| `sendAccountDeletionConfirmationEmail()` | 1051-1115 | Send confirmation to deleting user |
| Email template | 1117-1248 | HTML template for contact notice |

### API Route
**File**: `/app/api/user/privacy/delete-account/route.js`

- Request validation
- Rate limiting enforcement
- Metadata extraction
- Service invocation

### Testing Documentation
**File**: `/documentation/testing/EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md`

- Test 2.3: Contact Deletion Notice Email (lines 365-452)
- Verification checklist
- Multi-language testing
- Database verification queries

---

## Timeline Analysis

### Complete Timeline (T+0 to T+5000ms)

```
T+0ms       User A clicks "Delete Account"
T+50ms      API receives request, validates
T+100ms     Fetch User A data from Firestore
T+150ms     Create PrivacyRequest document
T+200ms     Start querying ALL Contacts documents
T+1500ms    Query complete - found 2 users with User A as contact
T+1550ms    Create notification in User B's subcollection
T+1560ms    Create notification in User C's subcollection
T+1600ms    Fetch User B's profile & language ('en')
T+1650ms    Fetch User C's profile & language ('es')
T+1700ms    Generate email template for User B (English)
T+1720ms    Generate email template for User C (Spanish)
T+1750ms    Send emails to SMTP server (async)
T+1800ms    Update User A's privacy.pendingDeletion flag
T+1850ms    Send confirmation email to User A (French)
T+1900ms    Return success response to frontend

// Asynchronous email delivery
T+2000ms    User B's email delivered to inbox (SMTP)
T+2100ms    User C's email delivered to inbox (SMTP)
T+2200ms    User A's email delivered to inbox (SMTP)
```

### Performance Breakdown

| Phase | Duration | Percentage |
|-------|----------|------------|
| Request validation | 50ms | 2.6% |
| User data fetch | 50ms | 2.6% |
| Create PrivacyRequest | 50ms | 2.6% |
| **Find users with contact** | **1300ms** | **68.4%** ⚠️ |
| Create notifications | 10ms | 0.5% |
| Fetch affected user data | 100ms | 5.3% |
| Generate email templates | 50ms | 2.6% |
| Update user document | 50ms | 2.6% |
| Send confirmation email | 50ms | 2.6% |
| Return response | 0ms | 0% |
| **Total backend** | **1900ms** | **100%** |

**Bottleneck**: Phase 4 (`findUsersWithContact`) takes 68% of total time due to full collection scan.

### Optimization Opportunities

1. **Index Contacts by UserId**: Create Firestore composite index
2. **Maintain Reverse Lookup Table**: Track "who has me as contact"
3. **Use Collection Group Queries**: Query across all Contacts subcollections
4. **Cache Contact Relationships**: Redis cache for frequent lookups

---

## Technical Insights

### 1. Parallel Operations

**Strategy**: Maximize concurrency with `Promise.all()` and `Promise.allSettled()`

```javascript
// Notifications created in parallel
const notifications = userIds.map(userId => createNotification(userId));
await Promise.all(notifications);

// Emails sent in parallel with error tolerance
const emailPromises = userIds.map(userId => sendEmail(userId));
await Promise.allSettled(emailPromises);
```

**Benefits**:
- 2 users notified in same time as 1 user
- Email failures don't block other emails
- Total time = slowest individual operation (not sum of all)

### 2. Non-Blocking Email Failures

**Pattern**: Use `.catch()` within individual promises

```javascript
emailPromises.push(
  sendEmail(user).catch(error => {
    console.error(`Failed to send to ${user}:`, error);
    // Continue processing other users
  })
);
```

**Result**: Deletion request succeeds even if SMTP server is down

### 3. Multi-Language Handling

**Critical Rule**: Each recipient gets content in **their own language**, not the deleter's

```javascript
// ❌ WRONG: Using deleter's language
const deletingUserLanguage = 'fr';
sendEmail(recipientEmail, deletingUserLanguage); // Recipient gets French email!

// ✅ CORRECT: Using recipient's language
const recipientLanguage = recipientData.settings?.defaultLanguage || 'en';
sendEmail(recipientEmail, recipientLanguage); // Recipient gets English email!
```

**Implementation**:
```javascript
for (const userId of affectedUsers) {
  const userDoc = await db.collection('users').doc(userId).get();
  const userLanguage = userDoc.data().settings?.defaultLanguage || 'en';

  // Each user gets email in THEIR language
  await sendContactDeletionNoticeEmail(
    userDoc.data().email,
    userName,
    deletionDate,
    userLanguage  // Different for each user!
  );
}
```

### 4. Expensive Query Pattern

**Current Implementation**:
```javascript
// ⚠️ Expensive: Scans entire Contacts collection
const allContactsDocs = await db.collection('Contacts').get();
allContactsDocs.forEach(doc => {
  const contacts = doc.data().contacts || [];
  // Check if any contact matches deleted user
});
```

**Why Expensive**:
- Reads ALL documents in Contacts collection
- Downloads full document data (not just IDs)
- No index optimization
- Time complexity: O(n * m) where n=users, m=contacts per user

**Recommended Solution**:
```javascript
// ✅ Better: Use collection group query with index
const contactsQuery = db.collectionGroup('Contacts')
  .where('contacts', 'array-contains', { userId: deletedUserId });
const snapshot = await contactsQuery.get();
```

**Future Optimization**: Maintain reverse lookup index
```
Firestore:
└── ContactRelationships
    └── {userA-id}
        └── appearsInContacts: ['userB-id', 'userC-id', 'userD-id']
```

### 5. Database Write Batching

**Pattern**: Multiple writes per affected user

For each affected user (e.g., User B):
1. Create notification document (write #1)
2. Later: Anonymize contact entry (write #2)
3. Later: Mark notification as read (write #3)

**Total Writes**: 3-4 writes × number of affected users

**Optimization**: Could batch writes using `WriteBatch` for atomic operations

---

## Future Revisions

### Planned Feature: Non-User Data Deletion Requests

**Motivation**: GDPR Article 17 compliance for non-registered users

**Use Case**: A person who never signed up for Weavink, but whose contact information exists in users' contact lists, should be able to request deletion of that data.

#### Implementation Overview

**1. Public Deletion Request Form**
- URL: `https://www.weavink.com/privacy/delete-my-data`
- No login required
- Form fields:
  - Email address (required)
  - Phone number (optional)
  - Full name (required)
  - Reason (optional)
  - reCAPTCHA verification

**2. Email-Based Verification**
```javascript
// Step 1: User submits form
POST /api/public/privacy/request-deletion
{
  email: "external@example.com",
  phone: "+33612345678",
  name: "External Contact",
  reason: "I want my data removed"
}

// Step 2: System sends verification email
{
  subject: "Verify Data Deletion Request",
  body: "Click to verify: https://www.weavink.com/privacy/verify?token=xxx",
  expiresIn: "24 hours"
}

// Step 3: User clicks verification link
GET /api/public/privacy/verify?token=xxx

// Step 4: System searches and anonymizes
```

**3. Search Strategy**
```javascript
async function findNonUserContactData(email, phone, name) {
  const allContactsDocs = await db.collection('Contacts').get();
  const matches = [];

  allContactsDocs.forEach((doc) => {
    const contacts = doc.data().contacts || [];

    contacts.forEach((contact, index) => {
      // Match by email, phone, or name
      const isMatch =
        contact.email === email ||
        contact.phone === phone ||
        contact.name === name;

      if (isMatch) {
        matches.push({
          ownerId: doc.id,
          contactIndex: index,
          contactData: contact
        });
      }
    });
  });

  return matches;
}
```

**4. Anonymization Process**
```javascript
async function anonymizeNonUserContact(matches) {
  for (const match of matches) {
    const contactsDoc = await db.collection('Contacts').doc(match.ownerId).get();
    const contacts = contactsDoc.data().contacts || [];

    // Anonymize the specific contact
    contacts[match.contactIndex] = {
      ...contacts[match.contactIndex],
      name: "[Contact Removed - GDPR Request]",
      email: "[deleted]",
      phone: "[deleted]",
      notes: `${contacts[match.contactIndex].notes || ''}\n\n[Contact requested data deletion on ${new Date().toISOString()}]`,
      deletedAt: new Date().toISOString(),
      deletionReason: "GDPR Article 17 - Non-user request"
    };

    await db.collection('Contacts').doc(match.ownerId).update({ contacts });
  }
}
```

**5. Notification to Contact Owners**
```javascript
// For each user whose contact was anonymized
await EmailService.sendNonUserDeletionNoticeEmail(
  ownerEmail,
  ownerLanguage,
  deletedContactName,
  matchCount // How many contacts were deleted
);

// Create in-app notification
await db.collection('users').doc(ownerId).collection('notifications').add({
  type: 'non_user_contact_deletion',
  title: 'Contact Removed - Privacy Request',
  message: `${deletedContactName} requested removal of their contact information under GDPR Article 17.`,
  createdAt: FieldValue.serverTimestamp(),
  read: false
});
```

#### Technical Challenges

**Challenge 1: Identity Verification**
- Risk: Malicious requests to delete someone else's data
- Solution: Email verification token with 24-hour expiry
- Additional: Optional phone verification for high-confidence matches

**Challenge 2: Fuzzy Matching**
- Issue: Same person might be stored with variations ("John Smith" vs "J. Smith")
- Solution: Implement fuzzy name matching algorithm
- Consideration: Allow user to review matches before deletion

**Challenge 3: Compliance Audit Trail**
- Requirement: Log all non-user deletion requests for 12 months
- Solution: Store in `NonUserDeletionRequests` collection
```javascript
{
  requestId: "non-user-req-001",
  email: "external@example.com",
  verifiedAt: Timestamp,
  matchesFound: 3,
  usersAffected: ['userB-id', 'userC-id'],
  status: 'completed',
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0..."
}
```

**Challenge 4: False Positives**
- Issue: Common names might match unrelated contacts
- Solution: Multi-factor matching (email + phone + name)
- UI: Show preview of matches before proceeding

**Challenge 5: Performance**
- Issue: Same expensive query as regular deletion
- Solution: Same optimization strategies (indexes, reverse lookup)

#### User Flow

```
1. Non-user visits: weavink.com/privacy/delete-my-data
2. Fills form: email, phone, name, reason
3. Submits → System sends verification email
4. Opens email → Clicks verification link
5. System searches:
   - Found 3 matches in 2 users' contact lists
6. Displays matches:
   "We found your information in these contacts:
    - John Doe's contacts (saved as 'External Contact')
    - Jane Smith's contacts (saved as 'External Person')"
7. User confirms deletion
8. System:
   - Anonymizes all matches
   - Sends notification emails to contact owners (John, Jane)
   - Creates audit log entry
   - Displays success message
9. Follow-up email:
   "Your data has been removed from 2 users' contact lists.
    The owners have been notified."
```

#### API Endpoints (New)

```javascript
// Public endpoints (no auth required)
POST   /api/public/privacy/request-deletion      // Submit deletion request
GET    /api/public/privacy/verify                // Verify email token
POST   /api/public/privacy/confirm-deletion      // Confirm after reviewing matches

// Admin endpoints (auth required)
GET    /api/admin/privacy/non-user-requests      // View all requests
GET    /api/admin/privacy/non-user-audit-log     // Audit trail
```

#### Database Schema (New)

**Collection**: `NonUserDeletionRequests`
```javascript
{
  requestId: "non-user-req-001",
  submittedAt: Timestamp,
  verifiedAt: Timestamp,
  completedAt: Timestamp,
  email: "external@example.com",
  phone: "+33612345678",
  name: "External Contact",
  reason: "GDPR request",
  verificationToken: "hashed-token",
  tokenExpiresAt: Timestamp,
  status: "pending" | "verified" | "completed" | "expired",
  matchesFound: 3,
  usersAffected: ['userB-id', 'userC-id'],
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0..."
}
```

#### Timeline Estimate

- **Design & Planning**: 2-3 days
- **Backend Implementation**: 5-7 days
- **Frontend UI**: 3-4 days
- **Email Templates**: 1-2 days
- **Testing & QA**: 3-5 days
- **Legal Review**: Variable (external)
- **Total**: 14-21 days

#### Legal Considerations

- **GDPR Article 17**: Right to erasure applies to non-users
- **Legitimate Interest**: Contact owners have legitimate interest in keeping business cards
- **Balance Test**: Individual's rights vs. contact owner's rights
- **Documentation**: Clear audit trail for supervisory authorities
- **Response Time**: Must respond within 30 days of verified request

---

## Related Documentation

### RGPD/GDPR Compliance
- [RGPD Implementation Summary](RGPD_IMPLEMENTATION_SUMMARY.md) - Complete Phase 1-4 summary
- [RGPD Compliance Matrix](RGPD_COMPLIANCE_MATRIX.md) - Consent types and legal framework
- [RGPD Architecture Compliance](RGPD_ARCHITECTURE_COMPLIANCE.md) - 5-layer pattern alignment
- [RGPD Testing Guide](RGPD_TESTING_GUIDE.md) - 116 tests covering all phases

### Email System
- [Email Notification Manual Test Guide](EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md) - Test 2.3 covers this flow
- [Email Integration Guide](EMAIL_INTEGRATION_GUIDE.md) - Adding new email types
- [Email Service Translation](EMAIL_INTEGRATION_GUIDE.md#translation-structure) - Multilingual emails

### Testing & QA
- [Account Privacy Testing Guide](ACCOUNT_PRIVACY_TESTING_GUIDE.md) - End-to-end testing
- [Rate Limit Testing](RATE_LIMIT_TESTING.md) - Rate limit enforcement

### Technical Architecture
- [Admin Security Layers Guide](ADMIN_SECURITY_LAYERS_GUIDE.md) - 7-layer security
- [Comprehensive Refactoring Guide](COMPREHENSIVE_REFACTORING_GUIDE.md) - Best practices

---

## Document Maintenance

**Last Updated**: 2025-11-20
**Maintained By**: Weavink Engineering Team
**Review Frequency**: Quarterly or after major changes
**Version**: 1.1

### Changelog
- **2025-11-20**: Added Phase 11 (Cancellation Flow) - documents contact notification when User A cancels deletion
- **2025-11-19**: Initial document creation (Phases 1-10)
- **Future**: Add non-user deletion feature documentation

---

**End of Document**
