'use client';
// GraphControls.jsx
// Controls for filtering and manipulating the graph view

import { useState, useEffect } from 'react';

// Available node types
const NODE_TYPES = [
  { id: 'Contact', label: 'Contacts', color: '#8B5CF6' },
  { id: 'Company', label: 'Companies', color: '#3B82F6' },
  { id: 'Tag', label: 'Tags', color: '#EC4899' },
  { id: 'Event', label: 'Events', color: '#10B981' },
  { id: 'Location', label: 'Locations', color: '#F59E0B' }
];

// Available relationship types
const RELATIONSHIP_TYPES = [
  { id: 'WORKS_AT', label: 'Works At', color: '#3B82F6' },
  { id: 'HAS_TAG', label: 'Has Tag', color: '#F59E0B' },
  { id: 'SIMILAR_TO', label: 'Similar To', color: '#8B5CF6' },
  { id: 'KNOWS', label: 'Knows', color: '#EC4899' }
];

/**
 * GraphControls - Filter and layout controls for the graph
 *
 * @param {object} filters - Current filter state
 * @param {function} onFiltersChange - Callback when filters change
 * @param {function} onRefresh - Callback to refresh graph data
 * @param {boolean} isLoading - Loading state
 * @param {object} graphSettings - Graph feature settings
 * @param {function} onSettingsChange - Callback when settings change
 * @param {boolean} isUpdatingSettings - Settings update loading state
 */
export default function GraphControls({
  filters = {},
  onFiltersChange,
  onRefresh,
  isLoading = false,
  graphSettings = {},
  onSettingsChange,
  isUpdatingSettings = false
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Toggle node type filter
  const toggleNodeType = (typeId) => {
    const currentTypes = filters.nodeTypes || [];
    let newTypes;

    if (currentTypes.includes(typeId)) {
      newTypes = currentTypes.filter(t => t !== typeId);
    } else {
      newTypes = [...currentTypes, typeId];
    }

    // If all are deselected, show all
    if (newTypes.length === 0) {
      newTypes = NODE_TYPES.map(t => t.id);
    }

    onFiltersChange({ ...filters, nodeTypes: newTypes });
  };

  // Toggle relationship type filter
  const toggleRelationshipType = (typeId) => {
    const currentTypes = filters.relationshipTypes || [];
    let newTypes;

    if (currentTypes.includes(typeId)) {
      newTypes = currentTypes.filter(t => t !== typeId);
    } else {
      newTypes = [...currentTypes, typeId];
    }

    // If all are deselected, show all
    if (newTypes.length === 0) {
      newTypes = RELATIONSHIP_TYPES.map(t => t.id);
    }

    onFiltersChange({ ...filters, relationshipTypes: newTypes });
  };

  // Reset all filters
  const resetFilters = () => {
    onFiltersChange({
      nodeTypes: NODE_TYPES.map(t => t.id),
      relationshipTypes: RELATIONSHIP_TYPES.map(t => t.id)
    });
  };

  // Check if a type is active
  const isNodeTypeActive = (typeId) => {
    if (!filters.nodeTypes || filters.nodeTypes.length === 0) return true;
    return filters.nodeTypes.includes(typeId);
  };

  const isRelTypeActive = (typeId) => {
    if (!filters.relationshipTypes || filters.relationshipTypes.length === 0) return true;
    return filters.relationshipTypes.includes(typeId);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Refresh
      </button>

      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border ${
          showFilters
            ? 'text-purple-700 bg-purple-50 border-purple-200'
            : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
        }`}
      >
        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filters
      </button>

      {/* Reset filters */}
      <button
        onClick={resetFilters}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        Reset
      </button>

      {/* Settings toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border ${
          showSettings
            ? 'text-blue-700 bg-blue-50 border-blue-200'
            : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
        }`}
      >
        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </button>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="w-full mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Node type filters */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Node Types
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {NODE_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => toggleNodeType(type.id)}
                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                      isNodeTypeActive(type.id)
                        ? 'text-white'
                        : 'text-gray-500 bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: isNodeTypeActive(type.id) ? type.color : undefined
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Relationship type filters */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Relationships
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {RELATIONSHIP_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => toggleRelationshipType(type.id)}
                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                      isRelTypeActive(type.id)
                        ? 'text-white'
                        : 'text-gray-500 bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: isRelTypeActive(type.id) ? type.color : undefined
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="w-full mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-3">
            Graph Settings
          </h4>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={graphSettings.syncExchangeContacts !== false}
                onChange={(e) => {
                  if (onSettingsChange) {
                    onSettingsChange({ syncExchangeContacts: e.target.checked });
                  }
                }}
                disabled={isUpdatingSettings}
                className="sr-only peer"
              />
              <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isUpdatingSettings ? 'opacity-50' : ''}`}></div>
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900">
                Auto-sync exchange contacts to graph
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                When enabled, contacts received via your public profile will automatically appear in the graph
              </p>
            </div>
            {isUpdatingSettings && (
              <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </label>
        </div>
      )}
    </div>
  );
}
