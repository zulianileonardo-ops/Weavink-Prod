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
import { Shield, Download, Trash2, CheckSquare, Settings, AlertCircle, Info, Search, Target, CreditCard, BarChart, Mail, Users, Cookie, Eye, CheckCircle, XCircle, ChevronDown } from 'lucide-react';

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
                {activeTab === 'settings' && <PrivacySettingsTab setActiveTab={setActiveTab} />}
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

// Consents Tab - Full Implementation
function ConsentsTab({ consents, onUpdate }) {
  const [updating, setUpdating] = useState(null);
  const [notification, setNotification] = useState(null);
  // Start with all categories collapsed by default
  const [collapsedCategories, setCollapsedCategories] = useState(
    new Set(['essential', 'ai_features', 'analytics', 'communication', 'personalization'])
  );

  const getAuthToken = async () => {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleCategory = (categoryId) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleConsentToggle = async (consentType, currentStatus) => {
    try {
      setUpdating(consentType);
      const newStatus = !currentStatus;
      const action = newStatus ? 'granted' : 'withdrawn';

      const token = await getAuthToken();
      const response = await fetch('/api/user/privacy/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          consentType,
          action,
          version: '1.0',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update consent');
      }

      // Refresh consents
      await onUpdate();
      showNotification(`Consent ${action === 'granted' ? 'granted' : 'withdrawn'} successfully`, 'success');
    } catch (error) {
      console.error('Error updating consent:', error);
      showNotification(error.message, 'error');
    } finally {
      setUpdating(null);
    }
  };

  const consentCategories = [
    {
      id: 'essential',
      name: 'Essential',
      description: 'Required for the application to function properly',
      consents: [
        {
          type: 'terms_of_service',
          name: 'Terms of Service',
          description: 'Acceptance of our terms and conditions',
          icon: CheckSquare,
          required: true,
          gdprArticle: 'Art. 6(1)(b) - Contract performance',
        },
        {
          type: 'privacy_policy',
          name: 'Privacy Policy',
          description: 'Acceptance of our privacy practices',
          icon: Shield,
          required: true,
          gdprArticle: 'Art. 6(1)(b) - Contract performance',
        },
      ],
    },
    {
      id: 'ai_features',
      name: 'AI Features',
      description: 'Artificial intelligence powered enhancements',
      consents: [
        {
          type: 'ai_business_card_enhancement',
          name: 'AI Business Card Enhancement',
          description: 'Use AI (Google Gemini 2.0) to extract information from business card images with high accuracy',
          icon: CreditCard,
          required: false,
          tierRequired: 'Premium+',
          gdprArticle: 'Art. 6(1)(a) - Consent',
          technologies: ['Google Cloud Vision API', 'Gemini 2.0 Flash Lite'],
        },
        {
          type: 'ai_semantic_search',
          name: 'AI Semantic Search',
          description: 'Enable AI-powered search with query enhancement, embeddings, reranking, and intelligent result analysis',
          icon: Search,
          required: false,
          tierRequired: 'Business+',
          gdprArticle: 'Art. 6(1)(a) - Consent',
          technologies: ['Gemini 2.5 Flash', 'Pinecone Inference (multilingual-e5-large)', 'Cohere Rerank v3.5'],
        },
        {
          type: 'ai_auto_grouping',
          name: 'AI Auto-Grouping',
          description: 'Automatically group contacts using intelligent algorithms, venue enrichment, and event detection',
          icon: Target,
          required: false,
          tierRequired: 'Premium+',
          gdprArticle: 'Art. 6(1)(a) - Consent',
          technologies: ['Google Places API', 'Clustering Algorithms'],
        },
      ],
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'Usage analytics and performance tracking',
      consents: [
        {
          type: 'analytics_basic',
          name: 'Basic Analytics',
          description: 'Basic usage statistics (page views, feature usage) - anonymized data only',
          icon: BarChart,
          required: false,
          gdprArticle: 'Art. 6(1)(f) - Legitimate interest',
        },
        {
          type: 'analytics_detailed',
          name: 'Detailed Analytics',
          description: 'Detailed usage patterns and behavior analysis for improving user experience',
          icon: BarChart,
          required: false,
          gdprArticle: 'Art. 6(1)(a) - Consent',
        },
        {
          type: 'cookies_analytics',
          name: 'Analytics Cookies',
          description: 'Cookies used to track usage patterns and improve the application',
          icon: Cookie,
          required: false,
          gdprArticle: 'Art. 6(1)(a) - Consent',
        },
      ],
    },
    {
      id: 'communication',
      name: 'Communication',
      description: 'Email communications and recommendations',
      consents: [
        {
          type: 'marketing_emails',
          name: 'Marketing Emails',
          description: 'Receive newsletters, product updates, and promotional offers',
          icon: Mail,
          required: false,
          gdprArticle: 'Art. 6(1)(a) - Consent',
        },
        {
          type: 'contact_recommendations',
          name: 'Contact Recommendations',
          description: 'Receive suggestions for potential connections based on your network',
          icon: Users,
          required: false,
          gdprArticle: 'Art. 6(1)(a) - Consent',
        },
      ],
    },
    {
      id: 'personalization',
      name: 'Personalization',
      description: 'Personalized experience and profile settings',
      consents: [
        {
          type: 'cookies_personalization',
          name: 'Personalization Cookies',
          description: 'Remember your preferences and customize your experience',
          icon: Cookie,
          required: false,
          gdprArticle: 'Art. 6(1)(a) - Consent',
        },
        {
          type: 'profile_public',
          name: 'Public Profile',
          description: 'Make your profile visible to other users on the platform',
          icon: Eye,
          required: false,
          gdprArticle: 'Art. 6(1)(a) - Consent',
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage Consents</h2>
        <p className="text-gray-600">
          Control which features can process your data. You can withdraw consent at any time.
          Changes take effect immediately.
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

      {/* Consent Categories */}
      {!consents ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading consent data...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {consentCategories.map((category) => {
            const isCollapsed = collapsedCategories.has(category.id);

            return (
              <div key={category.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Category Header - Clickable */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full bg-gray-50 border-b border-gray-200 px-6 py-4 hover:bg-gray-100 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-600 transition-transform duration-200 flex-shrink-0 ml-4 ${
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      }`}
                    />
                  </div>
                </button>

                {/* Consent Items - Collapsible */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-200">
                {category.consents.map((consent) => {
                  const consentData = consents[consent.type] || { status: false, lastUpdated: null };
                  const isGranted = consentData.status === true;
                  const isUpdating = updating === consent.type;
                  const Icon = consent.icon;

                  return (
                    <div key={consent.type} className="p-6 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        {/* Left: Icon + Details */}
                        <div className="flex items-start space-x-4 flex-1">
                          <div
                            className={`p-3 rounded-lg ${
                              isGranted ? 'bg-green-100' : 'bg-gray-100'
                            }`}
                          >
                            <Icon
                              className={`w-6 h-6 ${
                                isGranted ? 'text-green-600' : 'text-gray-400'
                              }`}
                            />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-gray-900">{consent.name}</h4>
                              {consent.required && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                  Required
                                </span>
                              )}
                              {consent.tierRequired && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                                  {consent.tierRequired}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{consent.description}</p>

                            {/* Technologies Used */}
                            {consent.technologies && (
                              <div className="flex items-center flex-wrap gap-2 mt-2">
                                <span className="text-xs text-gray-500">Technologies:</span>
                                {consent.technologies.map((tech) => (
                                  <span
                                    key={tech}
                                    className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded"
                                  >
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* GDPR Article */}
                            <p className="text-xs text-gray-500 mt-2">{consent.gdprArticle}</p>

                            {/* Last Updated */}
                            {consentData.lastUpdated && (
                              <p className="text-xs text-gray-500 mt-1">
                                Last updated:{' '}
                                {new Date(consentData.lastUpdated._seconds * 1000).toLocaleDateString(
                                  'en-US',
                                  {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Toggle */}
                        <div className="ml-4 flex items-center space-x-3">
                          {/* Status Badge */}
                          <span
                            className={`text-sm font-medium ${
                              isGranted ? 'text-green-600' : 'text-gray-500'
                            }`}
                          >
                            {isGranted ? 'Granted' : 'Withdrawn'}
                          </span>

                          {/* Toggle Switch */}
                          <button
                            onClick={() => handleConsentToggle(consent.type, isGranted)}
                            disabled={consent.required || isUpdating}
                            className={`
                              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                              ${consent.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                              ${isGranted ? 'bg-green-600' : 'bg-gray-300'}
                            `}
                          >
                            <span
                              className={`
                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                ${isGranted ? 'translate-x-6' : 'translate-x-1'}
                              `}
                            />
                          </button>

                          {/* Loading Spinner */}
                          {isUpdating && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">About Your Consent Rights</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                • You can withdraw your consent at any time by toggling the switches above.
              </p>
              <p>
                • Withdrawing consent will not affect the lawfulness of processing based on consent
                before withdrawal (GDPR Art. 7.3).
              </p>
              <p>
                • Essential consents are required for the service to function and cannot be withdrawn
                without deleting your account.
              </p>
              <p>
                • Some features require specific subscription tiers and may be unavailable if consent
                is withdrawn.
              </p>
              <p>
                • All consent changes are logged and can be audited. Contact our Data Protection
                Officer if you have questions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Privacy Settings Tab - Full Implementation
function PrivacySettingsTab({ setActiveTab }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const getAuthToken = async () => {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const response = await fetch('/api/user/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      showNotification('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const updateSetting = async (settingKey, value) => {
    try {
      setUpdating(settingKey);
      const token = await getAuthToken();

      // Build update payload based on setting key
      let updatePayload = {};
      if (settingKey === 'isPublic' || settingKey === 'allowMessages') {
        updatePayload = {
          action: 'updatePrivacy',
          data: { [settingKey]: value },
        };
      } else if (settingKey === 'notifications') {
        updatePayload = {
          action: 'updateNotifications',
          data: { notifications: value },
        };
      }

      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error('Failed to update setting');
      }

      // Update local state
      setSettings((prev) => {
        if (settingKey === 'notifications') {
          return { ...prev, notifications: value };
        }
        return { ...prev, [settingKey]: value };
      });

      showNotification('Setting updated successfully', 'success');
    } catch (error) {
      console.error('Error updating setting:', error);
      showNotification(error.message, 'error');
      // Revert the change by reloading
      await loadSettings();
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Loading privacy settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy Settings</h2>
        <p className="text-gray-600">
          Configure your privacy preferences and control how your data is used.
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
              <h3 className="text-lg font-semibold text-gray-900">Profile Visibility</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Control who can see your profile and contact information. When your profile is
              public, anyone can view your information. When private, only approved connections
              can see your details.
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Profile Status:</span>
              <span
                className={`text-sm font-semibold ${
                  settings?.isPublic ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {settings?.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => updateSetting('isPublic', !settings?.isPublic)}
            disabled={updating === 'isPublic'}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${updating === 'isPublic' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${settings?.isPublic ? 'bg-green-600' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${settings?.isPublic ? 'translate-x-6' : 'translate-x-1'}
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
              <h3 className="text-lg font-semibold text-gray-900">Allow Messages</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Allow other users to send you messages through the platform. You can disable this to
              prevent unsolicited messages while still maintaining your connections.
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Messages:</span>
              <span
                className={`text-sm font-semibold ${
                  settings?.allowMessages ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {settings?.allowMessages ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => updateSetting('allowMessages', !settings?.allowMessages)}
            disabled={updating === 'allowMessages'}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
              ${updating === 'allowMessages' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${settings?.allowMessages ? 'bg-purple-600' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${settings?.allowMessages ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Control how you receive notifications about your account activity.
        </p>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Email Notifications</h4>
              <p className="text-sm text-gray-600 mt-1">
                Receive important updates and notifications via email
              </p>
            </div>
            <button
              onClick={() =>
                updateSetting('notifications', {
                  ...settings?.notifications,
                  email: !settings?.notifications?.email,
                })
              }
              disabled={updating === 'notifications'}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                ${updating === 'notifications' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${settings?.notifications?.email ? 'bg-orange-600' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings?.notifications?.email ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Push Notifications */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Push Notifications</h4>
              <p className="text-sm text-gray-600 mt-1">
                Receive real-time push notifications on your devices
              </p>
            </div>
            <button
              onClick={() =>
                updateSetting('notifications', {
                  ...settings?.notifications,
                  push: !settings?.notifications?.push,
                })
              }
              disabled={updating === 'notifications'}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                ${updating === 'notifications' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${settings?.notifications?.push ? 'bg-orange-600' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings?.notifications?.push ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Additional Privacy Controls</h3>
        <div className="space-y-3">
          <p className="text-sm text-blue-800">
            • Manage detailed consent preferences in the{' '}
            <button
              onClick={() => setActiveTab('consents')}
              className="font-medium underline hover:text-blue-900"
            >
              Consents
            </button>{' '}
            tab
          </p>
          <p className="text-sm text-blue-800">
            • Export all your data in the{' '}
            <button
              onClick={() => setActiveTab('export')}
              className="font-medium underline hover:text-blue-900"
            >
              Export Data
            </button>{' '}
            tab
          </p>
          <p className="text-sm text-blue-800">
            • Request account deletion in the{' '}
            <button
              onClick={() => setActiveTab('delete')}
              className="font-medium underline hover:text-blue-900"
            >
              Delete Account
            </button>{' '}
            tab
          </p>
        </div>
      </div>

      {/* GDPR Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Your Privacy Rights</h3>
        <p className="text-sm text-gray-700">
          Under GDPR, you have the right to control your personal data. These settings give you
          granular control over your privacy preferences. All changes are logged and auditable. For
          more information about how we process your data, please review our{' '}
          <a href="/privacy-policy" className="text-blue-600 hover:text-blue-700 font-medium">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
