---
id: features-tiered-confidence-021
title: Tiered Confidence Relationship Discovery System
category: features
tags: [neo4j, graph, relationships, discovery, confidence, llm, review, pinecone, semantic-similarity]
status: draft
created: 2025-11-25
updated: 2025-11-25
related:
  - INTELLIGENT_GROUPS_NEO4J_SPEC.md
  - NEO4J_GRAPH_EXPLORER_TESTING_GUIDE.md
functions:
  - discoverSemanticSimilarity()
  - discoverTagRelationships()
  - assessMediumConfidenceRelationship()
  - approveRelationship()
  - rejectRelationship()
  - batchApprove()
  - batchReject()
components:
  - PendingRelationshipsPanel
  - RelationshipReviewCard
  - GraphExplorerTab
---

# Tiered Confidence Relationship Discovery System

## Overview

This guide documents the tiered confidence system for relationship discovery in the contact graph visualization feature. Instead of auto-saving all discovered relationships to Neo4j, the system classifies relationships into three confidence tiers (HIGH, MEDIUM, LOW) with different handling for each.

**Key Benefits:**
- Reduces false positives in the graph
- Gives users control over what gets saved
- Provides visibility into discovered relationships before they're committed
- Uses LLM assessment to explain uncertain relationships

## Problem Statement

When users click "Discover Relationships", the current system:
1. Immediately saves ALL discovered relationships to Neo4j
2. Provides no review/approval step
3. Can generate 100+ relationships with many false positives
4. Offers no visibility into what changed

## Solution Architecture

### Three-Tier Confidence System

```
Discovery Triggered
       │
       ▼
┌─────────────────────────────────┐
│  RelationshipDiscoveryService   │
│  classifies each relationship   │
│  into HIGH/MEDIUM/LOW           │
└─────────────────────────────────┘
       │
       ├─── HIGH ────▶ Auto-save to Neo4j ────▶ Shows in graph immediately
       │
       ├─── MEDIUM ──▶ Store in job result ──▶ Show in PendingRelationshipsPanel
       │                                        │
       │                                        ▼
       │                              User clicks "Get AI Assessment"
       │                                        │
       │                                        ▼
       │                              LLM explains relationship
       │                                        │
       │                                        ▼
       │                              User approves/rejects
       │                                        │
       │                                        ▼
       │                              If approved → Save to Neo4j
       │
       └─── LOW ─────▶ Store in job result ──▶ Show in "Potential" tab
                                                │
                                                ▼
                                      User can approve to save
```

## Confidence Thresholds

### Semantic Similarity (Pinecone Vector Scores)

| Tier | Score Range | Action |
|------|-------------|--------|
| **HIGH** | >= 0.60 | Auto-save to Neo4j |
| **MEDIUM** | 0.35 - 0.59 | Show for review (LLM assessment available) |
| **LOW** | 0.20 - 0.34 | Show as "potential" |
| **Excluded** | < 0.20 | Don't surface |

### Tag Overlap

| Tier | Shared Tags | Action |
|------|-------------|--------|
| **HIGH** | >= 4 tags | Auto-save |
| **MEDIUM** | 3 tags | Show for review |
| **LOW** | 2 tags | Show as potential |

### Company Detection

| Tier | Condition |
|------|-----------|
| **HIGH** | Explicit company field match OR corporate email domain |
| **MEDIUM** | Fuzzy company name matching |

## Implementation Details

### Constants Definition

**File:** `lib/services/serviceContact/client/constants/contactConstants.js`

```javascript
/**
 * Relationship Discovery Confidence Tiers
 */
export const RELATIONSHIP_CONFIDENCE_TIERS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Thresholds for relationship confidence classification
 */
export const RELATIONSHIP_DISCOVERY_THRESHOLDS = {
  semantic: {
    high: 0.60,    // Auto-save threshold
    medium: 0.35,  // Review threshold
    low: 0.20      // Potential threshold (minimum)
  },
  tags: {
    high: 4,       // 4+ shared tags
    medium: 3,     // 3 shared tags
    low: 2         // 2 shared tags (current minimum)
  }
};

/**
 * Relationship review status
 */
export const RELATIONSHIP_STATUS = {
  CONFIRMED: 'confirmed',       // Saved to Neo4j
  PENDING_REVIEW: 'pending',    // Awaiting user review
  REJECTED: 'rejected',         // User rejected
  POTENTIAL: 'potential'        // Low confidence, not saved
};
```

### Service Layer Changes

#### RelationshipDiscoveryService.js

**Location:** `lib/services/serviceContact/server/neo4j/RelationshipDiscoveryService.js`

**Modified Methods:**

1. **`discoverSemanticSimilarity()`**
   - Classifies each Pinecone match into HIGH/MEDIUM/LOW tier
   - Only auto-saves HIGH confidence relationships to Neo4j
   - Returns tiered results structure

2. **`discoverTagRelationships()`**
   - Same tiered approach based on shared tag count
   - HIGH (4+ tags) auto-saved, others stored for review

3. **New: `assessMediumConfidenceRelationship()`**
   - Uses Gemini Flash to explain WHY contacts might be related
   - Returns: explanation, connectionType, confidence (1-10), suggestedAction

**Tiered Results Structure:**

```javascript
{
  relationships: {
    high: [
      {
        sourceId: 'contact_1',
        targetId: 'contact_2',
        sourceName: 'John Doe',
        targetName: 'Jane Smith',
        type: 'SIMILAR_TO',
        method: 'pinecone_embedding',
        score: 0.72,
        confidence: 'high',
        savedToNeo4j: true
      }
    ],
    medium: [
      {
        sourceId: 'contact_3',
        targetId: 'contact_4',
        sourceName: 'Bob Wilson',
        targetName: 'Alice Brown',
        type: 'SIMILAR_TO',
        method: 'pinecone_embedding',
        score: 0.48,
        confidence: 'medium',
        savedToNeo4j: false,
        llmAssessment: null  // Populated on-demand
      }
    ],
    low: [...]
  },
  counts: {
    high: 10,
    medium: 15,
    low: 25,
    total: 50
  }
}
```

#### RelationshipReviewService.js (New)

**Location:** `lib/services/serviceContact/server/neo4j/RelationshipReviewService.js`

**Methods:**

| Method | Purpose |
|--------|---------|
| `getPendingRelationships(userId, jobId, tier)` | Get pending relationships for review |
| `approveRelationship(userId, relationshipData, jobId)` | Approve and save to Neo4j |
| `rejectRelationship(userId, relationshipData, jobId)` | Mark as rejected |
| `batchApprove(userId, relationships, jobId)` | Batch approve multiple |
| `batchReject(userId, relationships, jobId)` | Batch reject multiple |

#### DiscoveryJobManager.js

**Location:** `lib/services/serviceContact/server/DiscoveryJobManager.js`

**New Methods:**

| Method | Purpose |
|--------|---------|
| `updateRelationshipResults(jobId, relationships, counts)` | Store tiered results |
| `getPendingRelationships(jobId, tier)` | Retrieve pending by tier |
| `markRelationshipReviewed(jobId, sourceId, targetId, status)` | Update review status |
| `storeAssessment(jobId, sourceId, targetId, assessment)` | Cache LLM assessment |

### API Endpoints

#### Modified Endpoints

**GET `/api/user/contacts/graph/discover/status`**

Returns additional fields:
```javascript
{
  jobId: 'job_xxx',
  status: 'completed',
  progress: 100,
  // NEW FIELDS:
  relationshipCounts: { high: 10, medium: 15, low: 25 },
  hasPendingRelationships: true
}
```

#### New Endpoints

**GET `/api/user/contacts/graph/relationships/pending`**

Query params: `jobId`, `tier` (default: 'medium')

Response:
```javascript
{
  success: true,
  relationships: [...],
  total: 15,
  reviewed: 3,
  tier: 'medium'
}
```

**POST `/api/user/contacts/graph/relationships/review`**

Body:
```javascript
{
  action: 'approve' | 'reject',
  relationships: [...],
  jobId: 'job_xxx'
}
```

Response:
```javascript
{
  success: true,
  action: 'approve',
  approved: 5,
  failed: 0
}
```

**POST `/api/user/contacts/graph/relationships/assess`**

Body:
```javascript
{
  sourceId: 'contact_1',
  targetId: 'contact_2',
  jobId: 'job_xxx'
}
```

Response:
```javascript
{
  success: true,
  assessment: {
    explanation: "Both contacts work in healthcare technology...",
    connectionType: 'industry',
    confidence: 7,
    suggestedAction: 'approve'
  },
  cached: false
}
```

### UI Components

#### PendingRelationshipsPanel.jsx (New)

**Location:** `app/dashboard/(dashboard pages)/contacts/components/GraphVisualization/`

**Features:**
- Shows after discovery completes (if pending relationships exist)
- Two tabs: "Medium Confidence" / "Low Confidence"
- Batch actions: Select all, Approve Selected, Reject Selected
- Count badges on each tab

#### RelationshipReviewCard.jsx (New)

**Location:** `app/dashboard/(dashboard pages)/contacts/components/GraphVisualization/`

**Features:**
- Shows: source name → target name
- Badge: "X% match" with method (Semantic/Tags)
- LLM assessment box (expandable, if available)
- Action buttons: Approve (✓), Reject (✗), Get AI Assessment (💡)
- Checkbox for batch selection

#### GraphExplorerTab.jsx (Modified)

**Changes:**
- Add `showPendingPanel` state
- Show `PendingRelationshipsPanel` after discovery completes
- Wire up approval/rejection handlers
- Auto-refresh graph after approvals

#### useGraphData.js (Extended)

**New State:**
- `pendingRelationships: { medium: [], low: [] }`
- `isReviewLoading: boolean`

**New Methods:**
- `fetchPendingRelationships(jobId, tier)`
- `approveRelationship(rel)`
- `rejectRelationship(rel)`
- `batchApproveRelationships(rels)`
- `batchRejectRelationships(rels)`
- `requestAssessment(rel)`

## LLM Assessment Details

### Gemini Flash Integration

**When:** User clicks "Get AI Assessment" on a medium-confidence relationship

**Prompt Structure:**
```
Analyze why these two professional contacts might be related.

SOURCE CONTACT:
- Name: [name]
- Company: [company]
- Job Title: [title]
- Tags: [tags]
- Notes: [notes excerpt]

TARGET CONTACT:
- Name: [name]
- Company: [company]
- Job Title: [title]
- Tags: [tags]
- Notes: [notes excerpt]

RELATIONSHIP CONTEXT:
- Discovery Method: [semantic/tags]
- Similarity Score: [X]%

Provide a brief (2-3 sentence) explanation of why these contacts
might be professionally related, and rate your confidence (1-10).

Respond in JSON format:
{
  "explanation": "...",
  "connectionType": "colleague|industry|interest|geography|other",
  "confidence": 7,
  "suggestedAction": "approve|review|skip"
}
```

### Cost Considerations

| Item | Cost |
|------|------|
| Per assessment | ~$0.0005 |
| When triggered | On-demand only (user clicks) |
| Caching | Stored in job result to avoid duplicates |

## File Structure

### Files to Modify

| File | Changes |
|------|---------|
| `contactConstants.js` | Add tier constants and thresholds |
| `RelationshipDiscoveryService.js` | Tiered classification logic |
| `DiscoveryJobManager.js` | Tiered results storage methods |
| `discover/status/route.js` | Return counts and pending flag |
| `GraphExplorerTab.jsx` | Show review panel |
| `useGraphData.js` | Add review methods |

### Files to Create

| File | Purpose |
|------|---------|
| `RelationshipReviewService.js` | Review/approve/reject logic |
| `relationships/pending/route.js` | GET pending relationships |
| `relationships/review/route.js` | POST approve/reject |
| `relationships/assess/route.js` | POST LLM assessment |
| `PendingRelationshipsPanel.jsx` | Review UI panel |
| `RelationshipReviewCard.jsx` | Individual relationship card |

## Edge Cases

### 1. Job Expiration

**Problem:** Jobs expire after 1 hour. Pending relationships lost if not reviewed.

**Mitigation:**
- Show warning banner when job has < 15 minutes remaining
- Consider: Persist to Firestore for Premium+ users

### 2. Large Contact Sets

**Problem:** 1000+ contacts could generate hundreds of pending relationships.

**Mitigation:**
- Pagination in pending relationships panel
- "Approve all medium confidence" quick action
- Sort by score (highest first)

### 3. Page Refresh During Review

**Problem:** User refreshes page, loses UI state.

**Mitigation:**
- Job results persist in DiscoveryJobManager until expired
- Re-fetch pending relationships on component mount
- Store `lastJobId` in localStorage

## Neo4j Schema Updates

**New Relationship Properties:**

```cypher
// For reviewed relationships
(c1)-[r:SIMILAR_TO {
  score: 0.48,
  method: 'pinecone_embedding',
  confidence: 'medium',           // NEW
  reviewStatus: 'user_approved',  // NEW: auto_approved | user_approved
  reviewedAt: datetime(),         // NEW
  llmAssessment: '...',           // NEW (optional)
  updatedAt: datetime()
}]-(c2)
```

## Testing Checklist

- [ ] HIGH confidence relationships auto-saved
- [ ] MEDIUM confidence shown in review panel
- [ ] LOW confidence shown in "Potential" tab
- [ ] LLM assessment returns valid JSON
- [ ] Batch approve saves all to Neo4j
- [ ] Batch reject removes from pending
- [ ] Graph refreshes after approvals
- [ ] Job expiration warning shows
- [ ] Pagination works for large sets

## Related Documentation

- [INTELLIGENT_GROUPS_NEO4J_SPEC.md](./INTELLIGENT_GROUPS_NEO4J_SPEC.md) - Full Neo4j integration spec
- [NEO4J_GRAPH_EXPLORER_TESTING_GUIDE.md](../testing/NEO4J_GRAPH_EXPLORER_TESTING_GUIDE.md) - Testing procedures

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-25 | 1.0 | Initial draft with full architecture |
