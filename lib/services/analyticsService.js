// File: lib/services/analyticsService.js
/**
 * ⚠️ DEPRECATED - This file is kept for backward compatibility only
 *
 * Please use the new analytics service instead:
 * @see lib/services/serviceUser/client/services/TrackAnalyticsService.js
 *
 * Migration guide:
 * - Old: import { trackView, trackClick } from '@/lib/services/analyticsService'
 * - New: import { TrackAnalyticsService } from '@/lib/services/serviceUser/client/services/TrackAnalyticsService'
 *
 * - Old: trackView(userId, username)
 * - New: TrackAnalyticsService.trackView(userId, username)
 *
 * - Old: trackClick(userId, linkData)
 * - New: TrackAnalyticsService.trackClick(userId, linkData)
 */

import {
    getPublicAnalyticsConsent,
    getUserConsentsClient,
    hasAnalyticsConsent,
    hasAnalyticsCookiesConsent,
    getAnalyticsConsentLevel
} from '@/lib/services/servicePrivacy/client/consentHelper';
import { AnonymousAnalyticsService } from '@/lib/services/serviceUser/client/services/AnonymousAnalyticsService';

// --- Session Manager (Client-Side) ---
// Simple session manager for backward compatibility
const SessionManager = {
    getOrCreateSession(consents = null) {
        if (typeof window === 'undefined') return null;

        // ✅ GDPR: Check if analytics cookies are allowed
        if (consents && !hasAnalyticsCookiesConsent(consents)) {
            console.log('📊 SessionManager (old): Session blocked (no cookies consent)');
            // Clear any existing session
            try {
                localStorage.removeItem('analytics_session');
            } catch (e) { }
            return null;
        }

        try {
            const now = Date.now();
            const sessionKey = 'analytics_session';
            const storedSession = localStorage.getItem(sessionKey);

            if (storedSession) {
                const session = JSON.parse(storedSession);
                // Check if session is still valid (30 minutes)
                if (now - session.startTime < 30 * 60 * 1000) {
                    return session;
                }
            }

            // Create new session (only if cookies consent exists)
            const newSession = {
                sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
                startTime: now,
                referrer: document.referrer || 'direct',
                userAgent: navigator.userAgent
            };

            localStorage.setItem(sessionKey, JSON.stringify(newSession));
            return newSession;
        } catch (error) {
            console.warn('SessionManager error:', error);
            return null;
        }
    }
};


// --- Main Tracking Function ---
async function trackEvent(payload) {
    if (typeof window === 'undefined') return;

    // Do not track in preview mode
    const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
    if (isPreview) {
        console.log(' G-Analytics: Preview mode detected, tracking skipped.');
        return;
    }
    
    try {
        // Use `navigator.sendBeacon` if available for reliability.
        // It sends the request even if the page is closing (e.g., after a link click).
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon('/api/user/analytics/track', blob);
        } else {
            await fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true, // Important for requests during page unload
            });
        }
    } catch (error) {
        console.error(' G-Analytics Service Error:', error);
    }
}

/**
 * Tracks a profile view.
 * @param {string} userId - The UID of the profile being viewed.
 * @param {string} username - The username of the profile being viewed.
 */
export async function trackView(userId, username) {
    // ✅ GDPR Compliance: Check user consent before tracking
    // Uses public endpoint (no auth required) - pattern from verify-profile
    const publicConsent = await getPublicAnalyticsConsent(userId);

    if (!publicConsent.analytics_basic) {
        console.log('📊 Analytics (old): No consent - tracking anonymously');
        // Track anonymously for system monitoring (legitimate interest)
        await AnonymousAnalyticsService.trackAnonymousView();
        return;
    }

    const consentLevel = publicConsent.analytics_detailed ? 'detailed' : 'basic';
    console.log(` G-Analytics: Queuing 'view' for ${username} (${userId}) [consent: ${consentLevel}]`);

    // Get session data only if detailed consent granted
    // For public consent check, we don't have full consents object, so pass null to skip cookie check
    const sessionData = consentLevel === 'detailed'
        ? SessionManager.getOrCreateSession(null)
        : null;

    trackEvent({
        eventType: 'view',
        userId,
        username,
        sessionData,  // null for basic consent, full data for detailed consent
    });
}

/**
 * Tracks an outbound link click.
 * @param {string} userId - The UID of the profile owner.
 * @param {object} linkData - Contains linkId, linkTitle, linkUrl, linkType.
 */
export async function trackClick(userId, linkData) {
    // ✅ GDPR Compliance: Check user consent before tracking
    // Uses public endpoint (no auth required) - pattern from verify-profile
    const publicConsent = await getPublicAnalyticsConsent(userId);

    if (!publicConsent.analytics_basic) {
        console.log('📊 Analytics (old): No consent - tracking click anonymously');
        // Track anonymously for system monitoring (legitimate interest)
        await AnonymousAnalyticsService.trackAnonymousClick(linkData.linkType);
        return;
    }

    const consentLevel = publicConsent.analytics_detailed ? 'detailed' : 'basic';
    console.log(` G-Analytics: Queuing 'click' on "${linkData.linkTitle}" [consent: ${consentLevel}]`);

    // Get session data only if detailed consent granted
    // For public consent check, we don't have full consents object, so pass null to skip cookie check
    const sessionData = consentLevel === 'detailed'
        ? SessionManager.getOrCreateSession(null)
        : null;

    trackEvent({
        eventType: 'click',
        userId,
        linkData,
        sessionData,  // null for basic consent, full data for detailed consent
    });
}
