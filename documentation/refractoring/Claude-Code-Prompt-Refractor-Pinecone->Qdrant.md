# Claude Code Migration Task: Pinecone → Qdrant Self-Hosted

## 🎯 Mission

You are tasked with **completely migrating** Weavink's codebase from **Pinecone** (cloud vector database) to **Qdrant** (self-hosted vector database). This is a critical infrastructure migration that requires **100% accuracy** - every single Pinecone reference must be identified and converted.

**Token Budget: Use up to 200K tokens if needed. Accuracy is more important than efficiency. Every Pinecone reference MUST be found and converted.**

---

## 📚 STEP 1: Read All Documentation First (MANDATORY)

**Before writing ANY code, you MUST read these files completely:**

```bash
# Read all documentation files in order - READ EVERYTHING
cat documentation/refractoring/qdrant-self-hosted-guide.md
cat documentation/refractoring/weavink-infrastructure-benchmarks.md
cat documentation/refractoring/benchmark.mjs
cat documentation/refractoring/benchmark-50users.mjs
cat documentation/refractoring/redis-self-hosted-guide.md
cat documentation/refractoring/neo4j-migration-guide.md
```

These documents contain:
- Qdrant API reference and connection details
- Performance benchmarks proving Qdrant is 18-25x faster than Pinecone
- Migration patterns and code examples
- Container configuration and network setup
- Real test scripts showing both Pinecone and Qdrant API usage

---

## 🌐 STEP 2: Search Official Qdrant Documentation Online (MANDATORY)

**Use web search to get the latest Qdrant JavaScript client documentation:**

Search for and read:
1. `Qdrant JavaScript TypeScript client official documentation site:qdrant.tech`
2. `@qdrant/js-client-rest npm package API reference`
3. `Qdrant REST API reference filtering payloads`
4. `Qdrant upsert points with payload TypeScript examples`
5. `Qdrant search with filters JavaScript examples`
6. `Qdrant collection management create delete API`
7. `Qdrant scroll points pagination JavaScript`

**Key URLs to fetch and read:**
- https://qdrant.tech/documentation/
- https://qdrant.tech/documentation/quickstart/
- https://github.com/qdrant/qdrant-js
- https://www.npmjs.com/package/@qdrant/js-client-rest
- https://qdrant.tech/documentation/concepts/filtering/
- https://qdrant.tech/documentation/concepts/points/

**Read the official docs thoroughly to understand:**
- Exact method signatures
- Filter syntax
- Error handling patterns
- TypeScript types available

---

## 🔬 STEP 3: Complete Codebase Scan for Pinecone (EXHAUSTIVE - DO NOT SKIP ANY)

**This is the most critical step. You must find EVERY Pinecone reference. Be paranoid. Check everything.**

### 3.1 Primary Search - All Pinecone References

```bash
# Search for "pinecone" (case-insensitive) in ALL files
grep -rni "pinecone" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.mjs" --include="*.cjs" --include="*.json" --include="*.env*" --include="*.yaml" --include="*.yml" --include="*.md" --include="*.mdx" --include="*.config.*" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v ".next"

# Search with ripgrep if available (faster)
rg -i "pinecone" --type ts --type js --type json -g "!node_modules" -g "!.git" -g "!.next" 2>/dev/null || echo "ripgrep not installed, using grep"
```

### 3.2 Package and Import Searches

```bash
# Search for Pinecone package imports
grep -rn "@pinecone-database" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules

# Search for Pinecone client initialization patterns
grep -rn "new Pinecone" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules
grep -rn "Pinecone(" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules

# Search for index usage (Pinecone pattern)
grep -rn "\.index(" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules

# Search for namespace usage (Pinecone-specific)
grep -rn "\.namespace(" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules
```

### 3.3 Pinecone API Method Searches

```bash
# Search for Pinecone query patterns
grep -rn "topK" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules
grep -rn "includeMetadata" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules
grep -rn "includeValues" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules

# Search for upsert patterns
grep -rn "\.upsert(" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules

# Search for query patterns
grep -rn "\.query(" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules

# Search for delete patterns
grep -rn "\.deleteOne(" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules
grep -rn "\.deleteMany(" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules
grep -rn "deleteAll" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules

# Search for fetch patterns
grep -rn "\.fetch(" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules

# Search for list patterns  
grep -rn "\.list(" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules

# Search for describeIndexStats
grep -rn "describeIndexStats" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules
```

### 3.4 Environment Variables Search

```bash
# Find all env files and search
find . -name ".env*" -o -name "*.env" 2>/dev/null | grep -v node_modules | xargs grep -i "pinecone" 2>/dev/null

# List all env files for manual inspection
find . \( -name ".env" -o -name ".env.*" -o -name "*.env" -o -name ".env.local" -o -name ".env.development" -o -name ".env.production" -o -name ".env.example" \) 2>/dev/null | grep -v node_modules

# Check each one
cat .env 2>/dev/null | grep -i pinecone
cat .env.local 2>/dev/null | grep -i pinecone
cat .env.example 2>/dev/null | grep -i pinecone
cat .env.development 2>/dev/null | grep -i pinecone
cat .env.production 2>/dev/null | grep -i pinecone
cat .env.development.local 2>/dev/null | grep -i pinecone
```

### 3.5 Package.json Deep Search

```bash
# Find all package.json files
find . -name "package.json" -not -path "*/node_modules/*" | xargs grep -l "pinecone" 2>/dev/null

# Show actual entries with context
find . -name "package.json" -not -path "*/node_modules/*" -exec grep -A2 -B2 "pinecone" {} \; 2>/dev/null

# Check package-lock.json too
grep "pinecone" package-lock.json 2>/dev/null | head -20
```

### 3.6 Configuration Files Search

```bash
# Search all config files
find . -name "*.config.*" -not -path "*/node_modules/*" -exec grep -l -i "pinecone" {} \; 2>/dev/null

# Common config locations
grep -rni "pinecone" --include="next.config.*" --include="tsconfig.*" --include="vercel.json" --include="docker-compose.*" . 2>/dev/null | grep -v node_modules
```

### 3.7 Directory-Specific Searches

```bash
# Search in specific directories (adapt paths to your project structure)
# Lib/utils
find . -path "*/lib/*" -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l -i "pinecone" {} \; 2>/dev/null

# Services
find . -path "*/services/*" -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l -i "pinecone" {} \; 2>/dev/null

# Utils
find . -path "*/utils/*" -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l -i "pinecone" {} \; 2>/dev/null

# Hooks
find . -path "*/hooks/*" -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l -i "pinecone" {} \; 2>/dev/null

# API routes (Next.js)
find . -path "*/api/*" -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l -i "pinecone" {} \; 2>/dev/null
find . -path "*/app/api/*" -type f -exec grep -l -i "pinecone" {} \; 2>/dev/null
find . -path "*/pages/api/*" -type f -exec grep -l -i "pinecone" {} \; 2>/dev/null

# Components (might have direct API calls)
find . -path "*/components/*" -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l -i "pinecone" {} \; 2>/dev/null

# Actions (Next.js server actions)
find . -path "*/actions/*" -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l -i "pinecone" {} \; 2>/dev/null
```

### 3.8 Vector/Embedding Related Files (Even Without "Pinecone" in name)

```bash
# Find files that likely contain vector DB logic
find . -type f \( -name "*vector*" -o -name "*embed*" -o -name "*semantic*" -o -name "*search*" -o -name "*similarity*" -o -name "*contact*" \) \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" \) -not -path "*/node_modules/*" 2>/dev/null

# Read each found file content and look for Pinecone patterns
# (Claude Code should read each file found above)
```

### 3.9 TypeScript Types Search

```bash
# Search for Pinecone types
grep -rn "Pinecone" --include="*.d.ts" --include="*types.ts" --include="*types*.ts" --include="*interface*.ts" . | grep -v node_modules

# Search for metadata types that might be Pinecone-specific
grep -rn "RecordMetadata" --include="*.ts" . | grep -v node_modules
grep -rn "ScoredPineconeRecord" --include="*.ts" . | grep -v node_modules
grep -rn "PineconeRecord" --include="*.ts" . | grep -v node_modules
grep -rn "QueryResponse" --include="*.ts" . | grep -v node_modules
```

### 3.10 Comments and Documentation Search

```bash
# Search for mentions in comments
grep -rn "// pinecone\|// Pinecone\|/\* pinecone\|/\* Pinecone\|TODO.*pinecone\|FIXME.*pinecone" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules
```

---

## 📋 STEP 4: Create Migration Inventory Document

After completing ALL searches above, create a detailed inventory:

```markdown
## Pinecone References Found - Complete Inventory

### Files to Modify (with line numbers):
1. [ ] `path/to/file1.ts`
   - Line X: `import { Pinecone } from '@pinecone-database/pinecone'`
   - Line Y: `const pinecone = new Pinecone(...)`
   - Line Z: `await index.namespace(userId).upsert(...)`
2. [ ] `path/to/file2.ts`
   - Line A: ...
...

### Dependencies to Update:
- [ ] package.json: Remove `@pinecone-database/pinecone`
- [ ] package.json: Add `@qdrant/js-client-rest`

### Environment Variables:
Remove:
- [ ] PINECONE_API_KEY
- [ ] PINECONE_INDEX  
- [ ] PINECONE_HOST
- [ ] PINECONE_ENVIRONMENT (if exists)

Add:
- [ ] QDRANT_URL=http://qdrant-qkkkc8kskocgwo0o8c444cgo:6333

### Type Definitions to Update:
- [ ] ...

### Tests to Update:
- [ ] ...
```

---

## 🔄 STEP 5: Migration Mapping Reference

### Connection Configuration

**Before (Pinecone):**
```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ 
  apiKey: process.env.PINECONE_API_KEY! 
});
const index = pinecone.index(process.env.PINECONE_INDEX!);
```

**After (Qdrant):**
```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({ 
  url: process.env.QDRANT_URL // http://qdrant-qkkkc8kskocgwo0o8c444cgo:6333
});
```

### Upsert Operations

**Before (Pinecone):**
```typescript
await index.namespace(userId).upsert([{
  id: contactId,      // String ID allowed
  values: embedding,
  metadata: { name, email, company, userId }
}]);
```

**After (Qdrant):**
```typescript
// Ensure collection exists first
await ensureCollection(userId);

await qdrant.upsert(userId, {  // userId = collection name
  wait: true,
  points: [{
    id: crypto.randomUUID(),  // MUST be UUID or integer, NOT string
    vector: embedding,
    payload: { 
      originalId: contactId,  // Store original string ID here
      name, 
      email, 
      company, 
      userId 
    }
  }]
});
```

### Search/Query Operations

**Before (Pinecone):**
```typescript
const results = await index.namespace(userId).query({
  vector: queryEmbedding,
  topK: 10,
  includeMetadata: true,
  filter: { status: { $eq: 'active' } }
});

// Access results
results.matches.forEach(match => {
  console.log(match.id, match.score, match.metadata);
});
```

**After (Qdrant):**
```typescript
const results = await qdrant.search(userId, {
  vector: queryEmbedding,
  limit: 10,                    // topK → limit
  with_payload: true,           // includeMetadata → with_payload
  filter: {
    must: [
      { key: 'status', match: { value: 'active' } }
    ]
  }
});

// Access results - different structure!
results.forEach(point => {
  console.log(point.id, point.score, point.payload);  // metadata → payload
});
```

### Delete Operations

**Before (Pinecone):**
```typescript
await index.namespace(userId).deleteOne(contactId);
await index.namespace(userId).deleteMany([id1, id2, id3]);
```

**After (Qdrant):**
```typescript
// Delete by filter using originalId stored in payload
await qdrant.delete(userId, {
  filter: {
    must: [
      { key: 'originalId', match: { value: contactId } }
    ]
  }
});

// Or if you have point UUIDs
await qdrant.delete(userId, {
  points: [uuid1, uuid2, uuid3]
});
```

### Collection Management

**Before (Pinecone):**
```typescript
// Namespaces created automatically
const stats = await index.describeIndexStats();
```

**After (Qdrant):**
```typescript
// Collections must be created explicitly!
async function ensureCollection(name: string) {
  try {
    await qdrant.getCollection(name);
  } catch {
    await qdrant.createCollection(name, {
      vectors: { size: 1024, distance: 'Cosine' }
    });
  }
}

// Get info
const info = await qdrant.getCollection(name);
console.log(info.points_count);
```

### Filter Syntax Translation

| Pinecone | Qdrant |
|----------|--------|
| `{ field: { $eq: value } }` | `{ must: [{ key: 'field', match: { value } }] }` |
| `{ field: { $ne: value } }` | `{ must_not: [{ key: 'field', match: { value } }] }` |
| `{ field: { $in: [a, b] } }` | `{ should: [{ key: 'field', match: { value: a } }, ...], min_should: 1 }` |
| `{ field: { $gt: value } }` | `{ must: [{ key: 'field', range: { gt: value } }] }` |
| `{ field: { $gte: value } }` | `{ must: [{ key: 'field', range: { gte: value } }] }` |
| `{ field: { $lt: value } }` | `{ must: [{ key: 'field', range: { lt: value } }] }` |
| `{ $and: [c1, c2] }` | `{ must: [c1, c2] }` |
| `{ $or: [c1, c2] }` | `{ should: [c1, c2], min_should: 1 }` |

---

## ⚙️ STEP 6: Qdrant Connection Details

From the documentation, use these connection settings:

```typescript
// Environment variable
QDRANT_URL=http://qdrant-qkkkc8kskocgwo0o8c444cgo:6333

// Connection details
Container Name: qdrant-qkkkc8kskocgwo0o8c444cgo
HTTP Port: 6333
gRPC Port: 6334
Vector Dimensions: 1024 (multilingual-e5-large)
Distance Metric: Cosine

// No API key needed - internal Docker network
```

---

## ✅ STEP 7: Implementation Checklist

Execute in this exact order:

### 7.1 Install Dependencies
```bash
npm uninstall @pinecone-database/pinecone
npm install @qdrant/js-client-rest
```

### 7.2 Create Qdrant Client Service

Create `lib/qdrant.ts` (or appropriate location):

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';

const VECTOR_SIZE = 1024; // multilingual-e5-large

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://qdrant-qkkkc8kskocgwo0o8c444cgo:6333',
});

export async function ensureCollection(collectionName: string): Promise<void> {
  try {
    await qdrant.getCollection(collectionName);
  } catch (error: any) {
    if (error.status === 404 || error.message?.includes('not found')) {
      await qdrant.createCollection(collectionName, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });
    } else {
      throw error;
    }
  }
}

export async function upsertVector(
  collectionName: string,
  originalId: string,
  vector: number[],
  payload: Record<string, any>
): Promise<void> {
  await ensureCollection(collectionName);
  
  // Check if point with this originalId already exists
  const existing = await qdrant.scroll(collectionName, {
    filter: {
      must: [{ key: 'originalId', match: { value: originalId } }]
    },
    limit: 1,
    with_payload: false,
  });

  const pointId = existing.points.length > 0 
    ? existing.points[0].id 
    : crypto.randomUUID();

  await qdrant.upsert(collectionName, {
    wait: true,
    points: [{
      id: pointId,
      vector,
      payload: {
        originalId,
        ...payload,
      },
    }],
  });
}

export async function searchVectors(
  collectionName: string,
  queryVector: number[],
  limit: number = 10,
  filter?: any
): Promise<Array<{ id: string | number; score: number; payload: any }>> {
  try {
    await qdrant.getCollection(collectionName);
  } catch {
    return []; // Collection doesn't exist yet
  }

  const results = await qdrant.search(collectionName, {
    vector: queryVector,
    limit,
    with_payload: true,
    ...(filter && { filter }),
  });

  return results;
}

export async function deleteVector(
  collectionName: string,
  originalId: string
): Promise<void> {
  try {
    await qdrant.delete(collectionName, {
      filter: {
        must: [{ key: 'originalId', match: { value: originalId } }],
      },
    });
  } catch (error: any) {
    if (!error.message?.includes('not found')) {
      throw error;
    }
  }
}

export async function deleteCollection(collectionName: string): Promise<void> {
  try {
    await qdrant.deleteCollection(collectionName);
  } catch {
    // Ignore if doesn't exist
  }
}

export async function getCollectionInfo(collectionName: string) {
  try {
    return await qdrant.getCollection(collectionName);
  } catch {
    return null;
  }
}
```

### 7.3 Update All Files Using Pinecone

For each file found in Step 3, update:
1. Import statements
2. Client initialization
3. All method calls
4. Response handling
5. Error handling

### 7.4 Update Environment Files

All env files:
```env
# Remove:
# PINECONE_API_KEY=...
# PINECONE_INDEX=...
# PINECONE_HOST=...

# Add:
QDRANT_URL=http://qdrant-qkkkc8kskocgwo0o8c444cgo:6333
```

### 7.5 Update Type Definitions

Remove Pinecone types, add Qdrant types as needed.

### 7.6 Run Type Check
```bash
npx tsc --noEmit
```

### 7.7 Run Tests
```bash
npm test
```

---

## 🔍 STEP 8: Final Verification

**Run these commands to ensure NO Pinecone references remain:**

```bash
# Final comprehensive search - should return NOTHING
echo "=== Checking for remaining Pinecone references ==="
grep -rni "pinecone" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.env*" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v ".next" | grep -v "documentation/"

# Check package.json has no Pinecone
echo "=== Checking package.json ==="
cat package.json | grep -i pinecone && echo "❌ PINECONE STILL IN PACKAGE.JSON" || echo "✅ package.json clean"

# Verify Qdrant client is installed
echo "=== Verifying Qdrant installation ==="
cat package.json | grep -i qdrant && echo "✅ Qdrant installed" || echo "❌ QDRANT NOT INSTALLED"

# Verify Qdrant imports exist
echo "=== Verifying Qdrant imports ==="
grep -rn "QdrantClient\|@qdrant" --include="*.ts" --include="*.tsx" --include="*.js" . | grep -v node_modules | head -10

# Build check
echo "=== Running TypeScript check ==="
npx tsc --noEmit && echo "✅ TypeScript OK" || echo "❌ TypeScript errors"
```

---

## 🚨 CRITICAL REMINDERS

1. **ID Format**: Pinecone accepts string IDs → Qdrant requires UUID or integer. Store original IDs as `originalId` in payload.

2. **Namespace → Collection**: Pinecone namespaces auto-create. Qdrant collections must be created explicitly with `ensureCollection()`.

3. **Metadata → Payload**: Same data, different name.

4. **topK → limit**: Parameter rename.

5. **includeMetadata → with_payload**: Parameter rename.

6. **Filter Syntax**: Completely different. Use the translation table.

7. **Results Structure**: 
   - Pinecone: `results.matches[].metadata`
   - Qdrant: `results[].payload`

8. **Error Handling**: Qdrant throws 404 on non-existent collections.

---

## 📊 Expected Benefits After Migration

- **Search Latency**: 123ms → 5.3ms (23x faster)
- **Concurrent Searches**: 134ms → 31.5ms (4.3x faster)  
- **No vector limits** (Pinecone free: 100K)
- **GDPR compliant** (EU data residency)
- **Cost**: $0/month additional

---

## 📝 Deliverables Required

1. **Complete inventory** of all Pinecone references found
2. **List of all files modified** with summary of changes
3. **New files created** (e.g., `lib/qdrant.ts`)
4. **Environment variables** updated list
5. **Verification output** showing no Pinecone references remain
6. **Build/type check** passing confirmation

---

**Remember: Use up to 200K tokens. Check EVERYTHING. When in doubt, search again. This must be 100% complete.**