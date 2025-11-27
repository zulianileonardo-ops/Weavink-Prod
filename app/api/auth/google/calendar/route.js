/**
 * Google Calendar OAuth Initiation Route
 * GET /api/auth/google/calendar
 *
 * Initiates OAuth2 flow for Google Calendar access.
 * Redirects user to Google consent screen.
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { GoogleCalendarOAuthService } from '@/lib/services/serviceCalendar/server/googleCalendarOAuthService';
import { hasCalendarFeature, CALENDAR_FEATURES } from '@/lib/services/serviceCalendar/client/constants/calendarConstants';

export async function GET(request) {
    try {
        // Verify user is authenticated
        const session = await createApiSession(request);

        // Check if user has calendar sync feature
        if (!hasCalendarFeature(session.subscriptionLevel, CALENDAR_FEATURES.GOOGLE_CALENDAR_SYNC)) {
            return NextResponse.json({
                error: 'Google Calendar sync requires a Pro subscription or higher'
            }, { status: 403 });
        }

        // Generate OAuth URL
        const authUrl = GoogleCalendarOAuthService.generateAuthUrl(session.userId);

        // Return the URL for client-side redirect
        // (Browser navigation cannot include Authorization headers)
        return NextResponse.json({ authUrl });

    } catch (error) {
        console.error('[/api/auth/google/calendar] Error:', error);

        // If not authenticated, redirect to login
        if (error.message?.includes('Unauthorized') || error.message?.includes('token')) {
            return NextResponse.redirect(new URL('/auth/signin?redirect=/dashboard/events/discover', request.url));
        }

        return NextResponse.json({
            error: error.message || 'Failed to initiate Google Calendar connection'
        }, { status: 500 });
    }
}
