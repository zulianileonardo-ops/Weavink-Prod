// app/api/events/[eventId]/meeting-zones/generate/route.js
/**
 * Meeting Zones Generation API - Trigger zone generation
 *
 * POST /api/events/[eventId]/meeting-zones/generate - Generate/regenerate zones
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
 * POST /api/events/[eventId]/meeting-zones/generate - Generate meeting zones
 *
 * Body:
 * - force: boolean (optional) - Force regeneration even if cached zones exist
 */
export async function POST(request, { params }) {
  const { eventId } = await params;
  console.log('[API] POST /api/events/[eventId]/meeting-zones/generate', { eventId });

  try {
    const session = await createApiSession(request);

    // Check permission for meeting zones
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.MEETING_ZONES)) {
      return NextResponse.json(
        { error: 'Meeting zones not available in your subscription plan' },
        { status: 403 }
      );
    }

    // Parse request body
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine
    }

    const force = body.force === true;

    const result = await MeetingZoneService.generateZonesForEvent({
      userId: session.userId,
      eventId,
      session,
      force,
    });

    console.log('[API] Meeting zones generated:', {
      total: result.total,
      cached: result.cached || false,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[API] Error in POST /api/events/[eventId]/meeting-zones/generate:', error);

    if (error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (error.message.includes('not available')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to generate meeting zones', details: error.message },
      { status: 500 }
    );
  }
}
