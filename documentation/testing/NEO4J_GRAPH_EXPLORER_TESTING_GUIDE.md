---
id: testing-neo4j-graph-explorer-083
title: Neo4j Graph Explorer Manual Testing Guide
category: testing
tags: [testing, manual-testing, neo4j, graph-explorer, graph-visualization, intelligent-groups, relationship-discovery, contacts]
status: active
created: 2025-11-25
updated: 2025-11-25
version: 1.0.0
related:
  - PHASE5_AUTO_TAGGING_MIGRATION.md
  - SEMANTIC_SEARCH_ARCHITECTURE_V2.md
  - DUAL_SYSTEM_TESTING_GUIDE.md
---

# Neo4j Graph Explorer - Manual Testing Guide

**Version:** 1.0
**Date:** 2025-11-25
**Purpose:** End-to-end validation of Neo4j integration, Graph Explorer visualization, and Intelligent Group creation

---

## 📋 Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Test Environment Configuration](#test-environment-configuration)
3. [Test Workflow Overview](#test-workflow-overview)
4. [Test Cases (1-10)](#test-cases)
5. [Validation Checklist](#validation-checklist)
6. [Results Template](#results-template)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Setup Instructions

### Prerequisites

1. **Dev server running:** `npm run dev`
2. **Neo4j AuraDB:** Verify connection with environment variables:
   - `NEO4J_URI` - Your Neo4j AuraDB connection string
   - `NEO4J_USERNAME` - Usually "neo4j"
   - `NEO4J_PASSWORD` - Your password
3. **Firestore access:** Firebase console open
4. **Browser console:** Open for detailed logs
5. **Premium+ subscription:** Graph Explorer requires Premium or higher

### Test Data Setup

Run the test contacts script to populate 100 contacts across 10 companies:

```bash
node tests/neo4jTestContacts.mjs
```

Expected output:
```
Neo4j Test Contacts Script (100 Contacts)
============================================================
User ID: [your-user-id]
Creating 100 test contacts...

Progress: 10/100 contacts created...
Progress: 20/100 contacts created...
...
SUMMARY
============================================================
Total contacts: 100
Created & synced: 100
Failed: 0

COMPANY DISTRIBUTION
============================================================
  Tesla, Inc.: 10 contacts
  Google: 10 contacts
  Microsoft: 10 contacts
  ...
```

### Feature Flag Verification

Navigate to Firestore: `users/{userId}` or check via subscription level

Required features:
- `GRAPH_VISUALIZATION` - Enables Graph Explorer tab
- `INTELLIGENT_GROUPS` - Enables group creation from suggestions

---

## 🧪 Test Workflow Overview

The complete user workflow for Graph Explorer:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. Create      │────▶│  2. Firestore   │────▶│  3. Neo4j       │
│     Contact     │     │     Saved       │     │     Synced      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
┌─────────────────┐     ┌─────────────────┐            │
│  6. Create      │◀────│  5. View        │◀───────────┘
│     Group       │     │     Suggestions │
└─────────────────┘     └─────────────────┘
        │                       ▲
        │               ┌───────┴───────┐
        │               │  4. Discover  │
        │               │  Relationships│
        │               └───────────────┘
        ▼
┌─────────────────┐
│  7. Verify      │
│     Group       │
└─────────────────┘
```

---

## 🧪 Test Cases

### Test 1: Contact Creation → Neo4j Sync

**Priority:** P0
**Goal:** Verify a new contact syncs to Neo4j automatically

**Steps:**
1. Create a new contact with company information:
   ```javascript
   {
     name: "Test User GraphTest",
     email: "test.graph@tesla.com",
     company: "Tesla, Inc.",
     jobTitle: "Engineer",
     tags: ["engineering", "ai"]
   }
   ```
2. Wait 2-3 seconds for fire-and-forget sync
3. Check server logs for Neo4j sync confirmation

**Expected Behavior:**
- ✅ Contact saved to Firestore
- ✅ Server logs show: `[Neo4jSync] Syncing contact: [contactId]`
- ✅ Server logs show: `[Neo4jSync] Contact synced successfully`
- ✅ Company node created/linked: "Tesla, Inc."
- ✅ Tag nodes created/linked: "engineering", "ai"

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE NEO4J SYNC LOGS HERE]
```

**✅ Validation Checklist:**
- [ ] Contact appears in contact list
- [ ] Neo4j sync log shows success
- [ ] No errors in server console

---

### Test 2: Graph API Stats Endpoint

**Priority:** P0
**Goal:** Verify `/api/user/contacts/graph/stats` returns correct counts

**Steps:**
1. Open browser DevTools → Network tab
2. Navigate to Contacts page
3. Open Group Manager modal
4. Click "Graph Explorer" tab
5. Observe the stats API call

**Expected Behavior:**
- ✅ API returns 200 OK
- ✅ Response includes:
  ```json
  {
    "contactCount": 100,
    "companyCount": 10,
    "tagCount": 25,
    "similarityCount": 0
  }
  ```
- ✅ Stats bar displays: "Contacts: 100 | Companies: 10 | Tags: 25"

**📝 Paste Results Below:**

#### API Response:
```json
{
  "PASTE /api/user/contacts/graph/stats RESPONSE HERE"
}
```

**✅ Validation Checklist:**
- [ ] Stats API returns 200
- [ ] contactCount matches contact list count
- [ ] companyCount = 10 (from test script)
- [ ] Stats display in UI

---

### Test 3: Graph Data Fetch

**Priority:** P0
**Goal:** Verify `/api/user/contacts/graph` returns nodes and edges

**Steps:**
1. In Graph Explorer tab, observe network request to `/api/user/contacts/graph`
2. Check response payload structure

**Expected Behavior:**
- ✅ Response includes `nodes` array with Contact, Company, Tag nodes
- ✅ Response includes `links` array with WORKS_AT, HAS_TAG relationships
- ✅ Each node has: `id`, `type`, `name`, `label`
- ✅ Each link has: `source`, `target`, `type`

**📝 Paste Results Below:**

#### API Response (sample):
```json
{
  "nodes": [
    {"SAMPLE NODE"}
  ],
  "links": [
    {"SAMPLE LINK"}
  ]
}
```

**✅ Validation Checklist:**
- [ ] Nodes array is non-empty
- [ ] Links array is non-empty
- [ ] Node types include: Contact, Company, Tag
- [ ] Link types include: WORKS_AT, HAS_TAG

---

### Test 4: Discover Relationships

**Priority:** P0
**Goal:** Verify "Discover Relationships" button triggers Neo4j analysis

**Steps:**
1. In Graph Explorer tab, click "Discover Relationships" button
2. Wait for discovery to complete (may take 5-15 seconds)
3. Observe console logs and API response

**Expected Behavior:**
- ✅ Button shows loading state: "Discovering..."
- ✅ Server calls `/api/user/contacts/graph/discover` (POST)
- ✅ Server logs show relationship discovery progress
- ✅ Response includes discovered relationships count
- ✅ Stats update to show SIMILAR_TO relationships

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE DISCOVERY LOGS HERE]
```

#### API Response:
```json
{
  "PASTE DISCOVER RESPONSE HERE"
}
```

**✅ Validation Checklist:**
- [ ] Button shows loading state
- [ ] API returns 200
- [ ] Discovery logs show company detection
- [ ] Stats refresh after discovery

---

### Test 5: Graph Visualization Rendering

**Priority:** P0
**Goal:** Verify react-force-graph-2d renders the graph correctly

**Steps:**
1. After data loads, observe the graph canvas
2. Verify nodes are visible and colored correctly
3. Verify links connect nodes appropriately
4. Try zooming (scroll) and panning (drag)

**Expected Behavior:**
- ✅ Graph canvas renders (not blank)
- ✅ Purple nodes = Contacts
- ✅ Blue nodes = Companies
- ✅ Pink/Orange nodes = Tags
- ✅ Lines connect contacts to companies (WORKS_AT)
- ✅ Zoom and pan work smoothly

**📝 Paste Results Below:**

#### Visual Verification:
- Node count visible: ___
- Company clusters visible: ___
- Zoom works: YES/NO
- Pan works: YES/NO

**✅ Validation Checklist:**
- [ ] Graph renders without errors
- [ ] Nodes are color-coded by type
- [ ] Links visible between nodes
- [ ] Interactions (zoom/pan) work

---

### Test 6: Company Cluster Detection

**Priority:** P1
**Goal:** Verify contacts at the same company cluster together

**Steps:**
1. Observe the graph visualization
2. Look for company nodes (blue) with multiple contacts (purple) connected
3. Verify Tesla contacts cluster around "Tesla, Inc." node
4. Verify Google contacts cluster around "Google" node

**Expected Behavior:**
- ✅ 10 company clusters visible (one per company)
- ✅ Each company has ~10 contacts connected
- ✅ Freelance contacts may not cluster (no company node)

**📝 Paste Results Below:**

#### Cluster Observations:
```
Tesla cluster: ___ contacts
Google cluster: ___ contacts
Microsoft cluster: ___ contacts
...
```

**✅ Validation Checklist:**
- [ ] Company nodes visible
- [ ] Contacts link to their company
- [ ] ~10 contacts per company cluster
- [ ] Freelancers don't have company node

---

### Test 7: Tag Relationship Display

**Priority:** P1
**Goal:** Verify HAS_TAG relationships appear in the graph

**Steps:**
1. Look for tag nodes (pink/orange) in the graph
2. Verify contacts connect to their tag nodes
3. Click on a tag node to see connected contacts

**Expected Behavior:**
- ✅ Tag nodes visible with names like "engineering", "ai", "marketing"
- ✅ Multiple contacts connect to shared tags
- ✅ Clicking tag node highlights connections

**📝 Paste Results Below:**

#### Tag Observations:
```
Tags visible: ___
"engineering" tag connections: ___
"ai" tag connections: ___
```

**✅ Validation Checklist:**
- [ ] Tag nodes visible in graph
- [ ] Tags have correct names
- [ ] Multiple contacts per popular tag
- [ ] Node click shows connections

---

### Test 8: Group Suggestions API

**Priority:** P1
**Goal:** Verify `/api/user/contacts/graph/suggestions` returns intelligent group suggestions

**Steps:**
1. In Graph Explorer, look at the "Suggested Groups" sidebar
2. Check network request to `/api/user/contacts/graph/suggestions`
3. Verify suggestions based on companies

**Expected Behavior:**
- ✅ Suggestions appear in sidebar
- ✅ Company-based suggestions: "Tesla Team", "Google Team", etc.
- ✅ Each suggestion shows member count
- ✅ Each suggestion has type badge (company/semantic/tag)

**📝 Paste Results Below:**

#### API Response:
```json
{
  "suggestions": [
    {"PASTE SUGGESTION HERE"}
  ]
}
```

#### UI Display:
```
Suggestion 1: ___ (type: ___, members: ___)
Suggestion 2: ___ (type: ___, members: ___)
...
```

**✅ Validation Checklist:**
- [ ] Suggestions API returns 200
- [ ] At least 1 company-based suggestion
- [ ] Suggestions show member count
- [ ] Type badges display correctly

---

### Test 9: Create Group from Suggestion

**Priority:** P0
**Goal:** Verify clicking "+" creates an intelligent group

**Steps:**
1. In Suggested Groups sidebar, find "Tesla Team" or similar
2. Click the "+" button to create the group
3. Wait for group creation
4. Switch to "Groups" tab to verify

**Expected Behavior:**
- ✅ Group created with name from suggestion
- ✅ Group type: `intelligent_company`
- ✅ Group contains ~10 contacts (Tesla employees)
- ✅ Success message or tab switch to Groups
- ✅ Group visible in Groups tab

**📝 Paste Results Below:**

#### Group Created:
```json
{
  "name": "___",
  "type": "___",
  "contactCount": ___
}
```

**✅ Validation Checklist:**
- [ ] Group created successfully
- [ ] Group name matches suggestion
- [ ] Group type is `intelligent_company`
- [ ] Correct contacts in group
- [ ] Group appears in Groups tab

---

### Test 10: 100 Contacts Scale Performance

**Priority:** P2
**Goal:** Verify graph handles 100 contacts without performance issues

**Steps:**
1. Ensure all 100 test contacts are loaded
2. Open Graph Explorer
3. Observe graph render time
4. Interact with graph (zoom, pan, click)
5. Monitor browser performance (DevTools → Performance)

**Expected Behavior:**
- ✅ Graph loads within 3 seconds
- ✅ Interactions remain smooth (no lag)
- ✅ No console errors about WebGL
- ✅ Memory usage stable (no memory leaks)

**📝 Paste Results Below:**

#### Performance Metrics:
```
Initial render time: ___ ms
Graph nodes rendered: ___
Graph links rendered: ___
Memory before: ___ MB
Memory after: ___ MB
FPS during interaction: ___
```

**✅ Validation Checklist:**
- [ ] Graph renders within 3 seconds
- [ ] Smooth zoom/pan at 100 nodes
- [ ] No WebGL errors
- [ ] Memory stable after interactions

---

## ✅ Master Validation Checklist

### Neo4j Integration
- [ ] Contacts sync to Neo4j on creation
- [ ] Companies detected from email domains
- [ ] Tags created as nodes
- [ ] WORKS_AT relationships established
- [ ] HAS_TAG relationships established

### Graph Explorer UI
- [ ] Graph Explorer tab visible (Premium+)
- [ ] Stats bar shows correct counts
- [ ] Graph renders with force-directed layout
- [ ] Nodes color-coded by type
- [ ] Zoom and pan work

### Relationship Discovery
- [ ] "Discover Relationships" button works
- [ ] Company clusters detected
- [ ] Suggestions generated
- [ ] Stats update after discovery

### Intelligent Groups
- [ ] Suggestions appear in sidebar
- [ ] "+" button creates group
- [ ] Group contains correct contacts
- [ ] Group type is `intelligent_*`

### Performance
- [ ] 100 contacts render smoothly
- [ ] No memory leaks
- [ ] API responses < 2 seconds

---

## 📝 Results Template

```markdown
## Test Run: [DATE]

### Environment
- Browser: [Chrome/Firefox/Safari]
- Subscription: [Premium/Business/Enterprise]
- Contact Count: [100]
- Neo4j Connection: [OK/FAILED]

### Test Results Summary
| Test | Status | Notes |
|------|--------|-------|
| 1. Contact → Neo4j Sync | ✅/❌ | |
| 2. Graph Stats API | ✅/❌ | |
| 3. Graph Data Fetch | ✅/❌ | |
| 4. Discover Relationships | ✅/❌ | |
| 5. Graph Visualization | ✅/❌ | |
| 6. Company Clusters | ✅/❌ | |
| 7. Tag Relationships | ✅/❌ | |
| 8. Group Suggestions | ✅/❌ | |
| 9. Create Group | ✅/❌ | |
| 10. 100 Contacts Scale | ✅/❌ | |

### Issues Found
1. [Issue description]
2. [Issue description]

### Overall Status: PASS / PARTIAL / FAIL
```

---

## 🔧 Troubleshooting

### Graph Not Rendering

**Symptoms:** Blank canvas, loading forever

**Solutions:**
1. Check browser console for WebGL errors
2. Verify `react-force-graph-2d` is installed
3. Check that SSR is disabled in ContactGraph.jsx:
   ```javascript
   const ForceGraph2D = dynamic(
     () => import('react-force-graph-2d'),
     { ssr: false }
   );
   ```

### Neo4j Connection Failed

**Symptoms:** API returns 500, "Neo4j connection failed"

**Solutions:**
1. Verify environment variables:
   ```bash
   echo $NEO4J_URI
   echo $NEO4J_USERNAME
   echo $NEO4J_PASSWORD
   ```
2. Test connection manually:
   ```bash
   curl -X POST "$NEO4J_URI" -H "Authorization: Basic $(echo -n neo4j:$NEO4J_PASSWORD | base64)"
   ```
3. Check Neo4j AuraDB console for instance status

### Stats Show Zero

**Symptoms:** contactCount, companyCount all show 0

**Solutions:**
1. Run test contacts script: `node tests/neo4jTestContacts.mjs`
2. Verify Neo4j sync logs show success
3. Check Neo4j browser for nodes: `MATCH (n) RETURN count(n)`

### Suggestions Empty

**Symptoms:** "No suggestions yet" even after discovery

**Solutions:**
1. Click "Discover Relationships" first
2. Verify contacts have company information
3. Check API response for errors
4. Verify GroupSuggestionService is implemented

### Integer Object Error

**Symptoms:** "Objects are not valid as a React child (found: object with keys {low, high})"

**Solutions:**
This is a Neo4j integer format issue. The fix should already be in place:
```javascript
// GraphExplorerTab.jsx
const toNumber = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'object' && 'low' in val) return val.low;
  return Number(val) || 0;
};
```

---

## 📚 Related Documentation

- [Semantic Search Architecture V2](../infrastructure/SEMANTIC_SEARCH_ARCHITECTURE_V2.md)
- [Phase 5 Auto-Tagging Migration](../infrastructure/PHASE5_AUTO_TAGGING_MIGRATION.md)
- [Dual System Testing Guide](./DUAL_SYSTEM_TESTING_GUIDE.md)

---

*This testing guide validates the Neo4j Graph Explorer feature for Weavink contacts.*
