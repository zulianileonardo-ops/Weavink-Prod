---
id: testing-phase5-manual-080
title: Phase 5 AI Auto-Tagging Manual Testing Guide
category: testing
tags: [testing, manual-testing, phase-5, auto-tagging, ai, session-tracking, budget-validation, feature-combinations, firestore-verification, pinecone-verification]
status: active
created: 2025-11-23
updated: 2025-11-23
version: 1.0.0
related:
  - PHASE5_AUTO_TAGGING_MIGRATION.md
  - SESSION_BASED_ENRICHMENT.md
  - GEOCODING_SYSTEM_GUIDE.md
  - LOCATION_SERVICES_AUTO_TAGGING_SPEC.md
  - CONTACT_CREATION_ENRICHMENT_FLOW.md
---

# Phase 5: AI Auto-Tagging - Manual Testing Guide

**Version:** 1.0
**Date:** 2025-11-23
**Purpose:** Comprehensive validation of Phase 5 Auto-Tagging implementation

---

## 📋 Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Test Environment Configuration](#test-environment-configuration)
3. [Test Cases (21 scenarios)](#test-cases)
4. [Validation Checklist](#validation-checklist)
5. [Results Template](#results-template)

---

## 🔧 Setup Instructions

### Prerequisites

1. **Dev server running:** `npm run dev`
2. **Redis running:** Check with `redis-cli ping` (should return PONG)
3. **Firestore access:** Firebase console open to view real-time changes
4. **Pinecone access:** Pinecone console open to view vector upserts
5. **Browser console:** Open for detailed logs

### Initial State

Before starting tests, note your current limits:

```
Current Limits (from userData.monthlyLimits):
- monthlyBillableRunsAI: _____
- monthlyBillableRunsAPI: _____
- monthlyTotalCost: $_____
- monthlyUsageMonth: _____
```

### Feature Flag Configuration

Navigate to Firestore: `users/{userId}/settings/locationFeatures`

```javascript
locationFeatures: {
  masterEnabled: true/false,        // Master switch
  geocodingEnabled: true/false,     // Pro+ ($0.005/contact)
  venueEnabled: true/false,         // Premium+ ($0.032/contact)
  eventDetectionEnabled: true/false, // Premium+ (free)
  autoTagging: true/false           // Premium+ ($0.0000002/tag)
}
```

---

## 🧪 Test Cases

### Test 1: Baseline - All Features ON, Good Budget

**Goal:** Verify complete 3-step enrichment flow works

**Setup:**
- ✅ Geocoding: ON
- ✅ Venue Enrichment: ON
- ✅ Auto-Tagging: ON
- ✅ Budget: AI runs < limit, API runs < limit

**Contact Data:**
```javascript
{
  name: "John Smith",
  email: "john.smith.test1@example.com",
  company: "Google",
  jobTitle: "CEO",
  notes: "Met at conference"
}
```

**Expected Behavior:**
- ✅ Session created (3 steps: geocoding + venue + tagging)
- ✅ Geocoding runs (GPS → address)
- ✅ Venue enrichment runs (detects venue)
- ✅ Auto-tagging runs (static cache: company "Google")
- ✅ Tags: `['tech-industry', 'google-employee', 'big-tech', 'silicon-valley']`
- ✅ Database: Has `tags` field, `metadata.tagSource: 'static_cache'`
- ✅ Vector document: Includes `[Semantic Tags]` section
- ✅ Cost tracked in SessionUsage (multi-step)

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {
    "tags": [],
    "metadata": {}
  }
}
```

#### Pinecone Vector Document:
```
[PASTE VECTOR DOCUMENT CONTENT HERE]
```

#### SessionUsage Document:
```json
{
  "PASTE SessionUsage/{sessionId} DOCUMENT HERE": {
    "steps": [],
    "totalCost": 0,
    "totalRuns": 0
  }
}
```

**✅ Validation Checklist:**
- [ ] Session ID created and logged
- [ ] All 3 steps executed
- [ ] Tags saved to Firestore
- [ ] Tags in vector document
- [ ] Company tags (NOT CEO tags)
- [ ] SessionUsage document created
- [ ] SessionUsage has 3 steps (geocoding, venue, auto-tagging)
- [ ] Total cost = geocoding + venue + tagging

---

### Test 1B: Cache Miss Verification (Optional - Explicit API Testing)

**Goal:** Verify venue search calls Google Places API with cache cleared

**When to use this test:**
- When you need deterministic API verification for every test run
- To explicitly validate Google Places API integration
- During API billing validation

**Setup:**
- ✅ Geocoding: ON
- ✅ Venue Enrichment: ON
- ✅ Auto-Tagging: ON
- ✅ Budget: AI runs < limit, API runs < limit
- ⚠️ **Clear Redis cache before test:**
  ```bash
  redis-cli -h <your-redis-host> -p <port> -a <password> --no-auth-warning FLUSHDB
  ```

**Contact Data:**
```javascript
{
  name: "John Smith",
  email: "john.smith.test1b@example.com",
  company: "Google",
  jobTitle: "CEO",
  notes: "Met at conference"
}
```

**Expected Behavior:**
- ✅ Session created (3 steps: geocoding + venue + tagging)
- ✅ Geocoding runs (GPS → address)
- ✅ **Cache MISS logged:** `⏭️ [AutoEnrich] Cache MISS, calling Google Places API`
- ✅ Venue enrichment runs (calls Google Places API)
- ✅ **Venue cached:** `💾 [AutoEnrich] Cached venue: {...}`
- ✅ Auto-tagging runs (static cache: company "Google")
- ✅ Tags: `['tech-industry', 'google-employee', 'big-tech', 'silicon-valley']`
- ✅ Database: Has `tags` field, `metadata.tagSource: 'static_cache'`
- ✅ Vector document: Includes `[Semantic Tags]` section
- ✅ **Total cost: $0.037** (geocoding $0.005 + venue $0.032)
- ✅ Cost tracked in SessionUsage (multi-step)

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE - should show "Cache MISS" and "calling Google Places API"]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {
    "venue": {
      "source": "api"  // Should be "api", not "cache"
    }
  }
}
```

#### SessionUsage Document:
```json
{
  "PASTE SessionUsage/{sessionId} DOCUMENT HERE": {
    "steps": [
      {"cost": 0.005, "feature": "location_reverse_geocoding"},
      {"cost": 0.032, "feature": "google_maps_nearby_search"},  // API cost
      {"cost": 0, "feature": "contact_auto_tagging"}
    ],
    "totalCost": 0.037
  }
}
```

**✅ Validation Checklist:**
- [ ] Cache MISS logged in server logs
- [ ] Google Places API called (not cache)
- [ ] Venue source is "api" (not "cache")
- [ ] Step 2 cost is $0.032 (API cost, not $0.00)
- [ ] Total session cost is $0.037
- [ ] Venue cached for future requests

**Note:** Test 1 and Test 1B test different scenarios:
- **Test 1:** Natural cache hit/miss behavior (reflects real production usage)
- **Test 1B:** Explicit API verification (deterministic, always calls API)

---

### Test 2: Static Cache Hit - CEO

**Goal:** Verify job title exact match (Priority 2)

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "Jane Doe",
  email: "jane.doe.test2@example.com",
  company: "Acme Corp",  // No company match
  jobTitle: "CEO",        // Exact match
  notes: "Industry leader"
}
```

**Expected Behavior:**
- ✅ Standalone operation (only tagging, no session)
- ✅ Auto-tagging runs (static cache: job title "CEO")
- ✅ Tags: `['executive', 'c-level', 'leadership', 'ceo', 'president', 'senior-management']`
- ✅ Tag duration: < 5ms (instant)
- ✅ Tag cost: $0.00 (static cache)
- ✅ Cost tracked in AIUsage (standalone, not SessionUsage)

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

#### Pinecone Vector Document:
```
[PASTE VECTOR DOCUMENT CONTENT HERE]
```

#### AI/API Usage Document:
```
Note: Static cache hits are FREE and standalone, so NO usage document is created.
This is expected behavior - only AI generation or billable operations create usage documents.
```

**✅ Validation Checklist:**
- [ ] No session created (standalone)
- [ ] Static cache hit logged
- [ ] Tags are CEO-specific (not generic)
- [ ] Duration < 5ms
- [ ] Cost = $0.00
- [ ] No AIUsage document created (expected for free cache hit)

---

### Test 3: Company Priority - Google Engineer

**Goal:** Verify company matching beats job title (Priority 1 > Priority 2)

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "Alex Chen",
  email: "alex.chen.test3@example.com",
  company: "Google",     // Company match (Priority 1)
  jobTitle: "Engineer",  // Also exact match (Priority 2)
  notes: "Works on search infrastructure"
}
```

**Expected Behavior:**
- ✅ Company match wins (Priority 1)
- ✅ Tags: `['tech-industry', 'google-employee', 'big-tech', 'silicon-valley']`
- ❌ NOT generic engineer tags: `['engineer', 'software-engineer', 'developer', ...]`
- ✅ `metadata.tagSource: 'static_cache'`
- ✅ Log shows: `📌 Static cache match (company): "google"`

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] Got Google-specific tags
- [ ] Did NOT get generic engineer tags
- [ ] Log shows company match (not job title)
- [ ] Tags saved correctly
- [ ] Vector document has company tags

---

### Test 4: Partial Match - Product Manager

**Goal:** Verify job title partial matching (Priority 3)

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "Sarah Johnson",
  email: "sarah.johnson.test4@example.com",
  company: "Startup XYZ",       // No company match
  jobTitle: "Product Manager",  // Partial match on "manager"
  notes: "Building SaaS platform"
}
```

**Expected Behavior:**
- ✅ Partial match on "manager"
- ✅ Tags: `['manager', 'management', 'team-lead', 'project-manager', 'leadership']`
- ✅ Log shows: `📌 Static cache partial match (jobTitle): "manager" in "Product Manager"`

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] Got management tags
- [ ] Log shows partial match
- [ ] Not full "Product Manager" exact match

---

### Test 5: Redis Cache Flow - First Call (AI Generation)

**Goal:** Verify AI generation for unique role

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ✅ Budget: AI runs < limit

**Contact Data:**
```javascript
{
  name: "Michael Torres",
  email: "michael.torres.test5@example.com",
  company: "Fintech Innovations Inc",
  jobTitle: "Chief Innovation Officer",  // Unique role
  notes: "Founded fintech startup, raised Series A funding, building AI-powered payment solutions"
}
```

**Expected Behavior:**
- ✅ No static cache match
- ✅ No Redis cache (first time)
- ✅ Calls Gemini AI
- ✅ Tags: 3-8 relevant tags (e.g., `['fintech', 'founder', 'startup', 'innovation', 'ai', ...]`)
- ✅ `metadata.tagSource: 'ai'`
- ✅ `metadata.tagCost: > 0` (e.g., $0.0000002)
- ✅ Duration: < 5000ms
- ✅ Redis cache populated for next call

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] AI generation triggered
- [ ] 3-8 tags generated
- [ ] Tags are relevant to role/notes
- [ ] Cost > $0.00
- [ ] Duration reasonable (< 5s)
- [ ] Tags saved to database

---

### Test 6: Redis Cache Flow - Second Call (Cache Hit)

**Goal:** Verify Redis cache hit after AI generation

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data:**
```javascript
// EXACT SAME CONTACT AS TEST 5
{
  name: "Michael Torres",
  email: "michael.torres.test6@example.com",  // Different email, same role
  company: "Fintech Innovations Inc",
  jobTitle: "Chief Innovation Officer",
  notes: "Founded fintech startup, raised Series A funding, building AI-powered payment solutions"
}
```

**Expected Behavior:**
- ✅ Redis cache HIT
- ✅ Same tags as Test 5
- ✅ `metadata.tagSource: 'redis_cache'`
- ✅ `metadata.tagCost: $0.00` (no AI call)
- ✅ Duration: < 100ms (fast)
- ✅ Log shows: `✅ Redis cache HIT`

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] Redis cache hit logged
- [ ] Same tags as Test 5
- [ ] Cost = $0.00
- [ ] Duration < 100ms
- [ ] No AI call made

---

### Test 7: Budget Exceeded - AI Runs, Static Cache Still Works

**Goal:** Verify graceful degradation when AI budget exceeded

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ❌ Budget: AI runs >= limit (MANUALLY SET `monthlyBillableRunsAI` to exceed limit)

**Contact Data:**
```javascript
{
  name: "Budget Test CEO",
  email: "budget.test7@example.com",
  company: "Test Corp",
  jobTitle: "CEO",  // Static cache hit
  notes: "Testing budget independence"
}
```

**Expected Behavior:**
- ✅ Static cache STILL WORKS (budget check happens AFTER cache tiers)
- ✅ Tags: CEO tags
- ✅ `metadata.tagSource: 'static_cache'`
- ✅ Cost: $0.00
- ✅ No budget error

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] Static cache works despite budget exceeded
- [ ] Got tags
- [ ] No error messages
- [ ] Cost = $0.00

---

### Test 8: Budget Exceeded - AI Runs, Unique Role Fails Gracefully

**Goal:** Verify graceful failure when budget exceeded and no cache available

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ❌ Budget: AI runs >= limit

**Contact Data:**
```javascript
{
  name: "Budget Test Unique",
  email: "budget.test8@example.com",
  company: "Unique Corp ABC",
  jobTitle: "Chief Happiness Officer",  // Unique role, no cache
  notes: "Building workplace culture"
}
```

**Expected Behavior:**
- ❌ No static cache match
- ❌ No Redis cache
- ❌ Budget exceeded, cannot call AI
- ❌ Contact has NO tags (graceful failure)
- ✅ Contact still saved successfully
- ✅ Log shows: `❌ Budget exceeded, skipping AI generation`

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] Budget check logged
- [ ] Contact saved WITHOUT tags
- [ ] No error thrown (graceful)
- [ ] Log shows budget exceeded message

---

### Test 9: Feature Flag OFF - Auto-Tagging Disabled

**Goal:** Verify feature flag enforcement

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ❌ Auto-Tagging: OFF (SET `locationFeatures.autoTagging = false`)
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "Feature Flag Test",
  email: "flag.test9@example.com",
  company: "Google",
  jobTitle: "CEO",
  notes: "Should not be tagged"
}
```

**Expected Behavior:**
- ❌ Auto-tagging NOT executed
- ❌ Contact has NO tags
- ✅ Contact saved successfully
- ✅ Log shows: `🏷️ [AutoTagging] Feature disabled`

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] No tagging executed
- [ ] No tags field in database
- [ ] Contact saved successfully
- [ ] Feature disabled logged

---

### Test 10: No Taggable Data - Empty Job Title, Company, Notes

**Goal:** Verify data validation

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "Empty Data Test",
  email: "empty.test10@example.com"
  // NO jobTitle, company, or notes
}
```

**Expected Behavior:**
- ❌ No taggable data
- ❌ Contact NOT tagged
- ✅ Contact saved successfully
- ✅ Log shows: `⚠️ No taggable data`

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] Data validation triggered
- [ ] No tags added
- [ ] Contact saved successfully

---

### Test 11: Multi-Step Session - Geocoding + Tagging

**Goal:** Verify 2-step session tracking

**Setup:**
- ✅ Geocoding: ON
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "Session Test 2-Step",
  email: "session.test11@example.com",
  company: "Apple",
  jobTitle: "Engineer",
  notes: "Testing session"
}
```

**Expected Behavior:**
- ✅ Session created (2 steps: geocoding + tagging)
- ✅ Session ID logged
- ✅ Geocoding runs
- ✅ Auto-tagging runs (company: Apple)
- ✅ SessionUsage document created
- ✅ Total cost = geocoding + tagging

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT AND SessionUsage DOCUMENTS HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] Session ID created
- [ ] 2 steps executed
- [ ] SessionUsage has both costs
- [ ] Session finalized

---

### Test 12: Vector Document - Tags Included

**Goal:** Verify tags are included in searchable vector document

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "Vector Test",
  email: "vector.test12@example.com",
  company: "Microsoft",
  jobTitle: "Software Engineer",
  notes: "Cloud infrastructure expert"
}
```

**Expected Behavior:**
- ✅ Contact tagged (company: Microsoft)
- ✅ Vector document includes:
  - `[Semantic Tags]: tech-industry, microsoft-employee, big-tech, enterprise`
  - `[Searchable Categories]: tech-industry microsoft-employee big-tech enterprise`
- ✅ Tags repeated for higher weight in search

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE FULL DOCUMENT TO EMBED SECTION]
```

#### Pinecone Vector Document:
```
[PASTE VECTOR DOCUMENT CONTENT HERE]
```

**✅ Validation Checklist:**
- [ ] `[Semantic Tags]` section present
- [ ] `[Searchable Categories]` section present
- [ ] Tags match contact.tags
- [ ] Vector upserted to Pinecone

---

### Test 13: All Features ON - Complete 3-Step Flow

**Goal:** Verify complete enrichment pipeline

**Setup:**
- ✅ Geocoding: ON
- ✅ Venue Enrichment: ON
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "Complete Flow Test",
  email: "complete.test13@example.com",
  company: "Tesla",
  jobTitle: "Mechanical Engineer",
  notes: "Working on battery technology",
  // GPS coordinates will be added by browser
}
```

**Expected Behavior:**
- ✅ Session created (3 steps)
- ✅ Step 1: Geocoding (GPS → address)
- ✅ Step 2: Venue enrichment (detect venue)
- ✅ Step 3: Auto-tagging (company: Tesla)
- ✅ Tags: `['automotive-industry', 'tesla-employee', 'electric-vehicles', 'technology']`
- ✅ SessionUsage with all 3 costs
- ✅ Session finalized

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT AND SessionUsage DOCUMENTS HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] All 3 steps executed
- [ ] Session finalized
- [ ] Costs tracked correctly
- [ ] Tags are Tesla-specific

---

### Test 14: API Budget Exceeded - Tagging Still Works

**Goal:** Verify AI budget is independent from API budget

**Setup:**
- ❌ Geocoding: OFF (or would fail due to API budget)
- ❌ Venue Enrichment: OFF (or would fail due to API budget)
- ✅ Auto-Tagging: ON
- ❌ Budget: API runs >= limit (but AI runs < limit)

**Contact Data:**
```javascript
{
  name: "API Budget Test",
  email: "api.budget.test14@example.com",
  company: "Amazon",
  jobTitle: "DevOps Engineer",
  notes: "Cloud infrastructure"
}
```

**Expected Behavior:**
- ✅ Auto-tagging STILL WORKS (AI budget separate)
- ✅ Tags: Amazon company tags
- ✅ Static cache hit (no AI needed)

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] Auto-tagging worked
- [ ] API budget exceeded didn't block tagging
- [ ] Tags present

---

### Test 15: Case Insensitive - "google" vs "Google"

**Goal:** Verify company matching is case-insensitive

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "Case Test 1",
  email: "case1.test15@example.com",
  company: "google",  // lowercase
  jobTitle: "Engineer",
  notes: "Testing case sensitivity"
}
```

**Expected Behavior:**
- ✅ Company match works (lowercase "google" → Google tags)
- ✅ Tags: Google-specific tags (not engineer tags)

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] Got Google tags (case insensitive worked)
- [ ] Not generic engineer tags

---

### Test 16: Multiple Companies - "Google and Apple"

**Goal:** Verify first company match wins

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "Multi Company Test",
  email: "multi.test16@example.com",
  company: "Former: Google, Now: Apple",  // Multiple companies
  jobTitle: "Engineer",
  notes: "Moved from Google to Apple"
}
```

**Expected Behavior:**
- ✅ First match wins (should match "google" first)
- ✅ Tags: Google tags (or Apple, depending on string position)
- ✅ Only ONE set of company tags (not both)

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] Only one company matched
- [ ] Tags are specific (not mixed)

---

### Test 17: French Job Title - "PDG" (CEO in French)

**Goal:** Verify multilingual static cache support

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "French Title Test",
  email: "french.test17@example.com",
  company: "Société Française",
  jobTitle: "PDG",  // French for CEO
  notes: "Directeur général"
}
```

**Expected Behavior:**
- ✅ Static cache match on "PDG"
- ✅ Tags: CEO-equivalent tags (if "PDG" in COMMON_CONTACT_TAGS)
- ❌ OR: AI generation if not in static cache

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] Handled French job title
- [ ] Got appropriate executive tags

---

### Test 18: Concurrent Requests - Submit 3 Contacts at Once

**Goal:** Verify system handles concurrent tagging requests

**Setup:**
- ❌ Geocoding: OFF
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data (submit 3 contacts simultaneously):**
```javascript
// Contact 1
{ name: "Concurrent 1", email: "c1.test18@example.com", jobTitle: "CEO" }

// Contact 2
{ name: "Concurrent 2", email: "c2.test18@example.com", company: "Google" }

// Contact 3
{ name: "Concurrent 3", email: "c3.test18@example.com", jobTitle: "Designer" }
```

**Expected Behavior:**
- ✅ All 3 contacts tagged successfully
- ✅ No race conditions or errors
- ✅ Each has correct tags
- ✅ Tags don't get mixed up between contacts

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS FOR ALL 3 CONTACTS]
```

#### Firestore Database State:
```json
{
  "PASTE ALL 3 CONTACT DOCUMENTS HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] All 3 contacts created
- [ ] All 3 have correct tags
- [ ] No tag mixing/errors
- [ ] Concurrent handling works

---

### Test 19: Subscription Tier - Basic User (No Tagging)

**Goal:** Verify Basic tier users do NOT get auto-tagging

**Setup:**
- Set `userData.subscriptionLevel = 'basic'`
- ✅ Auto-Tagging: ON (but should be ignored for Basic tier)
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "Basic Tier Test",
  email: "basic.test19@example.com",
  company: "Google",
  jobTitle: "CEO",
  notes: "Should not be tagged (Basic tier)"
}
```

**Expected Behavior:**
- ❌ Auto-tagging NOT executed (Basic tier not eligible)
- ❌ No tags
- ✅ Contact saved successfully
- ✅ Log shows tier restriction

**📝 Paste Results Below:**

#### Server Logs:
```
[PASTE SERVER LOGS HERE]
```

#### Firestore Database State:
```json
{
  "PASTE CONTACT DOCUMENT HERE": {}
}
```

**✅ Validation Checklist:**
- [ ] Basic tier blocked from tagging
- [ ] No tags added
- [ ] Contact saved successfully

---

### Test 20: Premium/Business/Enterprise - All Get Tagging

**Goal:** Verify all Premium+ tiers get auto-tagging

**Setup:**
- Test with 3 different users:
  - User 1: `subscriptionLevel = 'premium'`
  - User 2: `subscriptionLevel = 'business'`
  - User 3: `subscriptionLevel = 'enterprise'`
- ✅ Auto-Tagging: ON
- ✅ Budget: Good

**Contact Data (same for all 3 users):**
```javascript
{
  name: "Tier Test",
  email: "tier.test20@example.com",
  company: "Google",
  jobTitle: "Engineer"
}
```

**Expected Behavior:**
- ✅ All 3 users get tags
- ✅ Tags: Google company tags
- ✅ Same behavior across Premium/Business/Enterprise

**📝 Paste Results Below:**

#### Premium User Logs:
```
[PASTE LOGS FOR PREMIUM USER]
```

#### Business User Logs:
```
[PASTE LOGS FOR BUSINESS USER]
```

#### Enterprise User Logs:
```
[PASTE LOGS FOR ENTERPRISE USER]
```

**✅ Validation Checklist:**
- [ ] Premium user tagged
- [ ] Business user tagged
- [ ] Enterprise user tagged
- [ ] All got same tags

---

## 📊 Coverage Matrix

### Feature Combinations Tested

| Test # | Geocoding | Venue | Auto-Tagging | Result | Notes |
|--------|-----------|-------|--------------|--------|-------|
| 1      | ✅        | ✅    | ✅           | ✅     | Natural cache behavior |
| 1B     | ✅        | ✅    | ✅           | ✅     | Cache cleared (API verification) |
| 11     | ✅        | ❌    | ✅           | ✅     | 2-step session |
| 13     | ✅        | ✅    | ✅           | ✅     | Complete flow |
| 2-10   | ❌        | ❌    | ✅           | ✅     | Tagging only |
| 9      | ❌        | ❌    | ❌           | No tags | Feature disabled |

### Cache Tiers Tested

| Test # | Cache Tier    | Result |
|--------|---------------|--------|
| 1-4    | Static        | ✅     |
| 5      | AI (first)    | ✅     |
| 6      | Redis (hit)   | ✅     |

### Budget States Tested

| Test # | AI Budget | API Budget | Result |
|--------|-----------|------------|--------|
| 1-6    | Good      | Good       | ✅     |
| 7      | Exceeded  | Good       | Static works |
| 8      | Exceeded  | Good       | AI blocked |
| 14     | Good      | Exceeded   | Tagging works |

### Subscription Tiers Tested

| Test # | Tier       | Result |
|--------|------------|--------|
| 19     | Basic      | No tags |
| 20     | Premium    | ✅     |
| 20     | Business   | ✅     |
| 20     | Enterprise | ✅     |

---

## ✅ Final Validation Checklist

After completing all tests, verify:

### Database Validation
- [ ] All contacts have `tags` field (except Test 8, 9, 10, 19)
- [ ] `metadata.tagSource` is one of: `static_cache`, `redis_cache`, `ai`
- [ ] `metadata.taggedAt` is a valid timestamp
- [ ] `metadata.tagDuration` is reasonable (< 5000ms)

### Vector Database Validation
- [ ] All tagged contacts have vector documents in Pinecone
- [ ] Vector documents include `[Semantic Tags]` section
- [ ] Vector documents include `[Searchable Categories]` section
- [ ] Tags match what's in Firestore

### Cost Tracking Validation
- [ ] Static cache: $0.00
- [ ] Redis cache: $0.00
- [ ] AI generation: > $0.00 (approximately $0.0000002 per tag)
- [ ] SessionUsage documents created for multi-step operations
- [ ] AIUsage documents created for standalone operations

### Priority Ordering Validation
- [ ] Test 3: Company beats job title
- [ ] Test 2: Job title exact works
- [ ] Test 4: Job title partial works
- [ ] Test 15: Case insensitive matching works

### Graceful Degradation Validation
- [ ] Test 7: Static cache works when AI budget exceeded
- [ ] Test 8: Contact saved without tags when AI unavailable
- [ ] Test 9: Feature flag disables tagging cleanly
- [ ] Test 10: Empty data handled gracefully

---

## 🎯 Success Criteria

**Phase 5 is production-ready if:**

1. ✅ **All 21 tests pass** with expected behavior (Test 1B is optional but recommended)
2. ✅ **Cache tiers work correctly** (static > Redis > AI)
3. ✅ **Priority ordering is correct** (company > job title exact > job title partial)
4. ✅ **Budget checks work** (free caches accessible when budget exceeded)
5. ✅ **Feature flags enforced** (Basic tier blocked, Premium+ allowed)
6. ✅ **Tags saved to database** and included in vector documents
7. ✅ **Cost tracking accurate** (static/Redis = $0, AI > $0)
8. ✅ **Graceful degradation** (no crashes when features disabled/budget exceeded)
9. ✅ **Session tracking works** (multi-step vs standalone)
10. ✅ **Performance acceptable** (static < 10ms, Redis < 100ms, AI < 5s)

---

## 📝 Notes

- **Test execution time:** Approximately 30-50 minutes for all 21 tests (Test 1B adds ~5 minutes if cache clearing needed)
- **Required tools:** Browser console, Firestore console, Pinecone console, Redis CLI (for Test 1B)
- **Data cleanup:** Delete test contacts after validation to avoid polluting production data
- **Budget reset:** Reset `monthlyBillableRunsAI` and `monthlyBillableRunsAPI` after Test 7-8
- **Cache management:** Test 1B requires Redis cache clearing - use provided command in test setup

**Good luck with testing! 🚀**
