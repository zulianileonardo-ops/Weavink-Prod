---
id: technical-query-tagging-035
title: Query Tagging Architecture - Semantic Search Enhancement
category: technical
tags: [query-tagging, semantic-search, vector-embedding, ai-features, gemini, caching, search-optimization]
status: active
created: 2025-11-25
updated: 2025-11-25
related:
  - SEMANTIC_SEARCH_ARCHITECTURE_V2.md
  - PHASE5_AUTO_TAGGING_MIGRATION.md
  - LOCATION_SERVICES_AUTO_TAGGING_SPEC.md
---

# Query Tagging Architecture - Semantic Search Enhancement

## Overview

Query Tagging is an enhancement to the semantic search pipeline that generates semantic tags for search queries using the **same vocabulary** as contact auto-tagging. This creates better alignment between query embeddings and contact document embeddings, improving search accuracy.

**Status:** Active
**Version:** 1.0
**Default:** ON (all searches use query tagging automatically)

---

## Problem Statement

### The Semantic Gap

In the current V2 architecture, contacts and queries exist in different semantic spaces:

| Component | Has Tags | Example |
|-----------|----------|---------|
| Contact Document | ✅ Yes | `[Semantic Tags]: tesla-employee, automotive-industry, senior-engineer` |
| Query | ❌ No | `"Who works at Tesla?"` (raw text) |

The embedding model must **infer** that "Who works at Tesla?" relates to "tesla-employee". While embeddings are good at this, explicit tag alignment improves accuracy.

### Example: Before Query Tagging

```
Contact embedding: "John Doe, Tesla, Senior Engineer, [tesla-employee, automotive]"
                   → Vector [0.23, -0.45, 0.78, ...]

Query embedding:   "Who works at Tesla?"
                   → Vector [0.18, -0.42, 0.65, ...]

Cosine Similarity: ~0.87 (good, but could be better)
```

### Example: With Query Tagging

```
Contact embedding: "John Doe, Tesla, Senior Engineer, [tesla-employee, automotive]"
                   → Vector [0.23, -0.45, 0.78, ...]

Query embedding:   "Who works at Tesla? [Query Tags]: tesla-employee, automotive"
                   → Vector [0.25, -0.46, 0.79, ...]

Cosine Similarity: ~0.94 (better alignment!)
```

---

## Architecture

### Hybrid Approach (Option C)

The system implements two complementary improvements:

1. **Option A: Query Tagging** - Tag queries before embedding
2. **Option B: Rerank Tags** - Include contact tags in Cohere rerank documents

```
┌─────────────────────────────────────────────────────────────────────┐
│ ENHANCED SEMANTIC SEARCH PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Query: "Who works at Tesla?"                                       │
│           ↓                                                         │
│  ┌─────────────────────────────────────────────────────┐           │
│  │ QueryTaggingService (NEW - Option A)                 │           │
│  │ 3-Tier Cache: Static → Redis → Gemini AI             │           │
│  │ Output: tags = ["tesla-employee", "automotive"]      │           │
│  └─────────────────────────────────────────────────────┘           │
│           ↓                                                         │
│  Enhanced Query: "Who works at Tesla? [Query Tags]: tesla-employee" │
│           ↓                                                         │
│  ┌─────────────────────────────────────────────────────┐           │
│  │ EmbeddingService (Pinecone multilingual-e5-large)    │           │
│  │ Better alignment with contact embeddings             │           │
│  └─────────────────────────────────────────────────────┘           │
│           ↓                                                         │
│  Vector Search in Pinecone                                          │
│           ↓                                                         │
│  ┌─────────────────────────────────────────────────────┐           │
│  │ RerankService (Cohere rerank-v3.5)                   │           │
│  │ YAML docs now include tags field (Option B)          │           │
│  └─────────────────────────────────────────────────────┘           │
│           ↓                                                         │
│  AI Enhancement + Results                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## QueryTaggingService

### File Location
`lib/services/serviceContact/server/QueryTaggingService.js`

### 3-Tier Caching Architecture

Uses the **same caching pattern** as AutoTaggingService for consistency:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Tier 1: COMMON_CONTACT_TAGS (Static Cache)                         │
│ - ~50+ pre-defined patterns for common queries                     │
│ - Instant response, $0 cost                                        │
│ - Cache hit rate: ~30%                                             │
│ Example: "CEO" → tags: ['ceo', 'executive', 'c-level', 'leadership']│
├─────────────────────────────────────────────────────────────────────┤
│ Tier 2: Redis Cache (24h TTL)                                      │
│ - Key prefix: "query_tags:"                                        │
│ - ~5ms response time, $0 cost                                      │
│ - Cache hit rate: ~50%                                             │
│ Example: "Who works at Tesla?" → cached tags from previous search  │
├─────────────────────────────────────────────────────────────────────┤
│ Tier 3: Gemini 2.5 Flash (AI Generation)                           │
│ - Real-time tag generation for cache misses                        │
│ - ~100ms response time                                             │
│ - Cost: ~$0.000008 per query                                       │
│ - Cache hit rate: 0% (only called on miss)                         │
└─────────────────────────────────────────────────────────────────────┘

Overall Cache Hit Rate: ~80% (Tier 1 + Tier 2)
Effective Cost: ~$0.0000016/query (accounting for cache hits)
```

### Key Methods

| Method | Purpose |
|--------|---------|
| `tagQuery(query, options)` | Main entry point - returns tags for query |
| `_checkStaticCache(query)` | Check COMMON_CONTACT_TAGS |
| `_checkRedisCache(query)` | Check Redis cache |
| `_generateTagsWithAI(query)` | Call Gemini for AI-generated tags |
| `_buildQueryTaggingPrompt(query)` | Build query-specific prompt |
| `_cacheInRedis(query, result)` | Store result in Redis |
| `getQueryCacheKey(query)` | Generate cache key |

### tagQuery() Options

```javascript
const result = await QueryTaggingService.tagQuery(query, {
  sessionId: 'session_search_xxx',   // Session ID for tracking
  userId: 'user_123',                 // User ID for cost tracking
  trackSteps: true,                   // Enable session step tracking
  budgetCheck: {                      // Budget context (propagated from route)
    canAfford: true,
    reason: 'within_limits',
    remainingBudget: 2.956,
    remainingRuns: 28
  }
});
```

| Option | Type | Description |
|--------|------|-------------|
| `sessionId` | string | Session ID for multi-step operation tracking |
| `userId` | string | User ID for cost recording |
| `trackSteps` | boolean | Enable granular step tracking in SessionUsage |
| `budgetCheck` | object | Budget context from initial affordability check |

### budgetCheck Propagation

The `budgetCheck` parameter is passed from the semantic search route through to QueryTaggingService. It's recorded in each step's metadata for full budget visibility:

```javascript
// In QueryTaggingService, when recording usage:
await CostTrackingService.recordUsage({
  userId,
  usageType: 'AIUsage',
  feature: 'query_tagging',
  cost: actualCost,
  isBillableRun: true,
  provider: 'gemini-firebase',
  budgetCheck,  // ← Stored in step metadata
  metadata: { ... },
  sessionId,
  stepLabel: 'Query Tagging (AI Generation)'
});
```

This results in SessionUsage steps that include budget context:

```json
{
  "stepLabel": "Query Tagging (Static Cache)",
  "feature": "query_tagging",
  "cost": 0,
  "metadata": {
    "budgetCheck": {
      "canAfford": true,
      "reason": "within_limits",
      "remainingBudget": 2.95660556,
      "remainingRuns": 28
    },
    "cacheType": "static",
    "tagsParsed": ["tesla-employee", "automotive-industry"]
  }
}
```

### Query Tagging Prompt

The prompt is designed to generate tags in the **same vocabulary** as contact tags:

```
You are a query categorization AI for a contact search system.

Your task: Generate semantic tags that would match contacts relevant to this query.
These tags should use the SAME vocabulary as contact auto-tagging.

QUERY: "{query}"

INSTRUCTIONS:
1. Identify what the user is searching for (company, role, industry, etc.)
2. Generate 2-5 tags that contacts matching this query would have
3. Use lowercase, hyphenated format (e.g., "tesla-employee", "tech-industry")
4. Focus on MATCHING contact tags, not expanding the query

EXAMPLES:
Query: "Who works at Tesla?" → ["tesla-employee", "automotive-industry"]
Query: "Find me CEOs" → ["ceo", "executive", "c-level", "leadership"]
Query: "AI engineers in startups" → ["ai", "engineer", "startup", "machine-learning"]

RESPOND ONLY WITH JSON: {"tags": [...]}
```

---

## Option B: Rerank Tag Integration

### File to Modify
`lib/services/serviceContact/server/rerankService.js`

### Change
Add tags field to YAML documents sent to Cohere rerank:

**Before:**
```yaml
name: "John Doe"
job_title: "Senior Engineer"
company: "Tesla"
notes: "Met at AI conference..."
```

**After:**
```yaml
name: "John Doe"
job_title: "Senior Engineer"
company: "Tesla"
tags: "tesla-employee, senior-engineer, automotive-industry"
notes: "Met at AI conference..."
```

### Impact
- Cohere rerank sees contact tags in documents
- Better semantic understanding during reranking
- Zero latency impact (tags already exist in contact)

---

## Integration with Semantic Search

### semanticSearchService.js Changes

```javascript
// In search() method, after options parsing:

// NEW: Query Tagging Step (DEFAULT ON)
let queryToEmbed = query;
let queryTaggingMetadata = null;

// Default ON - use query tagging unless explicitly disabled
const useQueryTags = options.disableQueryTags !== true;

if (useQueryTags) {
  const tagResult = await QueryTaggingService.tagQuery(query, {
    sessionId,
    userId,
    trackSteps
  });

  if (tagResult.tags && tagResult.tags.length > 0) {
    queryToEmbed = `${query} [Query Tags]: ${tagResult.tags.join(', ')}`;
    queryTaggingMetadata = tagResult.metadata;
  }
}

// Continue with embedding enhanced query
const queryEmbedding = await EmbeddingService.generateEmbedding(queryToEmbed, {...});
```

### API Options

| Option | Default | Description |
|--------|---------|-------------|
| `disableQueryTags` | `false` | Set to `true` to skip query tagging |

---

## Performance Analysis

### Latency Impact

| Scenario | Without Query Tags | With Query Tags | Delta |
|----------|-------------------|-----------------|-------|
| Static cache hit (30%) | 0ms | +2ms | +2ms |
| Redis cache hit (50%) | 0ms | +5ms | +5ms |
| AI generation (20%) | 0ms | +100ms | +100ms |
| **Weighted Average** | 0ms | **+12ms** | +12ms |

### Cost Impact

| Scenario | Monthly Searches | Query Tagging Cost |
|----------|------------------|-------------------|
| Static hits (30%) | 30 | $0 |
| Redis hits (50%) | 50 | $0 |
| AI calls (20%) | 20 | $0.00016 |
| **Total (100 searches)** | 100 | **$0.00016/month** |

### Accuracy Improvement

| Metric | Without Query Tags | With Query Tags |
|--------|-------------------|-----------------|
| Vector similarity | 0.75-0.85 | 0.82-0.92 |
| Top-10 relevance | Good | Better |
| Tag-based matches | Indirect | Direct |

---

## Cost Configuration

### Constants (aiCosts.js)

```javascript
export const QUERY_TAGGING_AI_CONFIG = {
  MODEL_NAME: 'gemini-2.5-flash-preview-05-20',
  FEATURE_NAME: 'query_tagging',
  PROVIDER_NAME: 'gemini-firebase',
  STEP_LABEL: 'Step 0: Query Tagging',
  CACHE_TTL: 86400, // 24 hours
  PRICING: {
    INPUT_PER_MILLION: 0.30,
    OUTPUT_PER_MILLION: 2.50
  }
};
```

---

## Search Response Metadata

Enhanced search responses include query tagging information:

```javascript
{
  results: [...],
  searchMetadata: {
    query: "Who works at Tesla?",
    queryTags: ["tesla-employee", "automotive-industry"],  // NEW
    queryTaggingMetadata: {                                // NEW
      cached: true,
      cacheType: "static",
      duration: 2
    },
    enhancedQuery: "Who works at Tesla? [Query Tags]: tesla-employee, automotive-industry",
    // ... other metadata
  }
}
```

---

## Testing Strategy

### Manual Tests

1. **Company Query:** Search "Tesla" → expect tags `["tesla-employee", "automotive"]`
2. **Role Query:** Search "CEO" → expect tags `["ceo", "executive", "c-level"]`
3. **Combined Query:** Search "AI engineers in startups" → expect tags `["ai", "engineer", "startup"]`

### Verification

1. Compare vector similarity scores with/without query tags
2. Compare rerank scores with/without contact tags in YAML
3. Measure actual latency impact
4. Verify cache hit rates match expectations

---

## File Reference

### New Files
| File | Purpose |
|------|---------|
| `lib/services/serviceContact/server/QueryTaggingService.js` | Query tagging service |

### Modified Files
| File | Changes |
|------|---------|
| `lib/services/serviceContact/server/rerankService.js` | Add tags to YAML |
| `lib/services/serviceContact/server/semanticSearchService.js` | Integrate query tagging |
| `lib/services/constants/aiCosts.js` | Add QUERY_TAGGING_AI_CONFIG |

### Related Documentation
| File | Relationship |
|------|--------------|
| `SEMANTIC_SEARCH_ARCHITECTURE_V2.md` | Parent architecture |
| `PHASE5_AUTO_TAGGING_MIGRATION.md` | Contact auto-tagging (complementary) |
| `LOCATION_SERVICES_AUTO_TAGGING_SPEC.md` | Location + tagging spec |

---

## Future Enhancements

1. **Query Tag Analytics** - Track most common query tags, cache hit rates
2. **Tag Feedback Loop** - Learn from search results to improve query tagging
3. **Multi-language Query Tags** - Support tags in user's locale
4. **Query Tag Suggestions** - Show tags to user, allow modification

---

**Document Owner:** Leo
**Last Updated:** 2025-11-25
**Status:** Active
**Version:** 1.0
