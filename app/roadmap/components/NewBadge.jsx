"use client";
import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';

/**
 * NewBadge - Display "NEW" indicator for recent commits or categories
 * @param {Object} props
 * @param {Date|string} props.date - Commit date (optional, for date-based display)
 * @param {number} props.thresholdDays - Days to consider "new" (default: 14)
 * @param {boolean} props.showAlways - Always show badge without date check (for categories)
 */
export default function NewBadge({ date, thresholdDays = 14, showAlways = false }) {
  const { t } = useTranslation();

  // If date provided, check threshold
  if (date && !showAlways) {
    const commitDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - commitDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > thresholdDays) {
      return null;
    }
  }

  // If no date and not showAlways, don't render
  if (!date && !showAlways) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full animate-pulse">
      <Sparkles className="w-3 h-3" />
      {t('roadmap.new_badge', 'NEW')}
    </span>
  );
}
