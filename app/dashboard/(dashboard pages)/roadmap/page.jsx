"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/lib/translation/useTranslation';
import { RoadmapService } from '@/lib/services/serviceRoadmap/client/roadmapService';
import CategoryTree from '@/app/roadmap/components/CategoryTree';
import RoadmapGraphView from '@/app/roadmap/components/RoadmapGraphView';
import ViewToggle from '@/app/roadmap/components/ViewToggle';
import StatCard from './components/StatCard';
import DashboardCharts from './components/DashboardCharts';
import { CheckCircle, Clock, BarChart, TrendingUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardRoadmapPage() {
  const { currentUser, getValidToken } = useAuth();
  const { t } = useTranslation();
  const [categoryTree, setCategoryTree] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('list');

  const fetchRoadmap = useCallback(async (forceRefresh = false) => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const token = await getValidToken();
      const data = await RoadmapService.getUserRoadmap(token, { forceRefresh });

      setCategoryTree(data.tree);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch roadmap:', error);
      toast.error(t('roadmap.errors.fetch_failed', 'Failed to load roadmap'));
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, getValidToken, t]);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 rounded-lg w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-32 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">{t('common.please_login', 'Please login to view this page')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('roadmap.title', 'Roadmap & Progress')}
          </h1>
          <p className="text-gray-600">
            {t('roadmap.dashboard_subtitle', 'Comprehensive view of completed work and planned features')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ViewToggle onViewChange={setView} defaultView="list" />
          <button
            onClick={() => fetchRoadmap(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('roadmap.actions.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label={t('roadmap.stats.completed', 'Completed')}
            value={stats.commits}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label={t('roadmap.stats.planned', 'Planned')}
            value={stats.issues}
            color="blue"
          />
          <StatCard
            icon={<BarChart className="w-5 h-5" />}
            label={t('roadmap.stats.total_items', 'Total Items')}
            value={stats.total}
            color="gray"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label={t('roadmap.stats.progress', 'Progress')}
            value={`${Math.round(stats.completionRate * 100)}%`}
            color="purple"
          />
        </div>
      )}

      {/* Charts */}
      {categoryTree && <DashboardCharts tree={categoryTree} />}

      {/* Category Tree */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {t('roadmap.sections.all_categories', 'All Categories')}
        </h2>
      </div>

      {view === 'list' && categoryTree && (
        <CategoryTree tree={categoryTree} defaultExpanded={false} />
      )}

      {view === 'graph' && categoryTree && (
        <RoadmapGraphView tree={categoryTree} />
      )}
    </div>
  );
}
