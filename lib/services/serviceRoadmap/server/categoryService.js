import { CATEGORY_CONFIG, CATEGORY_KEYS } from '../constants/roadmapConstants';

/**
 * Category Service - Build hierarchical category tree from commits and issues
 * Server-side only service for data processing
 */
export class CategoryService {
  /**
   * Build category tree from commits and issues
   * @param {Array} commits - Array of commits
   * @param {Array} issues - Array of issues
   * @returns {Object} Hierarchical tree structure
   */
  static buildCategoryTree(commits = [], issues = []) {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`📊 [CategoryService:${requestId}] Building tree from ${commits.length} commits, ${issues.length} issues`);

    const tree = {};

    // Initialize all categories
    Object.entries(CATEGORY_CONFIG).forEach(([key, config]) => {
      tree[key] = {
        name: key,
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
   * @param {Object} item - Item to add (commit or issue)
   */
  static addItemToTree(tree, item) {
    const category = item.category || CATEGORY_KEYS.OTHER;

    // Ensure category exists
    if (!tree[category]) {
      console.warn(`⚠️ [CategoryService] Unknown category: ${category}, using 'other'`);
      tree[CATEGORY_KEYS.OTHER].items.push(item);
      return;
    }

    // Add to subcategory if exists
    if (item.subcategory) {
      if (!tree[category].subcategories[item.subcategory]) {
        tree[category].subcategories[item.subcategory] = {
          name: item.subcategory,
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
   * @param {Object} category - Category node
   * @returns {Object} Calculated statistics
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
   * @param {Object} tree - Category tree
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

  /**
   * Filter tree by category
   * @param {Object} tree - Category tree
   * @param {string} categoryKey - Category to filter by
   * @returns {Object} Filtered tree with single category
   */
  static filterByCategory(tree, categoryKey) {
    if (!tree[categoryKey]) {
      return {};
    }

    return {
      [categoryKey]: tree[categoryKey],
    };
  }

  /**
   * Get items from tree (flattened)
   * @param {Object} tree - Category tree
   * @param {Object} options - Filter options
   * @param {string} options.type - Filter by type (commit or issue)
   * @param {string} options.category - Filter by category
   * @returns {Array} Flattened array of items
   */
  static getItems(tree, options = {}) {
    const items = [];

    Object.values(tree).forEach(category => {
      // Skip if category filter doesn't match
      if (options.category && category.name !== options.category) {
        return;
      }

      // Add top-level items
      category.items.forEach(item => {
        if (!options.type || item.type === options.type) {
          items.push(item);
        }
      });

      // Add subcategory items
      Object.values(category.subcategories).forEach(sub => {
        sub.items.forEach(item => {
          if (!options.type || item.type === options.type) {
            items.push(item);
          }
        });
      });
    });

    return items;
  }
}
