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

  // ============================================
  // TIERED RELATIONSHIP DISCOVERY METHODS
  // ============================================

  /**
   * Update job with tiered relationship results
   * @param {string} jobId - Job ID
   * @param {object} relationships - Tiered relationships { high: [], medium: [], low: [] }
   * @param {object} counts - Relationship counts { high, medium, low, total }
   */
  static updateRelationshipResults(jobId, relationships, counts) {
    const job = jobs.get(jobId);
    if (job) {
      job.relationships = relationships;
      job.relationshipCounts = counts;
      job.hasPendingRelationships = (counts.medium > 0 || counts.low > 0);
      job.updatedAt = Date.now();
      console.log(`📊 [DiscoveryJob] ${jobId}: Updated with ${counts.high} HIGH, ${counts.medium} MEDIUM, ${counts.low} LOW relationships`);
    }
  }

  /**
   * Get pending relationships for a specific tier
   * @param {string} jobId - Job ID
   * @param {string} tier - Confidence tier ('medium' or 'low')
   * @returns {object} { relationships: [], total: number, reviewed: number }
   */
  static getPendingRelationships(jobId, tier = 'medium') {
    const job = jobs.get(jobId);
    if (!job || !job.relationships) {
      return { relationships: [], total: 0, reviewed: 0 };
    }

    const tierRelationships = job.relationships[tier] || [];
    const pending = tierRelationships.filter(r => !r.reviewStatus || r.reviewStatus === 'pending');
    const reviewed = tierRelationships.filter(r => r.reviewStatus && r.reviewStatus !== 'pending').length;

    return {
      relationships: pending,
      total: tierRelationships.length,
      reviewed
    };
  }

  /**
   * Mark a relationship as reviewed (approved or rejected)
   * @param {string} jobId - Job ID
   * @param {string} sourceId - Source contact ID
   * @param {string} targetId - Target contact ID
   * @param {string} status - Review status ('approved' | 'rejected')
   * @returns {boolean} Success status
   */
  static markRelationshipReviewed(jobId, sourceId, targetId, status) {
    const job = jobs.get(jobId);
    if (!job || !job.relationships) {
      return false;
    }

    // Search in medium and low tiers
    for (const tier of ['medium', 'low']) {
      const relationships = job.relationships[tier] || [];
      const rel = relationships.find(r =>
        (r.sourceId === sourceId && r.targetId === targetId) ||
        (r.sourceId === targetId && r.targetId === sourceId)
      );

      if (rel) {
        rel.reviewStatus = status;
        rel.reviewedAt = Date.now();
        if (status === 'approved') {
          rel.savedToNeo4j = true;
        }
        job.updatedAt = Date.now();
        console.log(`📝 [DiscoveryJob] ${jobId}: Marked relationship ${sourceId} <-> ${targetId} as ${status}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Store LLM assessment for a relationship
   * @param {string} jobId - Job ID
   * @param {string} sourceId - Source contact ID
   * @param {string} targetId - Target contact ID
   * @param {object} assessment - LLM assessment { explanation, connectionType, confidence, suggestedAction }
   * @returns {boolean} Success status
   */
  static storeAssessment(jobId, sourceId, targetId, assessment) {
    const job = jobs.get(jobId);
    if (!job || !job.relationships) {
      return false;
    }

    // Search in medium tier (assessments are typically for medium confidence)
    for (const tier of ['medium', 'low']) {
      const relationships = job.relationships[tier] || [];
      const rel = relationships.find(r =>
        (r.sourceId === sourceId && r.targetId === targetId) ||
        (r.sourceId === targetId && r.targetId === sourceId)
      );

      if (rel) {
        rel.llmAssessment = assessment;
        rel.assessedAt = Date.now();
        job.updatedAt = Date.now();
        console.log(`🤖 [DiscoveryJob] ${jobId}: Stored LLM assessment for ${sourceId} <-> ${targetId}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Get a specific relationship from the job
   * @param {string} jobId - Job ID
   * @param {string} sourceId - Source contact ID
   * @param {string} targetId - Target contact ID
   * @returns {object|null} Relationship data or null
   */
  static getRelationship(jobId, sourceId, targetId) {
    const job = jobs.get(jobId);
    if (!job || !job.relationships) {
      return null;
    }

    for (const tier of ['high', 'medium', 'low']) {
      const relationships = job.relationships[tier] || [];
      const rel = relationships.find(r =>
        (r.sourceId === sourceId && r.targetId === targetId) ||
        (r.sourceId === targetId && r.targetId === sourceId)
      );
      if (rel) {
        return { ...rel, tier };
      }
    }

    return null;
  }

  /**
   * Get summary of relationship review status for a job
   * @param {string} jobId - Job ID
   * @returns {object} { pending, approved, rejected, total }
   */
  static getReviewSummary(jobId) {
    const job = jobs.get(jobId);
    if (!job || !job.relationships) {
      return { pending: 0, approved: 0, rejected: 0, total: 0 };
    }

    let pending = 0;
    let approved = 0;
    let rejected = 0;

    for (const tier of ['medium', 'low']) {
      const relationships = job.relationships[tier] || [];
      for (const rel of relationships) {
        if (!rel.reviewStatus || rel.reviewStatus === 'pending') {
          pending++;
        } else if (rel.reviewStatus === 'approved') {
          approved++;
        } else if (rel.reviewStatus === 'rejected') {
          rejected++;
        }
      }
    }

    return {
      pending,
      approved,
      rejected,
      total: pending + approved + rejected
    };
  }
}

export default DiscoveryJobManager;
