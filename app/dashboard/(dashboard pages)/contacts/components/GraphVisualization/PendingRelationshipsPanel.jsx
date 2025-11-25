'use client';
// PendingRelationshipsPanel.jsx
// Panel for reviewing pending discovered relationships

import { useState, useCallback } from 'react';
import RelationshipReviewCard from './RelationshipReviewCard';

/**
 * PendingRelationshipsPanel - Shows pending relationships for user review
 *
 * @param {object} pendingRelationships - { medium: [], low: [] }
 * @param {object} counts - { high, medium, low, total }
 * @param {boolean} isLoading - Loading state
 * @param {function} onApprove - Approve single relationship
 * @param {function} onReject - Reject single relationship
 * @param {function} onBatchApprove - Approve multiple relationships
 * @param {function} onBatchReject - Reject multiple relationships
 * @param {function} onRequestAssessment - Request LLM assessment
 * @param {function} onClose - Close panel callback
 * @param {string} assessingRelationshipId - ID of relationship being assessed
 */
export default function PendingRelationshipsPanel({
  pendingRelationships = { medium: [], low: [] },
  counts = { high: 0, medium: 0, low: 0, total: 0 },
  isLoading = false,
  onApprove,
  onReject,
  onBatchApprove,
  onBatchReject,
  onRequestAssessment,
  onClose,
  assessingRelationshipId = null
}) {
  const [activeTab, setActiveTab] = useState('medium');
  const [selectedRelationships, setSelectedRelationships] = useState(new Set());

  // Get relationships for active tab
  const currentRelationships = pendingRelationships[activeTab] || [];

  // Toggle selection for a relationship
  const toggleSelection = useCallback((rel) => {
    const key = `${rel.sourceId}-${rel.targetId}`;
    setSelectedRelationships(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Check if a relationship is selected
  const isSelected = useCallback((rel) => {
    return selectedRelationships.has(`${rel.sourceId}-${rel.targetId}`);
  }, [selectedRelationships]);

  // Select all in current tab
  const selectAll = useCallback(() => {
    const keys = currentRelationships.map(r => `${r.sourceId}-${r.targetId}`);
    setSelectedRelationships(new Set(keys));
  }, [currentRelationships]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedRelationships(new Set());
  }, []);

  // Get selected relationships as array
  const getSelectedRelationships = useCallback(() => {
    return currentRelationships.filter(r =>
      selectedRelationships.has(`${r.sourceId}-${r.targetId}`)
    );
  }, [currentRelationships, selectedRelationships]);

  // Handle batch approve
  const handleBatchApprove = useCallback(() => {
    const selected = getSelectedRelationships();
    if (selected.length > 0 && onBatchApprove) {
      onBatchApprove(selected);
      clearSelection();
    }
  }, [getSelectedRelationships, onBatchApprove, clearSelection]);

  // Handle batch reject
  const handleBatchReject = useCallback(() => {
    const selected = getSelectedRelationships();
    if (selected.length > 0 && onBatchReject) {
      onBatchReject(selected);
      clearSelection();
    }
  }, [getSelectedRelationships, onBatchReject, clearSelection]);

  const selectedCount = selectedRelationships.size;
  const hasPendingToReview = (pendingRelationships.medium?.length || 0) + (pendingRelationships.low?.length || 0) > 0;

  if (!hasPendingToReview && counts.high === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-purple-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-purple-50 border-b border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-purple-900">
              Review Discovered Relationships
            </h4>
            <p className="text-xs text-purple-600 mt-0.5">
              {counts.high} auto-approved, {counts.medium + counts.low} pending review
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-purple-400 hover:text-purple-600 rounded"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('medium'); clearSelection(); }}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'medium'
              ? 'text-purple-700 bg-purple-50 border-b-2 border-purple-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Medium Confidence
          {pendingRelationships.medium?.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
              {pendingRelationships.medium.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('low'); clearSelection(); }}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'low'
              ? 'text-purple-700 bg-purple-50 border-b-2 border-purple-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Potential
          {pendingRelationships.low?.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
              {pendingRelationships.low.length}
            </span>
          )}
        </button>
      </div>

      {/* Batch actions bar */}
      {currentRelationships.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input
                type="checkbox"
                checked={selectedCount === currentRelationships.length && selectedCount > 0}
                onChange={(e) => e.target.checked ? selectAll() : clearSelection()}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              Select all
            </label>
            {selectedCount > 0 && (
              <span className="text-sm text-gray-500">
                {selectedCount} selected
              </span>
            )}
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchReject}
                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100"
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject ({selectedCount})
              </button>
              <button
                onClick={handleBatchApprove}
                className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100"
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Approve ({selectedCount})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-8 text-center">
          <svg className="animate-spin h-6 w-6 text-purple-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500 mt-2">Loading relationships...</p>
        </div>
      )}

      {/* Relationships list */}
      {!isLoading && (
        <div className="max-h-96 overflow-y-auto">
          {currentRelationships.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No {activeTab} confidence relationships to review</p>
              <p className="text-xs text-gray-400 mt-1">
                {activeTab === 'medium'
                  ? 'All medium confidence relationships have been reviewed'
                  : 'No potential relationships found'
                }
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {currentRelationships.map((rel, idx) => (
                <RelationshipReviewCard
                  key={`${rel.sourceId}-${rel.targetId}-${idx}`}
                  relationship={rel}
                  isSelected={isSelected(rel)}
                  onToggleSelect={toggleSelection}
                  onApprove={onApprove}
                  onReject={onReject}
                  onRequestAssessment={onRequestAssessment}
                  isAssessing={assessingRelationshipId === `${rel.sourceId}-${rel.targetId}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer with summary */}
      {!isLoading && hasPendingToReview && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          Tip: Use batch actions to quickly review multiple relationships at once
        </div>
      )}
    </div>
  );
}
