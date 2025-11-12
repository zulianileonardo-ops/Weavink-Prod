// app/dashboard/(dashboard pages)/account/components/WebsiteConfigTab.jsx
'use client';

import { useState } from 'react';
import { Globe, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useAccount } from '../AccountContext';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'vm', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

export default function WebsiteConfigTab() {
  const { t } = useTranslation();
  const { privacySettings, updateLanguagePreference } = useAccount();
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLanguageChange = async (languageCode) => {
    try {
      setUpdating(true);
      await updateLanguagePreference(languageCode);
      showNotification(t('account.website_config.language.notification.success', 'Default language updated successfully'), 'success');
    } catch (error) {
      console.error('Error updating language:', error);
      showNotification(error.message || t('account.website_config.language.notification.error', 'Failed to update language'), 'error');
    } finally {
      setUpdating(false);
    }
  };

  const currentLanguage = LANGUAGES.find(lang => lang.code === privacySettings?.defaultLanguage) || LANGUAGES[0];

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-lg border ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Default Language Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Globe className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('account.website_config.language.title', 'Default Language')}
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          {t(
            'account.website_config.language.description',
            'Set your preferred default language for the website. This will be applied automatically when you log in. You can still change the language temporarily using the language switcher in the navigation bar.'
          )}
        </p>

        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">
              {t('account.website_config.language.current_label', 'Current Default:')}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{currentLanguage.flag}</span>
              <span className="text-sm font-semibold text-gray-900">{currentLanguage.name}</span>
            </div>
          </div>

          {/* Language Selector */}
          <div>
            <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-2">
              {t('account.website_config.language.select_label', 'Select Default Language')}
            </label>
            <div className="relative">
              <select
                id="language-select"
                value={privacySettings?.defaultLanguage || 'en'}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={updating}
                className={`
                  w-full max-w-md px-4 py-3 pr-10 text-sm border border-gray-300 rounded-lg
                  bg-white text-gray-900 font-medium
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
                  appearance-none
                `}
              >
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.flag} {language.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {updating && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>{t('account.website_config.language.updating', 'Updating language...')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">
          {t('account.website_config.info.title', 'How Language Settings Work')}
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>
            • {t('account.website_config.info.default', 'Your default language is saved and applied automatically when you log in')}
          </p>
          <p>
            • {t('account.website_config.info.navbar', 'You can temporarily change the language using the language switcher in the navigation bar')}
          </p>
          <p>
            • {t('account.website_config.info.session', 'Temporary language changes only affect your current session')}
          </p>
          <p>
            • {t('account.website_config.info.persistent', 'To make a language change permanent, update your default language here')}
          </p>
        </div>
      </div>
    </div>
  );
}
