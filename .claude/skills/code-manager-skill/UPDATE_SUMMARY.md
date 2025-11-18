# Weavink Coding Skill - Update Summary

**Date:** 2024-11-18  
**Version:** 1.1  
**Changes:** Added ContactApiClient and SessionManager patterns

---

## What Changed

Based on your feedback and real codebase examples, I've updated all skill documents to include the **critical imports and patterns** that were missing:

### 1. **ContactApiClient Integration** ✨

**Why:** Your codebase uses a centralized HTTP client (`ContactApiClient`) instead of raw `fetch()` calls. This was a critical omission that would have caused confusion.

**Files Updated:**
- `WEAVINK_MAIN_CODING_SKILL.md` - Complete rewrite of Client Service template
- `WEAVINK_CODING_QUICK_REFERENCE.md` - Updated templates
- `FEATURE_IMPLEMENTATION_CHECKLIST.md` - All client service examples

**Key Changes:**

#### Before (Incorrect):
```javascript
// ❌ Raw fetch with manual token management
const token = await this.getToken();
const response = await fetch('/api/user/feature', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### After (Correct):
```javascript
// ✅ ContactApiClient handles everything
import { ContactApiClient } from '@/lib/services/core/ApiClient';

const data = await ContactApiClient.get('/api/user/feature');
```

**Benefits:**
- ✅ Automatic authentication (token management)
- ✅ Consistent error handling
- ✅ Retry logic for transient failures
- ✅ Cleaner, simpler code

---

### 2. **SessionManager Integration** ✨

**Why:** Your codebase uses `SessionManager` for team/organization permissions, not just basic session checks.

**Files Updated:**
- `WEAVINK_MAIN_CODING_SKILL.md` - Updated API Route templates
- `WEAVINK_CODING_QUICK_REFERENCE.md` - Added SessionManager example
- `FEATURE_IMPLEMENTATION_CHECKLIST.md` - Updated all API examples

**Key Changes:**

#### Import Update:
```javascript
// Now includes SessionManager
import { createApiSession, SessionManager } from '@/lib/server/session';
```

#### Team Permission Checking:
```javascript
const session = await createApiSession(request);
const sessionManager = new SessionManager(session);

// Check team permissions
if (body.teamId) {
  if (!sessionManager.hasTeamPermission(PERMISSIONS.CAN_CREATE, body.teamId)) {
    return NextResponse.json({ error: 'Insufficient team permissions' }, { status: 403 });
  }
}
```

**When to Use:**
- ✅ Team-based features
- ✅ Organization-level permissions
- ✅ Multi-context operations
- ✅ Role hierarchy checks

---

### 3. **Enhanced Logging Patterns** 📝

**Why:** Your examples showed extensive console logging for debugging and monitoring.

**Added Throughout:**
```javascript
// API Routes
console.log(`👤 [API /feature] User authenticated: ${userId}`);
console.log(`✅ [API /feature] Permission granted for ${session.subscriptionLevel}`);
console.log(`❌ [API /feature] Insufficient permissions`);

// Client Services
console.log('📥 FeatureService: Fetching fresh data from API...');
console.log('🔄 FeatureService: Serving from cache');
console.log('🗑️ FeatureService: Invalidating cache');
```

**Benefits:**
- ✅ Easier debugging
- ✅ Production monitoring
- ✅ Clear operation flow tracking
- ✅ Consistent emoji prefixes

---

## Section-by-Section Changes

### Main Coding Skill (`WEAVINK_MAIN_CODING_SKILL.md`)

#### Layer 3: Client Services
- **Added:** ContactApiClient import and usage
- **Removed:** Manual token management code
- **Updated:** All HTTP request examples to use ContactApiClient
- **Added:** ContactApiClient benefits section in Cross-Cutting Concerns

#### Layer 4: API Routes
- **Added:** SessionManager import
- **Updated:** Team permission checking pattern
- **Enhanced:** Error handling with specific error codes
- **Added:** Comprehensive logging examples

#### Cross-Cutting Concerns
- **Added:** New "ContactApiClient" section
  - What it is
  - Why use it
  - Available methods
  - Error handling
  - When to use / not use

### Quick Reference Card (`WEAVINK_CODING_QUICK_REFERENCE.md`)

#### Client Service Template
- **Replaced:** Token management with ContactApiClient
- **Simplified:** From 40+ lines to 10 lines
- **Cleaner:** More readable and maintainable

#### API Route Template
- **Added:** SessionManager import and usage
- **Added:** Team permission checking example
- **Enhanced:** Better structure and comments

### Implementation Checklist (`FEATURE_IMPLEMENTATION_CHECKLIST.md`)

#### Phase 5: Client Service
- **Updated:** All HTTP request examples
- **Removed:** Token caching implementation (handled by ContactApiClient)
- **Simplified:** Code examples by ~50%

#### Phase 4: API Routes
- **Added:** SessionManager import to all examples
- **Added:** Logging statements
- **Updated:** Error handling patterns

---

## Real-World Examples Added

Based on your provided code, I incorporated these real patterns:

### 1. **PlacesService Pattern**
```javascript
// Your actual code structure
"use client"

import { ContactApiClient } from '@/lib/services/core/ApiClient';

export class PlacesService {
  static async getPredictions(params) {
    const data = await ContactApiClient.post('/api/user/contacts/places/autocomplete', params);
    return data;
  }
}
```

### 2. **ContactsService Pattern**
```javascript
// Cache with listeners
let contactsCache = {
  data: null,
  expiry: null,
  listeners: new Set(),
};

export class ContactsService {
  static async getAllContactsWithGroups(options = {}) {
    // Cache check
    if (!force && contactsCache.data && contactsCache.expiry) {
      return contactsCache.data;
    }
    
    // API call
    const result = await ContactApiClient.get(`/api/user/contacts?${queryParams}`);
    
    // Update cache & notify
    contactsCache = { data: result, expiry: Date.now() + CACHE_DURATION };
    this.notifyListeners(result);
    
    return result;
  }
}
```

### 3. **BusinessCardService Pattern**
```javascript
export class BusinessCardService {
  static async scanImages(images) {
    // Multiple API calls
    const results = await Promise.all([
      this._processAndScanSingleImage(images.front, 'front'),
      this._processAndScanSingleImage(images.back, 'back')
    ]);
    
    return this._mergeSideResults(results);
  }

  static async saveScannedContact(finalFields) {
    return ContactApiClient.post('/api/user/contacts/from-scan', {
      parsedFields: finalFields
    });
  }
}
```

---

## Migration Guide (For Existing Code)

If you have existing code that doesn't use these patterns:

### Migrating to ContactApiClient

**Find all instances of:**
```javascript
const token = await getToken();
const response = await fetch('/api/user/', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Replace with:**
```javascript
import { ContactApiClient } from '@/lib/services/core/ApiClient';

const data = await ContactApiClient.get('/api/user/...');
```

### Adding SessionManager

**Find all instances of:**
```javascript
const session = await createApiSession(request);
// Direct permission checks
```

**Add SessionManager when needed:**
```javascript
import { createApiSession, SessionManager } from '@/lib/server/session';

const session = await createApiSession(request);
const sessionManager = new SessionManager(session);

// Use for team permissions
if (!sessionManager.hasTeamPermission(PERMISSIONS.X, teamId)) {
  // ...
}
```

---

## Testing Checklist

After these updates, verify:

- [ ] All client services import ContactApiClient
- [ ] No raw fetch() calls in client services
- [ ] All API routes import SessionManager
- [ ] Team permission checks use SessionManager
- [ ] Console logs follow emoji prefix pattern
- [ ] Error handling is consistent

---

## What Stays the Same

These fundamental patterns remain unchanged:

✅ 5-layer architecture
✅ Constants management
✅ File naming conventions
✅ Permission checking approach
✅ Error handling strategy
✅ Caching patterns
✅ Real-time subscriptions

---

## Key Takeaways

1. **Always use ContactApiClient** for HTTP requests in client services
2. **Import SessionManager** when working with team/org permissions
3. **Add logging** to track operations (use emoji prefixes)
4. **Follow real examples** from your existing codebase
5. **Simpler is better** - ContactApiClient reduces boilerplate

---

## Updated File List

✅ `WEAVINK_MAIN_CODING_SKILL.md` (v1.1) - 15 sections updated  
✅ `WEAVINK_CODING_QUICK_REFERENCE.md` (v1.1) - All templates updated  
✅ `FEATURE_IMPLEMENTATION_CHECKLIST.md` (v1.1) - Phases 4 & 5 updated  
✅ `README.md` (unchanged) - Still accurate  

---

## Questions?

If you have more patterns or examples to add:
1. Share the code
2. I'll update the skills
3. Document the pattern
4. Add to examples

The skills are living documents - they improve with real-world usage! 🚀

---

**Next Steps:**

1. Review the updated templates
2. Try implementing a feature using the new patterns
3. Provide feedback on what works/doesn't work
4. Share more examples from your codebase

---

_Updated by: Claude_  
_Based on feedback from: Léo (Weavink CTO)_
