import React, { useState, useEffect } from 'react';
import { PublicRoadmap } from './pages/PublicRoadmap';
import { DashboardRoadmap } from './pages/DashboardRoadmap';

// Simple hash-based router
export default function App() {
  const [route, setRoute] = useState<string>('/');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '/';
      setRoute(hash);
    };

    // Set initial route
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Route matching logic
  // Public: / or /roadmap
  // Dashboard: /dashboard or /dashboard/roadmap
  const isDashboard = route.startsWith('/dashboard');

  return (
    <>
      {!isDashboard && <PublicRoadmap />}
      {isDashboard && <DashboardRoadmap />}
    </>
  );
}