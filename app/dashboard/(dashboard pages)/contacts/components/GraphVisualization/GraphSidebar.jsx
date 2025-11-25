'use client';
// GraphSidebar.jsx
// Sidebar for browsing contacts and groups in fullscreen graph view

import { useState, useMemo } from 'react';

/**
 * GraphSidebar - Browse and focus on contacts/groups in the graph
 *
 * @param {Array} contacts - List of contacts from graph nodes
 * @param {Array} groups - List of groups
 * @param {object} graphData - Graph data with nodes and links
 * @param {string} focusedNodeId - Currently focused node ID
 * @param {function} onFocusNode - Callback when a node is focused
 * @param {function} onClearFocus - Callback to clear focus
 */
export default function GraphSidebar({
  contacts = [],
  groups = [],
  graphData = { nodes: [], links: [] },
  focusedNodeId = null,
  onFocusNode,
  onClearFocus
}) {
  const [activeTab, setActiveTab] = useState('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('connections'); // 'connections', 'name', 'recent'

  // Count connections for each contact
  const contactsWithConnections = useMemo(() => {
    const connectionCounts = {};

    // Count connections from links
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      connectionCounts[sourceId] = (connectionCounts[sourceId] || 0) + 1;
      connectionCounts[targetId] = (connectionCounts[targetId] || 0) + 1;
    });

    // Get contact nodes from graph
    const contactNodes = graphData.nodes.filter(n => n.type === 'Contact');

    return contactNodes.map(node => ({
      ...node,
      connectionCount: connectionCounts[node.id] || 0
    }));
  }, [graphData]);

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let result = [...contactsWithConnections];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.name || '').toLowerCase().includes(query) ||
        (c.email || '').toLowerCase().includes(query) ||
        (c.company || '').toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortBy === 'connections') {
      result.sort((a, b) => b.connectionCount - a.connectionCount);
    } else if (sortBy === 'name') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    }

    return result;
  }, [contactsWithConnections, searchQuery, sortBy]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    const query = searchQuery.toLowerCase();
    return groups.filter(g => (g.name || '').toLowerCase().includes(query));
  }, [groups, searchQuery]);

  const handleContactClick = (contact) => {
    if (focusedNodeId === contact.id) {
      onClearFocus?.();
    } else {
      onFocusNode?.(contact.id);
    }
  };

  return (
    <div className="w-72 h-full bg-white/95 backdrop-blur-md border-r border-gray-200 flex flex-col">
      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'contacts'
              ? 'text-purple-700 border-b-2 border-purple-600 bg-purple-50/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Contacts
          <span className="ml-1.5 text-xs text-gray-400">
            {filteredContacts.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'groups'
              ? 'text-purple-700 border-b-2 border-purple-600 bg-purple-50/50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          Groups
          <span className="ml-1.5 text-xs text-gray-400">
            {filteredGroups.length}
          </span>
        </button>
      </div>

      {/* Sort (contacts only) */}
      {activeTab === 'contacts' && (
        <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
          <span className="text-xs text-gray-500">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer"
          >
            <option value="connections">Most Connected</option>
            <option value="name">Alphabetical</option>
            <option value="recent">Most Recent</option>
          </select>
        </div>
      )}

      {/* Clear focus button */}
      {focusedNodeId && (
        <div className="px-3 py-2 bg-purple-50 border-b border-purple-100">
          <button
            onClick={onClearFocus}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-purple-700 bg-white border border-purple-200 rounded-lg hover:bg-purple-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Focus
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'contacts' ? (
          filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No contacts found
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => handleContactClick(contact)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${
                    focusedNodeId === contact.id
                      ? 'bg-purple-100 border border-purple-300 shadow-sm'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    focusedNodeId === contact.id ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
                  }`}>
                    <span className="text-sm font-medium">
                      {(contact.name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      focusedNodeId === contact.id ? 'text-purple-900' : 'text-gray-900'
                    }`}>
                      {contact.name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                      <span>{contact.connectionCount} connection{contact.connectionCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Focus indicator */}
                  {focusedNodeId === contact.id && (
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )
        ) : (
          filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No groups found
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => onFocusNode?.(group.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${
                    focusedNodeId === group.id
                      ? 'bg-purple-100 border border-purple-300 shadow-sm'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    focusedNodeId === group.id ? 'bg-purple-600 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      focusedNodeId === group.id ? 'text-purple-900' : 'text-gray-900'
                    }`}>
                      {group.name || 'Unnamed Group'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {group.members?.length || 0} members
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
