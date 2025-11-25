'use client';
// ContactGraph.jsx
// Interactive force-directed graph for contact relationships
// Uses dynamic import to avoid SSR issues with canvas/WebGL

import { useRef, useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled (critical for react-force-graph)
// Wrap in a component that accepts ref as a prop to avoid Next.js dynamic ref warning
const ForceGraph2DWrapper = dynamic(
  async () => {
    const { default: ForceGraph2D } = await import('react-force-graph-2d');
    // Return a wrapper that receives ref as a prop (avoiding the ref forwarding issue)
    return function ForceGraph2DWithRef({ graphRef, ...props }) {
      return <ForceGraph2D ref={graphRef} {...props} />;
    };
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading graph...</p>
        </div>
      </div>
    )
  }
);

// Node colors by type
const NODE_COLORS = {
  Contact: '#8B5CF6',   // Purple
  Company: '#3B82F6',   // Blue
  Event: '#10B981',     // Green
  Location: '#F59E0B',  // Orange
  Tag: '#EC4899'        // Pink
};

// Edge colors by relationship type
const EDGE_COLORS = {
  WORKS_AT: '#3B82F6',    // Blue
  HAS_TAG: '#F59E0B',     // Orange
  SIMILAR_TO: '#8B5CF6',  // Purple
  KNOWS: '#EC4899',       // Pink
  ATTENDED: '#10B981',    // Green
  LOCATED_AT: '#F97316'   // Deep orange
};

// Node sizes by type
const NODE_SIZES = {
  Contact: 8,
  Company: 12,
  Event: 10,
  Location: 10,
  Tag: 5
};

/**
 * ContactGraph - Interactive force-directed graph visualization
 *
 * @param {object} graphData - { nodes: [], links: [] }
 * @param {function} onNodeClick - Callback when node is clicked
 * @param {function} onNodeHover - Callback when node is hovered
 * @param {object} selectedNode - Currently selected node
 * @param {object} filters - Active filters { nodeTypes: [], relationshipTypes: [] }
 */
export default function ContactGraph({
  graphData = { nodes: [], links: [] },
  onNodeClick,
  onNodeHover,
  selectedNode,
  filters = {},
  width,
  height = 400
}) {
  const graphRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: width || 600, height });

  // Update dimensions on container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: width || containerRef.current.offsetWidth,
          height: height
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [width, height]);

  // Filter graph data based on active filters
  const filteredData = useCallback(() => {
    let nodes = graphData.nodes || [];
    let links = graphData.links || [];

    // Filter by node types
    if (filters.nodeTypes && filters.nodeTypes.length > 0) {
      nodes = nodes.filter(n => filters.nodeTypes.includes(n.type));
      const nodeIds = new Set(nodes.map(n => n.id));
      links = links.filter(l =>
        nodeIds.has(l.source?.id || l.source) &&
        nodeIds.has(l.target?.id || l.target)
      );
    }

    // Filter by relationship types
    if (filters.relationshipTypes && filters.relationshipTypes.length > 0) {
      links = links.filter(l => filters.relationshipTypes.includes(l.type));
    }

    return { nodes, links };
  }, [graphData, filters]);

  // Get node color
  const getNodeColor = useCallback((node) => {
    if (selectedNode && selectedNode.id === node.id) {
      return '#EF4444'; // Red for selected
    }
    return node.color || NODE_COLORS[node.type] || '#6B7280';
  }, [selectedNode]);

  // Get node size
  const getNodeSize = useCallback((node) => {
    return node.size || NODE_SIZES[node.type] || 8;
  }, []);

  // Get link color
  const getLinkColor = useCallback((link) => {
    return link.color || EDGE_COLORS[link.type] || '#9CA3AF';
  }, []);

  // Get link width
  const getLinkWidth = useCallback((link) => {
    // Width based on score/weight if available
    if (link.score) {
      return link.score * 3;
    }
    return link.width || 1;
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((node) => {
    if (onNodeClick) {
      onNodeClick(node);
    }

    // Center on clicked node
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(2, 500);
    }
  }, [onNodeClick]);

  // Handle node hover
  const handleNodeHover = useCallback((node) => {
    if (onNodeHover) {
      onNodeHover(node);
    }

    // Change cursor
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? 'pointer' : 'default';
    }
  }, [onNodeHover]);

  // Handle background click
  const handleBackgroundClick = useCallback(() => {
    if (onNodeClick) {
      onNodeClick(null);
    }
  }, [onNodeClick]);

  // Custom node canvas rendering
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const size = getNodeSize(node);
    const color = getNodeColor(node);

    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw border for selected node
    if (selectedNode && selectedNode.id === node.id) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw label if zoomed in enough
    if (globalScale > 1.5 && node.name) {
      const label = node.name.length > 15 ? node.name.slice(0, 15) + '...' : node.name;
      const fontSize = Math.max(10 / globalScale, 3);
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#374151';
      ctx.fillText(label, node.x, node.y + size + 2);
    }
  }, [getNodeColor, getNodeSize, selectedNode]);

  // Zoom to fit on data change
  useEffect(() => {
    if (graphRef.current && graphData.nodes?.length > 0) {
      // Wait for simulation to settle then fit
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50);
      }, 500);
    }
  }, [graphData.nodes?.length]);

  const data = filteredData();

  return (
    <div
      ref={containerRef}
      className="w-full bg-gray-50 rounded-lg overflow-hidden"
      style={{ height }}
    >
      {data.nodes.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="text-sm">No graph data yet</p>
            <p className="text-xs mt-1">Click &quot;Discover Relationships&quot; to build the graph</p>
          </div>
        </div>
      ) : (
        <ForceGraph2DWrapper
          graphRef={graphRef}
          graphData={data}
          width={dimensions.width}
          height={dimensions.height}
          // Node styling
          nodeLabel={node => `${node.name || node.id} (${node.type})`}
          nodeVal={getNodeSize}
          nodeCanvasObject={nodeCanvasObject}
          nodeCanvasObjectMode={() => 'replace'}
          // Link styling
          linkColor={getLinkColor}
          linkWidth={getLinkWidth}
          linkLabel={link => link.type}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          // Interactions
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onBackgroundClick={handleBackgroundClick}
          enablePointerInteraction={true}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          // Performance optimizations
          autoPauseRedraw={true}
          cooldownTicks={100}
          warmupTicks={0}
          d3VelocityDecay={0.3}
          d3AlphaDecay={0.0228}
          d3AlphaMin={0.001}
          // Zoom constraints
          minZoom={0.5}
          maxZoom={8}
        />
      )}
    </div>
  );
}
