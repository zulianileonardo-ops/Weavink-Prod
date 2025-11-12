// app/dashboard/(dashboard pages)/account/components/ConsentsTab.jsx
'use client';

import { useState, useEffect } from 'react';
import { Search, Target, CreditCard, BarChart, Mail, Users, Cookie, Eye, CheckCircle, XCircle, ChevronDown, CheckSquare, Shield } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useAccount } from '../AccountContext';
import { useSearchParams } from 'next/navigation';

export default function ConsentsTab() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const expandParam = searchParams.get('expand');
  const { consents, grantConsent, withdrawConsent, refreshData, showNotification } = useAccount();
  const [updating, setUpdating] = useState(null);
  const [notification, setNotification] = useState(null);

  // Start with all categories collapsed by default, but expand categories specified in URL
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    const initial = new Set(['essential', 'ai_features', 'analytics', 'communication', 'personalization']);

    // If expandParam exists, remove those categories from the collapsed set
    if (expandParam) {
      expandParam.split(',').forEach(category => initial.delete(category.trim()));
    }

    return initial;
  });

  // Handle expandParam changes for deep-linking
  useEffect(() => {
    if (expandParam) {
      setCollapsedCategories(prev => {
        const updated = new Set(prev);
        expandParam.split(',').forEach(category => updated.delete(category.trim()));
        return updated;
      });
    }
  }, [expandParam]);

  const showLocalNotification = (message, type = 'success') => {
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

      // Use context methods to grant or withdraw consent
      if (action === 'granted') {
        await grantConsent(consentType, { version: '1.0' });
      } else {
        await withdrawConsent(consentType, {});
      }

      // Refresh consents
      await refreshData();
      showLocalNotification(t(`account.consents.notification.${action}`, `Consent ${action} successfully`), 'success');
    } catch (error) {
      console.error('Error updating consent:', error);
      showLocalNotification(error.message, 'error');
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
          <p className="text-gray-600 mt-4">{t('account.loading.consent_data', 'Loading consent data...')}</p>
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
                      <h3 className="text-lg font-semibold text-gray-900">{t(`account.consents.category.${category.id}.name`, category.name)}</h3>
                      <p className="text-sm text-gray-600 mt-1">{t(`account.consents.category.${category.id}.description`, category.description)}</p>
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
                              <h4 className="font-semibold text-gray-900">{t(`account.consents.type.${consent.type}.name`, consent.name)}</h4>
                              {consent.required && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                  {t('account.consents.badge.required', 'Required')}
                                </span>
                              )}
                              {consent.tierRequired && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                                  {t(`account.consents.type.${consent.type}.tier`, consent.tierRequired)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{t(`account.consents.type.${consent.type}.description`, consent.description)}</p>

                            {/* Technologies Used */}
                            {consent.technologies && (
                              <div className="flex items-center flex-wrap gap-2 mt-2">
                                <span className="text-xs text-gray-500">{t('account.consents.technologies_label', 'Technologies:')}</span>
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
                            <p className="text-xs text-gray-500 mt-2">{t(`account.consents.type.${consent.type}.gdpr`, consent.gdprArticle)}</p>

                            {/* Last Updated */}
                            {consentData.lastUpdated && (
                              <p className="text-xs text-gray-500 mt-1">
                                {t('account.consents.last_updated', 'Last updated: {{date}}', {
                                  date: new Date(consentData.lastUpdated._seconds * 1000).toLocaleDateString()
                                })}
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
                            {t(`account.consents.status.${isGranted ? 'granted' : 'withdrawn'}`, isGranted ? 'Granted' : 'Withdrawn')}
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
            <h3 className="font-semibold text-blue-900 mb-2">{t('account.consents.info.title', 'About Your Consent Rights')}</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                • {t('account.consents.info.withdraw', 'You can withdraw your consent at any time by toggling the switches above.')}
              </p>
              <p>
                • {t('account.consents.info.lawfulness', 'Withdrawing consent will not affect the lawfulness of processing based on consent before withdrawal (GDPR Art. 7.3).')}
              </p>
              <p>
                • {t('account.consents.info.essential', 'Essential consents are required for the service to function and cannot be withdrawn without deleting your account.')}
              </p>
              <p>
                • {t('account.consents.info.tiers', 'Some features require specific subscription tiers and may be unavailable if consent is withdrawn.')}
              </p>
              <p>
                • {t('account.consents.info.audit', 'All consent changes are logged and can be audited. Contact our Data Protection Officer if you have questions.')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
