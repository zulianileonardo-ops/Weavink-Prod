---
id: tutorials-email-integration-066
title: Email Integration Guide - Adding New Email Types
category: tutorials
tags: [email, notifications, multilingual, i18n, rgpd, development, tutorial]
status: active
created: 2025-11-19
updated: 2025-11-19
related:
  - EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md
  - RGPD_IMPLEMENTATION_SUMMARY.md
  - RGPD_ARCHITECTURE_COMPLIANCE.md
---

# Email Integration Guide - Adding New Email Types

## Purpose

This guide provides step-by-step instructions for developers to add new multilingual email notifications to the Weavink email system. Use this guide when you need to implement email notifications for new features or GDPR compliance requirements.

**Audience:** Backend developers, full-stack developers
**Prerequisites:** Understanding of Next.js, i18next, Brevo API
**Estimated Time:** 2-4 hours per email type

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Step-by-Step Integration](#step-by-step-integration)
3. [Code Examples](#code-examples)
4. [Translation Structure](#translation-structure)
5. [Testing Checklist](#testing-checklist)
6. [Common Pitfalls](#common-pitfalls)
7. [Best Practices](#best-practices)

---

## System Overview

### Architecture

The email notification system consists of three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                     Email Notification Flow                  │
└─────────────────────────────────────────────────────────────┘

1. Trigger (API Route or Service)
   ↓
2. EmailService.sendXxxEmail(...)
   ↓
3. Load Translations (Server-Side)
   ↓
4. Generate HTML Template
   ↓
5. Send via Brevo API
   ↓
6. Return Success/Failure (Non-Blocking)
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **EmailService** | `lib/services/server/emailService.js` | Core email service with static methods |
| **Translations** | `public/locales/{locale}/common.json` | Multilingual email content |
| **Brevo API** | External service | Email delivery provider |
| **Environment Config** | `.env` | API key (`SMTP_API`) |

### Supported Languages

- English (en)
- French (fr)
- Spanish (es)
- Chinese (zh)
- Vietnamese (vm)

---

## Step-by-Step Integration

### Step 1: Define Email Requirements

Before writing code, answer these questions:

1. **What triggers the email?** (User action, system event, scheduled task)
2. **Who receives it?** (Single user, multiple users, admin)
3. **What information does it contain?** (Dynamic data, static content)
4. **What GDPR articles apply?** (Art. 12, 13, 14, 20, etc.)
5. **What user action is expected?** (Click button, download, confirm, etc.)

**Example: Password Reset Email**
- Trigger: User clicks "Forgot Password"
- Recipient: Single user (requestor)
- Content: Reset link, expiration time, security warning
- GDPR: Art. 12 (Transparent communication)
- Action: Click reset link

### Step 2: Add Translation Keys

Add email content to all 5 language files:

**File:** `/public/locales/en/common.json`

```json
{
  "emails": {
    "password_reset": {
      "subject": "Password Reset Request - Weavink",
      "headline": "Reset Your Password",
      "intro": "We received a request to reset your password for your Weavink account.",
      "action_required": "To reset your password, click the button below:",
      "button_text": "Reset Password",
      "expiration_notice": "This link will expire in {{hours}} hours.",
      "security_warning": "If you didn't request this, please ignore this email and ensure your account is secure.",
      "alternative_link": "If the button doesn't work, copy and paste this link into your browser:",
      "footer_note": "For security reasons, we cannot change your password without your confirmation."
    }
  }
}
```

**Repeat for all 5 languages:**
- `/public/locales/fr/common.json` (French)
- `/public/locales/es/common.json` (Spanish)
- `/public/locales/ch/common.json` (Chinese - **Note:** Use 'zh' in code, 'ch' in file path)
- `/public/locales/vm/common.json` (Vietnamese)

**Translation Variables:**
- Use `{{variable}}` syntax for dynamic content
- Keep variable names in English (they're replaced at runtime)
- Example: `{{userName}}`, `{{date}}`, `{{count}}`

### Step 3: Create Email Method in EmailService

**File:** `lib/services/server/emailService.js`

Add a new static method to the EmailService class:

```javascript
/**
 * Send password reset email
 * @param {string} recipientEmail - User's email address
 * @param {string} recipientName - User's display name
 * @param {string} resetToken - Password reset token
 * @param {number} expirationHours - Token expiration time (e.g., 24)
 * @param {string} locale - User's language (en, fr, es, zh, vm)
 * @returns {Promise<boolean>} Success status
 */
static async sendPasswordResetEmail(
  recipientEmail,
  recipientName,
  resetToken,
  expirationHours = 24,
  locale = 'en'
) {
  try {
    console.log(`📧 [EmailService] Sending password reset email to: ${recipientEmail} (locale: ${locale})`);

    // Step 1: Load translations
    const translations = this.loadTranslations(locale);
    const t = translations.emails?.password_reset;

    if (!t) {
      console.error(`❌ Missing email translations for locale: ${locale}`);
      return false;
    }

    // Step 2: Prepare translation variables
    const subject = t.subject || 'Password Reset Request - Weavink';
    const headline = t.headline || 'Reset Your Password';
    const intro = t.intro || 'We received a request to reset your password.';
    const actionRequired = t.action_required || 'To reset your password, click the button below:';
    const buttonText = t.button_text || 'Reset Password';
    const expirationNotice = (t.expiration_notice || 'This link will expire in {{hours}} hours.')
      .replace('{{hours}}', expirationHours);
    const securityWarning = t.security_warning || 'If you didn\'t request this, please ignore this email.';
    const alternativeLink = t.alternative_link || 'If the button doesn\'t work, copy this link:';
    const footerNote = t.footer_note || 'For security reasons, we cannot change your password without confirmation.';

    // Footer translations (shared across all emails)
    const thankYou = translations.thank_you || 'Thank you,';
    const teamName = translations.team_name || 'The Weavink Team';

    // Step 3: Generate reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;

    // Step 4: Create HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">${headline}</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                      ${intro}
                    </p>

                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                      ${actionRequired}
                    </p>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
                        ${buttonText}
                      </a>
                    </div>

                    <!-- Expiration Notice -->
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                      <p style="color: #856404; margin: 0; font-size: 14px;">
                        ⏱️ ${expirationNotice}
                      </p>
                    </div>

                    <!-- Security Warning -->
                    <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px;">
                      <p style="color: #721c24; margin: 0; font-size: 14px;">
                        🔒 ${securityWarning}
                      </p>
                    </div>

                    <!-- Alternative Link -->
                    <p style="color: #666; font-size: 13px; line-height: 1.6; margin-top: 30px;">
                      ${alternativeLink}
                    </p>
                    <p style="color: #667eea; font-size: 12px; word-break: break-all; background-color: #f4f4f4; padding: 10px; border-radius: 4px;">
                      ${resetLink}
                    </p>

                    <!-- Footer Note -->
                    <p style="color: #999; font-size: 12px; line-height: 1.5; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                      ${footerNote}
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
                    <p style="margin: 0 0 10px 0; color: #333; font-size: 14px;">${thankYou}</p>
                    <p style="margin: 0; color: #667eea; font-weight: bold; font-size: 14px;">${teamName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Step 5: Send via Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: 'Weavink',
          email: 'noreply@weavink.io',
        },
        to: [
          {
            email: recipientEmail,
            name: recipientName,
          },
        ],
        subject,
        htmlContent,
        // Disable tracking for GDPR compliance
        params: {
          TRACKING: 0,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Brevo API Error:', error);
      return false;
    }

    console.log(`✅ Password reset email sent successfully to: ${recipientEmail}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return false;
  }
}
```

### Step 4: Integrate Email Call in Your API/Service

**Option A: API Route Integration**

**File:** `app/api/auth/forgot-password/route.js`

```javascript
import EmailService from '@/lib/services/server/emailService';

export async function POST(request) {
  try {
    const { email } = await request.json();

    // Generate reset token (your logic)
    const resetToken = generateResetToken(email);

    // Get user data
    const user = await getUserByEmail(email);

    // Send email (non-blocking)
    EmailService.sendPasswordResetEmail(
      email,
      user.displayName,
      resetToken,
      24, // 24 hours expiration
      user.settings?.defaultLanguage || 'en'
    ).catch(err => {
      // Log but don't block the operation
      console.error('Email send failed:', err);
    });

    // Return success immediately (don't wait for email)
    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Option B: Server Service Integration**

**File:** `lib/services/serviceAuth/server/passwordResetService.js`

```javascript
import EmailService from '@/lib/services/server/emailService';

export class PasswordResetService {
  static async requestReset(userId, userEmail, userName, locale) {
    try {
      // Create reset request in database
      const resetRequest = await this.createResetRequest(userId);

      // Send email notification
      await EmailService.sendPasswordResetEmail(
        userEmail,
        userName,
        resetRequest.token,
        24,
        locale
      );

      return resetRequest;
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  }
}
```

### Step 5: Test Your Implementation

Use the testing checklist in [Testing Checklist](#testing-checklist) section below.

---

## Translation Structure

### Standard Email Structure

All email translations should follow this structure:

```json
{
  "emails": {
    "your_email_type": {
      "subject": "Subject Line - Weavink",
      "headline": "Main Headline",
      "intro": "Introduction paragraph with {{variables}}",
      "body_section_1": "First body section",
      "body_section_2": "Second body section",
      "button_text": "Call-to-Action Text",
      "footer_note": "Additional information",
      "legal_notice": "GDPR compliance note (if applicable)"
    }
  }
}
```

### Common Variables

| Variable | Usage | Example |
|----------|-------|---------|
| `{{userName}}` | User's display name | "John Doe" |
| `{{userEmail}}` | User's email | "john@example.com" |
| `{{date}}` | Formatted date | "December 19, 2025" |
| `{{count}}` | Numeric count | "5" |
| `{{requestId}}` | Request ID | "KbACCgyNGTR3ktFReH53" |
| `{{link}}` | URL (use carefully) | "https://..." |

### Shared Footer Translations

These keys are shared across ALL emails:

```json
{
  "thank_you": "Thank you,",
  "team_name": "The Weavink Team",
  "request_id": "Request ID:",
  "dpo_label": "Data Protection Officer:"
}
```

**Usage in Code:**
```javascript
const thankYou = translations.thank_you || 'Thank you,';
const teamName = translations.team_name || 'The Weavink Team';
```

---

## Testing Checklist

### Pre-Deployment Testing

- [ ] **Method Created:** Email method exists in EmailService class
- [ ] **Translations Added:** All 5 languages have complete translations
- [ ] **Variables Work:** All `{{variable}}` placeholders replaced correctly
- [ ] **Integration Complete:** Email called from API/service
- [ ] **Locale Passed:** User's language preference passed to email method
- [ ] **Non-Blocking:** Email failures don't stop main operation

### Email Content Testing

- [ ] **Subject Line:** Correct for each language
- [ ] **Headline:** Displays properly in all languages
- [ ] **Body Content:** All text translated, no English fallbacks
- [ ] **Footer:** Translated footer (not hardcoded English)
- [ ] **Buttons/Links:** CTA buttons work and link correctly
- [ ] **HTML Rendering:** Email renders correctly in:
  - [ ] Gmail
  - [ ] Outlook
  - [ ] Apple Mail
  - [ ] Mobile devices

### Multilingual Testing

Test with accounts in each language:

- [ ] **English (en):** ✅ All text in English
- [ ] **French (fr):** ✅ All text in French (including footer)
- [ ] **Spanish (es):** ✅ All text in Spanish
- [ ] **Chinese (zh):** ✅ All text in Chinese
- [ ] **Vietnamese (vm):** ✅ All text in Vietnamese or English fallback

### GDPR Compliance

- [ ] **No Tracking:** Brevo tracking disabled (`TRACKING: 0`)
- [ ] **Unsubscribe:** Not required for transactional emails
- [ ] **Data Minimization:** Only necessary information included
- [ ] **Legal Basis:** GDPR article noted in documentation
- [ ] **DPO Contact:** DPO email included if relevant

### Error Handling

- [ ] **Missing Translation:** Falls back to English gracefully
- [ ] **Invalid Email:** Logs error, doesn't crash
- [ ] **API Failure:** Logs error, returns false
- [ ] **Network Error:** Handles timeout gracefully

---

## Common Pitfalls

### Pitfall 1: Hardcoded English Text

❌ **Wrong:**
```javascript
const footer = 'Thank you, The Weavink Team';
```

✅ **Correct:**
```javascript
const thankYou = translations.thank_you || 'Thank you,';
const teamName = translations.team_name || 'The Weavink Team';
const footer = `${thankYou} ${teamName}`;
```

### Pitfall 2: Property Name Mismatch

❌ **Wrong:**
```javascript
// Backend sends: exportSummary.consentCount
// Template expects: exportSummary.consentsCount (plural)
const count = exportSummary?.consentsCount || 0; // Always 0!
```

✅ **Correct:**
```javascript
// Match backend property names exactly
const count = exportSummary?.consentCount || 0;
```

### Pitfall 3: Exposing API Key

❌ **Wrong:**
```bash
# .env file
NEXT_PUBLIC_SMTP_API=xkeysib-abc123 # Exposed to browser!
```

✅ **Correct:**
```bash
# .env file
SMTP_API=xkeysib-abc123 # Server-side only
```

### Pitfall 4: Blocking Operations

❌ **Wrong:**
```javascript
// Email failure blocks account deletion
const emailSent = await EmailService.sendEmail(...);
if (!emailSent) {
  throw new Error('Cannot delete account: email failed');
}
```

✅ **Correct:**
```javascript
// Email is non-blocking
EmailService.sendEmail(...).catch(err => {
  console.error('Email failed but continuing:', err);
});
// Continue with account deletion
```

### Pitfall 5: Missing Locale Parameter

❌ **Wrong:**
```javascript
// Always sends English emails
EmailService.sendEmail(email, name, data);
```

✅ **Correct:**
```javascript
// Send in user's language
const locale = user.settings?.defaultLanguage || 'en';
EmailService.sendEmail(email, name, data, locale);
```

---

## Best Practices

### 1. Code Organization

```javascript
// ✅ Good: Clear method structure
static async sendXxxEmail(recipient, data, locale) {
  // Step 1: Load translations
  const translations = this.loadTranslations(locale);

  // Step 2: Prepare variables
  const subject = translations.emails.xxx.subject;

  // Step 3: Generate HTML
  const html = this.generateTemplate(...);

  // Step 4: Send via API
  return await this.sendViaBrevo(recipient, subject, html);
}
```

### 2. Error Logging

```javascript
// ✅ Good: Structured logging with emojis
console.log(`📧 [EmailService] Sending password reset to: ${email}`);
console.log(`✅ [EmailService] Email sent successfully`);
console.error(`❌ [EmailService] Failed to send email:`, error);
```

### 3. Translation Fallbacks

```javascript
// ✅ Good: Always provide fallbacks
const subject = translations?.emails?.xxx?.subject || 'Default Subject - Weavink';
```

### 4. HTML Email Template Tips

- Use **inline CSS** (email clients strip `<style>` tags)
- Use **tables for layout** (flexbox/grid not supported)
- Test in **multiple email clients** (rendering varies greatly)
- Keep **width ≤ 600px** (mobile compatibility)
- Use **web-safe fonts** (Arial, Helvetica, Georgia)
- **Avoid JavaScript** (blocked by all email clients)

### 5. GDPR Compliance

```javascript
// ✅ Good: Disable tracking
params: {
  TRACKING: 0, // No open/click tracking
}
```

```javascript
// ✅ Good: Include legal basis
const legalNotice = translations.emails.xxx.legal_notice ||
  'This email is sent in compliance with GDPR Article 12.';
```

### 6. Testing in Development

```bash
# Test email locally with real Brevo account
npm run dev

# Send test email via API
curl -X POST http://localhost:3000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","locale":"fr"}'
```

---

## Reference: Existing Email Types

Study these implementations for examples:

1. **Account Deletion Confirmation** - `EmailService.sendAccountDeletionConfirmationEmail`
2. **Contact Deletion Notice** - `EmailService.sendContactDeletionNoticeEmail`
3. **Account Deletion Completed** - `EmailService.sendAccountDeletionCompletedEmail`
4. **Account Deletion Cancelled** - `EmailService.sendAccountDeletionCancelledEmail`
5. **Data Export Completed** - `EmailService.sendDataExportCompletedEmail`

---

## Related: API Error Message Translation

**New Feature** (2025-11-19): The same translation pattern used for emails has been extended to **API error messages**.

### How It Works

API routes now translate error messages to the user's language using the same translation service:

```javascript
import { translateServerSide, getUserLocale } from '@/lib/services/server/translationService';

export async function POST(request) {
  const session = await createApiSession(request);
  const locale = getUserLocale(session.user); // Same function as emails!

  // Error message in user's language
  if (!session.permissions[PRIVACY_PERMISSIONS.CAN_DELETE_ACCOUNT]) {
    return NextResponse.json(
      { error: translateServerSide('privacy.errors.permission.denied', locale) },
      { status: 403 }
    );
  }
}
```

### Translation Keys vs Full Text

**Emails:** Use full text in translation files (easy to read)
```json
{
  "emails": {
    "account_deletion_confirmation": {
      "subject": "Account Deletion Confirmation - Weavink",
      "headline": "Your account deletion has been requested"
    }
  }
}
```

**API Errors:** Use translation keys in constants (consistent references)
```javascript
// Constants file
export const PRIVACY_ERROR_MESSAGES = {
  DELETION_RATE_LIMIT: 'privacy.errors.deletion.rate_limit' // key, not text!
};

// Translation file
{
  "privacy": {
    "errors": {
      "deletion": {
        "rate_limit": "Trop de demandes de suppression. Veuillez réessayer plus tard."
      }
    }
  }
}
```

### Shared Functions

Both email and API error systems use the same translation service:

| Function | Usage | Shared By |
|----------|-------|-----------|
| `getUserLocale(user)` | Get user's language preference | ✅ Emails & API Errors |
| `translateServerSide(key, locale)` | Translate text server-side | ✅ Emails & API Errors |
| `loadTranslations(locale)` | Load JSON translation files | ✅ Emails & API Errors (internal) |

### Benefits of Unified System

1. **Consistency**: Same translation files for emails AND errors
2. **Maintainability**: Single source of truth for translations
3. **Reusability**: Write `translateServerSide()` once, use everywhere
4. **Performance**: Shared caching across email and error translation

### When to Use Which Pattern

**Use Email Pattern When:**
- Sending transactional emails (account changes, notifications)
- Need rich HTML formatting
- Include multiple paragraphs, buttons, links
- Example: Account deletion confirmation email

**Use API Error Pattern When:**
- Returning error responses from API routes
- Short, single-sentence messages
- Need consistent error message keys
- Example: "Too many requests" rate limit error

### Example: Combining Both

```javascript
// API route that sends email AND returns translated error
export async function POST(request) {
  const session = await createApiSession(request);
  const locale = getUserLocale(session.user); // Used by BOTH

  try {
    // Send email (multilingual)
    await EmailService.sendAccountDeletionConfirmationEmail(
      session.user.email,
      session.user.displayName,
      scheduledDate,
      requestId,
      false,
      locale // Same locale!
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    // Return error (multilingual)
    return NextResponse.json(
      { error: translateServerSide(PRIVACY_ERROR_MESSAGES.DELETION_FAILED, locale) },
      { status: 500 }
    );
  }
}
```

### Documentation

For more details on API error translation:
- See: `RGPD_ARCHITECTURE_COMPLIANCE.md` - Section 6: Multilingual Error Translation System
- See: `RGPD_IMPLEMENTATION_SUMMARY.md` - Section 1.5: Multilingual API Error Messages

---

## Support

### Documentation
- Testing Guide: `EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md`
- Implementation Summary: `RGPD_IMPLEMENTATION_SUMMARY.md`
- Architecture Docs: `RGPD_ARCHITECTURE_COMPLIANCE.md`

### External Resources
- [Brevo API Documentation](https://developers.brevo.com/)
- [i18next Documentation](https://www.i18next.com/)
- [Email HTML Best Practices](https://templates.mailchimp.com/development/)

### Need Help?
- Check existing email implementations in `lib/services/server/emailService.js`
- Review translation structure in `/public/locales/*/common.json`
- Test with manual test guide: `EMAIL_NOTIFICATION_MANUAL_TEST_GUIDE.md`

---

**Document Version:** 1.0
**Last Updated:** 2025-11-19
**Author:** Weavink Development Team
**Status:** Active
