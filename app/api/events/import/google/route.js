/**
 * Google Calendar Import Route
 * POST /api/events/import/google
 *
 * Triggers manual sync of Google Calendar events.
 * GET /api/events/import/google - Get sync status
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { GoogleCalendarOAuthService } from '@/lib/services/serviceCalendar/server/googleCalendarOAuthService';
import { GoogleCalendarSyncService } from '@/lib/services/serviceCalendar/server/googleCalendarSyncService';
import { hasCalendarFeature, CALENDAR_FEATURES } from '@/lib/services/serviceCalendar/client/constants/calendarConstants';

/**
 * GET - Get connection and sync status
 */
export async function GET(request) {
    try {
        const session = await createApiSession(request);

        // Check feature access
        if (!hasCalendarFeature(session.subscriptionLevel, CALENDAR_FEATURES.GOOGLE_CALENDAR_SYNC)) {
            return NextResponse.json({
                error: 'Google Calendar sync requires a Pro subscription or higher'
            }, { status: 403 });
        }

        // Get connection status
        const status = await GoogleCalendarOAuthService.getConnectionStatus(session.userId);

        return NextResponse.json({
            success: true,
            ...status
        });

    } catch (error) {
        console.error('[/api/events/import/google] GET Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to get sync status'
        }, { status: 500 });
    }
}

/**
 * POST - Trigger manual sync
 */
export async function POST(request) {
    try {
        const session = await createApiSession(request);

        // Check feature access
        if (!hasCalendarFeature(session.subscriptionLevel, CALENDAR_FEATURES.GOOGLE_CALENDAR_SYNC)) {
            return NextResponse.json({
                error: 'Google Calendar sync requires a Pro subscription or higher'
            }, { status: 403 });
        }

        // Check if user has connected calendar
        const connectionStatus = await GoogleCalendarOAuthService.getConnectionStatus(session.userId);
        if (!connectionStatus.connected) {
            return NextResponse.json({
                error: 'Google Calendar not connected. Please connect your calendar first.',
                requiresConnection: true
            }, { status: 400 });
        }

        // Parse options from request body
        let options = {};
        try {
            const body = await request.json();
            options = body || {};
        } catch {
            // No body or invalid JSON - use defaults
        }

        // Trigger sync
        const syncResult = await GoogleCalendarSyncService.syncEvents(session.userId, options);

        if (!syncResult.success) {
            return NextResponse.json({
                success: false,
                error: syncResult.errors[0]?.error || 'Sync failed',
                errors: syncResult.errors
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            imported: syncResult.imported,
            updated: syncResult.updated,
            skipped: syncResult.skipped,
            failed: syncResult.failed,
            syncedAt: syncResult.syncedAt,
            errors: syncResult.errors
        });

    } catch (error) {
        console.error('[/api/events/import/google] POST Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to sync calendar'
        }, { status: 500 });
    }
}
