'use client';

/**
 * CNIL-Compliant Cookie Consent Banner
 *
 * Requirements:
 * - Appears before any non-essential cookies are set
 * - "Reject All" as prominent as "Accept All"
 * - No pre-checked boxes
 * - Granular consent options
 * - Easy to withdraw consent
 */

import { useState, useEffect } from 'react';
import { Cookie, Settings, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import {
  hasGivenConsent,
  acceptAllCookies,
  rejectAllCookies,
  saveCustomConsent,
  getStoredConsent,
  COOKIE_CATEGORIES,
  COOKIE_DETAILS,
} from '../../../lib/utils/cookieConsent';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  // Category toggles (essential is always true)
  const [categories, setCategories] = useState({
    [COOKIE_CATEGORIES.ANALYTICS]: false,
    [COOKIE_CATEGORIES.PERSONALIZATION]: false,
  });

  // Expanded category details
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    // Check if user has already given consent
    const hasConsent = hasGivenConsent();

    if (!hasConsent) {
      // Show banner after a short delay
      setTimeout(() => {
        setShowBanner(true);
      }, 1000);
    }
  }, []);

  const getAuthToken = async () => {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return null;
      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  const saveToFirestore = async (consent) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('No auth token - consent not synced to Firestore');
        return;
      }

      await fetch('/api/user/privacy/cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categories: consent.categories,
        }),
      });

      console.log('[CookieBanner] Consent synced to Firestore');
    } catch (error) {
      console.error('Error syncing consent to Firestore:', error);
      // Don't block the banner close - local storage is sufficient
    }
  };

  const handleAcceptAll = async () => {
    setSaving(true);
    try {
      await acceptAllCookies(saveToFirestore);
      setShowBanner(false);
    } catch (error) {
      console.error('Error accepting cookies:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRejectAll = async () => {
    setSaving(true);
    try {
      await rejectAllCookies(saveToFirestore);
      setShowBanner(false);
    } catch (error) {
      console.error('Error rejecting cookies:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustom = async () => {
    setSaving(true);
    try {
      await saveCustomConsent(categories, saveToFirestore);
      setShowBanner(false);
    } catch (error) {
      console.error('Error saving custom consent:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category) => {
    setCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const toggleCategoryDetails = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998]" />

      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] transform transition-transform duration-300">
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200">
            {/* Simple View */}
            {!showSettings ? (
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Cookie className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      We Value Your Privacy
                    </h2>
                    <p className="text-gray-600 text-sm mb-4">
                      We use cookies to enhance your experience, analyze site usage, and personalize
                      content. You can choose which cookies you&apos;re comfortable with. Essential
                      cookies are required for the site to function.{' '}
                      <a
                        href="/cookie-policy"
                        target="_blank"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Learn more
                      </a>
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleAcceptAll}
                        disabled={saving}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Accept All</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleRejectAll}
                        disabled={saving}
                        className="px-6 py-2.5 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            <span>Reject All</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setShowSettings(true)}
                        className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Customize</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Detailed Settings View */
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Settings className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Cookie Preferences</h2>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {/* Essential Cookies (Always On) */}
                  <div className="border border-gray-200 rounded-lg">
                    <div className="p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-gray-900">
                              {COOKIE_DETAILS[COOKIE_CATEGORIES.ESSENTIAL].name}
                            </h3>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                              Always Active
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {COOKIE_DETAILS[COOKIE_CATEGORIES.ESSENTIAL].description}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleCategoryDetails(COOKIE_CATEGORIES.ESSENTIAL)}
                          className="ml-4 text-gray-400 hover:text-gray-600"
                        >
                          {expandedCategories[COOKIE_CATEGORIES.ESSENTIAL] ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      {expandedCategories[COOKIE_CATEGORIES.ESSENTIAL] && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Cookies Used:</p>
                          <div className="space-y-2">
                            {COOKIE_DETAILS[COOKIE_CATEGORIES.ESSENTIAL].cookies.map((cookie) => (
                              <div
                                key={cookie.name}
                                className="text-xs text-gray-600 flex justify-between"
                              >
                                <span className="font-mono">{cookie.name}</span>
                                <span className="text-gray-500">{cookie.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="border border-gray-200 rounded-lg">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-gray-900">
                              {COOKIE_DETAILS[COOKIE_CATEGORIES.ANALYTICS].name}
                            </h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={categories[COOKIE_CATEGORIES.ANALYTICS]}
                                onChange={() => toggleCategory(COOKIE_CATEGORIES.ANALYTICS)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {COOKIE_DETAILS[COOKIE_CATEGORIES.ANALYTICS].description}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleCategoryDetails(COOKIE_CATEGORIES.ANALYTICS)}
                          className="ml-4 text-gray-400 hover:text-gray-600"
                        >
                          {expandedCategories[COOKIE_CATEGORIES.ANALYTICS] ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      {expandedCategories[COOKIE_CATEGORIES.ANALYTICS] && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Cookies Used:</p>
                          <div className="space-y-2">
                            {COOKIE_DETAILS[COOKIE_CATEGORIES.ANALYTICS].cookies.map((cookie) => (
                              <div
                                key={cookie.name}
                                className="text-xs text-gray-600 flex justify-between"
                              >
                                <span className="font-mono">{cookie.name}</span>
                                <span className="text-gray-500">{cookie.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Personalization Cookies */}
                  <div className="border border-gray-200 rounded-lg">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-gray-900">
                              {COOKIE_DETAILS[COOKIE_CATEGORIES.PERSONALIZATION].name}
                            </h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={categories[COOKIE_CATEGORIES.PERSONALIZATION]}
                                onChange={() => toggleCategory(COOKIE_CATEGORIES.PERSONALIZATION)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {COOKIE_DETAILS[COOKIE_CATEGORIES.PERSONALIZATION].description}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleCategoryDetails(COOKIE_CATEGORIES.PERSONALIZATION)}
                          className="ml-4 text-gray-400 hover:text-gray-600"
                        >
                          {expandedCategories[COOKIE_CATEGORIES.PERSONALIZATION] ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>

                      {expandedCategories[COOKIE_CATEGORIES.PERSONALIZATION] && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Cookies Used:</p>
                          <div className="space-y-2">
                            {COOKIE_DETAILS[COOKIE_CATEGORIES.PERSONALIZATION].cookies.map(
                              (cookie) => (
                                <div
                                  key={cookie.name}
                                  className="text-xs text-gray-600 flex justify-between"
                                >
                                  <span className="font-mono">{cookie.name}</span>
                                  <span className="text-gray-500">{cookie.duration}</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveCustom}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Preferences</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
