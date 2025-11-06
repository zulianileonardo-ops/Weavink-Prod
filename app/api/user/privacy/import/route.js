/**
 * Data Import API Endpoint
 * POST /api/user/privacy/import
 *
 * Import data from external sources (Google, Outlook, etc.)
 * GDPR Art. 20 - Right to Data Portability (Import)
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  importContacts,
  exportToXML,
  exportToPDF,
  scheduleExport,
  getExportHistory,
  IMPORT_SOURCES,
  EXPORT_FORMATS,
} from '../../../../../lib/services/servicePrivacy/server/dataPortabilityService.js';

/**
 * POST /api/user/privacy/import
 * Import contacts from external sources
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, userId, data } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'import_contacts': {
        const { source, contactData, options } = data;

        if (!source || !contactData) {
          return NextResponse.json(
            { error: 'Source and contact data are required' },
            { status: 400 }
          );
        }

        const result = await importContacts(userId, {
          source,
          data: contactData,
          options: options || {},
        });

        return NextResponse.json({
          success: true,
          imported: result.imported,
          total: result.total,
          errors: result.errors,
          source: result.source,
        });
      }

      case 'export_xml': {
        const { includeContacts } = data || {};
        const result = await exportToXML(userId, { includeContacts });

        return NextResponse.json({
          success: true,
          format: result.format,
          content: result.content,
          filename: result.filename,
          size: result.size,
        });
      }

      case 'export_pdf': {
        const { includeContacts } = data || {};
        const result = await exportToPDF(userId, { includeContacts });

        return NextResponse.json({
          success: true,
          format: result.format,
          content: result.content,
          contentType: result.contentType,
          filename: result.filename,
          size: result.size,
          note: result.note,
        });
      }

      case 'schedule_export': {
        const { frequency, format, includeContacts } = data;

        if (!frequency || !format) {
          return NextResponse.json(
            { error: 'Frequency and format are required' },
            { status: 400 }
          );
        }

        const result = await scheduleExport(userId, {
          frequency,
          format,
          includeContacts: includeContacts || false,
        });

        return NextResponse.json({
          success: true,
          scheduleId: result.scheduleId,
          schedule: result.schedule,
        });
      }

      case 'export_history': {
        const { limit } = data || {};
        const result = await getExportHistory(userId, { limit });

        return NextResponse.json({
          success: true,
          exports: result.exports,
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
    console.error('[API] Data import error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process data import request',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/privacy/import
 * Get supported import sources and export formats
 */
export async function GET(request) {
  try {
    return NextResponse.json({
      success: true,
      importSources: Object.values(IMPORT_SOURCES),
      exportFormats: Object.values(EXPORT_FORMATS),
      supportedActions: [
        'import_contacts',
        'export_xml',
        'export_pdf',
        'schedule_export',
        'export_history',
      ],
    });
  } catch (error) {
    console.error('[API] Get import info error:', error);
    return NextResponse.json(
      { error: 'Failed to get import information' },
      { status: 500 }
    );
  }
}
