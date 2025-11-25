'use client';
// GraphExplorerTab.jsx
// Main tab component for graph exploration in GroupManagerModal

import { useState, useEffect, useCallback } from 'react';

// Helper to convert Neo4j integer objects {low, high} to JavaScript numbers
const toNumber = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'object' && 'low' in val) return val.low;
  return Number(val) || 0;
};
import ContactGraph from './ContactGraph';
import GraphControls from './GraphControls';
import GraphLegend from './GraphLegend';
import NodeTooltip from './NodeTooltip';
import useGraphData from './hooks/useGraphData';

/**
 * GraphExplorerTab - Main component for graph-based group exploration
 *
 * @param {Array} groups - Existing groups
 * @param {Array} contacts - User's contacts
 * @param {function} onTabChange - Callback to switch tabs
 * @param {function} onCreateGroup - Callback to create a new group
 */
export default function GraphExplorerTab({
  groups = [],
  contacts = [],
  onTabChange,
  onCreateGroup
}) {
  const {
    graphData,
    stats,
    suggestions,
    graphSettings,
    discoveryProgress,
    isLoading,
    isDiscovering,
    isUpdatingSettings,
    error,
    fetchGraphData,
    fetchStats,
    fetchSuggestions,
    updateSettings,
    discoverRelationships,
    cancelDiscovery,
    refreshAll
  } = useGraphData();

  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [filters, setFilters] = useState({
    nodeTypes: ['Contact', 'Company', 'Tag'],
    relationshipTypes: ['WORKS_AT', 'HAS_TAG', 'SIMILAR_TO', 'KNOWS']
  });

  // Initial data fetch
  useEffect(() => {
    refreshAll();
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  // Handle node hover
  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node);
  }, []);

  // Handle discover relationships
  const handleDiscover = useCallback(async () => {
    const results = await discoverRelationships();
    if (results) {
      // Success notification could be added here
      console.log('Discovery results:', results);
    }
  }, [discoverRelationships]);

  // Handle create group from suggestion
  const handleCreateGroupFromSuggestion = useCallback((suggestion) => {
    if (onCreateGroup) {
      onCreateGroup({
        name: suggestion.name,
        type: `intelligent_${suggestion.type}`,
        contactIds: suggestion.members.map(m => m.id),
        metadata: {
          source: 'graph_suggestion',
          suggestionType: suggestion.type,
          confidence: suggestion.confidence
        }
      });
    }
  }, [onCreateGroup]);

  // Handle create group from node
  const handleCreateGroupFromNode = useCallback((node) => {
    if (onCreateGroup && node) {
      // For company nodes, we'd need to find related contacts
      // This is a placeholder - actual implementation would query Neo4j
      onCreateGroup({
        name: node.type === 'Company' ? `${node.name} Team` : `${node.name} Group`,
        type: node.type === 'Company' ? 'intelligent_company' : 'intelligent_tag',
        metadata: {
          source: 'graph_node',
          nodeType: node.type,
          nodeId: node.id
        }
      });
    }
  }, [onCreateGroup]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Graph Explorer</h3>
          <p className="text-sm text-gray-500">
            Visualize relationships between your contacts
          </p>
        </div>

        {/* Discover button */}
        <button
          onClick={handleDiscover}
          disabled={isDiscovering || contacts.length === 0}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDiscovering ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Discovering...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Discover Relationships
            </>
          )}
        </button>
      </div>

      {/* Discovery Progress Bar */}
      {isDiscovering && discoveryProgress && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm font-medium text-purple-700">
                {discoveryProgress.currentStep || 'Processing...'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-purple-700">
                {discoveryProgress.progress}%
              </span>
              <button
                onClick={cancelDiscovery}
                className="text-xs text-purple-600 hover:text-purple-800 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-purple-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-purple-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${discoveryProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats bar */}
      {stats && (
        <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Contacts:</span>
            <span className="font-medium text-gray-900">{toNumber(stats.contactCount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Companies:</span>
            <span className="font-medium text-gray-900">{toNumber(stats.companyCount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Tags:</span>
            <span className="font-medium text-gray-900">{toNumber(stats.tagCount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Relationships:</span>
            <span className="font-medium text-gray-900">{toNumber(stats.similarityCount)}</span>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Controls */}
      <GraphControls
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={() => refreshAll(true)} // Force cache clear on manual refresh
        isLoading={isLoading}
        graphSettings={graphSettings}
        onSettingsChange={updateSettings}
        isUpdatingSettings={isUpdatingSettings}
      />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Graph */}
        <div className="lg:col-span-3 relative">
          <ContactGraph
            graphData={graphData}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            selectedNode={selectedNode}
            filters={filters}
            height={400}
          />

          {/* Node tooltip overlay */}
          {selectedNode && (
            <div className="absolute top-4 right-4 z-10">
              <NodeTooltip
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
                onCreateGroup={handleCreateGroupFromNode}
              />
            </div>
          )}
        </div>

        {/* Suggestions sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Legend */}
          <GraphLegend />

          {/* Group suggestions */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900">
                Suggested Groups
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Based on discovered relationships
              </p>
            </div>

            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {suggestions.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  <p>No suggestions yet</p>
                  <p className="text-xs mt-1">Run discovery to find groups</p>
                </div>
              ) : (
                suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {suggestion.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {suggestion.reason}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                            suggestion.type === 'company'
                              ? 'bg-blue-100 text-blue-700'
                              : suggestion.type === 'semantic'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {suggestion.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {suggestion.members?.length || 0} members
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCreateGroupFromSuggestion(suggestion)}
                        className="flex-shrink-0 ml-2 p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                        title="Create group"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Compact legend for mobile */}
      <div className="lg:hidden">
        <GraphLegend compact />
      </div>
    </div>
  );
}
