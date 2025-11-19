import { CategoryKey, CategoryTree, Commit, Issue, RoadmapItem, SubcategoryNode } from '../types';
import { MOCK_COMMITS, MOCK_ISSUES } from './mockData';
import { EMOJI_MAP, CATEGORY_CONFIG, LABEL_CATEGORY_MAP } from '../constants';

// Helper to infer category from commit
function getCategoryFromCommit(commit: Partial<Commit>): CategoryKey {
  if (commit.emoji && EMOJI_MAP[commit.emoji]) {
    return EMOJI_MAP[commit.emoji];
  }
  return 'other';
}

// Helper to infer category from issue
function getCategoryFromIssue(issue: Partial<Issue>): CategoryKey {
  for (const label of issue.labels || []) {
    const normalized = label.toLowerCase();
    if (LABEL_CATEGORY_MAP[normalized]) {
      return LABEL_CATEGORY_MAP[normalized];
    }
  }
  return 'features'; // Default
}

// Simple keyword based subcategory inference
function inferSubcategory(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('auth') || lower.includes('login') || lower.includes('oauth')) return 'Authentication';
  if (lower.includes('ui') || lower.includes('layout') || lower.includes('style') || lower.includes('css')) return 'UI/UX';
  if (lower.includes('api') || lower.includes('endpoint')) return 'API';
  if (lower.includes('test') || lower.includes('coverage')) return 'Testing';
  if (lower.includes('doc') || lower.includes('readme')) return 'Docs';
  if (lower.includes('i18n') || lower.includes('translation') || lower.includes('locale')) return 'Localization';
  if (lower.includes('database') || lower.includes('db')) return 'Database';
  return undefined;
}

export async function getCategoryTree(): Promise<CategoryTree> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600));

  const tree: CategoryTree = {};

  // Process Commits
  MOCK_COMMITS.forEach(rawCommit => {
    const categoryKey = getCategoryFromCommit(rawCommit);
    const subcategory = inferSubcategory(rawCommit.message || '');
    
    const commit: Commit = {
      ...rawCommit,
      category: categoryKey,
      subcategory,
      type: 'commit'
    } as Commit;

    if (!tree[categoryKey]) {
      tree[categoryKey] = {
        name: categoryKey,
        displayName: CATEGORY_CONFIG[categoryKey].displayName,
        icon: CATEGORY_CONFIG[categoryKey].icon,
        items: [],
        subcategories: {},
        stats: { commits: 0, issues: 0, total: 0, completionRate: 0 }
      };
    }

    tree[categoryKey].stats.commits++;
    tree[categoryKey].stats.total++;

    if (subcategory) {
      if (!tree[categoryKey].subcategories[subcategory]) {
        tree[categoryKey].subcategories[subcategory] = {
          name: subcategory,
          displayName: subcategory,
          items: []
        };
      }
      tree[categoryKey].subcategories[subcategory].items.push(commit);
    } else {
      tree[categoryKey].items.push(commit);
    }
  });

  // Process Issues
  MOCK_ISSUES.forEach(rawIssue => {
    const categoryKey = getCategoryFromIssue(rawIssue);
    const subcategory = inferSubcategory(rawIssue.title || '');

    const issue: Issue = {
      ...rawIssue,
      category: categoryKey,
      subcategory,
      type: 'issue'
    } as Issue;

    if (!tree[categoryKey]) {
        tree[categoryKey] = {
          name: categoryKey,
          displayName: CATEGORY_CONFIG[categoryKey].displayName,
          icon: CATEGORY_CONFIG[categoryKey].icon,
          items: [],
          subcategories: {},
          stats: { commits: 0, issues: 0, total: 0, completionRate: 0 }
        };
    }

    tree[categoryKey].stats.issues++;
    tree[categoryKey].stats.total++;

    if (subcategory) {
      if (!tree[categoryKey].subcategories[subcategory]) {
        tree[categoryKey].subcategories[subcategory] = {
          name: subcategory,
          displayName: subcategory,
          items: []
        };
      }
      tree[categoryKey].subcategories[subcategory].items.push(issue);
    } else {
      tree[categoryKey].items.push(issue);
    }
  });

  // Finalize Stats
  Object.values(tree).forEach(node => {
    if (node.stats.total > 0) {
      node.stats.completionRate = node.stats.commits / node.stats.total;
    }
    
    // Sort items by date (newest first)
    node.items.sort((a, b) => {
      const dateA = a.type === 'commit' ? a.date : a.updated;
      const dateB = b.type === 'commit' ? b.date : b.updated;
      return dateB.getTime() - dateA.getTime();
    });

    // Sort subcategories keys alphabetically for stability
    const sortedSubKeys = Object.keys(node.subcategories).sort();
    const sortedSubs: Record<string, SubcategoryNode> = {};
    sortedSubKeys.forEach(k => sortedSubs[k] = node.subcategories[k]);
    node.subcategories = sortedSubs;
  });

  return tree;
}