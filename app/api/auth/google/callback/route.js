/**
 * Google Calendar OAuth Callback Route
 * GET /api/auth/google/callback
 *
 * Handles OAuth2 callback from Google.
 * Exchanges authorization code for tokens.
 */

import { NextResponse } from 'next/server';
import { GoogleCalendarOAuthService } from '@/lib/services/serviceCalendar/server/googleCalendarOAuthService';
import { GoogleCalendarSyncService } from '@/lib/services/serviceCalendar/server/googleCalendarSyncService';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Handle user denied access
        if (error) {
            console.log('[/api/auth/google/callback] User denied access:', error);
            return NextResponse.redirect(
                new URL('/dashboard/events/discover?error=access_denied', request.url)
            );
        }

        // Validate required parameters
        if (!code || !state) {
            console.error('[/api/auth/google/callback] Missing code or state');
            return NextResponse.redirect(
                new URL('/dashboard/events/discover?error=invalid_callback', request.url)
            );
        }

        // Parse state to get userId
        const parsedState = GoogleCalendarOAuthService.parseState(state);
        if (!parsedState || !parsedState.userId) {
            console.error('[/api/auth/google/callback] Invalid or expired state');
            return NextResponse.redirect(
                new URL('/dashboard/events/discover?error=invalid_state', request.url)
            );
        }

        const { userId } = parsedState;

        // Exchange code for tokens
        const tokenResult = await GoogleCalendarOAuthService.exchangeCodeForTokens(code, userId);

        if (!tokenResult.success) {
            console.error('[/api/auth/google/callback] Token exchange failed:', tokenResult.error);
            return NextResponse.redirect(
                new URL(`/dashboard/events/discover?error=token_exchange&message=${encodeURIComponent(tokenResult.error)}`, request.url)
            );
        }

        console.log(`[/api/auth/google/callback] Successfully connected Google Calendar for user ${userId}`);

        // Optionally trigger initial sync (non-blocking)
        GoogleCalendarSyncService.syncEvents(userId).catch(err => {
            console.error('[/api/auth/google/callback] Initial sync failed:', err);
        });

        // Redirect to discovery page with success message
        return NextResponse.redirect(
            new URL('/dashboard/events/discover?success=connected', request.url)
        );

    } catch (error) {
        console.error('[/api/auth/google/callback] Error:', error);
        return NextResponse.redirect(
            new URL(`/dashboard/events/discover?error=callback_failed&message=${encodeURIComponent(error.message)}`, request.url)
        );
    }
}
