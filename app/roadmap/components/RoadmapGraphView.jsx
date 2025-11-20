"use client";
import React, { useMemo } from 'react';
import { CATEGORY_CONFIG } from '@/lib/services/constants';

// Layout Configuration
const CONFIG = {
  nodeRadius: 6,
  levelWidth: 220, // Horizontal space between levels
  rowHeight: 40,   // Vertical space between leaf nodes
  textOffset: 12,
};

export default function RoadmapGraphView({ tree }) {
  // Transform tree data into graph nodes and links with layout coordinates
  const { nodes, links, width, height } = useMemo(() => {
    if (!tree || Object.keys(tree).length === 0) {
      return { nodes: [], links: [], width: 800, height: 400 };
    }

    const nodeList = [];
    const linkList = [];

    let currentY = 0;

    // Recursive function to layout nodes
    // Returns the vertical center of the subtree
    const processNode = (
      id,
      label,
      type,
      depth,
      data,
      childNodesData
    ) => {
      const x = depth * CONFIG.levelWidth + 50; // Add padding-left

      // Color logic
      let color = '#64748b'; // default slate-500
      if (type === 'category') {
        const catKey = data.name;
        const tailwindMap = {
            'purple-700': '#7e22ce',
            'red-700': '#b91c1c',
            'blue-700': '#1d4ed8',
            'yellow-700': '#a16207',
            'green-700': '#15803d',
            'teal-700': '#0f766e',
            'orange-700': '#c2410c',
            'indigo-700': '#4338ca',
            'gray-700': '#374151',
            'pink-700': '#be185d',
            'cyan-700': '#0e7490',
            'slate-700': '#334155'
        };
        if (CATEGORY_CONFIG[catKey]) {
            const colorName = CATEGORY_CONFIG[catKey].colorText.replace('text-', '');
            color = tailwindMap[colorName] || '#3b82f6';
        }
      } else if (type === 'commit') {
          color = '#22c55e'; // green-500
      } else if (type === 'issue') {
          color = '#3b82f6'; // blue-500
      } else if (type === 'subcategory') {
          color = '#f59e0b'; // amber-500
      } else if (type === 'root') {
          color = '#0f172a'; // slate-900
      }

      // Process children
      let childrenY = [];
      let myY = 0;

      if (childNodesData && childNodesData.length > 0) {
        childrenY = childNodesData.map(child => {
             // Add link
             linkList.push({ sourceId: id, targetId: child.id });

            // Recursion
            return processNode(
                child.id,
                child.label,
                child.type,
                depth + 1,
                child.data,
                child.children || []
            );
        });

        // Parent Y is average of children Y
        const minY = Math.min(...childrenY);
        const maxY = Math.max(...childrenY);
        myY = (minY + maxY) / 2;
      } else {
        // Leaf node
        myY = currentY;
        currentY += CONFIG.rowHeight;
      }

      nodeList.push({
        id,
        label,
        type,
        x,
        y: myY,
        color,
        data,
        children: childNodesData ? childNodesData.map(c => c.id) : []
      });

      return myY;
    };

    // Prepare root children (Categories)
    const categoryChildren = Object.values(tree)
        .sort((a, b) => b.stats.total - a.stats.total)
        .map(cat => {
        // Subcategories
        const subChildren = Object.values(cat.subcategories).map(sub => {
            const itemChildren = sub.items.map((item, idx) => ({
                id: `item-${sub.name}-${idx}`,
                label: item.type === 'commit' ? item.message : item.title,
                type: item.type,
                data: item,
                children: []
            }));

            return {
                id: `sub-${sub.name}`,
                label: sub.displayName,
                type: 'subcategory',
                data: sub,
                children: itemChildren
            };
        });

        // Direct items
        const directItemChildren = cat.items.map((item, idx) => ({
            id: `item-${cat.name}-${idx}`,
            label: item.type === 'commit' ? item.message : item.title,
            type: item.type,
            data: item,
            children: []
        }));

        return {
            id: `cat-${cat.name}`,
            label: cat.displayName,
            type: 'category',
            data: cat,
            children: [...subChildren, ...directItemChildren]
        };
    });

    processNode('root', 'Roadmap', 'root', 0, {}, categoryChildren);

    const nodesById = new Map(nodeList.map(n => [n.id, n]));
    const finalLinks = linkList.map(l => {
        const source = nodesById.get(l.sourceId);
        const target = nodesById.get(l.targetId);
        if (source && target) {
            return { source, target };
        }
        return null;
    }).filter(l => l !== null);

    // Calculate max width required
    const maxDepthX = Math.max(...nodeList.map(n => n.x)) + 300;

    return {
        nodes: nodeList,
        links: finalLinks,
        width: Math.max(800, maxDepthX),
        height: Math.max(600, currentY + 50)
    };

  }, [tree]);

  return (
    <div className="overflow-auto border border-gray-200 rounded-xl bg-white relative" style={{ height: '600px' }}>
      <svg width={width} height={height} className="block">
         <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5"
                markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" />
            </marker>
         </defs>

         {/* Links */}
         {links.map((link, i) => (
             <path
                key={i}
                d={`M ${link.source.x} ${link.source.y} C ${(link.source.x + link.target.x) / 2} ${link.source.y}, ${(link.source.x + link.target.x) / 2} ${link.target.y}, ${link.target.x} ${link.target.y}`}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="1.5"
             />
         ))}

         {/* Nodes */}
         {nodes.map(node => (
             <g key={node.id} transform={`translate(${node.x}, ${node.y})`} className="cursor-pointer hover:opacity-80 transition-opacity">
                <circle
                    r={CONFIG.nodeRadius}
                    fill={node.color}
                    stroke="white"
                    strokeWidth="2"
                />
                <text
                    x={CONFIG.textOffset}
                    y={4}
                    fontSize="12"
                    fill="#1e293b"
                    className="font-medium select-none"
                    style={{ textShadow: '0 0 3px white' }}
                >
                    {node.label.length > 40 ? node.label.substring(0, 40) + '...' : node.label}
                </text>

                {/* Subtitle for leaf nodes */}
                {node.type === 'commit' && (
                    <text x={CONFIG.textOffset} y={18} fontSize="10" fill="#94a3b8" fontFamily="monospace" className="select-none">
                        {node.data.hash?.substring(0, 7)}
                    </text>
                )}
                {node.type === 'issue' && (
                    <text x={CONFIG.textOffset} y={18} fontSize="10" fill="#94a3b8" fontFamily="monospace" className="select-none">
                        #{node.data.number}
                    </text>
                )}
             </g>
         ))}
      </svg>
    </div>
  );
}
