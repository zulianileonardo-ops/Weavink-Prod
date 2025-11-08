// app/dashboard/(dashboard pages)/account/components/PrivacySettingsTab.jsx
'use client';

import { useState } from 'react';
import { Eye, Mail, Settings, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useAccount } from '../AccountContext';

export default function PrivacySettingsTab() {
  const { t } = useTranslation();
  const { privacySettings, updatePrivacySetting, setActiveTab } = useAccount();
  const [updating, setUpdating] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const updateSetting = async (settingKey, value) => {
    try {
      setUpdating(settingKey);
      await updatePrivacySetting(settingKey, value);
      showNotification(t('account.settings.notification.success', 'Setting updated successfully'), 'success');
    } catch (error) {
      console.error('Error updating setting:', error);
      showNotification(error.message, 'error');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('account.settings.title', 'Privacy Settings')}</h2>
        <p className="text-gray-600">
          {t('account.settings.description', 'Configure your privacy preferences and control how your data is used.')}
        </p>
      </div>

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

      {/* Profile Visibility Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">{t('account.settings.profile_visibility.title', 'Profile Visibility')}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {t('account.settings.profile_visibility.description', 'Control who can see your profile and contact information. When your profile is public, anyone can view your information. When private, only approved connections can see your details.')}
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">{t('account.settings.profile_visibility.label', 'Profile Status:')}</span>
              <span
                className={`text-sm font-semibold ${
                  privacySettings?.isPublic ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {t(`account.settings.profile_visibility.${privacySettings?.isPublic ? 'public' : 'private'}`, privacySettings?.isPublic ? 'Public' : 'Private')}
              </span>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => updateSetting('isPublic', !privacySettings?.isPublic)}
            disabled={updating === 'isPublic'}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${updating === 'isPublic' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${privacySettings?.isPublic ? 'bg-green-600' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${privacySettings?.isPublic ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Messaging Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Mail className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">{t('account.settings.allow_messages.title', 'Allow Messages')}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {t('account.settings.allow_messages.description', 'Allow other users to send you messages through the platform. You can disable this to prevent unsolicited messages while still maintaining your connections.')}
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">{t('account.settings.allow_messages.label', 'Messages:')}</span>
              <span
                className={`text-sm font-semibold ${
                  privacySettings?.allowMessages ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {t(`account.settings.allow_messages.${privacySettings?.allowMessages ? 'enabled' : 'disabled'}`, privacySettings?.allowMessages ? 'Enabled' : 'Disabled')}
              </span>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => updateSetting('allowMessages', !privacySettings?.allowMessages)}
            disabled={updating === 'allowMessages'}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
              ${updating === 'allowMessages' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${privacySettings?.allowMessages ? 'bg-purple-600' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${privacySettings?.allowMessages ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">{t('account.settings.notifications.title', 'Notification Preferences')}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          {t('account.settings.notifications.description', 'Control how you receive notifications about your account activity.')}
        </p>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{t('account.settings.notifications.email.title', 'Email Notifications')}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {t('account.settings.notifications.email.description', 'Receive important updates and notifications via email')}
              </p>
            </div>
            <button
              onClick={() =>
                updateSetting('notifications', {
                  ...privacySettings?.notifications,
                  email: !privacySettings?.notifications?.email,
                })
              }
              disabled={updating === 'notifications'}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                ${updating === 'notifications' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${privacySettings?.notifications?.email ? 'bg-orange-600' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${privacySettings?.notifications?.email ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Push Notifications */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{t('account.settings.notifications.push.title', 'Push Notifications')}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {t('account.settings.notifications.push.description', 'Receive real-time push notifications on your devices')}
              </p>
            </div>
            <button
              onClick={() =>
                updateSetting('notifications', {
                  ...privacySettings?.notifications,
                  push: !privacySettings?.notifications?.push,
                })
              }
              disabled={updating === 'notifications'}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                ${updating === 'notifications' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${privacySettings?.notifications?.push ? 'bg-orange-600' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${privacySettings?.notifications?.push ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">{t('account.settings.quick_actions.title', 'Additional Privacy Controls')}</h3>
        <div className="space-y-3">
          <p className="text-sm text-blue-800">
            • <button onClick={() => setActiveTab('consents')} className="font-medium underline hover:text-blue-900">{t('account.settings.quick_actions.consents', 'Manage detailed consent preferences in the Consents tab')}</button>
          </p>
          <p className="text-sm text-blue-800">
            • <button onClick={() => setActiveTab('export')} className="font-medium underline hover:text-blue-900">{t('account.settings.quick_actions.export', 'Export all your data in the Export Data tab')}</button>
          </p>
          <p className="text-sm text-blue-800">
            • <button onClick={() => setActiveTab('delete')} className="font-medium underline hover:text-blue-900">{t('account.settings.quick_actions.delete', 'Request account deletion in the Delete Account tab')}</button>
          </p>
        </div>
      </div>

      {/* GDPR Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">{t('account.settings.gdpr_info.title', 'Your Privacy Rights')}</h3>
        <p className="text-sm text-gray-700">
          {t('account.settings.gdpr_info.description', 'Under GDPR, you have the right to control your personal data. These settings give you granular control over your privacy preferences. All changes are logged and auditable. For more information about how we process your data, please review our')}{' '}
          <a href="/privacy-policy" className="text-blue-600 hover:text-blue-700 font-medium">{t('account.settings.gdpr_info.privacy_policy_link', 'Privacy Policy')}</a>.
        </p>
      </div>
    </div>
  );
}
