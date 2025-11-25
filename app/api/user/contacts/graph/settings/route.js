// app/api/user/contacts/graph/settings/route.js
// API route for managing graph feature settings

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/user/contacts/graph/settings
 * Fetch user's graph feature settings
 */
export async function GET(request) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    console.log('[GraphSettings] GET request for user:', userId);

    // Fetch user document
    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();

    // Get graph settings with defaults
    const graphSettings = userData.settings?.graphFeatures || {
      syncExchangeContacts: true  // Default: enabled (opt-out behavior)
    };

    console.log('[GraphSettings] Returning settings:', graphSettings);

    return NextResponse.json({
      success: true,
      settings: graphSettings
    });

  } catch (error) {
    console.error('[GraphSettings] GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/contacts/graph/settings
 * Update user's graph feature settings
 */
export async function POST(request) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Parse request body
    const body = await request.json();
    const { syncExchangeContacts } = body;

    console.log('[GraphSettings] POST request for user:', userId, { syncExchangeContacts });

    // Validate input
    if (typeof syncExchangeContacts !== 'boolean') {
      return NextResponse.json(
        { error: 'syncExchangeContacts must be a boolean' },
        { status: 400 }
      );
    }

    // Update user document
    const userRef = adminDb.collection('users').doc(userId);

    await userRef.set({
      settings: {
        graphFeatures: {
          syncExchangeContacts,
          lastUpdated: new Date().toISOString()
        }
      },
      lastModified: FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('[GraphSettings] Settings updated successfully');

    return NextResponse.json({
      success: true,
      settings: {
        syncExchangeContacts
      }
    });

  } catch (error) {
    console.error('[GraphSettings] POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
