---
id: features-contact-enrichment-035
title: Contact Creation & Enrichment Flow
category: features
tags: [contacts, enrichment, location, auto-tagging, exchange, session-tracking, venue, geocoding, ai-features, vector-embedding]
status: active
created: 2025-11-22
updated: 2025-11-23
related:
  - SESSION_BASED_ENRICHMENT.md
  - LOCATION_SERVICES_AUTO_TAGGING_SPEC.md
  - GEOCODING_SYSTEM_GUIDE.md
  - PHASE5_AUTO_TAGGING_MIGRATION.md
  - SEMANTIC_SEARCH_ARCHITECTURE_V2.md
---

# Contact Creation & Enrichment Flow

## 📋 Overview

This guide documents the complete end-to-end flow of contact creation with automatic enrichment, from initial GPS capture through location services and AI-powered tagging.

**Completion Status:**
- ✅ **Phase 1:** GPS Capture & Manual Search (Complete)
- ✅ **Phase 2:** User Settings & Controls (Complete)
- ✅ **Phase 3:** Auto-Enrichment & Venue Detection (Complete)
- 🚧 **Phase 5:** AI Auto-Tagging (In Progress)

---

## Table of Contents

1. [Contact Creation Methods](#contact-creation-methods)
2. [Exchange Flow (Primary)](#exchange-flow-primary)
3. [Enrichment Pipeline](#enrichment-pipeline)
4. [Session Tracking Strategy](#session-tracking-strategy)
5. [Cost & Budget Management](#cost--budget-management)
6. [Database Schema](#database-schema)
7. [Error Handling](#error-handling)
8. [Testing Guide](#testing-guide)

---

## Contact Creation Methods

### 1. Public Profile Exchange (Implemented)

**Primary Method:** User visits public profile (`/[userId]`) and exchanges contact info

**Files:**
- `app/[userId]/components/ExchangeModal.jsx` - Contact exchange UI
- `app/[userId]/components/ExchangeButton.jsx` - Trigger component
- `app/api/user/contacts/exchange/submit/route.js` - API endpoint
- `lib/services/serviceContact/server/exchangeService.js` - Business logic

**Features:**
- ✅ GPS capture via browser geolocation API
- ✅ Real-time GPS accuracy display
- ✅ Automatic venue detection
- ✅ Reverse geocoding (GPS → address)
- ✅ AI-powered semantic tagging
- ✅ Session-based cost tracking
- ✅ Budget enforcement

**Flow:**
```
Visitor → Public Profile → ExchangeButton → ExchangeModal
  → Fill form (name, email, phone, etc.)
  → GPS captured automatically
  → Submit
  → API: /api/user/contacts/exchange/submit
  → ExchangeService.submitExchangeContact()
  → Multi-step enrichment (geocoding + venue + tags)
  → Contact saved to Firestore
  → Vector indexed in Pinecone
  → Success response
```

### 2. Manual Contact Creation (Future)

**Planned Method:** User manually creates contact in dashboard

**Files to Create:**
- `app/dashboard/(dashboard pages)/contacts/components/CreateContactModal.jsx`
- `app/api/user/contacts/create/route.js`

**Features:**
- Manual form entry
- Optional GPS input
- Manual tag entry with AI suggestions
- No automatic enrichment (user-controlled)

### 3. Business Card Scanner (Future)

**Planned Method:** Scan business card with camera, extract data with AI

**Files to Create:**
- `app/dashboard/(dashboard pages)/contacts/components/BusinessCardScanner.jsx`
- `lib/services/serviceContact/server/cardScanningService.js`

**Features:**
- Camera integration
- OCR with Google Vision API
- Field extraction with Gemini
- Automatic enrichment if GPS available

### 4. Bulk Import (Future)

**Planned Method:** Import contacts from CSV/JSON/vCard

**Files to Create:**
- `app/dashboard/(dashboard pages)/contacts/components/ImportContactsModal.jsx`
- `lib/services/serviceContact/server/importService.js`

**Features:**
- File upload
- Field mapping
- Batch enrichment (with rate limiting)
- Progress tracking

---

## Exchange Flow (Primary)

### Complete End-to-End Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ VISITOR: Opens public profile /[userId]                              │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 1: EXCHANGE MODAL                                               │
│ File: app/[userId]/components/ExchangeModal.jsx                      │
│                                                                      │
│ - Form appears with contact fields                                  │
│ - GPS automatically captured (if permission granted)                │
│ - Accuracy displayed in real-time                                   │
│ - User fills: name, email, phone, company, jobTitle, notes          │
│ - User clicks "Share My Contact"                                    │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 2: API CALL                                                     │
│ POST /api/user/contacts/exchange/submit                             │
│                                                                      │
│ Request body:                                                        │
│ {                                                                    │
│   username: "johndoe",           // Profile owner username          │
│   contact: {                                                         │
│     name: "Jane Smith",                                             │
│     email: "jane@example.com",                                      │
│     phone: "+1234567890",                                           │
│     company: "Tesla",                                               │
│     jobTitle: "Senior Engineer",                                    │
│     notes: "",                                                      │
│     location: {                  // GPS data                        │
│       latitude: 37.7749,                                            │
│       longitude: -122.4194,                                         │
│       accuracy: 10               // meters                          │
│     }                                                               │
│   },                                                                │
│   metadata: {                                                        │
│     userAgent: "Mozilla/5.0...", ip: "192.168.1.1"                 │
│   }                                                                 │
│ }                                                                    │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 3: AUTHENTICATION & VALIDATION                                 │
│ File: app/api/user/contacts/exchange/submit/route.js                │
│                                                                      │
│ 1. Lookup profile owner by username                                 │
│ 2. Check if contact exchange is enabled                             │
│ 3. Validate contact data (required fields)                          │
│ 4. Rate limiting check (prevent spam)                               │
│ 5. Get user settings & subscription level                           │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 4: EXCHANGE SERVICE                                             │
│ File: lib/services/serviceContact/server/exchangeService.js         │
│ Method: ExchangeService.submitExchangeContact()                     │
│                                                                      │
│ - Deduplicate check (email + phone)                                 │
│ - Generate contactId                                                │
│ - Prepare base contact object                                       │
│ - Check if enrichment enabled                                       │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                  ┌──────────┴──────────┐
                  │ GPS Available?      │
                  │ Enrichment Enabled? │
                  └──────────┬──────────┘
                             │
                ┌────────────┴─────────────┐
                │ YES                      │ NO
                ▼                          │
┌──────────────────────────────────────┐   │
│ STEP 5: ENRICHMENT PIPELINE          │   │
│ (Details in next section)            │   │
│                                      │   │
│ 5a. Reverse Geocoding                │   │
│ 5b. Venue Search                     │   │
│ 5c. AI Auto-Tagging ← PHASE 5        │   │
│ 5d. Vector Embedding ← PHASE 5       │   │
└────────────────┬─────────────────────┘   │
                 │                         │
                 │    ┌────────────────────┘
                 │    │
                 ▼    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 6: SAVE CONTACT                                                 │
│                                                                      │
│ Contact object (enriched):                                          │
│ {                                                                    │
│   id: "contact_abc123",                                             │
│   name: "Jane Smith",                                               │
│   email: "jane@example.com",                                        │
│   phone: "+1234567890",                                             │
│   company: "Tesla",                                                 │
│   jobTitle: "Senior Engineer",                                      │
│   location: {                                                        │
│     latitude: 37.7749,                                              │
│     longitude: -122.4194,                                           │
│     city: "San Francisco",          ← From geocoding                │
│     country: "United States",       ← From geocoding                │
│     formattedAddress: "Market St"   ← From geocoding                │
│   },                                                                │
│   metadata: {                                                        │
│     venue: {                         ← From venue search            │
│       name: "Starbucks Reserve",                                    │
│       placeId: "ChIJ...",                                           │
│       address: "1 Market St",                                       │
│       distance: 15                  // meters from GPS              │
│     },                                                              │
│     enrichmentAttempted: true,                                      │
│     budgetExceeded: false,                                          │
│     skippedFeatures: []                                             │
│   },                                                                │
│   tags: [                            ← From AI auto-tagging          │
│     "coffee-shop-meeting",                                          │
│     "tech-executive",                                               │
│     "tesla-employee",                                               │
│     "automotive-industry",                                          │
│     "san-francisco-contact"                                         │
│   ],                                                                │
│   createdAt: Timestamp,                                             │
│   updatedAt: Timestamp                                              │
│ }                                                                    │
│                                                                      │
│ Saved to:                                                            │
│ - Firestore: users/{userId}/contacts/{contactId}                   │
│ - Pinecone: Vector index with metadata                             │
└────────────────┬─────────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 7: SESSION FINALIZATION                                         │
│                                                                      │
│ If multi-step session created:                                      │
│ - SessionTrackingService.finalizeSession()                          │
│ - Mark session as 'completed'                                       │
│ - Set completedAt timestamp                                         │
│                                                                      │
│ Session document:                                                    │
│ SessionUsage/{userId}/sessions/{sessionId} {                        │
│   feature: 'location_enrichment',                                   │
│   status: 'completed',                                              │
│   totalCost: 0.0370102,           // geocoding + venue + tags + embedding │
│   totalRuns: 3,                   // 3 billable operations (embedding is cost-only) │
│   steps: [Step 1, Step 2, Step 3, Step 4],                         │
│   completedAt: Timestamp                                            │
│ }                                                                    │
└────────────────┬─────────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 8: RESPONSE                                                     │
│                                                                      │
│ 200 OK {                                                             │
│   success: true,                                                     │
│   contact: {                                                         │
│     id: "contact_abc123",                                           │
│     name: "Jane Smith",                                             │
│     // ... full contact data                                        │
│   },                                                                │
│   enrichment: {                                                      │
│     geocodingSuccess: true,                                         │
│     venueFound: true,                                               │
│     tagsGenerated: 5,                                               │
│     vectorEmbedded: true,                                           │
│     totalCost: 0.0370102,                                           │
│     sessionId: "session_enrich_1732567890_x7k2"                     │
│   }                                                                 │
│ }                                                                    │
└────────────────┬─────────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 9: UI UPDATE                                                    │
│                                                                      │
│ - ExchangeModal shows success message                               │
│ - Display enrichment results (venue name, tags)                     │
│ - Show "View Contact" button                                        │
│ - User can close modal or view contact card                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Enrichment Pipeline

### Multi-Step Enrichment Overview

When a contact is created with GPS coordinates, the enrichment pipeline runs automatically (if enabled and budget available):

```
GPS Coordinates
  ↓
Step 1: Reverse Geocoding ($0.005) → City, Country, Address
  ↓
Step 2: Venue Search ($0.032 API / $0 cached) → Venue Name, Place ID
  ↓
Step 3: AI Auto-Tagging (token-based, ~$0.0000002-$0.000001) → Semantic Tags
  ↓
Step 4: Vector Embedding (~$0.00001) → 1024D vector for semantic search
  ↓
Enriched Contact Saved + Vector Indexed
```

### Step-by-Step Breakdown

#### Step 1: Reverse Geocoding

**Service:** `LocationEnrichmentService.enrichContact()`
**Provider:** Google Maps Geocoding API
**Cost:** $0.005 per request
**Time:** ~150ms

**Input:**
```javascript
{
  latitude: 37.7749,
  longitude: -122.4194
}
```

**Process:**
1. Check if geocoding enabled (`settings.locationFeatures.geocoding`)
2. Budget pre-flight check (API budget)
3. Call Google Maps reverse geocoding API
4. Parse address components (city, country, postal code)
5. Record cost:
   - **Standalone** (geocoding only) → `ApiUsage` collection
   - **Multi-step** (geocoding + venue/tagging) → `SessionUsage` collection

**Output:**
```javascript
{
  city: "San Francisco",
  country: "United States",
  countryCode: "US",
  region: "California",
  postalCode: "94103",
  formattedAddress: "Market St, San Francisco, CA 94103, USA"
}
```

**Budget Check:**
```javascript
const geocodingCost = API_COSTS.GOOGLE_MAPS.GEOCODING.PER_REQUEST;  // $0.005
const affordabilityCheck = await CostTrackingService.canAffordGeneric(
  userId,
  'ApiUsage',  // API budget (not AI)
  geocodingCost,
  true         // Billable run
);

if (!affordabilityCheck.canAfford) {
  // Skip geocoding, continue with GPS only
  return contactWithBudgetTracking;
}
```

#### Step 2: Venue Search

**Service:** `LocationEnrichmentService.getVenueData()`
**Provider:** Google Places Nearby Search API + Redis Cache
**Cost:** $0.032 per API request (70%+ cache hit rate → ~$0.010 average)
**Time:** ~300ms (API) / ~50ms (cache hit)

**Input:**
```javascript
{
  latitude: 37.7749,
  longitude: -122.4194
}
```

**Process:**
1. Check if venue enrichment enabled (`settings.locationFeatures.autoVenueEnrichment`)
2. Budget pre-flight check (API budget)
3. Generate cache key (100m grid precision)
4. Check Redis cache (24h TTL)
5. If cache miss → Call Google Places Nearby Search
6. Parse venue data (name, place ID, address)
7. Store in Redis cache (15-30 min randomized TTL)
8. Record cost:
   - **Standalone** (venue only) → `ApiUsage` collection
   - **Multi-step** (geocoding + venue, or venue + tagging) → `SessionUsage` collection

**Output:**
```javascript
{
  venue: {
    name: "Starbucks Reserve Roastery",
    placeId: "ChIJPe0RgYWAhYARxIbGaKS0_LY",
    address: "1 Market St, San Francisco, CA 94105",
    types: ["cafe", "food", "point_of_interest"],
    rating: 4.5,
    userRatingsTotal: 1234,
    distance: 15,  // meters from GPS
    businessStatus: "OPERATIONAL"
  },
  source: "api",  // or "cache"
  cost: 0.032     // or 0 if cached
}
```

**Caching Strategy:**
```javascript
// 100m grid precision
const cacheKey = `venue:${Math.round(latitude * 1000)}:${Math.round(longitude * 1000)}`;

// Randomized TTL (prevent thundering herd)
const ttl = 900 + Math.random() * 900;  // 15-30 minutes

await redisClient.set(cacheKey, { venue, timestamp: Date.now() }, { ttl });
```

#### Step 3: AI Auto-Tagging (NEW - Phase 5)

**Service:** `AutoTaggingService.tagContact()`
**Provider:** 3-Tier Caching System
  - **Tier 1:** Static Cache (COMMON_CONTACT_TAGS) - Instant, $0
  - **Tier 2:** Redis Cache (24h TTL) - Recent AI tags, $0
  - **Tier 3:** Gemini 2.5 Flash - Live generation, token-based cost
**Cost:** Token-based calculation (typical: $0.0000002 - $0.000001 per contact, varies by complexity)
**Time:** Instant (static cache) / ~20ms (Redis) / ~200ms (AI generation)

**Input:**
```javascript
{
  name: "Jane Smith",
  email: "jane@example.com",
  company: "Tesla",
  jobTitle: "Senior Engineer",
  notes: "Met at AI conference",
  location: {
    city: "San Francisco",
    country: "United States"
  },
  metadata: {
    venue: {
      name: "Starbucks Reserve",
      types: ["cafe", "food"]
    }
  }
}
```

#### Budget Independence

Auto-tagging uses the **AI budget** (separate from API budget). This means:

✅ **Auto-tagging CAN run when:**
- AI budget is available
- Contact has taggable data (name, company, jobTitle, or notes)
- Auto-tagging is enabled in settings

**Even if:**
- API budget is exceeded (no geocoding or venue data)
- Earlier enrichment steps were skipped
- Contact only has: GPS + name + company (no address/venue)

❌ **Auto-tagging will NOT run when:**
- AI budget is exceeded
- Contact is too sparse (GPS only, no name/company/jobTitle/notes)
- Auto-tagging is disabled in settings

**Example Scenarios:**

| API Budget | AI Budget | Geocoding | Venue | Tagging | Embedding | Result |
|------------|-----------|-----------|-------|---------|-----------|--------|
| ✅ OK | ✅ OK | ✅ Runs | ✅ Runs | ✅ Runs | ✅ Runs | Full enrichment |
| ❌ Exceeded | ✅ OK | ❌ Skipped | ❌ Skipped | ✅ **Runs** | ❌ Skipped | **Tags only** (from name/company) |
| ✅ OK | ❌ Exceeded | ✅ Runs | ✅ Runs | ❌ Skipped | ✅ Runs | Location + vector, no tags |
| ❌ Exceeded | ❌ Exceeded | ❌ Skipped | ❌ Skipped | ❌ Skipped | ❌ Skipped | GPS only |

**Why This Matters:**
- User with AI budget gets AI value, even without API budget
- Tags from "Tesla" + "Senior Engineer" are still valuable for search/categorization
- Enables graceful degradation (partial enrichment > no enrichment)
- Can re-run geocoding later when API budget refills

**Process:**
1. Check if auto-tagging enabled (`settings.locationFeatures.autoTagging`)
2. **Tier 1 - Check Static Cache** (COMMON_CONTACT_TAGS)
   - Extract job title, company, keywords
   - Check for exact/partial matches in static cache
   - If match found → Return cached tags (instant, $0)
3. **Tier 2 - Check Redis Cache** (24h TTL)
   - Generate content hash for cache key
   - Check Redis for previously AI-generated tags
   - If cache hit → Return cached tags (~20ms, $0)
4. **Tier 3 - AI Generation** (Gemini 2.5 Flash)
   - Budget pre-flight check with ESTIMATED cost (AI budget, not API)
   - Build prompt with full contact context
   - Call Gemini 2.5 Flash for tag generation
   - Calculate ACTUAL cost from real token usage:
     ```javascript
     const inputTokens = Math.ceil(promptText.length / 4);
     const outputTokens = Math.ceil(responseText.length / 4);
     const actualCost = (inputTokens / 1000000) * 0.30 + (outputTokens / 1000000) * 2.50;
     ```
   - Parse JSON response (tags array)
   - Store in Redis cache
   - Record ACTUAL cost (not estimate)

**Prompt Template:**
```
Analyze this contact and generate 3-7 semantic tags for organization and search.

Contact Information:
{
  name: "Jane Smith",
  company: "Tesla",
  jobTitle: "Senior Engineer",
  venue: "Starbucks Reserve",
  location: "San Francisco",
  notes: "Met at AI conference"
}

Tags should be:
- Lowercase, dash-separated
- Specific and searchable (not generic)
- Categories: industry, role, company-related, location-type, relationship
- Max 3 words per tag

Examples of GOOD tags:
- "automotive-industry", "senior-engineer", "tesla-employee", "coffee-shop-meeting"

Return JSON: { "tags": ["tag1", "tag2", ...] }
```

**Output:**
```javascript
{
  tags: [
    "coffee-shop-meeting",
    "tech-executive",
    "tesla-employee",
    "automotive-industry",
    "senior-engineer",
    "san-francisco-contact",
    "ai-conference-attendee"
  ]
}
```

**Budget Check & Cost Tracking:**
```javascript
// 1. Check static cache first (free)
const staticTags = AutoTaggingService._checkStaticCache(contact);
if (staticTags) {
  return { ...contact, tags: staticTags, metadata: { cacheType: 'static', cost: 0 } };
}

// 2. Check Redis cache (free)
const cachedTags = await AutoTaggingService._checkRedisCache(contact);
if (cachedTags) {
  return { ...contact, tags: cachedTags, metadata: { cacheType: 'redis', cost: 0 } };
}

// 3. Budget pre-flight check with ESTIMATED cost (only if both caches miss)
const estimatedCost = AutoTaggingService.estimateTaggingCost(contact);  // ~$0.0000002
const aiAffordabilityCheck = await CostTrackingService.canAffordGeneric(
  userId,
  'AIUsage',  // AI budget (not API)
  estimatedCost,
  true        // Billable run
);

if (!aiAffordabilityCheck.canAfford) {
  // Skip tagging, continue without tags
  return contactWithBudgetTracking;
}

// 4. Call Gemini and calculate REAL token-based cost
const result = await AutoTaggingService._callGeminiTagging(contact, userId, sessionId);

// Calculate actual cost from token usage
const actualCost = (result.tokensUsed.input / 1000000) * CONTACT_INTELLIGENCE_AI_CONFIG.PRICING.INPUT_PER_MILLION +
                   (result.tokensUsed.output / 1000000) * CONTACT_INTELLIGENCE_AI_CONFIG.PRICING.OUTPUT_PER_MILLION;

// 5. Record ACTUAL cost (not estimate)
//    - Standalone (tagging only) → AIUsage collection (sessionId = null)
//    - Multi-step (geocoding/venue + tagging) → SessionUsage collection (sessionId provided)
await CostTrackingService.recordUsage({
  userId,
  usageType: 'AIUsage',  // Indicates this is an AI operation
  feature: CONTACT_INTELLIGENCE_AI_CONFIG.AUTO_TAGGING.FEATURE_NAME,
  cost: actualCost,  // Real token-based cost
  isBillableRun: true,
  provider: CONTACT_INTELLIGENCE_AI_CONFIG.PROVIDER_NAME,
  metadata: {
    tokensIn: result.tokensUsed.input,
    tokensOut: result.tokensUsed.output,
    tagsGenerated: result.tags.length,
    cacheType: 'ai'
  },
  sessionId,  // If provided → SessionUsage, if null → AIUsage
  stepLabel: CONTACT_INTELLIGENCE_AI_CONFIG.AUTO_TAGGING.STEP_LABEL
});

return { ...contact, tags: result.tags, metadata: { cacheType: 'ai', cost: actualCost } };
```

#### Step 4: Vector Embedding (NEW - Phase 5)

**Service:** `VectorStorageService.indexContact()`
**Provider:** Pinecone Inference API
**Model:** multilingual-e5-large (1024 dimensions)
**Cost:** ~$0.00001 per contact (~125 tokens × $0.08/million)
**Time:** ~100-200ms
**Budget:** API (cost-only, not billable run)

**Input:**
```javascript
{
  id: "contact_abc123",
  name: "Jane Smith",
  email: "jane@example.com",
  company: "Tesla",
  jobTitle: "Senior Engineer",
  notes: "Met at AI conference",
  location: {
    city: "San Francisco",
    country: "United States"
  },
  metadata: {
    venue: {
      name: "Starbucks Reserve"
    }
  },
  tags: ["coffee-shop-meeting", "tesla-employee", "senior-engineer"]
}
```

**Process:**
1. Check if embedding enabled (`settings.vectorSearch.enabled` - Premium+ only)
2. Budget pre-flight check (API budget, cost-only operation)
3. Build contact document text from name, company, jobTitle, tags, location, venue
4. Call Pinecone Inference API to generate 1024D embedding
5. Upsert vector to Pinecone index with metadata
6. Record cost:
   - **Always part of session** (runs during enrichment pipeline)
   - **Cost-only operation**: `isBillableRun: false` (adds cost but not run count)
   - Tracked in `SessionUsage` collection

**Document Text Generation:**
```javascript
const documentText = [
  contact.name,
  contact.company,
  contact.jobTitle,
  contact.notes,
  contact.tags?.join(', '),
  contact.location?.city,
  contact.location?.country,
  contact.metadata?.venue?.name
].filter(Boolean).join(' ');

// Example: "Jane Smith Tesla Senior Engineer Met at AI conference coffee-shop-meeting, tesla-employee, senior-engineer San Francisco United States Starbucks Reserve"
```

**Output:**
```javascript
{
  vectorId: "contact_abc123",
  dimensions: 1024,
  magnitude: 0.9998,
  tokens: 125,
  indexed: true
}
```

**Budget Check & Cost Tracking:**
```javascript
// Budget pre-flight check (cost-only, not billable run)
const embeddingCost = VECTOR_EMBEDDING_COSTS.PINECONE_INFERENCE.PER_TOKEN * estimatedTokens;
const affordabilityCheck = await CostTrackingService.canAffordGeneric(
  userId,
  'ApiUsage',  // API budget (not AI)
  embeddingCost,
  false        // NOT a billable run (cost-only)
);

if (!affordabilityCheck.canAfford) {
  // Skip embedding, continue without vector
  return contactWithBudgetTracking;
}

// Generate embedding and index
const result = await VectorStorageService.indexContact(contact, userId);

// Record ACTUAL cost (cost-only, not billable run)
await CostTrackingService.recordUsage({
  userId,
  usageType: 'ApiUsage',  // API budget
  feature: 'contact_vector_embedding',
  cost: result.actualCost,  // Real token-based cost
  isBillableRun: false,     // Cost-only operation
  provider: 'pinecone_inference',
  metadata: {
    model: 'multilingual-e5-large',
    dimensions: 1024,
    tokens: result.tokensUsed,
    documentLength: documentText.length,
    vectorMagnitude: result.magnitude
  },
  sessionId,  // Always part of session
  stepLabel: 'Step 4: Vector Embedding'
});

return { ...contact, vectorEmbedded: true, metadata: { ...contact.metadata, vectorId: result.vectorId } };
```

**Key Points:**
- **Premium+ Only**: Embedding is automatically enabled for Pro, Premium, Business, and Enterprise tiers
- **Cost-Only Operation**: Adds ~$0.00001 cost but does NOT count against monthlyBillableRunsAPI
- **No Caching**: Each contact gets a unique embedding (no cache benefit)
- **Budget Independent**: Runs even if API run limit reached (as long as cost budget available)
- **Always Runs in Session**: Part of multi-step enrichment pipeline

---

## Session Tracking Strategy

### When to Use Sessions

**Multi-Step Operations:**
- Geocoding + Venue Search → Session
- Geocoding + Venue Search + Tagging → Session
- Geocoding + Venue Search + Tagging + Embedding → Session (Premium+ users)
- Geocoding + Embedding → Session
- Venue Search + Tagging → Session
- Geocoding only → Standalone (no session)
- Venue Search only → Standalone (no session)
- Tagging only → Standalone (no session)
- Embedding only → Standalone (no session)

**Decision Logic:**
```javascript
// Check if multi-step operation (budget-aware)
const canGeocode = LocationEnrichmentService.isGeocodingEnabled(userData) &&
  await CostTrackingService.canAffordGeneric(userId, 'ApiUsage', 0.005, true);

const canEnrichVenue = LocationEnrichmentService.isVenueEnrichmentEnabled(userData) &&
  await CostTrackingService.canAffordGeneric(userId, 'ApiUsage', 0.032, true);

const canTag = AutoTaggingService.isAutoTaggingEnabled(userData) &&
  AutoTaggingService.hasTaggableData(contact) &&
  await CostTrackingService.canAffordGeneric(userId, 'AIUsage', 0.0000002, true);

const canEmbed = VectorStorageService.isEmbeddingEnabled(userData) &&
  await CostTrackingService.canAffordGeneric(userId, 'ApiUsage', 0.00001, false);

// Count runnable steps
const runnableSteps = [canGeocode, canEnrichVenue, canTag, canEmbed].filter(Boolean).length;

// Generate session ID ONLY for multi-step (2+ steps)
const isMultiStep = runnableSteps >= 2;
const enrichmentSessionId = isMultiStep
  ? `session_enrich_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
  : null;
```

### Session Structure

**Firestore Path:** `SessionUsage/{userId}/sessions/{sessionId}`

**Document:**
```javascript
{
  feature: 'location_enrichment',
  status: 'in-progress',  // or 'completed', 'abandoned'
  totalCost: 0.0370102,
  totalRuns: 3,  // Embedding is cost-only, not billable
  steps: [
    {
      stepLabel: 'Step 1: Reverse Geocoding',
      operationId: 'op_123abc',
      usageType: 'ApiUsage',
      feature: 'location_reverse_geocoding',
      provider: 'google_maps',
      cost: 0.005,
      isBillableRun: true,
      timestamp: '2025-11-22T10:00:00Z',
      duration: 150,
      metadata: {
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'San Francisco',
        country: 'United States'
      }
    },
    {
      stepLabel: 'Step 2: Venue Search (API)',
      operationId: 'op_124xyz',
      usageType: 'ApiUsage',
      feature: 'location_venue_search',
      provider: 'google_maps',
      cost: 0.032,
      isBillableRun: true,
      timestamp: '2025-11-22T10:00:01Z',
      duration: 300,
      metadata: {
        venueName: 'Starbucks Reserve',
        placeId: 'ChIJ...',
        distance: 15,
        cacheHit: false
      }
    },
    {
      stepLabel: 'Step 3: Auto Tag Generation',
      operationId: 'op_125def',
      usageType: 'AIUsage',
      feature: 'contact_auto_tagging',
      provider: 'gemini-2.5-flash',
      cost: 0.0000002,
      isBillableRun: true,
      timestamp: '2025-11-22T10:00:02Z',
      duration: 200,
      metadata: {
        tagsGenerated: 7,
        tags: ['coffee-shop-meeting', 'tech-executive', ...],
        cacheHit: false
      }
    },
    {
      stepLabel: 'Step 4: Vector Embedding',
      operationId: 'op_126ghi',
      usageType: 'ApiUsage',
      feature: 'contact_vector_embedding',
      provider: 'pinecone_inference',
      cost: 0.00001,
      isBillableRun: false,  // Cost-only operation
      timestamp: '2025-11-22T10:00:03Z',
      duration: 150,
      metadata: {
        model: 'multilingual-e5-large',
        dimensions: 1024,
        tokens: 125,
        documentLength: 500,
        vectorMagnitude: 0.9998
      }
    }
  ],
  createdAt: Timestamp,
  lastUpdatedAt: Timestamp,
  completedAt: Timestamp
}
```

### Budget Tracking Updates

**User Document Updates:**

Each step updates the user's monthly counters:

```javascript
// After Step 1 (Geocoding)
users/{userId} {
  monthlyTotalCost: 0.005,
  monthlyBillableRunsAPI: 1,
  monthlyUsageMonth: "2025-11",
  monthlyUsageLastUpdated: Timestamp
}

// After Step 2 (Venue Search)
users/{userId} {
  monthlyTotalCost: 0.037,       // +0.032
  monthlyBillableRunsAPI: 2,      // +1
  monthlyUsageMonth: "2025-11",
  monthlyUsageLastUpdated: Timestamp
}

// After Step 3 (Auto-Tagging)
users/{userId} {
  monthlyTotalCost: 0.0370002,    // +0.0000002
  monthlyBillableRunsAPI: 2,      // unchanged
  monthlyBillableRunsAI: 1,       // +1 (different counter!)
  monthlyUsageMonth: "2025-11",
  monthlyUsageLastUpdated: Timestamp
}

// After Step 4 (Vector Embedding)
users/{userId} {
  monthlyTotalCost: 0.0370102,    // +0.00001 (cost-only)
  monthlyBillableRunsAPI: 2,      // unchanged (not billable!)
  monthlyBillableRunsAI: 1,       // unchanged
  monthlyUsageMonth: "2025-11",
  monthlyUsageLastUpdated: Timestamp
}
```

**Note:** API and AI budgets are tracked separately! Embedding adds cost but NOT a billable run.

---

## Cost & Budget Management

### Cost Breakdown

| Operation | Provider | Cost/Op | Billable | Budget Type |
|-----------|----------|---------|----------|-------------|
| Reverse Geocoding | Google Maps | $0.005 | Yes | API |
| Venue Search (API) | Google Maps | $0.032 | Yes | API |
| Venue Search (Cache) | Redis | $0 | No | N/A |
| Auto-Tagging (API) | Gemini 2.5 Flash | $0.0000002 | Yes | AI |
| Auto-Tagging (Cache) | Redis | $0 | No | N/A |
| Vector Embedding | Pinecone Inference | $0.00001 | No (cost-only) | API |

### Subscription Limits

| Tier | API Cost Budget | Max API Runs | AI Cost Budget | Max AI Runs |
|------|----------------|--------------|----------------|-------------|
| **BASE** | $0 | 0 | $0 | 0 |
| **PRO** | $1.50 | 50 | $0 | 0 |
| **PREMIUM** | $3.00 | 100 | $3.00 | 30 |
| **BUSINESS** | $5.00 | 200 | $5.00 | 100 |
| **ENTERPRISE** | Unlimited | Unlimited | Unlimited | Unlimited |

### Budget Enforcement

**Pre-Flight Checks:**

Every enrichment step checks budget BEFORE running:

```javascript
// Step 1: Geocoding
const geocodingCheck = await CostTrackingService.canAffordGeneric(
  userId,
  'ApiUsage',
  0.005,
  true
);

if (!geocodingCheck.canAfford) {
  // Mark contact as budget exceeded, skip enrichment
  contact.metadata.budgetExceeded = true;
  contact.metadata.budgetExceededReason = geocodingCheck.reason;
  contact.metadata.skippedFeatures = ['geocoding', 'venue_enrichment', 'auto_tagging'];
  return contact;  // Save GPS only
}

// Step 2: Venue Search
const venueCheck = await CostTrackingService.canAffordGeneric(
  userId,
  'ApiUsage',
  0.032,
  true
);

if (!venueCheck.canAfford) {
  // Skip venue, but geocoding already done
  contact.metadata.budgetExceeded = true;
  contact.metadata.skippedFeatures = ['venue_enrichment', 'auto_tagging'];
  // Continue with address only
}

// Step 3: Auto-Tagging
const taggingCheck = await CostTrackingService.canAffordGeneric(
  userId,
  'AIUsage',  // Different budget!
  0.0000002,
  true
);

if (!taggingCheck.canAfford) {
  // Skip tagging
  contact.metadata.skippedFeatures.push('auto_tagging');
  // Continue without tags
}
```

**Graceful Degradation:**

The system NEVER fails contact creation due to budget limits. Instead:

1. **Full Budget:** All steps run, contact fully enriched
2. **API Budget Exceeded:** GPS only, no address/venue/tags
3. **Partial Budget:** Some steps complete, others skipped
4. **AI Budget Exceeded:** Location enrichment works, no tags

**Example Scenarios:**

**Scenario 1: Premium user, 95/100 API runs used**
```
✅ Geocoding runs (96/100)
✅ Venue search runs (97/100)
✅ Auto-tagging runs (1/30 AI runs)
Result: Fully enriched contact
```

**Scenario 2: Premium user, 100/100 API runs used**
```
❌ Geocoding blocked (budget exceeded)
❌ Venue search blocked (budget exceeded)
❌ Auto-tagging blocked (no location data)
Result: GPS only, contact saved with budgetExceeded flag
```

**Scenario 3: Premium user, 99/100 API runs, 30/30 AI runs**
```
✅ Geocoding runs (100/100 - last API run!)
❌ Venue search blocked (would be 101/100)
❌ Auto-tagging blocked (AI budget exceeded)
Result: Contact with address, no venue, no tags
```

---

## Database Schema

### Contact Document

**Path:** `users/{userId}/contacts/{contactId}`

```javascript
{
  // Basic Fields
  id: "contact_abc123",
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "+1234567890",
  company: "Tesla",
  jobTitle: "Senior Engineer",
  notes: "Met at AI conference",

  // Location Data
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    // Geocoding results (if available)
    city: "San Francisco",
    country: "United States",
    countryCode: "US",
    region: "California",
    postalCode: "94103",
    formattedAddress: "Market St, San Francisco, CA 94103, USA"
  },

  // Metadata
  metadata: {
    // Venue data (if available)
    venue: {
      name: "Starbucks Reserve Roastery",
      placeId: "ChIJ...",
      address: "1 Market St, San Francisco, CA 94105",
      types: ["cafe", "food"],
      rating: 4.5,
      distance: 15,
      source: "api",  // or "cache"
      enrichedAt: "2025-11-22T10:00:02Z",
      enrichmentDuration: 650,
      sessionId: "session_enrich_xxx"
    },

    // Budget tracking
    enrichmentAttempted: true,
    budgetExceeded: false,
    budgetExceededReason: null,  // 'budget_exceeded' | 'runs_exceeded'
    budgetExceededAt: null,
    skippedFeatures: []  // ['venue_enrichment', 'auto_tagging'] if budget hit
  },

  // Tags (if available)
  tags: [
    "coffee-shop-meeting",
    "tech-executive",
    "tesla-employee",
    "automotive-industry",
    "senior-engineer",
    "san-francisco-contact"
  ],

  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Session Document

**Path:** `SessionUsage/{userId}/sessions/{sessionId}`

See [Session Tracking Strategy](#session-tracking-strategy) section above.

### Usage Documents

**Path:** `ApiUsage/{userId}/operations/{operationId}`

Standalone API operations (single operation only, not part of a multi-step session):

```javascript
{
  timestamp: Timestamp,
  feature: 'location_reverse_geocoding',
  provider: 'google_maps',
  cost: 0.005,
  isBillableRun: true,
  usageType: 'ApiUsage',
  metadata: {
    latitude: 37.7749,
    longitude: -122.4194,
    city: 'San Francisco',
    success: true
  },
  month: '2025-11',
  createdAt: Timestamp
}
```

**Path:** `AIUsage/{userId}/operations/{operationId}`

Standalone AI operations (single operation only, not part of a multi-step session):

```javascript
{
  timestamp: Timestamp,
  feature: 'contact_auto_tagging',
  provider: 'gemini-2.5-flash',
  cost: 0.0000002,
  isBillableRun: true,
  usageType: 'AIUsage',
  metadata: {
    tagsGenerated: 7,
    tags: ['coffee-shop-meeting', 'tech-executive', ...],
    contactId: 'contact_abc123',
    duration: 200
  },
  month: '2025-11',
  createdAt: Timestamp
}
```

**Path:** `SessionUsage/{userId}/sessions/{sessionId}`

Multi-step operations (2+ steps) are tracked in SessionUsage collection:

```javascript
{
  sessionId: "session_enrich_1732292590095_xyz",
  userId: "user_abc123",
  feature: "location_enrichment",
  totalCost: 0.0370102,
  totalRuns: 3,  // Embedding is cost-only, not billable
  status: "completed",
  startedAt: Timestamp,
  completedAt: Timestamp,
  month: "2025-11",
  createdAt: Timestamp,
  steps: [
    {
      stepNumber: 1,
      stepLabel: "Step 1: Reverse Geocoding",
      usageType: "ApiUsage",  // Indicates this is an API operation
      feature: "location_reverse_geocoding",
      provider: "google_maps",
      cost: 0.005,
      isBillableRun: true,
      timestamp: "2025-11-22T16:43:10.095Z",
      metadata: {
        latitude: 37.7749,
        longitude: -122.4194,
        city: "San Francisco",
        country: "United States",
        formattedAddress: "Market St, San Francisco, CA 94103, USA",
        success: true,
        duration: 388
      }
    },
    {
      stepNumber: 2,
      stepLabel: "Step 2: Venue Search",
      usageType: "ApiUsage",  // Indicates this is an API operation
      feature: "location_venue_search",
      provider: "google_places",
      cost: 0.032,
      isBillableRun: true,
      timestamp: "2025-11-22T16:43:10.345Z",
      metadata: {
        venueName: "Starbucks Reserve Roastery",
        placeId: "ChIJPe0RgYWAhYARxIbGaKS0_LY",
        source: "api",
        distance: 15,
        success: true,
        duration: 250
      }
    },
    {
      stepNumber: 3,
      stepLabel: "Step 3: Auto Tag Generation",
      usageType: "AIUsage",  // Indicates this is an AI operation
      feature: "contact_auto_tagging",
      provider: "gemini-2.5-flash",
      cost: 0.0000002,
      isBillableRun: true,
      timestamp: "2025-11-22T16:43:10.545Z",
      metadata: {
        tagsGenerated: 7,
        tags: ["coffee-shop-meeting", "tech-executive", "tesla-employee", "automotive-industry", "senior-engineer", "san-francisco-contact", "ai-conference-attendee"],
        cacheType: "ai",
        tokensIn: 150,
        tokensOut: 30,
        duration: 200
      }
    },
    {
      stepNumber: 4,
      stepLabel: "Step 4: Vector Embedding",
      usageType: "ApiUsage",  // API budget (not AI)
      feature: "contact_vector_embedding",
      provider: "pinecone_inference",
      cost: 0.00001,
      isBillableRun: false,  // Cost-only operation
      timestamp: "2025-11-22T16:43:10.695Z",
      metadata: {
        model: "multilingual-e5-large",
        dimensions: 1024,
        tokens: 125,
        documentLength: 500,
        vectorMagnitude: 0.9998,
        duration: 150
      }
    }
  ]
}
```

---

## Error Handling

### Graceful Degradation

Every step has fallback behavior:

**Step 1: Geocoding Fails**
```javascript
try {
  addressData = await placesClient.reverseGeocode(latitude, longitude);
} catch (error) {
  console.error('Geocoding failed:', error);
  // Continue without address data
  addressData = null;
}

// Contact still saved with GPS only
```

**Step 2: Venue Search Fails**
```javascript
try {
  venueResult = await this.getVenueData(latitude, longitude, userId, sessionId);
} catch (error) {
  console.error('Venue search failed:', error);
  venueResult = { venue: null, source: null, cost: 0 };
}

// Contact still saved with address (from Step 1)
```

**Step 3: Auto-Tagging Fails**
```javascript
try {
  taggedContact = await AutoTaggingService.tagContact(enrichedContact, userId, userData, sessionId);
} catch (error) {
  console.error('Auto-tagging failed:', error);
  taggedContact = enrichedContact;  // No tags, but contact still valid
}

// Contact still saved with address + venue (from Steps 1-2)
```

### Budget Exceeded Handling

**Scenario:** User at 100/100 API runs tries to exchange contact

```javascript
// Pre-flight check
const apiCheck = await CostTrackingService.canAffordGeneric(userId, 'ApiUsage', 0.037, true);

if (!apiCheck.canAfford) {
  console.log('API budget exceeded');

  // Save contact with GPS only
  const contactWithBudgetTracking = {
    ...contact,
    metadata: {
      ...contact.metadata,
      budgetExceeded: true,
      budgetExceededReason: apiCheck.reason,  // 'runs_exceeded'
      budgetExceededAt: new Date().toISOString(),
      enrichmentAttempted: true,
      skippedFeatures: ['geocoding', 'venue_enrichment', 'auto_tagging']
    }
  };

  // Record budget exceeded event for analytics
  await CostTrackingService.recordBudgetExceeded({
    userId,
    usageType: 'ApiUsage',
    feature: 'location_enrichment',
    estimatedCost: 0.037,
    reason: apiCheck.reason,
    metadata: { latitude, longitude }
  });

  return contactWithBudgetTracking;  // Graceful degradation
}
```

**Result:** Contact saved successfully with GPS, but UI shows:

```
🟡 Contact saved with limited enrichment
Budget limit reached - location data saved, but venue detection skipped.
Upgrade to Premium for more monthly capacity.
```

---

## Testing Guide

### Unit Tests

**File:** `lib/services/serviceContact/server/exchangeService.test.js`

```javascript
describe('ExchangeService', () => {
  describe('submitExchangeContact', () => {
    it('should create contact with full enrichment', async () => {
      const result = await ExchangeService.submitExchangeContact({
        username: 'testuser',
        contact: { name: 'Test', email: 'test@example.com', location: { latitude: 37.7749, longitude: -122.4194 } },
        metadata: {}
      });

      expect(result.contact.location.city).toBe('San Francisco');
      expect(result.contact.metadata.venue.name).toBeDefined();
      expect(result.contact.tags.length).toBeGreaterThan(0);
    });

    it('should handle budget exceeded gracefully', async () => {
      // Mock budget check to fail
      jest.spyOn(CostTrackingService, 'canAffordGeneric').mockResolvedValue({ canAfford: false, reason: 'runs_exceeded' });

      const result = await ExchangeService.submitExchangeContact({
        username: 'testuser',
        contact: { name: 'Test', email: 'test@example.com', location: { latitude: 37.7749, longitude: -122.4194 } },
        metadata: {}
      });

      expect(result.contact.metadata.budgetExceeded).toBe(true);
      expect(result.contact.metadata.skippedFeatures).toContain('geocoding');
    });

    it('should skip enrichment when disabled', async () => {
      // Mock settings to disable enrichment
      const userData = { settings: { locationServicesEnabled: false } };

      const result = await ExchangeService.submitExchangeContact({
        username: 'testuser',
        contact: { name: 'Test', email: 'test@example.com', location: { latitude: 37.7749, longitude: -122.4194 } },
        metadata: {}
      }, userData);

      expect(result.contact.location.city).toBeUndefined();
      expect(result.contact.metadata.venue).toBeUndefined();
      expect(result.contact.tags).toBeUndefined();
    });
  });
});
```

### Integration Tests

**Scenario:** Full exchange flow with all enrichment steps

```javascript
describe('Contact Exchange Integration', () => {
  it('should complete full enrichment flow', async () => {
    // 1. Exchange contact via API
    const response = await fetch('/api/user/contacts/exchange/submit', {
      method: 'POST',
      body: JSON.stringify({
        username: 'testuser',
        contact: {
          name: 'John Doe',
          email: 'john@tesla.com',
          company: 'Tesla',
          jobTitle: 'Engineer',
          location: { latitude: 37.7749, longitude: -122.4194 }
        }
      })
    });

    const result = await response.json();

    // 2. Verify contact saved
    expect(result.success).toBe(true);
    expect(result.contact.id).toBeDefined();

    // 3. Verify geocoding
    expect(result.contact.location.city).toBe('San Francisco');

    // 4. Verify venue search
    expect(result.contact.metadata.venue).toBeDefined();
    expect(result.contact.metadata.venue.name).toBeDefined();

    // 5. Verify auto-tagging
    expect(result.contact.tags).toBeDefined();
    expect(result.contact.tags.length).toBeGreaterThan(0);
    expect(result.contact.tags).toContain('tesla-employee');

    // 6. Verify session tracking
    expect(result.enrichment.sessionId).toBeDefined();
    expect(result.enrichment.totalCost).toBeGreaterThan(0);

    // 7. Verify budget updates
    const userDoc = await getUser(userId);
    expect(userDoc.monthlyBillableRunsAPI).toBeGreaterThan(0);
    expect(userDoc.monthlyBillableRunsAI).toBeGreaterThan(0);
  });
});
```

### Manual Testing

**Test Case 1: Happy Path**

1. Visit `/testuser` public profile
2. Click "Share Contact"
3. Allow GPS permission
4. Fill form: Name, Email, Company, Job Title
5. Click "Submit"
6. Verify success message
7. Check contact in dashboard:
   - City/country populated
   - Venue name displayed
   - Tags visible (5-7 tags)
8. Check Firestore:
   - `users/testuser/contacts/{contactId}` exists
   - `metadata.venue` populated
   - `tags` array present
9. Check SessionUsage:
   - `SessionUsage/testuser/sessions/{sessionId}` exists
   - `steps` array has 4 entries (geocoding, venue, tagging, embedding)
   - `status` = 'completed'
   - `totalCost` ≈ $0.0370102
   - `totalRuns` = 3 (embedding is cost-only, not billable)

**Test Case 2: Budget Exceeded**

1. As PRO user, create 49 contacts (to use 49/50 API runs)
2. Verify budget: 49/50 API runs used
3. Exchange contact (should use run 50/50)
4. Verify success with full enrichment
5. Exchange another contact (should hit budget limit)
6. Verify:
   - Contact saved with GPS only
   - `metadata.budgetExceeded` = true
   - `metadata.skippedFeatures` = ['geocoding', 'venue_enrichment', 'auto_tagging']
   - UI shows budget warning

**Test Case 3: Settings Disabled**

1. Go to Settings → Location Services
2. Disable "Auto Venue Enrichment"
3. Exchange contact with GPS
4. Verify:
   - Geocoding still runs (address populated)
   - Venue search skipped (no venue data)
   - Auto-tagging skipped (no tags)

---

## Related Documentation

- [SESSION_BASED_ENRICHMENT.md](SESSION_BASED_ENRICHMENT.md) - Session tracking details
- [LOCATION_SERVICES_AUTO_TAGGING_SPEC.md](LOCATION_SERVICES_AUTO_TAGGING_SPEC.md) - Phase 1-5 specification
- [GEOCODING_SYSTEM_GUIDE.md](GEOCODING_SYSTEM_GUIDE.md) - Geocoding implementation
- [PHASE5_AUTO_TAGGING_MIGRATION.md](../infrastructure/PHASE5_AUTO_TAGGING_MIGRATION.md) - Auto-tagging migration
- [SEMANTIC_SEARCH_ARCHITECTURE_V2.md](../infrastructure/SEMANTIC_SEARCH_ARCHITECTURE_V2.md) - Tag-based search
- [BUDGET_AFFORDABILITY_CHECK_GUIDE.md](../infrastructure/BUDGET_AFFORDABILITY_CHECK_GUIDE.md) - Budget enforcement
- [COST_TRACKING_MIGRATION_GUIDE.md](../infrastructure/COST_TRACKING_MIGRATION_GUIDE.md) - Cost tracking

---

**Last Updated:** 2025-11-23
**Status:** 🟢 Active (Phase 3 Complete, Phase 5 Complete)
**Owner:** Leo

---

*This guide provides a complete reference for contact creation and enrichment, covering GPS capture, location services, and AI-powered semantic tagging with comprehensive budget management and error handling.*
