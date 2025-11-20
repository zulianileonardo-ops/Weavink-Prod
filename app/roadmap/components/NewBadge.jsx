"use client";
import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * NewBadge - Display "NEW" indicator for recent commits
 * @param {Object} props
 * @param {Date|string} props.date - Commit date
 * @param {number} props.thresholdDays - Days to consider "new" (default: 14)
 */
export default function NewBadge({ date, thresholdDays = 14 }) {
  const commitDate = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now - commitDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > thresholdDays) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full animate-pulse">
      <Sparkles className="w-3 h-3" />
      NEW
    </span>
  );
}
