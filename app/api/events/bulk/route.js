// app/api/events/bulk/route.js
/**
 * Bulk Event Import API
 *
 * POST /api/events/bulk - Import multiple events at once
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { EventService } from '@/lib/services/serviceEvent/server/eventService';
import { AdminService } from '@/lib/services/serviceAdmin/server/adminService';
import { hasEventFeature, EVENT_FEATURES } from '@/lib/services/serviceEvent/client/constants/eventConstants';

/**
 * POST /api/events/bulk - Bulk import events
 *
 * Body:
 * - events: Array of event objects
 *
 * Requires: Event feature enabled
 * Admin required if any events have isPublic: true
 */
export async function POST(request) {
  console.log('[API] POST /api/events/bulk');

  try {
    const session = await createApiSession(request);

    // Check permission
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.BASIC_EVENTS)) {
      return NextResponse.json(
        { error: 'Event feature not available in your subscription plan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { events } = body;

    // Validation
    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Request body must contain an "events" array' },
        { status: 400 }
      );
    }

    if (events.length === 0) {
      return NextResponse.json(
        { error: 'Events array cannot be empty' },
        { status: 400 }
      );
    }

    if (events.length > 100) {
      return NextResponse.json(
        { error: 'Cannot import more than 100 events at once' },
        { status: 400 }
      );
    }

    // Admin-only check for public events
    const hasPublicEvents = events.some(e => e.isPublic === true);
    if (hasPublicEvents) {
      if (!AdminService.isServerAdmin(session.email)) {
        return NextResponse.json(
          { error: 'Only administrators can create public events' },
          { status: 403 }
        );
      }
      console.log('[API] Admin bulk importing', events.filter(e => e.isPublic).length, 'public events');
    }

    console.log('[API] Importing', events.length, 'events');

    // Bulk create (validation happens in EventService.createEvent)
    const results = await EventService.bulkCreateEvents({ events, session });

    console.log('[API] Bulk import complete:', {
      success: results.success,
      failed: results.failed
    });

    return NextResponse.json({
      success: true,
      imported: results.success,
      failed: results.failed,
      events: results.events,
      errors: results.errors
    }, { status: 201 });

  } catch (error) {
    console.error('[API] Error in POST /api/events/bulk:', error);

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to import events', details: error.message },
      { status: 500 }
    );
  }
}
