// app/api/events/[eventId]/matches/[matchId]/respond/route.js
/**
 * Match Response API - Accept or decline a match
 *
 * POST /api/events/[eventId]/matches/[matchId]/respond - Respond to match
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { MatchingService } from '@/lib/services/serviceEvent/server/matchingService';
import {
  hasEventFeature,
  EVENT_FEATURES,
} from '@/lib/services/serviceEvent/client/constants/eventConstants';

/**
 * POST /api/events/[eventId]/matches/[matchId]/respond - Accept or decline match
 *
 * Body:
 * - contactId: string (required) - Contact responding to match
 * - accepted: boolean (required) - true to accept, false to decline
 */
export async function POST(request, { params }) {
  const { eventId, matchId } = await params;
  console.log('[API] POST /api/events/:eventId/matches/:matchId/respond -', { eventId, matchId });

  try {
    const session = await createApiSession(request);

    // Check permission for AI matchmaking
    if (!hasEventFeature(session.subscriptionLevel, EVENT_FEATURES.AI_MATCHMAKING)) {
      return NextResponse.json(
        { error: 'AI matchmaking not available in your subscription plan' },
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

    if (typeof body.accepted !== 'boolean') {
      return NextResponse.json(
        { error: 'accepted must be a boolean (true or false)' },
        { status: 400 }
      );
    }

    const updatedMatch = await MatchingService.respondToMatch({
      userId: session.userId,
      matchId,
      contactId: body.contactId,
      accepted: body.accepted,
    });

    console.log('[API] Match response recorded:', {
      matchId,
      accepted: body.accepted,
      newStatus: updatedMatch.status,
    });

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      isRevealed: updatedMatch.status === 'accepted',
      message: updatedMatch.status === 'accepted'
        ? 'Match confirmed! You can now see each other\'s profiles.'
        : body.accepted
          ? 'Response recorded. Waiting for the other person.'
          : 'Match declined.',
    });

  } catch (error) {
    console.error('[API] Error in POST /api/events/:eventId/matches/:matchId/respond:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (error.message.includes('not part of this match')) {
      return NextResponse.json(
        { error: 'Contact is not part of this match' },
        { status: 403 }
      );
    }

    if (error.message.includes('Already responded')) {
      return NextResponse.json(
        { error: 'You have already responded to this match' },
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
      { error: 'Failed to respond to match', details: error.message },
      { status: 500 }
    );
  }
}
