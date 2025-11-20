"use client";
import React, { useState, useEffect } from 'react';
import { List, GitGraph } from 'lucide-react';
import { useTranslation } from '@/lib/translation/useTranslation';

/**
 * ViewToggle - Switch between list and graph views
 * @param {Object} props
 * @param {Function} props.onViewChange - Callback when view changes
 * @param {string} props.defaultView - Default view ('list' or 'graph')
 */
export default function ViewToggle({ onViewChange, defaultView = 'list' }) {
  const { t } = useTranslation();
  const [view, setView] = useState(defaultView);

  // Load view preference from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem('roadmap_view');
    if (savedView && (savedView === 'list' || savedView === 'graph')) {
      setView(savedView);
      if (onViewChange) {
        onViewChange(savedView);
      }
    }
  }, [onViewChange]);

  const handleToggle = (newView) => {
    setView(newView);
    localStorage.setItem('roadmap_view', newView);
    if (onViewChange) {
      onViewChange(newView);
    }
  };

  return (
    <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
      <button
        onClick={() => handleToggle('list')}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          view === 'list'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        aria-pressed={view === 'list'}
        aria-label="List view"
      >
        <List className="w-4 h-4" />
        <span>{t('roadmap.views.list', 'List')}</span>
      </button>

      <button
        onClick={() => handleToggle('graph')}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          view === 'graph'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        aria-pressed={view === 'graph'}
        aria-label="Graph view"
      >
        <GitGraph className="w-4 h-4" />
        <span>{t('roadmap.views.graph', 'Graph')}</span>
      </button>
    </div>
  );
}
