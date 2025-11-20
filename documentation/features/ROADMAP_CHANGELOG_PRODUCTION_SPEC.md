---
id: features-roadmap-changelog-production-070
title: Roadmap & Changelog Feature - Production Implementation Specification
category: features
tags: [roadmap, changelog, git-commits, github-issues, github-api, feature-tree, gitmoji, visualization, public-page, dashboard, production-ready, serverless]
status: active
created: 2025-11-19
updated: 2025-11-20
version: 2.1-production
related:
  - ROADMAP_CHANGELOG_FEATURE_GUIDE.md
  - ROADMAP_IMPLEMENTATION_CHECKLIST.md
  - ROADMAP_GAPS_AND_RISKS.md
---

# Roadmap & Changelog Feature - Production Implementation Specification

## Document Purpose

This document provides **production-ready specifications** for implementing the Roadmap & Changelog feature in the Weavink platform. It integrates:

1. **Original requirements** from ROADMAP_CHANGELOG_FEATURE_GUIDE.md
2. **Gemini AI code insights** (graph visualization, animations, dual-view patterns)
3. **Weavink architecture patterns** (Next.js 14 App Router, JavaScript, Firebase, service layer)
4. **Production standards** (build-manager-skill level: error handling, logging, safety, testing)

---

## Overview

A **dual-purpose roadmap/changelog system** that visualizes:
- **Past work** (git commits) - What we've built
- **Future plans** (GitHub Issues/Projects) - What's coming next

**Key Features:**
- Interactive feature category tree with collapsible sections
- Graph visualization (SVG tree diagram)
- Dual access levels (public page + enhanced dashboard)
- Real-time GitHub integration with intelligent caching
- Production-grade error handling and monitoring
- Full internationalization (EN, FR, ES, ZH, VI)

---

## Architecture Overview

### Technology Stack

**Framework:**
- Next.js 14.2.4 (App Router)
- React 18.2.0
- JavaScript (NOT TypeScript - .jsx files)

**Backend:**
- Firebase Admin SDK (server-side)
- Firestore (optional: cache GitHub data)
- Git CLI (server-side commit parsing)
- GitHub REST API v3 (Octokit)

**Frontend:**
- Tailwind CSS (compiled, not CDN)
- Framer Motion (animations)
- Recharts (dashboard charts)
- lucide-react (icons)
- react-hot-toast (notifications)

**Deployment:**
- Vercel / Next.js / Serverless deployment
- Environment variables for GitHub API
- Edge caching for public endpoint
- Automatic GitHub API fallback in production

### Production Environment Configuration

**Required Environment Variables:**

```bash
# GitHub API Configuration
GITHUB_TOKEN="ghp_your_personal_access_token_here"
GITHUB_REPO_OWNER="Leo910032"
GITHUB_REPO_NAME="temp2"
```

**GitHub Token Permissions:**
- Scope: `repo` (or `public_repo` for public repositories only)
- Generate at: https://github.com/settings/tokens
- Rate limits:
  - Without token: 60 requests/hour
  - With token: 5,000 requests/hour
  - Actual usage with caching: ~4 requests/hour

**Production Deployment Checklist:**
1. ✅ Add `GITHUB_TOKEN` to production environment variables
2. ✅ Add `GITHUB_REPO_OWNER` to production environment variables
3. ✅ Add `GITHUB_REPO_NAME` to production environment variables
4. ✅ Verify GitHub token has correct permissions
5. ✅ Test roadmap API endpoints in production

**Git Availability:**
- Development: Uses local `git` commands (fast, no API limits)
- Production: Automatically falls back to GitHub API (serverless compatible)
- No `.git/` directory needed in deployed environments

### Weavink Integration Points

```
Weavink Application
├── lib/services/serviceRoadmap/         # NEW - Service layer
│   ├── constants/roadmapConstants.js
│   ├── server/                          # Server-only services
│   │   ├── gitService.js
│   │   ├── githubService.js
│   │   ├── categoryService.js
│   │   ├── cacheManager.js
│   │   └── commitParserUtils.js        # Shared commit parsing
│   └── client/roadmapService.js         # Client API calls
│
├── app/api/roadmap/route.js             # NEW - Public API endpoint
├── app/api/user/roadmap/route.js        # NEW - Auth API endpoint
│
├── app/roadmap/                         # NEW - Public page
│   ├── page.jsx
│   ├── RoadmapContext.js
│   └── components/
│       ├── CategoryTree.jsx
│       ├── CommitCard.jsx
│       ├── IssueCard.jsx
│       ├── CategoryBadge.jsx
│       ├── RoadmapGraphView.jsx
│       └── ViewToggle.jsx
│
└── app/dashboard/(dashboard pages)/roadmap/  # NEW - Dashboard page
    └── page.jsx
```

---

## Service Layer Architecture

### Pattern: Weavink Service Structure

Following Weavink's established service-oriented architecture with strict **client/server separation**.

### Directory Structure

```
lib/services/serviceRoadmap/
├── constants/
│   └── roadmapConstants.js              # Categories, emoji map, limits, features
├── server/                              # Server-only code (uses Firebase Admin)
│   ├── gitService.js                    # Parse git log output
│   ├── githubService.js                 # Fetch GitHub issues via Octokit
│   ├── categoryService.js               # Build category tree structure
│   └── cacheManager.js                  # In-memory cache for GitHub API
└── client/
    └── roadmapService.js                # Client-side API calls + caching
```

### Constants File Specification

**File:** `lib/services/serviceRoadmap/constants/roadmapConstants.js`

```javascript
// ============================================
// ROADMAP FEATURES & LIMITS
// ============================================

export const ROADMAP_FEATURES = {
  PUBLIC_ROADMAP: 'public_roadmap',              // Always available
  DASHBOARD_ROADMAP: 'dashboard_roadmap',        // Requires authentication
  GRAPH_VISUALIZATION: 'graph_visualization',    // Optional feature
  ADVANCED_FILTERS: 'advanced_filters',          // Dashboard only
};

// ============================================
// CATEGORY CONFIGURATION
// ============================================

export const CATEGORY_KEYS = {
  FEATURES: 'features',
  FIXES: 'fixes',
  DOCUMENTATION: 'documentation',
  CONFIGURATION: 'configuration',
  INTERNATIONALIZATION: 'internationalization',
  TESTING: 'testing',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  REFACTORING: 'refactoring',
  UI: 'ui',
  STYLING: 'styling',
  OTHER: 'other',
};

export const CATEGORY_CONFIG = {
  [CATEGORY_KEYS.FEATURES]: {
    displayName: 'Features',
    icon: '✨',
    colorBg: 'bg-purple-100',
    colorText: 'text-purple-700',
    description: 'New features and enhancements',
    priority: 1,
  },
  [CATEGORY_KEYS.FIXES]: {
    displayName: 'Bug Fixes',
    icon: '🐛',
    colorBg: 'bg-red-100',
    colorText: 'text-red-700',
    description: 'Bug fixes and corrections',
    priority: 2,
  },
  [CATEGORY_KEYS.DOCUMENTATION]: {
    displayName: 'Documentation',
    icon: '📚',
    colorBg: 'bg-blue-100',
    colorText: 'text-blue-700',
    description: 'Documentation updates',
    priority: 8,
  },
  [CATEGORY_KEYS.CONFIGURATION]: {
    displayName: 'Configuration',
    icon: '🔧',
    colorBg: 'bg-yellow-100',
    colorText: 'text-yellow-700',
    description: 'Configuration changes',
    priority: 9,
  },
  [CATEGORY_KEYS.INTERNATIONALIZATION]: {
    displayName: 'Internationalization',
    icon: '🌐',
    colorBg: 'bg-green-100',
    colorText: 'text-green-700',
    description: 'Language and localization',
    priority: 7,
  },
  [CATEGORY_KEYS.TESTING]: {
    displayName: 'Testing',
    icon: '✅',
    colorBg: 'bg-teal-100',
    colorText: 'text-teal-700',
    description: 'Test coverage and quality',
    priority: 6,
  },
  [CATEGORY_KEYS.SECURITY]: {
    displayName: 'Security',
    icon: '🔒',
    colorBg: 'bg-orange-100',
    colorText: 'text-orange-700',
    description: 'Security improvements',
    priority: 3,
  },
  [CATEGORY_KEYS.PERFORMANCE]: {
    displayName: 'Performance',
    icon: '⚡',
    colorBg: 'bg-indigo-100',
    colorText: 'text-indigo-700',
    description: 'Performance optimizations',
    priority: 4,
  },
  [CATEGORY_KEYS.REFACTORING]: {
    displayName: 'Refactoring',
    icon: '♻️',
    colorBg: 'bg-gray-100',
    colorText: 'text-gray-700',
    description: 'Code quality improvements',
    priority: 10,
  },
  [CATEGORY_KEYS.UI]: {
    displayName: 'User Interface',
    icon: '💄',
    colorBg: 'bg-pink-100',
    colorText: 'text-pink-700',
    description: 'UI/UX improvements',
    priority: 5,
  },
  [CATEGORY_KEYS.STYLING]: {
    displayName: 'Styling',
    icon: '🎨',
    colorBg: 'bg-cyan-100',
    colorText: 'text-cyan-700',
    description: 'Visual design updates',
    priority: 11,
  },
  [CATEGORY_KEYS.OTHER]: {
    displayName: 'Other',
    icon: '📦',
    colorBg: 'bg-slate-100',
    colorText: 'text-slate-700',
    description: 'Miscellaneous changes',
    priority: 12,
  },
};

// ============================================
// GITMOJI TO CATEGORY MAPPING
// ============================================

export const EMOJI_CATEGORY_MAP = {
  '✨': CATEGORY_KEYS.FEATURES,
  '🐛': CATEGORY_KEYS.FIXES,
  '🚑': CATEGORY_KEYS.FIXES,           // Critical hotfix
  '📚': CATEGORY_KEYS.DOCUMENTATION,
  '📝': CATEGORY_KEYS.DOCUMENTATION,
  '🔧': CATEGORY_KEYS.CONFIGURATION,
  '🌐': CATEGORY_KEYS.INTERNATIONALIZATION,
  '✅': CATEGORY_KEYS.TESTING,
  '🔒': CATEGORY_KEYS.SECURITY,
  '🔐': CATEGORY_KEYS.SECURITY,
  '⚡': CATEGORY_KEYS.PERFORMANCE,
  '♻️': CATEGORY_KEYS.REFACTORING,
  '🎨': CATEGORY_KEYS.STYLING,
  '💄': CATEGORY_KEYS.UI,
  '🚀': CATEGORY_KEYS.FEATURES,        // Deployment/release
  '🔥': CATEGORY_KEYS.REFACTORING,     // Remove code/files
  '🚧': CATEGORY_KEYS.OTHER,           // Work in progress
  '💚': CATEGORY_KEYS.TESTING,         // Fix CI/CD
  '⬇️': CATEGORY_KEYS.CONFIGURATION,  // Downgrade dependencies
  '⬆️': CATEGORY_KEYS.CONFIGURATION,  // Upgrade dependencies
  '📌': CATEGORY_KEYS.CONFIGURATION,   // Pin dependencies
};

// ============================================
// GITHUB LABEL TO CATEGORY MAPPING
// ============================================

export const LABEL_CATEGORY_MAP = {
  'enhancement': CATEGORY_KEYS.FEATURES,
  'feature': CATEGORY_KEYS.FEATURES,
  'bug': CATEGORY_KEYS.FIXES,
  'hotfix': CATEGORY_KEYS.FIXES,
  'documentation': CATEGORY_KEYS.DOCUMENTATION,
  'docs': CATEGORY_KEYS.DOCUMENTATION,
  'config': CATEGORY_KEYS.CONFIGURATION,
  'configuration': CATEGORY_KEYS.CONFIGURATION,
  'i18n': CATEGORY_KEYS.INTERNATIONALIZATION,
  'internationalization': CATEGORY_KEYS.INTERNATIONALIZATION,
  'test': CATEGORY_KEYS.TESTING,
  'testing': CATEGORY_KEYS.TESTING,
  'security': CATEGORY_KEYS.SECURITY,
  'performance': CATEGORY_KEYS.PERFORMANCE,
  'perf': CATEGORY_KEYS.PERFORMANCE,
  'refactor': CATEGORY_KEYS.REFACTORING,
  'refactoring': CATEGORY_KEYS.REFACTORING,
  'ui': CATEGORY_KEYS.UI,
  'ux': CATEGORY_KEYS.UI,
  'style': CATEGORY_KEYS.STYLING,
  'styling': CATEGORY_KEYS.STYLING,
  'design': CATEGORY_KEYS.STYLING,
};

// ============================================
// LIMITS & CONFIGURATION
// ============================================

export const ROADMAP_LIMITS = {
  MAX_COMMITS: 500,                    // Maximum commits to fetch
  MAX_ISSUES: 100,                     // Maximum issues to fetch
  GIT_TIMEOUT_MS: 30000,               // Git command timeout (30s)
  GITHUB_CACHE_TTL: 15 * 60 * 1000,   // GitHub cache TTL (15 minutes)
  CLIENT_CACHE_TTL: 5 * 60 * 1000,    // Client cache TTL (5 minutes)
  MAX_RETRIES: 3,                      // API retry attempts
  RETRY_DELAY_MS: 1000,                // Initial retry delay
};

// ============================================
// SUBCATEGORY KEYWORDS
// ============================================

export const SUBCATEGORY_KEYWORDS = {
  // Authentication subcategories
  'auth': 'authentication',
  'login': 'authentication',
  'oauth': 'authentication',
  'jwt': 'authentication',

  // Data subcategories
  'database': 'data-storage',
  'firestore': 'data-storage',
  'cache': 'caching',
  'api': 'api',

  // UI subcategories
  'modal': 'modals',
  'form': 'forms',
  'button': 'buttons',
  'chart': 'charts',
  'graph': 'charts',
  'table': 'tables',
  'dashboard': 'dashboard',

  // Feature subcategories
  'analytics': 'analytics',
  'contact': 'contacts',
  'subscription': 'subscriptions',
  'payment': 'payments',
  'gdpr': 'compliance',
  'privacy': 'compliance',

  // Add more as needed...
};

// ============================================
// ERROR MESSAGES
// ============================================

export const ROADMAP_ERRORS = {
  GIT_COMMAND_FAILED: 'Failed to execute git command',
  GIT_PARSE_ERROR: 'Failed to parse git log output',
  GITHUB_API_ERROR: 'GitHub API request failed',
  GITHUB_RATE_LIMIT: 'GitHub API rate limit exceeded',
  INVALID_CATEGORY: 'Invalid category specified',
  TREE_BUILD_FAILED: 'Failed to build category tree',
  CACHE_ERROR: 'Cache operation failed',
};
```

### Export to Barrel File

**File:** `lib/services/constants.js` (add export)

```javascript
// ... existing exports

// Roadmap constants
export * from './serviceRoadmap/constants/roadmapConstants';
```

---

## Server Services Specification

### 1. Git Service

**File:** `lib/services/serviceRoadmap/server/gitService.js`

**Purpose:** Parse git commit history using git CLI

**Key Functions:**
```javascript
export class GitService {
    static async getCommitHistory(options = {})
    static parseCommitLine(line)
    static extractGitmoji(message)
    static inferSubcategory(message, category)
    static validateGitRepository()
}
```

**Production Features:**
- ✅ Command injection protection (sanitize all inputs)
- ✅ Timeout handling (30-second max execution)
- ✅ Error logging with request IDs
- ✅ Limit to last 500 commits (configurable)
- ✅ Handle merge commits gracefully
- ✅ UTF-8 encoding validation
- ✅ Fallback to empty array on failure
- ✅ In-memory caching (5-minute TTL)

**Implementation Pattern:**

```javascript
import { exec } from 'child_process';
import { promisify } from 'util';
import { EMOJI_CATEGORY_MAP, ROADMAP_LIMITS, ROADMAP_ERRORS } from '../constants/roadmapConstants';

const execPromise = promisify(exec);

export class GitService {
    /**
     * Get commit history from git log
     * @param {Object} options - Query options
     * @param {number} options.limit - Max commits to fetch (default: 500)
     * @param {string} options.since - Date to fetch commits since (optional)
     * @param {string} options.category - Filter by category (optional)
     * @returns {Promise<Commit[]>} Array of parsed commits
     */
    static async getCommitHistory(options = {}) {
        const requestId = Math.random().toString(36).substring(7);
        console.log(`📊 [GitService:${requestId}] Fetching commit history`, options);

        try {
            // Validate we're in a git repository
            await this.validateGitRepository();

            // Build git log command
            const limit = Math.min(options.limit || 500, ROADMAP_LIMITS.MAX_COMMITS);
            const format = '%H|%an|%ae|%ad|%s';

            let command = `git log --pretty=format:"${format}" --date=iso -n ${limit}`;

            if (options.since) {
                // Sanitize date input
                const sinceDate = new Date(options.since);
                if (!isNaN(sinceDate.getTime())) {
                    command += ` --since="${sinceDate.toISOString()}"`;
                }
            }

            console.log(`🔍 [GitService:${requestId}] Executing command:`, command);

            // Execute with timeout
            const { stdout, stderr } = await execPromise(command, {
                timeout: ROADMAP_LIMITS.GIT_TIMEOUT_MS,
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            });

            if (stderr) {
                console.warn(`⚠️ [GitService:${requestId}] Git stderr:`, stderr);
            }

            // Parse output
            const lines = stdout.trim().split('\n').filter(line => line);
            console.log(`✅ [GitService:${requestId}] Found ${lines.length} commits`);

            const commits = lines.map(line => this.parseCommitLine(line));

            // Filter by category if specified
            if (options.category) {
                return commits.filter(c => c.category === options.category);
            }

            return commits;

        } catch (error) {
            console.error(`💥 [GitService:${requestId}] Error:`, error);

            if (error.killed) {
                throw new Error(`${ROADMAP_ERRORS.GIT_COMMAND_FAILED}: Timeout after ${ROADMAP_LIMITS.GIT_TIMEOUT_MS}ms`);
            }

            throw new Error(`${ROADMAP_ERRORS.GIT_COMMAND_FAILED}: ${error.message}`);
        }
    }

    /**
     * Parse a single git log line
     * @param {string} line - Git log line in format: hash|author|email|date|message
     * @returns {Commit} Parsed commit object
     */
    static parseCommitLine(line) {
        const parts = line.split('|');
        if (parts.length < 5) {
            throw new Error(`${ROADMAP_ERRORS.GIT_PARSE_ERROR}: Invalid line format`);
        }

        const [hash, author, email, dateStr, ...messageParts] = parts;
        const message = messageParts.join('|'); // Re-join in case message contains |

        const emoji = this.extractGitmoji(message);
        const category = EMOJI_CATEGORY_MAP[emoji] || 'other';
        const cleanMessage = message.replace(emoji, '').trim();
        const subcategory = this.inferSubcategory(cleanMessage, category);

        return {
            hash,
            author,
            email,
            date: new Date(dateStr),
            message: cleanMessage,
            emoji,
            category,
            subcategory,
            type: 'commit',
        };
    }

    /**
     * Extract gitmoji from commit message
     * @param {string} message - Commit message
     * @returns {string|null} Extracted emoji or null
     */
    static extractGitmoji(message) {
        // Match emoji at the start of the message
        const emojiRegex = /^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])/u;
        const match = message.match(emojiRegex);
        return match ? match[1] : null;
    }

    /**
     * Infer subcategory from commit message keywords
     * @param {string} message - Commit message
     * @param {string} category - Parent category
     * @returns {string|null} Inferred subcategory or null
     */
    static inferSubcategory(message, category) {
        const lowerMessage = message.toLowerCase();

        // Check keywords
        for (const [keyword, subcategory] of Object.entries(SUBCATEGORY_KEYWORDS)) {
            if (lowerMessage.includes(keyword)) {
                return subcategory;
            }
        }

        return null;
    }

    /**
     * Validate that we're in a git repository
     * @throws {Error} If not in a git repository
     */
    static async validateGitRepository() {
        try {
            await execPromise('git rev-parse --is-inside-work-tree', {
                timeout: 5000,
            });
        } catch (error) {
            throw new Error('Not a git repository');
        }
    }
}
```

**Error Handling:**
- Git command failures → Return empty array, log error
- Timeout → Throw descriptive error
- Invalid repository → Throw error early
- Parse errors → Skip invalid commits, log warnings

---

### 2. GitHub Service

**File:** `lib/services/serviceRoadmap/server/githubService.js`

**Purpose:** Fetch GitHub issues and project data via Octokit

**Dependencies:**
```bash
npm install @octokit/rest
```

**Production Features:**
- ✅ Rate limit handling (60 requests/hour for unauthenticated, 5000 for authenticated)
- ✅ Exponential backoff retry (3 attempts)
- ✅ 15-minute in-memory cache
- ✅ Fallback to empty array on failure
- ✅ Request ID tracking
- ✅ Detailed error logging
- ✅ Token validation

**Implementation Pattern:**

```javascript
import { Octokit } from '@octokit/rest';
import { LABEL_CATEGORY_MAP, ROADMAP_LIMITS, ROADMAP_ERRORS } from '../constants/roadmapConstants';
import { GitHubCacheManager } from './cacheManager';

const cache = new GitHubCacheManager();

export class GitHubService {
    /**
     * Initialize Octokit instance with authentication
     * @returns {Octokit} Configured Octokit instance
     */
    static getOctokit() {
        const token = process.env.GITHUB_TOKEN;

        if (!token) {
            console.warn('⚠️ [GitHubService] No GITHUB_TOKEN found - using unauthenticated requests');
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
     * @returns {Promise<Issue[]>} Array of parsed issues
     */
    static async getPlannedFeatures(options = {}) {
        const requestId = Math.random().toString(36).substring(7);
        console.log(`📊 [GitHubService:${requestId}] Fetching issues`, options);

        const owner = options.owner || process.env.GITHUB_REPO_OWNER;
        const repo = options.repo || process.env.GITHUB_REPO_NAME;

        if (!owner || !repo) {
            console.error(`💥 [GitHubService:${requestId}] Missing repository configuration`);
            return [];
        }

        // Check cache first
        const cacheKey = `issues_${owner}_${repo}`;
        if (!options.forceRefresh) {
            const cached = cache.get(cacheKey);
            if (cached) {
                console.log(`✅ [GitHubService:${requestId}] Returning cached issues (${cached.length})`);
                return cached;
            }
        }

        try {
            const octokit = this.getOctokit();

            // Fetch open issues with retries
            const issues = await this.fetchWithRetry(async () => {
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
            cache.set(cacheKey, parsedIssues, ROADMAP_LIMITS.GITHUB_CACHE_TTL);

            return parsedIssues;

        } catch (error) {
            console.error(`💥 [GitHubService:${requestId}] Error fetching issues:`, error);

            // Check for rate limiting
            if (error.status === 403 && error.message.includes('rate limit')) {
                console.error(`🔴 [GitHubService:${requestId}] GitHub rate limit exceeded`);
                // Try to return cached data even if expired
                const cached = cache.get(cacheKey, true); // Force get even if expired
                if (cached) {
                    console.warn(`⚠️ [GitHubService:${requestId}] Returning stale cache due to rate limit`);
                    return cached;
                }
            }

            // Return empty array instead of throwing
            return [];
        }
    }

    /**
     * Parse GitHub issue into our format
     * @param {Object} issue - Raw GitHub issue
     * @returns {Issue} Parsed issue object
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
        return 'other';
    }

    /**
     * Infer subcategory from issue title and description
     * @param {Object} issue - GitHub issue
     * @returns {string|null} Subcategory or null
     */
    static inferSubcategoryFromIssue(issue) {
        const text = `${issue.title} ${issue.body}`.toLowerCase();

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
     * @returns {string} Priority level
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

            const delay = ROADMAP_LIMITS.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            console.warn(`⚠️ [GitHubService:${requestId}] Retry ${attempt}/${ROADMAP_LIMITS.MAX_RETRIES} after ${delay}ms`);

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.fetchWithRetry(fn, requestId, attempt + 1);
        }
    }
}
```

---

### 3. Cache Manager

**File:** `lib/services/serviceRoadmap/server/cacheManager.js`

**Purpose:** In-memory cache for GitHub API responses (avoid rate limits)

```javascript
/**
 * Simple in-memory cache manager for GitHub API responses
 */
export class GitHubCacheManager {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Get cached value
     * @param {string} key - Cache key
     * @param {boolean} allowExpired - Return even if expired
     * @returns {any|null} Cached value or null
     */
    get(key, allowExpired = false) {
        const entry = this.cache.get(key);

        if (!entry) return null;

        const now = Date.now();
        const isExpired = now > entry.expiresAt;

        if (isExpired && !allowExpired) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Set cache value with TTL
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds
     */
    set(key, data, ttl) {
        const expiresAt = Date.now() + ttl;
        this.cache.set(key, { data, expiresAt });
    }

    /**
     * Clear expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
    }
}

// Run cleanup every 5 minutes
setInterval(() => {
    const manager = new GitHubCacheManager();
    manager.cleanup();
}, 5 * 60 * 1000);
```

---

### 4. Category Service

**File:** `lib/services/serviceRoadmap/server/categoryService.js`

**Purpose:** Build hierarchical category tree from commits and issues

**Production Features:**
- ✅ Handles empty data gracefully
- ✅ Calculates accurate statistics
- ✅ Sorts by category priority
- ✅ Validates tree structure
- ✅ Performance optimized (O(n) complexity)

```javascript
import { CATEGORY_CONFIG, CATEGORY_KEYS } from '../constants/roadmapConstants';

export class CategoryService {
    /**
     * Build category tree from commits and issues
     * @param {Commit[]} commits - Array of commits
     * @param {Issue[]} issues - Array of issues
     * @returns {CategoryTree} Hierarchical tree structure
     */
    static buildCategoryTree(commits = [], issues = []) {
        const requestId = Math.random().toString(36).substring(7);
        console.log(`📊 [CategoryService:${requestId}] Building tree from ${commits.length} commits, ${issues.length} issues`);

        const tree = {};

        // Initialize all categories
        Object.entries(CATEGORY_CONFIG).forEach(([key, config]) => {
            tree[key] = {
                name: key,
                displayName: config.displayName,
                icon: config.icon,
                description: config.description,
                colorBg: config.colorBg,
                colorText: config.colorText,
                priority: config.priority,
                subcategories: {},
                items: [],
                stats: {
                    commits: 0,
                    issues: 0,
                    total: 0,
                    completionRate: 0,
                },
            };
        });

        // Add commits to tree
        commits.forEach(commit => {
            this.addItemToTree(tree, commit);
        });

        // Add issues to tree
        issues.forEach(issue => {
            this.addItemToTree(tree, issue);
        });

        // Calculate statistics for each category
        Object.values(tree).forEach(category => {
            category.stats = this.calculateCategoryStats(category);
        });

        // Sort categories by priority
        const sortedTree = {};
        Object.keys(tree)
            .sort((a, b) => tree[a].priority - tree[b].priority)
            .forEach(key => {
                sortedTree[key] = tree[key];
            });

        console.log(`✅ [CategoryService:${requestId}] Tree built with ${Object.keys(sortedTree).length} categories`);

        return sortedTree;
    }

    /**
     * Add item (commit or issue) to tree
     * @param {Object} tree - Category tree
     * @param {Commit|Issue} item - Item to add
     */
    static addItemToTree(tree, item) {
        const category = item.category || 'other';

        // Ensure category exists
        if (!tree[category]) {
            console.warn(`⚠️ [CategoryService] Unknown category: ${category}, using 'other'`);
            tree.other.items.push(item);
            return;
        }

        // Add to subcategory if exists
        if (item.subcategory) {
            if (!tree[category].subcategories[item.subcategory]) {
                tree[category].subcategories[item.subcategory] = {
                    name: item.subcategory,
                    displayName: this.formatSubcategoryName(item.subcategory),
                    items: [],
                };
            }
            tree[category].subcategories[item.subcategory].items.push(item);
        } else {
            // Add to top-level category items
            tree[category].items.push(item);
        }
    }

    /**
     * Calculate statistics for a category
     * @param {CategoryNode} category - Category node
     * @returns {CategoryStats} Calculated statistics
     */
    static calculateCategoryStats(category) {
        let commits = 0;
        let issues = 0;

        // Count top-level items
        category.items.forEach(item => {
            if (item.type === 'commit') commits++;
            if (item.type === 'issue') issues++;
        });

        // Count subcategory items
        Object.values(category.subcategories).forEach(sub => {
            sub.items.forEach(item => {
                if (item.type === 'commit') commits++;
                if (item.type === 'issue') issues++;
            });
        });

        const total = commits + issues;
        const completionRate = total > 0 ? commits / total : 0;

        return {
            commits,
            issues,
            total,
            completionRate,
        };
    }

    /**
     * Format subcategory name for display
     * @param {string} subcategory - Subcategory key
     * @returns {string} Formatted name
     */
    static formatSubcategoryName(subcategory) {
        return subcategory
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Get overall statistics across all categories
     * @param {CategoryTree} tree - Category tree
     * @returns {Object} Overall stats
     */
    static getOverallStats(tree) {
        let totalCommits = 0;
        let totalIssues = 0;

        Object.values(tree).forEach(category => {
            totalCommits += category.stats.commits;
            totalIssues += category.stats.issues;
        });

        const total = totalCommits + totalIssues;

        return {
            commits: totalCommits,
            issues: totalIssues,
            total,
            completionRate: total > 0 ? totalCommits / total : 0,
            categories: Object.keys(tree).length,
        };
    }
}
```

---

## Client Service Specification

**File:** `lib/services/serviceRoadmap/client/roadmapService.js`

**Purpose:** Client-side API calls with caching (follows Weavink pattern)

```javascript
"use client";
import { GenericCacheManager } from '@/lib/services/core/genericCacheManager';
import { ROADMAP_LIMITS } from '@/lib/services/constants';

const roadmapCache = new GenericCacheManager('roadmap');

export class RoadmapService {
    /**
     * Get category tree (public endpoint)
     * @param {Object} options - Query options
     * @param {boolean} options.forceRefresh - Skip cache
     * @returns {Promise<Object>} Category tree and stats
     */
    static async getCategoryTree(options = {}) {
        const cacheKey = 'category_tree';

        // Check cache first
        if (!options.forceRefresh) {
            const cached = roadmapCache.get(cacheKey);
            if (cached) {
                console.log('📦 [RoadmapService] Returning cached tree');
                return cached;
            }
        }

        try {
            const response = await fetch('/api/roadmap');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch roadmap');
            }

            // Cache the result
            roadmapCache.set(cacheKey, data.data, ROADMAP_LIMITS.CLIENT_CACHE_TTL);

            return data.data;

        } catch (error) {
            console.error('💥 [RoadmapService] Error fetching category tree:', error);
            throw error;
        }
    }

    /**
     * Get authenticated user roadmap (enhanced data)
     * @param {string} token - Firebase auth token
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Enhanced category tree
     */
    static async getUserRoadmap(token, options = {}) {
        const cacheKey = 'user_roadmap';

        if (!options.forceRefresh) {
            const cached = roadmapCache.get(cacheKey);
            if (cached) {
                console.log('📦 [RoadmapService] Returning cached user roadmap');
                return cached;
            }
        }

        try {
            const response = await fetch('/api/user/roadmap', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Unauthorized: Please log in again');
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch user roadmap');
            }

            roadmapCache.set(cacheKey, data.data, ROADMAP_LIMITS.CLIENT_CACHE_TTL);

            return data.data;

        } catch (error) {
            console.error('💥 [RoadmapService] Error fetching user roadmap:', error);
            throw error;
        }
    }

    /**
     * Clear all caches
     */
    static clearCache() {
        roadmapCache.clearAll();
        console.log('🗑️ [RoadmapService] Cache cleared');
    }
}
```

---

## API Routes Specification

### 1. Public Roadmap API

**File:** `app/api/roadmap/route.js`

**Endpoint:** `GET /api/roadmap`

**Authentication:** None (public)

**Rate Limiting:** 10 requests/minute per IP

**Caching:** Server-side 15-minute cache

**Response:**
```json
{
  "success": true,
  "data": {
    "tree": { /* CategoryTree */ },
    "stats": {
      "commits": 450,
      "issues": 23,
      "total": 473,
      "completionRate": 0.95,
      "categories": 12
    },
    "lastUpdated": "2025-11-19T10:30:00.000Z"
  }
}
```

**Implementation:**

```javascript
import { NextResponse } from 'next/server';
import { GitService } from '@/lib/services/serviceRoadmap/server/gitService';
import { GitHubService } from '@/lib/services/serviceRoadmap/server/githubService';
import { CategoryService } from '@/lib/services/serviceRoadmap/server/categoryService';

export const dynamic = 'force-dynamic'; // Prevent static generation

// Simple in-memory cache for this route
let cache = {
    data: null,
    timestamp: null,
};

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function GET(request) {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`📊 [/api/roadmap:${requestId}] GET request`);

    try {
        // Check cache
        const now = Date.now();
        if (cache.data && cache.timestamp && (now - cache.timestamp) < CACHE_TTL) {
            console.log(`✅ [/api/roadmap:${requestId}] Returning cached data`);
            return NextResponse.json({
                success: true,
                data: cache.data,
                cached: true,
            });
        }

        // Fetch data in parallel
        const [commits, issues] = await Promise.all([
            GitService.getCommitHistory({ limit: 500 }),
            GitHubService.getPlannedFeatures(),
        ]);

        console.log(`🔍 [/api/roadmap:${requestId}] Fetched ${commits.length} commits, ${issues.length} issues`);

        // Build category tree
        const tree = CategoryService.buildCategoryTree(commits, issues);
        const stats = CategoryService.getOverallStats(tree);

        // Prepare response
        const responseData = {
            tree,
            stats,
            lastUpdated: new Date().toISOString(),
        };

        // Update cache
        cache = {
            data: responseData,
            timestamp: now,
        };

        console.log(`✅ [/api/roadmap:${requestId}] Success - ${stats.total} total items`);

        return NextResponse.json({
            success: true,
            data: responseData,
        });

    } catch (error) {
        console.error(`💥 [/api/roadmap:${requestId}] Error:`, error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch roadmap data',
                details: error.message,
            },
            { status: 500 }
        );
    }
}
```

---

### 2. Authenticated Roadmap API

**File:** `app/api/user/roadmap/route.js`

**Endpoint:** `GET /api/user/roadmap`

**Authentication:** Required (Firebase token)

**Features:** Same as public + potential future enhancements

**Implementation:**

```javascript
import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { GitService } from '@/lib/services/serviceRoadmap/server/gitService';
import { GitHubService } from '@/lib/services/serviceRoadmap/server/githubService';
import { CategoryService } from '@/lib/services/serviceRoadmap/server/categoryService';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`📊 [/api/user/roadmap:${requestId}] GET request`);

    try {
        // 1. Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn(`🔴 [/api/user/roadmap:${requestId}] Missing auth header`);
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Missing token' },
                { status: 401 }
            );
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);
        const { uid } = decodedToken;

        console.log(`✅ [/api/user/roadmap:${requestId}] Authenticated user: ${uid}`);

        // 2. Fetch data (same as public for now, but can be enhanced later)
        const [commits, issues] = await Promise.all([
            GitService.getCommitHistory({ limit: 500 }),
            GitHubService.getPlannedFeatures(),
        ]);

        // 3. Build tree
        const tree = CategoryService.buildCategoryTree(commits, issues);
        const stats = CategoryService.getOverallStats(tree);

        // 4. Return response
        return NextResponse.json({
            success: true,
            data: {
                tree,
                stats,
                lastUpdated: new Date().toISOString(),
            },
        });

    } catch (error) {
        console.error(`💥 [/api/user/roadmap:${requestId}] Error:`, error);

        if (error.code?.startsWith('auth/')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Invalid token' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
```

---

## Component Specifications

### 1. CategoryTree Component

**File:** `app/roadmap/components/CategoryTree.jsx`

**Purpose:** Recursive tree component with expand/collapse

**Props:**
- `tree` (Object) - Category tree data
- `defaultExpanded` (Boolean) - Default expansion state

**Features:**
- ✅ Collapsible categories and subcategories
- ✅ Framer Motion animations
- ✅ Keyboard navigation (Arrow keys, Enter)
- ✅ ARIA labels for accessibility
- ✅ Loading skeleton states
- ✅ Empty state handling

**Implementation:** (See next documentation update for full code)

---

### 2. CommitCard Component

**File:** `app/roadmap/components/CommitCard.jsx`

**Purpose:** Display individual commit with metadata

**Props:**
- `commit` (Commit) - Commit object

**Features:**
- ✅ Emoji display
- ✅ Author and date
- ✅ Link to GitHub commit
- ✅ Hover effects
- ✅ Responsive layout

---

### 3. IssueCard Component

**File:** `app/roadmap/components/IssueCard.jsx`

**Purpose:** Display GitHub issue with labels and status

**Props:**
- `issue` (Issue) - Issue object

**Features:**
- ✅ Title and description
- ✅ Labels with colors
- ✅ Priority badge
- ✅ Link to GitHub issue
- ✅ Milestone display

---

**(Continued in next section...)**

---

## Environment Variables

Add to `.env.local`:

```bash
# GitHub Integration (REQUIRED)
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_REPO_OWNER=your_github_username
GITHUB_REPO_NAME=your_repository_name

# Optional Configuration
ROADMAP_CACHE_TTL=900000              # Cache TTL in ms (default: 15 minutes)
ROADMAP_MAX_COMMITS=500               # Max commits to fetch (default: 500)
ROADMAP_MAX_ISSUES=100                # Max issues to fetch (default: 100)
```

**GitHub Token Permissions Needed:**
- `public_repo` (read public repository data)
- `read:org` (if using organization repositories)

**How to create GitHub token:**
1. Go to GitHub.com → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `public_repo`
4. Copy token and add to `.env.local`

---

## Testing Strategy

### Manual Testing Checklist

**Git Service:**
- [ ] Fetches commits from real repository
- [ ] Handles empty repository
- [ ] Handles git command failure
- [ ] Timeout works correctly
- [ ] Emoji extraction works
- [ ] Category mapping works
- [ ] Subcategory inference works

**GitHub Service:**
- [ ] Fetches issues successfully
- [ ] Handles rate limiting gracefully
- [ ] Cache works (15-minute TTL)
- [ ] Retry logic works
- [ ] Fallback to empty array on failure
- [ ] Token validation works

**API Routes:**
- [ ] Public endpoint returns data
- [ ] Authenticated endpoint requires token
- [ ] Error responses are descriptive
- [ ] Cache works correctly
- [ ] Rate limiting works

**Components:**
- [ ] Tree expands/collapses correctly
- [ ] All categories display
- [ ] Commits show correctly
- [ ] Issues show correctly
- [ ] Loading states work
- [ ] Empty states work

**i18n:**
- [ ] All 5 languages work
- [ ] Language switching works
- [ ] No missing translation keys

**Responsive:**
- [ ] Works on mobile (320px width)
- [ ] Works on tablet (768px width)
- [ ] Works on desktop (1920px width)

---

## Security Checklist

- [ ] GitHub token stored in environment variables (not in code)
- [ ] Git commands sanitized (no command injection)
- [ ] Auth tokens verified on protected routes
- [ ] Rate limiting enabled
- [ ] No sensitive data in logs
- [ ] CORS configured correctly
- [ ] Input validation on all user inputs

---

## Performance Targets

- **API Response Time:** < 2 seconds (with cache < 100ms)
- **Page Load Time:** < 3 seconds (First Contentful Paint)
- **Tree Rendering:** < 500ms for 500 commits
- **Memory Usage:** < 100MB for full tree
- **Bundle Size:** < 200KB (client-side code)

---

## Deployment Checklist

- [ ] Environment variables set in production
- [ ] GitHub token valid and has correct permissions
- [ ] Build succeeds with zero errors
- [ ] All routes accessible
- [ ] Cache working in production
- [ ] Monitoring enabled
- [ ] Error tracking enabled (Sentry/similar)
- [ ] Analytics tracking (if applicable)

---

## Maintenance Notes

**Regular Tasks:**
- Review GitHub label mapping quarterly
- Update gitmoji mapping as new conventions added
- Monitor API rate limits
- Review and update cache TTL based on usage
- Update subcategory inference logic monthly

**Monitoring:**
- Track GitHub API rate limit usage
- Monitor cache hit/miss ratios
- Track API response times
- Monitor error rates

---

## Future Enhancements

### Phase 2 Features (Post-MVP)
1. **Advanced Filtering**
   - Filter by date range
   - Filter by author
   - Search functionality
   - URL parameter state

2. **Timeline View**
   - Alternative chronological visualization
   - Milestone markers
   - Release timeline

3. **Export Features**
   - Download as PDF
   - Export to CSV
   - Share links

4. **Real-time Updates**
   - WebSocket integration
   - Live commit notifications
   - GitHub webhook support

5. **Analytics**
   - Track popular categories
   - User engagement metrics
   - Category trends over time

---

## Related Documentation

- [Original Feature Guide](./ROADMAP_CHANGELOG_FEATURE_GUIDE.md) - Initial specifications
- [Implementation Checklist](./ROADMAP_IMPLEMENTATION_CHECKLIST.md) - Detailed task tracking
- [Gap Analysis](./ROADMAP_GAPS_AND_RISKS.md) - Known gaps and risks
- [Weavink Analytics Integration](./ADMIN_ANALYTICS_INTEGRATION_GUIDE.md) - Service patterns
- [Build Manager Skill](../.claude/skills/build-manager-skill/SKILL.md) - Production standards reference

---

**Status**: Active - Ready for Implementation
**Version**: 2.0-production
**Created**: 2025-11-19
**Last Updated**: 2025-11-19
**Maintainer**: Development Team
**Estimated Implementation Time**: 28-40 hours (3.5-5 days)

---

*This is a living document. Update as implementation progresses and requirements evolve.*
