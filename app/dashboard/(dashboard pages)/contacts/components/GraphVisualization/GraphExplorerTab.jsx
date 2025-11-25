'use client';
// GraphExplorerTab.jsx
// Main tab component for graph exploration in GroupManagerModal

import { useState, useEffect, useCallback, useMemo } from 'react';

// Helper to convert Neo4j integer objects {low, high} to JavaScript numbers
const toNumber = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'object' && 'low' in val) return val.low;
  return Number(val) || 0;
};
import ContactGraph from './ContactGraph';
import GraphControls from './GraphControls';
import GraphLegend from './GraphLegend';
import GraphSidebar from './GraphSidebar';
import NodeTooltip from './NodeTooltip';
import PendingRelationshipsPanel from './PendingRelationshipsPanel';
import useGraphData from './hooks/useGraphData';

// Helper to get all node IDs connected to a given node
function getConnectedNodeIds(nodeId, links) {
  const connected = new Set([nodeId]);
  links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    if (sourceId === nodeId) connected.add(targetId);
    if (targetId === nodeId) connected.add(sourceId);
  });
  return connected;
}

// Helper to get links connected to a node (for animation)
function getConnectedLinks(nodeId, links) {
  return links.filter(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    return sourceId === nodeId || targetId === nodeId;
  });
}

/**
 * GraphExplorerTab - Main component for graph-based group exploration
 *
 * @param {Array} groups - Existing groups
 * @param {Array} contacts - User's contacts
 * @param {function} onTabChange - Callback to switch tabs
 * @param {function} onOpenCreateWithSuggestion - Callback to open create tab with pre-populated suggestion
 * @param {Array} initialHighlightContactIds - Contact IDs to highlight on mount (from search results)
 * @param {boolean} startInFullscreen - Start in fullscreen mode
 */
export default function GraphExplorerTab({
  groups = [],
  contacts = [],
  onTabChange,
  onOpenCreateWithSuggestion,
  initialHighlightContactIds = null,
  startInFullscreen = false
}) {
  const {
    graphData,
    stats,
    suggestions,
    graphSettings,
    discoveryProgress,
    pendingRelationships,
    isLoading,
    isDiscovering,
    isUpdatingSettings,
    isReviewLoading,
    assessingRelationshipId,
    error,
    fetchGraphData,
    fetchStats,
    fetchSuggestions,
    updateSettings,
    discoverRelationships,
    cancelDiscovery,
    refreshAll,
    // Review workflow
    approveRelationship,
    rejectRelationship,
    batchApproveRelationships,
    batchRejectRelationships,
    requestAssessment,
    clearPendingRelationships
  } = useGraphData();

  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [showPendingPanel, setShowPendingPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(startInFullscreen);
  const [showFullscreenFilters, setShowFullscreenFilters] = useState(false);
  const [filters, setFilters] = useState({
    nodeTypes: ['Contact', 'Company', 'Tag'],
    relationshipTypes: ['WORKS_AT', 'HAS_TAG', 'SIMILAR_TO', 'KNOWS'],
    selectedCompanies: [],  // Empty = all, otherwise only these
    selectedTags: []        // Empty = all, otherwise only these
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sidebar focus state
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [animatingLinks, setAnimatingLinks] = useState(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState(null);

  // Suggestions panel state (fullscreen)
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState('all'); // 'all' | 'company' | 'tag' | 'semantic' | 'knows'

  // Graph view mode state (2d/3d) - lifted from ContactGraph for fullscreen controls
  const [viewMode, setViewMode] = useState('2d');

  // Filter suggestions by relationship type
  const filteredSuggestions = useMemo(() => {
    if (suggestionFilter === 'all') return suggestions;
    return suggestions.filter(s => s.type === suggestionFilter);
  }, [suggestions, suggestionFilter]);

  // Extract unique companies and tags for advanced filters
  const uniqueCompanies = useMemo(() => {
    return [...new Set(
      graphData?.nodes
        ?.filter(n => n.type === 'Company')
        .map(n => n.name)
        .filter(Boolean)
    )].sort();
  }, [graphData?.nodes]);

  const uniqueTags = useMemo(() => {
    return [...new Set(
      graphData?.nodes
        ?.filter(n => n.type === 'Tag')
        .map(n => n.name)
        .filter(Boolean)
    )].sort();
  }, [graphData?.nodes]);

  // Helper functions for advanced filters
  const toggleCompanyFilter = useCallback((company) => {
    setFilters(prev => {
      const current = prev.selectedCompanies || [];
      const isSelected = current.includes(company);
      return {
        ...prev,
        selectedCompanies: isSelected
          ? current.filter(c => c !== company)
          : [...current, company]
      };
    });
  }, []);

  const toggleTagFilter = useCallback((tag) => {
    setFilters(prev => {
      const current = prev.selectedTags || [];
      const isSelected = current.includes(tag);
      return {
        ...prev,
        selectedTags: isSelected
          ? current.filter(t => t !== tag)
          : [...current, tag]
      };
    });
  }, []);

  // Initial data fetch
  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply initial highlight when graph data loads (for search results view)
  useEffect(() => {
    if (initialHighlightContactIds && initialHighlightContactIds.length > 0 && graphData?.links?.length > 0) {
      // Compute all connected nodes for all highlighted contacts
      const allHighlighted = new Set();
      initialHighlightContactIds.forEach(contactId => {
        const connected = getConnectedNodeIds(contactId, graphData.links);
        connected.forEach(id => allHighlighted.add(id));
      });
      setHighlightedNodeIds(allHighlighted);
      // Don't set focusedNodeId since we're highlighting multiple contacts
    }
  }, [initialHighlightContactIds, graphData?.links]);

  // Handle node click - also triggers focus/highlight behavior
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    // Trigger focus/highlight when clicking a node
    if (node) {
      // If clicking the same node again, toggle off (clear focus)
      if (focusedNodeId === node.id) {
        setFocusedNodeId(null);
        setHighlightedNodeIds(null);
        setAnimatingLinks(null);
        return;
      }
      // Compute highlighted nodes directly here to avoid dependency issues
      const connectedIds = getConnectedNodeIds(node.id, graphData?.links || []);
      setFocusedNodeId(node.id);
      setHighlightedNodeIds(connectedIds);
      // Start connection animation
      const connectedLinks = getConnectedLinks(node.id, graphData?.links || []);
      if (connectedLinks.length > 0) {
        const typePriority = { WORKS_AT: 1, HAS_TAG: 2, SIMILAR_TO: 3, KNOWS: 4 };
        const sortedLinks = [...connectedLinks].sort((a, b) =>
          (typePriority[a.type] || 99) - (typePriority[b.type] || 99)
        );
        setAnimatingLinks([]);
        sortedLinks.forEach((link, i) => {
          setTimeout(() => {
            setAnimatingLinks(prev => [...(prev || []), link]);
            if (i === sortedLinks.length - 1) {
              setTimeout(() => setAnimatingLinks(null), 200);
            }
          }, i * 100);
        });
      }
    } else {
      // Clicking background clears focus
      setFocusedNodeId(null);
      setHighlightedNodeIds(null);
      setAnimatingLinks(null);
    }
  }, [graphData?.links, focusedNodeId]);

  // Handle node hover
  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node);
  }, []);

  // Show pending panel when discovery completes with pending relationships
  useEffect(() => {
    if (discoveryProgress.status === 'completed' && discoveryProgress.hasPendingRelationships) {
      setShowPendingPanel(true);
    }
  }, [discoveryProgress.status, discoveryProgress.hasPendingRelationships]);

  // ESC key handler for fullscreen
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    if (isFullscreen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isFullscreen]);

  // Handle discover relationships
  const handleDiscover = useCallback(async () => {
    const results = await discoverRelationships();
    if (results) {
      console.log('Discovery results:', results);
    }
  }, [discoverRelationships]);

  // Handle closing the pending panel
  const handleClosePendingPanel = useCallback(() => {
    setShowPendingPanel(false);
  }, []);

  // Handle create group from suggestion - opens create tab with pre-populated data
  const handleCreateGroupFromSuggestion = useCallback((suggestion) => {
    if (onOpenCreateWithSuggestion) {
      onOpenCreateWithSuggestion(suggestion);
    }
  }, [onOpenCreateWithSuggestion]);

  // Handle create group from node
  const handleCreateGroupFromNode = useCallback((node) => {
    if (onOpenCreateWithSuggestion && node) {
      // Create a suggestion-like object from node data
      onOpenCreateWithSuggestion({
        name: node.type === 'Company' ? `${node.name} Team` : `${node.name} Group`,
        type: node.type === 'Company' ? 'company' : 'tag',
        reason: `Group based on ${node.type.toLowerCase()}: ${node.name}`,
        members: [], // Would need to query for related contacts
        metadata: {
          source: 'graph_node',
          nodeType: node.type,
          nodeId: node.id,
          company: node.type === 'Company' ? node.name : undefined,
          tag: node.type === 'Tag' ? node.name : undefined
        }
      });
    }
  }, [onOpenCreateWithSuggestion]);

  // Handle focusing on a node from the sidebar
  const handleFocusNode = useCallback(async (nodeId) => {
    if (!nodeId || !graphData?.links) return;

    // Set focused node and compute highlighted nodes
    setFocusedNodeId(nodeId);
    const connectedIds = getConnectedNodeIds(nodeId, graphData.links);
    setHighlightedNodeIds(connectedIds);

    // Animate connections appearing one by one
    const connectedLinks = getConnectedLinks(nodeId, graphData.links);
    if (connectedLinks.length > 0) {
      // Sort by type priority (WORKS_AT, HAS_TAG, SIMILAR_TO, KNOWS)
      const typePriority = { WORKS_AT: 1, HAS_TAG: 2, SIMILAR_TO: 3, KNOWS: 4 };
      const sortedLinks = [...connectedLinks].sort((a, b) =>
        (typePriority[a.type] || 99) - (typePriority[b.type] || 99)
      );

      // Reveal links one by one
      setAnimatingLinks([]);
      for (let i = 0; i < sortedLinks.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setAnimatingLinks(prev => [...(prev || []), sortedLinks[i]]);
      }
      // After animation completes, clear animating state (show all)
      await new Promise(resolve => setTimeout(resolve, 200));
      setAnimatingLinks(null);
    }
  }, [graphData?.links]);

  // Handle clearing focus
  const handleClearFocus = useCallback(() => {
    setFocusedNodeId(null);
    setHighlightedNodeIds(null);
    setAnimatingLinks(null);
  }, []);

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

        {/* Action buttons */}
        <div className="flex items-center gap-2">
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

          {/* Fullscreen button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Fullscreen view"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
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

      {/* Pending Relationships Review Panel */}
      {showPendingPanel && (
        <PendingRelationshipsPanel
          pendingRelationships={pendingRelationships}
          counts={discoveryProgress.relationshipCounts}
          isLoading={isReviewLoading}
          onApprove={approveRelationship}
          onReject={rejectRelationship}
          onBatchApprove={batchApproveRelationships}
          onBatchReject={batchRejectRelationships}
          onRequestAssessment={requestAssessment}
          onClose={handleClosePendingPanel}
          assessingRelationshipId={assessingRelationshipId}
        />
      )}

      {/* Button to show pending panel if hidden but has pending */}
      {!showPendingPanel && discoveryProgress.hasPendingRelationships && (
        <button
          onClick={() => setShowPendingPanel(true)}
          className="w-full p-3 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Review {(pendingRelationships.medium?.length || 0) + (pendingRelationships.low?.length || 0)} pending relationships
        </button>
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
            viewMode={viewMode}
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

      {/* Fullscreen Mode Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 md:px-4 md:pt-20 md:pb-4">
          <div className="bg-white w-full h-full md:rounded-2xl md:shadow-2xl flex flex-col overflow-hidden relative md:border md:border-gray-200">
            {/* Top Bar - Floating */}
            <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
              <div className="flex items-center justify-between p-4">
                {/* Left: Title */}
                <div className="pointer-events-auto">
                            <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl px-4 py-2.5 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                      </svg>
                      <h2 className="text-sm font-semibold text-gray-900">Graph Explorer</h2>
                    </div>
                  </div>
                </div>

                {/* Right: Controls + Close */}
                <div className="flex items-center gap-2 pointer-events-auto">
                  {/* Filter button */}
                  <button
                    onClick={() => setShowFullscreenFilters(!showFullscreenFilters)}
                    className={`backdrop-blur-md shadow-lg rounded-xl px-3 py-2 border inline-flex items-center text-sm font-medium ${
                      showFullscreenFilters
                        ? 'bg-purple-500/90 border-purple-400 text-white'
                        : 'bg-white/95 border-gray-100 text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Filters"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>

                  {/* Suggestions button */}
                  <button
                    onClick={() => setShowSuggestionsPanel(!showSuggestionsPanel)}
                    className={`backdrop-blur-md shadow-lg rounded-xl px-3 py-2 border inline-flex items-center gap-1.5 text-sm font-medium ${
                      showSuggestionsPanel
                        ? 'bg-purple-500/90 border-purple-400 text-white'
                        : 'bg-white/95 border-gray-100 text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Group Suggestions"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {suggestions.length > 0 && (
                      <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                        showSuggestionsPanel ? 'bg-white/20' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {suggestions.length}
                      </span>
                    )}
                  </button>

                  {/* Discover button */}
                  <button
                    onClick={handleDiscover}
                    disabled={isDiscovering || contacts.length === 0}
                    className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl px-3 py-2 border border-gray-100 inline-flex items-center text-sm font-medium text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDiscovering ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </button>

                  {/* Refresh button */}
                  <button
                    onClick={() => refreshAll(true)}
                    disabled={isLoading}
                    className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl px-3 py-2 border border-gray-100 inline-flex items-center text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    title="Refresh"
                  >
                    <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>

                  {/* Close button */}
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="bg-red-500/90 backdrop-blur-md shadow-lg rounded-xl px-3 py-2 border border-red-400 inline-flex items-center text-sm font-medium text-white hover:bg-red-600"
                    title="Close fullscreen (ESC)"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* 2D/3D Toggle button - shows CURRENT mode */}
                  <button
                    onClick={() => setViewMode(prev => prev === '2d' ? '3d' : '2d')}
                    className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl px-3 py-2 border border-gray-100 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    title={`Currently in ${viewMode.toUpperCase()} view. Click to switch.`}
                  >
                    {viewMode === '3d' ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    )}
                    {viewMode.toUpperCase()}
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Filter Panel - Exact same design as stats badge */}
            {showFullscreenFilters && (
              <div className="absolute top-16 right-4 z-30 pointer-events-auto space-y-2">
                {/* Node Types - same style as stats */}
                <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl px-4 py-2.5 border border-gray-100">
                  <div className="flex items-center gap-4 text-sm">
                    {[
                      { id: 'Contact', label: 'contacts', color: 'bg-blue-500' },
                      { id: 'Company', label: 'companies', color: 'bg-amber-500' },
                      { id: 'Tag', label: 'tags', color: 'bg-emerald-500' }
                    ].map(type => {
                      const isActive = filters.nodeTypes?.includes(type.id);
                      return (
                        <button
                          key={type.id}
                          onClick={() => {
                            const current = filters.nodeTypes || [];
                            let newTypes = isActive
                              ? current.filter(t => t !== type.id)
                              : [...current, type.id];
                            if (newTypes.length === 0) newTypes = ['Contact', 'Company', 'Tag'];
                            setFilters({ ...filters, nodeTypes: newTypes });
                          }}
                          className={`flex items-center gap-1.5 transition-opacity ${!isActive ? 'opacity-30' : ''}`}
                        >
                          <span className={`w-2 h-2 ${type.color} rounded-full`}></span>
                          <span className="text-gray-400">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Relationships - same style as stats */}
                <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl px-4 py-2.5 border border-gray-100">
                  <div className="flex items-center gap-4 text-sm">
                    {[
                      { id: 'WORKS_AT', label: 'works at', color: 'bg-blue-500' },
                      { id: 'HAS_TAG', label: 'has tag', color: 'bg-amber-500' },
                      { id: 'SIMILAR_TO', label: 'similar', color: 'bg-purple-500' },
                      { id: 'KNOWS', label: 'knows', color: 'bg-pink-500' }
                    ].map(type => {
                      const isActive = filters.relationshipTypes?.includes(type.id);
                      return (
                        <button
                          key={type.id}
                          onClick={() => {
                            const current = filters.relationshipTypes || [];
                            let newTypes = isActive
                              ? current.filter(t => t !== type.id)
                              : [...current, type.id];
                            if (newTypes.length === 0) newTypes = ['WORKS_AT', 'HAS_TAG', 'SIMILAR_TO', 'KNOWS'];
                            setFilters({ ...filters, relationshipTypes: newTypes });
                          }}
                          className={`flex items-center gap-1.5 transition-opacity ${!isActive ? 'opacity-30' : ''}`}
                        >
                          <span className={`w-2 h-2 ${type.color} rounded-full`}></span>
                          <span className="text-gray-400">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Advanced Filters Toggle */}
                {(uniqueCompanies.length > 0 || uniqueTags.length > 0) && (
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl px-4 py-2.5 border border-gray-100 w-full flex items-center justify-between text-sm"
                  >
                    <span className="font-medium text-gray-700">Advanced Filters</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}

                {/* Advanced Filter Panel */}
                {showAdvancedFilters && (
                  <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl border border-gray-100 p-4 space-y-4 max-h-64 overflow-y-auto">
                    {/* Companies Section */}
                    {uniqueCompanies.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Companies</span>
                          {filters.selectedCompanies?.length > 0 && (
                            <button
                              onClick={() => setFilters({ ...filters, selectedCompanies: [] })}
                              className="text-xs text-purple-600 hover:text-purple-700"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {uniqueCompanies.map(company => {
                            const isSelected = filters.selectedCompanies?.includes(company);
                            return (
                              <button
                                key={company}
                                onClick={() => toggleCompanyFilter(company)}
                                className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                                  isSelected
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {company}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tags Section */}
                    {uniqueTags.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</span>
                          {filters.selectedTags?.length > 0 && (
                            <button
                              onClick={() => setFilters({ ...filters, selectedTags: [] })}
                              className="text-xs text-purple-600 hover:text-purple-700"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {uniqueTags.map(tag => {
                            const isSelected = filters.selectedTags?.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleTagFilter(tag)}
                                className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                                  isSelected
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Floating Suggestions Panel with Tabs */}
            {showSuggestionsPanel && (
              <div className="absolute top-16 right-4 z-30 w-80 pointer-events-auto">
                <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl border border-gray-100 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <h4 className="text-sm font-semibold text-gray-900">Suggested Groups</h4>
                      </div>
                      <button
                        onClick={() => setShowSuggestionsPanel(false)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 bg-gray-50/50">
                    {[
                      { id: 'all', label: 'All', color: 'gray' },
                      { id: 'company', label: 'Works At', color: 'blue' },
                      { id: 'tag', label: 'Has Tag', color: 'amber' },
                      { id: 'semantic', label: 'Similar', color: 'purple' },
                      { id: 'knows', label: 'Knows', color: 'pink' }
                    ].map(tab => {
                      const isActive = suggestionFilter === tab.id;
                      const count = tab.id === 'all'
                        ? suggestions.length
                        : suggestions.filter(s => s.type === tab.id).length;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setSuggestionFilter(tab.id)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                            isActive
                              ? `bg-${tab.color}-500 text-white shadow-sm`
                              : `text-gray-500 hover:bg-gray-100`
                          }`}
                          style={isActive ? {
                            backgroundColor: tab.color === 'gray' ? '#6B7280'
                              : tab.color === 'blue' ? '#3B82F6'
                              : tab.color === 'amber' ? '#F59E0B'
                              : tab.color === 'purple' ? '#8B5CF6'
                              : '#EC4899'
                          } : {}}
                        >
                          {tab.label}
                          {count > 0 && (
                            <span className={`ml-1 ${isActive ? 'opacity-75' : 'text-gray-400'}`}>
                              ({count})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Suggestions List */}
                  <div className="max-h-80 overflow-y-auto">
                    {filteredSuggestions.length === 0 ? (
                      <div className="p-6 text-center">
                        <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-sm text-gray-500">
                          {suggestionFilter === 'all'
                            ? 'No suggestions yet'
                            : `No ${suggestionFilter} suggestions`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Run discovery to find groups
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {filteredSuggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className="p-3 hover:bg-gray-50 transition-colors group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {suggestion.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                  {suggestion.reason}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                                    suggestion.type === 'company'
                                      ? 'bg-blue-100 text-blue-700'
                                      : suggestion.type === 'tag'
                                      ? 'bg-amber-100 text-amber-700'
                                      : suggestion.type === 'semantic'
                                      ? 'bg-purple-100 text-purple-700'
                                      : suggestion.type === 'knows'
                                      ? 'bg-pink-100 text-pink-700'
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
                                className="flex-shrink-0 p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Create group"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer with count */}
                  {filteredSuggestions.length > 0 && (
                    <div className="px-3 py-2 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500 text-center">
                      {filteredSuggestions.length} suggestion{filteredSuggestions.length !== 1 ? 's' : ''}
                      {suggestionFilter !== 'all' && ` in ${suggestionFilter}`}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sidebar for browsing contacts/groups */}
            <div className="absolute left-0 top-0 bottom-0 z-20 pointer-events-auto pt-16">
              <GraphSidebar
                contacts={contacts}
                groups={groups}
                graphData={graphData}
                focusedNodeId={focusedNodeId}
                onFocusNode={handleFocusNode}
                onClearFocus={handleClearFocus}
              />
            </div>

            {/* Graph - Full Size (adjusted for sidebar) */}
            <div className="absolute inset-0 left-72">
              <ContactGraph
                graphData={graphData}
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                selectedNode={selectedNode}
                filters={filters}
                height="100%"
                focusedNodeId={focusedNodeId}
                highlightedNodeIds={highlightedNodeIds}
                animatingLinks={animatingLinks}
                viewMode={viewMode}
              />
            </div>

            {/* Bottom Left - Stats (floating, offset for sidebar) */}
            {stats && (
              <div className="absolute bottom-4 left-[19rem] z-20 pointer-events-auto">
                <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl px-4 py-2.5 border border-gray-100">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span className="text-gray-600">{toNumber(stats.contactCount)}</span>
                      <span className="text-gray-400">contacts</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      <span className="text-gray-600">{toNumber(stats.companyCount)}</span>
                      <span className="text-gray-400">companies</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      <span className="text-gray-600">{toNumber(stats.tagCount)}</span>
                      <span className="text-gray-400">tags</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Right - Legend (floating) */}
            <div className="absolute bottom-4 right-4 z-20 pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl border border-gray-100 overflow-hidden">
                <GraphLegend compact />
              </div>
            </div>

            {/* Node Tooltip (floating) */}
            {selectedNode && (
              <div className="absolute top-20 right-4 z-30 pointer-events-auto">
                <NodeTooltip
                  node={selectedNode}
                  onClose={() => setSelectedNode(null)}
                  onCreateGroup={handleCreateGroupFromNode}
                />
              </div>
            )}

            {/* Pending Panel (floating, if open, offset for sidebar) */}
            {showPendingPanel && (
              <div className="absolute top-20 left-[19rem] z-30 max-w-md max-h-[60vh] overflow-auto pointer-events-auto">
                <PendingRelationshipsPanel
                  pendingRelationships={pendingRelationships}
                  counts={discoveryProgress.relationshipCounts}
                  isLoading={isReviewLoading}
                  onApprove={approveRelationship}
                  onReject={rejectRelationship}
                  onBatchApprove={batchApproveRelationships}
                  onBatchReject={batchRejectRelationships}
                  onRequestAssessment={requestAssessment}
                  onClose={handleClosePendingPanel}
                  assessingRelationshipId={assessingRelationshipId}
                />
              </div>
            )}

            {/* Button to show pending panel if hidden but has pending (floating, offset for sidebar) */}
            {!showPendingPanel && discoveryProgress.hasPendingRelationships && (
              <div className="absolute top-20 left-[19rem] z-20 pointer-events-auto">
                <button
                  onClick={() => setShowPendingPanel(true)}
                  className="bg-purple-500/90 backdrop-blur-md shadow-lg rounded-xl px-4 py-2.5 border border-purple-400 text-sm text-white hover:bg-purple-600 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Review {(pendingRelationships.medium?.length || 0) + (pendingRelationships.low?.length || 0)} pending
                </button>
              </div>
            )}

            {/* Discovery Progress (floating, if discovering) */}
            {isDiscovering && discoveryProgress && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-80 pointer-events-auto">
                <div className="bg-white/95 backdrop-blur-md shadow-lg rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm font-medium text-purple-700">
                        {discoveryProgress.currentStep || 'Processing...'}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-purple-700">
                      {discoveryProgress.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${discoveryProgress.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
