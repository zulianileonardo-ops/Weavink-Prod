'use client';
// RelationshipReviewCard.jsx
// Individual relationship card for review workflow

import { useState } from 'react';

/**
 * RelationshipReviewCard - Displays a relationship for user review
 *
 * @param {object} relationship - The relationship data
 * @param {boolean} isSelected - Whether this card is selected
 * @param {function} onToggleSelect - Toggle selection callback
 * @param {function} onApprove - Approve callback
 * @param {function} onReject - Reject callback
 * @param {function} onRequestAssessment - Request LLM assessment callback
 * @param {boolean} isAssessing - Whether assessment is in progress
 */
export default function RelationshipReviewCard({
  relationship,
  isSelected = false,
  onToggleSelect,
  onApprove,
  onReject,
  onRequestAssessment,
  isAssessing = false
}) {
  const [showAssessment, setShowAssessment] = useState(false);

  // Format score as percentage
  const scorePercent = Math.round((relationship.score || 0) * 100);

  // Get method label
  const methodLabel = relationship.method === 'qdrant_embedding'
    ? 'Semantic'
    : relationship.method === 'tags'
    ? 'Tags'
    : relationship.method;

  // Get confidence badge color
  const getConfidenceColor = () => {
    switch (relationship.confidence) {
      case 'high':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Get suggested action badge
  const getSuggestedActionBadge = () => {
    if (!relationship.llmAssessment?.suggestedAction) return null;

    const action = relationship.llmAssessment.suggestedAction;
    const colors = {
      approve: 'bg-green-100 text-green-700',
      review: 'bg-yellow-100 text-yellow-700',
      skip: 'bg-red-100 text-red-700'
    };

    return (
      <span className={`px-1.5 py-0.5 text-xs rounded-full ${colors[action] || colors.review}`}>
        AI: {action}
      </span>
    );
  };

  return (
    <div className={`p-3 border rounded-lg transition-colors ${
      isSelected ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white hover:bg-gray-50'
    }`}>
      {/* Header with selection checkbox */}
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        <label className="flex items-center cursor-pointer mt-0.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(relationship)}
            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
        </label>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Contact names */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-900 truncate">
              {relationship.sourceName}
            </span>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span className="font-medium text-gray-900 truncate">
              {relationship.targetName}
            </span>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Score badge */}
            <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
              {scorePercent}% match
            </span>

            {/* Method badge */}
            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {methodLabel}
            </span>

            {/* Confidence tier badge */}
            <span className={`px-1.5 py-0.5 text-xs rounded-full ${getConfidenceColor()}`}>
              {relationship.confidence}
            </span>

            {/* Shared tags count */}
            {relationship.sharedTagCount && (
              <span className="px-1.5 py-0.5 text-xs bg-pink-100 text-pink-700 rounded-full">
                {relationship.sharedTagCount} shared tags
              </span>
            )}

            {/* AI suggested action */}
            {getSuggestedActionBadge()}
          </div>

          {/* Shared tags list */}
          {relationship.sharedTags && relationship.sharedTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {relationship.sharedTags.slice(0, 5).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
              {relationship.sharedTags.length > 5 && (
                <span className="text-xs text-gray-400">
                  +{relationship.sharedTags.length - 5} more
                </span>
              )}
            </div>
          )}

          {/* LLM Assessment (expandable) */}
          {relationship.llmAssessment && (
            <div className="mt-2">
              <button
                onClick={() => setShowAssessment(!showAssessment)}
                className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${showAssessment ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                AI Assessment
              </button>

              {showAssessment && (
                <div className="mt-2 p-2 bg-purple-50 rounded-lg text-xs space-y-1">
                  <p className="text-gray-700">{relationship.llmAssessment.explanation}</p>
                  <div className="flex items-center gap-3 text-gray-500">
                    <span>Type: <strong>{relationship.llmAssessment.connectionType}</strong></span>
                    <span>Confidence: <strong>{relationship.llmAssessment.confidence}/10</strong></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
        {/* Get AI Assessment button (only if no assessment yet) */}
        {!relationship.llmAssessment && (
          <button
            onClick={() => onRequestAssessment?.(relationship)}
            disabled={isAssessing}
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 rounded hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAssessing ? (
              <>
                <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Assessing...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Get AI Assessment
              </>
            )}
          </button>
        )}

        {/* Reject button */}
        <button
          onClick={() => onReject?.(relationship)}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100"
        >
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reject
        </button>

        {/* Approve button */}
        <button
          onClick={() => onApprove?.(relationship)}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100"
        >
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Approve
        </button>
      </div>
    </div>
  );
}
