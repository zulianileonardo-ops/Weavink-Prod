/**
 * Cookie Consent Utility
 * CNIL-compliant cookie management
 *
 * Requirements:
 * - No cookies set before consent (except strictly necessary)
 * - Granular consent categories
 * - Easy withdraw (as easy as granting)
 * - Consent stored locally and in Firestore
 */

const STORAGE_KEY = 'weavink_cookie_consent';
const CONSENT_VERSION = '1.0';

/**
 * Cookie categories
 */
export const COOKIE_CATEGORIES = {
  ESSENTIAL: 'essential', // Always allowed (auth, session, CSRF)
  ANALYTICS: 'analytics', // Firebase Analytics, usage tracking
  PERSONALIZATION: 'personalization', // Theme, preferences
};

/**
 * Cookie category details
 */
export const COOKIE_DETAILS = {
  [COOKIE_CATEGORIES.ESSENTIAL]: {
    name: 'Strictly Necessary',
    description:
      'Essential cookies required for the website to function. These cannot be disabled as they are necessary for authentication, security, and basic functionality.',
    required: true,
    cookies: [
      { name: 'auth_token', purpose: 'User authentication', duration: '7 days' },
      { name: 'session_id', purpose: 'Session management', duration: 'Session' },
      { name: 'csrf_token', purpose: 'Security (CSRF protection)', duration: 'Session' },
    ],
  },
  [COOKIE_CATEGORIES.ANALYTICS]: {
    name: 'Analytics & Performance',
    description:
      'Help us understand how visitors use our website by collecting anonymized data about page visits, feature usage, and performance metrics.',
    required: false,
    cookies: [
      { name: '_ga', purpose: 'Google Analytics (anonymized)', duration: '2 years' },
      { name: '_gid', purpose: 'Google Analytics session', duration: '24 hours' },
      { name: 'usage_tracking', purpose: 'Feature usage analytics', duration: '1 year' },
    ],
  },
  [COOKIE_CATEGORIES.PERSONALIZATION]: {
    name: 'Personalization',
    description:
      'Remember your preferences like theme, language, and UI customizations to provide a personalized experience.',
    required: false,
    cookies: [
      { name: 'theme_preference', purpose: 'Remember dark/light mode', duration: '1 year' },
      { name: 'language', purpose: 'Language preference', duration: '1 year' },
      { name: 'ui_preferences', purpose: 'Layout and UI settings', duration: '1 year' },
    ],
  },
};

/**
 * Get consent from localStorage
 * @returns {Object|null} Consent object or null
 */
export function getStoredConsent() {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const consent = JSON.parse(stored);

    // Check if consent version matches
    if (consent.version !== CONSENT_VERSION) {
      return null; // Invalidate old consent
    }

    return consent;
  } catch (error) {
    console.error('Error reading stored consent:', error);
    return null;
  }
}

/**
 * Store consent in localStorage
 * @param {Object} consent - Consent object
 */
export function storeConsent(consent) {
  if (typeof window === 'undefined') return;

  try {
    const consentData = {
      ...consent,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));
  } catch (error) {
    console.error('Error storing consent:', error);
  }
}

/**
 * Check if user has given consent
 * @returns {boolean} True if consent has been given (accepted or rejected)
 */
export function hasGivenConsent() {
  const consent = getStoredConsent();
  return consent !== null && consent.responded === true;
}

/**
 * Check if a specific cookie category is allowed
 * @param {string} category - Cookie category
 * @returns {boolean} True if allowed
 */
export function isCategoryAllowed(category) {
  // Essential cookies are always allowed
  if (category === COOKIE_CATEGORIES.ESSENTIAL) {
    return true;
  }

  const consent = getStoredConsent();

  if (!consent || !consent.responded) {
    return false; // No consent = no non-essential cookies
  }

  return consent.categories[category] === true;
}

/**
 * Accept all cookies
 * @param {Function} onSave - Callback to save to Firestore
 */
export async function acceptAllCookies(onSave) {
  const consent = {
    responded: true,
    categories: {
      [COOKIE_CATEGORIES.ESSENTIAL]: true,
      [COOKIE_CATEGORIES.ANALYTICS]: true,
      [COOKIE_CATEGORIES.PERSONALIZATION]: true,
    },
    timestamp: new Date().toISOString(),
  };

  storeConsent(consent);

  // Save to Firestore if callback provided
  if (onSave && typeof onSave === 'function') {
    try {
      await onSave(consent);
    } catch (error) {
      console.error('Error saving consent to Firestore:', error);
    }
  }

  // Initialize allowed services
  initializeServices(consent);

  return consent;
}

/**
 * Reject all non-essential cookies
 * @param {Function} onSave - Callback to save to Firestore
 */
export async function rejectAllCookies(onSave) {
  const consent = {
    responded: true,
    categories: {
      [COOKIE_CATEGORIES.ESSENTIAL]: true,
      [COOKIE_CATEGORIES.ANALYTICS]: false,
      [COOKIE_CATEGORIES.PERSONALIZATION]: false,
    },
    timestamp: new Date().toISOString(),
  };

  storeConsent(consent);

  // Save to Firestore if callback provided
  if (onSave && typeof onSave === 'function') {
    try {
      await onSave(consent);
    } catch (error) {
      console.error('Error saving consent to Firestore:', error);
    }
  }

  // Clear non-essential cookies
  clearNonEssentialCookies();

  return consent;
}

/**
 * Save custom consent preferences
 * @param {Object} categories - Category preferences
 * @param {Function} onSave - Callback to save to Firestore
 */
export async function saveCustomConsent(categories, onSave) {
  const consent = {
    responded: true,
    categories: {
      [COOKIE_CATEGORIES.ESSENTIAL]: true, // Always true
      ...categories,
    },
    timestamp: new Date().toISOString(),
  };

  storeConsent(consent);

  // Save to Firestore if callback provided
  if (onSave && typeof onSave === 'function') {
    try {
      await onSave(consent);
    } catch (error) {
      console.error('Error saving consent to Firestore:', error);
    }
  }

  // Initialize allowed services
  initializeServices(consent);

  // Clear disallowed cookies
  clearDisallowedCookies(consent);

  return consent;
}

/**
 * Initialize services based on consent
 * @param {Object} consent - Consent object
 */
function initializeServices(consent) {
  // Initialize analytics if allowed
  if (consent.categories[COOKIE_CATEGORIES.ANALYTICS]) {
    initializeAnalytics();
  }

  // Initialize personalization if allowed
  if (consent.categories[COOKIE_CATEGORIES.PERSONALIZATION]) {
    initializePersonalization();
  }
}

/**
 * Initialize analytics services
 */
function initializeAnalytics() {
  if (typeof window === 'undefined') return;

  // Initialize Google Analytics (if configured)
  if (window.gtag && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
    });
  }

  // Initialize Firebase Analytics
  if (window.firebaseAnalytics) {
    window.firebaseAnalytics.setAnalyticsCollectionEnabled(true);
  }

  console.log('[CookieConsent] Analytics initialized');
}

/**
 * Initialize personalization services
 */
function initializePersonalization() {
  // Enable personalization features
  console.log('[CookieConsent] Personalization initialized');
}

/**
 * Clear all non-essential cookies
 */
function clearNonEssentialCookies() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Get all cookies
  const cookies = document.cookie.split(';');

  // List of essential cookie prefixes to keep
  const essentialPrefixes = ['auth_', 'session_', 'csrf_', '__Secure-', '__Host-'];

  // Delete non-essential cookies
  cookies.forEach((cookie) => {
    const cookieName = cookie.split('=')[0].trim();

    // Check if cookie is essential
    const isEssential = essentialPrefixes.some((prefix) => cookieName.startsWith(prefix));

    if (!isEssential) {
      // Delete cookie
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  });

  // Disable analytics
  if (window.gtag && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: 'denied',
    });
  }

  if (window.firebaseAnalytics) {
    window.firebaseAnalytics.setAnalyticsCollectionEnabled(false);
  }

  console.log('[CookieConsent] Non-essential cookies cleared');
}

/**
 * Clear cookies for disallowed categories
 * @param {Object} consent - Consent object
 */
function clearDisallowedCookies(consent) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // If analytics not allowed, clear analytics cookies
  if (!consent.categories[COOKIE_CATEGORIES.ANALYTICS]) {
    clearAnalyticsCookies();
  }

  // If personalization not allowed, clear personalization cookies
  if (!consent.categories[COOKIE_CATEGORIES.PERSONALIZATION]) {
    clearPersonalizationCookies();
  }
}

/**
 * Clear analytics cookies
 */
function clearAnalyticsCookies() {
  const analyticsCookies = ['_ga', '_gid', '_gat', 'usage_tracking'];

  analyticsCookies.forEach((cookieName) => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });

  // Disable Google Analytics
  if (window.gtag && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: 'denied',
    });
  }

  if (window.firebaseAnalytics) {
    window.firebaseAnalytics.setAnalyticsCollectionEnabled(false);
  }
}

/**
 * Clear personalization cookies
 */
function clearPersonalizationCookies() {
  const personalizationCookies = ['theme_preference', 'language', 'ui_preferences'];

  personalizationCookies.forEach((cookieName) => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
}

/**
 * Reset consent (force user to consent again)
 */
export function resetConsent() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(STORAGE_KEY);
  clearNonEssentialCookies();
}

/**
 * Get consent for Firestore sync
 * @returns {Object|null} Consent data for Firestore
 */
export function getConsentForSync() {
  const consent = getStoredConsent();

  if (!consent || !consent.responded) {
    return null;
  }

  return {
    categories: consent.categories,
    timestamp: consent.timestamp,
    version: consent.version,
  };
}
