// app/dashboard/(dashboard pages)/account/components/OverviewTab.jsx
'use client';

import { Download, CheckSquare, Settings, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useAccount } from '../AccountContext';
import TutorialProgressionSection from './TutorialProgressionSection';

export default function OverviewTab() {
  const { t } = useTranslation();
  const { setActiveTab } = useAccount();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-6">
          <Download className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">{t('account.overview.export_card.title', 'Export Your Data')}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('account.overview.export_card.description', 'Download all your personal data in machine-readable formats (JSON, CSV, vCard). Compatible with all contact managers.')}
          </p>
          <button
            onClick={() => setActiveTab('export')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {t('account.overview.export_card.cta', 'Export Data →')}
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
          <CheckSquare className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">{t('account.overview.consents_card.title', 'Manage Consents')}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('account.overview.consents_card.description', 'Review and update your privacy consents. Control which features can process your data.')}
          </p>
          <button
            onClick={() => setActiveTab('consents')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {t('account.overview.consents_card.cta', 'Manage Consents →')}
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
          <Settings className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">{t('account.overview.settings_card.title', 'Privacy Settings')}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('account.overview.settings_card.description', 'Configure your privacy preferences, including profile visibility and data sharing.')}
          </p>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {t('account.overview.settings_card.cta', 'Update Settings →')}
          </button>
        </div>

        <div className="border border-red-200 rounded-lg p-6 bg-red-50">
          <Trash2 className="w-8 h-8 text-red-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">{t('account.overview.delete_card.title', 'Delete Account')}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {t('account.overview.delete_card.description', 'Permanently delete your account and all associated data. This action cannot be undone.')}
          </p>
          <button
            onClick={() => setActiveTab('delete')}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            {t('account.overview.delete_card.cta', 'Delete Account →')}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">{t('account.overview.gdpr_info.title', 'About GDPR Compliance')}</h3>
        <p className="text-sm text-blue-800">
          {t('account.overview.gdpr_info.description', 'Weavink is fully compliant with the General Data Protection Regulation (GDPR) and takes your privacy seriously. All your data is stored in EU data centers, encrypted, and protected according to the highest standards. You have full control over your personal information at all times.')}
        </p>
      </div>

      {/* Tutorial Progression Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
        <TutorialProgressionSection />
      </div>
    </div>
  );
}
