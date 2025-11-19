import React from 'react';
import { CategoryKey } from '../types';
import { CATEGORY_CONFIG } from '../constants';

interface Props {
  category: CategoryKey;
  showIcon?: boolean;
  className?: string;
}

export const CategoryBadge: React.FC<Props> = ({ category, showIcon = true, className = '' }) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.colorBg} ${config.colorText} ${className}`}>
      {showIcon && <span className="mr-1.5">{config.icon}</span>}
      {config.displayName}
    </span>
  );
};
