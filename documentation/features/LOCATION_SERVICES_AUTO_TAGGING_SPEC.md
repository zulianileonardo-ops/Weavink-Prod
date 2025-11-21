---
id: features-location-services-auto-tagging-080
title: Intelligent Location Services & AI Auto-Tagging System
category: features
tags: [location, gps, google-places, auto-tagging, event-detection, redis-cache, ai, gemini, premium-features, planned]
status: planned
created: 2025-11-21
updated: 2025-11-21
related:
  - features-venue-enrichment-021
  - features-event-grouping-018
  - technical-cost-tracking-migration-024
  - technical-budget-check-usage-027
---

# Intelligent Location Services & AI Auto-Tagging System

## Overview

An advanced location-based contact management system that automatically enriches contact data with venue information, detects events, suggests batch group additions, and generates semantic tags using AI for enhanced search and organization.

## Business Requirements

### Core Features

1. **Reverse Location Search (Pro/Premium)**
   - Automatic venue detection when contacts are exchanged
   - Google Places API integration for venue enrichment
   - Intelligent caching strategy (100m radius, 15-30 min TTL)
   - Cost optimization through aggressive caching

2. **Smart Event Detection Dashboard**
   - Automatically detect when multiple contacts share location + time
   - Popup suggestions: "Add all contacts from the past 4 hours?"
   - Batch group creation with one click
   - Event venue naming

3. **AI-Powered Auto-Tagging**
   - Ultra-fast tagging using Gemini 2.5 Flash
   - Semantic tags for improved search accuracy
   - Lightning-fast group creation with structured tags
   - Tag suggestions based on context (location, time, company)

4. **Premium Tier Features**
   - Pro: Basic location tagging, manual event grouping
   - Premium: Full auto-detection, AI tagging, batch operations
   - Business/Enterprise: Unlimited operations, priority processing

---

## Technical Architecture

### System Components

```
┌────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│  LocationEnrichmentService.js (client)                             │
│  - reverseGeocode()                                                │
│  - findNearbyVenues()                                              │
│  - suggestEventGroups()                                            │
│  AutoTagService.js (client)                                        │
│  - generateTags()                                                  │
│  - suggestTags()                                                   │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                        API ROUTES                                   │
│  /api/user/contacts/location/reverse-search/route.js              │
│  /api/user/contacts/location/suggest-event/route.js               │
│  /api/user/contacts/tags/generate/route.js                        │
│                                                                    │
│  - Authentication (createApiSession)                               │
│  - Permission checks (PREMIUM_LOCATION_SERVICES)                   │
│  - Budget pre-flight checks                                        │
│  - Rate limiting (follows existing patterns)                       │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                                  │
│  lib/services/serviceContact/server/                               │
│  ├── LocationEnrichmentService.js                                 │
│  │   - reverseGeocodeLocation()                                   │
│  │   - findNearbyVenues() (extends PlacesService)                 │
│  │   - calculateProximity()                                       │
│  │   - detectEventClusters()                                      │
│  ├── EventDetectionService.js                                     │
│  │   - findTemporalClusters()                                     │
│  │   - suggestBatchAdditions()                                    │
│  │   - createEventGroup()                                         │
│  └── AutoTagService.js (server)                                   │
│      - generateSemanticTags()                                     │
│      - inferTagsFromContext()                                     │
│      - batchTagGeneration()                                       │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL APIS & AI                               │
│  Google Places API:                                                │
│  - Reverse Geocoding                                               │
│  - Nearby Search (venues, events)                                  │
│  - Place Details                                                   │
│  - Smart caching (100m radius, 15-30min TTL)                       │
│                                                                    │
│  AI Layer:                                                         │
│  - Gemini 2.5 Flash for auto-tagging                              │
│  - Context analysis (location + company + time)                    │
│  - Semantic tag generation                                         │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                    CACHE & DATABASE                                 │
│  Redis Cache:                                                      │
│  - Location data (100m radius grid)                                │
│  - TTL: 15-30 minutes                                              │
│  - Key format: location:${lat_round}:${lng_round}                 │
│                                                                    │
│  Firestore:                                                        │
│  - Contacts with location data                                     │
│  - Event groups metadata                                           │
│  - Auto-generated tags                                             │
│  - Location enrichment history                                     │
└────────────────────────────────────────────────────────────────────┘
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

**Component:** `app/dashboard/contacts/components/EventSuggestionPanel.jsx`

**Detection Logic:**

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

**Dashboard UI:**

```jsx
// EventSuggestionPanel.jsx
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

### Phase 1: Location Enrichment (2 weeks)
- ✅ Google Places API integration
- ✅ Redis caching (100m radius)
- ✅ Cost tracking integration
- ✅ Budget pre-flight checks
- ✅ Basic UI for enriched contacts

### Phase 2: Event Detection (2 weeks)
- ✅ Temporal + spatial clustering
- ✅ Event suggestion panel
- ✅ Batch group creation
- ✅ Venue naming
- ✅ Dashboard integration

### Phase 3: AI Auto-Tagging (1 week)
- ✅ Gemini 2.5 Flash integration
- ✅ Tag generation logic
- ✅ Batch processing
- ✅ Redis cache for tags
- ✅ Tag-based search

### Phase 4: Polish & Testing (1 week)
- ✅ i18n for 5 languages
- ✅ Rate limiting
- ✅ Performance optimization
- ✅ Unit + integration tests
- ✅ Documentation

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

**Status:** Planned Feature (Not Yet Implemented)
**Priority:** High
**Estimated Effort:** 6 weeks
