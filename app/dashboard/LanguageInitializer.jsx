// app/dashboard/LanguageInitializer.jsx
'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/translation/languageContext';
import { SettingsService } from '@/lib/services/serviceSetting/client/settingsService';

/**
 * LanguageInitializer Component
 *
 * Fetches the user's default language preference from the database
 * and initializes the language context for authenticated users.
 *
 * This component:
 * 1. Runs once when the dashboard loads
 * 2. Fetches the user's defaultLanguage from settings
 * 3. Applies it to the language context if different from current
 * 4. Does NOT override manual language changes via navbar
 */
export default function LanguageInitializer() {
  const { currentUser } = useAuth();
  const { locale, changeLanguage, isInitialized } = useLanguage();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only run once when component mounts and language context is initialized
    if (!currentUser || !isInitialized || hasInitialized.current) {
      return;
    }

    const initializeLanguage = async () => {
      try {
        console.log('🌐 [LanguageInitializer] Fetching user language preference...');

        const settings = await SettingsService.getSettingsData();
        const defaultLanguage = settings.defaultLanguage;

        if (defaultLanguage && defaultLanguage !== locale) {
          console.log(`🌐 [LanguageInitializer] Applying database language: ${defaultLanguage}`);
          changeLanguage(defaultLanguage);
        } else {
          console.log('🌐 [LanguageInitializer] Language already set correctly');
        }

        hasInitialized.current = true;
      } catch (error) {
        console.error('❌ [LanguageInitializer] Error fetching language preference:', error);
        // Fail silently - language will default to cookie/browser preference
      }
    };

    initializeLanguage();
  }, [currentUser, isInitialized, locale, changeLanguage]);

  // This component doesn't render anything
  return null;
}
