/**
 * Account Deletion API Endpoint
 * GDPR Art. 17 - Right to Erasure ("Right to be Forgotten")
 *
 * Allows users to delete their account and all associated data
 * Implements 30-day grace period for account recovery
 */

import { NextResponse } from 'next/server';
import { createApiSession, SessionManager } from '@/lib/server/session';
import { rateLimit } from '@/lib/rateLimiter';
import {
  PRIVACY_PERMISSIONS,
  PRIVACY_RATE_LIMITS,
  PRIVACY_ERROR_MESSAGES,
  DELETION_CONFIRMATION_TEXTS,
} from '@/lib/services/constants';
import {
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionRequest,
  getUserDeletionRequest,
} from '../../../../../lib/services/servicePrivacy/server/accountDeletionService.js';

/**
 * GET - Check if user has a pending deletion request
 */
export async function GET(request) {
  try {
    // 1. Create session (includes authentication)
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    const userId = session.userId;

    // 2. Permission check
    if (!session.permissions[PRIVACY_PERMISSIONS.CAN_DELETE_ACCOUNT]) {
      return NextResponse.json(
        {
          error: PRIVACY_ERROR_MESSAGES.PERMISSION_DENIED,
          message: 'You do not have permission to delete accounts',
        },
        { status: 403 }
      );
    }

    // 3. Check for pending deletion request
    const deletionRequest = await getUserDeletionRequest(userId);

    if (!deletionRequest) {
      return NextResponse.json({
        success: true,
        hasPendingDeletion: false,
        message: 'No pending account deletion request',
      });
    }

    return NextResponse.json({
      success: true,
      hasPendingDeletion: true,
      deletionRequest,
      daysRemaining: Math.ceil(
        (new Date(deletionRequest.scheduledDeletionDate) - new Date()) / (1000 * 60 * 60 * 24)
      ),
    });
  } catch (error) {
    console.error('❌ [AccountDeletionAPI] Error in GET:', error);
    return NextResponse.json(
      { error: PRIVACY_ERROR_MESSAGES.DELETION_FAILED, details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Request account deletion
 * Body: {
 *   confirmation: string (must be "DELETE MY ACCOUNT"),
 *   reason: string (optional),
 *   immediate: boolean (optional, default: false)
 * }
 */
export async function POST(request) {
  try {
    // 1. Create session (includes authentication)
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    const userId = session.userId;

    // 2. Permission check
    if (!session.permissions[PRIVACY_PERMISSIONS.CAN_DELETE_ACCOUNT]) {
      return NextResponse.json(
        {
          error: PRIVACY_ERROR_MESSAGES.PERMISSION_DENIED,
          message: 'You do not have permission to delete accounts',
        },
        { status: 403 }
      );
    }

    // 3. Rate limiting - very strict for deletion requests
    const { max, window } = PRIVACY_RATE_LIMITS.ACCOUNT_DELETIONS;
    const rateLimitResult = rateLimit(userId, {
      maxRequests: max,
      windowMs: window,
      metadata: {
        eventType: 'account_deletion_request',
        userId: userId,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      }
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: PRIVACY_ERROR_MESSAGES.DELETION_RATE_LIMIT,
          message: 'For security reasons, please wait before trying again.',
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    // 4. Validate confirmation text
    const { confirmation, reason, immediate = false, locale = 'en' } = body;

    // Get the expected confirmation text for the user's locale
    const expectedConfirmation = DELETION_CONFIRMATION_TEXTS[locale] || DELETION_CONFIRMATION_TEXTS.en;

    if (confirmation !== expectedConfirmation) {
      return NextResponse.json(
        {
          error: PRIVACY_ERROR_MESSAGES.DELETION_INVALID_CONFIRMATION,
          message: `You must type "${expectedConfirmation}" to confirm account deletion`,
          required: expectedConfirmation,
          locale,
        },
        { status: 400 }
      );
    }

    // 5. Check if user already has a pending deletion request
    const existingRequest = await getUserDeletionRequest(userId);
    if (existingRequest) {
      return NextResponse.json(
        {
          error: PRIVACY_ERROR_MESSAGES.DELETION_ALREADY_PENDING,
          message: 'You already have a pending account deletion request',
          deletionRequest: existingRequest,
          daysRemaining: Math.ceil(
            (new Date(existingRequest.scheduledDeletionDate) - new Date()) / (1000 * 60 * 60 * 24)
          ),
        },
        { status: 409 }
      );
    }

    console.log(`⚠️ [AccountDeletionAPI] User ${userId} requested account deletion`);

    // 6. Request account deletion
    const result = await requestAccountDeletion(
      userId,
      {
        ipAddress: session.requestMetadata?.ipAddress,
        userAgent: session.requestMetadata?.userAgent,
      },
      {
        reason,
        immediate,
        keepBillingData: true, // Always keep billing data (legal requirement)
        locale, // Track language used for deletion confirmation (compliance)
      }
    );

    console.log(`✅ [AccountDeletionAPI] Deletion request created for user ${userId}:`, {
      requestId: result.deletionRequest.id,
      scheduledDate: result.deletionRequest.scheduledDeletionDate,
      immediate,
    });

    return NextResponse.json({
      success: true,
      ...result,
      warning: {
        title: 'Account Deletion Initiated',
        message: immediate
          ? 'Your account and all data are being deleted. This action is irreversible.'
          : 'Your account will be permanently deleted in 30 days. You can cancel this request within that period.',
        deletionDate: result.deletionRequest.scheduledDeletionDate,
        affectedData: [
          'Your user profile',
          'All your contacts',
          'All your groups',
          'Your analytics data (anonymized)',
          'Your consent history',
          'Your settings',
        ],
        retainedData: [
          'Billing records (legal requirement - 10 years)',
          'Anonymized analytics (aggregated)',
          'Audit logs (12 months)',
        ],
        affectedUsers:
          result.affectedUsers > 0
            ? `${result.affectedUsers} users who have you as a contact will be notified`
            : 'No other users affected',
        cancellation: immediate
          ? null
          : 'You can cancel this deletion by clicking "Cancel Deletion" in your Privacy Center',
      },
    });
  } catch (error) {
    console.error('❌ [AccountDeletionAPI] Error in POST:', error);
    return NextResponse.json(
      {
        error: PRIVACY_ERROR_MESSAGES.DELETION_FAILED,
        details: error.message,
        support: 'If you need assistance, please contact support@weavink.io',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Cancel pending account deletion request
 */
export async function DELETE(request) {
  try {
    // 1. Create session (includes authentication)
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    const userId = session.userId;

    // 2. Permission check
    if (!session.permissions[PRIVACY_PERMISSIONS.CAN_DELETE_ACCOUNT]) {
      return NextResponse.json(
        {
          error: PRIVACY_ERROR_MESSAGES.PERMISSION_DENIED,
          message: 'You do not have permission to manage account deletion',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    // 3. Get user's pending deletion request
    const deletionRequest = requestId
      ? await getDeletionRequest(requestId)
      : await getUserDeletionRequest(userId);

    if (!deletionRequest) {
      return NextResponse.json(
        {
          error: 'No pending deletion request',
          message: 'You do not have a pending account deletion request to cancel',
        },
        { status: 404 }
      );
    }

    // 4. Verify ownership
    if (deletionRequest.userId !== userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You can only cancel your own deletion request',
        },
        { status: 403 }
      );
    }

    // 5. Cancel the deletion
    const result = await cancelAccountDeletion(userId, deletionRequest.id);

    console.log(`✅ [AccountDeletionAPI] Deletion cancelled for user ${userId}`);

    return NextResponse.json({
      success: true,
      ...result,
      message: 'Account deletion cancelled successfully',
      info: {
        title: 'Deletion Cancelled',
        message: 'Your account will not be deleted. All your data remains intact.',
        nextSteps: [
          'Your account is now fully active',
          'No further action is required',
          'You can request deletion again at any time from Privacy Settings',
        ],
      },
    });
  } catch (error) {
    console.error('❌ [AccountDeletionAPI] Error in DELETE:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel deletion',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Modify pending deletion request (e.g., change scheduled date)
 */
export async function PATCH(request) {
  try {
    // 1. Create session (includes authentication)
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    const userId = session.userId;

    // 2. Permission check
    if (!session.permissions[PRIVACY_PERMISSIONS.CAN_DELETE_ACCOUNT]) {
      return NextResponse.json(
        {
          error: PRIVACY_ERROR_MESSAGES.PERMISSION_DENIED,
          message: 'You do not have permission to modify deletion requests',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'postpone') {
      // Postpone deletion by 30 more days
      const deletionRequest = await getUserDeletionRequest(userId);

      if (!deletionRequest) {
        return NextResponse.json(
          {
            error: 'No pending deletion',
            message: 'You do not have a pending deletion request',
          },
          { status: 404 }
        );
      }

      // Not implemented yet - would update scheduledDeletionDate
      return NextResponse.json(
        {
          error: 'Not implemented',
          message: 'Postponing deletion is not yet implemented. Please cancel and re-request if needed.',
        },
        { status: 501 }
      );
    }

    return NextResponse.json(
      {
        error: 'Invalid action',
        message: 'Supported actions: postpone',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ [AccountDeletionAPI] Error in PATCH:', error);
    return NextResponse.json(
      {
        error: 'Failed to modify deletion request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
