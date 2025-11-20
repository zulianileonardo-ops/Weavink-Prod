/**
 * Utility functions for roadmap components
 */

/**
 * Check if a category has any new commits within the threshold
 * @param {Object} category - Category object with items and subcategories
 * @param {number} thresholdDays - Days to consider "new"
 * @returns {boolean} True if category has new commits
 */
export function hasNewCommits(category, thresholdDays = 3) {
  const now = new Date();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

  // Check direct items
  const hasNewDirectItems = category.items?.some(item => {
    if (item.type !== 'commit') return false;
    const itemDate = new Date(item.date);
    const diffMs = now - itemDate;
    return diffMs >= 0 && diffMs <= thresholdMs;
  });

  if (hasNewDirectItems) return true;

  // Check subcategory items (recursive)
  if (category.subcategories) {
    return Object.values(category.subcategories).some(sub => {
      return sub.items?.some(item => {
        if (item.type !== 'commit') return false;
        const itemDate = new Date(item.date);
        const diffMs = now - itemDate;
        return diffMs >= 0 && diffMs <= thresholdMs;
      });
    });
  }

  return false;
}

/**
 * Check if a subcategory has any new commits within the threshold
 * @param {Object} subcategory - Subcategory object with items
 * @param {number} thresholdDays - Days to consider "new"
 * @returns {boolean} True if subcategory has new commits
 */
export function hasNewSubcategoryCommits(subcategory, thresholdDays = 3) {
  const now = new Date();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

  return subcategory.items?.some(item => {
    if (item.type !== 'commit') return false;
    const itemDate = new Date(item.date);
    const diffMs = now - itemDate;
    return diffMs >= 0 && diffMs <= thresholdMs;
  });
}
