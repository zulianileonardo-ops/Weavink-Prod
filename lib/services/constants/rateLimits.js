// lib/services/constants/rateLimits.js
// Centralized rate limit constants for security features

/**
 * Rate Limit Constants
 *
 * This file centralizes all rate limiting configuration.
 * Update these values to adjust security thresholds.
 *
 * All time values are in minutes unless otherwise specified.
 */

export const RATE_LIMITS = {
  // Contact Exchange - Public form submission rate limits
  // These protect against spam/abuse on the public exchange endpoint
  EXCHANGE: {
    // IP-based rate limiting
    IP: {
      MAX_REQUESTS: 60,      // Max submissions per window
      WINDOW_MINUTES: 60,    // 1 hour window
      DESCRIPTION: 'Per-IP rate limit for exchange submissions'
    },
    // Device fingerprint-based rate limiting (stricter)
    FINGERPRINT: {
      MAX_REQUESTS: 30,      // Max submissions per window (stricter than IP)
      WINDOW_MINUTES: 60,    // 1 hour window
      DESCRIPTION: 'Per-device rate limit for exchange submissions'
    }
  },

  // Future rate limits can be added here:
  // API: {
  //   AUTHENTICATED: { MAX_REQUESTS: 1000, WINDOW_MINUTES: 60 },
  //   UNAUTHENTICATED: { MAX_REQUESTS: 100, WINDOW_MINUTES: 60 }
  // },
  // SEARCH: {
  //   SEMANTIC: { MAX_REQUESTS: 50, WINDOW_MINUTES: 60 }
  // }
};

/**
 * Helper function to get rate limit config
 * @param {string} feature - The feature (e.g., 'EXCHANGE')
 * @param {string} limitType - The limit type (e.g., 'IP', 'FINGERPRINT')
 * @returns {{ MAX_REQUESTS: number, WINDOW_MINUTES: number }} Rate limit config
 */
export function getRateLimit(feature, limitType) {
  try {
    return RATE_LIMITS[feature]?.[limitType] || { MAX_REQUESTS: 60, WINDOW_MINUTES: 60 };
  } catch (error) {
    console.error(`[RateLimits] Error getting limit for ${feature}.${limitType}:`, error);
    return { MAX_REQUESTS: 60, WINDOW_MINUTES: 60 };
  }
}
