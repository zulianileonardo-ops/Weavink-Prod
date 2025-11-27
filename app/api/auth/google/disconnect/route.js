/**
 * Google Calendar Disconnect Route
 * DELETE /api/auth/google/disconnect
 *
 * Revokes Google Calendar access and removes stored tokens.
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { GoogleCalendarOAuthService } from '@/lib/services/serviceCalendar/server/googleCalendarOAuthService';

export async function DELETE(request) {
    try {
        const session = await createApiSession(request);

        // Revoke access and delete tokens
        const result = await GoogleCalendarOAuthService.revokeAccess(session.userId);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error || 'Failed to disconnect Google Calendar'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Google Calendar disconnected successfully'
        });

    } catch (error) {
        console.error('[/api/auth/google/disconnect] Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to disconnect Google Calendar'
        }, { status: 500 });
    }
}

// Also support POST for convenience
export async function POST(request) {
    return DELETE(request);
}
