'use client';

/**
 * Client-side service for managing data export operations
 * Handles GDPR data portability requests (Article 20)
 *
 * @class DataExportService
 * @description Provides methods to:
 * - Request data exports
 * - Check export status
 * - Retrieve export history
 * - Download export files
 */

import { ContactApiClient } from '@/lib/services/core/ApiClient';
import { PRIVACY_EXPORT_FORMATS } from '@/lib/services/constants';

export class DataExportService {
  /**
   * Request a new data export
   * @param {Object} options - Export configuration options
   * @param {boolean} options.includeContacts - Include contact data (default: true)
   * @param {boolean} options.includeAnalytics - Include analytics data (default: true)
   * @param {boolean} options.includeConsents - Include consent records (default: true)
   * @param {boolean} options.includeSettings - Include user settings (default: true)
   * @param {string} options.format - Export format: 'json' or 'csv' (default: 'json')
   * @returns {Promise<Object>} Export request confirmation with requestId
   * @throws {Error} If the API request fails
   *
   * @example
   * const result = await DataExportService.requestExport({
   *   includeContacts: true,
   *   includeAnalytics: true,
   *   includeConsents: true,
   *   format: 'json'
   * });
   * // Returns: { success: true, requestId: '...', estimatedTime: '...' }
   */
  static async requestExport(options = {}) {
    try {
      const exportOptions = {
        includeContacts: options.includeContacts !== undefined ? options.includeContacts : true,
        includeAnalytics: options.includeAnalytics !== undefined ? options.includeAnalytics : true,
        includeConsents: options.includeConsents !== undefined ? options.includeConsents : true,
        includeSettings: options.includeSettings !== undefined ? options.includeSettings : true,
        format: options.format || PRIVACY_EXPORT_FORMATS.JSON,
        ...options,
      };

      return await ContactApiClient.post('/api/user/privacy/export', exportOptions);
    } catch (error) {
      console.error('❌ [DataExportService] Error requesting data export:', error);
      throw error;
    }
  }

  /**
   * Get the status of a specific export request
   * @param {string} requestId - The ID of the export request to check
   * @returns {Promise<Object>} Export request status and metadata
   * @throws {Error} If the API request fails
   *
   * @example
   * const status = await DataExportService.getExportStatus('export_123456');
   * // Returns: { status: 'completed', downloadUrl: '...', expiresAt: '...' }
   */
  static async getExportStatus(requestId) {
    try {
      return await ContactApiClient.get(`/api/user/privacy/export?requestId=${requestId}`);
    } catch (error) {
      console.error(`❌ [DataExportService] Error fetching export status for ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Get export history for the current user
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of records to retrieve (default: 50)
   * @param {string} options.status - Filter by status: 'pending', 'processing', 'completed', 'failed'
   * @returns {Promise<Array>} Array of export history records
   * @throws {Error} If the API request fails
   *
   * @example
   * const history = await DataExportService.getExportHistory({ limit: 10 });
   * // Returns: [{ requestId: '...', status: 'completed', createdAt: '...' }, ...]
   */
  static async getExportHistory(options = {}) {
    try {
      // Build query parameters
      const params = new URLSearchParams({
        history: 'true',
        limit: (options.limit || 50).toString(),
      });

      if (options.status) {
        params.append('status', options.status);
      }

      return await ContactApiClient.get(`/api/user/privacy/export?${params.toString()}`);
    } catch (error) {
      console.error('❌ [DataExportService] Error fetching export history:', error);
      throw error;
    }
  }

  /**
   * Track a file download in audit logs
   * @param {string} requestId - Export request ID
   * @param {string} filename - Name of downloaded file
   * @returns {Promise<void>}
   * @private
   */
  static async trackDownload(requestId, filename) {
    if (!requestId) return; // Don't track if no requestId provided

    try {
      await ContactApiClient.post('/api/user/privacy/export/track-download', {
        requestId,
        filename,
      });
      console.log(`✅ [DataExportService] Download tracked: ${filename}`);
    } catch (error) {
      console.error('❌ [DataExportService] Error tracking download:', error);
      // Don't throw - tracking failure shouldn't block download
    }
  }

  /**
   * Download a file to the user's device
   * @param {string} filename - The name for the downloaded file
   * @param {string|Blob} content - The file content (string or Blob)
   * @param {string} mimeType - MIME type of the file (default: 'application/json')
   * @param {string} requestId - Optional export request ID for audit tracking
   * @returns {Promise<void>}
   *
   * @example
   * // Download JSON data
   * const data = JSON.stringify({ user: 'data' }, null, 2);
   * await DataExportService.downloadFile('my-data.json', data, 'application/json');
   *
   * // Download CSV data with tracking
   * await DataExportService.downloadFile('my-data.csv', csvContent, 'text/csv', 'req_123');
   */
  static async downloadFile(filename, content, mimeType = 'application/json', requestId = null) {
    try {
      // Create blob from content
      let blob;
      if (content instanceof Blob) {
        blob = content;
      } else {
        blob = new Blob([content], { type: mimeType });
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Track download in audit logs
      if (requestId) {
        await this.trackDownload(requestId, filename);
      }
    } catch (error) {
      console.error('❌ [DataExportService] Error downloading file:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Download all exported files as a single ZIP archive
   * @param {Object} files - Object containing all export files (from export response)
   * @param {string} zipFilename - Optional custom filename for the ZIP (default: 'weavink-export-{date}.zip')
   * @param {string} requestId - Optional export request ID for audit tracking
   * @returns {Promise<void>}
   * @throws {Error} If ZIP creation or download fails
   *
   * @example
   * // files = { 'profile.json': { content: '...', description: '...', format: 'json' }, ... }
   * await DataExportService.downloadAllAsZip(exportResult.files, null, 'req_123');
   */
  static async downloadAllAsZip(files, zipFilename = null, requestId = null) {
    try {
      // Dynamically import JSZip (for better code splitting)
      const JSZip = (await import('jszip')).default;

      const zip = new JSZip();

      // Create a folder inside the ZIP for organization
      const exportFolder = zip.folder('weavink-data-export');

      // Add each file to the ZIP
      Object.entries(files).forEach(([filename, fileData]) => {
        exportFolder.file(filename, fileData.content);
      });

      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Generate filename with timestamp if not provided
      const finalFilename = zipFilename || `weavink-export-${new Date().toISOString().split('T')[0]}.zip`;

      // Download the ZIP file (with tracking)
      await this.downloadFile(finalFilename, zipBlob, 'application/zip', requestId);

      console.log(`✅ [DataExportService] Successfully created and downloaded ZIP: ${finalFilename}`);
    } catch (error) {
      console.error('❌ [DataExportService] Error creating ZIP file:', error);
      throw new Error(`Failed to create ZIP file: ${error.message}`);
    }
  }

  /**
   * Download an export file by requestId
   * @param {string} requestId - The ID of the export request
   * @param {string} filename - Optional custom filename (default: auto-generated)
   * @returns {Promise<void>}
   * @throws {Error} If the export is not ready or download fails
   *
   * @example
   * await DataExportService.downloadExport('export_123456', 'my-export.json');
   */
  static async downloadExport(requestId, filename = null) {
    try {
      const status = await this.getExportStatus(requestId);

      if (status.status !== 'completed') {
        throw new Error(`Export is not ready. Current status: ${status.status}`);
      }

      if (!status.data && !status.downloadUrl) {
        throw new Error('Export data not available');
      }

      // If data is provided directly, download it
      if (status.data) {
        const exportFilename = filename || `data-export-${requestId}.json`;
        const content = JSON.stringify(status.data, null, 2);
        this.downloadFile(exportFilename, content, 'application/json');
        return;
      }

      // If downloadUrl is provided, fetch and download using ContactApiClient
      if (status.downloadUrl) {
        const response = await ContactApiClient.get(status.downloadUrl, { responseType: 'blob' });

        const blob = response instanceof Blob ? response : await response.blob();
        const exportFilename = filename || `data-export-${requestId}.json`;
        this.downloadFile(exportFilename, blob);
      }
    } catch (error) {
      console.error(`❌ [DataExportService] Error downloading export ${requestId}:`, error);
      throw error;
    }
  }
}
