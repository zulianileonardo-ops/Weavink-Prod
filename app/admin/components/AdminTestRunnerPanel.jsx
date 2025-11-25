"use client"
// app/admin/components/AdminTestRunnerPanel.jsx
// Admin panel component for running integration tests

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Category colors for visual grouping
const CATEGORY_COLORS = {
  privacy: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
  analytics: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  ai: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  features: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  search: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-800' },
  security: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' }
};

export default function AdminTestRunnerPanel() {
  const { currentUser } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningTests, setRunningTests] = useState({});
  const [testResults, setTestResults] = useState({});
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [runAllInProgress, setRunAllInProgress] = useState(false);

  // Fetch available tests on mount
  useEffect(() => {
    fetchTests();
  }, [currentUser]);

  const fetchTests = async () => {
    if (!currentUser) return;

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/run-tests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTests(data.tests || []);
      } else {
        console.error('Failed to fetch tests');
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const runTest = async (testFile) => {
    if (!currentUser || runningTests[testFile]) return;

    setRunningTests(prev => ({ ...prev, [testFile]: true }));

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/run-tests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testFile })
      });

      const result = await response.json();
      setTestResults(prev => ({ ...prev, [testFile]: result }));

      // Auto-show output for the test that just ran
      setSelectedOutput(testFile);

    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testFile]: { success: false, error: error.message }
      }));
    } finally {
      setRunningTests(prev => ({ ...prev, [testFile]: false }));
    }
  };

  const runAllTests = async () => {
    if (runAllInProgress) return;

    setRunAllInProgress(true);
    setTestResults({});
    setSelectedOutput(null);

    for (const test of tests) {
      await runTest(test.file);
    }

    setRunAllInProgress(false);
  };

  const getResultIcon = (result) => {
    if (!result) return null;
    if (result.success) return '✅';
    return '❌';
  };

  const getResultSummary = (result) => {
    if (!result) return '';
    if (result.passed !== null && result.total !== null) {
      return `${result.passed}/${result.total}`;
    }
    return result.success ? 'Passed' : 'Failed';
  };

  const getCategoryColor = (category) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.features;
  };

  // Calculate overall stats
  const overallStats = {
    total: Object.keys(testResults).length,
    passed: Object.values(testResults).filter(r => r?.success).length,
    failed: Object.values(testResults).filter(r => r && !r.success).length,
    totalTests: Object.values(testResults).reduce((sum, r) => sum + (r?.total || 0), 0),
    totalPassed: Object.values(testResults).reduce((sum, r) => sum + (r?.passed || 0), 0)
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg border-2 border-emerald-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <span className="ml-3 text-gray-600">Loading tests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-emerald-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>🧪</span>
          Integration Test Runner
        </h3>
        <div className="flex items-center gap-3">
          {/* Overall Stats */}
          {overallStats.total > 0 && (
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {overallStats.passed}/{overallStats.total} suites |
              {overallStats.totalPassed}/{overallStats.totalTests} tests
            </div>
          )}
          {/* Run All Button */}
          <button
            onClick={runAllTests}
            disabled={runAllInProgress || Object.keys(runningTests).some(k => runningTests[k])}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              runAllInProgress
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {runAllInProgress ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Running All...
              </>
            ) : (
              <>
                <span>🚀</span>
                Run All Tests
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {tests.map((test) => {
          const colors = getCategoryColor(test.category);
          const result = testResults[test.file];
          const isRunning = runningTests[test.file];

          return (
            <div
              key={test.file}
              className={`rounded-lg border-2 p-4 ${colors.bg} ${colors.border} ${
                selectedOutput === test.file ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              {/* Test Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className={`font-medium ${colors.text}`}>{test.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                    {test.category}
                  </span>
                </div>
                {result && (
                  <span className="text-lg">{getResultIcon(result)}</span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 mb-3">{test.description}</p>

              {/* Result Summary */}
              {result && (
                <div className={`text-sm mb-3 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {getResultSummary(result)}
                  {result.duration && (
                    <span className="text-gray-500 ml-2">({result.duration}ms)</span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => runTest(test.file)}
                  disabled={isRunning}
                  className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isRunning
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
                      Running...
                    </>
                  ) : (
                    <>
                      <span>▶️</span>
                      Run
                    </>
                  )}
                </button>
                {result && (
                  <button
                    onClick={() => setSelectedOutput(test.file)}
                    className="px-3 py-1.5 rounded text-sm bg-white border border-gray-300 hover:bg-gray-50"
                  >
                    📋
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Output Panel */}
      {selectedOutput && testResults[selectedOutput] && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <span>📄</span>
              Output: {tests.find(t => t.file === selectedOutput)?.name}
            </h4>
            <button
              onClick={() => setSelectedOutput(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕ Close
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
            {testResults[selectedOutput].output || testResults[selectedOutput].error || 'No output available'}
          </pre>
          {testResults[selectedOutput].timestamp && (
            <p className="text-xs text-gray-500 mt-2">
              Ran at: {new Date(testResults[selectedOutput].timestamp).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {tests.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-2 block">🔍</span>
          No test files found
        </div>
      )}
    </div>
  );
}
