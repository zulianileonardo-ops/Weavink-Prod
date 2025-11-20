"use client";
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CommitCard from './CommitCard';
import IssueCard from './IssueCard';
import CategoryBadge from './CategoryBadge';
import NewBadge from './NewBadge';
import { useTranslation } from '@/lib/translation/useTranslation';
import { ROADMAP_LIMITS } from '@/lib/services/serviceRoadmap/constants/roadmapConstants';
import { hasNewCommits } from './roadmapUtils';

/**
 * CategoryTree - Hierarchical tree view with expand/collapse
 * @param {Object} props
 * @param {Object} props.tree - Category tree object
 * @param {boolean} props.defaultExpanded - Whether categories are expanded by default
 */
export default function CategoryTree({ tree, defaultExpanded = false }) {
  const { t } = useTranslation();
  const [expandedCategories, setExpandedCategories] = useState(() => {
    if (defaultExpanded) {
      return Object.keys(tree).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {});
    }
    return {};
  });
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

  if (!tree || Object.keys(tree).length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('roadmap.empty_states.no_data', 'No roadmap data available')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.values(tree).map(category => {
        const isExpanded = expandedCategories[category.name];
        const hasItems = category.items.length > 0 || Object.keys(category.subcategories).length > 0;
        const hasNew = hasNewCommits(category, ROADMAP_LIMITS.NEW_BADGE_THRESHOLD_DAYS);

        // Skip empty categories
        if (!hasItems) return null;

        return (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.name)}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left"
              aria-expanded={isExpanded}
              aria-label={`Toggle ${category.displayName} category`}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-500 transition-transform" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500 transition-transform" />
                )}

                <span className="text-3xl">{category.icon}</span>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t(`roadmap.categories.${category.name}.name`, category.displayName)}
                    </h3>
                    {hasNew && <NewBadge showAlways={true} />}
                  </div>
                  {category.description && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t(`roadmap.categories.${category.name}.description`, category.description)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Stats */}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-600 font-medium">
                    {category.stats.commits} {t('roadmap.stats.completed', 'completed')}
                  </span>
                  <span className="text-blue-600 font-medium">
                    {category.stats.issues} {t('roadmap.stats.planned', 'planned')}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-themeGreen transition-all duration-300"
                    style={{ width: `${category.stats.completionRate * 100}%` }}
                  />
                </div>
              </div>
            </button>

            {/* Category Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 pt-0 bg-gray-50 space-y-3">
                    {/* Top-level items */}
                    {category.items.map((item, index) => (
                      <motion.div
                        key={`${item.type}-${item.hash || item.id}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {item.type === 'commit' ? (
                          <CommitCard commit={item} />
                        ) : (
                          <IssueCard issue={item} />
                        )}
                      </motion.div>
                    ))}

                    {/* Subcategories */}
                    {Object.values(category.subcategories).map(subcategory => {
                      const subKey = `${category.name}-${subcategory.name}`;
                      const isSubExpanded = expandedSubcategories[subKey];

                      return (
                        <div key={subcategory.name} className="ml-4 border-l-2 border-gray-300 pl-4">
                          <button
                            onClick={() => toggleSubcategory(category.name, subcategory.name)}
                            className="w-full flex items-center gap-2 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors text-left mb-2"
                            aria-expanded={isSubExpanded}
                            aria-label={`Toggle ${subcategory.displayName} subcategory`}
                          >
                            {isSubExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="font-medium text-gray-700">
                              {subcategory.displayName}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({subcategory.items.length})
                            </span>
                          </button>

                          <AnimatePresence>
                            {isSubExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-2 overflow-hidden"
                              >
                                {subcategory.items.map((item, index) => (
                                  <motion.div
                                    key={`${item.type}-${item.hash || item.id}-${index}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                  >
                                    {item.type === 'commit' ? (
                                      <CommitCard commit={item} />
                                    ) : (
                                      <IssueCard issue={item} />
                                    )}
                                  </motion.div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
