// lib/languageContext.js
"use client"
import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import Cookies from 'js-cookie';

const LanguageContext = createContext();

export const LanguageProvider = ({ children, initialLanguage = null }) => {
  const [locale, setLocale] = useState('en');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize language with priority: Database -> Cookie -> Browser -> Default
  useEffect(() => {
    // Only run once on first render
    const savedLanguage = Cookies.get('language');

    // Priority order:
    // 1. Database default language (from props)
    // 2. Cookie (session preference)
    // 3. Browser language
    // 4. Default 'en'

    if (initialLanguage && ['en', 'fr', 'es', 'vm', 'zh'].includes(initialLanguage)) {
      setLocale(initialLanguage);
      // Sync cookie with database preference if different
      if (savedLanguage !== initialLanguage) {
        Cookies.set('language', initialLanguage, { expires: 365 });
      }
    } else if (savedLanguage) {
      setLocale(savedLanguage);
    } else {
      // If no saved language, detect browser language
      if (typeof window !== 'undefined') {
          const browserLang = navigator.language?.split('-')[0]; // 'zh-CN' -> 'zh'
          if (browserLang && ['en', 'fr', 'es', 'vm', 'zh'].includes(browserLang)) {
            setLocale(browserLang);
          }
      }
    }
    setIsInitialized(true);
  }, [initialLanguage]); // Run when initialLanguage changes

  // Memoize the changeLanguage function to prevent unnecessary re-renders
  const changeLanguage = useCallback((newLocale) => {
    if (newLocale === locale) return;
    
    setLocale(newLocale);
    Cookies.set('language', newLocale, { expires: 365 }); // Save in cookie for a year
  }, [locale]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    locale,
    changeLanguage,
    isInitialized
  }), [locale, changeLanguage, isInitialized]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Provide a default context if used outside provider to prevent null errors
    return { locale: 'en', changeLanguage: () => {}, isInitialized: true };
  }
  return context;
};