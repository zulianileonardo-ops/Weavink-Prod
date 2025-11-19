import React, { useEffect, useState } from 'react';
import { CategoryTree } from '../types';
import { getCategoryTree } from '../services/roadmapService';
import { FeatureTree } from '../components/FeatureTree';
import { RoadmapGraphView } from '../components/RoadmapGraphView';
import { ViewToggle } from '../components/ViewToggle';
import { StatCard } from '../components/StatCard';
import { DashboardCharts } from '../components/DashboardCharts';
import { CheckCircle, Clock, TrendingUp, Layout, ArrowLeft } from 'lucide-react';

export const DashboardRoadmap: React.FC = () => {
  const [tree, setTree] = useState<CategoryTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ commits: 0, issues: 0, total: 0, completionRate: 0 });
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  useEffect(() => {
    getCategoryTree().then(data => {
      setTree(data);
      
      // Calculate total stats
      let commits = 0;
      let issues = 0;
      Object.values(data).forEach(cat => {
          commits += cat.stats.commits;
          issues += cat.stats.issues;
      });
      const total = commits + issues;
      
      setStats({
          commits,
          issues,
          total,
          completionRate: total > 0 ? commits / total : 0
      });

      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex">
       {/* Sidebar Mock */}
       <aside className="w-64 bg-white border-r border-gray-200 hidden lg:block sticky top-0 h-screen overflow-y-auto">
          <div className="p-6">
             <div className="text-2xl font-bold text-gray-900 mb-8">Weavink</div>
             <nav className="space-y-1">
                <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 rounded-lg hover:bg-gray-50">
                    <Layout className="w-5 h-5" /> Overview
                </a>
                <a href="#/dashboard/roadmap" className="flex items-center gap-3 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                    <TrendingUp className="w-5 h-5" /> Roadmap
                </a>
             </nav>
          </div>
       </aside>

       <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto">
          <header className="mb-8 flex items-center justify-between">
             <div>
                <a href="#/roadmap" className="lg:hidden flex items-center gap-1 text-sm text-gray-500 mb-2"><ArrowLeft className="w-4 h-4"/> Back to Public</a>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Internal Roadmap</h1>
                <p className="text-gray-500 mt-1">Strategic overview of shipping velocity and future plans.</p>
             </div>
             <div className="flex items-center gap-3">
                <ViewToggle view={viewMode} onChange={setViewMode} />
                <span className="text-sm text-gray-500 mx-2">Last synced: Just now</span>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    Sync GitHub
                </button>
             </div>
          </header>

          {loading || !tree ? (
             <div className="animate-pulse space-y-6">
                 <div className="grid grid-cols-4 gap-4">
                    <div className="h-32 bg-gray-200 rounded-xl"></div>
                    <div className="h-32 bg-gray-200 rounded-xl"></div>
                    <div className="h-32 bg-gray-200 rounded-xl"></div>
                    <div className="h-32 bg-gray-200 rounded-xl"></div>
                 </div>
                 <div className="h-96 bg-gray-200 rounded-xl"></div>
             </div>
          ) : (
            <>
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard 
                        label="Shipped Features" 
                        value={stats.commits} 
                        icon={<CheckCircle className="w-6 h-6" />}
                        color="green"
                    />
                    <StatCard 
                        label="Planned Items" 
                        value={stats.issues} 
                        icon={<Clock className="w-6 h-6" />}
                        color="blue"
                    />
                    <StatCard 
                        label="Total Velocity" 
                        value={stats.total} 
                        icon={<TrendingUp className="w-6 h-6" />}
                        color="purple"
                    />
                    <StatCard 
                        label="Completion Rate" 
                        value={`${Math.round(stats.completionRate * 100)}%`} 
                        icon={<Layout className="w-6 h-6" />}
                        color="gray"
                    />
                </div>

                {/* Charts Area */}
                <DashboardCharts tree={tree} />

                {/* Main Content */}
                {viewMode === 'list' ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                        <FeatureTree tree={tree} />
                    </div>
                ) : (
                    <RoadmapGraphView tree={tree} />
                )}
            </>
          )}
       </main>
    </div>
  );
};