/**
 * Event Discovery Route
 * GET /api/events/discover
 *
 * Discovers nearby events from various sources (Eventbrite, etc.)
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { EventbriteService } from '@/lib/services/serviceCalendar/server/eventbriteService';
import {
    hasCalendarFeature,
    CALENDAR_FEATURES,
    DISCOVERY_CONFIG
} from '@/lib/services/serviceCalendar/client/constants/calendarConstants';

/**
 * GET - Discover events near a location
 * Query params:
 *   - lat: Latitude (required)
 *   - lng: Longitude (required)
 *   - radius: Search radius in km (default: 25)
 *   - categories: Comma-separated category IDs
 *   - keyword: Search keyword
 *   - limit: Max results (default: 50)
 */
export async function GET(request) {
    try {
        const session = await createApiSession(request);

        // Check feature access
        if (!hasCalendarFeature(session.subscriptionLevel, CALENDAR_FEATURES.EVENTBRITE_DISCOVERY)) {
            return NextResponse.json({
                error: 'Event discovery requires a Premium subscription or higher'
            }, { status: 403 });
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const lat = parseFloat(searchParams.get('lat'));
        const lng = parseFloat(searchParams.get('lng'));
        const radius = parseInt(searchParams.get('radius')) || DISCOVERY_CONFIG.DEFAULT_RADIUS_KM;
        const categories = searchParams.get('categories')?.split(',').filter(Boolean);
        const keyword = searchParams.get('keyword');
        const limit = Math.min(
            parseInt(searchParams.get('limit')) || DISCOVERY_CONFIG.MAX_RESULTS,
            DISCOVERY_CONFIG.MAX_RESULTS
        );

        // Validate coordinates
        if (isNaN(lat) || isNaN(lng)) {
            return NextResponse.json({
                error: 'Latitude and longitude are required'
            }, { status: 400 });
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return NextResponse.json({
                error: 'Invalid coordinates'
            }, { status: 400 });
        }

        // Validate radius
        const validRadius = Math.min(Math.max(radius, DISCOVERY_CONFIG.MIN_RADIUS_KM), DISCOVERY_CONFIG.MAX_RADIUS_KM);

        // Build discovery query
        const query = {
            latitude: lat,
            longitude: lng,
            radius: validRadius,
            categories,
            keyword,
            limit
        };

        // Discover events from Eventbrite
        const eventbriteResult = await EventbriteService.discoverEvents(query);

        // If Eventbrite is configured, check which events are already imported
        if (eventbriteResult.success && eventbriteResult.events.length > 0) {
            const eventbriteIds = eventbriteResult.events.map(e => e.id);
            const alreadyImported = await EventbriteService.checkAlreadyImported(session.userId, eventbriteIds);

            // Mark events that are already imported
            eventbriteResult.events = eventbriteResult.events.map(event => ({
                ...event,
                alreadyImported: alreadyImported.has(event.id)
            }));
        }

        // Future: Combine results from multiple sources
        const allEvents = eventbriteResult.events || [];

        return NextResponse.json({
            success: true,
            events: allEvents,
            total: allEvents.length,
            hasMore: eventbriteResult.hasMore,
            sources: {
                eventbrite: {
                    success: eventbriteResult.success,
                    count: eventbriteResult.events?.length || 0,
                    error: eventbriteResult.error
                }
            },
            query: {
                latitude: lat,
                longitude: lng,
                radius: validRadius,
                categories,
                keyword
            }
        });

    } catch (error) {
        console.error('[/api/events/discover] Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to discover events'
        }, { status: 500 });
    }
}
