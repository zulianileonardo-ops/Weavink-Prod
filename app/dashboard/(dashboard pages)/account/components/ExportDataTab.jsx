// app/dashboard/(dashboard pages)/account/components/ExportDataTab.jsx
'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useAccount } from '../AccountContext';
import { DataExportService } from '@/lib/services/servicePrivacy/client/services/DataExportService';

export default function ExportDataTab() {
  const { t } = useTranslation();
  const { requestExport } = useAccount();
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);

      // Use context's requestExport method
      const data = await requestExport({
        includeContacts: true,
        includeAnalytics: true,
        includeConsents: true,
      });

      setExportResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const downloadFile = (filename, content) => {
    // Use DataExportService's downloadFile method
    DataExportService.downloadFile(filename, content, 'text/plain');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('account.export.title', 'Export Your Data')}</h2>
        <p className="text-gray-600">
          {t('account.export.description', 'Download all your personal data in machine-readable formats. Your export will include:')}
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✓ {t('account.export.includes.profile', 'User profile and account information (JSON)')}</li>
          <li>✓ {t('account.export.includes.contacts_json', 'All contacts (JSON, CSV, vCard formats)')}</li>
          <li>✓ {t('account.export.includes.groups', 'Contact groups and categories (JSON)')}</li>
          <li>✓ {t('account.export.includes.analytics', 'Analytics data - anonymized (JSON)')}</li>
          <li>✓ {t('account.export.includes.consents', 'Consent history (JSON)')}</li>
          <li>✓ {t('account.export.includes.settings', 'Settings and preferences (JSON)')}</li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{t('account.export.error.message', '{{error}}', { error })}</p>
        </div>
      )}

      {!exportResult ? (
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {exporting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>{t('account.export.button.exporting', 'Preparing Export...')}</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>{t('account.export.button.export', 'Export All Data')}</span>
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-green-900 font-semibold mb-2">{t('account.export.success.title', 'Export Completed!')}</h3>
            <p className="text-green-800 text-sm">
              {t('account.export.success.message', 'Your data has been exported successfully. Download the files below:')}
            </p>
          </div>

          <div className="space-y-3">
            {Object.entries(exportResult.files || {}).map(([filename, fileData]) => (
              <button
                key={filename}
                onClick={() => downloadFile(filename, fileData.content)}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <Download className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{filename}</p>
                    <p className="text-sm text-gray-600">{fileData.description}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {fileData.format}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setExportResult(null);
              setError(null);
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {t('account.export.success.back', '← Export Again')}
          </button>
        </div>
      )}
    </div>
  );
}
