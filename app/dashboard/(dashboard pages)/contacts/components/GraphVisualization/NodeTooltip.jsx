'use client';
// NodeTooltip.jsx
// Tooltip panel showing details of selected/hovered node

/**
 * NodeTooltip - Shows details of the selected node
 *
 * @param {object} node - Selected/hovered node
 * @param {function} onClose - Callback to close tooltip
 * @param {function} onCreateGroup - Callback to create group from node
 */
export default function NodeTooltip({ node, onClose, onCreateGroup }) {
  if (!node) return null;

  // Get node type specific details
  const getNodeDetails = () => {
    switch (node.type) {
      case 'Contact':
        return [
          { label: 'Email', value: node.email },
          { label: 'Company', value: node.company },
          { label: 'Job Title', value: node.jobTitle },
          { label: 'Tags', value: node.tags?.join(', ') }
        ].filter(d => d.value);

      case 'Company':
        return [
          { label: 'Domain', value: node.domain },
          { label: 'Industry', value: node.industry }
        ].filter(d => d.value);

      case 'Tag':
        return [
          { label: 'Category', value: node.category }
        ].filter(d => d.value);

      case 'Event':
        return [
          { label: 'Date', value: node.date },
          { label: 'Venue', value: node.venueName }
        ].filter(d => d.value);

      case 'Location':
        return [
          { label: 'Coordinates', value: node.lat && node.lng ? `${node.lat.toFixed(4)}, ${node.lng.toFixed(4)}` : null }
        ].filter(d => d.value);

      default:
        return [];
    }
  };

  const details = getNodeDetails();

  // Get type color
  const typeColors = {
    Contact: 'bg-purple-100 text-purple-700',
    Company: 'bg-blue-100 text-blue-700',
    Tag: 'bg-pink-100 text-pink-700',
    Event: 'bg-green-100 text-green-700',
    Location: 'bg-orange-100 text-orange-700'
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-w-xs">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeColors[node.type] || 'bg-gray-100 text-gray-700'}`}>
            {node.type}
          </span>
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {node.name || node.id}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Details */}
      <div className="px-4 py-3">
        {details.length > 0 ? (
          <dl className="space-y-2">
            {details.map((detail, idx) => (
              <div key={idx}>
                <dt className="text-xs text-gray-500">{detail.label}</dt>
                <dd className="text-sm text-gray-900 truncate">{detail.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-gray-500">No additional details</p>
        )}
      </div>

      {/* Actions */}
      {(node.type === 'Company' || node.type === 'Tag') && onCreateGroup && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={() => onCreateGroup(node)}
            className="w-full inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Create Group
          </button>
        </div>
      )}
    </div>
  );
}
