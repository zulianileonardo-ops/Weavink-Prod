/**
 * Configuration for [FEATURE_NAME]
 * @type {Object}
 * @constant
 */
export const [FEATURE]_CONFIG = {
  // Basic settings
  enabled: true,
  version: '1.0.0',

  // Provider configuration
  provider: {
    name: '[provider_name]',
    endpoint: '[api_endpoint]',
    apiKey: process.env.[API_KEY_ENV_VAR]
  },

  // Feature-specific settings
  settings: {
    maxItems: 100,
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    cacheEnabled: true,
    cacheDuration: 3600 // 1 hour in seconds
  },

  // Advanced configuration
  advanced: {
    batchSize: 50,
    parallelRequests: 5,
    debugMode: false
  }
};

/**
 * Example Usage:
 *
 * import { [FEATURE]_CONFIG } from '@/lib/services/constants';
 *
 * const response = await fetch([FEATURE]_CONFIG.provider.endpoint, {
 *   timeout: [FEATURE]_CONFIG.settings.timeout
 * });
 */
