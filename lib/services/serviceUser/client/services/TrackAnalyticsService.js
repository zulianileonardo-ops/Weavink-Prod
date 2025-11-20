// lib/services/serviceUser/client/services/TrackAnalyticsService.js
/**
 * Client-side Analytics Tracking Service
 *
 * Handles all analytics tracking on the client side, including:
 * - Profile views
 * - Link clicks
 * - Time on profile
 * - Session management
 * - UTM tracking
 * - Referrer tracking
 */

"use client";

import { ContactApiClient } from '@/lib/services/core/ApiClient';
import {
    ANALYTICS_EVENT_TYPES,
    SESSION_CONFIG,
    TRAFFIC_SOURCES,
    UTM_PARAMS,
    TIME_TRACKING,
    ANALYTICS_ERRORS
} from '../../constants/analyticsConstants';
import {
    getUserConsentsClient,
    hasAnalyticsConsent,
    hasAnalyticsCookiesConsent,
    getAnalyticsConsentLevel
} from '@/lib/services/servicePrivacy/client/consentHelper';
import { AnonymousAnalyticsService } from './AnonymousAnalyticsService';

// Session storage
let currentSession = null;

/**
 * Session Manager - Handles session creation and tracking
 */
class SessionManager {
    /**
     * Get or create a new analytics session
     * @param {Object} consents - User consent object (optional, for validation)
     * @returns {Object} - Session data or null if no cookies consent
     */
    static getOrCreateSession(consents = null) {
        if (typeof window === 'undefined') return null;

        // Check if analytics cookies are allowed (GDPR/ePrivacy compliance)
        // If consents not provided, check localStorage flag as fallback
        if (consents) {
            if (!hasAnalyticsCookiesConsent(consents)) {
                console.log('📊 SessionManager: Session creation blocked (no cookies consent)');
                // Clear any existing session
                this.clearSession();
                return null;
            }
        }

        // Check if we have a valid session
        const now = Date.now();
        const storedSession = this.getStoredSession();

        if (storedSession && (now - storedSession.startTime) < SESSION_CONFIG.sessionDuration) {
            return storedSession;
        }

        // Create new session (only if cookies consent exists)
        const newSession = {
            sessionId: this.generateSessionId(),
            startTime: now,
            lastActivityTime: now,
            originalReferrer: document.referrer || 'direct',
            trafficSource: this.detectTrafficSource(),
            utm: this.extractUTMParams(),
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        // Store session
        this.storeSession(newSession);
        currentSession = newSession;

        return newSession;
    }

    /**
     * Generate a unique session ID
     * @returns {string}
     */
    static generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Get stored session from localStorage
     * @returns {Object|null}
     */
    static getStoredSession() {
        try {
            const stored = localStorage.getItem(SESSION_CONFIG.cookieName);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('Failed to get stored session:', error);
            return null;
        }
    }

    /**
     * Store session in localStorage
     * @param {Object} session
     */
    static storeSession(session) {
        try {
            localStorage.setItem(SESSION_CONFIG.cookieName, JSON.stringify(session));
        } catch (error) {
            console.warn('Failed to store session:', error);
        }
    }

    /**
     * Clear session from localStorage (GDPR compliance)
     * Called when user withdraws analytics cookies consent
     */
    static clearSession() {
        try {
            localStorage.removeItem(SESSION_CONFIG.cookieName);
            currentSession = null;
            console.log('📊 SessionManager: Session cleared');
        } catch (error) {
            console.warn('Failed to clear session:', error);
        }
    }

    /**
     * Update session activity time
     */
    static updateActivity() {
        if (currentSession) {
            currentSession.lastActivityTime = Date.now();
            this.storeSession(currentSession);
        }
    }

    /**
     * Detect traffic source from referrer and URL params
     * @returns {Object}
     */
    static detectTrafficSource() {
        const referrer = document.referrer.toLowerCase();
        const url = window.location.href.toLowerCase();

        // Check for UTM source first
        const urlParams = new URLSearchParams(window.location.search);
        const utmSource = urlParams.get('utm_source');
        const utmMedium = urlParams.get('utm_medium');

        if (utmSource) {
            return {
                source: utmSource,
                medium: utmMedium || 'unknown',
                type: this.classifySourceType(utmSource, utmMedium)
            };
        }

        // Check for QR code scan
        if (url.includes('qr=') || url.includes('scan=')) {
            return {
                source: 'qr_code',
                medium: 'scan',
                type: TRAFFIC_SOURCES.QR
            };
        }

        // No referrer = direct traffic
        if (!referrer) {
            return {
                source: 'direct',
                medium: 'none',
                type: TRAFFIC_SOURCES.DIRECT
            };
        }

        // Social media
        const socialPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest'];
        for (const platform of socialPlatforms) {
            if (referrer.includes(platform)) {
                return {
                    source: platform,
                    medium: 'social',
                    type: TRAFFIC_SOURCES.SOCIAL
                };
            }
        }

        // Search engines
        const searchEngines = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu'];
        for (const engine of searchEngines) {
            if (referrer.includes(engine)) {
                return {
                    source: engine,
                    medium: 'organic',
                    type: TRAFFIC_SOURCES.SEARCH
                };
            }
        }

        // Email
        if (referrer.includes('mail') || referrer.includes('email')) {
            return {
                source: 'email',
                medium: 'email',
                type: TRAFFIC_SOURCES.EMAIL
            };
        }

        // Generic referral
        try {
            const referrerUrl = new URL(referrer);
            return {
                source: referrerUrl.hostname,
                medium: 'referral',
                type: TRAFFIC_SOURCES.REFERRAL
            };
        } catch (error) {
            return {
                source: 'unknown',
                medium: 'unknown',
                type: TRAFFIC_SOURCES.UNKNOWN
            };
        }
    }

    /**
     * Classify source type based on source and medium
     * @param {string} source
     * @param {string} medium
     * @returns {string}
     */
    static classifySourceType(source, medium) {
        if (medium === 'cpc' || medium === 'ppc' || medium === 'paid') return TRAFFIC_SOURCES.AD;
        if (medium === 'email') return TRAFFIC_SOURCES.EMAIL;
        if (medium === 'social') return TRAFFIC_SOURCES.SOCIAL;
        if (medium === 'organic') return TRAFFIC_SOURCES.SEARCH;
        if (source === 'qr_code') return TRAFFIC_SOURCES.QR;
        return TRAFFIC_SOURCES.REFERRAL;
    }

    /**
     * Extract UTM parameters from URL
     * @returns {Object}
     */
    static extractUTMParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const utmData = {};

        UTM_PARAMS.forEach(param => {
            const value = urlParams.get(param);
            if (value) {
                utmData[param] = value;
            }
        });

        return Object.keys(utmData).length > 0 ? utmData : null;
    }
}

/**
 * Main Analytics Service
 */
export class TrackAnalyticsService {
    /**
     * Track a profile view
     * @param {string} userId - Profile owner's user ID
     * @param {string} username - Profile owner's username
     * @returns {Promise<void>}
     */
    static async trackView(userId, username) {
        if (typeof window === 'undefined') return;

        // Don't track in preview mode
        const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
        if (isPreview) {
            console.log('📊 Analytics: View tracking skipped (preview mode)');
            return;
        }

        try {
            // ✅ GDPR Compliance: Check user consent before tracking
            const userConsents = await getUserConsentsClient(userId);

            if (!hasAnalyticsConsent(userConsents, 'basic')) {
                console.log('📊 Analytics: No consent - tracking anonymously');
                // Track anonymously for system monitoring (legitimate interest)
                await AnonymousAnalyticsService.trackAnonymousView();
                return;
            }

            const consentLevel = getAnalyticsConsentLevel(userConsents);
            console.log(`📊 Analytics: Tracking view for ${username} (${userId}) [consent: ${consentLevel}]`);

            // Get session data only if detailed consent granted
            const sessionData = consentLevel === 'detailed'
                ? SessionManager.getOrCreateSession(userConsents)
                : null;

            const payload = {
                eventType: ANALYTICS_EVENT_TYPES.VIEW,
                userId,
                username,
                sessionData,  // null for basic consent, full data for detailed consent
                timestamp: new Date().toISOString()
            };

            // Use sendBeacon for reliability (works even when page is closing)
            if (navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                const sent = navigator.sendBeacon('/api/user/analytics/track-event', blob);

                if (sent) {
                    console.log(`✅ Analytics: View tracked via sendBeacon (${consentLevel} mode)`);
                } else {
                    // Fallback to fetch
                    await this.sendViaFetch(payload);
                }
            } else {
                await this.sendViaFetch(payload);
            }

        } catch (error) {
            console.error('❌ Analytics: Failed to track view:', error);
        }
    }

    /**
     * Track a link click
     * @param {string} userId - Profile owner's user ID
     * @param {Object} linkData - Link information
     * @param {string} linkData.linkId - Link ID
     * @param {string} linkData.linkTitle - Link title
     * @param {string} linkData.linkUrl - Link URL
     * @param {string} linkData.linkType - Link type
     * @returns {Promise<void>}
     */
    static async trackClick(userId, linkData) {
        if (typeof window === 'undefined') return;

        // Don't track in preview mode
        const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
        if (isPreview) {
            console.log('📊 Analytics: Click tracking skipped (preview mode)');
            return;
        }

        try {
            // ✅ GDPR Compliance: Check user consent before tracking
            const userConsents = await getUserConsentsClient(userId);

            if (!hasAnalyticsConsent(userConsents, 'basic')) {
                console.log('📊 Analytics: No consent - tracking click anonymously');
                // Track anonymously for system monitoring (legitimate interest)
                await AnonymousAnalyticsService.trackAnonymousClick(linkData.linkType);
                return;
            }

            const consentLevel = getAnalyticsConsentLevel(userConsents);
            console.log(`📊 Analytics: Tracking click on "${linkData.linkTitle}" [consent: ${consentLevel}]`);

            // Get session data only if detailed consent granted
            const sessionData = consentLevel === 'detailed'
                ? SessionManager.getOrCreateSession(userConsents)
                : null;

            if (sessionData) {
                SessionManager.updateActivity();
            }

            const payload = {
                eventType: ANALYTICS_EVENT_TYPES.CLICK,
                userId,
                linkData,
                sessionData,  // null for basic consent, full data for detailed consent
                timestamp: new Date().toISOString()
            };

            // Use sendBeacon for reliability
            if (navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                const sent = navigator.sendBeacon('/api/user/analytics/track-event', blob);

                if (sent) {
                    console.log(`✅ Analytics: Click tracked via sendBeacon (${consentLevel} mode)`);
                } else {
                    // Fallback to fetch
                    await this.sendViaFetch(payload);
                }
            } else {
                await this.sendViaFetch(payload);
            }

        } catch (error) {
            console.error('❌ Analytics: Failed to track click:', error);
        }
    }

    /**
     * Track time spent on profile (heartbeat)
     * @param {string} userId - Profile owner's user ID
     * @param {number} duration - Time spent in milliseconds
     * @returns {Promise<void>}
     */
    static async trackTimeOnProfile(userId, duration) {
        if (typeof window === 'undefined') return;

        // Don't track in preview mode
        const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
        if (isPreview) return;

        // Only track if duration is significant
        if (duration < TIME_TRACKING.MIN_SESSION_TIME) {
            return;
        }

        try {
            // ✅ GDPR Compliance: Time tracking requires DETAILED consent (behavioral tracking)
            const userConsents = await getUserConsentsClient(userId);

            if (!hasAnalyticsConsent(userConsents, 'detailed')) {
                console.log('📊 Analytics: Time tracking skipped (requires detailed consent)');
                return;
            }

            console.log(`📊 Analytics: Tracking time on profile (${duration}ms) [detailed consent]`);

            const sessionData = SessionManager.getOrCreateSession(userConsents);
            SessionManager.updateActivity();

            const payload = {
                eventType: ANALYTICS_EVENT_TYPES.TIME_ON_PROFILE,
                userId,
                duration,
                sessionData,
                timestamp: new Date().toISOString()
            };

            await this.sendViaFetch(payload);

        } catch (error) {
            console.error('❌ Analytics: Failed to track time:', error);
        }
    }

    /**
     * Send analytics via fetch (fallback)
     * @param {Object} payload
     * @returns {Promise<void>}
     */
    static async sendViaFetch(payload) {
        try {
            const response = await fetch('/api/user/analytics/track-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            });

            if (response.ok) {
                console.log('✅ Analytics: Event tracked via fetch');
            } else {
                console.warn('⚠️ Analytics: Server returned error:', response.status);
            }
        } catch (error) {
            console.error('❌ Analytics: Fetch failed:', error);
        }
    }

    /**
     * Get current session data
     * @returns {Object|null}
     */
    static getCurrentSession() {
        return SessionManager.getOrCreateSession();
    }

    /**
     * Initialize time tracking for a profile
     * @param {string} userId
     * @returns {Function} - Cleanup function
     */
    static initializeTimeTracking(userId) {
        if (typeof window === 'undefined') return () => {};

        let startTime = Date.now();
        let lastHeartbeat = Date.now();
        let isVisible = !document.hidden;

        // Heartbeat interval
        const heartbeatInterval = setInterval(() => {
            if (isVisible) {
                const now = Date.now();
                const duration = now - lastHeartbeat;

                this.trackTimeOnProfile(userId, duration);
                lastHeartbeat = now;
            }
        }, TIME_TRACKING.HEARTBEAT_INTERVAL);

        // Visibility change handler
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Page hidden - send final heartbeat
                isVisible = false;
                const duration = Date.now() - lastHeartbeat;
                this.trackTimeOnProfile(userId, duration);
            } else {
                // Page visible again - reset timer
                isVisible = true;
                lastHeartbeat = Date.now();
            }
        };

        // Before unload handler
        const handleBeforeUnload = () => {
            const duration = Date.now() - lastHeartbeat;
            this.trackTimeOnProfile(userId, duration);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup function
        return () => {
            clearInterval(heartbeatInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }
}
