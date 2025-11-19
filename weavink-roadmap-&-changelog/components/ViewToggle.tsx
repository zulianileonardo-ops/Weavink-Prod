import React from 'react';
import { List, GitGraph } from 'lucide-react';

interface Props {
  view: 'list' | 'graph';
  onChange: (view: 'list' | 'graph') => void;
}

export const ViewToggle: React.FC<Props> = ({ view, onChange }) => {
  return (
    <div className="inline-flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-sm">
      <button
        onClick={() => onChange('list')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          view === 'list'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <List className="w-4 h-4" />
        List
      </button>
      <button
        onClick={() => onChange('graph')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          view === 'graph'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <GitGraph className="w-4 h-4" />
        Tree
      </button>
    </div>
  );
};