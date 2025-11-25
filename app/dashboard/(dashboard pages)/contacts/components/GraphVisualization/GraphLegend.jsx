'use client';
// GraphLegend.jsx
// Legend showing node and edge color meanings

/**
 * GraphLegend - Visual legend for the graph
 *
 * @param {boolean} compact - Show compact version
 */
export default function GraphLegend({ compact = false }) {
  const nodeTypes = [
    { type: 'Contact', color: '#8B5CF6', label: 'Contact' },
    { type: 'Company', color: '#3B82F6', label: 'Company' },
    { type: 'Tag', color: '#EC4899', label: 'Tag' },
    { type: 'Event', color: '#10B981', label: 'Event' },
    { type: 'Location', color: '#F59E0B', label: 'Location' }
  ];

  const edgeTypes = [
    { type: 'WORKS_AT', color: '#3B82F6', label: 'Works At' },
    { type: 'HAS_TAG', color: '#F59E0B', label: 'Has Tag' },
    { type: 'SIMILAR_TO', color: '#8B5CF6', label: 'Similar' },
    { type: 'KNOWS', color: '#EC4899', label: 'Knows' }
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        {nodeTypes.slice(0, 3).map(item => (
          <div key={item.type} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
        <span className="text-gray-300">|</span>
        {edgeTypes.slice(0, 2).map(item => (
          <div key={item.type} className="flex items-center gap-1">
            <span
              className="w-4 h-0.5 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Legend
      </h4>

      <div className="grid grid-cols-2 gap-4">
        {/* Nodes */}
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Nodes</p>
          <div className="space-y-1">
            {nodeTypes.map(item => (
              <div key={item.type} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Edges */}
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Relationships</p>
          <div className="space-y-1">
            {edgeTypes.map(item => (
              <div key={item.type} className="flex items-center gap-2">
                <span
                  className="w-5 h-0.5 rounded flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
