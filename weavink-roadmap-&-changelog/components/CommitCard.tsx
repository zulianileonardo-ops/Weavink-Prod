import React from 'react';
import { GitCommit, User } from 'lucide-react';
import { Commit } from '../types';

interface Props {
  commit: Commit;
}

export const CommitCard: React.FC<Props> = ({ commit }) => {
  const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(commit.date);

  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-green-400 hover:shadow-sm transition-all group">
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center group-hover:bg-green-100 transition-colors">
          <GitCommit className="w-4 h-4 text-green-600" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl" role="img" aria-label="emoji">{commit.emoji}</span>
            <p className="text-sm font-medium text-gray-900 leading-snug">
              {commit.message.replace(commit.emoji, '').trim()}
            </p>
          </div>

          <span className="text-xs text-gray-400 whitespace-nowrap font-mono">
            {formattedDate}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            <span>{commit.author}</span>
          </div>

          <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono text-[10px]">
            {commit.hash.substring(0, 7)}
          </code>
        </div>
      </div>
    </div>
  );
};
