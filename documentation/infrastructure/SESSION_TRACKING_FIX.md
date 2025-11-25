---
id: technical-session-tracking-fix-030
title: Session Tracking Fix
category: technical
tags: [sessions, bug-fix, tracking, lifecycle-management, budget-tracking]
status: active
created: 2025-01-01
updated: 2025-11-22
related:
  - ADMIN_DASHBOARD_SESSION_AGGREGATION_FIX.md
  - BUDGET_AFFORDABILITY_CHECK_GUIDE.md
---

# Session Tracking Fix: User Document Updates

## Problem Identified

When business card scanning (or any session-based operation) was executed, the cost tracking was recording data to `SessionUsage` collection but **NOT updating the user document** with the billing fields needed for budget tracking.

### Root Cause

In `costTrackingService.js` (lines 64-86), when a `sessionId` was provided, the code would:
1. ✅ Record to SessionUsage collection
2. ❌ Return immediately without updating user document
3. ❌ Skip lines 185-219 that update `monthlyTotalCost` and `monthlyBillableRuns`

```javascript
// OLD CODE - Problematic
if (sessionId) {
  await SessionTrackingService.addStepToSession({ ... });
  return { success: true };  // ← Returns here, never updates user doc!
}

// User document update code was here (lines 185-219)
// But it never ran for session-based operations!
```

### Evidence from Logs

```
💰 bgtfrdsZ [usage_1760380378785_zrix] Recording AIUsage: {
  sessionId: 'session_scan_1760380376660_72r1'  ← Session ID present
}
📋 [CostTracking] Session-based operation - recording ONLY in SessionUsage
✅ [CostTracking] Session operation recorded  ← Returned here
```

Result: User document in Firestore had **no billing fields** (`monthlyTotalCost`, `monthlyBillableRuns`, etc.)

## Solution Implemented

### Changes Made

**File**: `lib/services/serviceContact/server/costTracking/costTrackingService.js` (lines 86-128)

Added logic to **ALSO** update the user document when recording session-based operations:

```javascript
if (sessionId) {
  // 1. Record to SessionUsage (as before)
  await SessionTrackingService.addStepToSession({ ... });

  // 2. ✅ NEW: ALSO update user document for billing
  if (isBillableRun || safeCost > 0) {
    const userDocRef = adminDb.collection('users').doc(userId);

    await adminDb.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      const userData = userDoc.exists ? userDoc.data() : {};
      const needsReset = userData.monthlyUsageMonth !== currentMonth;

      if (needsReset) {
        // Reset counters for new month
        transaction.set(userDocRef, {
          monthlyTotalCost: safeCost,
          monthlyBillableRuns: isBillableRun ? 1 : 0,
          monthlyUsageMonth: currentMonth,
          monthlyUsageLastUpdated: FieldValue.serverTimestamp()
        }, { merge: true });
      } else {
        // Increment existing counters
        const updateData = {
          monthlyTotalCost: FieldValue.increment(safeCost),
          monthlyUsageLastUpdated: FieldValue.serverTimestamp()
        };
        if (isBillableRun) {
          updateData.monthlyBillableRuns = FieldValue.increment(1);
        }
        transaction.update(userDocRef, updateData);
      }
    });
  }

  return { success: true, operationId, recordedIn: 'SessionUsage+UserDoc' };
}
```

### What Changed

| Aspect | Before | After |
|--------|--------|-------|
| **SessionUsage recording** | ✅ Yes | ✅ Yes |
| **User document update** | ❌ No | ✅ Yes (for billable ops) |
| **Budget tracking** | ❌ Broken | ✅ Works |
| **Cost accumulation** | ❌ Not tracked | ✅ Tracked in real-time |
| **Run counting** | ❌ Not tracked | ✅ Tracked in real-time |

### Key Features

1. **Atomic Updates**: Uses `FieldValue.increment()` to prevent race conditions
2. **Month Rollover**: Automatically resets counters when month changes
3. **Error Handling**: User doc update failure doesn't break session tracking
4. **Conditional Logic**: Only updates for billable operations or operations with cost
5. **Logging**: Clear console logs for debugging
6. **Budget Exceeded Tracking**: Records when operations are blocked due to budget/limit constraints

### ⏰ Timing: When Updates Happen

**IMPORTANT**: User document updates happen **DURING step recording**, not during session finalization.

```
Session Lifecycle:
1. Generate sessionId
2. Execute Step 1 → recordUsage() → ✅ Updates SessionUsage + User Doc
3. Execute Step 2 → recordUsage() → ✅ Updates SessionUsage + User Doc
4. Execute Step N → recordUsage() → ✅ Updates SessionUsage + User Doc
5. finalizeSession() → ✅ ONLY marks session as "completed"
```

**What `finalizeSession()` does**:
- Sets `status: 'completed'`
- Sets `completedAt` timestamp
- **Does NOT** update user document (already updated in steps 2-4)

**What `recordUsage()` does** (for each step):
- Writes step to `SessionUsage/{userId}/sessions/{sessionId}`
- Updates `users/{userId}` document counters atomically
- Increments `monthlyTotalCost`, `monthlyBillableRunsAI`, or `monthlyBillableRunsAPI`

### 🚫 Budget Exceeded Tracking in Sessions

**New Feature (Nov 22, 2025)**: Sessions now track when budget/limit constraints prevent operations.

#### Session-Level Tracking

When ANY step in a session exceeds budget, the session document records this:

```javascript
{
  sessionId: 'session_enrich_xxx',
  feature: 'google_maps',
  status: 'in-progress',

  // Budget exceeded fields
  budgetExceeded: true,
  budgetExceededAt: Timestamp,
  budgetExceededReason: 'budget_exceeded',  // or 'runs_exceeded'

  totalCost: 0.005,
  totalRuns: 1,
  steps: [ ... ]
}
```

#### Step-Level Tracking

Each step in the session includes budget check information. The `budgetCheck` object from the initial affordability check is propagated through all steps:

```javascript
{
  stepLabel: 'Step 1: Reverse Geocoding',
  operationId: 'usage_xxx',
  feature: 'location_reverse_geocoding',
  cost: 0.005,
  isBillableRun: true,

  // Budget tracking for this step
  budgetExceeded: false,
  budgetExceededReason: null,

  metadata: {
    // budgetCheck from initial affordability check (propagated to all steps)
    budgetCheck: {
      canAfford: true,
      reason: "within_limits",
      remainingBudget: 2.95660556,
      remainingRuns: 28
    },
    // Additional metadata specific to this step
    operationId: 'usage_xxx',
    // ... other step-specific data
  }
}
```

#### When Budget is Exceeded

If a step is blocked due to budget limits, it records:

```javascript
{
  stepLabel: 'Step 1: Reverse Geocoding',
  operationId: 'usage_xxx',
  feature: 'location_reverse_geocoding',
  cost: 0,  // No cost incurred (blocked)
  isBillableRun: false,

  // Budget exceeded!
  budgetExceeded: true,
  budgetExceededReason: 'budget_exceeded',  // or 'runs_exceeded'

  metadata: {
    budgetCheck: {
      passed: false,
      reason: 'budget_exceeded',
      currentCost: 3.057,
      maxCost: 3.0,
      estimatedCost: 0.037,
      blocked: true
    }
  }
}
```

**Session Update:** When a step exceeds budget:
```javascript
await SessionTrackingService.addStepToSession({
  userId,
  sessionId,
  stepData: {
    ...stepData,
    budgetExceeded: true,
    budgetExceededReason: 'runs_exceeded'
  }
});
// This sets session.budgetExceeded = true automatically
```

#### Integration with Contact Metadata

When location enrichment is blocked due to budget, the contact also tracks this:

```javascript
{
  // Contact fields...
  metadata: {
    budgetExceeded: true,
    budgetExceededReason: 'budget_exceeded',
    budgetExceededAt: '2025-11-22T10:30:00.000Z',
    enrichmentAttempted: true,
    skippedFeatures: ['geocoding', 'venue_enrichment']
  }
}
```

**UI Impact:**
- ContactCard displays amber badge: "⏸️ Budget" or "⏸️ Limit"
- Info banner shows: "Budget limit reached. Features skipped: Geocoding, Venue Enrichment"
- Timestamp shows when limit was hit

#### Audit Trail

Budget exceeded events are also recorded in usage collections:

**Location:** `ApiUsage/{userId}/operations/{operationId}`

```javascript
{
  timestamp: '2025-11-22T10:30:00.000Z',
  feature: 'location_enrichment',
  cost: 0,  // No actual cost
  estimatedCost: 0.037,  // What it would have cost
  isBillableRun: false,

  budgetExceeded: true,
  budgetExceededReason: 'budget_exceeded',

  metadata: {
    operationId: 'budget_exceeded_xxx',
    blocked: true,
    reason: 'budget_exceeded'
  }
}
```

**Benefits:**
1. **Complete Audit Trail**: Every budget block is logged
2. **User Transparency**: Users see exactly why features were skipped
3. **Analytics**: Can analyze budget hit patterns
4. **Debugging**: Clear indicators of limit issues

### budgetCheck Propagation Pattern

The `budgetCheck` object from the initial affordability check is propagated through all steps of multi-step operations (like semantic search). This provides full budget visibility at every step.

#### Data Structure

```javascript
// budgetCheck object structure
{
  canAfford: boolean,              // Can user afford more operations?
  reason: "within_limits",         // 'within_limits' | 'budget_exceeded' | 'runs_exceeded'
  remainingBudget: 2.95660556,     // USD remaining this month
  remainingRuns: 28                // AI/API runs remaining this month
}
```

#### How It's Stored in SessionUsage Steps

```json
// Each step in SessionUsage includes budgetCheck in metadata
{
  "sessionId": "session_search_xxx",
  "steps": [
    {
      "stepLabel": "Query Enhancement",
      "stepNumber": 2,
      "feature": "query_enhancement",
      "cost": 0,
      "metadata": {
        "budgetCheck": {
          "canAfford": true,
          "reason": "within_limits",
          "remainingBudget": 2.95660556,
          "remainingRuns": 28
        },
        "cacheType": "redis",
        "enhancedQuery": "..."
      }
    },
    {
      "stepLabel": "Embedding Generation",
      "stepNumber": 3,
      "feature": "semantic_search_embedding",
      "cost": 0.0000038,
      "metadata": {
        "budgetCheck": {
          "canAfford": true,
          "reason": "within_limits",
          "remainingBudget": 2.95660556,
          "remainingRuns": 28
        },
        "model": "multilingual-e5-large",
        "dimension": 1024
      }
    }
  ]
}
```

#### Recording budgetCheck via StepTracker

```javascript
// StepTracker.recordStep accepts budgetCheck parameter
await StepTracker.recordStep({
  userId,
  sessionId,
  stepNumber: 2,
  stepLabel: 'Query Enhancement',
  feature: 'query_enhancement',
  provider: 'redis',
  cost: 0,
  duration: 257,
  isBillableRun: false,
  budgetCheck,  // ← Include the budgetCheck object
  metadata: {
    cacheType: 'redis',
    enhancedQuery: '...'
  }
});
```

#### Recording budgetCheck via CostTrackingService

```javascript
// CostTrackingService.recordUsage also accepts budgetCheck
await CostTrackingService.recordUsage({
  userId,
  usageType: 'ApiUsage',
  feature: 'semantic_search_embedding',
  cost: 0.0000038,
  isBillableRun: true,
  provider: 'pinecone-inference',
  sessionId,
  stepLabel: 'Embedding Generation',
  budgetCheck,  // ← Include the budgetCheck object
  metadata: {
    model: 'multilingual-e5-large',
    dimension: 1024
  }
});
```

#### Benefits of budgetCheck Propagation

- ✅ **Debugging**: See exactly what budget state was at each step
- ✅ **Monitoring**: Track budget consumption throughout pipelines
- ✅ **Consistency**: Same pattern across all multi-step operations
- ✅ **Auditability**: Full budget context preserved in SessionUsage

## Expected Behavior After Fix

### When Scanning a Business Card

**Console Logs** (new):
```
📋 [CostTracking] Session-based operation - recording in SessionUsage
✅ [CostTracking] Session operation recorded in SessionUsage
💰 [CostTracking] Updating user document for billable session operation
✅ [CostTracking] User document updated: cost=$0.000108, billableRun=true
```

**Firestore `users/{userId}` Document** (new fields added):
```javascript
{
  // ... existing fields ...

  // ✅ NEW FIELDS:
  monthlyTotalCost: 0.000108,           // AI cost from Gemini
  monthlyBillableRuns: 1,                // 1 AI-enhanced scan
  monthlyUsageMonth: "2025-10",          // Current month
  monthlyUsageLastUpdated: Timestamp     // Last update time
}
```

**SessionUsage Collection** (still works as before):
```javascript
{
  sessionId: "session_scan_...",
  status: "completed",
  totalCost: 0.00160785,  // OCR + AI
  totalRuns: 1,
  steps: [
    { feature: "business_card_scan_ocr", cost: 0.0015, isBillableRun: false },
    { feature: "business_card_scan", cost: 0.000108, isBillableRun: true }
  ]
}
```

## Testing Instructions

### 1. Clear Previous Data (Optional)
If you want a clean test, delete these fields from your user document:
```
monthlyTotalCost
monthlyBillableRuns
monthlyUsageMonth
monthlyUsageLastUpdated
```

### 2. Scan a Business Card
1. Go to Contacts page
2. Click "Scan Business Card"
3. Upload/capture a business card image
4. Wait for processing to complete

### 3. Verify in Firestore Console
Navigate to: `users/{your-user-id}`

**Expected fields** (should now exist):
```
monthlyTotalCost: 0.000108 (or similar small number)
monthlyBillableRuns: 1
monthlyUsageMonth: "2025-10"
monthlyUsageLastUpdated: [recent timestamp]
```

### 4. Verify in Dashboard
1. Go to Contacts page
2. Look for the Budget Info Card (below the page title)
3. Should display:
   - "AI Operations: 1 / 30" (for Premium users)
   - "$0.00 / $3.00" (for Premium users)
   - Progress bars showing usage

### 5. Test Multiple Scans
1. Scan another business card
2. Check that counters increment:
   - `monthlyBillableRuns: 2`
   - `monthlyTotalCost: ~0.000216`
3. Dashboard should update to show "2 / 30"

## Impact on Other Features

### Features That Will Now Work Correctly

✅ **Budget Display in Dashboard**
- Shows real-time usage
- Progress bars update immediately
- Warnings appear when approaching limits

✅ **Pre-flight Budget Checks**
- `canAffordOperation()` now has accurate data
- Prevents operations when budget exceeded
- Shows correct remaining budget/runs

✅ **All Session-Based Operations**
- Business card scanning (single & double-sided)
- Any future multi-step AI operations using sessions

### Features Not Affected

✅ **Standalone Operations**
Operations without `sessionId` already worked (unchanged)

✅ **Session Tracking**
SessionUsage collection still tracks all steps (unchanged)

✅ **Historical Analytics**
AIUsage/ApiUsage collections still work for detailed analytics

## Benefits

1. **Real-time Tracking**: Budget info updates immediately after each operation
2. **Accurate Limits**: Users can't exceed their monthly allowance
3. **Better UX**: Users see their usage in the dashboard
4. **Prevents Overuse**: Pre-flight checks stop operations before they start
5. **Month Rollover**: Automatically resets on the 1st of each month
6. **Thread-safe**: Atomic increments prevent race conditions

## Backward Compatibility

✅ **Fully backward compatible**
- Existing AIUsage/ApiUsage collections untouched
- SessionUsage collection still works
- No breaking changes to existing code
- New fields added to user document only (won't break existing logic)

## Future Enhancements

Potential improvements for later:
1. Add real-time Firestore listener to refresh budget display automatically
2. Add email alerts at 80% and 95% usage
3. Show historical usage chart (past 6 months)
4. Add per-feature cost breakdown in dashboard
5. Implement usage prediction ("You'll hit your limit in X days")

## Related Files

- **Modified**: [lib/services/serviceContact/server/costTracking/costTrackingService.js](lib/services/serviceContact/server/costTracking/costTrackingService.js:86-128)
- **Budget API**: [app/api/user/budget/status/route.js](app/api/user/budget/status/route.js)
- **Budget Display**: [app/dashboard/general components/BudgetInfoCard.jsx](app/dashboard/general components/BudgetInfoCard.jsx)
- **Context**: [app/dashboard/DashboardContext.js](app/dashboard/DashboardContext.js)
- **Session Manager**: [lib/server/session.js](lib/server/session.js:270-378)
- **Constants**: [lib/services/core/constants.js](lib/services/core/constants.js:67-85)

## Rollback Instructions

If you need to revert this change:

```javascript
// In costTrackingService.js, replace lines 86-128 with:
if (sessionId) {
  await SessionTrackingService.addStepToSession({ ... });
  return { success: true, operationId, recordedIn: 'SessionUsage' };
}
```

This restores the original behavior (session tracking only, no user doc updates).
