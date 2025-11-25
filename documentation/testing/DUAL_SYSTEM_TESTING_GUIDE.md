# Dual-System Testing Guide: Auto-Tagging + Query Tagging

> **Version:** 1.0.0
> **Last Updated:** 2025-11-25
> **Status:** Active Testing Phase

## Overview

This testing guide validates BOTH semantic tagging systems working together:

| System | When It Runs | What It Does |
|--------|--------------|--------------|
| **Auto-Tagging** | Contact save time | Tags contacts with semantic tags from context |
| **Query Tagging** | Semantic search time | Tags queries with same vocabulary as contacts |

### Why Test Both Together?

The systems use **shared vocabulary** (`COMMON_CONTACT_TAGS`) for semantic alignment:
- Auto-tagging generates tags like `["tesla-employee", "automotive-industry"]`
- Query tagging generates matching tags for searches like "Tesla employees"
- Better tag alignment = better search results

### 3-Tier Caching (Same for Both Systems)

```
Tier 1: Static Cache (COMMON_CONTACT_TAGS) → FREE, instant
Tier 2: Redis Cache (24h TTL) → FREE, ~50ms
Tier 3: Gemini AI Generation → ~$0.0002/call, ~500ms
```

---

## How to Use This Guide

### Test Workflow
1. **Part A:** Save a test contact → Verify auto-tagging
2. **Part B:** Search for that contact → Verify query tagging + results

### Evidence to Collect
For each part, capture:
- **Server Logs:** Console output with timestamps
- **Firestore Database State:** Document snapshots
- **Pinecone Vector Document:** Vector metadata
- **SessionUsage Document:** Cost tracking records

### Pass/Fail Criteria
- **Auto-Tagging:** Contact must have expected tags in Firestore AND Pinecone
- **Query Tagging:** Search logs must show query tags + contact appears in results

---

## Test 1: Tech Company Employee (Tesla)

### Part A: Auto-Tagging (Contact Save)

**Action:** Save contact with:
```json
{
  "name": "John Tesla Test",
  "company": "Tesla",
  "jobTitle": "Software Engineer",
  "email": "john.tesla@test.com"
}
```

**Expected Tags:** `["tesla-employee", "automotive-industry", "electric-vehicles", "technology"]`

#### Server Logs:
```
[paste Auto-Tagging logs here - look for [AutoTagging] prefix]
```

#### Firestore Database State:
```json
{
  "contacts": [{
    "id": "...",
    "name": "John Tesla Test",
    "tags": ["paste actual tags here"]
  }]
}
```

#### Pinecone Vector Document:
```json
{
  "id": "contact_id",
  "metadata": {
    "tags": "paste comma-separated tags here"
  }
}
```

#### SessionUsage Document:
```json
{
  "feature": "contact_auto_tagging",
  "cost": 0.00,
  "provider": "static_cache or gemini-2.5-flash"
}
```

**Result:** [ ] PASS  [ ] FAIL

---

### Part B: Semantic Search + Query Tagging

**Action:** Search for `"Tesla employees"`

**Expected Query Tags:** `["tesla-employee", "automotive-industry"]`

#### Server Logs:
```
[paste QueryTagging + SemanticSearch logs here - look for [QueryTagging] prefix]
```

#### Firestore Database State:
```json
{
  "searchSession": {
    "query": "Tesla employees",
    "queryTags": ["paste query tags here"],
    "results": [...]
  }
}
```

#### Pinecone Vector Document:
```
Query embedding with appended: "[Query Tags]: tesla-employee, automotive-industry"
```

#### SessionUsage Document:
```json
{
  "feature": "query_tagging",
  "cost": 0.00,
  "provider": "static_cache or gemini-2.5-flash"
}
```

**Result:** [ ] PASS  [ ] FAIL

**Contact Found in Results?** [ ] YES  [ ] NO

---

## Test 2: Executive Role (CEO)

### Part A: Auto-Tagging (Contact Save)

**Action:** Save contact with:
```json
{
  "name": "Sarah CEO Test",
  "company": "Acme Corp",
  "jobTitle": "Chief Executive Officer",
  "email": "sarah.ceo@test.com"
}
```

**Expected Tags:** `["ceo", "executive", "c-level", "leadership"]`

#### Server Logs:
```
[paste Auto-Tagging logs here]
```

#### Firestore Database State:
```json
{
  "contacts": [{
    "id": "...",
    "name": "Sarah CEO Test",
    "tags": ["paste actual tags here"]
  }]
}
```

#### Pinecone Vector Document:
```json
{
  "id": "contact_id",
  "metadata": {
    "tags": "paste comma-separated tags here"
  }
}
```

#### SessionUsage Document:
```json
{
  "feature": "contact_auto_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

---

### Part B: Semantic Search + Query Tagging

**Action:** Search for `"CEOs"`

**Expected Query Tags:** `["ceo", "executive", "c-level", "leadership"]`

#### Server Logs:
```
[paste QueryTagging logs here]
```

#### Firestore Database State:
```json
{
  "searchSession": {
    "query": "CEOs",
    "queryTags": ["paste query tags here"]
  }
}
```

#### Pinecone Vector Document:
```
Query embedding with appended: "[Query Tags]: ceo, executive, c-level"
```

#### SessionUsage Document:
```json
{
  "feature": "query_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

**Contact Found in Results?** [ ] YES  [ ] NO

---

## Test 3: Tech Industry (Google Engineer)

### Part A: Auto-Tagging (Contact Save)

**Action:** Save contact with:
```json
{
  "name": "Alex Google Test",
  "company": "Google",
  "jobTitle": "Senior Software Engineer",
  "email": "alex.google@test.com"
}
```

**Expected Tags:** `["google-employee", "tech-industry", "big-tech", "silicon-valley"]`

#### Server Logs:
```
[paste Auto-Tagging logs here]
```

#### Firestore Database State:
```json
{
  "tags": ["paste actual tags here"]
}
```

#### Pinecone Vector Document:
```json
{
  "metadata": {
    "tags": "paste tags here"
  }
}
```

#### SessionUsage Document:
```json
{
  "feature": "contact_auto_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

---

### Part B: Semantic Search + Query Tagging

**Action:** Search for `"Google engineers"`

**Expected Query Tags:** `["google-employee", "tech-industry", "engineer"]`

#### Server Logs:
```
[paste QueryTagging logs here]
```

#### Firestore Database State:
```json
{
  "queryTags": ["paste query tags here"]
}
```

#### Pinecone Vector Document:
```
Query with tags appended
```

#### SessionUsage Document:
```json
{
  "feature": "query_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

**Contact Found in Results?** [ ] YES  [ ] NO

---

## Test 4: Startup Founder

### Part A: Auto-Tagging (Contact Save)

**Action:** Save contact with:
```json
{
  "name": "Mike Founder Test",
  "company": "TechStartup Inc",
  "jobTitle": "Founder & CEO",
  "email": "mike.founder@test.com"
}
```

**Expected Tags:** `["founder", "entrepreneur", "startup", "ceo", "leadership"]`

#### Server Logs:
```
[paste Auto-Tagging logs here]
```

#### Firestore Database State:
```json
{
  "tags": ["paste actual tags here"]
}
```

#### Pinecone Vector Document:
```json
{
  "metadata": {
    "tags": "paste tags here"
  }
}
```

#### SessionUsage Document:
```json
{
  "feature": "contact_auto_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

---

### Part B: Semantic Search + Query Tagging

**Action:** Search for `"founders"`

**Expected Query Tags:** `["founder", "entrepreneur", "startup", "leadership"]`

#### Server Logs:
```
[paste QueryTagging logs here]
```

#### Firestore Database State:
```json
{
  "queryTags": ["paste query tags here"]
}
```

#### Pinecone Vector Document:
```
Query with tags appended
```

#### SessionUsage Document:
```json
{
  "feature": "query_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

**Contact Found in Results?** [ ] YES  [ ] NO

---

## Test 5: Marketing Professional

### Part A: Auto-Tagging (Contact Save)

**Action:** Save contact with:
```json
{
  "name": "Emma Marketing Test",
  "company": "MarketPro Agency",
  "jobTitle": "Marketing Director",
  "email": "emma.marketing@test.com"
}
```

**Expected Tags:** `["marketing", "digital-marketing", "growth-marketing", "director"]`

#### Server Logs:
```
[paste Auto-Tagging logs here]
```

#### Firestore Database State:
```json
{
  "tags": ["paste actual tags here"]
}
```

#### Pinecone Vector Document:
```json
{
  "metadata": {
    "tags": "paste tags here"
  }
}
```

#### SessionUsage Document:
```json
{
  "feature": "contact_auto_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

---

### Part B: Semantic Search + Query Tagging

**Action:** Search for `"marketing people"`

**Expected Query Tags:** `["marketing", "digital-marketing", "growth-marketing"]`

#### Server Logs:
```
[paste QueryTagging logs here]
```

#### Firestore Database State:
```json
{
  "queryTags": ["paste query tags here"]
}
```

#### Pinecone Vector Document:
```
Query with tags appended
```

#### SessionUsage Document:
```json
{
  "feature": "query_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

**Contact Found in Results?** [ ] YES  [ ] NO

---

## Test 6: AI/ML Role

### Part A: Auto-Tagging (Contact Save)

**Action:** Save contact with:
```json
{
  "name": "David AI Test",
  "company": "DeepMind",
  "jobTitle": "Machine Learning Engineer",
  "email": "david.ai@test.com"
}
```

**Expected Tags:** `["ai", "machine-learning", "engineer", "tech-industry", "research"]`

#### Server Logs:
```
[paste Auto-Tagging logs here]
```

#### Firestore Database State:
```json
{
  "tags": ["paste actual tags here"]
}
```

#### Pinecone Vector Document:
```json
{
  "metadata": {
    "tags": "paste tags here"
  }
}
```

#### SessionUsage Document:
```json
{
  "feature": "contact_auto_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

---

### Part B: Semantic Search + Query Tagging

**Action:** Search for `"AI engineers"`

**Expected Query Tags:** `["ai", "engineer", "machine-learning", "tech"]`

#### Server Logs:
```
[paste QueryTagging logs here]
```

#### Firestore Database State:
```json
{
  "queryTags": ["paste query tags here"]
}
```

#### Pinecone Vector Document:
```
Query with tags appended
```

#### SessionUsage Document:
```json
{
  "feature": "query_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

**Contact Found in Results?** [ ] YES  [ ] NO

---

## Test 7: Finance Professional

### Part A: Auto-Tagging (Contact Save)

**Action:** Save contact with:
```json
{
  "name": "James Finance Test",
  "company": "Goldman Sachs",
  "jobTitle": "Investment Banker",
  "email": "james.finance@test.com"
}
```

**Expected Tags:** `["finance", "investment", "banking", "wall-street"]`

#### Server Logs:
```
[paste Auto-Tagging logs here]
```

#### Firestore Database State:
```json
{
  "tags": ["paste actual tags here"]
}
```

#### Pinecone Vector Document:
```json
{
  "metadata": {
    "tags": "paste tags here"
  }
}
```

#### SessionUsage Document:
```json
{
  "feature": "contact_auto_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

---

### Part B: Semantic Search + Query Tagging

**Action:** Search for `"finance professionals"`

**Expected Query Tags:** `["finance", "investment", "banking"]`

#### Server Logs:
```
[paste QueryTagging logs here]
```

#### Firestore Database State:
```json
{
  "queryTags": ["paste query tags here"]
}
```

#### Pinecone Vector Document:
```
Query with tags appended
```

#### SessionUsage Document:
```json
{
  "feature": "query_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

**Contact Found in Results?** [ ] YES  [ ] NO

---

## Test 8: Healthcare Professional

### Part A: Auto-Tagging (Contact Save)

**Action:** Save contact with:
```json
{
  "name": "Lisa Healthcare Test",
  "company": "City Hospital",
  "jobTitle": "Chief Medical Officer",
  "email": "lisa.healthcare@test.com"
}
```

**Expected Tags:** `["healthcare", "medical", "doctor", "executive", "hospital"]`

#### Server Logs:
```
[paste Auto-Tagging logs here]
```

#### Firestore Database State:
```json
{
  "tags": ["paste actual tags here"]
}
```

#### Pinecone Vector Document:
```json
{
  "metadata": {
    "tags": "paste tags here"
  }
}
```

#### SessionUsage Document:
```json
{
  "feature": "contact_auto_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

---

### Part B: Semantic Search + Query Tagging

**Action:** Search for `"healthcare workers"`

**Expected Query Tags:** `["healthcare", "medical", "hospital"]`

#### Server Logs:
```
[paste QueryTagging logs here]
```

#### Firestore Database State:
```json
{
  "queryTags": ["paste query tags here"]
}
```

#### Pinecone Vector Document:
```
Query with tags appended
```

#### SessionUsage Document:
```json
{
  "feature": "query_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

**Contact Found in Results?** [ ] YES  [ ] NO

---

## Test 9: Sales Role

### Part A: Auto-Tagging (Contact Save)

**Action:** Save contact with:
```json
{
  "name": "Chris Sales Test",
  "company": "SalesForce",
  "jobTitle": "Sales Manager",
  "email": "chris.sales@test.com"
}
```

**Expected Tags:** `["sales", "business-development", "manager", "crm"]`

#### Server Logs:
```
[paste Auto-Tagging logs here]
```

#### Firestore Database State:
```json
{
  "tags": ["paste actual tags here"]
}
```

#### Pinecone Vector Document:
```json
{
  "metadata": {
    "tags": "paste tags here"
  }
}
```

#### SessionUsage Document:
```json
{
  "feature": "contact_auto_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

---

### Part B: Semantic Search + Query Tagging

**Action:** Search for `"sales people"`

**Expected Query Tags:** `["sales", "business-development"]`

#### Server Logs:
```
[paste QueryTagging logs here]
```

#### Firestore Database State:
```json
{
  "queryTags": ["paste query tags here"]
}
```

#### Pinecone Vector Document:
```
Query with tags appended
```

#### SessionUsage Document:
```json
{
  "feature": "query_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

**Contact Found in Results?** [ ] YES  [ ] NO

---

## Test 10: Designer Role

### Part A: Auto-Tagging (Contact Save)

**Action:** Save contact with:
```json
{
  "name": "Rachel Design Test",
  "company": "Creative Agency",
  "jobTitle": "UX Designer",
  "email": "rachel.design@test.com"
}
```

**Expected Tags:** `["designer", "ux", "creative", "product-design"]`

#### Server Logs:
```
[paste Auto-Tagging logs here]
```

#### Firestore Database State:
```json
{
  "tags": ["paste actual tags here"]
}
```

#### Pinecone Vector Document:
```json
{
  "metadata": {
    "tags": "paste tags here"
  }
}
```

#### SessionUsage Document:
```json
{
  "feature": "contact_auto_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

---

### Part B: Semantic Search + Query Tagging

**Action:** Search for `"designers"`

**Expected Query Tags:** `["designer", "ux", "creative"]`

#### Server Logs:
```
[paste QueryTagging logs here]
```

#### Firestore Database State:
```json
{
  "queryTags": ["paste query tags here"]
}
```

#### Pinecone Vector Document:
```
Query with tags appended
```

#### SessionUsage Document:
```json
{
  "feature": "query_tagging",
  "cost": 0.00
}
```

**Result:** [ ] PASS  [ ] FAIL

**Contact Found in Results?** [ ] YES  [ ] NO

---

## Evidence Collection Guide

### Auto-Tagging Evidence Sources

| Evidence Type | Where to Find | What to Look For |
|---------------|---------------|------------------|
| **Server Logs** | Browser DevTools > Console | `[AutoTagging]` prefix, `[ContactCRUD]` |
| **Firestore** | Firebase Console > Firestore > Contacts/{userId} | `contacts[].tags` array |
| **Pinecone** | Pinecone Console > weavink index > user_{userId} | `metadata.tags` field |
| **SessionUsage** | Firestore > SessionUsage/{sessionId} | `feature: "contact_auto_tagging"` |

### Query Tagging Evidence Sources

| Evidence Type | Where to Find | What to Look For |
|---------------|---------------|------------------|
| **Server Logs** | Browser DevTools > Console | `[QueryTagging]` prefix, `[SemanticSearchService]` |
| **Firestore** | Search response metadata | `queryTags`, `queryTaggingMetadata` |
| **Pinecone** | N/A (query embedding is temporary) | Check logs for appended tags |
| **SessionUsage** | Firestore > SessionUsage/{sessionId} | `feature: "query_tagging"` |

### Cache Hit Indicators

| Cache Level | Log Message | Cost |
|-------------|-------------|------|
| Static Cache | `⚡ Static cache HIT` | $0.00 |
| Redis Cache | `⚡ Redis cache HIT` | $0.00 |
| AI Generation | `Calling Gemini AI` | ~$0.0002 |

---

## Test Summary

| Test # | Test Name | Part A (Auto-Tag) | Part B (Query-Tag) | Contact Found |
|--------|-----------|-------------------|--------------------| --------------|
| 1 | Tesla Employee | [ ] | [ ] | [ ] |
| 2 | CEO | [ ] | [ ] | [ ] |
| 3 | Google Engineer | [ ] | [ ] | [ ] |
| 4 | Startup Founder | [ ] | [ ] | [ ] |
| 5 | Marketing | [ ] | [ ] | [ ] |
| 6 | AI/ML Role | [ ] | [ ] | [ ] |
| 7 | Finance | [ ] | [ ] | [ ] |
| 8 | Healthcare | [ ] | [ ] | [ ] |
| 9 | Sales | [ ] | [ ] | [ ] |
| 10 | Designer | [ ] | [ ] | [ ] |

**Total Passed:** ___/20 parts
**Contact Match Rate:** ___/10

---

## Related Documentation

- [Auto-Tagging Architecture](../infrastructure/PHASE5_AUTO_TAGGING_MIGRATION.md)
- [Query Tagging Architecture](../infrastructure/QUERY_TAGGING_ARCHITECTURE.md)
- [Semantic Search Architecture V2](../infrastructure/SEMANTIC_SEARCH_ARCHITECTURE_V2.md)
- [Phase 5 Manual Testing Guide](./PHASE5_MANUAL_TESTING_GUIDE.md)

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-25 | 1.0.0 | Initial release with 10 general tests |
