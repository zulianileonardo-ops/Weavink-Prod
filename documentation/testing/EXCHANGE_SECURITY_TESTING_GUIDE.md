---
id: testing-exchange-security-081
title: Exchange Service Security Testing Guide
category: testing
tags: [testing, exchange-service, security, rate-limiting, fingerprinting, integration-tests]
status: active
created: 2025-11-24
updated: 2025-11-24
related:
  - EXCHANGE_SERVICE_SECURITY.md
  - RATE_LIMIT_TESTING.md
  - RATE_LIMITS_COLLECTION_GUIDE_V2.md
---

# Exchange Service Security Testing Guide

## Overview

Integration tests for the ExchangeService security infrastructure, verifying that rate limiting, fingerprinting, validation, and audit logging work correctly for the public contact exchange endpoint.

**Test File:** `tests/exchangeService.security.test.js`

**Run Tests:**
```bash
node -r dotenv/config tests/exchangeService.security.test.js
```

---

## Test Configuration

| Setting | Value |
|---------|-------|
| **Test Mode** | Real Firestore (integration tests) |
| **Focus** | Security-critical methods |
| **Total Tests** | ~31 |
| **Test Prefix** | `TEST_` (for easy cleanup) |

---

## Security Methods Tested

| Method | Tests | Firestore Collection |
|--------|-------|---------------------|
| `generateExchangeFingerprint` | 5 | None (pure function) |
| `checkExchangeRateLimit` | 6 | RateLimits |
| `checkExchangeFingerprintRateLimit` | 5 | RateLimits |
| `validateSubmissionData` | 6 | None (pure function) |
| `logRateLimitViolation` | 4 | ExchangeAuditLogs |
| **API Route** | 5 | All |

---

## Category 1: Pure Function Tests (No Firebase)

### 1.1 generateExchangeFingerprint (5 tests)

Tests the server-side fingerprint generation for device identification.

| Test | Description | Expected |
|------|-------------|----------|
| 1 | Valid inputs produce fingerprint | 16-char hex string |
| 2 | Same input = same output | Deterministic |
| 3 | Different input = different output | Unique per device |
| 4 | Missing fields use fallbacks | Uses `unknown_*` values |
| 5 | Output format | 16-char hex string |

**Example:**
```javascript
const fingerprint = ExchangeService.generateExchangeFingerprint({
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  acceptLanguage: 'en-US,en;q=0.9',
  acceptEncoding: 'gzip, deflate, br'
});
// Returns: 'a1b2c3d4e5f6g7h8' (16-char hex)
```

### 1.2 validateSubmissionData (6 tests)

Tests validation of exchange submission data.

| Test | Description | Expected |
|------|-------------|----------|
| 1 | Valid submission with userId | Returns true |
| 2 | Valid submission with username | Returns true |
| 3 | Missing contact field | Throws error |
| 4 | Missing name | Throws error |
| 5 | Missing email | Throws error |
| 6 | Missing both userId AND username | Throws error |

**Validation Rules:**
- `contact` object is required
- `contact.name` is required
- `contact.email` is required
- Either `userId` OR `username` must be present

---

## Category 2: Firestore Integration Tests

### 2.1 checkExchangeRateLimit (6 tests)

Tests IP-based rate limiting (60 requests/hour per IP).

| Test | Description | Expected |
|------|-------------|----------|
| 1 | First submission | Allowed, creates entry |
| 2 | Under limit | Allowed |
| 3 | At limit (60) | Blocked with error |
| 4 | 'unknown' IP | Skips check, returns true |
| 5 | Empty IP | Skips check, returns true |
| 6 | Error message format | Contains "rate limit exceeded" |

**Rate Limit Configuration:**
```javascript
{
  maxSubmissions: 60,    // Max per window
  windowMinutes: 60,     // 1 hour window
  collection: 'RateLimits',
  keyFormat: 'exchange_rate_limit_{ip}'
}
```

### 2.2 checkExchangeFingerprintRateLimit (5 tests)

Tests device fingerprint-based rate limiting (30 requests/hour per device).

| Test | Description | Expected |
|------|-------------|----------|
| 1 | First submission | Allowed, creates entry |
| 2 | Under limit (30) | Allowed |
| 3 | At limit | Blocked with error |
| 4 | Independent from IP limit | Separate counters |
| 5 | Error message | Contains "device" |

**Rate Limit Configuration:**
```javascript
{
  maxSubmissions: 30,    // Max per window (stricter than IP)
  windowMinutes: 60,     // 1 hour window
  collection: 'RateLimits',
  keyFormat: 'exchange_fingerprint_{fingerprint}'
}
```

### 2.3 logRateLimitViolation (4 tests)

Tests audit logging for rate limit violations.

| Test | Description | Expected |
|------|-------------|----------|
| 1 | Log IP violation | Creates ExchangeAuditLogs entry |
| 2 | Log fingerprint violation | Correct limitType field |
| 3 | Missing fields | Handles gracefully, uses 'unknown' |
| 4 | Return value | Returns true on success, false on error |

**Log Entry Structure:**
```javascript
{
  type: 'rate_limit_exceeded',
  limitType: 'ip' | 'fingerprint',
  ip: '192.168.1.1',
  fingerprint: 'a1b2c3d4e5f6g7h8',
  userAgent: 'Mozilla/5.0...',
  timestamp: '2025-11-24T12:00:00.000Z',
  success: false,
  error: 'Rate limit exceeded (ip)'
}
```

---

## Category 3: API Route Tests

### 3.1 POST /api/user/contacts/exchange/submit (5 tests)

Tests the full API endpoint with real HTTP requests.

| Test | Description | Expected |
|------|-------------|----------|
| 1 | Valid submission | 200, returns contactId |
| 2 | Missing required fields | 400, VALIDATION_ERROR |
| 3 | Rate limit exceeded | 429, RATE_LIMIT_EXCEEDED |
| 4 | Profile not found | 404, PROFILE_NOT_FOUND |
| 5 | Exchange disabled | 403, EXCHANGE_DISABLED |

**API Response Formats:**

**Success (200):**
```json
{
  "success": true,
  "message": "Contact submitted successfully!",
  "contactId": "exchange_1732449600000_abc123",
  "submittedAt": "2025-11-24T12:00:00.000Z",
  "targetProfile": {
    "userId": "user123",
    "username": "johndoe",
    "displayName": "John Doe"
  }
}
```

**Rate Limited (429):**
```json
{
  "error": "Exchange rate limit exceeded...",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

## Test Helpers

### Setup Functions

```javascript
// Create test user with exchange enabled
async function createExchangeTestUser(userId, options = {}) {
  const fullId = `exchange_test_${userId}`;
  await db.collection('users').doc(fullId).set({
    uid: fullId,
    username: options.username || `testuser_${userId}`,
    email: `${fullId}@test.weavink.com`,
    displayName: 'Exchange Test User',
    settings: {
      contactExchangeEnabled: options.exchangeEnabled !== false
    },
    createdAt: new Date().toISOString()
  });
  return fullId;
}
```

### Cleanup Functions

```javascript
// Clean up test rate limit entries
async function cleanupTestRateLimits() {
  const prefixes = ['exchange_rate_limit_TEST_', 'exchange_fingerprint_TEST_'];
  for (const prefix of prefixes) {
    const snapshot = await db.collection('RateLimits')
      .orderBy('__name__')
      .startAt(prefix)
      .endAt(prefix + '\uf8ff')
      .get();
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  }
}

// Clean up test audit logs
async function cleanupTestAuditLogs() {
  const snapshot = await db.collection('ExchangeAuditLogs')
    .where('ip', '>=', 'TEST_')
    .where('ip', '<', 'TEST_\uf8ff')
    .get();
  if (!snapshot.empty) {
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

// Clean up test users
async function cleanupTestUsers() {
  const snapshot = await db.collection('users')
    .orderBy('__name__')
    .startAt('exchange_test_')
    .endAt('exchange_test_\uf8ff')
    .get();
  if (!snapshot.empty) {
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}
```

---

## Running Tests

### Prerequisites

1. **Firebase credentials** in `.env`:
   ```
   FIREBASE_PROJECT_ID=your-project
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY=...
   ```

2. **Dev server running** (for API tests):
   ```bash
   npm run dev
   ```

### Execute Tests

```bash
# Run all exchange security tests
node -r dotenv/config tests/exchangeService.security.test.js
```

### Expected Output

```
===============================================
   Exchange Service Security Tests
===============================================

Category 1: Pure Function Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 Running: Fingerprint - Valid inputs
✅ PASSED (2ms): Fingerprint - Valid inputs

🧪 Running: Fingerprint - Deterministic
✅ PASSED (1ms): Fingerprint - Deterministic

...

Category 2: Firestore Integration Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 Running: IP Rate Limit - First submission allowed
✅ PASSED (45ms): IP Rate Limit - First submission allowed

...

Category 3: API Route Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 Running: API - Valid submission returns 200
✅ PASSED (120ms): API - Valid submission returns 200

...

===============================================
   TEST SUMMARY
===============================================

Total:   31
Passed:  31 (100%)
Failed:  0
Skipped: 0

Duration: 4.2s

All tests passed!
===============================================
```

---

## Verifying Results

### 1. Check Firestore Collections

**RateLimits Collection:**
```javascript
// Should see entries like:
{
  _documentId: 'exchange_rate_limit_TEST_192.168.1.1',
  submissions: ['2025-11-24T12:00:00.000Z', ...],
  lastUpdated: Timestamp
}
```

**ExchangeAuditLogs Collection:**
```javascript
// Should see violation logs:
{
  type: 'rate_limit_exceeded',
  limitType: 'ip',
  ip: 'TEST_192.168.1.1',
  timestamp: '2025-11-24T12:00:00.000Z'
}
```

### 2. Check Server Logs

```
📝 ExchangeService: Rate limit violation logged - ip for IP: TEST_192.168.1.1
🚨 Rate limit exceeded - IP: TEST_192.168.1.1, Fingerprint: abc123def456
```

---

## Troubleshooting

### "Firebase not initialized"

**Solution:** Ensure `.env` has correct Firebase credentials:
```bash
cat .env | grep FIREBASE
```

### "All rate limit tests pass without blocking"

**Solution:** Check that test uses TEST_ prefix IPs and the limit is being checked:
```javascript
// Should use TEST_ prefix
await ExchangeService.checkExchangeRateLimit('TEST_192.168.1.1', 3, 60);
```

### "API tests fail with ECONNREFUSED"

**Solution:** Start dev server first:
```bash
npm run dev
```

### "Cleanup not working"

**Solution:** Check Firestore indexes support range queries:
```javascript
// May need composite index for RateLimits collection
```

---

## Security Verification Checklist

After running tests, verify:

- [ ] **IP Rate Limit**: Blocks at 60 requests/hour
- [ ] **Fingerprint Rate Limit**: Blocks at 30 requests/hour
- [ ] **Dual Limiting**: Both must pass (defense in depth)
- [ ] **Fail-Open**: Returns true if Firestore unavailable
- [ ] **Violation Logging**: Creates ExchangeAuditLogs entries
- [ ] **CSRF Protection**: API rejects invalid origins
- [ ] **Validation**: Rejects malformed submissions

---

## Related Documentation

- **[EXCHANGE_SERVICE_SECURITY.md](../security/EXCHANGE_SERVICE_SECURITY.md)** - Full security architecture
- **[RATE_LIMIT_TESTING.md](./RATE_LIMIT_TESTING.md)** - General rate limit testing guide
- **[RATE_LIMITS_COLLECTION_GUIDE_V2.md](./RATE_LIMITS_COLLECTION_GUIDE_V2.md)** - Firestore collection structure
