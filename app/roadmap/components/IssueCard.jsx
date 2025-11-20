"use client";
import React from 'react';
import { GitBranch, ExternalLink, Tag, Clock } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';

/**
 * IssueCard - Display GitHub issue with labels and status
 * @param {Object} props
 * @param {Object} props.issue - Issue object
 */
export default function IssueCard({ issue }) {
  const { t } = useTranslation();

  // Priority badge colors
  const priorityColors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const priorityColor = priorityColors[issue.priority] || priorityColors.medium;

  return (
    <div className="group flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border-2 border-blue-200 hover:shadow-md hover:border-blue-400 transition-all duration-200">
      {/* Icon */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
          <GitBranch className="w-4 h-4 text-blue-600" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center gap-1 group/link"
          >
            <span className="flex-1">{issue.title}</span>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
          </a>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Priority badge */}
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColor}`}>
              {issue.priority}
            </span>

            {/* Issue number */}
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
              #{issue.number}
            </span>
          </div>
        </div>

        {/* Description */}
        {issue.description && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {issue.description}
          </p>
        )}

        {/* Labels and metadata */}
        <div className="flex items-center gap-2 flex-wrap">
          {issue.labels.slice(0, 3).map(label => (
            <span
              key={label}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
            >
              <Tag className="w-3 h-3" />
              {label}
            </span>
          ))}

          {issue.labels.length > 3 && (
            <span className="text-xs text-gray-400">
              +{issue.labels.length - 3} more
            </span>
          )}

          {issue.milestone && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {issue.milestone}
            </span>
          )}

          {issue.assignee && (
            <span className="text-xs text-gray-400">
              • @{issue.assignee}
            </span>
          )}

          {issue.subcategory && (
            <span className="text-xs text-gray-400">
              • {issue.subcategory.replace(/-/g, ' ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
