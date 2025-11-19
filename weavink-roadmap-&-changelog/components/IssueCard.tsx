import React from 'react';
import { GitPullRequestArrow, ExternalLink, Tag, Calendar } from 'lucide-react';
import { Issue } from '../types';

interface Props {
  issue: Issue;
}

export const IssueCard: React.FC<Props> = ({ issue }) => {
  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 border-l-4 border-l-blue-500 hover:border-blue-400 hover:shadow-md transition-all">
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
          <GitPullRequestArrow className="w-4 h-4 text-blue-600" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <a
              href={issue.url}
              onClick={(e) => e.preventDefault()} // Prevent actual navigation for mock
              className="text-sm font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
            >
              {issue.title}
              <ExternalLink className="w-3 h-3 opacity-50" />
            </a>

            {issue.description && (
              <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                {issue.description}
              </p>
            )}
          </div>

          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-mono font-medium whitespace-nowrap">
            #{issue.number}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {issue.labels.map(label => (
            <span
              key={label}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase tracking-wider font-medium"
            >
              <Tag className="w-3 h-3" />
              {label}
            </span>
          ))}

          {issue.milestone && (
            <span className="ml-auto flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
              <Calendar className="w-3 h-3" />
              {issue.milestone}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
