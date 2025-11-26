// app/api/events/[eventId]/route.js
/**
 * Event CRUD API - Single event operations
 *
 * GET    /api/events/[eventId] - Get event details
 * PUT    /api/events/[eventId] - Update event
 * DELETE /api/events/[eventId] - Delete event
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { EventService } from '@/lib/services/serviceEvent/server/eventService';
import { hasEventFeature, EVENT_FEATURES } from '@/lib/services/serviceEvent/client/constants/eventConstants';

/**
 * GET /api/events/[eventId] - Get event details
 */
export async function GET(request, { params }) {
  const { eventId } = await params;
  console.log('[API] GET /api/events/:eventId -', eventId);

  try {
    const session = await createApiSession(request);

    // Check permission
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.BASIC_EVENTS)) {
      return NextResponse.json(
        { error: 'Event feature not available in your subscription plan' },
        { status: 403 }
      );
    }

    const event = await EventService.getEvent({ eventId, session });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get attendee count
    const attendeeCount = await EventService.getAttendeeCount({ eventId, session });

    return NextResponse.json({
      success: true,
      event,
      attendeeCount,
    });

  } catch (error) {
    console.error('[API] Error in GET /api/events/:eventId:', error);

    if (error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get event', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/[eventId] - Update event
 *
 * Body:
 * - name: string - Event name
 * - description: string - Event description
 * - startDate: ISO string - Event start date
 * - endDate: ISO string - Event end date
 * - location: object - Event location
 * - tags: string[] - Event tags
 */
export async function PUT(request, { params }) {
  const { eventId } = await params;
  console.log('[API] PUT /api/events/:eventId -', eventId);

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
    const eventData = body.event || body;

    const updatedEvent = await EventService.updateEvent({
      eventId,
      eventData,
      session,
    });

    console.log('[API] Event updated:', eventId);

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    });

  } catch (error) {
    console.error('[API] Error in PUT /api/events/:eventId:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (error.message.includes('Invalid event data')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update event', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[eventId] - Delete event
 */
export async function DELETE(request, { params }) {
  const { eventId } = await params;
  console.log('[API] DELETE /api/events/:eventId -', eventId);

  try {
    const session = await createApiSession(request);

    // Check permission
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.BASIC_EVENTS)) {
      return NextResponse.json(
        { error: 'Event feature not available in your subscription plan' },
        { status: 403 }
      );
    }

    const result = await EventService.deleteEvent({ eventId, session });

    console.log('[API] Event deleted:', eventId);

    return NextResponse.json({
      success: true,
      deleted: result.success,
    });

  } catch (error) {
    console.error('[API] Error in DELETE /api/events/:eventId:', error);

    if (error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete event', details: error.message },
      { status: 500 }
    );
  }
}
