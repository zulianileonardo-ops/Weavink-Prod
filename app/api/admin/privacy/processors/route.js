/**
 * Processor Management API Endpoint
 * POST /api/admin/privacy/processors
 *
 * Manage third-party data processors
 * GDPR Art. 28 - Processor obligations
 */

import { NextResponse } from 'next/server';
import {
  registerProcessor,
  updateProcessor,
  updateDPA,
  conductRiskAssessment,
  scheduleAudit,
  completeAudit,
  getProcessors,
  getProcessorById,
  mapDataFlow,
  getProcessorStatistics,
  RISK_LEVELS,
  PROCESSOR_STATUS,
  DATA_CATEGORIES,
  PROCESSING_PURPOSES,
} from '../../../../../../lib/services/servicePrivacy/server/processorManagementService.js';

/**
 * POST /api/admin/privacy/processors
 * Manage processors
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'register': {
        const {
          name,
          legalName,
          country,
          contactEmail,
          contactPhone,
          dataCategories,
          processingPurposes,
          dataLocation,
          subProcessors,
          certifications,
        } = data;

        if (!name || !legalName || !country || !contactEmail) {
          return NextResponse.json(
            { error: 'Name, legal name, country, and contact email are required' },
            { status: 400 }
          );
        }

        const result = await registerProcessor({
          name,
          legalName,
          country,
          contactEmail,
          contactPhone,
          dataCategories,
          processingPurposes,
          dataLocation,
          subProcessors,
          certifications,
        });

        return NextResponse.json({
          success: true,
          processorId: result.processorId,
          processor: result.processor,
        });
      }

      case 'update': {
        const { processorId, updates } = data;

        if (!processorId || !updates) {
          return NextResponse.json(
            { error: 'Processor ID and updates are required' },
            { status: 400 }
          );
        }

        const result = await updateProcessor(processorId, updates);

        return NextResponse.json({
          success: true,
          processorId: result.processorId,
          updated: result.updated,
        });
      }

      case 'update_dpa': {
        const {
          processorId,
          documentUrl,
          signedDate,
          effectiveDate,
          expiryDate,
          version,
          signedBy,
          clauses,
        } = data;

        if (!processorId || !documentUrl || !signedDate || !effectiveDate) {
          return NextResponse.json(
            { error: 'Processor ID, document URL, signed date, and effective date are required' },
            { status: 400 }
          );
        }

        const result = await updateDPA(processorId, {
          documentUrl,
          signedDate,
          effectiveDate,
          expiryDate,
          version,
          signedBy,
          clauses,
        });

        return NextResponse.json({
          success: true,
          dpaId: result.dpaId,
          processorId: result.processorId,
          dpa: result.dpa,
        });
      }

      case 'assess_risk': {
        const { processorId, assessedBy, notes } = data;

        if (!processorId) {
          return NextResponse.json(
            { error: 'Processor ID is required' },
            { status: 400 }
          );
        }

        const result = await conductRiskAssessment(processorId, {
          assessedBy,
          notes,
        });

        return NextResponse.json({
          success: true,
          assessmentId: result.assessmentId,
          processorId: result.processorId,
          riskScore: result.riskScore,
          riskLevel: result.riskLevel,
          factors: result.factors,
          recommendations: result.recommendations,
        });
      }

      case 'schedule_audit': {
        const { processorId, scheduledDate, auditType, auditor, scope } = data;

        if (!processorId || !scheduledDate || !auditor) {
          return NextResponse.json(
            { error: 'Processor ID, scheduled date, and auditor are required' },
            { status: 400 }
          );
        }

        const result = await scheduleAudit(processorId, {
          scheduledDate,
          auditType,
          auditor,
          scope,
        });

        return NextResponse.json({
          success: true,
          auditId: result.auditId,
          processorId: result.processorId,
          audit: result.audit,
        });
      }

      case 'complete_audit': {
        const { auditId, findings, passed, notes, completedBy } = data;

        if (!auditId) {
          return NextResponse.json(
            { error: 'Audit ID is required' },
            { status: 400 }
          );
        }

        const result = await completeAudit(auditId, {
          findings,
          passed,
          notes,
          completedBy,
        });

        return NextResponse.json({
          success: true,
          auditId: result.auditId,
          processorId: result.processorId,
          passed: result.passed,
          findings: result.findings,
        });
      }

      case 'list': {
        const { status, riskLevel, country, limit } = data || {};

        const result = await getProcessors({
          status,
          riskLevel,
          country,
          limit,
        });

        return NextResponse.json({
          success: true,
          processors: result.processors,
          count: result.count,
        });
      }

      case 'get_by_id': {
        const { processorId } = data;

        if (!processorId) {
          return NextResponse.json(
            { error: 'Processor ID is required' },
            { status: 400 }
          );
        }

        const result = await getProcessorById(processorId);

        return NextResponse.json({
          success: true,
          processor: result.processor,
        });
      }

      case 'map_data_flow': {
        const { processorId, sourceSystem, dataCategories, purpose, frequency, securityMeasures } = data;

        if (!processorId || !sourceSystem || !dataCategories || !purpose) {
          return NextResponse.json(
            { error: 'Processor ID, source system, data categories, and purpose are required' },
            { status: 400 }
          );
        }

        const result = await mapDataFlow({
          processorId,
          sourceSystem,
          dataCategories,
          purpose,
          frequency,
          securityMeasures,
        });

        return NextResponse.json({
          success: true,
          flowId: result.flowId,
          flow: result.flow,
        });
      }

      case 'statistics': {
        const result = await getProcessorStatistics();

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
    console.error('[API] Processor management error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process processor request',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/privacy/processors
 * Get processor constants and info
 */
export async function GET(request) {
  try {
    return NextResponse.json({
      success: true,
      riskLevels: Object.values(RISK_LEVELS),
      processorStatuses: Object.values(PROCESSOR_STATUS),
      dataCategories: Object.values(DATA_CATEGORIES),
      processingPurposes: Object.values(PROCESSING_PURPOSES),
      supportedActions: [
        'register',
        'update',
        'update_dpa',
        'assess_risk',
        'schedule_audit',
        'complete_audit',
        'list',
        'get_by_id',
        'map_data_flow',
        'statistics',
      ],
    });
  } catch (error) {
    console.error('[API] Get processor info error:', error);
    return NextResponse.json(
      { error: 'Failed to get processor information' },
      { status: 500 }
    );
  }
}
