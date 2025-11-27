// app/api/events/matches/pending/route.js
/**
 * Pending Matches API - Get all pending matches across events
 *
 * GET /api/events/matches/pending - Get all pending matches for current user
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { MatchingService } from '@/lib/services/serviceEvent/server/matchingService';
import {
  hasEventFeature,
  EVENT_FEATURES,
} from '@/lib/services/serviceEvent/client/constants/eventConstants';

/**
 * GET /api/events/matches/pending - Get all pending matches
 *
 * Query params:
 * - contactId: string (required) - User's contact ID
 */
export async function GET(request) {
  console.log('[API] GET /api/events/matches/pending');

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

    const pendingMatches = await MatchingService.getPendingMatches({
      userId: session.userId,
      contactId,
    });

    console.log('[API] Found pending matches:', pendingMatches.length);

    // Group by event for better UI display
    const byEvent = pendingMatches.reduce((acc, match) => {
      if (!acc[match.eventId]) {
        acc[match.eventId] = {
          eventId: match.eventId,
          eventName: match.eventName,
          matches: [],
        };
      }
      acc[match.eventId].matches.push(match);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      contactId,
      total: pendingMatches.length,
      matches: pendingMatches,
      byEvent: Object.values(byEvent),
    });

  } catch (error) {
    console.error('[API] Error in GET /api/events/matches/pending:', error);

    if (error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (error.message.includes('Authorization') || error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to get pending matches', details: error.message },
      { status: 500 }
    );
  }
}
