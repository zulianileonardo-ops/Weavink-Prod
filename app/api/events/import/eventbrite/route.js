/**
 * Eventbrite Import Route
 * POST /api/events/import/eventbrite
 *
 * Imports a discovered Eventbrite event to user's events.
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { EventbriteService } from '@/lib/services/serviceCalendar/server/eventbriteService';
import { hasCalendarFeature, CALENDAR_FEATURES } from '@/lib/services/serviceCalendar/client/constants/calendarConstants';

/**
 * POST - Import an Eventbrite event
 * Body: { eventId: string, isPublic?: boolean }
 */
export async function POST(request) {
    try {
        const session = await createApiSession(request);

        // Check feature access
        if (!hasCalendarFeature(session.subscriptionLevel, CALENDAR_FEATURES.EVENTBRITE_DISCOVERY)) {
            return NextResponse.json({
                error: 'Eventbrite discovery requires a Premium subscription or higher'
            }, { status: 403 });
        }

        // Parse request body
        const body = await request.json();
        const { eventId, isPublic = false } = body;

        if (!eventId) {
            return NextResponse.json({
                error: 'Event ID is required'
            }, { status: 400 });
        }

        // Check if user is admin for public events
        if (isPublic) {
            const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
            if (!adminEmails.includes(session.email)) {
                return NextResponse.json({
                    error: 'Only administrators can create public events'
                }, { status: 403 });
            }
        }

        // Get event details from Eventbrite
        const eventResult = await EventbriteService.getEventDetails(eventId);

        if (!eventResult.success) {
            return NextResponse.json({
                error: eventResult.error || 'Failed to fetch event from Eventbrite'
            }, { status: 400 });
        }

        // Import the event
        const importResult = await EventbriteService.importEvent(
            session.userId,
            eventResult.event,
            isPublic
        );

        if (!importResult.success) {
            if (importResult.alreadyExists) {
                return NextResponse.json({
                    success: false,
                    error: 'Event already imported',
                    alreadyExists: true,
                    eventId: importResult.eventId
                }, { status: 409 });
            }

            return NextResponse.json({
                success: false,
                error: importResult.error || 'Failed to import event'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            eventId: importResult.eventId,
            message: 'Event imported successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('[/api/events/import/eventbrite] Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to import event'
        }, { status: 500 });
    }
}
