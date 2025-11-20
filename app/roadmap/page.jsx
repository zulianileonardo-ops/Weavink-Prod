"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/translation/useTranslation';
import { RoadmapProvider, useRoadmap } from './RoadmapContext';
import CategoryTree from './components/CategoryTree';
import RoadmapGraphView from './components/RoadmapGraphView';
import ViewToggle from './components/ViewToggle';
import { RefreshCw } from 'lucide-react';

function RoadmapContent() {
  const { t } = useTranslation();
  const { categoryTree, stats, isLoading, error, refetch } = useRoadmap();
  const searchParams = useSearchParams();
  const [view, setView] = useState('list');

  // Extract URL parameters
  const urlView = searchParams.get('view');
  const selectedCommitHash = searchParams.get('commit');

  // Initialize view from URL if present
  useEffect(() => {
    if (urlView && (urlView === 'list' || urlView === 'graph')) {
      setView(urlView);
    }
  }, [urlView]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-xl"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            {t('roadmap.errors.fetch_failed', 'Failed to load roadmap')}
          </h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('roadmap.actions.retry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t('roadmap.title', 'Roadmap & Changelog')}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
          {t(
            'roadmap.subtitle',
            'Track our progress and see what\'s coming next. Every feature we build and every improvement we make is documented here.'
          )}
        </p>

        {/* Stats */}
        {stats && (
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-green-600">{stats.commits}</span>
              <span className="text-gray-600">{t('roadmap.stats.completed', 'completed')}</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-600">{stats.issues}</span>
              <span className="text-gray-600">{t('roadmap.stats.planned', 'planned')}</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-purple-600">
                {Math.round(stats.completionRate * 100)}%
              </span>
              <span className="text-gray-600">{t('roadmap.stats.progress', 'progress')}</span>
            </div>
          </div>
        )}
      </header>

      {/* View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          {t('roadmap.sections.all_categories', 'All Categories')}
        </h2>
        <ViewToggle onViewChange={setView} defaultView={urlView || 'list'} />
      </div>

      {/* Content */}
      {view === 'list' && categoryTree && (
        <CategoryTree tree={categoryTree} defaultExpanded={false} />
      )}

      {view === 'graph' && categoryTree && (
        <RoadmapGraphView tree={categoryTree} selectedCommitHash={selectedCommitHash} />
      )}
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <RoadmapProvider>
      <RoadmapContent />
    </RoadmapProvider>
  );
}
