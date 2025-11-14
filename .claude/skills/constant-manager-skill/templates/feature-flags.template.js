import { SUBSCRIPTION_LEVELS } from '../core/constants.js';

/**
 * Available [DOMAIN] features
 * @type {Object}
 * @constant
 */
export const [DOMAIN]_FEATURES = {
  BASIC_[DOMAIN]: 'basic_[domain]',
  ADVANCED_[FEATURE_1]: 'advanced_[feature_1]',
  PREMIUM_[FEATURE_2]: 'premium_[feature_2]',
  ENTERPRISE_[FEATURE_3]: 'enterprise_[feature_3]'
};

/**
 * [DOMAIN] limits per subscription level
 * @type {Object}
 * @constant
 */
export const [DOMAIN]_LIMITS = {
  [SUBSCRIPTION_LEVELS.BASE]: {
    max[Resource]: 0,
    features: []
  },
  [SUBSCRIPTION_LEVELS.PRO]: {
    max[Resource]: 1000,
    features: [
      [DOMAIN]_FEATURES.BASIC_[DOMAIN]
    ]
  },
  [SUBSCRIPTION_LEVELS.PREMIUM]: {
    max[Resource]: 5000,
    features: [
      [DOMAIN]_FEATURES.BASIC_[DOMAIN],
      [DOMAIN]_FEATURES.ADVANCED_[FEATURE_1]
    ]
  },
  [SUBSCRIPTION_LEVELS.BUSINESS]: {
    max[Resource]: 20000,
    features: [
      [DOMAIN]_FEATURES.BASIC_[DOMAIN],
      [DOMAIN]_FEATURES.ADVANCED_[FEATURE_1],
      [DOMAIN]_FEATURES.PREMIUM_[FEATURE_2]
    ]
  },
  [SUBSCRIPTION_LEVELS.ENTERPRISE]: {
    max[Resource]: -1, // unlimited
    features: [
      [DOMAIN]_FEATURES.BASIC_[DOMAIN],
      [DOMAIN]_FEATURES.ADVANCED_[FEATURE_1],
      [DOMAIN]_FEATURES.PREMIUM_[FEATURE_2],
      [DOMAIN]_FEATURES.ENTERPRISE_[FEATURE_3]
    ]
  }
};

/**
 * Helper function to check if subscription level has a [domain] feature
 * @param {string} subscriptionLevel
 * @param {string} feature
 * @returns {boolean}
 */
export function has[Domain]Feature(subscriptionLevel, feature) {
  const level = subscriptionLevel?.toLowerCase() || 'base';
  const config = [DOMAIN]_LIMITS[level];
  return config?.features?.includes(feature) || false;
}

/**
 * Example Usage:
 *
 * import { [DOMAIN]_FEATURES, has[Domain]Feature } from '@/lib/services/constants';
 *
 * if (has[Domain]Feature(userSubscription, [DOMAIN]_FEATURES.ADVANCED_[FEATURE_1])) {
 *   // User has access to advanced feature 1
 * }
 */
