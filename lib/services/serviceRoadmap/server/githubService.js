import { Octokit } from '@octokit/rest';
import {
  LABEL_CATEGORY_MAP,
  ROADMAP_LIMITS,
  ROADMAP_ERRORS,
  SUBCATEGORY_KEYWORDS,
  CATEGORY_KEYS,
} from '../constants/roadmapConstants';
import cacheManager from './cacheManager';

/**
 * GitHub Service - Fetch issues and project data via GitHub API
 * Server-side only service using Octokit
 */
export class GitHubService {
  /**
   * Initialize Octokit instance with authentication
   * @returns {Octokit} Configured Octokit instance
   */
  static getOctokit() {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      console.warn('⚠️ [GitHubService] No GITHUB_TOKEN found - using unauthenticated requests (60/hour limit)');
    }

    return new Octokit({
      auth: token,
      userAgent: 'Weavink-Roadmap/1.0',
      baseUrl: 'https://api.github.com',
    });
  }

  /**
   * Get planned features from GitHub issues
   * @param {Object} options - Query options
   * @param {string} options.owner - Repository owner
   * @param {string} options.repo - Repository name
   * @param {boolean} options.forceRefresh - Skip cache
   * @returns {Promise<Array>} Array of parsed issues
   */
  static async getPlannedFeatures(options = {}) {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`📊 [GitHubService:${requestId}] Fetching issues`, options);

    const owner = options.owner || process.env.GITHUB_REPO_OWNER;
    const repo = options.repo || process.env.GITHUB_REPO_NAME;

    if (!owner || !repo) {
      console.error(`💥 [GitHubService:${requestId}] Missing repository configuration`);
      console.warn(`⚠️ [GitHubService:${requestId}] Set GITHUB_REPO_OWNER and GITHUB_REPO_NAME in environment`);
      return [];
    }

    // Check cache first
    const cacheKey = `issues_${owner}_${repo}`;
    if (!options.forceRefresh) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        console.log(`✅ [GitHubService:${requestId}] Returning cached issues (${cached.length})`);
        return cached;
      }
    }

    try {
      const octokit = this.getOctokit();

      // Fetch open issues with retries
      const issues = await this.fetchWithRetry(async () => {
        console.log(`🔍 [GitHubService:${requestId}] Fetching from GitHub API...`);
        const response = await octokit.issues.listForRepo({
          owner,
          repo,
          state: 'open',
          labels: 'enhancement,feature,roadmap',
          per_page: Math.min(100, ROADMAP_LIMITS.MAX_ISSUES),
          sort: 'created',
          direction: 'desc',
        });

        return response.data;
      }, requestId);

      // Parse issues
      const parsedIssues = issues.map(issue => this.parseIssue(issue));
      console.log(`✅ [GitHubService:${requestId}] Fetched ${parsedIssues.length} issues`);

      // Cache results
      cacheManager.set(cacheKey, parsedIssues, ROADMAP_LIMITS.GITHUB_CACHE_TTL);

      return parsedIssues;

    } catch (error) {
      console.error(`💥 [GitHubService:${requestId}] Error fetching issues:`, error.message);

      // Check for rate limiting
      if (error.status === 403 && error.message.includes('rate limit')) {
        console.error(`🔴 [GitHubService:${requestId}] GitHub rate limit exceeded`);

        // Try to return cached data even if expired
        const cached = cacheManager.get(cacheKey, true);
        if (cached) {
          console.warn(`⚠️ [GitHubService:${requestId}] Returning stale cache due to rate limit`);
          return cached;
        }
      }

      // Check for authentication errors
      if (error.status === 401) {
        console.error(`🔴 [GitHubService:${requestId}] ${ROADMAP_ERRORS.GITHUB_AUTH_ERROR}`);
      }

      // Return empty array instead of throwing
      return [];
    }
  }

  /**
   * Parse GitHub issue into our format
   * @param {Object} issue - Raw GitHub issue
   * @returns {Object} Parsed issue object
   */
  static parseIssue(issue) {
    const category = this.inferCategoryFromLabels(issue.labels);
    const subcategory = this.inferSubcategoryFromIssue(issue);
    const priority = this.inferPriority(issue);

    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      description: issue.body || '',
      labels: issue.labels.map(l => l.name),
      priority,
      milestone: issue.milestone?.title || null,
      assignee: issue.assignee?.login || null,
      created: new Date(issue.created_at),
      updated: new Date(issue.updated_at),
      url: issue.html_url,
      category,
      subcategory,
      type: 'issue',
    };
  }

  /**
   * Infer category from issue labels
   * @param {Array} labels - GitHub issue labels
   * @returns {string} Category key
   */
  static inferCategoryFromLabels(labels) {
    for (const label of labels) {
      const labelName = label.name.toLowerCase();
      if (LABEL_CATEGORY_MAP[labelName]) {
        return LABEL_CATEGORY_MAP[labelName];
      }
    }
    return CATEGORY_KEYS.OTHER;
  }

  /**
   * Infer subcategory from issue title and description
   * @param {Object} issue - GitHub issue
   * @returns {string|null} Subcategory or null
   */
  static inferSubcategoryFromIssue(issue) {
    const text = `${issue.title} ${issue.body || ''}`.toLowerCase();

    for (const [keyword, subcategory] of Object.entries(SUBCATEGORY_KEYWORDS)) {
      if (text.includes(keyword)) {
        return subcategory;
      }
    }

    return null;
  }

  /**
   * Infer priority from labels
   * @param {Object} issue - GitHub issue
   * @returns {string} Priority level (low, medium, high, critical)
   */
  static inferPriority(issue) {
    const labelNames = issue.labels.map(l => l.name.toLowerCase());

    if (labelNames.some(l => l.includes('critical') || l.includes('urgent'))) {
      return 'critical';
    }
    if (labelNames.some(l => l.includes('high') || l.includes('important'))) {
      return 'high';
    }
    if (labelNames.some(l => l.includes('low'))) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Fetch with exponential backoff retry
   * @param {Function} fn - Async function to retry
   * @param {string} requestId - Request ID for logging
   * @param {number} attempt - Current attempt number
   * @returns {Promise<any>} Result of function
   */
  static async fetchWithRetry(fn, requestId, attempt = 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= ROADMAP_LIMITS.MAX_RETRIES) {
        throw error;
      }

      // Don't retry on rate limit errors (403)
      if (error.status === 403) {
        throw error;
      }

      const delay = ROADMAP_LIMITS.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`⚠️ [GitHubService:${requestId}] Retry ${attempt}/${ROADMAP_LIMITS.MAX_RETRIES} after ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.fetchWithRetry(fn, requestId, attempt + 1);
    }
  }
}
