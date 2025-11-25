---
id: testing-phase5-manual-080
title: Phase 5 AI Auto-Tagging Manual Testing Guide - Comprehensive Edition
category: testing
tags: [testing, manual-testing, phase-5, auto-tagging, ai, session-tracking, budget-validation, feature-combinations, firestore-verification, pinecone-verification, stress-testing, cache-breaking, security-testing, performance-testing]
status: active
created: 2025-11-23
updated: 2025-11-24
version: 2.0.0
related:
  - PHASE5_AUTO_TAGGING_MIGRATION.md
  - SESSION_BASED_ENRICHMENT.md
  - GEOCODING_SYSTEM_GUIDE.md
  - LOCATION_SERVICES_AUTO_TAGGING_SPEC.md
  - CONTACT_CREATION_ENRICHMENT_FLOW.md
---

# Phase 5: AI Auto-Tagging - Comprehensive Testing Guide

**Version:** 2.0
**Date:** 2025-11-24
**Purpose:** Comprehensive validation and stress testing of Phase 5 implementation including Step 4 (Vector Embedding)

---

## 📋 Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Test Environment Configuration](#test-environment-configuration)
3. [Basic Functional Tests (Tests 1-21)](#basic-functional-tests)
4. [Step 4 Vector Embedding Tests (Tests 22-30)](#step-4-vector-embedding-tests)
5. [Cache-Breaking Scenarios (Tests 31-45)](#cache-breaking-scenarios)
6. [System Integration Stress Tests (Tests 46-60)](#system-integration-stress-tests)
7. [Performance & Load Tests (Tests 61-75)](#performance--load-tests)
8. [Security & Data Integrity Tests (Tests 76-90)](#security--data-integrity-tests)
9. [Test Automation Opportunities](#test-automation-opportunities)
10. [Performance Baselines](#performance-baselines)
11. [Failure Recovery Procedures](#failure-recovery-procedures)
12. [Production Readiness Checklist](#production-readiness-checklist)
13. [Validation Checklist](#validation-checklist)
14. [Results Template](#results-template)

---

## 🔧 Setup Instructions

### Prerequisites

1. **Dev server running:** `npm run dev`
2. **Redis running:** Check with `redis-cli ping` (should return PONG)
3. **Firestore access:** Firebase console open to view real-time changes
4. **Pinecone access:** Pinecone console open to view vector upserts
5. **Browser console:** Open for detailed logs
6. **Monitoring tools:** CPU/Memory monitoring for stress tests
7. **Load testing tools:** Apache Bench (`ab`) or similar installed

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

## 🧪 Basic Functional Tests

### Test 1: Baseline - All Features ON, Good Budget

**Priority:** P0
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

**Priority:** P1
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

---

### Test 2: Static Cache Hit - CEO

**Priority:** P0
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

---

### Test 3: Company Priority - Google Engineer

**Priority:** P0
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

---

### Test 4: Partial Match - Product Manager

**Priority:** P1
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

---

### Test 5: Redis Cache Flow - First Call (AI Generation)

**Priority:** P0
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

---

### Test 6: Redis Cache Flow - Second Call (Cache Hit)

**Priority:** P0
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

---

### Test 7: Budget Exceeded - AI Runs, Static Cache Still Works

**Priority:** P0
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

---

### Test 8: Budget Exceeded - AI Runs, Unique Role Fails Gracefully

**Priority:** P0
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

---

### Test 9: Feature Flag OFF - Auto-Tagging Disabled

**Priority:** P0
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

---

### Test 10: No Taggable Data - Empty Job Title, Company, Notes

**Priority:** P1
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

---

### Test 11: Multi-Step Session - Geocoding + Tagging

**Priority:** P0
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

---

### Test 12: Vector Document - Tags Included

**Priority:** P0
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

---

### Test 13: All Features ON - Complete 3-Step Flow

**Priority:** P0
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

---

### Test 14: API Budget Exceeded - Tagging Still Works

**Priority:** P0
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

---

### Test 15: Case Insensitive - "google" vs "Google"

**Priority:** P1
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

---

### Test 16: Multiple Companies - "Google and Apple"

**Priority:** P2
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

---

### Test 17: French Job Title - "PDG" (CEO in French)

**Priority:** P3
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

---

### Test 18: Concurrent Requests - Submit 3 Contacts at Once

**Priority:** P1
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

---

### Test 19: Subscription Tier - Basic User (No Tagging)

**Priority:** P0
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

---

### Test 20: Premium/Business/Enterprise - All Get Tagging

**Priority:** P0
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

---

### Test 21: Session Orphan - Tagging Fails After Geocoding

**Priority:** P2
**Goal:** Verify session cleanup when step fails

**Setup:**
- ✅ Geocoding: ON
- ❌ Venue Enrichment: OFF
- ✅ Auto-Tagging: ON
- ❌ Budget: AI runs >= limit (force tagging failure)

**Contact Data:**
```javascript
{
  name: "Orphan Session Test",
  email: "orphan.test21@example.com",
  company: "UniqueCompanyXYZ",  // No cache
  jobTitle: "Special Role",      // No cache
  notes: "Testing orphan session"
}
```

**Expected Behavior:**
- ✅ Session created (geocoding works)
- ✅ Geocoding succeeds
- ❌ Tagging fails (budget exceeded)
- ✅ Session still finalized properly
- ✅ Contact saved with location but no tags

---

## 🚀 Step 4 Vector Embedding Tests

### Test 22: Complete 4-Step Flow with Vector Embedding

**Priority:** P0
**Goal:** Verify new 4-step enrichment including vector embedding

**Setup:**
- ✅ Geocoding: ON
- ✅ Venue Enrichment: ON
- ✅ Auto-Tagging: ON
- ✅ Vector Embedding: Enabled (Premium+ tier)
- ✅ Budget: Good

**Contact Data:**
```javascript
{
  name: "Four Step Test",
  email: "four.step.test22@example.com",
  company: "OpenAI",
  jobTitle: "ML Engineer",
  notes: "Working on GPT models"
}
```

**Expected Behavior:**
- ✅ Session created with 4 steps
- ✅ Step 1: Geocoding ($0.005, billable)
- ✅ Step 2: Venue Search ($0.032 or $0 cached, billable)
- ✅ Step 3: Auto-Tagging ($0.0000002, billable)
- ✅ Step 4: Vector Embedding ($0.00001, NOT billable)
- ✅ SessionUsage shows 4 steps
- ✅ Total cost ~$0.037
- ✅ Total runs: 3 (Step 4 not counted)
- ✅ Session finalized AFTER Step 4
- ✅ Vector indexed in Pinecone with tags

**Verification:**
```sql
// Check SessionUsage document
steps[3].stepLabel = "Step 4: Vector Embedding"
steps[3].isBillableRun = false
steps[3].usageType = "ApiUsage"
totalRuns = 3 (not 4)
```

---

### Test 23: Vector Embedding with Session Timeout

**Priority:** P1
**Goal:** Test session recovery when embedding takes too long

**Setup:**
- ✅ All features ON
- ⚠️ Simulate slow Pinecone response (add artificial delay)

**Contact Data:**
```javascript
{
  name: "Timeout Test",
  email: "timeout.test23@example.com",
  company: "Slow Corp",
  jobTitle: "Engineer"
}
```

**Expected Behavior:**
- ✅ Steps 1-3 complete normally
- ⚠️ Step 4 takes > 10 seconds
- ✅ Session still finalizes properly
- ✅ Contact saved with tags
- ✅ Vector eventually indexed
- ✅ No orphaned sessions

**Test Script:**
```javascript
// Add artificial delay in embeddingService.js temporarily
await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay
```

---

### Test 24: Pinecone API Failure During Embedding

**Priority:** P0
**Goal:** Test graceful degradation when Pinecone fails

**Setup:**
- ✅ All features ON
- ⚠️ Temporarily break PINECONE_API_KEY environment variable

**Contact Data:**
```javascript
{
  name: "Pinecone Failure Test",
  email: "pinecone.fail.test24@example.com",
  company: "Microsoft",
  jobTitle: "PM"
}
```

**Expected Behavior:**
- ✅ Steps 1-3 complete successfully
- ❌ Step 4 fails (Pinecone error)
- ✅ Error logged but not thrown
- ✅ Contact still saved with tags
- ✅ Session finalized with error in Step 4
- ✅ User experience not affected

---

### Test 25: Embedding with Malformed Contact Data

**Priority:** P1
**Goal:** Test embedding with special characters and edge cases

**Contact Data:**
```javascript
{
  name: "🚀 Emoji Name 测试",
  email: "special.test25@example.com",
  company: "Google & Apple < Microsoft > Amazon",
  jobTitle: "CEO/CTO & VP | Sr. Engineer",
  notes: "Test\nnewlines\ttabs\"quotes'apostrophes`backticks"
}
```

**Expected Behavior:**
- ✅ All steps complete
- ✅ Special characters sanitized properly
- ✅ Embedding generated correctly
- ✅ Vector document readable
- ✅ No encoding errors

---

### Test 26: Concurrent Vector Updates for Same Contact

**Priority:** P2
**Goal:** Test race conditions in vector updates

**Setup:**
- Submit same contact twice rapidly
- Both with slightly different data

**Contact Data (submit twice quickly):**
```javascript
// First submission
{ name: "Race Test", email: "race1.test26@example.com", company: "Google", notes: "Version 1" }

// Second submission (100ms later)
{ name: "Race Test Updated", email: "race1.test26@example.com", company: "Apple", notes: "Version 2" }
```

**Expected Behavior:**
- ✅ Both contacts saved
- ✅ Last vector wins in Pinecone
- ✅ No corruption or mixing of data
- ✅ Sessions tracked separately

---

### Test 27: Vector Embedding Budget Exhaustion

**Priority:** P0
**Goal:** Test cost-only operation when API budget exhausted

**Setup:**
- ❌ API Budget: Exceeded
- ✅ Cost Budget: Available
- ✅ All features ON

**Contact Data:**
```javascript
{
  name: "Budget Vector Test",
  email: "budget.vector.test27@example.com",
  company: "Tesla",
  jobTitle: "Engineer"
}
```

**Expected Behavior:**
- ❌ Steps 1-2 skip (API budget exceeded)
- ✅ Step 3 works (AI budget separate)
- ✅ Step 4 works (cost-only, not billable)
- ✅ Vector still generated
- ✅ SessionUsage shows partial completion

---

### Test 28: Session Finalization After Step 4

**Priority:** P0
**Goal:** Verify session finalizes after embedding, not before

**Setup:**
- ✅ All features ON
- Monitor session status in real-time

**Contact Data:**
```javascript
{
  name: "Finalization Test",
  email: "final.test28@example.com",
  company: "Netflix",
  jobTitle: "SRE"
}
```

**Expected Behavior:**
- ✅ Session status "in_progress" during Steps 1-3
- ✅ Session status "in_progress" during Step 4
- ✅ Session status "completed" AFTER Step 4
- ✅ No premature finalization
- ✅ completedAt timestamp after Step 4

---

### Test 29: Vector Indexing with Network Partition

**Priority:** P2
**Goal:** Test embedding when Pinecone unreachable

**Setup:**
- ✅ All features ON
- Block Pinecone API endpoint (firewall rule or hosts file)

**Contact Data:**
```javascript
{
  name: "Network Partition Test",
  email: "network.test29@example.com",
  company: "Cloudflare",
  jobTitle: "Network Engineer"
}
```

**Expected Behavior:**
- ✅ Steps 1-3 complete
- ❌ Step 4 fails (network error)
- ✅ Appropriate timeout (not hanging)
- ✅ Session finalized with error
- ✅ Contact saved successfully

---

### Test 30: Embedding Retry Logic Validation

**Priority:** P1
**Goal:** Verify embedding retries on transient failures

**Setup:**
- ✅ All features ON
- Simulate intermittent Pinecone failures

**Contact Data:**
```javascript
{
  name: "Retry Logic Test",
  email: "retry.test30@example.com",
  company: "Resilient Corp",
  jobTitle: "Reliability Engineer"
}
```

**Expected Behavior:**
- ✅ First embedding attempt fails
- ✅ Automatic retry triggered
- ✅ Second attempt succeeds
- ✅ Total duration logged
- ✅ Retry count in metadata

---

## 💥 Cache-Breaking Scenarios

### Test 31: Redis Cache Stampede

**Priority:** P0
**Goal:** Test cache stampede prevention with 100+ simultaneous requests

**Setup:**
- Clear Redis cache
- Submit 100 identical contacts simultaneously
- All features ON

**Test Script:**
```bash
# Use Apache Bench or similar
ab -n 100 -c 100 -p contact.json -T application/json \
  http://localhost:3000/api/contacts/exchange
```

**Contact Data (same for all 100):**
```javascript
{
  name: "Stampede Test",
  email: "stampede.test31@example.com",
  company: "CacheBreaker Inc",
  jobTitle: "Stress Tester"
}
```

**Expected Behavior:**
- ✅ Only ONE Google Places API call
- ✅ Only ONE Gemini AI call
- ✅ 99 requests wait for cache
- ✅ No duplicate API charges
- ✅ Cache populated once
- ✅ All 100 contacts get same tags

---

### Test 32: Cache Poisoning Attempt

**Priority:** P0
**Goal:** Attempt to inject malicious data into cache

**Setup:**
- Attempt to poison cache with malicious tags

**Contact Data:**
```javascript
{
  name: "Cache Poison",
  email: "poison.test32@example.com",
  company: "<script>alert('XSS')</script>",
  jobTitle: "'; DROP TABLE users; --",
  notes: "${process.env.PINECONE_API_KEY}"
}
```

**Expected Behavior:**
- ✅ Input sanitized before caching
- ✅ No script execution
- ✅ No SQL injection
- ✅ No environment variable exposure
- ✅ Cache remains clean
- ✅ Tags generated safely

---

### Test 33: TTL Boundary Testing

**Priority:** P1
**Goal:** Test cache behavior at exact TTL expiration

**Setup:**
- Set Redis TTL to 60 seconds (temporarily)
- Submit contact
- Wait exactly 60 seconds
- Submit identical contact

**Contact Data:**
```javascript
{
  name: "TTL Test",
  email: "ttl.test33@example.com",
  company: "Expiry Corp",
  jobTitle: "Timer"
}
```

**Expected Behavior:**
- ✅ First request: cache miss, API call
- ✅ Cache populated with 60s TTL
- ✅ At 59s: cache hit
- ✅ At 60s: cache miss
- ✅ New API call made
- ✅ Cache repopulated

---

### Test 34: Multi-Tier Cache Conflicts

**Priority:** P1
**Goal:** Test conflicts between Redis, Static, and Browser cache

**Setup:**
- Populate all cache tiers with different data
- Static cache: CEO → executive tags
- Redis cache: CEO → different tags (corrupted)
- Browser cache: stale data

**Contact Data:**
```javascript
{
  name: "Cache Conflict",
  email: "conflict.test34@example.com",
  jobTitle: "CEO"
}
```

**Expected Behavior:**
- ✅ Static cache wins (Priority 1)
- ✅ Redis cache ignored
- ✅ Browser cache bypassed
- ✅ Correct tags applied
- ✅ Cache hierarchy respected

---

### Test 35: Memory Pressure Cache Eviction

**Priority:** P2
**Goal:** Test cache behavior under memory pressure

**Setup:**
- Fill Redis to near memory limit
- Submit new contacts requiring cache

**Test Script:**
```bash
# Fill Redis with dummy data
for i in {1..10000}; do
  redis-cli SET "dummy:$i" "$(head -c 1000 /dev/urandom | base64)"
done
```

**Expected Behavior:**
- ✅ LRU eviction works
- ✅ New entries cached
- ✅ System remains stable
- ✅ No crashes
- ✅ Performance degradation logged

---

### Test 36: Cross-User Cache Pollution

**Priority:** P0
**Goal:** Verify cache isolation between users

**Setup:**
- User A: Submit contact with company "Secret Corp"
- User B: Try to access User A's cached data

**User A Contact:**
```javascript
{
  name: "User A Secret",
  email: "usera.test36@example.com",
  company: "Secret Corp",
  notes: "Confidential information"
}
```

**User B Contact:**
```javascript
{
  name: "User B Test",
  email: "userb.test36@example.com",
  company: "Secret Corp"  // Same company
}
```

**Expected Behavior:**
- ✅ User B gets fresh tags
- ✅ No data leakage
- ✅ Cache keys include user context
- ✅ Complete isolation verified

---

### Test 37: Cache Key Collision Attempts

**Priority:** P1
**Goal:** Test cache key uniqueness and collision handling

**Contact Data (submit all):**
```javascript
// Attempts to create collision
{ company: "ABC", jobTitle: "DEF" }
{ company: "AB", jobTitle: "CDEF" }
{ company: "A", jobTitle: "BCDEF" }
{ company: "", jobTitle: "ABCDEF" }
```

**Expected Behavior:**
- ✅ Each gets unique cache key
- ✅ No collisions
- ✅ Correct tags for each
- ✅ Hash function works properly

---

### Test 38: Cache Invalidation Race Conditions

**Priority:** P2
**Goal:** Test cache updates during invalidation

**Setup:**
- Submit contact
- Immediately invalidate cache
- Submit identical contact during invalidation

**Test Script:**
```javascript
// Rapid fire
await submitContact(data);
await redis.del(cacheKey);  // Invalidate
await submitContact(data);  // During invalidation
```

**Expected Behavior:**
- ✅ No data corruption
- ✅ Second request handled properly
- ✅ Cache rebuilt correctly
- ✅ No partial data cached

---

### Test 39: Partial Cache Corruption Recovery

**Priority:** P1
**Goal:** Test recovery from corrupted cache entries

**Setup:**
- Manually corrupt cache entry in Redis
- Submit contact that hits corrupted cache

**Corruption Script:**
```bash
redis-cli SET "cache:venue:abc" "corrupted{invalid json"
```

**Expected Behavior:**
- ✅ Corruption detected
- ✅ Cache miss triggered
- ✅ Fresh API call made
- ✅ Corrupted entry replaced
- ✅ Error logged

---

### Test 40: Cache Warming vs Cold Start Performance

**Priority:** P2
**Goal:** Compare performance with warm vs cold cache

**Setup:**
- Measure with empty cache (cold)
- Measure with populated cache (warm)

**Metrics to Capture:**
- Response time (p50, p95, p99)
- CPU usage
- Memory usage
- API calls made
- Cache hit ratio

**Expected Performance:**
- Cold: ~2-5 seconds
- Warm: ~100-500ms
- 10-50x performance improvement

---

### Test 41: Geographic Cache Partition Failure

**Priority:** P3
**Goal:** Test cache behavior with geo-partitioned data

**Setup:**
- Simulate different geographic regions
- Test cache consistency across regions

**Contact Data:**
```javascript
// US Region
{ location: { lat: 37.7749, lng: -122.4194 } }  // San Francisco

// EU Region
{ location: { lat: 51.5074, lng: -0.1278 } }    // London

// APAC Region
{ location: { lat: 35.6762, lng: 139.6503 } }   // Tokyo
```

**Expected Behavior:**
- ✅ Each region cached separately
- ✅ No cache sharing across regions
- ✅ Appropriate venue detection

---

### Test 42: Cache Consistency During Updates

**Priority:** P1
**Goal:** Test cache consistency when data updates

**Setup:**
- Submit contact with company "OldCorp"
- Update static cache to have new tags for "OldCorp"
- Submit new contact with "OldCorp"

**Expected Behavior:**
- ✅ New contact gets updated tags
- ✅ Old cache invalidated
- ✅ Consistency maintained
- ✅ No stale data served

---

### Test 43: Browser Cache Bypass Attempts

**Priority:** P2
**Goal:** Test forced cache bypass mechanisms

**Setup:**
- Use cache-busting headers
- Force refresh requests

**Headers to Test:**
```javascript
{
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Expires': '0'
}
```

**Expected Behavior:**
- ✅ Server cache still works
- ✅ Browser cache bypassed
- ✅ Fresh data served
- ✅ No performance impact

---

### Test 44: Redis Cluster Failover During Caching

**Priority:** P2
**Goal:** Test cache behavior during Redis failover

**Setup:**
- Start caching operation
- Trigger Redis failover mid-operation
- Continue operation

**Test Script:**
```bash
# Start contact submission
# Kill Redis master
redis-cli -p 6379 DEBUG SEGFAULT
# Failover should occur
```

**Expected Behavior:**
- ✅ Graceful degradation
- ✅ Operation completes
- ✅ Falls back to API calls
- ✅ No data loss
- ✅ Auto-recovery when Redis returns

---

### Test 45: Cache Size Limit Exhaustion

**Priority:** P1
**Goal:** Test behavior when cache size limits reached

**Setup:**
- Set Redis maxmemory to low value
- Fill cache to limit
- Submit new contacts

**Redis Config:**
```bash
redis-cli CONFIG SET maxmemory 10mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

**Expected Behavior:**
- ✅ LRU eviction works
- ✅ Most-used entries retained
- ✅ System remains functional
- ✅ Performance degradation acceptable

---

## 🔥 System Integration Stress Tests

### Test 46: API Rate Limit Cascade

**Priority:** P0
**Goal:** Hit all API rate limits simultaneously

**Setup:**
- Submit 100 contacts rapidly
- Trigger rate limits for:
  - Google Maps API
  - Google Places API
  - Gemini AI API
  - Pinecone API

**Test Script:**
```javascript
// Parallel submission
const promises = Array(100).fill().map((_, i) =>
  submitContact({
    name: `Rate Limit ${i}`,
    email: `rate${i}@test.com`,
    company: `Company${i}`,
    jobTitle: `Title${i}`
  })
);
await Promise.all(promises);
```

**Expected Behavior:**
- ✅ Rate limit errors caught
- ✅ Exponential backoff triggered
- ✅ Queuing system activated
- ✅ No data loss
- ✅ Graceful degradation

---

### Test 47: Service Dependency Failure Chain

**Priority:** P0
**Goal:** Test cascading service failures

**Failure Sequence:**
1. Pinecone fails
2. Then Redis fails
3. Then Firestore slows down
4. Then Google APIs rate limited

**Expected Behavior:**
- ✅ Each failure handled independently
- ✅ Partial enrichment saved
- ✅ No complete system failure
- ✅ Recovery when services return

---

### Test 48: Subscription Downgrade During Enrichment

**Priority:** P1
**Goal:** Test tier change mid-operation

**Setup:**
1. Start enrichment as Premium user
2. Downgrade to Basic mid-operation
3. Continue enrichment

**Expected Behavior:**
- ✅ In-flight operations complete
- ✅ New operations reflect new tier
- ✅ No data corruption
- ✅ Billing accurate

---

### Test 49: Database Connection Pool Exhaustion

**Priority:** P0
**Goal:** Exhaust Firestore connection pool

**Setup:**
- Open 500 concurrent connections
- Submit contacts during exhaustion

**Test Script:**
```javascript
// Exhaust connections
const connections = Array(500).fill().map(() =>
  adminDb.collection('users').onSnapshot(() => {})
);
```

**Expected Behavior:**
- ✅ Connection pooling works
- ✅ Queuing implemented
- ✅ Timeouts handled
- ✅ Auto-recovery
- ✅ No crashes

---

### Test 50: Multi-Region Failover Simulation

**Priority:** P2
**Goal:** Test failover between regions

**Setup:**
- Simulate primary region failure
- Force traffic to backup region

**Expected Behavior:**
- ✅ Automatic failover
- ✅ < 30 second recovery
- ✅ No data loss
- ✅ Cache coherency maintained

---

### Test 51: Configuration Hot Reload Under Load

**Priority:** P1
**Goal:** Change configuration during high load

**Setup:**
- Submit 50 contacts/second
- Change feature flags mid-stream
- Change rate limits
- Change cache TTLs

**Expected Behavior:**
- ✅ Config changes applied
- ✅ No request failures
- ✅ Smooth transition
- ✅ No memory leaks

---

### Test 52: Webhook Delivery Failure and Retry

**Priority:** P2
**Goal:** Test webhook retry logic

**Setup:**
- Configure webhook endpoint
- Make endpoint return 500 errors
- Submit contacts

**Expected Behavior:**
- ✅ Exponential backoff
- ✅ Max 3 retries
- ✅ Dead letter queue
- ✅ No data loss

---

### Test 53: Cross-Service Timeout Coordination

**Priority:** P1
**Goal:** Test timeout handling across services

**Setup:**
- Set different timeouts:
  - API Gateway: 30s
  - Lambda: 25s
  - Database: 20s
  - External APIs: 15s

**Expected Behavior:**
- ✅ Nested timeouts respected
- ✅ Graceful timeout handling
- ✅ Partial results saved
- ✅ No hanging requests

---

### Test 54: Partial Enrichment Recovery

**Priority:** P0
**Goal:** Test recovery from partial enrichment

**Setup:**
- Fail at different steps:
  - After geocoding
  - After venue search
  - After tagging
  - During embedding

**Expected Behavior:**
- ✅ Completed steps saved
- ✅ Failed steps logged
- ✅ Retry mechanism works
- ✅ No duplicate processing

---

### Test 55: Session Orphan Cleanup

**Priority:** P1
**Goal:** Verify orphaned sessions are cleaned up

**Setup:**
- Create sessions that never complete
- Wait for cleanup job

**Expected Behavior:**
- ✅ Orphans detected after 1 hour
- ✅ Sessions marked as failed
- ✅ Resources released
- ✅ Metrics updated

---

### Test 56: Cost Calculation Under Race Conditions

**Priority:** P0
**Goal:** Verify accurate cost tracking with concurrent updates

**Setup:**
- Submit 10 contacts simultaneously
- All updating same user's costs

**Expected Behavior:**
- ✅ Atomic cost updates
- ✅ No lost updates
- ✅ Accurate total
- ✅ No negative values

---

### Test 57: Budget Switch Mid-Enrichment

**Priority:** P1
**Goal:** Test budget change during enrichment

**Setup:**
- Start enrichment with good budget
- Exceed budget mid-operation
- Continue enrichment

**Expected Behavior:**
- ✅ Current operation completes
- ✅ Next steps check budget
- ✅ Graceful degradation
- ✅ Accurate billing

---

### Test 58: API Key Rotation During Operations

**Priority:** P2
**Goal:** Test API key rotation without downtime

**Setup:**
- Start operations with key A
- Rotate to key B mid-operation
- Invalidate key A

**Expected Behavior:**
- ✅ Seamless transition
- ✅ No failed requests
- ✅ Keys cached appropriately
- ✅ No security leaks

---

### Test 59: Firebase Quota Exhaustion

**Priority:** P0
**Goal:** Test Firestore quota limits

**Setup:**
- Exceed Firestore quotas:
  - Reads: 50,000/day
  - Writes: 20,000/day
  - Deletes: 20,000/day

**Expected Behavior:**
- ✅ Quota errors caught
- ✅ User-friendly error messages
- ✅ Operations queued
- ✅ Auto-retry after midnight

---

### Test 60: Pinecone Index Corruption Recovery

**Priority:** P1
**Goal:** Test recovery from index corruption

**Setup:**
- Corrupt Pinecone index metadata
- Attempt vector operations

**Expected Behavior:**
- ✅ Corruption detected
- ✅ Auto-repair attempted
- ✅ Fallback to rebuild
- ✅ Operations queued
- ✅ No data loss

---

## 📊 Performance & Load Tests

### Test 61: Bulk Contact Submission (1000+ Contacts)

**Priority:** P0
**Goal:** Test system with massive bulk import

**Setup:**
- Import CSV with 1000 contacts
- All features enabled

**Test Data:**
```javascript
// Generate 1000 unique contacts
const contacts = Array(1000).fill().map((_, i) => ({
  name: `Contact ${i}`,
  email: `bulk${i}@test.com`,
  company: `Company${i % 100}`,  // 100 unique companies
  jobTitle: `Title${i % 50}`,     // 50 unique titles
  notes: `Note ${i}`
}));
```

**Expected Behavior:**
- ✅ All contacts processed
- ✅ < 5 minute total time
- ✅ Memory usage < 2GB
- ✅ CPU usage < 80%
- ✅ No timeouts
- ✅ Accurate cost tracking

**Metrics:**
- Processing rate: ___ contacts/second
- Cache hit ratio: ___%
- API calls made: ___
- Total cost: $___

---

### Test 62: Sustained Load (100 req/sec for 10 minutes)

**Priority:** P0
**Goal:** Test sustained high load

**Setup:**
```bash
# Use Apache Bench
ab -n 60000 -c 100 -t 600 -p contact.json \
  -T application/json http://localhost:3000/api/contacts/exchange
```

**Expected Behavior:**
- ✅ Consistent response times
- ✅ No memory leaks
- ✅ No degradation over time
- ✅ Error rate < 1%
- ✅ p99 latency < 5s

---

### Test 63: Spike Load (0 to 1000 req/sec instantly)

**Priority:** P0
**Goal:** Test sudden traffic spike handling

**Setup:**
- System idle
- Instantly send 1000 requests
- Monitor recovery

**Expected Behavior:**
- ✅ Auto-scaling triggered
- ✅ Queue system activated
- ✅ No crashes
- ✅ Recovery < 30 seconds
- ✅ All requests processed

---

### Test 64: Memory Leak Detection (24-hour run)

**Priority:** P1
**Goal:** Detect memory leaks over time

**Setup:**
- Run system for 24 hours
- Submit 10 contacts/minute
- Monitor memory usage

**Expected Behavior:**
- ✅ Memory usage stable
- ✅ No continuous growth
- ✅ Garbage collection working
- ✅ No OOM errors

---

### Test 65: CPU Saturation Handling

**Priority:** P1
**Goal:** Test behavior at 100% CPU

**Setup:**
- Generate CPU-intensive load
- Submit contacts during saturation

**Test Script:**
```javascript
// CPU intensive operation
while(true) {
  crypto.pbkdf2Sync('test', 'salt', 100000, 64, 'sha512');
}
```

**Expected Behavior:**
- ✅ Requests queued
- ✅ Graceful degradation
- ✅ No crashes
- ✅ Recovery when CPU available

---

### Test 66: Disk I/O Saturation

**Priority:** P2
**Goal:** Test with saturated disk I/O

**Setup:**
- Generate heavy disk I/O
- Submit contacts

**Test Script:**
```bash
# Saturate disk
dd if=/dev/zero of=/tmp/testfile bs=1M count=10000
```

**Expected Behavior:**
- ✅ Operations continue
- ✅ Increased latency acceptable
- ✅ No data corruption
- ✅ Logs buffered

---

### Test 67: Network Bandwidth Exhaustion

**Priority:** P2
**Goal:** Test with limited bandwidth

**Setup:**
- Limit bandwidth to 1Mbps
- Submit contacts with large notes

**Expected Behavior:**
- ✅ Requests complete slowly
- ✅ Timeouts handled
- ✅ Compression used
- ✅ No data loss

---

### Test 68: Session Cleanup Performance

**Priority:** P1
**Goal:** Test session cleanup with 10,000 orphaned sessions

**Setup:**
- Create 10,000 incomplete sessions
- Run cleanup job
- Measure performance

**Expected Behavior:**
- ✅ Cleanup completes < 5 minutes
- ✅ Batch processing used
- ✅ No system impact
- ✅ All orphans cleaned

---

### Test 69: Cost Aggregation Accuracy Under Load

**Priority:** P0
**Goal:** Verify cost calculations remain accurate

**Setup:**
- Submit 1000 contacts
- Various cost scenarios
- Verify totals

**Expected Behavior:**
- ✅ Cost accuracy 100%
- ✅ No floating point errors
- ✅ Atomic updates
- ✅ Audit trail complete

---

### Test 70: Database Query Optimization Validation

**Priority:** P1
**Goal:** Verify query performance at scale

**Setup:**
- Database with 1M contacts
- Run typical queries
- Measure performance

**Queries to Test:**
- Search by email
- Search by company
- Full-text search
- Tag filtering

**Expected Performance:**
- Simple queries: < 100ms
- Complex queries: < 1s
- Aggregations: < 5s

---

### Test 71: API Response Time Degradation

**Priority:** P1
**Goal:** Measure response time under various loads

**Load Levels:**
- Idle: 0 req/sec
- Low: 10 req/sec
- Medium: 50 req/sec
- High: 100 req/sec
- Peak: 200 req/sec

**Expected Response Times:**
- Idle: < 500ms
- Low: < 1s
- Medium: < 2s
- High: < 5s
- Peak: < 10s

---

### Test 72: Concurrent User Limit Testing

**Priority:** P1
**Goal:** Find maximum concurrent users

**Setup:**
- Gradually increase concurrent users
- Find breaking point

**Expected Limits:**
- 100 concurrent: ✅ Stable
- 500 concurrent: ✅ Stable
- 1000 concurrent: ✅ Degraded
- 2000 concurrent: ⚠️ Limit

---

### Test 73: Background Job Queue Overflow

**Priority:** P1
**Goal:** Test job queue limits

**Setup:**
- Submit 10,000 background jobs
- Monitor queue behavior

**Expected Behavior:**
- ✅ Queue size limited
- ✅ Old jobs dropped
- ✅ Priority jobs processed
- ✅ No memory issues

---

### Test 74: Log Rotation Under Heavy Load

**Priority:** P2
**Goal:** Test logging system under load

**Setup:**
- Generate 1GB of logs quickly
- Verify rotation works

**Expected Behavior:**
- ✅ Logs rotate at size limit
- ✅ Old logs compressed
- ✅ No data loss
- ✅ No disk space issues

---

### Test 75: Monitoring System Stress

**Priority:** P2
**Goal:** Test monitoring under extreme conditions

**Setup:**
- Generate 10,000 metrics/second
- Verify monitoring works

**Expected Behavior:**
- ✅ Metrics aggregated
- ✅ Alerts still work
- ✅ Dashboards responsive
- ✅ No metric loss

---

## 🔒 Security & Data Integrity Tests

### Test 76: Session Hijacking Attempt

**Priority:** P0
**Goal:** Attempt to hijack another user's session

**Attack Vector:**
- Steal session ID from logs
- Try to use for different user

**Expected Behavior:**
- ✅ Session tied to user
- ✅ Hijack attempt blocked
- ✅ Security alert triggered
- ✅ Audit log created

---

### Test 77: Cross-User Data Leakage Check

**Priority:** P0
**Goal:** Verify complete data isolation

**Setup:**
- User A creates contact with sensitive data
- User B searches for that data

**Expected Behavior:**
- ✅ No data leakage
- ✅ Search returns nothing
- ✅ Vectors isolated
- ✅ Cache isolated

---

### Test 78: SQL Injection in Enrichment Data

**Priority:** P0
**Goal:** Test SQL injection prevention

**Injection Attempts:**
```javascript
{
  company: "'; DROP TABLE contacts; --",
  jobTitle: "1' OR '1'='1",
  notes: "SELECT * FROM users"
}
```

**Expected Behavior:**
- ✅ Input sanitized
- ✅ No database errors
- ✅ Queries parameterized
- ✅ Attack logged

---

### Test 79: NoSQL Injection in Venue Names

**Priority:** P0
**Goal:** Test NoSQL injection prevention

**Injection Attempts:**
```javascript
{
  venue: {
    name: '{"$ne": null}',
    placeId: '{"$gt": ""}',
  }
}
```

**Expected Behavior:**
- ✅ Input validated
- ✅ No query manipulation
- ✅ Safe storage
- ✅ Attack logged

---

### Test 80: XSS in Auto-Generated Tags

**Priority:** P0
**Goal:** Test XSS prevention in tags

**XSS Attempts:**
```javascript
{
  tags: [
    "<script>alert('XSS')</script>",
    "javascript:alert('XSS')",
    "<img src=x onerror=alert('XSS')>"
  ]
}
```

**Expected Behavior:**
- ✅ Tags sanitized
- ✅ No script execution
- ✅ Safe rendering
- ✅ CSP headers enforced

---

### Test 81: Budget Manipulation Attempts

**Priority:** P0
**Goal:** Try to manipulate budget limits

**Attack Vectors:**
- Negative cost values
- Integer overflow
- Race condition exploitation
- Direct database manipulation

**Expected Behavior:**
- ✅ Validation prevents negative
- ✅ Overflow handled
- ✅ Atomic operations
- ✅ Tampering detected

---

### Test 82: Cost Calculation Tampering

**Priority:** P0
**Goal:** Try to reduce calculated costs

**Attack Methods:**
- Modify requests mid-flight
- Replay old requests
- Spoof cache hits

**Expected Behavior:**
- ✅ Server-side calculation only
- ✅ Request signing verified
- ✅ Cache integrity checked
- ✅ Accurate billing

---

### Test 83: Unauthorized Tier Access

**Priority:** P0
**Goal:** Try to access premium features on basic tier

**Attack Methods:**
- Modify subscription level client-side
- Spoof premium user headers
- Direct API access

**Expected Behavior:**
- ✅ Server-side tier checking
- ✅ Access denied
- ✅ Attempt logged
- ✅ No feature access

---

### Test 84: GDPR Data Deletion Verification

**Priority:** P0
**Goal:** Verify complete data deletion

**Setup:**
- Create user with contacts
- Request GDPR deletion
- Verify deletion

**Verification Points:**
- ✅ Firestore documents deleted
- ✅ Pinecone vectors removed
- ✅ Cache entries cleared
- ✅ Logs anonymized
- ✅ Backups marked

---

### Test 85: Encryption Key Rotation Impact

**Priority:** P1
**Goal:** Test key rotation without data loss

**Setup:**
- Encrypt data with key A
- Rotate to key B
- Verify data accessible

**Expected Behavior:**
- ✅ Seamless rotation
- ✅ Old data readable
- ✅ New data uses new key
- ✅ No downtime

---

### Test 86: Authentication Token Expiry Edge Cases

**Priority:** P1
**Goal:** Test token expiry handling

**Test Cases:**
- Token expires mid-request
- Token expires during enrichment
- Refresh token invalid

**Expected Behavior:**
- ✅ Graceful re-authentication
- ✅ Operation continues
- ✅ No data loss
- ✅ User notified

---

### Test 87: CORS Policy Bypass Attempts

**Priority:** P1
**Goal:** Try to bypass CORS restrictions

**Attack Methods:**
- Spoofed origin headers
- Proxy requests
- Preflight manipulation

**Expected Behavior:**
- ✅ CORS enforced
- ✅ Only allowed origins
- ✅ Preflight validated
- ✅ Attack logged

---

### Test 88: API Key Exposure Prevention

**Priority:** P0
**Goal:** Verify API keys never exposed

**Check Points:**
- Client-side code
- API responses
- Error messages
- Logs
- Cache entries

**Expected Behavior:**
- ✅ No keys in client
- ✅ Keys redacted in logs
- ✅ Keys not in responses
- ✅ Keys encrypted at rest

---

### Test 89: Rate Limiting Bypass Attempts

**Priority:** P0
**Goal:** Try to bypass rate limits

**Bypass Methods:**
- Distributed IPs
- Header spoofing
- Connection pooling
- Request splitting

**Expected Behavior:**
- ✅ User-based limiting
- ✅ Headers ignored
- ✅ Aggregate counting
- ✅ Bypass blocked

---

### Test 90: Audit Log Tampering Detection

**Priority:** P0
**Goal:** Verify audit logs are tamper-proof

**Tampering Attempts:**
- Modify log files
- Delete log entries
- Inject fake entries

**Expected Behavior:**
- ✅ Checksums verify integrity
- ✅ Logs immutable
- ✅ Tampering detected
- ✅ Alerts triggered

---

## 🤖 Test Automation Opportunities

### High Priority for Automation

1. **Cache Testing (Tests 31-45)**
   - Automate cache stampede simulation
   - Automate TTL boundary testing
   - Automate cache invalidation testing

2. **Performance Tests (Tests 61-75)**
   - Automate load generation
   - Automate metric collection
   - Automate performance regression detection

3. **Security Tests (Tests 76-90)**
   - Automate injection testing
   - Automate CORS validation
   - Automate authentication testing

### Automation Tools Recommended

- **Load Testing:** K6, JMeter, Gatling
- **API Testing:** Postman, Newman, REST Assured
- **Security Testing:** OWASP ZAP, Burp Suite
- **Monitoring:** Prometheus, Grafana, DataDog

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: Stress Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Run nightly
jobs:
  stress-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Cache Tests
        run: npm run test:cache
      - name: Run Load Tests
        run: npm run test:load
      - name: Run Security Tests
        run: npm run test:security
      - name: Upload Results
        uses: actions/upload-artifact@v2
```

---

## 📊 Performance Baselines

### Expected Performance Metrics

| Operation | p50 | p95 | p99 | Max |
|-----------|-----|-----|-----|-----|
| Static Cache Hit | 5ms | 10ms | 20ms | 50ms |
| Redis Cache Hit | 20ms | 50ms | 100ms | 200ms |
| AI Generation | 800ms | 2000ms | 4000ms | 5000ms |
| Complete 4-Step | 2s | 5s | 8s | 10s |
| Vector Indexing | 100ms | 300ms | 500ms | 1000ms |

### Resource Usage Targets

| Resource | Idle | Normal | Peak | Max |
|----------|------|--------|------|-----|
| CPU | 5% | 30% | 60% | 80% |
| Memory | 200MB | 500MB | 1GB | 2GB |
| Network | 1Mbps | 10Mbps | 50Mbps | 100Mbps |
| Disk I/O | 10 IOPS | 100 IOPS | 500 IOPS | 1000 IOPS |

---

## 🔧 Failure Recovery Procedures

### Service Failure Recovery

1. **Redis Failure**
   - Fallback to API calls
   - Log cache misses
   - Auto-reconnect every 30s
   - Alert on 5 minute outage

2. **Pinecone Failure**
   - Queue vectors locally
   - Retry with exponential backoff
   - Process queue when recovered
   - Alert on 100+ queued items

3. **Firestore Failure**
   - Queue writes to Redis
   - Serve from cache
   - Batch write on recovery
   - Alert immediately

### Data Recovery

1. **Corrupted Cache**
   ```bash
   redis-cli FLUSHDB
   # Cache will rebuild automatically
   ```

2. **Orphaned Sessions**
   ```javascript
   // Run cleanup job manually
   await SessionCleanupJob.run();
   ```

3. **Stuck Enrichments**
   ```javascript
   // Force finalize sessions older than 1 hour
   await forceFinalizeStaleSessions();
   ```

---

## ✅ Production Readiness Checklist

### Must Pass Before Production

#### Critical (P0) - Block Production

- [ ] Test 1: Complete 4-step flow works
- [ ] Test 22: Vector embedding integrated
- [ ] Test 31: Cache stampede prevention
- [ ] Test 46: Rate limit handling
- [ ] Test 61: Bulk import successful
- [ ] Test 76-83: Security tests pass
- [ ] Test 84: GDPR compliance verified

#### High Priority (P1) - Fix Within 24 Hours

- [ ] Test 23-30: Vector embedding edge cases
- [ ] Test 32-40: Cache integrity tests
- [ ] Test 47-55: Integration tests
- [ ] Test 62-65: Performance tests
- [ ] Test 85-90: Additional security

#### Medium Priority (P2) - Fix Within 1 Week

- [ ] Test 41-45: Advanced cache tests
- [ ] Test 56-60: Advanced integration
- [ ] Test 66-75: Extended performance

#### Low Priority (P3) - Nice to Have

- [ ] Geographic partitioning
- [ ] Multi-region failover
- [ ] Advanced monitoring

### Monitoring Requirements

Based on test findings, monitor:

1. **Real-time Alerts**
   - Error rate > 1%
   - p99 latency > 10s
   - Cache hit ratio < 50%
   - Budget exhaustion
   - Security violations

2. **Daily Reports**
   - Total enrichments
   - Cache performance
   - API costs
   - Error breakdown
   - Performance trends

3. **Weekly Analysis**
   - Cost per contact
   - Feature adoption
   - Performance regression
   - Capacity planning

---

## 📊 Coverage Matrix

### Feature Coverage

| Feature | Basic Tests | Stress Tests | Security Tests | Total |
|---------|------------|--------------|----------------|-------|
| Geocoding | 5 | 3 | 2 | 10 |
| Venue Search | 5 | 4 | 2 | 11 |
| Auto-Tagging | 10 | 5 | 3 | 18 |
| Vector Embedding | 2 | 9 | 2 | 13 |
| Session Tracking | 8 | 6 | 3 | 17 |
| Cache System | 8 | 15 | 4 | 27 |
| Budget System | 6 | 4 | 3 | 13 |

### Test Priority Distribution

| Priority | Count | Percentage | Focus Area |
|----------|-------|------------|------------|
| P0 | 28 | 31% | Critical functionality |
| P1 | 35 | 39% | Important features |
| P2 | 20 | 22% | Nice to have |
| P3 | 7 | 8% | Future enhancements |

---

## 🎯 Success Criteria

**System is production-ready when:**

1. ✅ **All P0 tests pass** (28 critical tests)
2. ✅ **95% of P1 tests pass** (33 of 35 tests)
3. ✅ **Performance meets baselines** (see Performance Baselines section)
4. ✅ **Security tests show no vulnerabilities** (Tests 76-90)
5. ✅ **Cache hit ratio > 70%** for common operations
6. ✅ **Error rate < 1%** under normal load
7. ✅ **p99 latency < 10s** for complete enrichment
8. ✅ **System handles 100 req/sec** sustained
9. ✅ **Recovery from failures < 5 minutes**
10. ✅ **24-hour stability test passes** (no memory leaks)

---

## 📝 Notes

### Test Execution Time

- **Basic Tests (1-21):** ~30-50 minutes
- **Step 4 Tests (22-30):** ~20 minutes
- **Cache Tests (31-45):** ~45 minutes
- **Integration Tests (46-60):** ~60 minutes
- **Performance Tests (61-75):** ~2-4 hours
- **Security Tests (76-90):** ~45 minutes
- **Total Time:** ~5-7 hours (excluding 24-hour test)

### Required Tools

- Browser DevTools
- Redis CLI
- Firestore Console
- Pinecone Console
- Apache Bench or K6
- Network monitoring tools
- CPU/Memory profilers
- Security scanning tools

### Data Cleanup

```bash
# Clean up test data after validation
firebase firestore:delete contacts --recursive
redis-cli FLUSHDB
# Pinecone cleanup via console
```

### Environment Reset

After destructive tests:
1. Reset budget limits
2. Clear Redis cache
3. Restart services
4. Verify clean state

### Critical Paths to Test

1. **New User Journey:** Sign up → First contact → Enrichment → Search
2. **Power User Journey:** Bulk import → Mass enrichment → Advanced search
3. **Budget User Journey:** Near limits → Degraded service → Limit exceeded
4. **Recovery Journey:** Service failure → Partial enrichment → Recovery

---

## 🚀 Quick Start Testing Guide

### Minimum Viable Testing (2 Hours)

If you only have 2 hours, prioritize these tests:

1. **Test 22:** Complete 4-step flow (10 min)
2. **Test 31:** Cache stampede test (10 min)
3. **Test 46:** Rate limit cascade (10 min)
4. **Test 61:** Bulk import 1000 (20 min)
5. **Test 76:** Session hijacking (5 min)
6. **Test 78-80:** Injection tests (15 min)
7. **Test 84:** GDPR deletion (10 min)
8. **Performance baseline:** 100 req/sec (30 min)
9. **Review results and logs** (10 min)

This gives you 80% confidence in 20% of the time.

---

## 📈 Regression Testing

After any code changes, run:

1. **Smoke Tests:** Tests 1, 22, 31 (15 minutes)
2. **Integration Tests:** Tests 46-48 (20 minutes)
3. **Security Tests:** Tests 76, 78, 80 (15 minutes)

Total regression suite: 50 minutes

---

**End of Comprehensive Testing Guide v2.0**

**Remember:** The goal isn't to pass all tests perfectly, but to understand system limits, failure modes, and recovery mechanisms. Document all findings for continuous improvement.

**Good luck stress testing! 💪🚀**