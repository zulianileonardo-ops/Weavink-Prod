// app/dashboard/(dashboard pages)/account/components/ExportDataTab.jsx
'use client';

import { useState, useEffect } from 'react';
import { Download, Package, AlertCircle, Clock, Timer } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useAccount } from '../AccountContext';
import { DataExportService } from '@/lib/services/servicePrivacy/client/services/DataExportService';

export default function ExportDataTab() {
  const { t } = useTranslation();
  const { requestExport } = useAccount();
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [error, setError] = useState(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Rate limit states
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(null); // Timestamp
  const [timeRemaining, setTimeRemaining] = useState(0); // Seconds

  // Countdown timer for rate limit
  useEffect(() => {
    if (!rateLimitedUntil) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((rateLimitedUntil - now) / 1000));

      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setIsRateLimited(false);
        setRateLimitedUntil(null);
        localStorage.removeItem('weavink_export_rate_limit');  // Clear storage
        console.log('✅ Rate limit expired and cleared');
      }
    };

    updateTimer(); // Update immediately
    const interval = setInterval(updateTimer, 1000); // Update every second

    return () => clearInterval(interval);
  }, [rateLimitedUntil]);

  // Restore rate limit state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('weavink_export_rate_limit');
    if (!stored) return;

    try {
      const data = JSON.parse(stored);
      const now = Date.now();

      // Validate stored data
      if (!data.resetTime || typeof data.resetTime !== 'number') {
        localStorage.removeItem('weavink_export_rate_limit');
        return;
      }

      // Check if rate limit is still active
      if (data.resetTime > now) {
        const remainingSeconds = Math.ceil((data.resetTime - now) / 1000);
        setIsRateLimited(true);
        setRateLimitedUntil(data.resetTime);  // Use absolute timestamp
        setTimeRemaining(remainingSeconds);
        console.log(`✅ Rate limit restored: ${remainingSeconds}s remaining`);
      } else {
        // Rate limit expired while user was away
        localStorage.removeItem('weavink_export_rate_limit');
        console.log('⏱️ Expired rate limit cleared from storage');
      }
    } catch (err) {
      console.error('❌ Failed to restore rate limit:', err);
      localStorage.removeItem('weavink_export_rate_limit');
    }
  }, []); // Run only once on mount

  // Sync rate limit state across browser tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key !== 'weavink_export_rate_limit') return;

      if (e.newValue) {
        // Rate limit set in another tab
        try {
          const data = JSON.parse(e.newValue);
          const now = Date.now();

          if (data.resetTime && data.resetTime > now) {
            setIsRateLimited(true);
            setRateLimitedUntil(data.resetTime);
            setTimeRemaining(Math.ceil((data.resetTime - now) / 1000));
            console.log('🔄 Rate limit synced from another tab');
          }
        } catch (err) {
          console.error('❌ Failed to sync rate limit from storage event:', err);
        }
      } else {
        // Rate limit cleared in another tab
        setIsRateLimited(false);
        setRateLimitedUntil(null);
        setTimeRemaining(0);
        console.log('🔄 Rate limit cleared in another tab');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Helper function to format time
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) {
      return remainingSeconds > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

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

      // Clear rate limit state on success
      setIsRateLimited(false);
      setRateLimitedUntil(null);
      localStorage.removeItem('weavink_export_rate_limit');  // Clear storage
      console.log('✅ Export successful, rate limit cleared');
    } catch (err) {
      console.error('❌ [ExportDataTab] Export error:', err);

      // Log full error structure for debugging
      console.log('📋 [ExportDataTab] Error object structure:', {
        status: err.status,
        code: err.code,
        message: err.message,
        hasDetails: !!err.details,
        details: err.details,
        hasResponseData: !!(err.response?.data),
        responseData: err.response?.data,
        hasData: !!err.data,
        data: err.data
      });

      // Detect rate limit error (429 status)
      if (err.status === 429 || err.response?.status === 429) {
        const responseData = err.details || {};  // ✅ FIXED: Use err.details

        console.log('🚫 [ExportDataTab] Rate limit detected:', {
          hasResetTime: !!responseData.resetTime,
          resetTime: responseData.resetTime,
          resetTimeFormatted: responseData.resetTime ? new Date(responseData.resetTime).toISOString() : 'N/A',
          hasRetryAfter: !!responseData.retryAfter,
          retryAfter: responseData.retryAfter,
          retryAfterMinutes: responseData.retryAfter ? Math.floor(responseData.retryAfter / 60) : 'N/A',
          responseData
        });

        const resetTime = responseData.resetTime;
        const retryAfter = responseData.retryAfter || 3600;

        if (resetTime) {
          // Store in localStorage
          try {
            const dataToStore = {
              resetTime: resetTime,
              limit: responseData.limit || { max: 3, windowHours: 1 },
              timestamp: Date.now()
            };

            localStorage.setItem('weavink_export_rate_limit', JSON.stringify(dataToStore));

            console.log('💾 [ExportDataTab] Rate limit stored in localStorage:', {
              resetTime,
              resetTimeFormatted: new Date(resetTime).toISOString(),
              remainingSeconds: Math.ceil((resetTime - Date.now()) / 1000),
              remainingMinutes: Math.floor(Math.ceil((resetTime - Date.now()) / 1000) / 60),
              dataStored: dataToStore
            });
          } catch (storageError) {
            console.warn('⚠️ [ExportDataTab] Failed to store rate limit in localStorage:', storageError);
          }

          setIsRateLimited(true);
          setRateLimitedUntil(resetTime);
          setTimeRemaining(Math.ceil((resetTime - Date.now()) / 1000));

          console.log('✅ [ExportDataTab] Rate limit state set:', {
            isRateLimited: true,
            rateLimitedUntil: resetTime,
            rateLimitedUntilFormatted: new Date(resetTime).toISOString(),
            timeRemaining: Math.ceil((resetTime - Date.now()) / 1000),
            timeRemainingMinutes: Math.floor(Math.ceil((resetTime - Date.now()) / 1000) / 60)
          });
        } else {
          // Fallback if API doesn't include resetTime
          console.warn('⚠️ [ExportDataTab] No resetTime in response, using fallback calculation');
          const calculatedResetTime = Date.now() + (retryAfter * 1000);

          console.log('🔄 [ExportDataTab] Fallback calculation:', {
            retryAfter,
            retryAfterMinutes: Math.floor(retryAfter / 60),
            calculatedResetTime,
            calculatedResetTimeFormatted: new Date(calculatedResetTime).toISOString()
          });

          setIsRateLimited(true);
          setRateLimitedUntil(calculatedResetTime);
          setTimeRemaining(retryAfter);
        }

        setError(null);
      } else {
        // Other errors
        console.log('⚠️ [ExportDataTab] Non-rate-limit error:', {
          status: err.status,
          message: err.message
        });
        setError(err.message || 'Export failed');
        setIsRateLimited(false);
      }
    } finally {
      setExporting(false);
    }
  };

  const downloadFile = (filename, content) => {
    // Use DataExportService's downloadFile method
    DataExportService.downloadFile(filename, content, 'text/plain');
  };

  const handleDownloadAll = async () => {
    try {
      setDownloadingZip(true);
      setError(null);

      // Download all files as a ZIP
      await DataExportService.downloadAllAsZip(exportResult.files);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Rate Limit Warning */}
      {isRateLimited && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-yellow-900 font-semibold mb-1">
                {t('account.export.rateLimit.title', 'Rate Limit Reached')}
              </h4>
              <p className="text-yellow-800 text-sm mb-3">
                {t('account.export.rateLimit.message',
                  'You\'ve reached the maximum of 3 data exports per hour. This limit helps protect our servers and your data.'
                )}
              </p>
              <div className="flex items-center space-x-2 bg-yellow-100 rounded px-3 py-2 inline-flex">
                <Timer className="w-4 h-4 text-yellow-700" />
                <span className="text-yellow-900 font-medium text-sm">
                  {t('account.export.rateLimit.countdown', 'Available in:')} {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generic Errors */}
      {error && !isRateLimited && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {!exportResult ? (
        <button
          onClick={handleExport}
          disabled={exporting || isRateLimited}
          className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all ${
            isRateLimited || exporting
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {exporting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>{t('account.export.button.exporting', 'Preparing Export...')}</span>
            </>
          ) : isRateLimited ? (
            <>
              <Clock className="w-5 h-5" />
              <span>Wait {formatTime(timeRemaining)}</span>
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

          <div className="space-y-4">
            {/* Download All as ZIP button */}
            <button
              onClick={handleDownloadAll}
              disabled={downloadingZip}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-md hover:shadow-lg transition-all"
            >
              {downloadingZip ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('account.export.download_all.preparing', 'Preparing ZIP file...')}</span>
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  <span>{t('account.export.download_all.button', 'Download All as ZIP')}</span>
                </>
              )}
            </button>

            {/* Individual file downloads */}
            <div className="space-y-3">
              <p className="text-sm text-gray-600 font-medium">
                {t('account.export.individual_files', 'Or download files individually:')}
              </p>
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
