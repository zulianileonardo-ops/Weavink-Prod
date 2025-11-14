/**
 * Breach Notifications API Endpoint
 * POST /api/admin/privacy/breach-notifications
 *
 * Manage breach notifications and templates
 * GDPR Art. 34 - Communication of personal data breach to data subject
 */

import { NextResponse } from 'next/server';
import {
  sendBreachNotifications,
  notifyDataSubjects,
  notifyAuthorities,
  getNotificationStatus,
  updateNotificationStatus,
  getBreachNotificationHistory,
  NOTIFICATION_CHANNELS,
  BREACH_TEMPLATES,
} from '@/lib/services/servicePrivacy/server/breachNotificationService';

/**
 * POST /api/admin/privacy/breach-notifications
 * Send breach notifications
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'send_notifications': {
        const { incidentId, userIds, channels, language, includeSMS } = data;

        if (!incidentId || !userIds || !channels) {
          return NextResponse.json(
            { error: 'Incident ID, user IDs, and channels are required' },
            { status: 400 }
          );
        }

        const result = await sendBreachNotifications(incidentId, {
          userIds,
          channels,
          language: language || 'en',
          includeSMS: includeSMS || false,
        });

        return NextResponse.json({
          success: true,
          notificationsSent: result.notificationsSent,
          errors: result.errors,
          summary: result.summary,
        });
      }

      case 'notify_subjects': {
        const { incidentId, affectedUserIds, notificationMethod, customMessage } = data;

        if (!incidentId || !affectedUserIds) {
          return NextResponse.json(
            { error: 'Incident ID and affected user IDs are required' },
            { status: 400 }
          );
        }

        const result = await notifyDataSubjects(incidentId, {
          affectedUserIds,
          notificationMethod: notificationMethod || 'email',
          customMessage,
        });

        return NextResponse.json({
          success: true,
          notified: result.notified,
          failed: result.failed,
          notificationId: result.notificationId,
        });
      }

      case 'notify_authorities': {
        const { incidentId, authorities, urgency, additionalInfo } = data;

        if (!incidentId || !authorities) {
          return NextResponse.json(
            { error: 'Incident ID and authorities are required' },
            { status: 400 }
          );
        }

        const result = await notifyAuthorities(incidentId, {
          authorities,
          urgency: urgency || 'normal',
          additionalInfo,
        });

        return NextResponse.json({
          success: true,
          notified: result.notified,
          notificationId: result.notificationId,
        });
      }

      case 'get_status': {
        const { notificationId } = data;

        if (!notificationId) {
          return NextResponse.json(
            { error: 'Notification ID is required' },
            { status: 400 }
          );
        }

        const result = await getNotificationStatus(notificationId);

        return NextResponse.json({
          success: true,
          notification: result.notification,
        });
      }

      case 'update_status': {
        const { notificationId, status, notes } = data;

        if (!notificationId || !status) {
          return NextResponse.json(
            { error: 'Notification ID and status are required' },
            { status: 400 }
          );
        }

        const result = await updateNotificationStatus(notificationId, status, notes);

        return NextResponse.json({
          success: true,
          notificationId: result.notificationId,
          status: result.status,
        });
      }

      case 'get_history': {
        const { incidentId, limit } = data || {};

        const result = await getBreachNotificationHistory({
          incidentId,
          limit: limit || 50,
        });

        return NextResponse.json({
          success: true,
          notifications: result.notifications,
          count: result.count,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Breach notification error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process breach notification request',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/privacy/breach-notifications
 * Get notification channels and templates
 */
export async function GET(request) {
  try {
    return NextResponse.json({
      success: true,
      channels: Object.values(NOTIFICATION_CHANNELS),
      templates: {
        languages: Object.keys(BREACH_TEMPLATES),
        available: ['en', 'fr', 'es', 'de'],
      },
      supportedActions: [
        'send_notifications',
        'notify_subjects',
        'notify_authorities',
        'get_status',
        'update_status',
        'get_history',
      ],
    });
  } catch (error) {
    console.error('[API] Get breach notification info error:', error);
    return NextResponse.json(
      { error: 'Failed to get notification information' },
      { status: 500 }
    );
  }
}
