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
export class DataExportService {
  /**
   * Get authentication token from Firebase
   * @private
   * @returns {Promise<string>} Firebase ID token
   * @throws {Error} If user is not authenticated
   */
  static async getAuthToken() {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('User must be authenticated to access data export services');
    }

    return await user.getIdToken();
  }

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
      const token = await this.getAuthToken();

      const exportOptions = {
        includeContacts: options.includeContacts !== undefined ? options.includeContacts : true,
        includeAnalytics: options.includeAnalytics !== undefined ? options.includeAnalytics : true,
        includeConsents: options.includeConsents !== undefined ? options.includeConsents : true,
        includeSettings: options.includeSettings !== undefined ? options.includeSettings : true,
        format: options.format || 'json',
        ...options
      };

      const response = await fetch('/api/user/privacy/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportOptions)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to request data export: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error requesting data export:', error);
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
      const token = await this.getAuthToken();

      const response = await fetch(`/api/user/privacy/export?requestId=${requestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch export status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching export status for ${requestId}:`, error);
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
      const token = await this.getAuthToken();

      // Build query parameters
      const params = new URLSearchParams({
        history: 'true',
        limit: (options.limit || 50).toString()
      });

      if (options.status) {
        params.append('status', options.status);
      }

      const response = await fetch(`/api/user/privacy/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch export history: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching export history:', error);
      throw error;
    }
  }

  /**
   * Download a file to the user's device
   * @param {string} filename - The name for the downloaded file
   * @param {string|Blob} content - The file content (string or Blob)
   * @param {string} mimeType - MIME type of the file (default: 'application/json')
   * @returns {void}
   *
   * @example
   * // Download JSON data
   * const data = JSON.stringify({ user: 'data' }, null, 2);
   * DataExportService.downloadFile('my-data.json', data, 'application/json');
   *
   * // Download CSV data
   * DataExportService.downloadFile('my-data.csv', csvContent, 'text/csv');
   */
  static downloadFile(filename, content, mimeType = 'application/json') {
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
    } catch (error) {
      console.error('Error downloading file:', error);
      throw new Error(`Failed to download file: ${error.message}`);
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

      // If downloadUrl is provided, fetch and download
      if (status.downloadUrl) {
        const token = await this.getAuthToken();
        const response = await fetch(status.downloadUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error(`Failed to download export file: ${response.status}`);
        }

        const blob = await response.blob();
        const exportFilename = filename || `data-export-${requestId}.json`;
        this.downloadFile(exportFilename, blob);
      }
    } catch (error) {
      console.error(`Error downloading export ${requestId}:`, error);
      throw error;
    }
  }
}
