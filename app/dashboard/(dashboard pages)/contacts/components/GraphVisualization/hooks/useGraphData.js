'use client';
// hooks/useGraphData.js
// Custom hook for fetching graph data from API

import { useState, useCallback, useRef, useEffect } from 'react';
import { ContactApiClient } from '@/lib/services/core/ApiClient';

// ============================================================================
// localStorage Cache for Graph Data
// ============================================================================

const CACHE_PREFIX = 'weavink_graph_';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const CACHE_KEYS = {
  graphData: `${CACHE_PREFIX}data`,
  stats: `${CACHE_PREFIX}stats`,
  suggestions: `${CACHE_PREFIX}suggestions`,
  timestamp: `${CACHE_PREFIX}timestamp`
};

/**
 * Cache utilities for localStorage persistence
 * - SSR safe (checks for window)
 * - Graceful error handling
 * - 1-hour TTL with timestamp validation
 */
const graphCache = {
  get: (key) => {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.warn('[GraphCache] Read error:', e);
      return null;
    }
  },

  set: (key, value) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[GraphCache] Write error:', e);
    }
  },

  isValid: () => {
    const timestamp = graphCache.get(CACHE_KEYS.timestamp);
    if (!timestamp) return false;
    const isExpired = Date.now() - timestamp >= CACHE_TTL_MS;
    if (isExpired) {
      console.log('[GraphCache] Cache expired, will fetch fresh data');
    }
    return !isExpired;
  },

  invalidate: () => {
    if (typeof window === 'undefined') return;
    console.log('[GraphCache] Invalidating cache');
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },

  updateTimestamp: () => {
    graphCache.set(CACHE_KEYS.timestamp, Date.now());
  }
};

// ============================================================================

/**
 * Custom hook for managing graph data fetching
 * Handles loading states, errors, data transformation, and localStorage caching
 */
export function useGraphData() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [stats, setStats] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [graphSettings, setGraphSettings] = useState({ syncExchangeContacts: true });
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [error, setError] = useState(null);

  // Discovery progress state for progress bar
  const [discoveryProgress, setDiscoveryProgress] = useState({
    jobId: null,
    progress: 0,
    currentStep: '',
    status: null
  });

  // Ref to store polling interval
  const pollIntervalRef = useRef(null);

  /**
   * Fetch graph data for visualization
   * @param {Object} options - Fetch options
   * @param {Array} options.nodeTypes - Filter by node types
   * @param {Array} options.relationshipTypes - Filter by relationship types
   * @param {boolean} options.skipCache - Force fetch from API (skip cache)
   */
  const fetchGraphData = useCallback(async (options = {}) => {
    // Check cache first (only for default fetch without filters)
    if (!options.nodeTypes && !options.relationshipTypes && !options.skipCache) {
      if (graphCache.isValid()) {
        const cached = graphCache.get(CACHE_KEYS.graphData);
        if (cached) {
          console.log('[GraphCache] Using cached graph data');
          setGraphData(cached);
          return cached;
        }
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.nodeTypes) {
        params.set('nodeTypes', options.nodeTypes.join(','));
      }
      if (options.relationshipTypes) {
        params.set('relationshipTypes', options.relationshipTypes.join(','));
      }

      const data = await ContactApiClient.get(`/api/user/contacts/graph?${params}`);

      // Transform edges to links format for react-force-graph
      const transformedData = {
        nodes: data.graph.nodes || [],
        links: (data.graph.edges || []).map(edge => ({
          ...edge,
          source: edge.source,
          target: edge.target
        }))
      };

      // Cache the result (only for default fetch without filters)
      if (!options.nodeTypes && !options.relationshipTypes) {
        graphCache.set(CACHE_KEYS.graphData, transformedData);
        graphCache.updateTimestamp();
        console.log('[GraphCache] Cached graph data');
      }

      setGraphData(transformedData);
      return transformedData;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching graph data:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch graph statistics
   * @param {Object} options - Fetch options
   * @param {boolean} options.skipCache - Force fetch from API (skip cache)
   */
  const fetchStats = useCallback(async (options = {}) => {
    // Check cache first
    if (!options.skipCache && graphCache.isValid()) {
      const cached = graphCache.get(CACHE_KEYS.stats);
      if (cached) {
        console.log('[GraphCache] Using cached stats');
        setStats(cached);
        return cached;
      }
    }

    try {
      const data = await ContactApiClient.get('/api/user/contacts/graph/stats');

      // Cache the result
      graphCache.set(CACHE_KEYS.stats, data.stats);
      console.log('[GraphCache] Cached stats');

      setStats(data.stats);
      return data.stats;
    } catch (err) {
      console.error('Error fetching stats:', err);
      return null;
    }
  }, []);

  /**
   * Fetch group suggestions
   * @param {Object} options - Fetch options
   * @param {number} options.minSimilarity - Minimum similarity threshold
   * @param {number} options.maxSuggestions - Maximum number of suggestions
   * @param {boolean} options.skipCache - Force fetch from API (skip cache)
   */
  const fetchSuggestions = useCallback(async (options = {}) => {
    // Check cache first (only for default fetch without filters)
    if (!options.minSimilarity && !options.maxSuggestions && !options.skipCache) {
      if (graphCache.isValid()) {
        const cached = graphCache.get(CACHE_KEYS.suggestions);
        if (cached) {
          console.log('[GraphCache] Using cached suggestions');
          setSuggestions(cached);
          return cached;
        }
      }
    }

    try {
      const params = new URLSearchParams();
      if (options.minSimilarity) {
        params.set('minSimilarity', options.minSimilarity);
      }
      if (options.maxSuggestions) {
        params.set('maxSuggestions', options.maxSuggestions);
      }

      const data = await ContactApiClient.get(`/api/user/contacts/graph/suggestions?${params}`);
      const suggestions = data.suggestions || [];

      // Cache the result (only for default fetch without filters)
      if (!options.minSimilarity && !options.maxSuggestions) {
        graphCache.set(CACHE_KEYS.suggestions, suggestions);
        console.log('[GraphCache] Cached suggestions');
      }

      setSuggestions(suggestions);
      return suggestions;
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      return [];
    }
  }, []);

  /**
   * Fetch graph settings
   */
  const fetchSettings = useCallback(async () => {
    try {
      const data = await ContactApiClient.get('/api/user/contacts/graph/settings');
      if (data.settings) {
        setGraphSettings(data.settings);
      }
      return data.settings;
    } catch (err) {
      console.error('Error fetching graph settings:', err);
      return null;
    }
  }, []);

  /**
   * Update graph settings
   */
  const updateSettings = useCallback(async (newSettings) => {
    setIsUpdatingSettings(true);
    try {
      const data = await ContactApiClient.post('/api/user/contacts/graph/settings', newSettings);
      if (data.settings) {
        setGraphSettings(prev => ({ ...prev, ...data.settings }));
      }
      return data.settings;
    } catch (err) {
      console.error('Error updating graph settings:', err);
      setError(err.message);
      return null;
    } finally {
      setIsUpdatingSettings(false);
    }
  }, []);

  /**
   * Poll for discovery job status
   */
  const pollJobStatus = useCallback(async (jobId) => {
    try {
      const data = await ContactApiClient.get(`/api/user/contacts/graph/discover/status?jobId=${jobId}`);

      setDiscoveryProgress({
        jobId,
        progress: data.progress || 0,
        currentStep: data.currentStep || '',
        status: data.status
      });

      // Check if job is complete or failed
      if (data.status === 'completed') {
        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        setIsDiscovering(false);

        // Invalidate cache and refresh all data after discovery
        graphCache.invalidate();
        await Promise.all([
          fetchGraphData({ skipCache: true }),
          fetchStats({ skipCache: true }),
          fetchSuggestions({ skipCache: true })
        ]);

        return data.result;
      } else if (data.status === 'failed') {
        // Stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        setIsDiscovering(false);
        setError(data.error || 'Discovery failed');
        return null;
      }

      return null; // Still in progress
    } catch (err) {
      console.error('Error polling job status:', err);
      return null;
    }
  }, [fetchGraphData, fetchStats, fetchSuggestions]);

  /**
   * Trigger relationship discovery (background job pattern)
   */
  const discoverRelationships = useCallback(async (options = {}) => {
    setIsDiscovering(true);
    setError(null);
    setDiscoveryProgress({
      jobId: null,
      progress: 0,
      currentStep: 'Starting discovery...',
      status: 'starting'
    });

    try {
      // Start the discovery job (returns immediately with jobId)
      const data = await ContactApiClient.post('/api/user/contacts/graph/discover', options);

      if (!data.jobId) {
        // No jobId means it completed immediately (e.g., no contacts)
        setIsDiscovering(false);
        setDiscoveryProgress({ jobId: null, progress: 100, currentStep: 'Complete', status: 'completed' });
        return data.results || null;
      }

      // Update progress with jobId
      setDiscoveryProgress(prev => ({
        ...prev,
        jobId: data.jobId,
        status: 'started'
      }));

      // Start polling for status every 2 seconds
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(data.jobId);
      }, 2000);

      // Do an immediate poll
      await pollJobStatus(data.jobId);

      return data.jobId; // Return jobId for reference
    } catch (err) {
      setError(err.message);
      console.error('Error starting discovery:', err);
      setIsDiscovering(false);
      setDiscoveryProgress({ jobId: null, progress: 0, currentStep: '', status: null });
      return null;
    }
  }, [pollJobStatus]);

  /**
   * Refresh all graph data
   * @param {boolean} forceRefresh - If true, invalidates cache and fetches fresh data
   */
  const refreshAll = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      graphCache.invalidate();
    }

    setIsLoading(true);
    try {
      await Promise.all([
        fetchGraphData({ skipCache: forceRefresh }),
        fetchStats({ skipCache: forceRefresh }),
        fetchSuggestions({ skipCache: forceRefresh }),
        fetchSettings() // Settings don't need caching
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchGraphData, fetchStats, fetchSuggestions, fetchSettings]);

  /**
   * Clear all data
   */
  const clearData = useCallback(() => {
    setGraphData({ nodes: [], links: [] });
    setStats(null);
    setSuggestions([]);
    setError(null);
  }, []);

  /**
   * Cancel discovery (stop polling)
   */
  const cancelDiscovery = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsDiscovering(false);
    setDiscoveryProgress({ jobId: null, progress: 0, currentStep: '', status: null });
  }, []);

  /**
   * Clear localStorage cache (exposed for manual cache clearing)
   */
  const clearCache = useCallback(() => {
    graphCache.invalidate();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    // Data
    graphData,
    stats,
    suggestions,
    graphSettings,
    discoveryProgress,

    // Loading states
    isLoading,
    isDiscovering,
    isUpdatingSettings,
    error,

    // Actions
    fetchGraphData,
    fetchStats,
    fetchSuggestions,
    fetchSettings,
    updateSettings,
    discoverRelationships,
    cancelDiscovery,
    refreshAll,
    clearData,
    clearCache
  };
}

export default useGraphData;
