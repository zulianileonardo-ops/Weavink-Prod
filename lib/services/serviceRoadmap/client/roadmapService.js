"use client";
import { GenericCacheManager } from '@/lib/services/core/genericCacheManager';
import { ROADMAP_LIMITS } from '@/lib/services/constants';

const roadmapCache = new GenericCacheManager('roadmap');

/**
 * Roadmap Service - Client-side API calls
 * Used by frontend components to fetch roadmap data
 */
export class RoadmapService {
    /**
     * Get category tree (public endpoint)
     * @param {Object} options - Query options
     * @param {boolean} options.forceRefresh - Skip cache
     * @returns {Promise<Object>} Category tree and stats
     */
    static async getCategoryTree(options = {}) {
        const cacheKey = 'category_tree';

        // Check cache first
        if (!options.forceRefresh) {
            const cached = roadmapCache.get(cacheKey);
            if (cached) {
                console.log('📦 [RoadmapService] Returning cached tree');
                return cached;
            }
        }

        try {
            console.log('🔍 [RoadmapService] Fetching from API...');
            const response = await fetch('/api/roadmap');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch roadmap');
            }

            // Cache the result
            roadmapCache.set(cacheKey, data.data, ROADMAP_LIMITS.CLIENT_CACHE_TTL);

            console.log('✅ [RoadmapService] Fetched and cached tree');
            return data.data;

        } catch (error) {
            console.error('💥 [RoadmapService] Error fetching category tree:', error);
            throw error;
        }
    }

    /**
     * Get authenticated user roadmap (enhanced data)
     * @param {string} token - Firebase auth token
     * @param {Object} options - Query options
     * @param {boolean} options.forceRefresh - Skip cache
     * @returns {Promise<Object>} Enhanced category tree
     */
    static async getUserRoadmap(token, options = {}) {
        const cacheKey = 'user_roadmap';

        if (!options.forceRefresh) {
            const cached = roadmapCache.get(cacheKey);
            if (cached) {
                console.log('📦 [RoadmapService] Returning cached user roadmap');
                return cached;
            }
        }

        try {
            console.log('🔍 [RoadmapService] Fetching user roadmap from API...');
            const response = await fetch('/api/user/roadmap', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized: Please log in again');
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch user roadmap');
            }

            roadmapCache.set(cacheKey, data.data, ROADMAP_LIMITS.CLIENT_CACHE_TTL);

            console.log('✅ [RoadmapService] Fetched and cached user roadmap');
            return data.data;

        } catch (error) {
            console.error('💥 [RoadmapService] Error fetching user roadmap:', error);
            throw error;
        }
    }

    /**
     * Clear all caches
     */
    static clearCache() {
        roadmapCache.clearAll();
        console.log('🗑️ [RoadmapService] Cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    static getCacheStats() {
        return {
            categoryTree: roadmapCache.has('category_tree'),
            userRoadmap: roadmapCache.has('user_roadmap'),
        };
    }
}
