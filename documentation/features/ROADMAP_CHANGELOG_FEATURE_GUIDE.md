---
id: features-roadmap-changelog-070
title: Roadmap & Changelog Feature - Git-Based Progress Tracking
category: features
tags: [roadmap, changelog, git-commits, github-issues, feature-tree, gitmoji, visualization, public-page, dashboard]
status: active
created: 2025-11-19
updated: 2025-11-19
related:
  - analytics-service-summary-011.md
  - admin-analytics-integration-001.md
---

# Roadmap & Changelog Feature - Git-Based Progress Tracking

## Overview

A dual-purpose roadmap/changelog system that visualizes both **past work** (from git commits) and **future plans** (from GitHub Issues/Projects) using an interactive feature category tree. Provides both a public-facing page for transparency and an enhanced dashboard version for authenticated users.

## Feature Specifications

### User Requirements

Based on user input (2025-11-19), the system must:

1. **Dual Access Levels**
   - Public page (`/roadmap`) - accessible without authentication
   - Dashboard page (`/dashboard/roadmap`) - enhanced version for logged-in users

2. **Content Display**
   - **Past work**: Git commit history parsed and categorized
   - **Future plans**: GitHub Issues and Project boards integrated
   - **Combined view**: Single interface showing both completed and planned work

3. **Visualization Type**
   - **Feature category tree**: Hierarchical grouping by feature type
   - Uses existing Gitmoji convention to auto-categorize commits
   - Interactive expand/collapse for navigation

4. **Future Items Management**
   - Pull from **GitHub Issues/Projects** (primary source)
   - Sync with repository issue labels and milestones
   - Support for manual configuration as fallback

## Technical Architecture

### 1. Backend Services

#### 1.1 Git Service (`lib/services/roadmap/server/gitService.js`)

Parses git commit history with gitmoji detection:

```javascript
// Core functions
async function getCommitHistory(options = {}) {
  // Execute: git log --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso
  // Parse output into structured data
}

async function parseCommit(commitLine) {
  const [hash, author, email, date, message] = commitLine.split('|');
  const emoji = extractGitmoji(message);
  const category = mapEmojiToCategory(emoji);

  return {
    hash,
    author,
    email,
    date: new Date(date),
    message: message.replace(emoji, '').trim(),
    emoji,
    category,
    subcategory: inferSubcategory(message, category)
  };
}

function mapEmojiToCategory(emoji) {
  const emojiMap = {
    '✨': 'features',
    '🐛': 'fixes',
    '📚': 'documentation',
    '🔧': 'configuration',
    '🌐': 'internationalization',
    '✅': 'testing',
    '🔒': 'security',
    '⚡': 'performance',
    '♻️': 'refactoring',
    '💄': 'ui',
    '🎨': 'styling',
    // ... complete gitmoji mapping
  };

  return emojiMap[emoji] || 'other';
}

function inferSubcategory(message, category) {
  // AI-powered or keyword-based subcategory detection
  // Examples:
  // "Add OAuth login" -> category: features, subcategory: authentication
  // "Fix GDPR consent bug" -> category: fixes, subcategory: compliance
}
```

#### 1.2 GitHub Service (`lib/services/roadmap/server/githubService.js`)

Fetches issues and project data using Octokit:

```javascript
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

async function getPlannedFeatures(options = {}) {
  const { owner, repo } = options;

  // Fetch open issues
  const issues = await octokit.issues.listForRepo({
    owner: process.env.GITHUB_REPO_OWNER || owner,
    repo: process.env.GITHUB_REPO_NAME || repo,
    state: 'open',
    labels: 'enhancement,feature'
  });

  // Fetch project boards
  const projects = await octokit.projects.listForRepo({
    owner: process.env.GITHUB_REPO_OWNER || owner,
    repo: process.env.GITHUB_REPO_NAME || repo
  });

  return {
    issues: issues.data.map(parseIssue),
    projects: projects.data
  };
}

function parseIssue(issue) {
  const category = inferCategoryFromLabels(issue.labels);
  const priority = inferPriority(issue);

  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    description: issue.body,
    category,
    subcategory: inferSubcategoryFromIssue(issue),
    labels: issue.labels.map(l => l.name),
    priority,
    milestone: issue.milestone?.title,
    assignee: issue.assignee?.login,
    created: new Date(issue.created_at),
    updated: new Date(issue.updated_at),
    url: issue.html_url
  };
}

// Cache GitHub data to avoid rate limits (60 requests/hour)
let cache = {
  data: null,
  timestamp: null,
  ttl: 15 * 60 * 1000 // 15 minutes
};

async function getCachedPlannedFeatures(options) {
  const now = Date.now();

  if (cache.data && cache.timestamp && (now - cache.timestamp) < cache.ttl) {
    return cache.data;
  }

  const data = await getPlannedFeatures(options);
  cache = { data, timestamp: now, ttl: cache.ttl };

  return data;
}
```

#### 1.3 Category Service (`lib/services/roadmap/server/categoryService.js`)

Builds hierarchical category tree:

```javascript
async function buildCategoryTree(commits, issues) {
  const tree = {};

  // Process commits (past work)
  commits.forEach(commit => {
    if (!tree[commit.category]) {
      tree[commit.category] = {
        name: commit.category,
        displayName: getCategoryDisplayName(commit.category),
        icon: getCategoryIcon(commit.category),
        subcategories: {},
        items: []
      };
    }

    if (commit.subcategory) {
      if (!tree[commit.category].subcategories[commit.subcategory]) {
        tree[commit.category].subcategories[commit.subcategory] = {
          name: commit.subcategory,
          displayName: getSubcategoryDisplayName(commit.subcategory),
          items: []
        };
      }
      tree[commit.category].subcategories[commit.subcategory].items.push({
        type: 'commit',
        ...commit
      });
    } else {
      tree[commit.category].items.push({
        type: 'commit',
        ...commit
      });
    }
  });

  // Process issues (future work)
  issues.forEach(issue => {
    if (!tree[issue.category]) {
      tree[issue.category] = {
        name: issue.category,
        displayName: getCategoryDisplayName(issue.category),
        icon: getCategoryIcon(issue.category),
        subcategories: {},
        items: []
      };
    }

    if (issue.subcategory) {
      if (!tree[issue.category].subcategories[issue.subcategory]) {
        tree[issue.category].subcategories[issue.subcategory] = {
          name: issue.subcategory,
          displayName: getSubcategoryDisplayName(issue.subcategory),
          items: []
        };
      }
      tree[issue.category].subcategories[issue.subcategory].items.push({
        type: 'issue',
        ...issue
      });
    } else {
      tree[issue.category].items.push({
        type: 'issue',
        ...issue
      });
    }
  });

  // Calculate statistics for each category
  Object.values(tree).forEach(category => {
    category.stats = calculateCategoryStats(category);
  });

  return tree;
}

function calculateCategoryStats(category) {
  let totalCommits = 0;
  let totalIssues = 0;

  category.items.forEach(item => {
    if (item.type === 'commit') totalCommits++;
    if (item.type === 'issue') totalIssues++;
  });

  Object.values(category.subcategories).forEach(sub => {
    sub.items.forEach(item => {
      if (item.type === 'commit') totalCommits++;
      if (item.type === 'issue') totalIssues++;
    });
  });

  return {
    commits: totalCommits,
    issues: totalIssues,
    total: totalCommits + totalIssues,
    completionRate: totalCommits / (totalCommits + totalIssues)
  };
}
```

### 2. API Routes

#### 2.1 Commits API (`app/api/roadmap/commits/route.js`)

```javascript
import { NextResponse } from 'next/server';
import { getCommitHistory } from '@/lib/services/roadmap/server/gitService';
import { withRateLimit } from '@/lib/middleware/rateLimit';

export async function GET(request) {
  try {
    // Apply rate limiting (10 requests/minute for public endpoint)
    await withRateLimit(request, { max: 10, window: 60000 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 100;
    const category = searchParams.get('category');

    const commits = await getCommitHistory({
      limit,
      category
    });

    return NextResponse.json({
      success: true,
      data: commits,
      count: commits.length
    });
  } catch (error) {
    console.error('Commits API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

#### 2.2 GitHub API (`app/api/roadmap/github/route.js`)

```javascript
import { NextResponse } from 'next/server';
import { getCachedPlannedFeatures } from '@/lib/services/roadmap/server/githubService';
import { withRateLimit } from '@/lib/middleware/rateLimit';

export async function GET(request) {
  try {
    // Apply rate limiting
    await withRateLimit(request, { max: 5, window: 60000 });

    const issues = await getCachedPlannedFeatures();

    return NextResponse.json({
      success: true,
      data: issues
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

#### 2.3 Category Tree API (`app/api/roadmap/tree/route.js`)

```javascript
import { NextResponse } from 'next/server';
import { getCommitHistory } from '@/lib/services/roadmap/server/gitService';
import { getCachedPlannedFeatures } from '@/lib/services/roadmap/server/githubService';
import { buildCategoryTree } from '@/lib/services/roadmap/server/categoryService';
import { withRateLimit } from '@/lib/middleware/rateLimit';

export async function GET(request) {
  try {
    // Apply rate limiting
    await withRateLimit(request, { max: 10, window: 60000 });

    // Fetch data in parallel
    const [commits, githubData] = await Promise.all([
      getCommitHistory({ limit: 500 }),
      getCachedPlannedFeatures()
    ]);

    // Build category tree
    const tree = await buildCategoryTree(commits, githubData.issues);

    return NextResponse.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Category tree API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

### 3. Client Service

#### 3.1 Roadmap Client Service (`lib/services/roadmap/client/roadmapService.js`)

```javascript
class RoadmapService {
  async getCategoryTree() {
    const response = await fetch('/api/roadmap/tree');
    if (!response.ok) throw new Error('Failed to fetch category tree');
    const result = await response.json();
    return result.data;
  }

  async getCommits(options = {}) {
    const params = new URLSearchParams(options);
    const response = await fetch(`/api/roadmap/commits?${params}`);
    if (!response.ok) throw new Error('Failed to fetch commits');
    const result = await response.json();
    return result.data;
  }

  async getPlannedFeatures() {
    const response = await fetch('/api/roadmap/github');
    if (!response.ok) throw new Error('Failed to fetch planned features');
    const result = await response.json();
    return result.data;
  }
}

export default new RoadmapService();
```

### 4. UI Components

#### 4.1 Feature Tree Component (`components/roadmap/FeatureTree.jsx`)

```jsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CommitCard from './CommitCard';
import IssueCard from './IssueCard';
import CategoryBadge from './CategoryBadge';

export default function FeatureTree({ tree }) {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubcategories, setExpandedSubcategories] = useState({});

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const toggleSubcategory = (categoryName, subcategoryName) => {
    const key = `${categoryName}-${subcategoryName}`;
    setExpandedSubcategories(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-4">
      {Object.values(tree).map(category => (
        <motion.div
          key={category.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          {/* Category Header */}
          <button
            onClick={() => toggleCategory(category.name)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {expandedCategories[category.name] ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}

              <CategoryBadge
                category={category}
                icon={category.icon}
              />

              <h3 className="text-lg font-semibold text-gray-900">
                {category.displayName}
              </h3>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600 font-medium">
                {category.stats.commits} completed
              </span>
              <span className="text-blue-600 font-medium">
                {category.stats.issues} planned
              </span>
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-themeGreen transition-all"
                  style={{ width: `${category.stats.completionRate * 100}%` }}
                />
              </div>
            </div>
          </button>

          {/* Category Content */}
          <AnimatePresence>
            {expandedCategories[category.name] && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-gray-50 space-y-4">
                  {/* Top-level items */}
                  {category.items.map((item, index) => (
                    <div key={index}>
                      {item.type === 'commit' ? (
                        <CommitCard commit={item} />
                      ) : (
                        <IssueCard issue={item} />
                      )}
                    </div>
                  ))}

                  {/* Subcategories */}
                  {Object.values(category.subcategories).map(subcategory => (
                    <div key={subcategory.name} className="ml-4">
                      <button
                        onClick={() => toggleSubcategory(category.name, subcategory.name)}
                        className="w-full flex items-center gap-2 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {expandedSubcategories[`${category.name}-${subcategory.name}`] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="font-medium text-gray-700">
                          {subcategory.displayName}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({subcategory.items.length})
                        </span>
                      </button>

                      <AnimatePresence>
                        {expandedSubcategories[`${category.name}-${subcategory.name}`] && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="ml-6 mt-2 space-y-2 overflow-hidden"
                          >
                            {subcategory.items.map((item, index) => (
                              <div key={index}>
                                {item.type === 'commit' ? (
                                  <CommitCard commit={item} />
                                ) : (
                                  <IssueCard issue={item} />
                                )}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
```

#### 4.2 Commit Card Component (`components/roadmap/CommitCard.jsx`)

```jsx
import { GitCommit, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function CommitCard({ commit }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-themeGreen transition-colors">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <GitCommit className="w-4 h-4 text-green-600" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{commit.emoji}</span>
            <p className="text-sm font-medium text-gray-900">
              {commit.message}
            </p>
          </div>

          <span className="text-xs text-gray-500 whitespace-nowrap">
            {format(new Date(commit.date), 'MMM d, yyyy')}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{commit.author}</span>
          </div>

          <code className="px-2 py-0.5 bg-gray-100 rounded font-mono">
            {commit.hash.substring(0, 7)}
          </code>
        </div>
      </div>
    </div>
  );
}
```

#### 4.3 Issue Card Component (`components/roadmap/IssueCard.jsx`)

```jsx
import { GitBranch, ExternalLink, Tag } from 'lucide-react';

export default function IssueCard({ issue }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-colors">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-blue-600" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <a
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center gap-1"
            >
              {issue.title}
              <ExternalLink className="w-3 h-3" />
            </a>

            {issue.description && (
              <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                {issue.description}
              </p>
            )}
          </div>

          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium whitespace-nowrap">
            #{issue.number}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {issue.labels.map(label => (
            <span
              key={label}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
            >
              <Tag className="w-3 h-3" />
              {label}
            </span>
          ))}

          {issue.milestone && (
            <span className="text-xs text-gray-500">
              Milestone: {issue.milestone}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 4.4 Category Badge Component (`components/roadmap/CategoryBadge.jsx`)

```jsx
export default function CategoryBadge({ category, icon }) {
  const categoryColors = {
    features: 'bg-purple-100 text-purple-700',
    fixes: 'bg-red-100 text-red-700',
    documentation: 'bg-blue-100 text-blue-700',
    configuration: 'bg-yellow-100 text-yellow-700',
    internationalization: 'bg-green-100 text-green-700',
    testing: 'bg-teal-100 text-teal-700',
    security: 'bg-orange-100 text-orange-700',
    performance: 'bg-indigo-100 text-indigo-700',
    refactoring: 'bg-gray-100 text-gray-700',
    ui: 'bg-pink-100 text-pink-700',
    styling: 'bg-cyan-100 text-cyan-700',
    other: 'bg-gray-100 text-gray-600'
  };

  const colorClass = categoryColors[category.name] || categoryColors.other;

  return (
    <div className={`px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {category.displayName}
    </div>
  );
}
```

### 5. Page Implementation

#### 5.1 Public Roadmap Page (`app/roadmap/page.jsx`)

```jsx
import { Suspense } from 'react';
import FeatureTree from '@/components/roadmap/FeatureTree';
import { getCategoryTree } from '@/lib/services/roadmap/server/categoryService';
import { getCommitHistory } from '@/lib/services/roadmap/server/gitService';
import { getCachedPlannedFeatures } from '@/lib/services/roadmap/server/githubService';

// Server-side rendered for SEO
export const metadata = {
  title: 'Roadmap & Changelog | Weavink',
  description: 'View our progress and planned features for Weavink'
};

async function RoadmapContent() {
  const [commits, githubData] = await Promise.all([
    getCommitHistory({ limit: 500 }),
    getCachedPlannedFeatures()
  ]);

  const tree = await buildCategoryTree(commits, githubData.issues);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Roadmap & Changelog
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Track our progress and see what's coming next. Every feature we build
          and every improvement we make is documented here.
        </p>
      </header>

      <FeatureTree tree={tree} />
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <RoadmapContent />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
```

#### 5.2 Dashboard Roadmap Page (`app/dashboard/(dashboard pages)/roadmap/page.jsx`)

```jsx
'use client';

import { useState, useEffect } from 'react';
import FeatureTree from '@/components/roadmap/FeatureTree';
import RoadmapService from '@/lib/services/roadmap/client/roadmapService';
import { BarChart, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export default function DashboardRoadmapPage() {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await RoadmapService.getCategoryTree();
      setTree(data);
      setStats(calculateOverallStats(data));
    } catch (error) {
      console.error('Failed to load roadmap:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateOverallStats(tree) {
    let totalCommits = 0;
    let totalIssues = 0;

    Object.values(tree).forEach(category => {
      totalCommits += category.stats.commits;
      totalIssues += category.stats.issues;
    });

    return {
      commits: totalCommits,
      issues: totalIssues,
      total: totalCommits + totalIssues,
      completionRate: totalCommits / (totalCommits + totalIssues)
    };
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Roadmap & Progress
        </h1>
        <p className="text-gray-600">
          Comprehensive view of completed work and planned features
        </p>
      </header>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Completed"
          value={stats.commits}
          color="green"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Planned"
          value={stats.issues}
          color="blue"
        />
        <StatCard
          icon={<BarChart className="w-5 h-5" />}
          label="Total Items"
          value={stats.total}
          color="gray"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Progress"
          value={`${Math.round(stats.completionRate * 100)}%`}
          color="purple"
        />
      </div>

      {/* Feature Tree */}
      <FeatureTree tree={tree} />
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    gray: 'bg-gray-50 text-gray-700',
    purple: 'bg-purple-50 text-purple-700'
  };

  return (
    <div className={`p-6 rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
```

### 6. Internationalization

#### 6.1 Translation Keys

Add to translation files (EN, FR, ES, ZH, VI):

```json
{
  "roadmap": {
    "title": "Roadmap & Changelog",
    "description": "Track our progress and see what's coming next",
    "completed": "Completed",
    "planned": "Planned",
    "progress": "Progress",
    "totalItems": "Total Items",
    "viewOnGitHub": "View on GitHub",
    "categories": {
      "features": "Features",
      "fixes": "Bug Fixes",
      "documentation": "Documentation",
      "configuration": "Configuration",
      "internationalization": "Internationalization",
      "testing": "Testing",
      "security": "Security",
      "performance": "Performance",
      "refactoring": "Refactoring",
      "ui": "User Interface",
      "styling": "Styling",
      "other": "Other"
    }
  }
}
```

### 7. Environment Variables

Add to `.env.local`:

```bash
# GitHub Integration
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_REPO_OWNER=your_username
GITHUB_REPO_NAME=your_repo_name

# Optional: Custom cache TTL (in milliseconds)
ROADMAP_CACHE_TTL=900000  # 15 minutes
```

## Implementation Phases

### Phase 1: Backend Infrastructure (2-3 hours)
- [ ] Create git service with commit parsing
- [ ] Create GitHub service with Octokit integration
- [ ] Create category service with tree building
- [ ] Implement caching layer
- [ ] Create API routes with rate limiting

### Phase 2: Data Processing (1-2 hours)
- [ ] Implement gitmoji mapping
- [ ] Build subcategory inference logic
- [ ] Create statistics calculation
- [ ] Test with real commit history

### Phase 3: UI Components (3-4 hours)
- [ ] Create FeatureTree component with animations
- [ ] Create CommitCard component
- [ ] Create IssueCard component
- [ ] Create CategoryBadge component
- [ ] Implement expand/collapse functionality

### Phase 4: Pages (1-2 hours)
- [ ] Create public roadmap page (`/roadmap`)
- [ ] Create dashboard roadmap page (`/dashboard/roadmap`)
- [ ] Add loading states and error handling
- [ ] Implement responsive design

### Phase 5: Internationalization (1 hour)
- [ ] Add translation keys for all UI text
- [ ] Translate category names
- [ ] Support 5 languages (EN, FR, ES, ZH, VI)

### Phase 6: Polish & Testing (2 hours)
- [ ] Add Tailwind styling with theme colors
- [ ] Add Framer Motion animations
- [ ] Test with real data
- [ ] Performance optimization
- [ ] Mobile responsiveness testing

**Total Estimated Time: 10-14 hours**

## Gitmoji Mapping Reference

Complete mapping of gitmoji to categories:

| Emoji | Code | Category | Description |
|-------|------|----------|-------------|
| ✨ | `:sparkles:` | features | New features |
| 🐛 | `:bug:` | fixes | Bug fixes |
| 📚 | `:books:` | documentation | Documentation |
| 🔧 | `:wrench:` | configuration | Configuration changes |
| 🌐 | `:globe_with_meridians:` | internationalization | i18n/l10n |
| ✅ | `:white_check_mark:` | testing | Tests |
| 🔒 | `:lock:` | security | Security fixes |
| ⚡ | `:zap:` | performance | Performance improvements |
| ♻️ | `:recycle:` | refactoring | Code refactoring |
| 💄 | `:lipstick:` | ui | UI updates |
| 🎨 | `:art:` | styling | Styling improvements |
| 🚀 | `:rocket:` | deployment | Deployment |
| 🔥 | `:fire:` | removal | Code/file removal |
| 📝 | `:memo:` | documentation | Documentation |
| 🚧 | `:construction:` | wip | Work in progress |
| 💚 | `:green_heart:` | ci | CI/CD fixes |
| ⬇️ | `:arrow_down:` | dependencies | Downgrade dependencies |
| ⬆️ | `:arrow_up:` | dependencies | Upgrade dependencies |

## GitHub Issues Integration

### Label Mapping

Map GitHub labels to categories:

```javascript
const labelCategoryMap = {
  'enhancement': 'features',
  'feature': 'features',
  'bug': 'fixes',
  'documentation': 'documentation',
  'config': 'configuration',
  'i18n': 'internationalization',
  'test': 'testing',
  'security': 'security',
  'performance': 'performance',
  'refactor': 'refactoring',
  'ui': 'ui',
  'ux': 'ui',
  'style': 'styling'
};
```

### Priority Detection

```javascript
function inferPriority(issue) {
  const labels = issue.labels.map(l => l.name.toLowerCase());

  if (labels.includes('critical') || labels.includes('urgent')) return 'critical';
  if (labels.includes('high') || labels.includes('important')) return 'high';
  if (labels.includes('low')) return 'low';

  return 'medium';
}
```

## Performance Optimizations

1. **Server-Side Rendering**: Public page uses SSR for SEO
2. **Caching**: GitHub data cached for 15 minutes
3. **Rate Limiting**: API routes protected (10 req/min)
4. **Lazy Loading**: Components load progressively
5. **Virtualization**: For large lists (>100 items)

## Security Considerations

1. **GitHub Token**: Store securely in environment variables
2. **Rate Limiting**: Protect all API endpoints
3. **Input Validation**: Sanitize all user inputs
4. **CORS**: Restrict API access to same origin
5. **Public Data Only**: No sensitive information exposed

## Testing Strategy

### Unit Tests
- Git commit parsing
- Category mapping logic
- Tree building algorithm
- Statistics calculation

### Integration Tests
- API routes
- GitHub service with mocked Octokit
- Client service

### E2E Tests
- Page rendering
- Tree expand/collapse
- Filtering functionality
- Mobile responsiveness

## Future Enhancements

1. **Advanced Filtering**
   - Filter by date range
   - Filter by author
   - Search functionality

2. **Timeline View**
   - Alternative visualization
   - Chronological ordering
   - Milestone markers

3. **Analytics Integration**
   - Track page views
   - Monitor popular categories
   - User engagement metrics

4. **Export Features**
   - Download as PDF
   - Export to CSV
   - Share links

5. **Real-time Updates**
   - WebSocket integration
   - Live commit notifications
   - GitHub webhook support

## Related Documentation

- [Admin Analytics Integration Guide](./ADMIN_ANALYTICS_INTEGRATION_GUIDE.md) - For analytics patterns
- [Analytics Service Summary](./ANALYTICS_SERVICE_SUMMARY.md) - Service layer architecture
- [Technical Refactoring Guide](./COMPREHENSIVE_REFACTORING_GUIDE.md) - Best practices

## Maintenance Notes

- Update gitmoji mapping as new conventions are adopted
- Review GitHub label mapping quarterly
- Monitor API rate limits (especially GitHub's 60/hour limit)
- Update cache TTL based on usage patterns
- Review and update subcategory inference logic monthly

---

**Status**: Active
**Created**: 2025-11-19
**Last Updated**: 2025-11-19
**Maintainer**: Development Team
