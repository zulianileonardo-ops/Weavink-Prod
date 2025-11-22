---
id: infrastructure-session-comparison-001
title: Session vs Standalone Cost Tracking - Decision Guide
category: technical
tags: [session-tracking, cost-tracking, api-usage, architecture, decision-guide]
status: active
created: 2025-11-22
updated: 2025-11-22
related:
  - SESSION_BASED_ENRICHMENT.md
  - SESSION_TRACKING_FIX.md
  - COST_TRACKING_MIGRATION_GUIDE.md
---

# Session vs Standalone Cost Tracking - Decision Guide

## Quick Comparison

| Aspect | Session-Based | Standalone |
|--------|---------------|------------|
| **Use Case** | Multi-step logical operations | Single, independent operations |
| **Storage** | `SessionUsage/{userId}/sessions/{sessionId}` | `ApiUsage/{userId}/monthly/{YYYY-MM}` |
| **Cost Tracking** | Aggregated across steps | Individual operation |
| **Audit Trail** | Detailed step-by-step | Operation summary |
| **Budget Impact** | Atomic (all or nothing) | Per-operation |
| **Query Speed** | Slower (detailed) | Faster (pre-aggregated) |
| **Example** | Geocoding → Venue Search → Enrichment | Single reverse geocoding call |

## Decision Tree

```
Is this a multi-step operation?
├─ YES → Do the steps form a logical unit?
│  ├─ YES → Use Session-Based Tracking ✓
│  └─ NO → Use Standalone for each step
│
└─ NO → Is this a single API call?
   └─ YES → Use Standalone Tracking ✓
```

## Session-Based Tracking

### When to Use

✅ **Multi-step operations** where steps are logically related:
- Location enrichment (geocoding + venue search)
- Business card scanning (OCR + field extraction + validation)
- Semantic search (vector search + reranking + formatting)
- Group generation (centroid calculation + venue search + member aggregation)

✅ **Atomic cost requirements**:
- Need to track total cost across multiple API calls
- Want detailed step-by-step audit trail
- Steps should succeed/fail as a unit

✅ **Complex workflows**:
- Operations with conditional steps (cache hit/miss)
- Operations with error recovery
- Operations needing cost breakdown by phase

### Architecture

```javascript
// 1. Generate session ID
const sessionId = `session_${feature}_${Date.now()}_${randomString}`;

// 2. Execute steps with session tracking
await CostTrackingService.recordUsage({
  userId,
  sessionId,  // ← Links all steps together
  feature: 'step_1_operation',
  cost: 0.005,
  stepLabel: 'Step 1: Description',
  metadata: { ... }
});

await CostTrackingService.recordUsage({
  userId,
  sessionId,  // ← Same session
  feature: 'step_2_operation',
  cost: 0.032,
  stepLabel: 'Step 2: Description',
  metadata: { ... }
});

// 3. Finalize session
await SessionTrackingService.finalizeSession({
  userId,
  sessionId
});
```

### Database Structure

**SessionUsage Collection**:
```
SessionUsage/
  {userId}/
    sessions/
      {sessionId}/
        feature: "location"
        status: "completed"
        totalCost: 0.037
        totalRuns: 2
        createdAt: Timestamp
        completedAt: Timestamp
        steps: [
          {
            stepLabel: "Step 1: Reverse Geocoding"
            cost: 0.005
            isBillableRun: true
            metadata: { city, country, ... }
          },
          {
            stepLabel: "Step 2: Venue Search"
            cost: 0.032
            isBillableRun: true
            metadata: { venueName, distance, ... }
          }
        ]
```

### Code Flow

```
recordUsage({ sessionId: 'session_123' })
         ↓
CostTrackingService checks: sessionId provided?
         ↓ YES
SessionTrackingService.addStepToSession()
         ↓
Creates/Updates SessionUsage document
         ↓
Aggregates: steps[], totalCost, totalRuns
         ↓
Returns: { recordedIn: 'SessionUsage' }
         ↓
User monthly counters updated during step recording
```

### Pros

✅ **Detailed audit trail** - Every step tracked with metadata
✅ **Atomic cost tracking** - Total cost across all steps
✅ **Error analysis** - See exactly which step failed
✅ **Cost attribution** - Know which phase consumed budget
✅ **Debugging** - Trace entire operation flow

### Cons

❌ **Slower queries** - More complex data structure
❌ **More storage** - Detailed step metadata
❌ **Requires finalization** - Must mark session complete
❌ **No aggregation** - Need to process sessions for analytics

### Example: Location Enrichment

```javascript
// lib/services/serviceContact/server/LocationEnrichmentService.js

static async enrichContact(contact, userId, userData, sessionId) {
  const sessionId = `session_enrich_${Date.now()}_${randomString}`;

  // Step 1: Reverse Geocoding ($0.005)
  const addressData = await reverseGeocode(latitude, longitude);
  await CostTrackingService.recordUsage({
    userId,
    sessionId,
    feature: 'location_reverse_geocoding',
    cost: 0.005,
    isBillableRun: true,
    stepLabel: 'Step 1: Reverse Geocoding',
    metadata: { city: addressData.city, country: addressData.country }
  });

  // Step 2: Venue Search ($0 cached, $0.032 API)
  const venue = await searchNearbyVenue(latitude, longitude);
  await CostTrackingService.recordUsage({
    userId,
    sessionId,  // ← Same session
    feature: venue.cached ? 'location_venue_search_cached' : 'location_venue_search',
    cost: venue.cached ? 0 : 0.032,
    isBillableRun: !venue.cached,
    stepLabel: 'Step 2: Venue Search',
    metadata: { venueName: venue.name, cacheHit: venue.cached }
  });

  // Finalize
  await SessionTrackingService.finalizeSession({ userId, sessionId });

  return enrichedContact;
}
```

**Result**:
- SessionUsage has ONE session with 2 steps
- ApiUsage is EMPTY (no standalone entries)
- Total cost tracked in session: $0.005 - $0.037

---

## Standalone Tracking

### When to Use

✅ **Single operations** that are complete on their own:
- One reverse geocoding call (no enrichment)
- Single Google Maps autocomplete request
- One-off PlacesService.textSearch()
- Isolated AI embedding generation

✅ **Independent API calls**:
- No logical relationship to other operations
- Don't need step-by-step tracking
- Want fast aggregated analytics

✅ **Simple workflows**:
- One request, one response
- No conditional logic
- No multi-phase processing

### Architecture

```javascript
// Single operation - no sessionId
await CostTrackingService.recordUsage({
  userId,
  sessionId: null,  // ← Standalone
  usageType: 'ApiUsage',
  feature: 'google_maps_geocoding',
  cost: 0.005,
  isBillableRun: true,
  provider: 'google_maps',
  metadata: { ... }
});
```

### Database Structure

**ApiUsage Collection**:
```
ApiUsage/
  {userId}/
    monthly/
      2025-11/
        totalCost: 0.025
        totalRuns: 5
        totalApiCalls: 5
        featureBreakdown: {
          google_maps_geocoding: {
            cost: 0.025
            runs: 5
            apiCalls: 5
          }
        }
        providerBreakdown: {
          google_maps: {
            cost: 0.025
            runs: 5
          }
        }
```

### Code Flow

```
recordUsage({ sessionId: null })
         ↓
CostTrackingService checks: sessionId provided?
         ↓ NO
Update monthly aggregation documents
         ↓
ApiUsage/{userId}/monthly/{YYYY-MM}
         ↓
Increment: totalCost, totalRuns, featureBreakdown
         ↓
Returns: { recordedIn: 'ApiUsage' }
```

### Pros

✅ **Fast queries** - Pre-aggregated monthly data
✅ **Simple structure** - No session complexity
✅ **Immediate analytics** - Monthly totals ready
✅ **Less storage** - Aggregated data only

### Cons

❌ **No step detail** - Can't see operation phases
❌ **No atomic tracking** - Each call tracked separately
❌ **Limited audit** - Only operation-level tracking
❌ **No relationship** - Can't link related operations

### Example: Single Geocoding

```javascript
// app/api/user/contacts/geocode/route.js

export async function GET(request) {
  const { latitude, longitude, userId } = parseQuery(request);

  // Single geocoding operation - NO sessionId
  const address = await reverseGeocode(latitude, longitude);

  // Track as standalone
  await CostTrackingService.recordUsage({
    userId,
    sessionId: null,  // ← Standalone
    usageType: 'ApiUsage',
    feature: 'google_maps_geocoding',
    cost: 0.005,
    isBillableRun: true,
    provider: 'google_maps',
    metadata: {
      latitude,
      longitude,
      city: address.city,
      country: address.country
    }
  });

  return Response.json({ address });
}
```

**Result**:
- SessionUsage is EMPTY (no session)
- ApiUsage has monthly record with cost $0.005
- Fast monthly aggregation queries

---

## Common Patterns

### Pattern 1: Location Enrichment (Session)

```javascript
// ✅ USE SESSION - Multi-step logical operation

const sessionId = `session_enrich_${Date.now()}_${randomString}`;

// Step 1: Geocoding
await recordUsage({ userId, sessionId, feature: 'geocoding', cost: 0.005 });

// Step 2: Venue Search
await recordUsage({ userId, sessionId, feature: 'venue_search', cost: 0.032 });

// Finalize
await finalizeSession({ userId, sessionId });

// Tracks: SessionUsage with 2 steps, total $0.037
```

### Pattern 2: Simple Geocoding (Standalone)

```javascript
// ✅ USE STANDALONE - Single independent operation

await recordUsage({
  userId,
  sessionId: null,  // Standalone
  feature: 'google_maps_geocoding',
  cost: 0.005
});

// Tracks: ApiUsage monthly record, $0.005
```

### Pattern 3: Group Venue Search (Session)

```javascript
// ✅ USE SESSION - Multi-step with centroid calculation

const sessionId = `session_group_${Date.now()}_${randomString}`;

// Step 1: Calculate centroid
await recordUsage({ userId, sessionId, feature: 'centroid_calc', cost: 0 });

// Step 2: Venue search
await recordUsage({ userId, sessionId, feature: 'venue_search', cost: 0.032 });

await finalizeSession({ userId, sessionId });
```

### Pattern 4: Autocomplete (Standalone)

```javascript
// ✅ USE STANDALONE - Single autocomplete request

await recordUsage({
  userId,
  sessionId: null,
  feature: 'google_maps_autocomplete',
  cost: 0.017
});
```

---

## Migration Guide

### Converting Standalone to Session

**Before (Standalone)**:
```javascript
// Each operation tracked separately
await geocode(...);
await recordUsage({ sessionId: null, cost: 0.005 });

await searchVenue(...);
await recordUsage({ sessionId: null, cost: 0.032 });

// Result: 2 separate ApiUsage entries
```

**After (Session)**:
```javascript
const sessionId = `session_enrich_${Date.now()}_${randomString}`;

await geocode(...);
await recordUsage({ sessionId, cost: 0.005, stepLabel: 'Step 1' });

await searchVenue(...);
await recordUsage({ sessionId, cost: 0.032, stepLabel: 'Step 2' });

await finalizeSession({ userId, sessionId });

// Result: 1 SessionUsage with 2 steps
```

### When to Migrate

Consider migrating from standalone to session when:
- ✅ Operations are logically related
- ✅ Need detailed step-by-step tracking
- ✅ Want atomic cost calculation
- ✅ Operations always happen together

---

## Cost Implications

### Session-Based

**Budget Check**: Pre-flight check for entire session
```javascript
const totalEstimatedCost = 0.005 + 0.032; // All steps
await canAffordOperation(userId, totalEstimatedCost, 2);
```

**User Counter Updates**: Happen during step recording
- Each step increments monthly totals
- Final session has aggregated totals
- No duplicate counting

### Standalone

**Budget Check**: Per-operation check
```javascript
await canAffordOperation(userId, 0.005, 1); // Single operation
```

**User Counter Updates**: Immediate on record
- Direct increment of monthly totals
- Simple aggregation

---

## Querying Patterns

### Query SessionUsage

```javascript
// Get all location enrichment sessions for user
const sessions = await adminDb
  .collection('SessionUsage')
  .doc(userId)
  .collection('sessions')
  .where('feature', '==', 'location')
  .where('status', '==', 'completed')
  .get();

// Calculate total cost across all sessions
const totalCost = sessions.docs.reduce((sum, doc) =>
  sum + (doc.data().totalCost || 0), 0
);
```

### Query ApiUsage

```javascript
// Get monthly geocoding costs
const monthlyDoc = await adminDb
  .collection('ApiUsage')
  .doc(userId)
  .collection('monthly')
  .doc('2025-11')
  .get();

const geocodingCost = monthlyDoc.data()
  ?.featureBreakdown
  ?.google_maps_geocoding
  ?.cost || 0;
```

---

## Summary

### Use Session-Based When:
- ✅ Multi-step logical operation
- ✅ Need step-by-step audit trail
- ✅ Want atomic cost tracking
- ✅ Complex workflow with phases

### Use Standalone When:
- ✅ Single independent operation
- ✅ Need fast monthly aggregation
- ✅ Simple one-request workflow
- ✅ No relationship to other operations

### Key Principle:
**Multi-step operations belong in sessions. Single operations stay standalone.**

---

## Related Documentation

- `SESSION_BASED_ENRICHMENT.md` - Location enrichment implementation
- `SESSION_TRACKING_FIX.md` - Session tracking architecture
- `COST_TRACKING_MIGRATION_GUIDE.md` - General cost tracking
- `GEOCODING_SYSTEM_GUIDE.md` - Standalone geocoding examples

---

*Last Updated: 2025-11-22*
*Status: ✅ Active - Production Ready*
