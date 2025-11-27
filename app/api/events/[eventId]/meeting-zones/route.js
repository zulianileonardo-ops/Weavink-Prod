// app/api/events/[eventId]/meeting-zones/route.js
/**
 * Meeting Zones API - Get meeting zones for an event
 *
 * GET /api/events/[eventId]/meeting-zones - Get cached zones
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { MeetingZoneService } from '@/lib/services/serviceEvent/server/meetingZoneService';
import {
  hasEventFeature,
  EVENT_FEATURES,
} from '@/lib/services/serviceEvent/client/constants/eventConstants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[eventId]/meeting-zones - Get meeting zones
 *
 * Returns cached zones if available and fresh (< 30 min)
 * Returns empty array if no zones generated yet
 */
export async function GET(request, { params }) {
  const { eventId } = await params;
  console.log('[API] GET /api/events/[eventId]/meeting-zones', { eventId });

  try {
    const session = await createApiSession(request);

    // Check permission for meeting zones
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.MEETING_ZONES)) {
      return NextResponse.json(
        { error: 'Meeting zones not available in your subscription plan' },
        { status: 403 }
      );
    }

    const result = await MeetingZoneService.getZonesForEvent({
      userId: session.userId,
      eventId,
    });

    console.log('[API] Meeting zones retrieved:', result.total);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[API] Error in GET /api/events/[eventId]/meeting-zones:', error);

    if (error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get meeting zones', details: error.message },
      { status: 500 }
    );
  }
}
