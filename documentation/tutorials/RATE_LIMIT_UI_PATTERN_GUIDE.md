---
id: tutorials-rate-limit-ui-pattern-042
title: Rate Limit UI Pattern - Countdown Timer with Persistent State
category: tutorials
tags: [rate-limiting, ui-patterns, countdown-timer, localStorage, state-management, user-feedback, 429-handling]
status: active
created: 2025-11-18
updated: 2025-11-18
related:
  - RATE_LIMIT_TESTING.md
  - ACCOUNT_PRIVACY_TESTING_GUIDE.md
  - RATE_LIMITS_COLLECTION_GUIDE_V2.md
  - CONSENT_IMPLEMENTATION_GUIDE.md
---

# Rate Limit UI Pattern: Countdown Timer with Persistent State

## Overview

This guide documents a reusable UI pattern for handling rate limit errors (HTTP 429) with:
- **Real-time countdown timer** showing time until rate limit resets
- **Greyed-out disabled button** during rate limit period
- **localStorage persistence** to survive page refreshes
- **Multi-tab synchronization** using storage events
- **Accurate timing** using server's absolute resetTime (not relative retryAfter)

### When to Use This Pattern

Use this pattern when implementing features that:
- Make rate-limited API requests (exports, uploads, intensive operations)
- Need to prevent user frustration from hitting rate limits
- Require clear feedback about when users can retry
- Should maintain state across page refreshes or browser tabs

### Example Use Cases
- Data export requests (current implementation in ExportDataTab.jsx)
- File uploads
- Bulk operations
- API quota-limited features
- Email/notification sending

---

## Architecture Overview

### Flow Diagram

```
User Action (Click Button)
    ↓
API Request → 429 Response
    ↓         {
    ↓           resetTime: 1736976542000,
    ↓           retryAfter: 3542
    ↓         }
    ↓
Frontend Receives 429
    ↓
├─ Parse resetTime from response
├─ Save to localStorage
├─ Set React state (isRateLimited: true)
├─ Start countdown timer (useEffect)
└─ Update UI (greyed button + alert)
    ↓
Every Second: Update Timer
    ↓
    ├─ Calculate remaining = (resetTime - now) / 1000
    ├─ Update displayed countdown
    └─ If remaining <= 0:
        ├─ Clear localStorage
        ├─ Reset state
        └─ Re-enable button
```

### Component Architecture

```
YourFeatureComponent
├── State Management
│   ├── isRateLimited (boolean)
│   ├── rateLimitedUntil (timestamp)
│   └── timeRemaining (seconds)
│
├── Effects (useEffect hooks)
│   ├── Countdown timer (updates every 1s)
│   ├── localStorage restore (on mount)
│   └── Multi-tab sync (storage event listener)
│
├── Helper Functions
│   ├── formatTime(seconds) → "45m 32s"
│   └── handleAction() → API call + error handling
│
└── UI Components
    ├── Alert (rate limit message + countdown)
    └── Button (greyed out when rate limited)
```

---

## Implementation Guide

### Step 1: State Management

Set up React state for tracking rate limit status.

**File:** Your component (e.g., `ExportDataTab.jsx`)

```javascript
import { useState, useEffect } from 'react';
import { Clock, Timer, AlertCircle } from 'lucide-react';

export default function YourFeatureComponent() {
  // Rate limit states
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(null); // Unix timestamp (ms)
  const [timeRemaining, setTimeRemaining] = useState(0); // Seconds

  // ... rest of component
}
```

**State Fields Explained:**
- `isRateLimited`: Boolean flag controlling UI display
- `rateLimitedUntil`: Absolute timestamp (milliseconds) when rate limit expires
- `timeRemaining`: Human-readable seconds for countdown display

**Why Absolute Timestamp?**
Using `resetTime` (absolute) instead of `retryAfter` (relative) prevents timer drift:
- ❌ Bad: `retryAfter: 3600` → Could be inaccurate if page loads slowly
- ✅ Good: `resetTime: 1736976542000` → Always accurate regardless of when it's read

---

### Step 2: Countdown Timer Effect

Implement a `useEffect` hook that updates the countdown every second.

```javascript
// Countdown timer for rate limit
useEffect(() => {
  if (!rateLimitedUntil) return; // No rate limit active

  const updateTimer = () => {
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((rateLimitedUntil - now) / 1000));

    setTimeRemaining(remaining);

    if (remaining <= 0) {
      // Rate limit expired
      setIsRateLimited(false);
      setRateLimitedUntil(null);
      localStorage.removeItem('weavink_export_rate_limit');
      console.log('✅ Rate limit expired and cleared');
    }
  };

  updateTimer(); // Update immediately (don't wait 1 second)
  const interval = setInterval(updateTimer, 1000); // Update every second

  return () => clearInterval(interval); // Cleanup on unmount
}, [rateLimitedUntil]);
```

**Key Points:**
- `Math.max(0, ...)` prevents negative countdown
- `Math.ceil(...)` rounds up (show 1s instead of 0s at the end)
- Update immediately then every 1000ms (avoids initial delay)
- Cleanup interval on unmount to prevent memory leaks
- Auto-clear when timer reaches 0

---

### Step 3: localStorage Persistence

Restore rate limit state from localStorage on component mount.

```javascript
// Restore rate limit state from localStorage on mount
useEffect(() => {
  const stored = localStorage.getItem('weavink_export_rate_limit');
  if (!stored) return;

  try {
    const data = JSON.parse(stored);
    const now = Date.now();

    // Validate stored data
    if (!data.resetTime || typeof data.resetTime !== 'number') {
      localStorage.removeItem('weavink_export_rate_limit');
      return;
    }

    // Check if rate limit is still active
    if (data.resetTime > now) {
      const remainingSeconds = Math.ceil((data.resetTime - now) / 1000);
      setIsRateLimited(true);
      setRateLimitedUntil(data.resetTime);
      setTimeRemaining(remainingSeconds);
      console.log(`✅ Rate limit restored: ${remainingSeconds}s remaining`);
    } else {
      // Rate limit expired while user was away
      localStorage.removeItem('weavink_export_rate_limit');
      console.log('⏱️ Expired rate limit cleared from storage');
    }
  } catch (err) {
    console.error('❌ Failed to restore rate limit:', err);
    localStorage.removeItem('weavink_export_rate_limit');
  }
}, []); // Empty deps = run only once on mount
```

**localStorage Data Structure:**
```javascript
{
  resetTime: 1736976542000,  // Unix timestamp (ms) when rate limit expires
  limit: {
    max: 3,
    windowHours: 1
  },
  timestamp: 1736972942000   // When this was stored (for debugging)
}
```

**Why Validate Data?**
- User might manually edit localStorage
- Data might be corrupted
- Old data format from previous versions
- Always validate before trusting stored data

---

### Step 4: Multi-Tab Synchronization

Sync rate limit state across browser tabs using storage events.

```javascript
// Sync rate limit state across browser tabs
useEffect(() => {
  const handleStorageChange = (e) => {
    if (e.key !== 'weavink_export_rate_limit') return;

    if (e.newValue) {
      // Rate limit set in another tab
      try {
        const data = JSON.parse(e.newValue);
        const now = Date.now();

        if (data.resetTime && data.resetTime > now) {
          setIsRateLimited(true);
          setRateLimitedUntil(data.resetTime);
          setTimeRemaining(Math.ceil((data.resetTime - now) / 1000));
          console.log('🔄 Rate limit synced from another tab');
        }
      } catch (err) {
        console.error('❌ Failed to sync rate limit from storage event:', err);
      }
    } else {
      // Rate limit cleared in another tab
      setIsRateLimited(false);
      setRateLimitedUntil(null);
      setTimeRemaining(0);
      console.log('🔄 Rate limit cleared in another tab');
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

**How Storage Events Work:**
- Fires when localStorage is modified **in another tab**
- Does NOT fire in the same tab that made the change
- Perfect for syncing state across tabs
- `e.newValue` = new value or `null` if item was removed

---

### Step 5: Time Formatting Helper

Format seconds into human-readable time strings.

```javascript
// Helper function to format time
const formatTime = (seconds) => {
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
};
```

**Example Outputs:**
- `45` → `"45s"`
- `125` → `"2m 5s"`
- `3600` → `"1h"`
- `5430` → `"1h 30m"`

**Design Decision:** Only show hours/minutes when needed (progressive disclosure).

---

### Step 6: API Error Handling

Handle 429 responses and extract rate limit data.

```javascript
const handleAction = async () => {
  try {
    setLoading(true);
    setError(null);

    // Make API request
    const response = await fetch('/api/your-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* your data */ })
    });

    if (!response.ok) {
      if (response.status === 429) {
        const data = await response.json();
        const resetTime = data.resetTime || (Date.now() + (data.retryAfter || 3600) * 1000);

        // Store in localStorage
        localStorage.setItem('weavink_export_rate_limit', JSON.stringify({
          resetTime,
          limit: data.limit || { max: 3, windowHours: 1 },
          timestamp: Date.now()
        }));

        // Update UI state
        setIsRateLimited(true);
        setRateLimitedUntil(resetTime);
        setTimeRemaining(Math.ceil((resetTime - Date.now()) / 1000));
        setError(null); // Don't show error, show timer instead

        console.log('🚫 Rate limit triggered:', {
          resetTime,
          resetTimeFormatted: new Date(resetTime).toISOString(),
          remainingMinutes: Math.floor(Math.ceil((resetTime - Date.now()) / 1000) / 60)
        });
      } else {
        throw new Error('Request failed');
      }
    } else {
      const data = await response.json();
      // Handle success

      // Clear rate limit state on success
      setIsRateLimited(false);
      setRateLimitedUntil(null);
      localStorage.removeItem('weavink_export_rate_limit');
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

**Error Handling Strategy:**
1. Check if status is 429
2. Try to extract `resetTime` from response (preferred)
3. Fall back to calculating from `retryAfter` if needed
4. Store in localStorage for persistence
5. Update UI state
6. Clear error message (show timer instead)

---

### Step 7: UI Components

Render the alert and button with rate limit states.

```javascript
return (
  <div className="space-y-4">
    {/* Rate Limit Alert */}
    {isRateLimited && (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900 mb-1">
              Rate Limit Reached
            </h4>
            <p className="text-sm text-yellow-800 mb-3">
              You've reached the maximum of 3 requests per hour. This limit helps protect our servers and your data.
            </p>
            <div className="flex items-center gap-2 bg-yellow-100 rounded px-3 py-2 inline-flex">
              <Timer className="w-4 h-4 text-yellow-700" />
              <span className="text-yellow-900 font-medium text-sm">
                Available in: {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Generic Errors */}
    {error && !isRateLimited && (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    )}

    {/* Action Button */}
    <button
      onClick={handleAction}
      disabled={loading || isRateLimited}
      className={`
        w-full sm:w-auto px-6 py-3 rounded-lg font-medium
        flex items-center justify-center gap-2 transition-all
        ${isRateLimited || loading
          ? 'bg-gray-400 cursor-not-allowed text-white'
          : 'bg-blue-600 text-white hover:bg-blue-700'
        }
      `}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span>Processing...</span>
        </>
      ) : isRateLimited ? (
        <>
          <Clock className="w-5 h-5" />
          <span>Wait {formatTime(timeRemaining)}</span>
        </>
      ) : (
        <>
          <Download className="w-5 h-5" />
          <span>Perform Action</span>
        </>
      )}
    </button>
  </div>
);
```

**UI States:**
1. **Normal:** Blue button with action icon
2. **Loading:** Greyed button with spinner + "Processing..."
3. **Rate Limited:** Greyed button with Clock icon + countdown
4. **Rate Limited + Alert:** Yellow alert box above button

---

## Backend Implementation

### API Route: Return resetTime in 429 Response

Your API route must return both `resetTime` (absolute) and `retryAfter` (relative).

**File:** `/app/api/your-feature/route.js`

```javascript
import { rateLimit } from '@/lib/rateLimiter';
import { RATE_LIMITS } from '@/lib/services/constants';

export async function POST(request) {
  // ... authentication, validation ...

  const { max, window } = RATE_LIMITS.YOUR_FEATURE;

  // Apply rate limiting
  const rateLimitResult = rateLimit(userId, {
    maxRequests: max,
    windowMs: window,
    metadata: {
      eventType: 'your_feature_action',
      userId: userId,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
    }
  });

  // Handle rate limit exceeded
  if (!rateLimitResult.allowed) {
    const responsePayload = {
      error: 'Rate limit exceeded',
      message: `You can perform this action ${max} times per hour.`,
      retryAfter: rateLimitResult.retryAfter,  // Seconds (relative)
      resetTime: rateLimitResult.resetTime,     // Unix timestamp (absolute) ← KEY
      limit: {
        max: max,
        windowHours: Math.round(window / 3600000)
      }
    };

    // Log for debugging
    console.log('📤 [YourAPI] Sending 429 response:', {
      userId,
      retryAfter: rateLimitResult.retryAfter,
      resetTime: rateLimitResult.resetTime,
      resetTimeFormatted: new Date(rateLimitResult.resetTime).toISOString()
    });

    return NextResponse.json(responsePayload, {
      status: 429,
      headers: {
        'Retry-After': rateLimitResult.retryAfter.toString()  // Standard HTTP header
      }
    });
  }

  // ... normal processing ...
}
```

**429 Response Structure:**
```json
{
  "error": "Rate limit exceeded",
  "message": "You can perform this action 3 times per hour.",
  "retryAfter": 3542,        // Seconds until reset (for fallback)
  "resetTime": 1736976542000, // Unix timestamp (ms) - CRITICAL
  "limit": {
    "max": 3,
    "windowHours": 1
  }
}
```

**Why Include Both?**
- `resetTime`: Preferred, accurate, immune to clock drift
- `retryAfter`: Fallback for older clients or if resetTime missing
- Both: Maximum compatibility

---

## Complete Working Example

### Full Component Code

**Reference Implementation:** `app/dashboard/(dashboard pages)/account/components/ExportDataTab.jsx`

```javascript
'use client';

import { useState, useEffect } from 'react';
import { Download, Clock, Timer, AlertCircle } from 'lucide-react';

export default function RateLimitedFeature() {
  // Feature states
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Rate limit states
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (!rateLimitedUntil) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((rateLimitedUntil - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setIsRateLimited(false);
        setRateLimitedUntil(null);
        localStorage.removeItem('your_feature_rate_limit');
        console.log('✅ Rate limit expired');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rateLimitedUntil]);

  // Restore from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('your_feature_rate_limit');
    if (!stored) return;

    try {
      const data = JSON.parse(stored);
      if (data.resetTime && data.resetTime > Date.now()) {
        setIsRateLimited(true);
        setRateLimitedUntil(data.resetTime);
        setTimeRemaining(Math.ceil((data.resetTime - Date.now()) / 1000));
      } else {
        localStorage.removeItem('your_feature_rate_limit');
      }
    } catch (err) {
      localStorage.removeItem('your_feature_rate_limit');
    }
  }, []);

  // Multi-tab sync
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key !== 'your_feature_rate_limit') return;

      if (e.newValue) {
        const data = JSON.parse(e.newValue);
        if (data.resetTime > Date.now()) {
          setIsRateLimited(true);
          setRateLimitedUntil(data.resetTime);
          setTimeRemaining(Math.ceil((data.resetTime - Date.now()) / 1000));
        }
      } else {
        setIsRateLimited(false);
        setRateLimitedUntil(null);
        setTimeRemaining(0);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Format time helper
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Handle action
  const handleAction = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/your-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ /* your data */ })
      });

      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json();
          const resetTime = data.resetTime || (Date.now() + (data.retryAfter || 3600) * 1000);

          localStorage.setItem('your_feature_rate_limit', JSON.stringify({
            resetTime,
            limit: data.limit,
            timestamp: Date.now()
          }));

          setIsRateLimited(true);
          setRateLimitedUntil(resetTime);
          setTimeRemaining(Math.ceil((resetTime - Date.now()) / 1000));
          setError(null);
        } else {
          throw new Error('Action failed');
        }
      } else {
        const data = await response.json();
        setResult(data);
        setIsRateLimited(false);
        setRateLimitedUntil(null);
        localStorage.removeItem('your_feature_rate_limit');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-bold">Your Feature</h2>

      {/* Rate Limit Alert */}
      {isRateLimited && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900">Rate Limit Reached</h4>
              <p className="text-sm text-yellow-800 mb-2">
                You've reached the limit. Please wait before trying again.
              </p>
              <div className="flex items-center gap-2 bg-yellow-100 rounded px-3 py-2 inline-flex">
                <Timer className="w-4 h-4 text-yellow-700" />
                <span className="text-yellow-900 font-medium text-sm">
                  Available in: {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleAction}
        disabled={loading || isRateLimited}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-lg font-semibold
          transition-all duration-200
          ${isRateLimited || loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        {isRateLimited ? (
          <>
            <Timer className="w-5 h-5" />
            Wait {formatTime(timeRemaining)}
          </>
        ) : loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Perform Action
          </>
        )}
      </button>
    </div>
  );
}
```

---

## Testing Checklist

### Functional Testing

- [ ] **Test 1:** Normal action succeeds
- [ ] **Test 2:** 4th action within window triggers rate limit
- [ ] **Test 3:** Countdown timer displays and counts down
- [ ] **Test 4:** Button is disabled during rate limit
- [ ] **Test 5:** Button shows correct icon (Timer vs Action)
- [ ] **Test 6:** Alert displays with correct message
- [ ] **Test 7:** Timer format is correct (45m 32s, 1h 15m, etc.)

### Persistence Testing

- [ ] **Test 8:** Refresh page → timer state persists
- [ ] **Test 9:** Close tab, reopen → timer state restored
- [ ] **Test 10:** Wait until timer expires → localStorage cleared
- [ ] **Test 11:** Corrupt localStorage data → gracefully handled

### Multi-Tab Testing

- [ ] **Test 12:** Trigger rate limit in Tab 1 → Tab 2 updates
- [ ] **Test 13:** Timer syncs across tabs
- [ ] **Test 14:** Timer expires in Tab 1 → Tab 2 clears state

### Edge Cases

- [ ] **Test 15:** Server returns no `resetTime` → fallback works
- [ ] **Test 16:** Network error → proper error message
- [ ] **Test 17:** Negative countdown → handled (shows 0s)
- [ ] **Test 18:** System clock change → recovers gracefully

### Accessibility

- [ ] **Test 19:** Screen reader announces timer updates
- [ ] **Test 20:** Keyboard navigation works
- [ ] **Test 21:** High contrast mode displays correctly
- [ ] **Test 22:** Disabled button has proper ARIA attributes

---

## Advanced Patterns

### Pattern 1: Custom localStorage Key

Use feature-specific keys to avoid conflicts.

```javascript
const STORAGE_KEY = 'your_feature_rate_limit';
localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
```

### Pattern 2: Rate Limit Info Display

Show detailed info about the limit.

```javascript
<p className="text-xs text-gray-500 mt-2">
  {rateLimitInfo.remaining} of {rateLimitInfo.max} requests remaining
</p>
```

### Pattern 3: Progress Bar

Visual countdown representation.

```javascript
const progress = (timeRemaining / originalDuration) * 100;

<div className="w-full bg-gray-200 rounded-full h-2">
  <div
    className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
    style={{ width: `${progress}%` }}
  />
</div>
```

### Pattern 4: Notification on Expiry

Alert user when they can retry.

```javascript
if (remaining <= 0) {
  setIsRateLimited(false);
  setRateLimitedUntil(null);
  localStorage.removeItem(STORAGE_KEY);

  // Show notification
  toast.success('Rate limit expired! You can now retry.');
}
```

---

## Troubleshooting

### Issue: Timer shows wrong time

**Cause:** Using `retryAfter` (relative) instead of `resetTime` (absolute)

**Solution:** Always use `resetTime` from server response:
```javascript
const resetTime = responseData.resetTime; // ✅ Correct
const resetTime = Date.now() + retryAfter * 1000; // ❌ Inaccurate
```

### Issue: Timer doesn't persist across refreshes

**Cause:** Not storing in localStorage or storing wrong format

**Solution:** Store absolute `resetTime`:
```javascript
localStorage.setItem('key', JSON.stringify({ resetTime: 1736976542000 }));
```

### Issue: Multiple tabs out of sync

**Cause:** Not listening to storage events

**Solution:** Add storage event listener:
```javascript
window.addEventListener('storage', handleStorageChange);
```

### Issue: Timer shows negative numbers

**Cause:** Not using `Math.max(0, ...)`

**Solution:** Clamp to zero:
```javascript
const remaining = Math.max(0, Math.ceil((resetTime - now) / 1000));
```

---

## Best Practices

### DO ✅

- Use absolute timestamps (`resetTime`) not relative seconds (`retryAfter`)
- Validate localStorage data before trusting it
- Clear localStorage when timer expires
- Update immediately then every 1000ms (don't wait 1 second)
- Use `Math.max(0, ...)` to prevent negative countdowns
- Log detailed debugging info in development
- Test multi-tab synchronization
- Test page refresh persistence
- Provide clear user feedback with icons and countdown
- Use `Math.ceil()` for countdown (round up, not down)

### DON'T ❌

- Don't store relative time (`retryAfter`) in localStorage
- Don't trust localStorage without validation
- Don't update timer less than once per second (jumpy UX)
- Don't forget to cleanup intervals on unmount
- Don't show negative or NaN countdowns
- Don't block the UI while timer runs
- Don't rely on client-side time calculations for security
- Don't forget to handle 429 responses in API error handling
- Don't use `setTimeout` for countdown (use `setInterval`)
- Don't forget to test across browser tabs

---

## Related Patterns

### Consent Block Pattern

See: [CONSENT_IMPLEMENTATION_GUIDE.md](../rgpd/CONSENT_IMPLEMENTATION_GUIDE.md)

Similar greyed-out button pattern but for consent requirements:
- No countdown timer (permanent until consent granted)
- Shows "Consent required" message
- Links to consent settings page
- Uses Lock icon instead of Timer icon

### Comparison Table

| Pattern | Duration | Icon | Action | Countdown | User Control |
|---------|----------|------|--------|-----------|--------------|
| Rate Limit | Temporary (countdown) | Timer/Clock | Wait for timer | Yes | No (must wait) |
| Consent Block | Permanent | Lock/Shield | Grant consent | No | Yes (immediate) |
| Loading | Short (async op) | Spinner | Wait for completion | No | No |

---

## References

### Implementation Files
- `/app/dashboard/(dashboard pages)/account/components/ExportDataTab.jsx` - Reference implementation
- `/app/api/user/privacy/export/route.js` - API route with 429 response
- `/lib/rateLimiter.js` - Rate limiting logic
- `/lib/services/core/ApiClient.js` - API client with error handling

### Related Documentation
- [RATE_LIMIT_TESTING.md](../testing/RATE_LIMIT_TESTING.md) - Testing rate limits
- [RATE_LIMITS_COLLECTION_GUIDE_V2.md](../testing/RATE_LIMITS_COLLECTION_GUIDE_V2.md) - RateLimits Firestore collection
- [ACCOUNT_PRIVACY_TESTING_GUIDE.md](../rgpd/ACCOUNT_PRIVACY_TESTING_GUIDE.md) - Testing account & privacy features
- [CONSENT_IMPLEMENTATION_GUIDE.md](../rgpd/CONSENT_IMPLEMENTATION_GUIDE.md) - Similar greyed-out pattern for consents

### Standards & Specifications
- HTTP 429 Too Many Requests: [RFC 6585 Section 4](https://tools.ietf.org/html/rfc6585#section-4)
- `Retry-After` header: [RFC 7231 Section 7.1.3](https://tools.ietf.org/html/rfc7231#section-7.1.3)
- Web Storage API: [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- Storage Events: [MDN storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)

---

## Changelog

### Version 1.0 (2025-11-18)
- Initial documentation created
- Based on ExportDataTab.jsx implementation
- Covers countdown timer, localStorage persistence, multi-tab sync
- Complete working example provided
- 22 test cases documented
- Troubleshooting guide included

---

**Document Status:** Active
**Last Updated:** 2025-11-18
**Maintainer:** Development Team
**Feedback:** Submit issues or improvements via PR
