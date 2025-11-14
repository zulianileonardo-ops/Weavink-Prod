/**
 * Privacy Certifications API Endpoint
 * POST /api/admin/privacy/certifications
 *
 * Manage privacy certifications and compliance tracking
 * GDPR Art. 25 - Data protection by design and by default
 */

import { NextResponse } from 'next/server';
import {
  createCertification,
  updateChecklistItem,
  getCertificationById,
  listCertifications,
  generateComplianceDocumentation,
  calculateProgress,
  getCertificationStatistics,
  ISO_27001_CHECKLIST,
} from '@/lib/services/servicePrivacy/server/certificationTrackingService';

/**
 * POST /api/admin/privacy/certifications
 * Manage certifications
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create': {
        const { type, targetDate, assignedTo, scope } = data;

        if (!type) {
          return NextResponse.json(
            { error: 'Certification type is required' },
            { status: 400 }
          );
        }

        const result = await createCertification({
          type,
          targetDate,
          assignedTo,
          scope,
        });

        return NextResponse.json({
          success: true,
          certificationId: result.certificationId,
          certification: result.certification,
        });
      }

      case 'update_checklist': {
        const { certificationId, requirementId, status, evidence } = data;

        if (!certificationId || !requirementId || !status) {
          return NextResponse.json(
            { error: 'Certification ID, requirement ID, and status are required' },
            { status: 400 }
          );
        }

        const result = await updateChecklistItem(
          certificationId,
          requirementId,
          status,
          evidence
        );

        return NextResponse.json({
          success: true,
          certificationId: result.certificationId,
          requirementId: result.requirementId,
          status: result.status,
          progress: result.progress,
        });
      }

      case 'get_by_id': {
        const { certificationId } = data;

        if (!certificationId) {
          return NextResponse.json(
            { error: 'Certification ID is required' },
            { status: 400 }
          );
        }

        const result = await getCertificationById(certificationId);

        return NextResponse.json({
          success: true,
          certification: result.certification,
        });
      }

      case 'list': {
        const { status, type, limit } = data || {};

        const result = await listCertifications({
          status,
          type,
          limit,
        });

        return NextResponse.json({
          success: true,
          certifications: result.certifications,
          count: result.count,
        });
      }

      case 'generate_documentation': {
        const { certificationId } = data;

        if (!certificationId) {
          return NextResponse.json(
            { error: 'Certification ID is required' },
            { status: 400 }
          );
        }

        const result = await generateComplianceDocumentation(certificationId);

        return NextResponse.json({
          success: true,
          packageId: result.packageId,
          documentation: result.documentation,
        });
      }

      case 'calculate_progress': {
        const { certificationId } = data;

        if (!certificationId) {
          return NextResponse.json(
            { error: 'Certification ID is required' },
            { status: 400 }
          );
        }

        const result = await calculateProgress(certificationId);

        return NextResponse.json({
          success: true,
          progress: result.progress,
          breakdown: result.breakdown,
        });
      }

      case 'statistics': {
        const result = await getCertificationStatistics();

        return NextResponse.json({
          success: true,
          statistics: result.statistics,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[API] Certification error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process certification request',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/privacy/certifications
 * Get certification types and checklist
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const getChecklist = url.searchParams.get('checklist');

    const response = {
      success: true,
      certificationTypes: [
        'ISO_27001',
        'SOC_2',
        'GDPR_Compliance',
        'Privacy_Shield',
        'CCPA_Compliance',
      ],
      supportedActions: [
        'create',
        'update_checklist',
        'get_by_id',
        'list',
        'generate_documentation',
        'calculate_progress',
        'statistics',
      ],
    };

    if (getChecklist === 'true') {
      response.iso27001Checklist = ISO_27001_CHECKLIST;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Get certification info error:', error);
    return NextResponse.json(
      { error: 'Failed to get certification information' },
      { status: 500 }
    );
  }
}
