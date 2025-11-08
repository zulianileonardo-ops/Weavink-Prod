'use client';

/**
 * Account & Privacy Center
 * Comprehensive GDPR compliance dashboard for users
 * Includes:
 * - Data Export (Right to Portability)
 * - Account Deletion (Right to be Forgotten)
 * - Consent Management
 * - Privacy Settings
 *
 * Refactored with AccountContext for:
 * - Three-layer caching architecture
 * - Centralized state management
 * - Component extraction for better maintainability
 */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shield, Download, Trash2, CheckSquare, Settings, Info, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';
import { AccountProvider, useAccount } from './AccountContext';

// Import tab components
import OverviewTab from './components/OverviewTab';
import ExportDataTab from './components/ExportDataTab';
import DeleteAccountTab from './components/DeleteAccountTab';
import ConsentsTab from './components/ConsentsTab';
import PrivacySettingsTab from './components/PrivacySettingsTab';

// Wrapper component that provides context
export default function AccountPageWrapper() {
  return (
    <AccountProvider>
      <AccountPage />
    </AccountProvider>
  );
}

// Main component that consumes context
function AccountPage() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const {
    activeTab,
    setActiveTab,
    pendingDeletion,
    isLoading,
  } = useAccount();

  // Read URL parameters for deep-linking
  const tabParam = searchParams.get('tab');

  // Handle URL parameter changes for deep-linking
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab, setActiveTab]);

  const tabs = [
    { id: 'overview', label: t('account.tabs.overview', 'Overview'), icon: Info },
    { id: 'export', label: t('account.tabs.export', 'Export Data'), icon: Download },
    { id: 'delete', label: t('account.tabs.delete', 'Delete Account'), icon: Trash2 },
    { id: 'consents', label: t('account.tabs.consents', 'Consents'), icon: CheckSquare },
    { id: 'settings', label: t('account.tabs.settings', 'Privacy Settings'), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('account.header.title', 'Account & Privacy')}</h1>
              <p className="text-gray-600 mt-1">
                {t('account.header.subtitle', 'Manage your personal data and privacy preferences')}
              </p>
            </div>
          </div>

          {/* Pending Deletion Warning */}
          {pendingDeletion && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-900 font-semibold">{t('account.header.deletion_warning_title', 'Account Deletion Pending')}</h3>
                <p className="text-red-700 text-sm mt-1">
                  {t('account.header.deletion_warning_message', 'Your account is scheduled for deletion on {{date}}. You can cancel this at any time before that date.', {
                    date: new Date(pendingDeletion.scheduledDeletionDate).toLocaleDateString()
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    data-tab={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                      ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 mt-4">{t('account.loading.privacy_data', 'Loading privacy data...')}</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'export' && <ExportDataTab />}
                {activeTab === 'delete' && <DeleteAccountTab />}
                {activeTab === 'consents' && <ConsentsTab />}
                {activeTab === 'settings' && <PrivacySettingsTab />}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">{t('account.footer.title', 'Your Rights Under GDPR')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-900">{t('account.footer.rights.access.title', '✓ Right to Access')}</span>
              <p className="text-gray-600">{t('account.footer.rights.access.description', 'View and download all your personal data')}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">{t('account.footer.rights.rectification.title', '✓ Right to Rectification')}</span>
              <p className="text-gray-600">{t('account.footer.rights.rectification.description', 'Correct or update your information')}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">{t('account.footer.rights.erasure.title', '✓ Right to Erasure')}</span>
              <p className="text-gray-600">{t('account.footer.rights.erasure.description', 'Delete your account and all data')}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">{t('account.footer.rights.portability.title', '✓ Right to Portability')}</span>
              <p className="text-gray-600">{t('account.footer.rights.portability.description', 'Export data in standard formats')}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">{t('account.footer.rights.object.title', '✓ Right to Object')}</span>
              <p className="text-gray-600">{t('account.footer.rights.object.description', 'Opt-out of specific data processing')}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">{t('account.footer.rights.restriction.title', '✓ Right to Restriction')}</span>
              <p className="text-gray-600">{t('account.footer.rights.restriction.description', 'Limit how your data is processed')}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {t('account.footer.dpo.question', 'Questions about your privacy?')}{' '}
              <a href="/contact-dpo" className="text-blue-600 hover:text-blue-700 font-medium">
                {t('account.footer.dpo.link', 'Contact our Data Protection Officer')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
