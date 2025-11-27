/**
 * Eventbrite Service
 * Sprint 6: Event Discovery & Automation
 *
 * Discovers and imports events from Eventbrite.
 */

import { adminDb } from '@/lib/firebaseAdmin';
import { EventService } from '@/lib/services/serviceEvent/server/eventService.js';
import {
    EVENTBRITE_CONFIG,
    TAG_KEYWORDS,
    EVENT_SOURCES
} from '../client/constants/calendarConstants.js';

/**
 * @typedef {import('../shared/calendarTypes.js').EventbriteEvent} EventbriteEvent
 * @typedef {import('../shared/calendarTypes.js').DiscoveryQuery} DiscoveryQuery
 * @typedef {import('../shared/calendarTypes.js').DiscoveryResult} DiscoveryResult
 * @typedef {import('../shared/calendarTypes.js').DiscoveredEvent} DiscoveredEvent
 */

const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;

/**
 * EventbriteService - Discovers events from Eventbrite
 */
export class EventbriteService {

    /**
     * Check if Eventbrite API is configured
     * @returns {boolean}
     */
    static isConfigured() {
        return !!EVENTBRITE_API_KEY;
    }

    /**
     * Discover events near a location
     * @param {DiscoveryQuery} query
     * @returns {Promise<DiscoveryResult>}
     */
    static async discoverEvents(query) {
        if (!this.isConfigured()) {
            return {
                success: false,
                events: [],
                total: 0,
                hasMore: false,
                source: 'eventbrite',
                error: 'Eventbrite API not configured'
            };
        }

        try {
            const { latitude, longitude, radius = 25, categories, startDate, keyword, limit = 50 } = query;

            // Build search parameters
            const params = new URLSearchParams({
                'location.latitude': latitude.toString(),
                'location.longitude': longitude.toString(),
                'location.within': `${radius}km`,
                'start_date.range_start': (startDate || new Date()).toISOString(),
                'sort_by': 'date',
                'expand': 'venue,category,logo'
            });

            // Add categories filter
            if (categories && categories.length > 0) {
                params.append('categories', categories.join(','));
            } else {
                params.append('categories', EVENTBRITE_CONFIG.DEFAULT_CATEGORIES.join(','));
            }

            // Add keyword search
            if (keyword) {
                params.append('q', keyword);
            }

            const response = await fetch(
                `${EVENTBRITE_CONFIG.API_BASE_URL}/events/search/?${params.toString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${EVENTBRITE_API_KEY}`
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[EventbriteService] API error:', response.status, errorData);
                return {
                    success: false,
                    events: [],
                    total: 0,
                    hasMore: false,
                    source: 'eventbrite',
                    error: errorData.error_description || `API error: ${response.status}`
                };
            }

            const data = await response.json();
            const eventbriteEvents = data.events || [];

            // Convert to our format
            const events = eventbriteEvents
                .slice(0, limit)
                .map(event => this.convertToDiscoveredEvent(event))
                .filter(event => event !== null);

            return {
                success: true,
                events,
                total: data.pagination?.object_count || events.length,
                hasMore: data.pagination?.has_more_items || false,
                source: 'eventbrite'
            };

        } catch (error) {
            console.error('[EventbriteService] Discovery error:', error);
            return {
                success: false,
                events: [],
                total: 0,
                hasMore: false,
                source: 'eventbrite',
                error: error.message
            };
        }
    }

    /**
     * Convert Eventbrite event to DiscoveredEvent format
     * @param {EventbriteEvent} ebEvent
     * @returns {DiscoveredEvent|null}
     */
    static convertToDiscoveredEvent(ebEvent) {
        try {
            const location = this.parseVenue(ebEvent.venue);

            return {
                id: ebEvent.id,
                source: EVENT_SOURCES.EVENTBRITE,
                name: ebEvent.name?.text || 'Untitled Event',
                description: ebEvent.description?.text?.substring(0, 500) || '',
                startDate: new Date(ebEvent.start?.utc || ebEvent.start?.local),
                endDate: new Date(ebEvent.end?.utc || ebEvent.end?.local),
                location: location,
                url: ebEvent.url,
                imageUrl: ebEvent.logo?.original?.url || ebEvent.logo?.url,
                tags: this.extractTags(ebEvent),
                isFree: ebEvent.is_free || false,
                attendeeCount: ebEvent.capacity,
                alreadyImported: false // Will be checked when displaying
            };
        } catch (error) {
            console.error('[EventbriteService] Failed to convert event:', error);
            return null;
        }
    }

    /**
     * Parse Eventbrite venue to location format
     * @param {Object} venue
     * @returns {Object|null}
     */
    static parseVenue(venue) {
        if (!venue) return null;

        const location = {
            address: venue.address?.localized_address_display || '',
            venue: venue.name,
            city: venue.address?.city,
            region: venue.address?.region,
            country: venue.address?.country,
            postalCode: venue.address?.postal_code
        };

        // Add coordinates if available
        if (venue.latitude && venue.longitude) {
            location.latitude = parseFloat(venue.latitude);
            location.longitude = parseFloat(venue.longitude);
        }

        return location;
    }

    /**
     * Extract tags from Eventbrite event
     * @param {EventbriteEvent} ebEvent
     * @returns {string[]}
     */
    static extractTags(ebEvent) {
        const tags = new Set();

        // Add category as tag
        if (ebEvent.category?.name) {
            const categoryName = ebEvent.category.name.toLowerCase();
            if (categoryName.includes('business')) tags.add('business');
            if (categoryName.includes('tech') || categoryName.includes('science')) tags.add('tech');
        }

        // Extract from title and description
        const text = `${ebEvent.name?.text || ''} ${ebEvent.description?.text || ''}`.toLowerCase();
        for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                tags.add(tag);
            }
        }

        return Array.from(tags);
    }

    /**
     * Import a discovered event to Weavink
     * @param {string} userId
     * @param {DiscoveredEvent} discoveredEvent
     * @param {boolean} [isPublic=false] - Make event public (admin only)
     * @returns {Promise<{success: boolean, eventId?: string, error?: string, alreadyExists?: boolean}>}
     */
    static async importEvent(userId, discoveredEvent, isPublic = false) {
        try {
            // Check if already imported
            const existingEvents = await adminDb.collection('events')
                .where('userId', '==', userId)
                .where('source', '==', EVENT_SOURCES.EVENTBRITE)
                .where('sourceId', '==', discoveredEvent.id)
                .limit(1)
                .get();

            if (!existingEvents.empty) {
                return {
                    success: false,
                    alreadyExists: true,
                    eventId: existingEvents.docs[0].id
                };
            }

            // Create event data
            const eventData = {
                name: discoveredEvent.name,
                description: discoveredEvent.description,
                startDate: discoveredEvent.startDate,
                endDate: discoveredEvent.endDate,
                location: discoveredEvent.location,
                source: EVENT_SOURCES.EVENTBRITE,
                sourceId: discoveredEvent.id,
                sourceUrl: discoveredEvent.url,
                tags: discoveredEvent.tags,
                isPublic: isPublic
            };

            // Create using EventService
            const session = { userId, subscriptionLevel: 'pro' };
            const result = await EventService.createEvent({ eventData, session });

            if (result.event) {
                return {
                    success: true,
                    eventId: result.event.id
                };
            }

            return {
                success: false,
                error: 'Failed to create event'
            };

        } catch (error) {
            console.error('[EventbriteService] Import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get event details from Eventbrite
     * @param {string} eventId - Eventbrite event ID
     * @returns {Promise<{success: boolean, event?: DiscoveredEvent, error?: string}>}
     */
    static async getEventDetails(eventId) {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Eventbrite API not configured'
            };
        }

        try {
            const response = await fetch(
                `${EVENTBRITE_CONFIG.API_BASE_URL}/events/${eventId}/?expand=venue,category,logo`,
                {
                    headers: {
                        'Authorization': `Bearer ${EVENTBRITE_API_KEY}`
                    }
                }
            );

            if (!response.ok) {
                return {
                    success: false,
                    error: `API error: ${response.status}`
                };
            }

            const ebEvent = await response.json();
            const event = this.convertToDiscoveredEvent(ebEvent);

            if (!event) {
                return {
                    success: false,
                    error: 'Failed to parse event'
                };
            }

            return {
                success: true,
                event
            };

        } catch (error) {
            console.error('[EventbriteService] Get event error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check which events are already imported for a user
     * @param {string} userId
     * @param {string[]} eventbriteIds
     * @returns {Promise<Set<string>>} Set of already imported Eventbrite IDs
     */
    static async checkAlreadyImported(userId, eventbriteIds) {
        const imported = new Set();

        if (eventbriteIds.length === 0) return imported;

        try {
            // Firestore 'in' queries are limited to 10 items
            const batches = [];
            for (let i = 0; i < eventbriteIds.length; i += 10) {
                batches.push(eventbriteIds.slice(i, i + 10));
            }

            for (const batch of batches) {
                const snapshot = await adminDb.collection('events')
                    .where('userId', '==', userId)
                    .where('source', '==', EVENT_SOURCES.EVENTBRITE)
                    .where('sourceId', 'in', batch)
                    .select('sourceId')
                    .get();

                snapshot.docs.forEach(doc => {
                    const sourceId = doc.data().sourceId;
                    if (sourceId) imported.add(sourceId);
                });
            }

        } catch (error) {
            console.error('[EventbriteService] Check imported error:', error);
        }

        return imported;
    }

    /**
     * Search events by keyword
     * @param {string} keyword
     * @param {Object} [options]
     * @returns {Promise<DiscoveryResult>}
     */
    static async searchEvents(keyword, options = {}) {
        return this.discoverEvents({
            latitude: options.latitude || 45.1885,  // Default to Grenoble
            longitude: options.longitude || 5.7245,
            radius: options.radius || 50,
            keyword,
            limit: options.limit || 20
        });
    }
}

export default EventbriteService;
