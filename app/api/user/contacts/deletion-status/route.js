import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * GET /api/user/contacts/deletion-status
 * Check if a specific contact has a pending account deletion
 *
 * Query params:
 * - contactUserId: The Weavink user ID of the contact to check
 *
 * Returns:
 * - { hasPendingDeletion: false } if no deletion found
 * - { hasPendingDeletion: true, userName: string, scheduledDate: string } if deletion found
 */
export async function GET(request) {
  try {
    // 1. Authenticate the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('[ContactDeletionStatus] Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const currentUserId = decodedToken.uid;

    // 2. Get contact identifiers from query params
    const { searchParams } = new URL(request.url);
    const contactUserId = searchParams.get('contactUserId');
    const contactEmail = searchParams.get('contactEmail');

    if (!contactUserId && !contactEmail) {
      return NextResponse.json(
        { error: 'Missing contactUserId or contactEmail parameter' },
        { status: 400 }
      );
    }

    // 3. Query user's notifications for contact deletion
    const notificationsRef = adminDb
      .collection('users')
      .doc(currentUserId)
      .collection('notifications');

    // Try to find by userId first (if provided)
    let querySnapshot = null;
    if (contactUserId) {
      querySnapshot = await notificationsRef
        .where('type', '==', 'contact_deletion')
        .where('deletedUserId', '==', contactUserId)
        .limit(1)
        .get();
    }

    // If not found by userId and email is provided, try by email
    if ((!querySnapshot || querySnapshot.empty) && contactEmail) {
      querySnapshot = await notificationsRef
        .where('type', '==', 'contact_deletion')
        .where('deletedUserEmail', '==', contactEmail)
        .limit(1)
        .get();
    }

    // 4. Return result
    if (querySnapshot.empty) {
      return NextResponse.json({
        hasPendingDeletion: false
      });
    }

    const notification = querySnapshot.docs[0].data();

    // Convert Firestore Timestamp to ISO string if needed
    let scheduledDate = notification.scheduledDate;
    if (scheduledDate && typeof scheduledDate.toDate === 'function') {
      scheduledDate = scheduledDate.toDate().toISOString();
    }

    return NextResponse.json({
      hasPendingDeletion: true,
      userName: notification.deletedUserName || 'Unknown User',
      scheduledDate: scheduledDate
    });

  } catch (error) {
    console.error('[ContactDeletionStatus] Error checking deletion status:', error);
    return NextResponse.json(
      { error: 'Failed to check deletion status' },
      { status: 500 }
    );
  }
}
