/**
 * Google Calendar Sync Service
 * Sprint 6: Event Discovery & Automation
 *
 * Syncs events from Google Calendar to Weavink.
 */

import { google } from 'googleapis';
import { adminDb } from '@/lib/firebaseAdmin';
import { GoogleCalendarOAuthService } from './googleCalendarOAuthService.js';
import { GeocodingService } from './geocodingService.js';
import { EventService } from '@/lib/services/serviceEvent/server/eventService.js';
import {
    SYNC_CONFIG,
    TAG_KEYWORDS,
    EVENT_SOURCES,
    CONNECTION_STATUS
} from '../client/constants/calendarConstants.js';

/**
 * @typedef {import('../shared/calendarTypes.js').SyncResult} SyncResult
 * @typedef {import('../shared/calendarTypes.js').SyncOptions} SyncOptions
 * @typedef {import('../shared/calendarTypes.js').GoogleCalendarEvent} GoogleCalendarEvent
 */

/**
 * GoogleCalendarSyncService - Syncs Google Calendar events to Weavink
 */
export class GoogleCalendarSyncService {

    /**
     * Sync events from Google Calendar
     * @param {string} userId - User ID
     * @param {SyncOptions} [options] - Sync options
     * @returns {Promise<SyncResult>}
     */
    static async syncEvents(userId, options = {}) {
        const result = {
            success: false,
            imported: 0,
            skipped: 0,
            updated: 0,
            failed: 0,
            errors: [],
            syncedAt: new Date()
        };

        try {
            // Update status to syncing
            await adminDb.collection('calendar_tokens').doc(userId).update({
                status: CONNECTION_STATUS.SYNCING
            });

            // Get authenticated client
            const authResult = await GoogleCalendarOAuthService.getAuthenticatedClient(userId);
            if (!authResult.success) {
                result.errors.push({
                    eventId: '',
                    eventTitle: '',
                    error: authResult.error,
                    code: 'AUTH_ERROR'
                });
                return result;
            }

            const calendar = google.calendar({ version: 'v3', auth: authResult.client });

            // Calculate sync window
            const startDate = options.startDate || new Date();
            const endDate = options.endDate || new Date(Date.now() + SYNC_CONFIG.SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);

            // Fetch events from Google Calendar
            const eventsResponse = await calendar.events.list({
                calendarId: 'primary',
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                maxResults: SYNC_CONFIG.MAX_EVENTS_PER_SYNC,
                singleEvents: true,
                orderBy: 'startTime'
            });

            const googleEvents = eventsResponse.data.items || [];
            console.log(`[GoogleCalendarSync] Found ${googleEvents.length} events for user ${userId}`);

            // Process each event
            for (const googleEvent of googleEvents) {
                try {
                    const importResult = await this.importEvent(userId, googleEvent, options);

                    if (importResult.imported) {
                        result.imported++;
                    } else if (importResult.updated) {
                        result.updated++;
                    } else if (importResult.skipped) {
                        result.skipped++;
                    }
                } catch (error) {
                    result.failed++;
                    result.errors.push({
                        eventId: googleEvent.id,
                        eventTitle: googleEvent.summary || 'Untitled',
                        error: error.message,
                        code: 'IMPORT_ERROR'
                    });
                }
            }

            // Update last sync time
            await GoogleCalendarOAuthService.updateLastSyncTime(userId);

            result.success = true;
            result.nextSyncToken = eventsResponse.data.nextSyncToken;

            console.log(`[GoogleCalendarSync] Sync complete for user ${userId}: ` +
                `${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed`);

        } catch (error) {
            console.error('[GoogleCalendarSync] Sync failed:', error);
            result.errors.push({
                eventId: '',
                eventTitle: '',
                error: error.message,
                code: 'SYNC_ERROR'
            });

            // Update status to error
            try {
                await adminDb.collection('calendar_tokens').doc(userId).update({
                    status: CONNECTION_STATUS.ERROR
                });
            } catch (e) {
                // Ignore
            }
        }

        return result;
    }

    /**
     * Import a single Google Calendar event
     * @param {string} userId
     * @param {GoogleCalendarEvent} googleEvent
     * @param {SyncOptions} options
     * @returns {Promise<{imported: boolean, updated: boolean, skipped: boolean, eventId?: string}>}
     */
    static async importEvent(userId, googleEvent, options = {}) {
        // Skip cancelled events
        if (googleEvent.status === 'cancelled') {
            return { imported: false, updated: false, skipped: true };
        }

        // Skip events without a title
        if (!googleEvent.summary) {
            return { imported: false, updated: false, skipped: true };
        }

        // Check if event already exists
        const existingEvents = await adminDb.collection('events')
            .where('userId', '==', userId)
            .where('source', '==', EVENT_SOURCES.GOOGLE_CALENDAR)
            .where('sourceId', '==', googleEvent.id)
            .limit(1)
            .get();

        if (!existingEvents.empty && options.skipExisting !== false) {
            // Could update existing event here if needed
            return { imported: false, updated: false, skipped: true };
        }

        // Parse dates
        const startDate = this.parseGoogleDateTime(googleEvent.start);
        const endDate = this.parseGoogleDateTime(googleEvent.end);

        if (!startDate) {
            return { imported: false, updated: false, skipped: true };
        }

        // Geocode location if present
        let location = null;
        if (googleEvent.location) {
            if (GeocodingService.looksGeocodable(googleEvent.location)) {
                const geocodeResult = await GeocodingService.geocodeAddress(googleEvent.location);
                if (geocodeResult.success) {
                    location = {
                        address: googleEvent.location,
                        latitude: geocodeResult.location.latitude,
                        longitude: geocodeResult.location.longitude,
                        venue: geocodeResult.location.venue || null,
                        city: geocodeResult.location.city || null,
                        country: geocodeResult.location.country || null,
                        placeId: geocodeResult.location.placeId || null
                    };
                }
            }

            // Check if it's an online event
            if (GeocodingService.isOnlineLocation(googleEvent.location)) {
                location = {
                    address: googleEvent.location,
                    isOnline: true,
                    onlineUrl: this.extractUrl(googleEvent)
                };
            }
        }

        // Extract online meeting URL if available
        const onlineUrl = this.extractUrl(googleEvent);
        if (onlineUrl && !location) {
            location = {
                isOnline: true,
                onlineUrl: onlineUrl
            };
        }

        // If requireLocation is set and no location found, skip
        // (We'll keep events even without location for now)

        // Extract tags from title and description
        const tags = this.extractTags(googleEvent);

        // Create event data
        const eventData = {
            name: googleEvent.summary,
            description: googleEvent.description || '',
            startDate: startDate,
            endDate: endDate || startDate,
            location: location,
            source: EVENT_SOURCES.GOOGLE_CALENDAR,
            sourceId: googleEvent.id,
            sourceUrl: googleEvent.htmlLink,
            tags: tags,
            isRecurring: !!googleEvent.recurringEventId,
            isPublic: false // User's personal events are private
        };

        // Create event using EventService
        const session = { userId, subscriptionLevel: 'pro' }; // Assume pro for calendar sync
        const createResult = await EventService.createEvent({ eventData, session });

        if (createResult.event) {
            return { imported: true, updated: false, skipped: false, eventId: createResult.event.id };
        }

        return { imported: false, updated: false, skipped: true };
    }

    /**
     * Parse Google DateTime object
     * @param {Object} googleDateTime
     * @returns {Date|null}
     */
    static parseGoogleDateTime(googleDateTime) {
        if (!googleDateTime) return null;

        if (googleDateTime.dateTime) {
            return new Date(googleDateTime.dateTime);
        }

        if (googleDateTime.date) {
            // All-day event - date only
            return new Date(googleDateTime.date);
        }

        return null;
    }

    /**
     * Extract online meeting URL from event
     * @param {GoogleCalendarEvent} googleEvent
     * @returns {string|null}
     */
    static extractUrl(googleEvent) {
        // Check conference data first
        if (googleEvent.conferenceData?.entryPoints) {
            const videoEntry = googleEvent.conferenceData.entryPoints.find(
                ep => ep.entryPointType === 'video'
            );
            if (videoEntry) {
                return videoEntry.uri;
            }
        }

        // Check location for URL
        if (googleEvent.location) {
            const urlMatch = googleEvent.location.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
                return urlMatch[0];
            }
        }

        // Check description for URL
        if (googleEvent.description) {
            const urlMatch = googleEvent.description.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
                return urlMatch[0];
            }
        }

        return null;
    }

    /**
     * Extract tags from event title and description
     * @param {GoogleCalendarEvent} googleEvent
     * @returns {string[]}
     */
    static extractTags(googleEvent) {
        const text = `${googleEvent.summary || ''} ${googleEvent.description || ''}`.toLowerCase();
        const tags = new Set();

        for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                tags.add(tag);
            }
        }

        return Array.from(tags);
    }

    /**
     * Get list of user's Google Calendars
     * @param {string} userId
     * @returns {Promise<{success: boolean, calendars?: Array, error?: string}>}
     */
    static async getUserCalendars(userId) {
        try {
            const authResult = await GoogleCalendarOAuthService.getAuthenticatedClient(userId);
            if (!authResult.success) {
                return { success: false, error: authResult.error };
            }

            const calendar = google.calendar({ version: 'v3', auth: authResult.client });
            const response = await calendar.calendarList.list();

            const calendars = (response.data.items || []).map(cal => ({
                id: cal.id,
                name: cal.summary,
                description: cal.description,
                primary: cal.primary || false,
                backgroundColor: cal.backgroundColor,
                accessRole: cal.accessRole
            }));

            return { success: true, calendars };

        } catch (error) {
            console.error('[GoogleCalendarSync] Failed to get calendars:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if user should skip personal events (basic heuristics)
     * @param {GoogleCalendarEvent} googleEvent
     * @returns {boolean}
     */
    static looksLikePersonalEvent(googleEvent) {
        const title = (googleEvent.summary || '').toLowerCase();

        const personalKeywords = [
            'dentist', 'doctor', 'appointment', 'haircut', 'gym',
            'lunch', 'dinner', 'breakfast', 'pick up', 'drop off',
            'birthday', 'anniversary', 'vacation', 'holiday', 'off',
            'personal', 'private', 'family', 'home'
        ];

        return personalKeywords.some(keyword => title.includes(keyword));
    }

    /**
     * Run sync for all connected users (for scheduled sync)
     * @returns {Promise<{total: number, synced: number, failed: number, errors: Array}>}
     */
    static async syncAllUsers() {
        const result = {
            total: 0,
            synced: 0,
            failed: 0,
            errors: []
        };

        try {
            const userIds = await GoogleCalendarOAuthService.getConnectedUserIds();
            result.total = userIds.length;

            console.log(`[GoogleCalendarSync] Starting batch sync for ${userIds.length} users`);

            for (const userId of userIds) {
                try {
                    const syncResult = await this.syncEvents(userId);
                    if (syncResult.success) {
                        result.synced++;
                    } else {
                        result.failed++;
                        result.errors.push({
                            userId,
                            error: syncResult.errors[0]?.error || 'Unknown error'
                        });
                    }
                } catch (error) {
                    result.failed++;
                    result.errors.push({
                        userId,
                        error: error.message
                    });
                }

                // Small delay between users to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`[GoogleCalendarSync] Batch sync complete: ` +
                `${result.synced}/${result.total} users synced, ${result.failed} failed`);

        } catch (error) {
            console.error('[GoogleCalendarSync] Batch sync error:', error);
            result.errors.push({
                userId: '',
                error: error.message
            });
        }

        return result;
    }
}

export default GoogleCalendarSyncService;
