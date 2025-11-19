// lib/services/server/emailService.js

import fs from 'fs';
import path from 'path';

const apiKey = process.env.SMTP_API;

// Debug logging to identify API key being used
console.log('🔑 EmailService loaded - API Key check:', {
  exists: !!apiKey,
  prefix: apiKey ? apiKey.substring(0, 20) + '...' : 'MISSING',
  suffix: apiKey ? '...' + apiKey.slice(-10) : 'MISSING',
  envVarName: 'SMTP_API',
  timestamp: new Date().toISOString()
});

/**
 * Load translations for email templates
 * @private
 */
function loadTranslations(locale = 'en') {
    try {
        const translationPath = path.join(process.cwd(), 'public', 'locales', locale, 'common.json');
        const translations = JSON.parse(fs.readFileSync(translationPath, 'utf-8'));
        return translations;
    } catch (error) {
        console.warn(`Failed to load translations for locale ${locale}, falling back to English`);
        // Fallback to English if locale not found
        if (locale !== 'en') {
            return loadTranslations('en');
        }
        return {};
    }
}

export class EmailService {
    /**
     * Validates email parameters before sending
     * @private
     */
    static _validateEmailParams(recipientName, recipientEmail, subject, htmlContent) {
        if (!recipientName || !recipientEmail || !subject || !htmlContent) {
            const error = new Error('Missing required email parameters');
            console.error('❌ Email validation failed:', {
                recipientName: !!recipientName,
                recipientEmail: !!recipientEmail,
                subject: !!subject,
                htmlContent: !!htmlContent
            });
            throw error;
        }

        // Validate API key
        if (!apiKey) {
            const error = new Error('SMTP API key is not configured');
            console.error('❌ SMTP API key missing. Check NEXT_PUBLIC_SMTP_API environment variable');
            throw error;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
            const error = new Error(`Invalid email format: ${recipientEmail}`);
            console.error('❌ Invalid email format:', recipientEmail);
            throw error;
        }
    }

    /**
     * Core email sending function using Brevo API
     * @param {string} recipientName - Name of the recipient
     * @param {string} recipientEmail - Email address of the recipient
     * @param {string} subject - Email subject
     * @param {string} htmlContent - HTML content of the email
     * @param {object} options - Additional options
     * @returns {Promise<{success: boolean, response: Response, data: any}>}
     */
    static async sendEmail(recipientName, recipientEmail, subject, htmlContent, options = {}) {
        console.log('📧 EmailService: Sending email with tracking disabled');

        // Validate all parameters
        this._validateEmailParams(recipientName, recipientEmail, subject, htmlContent);

        try {
            const headers = new Headers({
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json',
            });

            const body = JSON.stringify({
                sender: {
                    name: options.senderName || "Weavink Team",
                    email: options.senderEmail || "noreply@weavink.com",
                },
                to: [
                    {
                        email: recipientEmail,
                        name: recipientName,
                    },
                ],
                subject,
                htmlContent,
                // Disable all tracking
                tracking: {
                    clickTracking: false,
                    openTracking: false,
                },
                // Add headers to prevent tracking
                headers: {
                    'X-Mailin-Custom': 'no-tracking',
                    'List-Unsubscribe': '<mailto:unsubscribe@weavink.com>',
                },
                // Disable batch sending
                batchId: null,
                scheduledAt: null,
                timezone: 'UTC'
            });

            console.log('📤 Sending email with ALL tracking disabled...');
            console.log(`📧 Recipient: ${recipientEmail}`);
            console.log(`📧 Subject: ${subject}`);

            // Debug: Show API key being sent to Brevo
            console.log('🔍 DEBUG - API Key being sent to Brevo:', {
                keyPrefix: apiKey ? apiKey.substring(0, 20) + '...' : 'MISSING',
                keySuffix: apiKey ? '...' + apiKey.slice(-10) : 'MISSING',
                keyLength: apiKey ? apiKey.length : 0,
                envVarUsed: 'process.env.SMTP_API',
                allSMTPEnvKeys: Object.keys(process.env).filter(k => k.includes('SMTP') || k.includes('BREVO'))
            });

            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers,
                body,
            });

            console.log('📨 Brevo API Response:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            });

            // Get response body
            let responseData;
            try {
                const responseText = await response.text();
                if (responseText) {
                    try {
                        responseData = JSON.parse(responseText);
                        console.log('📊 Parsed response data:', responseData);
                    } catch (parseError) {
                        responseData = { rawText: responseText };
                    }
                }
            } catch (textError) {
                console.error('❌ Could not read response text:', textError);
            }

            if (!response.ok) {
                const errorMessage = `Brevo API error: ${response.status} ${response.statusText}`;
                console.error('❌ Brevo API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    responseData
                });
                
                const error = new Error(errorMessage);
                error.status = response.status;
                error.responseData = responseData;
                throw error;
            }

            console.log('✅ Email sent successfully!');
            return {
                success: true,
                response,
                data: responseData
            };

        } catch (error) {
            console.error('❌ EmailService Error:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });

            const enhancedError = new Error(`Email sending failed: ${error.message}`);
            enhancedError.originalError = error;
            enhancedError.recipientEmail = recipientEmail;
            throw enhancedError;
        }
    }

    /**
     * Sends a password reset email
     * @param {string} recipientEmail - Email address to send reset link to
     * @param {string} recipientName - Name of the recipient (optional, will use email if not provided)
     * @param {string} resetUrl - The password reset URL
     * @returns {Promise<{success: boolean}>}
     */
    static async sendPasswordResetEmail(recipientEmail, recipientName, resetUrl) {
        try {
            console.log(`📧 Sending password reset email to: ${recipientEmail}`);
            
            const name = recipientName || recipientEmail.split('@')[0];
            const subject = 'Reset Your Password - TapIt';
            const htmlContent = this._generatePasswordResetTemplate(resetUrl, name);
            
            const result = await this.sendEmail(name, recipientEmail, subject, htmlContent);
            
            console.log(`✅ Password reset email sent successfully to: ${recipientEmail}`);
            return {
                success: true,
                messageId: result.data?.messageId
            };
            
        } catch (error) {
            console.error('❌ Failed to send password reset email:', error);
            throw new Error(`Failed to send password reset email: ${error.message}`);
        }
    }

    /**
     * Sends a welcome email to new users
     * @param {string} recipientEmail - Email address of new user
     * @param {string} recipientName - Name of new user  
     * @param {string} tempPassword - Temporary password (optional)
     * @returns {Promise<{success: boolean}>}
     */
    static async sendWelcomeEmail(recipientEmail, recipientName, tempPassword = null) {
        try {
            console.log(`📧 Sending welcome email to: ${recipientEmail}`);
            
            const subject = 'Welcome to TapIt - Your Account is Ready!';
            const htmlContent = this._generateWelcomeTemplate(recipientEmail, tempPassword, recipientName);
            
            const result = await this.sendEmail(recipientName, recipientEmail, subject, htmlContent);
            
            console.log(`✅ Welcome email sent successfully to: ${recipientEmail}`);
            return {
                success: true,
                messageId: result.data?.messageId
            };
            
        } catch (error) {
            console.error('❌ Failed to send welcome email:', error);
            throw new Error(`Failed to send welcome email: ${error.message}`);
        }
    }

    /**
     * Sends a team invitation email
     * @param {string} recipientEmail - Email address to invite
     * @param {string} managerName - Name of the manager sending invitation
     * @param {string} teamName - Name of the team
     * @param {string} organizationName - Name of the organization
     * @param {string} acceptUrl - URL to accept the invitation
     * @param {string} inviteCode - Invitation code
     * @param {string} type - Type of invitation ('new', 'resent', 'renewed')
     * @returns {Promise<{success: boolean}>}
     */
    static async sendTeamInvitationEmail(recipientEmail, managerName, teamName, organizationName, acceptUrl, inviteCode, type = 'new') {
        try {
            console.log(`📧 Sending team invitation email to: ${recipientEmail}`);
            
            const subject = `You're Invited to Join ${teamName} - ${organizationName}`;
            const htmlContent = this._generateTeamInvitationTemplate(
                managerName, 
                teamName, 
                organizationName, 
                acceptUrl, 
                type, 
                inviteCode
            );
            
            const recipientName = recipientEmail.split('@')[0];
            const result = await this.sendEmail(recipientName, recipientEmail, subject, htmlContent);
            
            console.log(`✅ Team invitation email sent successfully to: ${recipientEmail}`);
            return {
                success: true,
                messageId: result.data?.messageId
            };
            
        } catch (error) {
            console.error('❌ Failed to send team invitation email:', error);
            throw new Error(`Failed to send team invitation email: ${error.message}`);
        }
    }

    /**
     * Send account deletion confirmation email
     * @param {string} recipientEmail - User's email address
     * @param {string} recipientName - User's display name
     * @param {Date} scheduledDate - When account will be deleted
     * @param {string} requestId - Deletion request ID
     * @param {boolean} isImmediate - Whether deletion is immediate
     * @param {string} locale - User's language preference (en, fr, es, zh, vm)
     * @returns {Promise<{success: boolean, messageId: string}>}
     */
    static async sendAccountDeletionConfirmationEmail(recipientEmail, recipientName, scheduledDate, requestId, isImmediate = false, locale = 'en') {
        try {
            const translations = loadTranslations(locale);
            const t = translations.emails?.account_deletion_confirmation || {};

            const subject = t.subject || 'Account Deletion Request Confirmed - Weavink';
            const htmlContent = this._generateAccountDeletionConfirmationTemplate(
                recipientName,
                scheduledDate,
                requestId,
                isImmediate,
                locale,
                translations
            );

            const result = await this.sendEmail(recipientName, recipientEmail, subject, htmlContent);

            console.log(`✅ Account deletion confirmation email sent to: ${recipientEmail} (${locale})`);
            return {
                success: true,
                messageId: result.data?.messageId
            };
        } catch (error) {
            console.error('❌ Failed to send account deletion confirmation email:', error);
            throw new Error(`Failed to send account deletion confirmation email: ${error.message}`);
        }
    }

    /**
     * Send contact deletion notice email
     * @param {string} recipientEmail - Contact's email address
     * @param {string} recipientName - Contact's display name
     * @param {string} deletedUserName - Name of person deleting account
     * @param {Date} scheduledDate - When deletion will happen
     * @param {string} locale - Contact's language preference
     * @returns {Promise<{success: boolean, messageId: string}>}
     */
    static async sendContactDeletionNoticeEmail(recipientEmail, recipientName, deletedUserName, scheduledDate, locale = 'en') {
        try {
            const translations = loadTranslations(locale);
            const t = translations.emails?.contact_deletion_notice || {};

            const subject = t.subject?.replace('{{deletedUserName}}', deletedUserName) ||
                            `Contact Update - ${deletedUserName} Account Deletion`;
            const htmlContent = this._generateContactDeletionNoticeTemplate(
                recipientName,
                deletedUserName,
                scheduledDate,
                locale,
                translations
            );

            const result = await this.sendEmail(recipientName, recipientEmail, subject, htmlContent);

            console.log(`✅ Contact deletion notice sent to: ${recipientEmail} (${locale})`);
            return {
                success: true,
                messageId: result.data?.messageId
            };
        } catch (error) {
            console.error('❌ Failed to send contact deletion notice email:', error);
            throw new Error(`Failed to send contact deletion notice email: ${error.message}`);
        }
    }

    /**
     * Send account deletion completed email
     * @param {string} recipientEmail - User's email address
     * @param {string} recipientName - User's display name
     * @param {string} locale - User's language preference
     * @returns {Promise<{success: boolean, messageId: string}>}
     */
    static async sendAccountDeletionCompletedEmail(recipientEmail, recipientName, locale = 'en') {
        try {
            const translations = loadTranslations(locale);
            const t = translations.emails?.account_deletion_completed || {};

            const subject = t.subject || 'Your Weavink Account Has Been Deleted';
            const htmlContent = this._generateAccountDeletionCompletedTemplate(
                recipientName,
                locale,
                translations
            );

            const result = await this.sendEmail(recipientName, recipientEmail, subject, htmlContent);

            console.log(`✅ Account deletion completed email sent to: ${recipientEmail} (${locale})`);
            return {
                success: true,
                messageId: result.data?.messageId
            };
        } catch (error) {
            console.error('❌ Failed to send account deletion completed email:', error);
            throw new Error(`Failed to send account deletion completed email: ${error.message}`);
        }
    }

    /**
     * Send account deletion cancelled email
     * @param {string} recipientEmail - User's email address
     * @param {string} recipientName - User's display name
     * @param {string} locale - User's language preference
     * @returns {Promise<{success: boolean, messageId: string}>}
     */
    static async sendAccountDeletionCancelledEmail(recipientEmail, recipientName, locale = 'en') {
        try {
            const translations = loadTranslations(locale);
            const t = translations.emails?.account_deletion_cancelled || {};

            const subject = t.subject || 'Account Deletion Cancelled - Weavink';
            const htmlContent = this._generateAccountDeletionCancelledTemplate(
                recipientName,
                locale,
                translations
            );

            const result = await this.sendEmail(recipientName, recipientEmail, subject, htmlContent);

            console.log(`✅ Account deletion cancelled email sent to: ${recipientEmail} (${locale})`);
            return {
                success: true,
                messageId: result.data?.messageId
            };
        } catch (error) {
            console.error('❌ Failed to send account deletion cancelled email:', error);
            throw new Error(`Failed to send account deletion cancelled email: ${error.message}`);
        }
    }

    /**
     * Send data export completed email
     * @param {string} recipientEmail - User's email address
     * @param {string} recipientName - User's display name
     * @param {Object} exportSummary - Summary of exported data
     * @param {string} requestId - Export request ID
     * @param {string} locale - User's language preference
     * @returns {Promise<{success: boolean, messageId: string}>}
     */
    static async sendDataExportCompletedEmail(recipientEmail, recipientName, exportSummary, requestId, locale = 'en') {
        try {
            const translations = loadTranslations(locale);
            const t = translations.emails?.data_export_completed || {};

            const subject = t.subject || 'Your Data Export is Ready - Weavink';
            const htmlContent = this._generateDataExportCompletedTemplate(
                recipientName,
                exportSummary,
                requestId,
                locale,
                translations
            );

            const result = await this.sendEmail(recipientName, recipientEmail, subject, htmlContent);

            console.log(`✅ Data export completed email sent to: ${recipientEmail} (${locale})`);
            return {
                success: true,
                messageId: result.data?.messageId
            };
        } catch (error) {
            console.error('❌ Failed to send data export completed email:', error);
            throw new Error(`Failed to send data export completed email: ${error.message}`);
        }
    }

    /**
     * Generates password reset email template
     * @private
     */
    static _generatePasswordResetTemplate(resetPasswordURL, recipientName) {
        return `
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset Email</title>
  <style type="text/css">
    @import url(https://fonts.googleapis.com/css?family=Nunito);

    :root {
      --primary-color: #674299;
      --text-color: #444;
      --background-color: #ffffff;
      --button-text-color: #ffffff;
      --button-background-color: #674299;
    }

    body {
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: none;
      width: 100%;
      height: 100%;
      background: var(--background-color);
      color: var(--text-color);
      font-family: 'Nunito', sans-serif;
      font-size: 16px;
      padding: 20px;
      margin: 0;
    }

    img {
      max-width: 600px;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }

    a {
      text-decoration: none;
      border: 0;
      outline: none;
      color: var(--text-color);
    }

    a img {
      border: none;
    }

    td, h1, h2, h3 {
      font-family: 'Nunito', sans-serif;
      font-weight: 400;
    }

    td {
      text-align: center;
    }

    table {
      border-collapse: collapse !important;
    }

    .headline {
      color: var(--text-color);
      font-size: 36px;
      margin-top: 20px;
    }

    .button {
      background-color: var(--button-background-color);
      border-radius: 8px;
      color: var(--button-text-color);
      display: inline-block;
      font-family: 'Nunito', sans-serif;
      font-size: 18px;
      font-weight: 600;
      line-height: 50px;
      text-align: center;
      text-decoration: none;
      width: 350px;
      margin: 20px 0;
      padding: 15px 30px;
    }

    .footer {
      color: var(--text-color);
      margin: 20px 0;
    }

    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }

    .content {
      width: 75%;
      margin: 0 auto;
      text-align: left;
      line-height: 1.6;
    }

    @media only screen and (max-width: 480px) {
      .button {
        width: 300px !important;
        font-size: 16px !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <table align="center" cellpadding="0" cellspacing="0" width="100%">
      <tbody>
        <tr>
          <td align="center" valign="top" width="100%">
            <center>
              <table cellpadding="0" cellspacing="0" width="600">
                <tbody>
                  <tr>
                    <td valign="top">
                      <table cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td>
                            <img alt="TapIt Logo" width="155" src="https://linktree.sirv.com/Images/full-logo.png" style="padding: 1rem">
                          </td>
                        </tr>
                        <tr>
                          <td class="headline">Reset Your Password</td>
                        </tr>
                        <tr>
                          <td>
                            <center>
                              <table cellpadding="0" cellspacing="0" class="content">
                                <tbody>
                                  <tr>
                                    <td style="color: var(--text-color); font-weight: 400;">
                                      <br><br>
                                      Hi ${recipientName},
                                      <br><br>
                                      You've requested to reset your password for your TapIt account. Click the button below to create a new password:
                                      <br><br>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </center>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <div>
                              <a class="button" href="${resetPasswordURL}" target="_blank">Reset My Password</a>
                            </div>
                            
                            <div style="margin-top: 20px; color: #666; font-size: 14px; line-height: 1.5;">
                              Having trouble with the button? Copy and paste this link into your browser:<br>
                              <a href="${resetPasswordURL}" style="color: #674299; word-break: break-all;">${resetPasswordURL}</a>
                            </div>
                            <br>
                          </td>
                        </tr>
                        <tr>
                          <td style="border-top: 1px solid #eee; padding-top: 30px; color: #666; font-size: 14px;">
                            <p>This password reset link will expire in 1 hour for security reasons.</p>
                            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                            <br>
                            <p>Thank you,<br><strong>The TapIt Team</strong></p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </center>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
    }

    /**
     * Generates welcome email template  
     * @private
     */
    static _generateWelcomeTemplate(email, password, name) {
        // Use your existing welcome email template with some improvements
        return `
<style type="text/css">
  @import url(https://fonts.googleapis.com/css?family=Nunito);

  img {
    max-width: 600px;
    outline: none;
    text-decoration: none;
    -ms-interpolation-mode: bicubic;
  }
  
  html{
    margin: 0;
    padding:0;
  }

  a {
    text-decoration: none;
    border: 0;
    outline: none;
    color: #bbbbbb;
  }

  a img {
    border: none;
  }

  td, h1, h2, h3  {
    font-family: 'Nunito', Helvetica, Arial, sans-serif;
    font-weight: 400;
  }

  td {
    text-align: center;
  }

  body {
    -webkit-font-smoothing:antialiased;
    -webkit-text-size-adjust:none;
    width: 100%;
    height: 100%;
    color: #666;
    background: #fff;
    font-size: 16px;
    height: 100vh;
    width: 100%;
    padding: 0px;
    margin: 0px;
  }

   table {
    border-collapse: collapse !important;
  }

  .headline {
    color: #444;
    font-size: 36px;
  }

  .force-full-width {
   width: 100% !important;
  }

  @media screen {
    td, h1, h2, h3 {
      font-family: 'Nunito', 'Helvetica Neue', 'Arial', 'sans-serif' !important;
    }
  }

  @media only screen and (max-width: 480px) {
    table[class="w320"] {
      width: 320px !important;
    }
  }
</style>

<body bgcolor="#fff" class="body" style="padding:20px; margin:0; display:block; background:#ffffff; -webkit-text-size-adjust:none">
<table align="center" cellpadding="0" cellspacing="0" height="100%" width="100%">
<tbody><tr>
<td align="center" bgcolor="#fff" class="" valign="top" width="100%">
<center class=""><table cellpadding="0" cellspacing="0" class="w320" style="margin: 0 auto;" width="600">
<tbody><tr>
<td align="center" class="" valign="top"><table cellpadding="0" cellspacing="0" style="margin: 0 auto;" width="100%">
</table>
<table bgcolor="#fff" cellpadding="0" cellspacing="0" class="" style="margin: 0 auto; width: 100%; margin-top: 100px;">
<tbody style="margin-top: 15px;">
  <tr class="">
<td class="">
<img alt="TapIt Logo" class="" height="155" src="https://linktree.sirv.com/Images/full-logo.png">
</td>
</tr>
<tr class=""><td class="headline">Welcome to TapIt!</td></tr>
<tr>
<td>
<center class=""><table cellpadding="0" cellspacing="0" class="" style="margin: 0 auto;" width="75%"><tbody class=""><tr class="">
<td class="" style="color:#444; font-weight: 400;"><br><br>
 Welcome to TapIt - your new link management platform! We're excited to have you on board.<br><br>
 Your account has been successfully created and you can now start building your personalized link page.
 <br><br>
  ${password ? `Your login credentials are provided below:
<br>
<span style="font-weight:bold;">Email: &nbsp;</span><span style="font-weight:lighter;" class="">${email}</span> 
 <br>
  <span style="font-weight:bold;">Password: &nbsp;</span><span style="font-weight:lighter;" class="">${password}</span>
<br><br>` : ''}  
<br></td>
</tr>
</tbody></table></center>
</td>
</tr>
<tr>
<td class="">
<div class="">
<a style="background-color:#674299;border-radius:4px;color:#fff;display:inline-block;font-family:'Nunito', Helvetica, Arial, sans-serif;font-size:18px;font-weight:normal;line-height:50px;text-align:center;text-decoration:none;width:350px;-webkit-text-size-adjust:none;padding:15px 30px;" href="${process.env.NODE_ENV === 'development' ? 'http://localhost:3000/login' : `${process.env.NEXT_PUBLIC_BASE_URL}/login`}">Get Started, ${name}!</a>
</div>
 <br>
</td>
</tr>
</tbody>
  
  </table>

<table bgcolor="#fff" cellpadding="0" cellspacing="0" class="force-full-width" style="margin: 0 auto; margin-bottom: 5px:">
<tbody>
<tr>
<td class="" style="color:#444;">
<p>Thank you for joining TapIt! If you have any questions, feel free to reach out to our support team.
  </p>
  </td>
</tr>
</tbody></table></td>
</tr>
</tbody></table></center>
</td>
</tr>
</tbody></table>
</body>
`;
    }

    /**
     * Generates team invitation email template
     * @private  
     */
    static _generateTeamInvitationTemplate(managerName, teamName, organizationName, acceptUrl, type, inviteCode) {
        // Use your existing team invitation template - it's already well structured
        const typeMessages = {
            new: `<b>${managerName}</b> has invited you to join the <b>${teamName}</b> team on the <b>${organizationName}</b> enterprise account.`,
            resent: `This is a reminder - <b>${managerName}</b> has invited you to join the <b>${teamName}</b> team. We're sending you a fresh invitation with a new code.`,
            renewed: `Your invitation to join the <b>${teamName}</b> team has been renewed with a new invitation code.`
        };

        return `
<style type="text/css">
  @import url(https://fonts.googleapis.com/css?family=Nunito);
  
  /* Your existing team invitation styles */
  img {
    max-width: 600px;
    outline: none;
    text-decoration: none;
    -ms-interpolation-mode: bicubic;
  }
  
  html {
    margin: 0;
    padding: 0;
  }

  a {
    text-decoration: none;
    border: 0;
    outline: none;
    color: #bbbbbb;
  }

  a img {
    border: none;
  }

  td, h1, h2, h3 {
    font-family: 'Nunito', Helvetica, Arial, sans-serif;
    font-weight: 400;
  }

  td {
    text-align: center;
  }

  body {
    -webkit-font-smoothing: antialiased;
    -webkit-text-size-adjust: none;
    width: 100%;
    height: 100%;
    color: #666;
    background: #fff;
    font-size: 16px;
    padding: 0px;
    margin: 0px;
  }

  table {
    border-collapse: collapse !important;
  }

  .headline {
    color: #444;
    font-size: 36px;
  }

  .button {
    background-color: #674299;
    border-radius: 8px;
    color: #fff;
    display: inline-block;
    font-family: 'Nunito', Helvetica, Arial, sans-serif;
    font-size: 18px;
    font-weight: 600;
    line-height: 54px;
    text-align: center;
    text-decoration: none;
    width: 350px;
    -webkit-text-size-adjust: none;
  }

  .invitation-code {
    background: #f8f9fa;
    border: 2px dashed #674299;
    border-radius: 8px;
    padding: 15px;
    margin: 20px 0;
    font-family: 'Courier New', monospace;
    font-size: 24px;
    font-weight: bold;
    color: #674299;
    letter-spacing: 2px;
  }
</style>

<body bgcolor="#fff" style="padding:20px; margin:0; display:block; background:#ffffff;">
<table align="center" cellpadding="0" cellspacing="0" height="100%" width="100%">
<tbody>
<tr>
<td align="center" bgcolor="#fff" valign="top" width="100%">
<center>
<table cellpadding="0" cellspacing="0" style="margin: 0 auto;" width="600">
<tbody>
<tr>
<td align="center" valign="top">
<table bgcolor="#fff" cellpadding="0" cellspacing="0" style="margin: 0 auto; width: 100%; margin-top: 50px;">
<tbody>
  <tr>
    <td>
      <img alt="TapIt Logo" height="80" src="https://linktree.sirv.com/Images/full-logo.png" style="margin-bottom: 20px;">
    </td>
  </tr>
  
  <tr>
    <td class="headline">
      ${type === 'new' ? "You're Invited!" : 
        type === 'resent' ? "Invitation Reminder" : 
        "Invitation Updated"}
    </td>
  </tr>
  
  <tr>
    <td>
      <center>
      <table cellpadding="0" cellspacing="0" style="margin: 0 auto;" width="85%">
      <tbody>
      <tr>
        <td style="color:#444; font-weight: 400; text-align: left; line-height: 1.6;">
          <br><br>
          Hello,
          <br><br>
          ${typeMessages[type] || typeMessages.new}
          <br><br>
          Click the button below to accept your invitation and get started. This invitation is valid for 7 days.
          <br><br>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="margin-bottom: 15px; color: #666; font-size: 14px;">Your invitation code:</div>
            <div class="invitation-code">${inviteCode}</div>
          </div>
        </td>
      </tr>
      </tbody>
      </table>
      </center>
    </td>
  </tr>
  
  <tr>
    <td style="padding: 30px 0;">
      <div>
        <a class="button" href="${acceptUrl}" target="_blank" rel="noopener">
          ${type === 'new' ? 'Accept Invitation' : 
            type === 'resent' ? 'Join Team Now' : 
            'Accept Updated Invitation'}
        </a>
      </div>
    </td>
  </tr>
  
  <tr>
    <td style="border-top: 1px solid #eee; padding-top: 30px; color: #666; font-size: 14px;">
      <p>
        If you didn't expect this invitation, please ignore this email.
      </p>
      <p style="margin-top: 20px;">
        Thank you,<br>
        <b>The TapIt Team</b>
      </p>
    </td>
  </tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</center>
</td>
</tr>
</tbody>
</table>
</body>
`;
    }

    /**
     * Generates account deletion confirmation email template
     * @private
     */
    static _generateAccountDeletionConfirmationTemplate(recipientName, scheduledDate, requestId, isImmediate, locale, translations) {
        const t = translations.emails?.account_deletion_confirmation || {};
        const formattedDate = new Date(scheduledDate).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const headline = isImmediate ?
            (t.headline_immediate || 'Account Deletion In Progress') :
            (t.headline || 'Account Deletion Scheduled');

        const intro = isImmediate ?
            (t.intro_immediate || `We are processing your request to delete your Weavink account immediately.`) :
            (t.intro || `We have received your request to delete your Weavink account. Your account is scheduled for deletion on ${formattedDate}.`).replace('{{date}}', formattedDate);

        const gracePeriod = !isImmediate ? (t.grace_period || `You have a 30-day grace period to change your mind. You can cancel this request at any time before ${formattedDate}.`).replace('{{date}}', formattedDate) : '';

        const whatDeleted = t.what_deleted || 'All your data will be permanently deleted, including:';
        const contacts = t.item_contacts || 'All contacts and groups';
        const settings = t.item_settings || 'Profile settings and preferences';
        const history = t.item_history || 'Activity history and analytics';

        const exportReminder = t.export_reminder || 'If you haven\'t already, we recommend exporting your data before the deletion date.';
        const cancelInstructions = !isImmediate ? (t.cancel_instructions || 'To cancel this request, visit your account settings or contact our support team.') : '';
        const buttonText = !isImmediate ? (t.button_cancel || 'Cancel Deletion') : '';
        const thankYou = t.thank_you || 'Thank you for using Weavink.';

        return `
<html>
<head>
  <meta charset="utf-8">
  <title>${headline}</title>
  <style type="text/css">
    @import url(https://fonts.googleapis.com/css?family=Nunito);
    :root {
      --primary-color: #674299;
      --text-color: #444;
      --background-color: #ffffff;
      --button-text-color: #ffffff;
      --button-background-color: #674299;
      --warning-color: #d32f2f;
    }
    body {
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: none;
      width: 100%;
      height: 100%;
      color: #666;
      background: #fff;
      font-size: 16px;
      padding: 0px;
      margin: 0px;
      font-family: 'Nunito', Helvetica, Arial, sans-serif;
    }
    table {
      border-collapse: collapse !important;
    }
    .headline {
      color: var(--warning-color);
      font-size: 32px;
      font-weight: 700;
      margin: 20px 0;
    }
    .button {
      background-color: #4caf50;
      border-radius: 8px;
      color: #fff;
      display: inline-block;
      font-size: 18px;
      font-weight: 600;
      padding: 15px 40px;
      text-decoration: none;
      margin: 20px 0;
    }
    .warning-box {
      background-color: #fff3e0;
      border-left: 4px solid #ff9800;
      padding: 15px;
      margin: 20px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <table align="center" cellpadding="0" cellspacing="0" width="100%">
      <tbody>
        <tr>
          <td>
            <img alt="Weavink Logo" width="155" src="https://linktree.sirv.com/Images/full-logo.png" style="padding: 1rem">
            <div class="headline">${headline}</div>
            <div style="color: var(--text-color); font-weight: 400; line-height: 1.6;">
              <br><br>
              Hi ${recipientName},
              <br><br>
              ${intro}
              <br><br>
              ${gracePeriod ? `<div class="warning-box">${gracePeriod}</div>` : ''}
              <br>
              <strong>${whatDeleted}</strong>
              <ul>
                <li>${contacts}</li>
                <li>${settings}</li>
                <li>${history}</li>
              </ul>
              <br>
              ${exportReminder}
              <br><br>
              ${cancelInstructions}
              <br><br>
            </div>
            ${buttonText ? `<div style="text-align: center;">
              <a class="button" href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.weavink.io'}/account?tab=delete" target="_blank">
                ${buttonText}
              </a>
            </div>` : ''}
            <div style="border-top: 1px solid #eee; padding-top: 30px; color: #666; font-size: 14px; margin-top: 30px;">
              <p>${thankYou}</p>
              <br>
              <p>The Weavink Team</p>
              <p style="font-size: 12px; color: #999;">
                Request ID: ${requestId}<br>
                Data Protection Officer: dpo@weavink.io
              </p>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>
`;
    }

    /**
     * Generates contact deletion notice email template
     * @private
     */
    static _generateContactDeletionNoticeTemplate(recipientName, deletedUserName, scheduledDate, locale, translations) {
        const t = translations.emails?.contact_deletion_notice || {};
        const formattedDate = new Date(scheduledDate).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const headline = t.headline || 'Contact Deletion Notice';
        const intro = (t.intro || `${deletedUserName} has requested deletion of their Weavink account.`).replace('{{deletedUserName}}', deletedUserName);
        const whenDeleted = (t.when_deleted || `Their contact information will be anonymized on ${formattedDate}.`).replace('{{date}}', formattedDate);
        const yourNotes = t.your_notes || 'Your notes and interactions with this contact will remain available, but their personal information will be anonymized.';
        const automated = t.automated || 'This is an automated notice to keep you informed about changes to your contacts.';

        return `
<html>
<head>
  <meta charset="utf-8">
  <title>${headline}</title>
  <style type="text/css">
    @import url(https://fonts.googleapis.com/css?family=Nunito);
    :root {
      --primary-color: #674299;
      --text-color: #444;
    }
    body {
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: none;
      width: 100%;
      height: 100%;
      color: #666;
      background: #fff;
      font-size: 16px;
      padding: 0px;
      margin: 0px;
      font-family: 'Nunito', Helvetica, Arial, sans-serif;
    }
    table {
      border-collapse: collapse !important;
    }
    .headline {
      color: var(--text-color);
      font-size: 28px;
      font-weight: 700;
      margin: 20px 0;
    }
    .info-box {
      background-color: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 15px;
      margin: 20px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <table align="center" cellpadding="0" cellspacing="0" width="100%">
      <tbody>
        <tr>
          <td>
            <img alt="Weavink Logo" width="155" src="https://linktree.sirv.com/Images/full-logo.png" style="padding: 1rem">
            <div class="headline">${headline}</div>
            <div style="color: var(--text-color); font-weight: 400; line-height: 1.6;">
              <br><br>
              Hi ${recipientName},
              <br><br>
              ${intro}
              <br><br>
              <div class="info-box">
                ${whenDeleted}
              </div>
              <br>
              ${yourNotes}
              <br><br>
              <em>${automated}</em>
              <br><br>
            </div>
            <div style="border-top: 1px solid #eee; padding-top: 30px; color: #666; font-size: 14px; margin-top: 30px;">
              <p>Thank you,<br><strong>The Weavink Team</strong></p>
              <p style="font-size: 12px; color: #999;">
                Privacy Policy: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.weavink.io'}/privacy
              </p>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>
`;
    }

    /**
     * Generates account deletion completed email template
     * @private
     */
    static _generateAccountDeletionCompletedTemplate(recipientName, locale, translations) {
        const t = translations.emails?.account_deletion_completed || {};

        const headline = t.headline || 'Account Deletion Complete';
        const intro = t.intro || 'Your Weavink account has been permanently deleted.';
        const allDataDeleted = t.all_data_deleted || 'All your personal data has been removed from our systems, including:';
        const profile = t.item_profile || 'Your profile and settings';
        const contacts = t.item_contacts || 'All contacts and groups';
        const activity = t.item_activity || 'Activity history and analytics';
        const billing = t.billing_retained || 'Billing records have been archived for legal compliance (10 years as required by law).';
        const thankYou = t.thank_you || 'Thank you for using Weavink. We\'re sorry to see you go.';
        const reregister = t.reregister || 'If you change your mind, you can always create a new account at any time.';

        return `
<html>
<head>
  <meta charset="utf-8">
  <title>${headline}</title>
  <style type="text/css">
    @import url(https://fonts.googleapis.com/css?family=Nunito);
    :root {
      --primary-color: #674299;
      --text-color: #444;
    }
    body {
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: none;
      width: 100%;
      height: 100%;
      color: #666;
      background: #fff;
      font-size: 16px;
      padding: 0px;
      margin: 0px;
      font-family: 'Nunito', Helvetica, Arial, sans-serif;
    }
    table {
      border-collapse: collapse !important;
    }
    .headline {
      color: var(--text-color);
      font-size: 28px;
      font-weight: 700;
      margin: 20px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <table align="center" cellpadding="0" cellspacing="0" width="100%">
      <tbody>
        <tr>
          <td>
            <img alt="Weavink Logo" width="155" src="https://linktree.sirv.com/Images/full-logo.png" style="padding: 1rem">
            <div class="headline">${headline}</div>
            <div style="color: var(--text-color); font-weight: 400; line-height: 1.6;">
              <br><br>
              Hi ${recipientName},
              <br><br>
              ${intro}
              <br><br>
              <strong>${allDataDeleted}</strong>
              <ul>
                <li>${profile}</li>
                <li>${contacts}</li>
                <li>${activity}</li>
              </ul>
              <br>
              <p style="font-size: 14px; color: #999;"><em>${billing}</em></p>
              <br>
              ${thankYou}
              <br><br>
              ${reregister}
              <br><br>
            </div>
            <div style="border-top: 1px solid #eee; padding-top: 30px; color: #666; font-size: 14px; margin-top: 30px;">
              <p>Best regards,<br><strong>The Weavink Team</strong></p>
              <p style="font-size: 12px; color: #999;">
                Questions? Contact: support@weavink.io
              </p>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>
`;
    }

    /**
     * Generates account deletion cancelled email template
     * @private
     */
    static _generateAccountDeletionCancelledTemplate(recipientName, locale, translations) {
        const t = translations.emails?.account_deletion_cancelled || {};

        const headline = t.headline || 'Deletion Request Cancelled';
        const intro = t.intro || 'Your account deletion request has been successfully cancelled.';
        const accountSafe = t.account_safe || 'Your account is safe and remains fully active.';
        const noDataLost = t.no_data_lost || 'No data has been deleted. All your contacts, groups, and settings are intact.';
        const allFeatures = t.all_features || 'You can continue using all Weavink features without any interruption.';
        const buttonText = t.button_dashboard || 'Go to Dashboard';

        return `
<html>
<head>
  <meta charset="utf-8">
  <title>${headline}</title>
  <style type="text/css">
    @import url(https://fonts.googleapis.com/css?family=Nunito);
    :root {
      --primary-color: #674299;
      --text-color: #444;
    }
    body {
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: none;
      width: 100%;
      height: 100%;
      color: #666;
      background: #fff;
      font-size: 16px;
      padding: 0px;
      margin: 0px;
      font-family: 'Nunito', Helvetica, Arial, sans-serif;
    }
    table {
      border-collapse: collapse !important;
    }
    .headline {
      color: #4caf50;
      font-size: 28px;
      font-weight: 700;
      margin: 20px 0;
    }
    .button {
      background-color: #674299;
      border-radius: 8px;
      color: #fff;
      display: inline-block;
      font-size: 18px;
      font-weight: 600;
      padding: 15px 40px;
      text-decoration: none;
      margin: 20px 0;
    }
    .success-box {
      background-color: #e8f5e9;
      border-left: 4px solid #4caf50;
      padding: 15px;
      margin: 20px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <table align="center" cellpadding="0" cellspacing="0" width="100%">
      <tbody>
        <tr>
          <td>
            <img alt="Weavink Logo" width="155" src="https://linktree.sirv.com/Images/full-logo.png" style="padding: 1rem">
            <div class="headline">✓ ${headline}</div>
            <div style="color: var(--text-color); font-weight: 400; line-height: 1.6;">
              <br><br>
              Hi ${recipientName},
              <br><br>
              ${intro}
              <br><br>
              <div class="success-box">
                <strong>${accountSafe}</strong>
              </div>
              <br>
              ${noDataLost}
              <br><br>
              ${allFeatures}
              <br><br>
            </div>
            <div style="text-align: center;">
              <a class="button" href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.weavink.io'}/dashboard" target="_blank">
                ${buttonText}
              </a>
            </div>
            <div style="border-top: 1px solid #eee; padding-top: 30px; color: #666; font-size: 14px; margin-top: 30px;">
              <p>Welcome back!<br><strong>The Weavink Team</strong></p>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>
`;
    }

    /**
     * Generates data export completed email template
     * @private
     */
    static _generateDataExportCompletedTemplate(recipientName, exportSummary, requestId, locale, translations) {
        const t = translations.emails?.data_export_completed || {};

        const headline = t.headline || 'Data Export Complete';
        const intro = t.intro || 'Your data export has been completed successfully.';
        const summary = t.summary || 'Export Summary:';
        const contactsCount = exportSummary?.contactCount || 0;
        const groupsCount = exportSummary?.groupCount || 0;
        const consentsCount = exportSummary?.consentCount || 0;
        const contactsLabel = t.contacts || 'Contacts';
        const groupsLabel = t.groups || 'Groups';
        const consentsLabel = t.consents || 'Consent Records';
        const formatsLabel = t.formats || 'Formats';
        const formatsValue = t.formats_value || 'JSON, CSV, vCard';
        const gdprNote = t.gdpr_note || 'This export fulfills your GDPR Article 20 right to data portability.';
        const nextSteps = t.next_steps || 'Your export was included in the API response when you requested it. If you need another export, you can request one from your account settings.';
        const thankYou = t.thank_you || 'Thank you,';
        const teamName = t.team_name || 'The Weavink Team';
        const requestIdLabel = t.request_id || 'Request ID:';
        const dpoLabel = t.dpo_label || 'Data Protection Officer:';

        return `
<html>
<head>
  <meta charset="utf-8">
  <title>${headline}</title>
  <style type="text/css">
    @import url(https://fonts.googleapis.com/css?family=Nunito);
    :root {
      --primary-color: #674299;
      --text-color: #444;
    }
    body {
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: none;
      width: 100%;
      height: 100%;
      color: #666;
      background: #fff;
      font-size: 16px;
      padding: 0px;
      margin: 0px;
      font-family: 'Nunito', Helvetica, Arial, sans-serif;
    }
    table {
      border-collapse: collapse !important;
    }
    .headline {
      color: var(--text-color);
      font-size: 28px;
      font-weight: 700;
      margin: 20px 0;
    }
    .summary-box {
      background-color: #f5f5f5;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .summary-item:last-child {
      border-bottom: none;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <table align="center" cellpadding="0" cellspacing="0" width="100%">
      <tbody>
        <tr>
          <td>
            <img alt="Weavink Logo" width="155" src="https://linktree.sirv.com/Images/full-logo.png" style="padding: 1rem">
            <div class="headline">${headline}</div>
            <div style="color: var(--text-color); font-weight: 400; line-height: 1.6;">
              <br><br>
              Hi ${recipientName},
              <br><br>
              ${intro}
              <br><br>
              <div class="summary-box">
                <strong>${summary}</strong>
                <div style="margin-top: 15px;">
                  <div class="summary-item">
                    <span>${contactsLabel}:</span>
                    <strong>${contactsCount}</strong>
                  </div>
                  <div class="summary-item">
                    <span>${groupsLabel}:</span>
                    <strong>${groupsCount}</strong>
                  </div>
                  <div class="summary-item">
                    <span>${consentsLabel}:</span>
                    <strong>${consentsCount}</strong>
                  </div>
                  <div class="summary-item">
                    <span>${formatsLabel}:</span>
                    <strong>${formatsValue}</strong>
                  </div>
                </div>
              </div>
              <br>
              <p style="font-size: 14px; color: #999;"><em>${gdprNote}</em></p>
              <br>
              ${nextSteps}
              <br><br>
            </div>
            <div style="border-top: 1px solid #eee; padding-top: 30px; color: #666; font-size: 14px; margin-top: 30px;">
              <p>${thankYou}<br><strong>${teamName}</strong></p>
              <p style="font-size: 12px; color: #999;">
                ${requestIdLabel} ${requestId}<br>
                ${dpoLabel} dpo@weavink.io
              </p>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>
`;
    }
}
