/**
 * Geocoding Service
 * Sprint 6: Event Discovery & Automation
 *
 * Converts addresses to coordinates and vice versa using Google Geocoding API.
 */

/**
 * @typedef {import('../shared/calendarTypes.js').GeocodedLocation} GeocodedLocation
 * @typedef {import('../shared/calendarTypes.js').GeocodeResult} GeocodeResult
 */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

// Rate limiting - max 50 requests per second for Google Geocoding API
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 20; // 20ms = 50 requests/second

/**
 * GeocodingService - Converts addresses to coordinates and vice versa
 */
export class GeocodingService {

    /**
     * Geocode an address string to coordinates
     * @param {string} addressString - Address to geocode
     * @returns {Promise<GeocodeResult>}
     */
    static async geocodeAddress(addressString) {
        if (!addressString || typeof addressString !== 'string') {
            return {
                success: false,
                error: 'Invalid address string',
                errorCode: 'INVALID_INPUT'
            };
        }

        const trimmedAddress = addressString.trim();
        if (trimmedAddress.length < 3) {
            return {
                success: false,
                error: 'Address too short',
                errorCode: 'INVALID_INPUT'
            };
        }

        // Check for online/virtual events
        if (this.isOnlineLocation(trimmedAddress)) {
            return {
                success: false,
                error: 'Online/virtual event - no physical location',
                errorCode: 'ONLINE_EVENT'
            };
        }

        try {
            // Rate limiting
            await this.waitForRateLimit();

            const url = new URL(GEOCODING_API_URL);
            url.searchParams.append('address', trimmedAddress);
            url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

            const response = await fetch(url.toString());
            const data = await response.json();

            if (data.status === 'OK' && data.results.length > 0) {
                const result = data.results[0];
                const location = this.parseGeocodeResult(result, trimmedAddress);

                return {
                    success: true,
                    location
                };
            }

            // Handle specific error codes
            const errorMessages = {
                'ZERO_RESULTS': 'No results found for this address',
                'OVER_DAILY_LIMIT': 'API quota exceeded',
                'OVER_QUERY_LIMIT': 'Too many requests',
                'REQUEST_DENIED': 'API key invalid or restricted',
                'INVALID_REQUEST': 'Invalid address format',
                'UNKNOWN_ERROR': 'Server error, try again'
            };

            return {
                success: false,
                error: errorMessages[data.status] || `Geocoding failed: ${data.status}`,
                errorCode: data.status
            };

        } catch (error) {
            console.error('[GeocodingService] geocodeAddress error:', error);
            return {
                success: false,
                error: error.message || 'Network error during geocoding',
                errorCode: 'NETWORK_ERROR'
            };
        }
    }

    /**
     * Reverse geocode coordinates to address
     * @param {number} latitude
     * @param {number} longitude
     * @returns {Promise<GeocodeResult>}
     */
    static async reverseGeocode(latitude, longitude) {
        if (!this.isValidCoordinate(latitude, longitude)) {
            return {
                success: false,
                error: 'Invalid coordinates',
                errorCode: 'INVALID_INPUT'
            };
        }

        try {
            // Rate limiting
            await this.waitForRateLimit();

            const url = new URL(GEOCODING_API_URL);
            url.searchParams.append('latlng', `${latitude},${longitude}`);
            url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

            const response = await fetch(url.toString());
            const data = await response.json();

            if (data.status === 'OK' && data.results.length > 0) {
                const result = data.results[0];
                const location = this.parseGeocodeResult(result, result.formatted_address);

                // Override with exact coordinates
                location.latitude = latitude;
                location.longitude = longitude;

                return {
                    success: true,
                    location
                };
            }

            return {
                success: false,
                error: `Reverse geocoding failed: ${data.status}`,
                errorCode: data.status
            };

        } catch (error) {
            console.error('[GeocodingService] reverseGeocode error:', error);
            return {
                success: false,
                error: error.message || 'Network error during reverse geocoding',
                errorCode: 'NETWORK_ERROR'
            };
        }
    }

    /**
     * Parse Google Geocode API result into GeocodedLocation
     * @param {Object} result - Google Geocode API result
     * @param {string} originalAddress - Original address string
     * @returns {GeocodedLocation}
     */
    static parseGeocodeResult(result, originalAddress) {
        const location = {
            address: originalAddress,
            formattedAddress: result.formatted_address,
            latitude: result.geometry.location.lat,
            longitude: result.geometry.location.lng,
            placeId: result.place_id
        };

        // Extract address components
        for (const component of result.address_components || []) {
            const types = component.types;

            if (types.includes('locality')) {
                location.city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
                location.region = component.long_name;
            } else if (types.includes('country')) {
                location.country = component.long_name;
                location.countryCode = component.short_name;
            } else if (types.includes('postal_code')) {
                location.postalCode = component.long_name;
            } else if (types.includes('establishment') || types.includes('point_of_interest')) {
                location.venue = component.long_name;
            }
        }

        // Try to extract venue from first part of address if not found
        if (!location.venue && originalAddress) {
            const venuePart = originalAddress.split(',')[0].trim();
            // If it doesn't look like a street address, it might be a venue
            if (venuePart && !/^\d+\s/.test(venuePart) && venuePart.length > 3) {
                location.venue = venuePart;
            }
        }

        return location;
    }

    /**
     * Check if location string indicates an online/virtual event
     * @param {string} locationString
     * @returns {boolean}
     */
    static isOnlineLocation(locationString) {
        const onlineKeywords = [
            'online', 'virtual', 'remote', 'webinar', 'zoom', 'teams',
            'google meet', 'skype', 'webex', 'livestream', 'streaming',
            'https://', 'http://', 'meet.google', 'zoom.us'
        ];

        const lower = locationString.toLowerCase();
        return onlineKeywords.some(keyword => lower.includes(keyword));
    }

    /**
     * Validate coordinate values
     * @param {number} lat
     * @param {number} lng
     * @returns {boolean}
     */
    static isValidCoordinate(lat, lng) {
        return (
            typeof lat === 'number' &&
            typeof lng === 'number' &&
            !isNaN(lat) &&
            !isNaN(lng) &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180
        );
    }

    /**
     * Simple rate limiting to avoid hitting API limits
     * @returns {Promise<void>}
     */
    static async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;

        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            await new Promise(resolve =>
                setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
            );
        }

        lastRequestTime = Date.now();
    }

    /**
     * Batch geocode multiple addresses
     * @param {string[]} addresses - Array of addresses
     * @returns {Promise<Map<string, GeocodeResult>>}
     */
    static async batchGeocode(addresses) {
        const results = new Map();

        for (const address of addresses) {
            const result = await this.geocodeAddress(address);
            results.set(address, result);

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        return results;
    }

    /**
     * Determine if an address looks geocodable (has enough info)
     * @param {string} address
     * @returns {boolean}
     */
    static looksGeocodable(address) {
        if (!address || typeof address !== 'string') return false;

        const trimmed = address.trim();

        // Too short
        if (trimmed.length < 5) return false;

        // Looks like online
        if (this.isOnlineLocation(trimmed)) return false;

        // Has some indication of a physical location
        const hasPhysicalIndicators = (
            /\d/.test(trimmed) || // Has numbers (street address)
            /,/.test(trimmed) ||   // Has commas (city, country)
            /(street|st|avenue|ave|road|rd|boulevard|blvd|way|drive|dr|lane|ln|place|pl|square|sq)/i.test(trimmed) ||
            /(city|town|village|france|usa|uk|germany|spain|italy)/i.test(trimmed)
        );

        return hasPhysicalIndicators;
    }
}

export default GeocodingService;
