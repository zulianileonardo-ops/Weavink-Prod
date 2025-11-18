# Weavink Feature Implementation Checklist

Use this checklist when implementing a new feature to ensure you follow all best practices.

---

## 📋 Overview

This checklist walks you through implementing a complete feature in the Weavink codebase, from planning to deployment.

**Estimated Time:**
- Simple CRUD feature: 2-4 hours
- Complex feature with integrations: 4-8 hours
- Large feature with multiple sub-features: 1-2 days

---

## Phase 1: Planning (15-30 minutes)

### ☐ Define the Feature

- [ ] Write a clear feature description
- [ ] List all user stories
- [ ] Identify user roles that can access this feature
- [ ] Define subscription level requirements

**Example:**
```
Feature: Contact Tags
Description: Allow users to add custom tags to contacts
User Stories:
  - As a user, I can add tags to a contact
  - As a user, I can filter contacts by tag
  - As a Pro user, I can create unlimited tags
Roles: All users
Subscription: BASE (5 tags), PRO (unlimited tags)
```

### ☐ Design Data Model

- [ ] Define Firestore collection structure
- [ ] List all fields and their types
- [ ] Identify relationships with other data
- [ ] Plan for scalability

**Example:**
```javascript
// Firestore structure
Collection: ContactTags/{userId}
{
  userId: string,
  tags: [
    {
      id: string,
      name: string,
      color: string,
      createdAt: string,
      contactIds: string[]  // or separate index?
    }
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### ☐ List Required Permissions

- [ ] View permission
- [ ] Create permission
- [ ] Edit permission
- [ ] Delete permission
- [ ] Any advanced permissions

**Example:**
```
VIEW_TAGS: 'contact_tags_view' (BASE+)
CREATE_TAGS: 'contact_tags_create' (BASE+)
EDIT_TAGS: 'contact_tags_edit' (BASE+)
DELETE_TAGS: 'contact_tags_delete' (BASE+)
UNLIMITED_TAGS: 'contact_tags_unlimited' (PRO+)
```

### ☐ Define Limits

- [ ] Limits for each subscription level
- [ ] Rate limits (if applicable)
- [ ] Storage limits (if applicable)

**Example:**
```javascript
CONTACT_TAG_LIMITS = {
  [SUBSCRIPTION_LEVELS.BASE]: {
    maxTags: 5,
    maxTagsPerContact: 3
  },
  [SUBSCRIPTION_LEVELS.PRO]: {
    maxTags: -1,  // unlimited
    maxTagsPerContact: -1
  }
}
```

### ☐ Plan API Endpoints

- [ ] List all endpoints needed
- [ ] Define HTTP methods
- [ ] Define request/response formats

**Example:**
```
GET    /api/user/contacts/tags          - Get all tags
POST   /api/user/contacts/tags          - Create tag
PATCH  /api/user/contacts/tags/[id]     - Update tag
DELETE /api/user/contacts/tags/[id]     - Delete tag
POST   /api/user/contacts/[id]/tags     - Add tag to contact
DELETE /api/user/contacts/[id]/tags/[tagId] - Remove tag from contact
```

---

## Phase 2: Constants Setup (10-15 minutes)

### ☐ Create Domain Constants File

```bash
# If new domain
touch lib/services/serviceFeature/constants/featureConstants.js

# If adding to existing domain
# Edit existing constants file
```

### ☐ Define Permission Constants

```javascript
// File: lib/services/service[Feature]/constants/featureConstants.js

export const FEATURE_CONSTANTS = {
  // Permissions
  VIEW_PERMISSION: 'feature_view',
  CREATE_PERMISSION: 'feature_create',
  EDIT_PERMISSION: 'feature_edit',
  DELETE_PERMISSION: 'feature_delete',
  
  // Feature flags
  BASIC_FEATURE: 'feature_basic',
  ADVANCED_FEATURE: 'feature_advanced'
};
```

### ☐ Define Limits

```javascript
import { SUBSCRIPTION_LEVELS } from '@/lib/services/constants';

export const FEATURE_LIMITS = {
  [SUBSCRIPTION_LEVELS.BASE]: {
    maxItems: 10,
    features: [
      FEATURE_CONSTANTS.VIEW_PERMISSION,
      FEATURE_CONSTANTS.BASIC_FEATURE
    ]
  },
  [SUBSCRIPTION_LEVELS.PRO]: {
    maxItems: 100,
    features: [
      FEATURE_CONSTANTS.VIEW_PERMISSION,
      FEATURE_CONSTANTS.CREATE_PERMISSION,
      FEATURE_CONSTANTS.EDIT_PERMISSION,
      FEATURE_CONSTANTS.DELETE_PERMISSION,
      FEATURE_CONSTANTS.BASIC_FEATURE,
      FEATURE_CONSTANTS.ADVANCED_FEATURE
    ]
  },
  [SUBSCRIPTION_LEVELS.ENTERPRISE]: {
    maxItems: -1, // unlimited
    features: Object.values(FEATURE_CONSTANTS)
  }
};
```

### ☐ Update Barrel File

```javascript
// File: lib/services/constants.js

export * from './core/constants';
export * from './serviceContact/constants/contactConstants';
// ... existing exports

// Add your new export
export * from './serviceFeature/constants/featureConstants';
```

### ☐ Test Constants Import

```bash
# Create a test file
echo "import { FEATURE_CONSTANTS } from '@/lib/services/constants'; console.log(FEATURE_CONSTANTS);" > test.js

# Run it
node test.js

# Should output your constants
# Delete test file
rm test.js
```

---

## Phase 3: Server Service (30-60 minutes)

### ☐ Create Server Service Directory

```bash
mkdir -p lib/services/serviceFeature/server
```

### ☐ Create Main Service File

```bash
touch lib/services/serviceFeature/server/featureService.js
```

### ☐ Implement Core CRUD Methods

```javascript
import { adminDb, FieldValue } from '@/lib/firebaseAdmin';
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

class FeatureService {
  
  // ✅ Implement: getData
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
      console.error('❌ FeatureService.getData error:', error);
      throw new Error('Failed to fetch data');
    }
  }

  // ✅ Implement: getCount
  static async getCount(userId) {
    const items = await this.getData(userId);
    return items.length;
  }

  // ✅ Implement: createItem
  static async createItem(userId, data) {
    try {
      const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newItem = {
        id: itemId,
        ...data,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = adminDb.collection('FeatureData').doc(userId);
      await docRef.update({
        items: FieldValue.arrayUnion(newItem),
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`✅ Created item ${itemId} for user ${userId}`);
      return newItem;
    } catch (error) {
      console.error('❌ FeatureService.createItem error:', error);
      throw new Error('Failed to create item');
    }
  }

  // ✅ Implement: updateItem
  static async updateItem(userId, itemId, updates) {
    try {
      const items = await this.getData(userId);
      const itemIndex = items.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        throw new Error('Item not found');
      }

      items[itemIndex] = {
        ...items[itemIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const docRef = adminDb.collection('FeatureData').doc(userId);
      await docRef.update({
        items: items,
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`✅ Updated item ${itemId} for user ${userId}`);
      return items[itemIndex];
    } catch (error) {
      console.error('❌ FeatureService.updateItem error:', error);
      if (error.message === 'Item not found') throw error;
      throw new Error('Failed to update item');
    }
  }

  // ✅ Implement: deleteItem
  static async deleteItem(userId, itemId) {
    try {
      const items = await this.getData(userId);
      const item = items.find(item => item.id === itemId);
      
      if (!item) {
        throw new Error('Item not found');
      }

      const docRef = adminDb.collection('FeatureData').doc(userId);
      await docRef.update({
        items: FieldValue.arrayRemove(item),
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`✅ Deleted item ${itemId} for user ${userId}`);
    } catch (error) {
      console.error('❌ FeatureService.deleteItem error:', error);
      if (error.message === 'Item not found') throw error;
      throw new Error('Failed to delete item');
    }
  }
}

export { FeatureService };
```

### ☐ Add Validation Service (if needed)

```bash
touch lib/services/serviceFeature/server/validationService.js
```

```javascript
class ValidationService {
  static validateCreateInput(data) {
    const errors = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (data.name && data.name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }

    if (errors.length > 0) {
      return { valid: false, error: errors.join(', ') };
    }

    return {
      valid: true,
      data: {
        name: data.name.trim(),
        // ... sanitized data
      }
    };
  }

  static validateUpdateInput(data) {
    // Similar validation
  }
}

export { ValidationService };
```

### ☐ Test Server Service

```javascript
// Create a test file to verify service works
// Run manually or with a test framework
```

---

## Phase 4: API Routes (30-45 minutes)

### ☐ Create API Route Directory

```bash
mkdir -p app/api/user/feature
```

### ☐ Create Main Route File

```bash
touch app/api/user/feature/route.js
```

### ☐ Implement GET Handler

```javascript
import { NextResponse } from 'next/server';
import { createApiSession, SessionManager } from '@/lib/server/session';
import { FeatureService } from '@/lib/services/serviceFeature/server/featureService';
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

export async function GET(request) {
  try {
    // 1. Authenticate (ALWAYS FIRST)
    const session = await createApiSession(request);
    
    console.log(`👤 [API /feature] User authenticated: ${session.userId}`);
    
    // 2. Check permissions
    if (!session.permissions[FEATURE_CONSTANTS.VIEW_PERMISSION]) {
      console.log(`❌ [API /feature] Insufficient permissions`);
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    console.log(`✅ [API /feature] Permission granted for ${session.subscriptionLevel}`);

    // 3. Get data
    const data = await FeatureService.getData(session.userId);

    // 4. Return
    console.log(`✅ [API /feature] Retrieved ${data.length} items`);
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('❌ [API /feature] GET error:', error);

    if (error.message.includes('Authorization') || 
        error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### ☐ Implement POST Handler

```javascript
export async function POST(request) {
  try {
    const session = await createApiSession(request);
    
    // Check create permission
    if (!session.permissions[FEATURE_CONSTANTS.CREATE_PERMISSION]) {
      return NextResponse.json(
        { error: 'Forbidden: Requires higher subscription' },
        { status: 403 }
      );
    }

    // Parse body
    const body = await request.json();

    // Validate (optional - use validation service)
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check limits
    const currentCount = await FeatureService.getCount(session.userId);
    const limits = FEATURE_LIMITS[session.subscriptionLevel];
    
    if (limits.maxItems !== -1 && currentCount >= limits.maxItems) {
      return NextResponse.json(
        { 
          error: 'Limit reached',
          limit: limits.maxItems,
          current: currentCount
        },
        { status: 429 }
      );
    }

    // Create
    const newItem = await FeatureService.createItem(session.userId, body);

    return NextResponse.json(newItem, { status: 201 });

  } catch (error) {
    console.error('❌ POST /api/user/feature error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### ☐ Create Dynamic Route (if needed)

```bash
mkdir -p app/api/user/feature/[id]
touch app/api/user/feature/[id]/route.js
```

### ☐ Implement PATCH Handler

```javascript
export async function PATCH(request, { params }) {
  try {
    const session = await createApiSession(request);
    
    if (!session.permissions[FEATURE_CONSTANTS.EDIT_PERMISSION]) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();

    const updatedItem = await FeatureService.updateItem(
      session.userId,
      id,
      body
    );

    return NextResponse.json(updatedItem, { status: 200 });

  } catch (error) {
    console.error('❌ PATCH error:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### ☐ Implement DELETE Handler

```javascript
export async function DELETE(request, { params }) {
  try {
    const session = await createApiSession(request);
    
    if (!session.permissions[FEATURE_CONSTANTS.DELETE_PERMISSION]) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    await FeatureService.deleteItem(session.userId, id);

    return NextResponse.json(
      { message: 'Item deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ DELETE error:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### ☐ Test API Routes

```bash
# Use curl or Postman to test each endpoint
# Test with different subscription levels
# Test permission denials
# Test limit enforcement
```

---

## Phase 5: Client Service (20-30 minutes)

### ☐ Create Client Service Directory

```bash
mkdir -p lib/services/serviceFeature/client/services
```

### ☐ Create Service File

```bash
touch lib/services/serviceFeature/client/services/FeatureService.js
```

### ☐ Implement Token Caching

```javascript
import { getAuth } from 'firebase/auth';
import { app } from '@/important/firebase';

class FeatureService {
  
  static async getToken() {
    const auth = getAuth(app);
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Use 50-minute cache
    const now = Date.now();
    if (user._tokenCache && user._tokenCache.expiry > now) {
      return user._tokenCache.token;
    }

    const token = await user.getIdToken();
    user._tokenCache = {
      token,
      expiry: now + (50 * 60 * 1000) // 50 minutes
    };

    return token;
  }
}
```

### ☐ Implement Service-Level Caching

```javascript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let cache = {
  data: null,
  expiry: null,
  listeners: new Set()
};

class FeatureService {
  // ... getToken method

  static invalidateCache() {
    cache.data = null;
    cache.expiry = null;
  }

  static notifyListeners(data) {
    cache.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('❌ Listener error:', error);
      }
    });
  }
}
```

### ☐ Implement getData Method

```javascript
"use client";

import { ContactApiClient } from '@/lib/services/core/ApiClient';

class FeatureService {
  
  static async getData(force = false) {
    // Return cached if valid
    if (!force && cache.data && Date.now() < cache.expiry) {
      return cache.data;
    }

    try {
      console.log('📥 FeatureService: Fetching fresh data from API...');
      
      // Use ContactApiClient - handles auth automatically
      const data = await ContactApiClient.get('/api/user/feature');

      // Update cache
      cache.data = data;
      cache.expiry = Date.now() + CACHE_DURATION;
      this.notifyListeners(data);

      return data;
    } catch (error) {
      console.error('❌ FeatureService.getData error:', error);
      throw error;
    }
  }
}
```

### ☐ Implement Mutation Methods

```javascript
static async createItem(itemData) {
  try {
    console.log('📝 FeatureService: Creating item...');
    
    // Use ContactApiClient - handles auth automatically
    const newItem = await ContactApiClient.post('/api/user/feature', itemData);

    // Invalidate cache on mutation
    this.invalidateCache();

    return newItem;
  } catch (error) {
    console.error('❌ FeatureService.createItem error:', error);
    throw error;
  }
}

static async updateItem(itemId, updates) {
  try {
    console.log(`📝 FeatureService: Updating item ${itemId}...`);
    
    // Use ContactApiClient.patch - handles auth automatically
    const updatedItem = await ContactApiClient.patch(`/api/user/feature/${itemId}`, updates);

    // Invalidate cache
    this.invalidateCache();

    return updatedItem;
  } catch (error) {
    console.error('❌ FeatureService.updateItem error:', error);
    throw error;
  }
}

static async deleteItem(itemId) {
  try {
    console.log(`🗑️ FeatureService: Deleting item ${itemId}...`);
    
    // Use ContactApiClient.delete - handles auth automatically
    await ContactApiClient.delete(`/api/user/feature/${itemId}`);

    // Invalidate cache
    this.invalidateCache();
  } catch (error) {
    console.error('❌ FeatureService.deleteItem error:', error);
    throw error;
  }
}

export { FeatureService };
```

### ☐ Add Real-Time Subscription (optional)

```javascript
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { app } from '@/important/firebase';

const db = getFirestore(app);

static subscribe(userId, callback) {
  if (!userId) {
    throw new Error('userId is required for subscription');
  }

  try {
    const docRef = doc(db, 'FeatureData', userId);
    
    const unsubscribe = onSnapshot(docRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          callback(data.items || []);
          
          // Update cache
          cache.data = data.items || [];
          cache.expiry = Date.now() + CACHE_DURATION;
        } else {
          callback([]);
        }
      },
      (error) => {
        console.error('❌ Subscription error:', error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ FeatureService.subscribe error:', error);
    throw error;
  }
}
```

---

## Phase 6: Context Provider (30-45 minutes)

### ☐ Create Context File

```bash
touch app/dashboard/(dashboard pages)/feature/FeatureContext.js
```

### ☐ Set Up Context Structure

```javascript
"use client";

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect,
  useCallback 
} from 'react';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { FeatureService } from '@/lib/services/serviceFeature/client/services/FeatureService';
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

const FeatureContext = createContext(undefined);

export function FeatureProvider({ children }) {
  const { session } = useDashboard();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ... implementation

  return (
    <FeatureContext.Provider value={value}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeature() {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeature must be used within FeatureProvider');
  }
  return context;
}
```

### ☐ Implement Data Loading

```javascript
useEffect(() => {
  if (!session?.userId) return;
  loadData();
}, [session?.userId]);

const loadData = async (force = false) => {
  try {
    setLoading(true);
    setError(null);
    const result = await FeatureService.getData(force);
    setData(result);
  } catch (err) {
    console.error('❌ Failed to load data:', err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### ☐ Implement CRUD Actions

```javascript
const createItem = useCallback(async (itemData) => {
  if (!session?.permissions?.[FEATURE_CONSTANTS.CREATE_PERMISSION]) {
    throw new Error('Permission denied');
  }

  const newItem = await FeatureService.createItem(itemData);
  setData(prev => [...prev, newItem]);
  return newItem;
}, [session?.permissions]);

const updateItem = useCallback(async (itemId, updates) => {
  if (!session?.permissions?.[FEATURE_CONSTANTS.EDIT_PERMISSION]) {
    throw new Error('Permission denied');
  }

  const updatedItem = await FeatureService.updateItem(itemId, updates);
  setData(prev => 
    prev.map(item => item.id === itemId ? updatedItem : item)
  );
  return updatedItem;
}, [session?.permissions]);

const deleteItem = useCallback(async (itemId) => {
  if (!session?.permissions?.[FEATURE_CONSTANTS.DELETE_PERMISSION]) {
    throw new Error('Permission denied');
  }

  await FeatureService.deleteItem(itemId);
  setData(prev => prev.filter(item => item.id !== itemId));
}, [session?.permissions]);
```

### ☐ Implement Refresh Action

```javascript
const refresh = useCallback(() => {
  return loadData(true);
}, []);
```

### ☐ Define Context Value

```javascript
const value = {
  // Data
  data,
  loading,
  error,
  
  // Actions
  createItem,
  updateItem,
  deleteItem,
  refresh,
  
  // Helpers
  getItemById: (id) => data.find(item => item.id === id),
  count: data.length
};
```

### ☐ Add Real-Time Subscription (optional)

```javascript
useEffect(() => {
  if (!session?.userId) return;

  const unsubscribe = FeatureService.subscribe(
    session.userId,
    (updatedData) => {
      setData(updatedData);
    }
  );

  return () => {
    unsubscribe();
  };
}, [session?.userId]);
```

---

## Phase 7: Page Component (45-60 minutes)

### ☐ Create Page File

```bash
touch app/dashboard/(dashboard pages)/feature/page.jsx
```

### ☐ Set Up Component Structure

```javascript
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTranslation } from "@/lib/translation";
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { useFeature } from './FeatureContext';
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

export default function FeaturePage() {
  const t = useTranslation();
  const router = useRouter();
  const { session } = useDashboard();
  const { 
    data, 
    loading, 
    error,
    createItem,
    updateItem,
    deleteItem 
  } = useFeature();

  // Local UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // ... implementation

  return (
    <div className="feature-page">
      {/* ... JSX */}
    </div>
  );
}
```

### ☐ Implement Permission Checks

```javascript
const canCreate = session?.permissions?.[FEATURE_CONSTANTS.CREATE_PERMISSION];
const canEdit = session?.permissions?.[FEATURE_CONSTANTS.EDIT_PERMISSION];
const canDelete = session?.permissions?.[FEATURE_CONSTANTS.DELETE_PERMISSION];
```

### ☐ Implement Event Handlers

```javascript
const handleCreate = async (formData) => {
  try {
    await createItem(formData);
    toast.success(t('feature.created'));
    setIsModalOpen(false);
  } catch (error) {
    toast.error(error.message || t('errors.generic'));
  }
};

const handleUpdate = async (id, updates) => {
  try {
    await updateItem(id, updates);
    toast.success(t('feature.updated'));
  } catch (error) {
    toast.error(error.message || t('errors.generic'));
  }
};

const handleDelete = async (id) => {
  if (!confirm(t('feature.confirmDelete'))) return;
  
  try {
    await deleteItem(id);
    toast.success(t('feature.deleted'));
  } catch (error) {
    toast.error(error.message || t('errors.generic'));
  }
};
```

### ☐ Implement Loading State

```javascript
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}
```

### ☐ Implement Error State

```javascript
if (error) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-red-600 mb-4">{t('errors.loadFailed')}</p>
        <button 
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          {t('actions.retry')}
        </button>
      </div>
    </div>
  );
}
```

### ☐ Implement Main UI

```javascript
return (
  <div className="feature-page p-6">
    <header className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">{t('feature.title')}</h1>
      {canCreate && (
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
        >
          {t('feature.create')}
        </button>
      )}
    </header>

    {data.length === 0 ? (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{t('feature.empty')}</p>
        {canCreate && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            {t('feature.createFirst')}
          </button>
        )}
      </div>
    ) : (
      <div className="grid gap-4">
        {data.map(item => (
          <div key={item.id} className="card p-4">
            <h3 className="font-semibold">{item.name}</h3>
            <div className="flex gap-2 mt-2">
              {canEdit && (
                <button 
                  onClick={() => handleUpdate(item.id, { /* updates */ })}
                  className="btn btn-sm btn-secondary"
                >
                  {t('actions.edit')}
                </button>
              )}
              {canDelete && (
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="btn btn-sm btn-danger"
                >
                  {t('actions.delete')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}

    {isModalOpen && (
      <CreateModal
        onSubmit={handleCreate}
        onClose={() => setIsModalOpen(false)}
      />
    )}
  </div>
);
```

### ☐ Create Layout with Provider

```bash
touch app/dashboard/(dashboard pages)/feature/layout.jsx
```

```javascript
import { FeatureProvider } from './FeatureContext';

export default function FeatureLayout({ children }) {
  return (
    <FeatureProvider>
      {children}
    </FeatureProvider>
  );
}
```

---

## Phase 8: Testing (30-60 minutes)

### ☐ Build Test

```bash
npm run build
# Should complete without errors
```

### ☐ Manual Testing Checklist

#### Test Authentication
- [ ] Access page when logged out → Should redirect
- [ ] Access page when logged in → Should load

#### Test Permissions (BASE Subscription)
- [ ] Can view items
- [ ] Cannot create (or limited)
- [ ] Cannot edit advanced features
- [ ] See upgrade prompts where appropriate

#### Test Permissions (PRO Subscription)
- [ ] Can create items
- [ ] Can edit items
- [ ] Can delete items
- [ ] Can access advanced features

#### Test CRUD Operations
- [ ] Create an item → Success toast, item appears
- [ ] Create invalid item → Error toast, no item created
- [ ] Update an item → Success toast, changes reflected
- [ ] Delete an item → Confirm dialog, success toast, item removed

#### Test Limits
- [ ] Create items up to limit → Works
- [ ] Try to exceed limit → Error message with upgrade prompt
- [ ] Upgrade and retry → Now works

#### Test Error Handling
- [ ] Network error → User-friendly error message
- [ ] Permission denied → Clear upgrade path shown
- [ ] Invalid input → Helpful validation messages

#### Test Loading States
- [ ] Initial load shows spinner
- [ ] Actions show loading indicators
- [ ] No "flash of wrong content"

#### Test Real-Time Updates (if implemented)
- [ ] Changes in one tab appear in another
- [ ] No duplicate updates

---

## Phase 9: Documentation (15-30 minutes)

### ☐ Add Inline Comments

- [ ] Complex logic has explanatory comments
- [ ] Public methods have JSDoc comments
- [ ] Constants have descriptions

### ☐ Update Feature Documentation

```markdown
# Feature Name

## Overview
Brief description of the feature

## Permissions
- VIEW_PERMISSION: Who can view
- CREATE_PERMISSION: Who can create
- etc.

## Limits
- BASE: X items
- PRO: Y items
- ENTERPRISE: Unlimited

## API Endpoints
- GET /api/user/feature - Get all items
- POST /api/user/feature - Create item
- etc.

## Implementation Notes
- Uses service-level caching
- Real-time updates via Firestore listeners
- Supports batch operations
```

### ☐ Update CHANGELOG

```markdown
## [Version] - YYYY-MM-DD

### Added
- New Feature X
  - CRUD operations for items
  - Real-time synchronization
  - Subscription-based limits
  
### API Endpoints
- GET /api/user/feature
- POST /api/user/feature
- PATCH /api/user/feature/[id]
- DELETE /api/user/feature/[id]
```

---

## Phase 10: Deployment (15-30 minutes)

### ☐ Pre-Deployment Checklist

- [ ] All tests pass
- [ ] No console errors in dev
- [ ] No console.log statements in production code
- [ ] All magic strings replaced with constants
- [ ] All imports use barrel file
- [ ] Error handling in place
- [ ] Loading states implemented
- [ ] Permission checks everywhere

### ☐ Git Workflow

```bash
# Create feature branch
git checkout -b feature/feature-name

# Add files
git add .

# Commit with descriptive message
git commit -m "feat: Add Feature X with CRUD operations

- Add server service for feature management
- Create API routes with permission checks
- Implement client service with caching
- Add context provider for state management
- Create page component with full UI
- Add subscription-based limits
- Implement real-time updates

Closes #123"

# Push to remote
git push origin feature/feature-name
```

### ☐ Create Pull Request

- [ ] Clear title and description
- [ ] Link to related issues
- [ ] Screenshots of new UI (if applicable)
- [ ] Testing instructions
- [ ] Breaking changes noted

### ☐ Deploy

```bash
# Merge to main (after PR approval)
git checkout main
git pull origin main

# Deploy (method depends on your setup)
# Vercel: Automatic on push to main
# Or manual: npm run deploy
```

### ☐ Post-Deployment Verification

- [ ] Feature works in production
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] All subscription levels work correctly

---

## 🎉 Completion Checklist

### Code Quality
- [ ] No ESLint errors
- [ ] No TypeScript errors (if using TS)
- [ ] Follows naming conventions
- [ ] Uses constants (no magic strings)
- [ ] Imports from barrel file

### Architecture
- [ ] Follows 5-layer pattern
- [ ] Clear separation of concerns
- [ ] No circular dependencies
- [ ] Proper error handling

### Functionality
- [ ] All CRUD operations work
- [ ] Permissions enforced
- [ ] Limits checked
- [ ] Loading states shown
- [ ] Errors handled gracefully

### User Experience
- [ ] Intuitive UI
- [ ] Clear feedback (toasts)
- [ ] Upgrade prompts where needed
- [ ] Responsive design
- [ ] Accessible

### Documentation
- [ ] Code comments added
- [ ] API documented
- [ ] Feature documented
- [ ] CHANGELOG updated

---

## 📊 Time Estimate Summary

- Planning: 15-30 minutes
- Constants: 10-15 minutes
- Server Service: 30-60 minutes
- API Routes: 30-45 minutes
- Client Service: 20-30 minutes
- Context: 30-45 minutes
- Page Component: 45-60 minutes
- Testing: 30-60 minutes
- Documentation: 15-30 minutes
- Deployment: 15-30 minutes

**Total: 3.5 - 7 hours** for a complete feature

---

## 💡 Tips

1. **Don't skip planning** - 30 minutes of planning saves hours of refactoring
2. **Copy existing patterns** - Look at similar features for reference
3. **Test as you go** - Don't wait until the end to test
4. **Use constants early** - Set them up before writing code
5. **Follow the order** - Each phase builds on the previous
6. **Take breaks** - Better code when not tired
7. **Ask for help** - If stuck > 30 minutes, ask
8. **Document decisions** - Future you will thank you

---

**Good luck with your implementation! 🚀**
