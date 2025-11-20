"use client";
import React from 'react';
import { CATEGORY_CONFIG } from '@/lib/services/constants';
import { useTranslation } from '@/lib/translation/useTranslation';

/**
 * CategoryBadge - Display category with icon and color
 * @param {Object} props
 * @param {string} props.categoryKey - Category key from CATEGORY_KEYS
 * @param {boolean} props.showIcon - Whether to show icon (default: true)
 */
export default function CategoryBadge({ categoryKey, showIcon = true }) {
  const { t } = useTranslation();
  const config = CATEGORY_CONFIG[categoryKey];

  if (!config) {
    return (
      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <span>Unknown</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.colorBg} ${config.colorText}`}>
      {showIcon && config.icon && (
        <span className="mr-1">{config.icon}</span>
      )}
      <span>{t(`roadmap.categories.${categoryKey}.name`, config.displayName)}</span>
    </div>
  );
}
