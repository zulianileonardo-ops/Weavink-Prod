import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

/**
 * GET /api/user/contacts/deletion-status
 * Check if a specific contact has a pending or completed account deletion
 *
 * Query params:
 * - contactUserId: The Weavink user ID of the contact to check
 * - contactEmail: The email of the contact to check (fallback if userId not available)
 *
 * Returns:
 * - { hasPendingDeletion: false, isDeleted: false } if no deletion found
 * - { hasPendingDeletion: true, status: 'pending', userName: string, scheduledDate: string } if deletion pending
 * - { isDeleted: true, status: 'completed', userName: string, completedAt: string } if deletion completed
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

    // 3. Query user's notifications for contact deletion (both pending and completed)
    const notificationsRef = adminDb
      .collection('users')
      .doc(currentUserId)
      .collection('notifications');

    // Try to find by userId first (if provided) - check for both pending and completed
    let querySnapshot = null;
    if (contactUserId) {
      querySnapshot = await notificationsRef
        .where('type', 'in', ['contact_deletion', 'contact_deletion_completed'])
        .where('deletedUserId', '==', contactUserId)
        .limit(1)
        .get();
    }

    // If not found by userId and email is provided, try by email
    if ((!querySnapshot || querySnapshot.empty) && contactEmail) {
      querySnapshot = await notificationsRef
        .where('type', 'in', ['contact_deletion', 'contact_deletion_completed'])
        .where('deletedUserEmail', '==', contactEmail)
        .limit(1)
        .get();
    }

    // 4. Return result
    if (querySnapshot.empty) {
      return NextResponse.json({
        hasPendingDeletion: false,
        isDeleted: false
      });
    }

    const notification = querySnapshot.docs[0].data();

    // Determine status based on notification type
    const isCompleted = notification.type === 'contact_deletion_completed';
    const status = notification.status || (isCompleted ? 'completed' : 'pending');

    // Convert Firestore Timestamps to ISO strings if needed
    let scheduledDate = notification.scheduledDate;
    if (scheduledDate && typeof scheduledDate.toDate === 'function') {
      scheduledDate = scheduledDate.toDate().toISOString();
    }

    let completedAt = notification.completedAt;
    if (completedAt && typeof completedAt.toDate === 'function') {
      completedAt = completedAt.toDate().toISOString();
    }

    return NextResponse.json({
      hasPendingDeletion: !isCompleted,
      isDeleted: isCompleted,
      status: status,
      userName: notification.deletedUserName || 'Unknown User',
      scheduledDate: scheduledDate,
      completedAt: completedAt || null
    });

  } catch (error) {
    console.error('[ContactDeletionStatus] Error checking deletion status:', error);
    return NextResponse.json(
      { error: 'Failed to check deletion status' },
      { status: 500 }
    );
  }
}
