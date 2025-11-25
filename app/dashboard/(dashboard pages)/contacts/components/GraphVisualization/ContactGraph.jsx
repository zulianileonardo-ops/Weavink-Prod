'use client';
// ContactGraph.jsx
// Interactive force-directed graph for contact relationships
// Uses dynamic import to avoid SSR issues with canvas/WebGL

import { useRef, useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Loading component for dynamic imports
const GraphLoadingSpinner = () => (
  <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
      <p className="text-sm text-gray-500">Loading graph...</p>
    </div>
  </div>
);

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
  { ssr: false, loading: () => <GraphLoadingSpinner /> }
);

// Dynamic import for 3D graph (WebGL/Three.js)
const ForceGraph3DWrapper = dynamic(
  async () => {
    const { default: ForceGraph3D } = await import('react-force-graph-3d');
    return function ForceGraph3DWithRef({ graphRef, ...props }) {
      return <ForceGraph3D ref={graphRef} {...props} />;
    };
  },
  { ssr: false, loading: () => <GraphLoadingSpinner /> }
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
 * @param {string} focusedNodeId - ID of the focused node (for highlight mode)
 * @param {Set} highlightedNodeIds - Set of node IDs to highlight
 * @param {Array} animatingLinks - Links currently being animated
 */
export default function ContactGraph({
  graphData = { nodes: [], links: [] },
  onNodeClick,
  onNodeHover,
  selectedNode,
  filters = {},
  width,
  height = 400,
  focusedNodeId = null,
  highlightedNodeIds = null,
  animatingLinks = null,
  viewMode = '2d'  // Controlled from parent
}) {
  const graphRef = useRef();
  const containerRef = useRef();
  // Handle height="100%" by computing actual height from container
  const isFullHeight = height === '100%';
  const [dimensions, setDimensions] = useState({ width: width || 600, height: isFullHeight ? 600 : height });

  // Update dimensions on container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: width || containerRef.current.offsetWidth,
          height: isFullHeight ? containerRef.current.offsetHeight : height
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [width, height, isFullHeight]);

  // Filter graph data based on active filters
  const filteredData = useCallback(() => {
    let nodes = graphData.nodes || [];
    let links = graphData.links || [];

    // Filter by node types
    if (filters.nodeTypes && filters.nodeTypes.length > 0) {
      nodes = nodes.filter(n => filters.nodeTypes.includes(n.type));
    }

    // Filter by specific companies (advanced filter)
    if (filters.selectedCompanies && filters.selectedCompanies.length > 0) {
      nodes = nodes.filter(n => {
        if (n.type === 'Company') {
          return filters.selectedCompanies.includes(n.name);
        }
        return true; // Keep non-company nodes
      });
    }

    // Filter by specific tags (advanced filter)
    if (filters.selectedTags && filters.selectedTags.length > 0) {
      nodes = nodes.filter(n => {
        if (n.type === 'Tag') {
          return filters.selectedTags.includes(n.name);
        }
        return true; // Keep non-tag nodes
      });
    }

    // Update links to only include visible nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    links = links.filter(l =>
      nodeIds.has(l.source?.id || l.source) &&
      nodeIds.has(l.target?.id || l.target)
    );

    // Filter by relationship types
    if (filters.relationshipTypes && filters.relationshipTypes.length > 0) {
      links = links.filter(l => filters.relationshipTypes.includes(l.type));
    }

    return { nodes, links };
  }, [graphData, filters]);

  // Check if a node should be highlighted
  const isNodeHighlighted = useCallback((nodeId) => {
    if (!highlightedNodeIds) return true; // No highlight mode = all visible
    return highlightedNodeIds.has(nodeId);
  }, [highlightedNodeIds]);

  // Get node color with highlight/grey-out support
  const getNodeColor = useCallback((node) => {
    if (selectedNode && selectedNode.id === node.id) {
      return '#EF4444'; // Red for selected
    }
    return node.color || NODE_COLORS[node.type] || '#6B7280';
  }, [selectedNode]);

  // Get node opacity based on highlight state
  const getNodeOpacity = useCallback((node) => {
    if (!highlightedNodeIds) return 1;
    return isNodeHighlighted(node.id) ? 1 : 0.15;
  }, [highlightedNodeIds, isNodeHighlighted]);

  // Get node size
  const getNodeSize = useCallback((node) => {
    return node.size || NODE_SIZES[node.type] || 8;
  }, []);

  // Check if a link should be highlighted
  const isLinkHighlighted = useCallback((link) => {
    if (!highlightedNodeIds) return true;
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    // Link is highlighted if both endpoints are highlighted
    return highlightedNodeIds.has(sourceId) && highlightedNodeIds.has(targetId);
  }, [highlightedNodeIds]);

  // Check if link is currently animating
  const isLinkAnimating = useCallback((link) => {
    if (!animatingLinks) return true; // No animation = show all
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    return animatingLinks.some(al => {
      const alSourceId = typeof al.source === 'object' ? al.source.id : al.source;
      const alTargetId = typeof al.target === 'object' ? al.target.id : al.target;
      return (alSourceId === sourceId && alTargetId === targetId) ||
             (alSourceId === targetId && alTargetId === sourceId);
    });
  }, [animatingLinks]);

  // Get link color with highlight support
  const getLinkColor = useCallback((link) => {
    const baseColor = link.color || EDGE_COLORS[link.type] || '#9CA3AF';
    if (!highlightedNodeIds) return baseColor;
    if (!isLinkHighlighted(link)) return '#E5E7EB'; // Grey for non-highlighted
    if (animatingLinks && !isLinkAnimating(link)) return '#E5E7EB';
    return baseColor;
  }, [highlightedNodeIds, animatingLinks, isLinkHighlighted, isLinkAnimating]);

  // Get link width with highlight emphasis
  const getLinkWidth = useCallback((link) => {
    let baseWidth = link.width || 1;
    if (link.score) {
      baseWidth = link.score * 3;
    }
    // Emphasize highlighted links, thin out non-highlighted
    if (highlightedNodeIds) {
      if (isLinkHighlighted(link) && (!animatingLinks || isLinkAnimating(link))) {
        return baseWidth * 1.5; // Thicker highlighted links
      }
      return 0.5; // Thinner non-highlighted links
    }
    return baseWidth;
  }, [highlightedNodeIds, animatingLinks, isLinkHighlighted, isLinkAnimating]);

  // Handle node click
  const handleNodeClick = useCallback((node) => {
    if (onNodeClick) {
      onNodeClick(node);
    }

    // Center on clicked node (different APIs for 2D vs 3D)
    if (graphRef.current) {
      if (viewMode === '2d') {
        // 2D: use centerAt and zoom
        graphRef.current.centerAt(node.x, node.y, 500);
        graphRef.current.zoom(2, 500);
      } else {
        // 3D: use cameraPosition
        const distance = 200;
        graphRef.current.cameraPosition(
          { x: node.x, y: node.y, z: distance },
          node, // lookAt
          500   // transition ms
        );
      }
    }
  }, [onNodeClick, viewMode]);

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

  // Custom node canvas rendering with highlight/grey-out support
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const size = getNodeSize(node);
    const color = getNodeColor(node);
    const opacity = getNodeOpacity(node);
    const isHighlighted = isNodeHighlighted(node.id);
    const isFocused = focusedNodeId === node.id;

    // Save context for opacity
    ctx.save();
    ctx.globalAlpha = opacity;

    // Draw glow effect for focused node
    if (isFocused) {
      const gradient = ctx.createRadialGradient(node.x, node.y, size, node.x, node.y, size * 2.5);
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.beginPath();
      ctx.arc(node.x, node.y, size * 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw border for selected or focused node
    if (selectedNode && selectedNode.id === node.id) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (isFocused) {
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (isHighlighted && highlightedNodeIds) {
      // Subtle border for highlighted (connected) nodes
      ctx.strokeStyle = '#A78BFA';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw label if zoomed in enough or if highlighted
    const showLabel = globalScale > 1.5 || (isHighlighted && highlightedNodeIds);
    if (showLabel && node.name) {
      const label = node.name.length > 15 ? node.name.slice(0, 15) + '...' : node.name;
      const fontSize = Math.max(10 / globalScale, 3);
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isHighlighted ? '#374151' : '#9CA3AF';
      ctx.fillText(label, node.x, node.y + size + 2);
    }

    ctx.restore();
  }, [getNodeColor, getNodeSize, getNodeOpacity, isNodeHighlighted, selectedNode, focusedNodeId, highlightedNodeIds]);

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

  // Common props shared between 2D and 3D
  const commonProps = {
    graphRef,
    graphData: data,
    width: dimensions.width,
    height: dimensions.height,
    nodeLabel: node => `${node.name || node.id} (${node.type})`,
    nodeVal: getNodeSize,
    linkColor: getLinkColor,
    linkWidth: getLinkWidth,
    linkLabel: link => link.type,
    linkDirectionalArrowLength: 3,
    linkDirectionalArrowRelPos: 1,
    onNodeClick: handleNodeClick,
    onNodeHover: handleNodeHover,
    onBackgroundClick: handleBackgroundClick,
    enablePointerInteraction: true,
    enableNodeDrag: true,
    enableZoomInteraction: true,
    cooldownTicks: 100,
    warmupTicks: 0,
    d3VelocityDecay: 0.3,
    d3AlphaDecay: 0.0228,
    d3AlphaMin: 0.001,
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-gray-50 rounded-lg overflow-hidden"
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
        <>
          {viewMode === '2d' ? (
            <ForceGraph2DWrapper
              key="graph-2d"
              {...commonProps}
              nodeCanvasObject={nodeCanvasObject}
              nodeCanvasObjectMode={() => 'replace'}
              autoPauseRedraw={true}
              minZoom={0.5}
              maxZoom={8}
            />
          ) : (
            <ForceGraph3DWrapper
              key="graph-3d"
              {...commonProps}
              nodeColor={getNodeColor}
              nodeVal={node => getNodeSize(node) * 2}
              nodeOpacity={node => getNodeOpacity(node)}
              linkOpacity={link => highlightedNodeIds ? (isLinkHighlighted(link) ? 0.8 : 0.1) : 0.6}
              backgroundColor="#f9fafb"
            />
          )}
        </>
      )}
    </div>
  );
}
