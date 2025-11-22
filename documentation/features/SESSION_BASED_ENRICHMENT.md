---
id: features-session-enrichment-001
title: Session-Based Location Enrichment
category: features
tags: [session-tracking, location-enrichment, cost-tracking, geocoding, venue-search, location-services]
status: active
created: 2025-11-22
updated: 2025-11-22
related:
  - GEOCODING_SYSTEM_GUIDE.md
  - LOCATION_SERVICES_AUTO_TAGGING_SPEC.md
  - SESSION_TRACKING_FIX.md
---

# Session-Based Location Enrichment

## Overview

Session-based location enrichment is a multi-step process that combines reverse geocoding (GPS → address) and venue search into a single tracked session. This architecture enables:

- **Atomic cost tracking** across multiple API calls
- **Detailed step-by-step auditing** of enrichment operations
- **Budget optimization** through intelligent caching
- **Clean separation** between multi-step sessions and standalone operations

**Key Benefit**: Instead of tracking each API call separately, multi-step enrichment operations are grouped into sessions, providing better cost visibility and audit trails.

## Architecture

### Two-Step Enrichment Flow

```
User submits contact with GPS coordinates
         ↓
┌─────────────────────────────────────────┐
│ Session: session_enrich_1234567890_abcd │
├─────────────────────────────────────────┤
│                                         │
│ Step 1: Reverse Geocoding               │
│   GPS (45.177, 5.721)                   │
│   → "Grenoble, France"                  │
│   Cost: $0.005                          │
│   Provider: Google Maps Geocoding API  │
│                                         │
│ Step 2: Venue Search                    │
│   Location: Grenoble coords             │
│   → "Le Carré de la Source"             │
│   Cost: $0 (cached) or $0.032 (API)    │
│   Provider: Redis Cache or Google Places│
│                                         │
│ Total Cost: $0.005 - $0.037             │
│ Status: completed                       │
└─────────────────────────────────────────┘
         ↓
Contact enriched with:
- Address: "8 Rue Léo Lagrange, Grenoble"
- Venue: "Le Carré de la Source"
```

### Cost Structure

| Step | Operation | Cost (API Call) | Cost (Cached) | Billable |
|------|-----------|-----------------|---------------|----------|
| 1 | Reverse Geocoding | $0.005 | N/A (no cache) | Yes |
| 2 | Venue Search | $0.032 | $0.000 | Yes/No |
| **Total** | **Full Enrichment** | **$0.037** | **$0.005** | **1-2 runs** |

**Average Cost**: ~$0.015 per contact (assuming 70% cache hit rate on venue search)

## Database Structure

### SessionUsage Collection

Sessions are stored in Firestore with detailed step tracking:

```
SessionUsage/
  {userId}/
    sessions/
      {sessionId}/
        feature: "location"
        status: "completed" | "in-progress" | "failed"
        totalCost: 0.037
        totalRuns: 2
        createdAt: Timestamp
        lastUpdatedAt: Timestamp
        completedAt: Timestamp
        steps: [
          {
            stepLabel: "Step 1: Reverse Geocoding"
            operationId: "usage_1763805372067_v0i9"
            usageType: "ApiUsage"
            feature: "location_reverse_geocoding"
            provider: "google_maps"
            cost: 0.005
            isBillableRun: true
            timestamp: "2025-11-22T09:56:12.067Z"
            metadata: {
              latitude: 45.1772416
              longitude: 5.7212928
              city: "Grenoble"
              country: "France"
              formattedAddress: "8 Rue Léo Lagrange, 38100 Grenoble, France"
              success: true
              duration: 431
            }
          },
          {
            stepLabel: "Step 2: Venue Search (Cache Hit)"
            operationId: "usage_1763805373023_o6yk"
            usageType: "ApiUsage"
            feature: "location_venue_search_cached"
            provider: "redis_cache"
            cost: 0
            isBillableRun: false
            timestamp: "2025-11-22T09:56:13.023Z"
            metadata: {
              cacheKey: "location:45.177:5.721"
              venueName: "Le Carré de la Source"
              cacheHit: true
              cachedAt: 1763804968073
            }
          }
        ]
```

### ApiUsage Collection

**Important**: When sessionId is provided, operations are NOT written to ApiUsage. Sessions write to SessionUsage ONLY.

Standalone operations (without sessionId) write to ApiUsage:

```
ApiUsage/
  {userId}/
    monthly/
      2025-11/
        totalCost: 0.015
        totalRuns: 3
        featureBreakdown: {
          location_reverse_geocoding: {
            cost: 0.015
            runs: 3
          }
        }
```

## Implementation

### Step 1: Reverse Geocoding

**File**: `lib/services/serviceContact/server/LocationEnrichmentService.js` (lines 99-154)

```javascript
// Generate session ID
const sessionId = `session_enrich_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

// STEP 1: Reverse geocoding (GPS → address)
const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const placesClient = new OptimizedPlacesApiClient(apiKey);
const addressData = await placesClient.reverseGeocode(latitude, longitude);

// Record in session
await CostTrackingService.recordUsage({
  userId,
  usageType: 'ApiUsage',
  feature: 'location_reverse_geocoding',
  cost: 0.005,
  isBillableRun: true,
  provider: 'google_maps',
  sessionId: sessionId,  // ← Session tracking
  stepLabel: 'Step 1: Reverse Geocoding',
  metadata: {
    latitude,
    longitude,
    city: addressData.city,
    country: addressData.country,
    formattedAddress: addressData.formattedAddress,
    success: true,
    duration: geocodeDuration
  }
});
```

### Step 2: Venue Search

**File**: `lib/services/serviceContact/server/LocationEnrichmentService.js` (lines 156-309)

```javascript
// Check Redis cache first (100m grid precision)
const cacheKey = this.getCacheKey(latitude, longitude);
const cached = await redisClient.get(cacheKey);

if (cached && cached.venue) {
  // Cache HIT - record with $0 cost
  await CostTrackingService.recordUsage({
    userId,
    usageType: 'ApiUsage',
    feature: 'location_venue_search_cached',
    cost: 0,  // No cost for cache hit
    isBillableRun: false,
    provider: 'redis_cache',
    sessionId: sessionId,  // ← Same session
    stepLabel: 'Step 2: Venue Search (Cache Hit)',
    metadata: {
      cacheKey,
      venueName: cached.venue.name,
      cacheHit: true
    }
  });
} else {
  // Cache MISS - call Google Places API
  const result = await PlacesService.searchNearbyVenues(userId, {
    latitude,
    longitude,
    radius: 100,
    keywords: ['conference center', 'hotel', 'restaurant', ...],
    sessionId  // ← Passed to PlacesService for tracking
  });

  // PlacesService records the API call cost in the session
  // Cost: $0.032, recorded automatically
}
```

### Session Finalization

**File**: `lib/services/serviceContact/server/exchangeService.js` (lines 54-59)

```javascript
if (enrichedContact.metadata?.venue) {
  // Finalize session - mark as completed
  await SessionTrackingService.finalizeSession({
    userId: targetUserId,
    sessionId: enrichmentSessionId
  });

  console.log('🏁 Enrichment session finalized:', enrichmentSessionId);
}
```

## Session Lifecycle

```
1. CREATE
   ├─ Generate unique sessionId
   ├─ Session status: "in-progress"
   └─ No Firestore document yet

2. EXECUTE STEPS
   ├─ Step 1: Reverse geocoding
   │  ├─ Call Google Geocoding API
   │  ├─ Record usage with sessionId
   │  └─ SessionUsage document created
   │
   └─ Step 2: Venue search
      ├─ Check Redis cache
      ├─ Call Google Places API (if cache miss)
      ├─ Record usage with sessionId
      └─ SessionUsage document updated

3. FINALIZE
   ├─ Update session status: "completed"
   ├─ Set completedAt timestamp
   └─ Calculate final totalCost and totalRuns

4. USER BUDGET UPDATE
   ├─ User document monthly counters updated
   ├─ Happens during step recording
   └─ Tracks against monthly limits
```

## Cost Tracking Flow

### With Session (Multi-step)

```
enrichContact() called with sessionId
         ↓
Step 1: recordUsage({ sessionId: 'session_...' })
         ↓
CostTrackingService checks: sessionId provided?
         ↓ YES
SessionTrackingService.addStepToSession()
         ↓
Writes to: SessionUsage/{userId}/sessions/{sessionId}
         ↓
Updates: steps array, totalCost, totalRuns
         ↓
Returns: { recordedIn: 'SessionUsage' }
```

### Without Session (Standalone)

```
geocode() called without sessionId
         ↓
recordUsage({ sessionId: null })
         ↓
CostTrackingService checks: sessionId provided?
         ↓ NO
Writes to: ApiUsage/{userId}/monthly/{YYYY-MM}
         ↓
Updates: totalCost, totalRuns, featureBreakdown
         ↓
Returns: { recordedIn: 'ApiUsage' }
```

## Budget Management

### Pre-flight Budget Check

Before starting enrichment, the system checks if the user can afford the operation:

```javascript
// Estimate maximum cost (geocoding + venue search)
const totalEstimatedCost = 0.005 + 0.032; // $0.037

const affordabilityCheck = await CostTrackingService.canAffordOperation(
  userId,
  totalEstimatedCost,
  2  // Requires 2 billable runs
);

if (!affordabilityCheck.canAfford) {
  console.log('Budget exceeded, skipping enrichment');
  return contact;  // Save with GPS only
}
```

### Monthly Limits by Subscription

| Tier | Monthly Budget | API Calls | Max Enrichments |
|------|----------------|-----------|-----------------|
| Free | $0.00 | 0 | 0 (disabled) |
| Pro | $1.50 | 50 | ~40 contacts |
| Premium | $3.00 | 200 | ~150 contacts |
| Business | Custom | Unlimited | Unlimited |

**Note**: With 70% cache hit rate, actual enrichments possible is ~2-3x higher than worst-case estimates.

## Caching Strategy

### Redis Cache (100m Grid)

Venue searches are cached with 100-meter grid precision:

```javascript
// Cache key generation
const latRounded = Math.round(latitude * 1000) / 1000;  // 3 decimals
const lngRounded = Math.round(longitude * 1000) / 1000;
const cacheKey = `location:${latRounded}:${lngRounded}`;

// Example: (45.17724, 5.72129) → "location:45.177:5.721"
```

**Cache Properties**:
- **TTL**: 15-30 minutes (randomized to prevent thundering herd)
- **Hit Rate**: ~70% in production
- **Storage**: Redis Cloud
- **Precision**: ~111 meters at equator

### Cost Savings from Caching

```
Without caching:
- Every venue search = $0.032
- 100 enrichments = $3.70

With 70% cache hit:
- 30% API calls = $0.96
- 70% cached = $0.00
- 100 enrichments = $1.46 (60% savings!)
```

## Error Handling

### Geocoding Failure

```javascript
try {
  addressData = await placesClient.reverseGeocode(latitude, longitude);
  geocodeSuccess = true;
} catch (error) {
  geocodeError = error.message;
  geocodeSuccess = false;
}

// ALWAYS record in session (success or failure)
await CostTrackingService.recordUsage({
  userId,
  feature: geocodeSuccess
    ? 'location_reverse_geocoding'
    : 'location_reverse_geocoding_failed',
  cost: 0.005,  // Still charged even if failed
  metadata: {
    success: geocodeSuccess,
    ...(geocodeSuccess ? {
      city: addressData.city,
      country: addressData.country
    } : {
      error: geocodeError
    })
  }
});
```

### Session Failure Handling

```javascript
try {
  enrichedContact = await LocationEnrichmentService.enrichContact(
    contact,
    targetUserId,
    userData,
    enrichmentSessionId
  );
} catch (enrichError) {
  // Mark session as failed
  const sessionRef = adminDb
    .collection('SessionUsage')
    .doc(targetUserId)
    .collection('sessions')
    .doc(enrichmentSessionId);

  await sessionRef.update({
    status: 'failed',
    failedAt: FieldValue.serverTimestamp(),
    error: enrichError.message
  });

  // Continue with original contact (graceful degradation)
  enrichedContact = contact;
}
```

## Integration Points

### Exchange Contact Flow

**File**: `lib/services/serviceContact/server/exchangeService.js` (lines 32-77)

When a contact is submitted via exchange form with GPS coordinates:

1. Session ID is generated
2. Auto-enrichment is triggered (if enabled)
3. Two-step enrichment executes
4. Session is finalized
5. Enriched contact is saved to Firestore

### Public Profile Viewing

**Planned**: When viewing a public profile, geocoding happens standalone (no session) because it's a single operation.

```javascript
// Standalone geocoding (no enrichment)
const address = await geocode(latitude, longitude, userId);
// Recorded in ApiUsage, not SessionUsage
```

## Performance Considerations

### Sequential Execution

Steps execute sequentially (not parallel):
- **Step 1**: Reverse geocoding (300-500ms)
- **Step 2**: Venue search (100ms cached, 1-2s API)
- **Total**: 400ms - 2.5s per enrichment

**Reason**: Step 2 depends on Step 1 success. Parallel execution not possible.

### Cache Performance

```
Cache HIT:  400ms total (geocoding only)
Cache MISS: 2000ms total (geocoding + venue API)
Average:    800ms total (70% cache hit rate)
```

## Testing

### Manual Test: Cache Hit

```bash
# First submission - cache miss
POST /api/user/contacts/exchange/submit
{
  "contact": {
    "name": "Test Contact",
    "email": "test@test.com",
    "location": {
      "latitude": 45.1772416,
      "longitude": 5.7212928
    }
  }
}

# Check SessionUsage - should show 2 steps:
# - Step 1: location_reverse_geocoding ($0.005)
# - Step 2: location_venue_search ($0.032)
# Total: $0.037

# Second submission (same location within 30min) - cache hit
POST /api/user/contacts/exchange/submit
{
  "contact": {
    "name": "Another Contact",
    "email": "another@test.com",
    "location": {
      "latitude": 45.1772416,
      "longitude": 5.7212928
    }
  }
}

# Check SessionUsage - should show 2 steps:
# - Step 1: location_reverse_geocoding ($0.005)
# - Step 2: location_venue_search_cached ($0.000)
# Total: $0.005
```

### Verify No Duplicate Tracking

```bash
# Check ApiUsage collection
# Should be EMPTY for location operations (no standalone entries)

# All location enrichment should be in SessionUsage only
```

## Related Files

### Core Services

- **LocationEnrichmentService**: `/lib/services/serviceContact/server/LocationEnrichmentService.js`
- **ExchangeService**: `/lib/services/serviceContact/server/exchangeService.js`
- **PlacesService**: `/lib/services/serviceContact/server/GroupService/placesService.js`
- **SessionTrackingService**: `/lib/services/serviceContact/server/costTracking/sessionService.js`
- **CostTrackingService**: `/lib/services/serviceContact/server/costTrackingService.js`

### Client Components

- **ExchangeModal**: `/app/[userId]/components/ExchangeModal.jsx`
- **LocationSelector**: `/app/contacts/components/GroupModalComponents/LocationSelector.jsx`

### Documentation

- `GEOCODING_SYSTEM_GUIDE.md` - Reverse geocoding details
- `LOCATION_SERVICES_AUTO_TAGGING_SPEC.md` - Full location services spec
- `SESSION_TRACKING_FIX.md` - Session tracking architecture
- `SESSION_VS_STANDALONE_TRACKING.md` - Comparison guide (see related docs)

## Summary

Session-based location enrichment provides:

✅ **Atomic tracking** of multi-step operations
✅ **Detailed audit trails** with step-by-step metadata
✅ **Cost optimization** through intelligent caching
✅ **Budget enforcement** with pre-flight checks
✅ **Clean architecture** (SessionUsage for sessions, ApiUsage for standalone)
✅ **Graceful degradation** when enrichment fails

**Key Principle**: Multi-step operations belong in sessions. Single operations stay standalone.

---

*Last Updated: 2025-11-22*
*Status: ✅ Active - Production Ready*
