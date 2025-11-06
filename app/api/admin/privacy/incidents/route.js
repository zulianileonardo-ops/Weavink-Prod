/**
 * Security Incident Reporting API
 *
 * Admin endpoint for managing security incidents and breach notifications
 *
 * Routes:
 * - GET /api/admin/privacy/incidents - List incidents, get statistics, or CNIL template
 * - POST /api/admin/privacy/incidents - Report incident, notify CNIL/users, add actions
 * - PUT /api/admin/privacy/incidents - Update incident status
 */

import { NextResponse } from 'next/server';
import {
  reportIncident,
  addContainmentAction,
  updateIncidentStatus,
  notifyCNIL,
  notifyAffectedUsers,
  getIncident,
  listIncidents,
  getIncidentStatistics,
  generateCNILNotificationTemplate,
  INCIDENT_SEVERITY,
  INCIDENT_TYPES,
} from '../../../../../lib/services/servicePrivacy/server/incidentReportingService.js';

/**
 * GET /api/admin/privacy/incidents
 * Get incidents, statistics, or CNIL template
 */
export async function GET(request) {
  try {
    // TODO: Add admin authentication check

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const incidentId = searchParams.get('id');

    switch (action) {
      case 'statistics':
        const stats = await getIncidentStatistics();
        return NextResponse.json(stats);

      case 'types':
        return NextResponse.json({
          success: true,
          types: INCIDENT_TYPES,
          severities: INCIDENT_SEVERITY,
        });

      case 'template':
        if (!incidentId) {
          return NextResponse.json(
            { error: 'Missing incident ID' },
            { status: 400 }
          );
        }
        const template = await generateCNILNotificationTemplate(incidentId);
        return NextResponse.json(template);

      case 'get':
        if (!incidentId) {
          return NextResponse.json(
            { error: 'Missing incident ID' },
            { status: 400 }
          );
        }
        const incident = await getIncident(incidentId);
        return NextResponse.json(incident);

      default:
        // List incidents
        const status = searchParams.get('status');
        const severity = searchParams.get('severity');
        const limit = parseInt(searchParams.get('limit') || '50');

        const result = await listIncidents({ status, severity, limit });
        return NextResponse.json(result);
    }
  } catch (error) {
    console.error('[API] Incidents GET error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch incident data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/privacy/incidents
 * Report incident, notify CNIL/users, or add containment action
 */
export async function POST(request) {
  try {
    // TODO: Add admin authentication check

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'report':
        console.log('[API] Reporting security incident...');
        const reported = await reportIncident(data);
        return NextResponse.json(reported);

      case 'containment':
        const { incidentId, actionData } = data;
        if (!incidentId || !actionData) {
          return NextResponse.json(
            { error: 'Missing incidentId or actionData' },
            { status: 400 }
          );
        }
        const containment = await addContainmentAction(incidentId, actionData);
        return NextResponse.json(containment);

      case 'notify-cnil':
        const { incidentId: cnilId, notificationData } = data;
        if (!cnilId || !notificationData) {
          return NextResponse.json(
            { error: 'Missing incidentId or notificationData' },
            { status: 400 }
          );
        }
        const cnilNotified = await notifyCNIL(cnilId, notificationData);
        return NextResponse.json(cnilNotified);

      case 'notify-users':
        const { incidentId: userId, userIds } = data;
        if (!userId || !userIds || !Array.isArray(userIds)) {
          return NextResponse.json(
            { error: 'Missing incidentId or userIds array' },
            { status: 400 }
          );
        }
        const usersNotified = await notifyAffectedUsers(userId, userIds);
        return NextResponse.json(usersNotified);

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Incidents POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute incident action',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/privacy/incidents
 * Update incident status
 */
export async function PUT(request) {
  try {
    // TODO: Add admin authentication check

    const body = await request.json();
    const { incidentId, status, details } = body;

    if (!incidentId || !status) {
      return NextResponse.json(
        { error: 'Missing incidentId or status' },
        { status: 400 }
      );
    }

    const result = await updateIncidentStatus(incidentId, status, details);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Incidents PUT error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update incident status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
