// app/api/events/route.js
/**
 * Events API - List and Create
 *
 * GET  /api/events - List user's events with filtering
 * POST /api/events - Create a new event
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { EventService } from '@/lib/services/serviceEvent/server/eventService';
import { hasEventFeature, EVENT_FEATURES } from '@/lib/services/serviceEvent/client/constants/eventConstants';

/**
 * GET /api/events - List events with optional filtering
 *
 * Query params:
 * - source: Filter by source (manual, google_calendar, etc.)
 * - startAfter: Filter events starting after this date (ISO string)
 * - startBefore: Filter events starting before this date (ISO string)
 * - upcoming: If 'true', only return upcoming events
 * - limit: Maximum events to return (default: 50)
 */
export async function GET(request) {
  console.log('[API] GET /api/events - Request received');

  try {
    const session = await createApiSession(request);
    console.log('[API] Session created for user:', session.userId);

    // Check permission
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.BASIC_EVENTS)) {
      return NextResponse.json(
        { error: 'Event feature not available in your subscription plan' },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const startAfter = searchParams.get('startAfter');
    const startBefore = searchParams.get('startBefore');
    const upcoming = searchParams.get('upcoming') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let result;

    if (upcoming) {
      // Get upcoming events only
      const events = await EventService.getUpcomingEvents({ session, limit });
      result = { events, total: events.length, hasMore: events.length === limit };
    } else {
      // Get all events with filters
      result = await EventService.getUserEvents({
        session,
        options: {
          source,
          startAfter,
          startBefore,
          limit,
        },
      });
    }

    console.log('[API] Returning events:', result.total);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[API] Error in GET /api/events:', error);

    if (error.message.includes('Authorization') || error.message.includes('token') || error.message.includes('User account not found')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get events', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events - Create a new event
 *
 * Body:
 * - name: string (required) - Event name
 * - description: string - Event description
 * - startDate: ISO string (required) - Event start date
 * - endDate: ISO string - Event end date
 * - location: { address, venue, latitude, longitude, ... }
 * - source: string - Event source (default: 'manual')
 * - tags: string[] - Event tags
 */
export async function POST(request) {
  console.log('[API] POST /api/events - Request received');

  try {
    const session = await createApiSession(request);
    console.log('[API] Session created for user:', session.userId);

    // Check permission
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.BASIC_EVENTS)) {
      return NextResponse.json(
        { error: 'Event feature not available in your subscription plan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const eventData = body.event || body;

    // Basic validation
    if (!eventData.name) {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      );
    }

    if (!eventData.startDate) {
      return NextResponse.json(
        { error: 'Start date is required' },
        { status: 400 }
      );
    }

    console.log('[API] Creating event:', eventData.name);

    const event = await EventService.createEvent({ eventData, session });

    console.log('[API] Event created:', event.id);

    return NextResponse.json(
      { success: true, event },
      { status: 201 }
    );

  } catch (error) {
    console.error('[API] Error in POST /api/events:', error);

    if (error.message.includes('Invalid event data')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error.message.includes('not available in your subscription')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to create event', details: error.message },
      { status: 500 }
    );
  }
}
