"use client";
import React from 'react';
import { GitCommit, User, Calendar } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';

/**
 * CommitCard - Display individual commit with metadata
 * @param {Object} props
 * @param {Object} props.commit - Commit object
 */
export default function CommitCard({ commit }) {
  const { t } = useTranslation();

  // Format date
  const formattedDate = new Date(commit.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Generate GitHub commit URL (if GITHUB_REPO_OWNER and GITHUB_REPO_NAME are available)
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER && process.env.NEXT_PUBLIC_GITHUB_REPO_NAME
    ? `https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER}/${process.env.NEXT_PUBLIC_GITHUB_REPO_NAME}/commit/${commit.hash}`
    : null;

  return (
    <div className="group flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-themeGreen transition-all duration-200">
      {/* Icon */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
          <GitCommit className="w-4 h-4 text-green-600" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1">
            {commit.emoji && (
              <span className="text-xl flex-shrink-0">{commit.emoji}</span>
            )}
            <p className="text-sm font-medium text-gray-900 flex-1">
              {commit.message}
            </p>
          </div>

          <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formattedDate}
          </span>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{commit.author}</span>
          </div>

          {githubUrl ? (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 bg-gray-100 rounded font-mono hover:bg-gray-200 transition-colors"
            >
              {commit.hash.substring(0, 7)}
            </a>
          ) : (
            <code className="px-2 py-0.5 bg-gray-100 rounded font-mono">
              {commit.hash.substring(0, 7)}
            </code>
          )}

          {commit.subcategory && (
            <span className="text-gray-400">
              • {commit.subcategory.replace(/-/g, ' ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
