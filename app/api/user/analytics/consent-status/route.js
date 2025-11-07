// app/api/user/analytics/consent-status/route.js
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * Public endpoint to check analytics consent status for a user
 * No authentication required - used by public profile visitors
 * Pattern: Same as /api/user/contacts/verify-profile
 */
export async function POST(request) {
  try {
    const { userId } = await request.json();

    console.log('🔍 API: Checking analytics consent for userId:', userId);

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Fetch user document using adminDb (no auth required)
    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({
        error: 'User not found',
        analytics_basic: false,
        analytics_detailed: false
      }, { status: 404 });
    }

    const userData = userDoc.data();
    const consents = userData.consents || {};

    // Extract only analytics-related consents
    const analytics_basic = consents.analytics_basic?.status || false;
    const analytics_detailed = consents.analytics_detailed?.status || false;

    console.log('✅ API: Analytics consent retrieved:', { analytics_basic, analytics_detailed });

    return NextResponse.json({
      analytics_basic,
      analytics_detailed
    });

  } catch (error) {
    console.error('❌ API: Error checking analytics consent:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
        analytics_basic: false,
        analytics_detailed: false
      },
      { status: 500 }
    );
  }
}
