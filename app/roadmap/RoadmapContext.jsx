"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { RoadmapService } from '@/lib/services/serviceRoadmap/client/roadmapService';

const RoadmapContext = createContext();

export function useRoadmap() {
  const context = useContext(RoadmapContext);
  if (!context) {
    throw new Error('useRoadmap must be used within a RoadmapProvider');
  }
  return context;
}

export function RoadmapProvider({ children }) {
  const [categoryTree, setCategoryTree] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoadmap = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await RoadmapService.getCategoryTree({ forceRefresh });
      setCategoryTree(data.tree);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch roadmap:', err);
      setError(err.message || 'Failed to load roadmap data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const value = {
    categoryTree,
    stats,
    isLoading,
    error,
    refetch: () => fetchRoadmap(true),
  };

  return (
    <RoadmapContext.Provider value={value}>
      {children}
    </RoadmapContext.Provider>
  );
}
