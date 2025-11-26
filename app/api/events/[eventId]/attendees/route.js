// app/api/events/[eventId]/attendees/route.js
/**
 * Attendees API - List event attendees with visibility filtering
 *
 * GET /api/events/[eventId]/attendees - List visible attendees
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { EventService } from '@/lib/services/serviceEvent/server/eventService';
import { VisibilityService } from '@/lib/services/serviceEvent/server/visibilityService';
import { hasEventFeature, EVENT_FEATURES } from '@/lib/services/serviceEvent/client/constants/eventConstants';

/**
 * GET /api/events/[eventId]/attendees - List event attendees
 *
 * Query params:
 * - viewAs: string - Contact ID to view as (for visibility filtering)
 * - includeAI: 'true' to include AI-visible attendees (ghost mode) - requires AI permission
 * - raw: 'true' to get all attendees without visibility filtering (admin only)
 */
export async function GET(request, { params }) {
  const { eventId } = await params;
  console.log('[API] GET /api/events/:eventId/attendees -', eventId);

  try {
    const session = await createApiSession(request);

    // Check permission
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.BASIC_EVENTS)) {
      return NextResponse.json(
        { error: 'Event feature not available in your subscription plan' },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const viewAs = searchParams.get('viewAs');
    const includeAI = searchParams.get('includeAI') === 'true';
    const raw = searchParams.get('raw') === 'true';

    // Get all attendees
    const attendees = await EventService.getEventAttendees({ eventId, session });

    // Raw mode - return all attendees without filtering
    if (raw) {
      const counts = VisibilityService.getVisibilityCounts({ participants: attendees });
      return NextResponse.json({
        success: true,
        attendees,
        total: attendees.length,
        counts,
      });
    }

    // AI context - get all non-private attendees for matching
    if (includeAI) {
      // Check AI permission
      if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.AI_MATCHMAKING)) {
        return NextResponse.json(
          { error: 'AI matchmaking not available in your subscription plan' },
          { status: 403 }
        );
      }

      const aiVisibleAttendees = VisibilityService.getAIVisibleParticipants({
        participants: attendees,
      });

      const counts = VisibilityService.getVisibilityCounts({ participants: attendees });

      return NextResponse.json({
        success: true,
        attendees: aiVisibleAttendees,
        total: aiVisibleAttendees.length,
        counts,
        mode: 'ai_matching',
      });
    }

    // Standard visibility filtering
    const viewerId = viewAs || session.userId;

    // Apply visibility rules
    const { participants, counts, viewerContactCount } = await VisibilityService.applyVisibilityRules({
      participants: attendees,
      viewerId,
      session,
    });

    console.log('[API] Returning attendees:', participants.length, '/', attendees.length, 'visible');

    return NextResponse.json({
      success: true,
      attendees: participants,
      total: attendees.length,
      visibleCount: participants.length,
      counts,
      viewerContactCount,
    });

  } catch (error) {
    console.error('[API] Error in GET /api/events/:eventId/attendees:', error);

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
      { error: 'Failed to get attendees', details: error.message },
      { status: 500 }
    );
  }
}
