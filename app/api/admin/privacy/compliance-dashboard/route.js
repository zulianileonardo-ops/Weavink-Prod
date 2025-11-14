/**
 * Compliance Monitoring Dashboard API Endpoint
 * POST /api/admin/privacy/compliance-dashboard
 *
 * Real-time compliance monitoring and dashboard
 * GDPR Continuous Compliance
 */

import { NextResponse } from 'next/server';
import {
  calculateComplianceScore,
  runComplianceChecks,
  getComplianceTrends,
  createActionItem,
  getActionItems,
  getComplianceDashboard,
  CHECK_TYPES,
  COMPLIANCE_STATUS,
  ACTION_PRIORITY,
} from '@/lib/services/servicePrivacy/server/complianceMonitoringService';

/**
 * POST /api/admin/privacy/compliance-dashboard
 * Compliance monitoring operations
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'calculate_score': {
        const result = await calculateComplianceScore();

        return NextResponse.json({
          success: true,
          overallScore: result.overallScore,
          maxScore: result.maxScore,
          status: result.status,
          breakdown: result.breakdown,
          weights: result.weights,
          calculatedAt: result.calculatedAt,
        });
      }

      case 'run_checks': {
        const result = await runComplianceChecks();

        return NextResponse.json({
          success: true,
          summary: result.summary,
          checks: result.checks,
        });
      }

      case 'get_trends': {
        const { days } = data || {};
        const result = await getComplianceTrends(days || 30);

        return NextResponse.json({
          success: true,
          days: result.days,
          dataPoints: result.dataPoints,
          trends: result.trends,
          trendDirection: result.trendDirection,
          averageScore: result.averageScore,
        });
      }

      case 'create_action': {
        const { title, description, priority, category, assignedTo, dueDate, relatedCheckType } = data;

        if (!title || !description) {
          return NextResponse.json(
            { error: 'Title and description are required' },
            { status: 400 }
          );
        }

        const result = await createActionItem({
          title,
          description,
          priority,
          category,
          assignedTo,
          dueDate,
          relatedCheckType,
        });

        return NextResponse.json({
          success: true,
          actionId: result.actionId,
          action: result.action,
        });
      }

      case 'get_actions': {
        const { priority, assignedTo, limit } = data || {};

        const result = await getActionItems({
          priority,
          assignedTo,
          limit,
        });

        return NextResponse.json({
          success: true,
          actions: result.actions,
          count: result.count,
        });
      }

      case 'get_dashboard': {
        const result = await getComplianceDashboard();

        return NextResponse.json({
          success: true,
          dashboard: result.dashboard,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Compliance dashboard error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process compliance dashboard request',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/privacy/compliance-dashboard
 * Get dashboard configuration and constants
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const getDashboard = url.searchParams.get('dashboard');

    if (getDashboard === 'true') {
      // Return full dashboard data
      const result = await getComplianceDashboard();
      return NextResponse.json({
        success: true,
        dashboard: result.dashboard,
      });
    }

    // Return configuration only
    return NextResponse.json({
      success: true,
      checkTypes: Object.values(CHECK_TYPES),
      complianceStatuses: Object.values(COMPLIANCE_STATUS),
      actionPriorities: Object.values(ACTION_PRIORITY),
      supportedActions: [
        'calculate_score',
        'run_checks',
        'get_trends',
        'create_action',
        'get_actions',
        'get_dashboard',
      ],
    });
  } catch (error) {
    console.error('[API] Get dashboard info error:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard information' },
      { status: 500 }
    );
  }
}
