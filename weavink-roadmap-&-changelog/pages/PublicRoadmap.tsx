import React, { useEffect, useState } from 'react';
import { CategoryTree } from '../types';
import { getCategoryTree } from '../services/roadmapService';
import { FeatureTree } from '../components/FeatureTree';
import { RoadmapGraphView } from '../components/RoadmapGraphView';
import { ViewToggle } from '../components/ViewToggle';
import { ArrowRight, Github } from 'lucide-react';

export const PublicRoadmap: React.FC = () => {
  const [tree, setTree] = useState<CategoryTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  useEffect(() => {
    getCategoryTree().then(data => {
      setTree(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
       {/* Navigation / Header */}
       <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
             <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900 tracking-tight">Weavink</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Public Beta</span>
             </div>
             <a href="#/dashboard/roadmap" className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1">
                Dashboard View <ArrowRight className="w-4 h-4" />
             </a>
          </div>
       </nav>

       <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
             <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                Roadmap & Changelog
             </h1>
             <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                Track our progress and see what's coming next. We believe in building in public and keeping our community informed.
             </p>
             <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="#" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
                    <Github className="w-5 h-5" />
                    Star on GitHub
                </a>
             </div>
          </div>

          {/* View Controls */}
          <div className="flex justify-end mb-6">
             <ViewToggle view={viewMode} onChange={setViewMode} />
          </div>

          {loading ? (
             <div className="space-y-4">
                {[1, 2, 3].map(i => (
                   <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
                ))}
             </div>
          ) : tree ? (
             viewMode === 'list' ? (
                <FeatureTree tree={tree} />
             ) : (
                <RoadmapGraphView tree={tree} />
             )
          ) : (
             <div className="text-center text-red-500">Failed to load roadmap data.</div>
          )}
          
          <footer className="mt-20 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
             <p>&copy; 2025 Weavink. All rights reserved.</p>
          </footer>
       </main>
    </div>
  );
};