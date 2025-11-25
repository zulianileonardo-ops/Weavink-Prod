// lib/services/serviceContact/server/DiscoveryJobManager.js
// In-memory job storage for background relationship discovery
// Tracks progress and results for long-running discovery operations

/**
 * DiscoveryJobManager - Manages background discovery jobs
 *
 * Features:
 * - In-memory job storage (no Redis needed for single instance)
 * - Progress tracking with step descriptions
 * - Automatic cleanup of old jobs (>1 hour)
 * - Thread-safe job updates
 */

// Use globalThis to persist jobs across module reloads in development
// This ensures the Map is shared between /discover and /discover/status routes
// Without this, Next.js hot-reloading creates separate module instances
const globalKey = '__discovery_jobs__';
if (!globalThis[globalKey]) {
  globalThis[globalKey] = new Map();
}
const jobs = globalThis[globalKey];

export class DiscoveryJobManager {
  /**
   * Create a new discovery job
   * @param {string} userId - User ID
   * @returns {string} Job ID
   */
  static createJob(userId) {
    // Cleanup old jobs first
    this.cleanup();

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    jobs.set(jobId, {
      jobId,
      userId,
      status: 'started',
      progress: 0,
      currentStep: 'Initializing...',
      result: null,
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    console.log(`📋 [DiscoveryJob] Created job ${jobId} for user ${userId}`);
    return jobId;
  }

  /**
   * Update job progress
   * @param {string} jobId - Job ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} currentStep - Current step description
   */
  static updateProgress(jobId, progress, currentStep) {
    const job = jobs.get(jobId);
    if (job) {
      job.progress = Math.round(progress);
      job.currentStep = currentStep;
      job.updatedAt = Date.now();
      // Log progress at key milestones
      if (progress % 25 === 0 || progress === 100) {
        console.log(`📊 [DiscoveryJob] ${jobId}: ${progress}% - ${currentStep}`);
      }
    }
  }

  /**
   * Mark job as completed with result
   * @param {string} jobId - Job ID
   * @param {object} result - Discovery result
   */
  static completeJob(jobId, result) {
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.currentStep = 'Discovery complete!';
      job.result = result;
      job.updatedAt = Date.now();
      console.log(`✅ [DiscoveryJob] ${jobId}: Completed with ${result.similarityRelationships || 0} similarity relationships`);
    }
  }

  /**
   * Mark job as failed with error
   * @param {string} jobId - Job ID
   * @param {string} error - Error message
   */
  static failJob(jobId, error) {
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error;
      job.updatedAt = Date.now();
      console.error(`❌ [DiscoveryJob] ${jobId}: Failed - ${error}`);
    }
  }

  /**
   * Get job by ID
   * @param {string} jobId - Job ID
   * @returns {object|null} Job data or null if not found
   */
  static getJob(jobId) {
    return jobs.get(jobId) || null;
  }

  /**
   * Get job by ID with user verification
   * @param {string} jobId - Job ID
   * @param {string} userId - User ID to verify ownership
   * @returns {object|null} Job data or null if not found/unauthorized
   */
  static getJobForUser(jobId, userId) {
    const job = jobs.get(jobId);
    if (job && job.userId === userId) {
      return job;
    }
    return null;
  }

  /**
   * Cleanup old jobs (>1 hour old)
   */
  static cleanup() {
    const oneHourAgo = Date.now() - 3600000;
    let cleaned = 0;
    for (const [id, job] of jobs) {
      if (job.createdAt < oneHourAgo) {
        jobs.delete(id);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 [DiscoveryJob] Cleaned up ${cleaned} old jobs`);
    }
  }

  /**
   * Get all jobs for a user (for debugging)
   * @param {string} userId - User ID
   * @returns {Array} Array of jobs
   */
  static getJobsForUser(userId) {
    return Array.from(jobs.values()).filter(job => job.userId === userId);
  }

  /**
   * Get job count (for monitoring)
   * @returns {number} Number of active jobs
   */
  static getJobCount() {
    return jobs.size;
  }
}

export default DiscoveryJobManager;
