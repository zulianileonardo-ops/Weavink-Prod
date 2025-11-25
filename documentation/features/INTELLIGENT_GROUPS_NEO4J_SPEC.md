---
id: features-intelligent-groups-neo4j-083
title: Intelligent Group Creation with Neo4j Graph Database
category: features
tags: [neo4j, graph-database, intelligent-groups, pinecone, gemini, visualization, react-force-graph, relationship-discovery, ai-groups, localstorage-cache, background-jobs]
status: in-progress
created: 2025-11-25
updated: 2025-11-25
related:
  - SEMANTIC_SEARCH_ARCHITECTURE_V2.md
  - PHASE5_AUTO_TAGGING_MIGRATION.md
  - LOCATION_SERVICES_AUTO_TAGGING_SPEC.md
---

# Intelligent Group Creation with Neo4j Graph Database

## Executive Summary

This specification describes the implementation of an AI-powered intelligent group creation feature that uses Neo4j graph database for relationship discovery, Pinecone for semantic similarity, Gemini AI for inference, and react-force-graph-2d for interactive visualization.

**Key Capabilities:**
- Automatic relationship discovery between contacts
- Interactive graph visualization with zoom/pan/click
- AI-powered group suggestions with smart naming
- Integration with existing group management system

**Target Users:** Premium and Business tier subscribers
**Scale:** <500 contacts per user
**Timeline:** 8-9 weeks total, 4-5 weeks to first demo

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Architecture Overview](#architecture-overview)
3. [Neo4j Graph Schema](#neo4j-graph-schema)
4. [Relationship Discovery](#relationship-discovery)
5. [Graph Visualization](#graph-visualization)
6. [Intelligent Group Creation Flow](#intelligent-group-creation-flow)
7. [API Specifications](#api-specifications)
8. [Feature Flags & Subscription Tiers](#feature-flags--subscription-tiers)
9. [Cost Analysis](#cost-analysis)
10. [Implementation Phases](#implementation-phases)
11. [File Structure](#file-structure)
12. [Risk Mitigation](#risk-mitigation)
13. [References](#references)

---

## Technology Stack

### Core Technologies

| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| **Neo4j AuraDB Free** | Graph database | 50k nodes, 175k relationships free; native graph queries |
| **Pinecone** (existing) | Vector similarity | Already integrated; semantic search capability |
| **Gemini 2.5 Flash** (existing) | AI inference | Already integrated; cost-effective; relationship inference |
| **react-force-graph-2d** | Graph visualization | WebGL performance; 66k downloads/week; interactive |
| **localStorage** | Client caching | Cache graph data, stats, suggestions for 1h TTL |

### Why This Stack?

**Neo4j + Pinecone Hybrid Approach:**
- Industry consensus: [Vectors and Graphs: Better Together](https://www.pinecone.io/learn/vectors-and-graphs-better-together/)
- Neo4j: Optimal for relationship traversal ("Who knows who?", "Common connections")
- Pinecone: Optimal for semantic similarity ("Similar roles/interests")
- Together: Comprehensive relationship discovery

**Neo4j AuraDB Free Tier:**
- 50,000 nodes + 175,000 relationships
- For <500 contacts/user: ~100x headroom
- Zero infrastructure management
- [Pricing Details](https://neo4j.com/pricing/)

**react-force-graph-2d over alternatives:**
| Library | Performance | Learning Curve | Recommendation |
|---------|-------------|----------------|----------------|
| react-force-graph-2d | WebGL, <5k nodes | Easy | **Selected** |
| Cytoscape.js | Best for 10k+ | Steep | Overkill for <500 |
| D3.js | Flexible | Very Steep | Too low-level |
| vis-network | Good | Medium | Less maintained |

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  GroupManagerModal.jsx                                                   │
│  ├── OverviewTab (existing)                                             │
│  ├── GroupsTab (existing)                                               │
│  ├── CreateGroupTab (existing)                                          │
│  ├── RulesGenerateTab (existing)                                        │
│  └── GraphExplorerTab (NEW)                                             │
│      ├── ContactGraph.jsx (react-force-graph-2d)                        │
│      ├── GraphControls.jsx (zoom, filter, layout)                       │
│      ├── GraphLegend.jsx (node/edge types)                              │
│      ├── NodeTooltip.jsx (hover information)                            │
│      └── GroupSuggestionsPanel.jsx (AI suggestions)                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            API LAYER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  /api/user/contacts/graph/                                              │
│  ├── route.js          GET  - Fetch graph data for visualization        │
│  ├── discover/route.js POST - Trigger relationship discovery            │
│  ├── clusters/route.js GET  - Get detected clusters                     │
│  └── suggestions/route.js GET - Get AI group suggestions                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          SERVICE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  lib/services/serviceContact/server/neo4j/                              │
│  ├── neo4jClient.js              - Connection singleton                 │
│  ├── Neo4jSyncService.js         - Firestore ↔ Neo4j sync              │
│  ├── RelationshipDiscoveryService.js                                    │
│  │   ├── discoverCompanyRelationships()   - Neo4j query                │
│  │   ├── discoverSocialProximity()        - Events/locations           │
│  │   ├── discoverSemanticSimilarity()     - Pinecone vectors           │
│  │   └── inferHiddenRelationships()       - Gemini AI                  │
│  ├── GroupSuggestionService.js   - Cluster → Group suggestions         │
│  └── AIRelationshipInferenceService.js - Notes analysis                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │
│  │   Firestore   │  │  Neo4j AuraDB │  │   Pinecone    │               │
│  │   (Primary)   │  │    (Graph)    │  │   (Vectors)   │               │
│  ├───────────────┤  ├───────────────┤  ├───────────────┤               │
│  │ - Contacts    │  │ - Nodes       │  │ - Embeddings  │               │
│  │ - Groups      │  │ - Edges       │  │ - Metadata    │               │
│  │ - Users       │  │ - Clusters    │  │ - Similarity  │               │
│  └───────────────┘  └───────────────┘  └───────────────┘               │
│                                                                          │
│  ┌───────────────┐                                                      │
│  │  localStorage │                                                      │
│  │ (Client Cache)│                                                      │
│  ├───────────────┤                                                      │
│  │ - Graph data  │                                                      │
│  │ - Stats       │                                                      │
│  │ - Suggestions │                                                      │
│  │ - 1h TTL      │                                                      │
│  └───────────────┘                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Contact Creation

```
User creates contact
        │
        ▼
┌─────────────────────┐
│ ContactCRUDService  │
│   createContact()   │
└─────────────────────┘
        │
        ├──────────────────────────────────────────┐
        │                                          │
        ▼                                          ▼
┌─────────────────────┐              ┌─────────────────────┐
│     Firestore       │              │  VectorStorageService│
│   (save contact)    │              │  (Pinecone embed)    │
└─────────────────────┘              └─────────────────────┘
        │                                          │
        ▼                                          │
┌─────────────────────┐                            │
│   Neo4jSyncService  │ ◄──────────────────────────┘
│   syncContact()     │    (fire-and-forget)
└─────────────────────┘
        │
        ├─── Create Contact node
        ├─── Create WORKS_AT → Company
        ├─── Create HAS_TAG → Tags
        └─── Create LOCATED_AT → Location
```

### Data Flow: Relationship Discovery

```
User clicks "Discover Relationships"
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│            RelationshipDiscoveryService.discoverAll()        │
└─────────────────────────────────────────────────────────────┘
        │
        ├─────────────────────────────────────────────────────┐
        │                    │                    │           │
        ▼                    ▼                    ▼           ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Company     │  │    Social     │  │   Semantic    │  │      AI       │
│ Relationships │  │   Proximity   │  │  Similarity   │  │  Inference    │
└───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘
        │                    │                    │                │
        │ Neo4j query        │ Time/GPS cluster   │ Pinecone K-NN  │ Gemini
        │                    │                    │                │
        └─────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────┐
                        │   Store SIMILAR_TO  │
                        │   edges in Neo4j    │
                        └─────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────┐
                        │  Return graph data  │
                        │  + clusters         │
                        └─────────────────────┘
```

### Background Job Pattern for Discovery

Discovery operations can take 30-60 seconds for users with many contacts. To prevent client timeouts, we use a background job pattern with polling:

```
User clicks "Discover Relationships"
        │
        ▼
┌─────────────────────────────────┐
│  POST /api/.../graph/discover   │
│  - Creates job in memory        │
│  - Returns jobId immediately    │
│  - Starts async discovery       │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  Client polls every 2 seconds   │
│  GET /api/.../discover/status   │
│  ?jobId=job_xxx                 │
└─────────────────────────────────┘
        │
        ├─── status: "started" (progress: 0-99%)
        │    └─► Continue polling
        │
        ├─── status: "completed" (progress: 100%)
        │    └─► Refresh graph data
        │
        └─── status: "failed"
             └─► Show error
```

**DiscoveryJobManager Implementation:**

The job manager uses `globalThis` to persist jobs across Next.js module reloads in development:

```javascript
// lib/services/serviceContact/server/DiscoveryJobManager.js
const globalKey = '__discovery_jobs__';
if (!globalThis[globalKey]) {
  globalThis[globalKey] = new Map();
}
const jobs = globalThis[globalKey];
```

> **Important: Next.js Module Isolation Fix**
>
> In Next.js development mode, different API routes can receive separate module instances due to hot module reloading. Without `globalThis`:
> - `/discover` route created jobs in Map A
> - `/discover/status` route queried from Map B (empty)
> - Result: 404 "Job not found" errors
>
> The `globalThis` pattern ensures both routes share the same Map instance.

---

## Neo4j Graph Schema

### Environment Configuration

```env
# .env.local
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=xxxxx
```

### Node Types

```
┌──────────────────────────────────────────────────────────────────┐
│                         NODE TYPES                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐   Properties:                                   │
│  │   Contact   │   - id: string (Firestore ID)                   │
│  │   (Purple)  │   - userId: string (owner)                      │
│  └─────────────┘   - name: string                                │
│                    - email: string                                │
│                    - company: string                              │
│                    - jobTitle: string                             │
│                    - tags: string[] (from auto-tagging)          │
│                    - createdAt: datetime                          │
│                                                                   │
│  ┌─────────────┐   Properties:                                   │
│  │   Company   │   - name: string (normalized)                   │
│  │   (Blue)    │   - domain: string (email domain)               │
│  └─────────────┘   - industry: string (optional, AI-inferred)    │
│                                                                   │
│  ┌─────────────┐   Properties:                                   │
│  │    Event    │   - id: string (generated)                      │
│  │   (Green)   │   - name: string                                │
│  └─────────────┘   - date: date                                  │
│                    - venueName: string (from Places API)         │
│                    - location: point (lat/lng)                    │
│                                                                   │
│  ┌─────────────┐   Properties:                                   │
│  │  Location   │   - id: string (geohash)                        │
│  │  (Orange)   │   - name: string (city/venue)                   │
│  └─────────────┘   - lat: float                                  │
│                    - lng: float                                   │
│                    - radius: float (cluster radius in km)        │
│                                                                   │
│  ┌─────────────┐   Properties:                                   │
│  │    Tag      │   - name: string (lowercase-hyphenated)         │
│  │   (Gray)    │   - category: string (role/industry/skill)      │
│  └─────────────┘                                                 │
│                                                                   │
│  ┌─────────────┐   Properties:                                   │
│  │    User     │   - id: string (Firebase UID)                   │
│  │  (Hidden)   │   - Used for data isolation only                │
│  └─────────────┘                                                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Relationship Types

```
┌──────────────────────────────────────────────────────────────────┐
│                      RELATIONSHIP TYPES                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  (Contact)-[:WORKS_AT]->(Company)                                │
│  └── Properties:                                                  │
│      - confidence: float (0.0-1.0)                               │
│      - source: string ("company_field" | "email_domain")         │
│      - startDate: date (optional)                                │
│                                                                   │
│  (Contact)-[:ATTENDED]->(Event)                                  │
│  └── Properties:                                                  │
│      - confidence: float (0.0-1.0)                               │
│      - detectionMethod: string ("time_cluster" | "gps_cluster")  │
│                                                                   │
│  (Contact)-[:LOCATED_AT]->(Location)                             │
│  └── Properties:                                                  │
│      - timestamp: datetime (when contact was added)              │
│      - confidence: float (GPS accuracy)                          │
│                                                                   │
│  (Contact)-[:HAS_TAG]->(Tag)                                     │
│  └── Properties:                                                  │
│      - source: string ("auto_tagging" | "manual")                │
│      - confidence: float (from AutoTaggingService)               │
│                                                                   │
│  (Contact)-[:SIMILAR_TO]->(Contact)                              │
│  └── Properties:                                                  │
│      - score: float (cosine similarity, 0.75-1.0)                │
│      - method: string ("pinecone_embedding" | "tag_overlap")     │
│      - discoveredAt: datetime                                    │
│                                                                   │
│  (Contact)-[:KNOWS]->(Contact)                                   │
│  └── Properties:                                                  │
│      - strength: float (0.0-1.0)                                 │
│      - inferredFrom: string ("notes" | "mutual_event" | "ai")    │
│      - evidence: string (quote from notes)                       │
│                                                                   │
│  (Contact)-[:BELONGS_TO]->(User)                                 │
│  └── Properties: none (used for data isolation)                  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Cypher Constraints and Indexes

```cypher
-- Unique constraints
CREATE CONSTRAINT contact_id IF NOT EXISTS
  FOR (c:Contact) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT company_name_user IF NOT EXISTS
  FOR (co:Company) REQUIRE (co.name, co.userId) IS UNIQUE;

CREATE CONSTRAINT event_id IF NOT EXISTS
  FOR (e:Event) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT tag_name IF NOT EXISTS
  FOR (t:Tag) REQUIRE t.name IS UNIQUE;

-- Performance indexes
CREATE INDEX contact_userId IF NOT EXISTS
  FOR (c:Contact) ON (c.userId);

CREATE INDEX contact_company IF NOT EXISTS
  FOR (c:Contact) ON (c.company);

CREATE INDEX location_geohash IF NOT EXISTS
  FOR (l:Location) ON (l.id);
```

### Visual Schema Diagram

```
                              ┌─────────┐
                              │  User   │
                              └────┬────┘
                                   │
                          BELONGS_TO│
                                   │
    ┌──────────┐            ┌──────┴──────┐            ┌──────────┐
    │ Company  │◄─WORKS_AT──│   Contact   │──HAS_TAG──►│   Tag    │
    └──────────┘            └──────┬──────┘            └──────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
               ATTENDED       LOCATED_AT     SIMILAR_TO
                    │              │              │
                    ▼              ▼              ▼
               ┌────────┐    ┌──────────┐   ┌─────────┐
               │ Event  │    │ Location │   │ Contact │
               └────────┘    └──────────┘   └─────────┘
```

---

## Relationship Discovery

### Discovery Methods

#### 1. Company Relationships (Neo4j Query)

**Source Files:**
- `lib/services/serviceContact/config/publicEmailDomains.js` (existing)
- `lib/services/serviceContact/server/neo4j/RelationshipDiscoveryService.js` (new)

**Algorithm:**
```javascript
async function discoverCompanyRelationships(userId) {
  // Step 1: Query contacts with same company
  const companyQuery = `
    MATCH (c:Contact {userId: $userId})-[:WORKS_AT]->(co:Company)<-[:WORKS_AT]-(other:Contact)
    WHERE c.id <> other.id
    WITH co, collect(DISTINCT c) + collect(DISTINCT other) as members
    WHERE size(members) >= $minSize
    RETURN co.name as company, members, size(members) as size
    ORDER BY size DESC
  `;

  // Step 2: For contacts without WORKS_AT, analyze email domain
  // Reuse: analyzeEmailDomain(), getCompanyIdentifierFromDomain()

  // Step 3: Create WORKS_AT edges for email-domain matches

  return clusters;
}
```

**Confidence Scoring:**
- Explicit company field: 0.95
- Business email domain: 0.70
- AI-inferred from notes: 0.60

#### 2. Social Proximity (Events & Locations)

**Reuse from:** `lib/services/serviceContact/server/GroupService/rulesGroupService.js`

**Constants:**
```javascript
const EVENT_DETECTION_THRESHOLD_HOURS = 4;
const EVENT_PROXIMITY_THRESHOLD_KM = 1.0;
const LOCATION_CLUSTER_THRESHOLD_KM = 0.1;
```

**Algorithm:**
```javascript
async function discoverSocialProximity(userId) {
  // Step 1: Get contacts with time+location data from Neo4j

  // Step 2: Apply time clustering (contacts added within 4 hours)
  // Reuse: groupContactsByTime() logic

  // Step 3: Apply GPS clustering (contacts within 1km)
  // Reuse: calculateHaversineDistance()

  // Step 4: Detect events (time + GPS overlap)
  // Reuse: groupContactsByEvents() logic

  // Step 5: Create Event nodes and ATTENDED relationships

  return eventClusters;
}
```

#### 3. Semantic Similarity (Pinecone Integration)

**Use existing:** `lib/services/serviceContact/server/embeddingService.js`

**Algorithm:**
```javascript
async function discoverSemanticSimilarity(userId, options = {}) {
  const { similarityThreshold = 0.75, topK = 5 } = options;

  // Step 1: Get all contact IDs for user
  const contactIds = await getContactIds(userId);

  // Step 2: For each contact, query Pinecone for similar contacts
  for (const contactId of contactIds) {
    const similar = await pinecone.query({
      namespace: `user_${userId}`,
      id: contactId,
      topK: topK,
      includeMetadata: true
    });

    // Step 3: Filter by threshold and create SIMILAR_TO edges
    for (const match of similar.matches) {
      if (match.score >= similarityThreshold && match.id !== contactId) {
        await createSimilarToEdge(contactId, match.id, match.score);
      }
    }
  }

  // Cost tracked via CostTrackingService (API budget)
  return semanticClusters;
}
```

#### 4. AI Relationship Inference (Gemini)

**New Service:** `lib/services/serviceContact/server/neo4j/AIRelationshipInferenceService.js`

**Algorithm:**
```javascript
async function inferHiddenRelationships(userId, contacts) {
  // Step 1: Group contacts with notes for batch processing
  const contactsWithNotes = contacts.filter(c => c.notes?.length > 20);

  // Step 2: Build inference prompt
  const prompt = `
    Analyze these contacts for potential relationships:
    ${formatContactsForPrompt(contactsWithNotes)}

    Identify:
    1. Shared events mentioned ("met at", "conference", "event")
    2. Mutual connections ("introduced by", "works with")
    3. Professional overlap (same project, client)

    Return JSON: { relationships: [{ contact1, contact2, type, confidence, evidence }] }
  `;

  // Step 3: Call Gemini 2.5 Flash
  const result = await geminiModel.generateContent(prompt);

  // Step 4: Create KNOWS edges with inference metadata
  for (const rel of result.relationships) {
    await createKnowsEdge(rel.contact1, rel.contact2, {
      strength: rel.confidence,
      inferredFrom: 'ai',
      evidence: rel.evidence
    });
  }

  // Cost tracked via CostTrackingService (AI budget)
  return inferredRelationships;
}
```

**Prompt Template:**
```
You are analyzing contacts from a professional network.

CONTACTS:
{{#each contacts}}
- {{name}} ({{company}}, {{jobTitle}})
  Notes: "{{notes}}"
{{/each}}

TASK: Identify potential relationships between these contacts.

Look for:
1. Shared events: "met at TechConf", "conference", "meetup"
2. Mutual connections: "introduced by Sarah", "recommended by"
3. Professional overlap: same project, client, or industry context

RESPONSE FORMAT (JSON only):
{
  "relationships": [
    {
      "contact1": "contact_id_1",
      "contact2": "contact_id_2",
      "type": "shared_event|mutual_connection|professional_overlap",
      "confidence": 0.0-1.0,
      "evidence": "Exact quote from notes"
    }
  ]
}
```

---

## Graph Visualization

### Component Architecture

```
app/dashboard/(dashboard pages)/contacts/components/GraphVisualization/
├── ContactGraph.jsx           # Main ForceGraph2D wrapper
├── GraphControls.jsx          # Toolbar: zoom, reset, filter, layout
├── GraphLegend.jsx            # Legend for node/edge colors
├── NodeTooltip.jsx            # Hover tooltip with contact details
├── NodeContextMenu.jsx        # Right-click actions
├── GraphExplorerTab.jsx       # Tab container for GroupManagerModal
├── GroupSuggestionsPanel.jsx  # AI-suggested groups sidebar
└── hooks/
    ├── useGraphData.js        # Data fetching and transformation
    ├── useGraphLayout.js      # Layout algorithm selection
    └── useGraphInteractions.js # Event handlers
```

### ContactGraph.jsx

> **Note: Dynamic Import with Ref Wrapper**
>
> Next.js `dynamic()` creates a wrapper component that doesn't forward refs. To use refs with ForceGraph2D, we wrap it in a component that accepts `graphRef` as a prop:
>
> ```jsx
> const ForceGraph2DWrapper = dynamic(
>   async () => {
>     const { default: ForceGraph2D } = await import('react-force-graph-2d');
>     return function ForceGraph2DWithRef({ graphRef, ...props }) {
>       return <ForceGraph2D ref={graphRef} {...props} />;
>     };
>   },
>   { ssr: false, loading: () => <LoadingSpinner /> }
> );
>
> // Usage: <ForceGraph2DWrapper graphRef={graphRef} {...props} />
> ```

```jsx
import dynamic from 'next/dynamic';
import { useCallback, useRef } from 'react';

// Dynamic import with SSR disabled and ref wrapper pattern
const ForceGraph2DWrapper = dynamic(...);

export default function ContactGraph({
  userId,
  onNodeClick,
  onCreateGroup,
  filters = {},
  highlightedCluster = null
}) {
  const graphRef = useRef();
  const { graphData, loading, clusters } = useGraphData(userId, filters);

  // Node coloring by type
  const nodeColor = useCallback((node) => {
    if (highlightedCluster && node.clusterId === highlightedCluster) {
      return '#FBBF24'; // Highlight yellow
    }
    switch(node.type) {
      case 'contact': return '#8B5CF6'; // Purple
      case 'company': return '#3B82F6'; // Blue
      case 'event': return '#10B981';   // Green
      case 'location': return '#F59E0B'; // Orange
      case 'tag': return '#6B7280';     // Gray
      default: return '#9CA3AF';
    }
  }, [highlightedCluster]);

  // Edge coloring by relationship type
  const linkColor = useCallback((link) => {
    switch(link.type) {
      case 'WORKS_AT': return '#3B82F6';
      case 'ATTENDED': return '#10B981';
      case 'SIMILAR_TO': return '#8B5CF6';
      case 'KNOWS': return '#EC4899';
      case 'HAS_TAG': return '#9CA3AF';
      case 'LOCATED_AT': return '#F59E0B';
      default: return '#D1D5DB';
    }
  }, []);

  // Node sizing
  const nodeSize = useCallback((node) => {
    if (node.type === 'contact') return 8;
    if (node.type === 'company') return 12;
    return 6;
  }, []);

  return (
    <ForceGraph2D
      ref={graphRef}
      graphData={graphData}
      nodeColor={nodeColor}
      linkColor={linkColor}
      nodeVal={nodeSize}
      nodeLabel={node => node.name}
      linkLabel={link => link.type}
      onNodeClick={onNodeClick}
      nodeCanvasObject={(node, ctx, globalScale) => {
        // Custom node rendering with labels
        const label = node.name;
        const fontSize = 12/globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.fillStyle = nodeColor(node);
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize(node), 0, 2 * Math.PI);
        ctx.fill();

        if (globalScale > 1.5) { // Show labels when zoomed in
          ctx.fillStyle = '#374151';
          ctx.fillText(label, node.x + 10, node.y + 3);
        }
      }}
      linkDirectionalParticles={2}
      linkDirectionalParticleSpeed={0.005}
      cooldownTicks={100}
      onEngineStop={() => graphRef.current?.zoomToFit(400)}
    />
  );
}
```

### 3D Visualization Mode

The graph supports both 2D and 3D rendering modes, controlled via a toggle in the fullscreen control bar.

**Libraries:**
- `react-force-graph-2d` - Canvas 2D rendering (default)
- `react-force-graph-3d` - WebGL/Three.js rendering

**Dynamic Imports:**
```jsx
// 2D Graph (default)
const ForceGraph2DWrapper = dynamic(
  async () => {
    const { default: ForceGraph2D } = await import('react-force-graph-2d');
    return function ForceGraph2DWithRef({ graphRef, ...props }) {
      return <ForceGraph2D ref={graphRef} {...props} />;
    };
  },
  { ssr: false, loading: () => <GraphLoadingSpinner /> }
);

// 3D Graph (WebGL)
const ForceGraph3DWrapper = dynamic(
  async () => {
    const { default: ForceGraph3D } = await import('react-force-graph-3d');
    return function ForceGraph3DWithRef({ graphRef, ...props }) {
      return <ForceGraph3D ref={graphRef} {...props} />;
    };
  },
  { ssr: false, loading: () => <GraphLoadingSpinner /> }
);
```

**View Mode State:**
- State lifted from `ContactGraph` to `GraphExplorerTab`
- Passed as prop: `viewMode = '2d' | '3d'`
- Toggle button in fullscreen control bar

**API Differences:**

| Action | 2D Mode | 3D Mode |
|--------|---------|---------|
| Focus on node | `centerAt(x, y, ms)` + `zoom(level, ms)` | `cameraPosition({x, y, z}, node, ms)` |
| Render method | Canvas 2D | WebGL/Three.js |
| Node styling | `nodeCanvasObject` callback | `nodeColor` + `nodeVal` props |
| Node opacity | Manual via `ctx.globalAlpha` | `nodeOpacity` prop |

**Node Click Handler (viewMode-aware):**
```jsx
const handleNodeClick = useCallback((node) => {
  if (onNodeClick) onNodeClick(node);

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
        node, // lookAt target
        500   // transition ms
      );
    }
  }
}, [onNodeClick, viewMode]);
```

### Advanced Filters

Beyond category-level filtering (Contact/Company/Tag), users can filter by specific values.

**Filter State:**
```javascript
const [filters, setFilters] = useState({
  // Category filters (existing)
  nodeTypes: ['Contact', 'Company', 'Tag'],
  relationshipTypes: ['WORKS_AT', 'HAS_TAG', 'SIMILAR_TO', 'KNOWS'],

  // Advanced filters (NEW)
  selectedCompanies: [],  // Filter by specific company names
  selectedTags: []        // Filter by specific tag names
});
```

**Extracting Unique Values:**
```javascript
// Extract unique companies from graph data
const uniqueCompanies = useMemo(() => {
  return [...new Set(
    graphData?.nodes
      ?.filter(n => n.type === 'Company')
      .map(n => n.name)
      .filter(Boolean)
  )].sort();
}, [graphData?.nodes]);

// Extract unique tags from graph data
const uniqueTags = useMemo(() => {
  return [...new Set(
    graphData?.nodes
      ?.filter(n => n.type === 'Tag')
      .map(n => n.name)
      .filter(Boolean)
  )].sort();
}, [graphData?.nodes]);
```

**Toggle Functions:**
```javascript
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
```

**Graph Data Filtering (in ContactGraph.jsx):**
```javascript
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
```

**UI Implementation:**
- Expandable "Advanced Filters" section in filter panel
- Chip-style selectable items (click to toggle)
- Purple highlight for selected, gray for unselected
- "Clear all" button to reset filters

### GraphExplorerTab.jsx (Integration Point)

```jsx
export default function GraphExplorerTab({
  contacts,
  userId,
  onCreateGroup,
  onShowLocation
}) {
  const [discovering, setDiscovering] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const response = await fetch('/api/user/contacts/graph/discover', {
        method: 'POST'
      });
      const data = await response.json();
      setSuggestions(data.suggestions);
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Main Graph Area */}
      <div className="flex-1 relative">
        <GraphControls onDiscover={handleDiscover} discovering={discovering} />
        <ContactGraph
          userId={userId}
          onNodeClick={handleNodeClick}
          highlightedCluster={selectedCluster}
        />
        <GraphLegend />
      </div>

      {/* Suggestions Sidebar */}
      <div className="w-80 border-l border-gray-200 overflow-y-auto">
        <GroupSuggestionsPanel
          suggestions={suggestions}
          onSelectCluster={setSelectedCluster}
          onCreateGroup={onCreateGroup}
        />
      </div>
    </div>
  );
}
```

### UI Mockup

**Standard View:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Graph Explorer                                             [?] [×]     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [🔍 Discover]  [🔄 Refresh]  [Filter: ▾ All]  [Layout: ▾ Force] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────┐  ┌─────────────────────┐  │
│  │                                         │  │ Suggested Groups (3)│  │
│  │                    ●                    │  ├─────────────────────┤  │
│  │               ●   ╱│╲                   │  │ 🏢 Acme Inc Team    │  │
│  │              ╱   ● │ ●                  │  │    5 contacts       │  │
│  │             ●─────●───●                 │  │    [Create] [View]  │  │
│  │              ╲   ╱ ╲ ╱                  │  ├─────────────────────┤  │
│  │               ● ●   ●                   │  │ 📅 TechConf 2024    │  │
│  │                ╲│╱                      │  │    8 contacts       │  │
│  │                 ●                       │  │    [Create] [View]  │  │
│  │                                         │  ├─────────────────────┤  │
│  │           [Interactive Graph]           │  │ 🧠 AI/ML Network    │  │
│  │                                         │  │    4 contacts       │  │
│  │                                         │  │    [Create] [View]  │  │
│  └─────────────────────────────────────────┘  └─────────────────────┘  │
│                                                                         │
│  Legend:  ● Contact  ● Company  ● Event  ● Location                    │
│           ─ WORKS_AT  ─ ATTENDED  ─ SIMILAR_TO  ─ KNOWS                 │
└─────────────────────────────────────────────────────────────────────────┘
```

**Fullscreen View (with 3D toggle and Advanced Filters):**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Filter] [Suggestions] [Discover] [Refresh] [×Close] [2D/3D]          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │                     ●                                            │   │
│  │                ●   ╱│╲   ●                                       │   │
│  │               ╱   ● │ ● ╱                                        │   │
│  │              ●─────●───●                                          │   │
│  │               ╲   ╱ ╲ ╱                                          │   │
│  │                ● ●   ●                                            │   │
│  │                 ╲│╱                                               │   │
│  │                  ●                                                │   │
│  │                                                                   │   │
│  │               [Fullscreen Interactive Graph]                      │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Advanced Filters Panel (when Filter button clicked):
┌─────────────────────────────────────┐
│  Node Types                         │
│  [●Contact] [●Company] [●Tag]       │
│                                     │
│  Relationship Types                 │
│  [WORKS_AT] [HAS_TAG] [SIMILAR_TO]  │
│                                     │
│  ▼ Advanced Filters                 │
│  ┌─────────────────────────────────┐│
│  │ Companies:                      ││
│  │ [Tesla] [Google] [Microsoft]    ││
│  │ [Apple] [Meta]                  ││
│  │                                 ││
│  │ Tags:                           ││
│  │ [ai-ml] [sales] [engineering]   ││
│  │ [marketing] [design]            ││
│  └─────────────────────────────────┘│
│                                     │
│  [Clear All]                        │
└─────────────────────────────────────┘
```

---

## Intelligent Group Creation Flow

### User Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENT GROUP CREATION FLOW                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. USER OPENS GROUP MANAGER                                           │
│     └─► Sees "Graph Explorer" tab (Premium+ only)                      │
│                                                                         │
│  2. USER CLICKS "DISCOVER RELATIONSHIPS"                               │
│     └─► POST /api/user/contacts/graph/discover                         │
│         └─► RelationshipDiscoveryService.discoverAll()                 │
│             ├─► Company discovery (Neo4j)                              │
│             ├─► Social proximity (Time/GPS clusters)                   │
│             ├─► Semantic similarity (Pinecone)                         │
│             └─► AI inference (Gemini, Business+ only)                  │
│                                                                         │
│  3. GRAPH UPDATES WITH RELATIONSHIPS                                   │
│     └─► Nodes connected by edges                                       │
│     └─► Clusters highlighted                                           │
│                                                                         │
│  4. SUGGESTIONS PANEL SHOWS AI-GENERATED GROUPS                        │
│     └─► GroupSuggestionService.generateSuggestions()                   │
│         └─► Analyze clusters by size and cohesion                      │
│         └─► Generate smart names with Gemini                           │
│                                                                         │
│  5. USER REVIEWS SUGGESTIONS                                           │
│     ├─► Click suggestion to highlight cluster in graph                 │
│     ├─► [View] to see member list                                      │
│     └─► [Create] to create group                                       │
│                                                                         │
│  6. USER CLICKS "CREATE"                                               │
│     └─► Opens confirmation modal with:                                 │
│         ├─► Pre-filled name (AI-generated)                            │
│         ├─► Member list (editable)                                     │
│         ├─► Group type (intelligent_company, etc.)                     │
│         └─► [Confirm] / [Cancel]                                       │
│                                                                         │
│  7. GROUP CREATED                                                      │
│     └─► Uses existing GroupService.createGroup()                       │
│     └─► Group appears in Groups tab                                    │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Group Suggestion Types

The system generates 4 types of group suggestions based on different relationship types:

| Type | Relationship | Description | Confidence |
|------|--------------|-------------|------------|
| `company` | WORKS_AT | Contacts at the same company | 0.9 |
| `tag` | HAS_TAG | Contacts sharing the same tag | 0.8 |
| `semantic` | SIMILAR_TO | Contacts with similar profiles | 0.7 |
| `knows` | KNOWS | Socially connected contacts | 0.75 |

### Neo4j Cluster Queries

#### findTagClusters - Tag-based grouping
```javascript
async findTagClusters(userId) {
  const query = `
    MATCH (c:Contact {userId: $userId})-[:HAS_TAG]->(t:Tag)
    WITH t, collect(c) as contacts
    WHERE size(contacts) >= 2
    RETURN t.name as tag,
           [c IN contacts | {id: c.id, name: c.name}] as members,
           size(contacts) as memberCount
    ORDER BY memberCount DESC
    LIMIT 20
  `;
  return this.runQuery(query, { userId });
}
```

#### findKnowsClusters - Social connection grouping
```javascript
async findKnowsClusters(userId) {
  const query = `
    MATCH (c1:Contact {userId: $userId})-[r:KNOWS]-(c2:Contact)
    WITH c1, collect({contact: c2, strength: r.strength}) as connections
    WHERE size(connections) >= 2
    RETURN c1.id as contactId,
           c1.name as contactName,
           [conn IN connections | {id: conn.contact.id, name: conn.contact.name}] as connections
    ORDER BY size(connections) DESC
  `;
  return this.runQuery(query, { userId });
}
```

### getSuggestedGroups Implementation

**File:** `lib/services/serviceContact/server/neo4j/RelationshipDiscoveryService.js`

```javascript
static async getSuggestedGroups(userId, options = {}) {
  const suggestions = [];

  // 1. Company-based groups (WORKS_AT)
  const companyClusters = await neo4jClient.findCompanyClusters(userId);
  for (const cluster of companyClusters) {
    if (cluster.memberCount >= 2) {
      suggestions.push({
        type: 'company',
        name: `${cluster.company} Team`,  // Replaced by AI
        reason: `${cluster.memberCount} contacts work at ${cluster.company}`,
        members: cluster.members,
        confidence: 0.9,
        metadata: { company: cluster.company }
      });
    }
  }

  // 2. Tag-based groups (HAS_TAG)
  const tagClusters = await neo4jClient.findTagClusters(userId);
  for (const cluster of tagClusters) {
    if (cluster.memberCount >= 2) {
      suggestions.push({
        type: 'tag',
        name: `${cluster.tag} Group`,  // Replaced by AI
        reason: `${cluster.memberCount} contacts tagged "${cluster.tag}"`,
        members: cluster.members,
        confidence: 0.8,
        metadata: { tag: cluster.tag }
      });
    }
  }

  // 3. Semantic similarity groups (SIMILAR_TO)
  const similarityClusters = await neo4jClient.findSimilarityClusters(userId, options.minSimilarity);
  const processedContacts = new Set();
  for (const cluster of similarityClusters) {
    if (processedContacts.has(cluster.contactId)) continue;
    const members = [
      { id: cluster.contactId, name: cluster.contactName },
      ...cluster.similarContacts
    ];
    if (members.length >= 3) {
      suggestions.push({
        type: 'semantic',
        name: 'Similar Contacts',  // Replaced by AI
        reason: `${members.length} contacts with similar profiles`,
        members: members.slice(0, 10),
        confidence: 0.7
      });
      members.forEach(m => processedContacts.add(m.id));
    }
  }

  // 4. Social connection groups (KNOWS)
  const knowsClusters = await neo4jClient.findKnowsClusters(userId);
  for (const cluster of knowsClusters) {
    if (cluster.connections.length >= 2) {
      const members = [
        { id: cluster.contactId, name: cluster.contactName },
        ...cluster.connections
      ];
      suggestions.push({
        type: 'knows',
        name: 'Connected Network',  // Replaced by AI
        reason: `${members.length} socially connected contacts`,
        members: members.slice(0, 10),
        confidence: 0.75,
        metadata: { centralContact: cluster.contactName }
      });
    }
  }

  // 5. Enhance names with AI (optional)
  if (options.generateAINames !== false) {
    await Promise.all(suggestions.map(async (s) => {
      s.name = await GroupNamingService.generateGroupName(s);
    }));
  }

  return suggestions;
}
```

### GroupNamingService - AI-Powered Naming

**File:** `lib/services/serviceContact/server/GroupNamingService.js`

Generates creative, contextual group names using Gemini AI with Redis caching.

```javascript
import { getAI, getGenerativeModel } from 'firebase/ai';
import redisClient from './redisClient';
import crypto from 'crypto';

const CACHE_TTL = 3600; // 1 hour

export class GroupNamingService {
  static async generateGroupName(suggestion) {
    const cacheKey = `group_name:${suggestion.type}:${this.hashMembers(suggestion)}`;

    // Check Redis cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) return cached;

    try {
      const name = await this.callGemini(suggestion);
      await redisClient.set(cacheKey, name, CACHE_TTL);
      return name;
    } catch (error) {
      console.error('[GroupNaming] AI failed, using fallback:', error.message);
      return this.getFallbackName(suggestion);
    }
  }

  static buildPrompt(suggestion) {
    const memberNames = suggestion.members.map(m => m.name).join(', ');

    const prompts = {
      company: `Generate a creative, professional group name for contacts at ${suggestion.metadata?.company}.
Members: ${memberNames}
Examples: "Tesla Innovators", "Google Dream Team"
Return ONLY the group name.`,

      tag: `Generate a creative group name for contacts tagged "${suggestion.metadata?.tag}".
Members: ${memberNames}
Examples: "AI Pioneers", "Deal Closers", "Tech Leaders"
Return ONLY the group name.`,

      semantic: `Generate a creative group name for similar professionals:
Members: ${memberNames}
Reason: ${suggestion.reason}
Examples: "Tech Visionaries", "Marketing Mavens"
Return ONLY the group name.`,

      knows: `Generate a creative group name for this social network cluster:
Central person: ${suggestion.metadata?.centralContact}
Connected to: ${memberNames}
Examples: "Inner Circle", "Core Network", "Power Connectors"
Return ONLY the group name.`
    };

    return prompts[suggestion.type] || prompts.semantic;
  }

  static getFallbackName(suggestion) {
    const fallbacks = {
      company: `${suggestion.metadata?.company || 'Company'} Team`,
      tag: `${suggestion.metadata?.tag || 'Tagged'} Group`,
      semantic: 'Similar Contacts',
      knows: 'Connected Network'
    };
    return fallbacks[suggestion.type] || 'Contact Group';
  }

  static hashMembers(suggestion) {
    const key = suggestion.members.map(m => m.id).sort().join('-');
    return crypto.createHash('md5').update(key).digest('hex').slice(0, 12);
  }
}
```

**Key Features:**
- **Redis Caching**: 1-hour TTL prevents redundant AI calls
- **Hash-based Keys**: Same member set = same cached name
- **Fallback Names**: Graceful degradation on AI errors
- **Type-specific Prompts**: Contextual naming for each suggestion type

---

## API Specifications

### GET /api/user/contacts/graph

**Purpose:** Fetch graph data for visualization

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      { "id": "contact_abc", "type": "contact", "name": "John Doe", "company": "Acme" },
      { "id": "company_acme", "type": "company", "name": "Acme Inc" },
      { "id": "event_123", "type": "event", "name": "TechConf 2024" }
    ],
    "links": [
      { "source": "contact_abc", "target": "company_acme", "type": "WORKS_AT", "confidence": 0.95 },
      { "source": "contact_abc", "target": "event_123", "type": "ATTENDED", "confidence": 0.80 }
    ],
    "metadata": {
      "nodeCount": 150,
      "linkCount": 320,
      "lastDiscovery": "2025-11-25T10:30:00Z"
    }
  }
}
```

### POST /api/user/contacts/graph/discover

**Purpose:** Start background relationship discovery job

**Request:**
```json
{
  "options": {
    "methods": ["company", "social", "semantic", "ai"],
    "forceRefresh": false
  }
}
```

**Response:** (Returns immediately with jobId)
```json
{
  "success": true,
  "jobId": "job_1732546789012_abc123xyz",
  "message": "Discovery started"
}
```

### GET /api/user/contacts/graph/discover/status

**Purpose:** Poll for discovery job status

**Query Parameters:**
- `jobId` (required): Job ID returned from POST /discover

**Response (in progress):**
```json
{
  "jobId": "job_1732546789012_abc123xyz",
  "status": "started",
  "progress": 45,
  "currentStep": "Discovering semantic similarities..."
}
```

**Response (completed):**
```json
{
  "jobId": "job_1732546789012_abc123xyz",
  "status": "completed",
  "progress": 100,
  "currentStep": "Discovery complete!",
  "result": {
    "similarityRelationships": 42,
    "totalProcessed": 156
  }
}
```

**Response (failed):**
```json
{
  "jobId": "job_1732546789012_abc123xyz",
  "status": "failed",
  "error": "Pinecone query failed: rate limit exceeded"
}
```

### GET/POST /api/user/contacts/graph/settings

**Purpose:** Get or update graph feature settings

**GET Response:**
```json
{
  "success": true,
  "settings": {
    "syncExchangeContacts": true
  }
}
```

**POST Request:**
```json
{
  "syncExchangeContacts": false
}
```

**POST Response:**
```json
{
  "success": true,
  "settings": {
    "syncExchangeContacts": false
  }
}
```

### GET /api/user/contacts/graph/suggestions

**Purpose:** Get AI-generated group suggestions with smart naming

**Query Parameters:**
- `generateAINames` (optional, default: true) - Whether to use Gemini AI for creative names
- `minSimilarity` (optional, default: 0.75) - Minimum similarity score for semantic suggestions

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "type": "company",
      "name": "Tesla Innovators",
      "reason": "5 contacts work at Tesla, Inc.",
      "members": [
        { "id": "contact_1", "name": "John Doe" },
        { "id": "contact_2", "name": "Jane Smith" }
      ],
      "confidence": 0.9,
      "metadata": { "company": "Tesla, Inc." }
    },
    {
      "type": "tag",
      "name": "AI Pioneers",
      "reason": "4 contacts tagged \"ai-ml\"",
      "members": [
        { "id": "contact_3", "name": "Alex Chen" }
      ],
      "confidence": 0.8,
      "metadata": { "tag": "ai-ml" }
    },
    {
      "type": "semantic",
      "name": "Tech Visionaries",
      "reason": "3 contacts with similar profiles",
      "members": [
        { "id": "contact_4", "name": "Sarah Johnson" }
      ],
      "confidence": 0.7
    },
    {
      "type": "knows",
      "name": "Leo's Inner Circle",
      "reason": "4 socially connected contacts",
      "members": [
        { "id": "contact_5", "name": "Mike Brown" }
      ],
      "confidence": 0.75,
      "metadata": { "centralContact": "Leo Martinez" }
    }
  ],
  "metadata": {
    "totalSuggestions": 4,
    "aiNamingEnabled": true,
    "timestamp": "2025-11-25T20:00:00Z"
  }
}
```

**Suggestion Types:**
| Type | Source | Minimum Members | Default Name (Fallback) |
|------|--------|-----------------|-------------------------|
| `company` | WORKS_AT relationships | 2 | "{Company} Team" |
| `tag` | HAS_TAG relationships | 2 | "{Tag} Group" |
| `semantic` | SIMILAR_TO relationships | 3 | "Similar Contacts" |
| `knows` | KNOWS relationships | 3 | "Connected Network" |

---

## Feature Flags & Subscription Tiers

### Feature Constants

**File:** `lib/services/serviceContact/client/constants/contactConstants.js`

```javascript
export const CONTACT_FEATURES = {
  // Existing features...
  BASIC_GROUPS: 'basic_groups',
  ADVANCED_GROUPS: 'advanced_groups',
  RULES_BASED_GROUPS: 'rules_based_groups',

  // NEW features
  GRAPH_VISUALIZATION: 'graph_visualization',
  INTELLIGENT_GROUPS: 'intelligent_groups',
  AI_RELATIONSHIP_INFERENCE: 'ai_relationship_inference'
};
```

### Tier Availability

| Feature | Base | Pro | Premium | Business | Enterprise |
|---------|------|-----|---------|----------|------------|
| Basic Groups | - | Yes (10) | Yes (30) | Yes (50) | Unlimited |
| Rules-Based Groups | - | Yes | Yes | Yes | Yes |
| **Graph Visualization** | - | - | **Yes** | **Yes** | **Yes** |
| **Intelligent Groups** | - | - | **Yes** | **Yes** | **Yes** |
| **AI Relationship Inference** | - | - | - | **Yes** | **Yes** |

### Implementation

```javascript
// In CONTACT_LIMITS

[SUBSCRIPTION_LEVELS.PREMIUM]: {
  maxContacts: 1000,
  features: [
    CONTACT_FEATURES.BASIC_GROUPS,
    CONTACT_FEATURES.RULES_BASED_GROUPS,
    CONTACT_FEATURES.GRAPH_VISUALIZATION,      // NEW
    CONTACT_FEATURES.INTELLIGENT_GROUPS,        // NEW
    // ... other features
  ],
  limits: {
    maxGroups: 30,
    maxGraphNodes: 500,                         // NEW
    monthlyAIRelationshipInference: 0           // Not available
  }
},

[SUBSCRIPTION_LEVELS.BUSINESS]: {
  maxContacts: 5000,
  features: [
    CONTACT_FEATURES.BASIC_GROUPS,
    CONTACT_FEATURES.RULES_BASED_GROUPS,
    CONTACT_FEATURES.GRAPH_VISUALIZATION,      // NEW
    CONTACT_FEATURES.INTELLIGENT_GROUPS,        // NEW
    CONTACT_FEATURES.AI_RELATIONSHIP_INFERENCE, // NEW
    // ... other features
  ],
  limits: {
    maxGroups: 50,
    maxGraphNodes: 2000,                        // NEW
    monthlyAIRelationshipInference: 100         // NEW
  }
}
```

---

## Client-Side Caching

Graph data is cached in localStorage to improve load times and reduce API calls.

### Cache Configuration

```javascript
// hooks/useGraphData.js
const CACHE_PREFIX = 'weavink_graph_';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const CACHE_KEYS = {
  graphData: `${CACHE_PREFIX}data`,      // Graph nodes and edges
  stats: `${CACHE_PREFIX}stats`,          // Contact/company/relationship counts
  suggestions: `${CACHE_PREFIX}suggestions`, // AI group suggestions
  timestamp: `${CACHE_PREFIX}timestamp`   // Cache validation timestamp
};
```

### Cache Behavior

| Event | Behavior |
|-------|----------|
| Initial load | Check cache → if valid, use cached data |
| Cache miss/expired | Fetch from API → store in cache |
| Discovery completes | Invalidate cache → fetch fresh data |
| User clicks Refresh | Force invalidate → fetch fresh data |

### Implementation Details

- **SSR-safe**: Checks `typeof window === 'undefined'` before localStorage access
- **Graceful degradation**: Silent fail on write errors (storage quota)
- **TTL validation**: Checks timestamp before using cached data
- **Auto-invalidation**: Clears cache after discovery job completes

```javascript
// Cache invalidation on discovery completion (useGraphData.js)
if (data.status === 'completed') {
  graphCache.invalidate();
  await Promise.all([
    fetchGraphData({ skipCache: true }),
    fetchStats({ skipCache: true }),
    fetchSuggestions({ skipCache: true })
  ]);
}
```

---

## Cost Analysis

### Per-Operation Costs

| Operation | Provider | Cost | Cached? |
|-----------|----------|------|---------|
| Neo4j queries | AuraDB Free | $0 | N/A |
| Pinecone similarity query | Pinecone | ~$0.0001/query | No |
| Pinecone embedding | Pinecone | ~$0.00008/contact | No |
| Gemini relationship inference | Gemini 2.5 Flash | ~$0.0005/batch | No |
| Gemini group naming | Gemini 2.5 Flash | ~$0.00003/name | No |
| Graph data fetch | API | $0 | localStorage 1h |

### Estimated Monthly Costs (per user)

| Scenario | Contacts | Discovery/month | Est. Cost |
|----------|----------|-----------------|-----------|
| Light user | 100 | 2 | $0.01 |
| Active user | 300 | 10 | $0.08 |
| Power user | 500 | 20 | $0.15 |

### Cost Tracking Integration

**File:** `lib/services/constants/aiCosts.js`

```javascript
// Add to CONTACT_INTELLIGENCE_AI_CONFIG

RELATIONSHIP_INFERENCE: {
  FEATURE_NAME: 'relationship_inference',
  STEP_LABEL: 'AI Relationship Inference',
  CACHE_TTL: 86400,  // 24 hours
  LOG_PREFIX: 'RelInference',
  BUDGET_TYPE: 'AIUsage'
},

GROUP_NAME_GENERATION: {
  FEATURE_NAME: 'group_name_generation',
  STEP_LABEL: 'Smart Group Naming',
  CACHE_TTL: 3600,   // 1 hour
  LOG_PREFIX: 'GroupNaming',
  BUDGET_TYPE: 'AIUsage'
},

SEMANTIC_SIMILARITY_QUERY: {
  FEATURE_NAME: 'semantic_similarity',
  STEP_LABEL: 'Semantic Similarity Discovery',
  LOG_PREFIX: 'SemanticSim',
  BUDGET_TYPE: 'ApiUsage'
}
```

---

## Implementation Phases

### Phase 1: Neo4j Foundation (1-2 weeks) ✅

**Deliverables:**
- [x] Neo4j AuraDB Free instance setup
- [x] Environment variables configured
- [x] `neo4jClient.js` with connection singleton
- [x] Graph schema created (constraints, indexes)
- [x] `Neo4jSyncService.js` with CRUD sync
- [x] Integration with ContactCRUDService

**Quick Win:** Company relationships work after sync ✅

### Phase 2: Relationship Discovery (2 weeks) ✅

**Deliverables:**
- [x] `RelationshipDiscoveryService.js`
- [x] Company detection (Neo4j query)
- [ ] Social proximity (reuse rulesGroupService) - *deferred*
- [x] Semantic similarity (Pinecone integration)
- [x] API route `/api/user/contacts/graph/discover`
- [x] Background job pattern with `DiscoveryJobManager.js`
- [x] API route `/api/user/contacts/graph/discover/status`

**Quick Win:** "Discover Relationships" button works ✅

### Phase 3: Graph Visualization (2 weeks) ✅

**Deliverables:**
- [x] Install react-force-graph-2d
- [x] `ContactGraph.jsx` component (with dynamic import wrapper)
- [x] `GraphControls.jsx`, `GraphLegend.jsx`
- [x] `GraphExplorerTab.jsx`
- [x] Integration with GroupManagerModal
- [x] API route `/api/user/contacts/graph`
- [x] API route `/api/user/contacts/graph/stats`
- [x] API route `/api/user/contacts/graph/settings`
- [x] localStorage caching in `useGraphData.js`

**Quick Win:** Interactive graph visualization works ✅

### Phase 4: Intelligent Groups (2 weeks) ✅

**Deliverables:**
- [x] 4 suggestion types: company, tag, semantic, knows
- [x] `findTagClusters()` Neo4j query
- [x] `findKnowsClusters()` Neo4j query
- [x] `GroupNamingService.js` with Gemini AI
- [x] Redis caching for AI names (1h TTL)
- [x] `GroupSuggestionsPanel.jsx` with tabs
- [x] Group creation from suggestions
- [x] API route `/api/user/contacts/graph/suggestions`

**Quick Win:** End-to-end flow: Discover → Review → Create Group ✅

### Phase 5: Polish (1 week) - *In Progress*

**Deliverables:**
- [x] Error handling and loading states
- [ ] Mobile responsiveness
- [x] Performance optimization (localStorage caching)
- [ ] Cost tracking dashboard integration
- [x] Documentation updates
- [x] Testing guide updated

**Quick Win:** Production-ready feature

---

## File Structure

### New Files

```
lib/services/serviceContact/server/
├── DiscoveryJobManager.js            # In-memory job tracking (globalThis pattern)
├── GroupNamingService.js             # AI-powered group naming with Redis cache
└── neo4j/
    ├── neo4jClient.js                # Connection singleton + cluster queries
    ├── Neo4jSyncService.js           # Firestore ↔ Neo4j sync
    ├── RelationshipDiscoveryService.js # Discovery + suggestions orchestration
    └── AIRelationshipInferenceService.js # Gemini inference (Business+)

app/api/user/contacts/graph/
├── route.js                          # GET graph data
├── discover/
│   ├── route.js                      # POST start discovery job
│   └── status/
│       └── route.js                  # GET poll job status
├── stats/
│   └── route.js                      # GET graph statistics
├── settings/
│   └── route.js                      # GET/POST graph settings
└── suggestions/
    └── route.js                      # GET AI group suggestions

app/dashboard/(dashboard pages)/contacts/components/GraphVisualization/
├── ContactGraph.jsx                  # Main graph (ForceGraph2D wrapper)
├── GraphControls.jsx                 # Toolbar controls
├── GraphLegend.jsx                   # Node/edge legend
├── NodeTooltip.jsx                   # Hover information
├── NodeContextMenu.jsx               # Right-click menu
├── GraphExplorerTab.jsx              # Tab container
├── GroupSuggestionsPanel.jsx         # Suggestions sidebar
└── hooks/
    ├── useGraphData.js               # Data fetching + localStorage cache
    ├── useGraphLayout.js             # Layout algorithms
    └── useGraphInteractions.js       # Event handlers
```

### Modified Files

| File | Changes |
|------|---------|
| `lib/services/serviceContact/server/ContactCRUDService.js` | Add Neo4j sync in CRUD methods |
| `app/dashboard/.../GroupManagerModal.jsx` | Add GraphExplorerTab |
| `lib/services/serviceContact/client/constants/contactConstants.js` | Add feature flags |
| `lib/services/constants/aiCosts.js` | Add cost configs |
| `.env.local` | Add Neo4j credentials |
| `package.json` | Add neo4j-driver, react-force-graph-2d, react-force-graph-3d |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Neo4j Free tier limits | Low | Medium | Only sync Premium+; prune old data; monitor node count |
| AI cost spike | Medium | Medium | Redis caching (24h TTL); rate limiting; budget caps |
| Graph performance | Low | Low | WebGL rendering; limit initial nodes; progressive loading |
| Sync failures | Medium | Low | Fire-and-forget pattern; retry queue; graceful degradation |
| User confusion | Medium | Medium | Clear onboarding; tooltips; documentation |

### Monitoring Points

- Neo4j node/relationship count (alert at 80% capacity)
- Discovery operation duration
- AI inference costs per user
- Graph rendering time
- Sync failure rate

---

## References

### External Documentation
- [Neo4j + Pinecone: Better Together](https://www.pinecone.io/learn/vectors-and-graphs-better-together/)
- [Neo4j AuraDB Pricing](https://neo4j.com/pricing/)
- [react-force-graph-2d](https://github.com/vasturiano/react-force-graph)
- [Cytoscape.js](https://js.cytoscape.org/)
- [Microsoft GraphRAG](https://microsoft.github.io/graphrag/)

### Internal Documentation
- `SEMANTIC_SEARCH_ARCHITECTURE_V2.md` - Pinecone integration
- `PHASE5_AUTO_TAGGING_MIGRATION.md` - Auto-tagging system
- `LOCATION_SERVICES_AUTO_TAGGING_SPEC.md` - Location enrichment

---

**Document Status:** Active
**Created:** 2025-11-25
**Updated:** 2025-11-25
**Author:** Claude + Leo
**Version:** 1.3

### Changelog

**v1.3 (2025-11-25)**
- Added 3D visualization mode with `react-force-graph-3d`
- Added viewMode state lifting pattern (ContactGraph → GraphExplorerTab)
- Documented 2D vs 3D API differences (centerAt/zoom vs cameraPosition)
- Added Advanced Filters feature (filter by specific company/tag names)
- Added `selectedCompanies` and `selectedTags` filter state
- Updated UI mockup with fullscreen view showing 3D toggle and Advanced Filters panel

**v1.2 (2025-11-25)**
- Added 4 suggestion types: company, tag, semantic, knows
- Added `findTagClusters()` and `findKnowsClusters()` Neo4j queries
- Added `GroupNamingService.js` with Gemini AI for creative group names
- Added Redis caching for AI-generated names (1h TTL)
- Updated API specification for `/suggestions` endpoint with all 4 types
- Marked Phase 4 (Intelligent Groups) as completed

**v1.1 (2025-11-25)**
- Changed caching from Redis to localStorage (client-side, 1h TTL)
- Added background job pattern for discovery operations (prevents timeouts)
- Added `DiscoveryJobManager.js` with `globalThis` for Next.js module isolation
- Added ForceGraph2D wrapper pattern for dynamic import with refs
- Added new API endpoints: `/discover/status`, `/settings`, `/stats`
- Updated implementation phases with completion status
