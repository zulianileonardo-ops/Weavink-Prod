/**
 * Client-Side Consent Helper
 *
 * Provides helper functions for checking user consent preferences
 * on the client side (browser). Used by analytics and tracking services
 * to verify consent before collecting data.
 *
 * GDPR Compliance:
 * - Art. 6(1)(a) - Processing based on consent
 * - Art. 7 - Conditions for consent
 * - ePrivacy Directive - Cookie consent
 */

/**
 * Fetch user consents from the API
 *
 * @param {string} userId - User ID to fetch consents for
 * @returns {Promise<Object>} User consent object with all consent types
 */
export async function getUserConsentsClient(userId) {
  if (!userId) {
    console.warn('📊 ConsentHelper: No userId provided');
    return getDefaultConsents();
  }

  try {
    const response = await fetch(`/api/user/privacy/consent?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('📊 ConsentHelper: Failed to fetch user consents', response.status);
      return getDefaultConsents();
    }

    const data = await response.json();

    if (!data.consents) {
      console.warn('📊 ConsentHelper: No consents in response');
      return getDefaultConsents();
    }

    return data.consents;
  } catch (error) {
    console.error('📊 ConsentHelper: Error fetching consents:', error);
    return getDefaultConsents();
  }
}

/**
 * Check if user has granted analytics consent
 *
 * @param {Object} consents - User consent object from getUserConsentsClient()
 * @param {string} level - Consent level to check ('basic' or 'detailed')
 * @returns {boolean} True if consent granted, false otherwise
 */
export function hasAnalyticsConsent(consents, level = 'basic') {
  if (!consents) {
    return false;
  }

  if (level === 'detailed') {
    // Detailed analytics requires BOTH basic AND detailed consent
    const hasBasic = consents?.analytics_basic?.status === true;
    const hasDetailed = consents?.analytics_detailed?.status === true;
    return hasBasic && hasDetailed;
  }

  // Basic analytics only requires basic consent
  return consents?.analytics_basic?.status === true;
}

/**
 * Check if user has granted cookies consent for analytics
 *
 * @param {Object} consents - User consent object from getUserConsentsClient()
 * @returns {boolean} True if cookies consent granted, false otherwise
 */
export function hasAnalyticsCookiesConsent(consents) {
  if (!consents) {
    return false;
  }

  return consents?.cookies_analytics?.status === true;
}

/**
 * Get default consents (all denied)
 * Used as fallback when consent fetch fails
 *
 * @returns {Object} Default consent object with all consents denied
 */
function getDefaultConsents() {
  return {
    analytics_basic: { status: false },
    analytics_detailed: { status: false },
    cookies_analytics: { status: false },
  };
}

/**
 * Get consent level string for analytics
 *
 * @param {Object} consents - User consent object from getUserConsentsClient()
 * @returns {string} 'none', 'basic', or 'detailed'
 */
export function getAnalyticsConsentLevel(consents) {
  if (!consents) {
    return 'none';
  }

  const hasBasic = consents?.analytics_basic?.status === true;
  const hasDetailed = consents?.analytics_detailed?.status === true;

  if (hasBasic && hasDetailed) {
    return 'detailed';
  }

  if (hasBasic) {
    return 'basic';
  }

  return 'none';
}

/**
 * Check multiple consents at once
 *
 * @param {Object} consents - User consent object from getUserConsentsClient()
 * @param {Array<string>} consentTypes - Array of consent type keys to check
 * @returns {boolean} True if ALL specified consents are granted
 */
export function hasAllConsents(consents, consentTypes) {
  if (!consents || !consentTypes || consentTypes.length === 0) {
    return false;
  }

  return consentTypes.every((type) => consents[type]?.status === true);
}

/**
 * Log consent status for debugging
 *
 * @param {Object} consents - User consent object
 * @param {string} context - Context string for logging (e.g., 'TrackAnalytics')
 */
export function logConsentStatus(consents, context = 'ConsentHelper') {
  console.log(`📊 ${context}: Consent Status`, {
    analyticsBasic: consents?.analytics_basic?.status || false,
    analyticsDetailed: consents?.analytics_detailed?.status || false,
    analyticsCookies: consents?.cookies_analytics?.status || false,
    consentLevel: getAnalyticsConsentLevel(consents),
  });
}
