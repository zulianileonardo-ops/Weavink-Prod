/**
 * Calendar Preferences Route
 * GET /api/user/calendar-preferences - Get user's calendar preferences
 * PUT /api/user/calendar-preferences - Update preferences
 */

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { adminDb } from '@/lib/firebaseAdmin';
import {
    DEFAULT_CALENDAR_PREFERENCES,
    SYNC_INTERVALS,
    DISCOVERY_CONFIG
} from '@/lib/services/serviceCalendar/client/constants/calendarConstants';

/**
 * GET - Get user's calendar preferences
 */
export async function GET(request) {
    try {
        const session = await createApiSession(request);

        // Get preferences from Firestore
        const prefsDoc = await adminDb
            .collection('users')
            .doc(session.userId)
            .collection('calendar_preferences')
            .doc('settings')
            .get();

        if (!prefsDoc.exists) {
            // Return defaults
            return NextResponse.json({
                success: true,
                preferences: DEFAULT_CALENDAR_PREFERENCES
            });
        }

        return NextResponse.json({
            success: true,
            preferences: {
                ...DEFAULT_CALENDAR_PREFERENCES,
                ...prefsDoc.data()
            }
        });

    } catch (error) {
        console.error('[/api/user/calendar-preferences] GET Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to get preferences'
        }, { status: 500 });
    }
}

/**
 * PUT - Update user's calendar preferences
 * Body: Partial CalendarPreferences
 */
export async function PUT(request) {
    try {
        const session = await createApiSession(request);
        const body = await request.json();

        // Validate and sanitize preferences
        const updates = {};

        if (typeof body.autoSyncEnabled === 'boolean') {
            updates.autoSyncEnabled = body.autoSyncEnabled;
        }

        if (body.syncInterval && Object.values(SYNC_INTERVALS).includes(body.syncInterval)) {
            updates.syncInterval = body.syncInterval;
        }

        if (Array.isArray(body.excludedCalendars)) {
            updates.excludedCalendars = body.excludedCalendars.filter(id => typeof id === 'string');
        }

        if (typeof body.autoDiscoverRadius === 'number') {
            updates.autoDiscoverRadius = Math.min(
                Math.max(body.autoDiscoverRadius, DISCOVERY_CONFIG.MIN_RADIUS_KM),
                DISCOVERY_CONFIG.MAX_RADIUS_KM
            );
        }

        if (Array.isArray(body.preferredCategories)) {
            updates.preferredCategories = body.preferredCategories.filter(cat => typeof cat === 'string');
        }

        if (typeof body.requireLocation === 'boolean') {
            updates.requireLocation = body.requireLocation;
        }

        if (typeof body.importOnlyWithLocation === 'boolean') {
            updates.importOnlyWithLocation = body.importOnlyWithLocation;
        }

        if (typeof body.skipPersonalEvents === 'boolean') {
            updates.skipPersonalEvents = body.skipPersonalEvents;
        }

        // Update in Firestore
        const prefsRef = adminDb
            .collection('users')
            .doc(session.userId)
            .collection('calendar_preferences')
            .doc('settings');

        await prefsRef.set(updates, { merge: true });

        // Return updated preferences
        const updatedDoc = await prefsRef.get();
        const preferences = {
            ...DEFAULT_CALENDAR_PREFERENCES,
            ...updatedDoc.data()
        };

        return NextResponse.json({
            success: true,
            preferences
        });

    } catch (error) {
        console.error('[/api/user/calendar-preferences] PUT Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to update preferences'
        }, { status: 500 });
    }
}
