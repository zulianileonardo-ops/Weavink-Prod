/**
 * LocationEnrichmentService
 *
 * Automatically enriches contacts with venue data during contact exchange.
 *
 * Features:
 * - Redis caching with 100m grid precision (70%+ hit rate)
 * - Budget pre-flight checks via CostTrackingService
 * - Google Places Nearby Search integration
 * - Graceful degradation on errors/budget exceeded
 * - Random TTL (15-30min) to prevent thundering herd
 *
 * Usage:
 * const enrichedContact = await LocationEnrichmentService.enrichContact(
 *   contact,
 *   userId,
 *   userData
 * );
 */

import { PlacesService } from './GroupService/placesService.js';
import { CostTrackingService } from './costTrackingService.js';
import { redisClient } from './redisClient.js';
import { API_COSTS } from '@/lib/services/constants/apiCosts.js';
import { OptimizedPlacesApiClient } from '@/lib/services/placesApiClient.js';

export class LocationEnrichmentService {
  /**
   * Main enrichment method - orchestrates the entire enrichment flow
   *
   * Flow:
   * 1. Check if enrichment is enabled in user settings
   * 2. Check budget availability
   * 3. Check Redis cache (100m grid)
   * 4. Call Google Places API if cache miss
   * 5. Store result in cache
   * 6. Record cost
   * 7. Return enriched contact
   *
   * @param {Object} contact - Contact object with location
   * @param {string} userId - Profile owner ID (for budget tracking)
   * @param {Object} userData - User data including settings
   * @returns {Promise<Object>} Enriched contact or original if skipped
   */
  /**
   * Enrich contact with venue data using GPS coordinates
   *
   * @param {Object} contact - Contact object with location data
   * @param {string} userId - User ID for cost tracking
   * @param {Object} userData - User data including settings
   * @param {string|null} sessionId - Optional session ID for tracking (default: null)
   * @returns {Object} Enriched contact with venue metadata
   */
  static async enrichContact(contact, userId, userData, sessionId = null) {
    const startTime = Date.now();

    try {
      // Validate inputs
      if (!contact?.location?.latitude || !contact?.location?.longitude) {
        console.log('⏭️ [AutoEnrich] No GPS coordinates, skipping enrichment');
        return contact;
      }

      // Check if any location feature is enabled
      const canGeocode = this.isGeocodingEnabled(userData);
      const canEnrichVenue = this.isVenueEnrichmentEnabled(userData);

      if (!canGeocode && !canEnrichVenue) {
        console.log('⏭️ [AutoEnrich] All location features disabled, skipping');
        return contact;
      }

      const { latitude, longitude } = contact.location;

      console.log('🎯 [AutoEnrich] Feature flags:', {
        geocoding: canGeocode,
        venueEnrichment: canEnrichVenue
      });

      console.log('🎯 [AutoEnrich] Starting enrichment:', {
        userId,
        latitude,
        longitude,
        accuracy: contact.location.accuracy,
        sessionId: sessionId || 'none'
      });

      // Budget pre-flight check based on enabled features
      const geocodingCost = API_COSTS.GOOGLE_MAPS.GEOCODING.PER_REQUEST;
      const venueSearchCost = API_COSTS.GOOGLE_MAPS.PLACES_NEARBY_SEARCH.PER_REQUEST;

      // Calculate estimated cost based on enabled features
      let totalEstimatedCost = 0;
      let estimatedRuns = 0;

      if (canGeocode) {
        totalEstimatedCost += geocodingCost;
        estimatedRuns += 1;
      }

      if (canEnrichVenue) {
        totalEstimatedCost += venueSearchCost;
        estimatedRuns += 1;
      }

      console.log('💰 [AutoEnrich] Budget check:', {
        geocodingCost: canGeocode ? geocodingCost : 0,
        venueSearchCost: canEnrichVenue ? venueSearchCost : 0,
        totalEstimatedCost,
        estimatedRuns
      });

      // === Budget Pre-Flight Check ===
      // Location enrichment requires:
      // 1. API budget check (ALWAYS) - for geocoding + venue search
      // 2. AI budget check (CONDITIONAL) - if auto-tagging is enabled

      // Step 1: Check API budget (ALWAYS required for location enrichment)
      console.log('🔍 [AutoEnrich] Checking API budget (geocoding + venue search)');
      const apiAffordabilityCheck = await CostTrackingService.canAffordGeneric(
        userId,
        'ApiUsage',           // ✅ Check API limits (monthlyBillableRunsAPI)
        totalEstimatedCost,   // Geocoding ($0.005) + Venue search ($0.032)
        true                  // ✅ Requires billable API run slot
      );

      if (!apiAffordabilityCheck.canAfford) {
        console.log('⚠️ [AutoEnrich] API budget exceeded, graceful degradation:', {
          reason: apiAffordabilityCheck.reason,
          userId,
          checkType: 'ApiUsage'
        });

        // Track budget exceeded in contact metadata
        const skippedFeatures = [];
        if (canGeocode) skippedFeatures.push('geocoding');
        if (canEnrichVenue) skippedFeatures.push('venue_enrichment');

        const contactWithBudgetTracking = {
          ...contact,
          metadata: {
            ...contact.metadata,
            budgetExceeded: true,
            budgetExceededReason: apiAffordabilityCheck.reason,  // 'budget_exceeded' | 'runs_exceeded'
            budgetExceededAt: new Date().toISOString(),
            enrichmentAttempted: true,
            skippedFeatures
          }
        };

        console.log('📊 [AutoEnrich] Budget tracking added to contact:', {
          budgetExceeded: true,
          reason: apiAffordabilityCheck.reason,
          skippedFeatures
        });

        // Record budget exceeded event in ApiUsage collection for analytics
        try {
          await CostTrackingService.recordBudgetExceeded({
            userId,
            usageType: 'ApiUsage',
            feature: 'location_enrichment',
            estimatedCost: totalEstimatedCost,
            reason: apiAffordabilityCheck.reason,
            metadata: {
              provider: 'google_maps',
              skippedFeatures,
              geocodingEnabled: canGeocode,
              venueEnrichmentEnabled: canEnrichVenue,
              latitude,
              longitude
            }
          });
        } catch (recordError) {
          console.error('⚠️ [AutoEnrich] Failed to record budget exceeded event:', recordError);
          // Don't throw - continue with graceful degradation
        }

        return contactWithBudgetTracking;  // Save GPS only with budget tracking
      }

      // Step 2: Check AI budget (CONDITIONAL - only if auto-tagging enabled)
      const isAIAutoTaggingEnabled = userData?.settings?.locationFeatures?.autoTagging === true;
      let canUseAITagging = false;

      if (isAIAutoTaggingEnabled) {
        console.log('🔍 [AutoEnrich] Checking AI budget (auto-tagging enabled)');
        const aiAffordabilityCheck = await CostTrackingService.canAffordGeneric(
          userId,
          'AIUsage',         // ✅ Check AI limits (monthlyBillableRunsAI)
          0.0000002,         // Gemini 2.5 Flash cost per tag (negligible)
          true               // ✅ Requires billable AI run slot
        );

        if (aiAffordabilityCheck.canAfford) {
          canUseAITagging = true;
          console.log('✅ [AutoEnrich] AI auto-tagging enabled and budget available');
        } else {
          console.log('⚠️ [AutoEnrich] AI budget exceeded, skipping auto-tagging:', {
            reason: aiAffordabilityCheck.reason,
            userId,
            checkType: 'AIUsage'
          });
          // Continue with location enrichment, but skip AI tagging
        }
      } else {
        console.log('⏭️ [AutoEnrich] AI auto-tagging disabled in user settings');
      }

      // STEP 1: Reverse geocoding (GPS → address) - Only if enabled
      let addressData = null;
      let geocodeSuccess = false;
      let geocodeError = null;

      if (canGeocode) {
        const geocodeStartTime = Date.now();

        try {
          console.log('📍 [AutoEnrich] Step 1: Reverse geocoding...');

          // Use fallback API key (same pattern as geocode route)
          const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
          const placesClient = new OptimizedPlacesApiClient(apiKey);
          addressData = await placesClient.reverseGeocode(latitude, longitude);

          geocodeSuccess = true;

          console.log('✅ [AutoEnrich] Step 1 complete:', {
            city: addressData.city,
            country: addressData.country,
            duration: Date.now() - geocodeStartTime,
            sessionId: sessionId || 'none'
          });
        } catch (error) {
          geocodeError = error.message;
          console.error('⚠️ [AutoEnrich] Reverse geocoding failed:', error.message);
          // Continue without address data
        }

        // Record geocoding usage (session-based OR standalone)
        const geocodeDuration = Date.now() - geocodeStartTime;

        await CostTrackingService.recordUsage({
          userId,
          usageType: 'ApiUsage',
          feature: geocodeSuccess ? 'location_reverse_geocoding' : 'location_reverse_geocoding_failed',
          cost: geocodingCost,
          isBillableRun: true,
          provider: 'google_maps',
          sessionId: sessionId,  // null for standalone, sessionId for multi-step
          stepLabel: 'Step 1: Reverse Geocoding',
          metadata: {
            latitude,
            longitude,
            success: geocodeSuccess,
            ...(geocodeSuccess ? {
              city: addressData.city,
              country: addressData.country,
              formattedAddress: addressData.formattedAddress
            } : {
              error: geocodeError
            }),
            duration: geocodeDuration
          }
        });
      } else {
        console.log('⏭️ [AutoEnrich] Step 1: Reverse geocoding disabled, skipping');
      }

      // STEP 2: Get venue data (cache or API) - Only if enabled
      let venueResult = { venue: null, source: null, cost: 0 };

      if (canEnrichVenue) {
        venueResult = await this.getVenueData(latitude, longitude, userId, sessionId);
      } else {
        console.log('⏭️ [AutoEnrich] Step 2: Venue enrichment disabled, skipping');
      }

      // Enrich contact with address data (Step 1) and venue data (Step 2)
      const enrichedContact = {
        ...contact,
        location: {
          ...contact.location,
          // Add address data from reverse geocoding
          ...(addressData && {
            city: addressData.city,
            country: addressData.country,
            countryCode: addressData.countryCode,
            region: addressData.region,
            postalCode: addressData.postalCode,
            formattedAddress: addressData.formattedAddress
          })
        },
        metadata: {
          ...contact.metadata,

          // Budget tracking - enrichment succeeded
          enrichmentAttempted: true,
          budgetExceeded: false,
          budgetExceededReason: null,
          budgetExceededAt: null,
          skippedFeatures: [],

          // Add venue data if found
          ...(venueResult.venue && {
            venue: {
              ...venueResult.venue,
              source: venueResult.source,
              enrichedAt: new Date().toISOString(),
              enrichmentDuration: Date.now() - startTime,
              sessionId: sessionId || null  // Store session ID for tracking
            }
          })
        }
      };

      console.log('✅ [AutoEnrich] Success:', {
        geocodingEnabled: canGeocode,
        venueEnrichmentEnabled: canEnrichVenue,
        addressFound: !!addressData,
        city: addressData?.city,
        venueFound: !!venueResult.venue,
        venueName: venueResult.venue?.name,
        distance: venueResult.venue?.distance,
        source: venueResult.source,
        totalCost: (canGeocode ? geocodingCost : 0) + (venueResult.cost || 0),
        duration: Date.now() - startTime,
        sessionId: sessionId || 'none'
      });

      return enrichedContact;

    } catch (error) {
      console.error('❌ [AutoEnrich] Enrichment failed:', error);
      console.error('Stack:', error.stack);

      // Graceful degradation: return original contact
      return contact;
    }
  }

  /**
   * Get venue data from cache or Google Places API
   *
   * Cache Strategy:
   * - 100m grid precision (0.001 degrees)
   * - 15-30 minute random TTL
   * - 70%+ expected hit rate
   *
   * @param {number} latitude - GPS latitude
   * @param {number} longitude - GPS longitude
   * @param {string} userId - For cost tracking
   * @param {string|null} sessionId - Optional session ID for tracking
   * @returns {Promise<Object>} { venue, source: 'cache'|'api', cost }
   */
  static async getVenueData(latitude, longitude, userId, sessionId = null) {
    const cacheKey = this.getCacheKey(latitude, longitude);

    try {
      // Check Redis cache
      const cached = await redisClient.get(cacheKey);

      if (cached && cached.venue) {
        console.log('✅ [AutoEnrich] Cache HIT:', {
          cacheKey,
          venueName: cached.venue.name,
          cachedAt: cached.timestamp
        });

        // Record cache hit usage (session-based OR standalone)
        await CostTrackingService.recordUsage({
          userId,
          usageType: 'ApiUsage',
          feature: 'location_venue_search_cached',
          cost: 0,  // Cache hit = $0
          isBillableRun: false,
          provider: 'redis_cache',
          sessionId: sessionId,  // null for standalone, sessionId for multi-step
          stepLabel: 'Step 2: Venue Search (Cache Hit)',
          metadata: {
            cacheKey,
            venueName: cached.venue.name,
            cacheHit: true,
            cachedAt: cached.timestamp
          }
        });

        return {
          venue: cached.venue,
          source: 'cache',
          cost: 0
        };
      }

      console.log('⏭️ [AutoEnrich] Cache MISS, calling Google Places API:', cacheKey);

    } catch (cacheError) {
      console.warn('⚠️ [AutoEnrich] Redis cache error (bypassing):', cacheError.message);
      // Continue without cache
    }

    // Call Google Places Nearby Search API with session tracking
    const venue = await this.searchNearbyVenue(latitude, longitude, userId, sessionId);

    if (!venue) {
      return { venue: null, source: 'api', cost: 0 };
    }

    // Store in Redis cache with random TTL
    try {
      const ttl = this.getRandomTTL();
      await redisClient.set(
        cacheKey,
        {
          venue,
          timestamp: Date.now(),
          location: { latitude, longitude }
        },
        ttl
      );

      console.log('💾 [AutoEnrich] Cached venue:', {
        cacheKey,
        ttl: `${ttl}s (${Math.round(ttl / 60)}min)`,
        venueName: venue.name
      });
    } catch (cacheStoreError) {
      console.warn('⚠️ [AutoEnrich] Failed to store in cache:', cacheStoreError.message);
      // Continue even if caching fails
    }

    return {
      venue,
      source: 'api',
      cost: API_COSTS.GOOGLE_MAPS.PLACES_NEARBY_SEARCH.PER_REQUEST
    };
  }

  /**
   * Search for nearby venue using Google Places API
   *
   * Uses PlacesService.searchNearbyVenues() with optimized keywords
   *
   * @param {number} latitude
   * @param {number} longitude
   * @param {string} userId - For cost tracking
   * @param {string|null} sessionId - Optional session ID for tracking
   * @returns {Promise<Object|null>} Venue object or null
   */
  static async searchNearbyVenue(latitude, longitude, userId, sessionId = null) {
    const stepStartTime = Date.now();

    try {
      // Validate coordinates
      if (!latitude || !longitude) {
        console.warn('⚠️ [AutoEnrich] Invalid coordinates:', { latitude, longitude });
        return null;
      }

      // Keywords optimized for common meeting locations
      const keywords = [
        'conference center',
        'convention center',
        'hotel',
        'restaurant',
        'cafe',
        'bar',
        'office building',
        'coworking space',
        'event venue',
        'meeting room'
      ];

      console.log('🔍 [AutoEnrich] Calling PlacesService with:', {
        latitude,
        longitude,
        radius: 100,
        keywordCount: keywords.length,
        sessionId: sessionId || 'none'
      });

      const result = await PlacesService.searchNearbyVenues(userId, {
        latitude,      // Direct properties, not nested
        longitude,     // Direct properties, not nested
        radius: 100,   // 100 meters
        keywords,
        sessionId      // Pass sessionId to PlacesService for proper session tracking
      });

      // Note: Cost tracking is now handled by PlacesService.searchNearbyVenues()
      // No need for duplicate recording here

      if (result.success && result.venue) {
        return result.venue;
      }

      return null;

    } catch (apiError) {
      console.error('❌ [AutoEnrich] Google Places API error:', apiError);
      throw apiError;
    }
  }

  /**
   * Generate cache key with 100m grid precision
   *
   * Rounds coordinates to ~0.001 degrees (~100m precision)
   * This allows multiple contacts at the same venue to share cache
   *
   * Example:
   * - (37.7749123, -122.4194456) → "location:37.775:-122.419"
   * - (37.7750001, -122.4195000) → "location:37.775:-122.420" (different key)
   *
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {string} Cache key
   */
  static getCacheKey(lat, lng) {
    // Round to 3 decimal places (~111m precision at equator)
    const latRounded = Math.round(lat * 1000) / 1000;
    const lngRounded = Math.round(lng * 1000) / 1000;
    return `location:${latRounded}:${lngRounded}`;
  }

  /**
   * Get random TTL between min and max seconds
   *
   * Prevents thundering herd problem by spreading cache expirations
   *
   * Default: 15-30 minutes (900-1800 seconds)
   *
   * @param {number} min - Minimum TTL in seconds
   * @param {number} max - Maximum TTL in seconds
   * @returns {number} Random TTL in seconds
   */
  static getRandomTTL(min = 900, max = 1800) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  /**
   * Check if geocoding is enabled in user settings
   *
   * Requires BOTH:
   * - locationServicesEnabled: true (master toggle)
   * - locationFeatures.geocoding: true (feature toggle)
   *
   * Available for: Pro, Premium, Business, Enterprise
   * Cost: $0.005 per contact
   *
   * @param {Object} userData - User data object with settings
   * @returns {boolean} True if geocoding enabled
   */
  static isGeocodingEnabled(userData) {
    const settings = userData?.settings || {};

    const masterEnabled = settings.locationServicesEnabled === true;
    const geocodingEnabled = settings.locationFeatures?.geocoding === true;

    console.log('🔍 [Geocoding] Settings check:', {
      masterEnabled,
      geocodingEnabled,
      result: masterEnabled && geocodingEnabled
    });

    return masterEnabled && geocodingEnabled;
  }

  /**
   * Check if venue enrichment is enabled in user settings
   *
   * Requires BOTH:
   * - locationServicesEnabled: true (master toggle)
   * - locationFeatures.autoVenueEnrichment: true (feature toggle)
   *
   * Available for: Premium, Business, Enterprise
   * Cost: $0.032 per contact (additional to geocoding)
   *
   * @param {Object} userData - User data object with settings
   * @returns {boolean} True if venue enrichment enabled
   */
  static isVenueEnrichmentEnabled(userData) {
    const settings = userData?.settings || {};

    const masterEnabled = settings.locationServicesEnabled === true;
    const venueEnabled = settings.locationFeatures?.autoVenueEnrichment === true;

    console.log('🔍 [VenueEnrich] Settings check:', {
      masterEnabled,
      venueEnabled,
      result: masterEnabled && venueEnabled
    });

    return masterEnabled && venueEnabled;
  }

  /**
   * Check if any enrichment is enabled (geocoding OR venue enrichment)
   * @deprecated Use isGeocodingEnabled() and isVenueEnrichmentEnabled() instead
   * @param {Object} userData - User data object with settings
   * @returns {boolean} True if any enrichment enabled
   */
  static isEnrichmentEnabled(userData) {
    return this.isGeocodingEnabled(userData) || this.isVenueEnrichmentEnabled(userData);
  }

  /**
   * Clear cache for a specific location
   *
   * Useful for testing or forcing refresh
   *
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<boolean>} True if deleted
   */
  static async clearCache(latitude, longitude) {
    try {
      const cacheKey = this.getCacheKey(latitude, longitude);
      const result = await redisClient.delete(cacheKey);
      console.log('🗑️ [AutoEnrich] Cache cleared:', cacheKey);
      return result;
    } catch (error) {
      console.error('❌ [AutoEnrich] Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Clear all location caches
   *
   * WARNING: Use with caution! Clears all cached venues.
   *
   * @returns {Promise<number>} Number of keys deleted
   */
  static async clearAllCaches() {
    try {
      const result = await redisClient.clearPattern('location:*');
      console.log('🗑️ [AutoEnrich] All caches cleared:', result, 'keys');
      return result;
    } catch (error) {
      console.error('❌ [AutoEnrich] Failed to clear all caches:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   *
   * Useful for monitoring cache performance
   *
   * @returns {Promise<Object>} Cache stats
   */
  static async getCacheStats() {
    try {
      // This would require additional Redis commands
      // For now, return basic info
      return {
        pattern: 'location:*',
        ttlRange: '15-30 minutes',
        gridPrecision: '100m (~0.001 degrees)',
        estimatedHitRate: '70%'
      };
    } catch (error) {
      console.error('❌ [AutoEnrich] Failed to get cache stats:', error);
      return null;
    }
  }
}

export default LocationEnrichmentService;
