---
id: technical-discovery-job-manager-039
title: DiscoveryJobManager - In-Memory Background Job Storage
category: technical
tags: [background-jobs, job-manager, in-memory-storage, progress-tracking, discovery, neo4j, polling, singleton, api-pattern]
status: active
created: 2025-11-25
updated: 2025-11-25
related:
  - INTELLIGENT_GROUPS_NEO4J_SPEC.md
  - NEO4J_GRAPH_EXPLORER_TESTING_GUIDE.md
---

# DiscoveryJobManager - In-Memory Background Job Storage

## Overview

The `DiscoveryJobManager` is an in-memory job storage system for tracking background relationship discovery operations. It solves the problem of HTTP request timeouts during long-running discovery processes (~30-60 seconds) by enabling a **background job pattern** where:

1. The API returns immediately with a `jobId`
2. The client polls for progress updates
3. The server stores job state in memory

**File Location:** `lib/services/serviceContact/server/DiscoveryJobManager.js`

## Architecture Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Background Job Flow                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Client                              Server                         │
│    │                                   │                            │
│    │── POST /discover ────────────────>│  Creates job in Map        │
│    │<── { jobId, status: "started" } ──│  Returns immediately       │
│    │                                   │                            │
│    │                                   │  [Background processing]   │
│    │                                   │  └─> updateProgress()      │
│    │                                   │                            │
│    │── GET /status?jobId=x ──────────>│  Reads from Map            │
│    │<── { progress: 25%, step } ──────│                            │
│    │                                   │                            │
│    │── GET /status?jobId=x ──────────>│                            │
│    │<── { progress: 75%, step } ──────│                            │
│    │                                   │                            │
│    │── GET /status?jobId=x ──────────>│  completeJob()             │
│    │<── { progress: 100%, result } ───│                            │
│    │                                   │                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. The `jobs` Map - Global Singleton with `globalThis`

```javascript
// Use globalThis to persist jobs across module reloads in development
// This ensures the Map is shared between /discover and /discover/status routes
const globalKey = '__discovery_jobs__';
if (!globalThis[globalKey]) {
  globalThis[globalKey] = new Map();
}
const jobs = globalThis[globalKey];
```

**Why this works as a singleton:**
- Uses `globalThis` (Node.js global object) to store the Map
- Survives Next.js hot module reloading in development mode
- Both `/discover` and `/discover/status` routes share the same Map instance
- Without `globalThis`, different API routes may get separate module instances

**Why Map instead of Object:**
| Feature | Map | Object |
|---------|-----|--------|
| Key types | Any value | Strings/Symbols only |
| Iteration order | Insertion order (guaranteed) | Mostly ordered (not guaranteed) |
| Size property | `map.size` | Manual counting |
| Performance | Better for frequent add/delete | Better for static data |
| Iteration | `for...of` works directly | Need `Object.keys()` |

**Limitation:** In-memory only - all jobs are lost on server restart. This is acceptable for single-instance deployments where discovery can simply be re-triggered.

> **Important: Next.js Module Isolation Fix**
>
> In Next.js development mode, different API routes can receive separate module instances due to hot module reloading. This caused a bug where:
> - `/discover` route created jobs in Map A
> - `/discover/status` route queried from Map B (empty)
> - Result: 404 "Job not found" errors
>
> The `globalThis` pattern ensures both routes share the same Map instance. This fix was implemented on 2025-11-25.

### 2. Job Object Structure

Each job stored in the Map has this structure:

```javascript
{
  jobId: string,        // Unique identifier: "job_{timestamp}_{random9chars}"
  userId: string,       // Owner ID - for security/authorization
  status: 'started' | 'completed' | 'failed',  // Job state machine
  progress: number,     // 0-100 percentage
  currentStep: string,  // Human-readable step description for UI
  result: object|null,  // Final discovery results (set on completion)
  error: string|null,   // Error message (set on failure)
  createdAt: number,    // Unix timestamp in milliseconds
  updatedAt: number     // Last modification timestamp
}
```

**State Machine:**
```
   ┌──────────┐
   │  started │ ←── createJob()
   └────┬─────┘
        │
   updateProgress() (multiple times)
        │
        ├──────────────────┐
        ▼                  ▼
┌────────────┐      ┌──────────┐
│ completed  │      │  failed  │
└────────────┘      └──────────┘
  completeJob()       failJob()
```

## Method-by-Method Breakdown

### `createJob(userId)` - Job Creation

```javascript
static createJob(userId) {
  // Housekeeping: remove stale jobs before creating new ones
  this.cleanup();

  // Generate unique job ID
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Store in Map
  jobs.set(jobId, {
    jobId,
    userId,
    status: 'started',
    progress: 0,
    currentStep: 'Initializing...',
    result: null,
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  console.log(`📋 [DiscoveryJob] Created job ${jobId} for user ${userId}`);
  return jobId;
}
```

**Job ID Generation Explained:**

```javascript
`job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

| Part | Example | Purpose |
|------|---------|---------|
| `job_` | `job_` | Prefix for readability |
| `Date.now()` | `1732550400000` | Milliseconds since epoch (uniqueness across time) |
| `Math.random()` | `0.7234891023` | Random float 0-1 |
| `.toString(36)` | `0.q1w2e3r4t5` | Convert to base-36 (0-9 + a-z) for compactness |
| `.substr(2, 9)` | `q1w2e3r4t` | Take 9 chars after "0." prefix |

**Result:** `job_1732550400000_q1w2e3r4t`

This format provides:
- **Uniqueness**: Timestamp ensures different jobs don't collide
- **Collision prevention**: Random suffix handles same-millisecond creation
- **Sortability**: IDs naturally sort chronologically
- **Compactness**: Base-36 is shorter than base-10

---

### `updateProgress(jobId, progress, currentStep)` - Progress Updates

```javascript
static updateProgress(jobId, progress, currentStep) {
  const job = jobs.get(jobId);
  if (job) {
    job.progress = Math.round(progress);  // Clean integer percentages
    job.currentStep = currentStep;
    job.updatedAt = Date.now();

    // Milestone logging to avoid console spam
    if (progress % 25 === 0 || progress === 100) {
      console.log(`📊 [DiscoveryJob] ${jobId}: ${progress}% - ${currentStep}`);
    }
  }
}
```

**Key Design Decisions:**

1. **Null-safe check**: `if (job)` prevents errors if job was deleted or never existed
2. **Rounding**: `Math.round(progress)` ensures clean percentages (no 73.333%)
3. **Selective logging**: Only logs at 0%, 25%, 50%, 75%, 100% to reduce noise

**How progress is calculated in RelationshipDiscoveryService:**

| Phase | Progress Range | Description |
|-------|---------------|-------------|
| Neo4j Sync | 0-30% | Bulk sync contacts to graph database |
| Company Detection | 30-40% | Find company relationships from domains |
| Semantic Analysis | 40-90% | Pinecone vector similarity queries |
| Tag Relationships | 90-100% | Neo4j tag overlap queries |

---

### `completeJob(jobId, result)` - Success Completion

```javascript
static completeJob(jobId, result) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'completed';
    job.progress = 100;
    job.currentStep = 'Discovery complete!';
    job.result = result;  // Store full discovery results
    job.updatedAt = Date.now();
    console.log(`✅ [DiscoveryJob] ${jobId}: Completed with ${result.similarityRelationships || 0} similarity relationships`);
  }
}
```

**The `result` object typically contains:**
```javascript
{
  userId: string,
  totalContacts: number,
  companiesFound: number,
  similarityRelationships: number,
  tagRelationships: number,
  duration: number,  // milliseconds
  errors: string[]   // non-fatal errors
}
```

---

### `failJob(jobId, error)` - Failure Handling

```javascript
static failJob(jobId, error) {
  const job = jobs.get(jobId);
  if (job) {
    job.status = 'failed';
    job.error = error;  // Store error message for client
    job.updatedAt = Date.now();
    console.error(`❌ [DiscoveryJob] ${jobId}: Failed - ${error}`);
  }
}
```

**Note:** Does NOT reset `progress` - this preserves the last known progress for debugging.

---

### `getJob(jobId)` vs `getJobForUser(jobId, userId)` - Retrieval

```javascript
// Direct lookup - for internal server use
static getJob(jobId) {
  return jobs.get(jobId) || null;
}

// Security-aware lookup - for API endpoints
static getJobForUser(jobId, userId) {
  const job = jobs.get(jobId);
  if (job && job.userId === userId) {
    return job;
  }
  return null;  // Not found OR wrong user
}
```

**Security Consideration:**

`getJobForUser` prevents **job enumeration attacks** where an attacker could:
1. Guess job IDs (they're somewhat predictable: `job_{timestamp}_{random}`)
2. Poll `/status?jobId=...` to see other users' discovery progress
3. Potentially infer information about other users' contacts

By requiring `userId` match, only the job owner can check status.

---

### `cleanup()` - Memory Management

```javascript
static cleanup() {
  const oneHourAgo = Date.now() - 3600000;  // 3,600,000 ms = 1 hour
  let cleaned = 0;

  for (const [id, job] of jobs) {
    if (job.createdAt < oneHourAgo) {
      jobs.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 [DiscoveryJob] Cleaned up ${cleaned} old jobs`);
  }
}
```

**Design Decisions:**

1. **Lazy cleanup**: Called at start of `createJob()` rather than on a timer
   - Pro: No background interval needed
   - Con: Cleanup only happens when new jobs are created

2. **1-hour retention**: Long enough for:
   - Client to finish polling
   - Debugging after completion
   - Short enough to prevent memory bloat

3. **Iterator-safe deletion**: Using `for...of` on Map entries is safe for deletion during iteration (unlike arrays)

---

### `getJobsForUser(userId)` & `getJobCount()` - Debugging/Monitoring

```javascript
// Get all jobs for a specific user (debugging)
static getJobsForUser(userId) {
  return Array.from(jobs.values()).filter(job => job.userId === userId);
}

// Get total active job count (monitoring dashboards)
static getJobCount() {
  return jobs.size;
}
```

These are utility methods for:
- Admin dashboards
- Debugging multi-user scenarios
- Monitoring memory usage

## Integration Points

### 1. POST `/api/user/contacts/graph/discover` (route.js)

```javascript
// Create job and return immediately
const jobId = DiscoveryJobManager.createJob(session.userId);

// Start background processing (NOT awaited)
runDiscoveryInBackground(jobId, session.userId, contacts, options);

// Return jobId to client
return NextResponse.json({
  success: true,
  jobId,
  status: 'started',
  message: `Poll /discover/status?jobId=${jobId} for progress`
});
```

**Critical:** `runDiscoveryInBackground()` is called but NOT awaited, allowing the HTTP response to return immediately.

---

### 2. Background Discovery Function

```javascript
async function runDiscoveryInBackground(jobId, userId, contacts, options) {
  try {
    // Create progress callback that updates the job
    const onProgress = (progress, currentStep) => {
      DiscoveryJobManager.updateProgress(jobId, progress, currentStep);
    };

    // Run the actual discovery
    const results = await RelationshipDiscoveryService.discoverAllRelationships(
      userId,
      contacts,
      { ...options, onProgress }
    );

    // Mark complete
    DiscoveryJobManager.completeJob(jobId, results);
  } catch (error) {
    // Mark failed
    DiscoveryJobManager.failJob(jobId, error.message);
  }
}
```

---

### 3. GET `/api/user/contacts/graph/discover/status` (status/route.js)

```javascript
export async function GET(request) {
  const session = await createApiSession(request);
  const jobId = new URL(request.url).searchParams.get('jobId');

  // Security: verify user owns this job
  const job = DiscoveryJobManager.getJobForUser(jobId, session.userId);

  if (!job) {
    return NextResponse.json({ error: 'Job not found or unauthorized' }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep,
    result: job.result,
    error: job.error
  });
}
```

---

### 4. Client-Side Polling (useGraphData.js hook)

```javascript
const pollJobStatus = useCallback(async (jobId) => {
  const data = await ContactApiClient.get(`/api/user/contacts/graph/discover/status?jobId=${jobId}`);

  setDiscoveryProgress({
    jobId,
    progress: data.progress || 0,
    currentStep: data.currentStep || '',
    status: data.status
  });

  if (data.status === 'completed') {
    clearInterval(pollIntervalRef.current);
    // Refresh graph data
    await Promise.all([fetchGraphData(), fetchStats(), fetchSuggestions()]);
  } else if (data.status === 'failed') {
    clearInterval(pollIntervalRef.current);
    setError(data.error);
  }
}, [...]);

// Start polling every 2 seconds
pollIntervalRef.current = setInterval(() => pollJobStatus(jobId), 2000);
```

## Design Decisions & Trade-offs

| Decision | Choice | Rationale | Alternative |
|----------|--------|-----------|-------------|
| Storage | In-memory Map | Simple, no dependencies, fast | Redis for multi-instance |
| Global scope | `globalThis` | Survives Next.js hot reloading | Module-level const (breaks in dev) |
| Class style | Static methods | Singleton behavior, clean API | Instance + dependency injection |
| Cleanup | Lazy (on create) | No timers needed | setInterval every minute |
| Retention | 1 hour | Balances debugging vs memory | Configurable via env var |
| User verification | Required for API | Security: prevents enumeration | Trust job IDs (insecure) |
| Progress rounding | Math.round() | Clean UI display | Keep decimals for precision |

## Limitations & Future Improvements

### Current Limitations

1. **Single instance only**: Jobs lost if server restarts mid-discovery
2. **No persistence**: Cannot survive deployments/crashes
3. **No cancellation**: Jobs run to completion (no `cancelJob()` method)
4. **No rate limiting**: User could spam discovery requests
5. **No job history**: Completed jobs eventually cleaned up

### Potential Improvements

```javascript
// 1. Add job cancellation
static cancelJob(jobId) {
  const job = jobs.get(jobId);
  if (job && job.status === 'started') {
    job.status = 'cancelled';
    job.cancelled = true;
    // Would need to propagate to RelationshipDiscoveryService
  }
}

// 2. Add rate limiting
static canCreateJob(userId) {
  const userJobs = this.getJobsForUser(userId);
  const activeJobs = userJobs.filter(j => j.status === 'started');
  return activeJobs.length < 3; // Max 3 concurrent jobs
}

// 3. Redis persistence for multi-instance
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

static async createJob(userId) {
  const jobId = `job_${Date.now()}_${randomString()}`;
  await redis.hset(`job:${jobId}`, { userId, status: 'started', ... });
  await redis.expire(`job:${jobId}`, 3600); // 1 hour TTL
  return jobId;
}
```

## Testing

### Manual Testing

```bash
# 1. Start discovery (returns immediately)
curl -X POST http://localhost:3000/api/user/contacts/graph/discover \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Response: {"success":true,"jobId":"job_1732550400000_abc123xyz","status":"started"}

# 2. Poll for status
curl "http://localhost:3000/api/user/contacts/graph/discover/status?jobId=job_1732550400000_abc123xyz" \
  -H "Authorization: Bearer $TOKEN"

# Response: {"status":"started","progress":45,"currentStep":"Semantic analysis: 23/50 contacts"}
```

### Unit Test Ideas

```javascript
describe('DiscoveryJobManager', () => {
  beforeEach(() => {
    // Clear jobs between tests
    jobs.clear();
  });

  test('createJob generates unique IDs', () => {
    const id1 = DiscoveryJobManager.createJob('user1');
    const id2 = DiscoveryJobManager.createJob('user1');
    expect(id1).not.toBe(id2);
  });

  test('getJobForUser enforces ownership', () => {
    const jobId = DiscoveryJobManager.createJob('user1');
    expect(DiscoveryJobManager.getJobForUser(jobId, 'user1')).toBeTruthy();
    expect(DiscoveryJobManager.getJobForUser(jobId, 'user2')).toBeNull();
  });

  test('cleanup removes old jobs', () => {
    const jobId = DiscoveryJobManager.createJob('user1');
    const job = jobs.get(jobId);
    job.createdAt = Date.now() - 7200000; // 2 hours ago

    DiscoveryJobManager.cleanup();

    expect(jobs.has(jobId)).toBe(false);
  });
});
```

## Related Documentation

- [Intelligent Groups with Neo4j](./INTELLIGENT_GROUPS_NEO4J_SPEC.md) - Parent feature specification
- [Neo4j Graph Explorer Testing Guide](../testing/NEO4J_GRAPH_EXPLORER_TESTING_GUIDE.md) - End-to-end testing
- RelationshipDiscoveryService - The actual discovery logic that uses this manager

## Summary

The `DiscoveryJobManager` is a lightweight, in-memory job storage system that enables background processing for long-running discovery operations. Its key features:

- **Simple**: No external dependencies (Redis, database)
- **Fast**: Map operations are O(1)
- **Secure**: User verification prevents job enumeration
- **Observable**: Progress tracking with step descriptions
- **Self-cleaning**: Automatic cleanup of stale jobs

It trades persistence and multi-instance support for simplicity, making it ideal for single-server deployments where occasional re-discovery is acceptable.
