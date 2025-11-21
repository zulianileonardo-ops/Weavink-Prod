---
id: features-contact-duplication-merging-079
title: Contact Duplication Detection & AI-Powered Merging System
category: features
tags: [contacts, ai, semantic-search, deduplication, gemini, redis, vector-similarity, merge, planned]
status: planned
created: 2025-11-21
updated: 2025-11-21
related:
  - technical-semantic-search-032
  - features-venue-enrichment-021
  - technical-cost-tracking-migration-024
  - rgpd-anonymous-analytics-046
---

# Contact Duplication Detection & AI-Powered Merging System

## Overview

An intelligent contact management system that detects duplicate and similar contacts using vector similarity and AI-powered analysis, provides user-facing merge suggestions via dashboard UI, handles AI opt-out scenarios gracefully, and implements "welcome back" detection for returning contacts.

## Business Requirements

### Core Features

1. **Public Profile Scanning with Duplicate Detection**
   - Real-time duplicate detection when scanning business cards/QR codes
   - Database logging of all duplicate detection events
   - Rate limiting to prevent abuse (follows existing bot detection patterns)

2. **Twin LM Similarity Checking**
   - AI-powered similarity analysis without auto-merging
   - Dashboard UI flagging for similar contacts
   - User-controlled merge workflow with AI assistance

3. **Re-entry Detection ("Welcome Back")**
   - Detect when users re-add contacts added previously
   - Display contextual "welcome back" message with historical data
   - Update metadata with return date

4. **AI Opt-Out Architecture**
   - Users can disable AI features while maintaining core functionality
   - Fallback to hard-coded rules and Redis cache
   - Graceful degradation without feature loss

5. **Automated Daily Data Rebuilds**
   - Gemini 3 Pro expands similarity rules daily
   - Rebuild hard-coded fallback data every 24 hours
   - Redis cache refresh for instant access

---

## Technical Architecture

### System Components

```
┌────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                 │
│  DuplicateDetectionService.js (client)                             │
│  - scanForDuplicates()                                             │
│  - fetchSimilarContacts()                                          │
│  - requestMerge()                                                  │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                        API ROUTES                                   │
│  /api/user/contacts/detect-duplicates/route.js                    │
│  /api/user/contacts/similar/route.js                              │
│  /api/user/contacts/merge/route.js                                │
│                                                                    │
│  - Authentication (createApiSession)                               │
│  - Permission checks (PREMIUM_DUPLICATE_DETECTION)                 │
│  - Budget affordability checks                                     │
│  - Rate limiting integration                                       │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                                  │
│  lib/services/serviceContact/server/                               │
│  ├── DuplicateDetectionService.js                                 │
│  │   - detectDuplicatesForContact()                               │
│  │   - findSimilarContacts()                                      │
│  │   - calculateSimilarityScore()                                 │
│  │   - checkReentry()                                             │
│  ├── ContactMergeService.js                                       │
│  │   - aiAssistedMerge()                                          │
│  │   - manualMerge()                                              │
│  │   - previewMerge()                                             │
│  └── SimilarityRulesService.js                                    │
│      - getHardCodedRules()                                        │
│      - rebuildRulesWithAI() (daily cron)                          │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                    AI & VECTOR LAYER                                │
│  Semantic Search Integration:                                      │
│  - Pinecone vector similarity (cosine distance)                    │
│  - Embedding generation (multilingual-e5-large)                    │
│  - Threshold: 0.85+ for duplicates, 0.70-0.84 for similar         │
│                                                                    │
│  AI Enhancement:                                                   │
│  - Gemini 3 Pro for similarity analysis                           │
│  - Redis cache (24h TTL) for rules and analysis                   │
│  - Static fallback rules (COMMON_DUPLICATE_PATTERNS)              │
└────────────────────┬───────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                                 │
│  Firestore Collections:                                            │
│  ├── Contacts/{userId}/contacts/{contactId}                       │
│  │   - duplicateFlags: [contactIds]                               │
│  │   - similarFlags: [contactIds]                                 │
│  │   - reentryDate: timestamp                                     │
│  │   - previousAddedDate: timestamp                               │
│  ├── DuplicateDetectionLogs/{logId}                               │
│  │   - userId, contactA, contactB                                 │
│  │   - similarityScore, method, timestamp                         │
│  │   - rateLimitTracking                                          │
│  └── MergeHistory/{mergeId}                                       │
│      - sourceContacts, mergedContact                              │
│      - userAction, aiSuggestions, timestamp                       │
└────────────────────────────────────────────────────────────────────┘
```

---

## Feature Specifications

### 1. Real-Time Duplicate Detection (Public Scan)

**Trigger:** User scans a business card or exchanges contacts via QR code

**Flow:**

```javascript
// Step 1: Extract contact data
const newContact = await extractContactFromScan(scanData);

// Step 2: Generate embedding for new contact
const embedding = await EmbeddingService.generateEmbedding(
  buildContactDocument(newContact)
);

// Step 3: Vector similarity search
const results = await PineconeService.query({
  vector: embedding,
  topK: 10,
  filter: { userId: session.userId },
  includeMetadata: true
});

// Step 4: Threshold filtering
const duplicates = results.filter(r => r.score >= 0.85);
const similar = results.filter(r => r.score >= 0.70 && r.score < 0.85);

// Step 5: Log detection event (rate-limited)
await DuplicateDetectionService.logEvent({
  userId: session.userId,
  newContactData: sanitize(newContact),
  duplicates: duplicates.map(d => d.id),
  similar: similar.map(s => s.id),
  timestamp: Date.now(),
  method: 'vector_similarity'
});

// Step 6: Return flagged results
return {
  isDuplicate: duplicates.length > 0,
  duplicateContacts: duplicates,
  similarContacts: similar,
  confidence: Math.max(...duplicates.map(d => d.score))
};
```

**Database Logging:**

```javascript
// DuplicateDetectionLogs collection
{
  id: 'log_abc123',
  userId: 'user_xyz',
  timestamp: '2025-11-21T10:30:00Z',
  contactAId: 'contact_new',
  contactBId: 'contact_existing',
  similarityScore: 0.92,
  method: 'vector_similarity',
  action: 'flagged',
  rateLimitInfo: {
    requestCount: 3,
    windowStart: '2025-11-21T10:00:00Z'
  }
}
```

**Rate Limiting:**
- Follows existing `RateLimitService` patterns
- Limit: 100 duplicate checks per hour per user
- Logs to `RateLimits` collection
- Integrates with bot detection system

---

### 2. Dashboard Similar Contacts UI

**Component:** `app/dashboard/contacts/components/SimilarContactsPanel.jsx`

**Features:**
- Card-based UI showing pairs of similar contacts
- Side-by-side comparison view
- Similarity score visualization (0-100%)
- "Merge with AI" button
- "Keep Separate" button
- Expandable diff view showing field differences

**API Endpoint:** `GET /api/user/contacts/similar`

```javascript
// Response format
{
  "similarPairs": [
    {
      "contactA": {
        "id": "contact_1",
        "name": "John Smith",
        "company": "Tesla Inc",
        "email": "john@tesla.com",
        // ... full contact data
      },
      "contactB": {
        "id": "contact_2",
        "name": "John J. Smith",
        "company": "Tesla",
        "email": "j.smith@tesla.com",
        // ... full contact data
      },
      "similarityScore": 0.87,
      "matchedFields": ["name", "company", "email"],
      "differences": {
        "name": { a: "John Smith", b: "John J. Smith" },
        "email": { a: "john@tesla.com", b: "j.smith@tesla.com" }
      }
    }
  ],
  "totalPairs": 3,
  "timestamp": "2025-11-21T10:30:00Z"
}
```

**Translation Keys (5 languages):**

```json
// public/locales/en/common.json
{
  "duplicates": {
    "title": "Similar Contacts Detected",
    "similarityScore": "Similarity: {{score}}%",
    "mergeWithAI": "Merge with AI Assistance",
    "keepSeparate": "Keep Separate",
    "viewDifferences": "View Differences",
    "mergePreview": "Merge Preview",
    "confirmMerge": "Confirm Merge",
    "welcomeBack": "Welcome back! Last seen {{date}}"
  }
}
```

---

### 3. AI-Assisted Merge Workflow

**API Endpoint:** `POST /api/user/contacts/merge`

**Request:**
```json
{
  "contactIds": ["contact_1", "contact_2"],
  "useAI": true,
  "sessionId": "session_merge_123"
}
```

**AI Merge Logic:**

```javascript
async function aiAssistedMerge(contactA, contactB, sessionId) {
  // Step 1: Generate merge preview using Gemini 3 Pro
  const prompt = `
You are a contact management assistant. Analyze these two contact entries and suggest the best merged version.

Contact A:
${JSON.stringify(contactA, null, 2)}

Contact B:
${JSON.stringify(contactB, null, 2)}

Provide a merged contact that:
1. Chooses the most complete/accurate value for each field
2. Combines tags and notes
3. Preserves all unique information
4. Explains conflicts and your resolution

Return JSON format:
{
  "mergedContact": { /* merged data */ },
  "conflicts": [
    {
      "field": "email",
      "valueA": "john@tesla.com",
      "valueB": "j.smith@tesla.com",
      "chosenValue": "john@tesla.com",
      "reason": "Primary email appears more complete"
    }
  ],
  "confidence": 0.95
}
  `;

  const response = await GeminiService.generate({
    prompt,
    model: 'gemini-3-pro',
    temperature: 0.2
  });

  // Track AI cost
  await CostTrackingService.recordUsage({
    userId: contactA.userId,
    usageType: 'AIUsage',
    feature: 'contact_merge_analysis',
    cost: response.cost,
    isBillableRun: true,
    provider: 'gemini-3-pro',
    sessionId,
    metadata: {
      contactsAnalyzed: 2,
      tokensUsed: response.tokensUsed
    }
  });

  return response.data;
}
```

**Merge Preview UI:**
- Shows AI's suggested merged contact
- Highlights conflicts with AI reasoning
- Allows manual override of AI choices
- Displays confidence score
- Shows before/after comparison

---

### 4. "Welcome Back" Re-entry Detection

**Trigger:** User adds a contact that was previously added (by matching on email, phone, or vector similarity)

**Detection Logic:**

```javascript
async function checkReentry(newContact, userId) {
  // Check if contact exists in deleted/archived contacts
  const archivedQuery = await db
    .collection(`Contacts/${userId}/archived`)
    .where('email', '==', newContact.email)
    .orWhere('phone', '==', newContact.phone)
    .limit(1)
    .get();

  if (!archivedQuery.empty) {
    const archived = archivedQuery.docs[0].data();
    return {
      isReentry: true,
      previousContact: archived,
      previousAddedDate: archived.createdAt,
      daysSinceLastContact: calculateDays(archived.updatedAt, Date.now()),
      message: `Welcome back! Last contacted ${formatDate(archived.updatedAt)}`
    };
  }

  // Also check vector similarity for renamed/modified contacts
  const similarArchived = await findSimilarInArchive(newContact, userId);
  if (similarArchived && similarArchived.score > 0.90) {
    return {
      isReentry: true,
      previousContact: similarArchived.contact,
      previousAddedDate: similarArchived.contact.createdAt,
      confidence: similarArchived.score,
      message: `This might be ${similarArchived.contact.name} - welcome back!`
    };
  }

  return { isReentry: false };
}
```

**UI Implementation:**

```jsx
// app/dashboard/contacts/components/ContactAddSuccess.jsx
{reentryData.isReentry && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200"
  >
    <div className="flex items-center gap-2 mb-2">
      <UserCheck className="w-5 h-5 text-purple-600" />
      <h4 className="font-semibold text-purple-900">
        {t('duplicates.welcomeBack', {
          date: formatDate(reentryData.previousAddedDate)
        })}
      </h4>
    </div>
    <p className="text-sm text-purple-700">
      Last interaction: {reentryData.daysSinceLastContact} days ago
    </p>
    {reentryData.previousContact.notes && (
      <div className="mt-2 p-2 bg-white rounded border border-purple-200">
        <p className="text-xs text-gray-600">Previous notes:</p>
        <p className="text-sm">{reentryData.previousContact.notes}</p>
      </div>
    )}
  </motion.div>
)}
```

---

### 5. AI Opt-Out Architecture

**User Setting:** `userSettings.features.aiDuplicateDetection: boolean`

**Graceful Degradation Flow:**

```javascript
async function detectDuplicates(contact, userId, userSettings) {
  // Check AI opt-out status
  if (userSettings.features.aiDuplicateDetection === false) {
    console.log('[DuplicateDetection] AI disabled, using fallback rules');

    // Layer 1: Exact match rules (instant)
    const exactMatches = await findExactMatches(contact, userId);
    if (exactMatches.length > 0) {
      return {
        duplicates: exactMatches,
        method: 'exact_match',
        aiUsed: false
      };
    }

    // Layer 2: Redis cached similarity rules
    const cachedRules = await RedisCache.get(`duplicate_rules:${userId}`);
    if (cachedRules) {
      const similarContacts = await applyHardCodedRules(
        contact,
        userId,
        cachedRules
      );
      return {
        duplicates: similarContacts,
        method: 'cached_rules',
        aiUsed: false
      };
    }

    // Layer 3: Static fallback patterns
    const fallbackResults = await applyStaticPatterns(contact, userId);
    return {
      duplicates: fallbackResults,
      method: 'static_patterns',
      aiUsed: false
    };
  }

  // AI enabled - full pipeline
  return await aiPoweredDuplicateDetection(contact, userId);
}
```

**Hard-Coded Fallback Rules:**

```javascript
// lib/services/serviceContact/server/constants/duplicatePatterns.js
export const COMMON_DUPLICATE_PATTERNS = {
  // Exact field matches
  exact: {
    email: { weight: 1.0, required: false },
    phone: { weight: 1.0, required: false },
    linkedinUrl: { weight: 0.9, required: false }
  },

  // Fuzzy name matching
  name: {
    patterns: [
      // "John Smith" matches "J. Smith"
      (nameA, nameB) => {
        const initials = nameA.split(' ').map(w => w[0]).join('. ');
        return nameB.includes(initials);
      },
      // "John Smith" matches "John J Smith" (middle initial added)
      (nameA, nameB) => {
        const wordsA = nameA.split(' ');
        const wordsB = nameB.split(' ');
        return wordsA.every(w => nameB.includes(w));
      }
    ],
    weight: 0.7
  },

  // Company name variations
  company: {
    normalizations: {
      'inc': ['inc', 'incorporated', 'inc.'],
      'llc': ['llc', 'l.l.c', 'limited liability company'],
      'corp': ['corp', 'corporation', 'corp.'],
      'ltd': ['ltd', 'limited', 'ltd.']
    },
    weight: 0.6
  }
};
```

---

### 6. Daily Data Rebuild with Gemini 3 Pro

**Scheduled Function:** Firebase Cloud Function (daily cron at 2 AM UTC)

```javascript
// functions/scheduledTasks/rebuildDuplicateRules.js
export const rebuildDuplicateRules = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('[DailyRebuild] Starting duplicate rules rebuild');

    // Step 1: Fetch all users (or sample for large datasets)
    const users = await admin.firestore()
      .collection('Users')
      .limit(1000)
      .get();

    for (const userDoc of users.docs) {
      const userId = userDoc.id;

      // Step 2: Get user's contact patterns
      const contactsSnapshot = await admin.firestore()
        .collection(`Contacts/${userId}/contacts`)
        .limit(100)
        .get();

      const contacts = contactsSnapshot.docs.map(d => d.data());

      // Step 3: Use Gemini 3 Pro to generate enhanced rules
      const enhancedRules = await GeminiService.generate({
        prompt: `
Analyze these contact patterns and generate similarity detection rules:

Contacts sample:
${JSON.stringify(contacts.slice(0, 20), null, 2)}

Generate rules for:
1. Name variations (nicknames, initials, order)
2. Company name variations (abbreviations, legal entities)
3. Email pattern matching (personal vs work emails)
4. Phone number formats

Return JSON with pattern matching rules.
        `,
        model: 'gemini-3-pro',
        temperature: 0.3
      });

      // Step 4: Store in Redis with 24h TTL
      await RedisCache.set(
        `duplicate_rules:${userId}`,
        enhancedRules.data,
        { ttl: 86400 } // 24 hours
      );

      // Step 5: Track cost
      await admin.firestore()
        .collection('SystemUsage')
        .doc('daily_rebuilds')
        .update({
          lastRebuild: admin.firestore.FieldValue.serverTimestamp(),
          cost: admin.firestore.FieldValue.increment(enhancedRules.cost),
          usersProcessed: admin.firestore.FieldValue.increment(1)
        });
    }

    console.log('[DailyRebuild] Completed successfully');
    return null;
  });
```

**Redis Cache Structure:**

```javascript
// Key: duplicate_rules:{userId}
// TTL: 24 hours
{
  "version": "1.0",
  "generatedAt": "2025-11-21T02:00:00Z",
  "userId": "user_abc",
  "rules": {
    "nameVariations": {
      "John": ["Johnny", "Jon", "J.", "John J"],
      "Robert": ["Bob", "Rob", "Bobby", "Robbie"],
      // ... AI-generated variations
    },
    "companyNormalizations": {
      "tesla": ["Tesla Inc", "Tesla, Inc.", "Tesla Motors", "TSLA"],
      // ... AI-generated variations
    },
    "emailPatterns": [
      {
        "pattern": "^[first]\\.[last]@",
        "confidence": 0.9
      }
    ]
  },
  "confidence": 0.85
}
```

---

## Cost Tracking Integration

**Usage Types:**

```javascript
// AI-powered similarity analysis
await CostTrackingService.recordUsage({
  userId: session.userId,
  usageType: 'AIUsage',
  feature: 'duplicate_detection_ai',
  cost: 0.0012,
  isBillableRun: true,
  provider: 'gemini-3-pro',
  sessionId,
  metadata: {
    contactsAnalyzed: 2,
    method: 'ai_similarity'
  }
});

// Vector embedding generation
await CostTrackingService.recordUsage({
  userId: session.userId,
  usageType: 'ApiUsage',
  feature: 'contact_embedding_generation',
  cost: 0.000016,
  isBillableRun: false,
  provider: 'pinecone',
  sessionId,
  metadata: {
    embeddingDimension: 1024,
    model: 'multilingual-e5-large'
  }
});

// Pinecone vector search
await CostTrackingService.recordUsage({
  userId: session.userId,
  usageType: 'ApiUsage',
  feature: 'duplicate_vector_search',
  cost: 0.0001,
  isBillableRun: false,
  provider: 'pinecone',
  sessionId,
  metadata: {
    topK: 10,
    resultsReturned: 5
  }
});
```

---

## Premium Feature Tiers

| Tier | Duplicate Detection | AI Merge | Daily Checks | Re-entry Detection |
|------|---------------------|----------|--------------|-------------------|
| **Base** | ✅ Exact match only | ❌ | 10/day | ✅ Basic |
| **Pro** | ✅ Fuzzy + cached rules | ❌ | 50/day | ✅ Full |
| **Premium** | ✅ Full AI-powered | ✅ | 200/day | ✅ Full |
| **Business** | ✅ Full AI-powered | ✅ | Unlimited | ✅ Full |
| **Enterprise** | ✅ Full AI-powered | ✅ | Unlimited | ✅ Full |

**Permission Constants:**

```javascript
// lib/services/serviceContact/constants/subscriptionConstants.js
export const FEATURE_PERMISSIONS = {
  DUPLICATE_DETECTION_AI: ['premium', 'business', 'enterprise'],
  DUPLICATE_DETECTION_BASIC: ['base', 'pro', 'premium', 'business', 'enterprise'],
  AI_MERGE_ASSISTANCE: ['premium', 'business', 'enterprise'],
  REENTRY_DETECTION_FULL: ['pro', 'premium', 'business', 'enterprise'],
};

export const RATE_LIMITS = {
  DUPLICATE_CHECKS_PER_DAY: {
    base: 10,
    pro: 50,
    premium: 200,
    business: -1, // unlimited
    enterprise: -1
  }
};
```

---

## Security & Rate Limiting

**Rate Limiting Rules:**

```javascript
// Follows existing RateLimitService patterns
const rateLimitConfig = {
  endpoint: '/api/user/contacts/detect-duplicates',
  limits: {
    base: { requests: 10, window: '24h' },
    pro: { requests: 50, window: '24h' },
    premium: { requests: 200, window: '24h' },
    business: { requests: -1, window: '24h' },
    enterprise: { requests: -1, window: '24h' }
  },
  blockDuration: '1h',
  logCollection: 'RateLimits',
  eventType: 'DUPLICATE_DETECTION'
};
```

**Logging to Firestore:**

```javascript
// RateLimits collection entry
{
  fingerprint: 'fp_user_abc_ip_192.168.1.1',
  userId: 'user_abc',
  eventType: 'DUPLICATE_DETECTION',
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  endpoint: '/api/user/contacts/detect-duplicates',
  requestCount: 5,
  windowStart: '2025-11-21T10:00:00Z',
  blocked: false
}
```

---

## Testing Strategy

### Unit Tests

```javascript
// tests/duplicateDetection.test.js
describe('DuplicateDetectionService', () => {
  test('detects exact email match', async () => {
    const result = await DuplicateDetectionService.detectDuplicates({
      email: 'john@tesla.com',
      name: 'John Smith'
    }, 'user_test');

    expect(result.duplicates.length).toBeGreaterThan(0);
    expect(result.method).toBe('exact_match');
  });

  test('applies fuzzy name matching', async () => {
    const result = await DuplicateDetectionService.findSimilarContacts({
      name: 'John J. Smith',
      company: 'Tesla Inc'
    }, 'user_test');

    expect(result.similar).toContainEqual(
      expect.objectContaining({ name: 'John Smith' })
    );
  });

  test('handles AI opt-out gracefully', async () => {
    const result = await DuplicateDetectionService.detectDuplicates(
      { name: 'Test', email: 'test@example.com' },
      'user_test',
      { features: { aiDuplicateDetection: false } }
    );

    expect(result.aiUsed).toBe(false);
    expect(result.method).not.toContain('ai');
  });

  test('detects re-entry correctly', async () => {
    // Add, archive, then re-add same contact
    const contactId = await addContact({ email: 'john@test.com' }, 'user_test');
    await archiveContact(contactId, 'user_test');

    const reentry = await DuplicateDetectionService.checkReentry(
      { email: 'john@test.com' },
      'user_test'
    );

    expect(reentry.isReentry).toBe(true);
    expect(reentry.message).toContain('Welcome back');
  });
});
```

### Integration Tests

1. **End-to-end duplicate detection flow**
2. **AI merge preview generation**
3. **Rate limiting enforcement**
4. **Redis cache fallback**
5. **Cost tracking accuracy**

### Manual Testing Checklist

- [ ] Scan duplicate business card, verify flagging
- [ ] Test merge workflow with AI suggestions
- [ ] Verify "welcome back" message for re-added contact
- [ ] Test AI opt-out fallback to cached rules
- [ ] Verify rate limiting blocks after threshold
- [ ] Check Redis cache TTL expiration
- [ ] Test across all 5 languages
- [ ] Verify cost tracking in admin dashboard

---

## Implementation Phases

### Phase 1: Core Detection (2 weeks)
- ✅ Vector similarity for duplicate detection
- ✅ Exact match fallback rules
- ✅ Basic dashboard UI
- ✅ Logging to DuplicateDetectionLogs
- ✅ Rate limiting integration

### Phase 2: AI-Assisted Merge (2 weeks)
- ✅ Gemini 3 Pro merge analysis
- ✅ Merge preview UI
- ✅ Conflict resolution workflow
- ✅ Cost tracking
- ✅ Permission checks

### Phase 3: Advanced Features (2 weeks)
- ✅ Re-entry detection
- ✅ AI opt-out architecture
- ✅ Daily rules rebuild cron
- ✅ Redis caching layer
- ✅ Premium tier enforcement

### Phase 4: Polish & Testing (1 week)
- ✅ i18n for 5 languages
- ✅ Unit + integration tests
- ✅ Performance optimization
- ✅ Admin monitoring dashboard
- ✅ Documentation

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Duplicate detection accuracy | >95% |
| False positive rate | <5% |
| AI merge confidence | >90% |
| User merge acceptance rate | >80% |
| Cache hit rate (Redis) | >70% |
| API response time (p95) | <500ms |
| Cost per detection | <$0.002 |

---

## Related Technologies

- **AI:** Gemini 3 Pro (via Firebase AI SDK)
- **Vector DB:** Pinecone (multilingual-e5-large, 1024D)
- **Cache:** Redis (24h TTL)
- **Database:** Firestore
- **Cost Tracking:** CostTrackingService
- **Rate Limiting:** RateLimitService
- **i18n:** 5 languages (EN, FR, ES, ZH, VI)

---

**Status:** Planned Feature (Not Yet Implemented)
**Priority:** High
**Estimated Effort:** 7 weeks
