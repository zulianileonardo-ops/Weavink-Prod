# Weavink Coding Quick Reference Card

Keep this open while coding! 📌

---

## 🏗️ The 5 Layers (Data Flow)

```
Layer 1: PAGE (UI)              → User sees & clicks
         ↓ ↑
Layer 2: CONTEXT (State)        → Manages data & actions  
         ↓ ↑
Layer 3: CLIENT SERVICE (API)   → HTTP calls & caching
         ↓ ↑
Layer 4: API ROUTE (Server)     → Auth & validation
         ↓ ↑
Layer 5: SERVER SERVICE (DB)    → Business logic & Firestore
```

---

## 📂 File Locations (Copy & Paste)

```bash
# Layer 1 - Page Component
app/dashboard/(dashboard pages)/[feature]/page.jsx

# Layer 2 - Context Provider  
app/dashboard/(dashboard pages)/[feature]/FeatureContext.js

# Layer 3 - Client Service
lib/services/service[Feature]/client/services/FeatureService.js

# Layer 4 - API Route
app/api/user/[resource]/route.js

# Layer 5 - Server Service
lib/services/service[Feature]/server/featureService.js

# Constants
lib/services/service[Feature]/constants/featureConstants.js
```

---

## 🎯 Quick Decision Trees

### Where Does This Code Go?

```
UI/Rendering?           → Layer 1 (Page Component)
State Management?       → Layer 2 (Context)
HTTP Request?           → Layer 3 (Client Service)
Auth/Validation?        → Layer 4 (API Route)
Database/Business?      → Layer 5 (Server Service)
```

### Do I Need a Context?

```
Used by multiple components?              YES → Context
Shared across routes?                     YES → Context
Complex data fetching?                    YES → Context
Just local component state?               NO  → useState
```

---

## 📝 File Naming

```
✅ page.jsx                (pages)
✅ route.js                (API routes)
✅ FeatureContext.js       (contexts)
✅ FeatureService.js       (client services)
✅ featureService.js       (server services)
✅ FEATURE_CONSTANTS       (constants)
```

---

## 🔥 Essential Code Snippets

### Page Component Template

```javascript
"use client";

import React from 'react';
import { useFeature } from './FeatureContext';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

export default function FeaturePage() {
  const { data, loading, createItem } = useFeature();
  const { session } = useDashboard();
  
  const canCreate = session?.permissions?.[FEATURE_CONSTANTS.CREATE];

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {canCreate && <button onClick={() => createItem({})}>Create</button>}
    </div>
  );
}
```

### Context Template

```javascript
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { FeatureService } from '@/lib/services/serviceFeature/client/services/FeatureService';

const FeatureContext = createContext(undefined);

export function FeatureProvider({ children }) {
  const { session } = useDashboard();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.userId) return;
    loadData();
  }, [session?.userId]);

  const loadData = async () => {
    const result = await FeatureService.getData();
    setData(result);
    setLoading(false);
  };

  const createItem = useCallback(async (itemData) => {
    const newItem = await FeatureService.createItem(itemData);
    setData(prev => [...prev, newItem]);
    return newItem;
  }, []);

  return (
    <FeatureContext.Provider value={{ data, loading, createItem }}>
      {children}
    </FeatureContext.Provider>
  );
}

export const useFeature = () => useContext(FeatureContext);
```

### Client Service Template

```javascript
import { ContactApiClient } from '@/lib/services/core/ApiClient';

class FeatureService {
  static async getData() {
    const response = await ContactApiClient.get('/api/user/feature');
    return response;
  }

  static async createItem(data) {
    const response = await ContactApiClient.post('/api/user/feature', data);
    return response;
  }
}

export { FeatureService };
```

### API Route Template

```javascript
import { NextResponse } from 'next/server';
import { createApiSession, SessionManager } from '@/lib/server/session';
import { FeatureService } from '@/lib/services/serviceFeature/server/featureService';
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

export async function GET(request) {
  try {
    const session = await createApiSession(request);
    
    if (!session.permissions[FEATURE_CONSTANTS.VIEW]) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await FeatureService.getData(session.userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    
    if (!session.permissions[FEATURE_CONSTANTS.CREATE]) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Check team permissions if needed
    if (body.teamId) {
      if (!sessionManager.hasTeamPermission(PERMISSIONS.CAN_CREATE, body.teamId)) {
        return NextResponse.json({ error: 'Insufficient team permissions' }, { status: 403 });
      }
    }
    
    const result = await FeatureService.createItem(session.userId, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('❌ POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### Server Service Template

```javascript
import { adminDb, FieldValue } from '@/lib/firebaseAdmin';

class FeatureService {
  static async getData(userId) {
    try {
      const docRef = adminDb.collection('FeatureData').doc(userId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        await docRef.set({
          userId,
          items: [],
          createdAt: FieldValue.serverTimestamp()
        });
        return [];
      }
      
      return doc.data().items || [];
    } catch (error) {
      console.error('❌ getData error:', error);
      throw new Error('Failed to fetch data');
    }
  }

  static async createItem(userId, data) {
    try {
      const itemId = `item_${Date.now()}`;
      const newItem = { id: itemId, ...data, createdAt: new Date().toISOString() };
      
      const docRef = adminDb.collection('FeatureData').doc(userId);
      await docRef.update({
        items: FieldValue.arrayUnion(newItem),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      return newItem;
    } catch (error) {
      console.error('❌ createItem error:', error);
      throw new Error('Failed to create item');
    }
  }
}

export { FeatureService };
```

---

## ✅ Pre-Commit Checklist

- [ ] `"use client"` at top of client components
- [ ] All API routes call `createApiSession(request)` first
- [ ] Permission checks before business logic
- [ ] Constants imported from barrel: `from '@/lib/services/constants'`
- [ ] No magic strings ('pro', 'base', etc.)
- [ ] Error handling (try-catch)
- [ ] Loading states in components
- [ ] Token caching in client services (50-min)
- [ ] No mixing client/server Firebase SDKs

---

## 🚨 Common Patterns

### Permission Check (API)

```javascript
if (!session.permissions[FEATURE_CONSTANTS.CREATE]) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Permission Check (Component)

```javascript
const canCreate = session?.permissions?.[FEATURE_CONSTANTS.CREATE];

{canCreate ? <CreateButton /> : <UpgradePrompt />}
```

### Limit Check

```javascript
const count = await FeatureService.getCount(userId);
const limits = FEATURE_LIMITS[session.subscriptionLevel];

if (count >= limits.maxItems) {
  return NextResponse.json({ error: 'Limit reached' }, { status: 429 });
}
```

### Real-Time Subscription

```javascript
// CLIENT SERVICE ONLY
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { app } from '@/important/firebase';

const db = getFirestore(app);

static subscribe(userId, callback) {
  const docRef = doc(db, 'Collection', userId);
  return onSnapshot(docRef, (snapshot) => {
    callback(snapshot.data());
  });
}
```

---

## 📊 HTTP Status Codes

```
200 OK                - Success (GET, PATCH, DELETE)
201 Created           - Success (POST)
400 Bad Request       - Invalid input
401 Unauthorized      - Missing/invalid token
403 Forbidden         - Insufficient permissions
404 Not Found         - Resource doesn't exist
409 Conflict          - Duplicate resource
429 Too Many Requests - Limit exceeded
500 Internal Error    - Server error
```

---

## 🔍 Import Order

```javascript
// 1. React
import React from 'react';

// 2. Next.js  
import { useRouter } from 'next/navigation';

// 3. Third-party
import { toast } from 'react-hot-toast';

// 4. Internal
import { useTranslation } from '@/lib/translation';

// 5. Contexts
import { useDashboard } from '@/app/dashboard/DashboardContext';

// 6. Constants
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

// 7. Components
import FeatureList from './components/FeatureList';
```

---

## ⚠️ Critical Rules

### ✅ DO:
- Use `"use client"` for client components
- Call `createApiSession()` first in API routes
- Check permissions before operations
- Use constants from barrel file
- Implement token caching (50-min)
- Handle loading & error states
- Use try-catch everywhere
- Log errors with context

### ❌ DON'T:
- Mix client & server Firebase SDKs
- Skip permission checks
- Use magic strings
- Forget error handling
- Make API calls from components (use Context)
- Store sensitive data in cache
- Import directly from domain files

---

## 🐛 Quick Debug

### "Permission denied"
```javascript
// Check in API route
console.log('Session:', session);
console.log('Permission:', FEATURE_CONSTANTS.CREATE);
console.log('Has it?', session.permissions[FEATURE_CONSTANTS.CREATE]);
```

### "Cannot find module"
```bash
# Restart TS server
# Cmd+Shift+P → "TypeScript: Restart TS Server"

# Check barrel file
cat lib/services/constants.js
```

### "Circular dependency"
```javascript
// ❌ DON'T: Domain-to-domain import
import { X } from '../serviceOther/constants/...';

// ✅ DO: Move to core
import { X } from '../../core/constants';
```

### "Cache not updating"
```javascript
// Force refresh
const data = await FeatureService.getData(true);

// Or invalidate in service after mutations
static async createItem(data) {
  // ... create logic
  this.invalidateCache();
  return result;
}
```

---

## 💡 Pro Tips

1. **Copy templates** - Don't write from scratch, copy existing patterns
2. **Check similar features** - Look at how contacts/appearance/teams do it
3. **Test with different subscription levels** - BASE, PRO, ENTERPRISE
4. **Use console.log liberally** - Remove before committing
5. **Restart dev server** - When weird caching issues happen
6. **Check Firebase Console** - Verify data structure

---

## 🔗 Full Documentation

- **WEAVINK_MAIN_CODING_SKILL.md** - Complete reference (160+ pages)
- **Weavink_Constants_Management_Skill.md** - Constants guide
- **REFACTORING_GUIDE.md** - Cost tracking patterns

---

## 🆘 Need Help?

1. Search the main skill for your issue
2. Look at similar features in codebase
3. Check console for error messages
4. Verify constants spelling
5. Test API directly with Postman/curl

---

**Last Updated:** 2024-11-18  
**Version:** 1.0  

_Print this and keep it visible while coding!_ 📌
