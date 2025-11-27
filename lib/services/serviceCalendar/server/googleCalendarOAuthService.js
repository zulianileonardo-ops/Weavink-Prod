/**
 * Google Calendar OAuth Service
 * Sprint 6: Event Discovery & Automation
 *
 * Handles OAuth2 flow for Google Calendar integration.
 */

import { google } from 'googleapis';
import { adminDb } from '@/lib/firebaseAdmin';
import {
    DEFAULT_GOOGLE_SCOPES,
    SYNC_CONFIG,
    CONNECTION_STATUS,
    CALENDAR_PROVIDERS
} from '../client/constants/calendarConstants.js';

/**
 * @typedef {import('../shared/calendarTypes.js').CalendarToken} CalendarToken
 * @typedef {import('../shared/calendarTypes.js').TokenRefreshResult} TokenRefreshResult
 */

// Environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALENDAR_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google/callback`;

/**
 * Create OAuth2 client instance
 * @returns {import('googleapis').Auth.OAuth2Client}
 */
function createOAuth2Client() {
    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_CALENDAR_REDIRECT_URI
    );
}

/**
 * GoogleCalendarOAuthService - Manages OAuth2 flow for Google Calendar
 */
export class GoogleCalendarOAuthService {

    /**
     * Generate OAuth authorization URL
     * @param {string} userId - User ID to encode in state
     * @param {string[]} [scopes] - OAuth scopes (defaults to read-only)
     * @returns {string} Authorization URL
     */
    static generateAuthUrl(userId, scopes = DEFAULT_GOOGLE_SCOPES) {
        const oauth2Client = createOAuth2Client();

        // Encode userId in state for security verification on callback
        const state = Buffer.from(JSON.stringify({
            userId,
            timestamp: Date.now()
        })).toString('base64');

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Request refresh token
            scope: scopes,
            state: state,
            prompt: 'consent', // Force consent screen to get refresh token
            include_granted_scopes: true
        });

        return authUrl;
    }

    /**
     * Parse state parameter from OAuth callback
     * @param {string} state - Base64 encoded state
     * @returns {{userId: string, timestamp: number}|null}
     */
    static parseState(state) {
        try {
            const decoded = Buffer.from(state, 'base64').toString('utf-8');
            const parsed = JSON.parse(decoded);

            // Validate state is not too old (1 hour max)
            const maxAge = 60 * 60 * 1000; // 1 hour
            if (Date.now() - parsed.timestamp > maxAge) {
                console.warn('[GoogleCalendarOAuth] State expired');
                return null;
            }

            return parsed;
        } catch (error) {
            console.error('[GoogleCalendarOAuth] Failed to parse state:', error);
            return null;
        }
    }

    /**
     * Exchange authorization code for tokens
     * @param {string} code - Authorization code from callback
     * @param {string} userId - User ID from state
     * @returns {Promise<{success: boolean, tokens?: CalendarToken, error?: string}>}
     */
    static async exchangeCodeForTokens(code, userId) {
        try {
            const oauth2Client = createOAuth2Client();
            const { tokens } = await oauth2Client.getToken(code);

            if (!tokens.access_token) {
                return {
                    success: false,
                    error: 'No access token received'
                };
            }

            // Get user email from token info
            oauth2Client.setCredentials(tokens);
            let email = '';
            try {
                const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
                email = tokenInfo.email || '';
            } catch (e) {
                console.warn('[GoogleCalendarOAuth] Could not get token info:', e.message);
            }

            // Prepare token document
            const calendarToken = {
                provider: CALENDAR_PROVIDERS.GOOGLE,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || null,
                expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
                scope: tokens.scope || DEFAULT_GOOGLE_SCOPES.join(' '),
                email: email,
                connectedAt: new Date(),
                lastSyncAt: null,
                status: CONNECTION_STATUS.CONNECTED
            };

            // Save to Firestore
            await adminDb.collection('calendar_tokens').doc(userId).set(calendarToken);

            console.log(`[GoogleCalendarOAuth] Tokens saved for user ${userId}`);

            return {
                success: true,
                tokens: calendarToken
            };

        } catch (error) {
            console.error('[GoogleCalendarOAuth] Token exchange failed:', error);
            return {
                success: false,
                error: error.message || 'Failed to exchange code for tokens'
            };
        }
    }

    /**
     * Get stored tokens for a user
     * @param {string} userId
     * @returns {Promise<CalendarToken|null>}
     */
    static async getStoredTokens(userId) {
        try {
            const doc = await adminDb.collection('calendar_tokens').doc(userId).get();
            if (!doc.exists) {
                return null;
            }
            return doc.data();
        } catch (error) {
            console.error('[GoogleCalendarOAuth] Failed to get stored tokens:', error);
            return null;
        }
    }

    /**
     * Refresh access token if expired or about to expire
     * @param {string} userId
     * @returns {Promise<TokenRefreshResult>}
     */
    static async refreshAccessToken(userId) {
        try {
            const storedTokens = await this.getStoredTokens(userId);
            if (!storedTokens) {
                return {
                    success: false,
                    error: 'No stored tokens found'
                };
            }

            if (!storedTokens.refreshToken) {
                // Update status to indicate reconnection needed
                await adminDb.collection('calendar_tokens').doc(userId).update({
                    status: CONNECTION_STATUS.TOKEN_EXPIRED
                });
                return {
                    success: false,
                    error: 'No refresh token available - reconnection required'
                };
            }

            // Check if refresh is actually needed
            const bufferTime = SYNC_CONFIG.TOKEN_REFRESH_BUFFER_MS;
            if (storedTokens.expiryDate && storedTokens.expiryDate > Date.now() + bufferTime) {
                // Token still valid
                return {
                    success: true,
                    accessToken: storedTokens.accessToken,
                    expiryDate: storedTokens.expiryDate
                };
            }

            // Refresh the token
            const oauth2Client = createOAuth2Client();
            oauth2Client.setCredentials({
                refresh_token: storedTokens.refreshToken
            });

            const { credentials } = await oauth2Client.refreshAccessToken();

            // Update stored tokens
            const updates = {
                accessToken: credentials.access_token,
                expiryDate: credentials.expiry_date || Date.now() + 3600 * 1000,
                status: CONNECTION_STATUS.CONNECTED
            };

            // If we got a new refresh token, update it too
            if (credentials.refresh_token) {
                updates.refreshToken = credentials.refresh_token;
            }

            await adminDb.collection('calendar_tokens').doc(userId).update(updates);

            console.log(`[GoogleCalendarOAuth] Token refreshed for user ${userId}`);

            return {
                success: true,
                accessToken: credentials.access_token,
                expiryDate: updates.expiryDate
            };

        } catch (error) {
            console.error('[GoogleCalendarOAuth] Token refresh failed:', error);

            // Update status to indicate error
            try {
                await adminDb.collection('calendar_tokens').doc(userId).update({
                    status: CONNECTION_STATUS.TOKEN_EXPIRED
                });
            } catch (e) {
                // Ignore update error
            }

            return {
                success: false,
                error: error.message || 'Failed to refresh token'
            };
        }
    }

    /**
     * Get authenticated OAuth2 client for API calls
     * @param {string} userId
     * @returns {Promise<{success: boolean, client?: import('googleapis').Auth.OAuth2Client, error?: string}>}
     */
    static async getAuthenticatedClient(userId) {
        // First, ensure we have valid tokens
        const refreshResult = await this.refreshAccessToken(userId);
        if (!refreshResult.success) {
            return {
                success: false,
                error: refreshResult.error
            };
        }

        const storedTokens = await this.getStoredTokens(userId);
        if (!storedTokens) {
            return {
                success: false,
                error: 'No stored tokens found'
            };
        }

        const oauth2Client = createOAuth2Client();
        oauth2Client.setCredentials({
            access_token: storedTokens.accessToken,
            refresh_token: storedTokens.refreshToken,
            expiry_date: storedTokens.expiryDate
        });

        return {
            success: true,
            client: oauth2Client
        };
    }

    /**
     * Revoke access and delete stored tokens
     * @param {string} userId
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    static async revokeAccess(userId) {
        try {
            const storedTokens = await this.getStoredTokens(userId);

            if (storedTokens && storedTokens.accessToken) {
                // Try to revoke the token with Google
                const oauth2Client = createOAuth2Client();
                try {
                    await oauth2Client.revokeToken(storedTokens.accessToken);
                } catch (error) {
                    // Ignore revoke errors - token might already be invalid
                    console.warn('[GoogleCalendarOAuth] Token revoke failed:', error.message);
                }
            }

            // Delete from Firestore
            await adminDb.collection('calendar_tokens').doc(userId).delete();

            console.log(`[GoogleCalendarOAuth] Access revoked for user ${userId}`);

            return { success: true };

        } catch (error) {
            console.error('[GoogleCalendarOAuth] Revoke failed:', error);
            return {
                success: false,
                error: error.message || 'Failed to revoke access'
            };
        }
    }

    /**
     * Check if user has Google Calendar connected
     * @param {string} userId
     * @returns {Promise<{connected: boolean, status: string, email?: string, lastSyncAt?: Date}>}
     */
    static async getConnectionStatus(userId) {
        const storedTokens = await this.getStoredTokens(userId);

        if (!storedTokens) {
            return {
                connected: false,
                status: CONNECTION_STATUS.DISCONNECTED
            };
        }

        // Check if token is expired
        if (storedTokens.expiryDate && storedTokens.expiryDate < Date.now()) {
            if (!storedTokens.refreshToken) {
                return {
                    connected: false,
                    status: CONNECTION_STATUS.TOKEN_EXPIRED,
                    email: storedTokens.email
                };
            }
        }

        return {
            connected: true,
            status: storedTokens.status || CONNECTION_STATUS.CONNECTED,
            email: storedTokens.email,
            lastSyncAt: storedTokens.lastSyncAt?.toDate?.() || storedTokens.lastSyncAt
        };
    }

    /**
     * Update last sync timestamp
     * @param {string} userId
     * @returns {Promise<void>}
     */
    static async updateLastSyncTime(userId) {
        await adminDb.collection('calendar_tokens').doc(userId).update({
            lastSyncAt: new Date(),
            status: CONNECTION_STATUS.CONNECTED
        });
    }

    /**
     * Get all users with Google Calendar connected (for scheduled sync)
     * @returns {Promise<string[]>} Array of user IDs
     */
    static async getConnectedUserIds() {
        const snapshot = await adminDb.collection('calendar_tokens')
            .where('provider', '==', CALENDAR_PROVIDERS.GOOGLE)
            .where('status', '==', CONNECTION_STATUS.CONNECTED)
            .get();

        return snapshot.docs.map(doc => doc.id);
    }
}

export default GoogleCalendarOAuthService;
