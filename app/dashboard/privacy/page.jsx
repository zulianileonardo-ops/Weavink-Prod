'use client';

/**
 * Privacy Center
 * Comprehensive GDPR compliance dashboard for users
 * Includes:
 * - Data Export (Right to Portability)
 * - Account Deletion (Right to be Forgotten)
 * - Consent Management
 * - Privacy Settings
 */

import { useState, useEffect } from 'react';
import { Shield, Download, Trash2, CheckSquare, Settings, AlertCircle, Info } from 'lucide-react';

export default function PrivacyCenterPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingDeletion, setPendingDeletion] = useState(null);
  const [consents, setConsents] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrivacyData();
  }, []);

  const loadPrivacyData = async () => {
    try {
      setLoading(true);

      // Load deletion status
      const deletionRes = await fetch('/api/user/privacy/delete-account', {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });
      const deletionData = await deletionRes.json();
      if (deletionData.hasPendingDeletion) {
        setPendingDeletion(deletionData.deletionRequest);
      }

      // Load consents
      const consentsRes = await fetch('/api/user/privacy/consent', {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });
      const consentsData = await consentsRes.json();
      setConsents(consentsData.consents);

      setLoading(false);
    } catch (error) {
      console.error('Error loading privacy data:', error);
      setLoading(false);
    }
  };

  const getAuthToken = async () => {
    // Get Firebase auth token
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'export', label: 'Export Data', icon: Download },
    { id: 'delete', label: 'Delete Account', icon: Trash2 },
    { id: 'consents', label: 'Consents', icon: CheckSquare },
    { id: 'settings', label: 'Privacy Settings', icon: Settings },
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
              <h1 className="text-3xl font-bold text-gray-900">Privacy Center</h1>
              <p className="text-gray-600 mt-1">
                Manage your personal data and privacy preferences
              </p>
            </div>
          </div>

          {/* Pending Deletion Warning */}
          {pendingDeletion && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-900 font-semibold">Account Deletion Pending</h3>
                <p className="text-red-700 text-sm mt-1">
                  Your account is scheduled for deletion on{' '}
                  {new Date(pendingDeletion.scheduledDeletionDate).toLocaleDateString()}.
                  You can cancel this at any time before that date.
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
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 mt-4">Loading privacy data...</p>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'export' && <ExportDataTab />}
                {activeTab === 'delete' && (
                  <DeleteAccountTab
                    pendingDeletion={pendingDeletion}
                    onUpdate={loadPrivacyData}
                  />
                )}
                {activeTab === 'consents' && <ConsentsTab consents={consents} onUpdate={loadPrivacyData} />}
                {activeTab === 'settings' && <PrivacySettingsTab />}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Your Rights Under GDPR</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-900">✓ Right to Access</span>
              <p className="text-gray-600">View and download all your personal data</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">✓ Right to Rectification</span>
              <p className="text-gray-600">Correct or update your information</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">✓ Right to Erasure</span>
              <p className="text-gray-600">Delete your account and all data</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">✓ Right to Portability</span>
              <p className="text-gray-600">Export data in standard formats</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">✓ Right to Object</span>
              <p className="text-gray-600">Opt-out of specific data processing</p>
            </div>
            <div>
              <span className="font-medium text-gray-900">✓ Right to Restriction</span>
              <p className="text-gray-600">Limit how your data is processed</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Questions about your privacy?{' '}
              <a href="/contact-dpo" className="text-blue-600 hover:text-blue-700 font-medium">
                Contact our Data Protection Officer
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy Overview</h2>
        <p className="text-gray-600">
          Welcome to your Privacy Center. Here you can manage all aspects of your personal data,
          exercise your rights under GDPR, and control how your information is used.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-lg p-6">
          <Download className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Export Your Data</h3>
          <p className="text-sm text-gray-600 mb-4">
            Download all your personal data in machine-readable formats (JSON, CSV, vCard).
            Compatible with all contact managers.
          </p>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('[data-tab="export"]')?.click();
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Export Data →
          </a>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
          <CheckSquare className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Manage Consents</h3>
          <p className="text-sm text-gray-600 mb-4">
            Review and update your privacy consents. Control which features can process your data.
          </p>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('[data-tab="consents"]')?.click();
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Manage Consents →
          </a>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
          <Settings className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Privacy Settings</h3>
          <p className="text-sm text-gray-600 mb-4">
            Configure your privacy preferences, including profile visibility and data sharing.
          </p>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('[data-tab="settings"]')?.click();
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Update Settings →
          </a>
        </div>

        <div className="border border-red-200 rounded-lg p-6 bg-red-50">
          <Trash2 className="w-8 h-8 text-red-600 mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">Delete Account</h3>
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('[data-tab="delete"]')?.click();
            }}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Delete Account →
          </a>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">About GDPR Compliance</h3>
        <p className="text-sm text-blue-800">
          Weavink is fully compliant with the General Data Protection Regulation (GDPR) and takes
          your privacy seriously. All your data is stored in EU data centers, encrypted, and
          protected according to the highest standards. You have full control over your personal
          information at all times.
        </p>
      </div>
    </div>
  );
}

// Export Data Tab Component (placeholder - will be detailed component)
function ExportDataTab() {
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [error, setError] = useState(null);

  const getAuthToken = async () => {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);

      const token = await getAuthToken();
      const response = await fetch('/api/user/privacy/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          includeContacts: true,
          includeAnalytics: true,
          includeConsents: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Export failed');
      }

      setExportResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const downloadFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Your Data</h2>
        <p className="text-gray-600">
          Download all your personal data in machine-readable formats. Your export will include:
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✓ User profile and account information (JSON)</li>
          <li>✓ All contacts (JSON, CSV, vCard formats)</li>
          <li>✓ Contact groups and categories (JSON)</li>
          <li>✓ Analytics data - anonymized (JSON)</li>
          <li>✓ Consent history (JSON)</li>
          <li>✓ Settings and preferences (JSON)</li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
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
              <span>Preparing Export...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Export All Data</span>
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-green-900 font-semibold mb-2">Export Completed!</h3>
            <p className="text-green-800 text-sm">
              Your data has been exported successfully. Download the files below:
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
            ← Export Again
          </button>
        </div>
      )}
    </div>
  );
}

// Delete Account Tab Component (placeholder)
function DeleteAccountTab({ pendingDeletion, onUpdate }) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const getAuthToken = async () => {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);

      const token = await getAuthToken();
      const response = await fetch('/api/user/privacy/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          confirmation: confirmationText,
          reason: 'User requested',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Deletion failed');
      }

      // Refresh data
      await onUpdate();
      setShowConfirmation(false);
      setConfirmationText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/user/privacy/delete-account', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel deletion');
      }

      await onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  if (pendingDeletion) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-red-900 mb-4">Account Deletion Pending</h2>
          <p className="text-red-800 mb-4">
            Your account is scheduled for permanent deletion on{' '}
            <strong>{new Date(pendingDeletion.scheduledDeletionDate).toLocaleDateString()}</strong>.
          </p>
          <p className="text-red-800 mb-6">
            All your data, including contacts, groups, and settings, will be permanently deleted.
            This action cannot be undone after the deletion date.
          </p>

          <button
            onClick={handleCancelDeletion}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Cancel Deletion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Your Account</h2>
        <p className="text-gray-600">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-yellow-900 font-semibold mb-3">Before you delete:</h3>
        <ul className="space-y-2 text-sm text-yellow-800">
          <li>✓ Consider exporting your data first (you won&apos;t be able to access it after deletion)</li>
          <li>✓ This will delete all your contacts, groups, and settings</li>
          <li>✓ Users who have you as a contact will be notified</li>
          <li>✓ You have 30 days to cancel the deletion before it&apos;s final</li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {!showConfirmation ? (
        <button
          onClick={() => setShowConfirmation(true)}
          className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
        >
          Delete My Account
        </button>
      ) : (
        <div className="bg-white border-2 border-red-300 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Confirm Account Deletion</h3>
          <p className="text-sm text-gray-600">
            Type <strong>DELETE MY ACCOUNT</strong> to confirm:
          </p>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="DELETE MY ACCOUNT"
          />
          <div className="flex space-x-3">
            <button
              onClick={handleDelete}
              disabled={confirmationText !== 'DELETE MY ACCOUNT' || deleting}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Confirm Deletion'}
            </button>
            <button
              onClick={() => {
                setShowConfirmation(false);
                setConfirmationText('');
                setError(null);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Consents Tab (placeholder)
function ConsentsTab({ consents, onUpdate }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage Consents</h2>
        <p className="text-gray-600">
          Control which features can process your data. You can withdraw consent at any time.
        </p>
      </div>
      {/* Detailed consents management will be implemented */}
      <div className="text-gray-600">Consents management coming soon...</div>
    </div>
  );
}

// Privacy Settings Tab (placeholder)
function PrivacySettingsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy Settings</h2>
        <p className="text-gray-600">Configure your privacy preferences.</p>
      </div>
      {/* Settings will be implemented */}
      <div className="text-gray-600">Privacy settings coming soon...</div>
    </div>
  );
}
