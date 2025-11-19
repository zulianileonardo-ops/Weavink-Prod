// lib/services/server/translationService.js

import fs from 'fs';
import path from 'path';

/**
 * Server-side translation service for API routes
 * Loads translations from /public/locales/{locale}/common.json
 *
 * Usage:
 * ```javascript
 * import { translateServerSide } from '@/lib/services/server/translationService';
 *
 * const errorMessage = translateServerSide('privacy.errors.deletion.rate_limit', 'fr');
 * // Returns: "Trop de demandes de suppression. Veuillez réessayer plus tard."
 * ```
 */

/**
 * Cache for loaded translation files
 * Prevents re-reading files on every translation request
 * @private
 */
const translationCache = new Map();

/**
 * Load translations for a specific locale
 * @param {string} locale - Language code (en, fr, es, zh, vm)
 * @returns {Object} Translation object
 * @private
 */
function loadTranslations(locale = 'en') {
  // Check cache first
  if (translationCache.has(locale)) {
    return translationCache.get(locale);
  }

  try {
    const translationPath = path.join(process.cwd(), 'public', 'locales', locale, 'common.json');
    const translations = JSON.parse(fs.readFileSync(translationPath, 'utf-8'));

    // Cache the loaded translations
    translationCache.set(locale, translations);

    return translations;
  } catch (error) {
    console.warn(`⚠️ [TranslationService] Failed to load translations for locale "${locale}", falling back to English`);

    // Fallback to English if locale not found
    if (locale !== 'en') {
      return loadTranslations('en');
    }

    return {};
  }
}

/**
 * Translate a key to the user's language (server-side)
 * @param {string} key - Translation key (e.g., 'privacy.errors.deletion.rate_limit')
 * @param {string} locale - Language code (en, fr, es, zh, vm). Default: 'en'
 * @param {Object} variables - Variables for interpolation (e.g., {date: '2025-12-19'})
 * @returns {string} Translated string
 *
 * @example
 * translateServerSide('privacy.errors.deletion.rate_limit', 'fr')
 * // Returns: "Trop de demandes de suppression. Veuillez réessayer plus tard."
 *
 * @example
 * translateServerSide('account.header.deletion_warning_message', 'fr', {
 *   date: '19 décembre 2025'
 * })
 * // Returns: "Votre compte est programmé pour suppression le 19 décembre 2025."
 */
export function translateServerSide(key, locale = 'en', variables = {}) {
  try {
    // Load translations for the requested locale
    const translations = loadTranslations(locale);

    // Navigate through nested keys (e.g., 'privacy.errors.deletion.rate_limit')
    const keys = key.split('.');
    let result = translations;

    for (const k of keys) {
      if (result[k] === undefined) {
        console.warn(`⚠️ [TranslationService] Translation key not found: "${key}" for locale "${locale}"`);
        // Return the key itself if translation not found (fallback behavior)
        return key;
      }
      result = result[k];
    }

    // If result is not a string, return the key
    if (typeof result !== 'string') {
      console.warn(`⚠️ [TranslationService] Translation value is not a string for key: "${key}"`);
      return key;
    }

    // Replace variables if provided (e.g., {{date}}, {{userName}})
    if (Object.keys(variables).length > 0) {
      return result.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
        return variables[variable] !== undefined ? variables[variable] : match;
      });
    }

    return result;
  } catch (error) {
    console.error('❌ [TranslationService] Translation error:', {
      key,
      locale,
      error: error.message
    });
    // Return the key itself as fallback
    return key;
  }
}

/**
 * Get user's locale from session data
 * @param {Object} user - User object from session/database
 * @returns {string} Locale code (en, fr, es, zh, vm)
 *
 * @example
 * const locale = getUserLocale(session.user);
 * // Returns: 'fr' (if user has French set as default language)
 */
export function getUserLocale(user) {
  if (!user) {
    return 'en'; // Default to English if no user
  }

  // Try to get locale from user settings
  const locale = user.settings?.defaultLanguage || user.locale || 'en';

  // Validate locale is supported
  const supportedLocales = ['en', 'fr', 'es', 'zh', 'vm'];
  if (!supportedLocales.includes(locale)) {
    console.warn(`⚠️ [TranslationService] Unsupported locale "${locale}", falling back to English`);
    return 'en';
  }

  return locale;
}

/**
 * Clear the translation cache
 * Useful for testing or if translations are updated at runtime
 */
export function clearTranslationCache() {
  translationCache.clear();
  console.log('🔄 [TranslationService] Translation cache cleared');
}

export default {
  translateServerSide,
  getUserLocale,
  clearTranslationCache
};
