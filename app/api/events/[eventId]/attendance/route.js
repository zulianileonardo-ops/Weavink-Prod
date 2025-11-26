// app/api/events/[eventId]/attendance/route.js
/**
 * Attendance API - Manage event participation
 *
 * POST   /api/events/[eventId]/attendance - Register attendance
 * PUT    /api/events/[eventId]/attendance - Update attendance details
 * DELETE /api/events/[eventId]/attendance - Remove attendance
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { EventService } from '@/lib/services/serviceEvent/server/eventService';
import { VisibilityService } from '@/lib/services/serviceEvent/server/visibilityService';
import {
  hasEventFeature,
  EVENT_FEATURES,
  EVENT_VISIBILITY_MODES,
} from '@/lib/services/serviceEvent/client/constants/eventConstants';

/**
 * POST /api/events/[eventId]/attendance - Register attendance
 *
 * Body:
 * - contactId: string (required) - Contact to register
 * - visibility: string - Visibility mode (public, friends, private, ghost)
 * - intent: string - Participation intent
 * - lookingFor: string[] - What they're looking for
 * - offering: string[] - What they're offering
 * - status: string - Attendance status (confirmed, maybe, declined)
 */
export async function POST(request, { params }) {
  const { eventId } = await params;
  console.log('[API] POST /api/events/:eventId/attendance -', eventId);

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

    if (!body.contactId) {
      return NextResponse.json(
        { error: 'contactId is required' },
        { status: 400 }
      );
    }

    // Validate visibility mode if provided
    if (body.visibility) {
      const validationResult = VisibilityService.validateVisibilityMode(body.visibility);
      if (!validationResult.isValid) {
        return NextResponse.json(
          { error: validationResult.error },
          { status: 400 }
        );
      }

      // Check if ghost mode is available for subscription
      if (body.visibility === EVENT_VISIBILITY_MODES.GHOST &&
          !hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.GHOST_MODE)) {
        return NextResponse.json(
          { error: 'Ghost mode not available in your subscription plan' },
          { status: 403 }
        );
      }
    }

    const participation = await EventService.registerAttendance({
      eventId,
      contactId: body.contactId,
      participation: {
        visibility: body.visibility,
        intent: body.intent,
        secondaryIntents: body.secondaryIntents,
        lookingFor: body.lookingFor,
        offering: body.offering,
        status: body.status,
        notes: body.notes,
      },
      session,
    });

    console.log('[API] Attendance registered:', body.contactId);

    return NextResponse.json(
      { success: true, participation },
      { status: 201 }
    );

  } catch (error) {
    console.error('[API] Error in POST /api/events/:eventId/attendance:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (error.message.includes('already registered')) {
      return NextResponse.json(
        { error: 'Contact is already registered for this event' },
        { status: 409 }
      );
    }

    if (error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to register attendance', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/[eventId]/attendance - Update attendance details
 *
 * Body:
 * - contactId: string (required) - Contact to update
 * - visibility: string - New visibility mode
 * - intent: string - New intent
 * - lookingFor: string[] - Updated looking for
 * - offering: string[] - Updated offering
 * - status: string - Updated status
 */
export async function PUT(request, { params }) {
  const { eventId } = await params;
  console.log('[API] PUT /api/events/:eventId/attendance -', eventId);

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

    if (!body.contactId) {
      return NextResponse.json(
        { error: 'contactId is required' },
        { status: 400 }
      );
    }

    // Validate visibility mode if being updated
    if (body.visibility) {
      const validationResult = VisibilityService.validateVisibilityMode(body.visibility);
      if (!validationResult.isValid) {
        return NextResponse.json(
          { error: validationResult.error },
          { status: 400 }
        );
      }

      // Check ghost mode permission
      if (body.visibility === EVENT_VISIBILITY_MODES.GHOST &&
          !hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.GHOST_MODE)) {
        return NextResponse.json(
          { error: 'Ghost mode not available in your subscription plan' },
          { status: 403 }
        );
      }
    }

    const updatedParticipation = await EventService.updateAttendance({
      eventId,
      contactId: body.contactId,
      updates: {
        visibility: body.visibility,
        intent: body.intent,
        secondaryIntents: body.secondaryIntents,
        lookingFor: body.lookingFor,
        offering: body.offering,
        status: body.status,
        notes: body.notes,
      },
      session,
    });

    console.log('[API] Attendance updated:', body.contactId);

    return NextResponse.json({
      success: true,
      participation: updatedParticipation,
    });

  } catch (error) {
    console.error('[API] Error in PUT /api/events/:eventId/attendance:', error);

    if (error.message.includes('Event') && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (error.message.includes('Attendance record not found')) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    if (error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update attendance', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[eventId]/attendance - Remove attendance
 *
 * Body:
 * - contactId: string (required) - Contact to remove
 */
export async function DELETE(request, { params }) {
  const { eventId } = await params;
  console.log('[API] DELETE /api/events/:eventId/attendance -', eventId);

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

    if (!body.contactId) {
      return NextResponse.json(
        { error: 'contactId is required' },
        { status: 400 }
      );
    }

    const result = await EventService.removeAttendance({
      eventId,
      contactId: body.contactId,
      session,
    });

    console.log('[API] Attendance removed:', body.contactId);

    return NextResponse.json({
      success: true,
      removed: result.success,
    });

  } catch (error) {
    console.error('[API] Error in DELETE /api/events/:eventId/attendance:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to remove attendance', details: error.message },
      { status: 500 }
    );
  }
}
