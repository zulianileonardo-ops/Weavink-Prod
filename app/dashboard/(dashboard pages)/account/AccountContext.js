// app/dashboard/(dashboard pages)/account/AccountContext.js
/**
 * Account Context Provider
 *
 * Provides centralized state management for Account & Privacy page with:
 * - Three-layer caching architecture (2-minute expiration)
 * - Centralized data fetching (ConsentService, DataExportService, AccountDeletionService, SettingsService)
 * - Real-time synchronization from Firestore
 * - Mutation handling with automatic cache invalidation
 *
 * This follows the same pattern as ContactsContext.js
 */

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { ConsentService } from '@/lib/services/servicePrivacy/client/services/ConsentService';
import { DataExportService } from '@/lib/services/servicePrivacy/client/services/DataExportService';
import { AccountDeletionService } from '@/lib/services/servicePrivacy/client/services/AccountDeletionService';
import { SettingsService } from '@/lib/services/serviceSetting/client/settingsService';
import { PRIVACY_PERMISSIONS } from '@/lib/services/constants';

const AccountContext = createContext();

export function useAccount() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}

export function AccountProvider({ children }) {
  const { currentUser, permissions: dashboardPermissions } = useDashboard();

  // Permission flags derived from dashboard permissions
  const canManageConsents = dashboardPermissions?.[PRIVACY_PERMISSIONS.CAN_MANAGE_CONSENTS] ?? true;
  const canExportData = dashboardPermissions?.[PRIVACY_PERMISSIONS.CAN_EXPORT_DATA] ?? true;
  const canDeleteAccount = dashboardPermissions?.[PRIVACY_PERMISSIONS.CAN_DELETE_ACCOUNT] ?? true;

  // Core privacy data (cached)
  const [privacySettings, setPrivacySettings] = useState(null);
  const [consents, setConsents] = useState(null);
  const [pendingDeletion, setPendingDeletion] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);

  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [notification, setNotification] = useState(null);

  // Cache management
  const cacheRef = useRef({
    data: null,
    expiry: null,
    listeners: new Set()
  });

  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // Cache helper functions
  const isCacheValid = useCallback(() => {
    const now = Date.now();
    return cacheRef.current.data && cacheRef.current.expiry && now < cacheRef.current.expiry;
  }, []);

  const invalidateCache = useCallback(() => {
    console.log('🗑️ [AccountContext] Invalidating cache');
    cacheRef.current.data = null;
    cacheRef.current.expiry = null;
  }, []);

  const updateCache = useCallback((data) => {
    const now = Date.now();
    cacheRef.current.data = data;
    cacheRef.current.expiry = now + CACHE_DURATION;
    console.log('💾 [AccountContext] Cache updated, expires in 2 minutes');
  }, [CACHE_DURATION]);

  // Show notification helper
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  /**
   * Main data fetching function with caching
   */
  const fetchPrivacyData = useCallback(async (forceRefresh = false) => {
    // Guard: Don't run if there's no authenticated user
    if (!currentUser) {
      setPrivacySettings(null);
      setConsents(null);
      setPendingDeletion(null);
      setIsLoading(false);
      return;
    }

    // Check cache validity
    if (!forceRefresh && isCacheValid()) {
      console.log('✅ [AccountContext] Using cached data');
      const cached = cacheRef.current.data;
      setPrivacySettings(cached.privacySettings);
      setConsents(cached.consents);
      setPendingDeletion(cached.pendingDeletion);
      setIsLoading(false);
      return;
    }

    console.log('🔄 [AccountContext] Fetching privacy data...');
    setIsLoading(true);
    setHasLoadError(false);

    try {
      // Parallel fetch for all privacy data
      const [deletionData, consentsData, settingsData] = await Promise.all([
        AccountDeletionService.getDeletionStatus(),
        ConsentService.getUserConsents(),
        SettingsService.getSettingsData()
      ]);

      // Process deletion data
      const deletion = deletionData.hasPendingDeletion ? deletionData.deletionRequest : null;

      // Update state
      setPrivacySettings(settingsData);
      setConsents(consentsData.consents);
      setPendingDeletion(deletion);

      // Update cache
      updateCache({
        privacySettings: settingsData,
        consents: consentsData.consents,
        pendingDeletion: deletion
      });

      console.log('✅ [AccountContext] Privacy data loaded successfully');
    } catch (error) {
      console.error('❌ [AccountContext] Error loading privacy data:', error);
      setHasLoadError(true);
      showNotification('Failed to load privacy data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isCacheValid, updateCache, showNotification]);

  /**
   * Fetch settings only (for Privacy Settings tab)
   */
  const fetchSettings = useCallback(async (forceRefresh = false) => {
    if (!currentUser) return;

    try {
      const settingsData = await SettingsService.getSettingsData();
      setPrivacySettings(settingsData);

      // Update cache with new settings
      if (cacheRef.current.data) {
        updateCache({
          ...cacheRef.current.data,
          privacySettings: settingsData
        });
      }
    } catch (error) {
      console.error('❌ [AccountContext] Error loading settings:', error);
      showNotification('Failed to load settings', 'error');
    }
  }, [currentUser, updateCache, showNotification]);

  /**
   * Update privacy setting (isPublic, allowMessages, notifications)
   */
  const updatePrivacySetting = useCallback(async (settingKey, value) => {
    if (!currentUser) return;

    try {
      console.log(`🔄 [AccountContext] Updating ${settingKey} to ${value}`);

      // Build update payload based on setting key
      let updatePayload = {};
      if (settingKey === 'isPublic' || settingKey === 'allowMessages') {
        updatePayload = {
          action: 'updatePrivacy',
          data: { [settingKey]: value }
        };
      } else if (settingKey === 'notifications') {
        updatePayload = {
          action: 'updateNotifications',
          data: { notifications: value }
        };
      }

      // Call service
      await SettingsService.updateSettingsData(updatePayload);

      // Update local state
      setPrivacySettings((prev) => {
        if (settingKey === 'notifications') {
          return { ...prev, notifications: value };
        }
        return { ...prev, [settingKey]: value };
      });

      // Invalidate cache to force fresh data on next tab switch
      invalidateCache();

      showNotification('Setting updated successfully', 'success');
      console.log('✅ [AccountContext] Setting updated successfully');
    } catch (error) {
      console.error('❌ [AccountContext] Error updating setting:', error);
      showNotification(error.message, 'error');
      // Refresh to revert
      await fetchSettings(true);
    }
  }, [currentUser, invalidateCache, showNotification, fetchSettings]);

  /**
   * Update contact download settings
   */
  const updateContactDownloadSettings = useCallback(async (enabled, fields) => {
    if (!currentUser) return;

    try {
      console.log('🔄 [AccountContext] Updating contact download settings');

      // Build update payload
      const updatePayload = {
        action: 'updateContactDownload',
        data: {
          downloadContactEnabled: enabled,
          downloadContactFields: fields
        }
      };

      // Call service
      await SettingsService.updateSettingsData(updatePayload);

      // Update local state
      setPrivacySettings((prev) => ({
        ...prev,
        downloadContactEnabled: enabled,
        downloadContactFields: fields
      }));

      // Invalidate cache to force fresh data on next tab switch
      invalidateCache();

      console.log('✅ [AccountContext] Contact download settings updated successfully');
    } catch (error) {
      console.error('❌ [AccountContext] Error updating contact download settings:', error);
      showNotification(error.message, 'error');
      // Refresh to revert
      await fetchSettings(true);
      throw error;
    }
  }, [currentUser, invalidateCache, showNotification, fetchSettings]);

  /**
   * Update language preference
   */
  const updateLanguagePreference = useCallback(async (languageCode) => {
    if (!currentUser) return;

    try {
      console.log(`🔄 [AccountContext] Updating language preference to ${languageCode}`);

      // Build update payload
      const updatePayload = {
        action: 'updateLanguage',
        data: { defaultLanguage: languageCode }
      };

      // Call service
      await SettingsService.updateSettingsData(updatePayload);

      // Update local state
      setPrivacySettings((prev) => ({
        ...prev,
        defaultLanguage: languageCode
      }));

      // Invalidate cache to force fresh data on next tab switch
      invalidateCache();

      console.log('✅ [AccountContext] Language preference updated successfully');
    } catch (error) {
      console.error('❌ [AccountContext] Error updating language preference:', error);
      showNotification(error.message, 'error');
      // Refresh to revert
      await fetchSettings(true);
      throw error;
    }
  }, [currentUser, invalidateCache, showNotification, fetchSettings]);

  /**
   * Grant consent
   */
  const grantConsent = useCallback(async (consentType, metadata) => {
    if (!currentUser) return;

    try {
      console.log(`🔄 [AccountContext] Granting consent: ${consentType}`);
      await ConsentService.grantConsent(consentType, metadata);

      // Invalidate cache and refresh consents data in background (no loading state)
      invalidateCache();

      // Fetch updated consents without triggering global loading spinner
      const consentsData = await ConsentService.getUserConsents();
      setConsents(consentsData.consents);

      // Update cache with new consents
      if (cacheRef.current.data) {
        updateCache({
          ...cacheRef.current.data,
          consents: consentsData.consents
        });
      }

      showNotification('Consent granted successfully', 'success');
      console.log('✅ [AccountContext] Consent granted successfully');
    } catch (error) {
      console.error('❌ [AccountContext] Error granting consent:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }, [currentUser, invalidateCache, showNotification, updateCache]);

  /**
   * Withdraw consent
   */
  const withdrawConsent = useCallback(async (consentType, metadata) => {
    if (!currentUser) return;

    try {
      console.log(`🔄 [AccountContext] Withdrawing consent: ${consentType}`);
      await ConsentService.withdrawConsent(consentType, metadata);

      // Invalidate cache and refresh consents data in background (no loading state)
      invalidateCache();

      // Fetch updated consents without triggering global loading spinner
      const consentsData = await ConsentService.getUserConsents();
      setConsents(consentsData.consents);

      // Update cache with new consents
      if (cacheRef.current.data) {
        updateCache({
          ...cacheRef.current.data,
          consents: consentsData.consents
        });
      }

      showNotification('Consent withdrawn successfully', 'success');
      console.log('✅ [AccountContext] Consent withdrawn successfully');
    } catch (error) {
      console.error('❌ [AccountContext] Error withdrawing consent:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }, [currentUser, invalidateCache, showNotification, updateCache]);

  /**
   * Request account deletion
   */
  const requestDeletion = useCallback(async (confirmation, reason, immediate) => {
    if (!currentUser) return;

    try {
      console.log('🔄 [AccountContext] Requesting account deletion');
      await AccountDeletionService.requestDeletion(confirmation, reason, immediate);

      // Invalidate cache and refresh
      invalidateCache();
      await fetchPrivacyData(true);

      showNotification('Account deletion requested successfully', 'success');
      console.log('✅ [AccountContext] Deletion requested successfully');
    } catch (error) {
      console.error('❌ [AccountContext] Error requesting deletion:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }, [currentUser, invalidateCache, fetchPrivacyData, showNotification]);

  /**
   * Cancel account deletion
   */
  const cancelDeletion = useCallback(async () => {
    if (!currentUser) return;

    try {
      console.log('🔄 [AccountContext] Cancelling account deletion');
      await AccountDeletionService.cancelDeletion();

      // Invalidate cache and refresh
      invalidateCache();
      await fetchPrivacyData(true);

      showNotification('Account deletion cancelled successfully', 'success');
      console.log('✅ [AccountContext] Deletion cancelled successfully');
    } catch (error) {
      console.error('❌ [AccountContext] Error cancelling deletion:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }, [currentUser, invalidateCache, fetchPrivacyData, showNotification]);

  /**
   * Request data export
   */
  const requestExport = useCallback(async (options) => {
    if (!currentUser) {
      const errorMsg = 'No active session. Please refresh the page and try again.';
      console.error('❌ [AccountContext] Export failed - no session');
      showNotification(errorMsg, 'error');
      throw new Error(errorMsg);
    }

    try {
      console.log('🔄 [AccountContext] Requesting data export');
      const data = await DataExportService.requestExport(options);

      showNotification('Data export completed successfully', 'success');
      console.log('✅ [AccountContext] Export completed successfully');

      return data;
    } catch (error) {
      console.error('❌ [AccountContext] Error requesting export:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  }, [currentUser, showNotification]);

  /**
   * Refresh all data (force)
   */
  const refreshData = useCallback(() => {
    console.log('🔄 [AccountContext] Manual refresh requested');
    return fetchPrivacyData(true);
  }, [fetchPrivacyData]);

  // Initial data load
  useEffect(() => {
    if (currentUser) {
      fetchPrivacyData();
    } else {
      // Reset everything on logout
      setPrivacySettings(null);
      setConsents(null);
      setPendingDeletion(null);
      setIsLoading(false);
      setHasLoadError(false);
      invalidateCache();
    }
  }, [currentUser, fetchPrivacyData, invalidateCache]);

  const contextValue = {
    // Core privacy data
    privacySettings,
    consents,
    pendingDeletion,
    exportHistory,

    // UI state
    activeTab,
    setActiveTab,
    isLoading,
    hasLoadError,
    notification,

    // Data fetching
    fetchPrivacyData,
    fetchSettings,
    refreshData,

    // Mutations
    updatePrivacySetting,
    updateContactDownloadSettings,
    updateLanguagePreference,
    grantConsent,
    withdrawConsent,
    requestDeletion,
    cancelDeletion,
    requestExport,

    // Helpers
    showNotification,

    // Session & Permissions
    currentUser,
    canManageConsents,
    canExportData,
    canDeleteAccount,
  };

  return (
    <AccountContext.Provider value={contextValue}>
      {children}
    </AccountContext.Provider>
  );
}
