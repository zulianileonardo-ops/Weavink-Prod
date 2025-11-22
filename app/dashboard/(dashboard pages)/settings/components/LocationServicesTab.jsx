"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../SettingsContext';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { MapPin, Check, X, Info, TrendingUp, Zap, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from "@/lib/translation/useTranslation";
import { SUBSCRIPTION_LEVELS } from '@/lib/services/constants';

export default function LocationServicesTab() {
    const { settings, updateSettings, isLoading } = useSettings();
    const { subscriptionLevel: userSubscriptionLevel } = useDashboard();
    const { t, isInitialized } = useTranslation();
    const [saving, setSaving] = useState(false);

    // Master toggle state
    const [isEnabled, setIsEnabled] = useState(false);

    // Feature toggle states
    const [featureToggles, setFeatureToggles] = useState({
        geocoding: false,
        autoVenueEnrichment: false,
        eventDetection: false,
        autoTagging: false
    });

    // Initialize from settings
    useEffect(() => {
        if (settings) {
            setIsEnabled(settings.locationServicesEnabled ?? false);

            if (settings.locationFeatures) {
                setFeatureToggles(settings.locationFeatures);
            }
        }
    }, [settings]);

    // Get subscription level for feature access checks
    const subscriptionLevel = userSubscriptionLevel || SUBSCRIPTION_LEVELS.BASE;

    // Debug logging
    console.log('🔍 [LocationServices] Subscription Debug:', {
        userSubscriptionLevel,
        resolvedLevel: subscriptionLevel,
        expectedForPro: SUBSCRIPTION_LEVELS.PRO,
        expectedForPremium: SUBSCRIPTION_LEVELS.PREMIUM
    });

    const isPremiumOrHigher = [
        SUBSCRIPTION_LEVELS.PREMIUM,
        SUBSCRIPTION_LEVELS.BUSINESS,
        SUBSCRIPTION_LEVELS.ENTERPRISE
    ].includes(subscriptionLevel);
    const isProOrHigher = [
        SUBSCRIPTION_LEVELS.PRO,
        SUBSCRIPTION_LEVELS.PREMIUM,
        SUBSCRIPTION_LEVELS.BUSINESS,
        SUBSCRIPTION_LEVELS.ENTERPRISE
    ].includes(subscriptionLevel);

    // Comprehensive debug logging with tier check results
    console.log('✅ [LocationServices] Tier Check Results:', {
        subscriptionLevel,
        isProOrHigher,
        isPremiumOrHigher,
        tierChecks: {
            isPro: subscriptionLevel === SUBSCRIPTION_LEVELS.PRO,
            isPremium: subscriptionLevel === SUBSCRIPTION_LEVELS.PREMIUM,
            isBusiness: subscriptionLevel === SUBSCRIPTION_LEVELS.BUSINESS,
            isEnterprise: subscriptionLevel === SUBSCRIPTION_LEVELS.ENTERPRISE
        }
    });

    // Mock usage data (will be replaced with real data from cost tracking)
    const usageData = {
        geocodingCount: 45,
        geocodingLimit: isPremiumOrHigher ? 200 : (isProOrHigher ? 50 : 0),
        monthlyCost: 0.67,
        budgetLimit: 2.00,
        usagePercent: isPremiumOrHigher ? 22.5 : (isProOrHigher ? 90 : 0)
    };

    // Translations
    const translations = useMemo(() => {
        if (!isInitialized) return {};
        return {
            title: t('location.settings.title') || 'Location Services',
            subtitle: t('location.settings.subtitle') || 'Automatically enrich contacts with venue data',
            enabled: t('common.enabled') || 'Enabled',
            disabled: t('common.disabled') || 'Disabled',
            monthlyUsage: t('location.settings.monthly_usage') || 'Monthly Usage',
            geocoding: t('location.settings.geocoding') || 'Geocoding',
            cost: t('location.settings.cost') || 'Cost',
            features: t('location.settings.features') || 'Features',
            autoEnrichment: t('location.settings.auto_enrichment') || 'Auto Venue Enrichment',
            autoEnrichmentDesc: t('location.settings.auto_enrichment_desc') || 'Automatically detect venue names when contacts are exchanged',
            eventDetection: t('location.settings.event_detection') || 'Smart Event Detection',
            eventDetectionDesc: t('location.settings.event_detection_desc') || 'Suggest creating groups for contacts at same location',
            autoTagging: t('location.settings.auto_tagging') || 'AI Auto-Tagging',
            autoTaggingDesc: t('location.settings.auto_tagging_desc') || 'Generate semantic tags automatically',
            tierRequired: t('location.settings.tier_required') || 'Required',
            howItWorks: t('location.settings.how_it_works') || 'How It Works',
            howItWorksDesc: t('location.settings.how_it_works_desc') ||
                'When contacts exchange information, we can automatically detect the venue using GPS coordinates. This helps you remember where you met people and enables smart features like event detection.',
        };
    }, [t, isInitialized]);

    // Handle master toggle
    const handleMasterToggle = async () => {
        if (!isProOrHigher) {
            toast.error('Location Services require Pro subscription or higher');
            return;
        }

        const newValue = !isEnabled;
        setIsEnabled(newValue);
        await saveSettings(newValue, featureToggles);
    };

    // Handle feature toggle
    const handleFeatureToggle = async (feature) => {
        if (!isEnabled) return;

        // Check tier requirements
        if (feature === 'geocoding' && !isProOrHigher) {
            toast.error('Geocoding requires Pro subscription or higher');
            return;
        }

        if (feature === 'autoVenueEnrichment' && !isPremiumOrHigher) {
            toast.error('Auto Venue Enrichment requires Premium subscription or higher');
            return;
        }

        if ((feature === 'eventDetection' || feature === 'autoTagging') && !isPremiumOrHigher) {
            toast.error('This feature requires Premium subscription');
            return;
        }

        const newToggles = {
            ...featureToggles,
            [feature]: !featureToggles[feature]
        };
        setFeatureToggles(newToggles);
        await saveSettings(isEnabled, newToggles);
    };

    // Save settings
    const saveSettings = async (enabled, features) => {
        setSaving(true);
        try {
            updateSettings({
                locationServicesEnabled: enabled,
                locationFeatures: features
            });
            toast.success(translations.saved || 'Settings saved!');
        } catch (error) {
            console.error('Error saving location settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    // Feature configuration
    const features = [
        {
            key: 'geocoding',
            icon: MapPin,
            label: 'Geocoding',
            description: 'Convert GPS coordinates to readable addresses (reverse geocoding)',
            cost: '~$0.005 per contact',
            tier: 'Pro+',
            tierCheck: isProOrHigher,
            color: 'blue'
        },
        {
            key: 'autoVenueEnrichment',
            icon: Target,
            label: translations.autoEnrichment,
            description: translations.autoEnrichmentDesc,
            cost: '~$0.032 per contact',
            tier: 'Premium+',
            tierCheck: isPremiumOrHigher,
            color: 'indigo'
        },
        {
            key: 'eventDetection',
            icon: Target,
            label: translations.eventDetection,
            description: translations.eventDetectionDesc,
            cost: 'Free (internal)',
            tier: 'Premium+',
            tierCheck: isPremiumOrHigher,
            color: 'green'
        },
        {
            key: 'autoTagging',
            icon: Zap,
            label: translations.autoTagging,
            description: translations.autoTaggingDesc,
            cost: '~$0.0000002 per tag',
            tier: 'Premium+',
            tierCheck: isPremiumOrHigher,
            color: 'purple'
        }
    ];

    if (isLoading || !isInitialized) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div id="location-services" className="space-y-6 scroll-mt-20">
            {/* Master Toggle Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                {translations.title}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                            {translations.subtitle}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Status:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isEnabled
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                                {isEnabled ? (
                                    <>
                                        <Check className="w-3 h-3 mr-1" />
                                        {translations.enabled}
                                    </>
                                ) : (
                                    <>
                                        <X className="w-3 h-3 mr-1" />
                                        {translations.disabled}
                                    </>
                                )}
                            </span>
                            {!isProOrHigher && (
                                <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                                    Requires Pro+
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                        onClick={handleMasterToggle}
                        disabled={saving || !isProOrHigher}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                            ${saving || !isProOrHigher ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            ${isEnabled ? 'bg-blue-600' : 'bg-gray-300'}
                        `}
                    >
                        <span className={`
                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                            ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
                        `} />
                    </button>
                </div>
            </div>

            {/* Cost Transparency Card */}
            {isProOrHigher && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-blue-900">
                            {translations.monthlyUsage}
                        </h4>
                    </div>

                    <div className="space-y-3">
                        {/* Geocoding Usage */}
                        <div>
                            <div className="flex items-center justify-between mb-1 text-sm">
                                <span className="text-blue-800">
                                    {translations.geocoding}: {usageData.geocodingCount} / {usageData.geocodingLimit} calls
                                </span>
                                <span className="text-blue-800 font-medium">
                                    {usageData.usagePercent.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(usageData.usagePercent, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Cost */}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-800">
                                {translations.cost}: ${usageData.monthlyCost.toFixed(2)} / ${usageData.budgetLimit.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Feature Controls */}
            <div className={`bg-white border border-gray-200 rounded-lg p-6 shadow-sm transition-opacity ${
                !isEnabled ? 'opacity-50 pointer-events-none' : ''
            }`}>
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {translations.features}
                    </h3>
                    <p className="text-sm text-gray-600">
                        Control which location-based features are active for your account.
                    </p>
                </div>

                {/* Feature List */}
                <div className="space-y-3">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        const isAvailable = feature.tierCheck;
                        const isActive = featureToggles[feature.key];

                        return (
                            <div
                                key={feature.key}
                                className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                                    isActive && isAvailable
                                        ? `bg-${feature.color}-50 border-${feature.color}-200`
                                        : 'bg-white border-gray-200'
                                } ${
                                    !isAvailable ? 'opacity-60' : 'hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={() => handleFeatureToggle(feature.key)}
                                    disabled={saving || !isEnabled || !isAvailable}
                                    className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                                />

                                <Icon className={`w-5 h-5 mt-0.5 ${isActive && isAvailable ? `text-${feature.color}-600` : 'text-gray-400'}`} />

                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-gray-900 text-sm">
                                            {feature.label}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            isAvailable
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {feature.tier}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1">
                                        {feature.description}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {feature.cost}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-semibold text-blue-900 mb-1">
                            {translations.howItWorks}
                        </h3>
                        <p className="text-sm text-blue-800">
                            {translations.howItWorksDesc}
                        </p>
                    </div>
                </div>
            </div>

            {/* Saving Indicator */}
            {saving && (
                <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 z-50">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-700">Saving...</span>
                </div>
            )}
        </div>
    );
}
