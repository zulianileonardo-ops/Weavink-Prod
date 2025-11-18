---
id: testing-rate-limits-collection-v2-038
title: Rate Limits Collection Guide V2
category: testing
tags: [rate-limiting, security, monitoring, firestore, logging, security-events, bot-detection]
status: active
created: 2025-11-18
updated: 2025-11-18
version: 2.0.0
replaces: RATE_LIMITS_COLLECTION_GUIDE_V1_DEPRECATED.md
related:
  - BOT_DETECTION_FIX_V2.md
  - ANALYTICS_IMPLEMENTATION_GUIDE.md
  - RATE_LIMIT_TESTING.md
---

# RateLimits Collection - Complete Reference Guide V2

## 📋 1. Overview & Purpose

The `RateLimits` Firestore collection serves as an **abnormal activity detection and logging system** that captures rate limit violations across all application endpoints.

### What It Does
- **Detects bot attacks** using multi-threshold analysis (200ms, 500ms, 1s windows)
- **Identifies legitimate bursts** from real users at events/conventions
- **Monitors abuse patterns** across analytics, privacy, and application operations
- **Maintains security** while minimizing false positives through sophisticated fingerprinting

### Critical Understanding
**Normal, successful requests are NOT logged here.** This collection ONLY captures entries when:
1. Rate limits are exceeded (scenarios: `rate_limit_exceeded` or `bot_attack`)
2. Burst allowance is first used (scenario: `convention_burst`)

Standard usage is tracked in the `Analytics` collection instead.

### When Entries Are Created

Entries are created using a **fire-and-forget pattern** (non-blocking) in two situations:

**Situation 1: Rate Limit Exceeded** (`lib/rateLimiter.js:149-169`)
- Triggered when `recentRequests.length >= effectiveLimit`
- Logs either `bot_attack` (HIGH severity) or `rate_limit_exceeded` (MEDIUM severity)
- Request is blocked with 429 status code

**Situation 2: Convention Burst** (`lib/rateLimiter.js:193-212`)
- Triggered when burst allowance is first consumed in a time window
- Logs `convention_burst` (LOW severity)
- Request is allowed (not blocked)
- Only logged once per window when burst transitions from 0 to >0

### Related Documentation
- **Implementation:** `lib/rateLimiter.js`
- **Testing:** `documentation/testing/RATE_LIMIT_TESTING.md`
- **Archived V1:** `documentation/testing/archive/RATE_LIMITS_COLLECTION_GUIDE_V1_DEPRECATED.md`

---

## 🗄️ 2. Collection Schema Reference

### Firestore Path
```
/RateLimits/{documentId}
```

### Complete Field Reference

| Field Name | Type | Always Present | Description | Example Value | Code Reference |
|------------|------|----------------|-------------|---------------|----------------|
| `timestamp` | Timestamp | ✅ Yes | Firestore Timestamp object of when event occurred | `Timestamp(2025-11-18T19:12:07Z)` | `rateLimiter.js:63` |
| `createdAt` | string | ✅ Yes | ISO 8601 timestamp string for easy querying | `"2025-11-18T19:12:07.983Z"` | `rateLimiter.js:64` |
| `scenario` | string | ✅ Yes | Event classification: `convention_burst`, `rate_limit_exceeded`, or `bot_attack` | `"rate_limit_exceeded"` | Caller determines |
| `fingerprint` | string | ✅ Yes | SHA-256 hash (16 chars) of IP + UserAgent + SessionID + Salt | `"a3f4b2c1d5e6f7a8"` | `rateLimiter.js:39-50` |
| `eventType` | string | ✅ Yes | Type of rate-limited operation (see Section 3) | `"data_export_request"` | Caller provides |
| `userId` | string \| null | ✅ Yes | User ID if authenticated, otherwise null | `"26v4uXMAk8c6rfLlcWKRZpE1sPC3"` | Caller provides |
| `ip` | string | ✅ Yes | IP address of request origin | `"::1"` or `"192.168.1.100"` | Caller provides |
| `userAgent` | string | ✅ Yes | User agent string from request headers | `"Mozilla/5.0..."` | Caller provides |
| `severity` | string | ✅ Yes | Severity level: `LOW`, `MEDIUM`, or `HIGH` | `"MEDIUM"` | `rateLimiter.js:165` |
| `windowMs` | number | ✅ Yes | Rate limit time window in milliseconds | `3600000` (1 hour) | Config-based |
| `requestCount` | number | ✅ Yes | Total requests in current window (including current) | `8` | `rateLimiter.js:156` or `201` |
| `burstUsed` | number | ✅ Yes | Amount of burst allowance consumed | `0` or `1` or `3` | Calculated |
| `timeSinceFirstRequest` | number | ✅ Yes | Milliseconds since first request in window | `6176` | `rateLimiter.js:164` or `206` |
| `effectiveLimit` | number | ⚠️ Bot/Exceeded Only | Calculated limit (maxRequests + burst - burstUsed) | `5` | `rateLimiter.js:157` |
| `requestsInLastSecond` | number | ⚠️ Bot/Exceeded Only | Requests in last 1000ms (including current) | `3` | `rateLimiter.js:159` |
| `requestsInLast500ms` | number | ⚠️ Bot/Exceeded Only | Requests in last 500ms (including current) | `2` | `rateLimiter.js:160` |
| `requestsInLast200ms` | number | ⚠️ Bot/Exceeded Only | Requests in last 200ms (including current) | `1` | `rateLimiter.js:161` |
| `requestRate` | string | ⚠️ Bot/Exceeded Only | Formatted requests per second (e.g., "3.03") | `"3.03"` | `rateLimiter.js:162` |
| `maxRequests` | number | ⚠️ Burst Only | Base limit without burst allowance | `10` | `rateLimiter.js:202` |
| `burstAllowance` | number | ⚠️ Burst Only | Total burst capacity available | `3` | `rateLimiter.js:203` |
| `note` | string | ⚠️ Burst Only | Explanatory note for burst events | `"Legitimate burst usage detected..."` | `rateLimiter.js:208` |

### Field Presence Matrix

| Scenario | Always Present Fields | Scenario-Specific Fields |
|----------|----------------------|-------------------------|
| `convention_burst` | All common fields + `windowMs`, `requestCount`, `burstUsed`, `timeSinceFirstRequest` | `maxRequests`, `burstAllowance`, `note` |
| `rate_limit_exceeded` | All common fields + `windowMs`, `requestCount`, `burstUsed`, `timeSinceFirstRequest` | `effectiveLimit`, `requestsInLastSecond`, `requestsInLast500ms`, `requestsInLast200ms`, `requestRate` |
| `bot_attack` | All common fields + `windowMs`, `requestCount`, `burstUsed`, `timeSinceFirstRequest` | `effectiveLimit`, `requestsInLastSecond`, `requestsInLast500ms`, `requestsInLast200ms`, `requestRate` |

---

## 🎯 3. Supported Event Types

### 3.1 Analytics Events (3 types)

**Configuration Source:** `lib/services/serviceUser/constants/analyticsConstants.js:8-38`

| Event Type | Max Requests | Window | Burst Allowance | Effective Limit | Use Case | API Reference |
|------------|--------------|--------|-----------------|-----------------|----------|---------------|
| `view` | 3 | 60,000ms (1 min) | 1 | 4 | Profile view tracking | `app/api/user/analytics/track-event/route.js:148` |
| `click` | 10 | 10,000ms (10 sec) | 3 | 13 | Click event tracking | `app/api/user/analytics/track-event/route.js:148` |
| `time_on_profile` | 60 | 60,000ms (1 min) | 10 | 70 | Time spent tracking | `app/api/user/analytics/track-event/route.js:148` |

**Code Definition:**
```javascript
// lib/services/serviceUser/constants/analyticsConstants.js:8-14
export const ANALYTICS_EVENT_TYPES = {
  VIEW: 'view',
  CLICK: 'click',
  TIME_ON_PROFILE: 'time_on_profile',
  SHARE: 'share',
  CONTACT_EXCHANGE: 'contact_exchange'
};

// lib/services/serviceUser/constants/analyticsConstants.js:16-38
export const RATE_LIMIT_CONFIG = {
  view: { maxRequests: 3, windowMs: 60000, burstAllowance: 1 },
  click: { maxRequests: 10, windowMs: 10000, burstAllowance: 3 },
  time_on_profile: { maxRequests: 60, windowMs: 60000, burstAllowance: 10 }
};
```

### 3.2 Privacy Events (8 types)

**Configuration Source:** `lib/services/servicePrivacy/constants/privacyConstants.js:168-185`

| Event Type | Max Requests | Window | Use Case | API Reference |
|------------|--------------|--------|----------|---------------|
| `data_export_request` | 3 | 3,600,000ms (1 hour) | User requests data export | `app/api/user/privacy/export/route.js:145` |
| `data_export_status` | 10 | 60,000ms (1 min) | Check export status | `app/api/user/privacy/export/route.js:52` |
| `account_deletion_request` | 2 | 3,600,000ms (1 hour) | User requests account deletion | `app/api/user/privacy/delete-account/route.js:106` |
| `consent_read` | 30 | 60,000ms (1 min) | Read consent settings | `app/api/user/privacy/consent/route.js:50` |
| `consent_update` | 20 | 60,000ms (1 min) | Update consent preferences | `app/api/user/privacy/consent/route.js:125` |
| `consent_batch_update` | 20 | 60,000ms (1 min) | Batch update consents | `app/api/user/privacy/consent/route.js:222` |
| `consent_withdraw` | 20 | 60,000ms (1 min) | Withdraw specific consent | `app/api/user/privacy/consent/route.js:314` |
| `cookie_consent_update` | Custom | Custom | Update cookie preferences | `app/api/user/privacy/cookies/route.js:31` |

**Code Example:**
```javascript
// app/api/user/privacy/export/route.js:140-159
const rateLimitResult = await rateLimit({
  fingerprint: generateFingerprint({
    ip: userIp,
    userAgent: req.headers.get('user-agent') || 'unknown',
    sessionId: sessionToken || 'no_session',
    salt: 'data_export_request'
  }),
  eventType: 'data_export_request',
  userId: session.user.uid,
  ip: userIp,
  userAgent: req.headers.get('user-agent') || 'unknown',
  maxRequests: PRIVACY_RATE_LIMITS.DATA_EXPORT_REQUEST.MAX_REQUESTS,
  windowMs: PRIVACY_RATE_LIMITS.DATA_EXPORT_REQUEST.WINDOW_MS,
  burstAllowance: 0
});
```

### 3.3 Application Events (10 types)

| Event Type | Max Requests | Window | Use Case | API Reference |
|------------|--------------|--------|----------|---------------|
| `contact_submit_public` | 5 | 60,000ms (1 min) | Public contact form submission | `app/api/contacts/submit/route.js:176` |
| `contacts_share` | Custom | Custom | Share contact info | `app/api/user/contacts/share/route.js:200` |
| `contacts_share_info` | Custom | Custom | Get share info | `app/api/user/contacts/share/route.js:351` |
| `settings_read` | Custom | Custom | Read user settings | `app/api/user/settings/route.js:19` |
| `settings_update` | Custom | Custom | Update user settings | `app/api/user/settings/route.js:60` |
| `links_read` | Custom | Custom | Read user links | `app/api/user/links/route.js:19` |
| `links_update` | Custom | Custom | Update user links | `app/api/user/links/route.js:56` |
| `tutorial_complete` | 5 | 60,000ms (1 min) | Complete tutorial step | `app/api/tutorial/complete/route.js:68` |
| `tutorial_progress` | Custom | Custom | Update tutorial progress | `app/api/tutorial/progress/route.js:70` |
| `tutorial_skip` | Custom | Custom | Skip tutorial step | `app/api/tutorial/skip/route.js:65` |
| `onboarding_complete` | 5 | 60,000ms (1 min) | Complete onboarding | `app/api/onboarding/complete/route.js:27` |
| `rules_group_generation` | Custom | Custom | Generate rules-based grouping | `app/api/user/contacts/generate-rules-based/route.js:76` |

**Total Event Types: 21**

---

## 🔍 4. Scenario Classification Logic

### 4.1 Decision Tree

```
Incoming Request
    │
    ├─ Calculate: recentRequests.length >= effectiveLimit?
    │
    ├─ NO: Rate limit not exceeded
    │   │
    │   └─ Check: Is burst being used? (requestCount >= maxRequests)
    │       │
    │       ├─ YES: Is this the FIRST time burst is used? (!wasBurstUsedBefore && burstUsed > 0)
    │       │   │
    │       │   ├─ YES → Log 'convention_burst' (LOW severity) + ALLOW REQUEST
    │       │   └─ NO → ALLOW REQUEST (no logging)
    │       │
    │       └─ NO → ALLOW REQUEST (no logging)
    │
    └─ YES: Rate limit exceeded
        │
        └─ Evaluate bot detection criteria (4 thresholds)
            │
            ├─ Bot detected → Log 'bot_attack' (HIGH severity) + BLOCK REQUEST (429)
            └─ Not a bot → Log 'rate_limit_exceeded' (MEDIUM severity) + BLOCK REQUEST (429)
```

### 4.2 Scenario Details

#### Scenario 1: `convention_burst` (Severity: LOW)

**Code Reference:** `lib/rateLimiter.js:189-212`

**Trigger Conditions:**
```javascript
// Line 189: Check if base limit exceeded
if (recentRequests.length >= maxRequests) {
  // Line 193: Check if this is FIRST use of burst in this window
  if (!wasBurstUsedBefore && record.burstUsed > 0) {
    // Log convention_burst
  }
}
```

**What It Means:**
User exceeded base limit but is within allowed burst capacity for the FIRST time in the current time window.

**Typical Pattern:**
- 10-13 requests over 2-5 seconds
- Legitimate rapid interactions at networking events, conferences, meetups
- Request is **ALLOWED** (not blocked)
- Only logs once per window when burst transitions from 0 to >0

**Example Document:**
```javascript
{
  scenario: 'convention_burst',
  fingerprint: 'a3f4b2c1d5e6f7a8',
  eventType: 'click',
  userId: 'user_abc123',
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0...)',
  severity: 'LOW',
  windowMs: 10000,
  requestCount: 11,
  maxRequests: 10,          // ← Only in convention_burst
  burstAllowance: 3,        // ← Only in convention_burst
  burstUsed: 1,
  timeSinceFirstRequest: 2500,
  note: 'Legitimate burst usage detected - likely convention/event scenario',  // ← Only in convention_burst
  timestamp: Timestamp(...),
  createdAt: '2025-11-18T...'
}
```

**Action Required:** ✅ None - this is expected behavior

---

#### Scenario 2: `rate_limit_exceeded` (Severity: MEDIUM)

**Code Reference:** `lib/rateLimiter.js:132-169`

**Trigger Conditions:**
```javascript
// Line 132: Check if effective limit exceeded
if (recentRequests.length >= effectiveLimit) {
  // Lines 136-144: Check bot detection criteria
  const isBotAttack = requestsInLastSecond >= 5 ||
                     requestsInLast500ms >= 4 ||
                     requestsInLast200ms >= 3 ||
                     requestRate > 8;

  // Line 146: If NOT a bot attack
  if (!isBotAttack) {
    // Log rate_limit_exceeded with MEDIUM severity
  }
}
```

**What It Means:**
User exceeded effective limit (base + burst) but request pattern doesn't match automated bot criteria.

**Typical Pattern:**
- Exceeded limit but not rapidly enough to trigger bot detection
- Could be enthusiastic user, browser pre-fetching, or mild abuse
- Request is **BLOCKED** (429 status code)

**Example Document:**
```javascript
{
  scenario: 'rate_limit_exceeded',
  fingerprint: 'b2c3d4e5f6a7b8c9',
  eventType: 'view',
  userId: 'user_xyz789',
  ip: '10.0.0.50',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
  severity: 'MEDIUM',
  windowMs: 10000,
  requestCount: 15,
  effectiveLimit: 13,           // ← Only in bot_attack/rate_limit_exceeded
  burstUsed: 3,
  requestsInLastSecond: 3,      // ← Only in bot_attack/rate_limit_exceeded
  requestsInLast500ms: 2,       // ← Only in bot_attack/rate_limit_exceeded
  requestsInLast200ms: 1,       // ← Only in bot_attack/rate_limit_exceeded
  requestRate: '3.03',          // ← Only in bot_attack/rate_limit_exceeded
  timeSinceFirstRequest: 8000,
  timestamp: Timestamp(...),
  createdAt: '2025-11-18T...'
}
```

**Action Required:** ⚠️ Monitor - if same fingerprint appears frequently, investigate

---

#### Scenario 3: `bot_attack` (Severity: HIGH)

**Code Reference:** `lib/rateLimiter.js:136-169`

**Trigger Conditions:**
```javascript
// Lines 136-144: Bot detection criteria (ANY ONE triggers HIGH severity)
const isBotAttack = requestsInLastSecond >= 5 ||     // 5+ requests in 1 second
                   requestsInLast500ms >= 4 ||      // 4+ requests in 500ms
                   requestsInLast200ms >= 3 ||      // 3+ requests in 200ms
                   requestRate > 8;                 // Average rate > 8 req/sec

if (isBotAttack) {
  // Line 165: Log with HIGH severity
  scenario: 'bot_attack',
  severity: 'HIGH'
}
```

**What It Means:**
Request pattern matches automated scraping, bot attack, or malicious automation.

**Typical Pattern:**
- Meets one or more bot detection thresholds
- Often has suspicious user agent (python-requests, curl, scrapers)
- May come from datacenter IPs or VPNs
- Far exceeds reasonable human usage
- Request is **BLOCKED** (429 status code)

**Example Document:**
```javascript
{
  scenario: 'bot_attack',
  fingerprint: 'c4d5e6f7a8b9c0d1',
  eventType: 'data_export_request',
  userId: '26v4uXMAk8c6rfLlcWKRZpE1sPC3',
  ip: '::1',
  userAgent: 'python-requests/2.28.1',
  severity: 'HIGH',
  windowMs: 3600000,
  requestCount: 50,
  effectiveLimit: 5,
  burstUsed: 0,
  requestsInLastSecond: 15,     // 🚨 Triggers bot detection (≥5 threshold)
  requestsInLast500ms: 8,       // 🚨 Triggers bot detection (≥4 threshold)
  requestsInLast200ms: 5,       // 🚨 Triggers bot detection (≥3 threshold)
  requestRate: '12.50',         // 🚨 Triggers bot detection (>8 threshold)
  timeSinceFirstRequest: 1200,
  timestamp: Timestamp(...),
  createdAt: '2025-11-18T19:12:07Z'
}
```

**Action Required:** 🚨 Investigate immediately
1. Check if IP is from known datacenter/VPN
2. Look for patterns (same fingerprint across multiple users/events)
3. Consider blocking if persistent (>5 occurrences in 1 hour)
4. Review firewall rules and consider geographic restrictions

---

## 🤖 5. Bot Detection System

### 5.1 Critical Feature: Include Current Request

**Code Reference:** `lib/rateLimiter.js:102-109`

```javascript
// ✅ BOT DETECTION: Add current request temporarily to check patterns
// This ensures we catch rapid bursts INCLUDING the current request
const allRequestsWithCurrent = [...recentRequests, now];

// Calculate bot detection metrics on ALL requests (including current)
const requestsInLastSecond = allRequestsWithCurrent.filter(timestamp => now - timestamp < 1000).length;
const requestsInLast500ms = allRequestsWithCurrent.filter(timestamp => now - timestamp < 500).length;
const requestsInLast200ms = allRequestsWithCurrent.filter(timestamp => now - timestamp < 200).length;
```

**Why This Matters:**
Adding the current request BEFORE calculating metrics ensures rapid bursts are detected immediately rather than one request too late. This prevents attackers from getting one extra request through on each burst.

### 5.2 Request Rate Calculation

**Code Reference:** `lib/rateLimiter.js:111-119`

```javascript
let requestRate = 0;
if (requestsInLastSecond > 0) {
    const recentBurst = allRequestsWithCurrent.filter(timestamp => now - timestamp < 1000);
    if (recentBurst.length > 1) {
        const burstTimeSpan = now - recentBurst[0];
        requestRate = burstTimeSpan > 0 ? (recentBurst.length / burstTimeSpan) * 1000 : 0;
    }
}
```

**Formula:**
`requestRate = (numberOfRequestsInBurst / timeSpanInMs) * 1000`

**Example:**
If 10 requests occur over 800ms: `(10 / 800) * 1000 = 12.5 requests/second`

### 5.3 Four-Threshold Detection

**Code Reference:** `lib/rateLimiter.js:136-144`

```javascript
// Bot attack detection criteria (any of these indicates bot):
// 1. 5+ requests in last 1 second
// 2. 4+ requests in last 500ms
// 3. 3+ requests in last 200ms (very rapid)
// 4. Average rate > 8 requests/second in the recent burst
const isBotAttack = requestsInLastSecond >= 5 ||
                   requestsInLast500ms >= 4 ||
                   requestsInLast200ms >= 3 ||
                   requestRate > 8;
```

### 5.4 Exact Thresholds Table

| Detection Method | Threshold | Purpose | Time Window | Code Line |
|------------------|-----------|---------|-------------|-----------|
| `requestsInLastSecond` | **≥ 5** | Catch fast bots (100-200ms intervals) | 1000ms | `rateLimiter.js:142` |
| `requestsInLast500ms` | **≥ 4** | Catch very fast bots (~125ms intervals) | 500ms | `rateLimiter.js:143` |
| `requestsInLast200ms` | **≥ 3** | Catch extremely rapid bots (~67ms intervals) | 200ms | `rateLimiter.js:144` |
| `requestRate` | **> 8** | Catch sustained high-rate attacks | Dynamic (last 1s) | `rateLimiter.js:144` |

**Important:** ANY single threshold being met triggers `bot_attack` scenario with HIGH severity.

### 5.5 Attack Pattern Examples

| Attack Type | Pattern | Detected By | Example Values |
|-------------|---------|-------------|----------------|
| **Slow Bot** | 5 requests at 200ms intervals (1 second total) | `requestsInLastSecond ≥ 5` | `requestsInLastSecond: 5` |
| **Fast Bot** | 4 requests at 125ms intervals (500ms total) | `requestsInLast500ms ≥ 4` | `requestsInLast500ms: 4` |
| **Rapid Bot** | 3 requests at 50ms intervals (150ms total) | `requestsInLast200ms ≥ 3` | `requestsInLast200ms: 3` |
| **Sustained Attack** | 10 requests over 800ms | `requestRate > 8` | `requestRate: "12.50"` |
| **Burst Attack** | 20 requests at 10ms intervals (200ms total) | All thresholds | All values trigger |

---

## 🔐 6. Fingerprinting System

### 6.1 Multi-Factor Fingerprint Generation

**Code Reference:** `lib/rateLimiter.js:39-50`

```javascript
export function generateFingerprint({ ip, userAgent, sessionId, salt = 'default_salt' }) {
    // Create a composite key from multiple factors
    const factors = [
        ip || 'unknown_ip',
        userAgent ? crypto.createHash('md5').update(userAgent).digest('hex').substring(0, 8) : 'unknown_ua',
        sessionId || 'no_session',
        salt
    ].join('::');

    // Hash the composite key for privacy
    return crypto.createHash('sha256').update(factors).digest('hex').substring(0, 16);
}
```

### 6.2 Fingerprint Components

| Component | Processing | Purpose | Example |
|-----------|------------|---------|---------|
| **IP Address** | Raw value or 'unknown_ip' | Primary identifier | `"192.168.1.100"` |
| **User Agent** | MD5 hash (first 8 chars) or 'unknown_ua' | Device/browser fingerprint | `"a1b2c3d4"` (from full UA hash) |
| **Session ID** | Raw value or 'no_session' | Session-level tracking | `"abc123xyz"` |
| **Salt** | Event-specific string | Separate limits per event type | `"analytics_view"` |

**Composite String Format:**
`{ip}::{userAgent_hash_8chars}::{sessionId}::{salt}`

**Example:**
`"192.168.1.100::a1b2c3d4::abc123xyz::analytics_view"`

**Final Hash:**
SHA-256 of composite string, truncated to first 16 characters

**Result:**
`"a3f4b2c1d5e6f7a8"` (16-character hex string)

### 6.3 Privacy Considerations

**Hashing Strategy:**
1. User Agent is pre-hashed with MD5 before inclusion in composite
2. Entire composite is hashed with SHA-256
3. Final hash is truncated to 16 characters
4. **Result:** Cannot reverse engineer IP or User Agent from fingerprint

**Salt Usage:**
- Different salts for different event types prevent correlation
- Example: Same user has different fingerprints for `view` vs `data_export_request`
- Prevents cross-event tracking while maintaining per-event rate limiting

### 6.4 Shared IP Handling

**Problem:** Multiple users at an event share the same public IP

**Solution:** Multi-factor fingerprinting
- IP alone doesn't determine fingerprint
- Different devices have different User Agents
- Different sessions have different Session IDs
- Result: Users at same IP get unique fingerprints

**Example at Conference:**
```
User A: IP=10.0.0.1, UA=iPhone, SessionID=sess_a → Fingerprint=abc123...
User B: IP=10.0.0.1, UA=Android, SessionID=sess_b → Fingerprint=def456...
User C: IP=10.0.0.1, UA=Chrome, SessionID=sess_c → Fingerprint=ghi789...
```

All three users have different fingerprints despite sharing an IP.

---

## 📊 7. Monitoring Queries

### 7.1 By Scenario

#### Query: All Bot Attacks (Last 24 Hours)
```javascript
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

const botAttacks = await adminDb.collection('RateLimits')
  .where('scenario', '==', 'bot_attack')
  .where('timestamp', '>=', yesterday)
  .orderBy('timestamp', 'desc')
  .get();

console.log(`Found ${botAttacks.size} bot attacks in last 24 hours`);

// Analyze patterns
botAttacks.forEach(doc => {
  const data = doc.data();
  console.log(`- ${data.eventType}: ${data.requestsInLastSecond} req/sec from ${data.ip}`);
});
```

**Expected Output:**
```
Found 3 bot attacks in last 24 hours
- data_export_request: 15 req/sec from ::1
- view: 12 req/sec from 203.0.113.42
- click: 8 req/sec from 198.51.100.10
```

#### Query: Convention Bursts (Last 7 Days)
```javascript
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const bursts = await adminDb.collection('RateLimits')
  .where('scenario', '==', 'convention_burst')
  .where('timestamp', '>=', lastWeek)
  .get();

console.log(`${bursts.size} legitimate burst events in last week`);

// Analyze if burst allowance is appropriate
const eventTypeCounts = {};
bursts.forEach(doc => {
  const type = doc.data().eventType;
  eventTypeCounts[type] = (eventTypeCounts[type] || 0) + 1;
});

console.log('Burst events by type:', eventTypeCounts);
```

**Expected Output:**
```
15 legitimate burst events in last week
Burst events by type: { click: 10, view: 5, time_on_profile: 0 }
```

#### Query: Rate Limit Exceeded (Last Hour)
```javascript
const lastHour = new Date(Date.now() - 60 * 60 * 1000);

const exceeded = await adminDb.collection('RateLimits')
  .where('scenario', '==', 'rate_limit_exceeded')
  .where('timestamp', '>=', lastHour)
  .orderBy('timestamp', 'desc')
  .get();

console.log(`${exceeded.size} rate limit exceeded events in last hour`);

// Check for repeat offenders
const fingerprintCounts = {};
exceeded.forEach(doc => {
  const fp = doc.data().fingerprint;
  fingerprintCounts[fp] = (fingerprintCounts[fp] || 0) + 1;
});

Object.entries(fingerprintCounts)
  .filter(([fp, count]) => count >= 3)
  .forEach(([fp, count]) => {
    console.log(`⚠️ Fingerprint ${fp} triggered ${count} times`);
  });
```

### 7.2 By Severity

#### Query: All High Severity Events (Last 7 Days)
```javascript
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const highSeverity = await adminDb.collection('RateLimits')
  .where('severity', '==', 'HIGH')
  .where('timestamp', '>=', lastWeek)
  .orderBy('timestamp', 'desc')
  .get();

console.log(`${highSeverity.size} HIGH severity events in last week`);

// Group by event type
const byEventType = {};
highSeverity.forEach(doc => {
  const data = doc.data();
  const key = data.eventType;
  if (!byEventType[key]) byEventType[key] = [];
  byEventType[key].push({
    ip: data.ip,
    requestRate: data.requestRate,
    timestamp: data.timestamp.toDate()
  });
});

Object.entries(byEventType).forEach(([type, events]) => {
  console.log(`\n${type}: ${events.length} attacks`);
  events.slice(0, 3).forEach(e => {
    console.log(`  - ${e.timestamp.toISOString()}: ${e.requestRate} req/sec from ${e.ip}`);
  });
});
```

#### Query: Medium Severity Requiring Investigation
```javascript
const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

const mediumSeverity = await adminDb.collection('RateLimits')
  .where('severity', '==', 'MEDIUM')
  .where('timestamp', '>=', last24Hours)
  .get();

// Find fingerprints with ≥5 MEDIUM events in 24h
const fingerprintCounts = {};
mediumSeverity.forEach(doc => {
  const fp = doc.data().fingerprint;
  fingerprintCounts[fp] = (fingerprintCounts[fp] || 0) + 1;
});

const investigate = Object.entries(fingerprintCounts)
  .filter(([fp, count]) => count >= 5)
  .sort(([, a], [, b]) => b - a);

console.log(`Found ${investigate.length} fingerprints requiring investigation:`);
investigate.forEach(([fp, count]) => {
  console.log(`- ${fp}: ${count} MEDIUM events in 24h`);
});
```

### 7.3 By Event Type

#### Query: Analytics Events (View)
```javascript
const lastHour = new Date(Date.now() - 60 * 60 * 1000);

const viewEvents = await adminDb.collection('RateLimits')
  .where('eventType', '==', 'view')
  .where('timestamp', '>=', lastHour)
  .get();

console.log(`${viewEvents.size} view rate limit events in last hour`);

// Breakdown by scenario
const byScenario = { convention_burst: 0, rate_limit_exceeded: 0, bot_attack: 0 };
viewEvents.forEach(doc => {
  byScenario[doc.data().scenario]++;
});

console.log('Breakdown:', byScenario);
```

#### Query: Privacy Events (Data Export)
```javascript
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const exportEvents = await adminDb.collection('RateLimits')
  .where('eventType', '==', 'data_export_request')
  .where('timestamp', '>=', lastWeek)
  .orderBy('timestamp', 'desc')
  .get();

console.log(`${exportEvents.size} data export rate limit events in last week`);

exportEvents.forEach(doc => {
  const data = doc.data();
  console.log(`- ${data.scenario} (${data.severity}): User ${data.userId} @ ${data.timestamp.toDate().toISOString()}`);
  console.log(`  Requests: ${data.requestCount}, Rate: ${data.requestRate || 'N/A'}, IP: ${data.ip}`);
});
```

**Expected Output:**
```
2 data export rate limit events in last week
- bot_attack (HIGH): User 26v4uXMAk8c6rfLlcWKRZpE1sPC3 @ 2025-11-18T19:12:07Z
  Requests: 8, Rate: 3.03, IP: ::1
- rate_limit_exceeded (MEDIUM): User abc123xyz @ 2025-11-15T14:30:22Z
  Requests: 5, Rate: 2.15, IP: 192.168.1.50
```

#### Query: All Privacy Events
```javascript
const privacyEventTypes = [
  'data_export_request',
  'data_export_status',
  'account_deletion_request',
  'consent_read',
  'consent_update',
  'consent_batch_update',
  'consent_withdraw',
  'cookie_consent_update'
];

const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const privacyEvents = await adminDb.collection('RateLimits')
  .where('eventType', 'in', privacyEventTypes.slice(0, 10)) // Firestore 'in' limit is 10
  .where('timestamp', '>=', lastWeek)
  .get();

const byType = {};
privacyEvents.forEach(doc => {
  const type = doc.data().eventType;
  byType[type] = (byType[type] || 0) + 1;
});

console.log('Privacy event rate limits (last week):', byType);
```

#### Query: Application Events (Tutorial & Onboarding)
```javascript
const appEventTypes = [
  'tutorial_complete',
  'tutorial_progress',
  'tutorial_skip',
  'onboarding_complete'
];

const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

for (const eventType of appEventTypes) {
  const events = await adminDb.collection('RateLimits')
    .where('eventType', '==', eventType)
    .where('timestamp', '>=', lastWeek)
    .get();

  console.log(`${eventType}: ${events.size} rate limit events`);
}
```

### 7.4 By User/Fingerprint

#### Query: Rate Limits for Specific User
```javascript
const userId = 'user_abc123';
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const userEvents = await adminDb.collection('RateLimits')
  .where('userId', '==', userId)
  .where('timestamp', '>=', lastWeek)
  .orderBy('timestamp', 'desc')
  .get();

console.log(`User ${userId}: ${userEvents.size} rate limit events in last week`);

userEvents.forEach(doc => {
  const data = doc.data();
  console.log(`- ${data.eventType} [${data.scenario}] ${data.severity}: ${data.timestamp.toDate().toISOString()}`);
});
```

#### Query: Most Frequent Attackers (Top 10)
```javascript
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const attacks = await adminDb.collection('RateLimits')
  .where('severity', '==', 'HIGH')
  .where('timestamp', '>=', lastWeek)
  .get();

const fingerprintData = {};
attacks.forEach(doc => {
  const data = doc.data();
  const fp = data.fingerprint;

  if (!fingerprintData[fp]) {
    fingerprintData[fp] = {
      count: 0,
      eventTypes: new Set(),
      ips: new Set(),
      userIds: new Set()
    };
  }

  fingerprintData[fp].count++;
  fingerprintData[fp].eventTypes.add(data.eventType);
  fingerprintData[fp].ips.add(data.ip);
  if (data.userId) fingerprintData[fp].userIds.add(data.userId);
});

const sorted = Object.entries(fingerprintData)
  .sort(([, a], [, b]) => b.count - a.count)
  .slice(0, 10);

console.log('Top 10 attackers (last week):');
sorted.forEach(([fp, data], index) => {
  console.log(`${index + 1}. ${fp}:`);
  console.log(`   - ${data.count} attacks`);
  console.log(`   - Event types: ${Array.from(data.eventTypes).join(', ')}`);
  console.log(`   - IPs: ${Array.from(data.ips).join(', ')}`);
  console.log(`   - User IDs: ${Array.from(data.userIds).join(', ') || 'None'}`);
});
```

#### Query: Fingerprint History
```javascript
const fingerprint = 'a3f4b2c1d5e6f7a8';
const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const history = await adminDb.collection('RateLimits')
  .where('fingerprint', '==', fingerprint)
  .where('timestamp', '>=', lastMonth)
  .orderBy('timestamp', 'asc')
  .get();

console.log(`Fingerprint ${fingerprint} history (last 30 days):`);
console.log(`Total events: ${history.size}\n`);

// Timeline
history.forEach(doc => {
  const data = doc.data();
  const date = data.timestamp.toDate();
  console.log(`[${date.toISOString()}] ${data.scenario.toUpperCase()} (${data.severity})`);
  console.log(`  Event: ${data.eventType}, IP: ${data.ip}, User: ${data.userId || 'N/A'}`);
  console.log(`  Rate: ${data.requestRate || 'N/A'} req/sec, Requests: ${data.requestCount}\n`);
});

// Pattern analysis
const scenarios = { convention_burst: 0, rate_limit_exceeded: 0, bot_attack: 0 };
history.forEach(doc => scenarios[doc.data().scenario]++);

console.log('Pattern summary:', scenarios);
if (scenarios.bot_attack >= 3) {
  console.log('🚨 RECOMMENDATION: Consider blocking this fingerprint');
} else if (scenarios.rate_limit_exceeded >= 10) {
  console.log('⚠️ RECOMMENDATION: Investigate - persistent medium-severity activity');
} else {
  console.log('✅ Activity appears within acceptable range');
}
```

### 7.5 Time-Based Analysis

#### Query: Peak Attack Times (Hourly Distribution)
```javascript
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const attacks = await adminDb.collection('RateLimits')
  .where('scenario', '==', 'bot_attack')
  .where('timestamp', '>=', lastWeek)
  .get();

const hourCounts = Array(24).fill(0);
attacks.forEach(doc => {
  const hour = doc.data().timestamp.toDate().getHours();
  hourCounts[hour]++;
});

console.log('Attack distribution by hour (UTC):');
hourCounts.forEach((count, hour) => {
  const bar = '█'.repeat(count);
  console.log(`${hour.toString().padStart(2, '0')}:00 | ${bar} (${count})`);
});

// Find peak hours
const peak = hourCounts.indexOf(Math.max(...hourCounts));
console.log(`\nPeak attack time: ${peak}:00 UTC with ${hourCounts[peak]} attacks`);
```

#### Query: Daily Trends (Last 30 Days)
```javascript
const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const allEvents = await adminDb.collection('RateLimits')
  .where('timestamp', '>=', last30Days)
  .get();

const dailyCounts = {};
allEvents.forEach(doc => {
  const data = doc.data();
  const date = data.timestamp.toDate().toISOString().split('T')[0]; // YYYY-MM-DD

  if (!dailyCounts[date]) {
    dailyCounts[date] = { total: 0, bot_attack: 0, rate_limit_exceeded: 0, convention_burst: 0 };
  }

  dailyCounts[date].total++;
  dailyCounts[date][data.scenario]++;
});

console.log('Daily rate limit events (last 30 days):');
Object.entries(dailyCounts)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([date, counts]) => {
    console.log(`${date}: ${counts.total} total (Bot: ${counts.bot_attack}, Exceeded: ${counts.rate_limit_exceeded}, Burst: ${counts.convention_burst})`);
  });
```

### 7.6 Aggregate Analysis

#### Query: Event Type Effectiveness (Are Limits Appropriate?)
```javascript
const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const allEvents = await adminDb.collection('RateLimits')
  .where('timestamp', '>=', lastMonth)
  .get();

const analysis = {};
allEvents.forEach(doc => {
  const data = doc.data();
  const key = data.eventType;

  if (!analysis[key]) {
    analysis[key] = {
      total: 0,
      convention_burst: 0,
      rate_limit_exceeded: 0,
      bot_attack: 0,
      uniqueFingerprints: new Set()
    };
  }

  analysis[key].total++;
  analysis[key][data.scenario]++;
  analysis[key].uniqueFingerprints.add(data.fingerprint);
});

console.log('Rate limit analysis by event type (last 30 days):\n');
Object.entries(analysis).forEach(([type, stats]) => {
  const burstRatio = stats.convention_burst / (stats.rate_limit_exceeded || 1);
  const botRatio = stats.bot_attack / stats.total;

  console.log(`${type}:`);
  console.log(`  Total events: ${stats.total}`);
  console.log(`  - Convention bursts: ${stats.convention_burst}`);
  console.log(`  - Rate limit exceeded: ${stats.rate_limit_exceeded}`);
  console.log(`  - Bot attacks: ${stats.bot_attack}`);
  console.log(`  Unique fingerprints: ${stats.uniqueFingerprints.size}`);
  console.log(`  Burst/Exceeded ratio: ${burstRatio.toFixed(2)}`);
  console.log(`  Bot attack rate: ${(botRatio * 100).toFixed(1)}%`);

  // Recommendations
  if (burstRatio > 2) {
    console.log(`  ✅ Burst limits working well for ${type}`);
  } else if (burstRatio < 0.5) {
    console.log(`  ⚠️ Consider increasing burst allowance for ${type}`);
  }

  if (botRatio > 0.1) {
    console.log(`  🚨 HIGH bot attack rate for ${type} - investigate!`);
  }

  console.log('');
});
```

#### Query: IP Reputation Analysis
```javascript
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const highSeverity = await adminDb.collection('RateLimits')
  .where('severity', '==', 'HIGH')
  .where('timestamp', '>=', lastWeek)
  .get();

const ipData = {};
highSeverity.forEach(doc => {
  const data = doc.data();
  const ip = data.ip;

  if (!ipData[ip]) {
    ipData[ip] = {
      count: 0,
      eventTypes: new Set(),
      fingerprints: new Set(),
      userAgents: new Set()
    };
  }

  ipData[ip].count++;
  ipData[ip].eventTypes.add(data.eventType);
  ipData[ip].fingerprints.add(data.fingerprint);
  ipData[ip].userAgents.add(data.userAgent);
});

console.log('IP Reputation Analysis (HIGH severity, last 7 days):\n');
Object.entries(ipData)
  .sort(([, a], [, b]) => b.count - a.count)
  .slice(0, 20)
  .forEach(([ip, data]) => {
    console.log(`IP: ${ip}`);
    console.log(`  Attack count: ${data.count}`);
    console.log(`  Event types: ${Array.from(data.eventTypes).join(', ')}`);
    console.log(`  Unique fingerprints: ${data.fingerprints.size}`);
    console.log(`  User agents: ${Array.from(data.userAgents).slice(0, 2).join(', ')}${data.userAgents.size > 2 ? '...' : ''}`);

    if (data.count >= 10) {
      console.log(`  🚨 CRITICAL: Block this IP immediately`);
    } else if (data.count >= 5) {
      console.log(`  ⚠️ WARNING: Monitor closely, consider blocking`);
    }

    console.log('');
  });
```

---

## 💻 8. Code Implementation Examples

### 8.1 Applying Rate Limiting (Analytics Example)

**Source:** `app/api/user/analytics/track-event/route.js:148-172`

```javascript
import { rateLimit, generateFingerprint } from '@/lib/rateLimiter';
import { RATE_LIMIT_CONFIG } from '@/lib/services/serviceUser/constants/analyticsConstants';

// Inside POST handler
const eventType = requestData.eventType; // e.g., 'view', 'click'
const config = RATE_LIMIT_CONFIG[eventType];

if (!config) {
  return NextResponse.json(
    { error: `Unknown event type: ${eventType}` },
    { status: 400 }
  );
}

// Apply rate limiting
const rateLimitResult = await rateLimit({
  fingerprint: generateFingerprint({
    ip: userIp,
    userAgent: req.headers.get('user-agent') || 'unknown',
    sessionId: sessionToken || 'no_session',
    salt: `analytics_${eventType}`
  }),
  eventType,
  userId: profileOwnerId,
  ip: userIp,
  userAgent: req.headers.get('user-agent') || 'unknown',
  maxRequests: config.maxRequests,
  windowMs: config.windowMs,
  burstAllowance: config.burstAllowance || 0
});

// Check if rate limited
if (!rateLimitResult.allowed) {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      retryAfter: rateLimitResult.retryAfter,
      scenario: rateLimitResult.scenario
    },
    {
      status: 429,
      headers: {
        'Retry-After': rateLimitResult.retryAfter.toString()
      }
    }
  );
}

// Continue with normal processing...
```

### 8.2 Applying Rate Limiting (Privacy Example)

**Source:** `app/api/user/privacy/export/route.js:140-180`

```javascript
import { rateLimit } from '@/lib/rateLimiter';
import { PRIVACY_RATE_LIMITS } from '@/lib/services/constants';

// Inside POST handler for data export
const { max, window } = PRIVACY_RATE_LIMITS.DATA_EXPORTS;

const rateLimitResult = rateLimit(userId, {
  maxRequests: max,
  windowMs: window,
  metadata: {
    eventType: 'data_export_request',
    userId: userId,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') || null,
    userAgent: request.headers.get('user-agent') || null,
  }
});

if (!rateLimitResult.allowed) {
  // Enhanced 429 response with both retryAfter (relative) and resetTime (absolute)
  const responsePayload = {
    error: PRIVACY_ERROR_MESSAGES.EXPORT_RATE_LIMIT,
    message: `You can request a maximum of ${max} data exports per hour. Please try again later.`,
    retryAfter: rateLimitResult.retryAfter,  // Seconds until reset (relative)
    resetTime: rateLimitResult.resetTime,     // Unix timestamp in ms (absolute) - NEW!
    limit: {
      max: max,
      windowHours: 1
    }
  };

  // Log the 429 response for debugging
  console.log('📤 [DataExportAPI] Sending 429 response:', {
    userId,
    retryAfter: rateLimitResult.retryAfter,
    retryAfterMinutes: Math.floor(rateLimitResult.retryAfter / 60),
    resetTime: rateLimitResult.resetTime,
    resetTimeFormatted: new Date(rateLimitResult.resetTime).toISOString(),
    now: Date.now(),
    nowFormatted: new Date().toISOString(),
    payload: responsePayload
  });

  return NextResponse.json(responsePayload, {
    status: 429,
    headers: {
      'Retry-After': rateLimitResult.retryAfter.toString()  // Standard HTTP header
    }
  });
}

// Process data export request...
```

**Key Updates:**
- ✅ Uses simplified `rateLimit(identifier, options)` signature
- ✅ Includes `metadata` object with `eventType`, `userId`, `ip`, `userAgent`
- ✅ Returns both `retryAfter` (relative seconds) and `resetTime` (absolute timestamp)
- ✅ Adds `Retry-After` HTTP header
- ✅ Includes comprehensive logging for debugging
- ✅ `resetTime` enables accurate countdown timers in frontend (immune to clock drift)

### 8.3 Querying the Collection (Investigation)

```javascript
import { getAdminDb } from '@/lib/firebaseAdmin';

async function investigateFingerprint(fingerprint) {
  const db = await getAdminDb();
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get all events for this fingerprint
  const events = await db.collection('RateLimits')
    .where('fingerprint', '==', fingerprint)
    .where('timestamp', '>=', last24Hours)
    .orderBy('timestamp', 'desc')
    .get();

  console.log(`Fingerprint ${fingerprint}: ${events.size} events in 24h`);

  // Analyze pattern
  let botAttacks = 0;
  let rateLimitExceeded = 0;
  let conventionBursts = 0;
  const eventTypes = new Set();
  const ips = new Set();

  events.forEach(doc => {
    const data = doc.data();

    if (data.scenario === 'bot_attack') botAttacks++;
    else if (data.scenario === 'rate_limit_exceeded') rateLimitExceeded++;
    else if (data.scenario === 'convention_burst') conventionBursts++;

    eventTypes.add(data.eventType);
    ips.add(data.ip);
  });

  // Decision logic
  if (botAttacks >= 5) {
    return {
      action: 'BLOCK',
      reason: `${botAttacks} bot attacks in 24h`,
      severity: 'CRITICAL'
    };
  } else if (rateLimitExceeded >= 10) {
    return {
      action: 'INVESTIGATE',
      reason: `${rateLimitExceeded} rate limit exceeded events in 24h`,
      severity: 'WARNING'
    };
  } else if (conventionBursts >= 5 && botAttacks === 0) {
    return {
      action: 'MONITOR',
      reason: `${conventionBursts} legitimate bursts - likely real user`,
      severity: 'LOW'
    };
  } else {
    return {
      action: 'ALLOW',
      reason: 'Activity within acceptable range',
      severity: 'INFO'
    };
  }
}

// Usage
const result = await investigateFingerprint('a3f4b2c1d5e6f7a8');
console.log('Investigation result:', result);
```

### 8.4 Automated Blocking (Example Implementation)

```javascript
// NOT YET IMPLEMENTED - Future enhancement
async function autoBlockPersistentAttackers() {
  const db = await getAdminDb();
  const lastHour = new Date(Date.now() - 60 * 60 * 1000);

  // Find fingerprints with 5+ bot attacks in last hour
  const attacks = await db.collection('RateLimits')
    .where('scenario', '==', 'bot_attack')
    .where('timestamp', '>=', lastHour)
    .get();

  const fingerprintCounts = {};
  attacks.forEach(doc => {
    const fp = doc.data().fingerprint;
    fingerprintCounts[fp] = (fingerprintCounts[fp] || 0) + 1;
  });

  // Block fingerprints with >= 5 attacks
  for (const [fingerprint, count] of Object.entries(fingerprintCounts)) {
    if (count >= 5) {
      // Add to blocklist (implement your blocking mechanism)
      await db.collection('Blocklist').add({
        fingerprint,
        reason: `Automated block: ${count} bot attacks in 1 hour`,
        blockedAt: new Date(),
        blockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h block
        autoBlocked: true
      });

      console.log(`🚨 Auto-blocked fingerprint ${fingerprint} (${count} attacks)`);
    }
  }
}

// Run every 15 minutes via Cloud Scheduler or cron job
```

---

## 🔧 9. Technical Details

### 9.1 Fire-and-Forget Logging Pattern

**Code Reference:** `lib/rateLimiter.js:149-169` and `193-212`

```javascript
// Logging is NOT awaited - fire and forget
logRateLimitEvent({
  scenario,
  fingerprint,
  // ... other fields
});

// Execution continues immediately without waiting for log completion
```

**Why This Matters:**
- Rate limiting NEVER blocks or fails due to logging issues
- If Firestore is slow/unavailable, logging fails silently
- Request processing continues at full speed
- Error handling in `logRateLimitEvent` prevents exceptions from propagating

**Trade-off:**
- ✅ Pro: Rate limiting remains fast and reliable
- ⚠️ Con: Cannot guarantee logs are written (rare Firestore failures might lose events)

### 9.2 Firestore Collection Path

```
/RateLimits
  /{auto-generated-document-id}
    └─ { ...event data }
```

**Collection Name:** `RateLimits` (case-sensitive)
**Document IDs:** Auto-generated by Firestore
**Indexes Required:** Composite indexes for common queries

### 9.3 Recommended Firestore Indexes

Create these composite indexes for optimal query performance:

```javascript
// Index 1: Scenario + Timestamp (for scenario-based queries)
{
  collection: 'RateLimits',
  fields: [
    { fieldPath: 'scenario', order: 'ASCENDING' },
    { fieldPath: 'timestamp', order: 'DESCENDING' }
  ]
}

// Index 2: Severity + Timestamp (for severity-based queries)
{
  collection: 'RateLimits',
  fields: [
    { fieldPath: 'severity', order: 'ASCENDING' },
    { fieldPath: 'timestamp', order: 'DESCENDING' }
  ]
}

// Index 3: EventType + Timestamp (for event type queries)
{
  collection: 'RateLimits',
  fields: [
    { fieldPath: 'eventType', order: 'ASCENDING' },
    { fieldPath: 'timestamp', order: 'DESCENDING' }
  ]
}

// Index 4: Fingerprint + Timestamp (for fingerprint tracking)
{
  collection: 'RateLimits',
  fields: [
    { fieldPath: 'fingerprint', order: 'ASCENDING' },
    { fieldPath: 'timestamp', order: 'DESCENDING' }
  ]
}

// Index 5: UserID + Timestamp (for user queries)
{
  collection: 'RateLimits',
  fields: [
    { fieldPath: 'userId', order: 'ASCENDING' },
    { fieldPath: 'timestamp', order: 'DESCENDING' }
  ]
}
```

### 9.4 Data Retention & Cleanup

**Recommendation:** Keep 90 days of data, then archive or delete

```javascript
// Cloud Function to run daily
exports.cleanupOldRateLimits = functions.pubsub
  .schedule('0 2 * * *') // 2 AM daily
  .onRun(async (context) => {
    const db = getAdminDb();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Delete in batches of 500
    const oldLogs = await db.collection('RateLimits')
      .where('timestamp', '<', ninetyDaysAgo)
      .limit(500)
      .get();

    if (oldLogs.empty) {
      console.log('No old rate limit logs to delete');
      return null;
    }

    const batch = db.batch();
    oldLogs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`Deleted ${oldLogs.size} rate limit logs older than 90 days`);
    return null;
  });
```

### 9.5 Performance Characteristics

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| Rate limit check | O(n) where n = requests in window | In-memory array filtering |
| Fingerprint generation | O(1) | Hash computation is constant time |
| Logging | O(1) async | Fire-and-forget, doesn't block |
| Bot detection | O(n) where n = requests in window | Multiple array filters |

**Typical Performance:**
- Rate limit check: < 5ms
- Fingerprint generation: < 1ms
- Total overhead per request: < 10ms

---

## 📚 10. Appendix

### 10.1 Quick Reference: All Event Types

| # | Event Type | Category | Max | Window | Burst | API Route |
|---|------------|----------|-----|--------|-------|-----------|
| 1 | `view` | Analytics | 3 | 1m | 1 | `/api/user/analytics/track-event` |
| 2 | `click` | Analytics | 10 | 10s | 3 | `/api/user/analytics/track-event` |
| 3 | `time_on_profile` | Analytics | 60 | 1m | 10 | `/api/user/analytics/track-event` |
| 4 | `data_export_request` | Privacy | 3 | 1h | 0 | `/api/user/privacy/export` (POST) |
| 5 | `data_export_status` | Privacy | 10 | 1m | 0 | `/api/user/privacy/export` (GET) |
| 6 | `account_deletion_request` | Privacy | 2 | 1h | 0 | `/api/user/privacy/delete-account` |
| 7 | `consent_read` | Privacy | 30 | 1m | 0 | `/api/user/privacy/consent` (GET) |
| 8 | `consent_update` | Privacy | 20 | 1m | 0 | `/api/user/privacy/consent` (POST) |
| 9 | `consent_batch_update` | Privacy | 20 | 1m | 0 | `/api/user/privacy/consent` (PUT) |
| 10 | `consent_withdraw` | Privacy | 20 | 1m | 0 | `/api/user/privacy/consent` (DELETE) |
| 11 | `cookie_consent_update` | Privacy | Custom | Custom | 0 | `/api/user/privacy/cookies` |
| 12 | `contact_submit_public` | Application | 5 | 1m | 0 | `/api/contacts/submit` |
| 13 | `contacts_share` | Application | Custom | Custom | 0 | `/api/user/contacts/share` (POST) |
| 14 | `contacts_share_info` | Application | Custom | Custom | 0 | `/api/user/contacts/share` (GET) |
| 15 | `settings_read` | Application | Custom | Custom | 0 | `/api/user/settings` (GET) |
| 16 | `settings_update` | Application | Custom | Custom | 0 | `/api/user/settings` (POST) |
| 17 | `links_read` | Application | Custom | Custom | 0 | `/api/user/links` (GET) |
| 18 | `links_update` | Application | Custom | Custom | 0 | `/api/user/links` (POST) |
| 19 | `tutorial_complete` | Application | 5 | 1m | 0 | `/api/tutorial/complete` |
| 20 | `tutorial_progress` | Application | Custom | Custom | 0 | `/api/tutorial/progress` |
| 21 | `tutorial_skip` | Application | Custom | Custom | 0 | `/api/tutorial/skip` |
| 22 | `onboarding_complete` | Application | 5 | 1m | 0 | `/api/onboarding/complete` |
| 23 | `rules_group_generation` | Application | Custom | Custom | 0 | `/api/user/contacts/generate-rules-based` |

**Note:** "Custom" means rate limit config is defined inline in the API route, not in a constants file.

### 10.2 Field Presence Matrix (Detailed)

| Field | convention_burst | rate_limit_exceeded | bot_attack |
|-------|------------------|---------------------|------------|
| `timestamp` | ✅ | ✅ | ✅ |
| `createdAt` | ✅ | ✅ | ✅ |
| `scenario` | ✅ | ✅ | ✅ |
| `fingerprint` | ✅ | ✅ | ✅ |
| `eventType` | ✅ | ✅ | ✅ |
| `userId` | ✅ | ✅ | ✅ |
| `ip` | ✅ | ✅ | ✅ |
| `userAgent` | ✅ | ✅ | ✅ |
| `severity` | ✅ (LOW) | ✅ (MEDIUM) | ✅ (HIGH) |
| `windowMs` | ✅ | ✅ | ✅ |
| `requestCount` | ✅ | ✅ | ✅ |
| `burstUsed` | ✅ | ✅ | ✅ |
| `timeSinceFirstRequest` | ✅ | ✅ | ✅ |
| `maxRequests` | ✅ | ❌ | ❌ |
| `burstAllowance` | ✅ | ❌ | ❌ |
| `note` | ✅ | ❌ | ❌ |
| `effectiveLimit` | ❌ | ✅ | ✅ |
| `requestsInLastSecond` | ❌ | ✅ | ✅ |
| `requestsInLast500ms` | ❌ | ✅ | ✅ |
| `requestsInLast200ms` | ❌ | ✅ | ✅ |
| `requestRate` | ❌ | ✅ | ✅ |

### 10.3 Code Location Reference

| Component | File Path | Lines | Description |
|-----------|-----------|-------|-------------|
| **Core Rate Limiter** | `/lib/rateLimiter.js` | 84-228 | Main rate limiting logic |
| Fingerprint generation | `/lib/rateLimiter.js` | 39-50 | Multi-factor fingerprinting |
| Log event function | `/lib/rateLimiter.js` | 56-72 | Writes to RateLimits collection |
| Bot detection logic | `/lib/rateLimiter.js` | 102-144 | 4-threshold bot analysis |
| Convention burst logging | `/lib/rateLimiter.js` | 193-212 | Logs first burst usage |
| Exceeded/attack logging | `/lib/rateLimiter.js` | 149-169 | Logs limit violations |
| **Constants** | | | |
| Analytics event types | `/lib/services/serviceUser/constants/analyticsConstants.js` | 8-14 | VIEW, CLICK, etc. |
| Analytics rate limits | `/lib/services/serviceUser/constants/analyticsConstants.js` | 16-38 | RATE_LIMIT_CONFIG |
| Privacy rate limits | `/lib/services/servicePrivacy/constants/privacyConstants.js` | 168-185 | PRIVACY_RATE_LIMITS |
| **API Implementations** | | | |
| Analytics tracking | `/app/api/user/analytics/track-event/route.js` | 148-172 | Apply rate limits |
| Data export | `/app/api/user/privacy/export/route.js` | 140-159 | Privacy rate limits |
| Consent management | `/app/api/user/privacy/consent/route.js` | 50, 125, 222, 314 | Multiple endpoints |
| Account deletion | `/app/api/user/privacy/delete-account/route.js` | 106 | Deletion rate limits |
| Contact submission | `/app/api/contacts/submit/route.js` | 176 | Public form rate limits |
| Tutorial/Onboarding | `/app/api/tutorial/complete/route.js` | 68 | Tutorial rate limits |
| **Testing** | | | |
| Rate limit tests | `/test-rate-limit.js` | All | Test script |
| Test documentation | `/documentation/testing/RATE_LIMIT_TESTING.md` | All | Testing guide |

### 10.4 Related Documentation

- **Archived V1 Guide:** `documentation/testing/archive/RATE_LIMITS_COLLECTION_GUIDE_V1_DEPRECATED.md`
- **Bot Detection Fix:** `documentation/testing/BOT_DETECTION_FIX_V2.md`
- **Analytics Implementation:** `documentation/testing/ANALYTICS_IMPLEMENTATION_GUIDE.md`
- **Rate Limit Testing:** `documentation/testing/RATE_LIMIT_TESTING.md`

### 10.5 Key Changes from V1 Documentation

| Item | V1 (Deprecated) | V2 (Current) |
|------|-----------------|--------------|
| `requestsInLast200ms` field | ❌ Not documented | ✅ Fully documented |
| `requestsInLast500ms` field | ⚠️ Briefly mentioned | ✅ Fully documented |
| Bot detection threshold | > 6 req/sec | **> 8 req/sec** (corrected) |
| Event types covered | 3 (analytics only) | **21** (analytics + privacy + app) |
| Field presence clarity | Unclear which fields in which scenarios | ✅ Complete matrix |
| Code references | None | ✅ All code locations with line numbers |
| Queries | Generic examples | ✅ Comprehensive queries for all types |

### 10.6 Action Matrix

| Scenario | Severity | Frequency | Recommended Action |
|----------|----------|-----------|-------------------|
| `convention_burst` | LOW | Any | ✅ No action - expected behavior |
| `rate_limit_exceeded` | MEDIUM | < 5/day per fingerprint | ℹ️ Monitor, no action needed |
| `rate_limit_exceeded` | MEDIUM | 5-9/day per fingerprint | ⚠️ Investigate user behavior |
| `rate_limit_exceeded` | MEDIUM | ≥10/day per fingerprint | 🔍 Deep investigation required |
| `bot_attack` | HIGH | 1 occurrence | 🔍 Investigate IP and fingerprint |
| `bot_attack` | HIGH | 2-4/day same fingerprint | ⚠️ Monitor closely, prepare to block |
| `bot_attack` | HIGH | ≥5/day same fingerprint | 🚨 Block fingerprint immediately |
| `bot_attack` | HIGH | ≥10/day different fingerprints | 🔥 Widespread attack - review firewall, consider geographic blocking |

---

## 🎯 Summary

The RateLimits collection is a sophisticated **abnormal activity detection system** that:

1. **Distinguishes** between legitimate bursts, abuse, and bot attacks using multi-threshold analysis
2. **Logs** 21 different event types across analytics, privacy, and application operations
3. **Captures** 18-21 fields (depending on scenario) with complete metadata
4. **Detects bots** using 4 independent thresholds (200ms, 500ms, 1s windows, and sustained rate)
5. **Protects privacy** through multi-factor fingerprinting with SHA-256 hashing
6. **Never blocks** normal operations due to fire-and-forget logging pattern

**Critical Fields NOT in V1 Documentation:**
- `requestsInLast200ms` - Ultra-rapid burst detection
- `requestsInLast500ms` - Fast burst detection

**Corrected Threshold:**
- Bot detection: **> 8 req/sec** (not > 6 as stated in V1)

**Use this guide to:**
- ✅ Understand what each field means and when it's present
- ✅ Query the collection effectively for all 21 event types
- ✅ Identify and respond to security threats appropriately
- ✅ Tune rate limit configurations based on actual usage patterns
- ✅ Distinguish between legitimate users and malicious actors

---

**Version:** 2.0.0
**Last Updated:** 2025-11-18
**Maintainer:** Development Team
**Status:** Active (replaces V1)
