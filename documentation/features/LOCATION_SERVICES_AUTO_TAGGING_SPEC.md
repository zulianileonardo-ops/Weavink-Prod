---
id: features-location-services-auto-tagging-080
title: Intelligent Location Services & AI Auto-Tagging System
category: features
tags: [location, gps, google-places, auto-tagging, event-detection, redis-cache, ai, gemini, premium-features, partially-implemented, session-tracking]
status: partial
created: 2025-11-21
updated: 2025-11-22
phase_1_completed: 2025-11-22
phase_2_completed: 2025-11-22
phase_3_completed: 2025-11-22
phase_5_in_progress: 2025-11-22
next_phase: phase-5-ai-auto-tagging
related:
  - SESSION_BASED_ENRICHMENT.md
  - SESSION_VS_STANDALONE_TRACKING.md
  - GEOCODING_SYSTEM_GUIDE.md
  - PHASE5_AUTO_TAGGING_MIGRATION.md
  - SEMANTIC_SEARCH_ARCHITECTURE_V2.md
  - CONTACT_CREATION_ENRICHMENT_FLOW.md
  - features-venue-enrichment-021
  - technical-cost-tracking-migration-024
  - build-manager-skill
---

# Intelligent Location Services & AI Auto-Tagging System

## Overview

An advanced location-based contact management system that automatically enriches contact data with venue information, detects events, suggests batch group additions, and generates semantic tags using AI for enhanced search and organization.

## Implementation Status

**Status:** Phase 3 Complete, Phase 5 In Progress
- ✅ **Phase 1: Manual Location Search** - Fully implemented in GroupManagerModal
- ✅ **Phase 2: User Settings UI** - LocationServicesTab with granular controls (Complete)
- ✅ **Phase 3: Auto-enrichment** - Geocoding + venue search with session tracking (Complete)
- ✅ **PlacesService** - Autocomplete and place details working
- ✅ **Budget Tracking** - Cost tracking with session-based tracking integrated
- ✅ **Redis Caching** - 100m grid caching with 70%+ hit rate
- ✅ **Session Tracking** - Multi-step enrichment tracked in SessionUsage collection
- ⏸️ **Phase 4: Event Detection** - Planned feature
- 🚧 **Phase 5: AI Auto-tagging** - In Progress (Documentation complete, implementation pending)
- ⏸️ **Phase 6: Polish & Testing** - Planned feature

## Access Points

There are **2 main ways** users can access location services:

### 1. Public Profile (Implemented - Auto-enrichment)

**Files:**
- `app/[userId]/components/ExchangeModal.jsx` - Contact exchange modal
- `lib/services/serviceContact/server/LocationEnrichmentService.js` - Auto-enrichment service
- `lib/services/serviceContact/server/exchangeService.js` - Exchange processing

**Flow:**
- Visitor exchanges contact information via ExchangeButton
- GPS coordinates captured automatically
- **✅ IMPLEMENTED** - Auto-enrich with venue data using session-based tracking
- Two-step enrichment: Reverse geocoding (Step 1) + Venue search (Step 2)
- Cost tracked against profile owner's budget in SessionUsage collection

**Session-Based Tracking:**
- Each enrichment creates a session with unique sessionId
- Step 1: Reverse geocoding ($0.005) - Always recorded
- Step 2: Venue search ($0 cached / $0.032 API) - Cache hit rate ~70%
- Total session cost: $0.005 - $0.037 per contact
- Detailed audit trail with step-by-step metadata

**User Control:**
- Users can enable/disable auto-enrichment in user settings (backend check implemented)
- Settings: `locationServicesEnabled` + `locationFeatures.autoVenueEnrichment`
- Budget pre-flight checks prevent exceeding limits
- Graceful degradation if budget exceeded (saves GPS only)

### 2. Group Creation (Currently Implemented)

**Files:**
- `app/dashboard/(dashboard pages)/contacts/components/GroupManagerModal.jsx` - Main group modal
- `app/dashboard/(dashboard pages)/contacts/components/GroupModalComponents/creategroup/LocationSelector.jsx` - Location selector component
- `app/dashboard/(dashboard pages)/contacts/components/GroupModalComponents/creategroup/EventLocationSearch.jsx` - Search interface

**Flow:**
- User creates a new group
- Can manually search for event location
- PlacesService autocomplete with budget tracking
- Location saved with group metadata

**Current Implementation:**
- ✅ Google Places Autocomplete integration
- ✅ Budget pre-flight checks via `usePlacesSearch` hook
- ✅ Cost tracking per search operation
- ✅ Error handling and budget exceeded warnings

## User Settings & Cost Control

### Settings Dashboard Integration

**Location:** `/app/dashboard/(dashboard pages)/settings/page.jsx`

Users can control location services through a new settings section, similar to the existing contact exchange and download contact toggles.

**Proposed Settings Structure:**

```javascript
{
  // Master toggle
  locationServicesEnabled: boolean,  // Default: false (user must explicitly enable)

  // Granular feature controls (nested under locationFeatures)
  locationFeatures: {
    geocoding: boolean,              // Convert GPS to addresses (Pro+, $0.005/contact)
    autoVenueEnrichment: boolean,    // Auto-enrich with venue data (Premium+, $0.032/contact)
    eventDetection: boolean,         // Smart event detection (Premium+, Free)
    autoTagging: boolean             // AI-powered auto-tagging (Premium+, ~$0.0000002/tag)
  },

  // Budget visibility
  monthlyUsageLocation: number,     // Current month usage
  locationServicesLimit: number     // Based on subscription tier
}
```

**UI Components:**

Similar to `ContactDownloadTab.jsx` pattern:
```jsx
// New file: app/dashboard/(dashboard pages)/settings/components/LocationServicesTab.jsx

<div className="space-y-6">
  {/* Master Toggle Card */}
  <div className="bg-white border rounded-lg p-6">
    <div className="flex items-start justify-between">
      <div>
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3>Enable Location Services</h3>
        <p>Automatically enrich contacts with venue data</p>
      </div>
      <Toggle checked={locationServicesEnabled} onChange={handleToggle} />
    </div>
  </div>

  {/* Cost Transparency Card */}
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <h4>Monthly Usage</h4>
    <p>Geocoding: {geocodingCount} / {limit} calls</p>
    <p>Cost: ${monthlyCost.toFixed(2)} / ${budgetLimit.toFixed(2)}</p>
    <ProgressBar value={usagePercent} />
  </div>

  {/* Feature Controls */}
  <div className="space-y-3">
    <FeatureToggle
      label="Geocoding"
      description="Convert GPS coordinates to readable addresses (reverse geocoding)"
      enabled={locationFeatures.geocoding}
      cost="~$0.005 per contact"
      tier="Pro+"
    />
    <FeatureToggle
      label="Auto Venue Enrichment"
      description="Automatically detect venue names when contacts are exchanged"
      enabled={locationFeatures.autoVenueEnrichment}
      cost="~$0.032 per contact"
      tier="Premium+"
    />
    <FeatureToggle
      label="Smart Event Detection"
      description="Suggest creating groups for contacts at same location"
      enabled={locationFeatures.eventDetection}
      cost="Free (internal)"
      tier="Premium+"
    />
    <FeatureToggle
      label="AI Auto-Tagging"
      description="Generate semantic tags automatically"
      enabled={locationFeatures.autoTagging}
      cost="~$0.0000002 per tag"
      tier="Premium+"
    />
  </div>
</div>
```

**Settings Service Integration:**

Update `lib/services/serviceSetting/server/settingsService.js`:
```javascript
// ✅ CORRECTED IMPLEMENTATION (Bug fixes applied 2025-11-22)
export async function updateLocationSettings(userId, settings) {
  // Validate tier permissions before updating
  const validation = await _validateLocationFeaturesTier(userId, settings.locationFeatures);
  if (!validation.valid) {
    throw new Error(`Permission denied: ${validation.errors.join(', ')}`);
  }

  const settingsRef = doc(adminDb, 'users', userId);
  await settingsRef.update({
    'settings.locationServicesEnabled': settings.locationServicesEnabled,
    'settings.locationFeatures': settings.locationFeatures,
    'settings.updatedAt': FieldValue.serverTimestamp()
  });
}

// Implementation of tier validation (corrected)
static async _validateLocationFeaturesTier(userId, locationFeatures) {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.data();

  // ✅ Read from accountType field (not subscriptionLevel)
  // ✅ Convert to lowercase (not uppercase)
  const subscriptionLevel = (userData.accountType || 'base').toLowerCase();

  let allowedFeatures = LOCATION_FEATURES_BY_TIER[subscriptionLevel];

  if (!allowedFeatures) {
    // ✅ Assign entire object (not individual properties)
    allowedFeatures = LOCATION_FEATURES_BY_TIER[SUBSCRIPTION_LEVELS.BASE];
  }

  // Validate geocoding (Pro+) and venue enrichment (Premium+)
  const errors = [];
  if (locationFeatures.geocoding && !allowedFeatures.geocoding) {
    errors.push('Geocoding requires Pro subscription or higher');
  }
  if (locationFeatures.autoVenueEnrichment && !allowedFeatures.autoVenueEnrichment) {
    errors.push('Auto Venue Enrichment requires Premium subscription or higher');
  }

  return { valid: errors.length === 0, errors };
}
```

**Bug Fixes (2025-11-22)**:
- Fixed field name: `subscriptionLevel` → `accountType`
- Fixed case handling: `.toUpperCase()` → `.toLowerCase()`
- Fixed fallback: Assign object instead of undefined properties
- Premium users now correctly validated

## Business Requirements

### Core Features

1. **Location Services with Tiered Access - IMPLEMENTED**

   **Tier Structure:**
   - **BASE**: No location services
   - **PRO+**: Geocoding only ($0.005/contact)
     - ✅ Convert GPS coordinates to addresses
     - ❌ No venue enrichment
   - **PREMIUM+**: Geocoding + Venue Enrichment + Advanced Features
     - ✅ Geocoding ($0.005/contact)
     - ✅ Auto Venue Enrichment ($0.032/contact)
     - ✅ Smart Event Detection (Free)
     - ✅ AI Auto-Tagging (~$0.0000002/tag)

   **Implemented Features:**
   - ✅ Manual search in group creation (implemented)
   - ✅ Automatic venue detection during contact exchange (implemented with session tracking)
   - ✅ Google Places API integration (implemented)
   - ✅ Intelligent caching strategy (100m radius grid, 15-30 min randomized TTL)
   - ✅ Cost optimization through aggressive caching (70%+ hit rate in production)
   - ✅ Session-based multi-step tracking (geocoding + venue search)
   - ✅ Tier-based feature validation (prevents unauthorized access)

2. **Smart Event Detection Dashboard - PLANNED**
   - Automatically detect when multiple contacts share location + time
   - Popup suggestions: "Add all contacts from the past 4 hours?"
   - Batch group creation with one click
   - Event venue naming

3. **AI-Powered Auto-Tagging - PLANNED**
   - Ultra-fast tagging using Gemini 2.5 Flash
   - Semantic tags for improved search accuracy
   - Lightning-fast group creation with structured tags
   - Tag suggestions based on context (location, time, company)

4. **Subscription Tier Features**
   - **BASE**: No location services access
   - **PRO**: Geocoding only ($0.005/contact) - Convert GPS to addresses
   - **PREMIUM**: All Pro features + Venue Enrichment ($0.032/contact) + Event Detection + AI Tagging
   - **BUSINESS/ENTERPRISE**: All Premium features + Higher budget limits + Priority processing

---

## Technical Architecture

### System Components (Updated)

```
┌────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│  ✅ IMPLEMENTED:                                                    │
│    - EventLocationSearch.jsx (autocomplete search)                 │
│    - LocationSelector.jsx (group creation)                         │
│    - usePlacesSearch.js (custom hook with budget tracking)         │
│    - ExchangeModal.jsx (contact exchange with auto-enrichment)     │
│                                                                    │
│  ⏸️ PLANNED:                                                        │
│    - EventDetectionService.js (smart event detection)              │
│    - AutoTagService.js (AI tagging)                                │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                        API ROUTES                                   │
│  ✅ IMPLEMENTED:                                                    │
│    - /api/user/contacts/places/autocomplete/route.js              │
│    - /api/user/contacts/places/details/route.js                   │
│    - /api/user/contacts/geocode/route.js (standalone geocoding)   │
│    - /api/user/contacts/exchange/submit/route.js (with enrichment)│
│    - Session-based enrichment in exchange flow                     │
│                                                                    │
│  ⏸️ PLANNED:                                                        │
│    - /api/user/contacts/location/suggest-event/route.js           │
│    - /api/user/contacts/tags/generate/route.js                    │
│                                                                    │
│  All routes include:                                               │
│    - Budget pre-flight checks (CostTrackingService)                │
│    - Cost recording (ApiUsage or SessionUsage based on context)    │
│    - Subscription level validation                                 │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                                  │
│  lib/services/serviceContact/                                      │
│  ✅ IMPLEMENTED:                                                    │
│    ├── server/GroupService/placesService.js                       │
│    │   - searchPlaces() (autocomplete)                            │
│    │   - getPlaceDetails()                                        │
│    │   - searchNearbyVenues() (with session tracking)             │
│    ├── client/services/PlacesService.js                           │
│    │   - getPredictions() (client-side cache)                     │
│    │   - getDetails() (client-side cache)                         │
│    ├── server/costTrackingService.js                              │
│    │   - canAffordOperation()                                     │
│    │   - recordUsage() (ApiUsage or SessionUsage)                 │
│    ├── server/LocationEnrichmentService.js                        │
│    │   - enrichContact() (session-based two-step enrichment)      │
│    │   - getVenueData() (with Redis caching)                      │
│    │   - searchNearbyVenue()                                      │
│    ├── server/costTracking/sessionService.js                      │
│    │   - addStepToSession()                                       │
│    │   - finalizeSession()                                        │
│    │   - getSessionDetails()                                      │
│    └── server/redisClient.js                                      │
│        - Redis caching (100m grid, 15-30min randomized TTL)       │
│                                                                    │
│  ⏸️ PLANNED:                                                        │
│    ├── server/EventDetectionService.js                            │
│    │   - detectEventClusters()                                    │
│    └── server/AutoTagService.js                                   │
│        - generateSemanticTags()                                   │
│        - batchTagGeneration()                                     │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL APIS & AI                               │
│  ✅ Google Places API (Active):                                    │
│    - Autocomplete API (autocomplete suggestions)                   │
│    - Place Details API (get full place info)                       │
│    - Geocoding API (GPS → address)                                 │
│    - Nearby Search API (find venues within radius) - IMPLEMENTED  │
│    - Client-side caching (5min autocomplete, 24h details)          │
│    - Server-side Redis caching (100m grid, 15-30min TTL)           │
│                                                                    │
│  ⏸️ Planned Integration:                                            │
│    - Gemini 2.5 Flash (AI auto-tagging)                            │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                    CACHE & DATABASE                                 │
│  ✅ Client-Side Cache (Implemented):                                │
│    - Autocomplete: Map() with 5-minute TTL                         │
│    - Place Details: Map() with 24-hour TTL                         │
│    - Session token management                                      │
│                                                                    │
│  ✅ Server-Side Cache (Implemented):                                │
│    - Redis: location:${lat}:${lng} (100m grid precision)          │
│    - Randomized TTL: 15-30 minutes (prevents thundering herd)      │
│    - Cache hit rate: ~70% in production                            │
│    - Cost savings: ~60% reduction from caching                     │
│                                                                    │
│  ✅ Firestore (Active):                                             │
│    - ApiUsage/{userId}/monthly/{YYYY-MM} (standalone operations)   │
│    - SessionUsage/{userId}/sessions/{sessionId} (multi-step)       │
│    - groups/{groupId} (eventLocation field)                        │
│    - users/{userId}/settings (location service toggles)            │
│    - contacts/{contactId}/metadata/venue (enrichment data)         │
│                                                                    │
│  ⏸️ Firestore (Planned):                                            │
│    - contacts/{contactId}/tags (auto-generated tags)               │
│    - eventClusters/{clusterId} (event detection data)              │
└────────────────────────────────────────────────────────────────────┘
```

### Current Implementation Architecture

**Group Creation Flow (✅ Working):**

```
User clicks "Create Group"
    ↓
GroupManagerModal opens
    ↓
LocationSelector component rendered
    ↓
User types in EventLocationSearch
    ↓
usePlacesSearch hook triggered
    ↓
Budget check: CostTrackingService.canAffordOperation()
    ↓
    ✅ Allowed → Call /api/user/contacts/places/autocomplete
    ❌ Denied → Show budget exceeded warning
    ↓
PlacesService.searchPlaces() (server-side)
    ↓
Google Places Autocomplete API
    ↓
Cache predictions client-side (5 min)
    ↓
User selects location
    ↓
Call /api/user/contacts/places/details with place_id
    ↓
PlacesService.getPlaceDetails()
    ↓
Google Place Details API
    ↓
Record cost: $0.017 per session
    ↓
Save location with group metadata
    ↓
Group created with eventLocation
```

**Planned Public Profile Flow (⏸️ To Be Implemented):**

```
Visitor views public profile (@username)
    ↓
User exchanges contact (ExchangeButton)
    ↓
GPS coordinates captured automatically
    ↓
Check user settings: locationServicesEnabled?
    ↓
    ✅ Enabled → Auto-enrich
    ❌ Disabled → Skip (save GPS only)
    ↓
Budget check: CostTrackingService.canAffordOperation()
    ↓
    ✅ Allowed → Call /api/user/contacts/location/enrich
    ❌ Denied → Graceful degradation (GPS only)
    ↓
LocationEnrichmentService.autoEnrichContact()
    ↓
Check Redis cache (100m radius)
    ↓
    Cache Hit → Return cached venue (cost: $0)
    Cache Miss → Call Google Places API
    ↓
Google Places Nearby Search
    ↓
Find closest venue within 100m
    ↓
Save to Redis (15-30min TTL)
    ↓
Record cost: ~$0.032 per request
    ↓
Enrich contact with venue data
    ↓
Save contact with enriched location
```

---

## Feature Specifications

### 1. Reverse Location Search (Pro/Premium)

**Trigger:** Contact exchange with GPS coordinates captured

**Flow:**

```javascript
// Step 1: Check if location needs enrichment
async function enrichContactLocation(contact, userId, session) {
  // Only for Pro+ users
  if (!hasPermission(session.tier, 'LOCATION_ENRICHMENT')) {
    return { enriched: false, reason: 'tier_restriction' };
  }

  // Check budget before API call
  const canAfford = await CostTrackingService.canAffordOperation(
    userId,
    'google_places_reverse_geocode',
    0.005
  );

  if (!canAfford.allowed) {
    return { enriched: false, reason: 'budget_exceeded' };
  }

  // Step 2: Check Redis cache (100m radius proximity)
  const cacheKey = getCacheKey(contact.location.latitude, contact.location.longitude);
  const cached = await RedisCache.get(cacheKey);

  if (cached) {
    console.log('[LocationEnrichment] Cache HIT', cacheKey);
    return {
      enriched: true,
      source: 'cache',
      venue: cached.venue,
      cost: 0
    };
  }

  // Step 3: Call Google Places API
  const venue = await GooglePlacesService.reverseGeocode({
    latitude: contact.location.latitude,
    longitude: contact.location.longitude,
    radius: 100, // meters
    types: ['point_of_interest', 'establishment']
  });

  // Step 4: Store in Redis with TTL
  if (venue) {
    await RedisCache.set(cacheKey, {
      venue,
      coordinates: contact.location,
      timestamp: Date.now()
    }, {
      ttl: getRandomTTL(900, 1800) // 15-30 minutes
    });
  }

  // Step 5: Track cost
  await CostTrackingService.recordUsage({
    userId,
    usageType: 'ApiUsage',
    feature: 'location_reverse_geocode',
    cost: 0.005,
    isBillableRun: false,
    provider: 'google_places',
    sessionId: session.sessionId,
    metadata: {
      cacheHit: false,
      venueFound: !!venue,
      coordinates: contact.location
    }
  });

  return {
    enriched: !!venue,
    source: 'api',
    venue,
    cost: 0.005
  };
}

// Cache key with 100m precision
function getCacheKey(lat, lng) {
  // Round to ~100m precision (~0.001 degrees)
  const latRounded = Math.round(lat * 1000) / 1000;
  const lngRounded = Math.round(lng * 1000) / 1000;
  return `location:${latRounded}:${lngRounded}`;
}

// Random TTL between 15-30 minutes to spread cache expiration
function getRandomTTL(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
```

**Cost Optimization Strategy:**

1. **Spatial Caching (100m radius)**
   - Grid-based cache keys
   - Multiple contacts at same venue share cache
   - Reduces API calls by ~70%

2. **TTL Randomization**
   - 15-30 minute random TTL
   - Prevents thundering herd on expiration
   - Spreads API load

3. **Budget Pre-Flight Checks**
   - Check affordability BEFORE API call
   - Graceful degradation if budget exhausted
   - User notification with countdown timer

**Example Response:**

```javascript
{
  "enriched": true,
  "source": "cache",
  "venue": {
    "name": "Starbucks Coffee",
    "address": "123 Main St, San Francisco, CA",
    "placeId": "ChIJxyz123",
    "types": ["cafe", "restaurant", "point_of_interest"],
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "distance": 45.2, // meters from contact location
    "confidence": 0.92
  },
  "contact": {
    // ... enriched contact with venue data
    "metadata": {
      "venue": { /* venue info */ },
      "enrichedAt": "2025-11-21T10:30:00Z",
      "enrichmentMethod": "google_places_reverse"
    }
  }
}
```

---

### 2. Smart Event Detection Dashboard

**Status:** ⏸️ PLANNED - Component does not exist yet

**Planned Component:** `app/dashboard/(dashboard pages)/contacts/components/EventSuggestionPanel.jsx`

**Detection Logic (Planned):**

```javascript
async function detectEventClusters(userId, options = {}) {
  const { timeWindow = 4, radiusKm = 1.0 } = options;

  // Step 1: Fetch recent contacts with location data
  const recentContacts = await db
    .collection(`Contacts/${userId}/contacts`)
    .where('submittedAt', '>=', hoursAgo(timeWindow))
    .where('location', '!=', null)
    .get();

  if (recentContacts.size < 3) {
    return { events: [], reason: 'insufficient_contacts' };
  }

  // Step 2: Cluster by location + time
  const clusters = [];
  const processed = new Set();

  for (const contactDoc of recentContacts.docs) {
    if (processed.has(contactDoc.id)) continue;

    const contact = contactDoc.data();
    const cluster = {
      anchor: contact,
      members: [contact],
      centroid: { ...contact.location },
      timeSpan: { start: contact.submittedAt, end: contact.submittedAt }
    };

    // Find nearby contacts within time window
    for (const otherDoc of recentContacts.docs) {
      if (processed.has(otherDoc.id) || otherDoc.id === contactDoc.id) continue;

      const other = otherDoc.data();
      const distance = calculateHaversineDistance(
        contact.location.latitude,
        contact.location.longitude,
        other.location.latitude,
        other.location.longitude
      );

      const timeDiff = Math.abs(
        contact.submittedAt.toMillis() - other.submittedAt.toMillis()
      ) / (1000 * 60 * 60); // hours

      if (distance <= radiusKm && timeDiff <= timeWindow) {
        cluster.members.push(other);
        processed.add(otherDoc.id);

        // Update centroid
        cluster.centroid.latitude =
          cluster.members.reduce((sum, c) => sum + c.location.latitude, 0) / cluster.members.length;
        cluster.centroid.longitude =
          cluster.members.reduce((sum, c) => sum + c.location.longitude, 0) / cluster.members.length;

        // Update time span
        if (other.submittedAt < cluster.timeSpan.start) {
          cluster.timeSpan.start = other.submittedAt;
        }
        if (other.submittedAt > cluster.timeSpan.end) {
          cluster.timeSpan.end = other.submittedAt;
        }
      }
    }

    if (cluster.members.length >= 3) {
      clusters.push(cluster);
    }
  }

  // Step 3: Enrich with venue data
  for (const cluster of clusters) {
    const venue = await LocationEnrichmentService.findNearbyVenues({
      latitude: cluster.centroid.latitude,
      longitude: cluster.centroid.longitude,
      radius: radiusKm * 1000
    });

    cluster.venue = venue;
    cluster.suggestedName = venue
      ? `${venue.name} Event`
      : `Event near ${formatAddress(cluster.centroid)}`;
  }

  return {
    events: clusters,
    count: clusters.length,
    totalContacts: recentContacts.size,
    timeWindow: `${timeWindow} hours`,
    detectedAt: Date.now()
  };
}
```

**Dashboard UI (Planned):**

```jsx
// EventSuggestionPanel.jsx (TO BE CREATED)
export default function EventSuggestionPanel({ userId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    detectEvents();
  }, [userId]);

  async function detectEvents() {
    const result = await LocationEnrichmentService.detectEventClusters(userId);
    setEvents(result.events);
    setLoading(false);
  }

  async function handleBatchAdd(event) {
    // Create group with all contacts from this event
    await GroupService.createGroup({
      name: event.suggestedName,
      type: 'rules_event',
      contactIds: event.members.map(c => c.id),
      metadata: {
        venue: event.venue,
        centroid: event.centroid,
        timeSpan: event.timeSpan,
        autoDetected: true
      }
    });

    toast.success(
      t('location.eventGroupCreated', {
        count: event.members.length,
        name: event.suggestedName
      })
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">
          {t('location.eventSuggestions')}
        </h3>
      </div>

      {loading && <Spinner />}

      {events.length === 0 && !loading && (
        <p className="text-gray-500 text-sm">
          {t('location.noEventsDetected')}
        </p>
      )}

      {events.map((event, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-blue-900">
                {event.suggestedName}
              </h4>
              <p className="text-sm text-blue-700">
                {event.members.length} {t('location.contactsDetected')} • {' '}
                {formatTimeSpan(event.timeSpan)}
              </p>
            </div>
            <button
              onClick={() => handleBatchAdd(event)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('location.addAllToGroup')}
            </button>
          </div>

          {event.venue && (
            <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
              <Building2 className="w-4 h-4" />
              <span>{event.venue.name}</span>
              <span className="text-blue-500">
                • {event.venue.address}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {event.members.slice(0, 5).map(member => (
              <div
                key={member.id}
                className="px-3 py-1 bg-white rounded-full text-sm"
              >
                {member.name}
              </div>
            ))}
            {event.members.length > 5 && (
              <div className="px-3 py-1 bg-white rounded-full text-sm text-gray-600">
                +{event.members.length - 5} more
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
```

**Translation Keys:**

```json
// public/locales/en/common.json
{
  "location": {
    "eventSuggestions": "Suggested Event Groups",
    "noEventsDetected": "No event clusters detected in the past 4 hours",
    "contactsDetected": "contacts detected",
    "addAllToGroup": "Add All to Group",
    "eventGroupCreated": "Created group '{{name}}' with {{count}} contacts",
    "timeWindow": "Past {{hours}} hours",
    "venueName": "at {{venue}}"
  }
}
```

---

### 3. AI-Powered Auto-Tagging

**Feature:** Ultra-fast tag generation using Gemini 2.5 Flash

**Use Cases:**
1. **Automatic context tags** when contact is added
2. **Batch tag generation** for existing contacts
3. **Semantic search enhancement** through structured tags
4. **Lightning-fast group creation** with pre-tagged contacts

**Generation Logic:**

```javascript
async function generateSemanticTags(contact, options = {}) {
  const { model = 'gemini-2.5-flash', useCache = true } = options;

  // Check cache first
  const cacheKey = `tags:${hashContact(contact)}`;
  if (useCache) {
    const cached = await RedisCache.get(cacheKey);
    if (cached) {
      return { tags: cached.tags, source: 'cache', cost: 0 };
    }
  }

  // Build context for AI
  const context = {
    name: contact.name,
    company: contact.company,
    jobTitle: contact.jobTitle,
    location: contact.metadata?.venue?.name,
    notes: contact.notes,
    submittedAt: contact.submittedAt,
    dynamicFields: contact.dynamicFields
  };

  // Generate tags with Gemini 2.5 Flash (ultra-fast)
  const prompt = `
Analyze this contact and generate 3-7 semantic tags for organization and search.

Contact:
${JSON.stringify(context, null, 2)}

Tags should be:
- Lowercase, dash-separated
- Specific and searchable
- Include: industry, role, location-type, relationship-type
- Max 3 words per tag

Examples:
- "tech-executive"
- "sales-prospect"
- "conference-attendee"
- "coffee-shop-meeting"

Return JSON: { "tags": ["tag1", "tag2", ...] }
  `;

  const response = await GeminiService.generate({
    prompt,
    model: 'gemini-2.5-flash',
    temperature: 0.3,
    maxTokens: 100
  });

  const tags = response.data.tags || [];

  // Cache for 24 hours
  await RedisCache.set(cacheKey, { tags, generatedAt: Date.now() }, {
    ttl: 86400
  });

  // Track cost (Gemini 2.5 Flash is extremely cheap)
  await CostTrackingService.recordUsage({
    userId: contact.userId,
    usageType: 'AIUsage',
    feature: 'contact_auto_tagging',
    cost: response.cost, // ~$0.000001
    isBillableRun: false,
    provider: 'gemini-2.5-flash',
    metadata: {
      tagsGenerated: tags.length,
      tokensUsed: response.tokensUsed
    }
  });

  return {
    tags,
    source: 'ai',
    model: 'gemini-2.5-flash',
    cost: response.cost,
    confidence: response.confidence || 0.85
  };
}
```

**Batch Tag Generation:**

```javascript
// For existing contacts without tags
async function batchGenerateTags(userId, options = {}) {
  const { limit = 100, batchSize = 10 } = options;

  // Fetch contacts without tags
  const contacts = await db
    .collection(`Contacts/${userId}/contacts`)
    .where('tags', '==', null)
    .limit(limit)
    .get();

  console.log(`[AutoTag] Batch processing ${contacts.size} contacts`);

  // Process in batches to avoid rate limits
  const batches = chunk(contacts.docs, batchSize);
  let totalTagsGenerated = 0;
  let totalCost = 0;

  for (const batch of batches) {
    const promises = batch.map(async (doc) => {
      const contact = doc.data();
      const result = await generateSemanticTags(contact);

      // Update contact with tags
      await doc.ref.update({
        tags: result.tags,
        metadata: {
          ...contact.metadata,
          autoTagged: true,
          taggedAt: admin.firestore.FieldValue.serverTimestamp(),
          tagModel: result.model
        }
      });

      return result;
    });

    const results = await Promise.all(promises);
    totalTagsGenerated += results.reduce((sum, r) => sum + r.tags.length, 0);
    totalCost += results.reduce((sum, r) => sum + r.cost, 0);

    // Rate limit: wait 1 second between batches
    await sleep(1000);
  }

  return {
    contactsProcessed: contacts.size,
    tagsGenerated: totalTagsGenerated,
    totalCost,
    averageCostPerContact: totalCost / contacts.size
  };
}
```

**Tag Benefits:**

1. **Semantic Search Enhancement**
   - Tags indexed in Pinecone vectors
   - Improves search accuracy by 30%
   - Enables tag-based filtering

2. **Lightning-Fast Group Creation**
   - Filter contacts by tags instantly
   - Example: "Show me all `conference-attendee` contacts"
   - Create groups in <100ms with structured tags

3. **Automatic Organization**
   - Contacts auto-categorized
   - No manual tagging needed
   - Consistent tagging across all contacts

**Example Generated Tags:**

```javascript
// Contact: John Smith, CTO at Tesla
{
  tags: [
    'tech-executive',
    'automotive-industry',
    'electric-vehicles',
    'c-level',
    'potential-client'
  ],
  confidence: 0.92,
  model: 'gemini-2.5-flash'
}

// Contact: Sarah Johnson, met at Starbucks
{
  tags: [
    'coffee-meeting',
    'casual-contact',
    'local-network',
    'first-meeting'
  ],
  confidence: 0.88,
  model: 'gemini-2.5-flash'
}
```

---

## Cost Tracking Integration

**Cost Breakdown:**

| Operation | Provider | Cost per Use | Caching |
|-----------|----------|--------------|---------|
| Reverse Geocode | Google Places | $0.005 | 70% cache hit |
| Nearby Search | Google Places | $0.032 | 60% cache hit |
| Auto-Tagging | Gemini 2.5 Flash | $0.000001 | 80% cache hit |
| Event Detection | Internal | $0 | N/A |

**Effective Costs (with caching):**
- Reverse Geocode: ~$0.0015 per contact (70% cached)
- Nearby Search: ~$0.0128 per search (60% cached)
- Auto-Tagging: ~$0.0000002 per contact (80% cached)

**Monthly Budget Example (Premium User):**
- 200 location enrichments: $0.30
- 50 event detections: $0.64
- 500 auto-tags: $0.0001
- **Total:** ~$0.95/month

---

## Premium Feature Tiers

| Tier | Location Enrichment | Event Detection | Auto-Tagging | Monthly Limit |
|------|---------------------|-----------------|--------------|---------------|
| **Base** | ❌ | ❌ | ❌ | - |
| **Pro** | ✅ Basic (manual) | ❌ | ✅ 50 tags/month | 50 |
| **Premium** | ✅ Full auto | ✅ Auto suggestions | ✅ 500 tags/month | 200 |
| **Business** | ✅ Full auto | ✅ Auto suggestions | ✅ Unlimited | Unlimited |
| **Enterprise** | ✅ Full auto | ✅ Auto suggestions | ✅ Unlimited | Unlimited |

**Permission Constants:**

```javascript
// lib/services/serviceContact/constants/subscriptionConstants.js
export const FEATURE_PERMISSIONS = {
  LOCATION_ENRICHMENT_AUTO: ['premium', 'business', 'enterprise'],
  LOCATION_ENRICHMENT_MANUAL: ['pro', 'premium', 'business', 'enterprise'],
  EVENT_DETECTION_AUTO: ['premium', 'business', 'enterprise'],
  AUTO_TAGGING: ['pro', 'premium', 'business', 'enterprise'],
};

export const RATE_LIMITS = {
  LOCATION_ENRICHMENTS_PER_MONTH: {
    pro: 50,
    premium: 200,
    business: -1,
    enterprise: -1
  },
  AUTO_TAGS_PER_MONTH: {
    pro: 50,
    premium: 500,
    business: -1,
    enterprise: -1
  }
};
```

---

## Redis Cache Strategy

**Cache Structure:**

```javascript
// Location cache (100m precision)
// Key: location:37.775:-122.419
// TTL: 15-30 minutes (random)
{
  "venue": {
    "name": "Starbucks Coffee",
    "placeId": "ChIJxyz123",
    "types": ["cafe"],
    "location": { "lat": 37.7749, "lng": -122.4194 }
  },
  "coordinates": { "latitude": 37.7749, "longitude": -122.4194 },
  "timestamp": 1732185600000,
  "hits": 5
}

// Tag cache (contact hash)
// Key: tags:a1b2c3d4
// TTL: 24 hours
{
  "tags": ["tech-executive", "automotive", "c-level"],
  "generatedAt": 1732185600000,
  "model": "gemini-2.5-flash",
  "confidence": 0.92
}

// Event detection cache
// Key: events:{userId}:{date}
// TTL: 1 hour
{
  "clusters": [/* event clusters */],
  "detectedAt": 1732185600000,
  "contactCount": 15,
  "eventCount": 2
}
```

---

## Testing Strategy

### Unit Tests

```javascript
describe('LocationEnrichmentService', () => {
  test('caches location within 100m radius', async () => {
    // Add location A
    await enrichContactLocation({
      location: { latitude: 37.7749, longitude: -122.4194 }
    }, 'user_test');

    // Add location B (50m away) - should hit cache
    const result = await enrichContactLocation({
      location: { latitude: 37.7753, longitude: -122.4194 }
    }, 'user_test');

    expect(result.source).toBe('cache');
    expect(result.cost).toBe(0);
  });

  test('detects event clusters correctly', async () => {
    // Add 5 contacts at same location within 2 hours
    const contacts = await addTestContacts(5, {
      location: { latitude: 37.7749, longitude: -122.4194 },
      timeSpan: '2h'
    });

    const events = await detectEventClusters('user_test');

    expect(events.events.length).toBe(1);
    expect(events.events[0].members.length).toBe(5);
  });

  test('generates tags with Gemini 2.5 Flash', async () => {
    const result = await generateSemanticTags({
      name: 'John Smith',
      company: 'Tesla',
      jobTitle: 'CTO'
    });

    expect(result.tags).toContain('tech-executive');
    expect(result.model).toBe('gemini-2.5-flash');
    expect(result.cost).toBeLessThan(0.00001);
  });
});
```

### Manual Testing Checklist

- [ ] Exchange contact at known venue, verify enrichment
- [ ] Add 3+ contacts at same location/time, verify event suggestion
- [ ] Click "Add All to Group", verify group creation
- [ ] Generate tags for new contact, verify relevance
- [ ] Check Redis cache hit rate (target: >70%)
- [ ] Verify budget check prevents API calls when exhausted
- [ ] Test across all 5 languages
- [ ] Verify cost tracking accuracy

---

## Implementation Phases

### Phase 1: Foundation & Manual Search (✅ COMPLETED)
**Timeline:** Completed
**Status:** Production

Implemented:
- ✅ Google Places API integration (Autocomplete + Details)
- ✅ Cost tracking integration (CostTrackingService)
- ✅ Budget pre-flight checks
- ✅ Manual location search in group creation (LocationSelector)
- ✅ Client-side caching (5min autocomplete, 24h details)
- ✅ Error handling and budget exceeded warnings
- ✅ usePlacesSearch custom hook

Files Created:
- `lib/services/serviceContact/client/services/PlacesService.js`
- `lib/services/serviceContact/server/GroupService/placesService.js`
- `app/dashboard/(dashboard pages)/contacts/components/GroupModalComponents/creategroup/LocationSelector.jsx`
- `app/dashboard/(dashboard pages)/contacts/components/GroupModalComponents/creategroup/EventLocationSearch.jsx`
- `lib/services/serviceContact/client/hooks/usePlacesSearch.js`

### Phase 2: User Settings & Controls (⏸️ NEXT - 1 week)
**Priority:** High
**Blockers:** None

Tasks:
- [ ] Create LocationServicesTab component in settings
- [ ] Add locationServicesEnabled toggle
- [ ] Add granular feature toggles (autoEnrichment, eventDetection, autoTagging)
- [ ] Add cost transparency display (monthly usage, limits)
- [ ] Update settingsService.js with location settings methods
- [ ] Update settings page to include new tab
- [ ] Add i18n translations for location settings

Files to Create:
- `app/dashboard/(dashboard pages)/settings/components/LocationServicesTab.jsx`

Files to Update:
- `lib/services/serviceSetting/server/settingsService.js`
- `app/dashboard/(dashboard pages)/settings/page.jsx`
- `public/locales/*/common.json` (5 languages)

### Phase 3: Auto-Enrichment & Public Profile Integration (⏸️ PLANNED - 2 weeks)
**Dependencies:** Phase 2 (settings must exist first)

Tasks:
- [ ] Create LocationEnrichmentService (server-side)
- [ ] Implement Redis caching with 100m grid precision
- [ ] Add /api/user/contacts/location/enrich endpoint
- [ ] Integrate with ExchangeButton flow in public profile
- [ ] Check locationServicesEnabled setting before enrichment
- [ ] Implement budget checks and graceful degradation
- [ ] Add venue enrichment to contact metadata
- [ ] Update contact exchange flow

Files to Create:
- `lib/services/serviceContact/server/LocationEnrichmentService.js`
- `app/api/user/contacts/location/enrich/route.js`

Files to Update:
- `app/[userId]/components/ExchangeButton.jsx`
- `lib/services/serviceContact/server/exchangeService.js`

### Phase 4: Smart Event Detection (⏸️ PLANNED - 2 weeks)
**Dependencies:** Phase 3 (needs enriched contacts)

Tasks:
- [ ] Create EventDetectionService (temporal + spatial clustering)
- [ ] Implement Haversine distance calculation
- [ ] Add /api/user/contacts/location/suggest-event endpoint
- [ ] Create event detection background job (runs hourly)
- [ ] Add notification system for event suggestions
- [ ] Implement batch group creation from detected events
- [ ] Update dashboard to show event suggestions

Files to Create:
- `lib/services/serviceContact/server/EventDetectionService.js`
- `app/api/user/contacts/location/suggest-event/route.js`
- `app/dashboard/(dashboard pages)/contacts/components/EventSuggestionsPanel.jsx` (new)

### Phase 5: AI Auto-Tagging (🚧 IN PROGRESS - Week 1-2 of 5)
**Dependencies:** Phase 3 (needs enriched contacts) ✅ Complete
**Migration Guide:** [PHASE5_AUTO_TAGGING_MIGRATION.md](../infrastructure/PHASE5_AUTO_TAGGING_MIGRATION.md)
**Updated Architecture:** [SEMANTIC_SEARCH_ARCHITECTURE_V2.md](../infrastructure/SEMANTIC_SEARCH_ARCHITECTURE_V2.md)

**Progress:** Documentation complete, implementation in progress

Tasks:
- [x] Create comprehensive migration documentation
- [x] Design V2 semantic search architecture (tags replace query enhancement)
- [ ] Integrate Gemini 2.5 Flash API
- [ ] Create AutoTaggingService with tag generation logic (following LocationEnrichmentService pattern)
- [ ] Add /api/user/contacts/tags/generate endpoint
- [ ] Implement lazy tag generation for existing contacts (not batch)
- [ ] Add Redis caching for generated tags (24h TTL)
- [ ] Update contact model to support tags field
- [ ] Add tags to document builder (for vector embeddings)
- [ ] Add tag-based search to contact search
- [ ] Update semantic search to use tags instead of query enhancement

Files to Create:
- [x] `documentation/infrastructure/PHASE5_AUTO_TAGGING_MIGRATION.md`
- [x] `documentation/infrastructure/SEMANTIC_SEARCH_ARCHITECTURE_V2.md`
- [x] `documentation/features/CONTACT_CREATION_ENRICHMENT_FLOW.md`
- [ ] `lib/services/serviceContact/server/AutoTaggingService.js`
- [ ] `app/api/user/contacts/tags/generate/route.js`
- [ ] `lib/services/serviceContact/server/migrations/lazyTagMigration.js`
- [ ] `app/dashboard/(dashboard pages)/contacts/components/TagFilter.jsx`
- [ ] `app/dashboard/(dashboard pages)/contacts/components/TagBadge.jsx`

### Phase 6: Polish & Testing (⏸️ PLANNED - 1 week)
**Dependencies:** All previous phases

Tasks:
- [ ] i18n for all new features (5 languages)
- [ ] Unit tests for all services
- [ ] Integration tests for API endpoints
- [ ] Performance testing (budget tracking overhead)
- [ ] Cost tracking validation
- [ ] Documentation updates
- [ ] User guide for location services
- [ ] Build verification with build-manager-skill

**Testing Checklist:**
- [ ] Budget checks prevent API calls when exhausted
- [ ] Settings toggle correctly enables/disables features
- [ ] Client-side cache reduces API calls
- [ ] Redis cache (when implemented) provides 70%+ hit rate
- [ ] Cost tracking accurately records all operations
- [ ] Graceful degradation when features disabled
- [ ] Mobile responsive design for all new components

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Cache hit rate (location) | >70% |
| Cache hit rate (tags) | >80% |
| Event detection accuracy | >85% |
| Tag relevance score | >90% |
| API response time (p95) | <300ms |
| Cost per enrichment | <$0.005 |
| Monthly cost per user | <$1.00 |

---

## Related Technologies

- **Location:** Google Places API (Reverse Geocoding, Nearby Search)
- **AI:** Gemini 2.5 Flash (ultra-fast tagging)
- **Cache:** Redis (15-30min TTL, 24h for tags)
- **Database:** Firestore
- **Cost Tracking:** CostTrackingService
- **i18n:** 5 languages (EN, FR, ES, ZH, VI)

---

## Build Integration & Testing

### Build Manager Skill Integration

The location services implementation uses the **build-manager-skill** for automated build verification and error fixing.

**Skill Overview:**
- Automated Next.js build management
- Identifies and fixes 38+ common build error patterns
- Iterative fixing (max 10 iterations)
- Stops on manual-review errors

**Usage During Development:**

```bash
# After implementing a new location feature
$ Run the build and fix any errors

# The build-manager-skill will:
# 1. Clear .next cache
# 2. Run npm run build
# 3. Analyze errors (Python script)
# 4. Apply automatic fixes
# 5. Re-run build
# 6. Report results
```

**Common Errors to Watch For:**

1. **Import Errors** (85% auto-fixable)
   - Missing PlacesService imports
   - Wrong path to LocationSelector component
   - Missing hooks imports (usePlacesSearch)

2. **TypeScript Errors** (70% auto-fixable)
   - Missing type annotations on location parameters
   - Implicit any in event handlers
   - Type mismatches in API responses

3. **React Errors** (75% auto-fixable)
   - Missing useEffect dependencies
   - Missing keys in location result lists
   - Hook ordering issues

4. **ESLint Warnings** (90% auto-fixable)
   - Unused imports in LocationServicesTab
   - Console.log statements in PlacesService
   - Formatting issues

**Build Verification Checklist:**

After implementing each phase:
```bash
# Phase 2: Settings Implementation
$ Run the build and fix any errors
# Verify: LocationServicesTab component builds successfully
# Check: No TypeScript errors in settings service

# Phase 3: Auto-Enrichment
$ Run the build and fix any errors
# Verify: LocationEnrichmentService has no import errors
# Check: Public profile still builds correctly

# Phase 4: Event Detection
$ Run the build and fix any errors
# Verify: EventDetectionService builds without errors
# Check: Dashboard renders with new components

# Phase 5: AI Tagging
$ Run the build and fix any errors
# Verify: AutoTagService integrates properly
# Check: Gemini API calls are typed correctly
```

**Manual Review Scenarios:**

The build-manager-skill will stop and require manual review for:

1. **Hydration Errors** - Server/client mismatch in LocationSelector
2. **Circular Dependencies** - If services import each other incorrectly
3. **Complex Type Errors** - Google Places API response types
4. **Webpack Errors** - Bundle size issues with new location code

**Cost Considerations for Builds:**

- Each build runs Google Maps API in development mode
- **Important:** Use `.env.local` with test API key during builds
- Production API key should only be in production environment
- Development builds should not charge real costs

**Build Health Monitoring:**

After major changes:
```bash
# Check build health without fixes
$ Check build health

# Example output:
# 📊 Build Health Report
# Status: FAILED
# Errors: 3
# Warnings: 5
#
# ── Auto-fix Potential ──
# ✓ 2 import errors (auto-fixable)
# ✓ 5 eslint warnings (auto-fixable)
# ⚠ 1 TypeScript error (manual review)
```

**Integration with Other Skills:**

The build-manager-skill is standalone but works well with:
- **test-manager-skill** - Run tests before builds
- **git-manager-skill** - Commit after successful builds
- **docs-manager-skill** - Update docs after builds pass

**Recommended Workflow:**

```bash
# 1. Implement feature
# 2. Run tests
$ Run tests for location services

# 3. Fix build errors
$ Run the build and fix any errors

# 4. Commit if successful
$ Commit the changes with message "feat: add location services settings"

# 5. Update documentation
$ Update documentation for location services
```

---

## Related Documentation

- `documentation/features/GEOCODING_SYSTEM_GUIDE.md` - Reverse geocoding implementation
- `documentation/features/VENUE_ENRICHMENT_FEATURE.md` - Venue enrichment details
- `documentation/infrastructure/COST_TRACKING_MIGRATION_GUIDE.md` - Cost tracking system
- `.claude/skills/build-manager-skill/SKILL.md` - Build automation documentation

---

**Status:** Partially Implemented
- ✅ Phase 1: Foundation & Manual Search (Production)
- ⏸️ Phase 2: User Settings & Controls (Next - High Priority)
- ⏸️ Phase 3: Auto-Enrichment (Planned)
- ⏸️ Phase 4: Event Detection (Planned)
- ⏸️ Phase 5: AI Auto-Tagging (Planned)
- ⏸️ Phase 6: Polish & Testing (Planned)

**Priority:** High
**Estimated Remaining Effort:** 5 weeks (excluding Phase 1)
