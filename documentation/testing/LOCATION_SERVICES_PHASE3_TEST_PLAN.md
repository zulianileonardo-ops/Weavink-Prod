---
id: testing-location-phase3-079
title: Location Services Phase 3 Test Plan - Auto-Enrichment
category: testing
tags: [location-services, auto-enrichment, phase-3, testing, qa, redis-cache, google-places, budget-tracking, exchange-contacts, venue-enrichment]
status: active
created: 2025-11-21
updated: 2025-11-21
related:
  - LOCATION_SERVICES_AUTO_TAGGING_SPEC.md
  - GEOCODING_SYSTEM_GUIDE.md
  - RATE_LIMIT_TESTING.md
  - RGPD_TESTING_GUIDE.md
functions: [enrichContact, getVenueData, getCacheKey, isEnrichmentEnabled, searchNearbyVenue]
components: [LocationEnrichmentService, ExchangeService, PlacesService, CostTrackingService]
---

# Location Services Phase 3 Test Plan - Auto-Enrichment

**Last Updated:** 2025-11-21
**Test Plan Version:** 1.0
**Feature:** Auto-Enrichment & Public Profile Integration
**Status:** Active

## Table of Contents

1. [Overview](#overview)
2. [What Is Phase 3](#what-is-phase-3)
3. [Testing Objectives](#testing-objectives)
4. [Success Criteria](#success-criteria)
5. [Prerequisites](#prerequisites)
6. [Test Environment Setup](#test-environment-setup)
7. [Test Scenarios](#test-scenarios)
8. [Verification Procedures](#verification-procedures)
9. [Test Data & Examples](#test-data--examples)
10. [Acceptance Criteria](#acceptance-criteria)
11. [Known Issues & Limitations](#known-issues--limitations)
12. [Regression Testing](#regression-testing)
13. [Automated Testing Notes](#automated-testing-notes)
14. [Manual Testing Checklist](#manual-testing-checklist)

---

## Overview

This comprehensive test plan covers Phase 3 of the Location Services feature: **Auto-Enrichment & Public Profile Integration**. Phase 3 automatically enriches contacts with venue data when visitors exchange contact information on a user's public profile.

### What Was Implemented

Phase 3 adds server-side automatic venue enrichment with the following capabilities:

- **LocationEnrichmentService** - Core service for auto-enriching contacts
- **Redis caching** - 100m grid precision cache with 70%+ hit rate target
- **Budget pre-flight checks** - Prevents API cost overruns
- **Google Places integration** - Nearby Search API for venue detection
- **Graceful degradation** - Contact always saves, even if enrichment fails
- **Settings integration** - Respects user preferences (Phase 2)
- **Cost tracking** - Detailed metadata for monitoring

### Testing Objectives

1. **Verify enrichment works correctly** for all happy path scenarios
2. **Validate settings integration** - Enrichment only when enabled
3. **Confirm budget tracking** - Pre-flight checks and cost recording
4. **Test Redis caching** - Hit rate >70%, proper TTL
5. **Verify error handling** - Graceful degradation in all failure scenarios
6. **Validate subscription tiers** - Pro+ access, correct limits
7. **Test performance** - Enrichment time targets met
8. **Ensure data integrity** - Venue data structure correct, GPS preserved

---

## What Is Phase 3

### Context

**Location Services** is a 6-phase feature:

- ✅ **Phase 1:** Manual location search in group creation (Complete)
- ✅ **Phase 2:** User settings & controls (Complete)
- 🎯 **Phase 3:** Auto-enrichment & public profile integration (**Testing Now**)
- ⏸️ **Phase 4:** Smart event detection (Planned - 2 weeks)
- ⏸️ **Phase 5:** AI auto-tagging (Planned - 1 week)
- ⏸️ **Phase 6:** Polish & testing (Planned - 1 week)

### Phase 3 Scope

Phase 3 focuses on **automatic venue enrichment** during contact exchange:

**Trigger Point:**
- Visitor exchanges contact on public profile (@username)
- ExchangeModal captures GPS coordinates
- Server-side enrichment happens transparently

**User Control:**
- Master toggle: `locationServicesEnabled` (Phase 2)
- Feature toggle: `locationFeatures.autoVenueEnrichment` (Phase 2)

**Technical Flow:**
```
1. Visitor submits contact form with GPS
2. POST /api/user/contacts/exchange/submit
3. ExchangeService.submitExchangeContact()
4. Check settings: locationServicesEnabled && autoVenueEnrichment?
5. Budget pre-flight check (CostTrackingService)
6. Check Redis cache (100m grid key)
   - Cache HIT → Use cached venue ($0 cost)
   - Cache MISS → Call Google Places API ($0.032)
7. Enrich contact.metadata.venue
8. Save to Firestore with enrichment
9. Contact successfully saved ✅
```

### What Gets Enriched

**Input:** Contact with GPS coordinates
```javascript
{
  name: "John Doe",
  email: "john@example.com",
  location: {
    latitude: 37.7749,
    longitude: -122.4194
  }
}
```

**Output:** Contact with venue enrichment
```javascript
{
  name: "John Doe",
  email: "john@example.com",
  location: {
    latitude: 37.7749,
    longitude: -122.4194
  },
  metadata: {
    venue: {
      name: "Moscone Center",
      address: "747 Howard St, San Francisco, CA",
      placeId: "ChIJxyz123",
      location: { latitude: 37.7749, longitude: -122.4194 },
      types: ["convention_center", "point_of_interest"],
      distance: 45,  // meters from GPS
      matchedKeyword: "conference center",
      enrichedAt: "2025-11-21T12:00:05Z",
      source: "cache" | "api",
      enrichmentDuration: 234  // milliseconds
    }
  }
}
```

---

## Testing Objectives

### Primary Objectives

1. **Functional Correctness**
   - Verify enrichment adds correct venue data
   - Confirm settings control enrichment behavior
   - Validate budget tracking accuracy

2. **Performance**
   - Meet enrichment time targets (<500ms cached, <2s uncached)
   - Achieve cache hit rate >70%
   - No impact on contact save performance

3. **Reliability**
   - Zero failed contact saves due to enrichment errors
   - Graceful degradation in all error scenarios
   - Proper error logging for debugging

4. **Cost Management**
   - Budget pre-flight checks prevent overruns
   - Cost tracking is accurate
   - Cache reduces effective cost to ~$0.01 per contact

5. **Data Integrity**
   - Venue data structure is correct and complete
   - GPS coordinates are preserved
   - Existing contact fields are not corrupted

---

## Success Criteria

### Must Pass

| Criterion | Target | Priority |
|-----------|--------|----------|
| **All happy path tests pass** | 100% | P0 |
| **Zero failed contact saves** | 100% | P0 |
| **Settings integration works** | 100% | P0 |
| **Budget tracking accurate** | 100% | P0 |
| **Graceful degradation** | 100% | P0 |

### Performance Targets

| Metric | Target | Priority |
|--------|--------|----------|
| **Cache hit rate** | >70% | P1 |
| **Enrichment time (cached)** | <500ms | P1 |
| **Enrichment time (uncached)** | <2s | P1 |
| **Contact save time impact** | <10% | P1 |

### Quality Targets

| Metric | Target | Priority |
|--------|--------|----------|
| **Enrichment success rate** | >90% | P1 |
| **Data accuracy** | >95% | P1 |
| **Cost per contact (effective)** | <$0.01 | P2 |
| **Error rate** | <5% | P2 |

---

## Prerequisites

### Required Accounts & Access

1. **Weavink Test Accounts**
   - Base tier account (for negative tests)
   - Pro tier account (for feature testing)
   - Premium tier account (for Phase 4/5 prep)

2. **API Keys**
   - Google Maps API key configured in `.env`
   - Verify API key has Places API enabled
   - Verify API key has Geocoding API enabled

3. **Redis Instance**
   - Redis server running
   - Connection string in `.env`
   - Verify connectivity

4. **Firebase/Firestore**
   - Test project access
   - Firestore emulator (optional for local testing)
   - Admin SDK credentials configured

### System Setup

1. **Environment Variables**
   ```bash
   # Required in .env
   GOOGLE_MAPS_API_KEY=your_api_key_here
   REDIS_URL=redis://localhost:6379
   FIREBASE_PROJECT_ID=your_project_id
   ```

2. **Dependencies**
   ```bash
   npm install
   # Verify all packages installed successfully
   ```

3. **Build & Start**
   ```bash
   npm run build  # Verify build succeeds
   npm run dev    # Start development server
   ```

### Test Data Preparation

1. **Known Test Venues**
   - Moscone Center, San Francisco (37.7749, -122.4194)
   - Grand Central Terminal, NYC (40.7527, -73.9772)
   - O2 Arena, London (51.5031, 0.0033)
   - Tokyo Big Sight, Tokyo (35.6298, 139.7944)

2. **Test User Profiles**
   - Create or identify test user accounts
   - Enable location services in settings
   - Verify subscription tier

3. **Redis Cleanup**
   ```bash
   # Clear test caches before testing
   redis-cli FLUSHDB  # Warning: Clears all data!
   ```

---

## Test Environment Setup

### Step 1: Configure User Settings

**Enable Location Services (as profile owner):**

1. Navigate to `/dashboard/settings`
2. Scroll to "Location Services" section
3. Toggle master switch to **Enabled**
4. Enable "Auto Venue Enrichment" toggle
5. Verify settings saved (check for success toast)

**Verify in Firestore:**
```javascript
// users/{userId}/settings
{
  locationServicesEnabled: true,
  locationFeatures: {
    autoVenueEnrichment: true,
    eventDetection: false,
    autoTagging: false
  }
}
```

### Step 2: Verify API Configuration

**Test Google Maps API:**
```bash
# Test geocoding endpoint
curl "https://maps.googleapis.com/maps/api/geocode/json?latlng=37.7749,-122.4194&key=YOUR_API_KEY"

# Should return 200 with address data
```

**Test Places API:**
```bash
# Test nearby search
curl "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=37.7749,-122.4194&radius=100&key=YOUR_API_KEY"

# Should return 200 with nearby places
```

### Step 3: Verify Redis Connection

**Test Redis:**
```bash
# Connect to Redis
redis-cli

# Test set/get
SET test_key "test_value"
GET test_key  # Should return "test_value"

# Check connection from app
node -e "const Redis = require('ioredis'); const redis = new Redis(process.env.REDIS_URL); redis.ping().then(console.log).catch(console.error);"
# Should print "PONG"
```

### Step 4: Clear Caches & Baseline

**Clear Redis cache:**
```bash
redis-cli
KEYS location:*  # View existing location caches
DEL location:*   # Clear location caches (or FLUSHDB to clear all)
```

**Baseline check:**
- Verify no existing cache entries
- Verify budget counters at known state
- Verify Firestore contacts collection clean

---

## Test Scenarios

### 1. Happy Path Testing

#### Test 1.1: Exchange with Venue Enrichment (Cache Miss)

**Objective:** Verify first-time enrichment with Google Places API call

**Setup:**
- Clear Redis cache: `redis-cli DEL location:37.775:-122.419`
- Profile owner has enrichment enabled
- Known test venue: Moscone Center (37.7749, -122.4194)

**Steps:**
1. Navigate to public profile: `/@username`
2. Click "Exchange Contact" button
3. Fill contact form:
   - Name: "Test User 1"
   - Email: "test1@example.com"
   - Enable GPS location (browser prompt)
4. Submit form
5. Wait for success message

**Expected Results:**
- ✅ Contact saved successfully
- ✅ Success message displayed
- ✅ No errors in browser console
- ✅ Server logs show:
  ```
  🎯 [AutoEnrich] Starting enrichment
  ⏭️ [AutoEnrich] Cache MISS
  ✅ [AutoEnrich] Success
  ✅ [Exchange] Contact enriched with venue: Moscone Center
  ```

**Verification:**
```javascript
// Firestore: Contacts/{ownerId}/contacts/[contactId]
{
  name: "Test User 1",
  email: "test1@example.com",
  metadata: {
    venue: {
      name: "Moscone Center",  // Or nearby venue
      address: "747 Howard St, San Francisco, CA",
      placeId: "ChI...",
      location: { latitude: 37.7749, longitude: -122.4194 },
      types: ["convention_center"],
      distance: 45,  // <= 100m
      source: "api",
      enrichedAt: "2025-11-21...",
      enrichmentDuration: 1234  // < 2000ms
    }
  }
}
```

**Redis Verification:**
```bash
redis-cli
GET location:37.775:-122.419
# Should return venue data JSON
TTL location:37.775:-122.419
# Should return value between 900-1800 (15-30 min)
```

**Cost Tracking Verification:**
```javascript
// ApiUsage/{ownerId}/operations/[operationId]
{
  usageType: "ApiUsage",
  feature: "auto_venue_enrichment",
  cost: 0.032,
  isBillableRun: true,
  provider: "google_maps",
  metadata: {
    latitude: 37.7749,
    longitude: -122.4194,
    venueFound: true,
    source: "api",
    cacheHit: false
  }
}
```

---

#### Test 1.2: Exchange with Venue Enrichment (Cache Hit)

**Objective:** Verify cached enrichment with $0 cost

**Setup:**
- Run Test 1.1 first (to populate cache)
- Same profile owner
- Same location: Moscone Center (37.7749, -122.4194)

**Steps:**
1. Navigate to public profile: `/@username`
2. Click "Exchange Contact" button
3. Fill contact form:
   - Name: "Test User 2"
   - Email: "test2@example.com"
   - Use same GPS location
4. Submit form

**Expected Results:**
- ✅ Contact saved successfully
- ✅ Server logs show:
  ```
  🎯 [AutoEnrich] Starting enrichment
  ✅ [AutoEnrich] Cache HIT
  ✅ [AutoEnrich] Success
  ```

**Verification:**
```javascript
// Firestore: Contact has venue data with source: "cache"
{
  metadata: {
    venue: {
      name: "Moscone Center",
      source: "cache",  // ✅ From cache
      enrichedAt: "2025-11-21..."  // New timestamp
    }
  }
}
```

**Cost Tracking Verification:**
```javascript
// NO new entry in ApiUsage collection for this operation
// Or entry with cost: 0
```

**Performance Check:**
- Enrichment duration should be <500ms

---

#### Test 1.3: Exchange at Different Location (100m Away)

**Objective:** Verify cache key precision (100m grid)

**Setup:**
- Cache exists for (37.7749, -122.4194)
- New location 100m away: (37.7758, -122.4194)
  - Rounds to `location:37.776:-122.419` (different key)

**Steps:**
1. Submit exchange with new GPS coordinates
2. Verify different cache key is used

**Expected Results:**
- ✅ Cache MISS (different grid cell)
- ✅ New API call made
- ✅ New cache entry created

**Verification:**
```bash
redis-cli
KEYS location:*
# Should show TWO keys:
# - location:37.775:-122.419
# - location:37.776:-122.419
```

---

### 2. Settings Integration Testing

#### Test 2.1: Master Toggle Disabled

**Objective:** Verify enrichment skipped when master toggle off

**Setup:**
- Disable `locationServicesEnabled` in settings
- Clear cache

**Steps:**
1. Submit exchange with GPS coordinates

**Expected Results:**
- ✅ Contact saved successfully (GPS preserved)
- ✅ Server logs show:
  ```
  ⏭️ [AutoEnrich] Feature disabled in settings, skipping
  ```
- ✅ NO venue enrichment
- ✅ NO API call
- ✅ NO cost recorded

**Verification:**
```javascript
// Firestore: Contact has NO metadata.venue
{
  name: "Test User",
  location: { latitude: 37.7749, longitude: -122.4194 },
  metadata: {
    // venue: undefined  ✅ No venue
  }
}
```

---

#### Test 2.2: Feature Toggle Disabled

**Objective:** Verify enrichment skipped when feature toggle off

**Setup:**
- Enable `locationServicesEnabled`
- Disable `locationFeatures.autoVenueEnrichment`

**Steps:**
1. Submit exchange with GPS coordinates

**Expected Results:**
- ✅ Contact saved with GPS only
- ✅ NO venue enrichment
- ✅ NO API call
- ✅ Logs show feature disabled

---

#### Test 2.3: Both Toggles Enabled

**Objective:** Verify enrichment happens when both enabled

**Setup:**
- Enable `locationServicesEnabled`
- Enable `locationFeatures.autoVenueEnrichment`

**Steps:**
1. Submit exchange with GPS coordinates

**Expected Results:**
- ✅ Contact saved with venue enrichment
- ✅ API call made (or cache hit)
- ✅ Cost tracked (if API call)

---

#### Test 2.4: Toggle Changes During Session

**Objective:** Verify real-time settings changes

**Setup:**
- Start with enrichment enabled
- Submit one contact (should enrich)
- Disable enrichment in settings
- Submit another contact (should NOT enrich)

**Expected Results:**
- First contact: ✅ Enriched
- Second contact: ✅ NOT enriched

---

### 3. Budget & Cost Tracking Testing

#### Test 3.1: Sufficient Budget

**Objective:** Verify enrichment works with sufficient budget

**Setup:**
- Pro account with budget remaining
- Check current usage: `/api/admin/analytics`

**Steps:**
1. Submit exchange with GPS

**Expected Results:**
- ✅ Budget pre-flight check passes
- ✅ Enrichment proceeds
- ✅ Cost recorded
- ✅ Monthly usage incremented

**Verification:**
```javascript
// ApiUsage/{userId}/operations/[operationId]
{
  feature: "auto_venue_enrichment",
  cost: 0.032,  // If API call
  isBillableRun: true
}

// Monthly aggregation
{
  totalCost: previousCost + 0.032,
  operationCount: previousCount + 1
}
```

---

#### Test 3.2: Budget At Limit

**Objective:** Verify graceful degradation when budget exhausted

**Setup:**
- Artificially set user at budget limit
  - Modify Firestore to show high monthly usage

**Steps:**
1. Submit exchange with GPS

**Expected Results:**
- ✅ Contact saved with GPS only
- ✅ Server logs show:
  ```
  ⚠️ [AutoEnrich] Budget exceeded, graceful degradation
  ```
- ✅ NO API call
- ✅ NO additional cost
- ✅ Contact has GPS but no venue

**Verification:**
```javascript
// Contact saved successfully
{
  name: "Test User",
  location: { latitude: 37.7749, longitude: -122.4194 },
  metadata: {
    // No venue  ✅ Graceful degradation
  }
}
```

---

#### Test 3.3: Budget Exceeded Mid-Session

**Objective:** Verify behavior when budget runs out

**Setup:**
- Start with budget just below limit
- Submit enough contacts to exceed budget

**Steps:**
1. Submit first exchange (should enrich)
2. Verify budget is now at/over limit
3. Submit second exchange (should NOT enrich)

**Expected Results:**
- First: ✅ Enriched
- Second: ✅ NOT enriched (graceful degradation)

---

#### Test 3.4: Cost Recording Accuracy

**Objective:** Verify costs are recorded correctly

**Setup:**
- Clear Redis cache (force API calls)
- Known starting budget state

**Steps:**
1. Submit 5 exchanges at different locations
2. Verify all enrich with API calls

**Verification:**
```javascript
// Check ApiUsage collection
// Should have 5 entries with:
- cost: 0.032 each
- feature: "auto_venue_enrichment"
- isBillableRun: true
- metadata.source: "api"
- metadata.cacheHit: false

// Monthly total should increase by 5 × $0.032 = $0.16
```

---

#### Test 3.5: Monthly Usage Counter

**Objective:** Verify monthly operation count increments

**Setup:**
- Check current monthly usage
- Perform enrichments

**Steps:**
1. Note starting operation count
2. Submit 3 exchanges (with enrichment)
3. Check new operation count

**Expected Results:**
- ✅ Count increases by 3
- ✅ Count resets on new month
- ✅ Count displayed in dashboard

---

### 4. Redis Cache Testing

#### Test 4.1: Cache Miss → API Call

**Objective:** Verify API call when cache empty

**Setup:**
- Clear specific cache key
- Monitor Redis and server logs

**Steps:**
1. Submit exchange at cleared location

**Expected Results:**
- ✅ Cache MISS logged
- ✅ Google API called
- ✅ Result cached
- ✅ Cost recorded

---

#### Test 4.2: Cache Hit → $0 Cost

**Objective:** Verify cache usage saves cost

**Setup:**
- Populate cache (Test 4.1)
- Submit at same location

**Steps:**
1. Submit exchange at cached location

**Expected Results:**
- ✅ Cache HIT logged
- ✅ NO Google API call
- ✅ NO cost recorded (or $0)
- ✅ Enrichment faster (<500ms)

---

#### Test 4.3: Cache Key Precision (100m Grid)

**Objective:** Verify 100m grid precision

**Test Locations:**
```
A: (37.7749, -122.4194) → location:37.775:-122.419
B: (37.7750, -122.4195) → location:37.775:-122.420 (different)
C: (37.7748, -122.4193) → location:37.775:-122.419 (same as A)
```

**Steps:**
1. Submit at location A (cache miss)
2. Submit at location B (cache miss - different key)
3. Submit at location C (cache HIT - same key as A)

**Expected Results:**
- A: Cache MISS, API call, creates `location:37.775:-122.419`
- B: Cache MISS, API call, creates `location:37.775:-122.420`
- C: Cache HIT, no API, uses `location:37.775:-122.419`

**Verification:**
```bash
redis-cli
KEYS location:*
# Should show both keys
GET location:37.775:-122.419
GET location:37.775:-122.420
# Should return different venue data
```

---

#### Test 4.4: Cache Expiry (TTL 15-30 min)

**Objective:** Verify random TTL prevents thundering herd

**Steps:**
1. Create cache entry
2. Check TTL immediately
3. Wait 1 minute, check TTL again
4. Verify TTL decreases

**Verification:**
```bash
redis-cli
SET test_location "{\"venue\":\"test\"}" EX 1800
TTL test_location
# Should show ~1800 (30 min)

# Wait 60 seconds
TTL test_location
# Should show ~1740 (29 min)

# After expiry
TTL test_location
# Should show -2 (expired)
GET test_location
# Should return (nil)
```

**Cache Expiry Test:**
1. Create cache with short TTL (for testing)
2. Submit exchange (cache HIT)
3. Wait for expiry
4. Submit exchange again (cache MISS)

---

#### Test 4.5: Cache Hit Rate >70%

**Objective:** Verify cache hit rate meets target

**Setup:**
- Simulate realistic usage pattern
- Multiple contacts at same/nearby venues

**Steps:**
1. Submit 10 exchanges at 3 different venues:
   - 5 at Venue A (37.7749, -122.4194)
   - 3 at Venue B (40.7527, -73.9772)
   - 2 at Venue C (51.5031, 0.0033)

**Expected Results:**
- Venue A: 1 MISS + 4 HITs = 80% hit rate
- Venue B: 1 MISS + 2 HITs = 66% hit rate
- Venue C: 1 MISS + 1 HIT = 50% hit rate
- **Overall: 7 HITs / 10 total = 70% hit rate** ✅

---

### 5. Error Handling Testing

#### Test 5.1: Google API Timeout

**Objective:** Verify graceful degradation on API timeout

**Setup:**
- Simulate timeout (use network throttling or mock)
- Or test during Google outage

**Steps:**
1. Submit exchange with GPS

**Expected Results:**
- ✅ Contact saved with GPS only
- ✅ Error logged:
  ```
  ❌ [AutoEnrich] Google Places API error: timeout
  ⚠️ [Exchange] Venue enrichment failed, continuing with GPS only
  ```
- ✅ NO venue enrichment
- ✅ User experience not degraded

**Verification:**
```javascript
// Contact saved successfully
{
  location: { latitude: 37.7749, longitude: -122.4194 },
  metadata: {
    // No venue - graceful degradation ✅
  }
}
```

---

#### Test 5.2: Google API Error Response

**Objective:** Verify handling of API errors (invalid key, quota, etc.)

**Setup:**
- Use invalid API key temporarily
- Or exceed API quota

**Steps:**
1. Submit exchange with GPS

**Expected Results:**
- ✅ Contact saved with GPS only
- ✅ Error logged with details
- ✅ NO venue enrichment

---

#### Test 5.3: Invalid GPS Coordinates

**Objective:** Verify handling of malformed coordinates

**Setup:**
- Submit with invalid coordinates:
  - `{ latitude: "invalid", longitude: -122.4194 }`
  - `{ latitude: null, longitude: null }`
  - `{ latitude: 999, longitude: 999 }`

**Steps:**
1. Submit exchange with invalid GPS

**Expected Results:**
- ✅ Enrichment skipped
- ✅ Contact saved without venue
- ✅ Log shows:
  ```
  ⏭️ [AutoEnrich] No GPS coordinates, skipping enrichment
  ```

---

#### Test 5.4: Null Location Object

**Objective:** Verify handling when location is null/undefined

**Setup:**
- Submit contact without location object

**Steps:**
1. Submit exchange without GPS

**Expected Results:**
- ✅ Contact saved without location
- ✅ Enrichment skipped
- ✅ NO errors

---

#### Test 5.5: Redis Connection Error

**Objective:** Verify bypass when Redis unavailable

**Setup:**
- Stop Redis server: `redis-cli SHUTDOWN`
- Submit exchange

**Steps:**
1. Submit exchange with GPS

**Expected Results:**
- ✅ Contact saved (with or without enrichment)
- ✅ Warning logged:
  ```
  ⚠️ [AutoEnrich] Redis cache error (bypassing)
  ```
- ✅ API called directly (if budget allows)
- ✅ Result NOT cached

**Verification:**
- Contact saved successfully
- If budget OK: venue enriched via API
- If budget exhausted: GPS only

---

### 6. Subscription Tier Testing

#### Test 6.1: Base Tier - Feature Disabled

**Objective:** Verify Base users cannot use enrichment

**Setup:**
- Use Base tier account
- Try to enable in settings

**Steps:**
1. Navigate to settings
2. Try to enable "Auto Venue Enrichment"

**Expected Results:**
- ✅ Toggle disabled/greyed out
- ✅ Badge shows "Requires Pro+"
- ✅ NO enrichment happens even if toggled

---

#### Test 6.2: Pro Tier - 50/month Limit

**Objective:** Verify Pro tier limit enforcement

**Setup:**
- Pro account
- Check monthly limit: 50 operations

**Steps:**
1. Perform 50 enrichments
2. Attempt 51st enrichment

**Expected Results:**
- First 50: ✅ Enriched
- 51st: ✅ Graceful degradation (budget exceeded)

---

#### Test 6.3: Premium Tier - 200/month Limit

**Objective:** Verify Premium tier limit

**Setup:**
- Premium account
- Monthly limit: 200 operations

**Steps:**
1. Verify higher limit allows more enrichments

**Expected Results:**
- ✅ Can perform 200 enrichments/month
- ✅ Exceeding 200 triggers graceful degradation

---

#### Test 6.4: Business/Enterprise - Unlimited

**Objective:** Verify unlimited enrichment

**Setup:**
- Business or Enterprise account

**Steps:**
1. Perform >200 enrichments

**Expected Results:**
- ✅ No limit enforced
- ✅ All requests enriched (cache/API)

---

### 7. Performance Testing

#### Test 7.1: Enrichment Time (Cached)

**Objective:** Verify cached enrichment <500ms

**Setup:**
- Populate cache
- Submit at cached location

**Steps:**
1. Submit exchange
2. Check enrichmentDuration in metadata

**Expected Results:**
- ✅ `metadata.venue.enrichmentDuration < 500` ms

**Measurement:**
```javascript
// Firestore verification
{
  metadata: {
    venue: {
      enrichmentDuration: 234,  // ✅ < 500ms
      source: "cache"
    }
  }
}
```

---

#### Test 7.2: Enrichment Time (Uncached)

**Objective:** Verify API call enrichment <2s

**Setup:**
- Clear cache
- Submit at uncached location

**Steps:**
1. Submit exchange
2. Check enrichmentDuration

**Expected Results:**
- ✅ `metadata.venue.enrichmentDuration < 2000` ms

---

#### Test 7.3: Contact Save Time Impact

**Objective:** Verify enrichment doesn't slow contact save

**Setup:**
- Measure baseline contact save time (no enrichment)
- Measure with enrichment enabled

**Steps:**
1. Time contact save without enrichment: T1
2. Time contact save with enrichment (cached): T2
3. Time contact save with enrichment (uncached): T3

**Expected Results:**
- T2 ≈ T1 + 500ms (cached)
- T3 ≈ T1 + 2000ms (uncached)
- **Impact <10% on overall flow**

---

#### Test 7.4: Cache Hit Rate Measurement

**Objective:** Measure real-world cache hit rate

**Setup:**
- Simulate realistic usage
- Multiple users at conferences/events

**Steps:**
1. Submit 100 exchanges across 10 venues
2. Calculate hit rate

**Expected Results:**
- ✅ Hit rate >70%
- ✅ Effective cost <$0.01/contact

**Calculation:**
```
Total exchanges: 100
Unique venues: 10
Cache misses: 10 (first at each venue)
Cache hits: 90 (subsequent at each venue)
Hit rate: 90/100 = 90% ✅
Total cost: 10 × $0.032 = $0.32
Cost per contact: $0.32 / 100 = $0.0032 ✅
```

---

### 8. Data Integrity Testing

#### Test 8.1: Venue Data Structure

**Objective:** Verify venue object has all required fields

**Steps:**
1. Perform enrichment
2. Check venue object structure

**Expected Structure:**
```javascript
{
  metadata: {
    venue: {
      name: string,              // ✅ Required
      address: string,           // ✅ Required
      placeId: string,           // ✅ Required
      location: {                // ✅ Required
        latitude: number,
        longitude: number
      },
      types: string[],           // ✅ Required
      distance: number,          // ✅ Required (meters)
      matchedKeyword: string,    // Optional
      enrichedAt: string,        // ✅ Required (ISO 8601)
      source: "cache" | "api",   // ✅ Required
      enrichmentDuration: number // ✅ Required (ms)
    }
  }
}
```

**Validation:**
- All required fields present
- Correct data types
- Valid ISO 8601 timestamp
- distance ≤ 100 (within search radius)

---

#### Test 8.2: GPS Coordinates Preserved

**Objective:** Verify original GPS not modified

**Steps:**
1. Submit with GPS: (37.7749, -122.4194)
2. Check saved contact

**Expected Results:**
```javascript
{
  location: {
    latitude: 37.7749,   // ✅ Exact same
    longitude: -122.4194  // ✅ Exact same
  },
  metadata: {
    venue: {
      location: {
        latitude: 37.7749,  // Venue center
        longitude: -122.4194
      }
    }
  }
}
```

---

#### Test 8.3: Dynamic Fields Not Corrupted

**Objective:** Verify enrichment doesn't affect other fields

**Setup:**
- Submit contact with dynamicFields

**Steps:**
1. Submit contact:
   ```javascript
   {
     name: "Test User",
     email: "test@example.com",
     dynamicFields: {
       LinkedIn: "https://linkedin.com/in/test",
       CompanyTagline: "Building the future"
     },
     location: { latitude: 37.7749, longitude: -122.4194 }
   }
   ```

**Expected Results:**
- ✅ All fields preserved exactly
- ✅ Venue added to metadata only
- ✅ dynamicFields unchanged

---

#### Test 8.4: Distance Calculation Accuracy

**Objective:** Verify distance is accurate

**Setup:**
- Submit at known distance from venue
- Manually verify distance

**Steps:**
1. Submit at (37.7749, -122.4194)
2. Venue is at (37.7750, -122.4195)
3. Check reported distance

**Expected Results:**
- ✅ distance ≈ actual distance (±10m)
- ✅ distance ≤ 100m (within search radius)

---

### 9. Graceful Degradation Testing

#### Test 9.1: All Error Scenarios Preserve Contact

**Objective:** Verify contact ALWAYS saves

**Test Matrix:**

| Scenario | Contact Saved? | Venue Enriched? |
|----------|---------------|-----------------|
| Settings disabled | ✅ Yes | ❌ No |
| Budget exceeded | ✅ Yes | ❌ No |
| API timeout | ✅ Yes | ❌ No |
| API error | ✅ Yes | ❌ No |
| Redis down | ✅ Yes | Maybe* |
| Invalid GPS | ✅ Yes | ❌ No |
| No GPS | ✅ Yes | ❌ No |

*Depends on budget availability

**Test Each Scenario:**
1. Trigger error condition
2. Submit exchange
3. Verify contact saved
4. Verify appropriate logging

---

#### Test 9.2: User Experience Not Degraded

**Objective:** Verify errors are invisible to visitor

**Steps:**
1. Trigger error (API timeout, etc.)
2. Submit exchange
3. Observe user experience

**Expected Results:**
- ✅ Success message shown
- ✅ NO error message to user
- ✅ Form clears/resets normally
- ✅ Same UX as successful enrichment

---

#### Test 9.3: Proper Error Logging

**Objective:** Verify errors are logged for debugging

**Setup:**
- Trigger various error scenarios
- Check server logs

**Expected Logs:**
```
⚠️ [AutoEnrich] Budget exceeded, graceful degradation
❌ [AutoEnrich] Google Places API error: timeout
⚠️ [AutoEnrich] Redis cache error (bypassing)
⚠️ [Exchange] Venue enrichment failed, continuing with GPS only
```

**Verification:**
- All errors logged with context
- No stack traces for expected errors
- Proper error categorization

---

## Verification Procedures

### 1. Firestore Verification

**Check Contact Data:**
```javascript
// Navigate to Firebase Console
// Firestore → Contacts → {userId} → contacts → {contactId}

// Verify structure:
{
  id: "exchange_1732185600000_abc123",
  name: "Test User",
  email: "test@example.com",
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    timestamp: "2025-11-21T12:00:00Z",
    city: "San Francisco",
    country: "USA",
    formattedAddress: "123 Market St, San Francisco, CA"
  },
  metadata: {
    userAgent: "...",
    // Check venue object
    venue: {
      name: "Moscone Center",
      address: "747 Howard St, San Francisco, CA",
      placeId: "ChIJxyz123",
      location: { latitude: 37.7749, longitude: -122.4194 },
      types: ["convention_center", "point_of_interest"],
      distance: 45,
      matchedKeyword: "conference center",
      enrichedAt: "2025-11-21T12:00:05Z",
      source: "cache" | "api",
      enrichmentDuration: 234
    }
  }
}
```

---

### 2. Redis Cache Verification

**Check Cache Entries:**
```bash
# Connect to Redis
redis-cli

# List all location caches
KEYS location:*

# Example output:
# 1) "location:37.775:-122.419"
# 2) "location:40.753:-73.977"

# Get specific cache
GET location:37.775:-122.419

# Example output:
# {"venue":{"name":"Moscone Center",...},"timestamp":1732185600000,"location":{"latitude":37.7749,"longitude":-122.4194}}

# Check TTL
TTL location:37.775:-122.419
# Example: 1534 (seconds remaining, should be 900-1800)

# Check cache size
DBSIZE
# Shows total number of keys
```

**Cache Health Check:**
```bash
# Check memory usage
INFO memory

# Check hit/miss rate
INFO stats
# Look for: keyspace_hits, keyspace_misses
```

---

### 3. Cost Tracking Verification

**Check API Usage:**
```javascript
// Firebase Console
// Firestore → ApiUsage → {userId} → operations → {operationId}

// Verify entry:
{
  timestamp: "2025-11-21T12:00:05Z",
  usageType: "ApiUsage",
  feature: "auto_venue_enrichment",
  cost: 0.032,  // If API call, 0 if cache hit
  isBillableRun: true,
  provider: "google_maps",
  sessionId: null,
  metadata: {
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 100,
    venueFound: true,
    source: "api" | "cache",
    cacheHit: false | true,
    isAutoEnrichment: true,
    contactId: "exchange_1732185600000_abc123"
  }
}
```

**Monthly Aggregation:**
```javascript
// Check monthly summary
// ApiUsage → {userId} → monthly → {YYYY-MM}

{
  totalCost: 1.28,  // Sum of all costs
  operationCount: 45,  // Number of enrichments
  features: {
    auto_venue_enrichment: {
      count: 45,
      cost: 1.28
    }
  }
}
```

---

### 4. Server Logs Verification

**Log Patterns to Look For:**

**Successful Enrichment:**
```
🎯 [AutoEnrich] Starting enrichment: {userId, latitude, longitude}
✅ [AutoEnrich] Cache HIT: location:37.775:-122.419
✅ [AutoEnrich] Success: {venueName, source, cost, duration}
✅ [Exchange] Contact enriched with venue: Moscone Center
```

**Cache Miss:**
```
🎯 [AutoEnrich] Starting enrichment
⏭️ [AutoEnrich] Cache MISS, calling Google Places API
💾 [AutoEnrich] Cached venue: location:37.775:-122.419, ttl: 1563s
✅ [AutoEnrich] Success
```

**Settings Disabled:**
```
🔍 [AutoEnrich] Settings check: {masterEnabled: false, featureEnabled: false}
⏭️ [AutoEnrich] Feature disabled in settings, skipping
```

**Budget Exceeded:**
```
⚠️ [AutoEnrich] Budget exceeded, graceful degradation: {reason: 'monthly_limit_reached'}
```

**Error Handling:**
```
❌ [AutoEnrich] Google Places API error: timeout
⚠️ [Exchange] Venue enrichment failed, continuing with GPS only
```

---

### 5. Performance Metrics

**Measure Enrichment Time:**
```javascript
// Check metadata.venue.enrichmentDuration
// Cached: Should be <500ms
// Uncached: Should be <2000ms

// Example from Firestore:
{
  metadata: {
    venue: {
      enrichmentDuration: 234  // ms
    }
  }
}
```

**Calculate Cache Hit Rate:**
```
Cache Hits = Number of contacts with source: "cache"
Cache Misses = Number of contacts with source: "api"
Total = Cache Hits + Cache Misses
Hit Rate = Cache Hits / Total × 100%

Example:
- 70 contacts with source: "cache"
- 30 contacts with source: "api"
- Hit Rate = 70/100 = 70% ✅
```

---

## Test Data & Examples

### Known Test Venues

#### 1. Moscone Center, San Francisco
```javascript
{
  gps: {
    latitude: 37.7749,
    longitude: -122.4194
  },
  expectedVenue: {
    name: "Moscone Center" (or nearby venue),
    address: "747 Howard St, San Francisco, CA",
    types: ["convention_center", "point_of_interest"],
    placeId: "ChI..." // Will vary
  },
  cacheKey: "location:37.775:-122.419"
}
```

#### 2. Grand Central Terminal, NYC
```javascript
{
  gps: {
    latitude: 40.7527,
    longitude: -73.9772
  },
  expectedVenue: {
    name: "Grand Central Terminal",
    address: "89 E 42nd St, New York, NY",
    types: ["train_station", "transit_station"],
  },
  cacheKey: "location:40.753:-73.977"
}
```

#### 3. O2 Arena, London
```javascript
{
  gps: {
    latitude: 51.5031,
    longitude: 0.0033
  },
  expectedVenue: {
    name: "The O2",
    address: "Peninsula Square, London",
    types: ["stadium", "point_of_interest"],
  },
  cacheKey: "location:51.503:0.003"
}
```

#### 4. Tokyo Big Sight, Tokyo
```javascript
{
  gps: {
    latitude: 35.6298,
    longitude: 139.7944
  },
  expectedVenue: {
    name: "Tokyo Big Sight",
    address: "3 Chome-11-1 Ariake, Koto City, Tokyo",
    types: ["convention_center", "point_of_interest"],
  },
  cacheKey: "location:35.630:139.794"
}
```

### Sample Test Contacts

```javascript
// Test Contact 1 - Minimum Fields
{
  name: "Test User 1",
  email: "test1@example.com",
  location: {
    latitude: 37.7749,
    longitude: -122.4194
  }
}

// Test Contact 2 - Full Fields
{
  name: "Test User 2",
  email: "test2@example.com",
  phone: "+1234567890",
  company: "Test Corp",
  jobTitle: "CTO",
  website: "https://test.com",
  message: "Met at conference",
  location: {
    latitude: 40.7527,
    longitude: -73.9772,
    accuracy: 10,
    timestamp: "2025-11-21T12:00:00Z"
  },
  dynamicFields: {
    LinkedIn: "https://linkedin.com/in/test2",
    Twitter: "@test2"
  }
}
```

### Cache Key Examples

```javascript
// Cache key generation examples
getCacheKey(37.7749, -122.4194)  // "location:37.775:-122.419"
getCacheKey(37.7750, -122.4195)  // "location:37.775:-122.420" (different)
getCacheKey(37.7748, -122.4193)  // "location:37.775:-122.419" (same as first)

// 100m grid examples
// Same grid cell (cache hit):
(37.7749, -122.4194) → location:37.775:-122.419
(37.7748, -122.4193) → location:37.775:-122.419 ✅ Same

// Different grid cell (cache miss):
(37.7749, -122.4194) → location:37.775:-122.419
(37.7758, -122.4194) → location:37.776:-122.419 ❌ Different
```

### Cost Calculation Examples

```javascript
// Scenario 1: All API calls (no cache)
Contacts: 50
Cache hits: 0
Cache misses: 50
API calls: 50
Cost: 50 × $0.032 = $1.60

// Scenario 2: 70% cache hit rate
Contacts: 50
Cache hits: 35
Cache misses: 15
API calls: 15
Cost: 15 × $0.032 = $0.48
Effective cost per contact: $0.48 / 50 = $0.0096 ✅

// Scenario 3: Realistic conference
Venue: 1 (conference center)
Attendees: 100
First exchange: Cache MISS ($0.032)
Next 99 exchanges: Cache HIT ($0)
Total cost: $0.032
Cost per contact: $0.032 / 100 = $0.00032 ✅✅
```

---

## Acceptance Criteria

### Must Pass (P0)

1. **Functional Requirements**
   - ✅ All happy path tests pass
   - ✅ Enrichment adds correct venue data
   - ✅ Settings control enrichment behavior
   - ✅ Budget tracking is accurate
   - ✅ Zero failed contact saves

2. **Error Handling**
   - ✅ All error scenarios preserve contact
   - ✅ Graceful degradation in all cases
   - ✅ Proper error logging
   - ✅ User experience not degraded

3. **Data Integrity**
   - ✅ Venue data structure is correct
   - ✅ GPS coordinates preserved
   - ✅ Existing fields not corrupted
   - ✅ Distance calculation accurate

### Should Pass (P1)

4. **Performance**
   - ✅ Cache hit rate >70%
   - ✅ Enrichment time (cached) <500ms
   - ✅ Enrichment time (uncached) <2s
   - ✅ Contact save impact <10%

5. **Cost Management**
   - ✅ Effective cost <$0.01 per contact
   - ✅ Budget pre-flight checks work
   - ✅ Monthly limits enforced
   - ✅ Cost recording accurate

### Nice to Have (P2)

6. **Quality Metrics**
   - ✅ Enrichment success rate >90%
   - ✅ Data accuracy >95%
   - ✅ Error rate <5%

---

## Known Issues & Limitations

### Current Limitations

1. **100m Search Radius**
   - Only finds venues within 100m
   - May not find venue if contact exchanged outside
   - **Mitigation:** This is by design for accuracy

2. **Google Places API Coverage**
   - Not all locations have venue data
   - Rural areas may have fewer results
   - **Mitigation:** Graceful degradation (GPS only)

3. **Redis Single Point of Failure**
   - If Redis down, no caching
   - Increases API costs temporarily
   - **Mitigation:** Bypass cache, use API directly

4. **No Offline Support**
   - Requires internet for enrichment
   - **Mitigation:** Enrichment is optional, contact saves regardless

5. **English-Centric Keyword Matching**
   - Keywords optimized for English venues
   - May miss non-English venue names
   - **Mitigation:** Uses Google's multilingual data

### Edge Cases

1. **Multiple Venues in Radius**
   - Google returns closest venue
   - May not be the actual venue
   - **Note:** Distance field helps validate

2. **Moving Locations (Buses, Trains)**
   - GPS might be outdated
   - Venue may be incorrect
   - **Note:** Timestamp helps track

3. **Indoor GPS Accuracy**
   - Indoor GPS can be 10-50m off
   - May match wrong venue
   - **Mitigation:** Distance field shows uncertainty

4. **Cache Pollution**
   - Bad data cached for 15-30 min
   - Affects subsequent users
   - **Mitigation:** TTL limits impact, manual cache clear available

---

## Regression Testing

### Phase 1 Compatibility

**Verify Phase 1 (Manual Search) Still Works:**

1. **Group Creation with Manual Search**
   - Navigate to group creation
   - Use location search autocomplete
   - Select venue manually
   - Create group
   - **Expected:** ✅ Works as before

2. **Venue Details Still Load**
   - Search for venue
   - Click venue to see details
   - **Expected:** ✅ Details display correctly

### Phase 2 Compatibility

**Verify Phase 2 (Settings) Still Works:**

1. **Settings Page Accessible**
   - Navigate to `/dashboard/settings`
   - Location Services section visible
   - **Expected:** ✅ Settings page loads

2. **Toggles Functional**
   - Master toggle works
   - Feature toggle works
   - Cost transparency displays
   - **Expected:** ✅ All settings functional

3. **Settings Persistence**
   - Change settings
   - Reload page
   - **Expected:** ✅ Settings persisted

### Contact Exchange Flow

**Verify Basic Exchange Still Works:**

1. **Exchange Without GPS**
   - Submit contact without GPS enabled
   - **Expected:** ✅ Contact saved without location

2. **Exchange With GPS (Enrichment Disabled)**
   - Disable enrichment in settings
   - Submit with GPS
   - **Expected:** ✅ Contact saved with GPS only

3. **Exchange Form Validation**
   - Try invalid email
   - Try missing required fields
   - **Expected:** ✅ Validation works as before

---

## Automated Testing Notes

### Unit Tests

**LocationEnrichmentService Unit Tests:**

```javascript
// Test getCacheKey()
describe('getCacheKey', () => {
  it('rounds coordinates to 3 decimals', () => {
    expect(getCacheKey(37.7749123, -122.4194456))
      .toBe('location:37.775:-122.419');
  });

  it('generates same key for nearby coords', () => {
    const key1 = getCacheKey(37.7749, -122.4194);
    const key2 = getCacheKey(37.7748, -122.4193);
    expect(key1).toBe(key2);
  });
});

// Test isEnrichmentEnabled()
describe('isEnrichmentEnabled', () => {
  it('returns false when master disabled', () => {
    const userData = { settings: { locationServicesEnabled: false } };
    expect(isEnrichmentEnabled(userData)).toBe(false);
  });

  it('returns true when both enabled', () => {
    const userData = {
      settings: {
        locationServicesEnabled: true,
        locationFeatures: { autoVenueEnrichment: true }
      }
    };
    expect(isEnrichmentEnabled(userData)).toBe(true);
  });
});

// Test getRandomTTL()
describe('getRandomTTL', () => {
  it('returns value between min and max', () => {
    const ttl = getRandomTTL(900, 1800);
    expect(ttl).toBeGreaterThanOrEqual(900);
    expect(ttl).toBeLessThanOrEqual(1800);
  });
});
```

### Integration Tests

**Exchange Flow Integration Tests:**

```javascript
describe('Contact Exchange with Enrichment', () => {
  it('enriches contact when settings enabled', async () => {
    // Setup: Enable settings
    await enableLocationServices(testUserId);

    // Execute: Submit exchange
    const result = await submitExchange({
      userId: testUserId,
      contact: {
        name: 'Test User',
        email: 'test@example.com',
        location: { latitude: 37.7749, longitude: -122.4194 }
      }
    });

    // Verify: Contact has venue
    expect(result.success).toBe(true);
    const contact = await getContact(result.contactId);
    expect(contact.metadata.venue).toBeDefined();
    expect(contact.metadata.venue.name).toBeTruthy();
  });

  it('saves contact without enrichment when disabled', async () => {
    // Setup: Disable settings
    await disableLocationServices(testUserId);

    // Execute: Submit exchange
    const result = await submitExchange({ /* ... */ });

    // Verify: Contact saved without venue
    const contact = await getContact(result.contactId);
    expect(contact.metadata.venue).toBeUndefined();
  });
});
```

### Mock Data for Testing

```javascript
// Mock PlacesService response
const mockVenueResponse = {
  success: true,
  venue: {
    name: "Moscone Center",
    address: "747 Howard St, San Francisco, CA",
    placeId: "ChIJtest123",
    location: { latitude: 37.7749, longitude: -122.4194 },
    types: ["convention_center"],
    distance: 45,
    matchedKeyword: "conference center"
  }
};

// Mock CostTrackingService
const mockAffordabilityCheck = {
  canAfford: true,
  reason: null
};

// Mock Redis client
const mockRedisClient = {
  get: jest.fn().mockResolvedValue(null),  // Cache miss
  set: jest.fn().mockResolvedValue('OK'),
  delete: jest.fn().mockResolvedValue(1)
};
```

---

## Manual Testing Checklist

### Pre-Test Setup ✓

- [ ] Environment variables configured
- [ ] Redis running and accessible
- [ ] Google Maps API key valid
- [ ] Test accounts created (Base, Pro, Premium)
- [ ] Settings page accessible
- [ ] Firestore console open
- [ ] Redis CLI ready
- [ ] Server logs visible

### Happy Path Tests ✓

- [ ] Test 1.1: Exchange with venue (cache miss)
- [ ] Test 1.2: Exchange with venue (cache hit)
- [ ] Test 1.3: Exchange 100m away (different cache)
- [ ] Verify venue data in Firestore
- [ ] Verify cache in Redis
- [ ] Verify cost tracking

### Settings Tests ✓

- [ ] Test 2.1: Master toggle disabled
- [ ] Test 2.2: Feature toggle disabled
- [ ] Test 2.3: Both enabled
- [ ] Test 2.4: Toggle during session
- [ ] Verify settings persistence

### Budget Tests ✓

- [ ] Test 3.1: Sufficient budget
- [ ] Test 3.2: Budget at limit
- [ ] Test 3.3: Budget exceeded mid-session
- [ ] Test 3.4: Cost recording accuracy
- [ ] Test 3.5: Monthly usage counter

### Cache Tests ✓

- [ ] Test 4.1: Cache miss → API call
- [ ] Test 4.2: Cache hit → $0 cost
- [ ] Test 4.3: Cache key precision
- [ ] Test 4.4: Cache expiry (TTL)
- [ ] Test 4.5: Cache hit rate >70%

### Error Handling Tests ✓

- [ ] Test 5.1: Google API timeout
- [ ] Test 5.2: API error response
- [ ] Test 5.3: Invalid GPS coords
- [ ] Test 5.4: Null location
- [ ] Test 5.5: Redis connection error
- [ ] Verify contact always saves
- [ ] Verify proper error logging

### Subscription Tier Tests ✓

- [ ] Test 6.1: Base tier disabled
- [ ] Test 6.2: Pro tier (50/month limit)
- [ ] Test 6.3: Premium tier (200/month limit)
- [ ] Test 6.4: Business/Enterprise (unlimited)

### Performance Tests ✓

- [ ] Test 7.1: Cached <500ms
- [ ] Test 7.2: Uncached <2s
- [ ] Test 7.3: Save time impact <10%
- [ ] Test 7.4: Cache hit rate measurement

### Data Integrity Tests ✓

- [ ] Test 8.1: Venue structure complete
- [ ] Test 8.2: GPS preserved
- [ ] Test 8.3: Dynamic fields intact
- [ ] Test 8.4: Distance accurate

### Graceful Degradation Tests ✓

- [ ] Test 9.1: All errors preserve contact
- [ ] Test 9.2: UX not degraded
- [ ] Test 9.3: Proper error logging

### Regression Tests ✓

- [ ] Phase 1 manual search works
- [ ] Phase 2 settings work
- [ ] Basic exchange works
- [ ] Form validation works

### Final Verification ✓

- [ ] Review all Firestore data
- [ ] Review Redis cache entries
- [ ] Review API usage logs
- [ ] Review server logs
- [ ] Calculate metrics
- [ ] Document findings

---

## Test Results Template

### Test Session Information

```
Date: YYYY-MM-DD
Tester: [Name]
Environment: Development / Staging / Production
Build Version: [Git commit hash]
```

### Test Summary

```
Total Tests: __
Passed: __
Failed: __
Blocked: __
Skipped: __
Pass Rate: __%
```

### Critical Findings

```
P0 Bugs: __
P1 Bugs: __
P2 Bugs: __
```

### Performance Metrics

```
Cache Hit Rate: __%
Avg Enrichment Time (cached): __ ms
Avg Enrichment Time (uncached): __ ms
Cost Per Contact: $__
```

### Test Coverage

```
- Happy Path: __% complete
- Error Handling: __% complete
- Performance: __% complete
- Regression: __% complete
```

### Detailed Results

| Test ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| 1.1 | Exchange with venue (cache miss) | ✅ Pass | Enriched in 1.2s |
| 1.2 | Exchange with venue (cache hit) | ✅ Pass | Enriched in 234ms |
| ... | ... | ... | ... |

### Issues Found

```
Issue #1: [Title]
- Severity: P0 / P1 / P2
- Description: [Details]
- Steps to Reproduce: [Steps]
- Expected: [Expected behavior]
- Actual: [Actual behavior]
- Screenshots: [Links]

Issue #2: ...
```

### Sign-Off

```
✅ All P0 tests passed
✅ All P1 tests passed
⚠️ [Number] P2 issues found (acceptable)

Approved for: Development / Staging / Production
Tester Signature: __________
Date: __________
```

---

## Troubleshooting Guide

### Common Issues

#### Issue: Enrichment Not Happening

**Symptoms:**
- Contacts save with GPS but no venue
- No enrichment logs

**Diagnosis:**
1. Check settings:
   ```bash
   # Firestore: users/{userId}/settings
   locationServicesEnabled: true?
   locationFeatures.autoVenueEnrichment: true?
   ```

2. Check subscription tier:
   ```bash
   # users/{userId}
   accountType: "pro" or higher?
   ```

3. Check budget:
   ```bash
   # ApiUsage/{userId}/monthly/{YYYY-MM}
   totalCost < budget limit?
   ```

**Solution:**
- Enable settings
- Upgrade tier
- Wait for new month (budget reset)

---

#### Issue: Cache Not Working

**Symptoms:**
- Every request shows "Cache MISS"
- High API costs

**Diagnosis:**
1. Check Redis connection:
   ```bash
   redis-cli PING
   # Should return PONG
   ```

2. Check cache keys:
   ```bash
   redis-cli KEYS location:*
   # Should show cached locations
   ```

3. Check TTL:
   ```bash
   redis-cli TTL location:37.775:-122.419
   # Should return positive number or -2 (expired)
   ```

**Solution:**
- Restart Redis server
- Check REDIS_URL in .env
- Verify network connectivity

---

#### Issue: High API Costs

**Symptoms:**
- Budget exceeded quickly
- Low cache hit rate

**Diagnosis:**
1. Check cache hit rate:
   ```bash
   # Count contacts with source: "cache" vs "api"
   ```

2. Check if cache is working (see above)

3. Check if locations are spread out:
   ```bash
   redis-cli KEYS location:*
   # Many different keys = low reuse
   ```

**Solution:**
- Fix Redis if broken
- Educate users about conferences/events (high reuse)
- Consider increasing cache TTL

---

#### Issue: Wrong Venue Matched

**Symptoms:**
- Venue name doesn't match actual location
- Distance is large (>50m)

**Diagnosis:**
1. Check GPS accuracy:
   ```javascript
   location.accuracy > 50 ?  // Indoor/poor signal
   ```

2. Check distance field:
   ```javascript
   venue.distance > 50 ?  // Venue is far
   ```

3. Verify Google Places data:
   - Search manually in Google Maps
   - May be no venue data in that area

**Solution:**
- This is expected in some cases
- Distance field helps user assess
- Can manually edit contact later

---

#### Issue: Redis Memory Full

**Symptoms:**
- Redis errors: "OOM"
- Cache operations failing

**Diagnosis:**
```bash
redis-cli INFO memory
# Check used_memory, used_memory_peak
```

**Solution:**
```bash
# Clear expired keys
redis-cli --scan --pattern "location:*" | xargs redis-cli DEL

# Or flush all (nuclear option)
redis-cli FLUSHDB
```

---

## Appendix

### A. Related Documentation

- **Specification:** `/documentation/features/LOCATION_SERVICES_AUTO_TAGGING_SPEC.md`
- **Geocoding Guide:** `/documentation/features/GEOCODING_SYSTEM_GUIDE.md`
- **Cost Tracking:** `/documentation/infrastructure/COST_TRACKING_MIGRATION_GUIDE.md`
- **Redis Client:** `/lib/services/serviceContact/server/redisClient.js`
- **PlacesService:** `/lib/services/serviceContact/server/GroupService/placesService.js`

### B. API References

**Location Enrichment Service:**
- `enrichContact(contact, userId, userData)` - Main enrichment method
- `getVenueData(latitude, longitude, userId)` - Cache or API
- `getCacheKey(lat, lng)` - Generate cache key
- `isEnrichmentEnabled(userData)` - Check settings
- `getRandomTTL(min, max)` - Random TTL generation

**Exchange Service:**
- `submitExchangeContact(submissionData)` - Contact exchange
- `prepareContactData(contact, metadata)` - Data preparation

**Cost Tracking Service:**
- `canAffordOperation(userId, cost, runs)` - Budget check
- `recordUsage(params)` - Record API usage

### C. Firestore Collections

```
/users/{userId}
  /settings                  # User settings

/Contacts/{userId}
  /contacts/{contactId}      # Contact data with venue

/ApiUsage/{userId}
  /operations/{operationId}  # Individual operations
  /monthly/{YYYY-MM}         # Monthly aggregation

/RateLimits/{identifier}     # Rate limiting (if applicable)
```

### D. Redis Key Patterns

```
location:{lat}:{lng}         # Venue cache (TTL: 900-1800s)
  Format: location:37.775:-122.419
  Value: { venue: {...}, timestamp: ..., location: {...} }
```

### E. Cost Reference

| Operation | Cost | Frequency |
|-----------|------|-----------|
| **Google Places Nearby Search** | $0.032 | Per API call |
| **Redis cache hit** | $0.00 | Per hit |
| **Geocoding (existing)** | $0.005 | Per exchange |
| **Effective cost (70% cached)** | ~$0.01 | Per contact |

**Monthly Projections:**
- Pro (50 contacts): ~$0.48
- Premium (200 contacts): ~$1.92
- Business/Enterprise: Variable

---

## Test Plan Approval

**Prepared By:** Claude (AI Assistant)
**Date:** 2025-11-21
**Version:** 1.0

**Reviewed By:** _____________
**Date:** _____________

**Approved By:** _____________
**Date:** _____________

---

*End of Test Plan*
