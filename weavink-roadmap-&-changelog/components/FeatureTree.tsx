import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CategoryTree, CategoryNode, SubcategoryNode } from '../types';
import { CommitCard } from './CommitCard';
import { IssueCard } from './IssueCard';
import { CategoryBadge } from './CategoryBadge';

interface TreeProps {
  tree: CategoryTree;
}

interface CategoryRowProps {
  node: CategoryNode;
  defaultOpen?: boolean;
}

const CategoryRow: React.FC<CategoryRowProps> = ({ node, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, boolean>>({});

  const toggleSubcategory = (subName: string) => {
    setExpandedSubcategories(prev => ({ ...prev, [subName]: !prev[subName] }));
  };

  // Calculate height for progress bar
  const progress = node.stats.completionRate * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg bg-gray-100 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
            <ChevronRight className="w-5 h-5" />
          </div>

          <div className="flex flex-col items-start text-left">
            <div className="flex items-center gap-2 mb-1">
               <CategoryBadge category={node.name} showIcon={true} className="text-sm px-3 py-1" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{node.displayName}</h3>
          </div>
        </div>

        <div className="flex items-center gap-6 hidden md:flex">
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-3 text-sm mb-1">
                <span className="text-green-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {node.stats.commits} done
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-blue-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {node.stats.issues} planned
                </span>
             </div>
             <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" 
                    style={{ width: `${progress}%` }}
                />
             </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="border-t border-gray-100 bg-gray-50/50 p-4 md:p-6 space-y-4">
              
              {/* Subcategories */}
              {(Object.values(node.subcategories) as SubcategoryNode[]).map(sub => (
                 <div key={sub.name} className="ml-2 md:ml-6 border-l-2 border-gray-200 pl-4 md:pl-6 py-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleSubcategory(sub.name); }}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3 hover:text-blue-600 transition-colors"
                    >
                        {expandedSubcategories[sub.name] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {sub.displayName}
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{sub.items.length}</span>
                    </button>

                    <AnimatePresence>
                        {expandedSubcategories[sub.name] && (
                             <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-3 mb-4"
                             >
                                {sub.items.map((item, idx) => (
                                    <div key={`${item.type}-${idx}`}>
                                        {item.type === 'commit' ? <CommitCard commit={item} /> : <IssueCard issue={item} />}
                                    </div>
                                ))}
                             </motion.div>
                        )}
                    </AnimatePresence>
                 </div>
              ))}

              {/* Top Level Items */}
              {node.items.length > 0 && (
                  <div className="ml-2 md:ml-6 space-y-3">
                    {Object.keys(node.subcategories).length > 0 && (
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">General Items</h4>
                    )}
                    {node.items.map((item, idx) => (
                        <div key={`${item.type}-${idx}`}>
                            {item.type === 'commit' ? <CommitCard commit={item} /> : <IssueCard issue={item} />}
                        </div>
                    ))}
                  </div>
              )}

              {node.items.length === 0 && Object.keys(node.subcategories).length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm italic">
                      No items in this category yet.
                  </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const FeatureTree: React.FC<TreeProps> = ({ tree }) => {
  const categories = (Object.values(tree) as CategoryNode[]).sort((a, b) => {
      // Sort by total activity descending
      return b.stats.total - a.stats.total;
  });

  return (
    <div className="space-y-4">
      {categories.map(node => (
        <CategoryRow key={node.name} node={node} defaultOpen={node.stats.total > 3} />
      ))}
    </div>
  );
};