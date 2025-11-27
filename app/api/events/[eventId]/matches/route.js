// app/api/events/[eventId]/matches/route.js
/**
 * Matches API - Get matches for an event
 *
 * GET /api/events/[eventId]/matches - Get matches for current user at event
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { MatchingService } from '@/lib/services/serviceEvent/server/matchingService';
import {
  hasEventFeature,
  EVENT_FEATURES,
} from '@/lib/services/serviceEvent/client/constants/eventConstants';

/**
 * GET /api/events/[eventId]/matches - Get matches for current user
 *
 * Query params:
 * - contactId: string (required) - User's contact ID
 */
export async function GET(request, { params }) {
  const { eventId } = await params;
  console.log('[API] GET /api/events/:eventId/matches -', eventId);

  try {
    const session = await createApiSession(request);

    // Check permission for AI matchmaking
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.AI_MATCHMAKING)) {
      return NextResponse.json(
        { error: 'AI matchmaking not available in your subscription plan' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        { error: 'contactId query parameter is required' },
        { status: 400 }
      );
    }

    const matches = await MatchingService.getMatchesForContact({
      userId: session.userId,
      eventId,
      contactId,
    });

    console.log('[API] Found matches:', matches.length);

    return NextResponse.json({
      success: true,
      eventId,
      contactId,
      matches,
      total: matches.length,
    });

  } catch (error) {
    console.error('[API] Error in GET /api/events/:eventId/matches:', error);

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
      { error: 'Failed to get matches', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[eventId]/matches - Trigger matching for event
 * (Admin/manual trigger - usually matching happens on RSVP)
 *
 * Body:
 * - force: boolean - Force re-matching even if matches exist
 */
export async function POST(request, { params }) {
  const { eventId } = await params;
  console.log('[API] POST /api/events/:eventId/matches -', eventId);

  try {
    const session = await createApiSession(request);

    // Check permission for AI matchmaking
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.AI_MATCHMAKING)) {
      return NextResponse.json(
        { error: 'AI matchmaking not available in your subscription plan' },
        { status: 403 }
      );
    }

    const result = await MatchingService.runMatchingForEvent({
      userId: session.userId,
      eventId,
      session,
    });

    console.log('[API] Matching completed:', result);

    return NextResponse.json({
      success: true,
      eventId,
      matchesCreated: result.matchesCreated,
      errors: result.errors,
    });

  } catch (error) {
    console.error('[API] Error in POST /api/events/:eventId/matches:', error);

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
      { error: 'Failed to run matching', details: error.message },
      { status: 500 }
    );
  }
}
