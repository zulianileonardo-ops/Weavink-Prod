# Weavink Main Coding Skill

**Version:** 1.0  
**Last Updated:** 2024-11-18  
**Purpose:** Complete guide for implementing features in the Weavink codebase

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Decision Trees](#decision-trees)
3. [Layer 1: Page Components](#layer-1-page-components)
4. [Layer 2: Context Providers](#layer-2-context-providers)
5. [Layer 3: Client Services](#layer-3-client-services)
6. [Layer 4: API Routes](#layer-4-api-routes)
7. [Layer 5: Server Services](#layer-5-server-services)
8. [Cross-Cutting Concerns](#cross-cutting-concerns)
9. [Common Workflows](#common-workflows)
10. [Testing & Validation](#testing--validation)
11. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

### The 5-Layer Architecture

Weavink uses a **clear separation of concerns** with 5 distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: PAGE COMPONENTS (UI)                              │
│  Location: app/dashboard/(dashboard pages)/[feature]/       │
│  File: page.jsx                                             │
│  Responsibility: Render UI, handle user interactions        │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: CONTEXT PROVIDERS (State Management)              │
│  Location: app/dashboard/(dashboard pages)/[feature]/       │
│  File: [Feature]Context.js                                  │
│  Responsibility: Manage state, coordinate data flow         │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: CLIENT SERVICES (API Calls)                       │
│  Location: lib/services/service[Feature]/client/services/   │
│  File: [Feature]Service.js                                  │
│  Responsibility: HTTP requests, caching, subscriptions      │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: API ROUTES (Server Interface)                     │
│  Location: app/api/user/[resource]/                         │
│  File: route.js                                             │
│  Responsibility: Auth, validation, orchestration            │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: SERVER SERVICES (Business Logic)                  │
│  Location: lib/services/service[Feature]/server/            │
│  File: [feature]Service.js                                  │
│  Responsibility: Database ops, business rules, validation   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Example: Creating a Contact

```javascript
// 1. USER ACTION (Layer 1 - Page Component)
// File: app/dashboard/(dashboard pages)/contacts/page.jsx
function ContactsPage() {
  const { createContact } = useContacts(); // From context
  
  const handleSubmit = async (formData) => {
    await createContact(formData); // Delegate to context
  };
}

// 2. STATE MANAGEMENT (Layer 2 - Context)
// File: app/dashboard/(dashboard pages)/contacts/ContactsContext.js
const createContact = async (data) => {
  const result = await ContactService.createContact(data); // Delegate to client service
  setContacts([...contacts, result]); // Update local state
};

// 3. API CALL (Layer 3 - Client Service)
// File: lib/services/serviceContact/client/services/ContactService.js
static async createContact(data) {
  const response = await fetch('/api/user/contacts', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
}

// 4. SERVER INTERFACE (Layer 4 - API Route)
// File: app/api/user/contacts/route.js
export async function POST(request) {
  const session = await createApiSession(request); // Auth check
  const data = await request.json();
  
  const result = await ContactCRUDService.createContact(
    session.userId,
    data
  ); // Delegate to server service
  
  return NextResponse.json(result);
}

// 5. BUSINESS LOGIC (Layer 5 - Server Service)
// File: lib/services/serviceContact/server/ContactCRUDService.js
static async createContact(userId, data) {
  // Validate
  // Check limits
  // Update Firestore
  // Return result
}
```

---

## 🤔 Decision Trees

### Decision Tree 1: Where Does My Code Go?

```
START: I need to implement [functionality]

Q1: Does it involve UI rendering or user interaction?
  YES → Layer 1: Page Component
  NO  → Continue

Q2: Does it involve managing state or coordinating data?
  YES → Layer 2: Context Provider
  NO  → Continue

Q3: Does it involve HTTP requests or caching?
  YES → Layer 3: Client Service
  NO  → Continue

Q4: Does it involve auth, validation, or request orchestration?
  YES → Layer 4: API Route
  NO  → Continue

Q5: Does it involve database operations or business logic?
  YES → Layer 5: Server Service
  NO  → Re-evaluate (might be a constant or utility)
```

### Decision Tree 2: Do I Need a Context?

```
START: I have state in my component

Q1: Is this state used by multiple components?
  NO  → Use local useState, no context needed
  YES → Continue

Q2: Are these components siblings or deeply nested?
  YES → You need a Context
  NO  → Continue

Q3: Does this state need to be shared across routes?
  YES → You need a Context
  NO  → Use props or composition

Q4: Does this state involve complex data fetching logic?
  YES → You need a Context
  NO  → Use local state with props
```

### Decision Tree 3: Client Service vs Direct API Call?

```
START: I need to call an API endpoint

Q1: Will this endpoint be called from multiple places?
  YES → Create a Client Service
  NO  → Continue

Q2: Does this need caching or real-time subscriptions?
  YES → Create a Client Service
  NO  → Continue

Q3: Is there complex logic around the API call?
  YES → Create a Client Service
  NO  → Direct fetch in Context might be OK

GENERAL RULE: When in doubt, create a Client Service
```

---

## 🎨 Layer 1: Page Components

### Purpose
- Render UI elements
- Handle user interactions
- Consume context for data
- Display loading/error states

### File Location
```
app/dashboard/(dashboard pages)/[feature]/page.jsx
```

### Template

```javascript
"use client";

// 1. React imports
import React, { useEffect, useState } from 'react';

// 2. Next.js imports
import { useRouter } from 'next/navigation';

// 3. Third-party libraries
import { toast } from 'react-hot-toast';

// 4. Internal utilities
import { useTranslation } from "@/lib/translation";

// 5. Contexts
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { useFeature } from './FeatureContext';

// 6. Constants
import { 
  FEATURE_CONSTANTS,
  SUBSCRIPTION_LEVELS 
} from '@/lib/services/constants';

// 7. Child components
import FeatureList from './components/FeatureList';
import LoadingSpinner from '@/components/LoadingSpinner';

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

  // Local UI state only (not business state)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Check permissions
  const canCreate = session?.permissions?.[FEATURE_CONSTANTS.CREATE_PERMISSION];

  // Handlers
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

  // Loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  // Error state
  if (error) {
    return (
      <div className="error-container">
        <p>{t('errors.loadFailed')}</p>
        <button onClick={() => window.location.reload()}>
          {t('actions.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="feature-page">
      <header>
        <h1>{t('feature.title')}</h1>
        {canCreate && (
          <button onClick={() => setIsModalOpen(true)}>
            {t('feature.create')}
          </button>
        )}
      </header>

      <FeatureList
        items={data}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        canEdit={canCreate}
      />

      {isModalOpen && (
        <CreateModal
          onSubmit={handleCreate}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
```

### Key Rules

#### ✅ DO:
- Use `"use client"` directive at the top
- Import contexts with `use[Feature]()` pattern
- Handle loading and error states explicitly
- Use constants for permissions and feature flags
- Keep business logic in Context/Services
- Use try-catch for all async operations
- Show user feedback (toasts) for actions

#### ❌ DON'T:
- Make API calls directly (use Context → Service)
- Store business data in local state (use Context)
- Hardcode strings (use translation + constants)
- Put complex logic in components (extract to utils)
- Forget to check permissions before rendering controls
- Use `console.log` in production code
- Mix client and server Firebase imports

### Common Patterns

#### Pattern 1: Permission-Based Rendering

```javascript
const { session } = useDashboard();
const canEdit = session?.permissions?.[FEATURE_CONSTANTS.EDIT_PERMISSION];

return (
  <div>
    {canEdit ? (
      <button onClick={handleEdit}>Edit</button>
    ) : (
      <UpgradePrompt feature={FEATURE_CONSTANTS.EDIT_PERMISSION} />
    )}
  </div>
);
```

#### Pattern 2: Optimistic Updates

```javascript
const handleLike = async (itemId) => {
  // Optimistic update
  const optimisticData = data.map(item =>
    item.id === itemId ? { ...item, liked: true } : item
  );
  setData(optimisticData);

  try {
    await updateItem(itemId, { liked: true });
  } catch (error) {
    // Revert on error
    setData(data);
    toast.error(t('errors.updateFailed'));
  }
};
```

#### Pattern 3: Debounced Search

```javascript
import { debounce } from 'lodash';

const handleSearch = debounce(async (query) => {
  if (query.length < 2) return;
  await searchItems(query);
}, 300);

<input 
  type="text"
  onChange={(e) => handleSearch(e.target.value)}
  placeholder={t('search.placeholder')}
/>
```

---

## 🔄 Layer 2: Context Providers

### Purpose
- Manage feature-specific state
- Coordinate data fetching and updates
- Provide data and actions to components
- Handle real-time subscriptions
- Cache invalidation logic

### File Location
```
app/dashboard/(dashboard pages)/[feature]/FeatureContext.js
```

### Template

```javascript
"use client";

// 1. React imports
import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect,
  useCallback 
} from 'react';

// 2. Contexts
import { useDashboard } from '@/app/dashboard/DashboardContext';

// 3. Services
import { FeatureService } from '@/lib/services/serviceFeature/client/services/FeatureService';

// 4. Constants
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

// Create context
const FeatureContext = createContext(undefined);

// Provider component
export function FeatureProvider({ children }) {
  const { session } = useDashboard();
  
  // State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial data load
  useEffect(() => {
    if (!session?.userId) return;
    loadData();
  }, [session?.userId]);

  // Load data
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

  // Create item
  const createItem = useCallback(async (itemData) => {
    if (!session?.permissions?.[FEATURE_CONSTANTS.CREATE_PERMISSION]) {
      throw new Error('Permission denied');
    }

    const newItem = await FeatureService.createItem(itemData);
    setData(prev => [...prev, newItem]);
    return newItem;
  }, [session?.permissions]);

  // Update item
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

  // Delete item
  const deleteItem = useCallback(async (itemId) => {
    if (!session?.permissions?.[FEATURE_CONSTANTS.DELETE_PERMISSION]) {
      throw new Error('Permission denied');
    }

    await FeatureService.deleteItem(itemId);
    setData(prev => prev.filter(item => item.id !== itemId));
  }, [session?.permissions]);

  // Refresh data
  const refresh = useCallback(() => {
    return loadData(true); // Force refresh
  }, []);

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

  return (
    <FeatureContext.Provider value={value}>
      {children}
    </FeatureContext.Provider>
  );
}

// Custom hook
export function useFeature() {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeature must be used within FeatureProvider');
  }
  return context;
}
```

### Key Rules

#### ✅ DO:
- Use `useCallback` for functions to prevent re-renders
- Check permissions before allowing actions
- Delegate API calls to Client Services
- Provide both data and actions in context value
- Handle loading, error, and success states
- Include a `refresh()` method for manual updates
- Validate user has session before operations

#### ❌ DON'T:
- Make direct API calls (use Client Services)
- Store non-feature-specific state (use DashboardContext)
- Expose internal state (provide computed values)
- Forget error handling
- Create circular dependencies with other contexts
- Put complex business logic here (use Server Services)

### Common Patterns

#### Pattern 1: Real-Time Subscriptions

```javascript
useEffect(() => {
  if (!session?.userId) return;

  // Subscribe to real-time updates
  const unsubscribe = FeatureService.subscribe(
    session.userId,
    (updatedData) => {
      setData(updatedData);
    }
  );

  return () => {
    unsubscribe(); // Cleanup on unmount
  };
}, [session?.userId]);
```

#### Pattern 2: Pagination

```javascript
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

const loadMore = async () => {
  if (loading || !hasMore) return;
  
  try {
    setLoading(true);
    const nextData = await FeatureService.getData({ page: page + 1 });
    
    if (nextData.length === 0) {
      setHasMore(false);
    } else {
      setData(prev => [...prev, ...nextData]);
      setPage(prev => prev + 1);
    }
  } catch (err) {
    console.error('❌ Failed to load more:', err);
  } finally {
    setLoading(false);
  }
};
```

#### Pattern 3: Filtered Data

```javascript
const [filters, setFilters] = useState({
  status: 'all',
  category: 'all'
});

const filteredData = useMemo(() => {
  return data.filter(item => {
    if (filters.status !== 'all' && item.status !== filters.status) {
      return false;
    }
    if (filters.category !== 'all' && item.category !== filters.category) {
      return false;
    }
    return true;
  });
}, [data, filters]);

// Expose filtered data
const value = {
  data: filteredData,
  filters,
  setFilters,
  // ... other values
};
```

---

## 📡 Layer 3: Client Services

### Purpose
- Make HTTP requests to API routes
- Implement caching strategy
- Manage real-time subscriptions
- Handle request/response formatting
- Token management

### File Location
```
lib/services/service[Feature]/client/services/FeatureService.js
```

### Template

```javascript
"use client";

// 1. API Client (CRITICAL - handles auth automatically)
import { ContactApiClient } from '@/lib/services/core/ApiClient';

// 2. Firebase client (for real-time subscriptions only)
import { getFirestore, doc, onSnapshot, collection } from 'firebase/firestore';
import { app } from '@/important/firebase';

// 3. Constants
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

// Initialize Firestore client (for subscriptions)
const db = getFirestore(app);

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache storage
let cache = {
  data: null,
  expiry: null,
  listeners: new Set()
};

/**
 * Client service for [Feature] operations
 * Handles API calls, caching, and real-time subscriptions
 * 
 * IMPORTANT: Uses ContactApiClient for all HTTP requests
 * (handles authentication, token caching, error handling automatically)
 */
class FeatureService {

  /**
   * Get all items (with caching)
   * @param {boolean} force - Force refresh cache
   * @returns {Promise<Array>}
   */
  static async getData(force = false) {
    // Return cached data if valid
    if (!force && cache.data && Date.now() < cache.expiry) {
      console.log('🔄 FeatureService: Serving from cache');
      return cache.data;
    }

    try {
      console.log('📥 FeatureService: Fetching fresh data from API...');
      
      // Use ContactApiClient - handles auth automatically
      const data = await ContactApiClient.get('/api/user/feature');

      // Update cache
      cache.data = data;
      cache.expiry = Date.now() + CACHE_DURATION;

      // Notify subscribers
      this.notifyListeners(data);

      return data;
    } catch (error) {
      console.error('❌ FeatureService.getData error:', error);
      throw error;
    }
  }

  /**
   * Create a new item
   * @param {Object} itemData - Item data
   * @returns {Promise<Object>}
   */
  static async createItem(itemData) {
    try {
      console.log('📝 FeatureService: Creating item...');
      
      // Use ContactApiClient.post - handles auth automatically
      const newItem = await ContactApiClient.post('/api/user/feature', itemData);

      // Invalidate cache
      this.invalidateCache();

      return newItem;
    } catch (error) {
      console.error('❌ FeatureService.createItem error:', error);
      throw error;
    }
  }

  /**
   * Update an existing item
   * @param {string} itemId - Item ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>}
   */
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

  /**
   * Delete an item
   * @param {string} itemId - Item ID
   * @returns {Promise<void>}
   */
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

  /**
   * Subscribe to real-time updates
   * @param {string} userId - User ID
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
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

  /**
   * Invalidate cache
   * Forces next getData() to fetch fresh data
   */
  static invalidateCache() {
    console.log('🗑️ FeatureService: Invalidating cache');
    cache.data = null;
    cache.expiry = null;
  }

  /**
   * Add cache listener
   * @param {Function} listener - Listener function
   * @returns {Function} Remove listener function
   */
  static addCacheListener(listener) {
    cache.listeners.add(listener);
    
    // Return cleanup function
    return () => {
      cache.listeners.delete(listener);
    };
  }

  /**
   * Notify all cache listeners
   * @param {*} data - Updated data
   */
  static notifyListeners(data) {
    cache.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('❌ Listener error:', error);
      }
    });
  }

  /**
   * Get cached data without making API call
   * @returns {Object|null} - Cached data or null
   */
  static getCachedData() {
    const now = Date.now();
    if (cache.data && cache.expiry && now < cache.expiry) {
      return cache.data;
    }
    return null;
  }
}

export { FeatureService };
```

### Key Rules

#### ✅ DO:
- **ALWAYS import ContactApiClient** for HTTP requests: `import { ContactApiClient } from '@/lib/services/core/ApiClient';`
- Use `ContactApiClient.get()`, `.post()`, `.patch()`, `.delete()` instead of raw fetch
- Export as a class with static methods
- Implement service-level caching (not component-level)
- Invalidate cache after mutations
- Use try-catch for all API calls
- Provide subscribe/unsubscribe methods for real-time
- Add console logs for debugging (`console.log`, `console.error`)

#### ❌ DON'T:
- Use raw `fetch()` - ContactApiClient handles auth automatically
- Mix Firebase client and admin SDKs
- Store sensitive data in cache
- Use `localStorage` for tokens
- Make direct database calls (use API routes)
- Forget to handle 401/403 responses
- Use component-level caching (use service-level)
- Manually manage auth tokens (ContactApiClient does this)

### Common Patterns

#### Pattern 1: Search with Debouncing

```javascript
// In service
static async search(query, options = {}) {
  try {
    const token = await this.getToken();
    const params = new URLSearchParams({
      q: query,
      ...options
    });
    
    const response = await fetch(`/api/user/feature/search?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  } catch (error) {
    console.error('❌ Search error:', error);
    throw error;
  }
}

// In Context
import { debounce } from 'lodash';

const debouncedSearch = useCallback(
  debounce(async (query) => {
    const results = await FeatureService.search(query);
    setSearchResults(results);
  }, 300),
  []
);
```

#### Pattern 2: Batch Operations

```javascript
static async batchUpdate(updates) {
  try {
    const token = await this.getToken();
    
    const response = await fetch('/api/user/feature/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ operations: updates })
    });

    if (!response.ok) throw new Error('Batch update failed');
    
    this.invalidateCache();
    return await response.json();
  } catch (error) {
    console.error('❌ Batch update error:', error);
    throw error;
  }
}
```

#### Pattern 3: File Upload

```javascript
static async uploadFile(file, metadata = {}) {
  try {
    const token = await this.getToken();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await fetch('/api/user/feature/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData!
      },
      body: formData
    });

    if (!response.ok) throw new Error('Upload failed');
    return await response.json();
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error;
  }
}
```

---

## 🛣️ Layer 4: API Routes

### Purpose
- Authenticate requests
- Validate permissions
- Parse and validate input
- Orchestrate server services
- Return formatted responses
- Handle errors consistently

### File Location
```
app/api/user/[resource]/route.js
```

### Template

```javascript
// 1. Next.js imports
import { NextResponse } from 'next/server';

// 2. Session management (CRITICAL)
import { createApiSession, SessionManager } from '@/lib/server/session';

// 3. Server services
import { FeatureService } from '@/lib/services/serviceFeature/server/featureService';
import { ValidationService } from '@/lib/services/serviceFeature/server/validationService';

// 4. Constants
import { 
  FEATURE_CONSTANTS,
  SUBSCRIPTION_LEVELS,
  PERMISSIONS 
} from '@/lib/services/constants';

/**
 * GET /api/user/feature
 * Get all items for the authenticated user
 * 
 * Architecture:
 * 1. Authenticate & create session
 * 2. Check permissions
 * 3. Call server service
 * 4. Return formatted response
 */
export async function GET(request) {
  try {
    // Step 1: Authenticate & get session (ALWAYS FIRST)
    const session = await createApiSession(request);
    const userId = session.userId;
    
    console.log(`👤 [API /feature] User authenticated: ${userId}`);

    // Step 2: Check permissions
    if (!session.permissions[FEATURE_CONSTANTS.VIEW_PERMISSION]) {
      console.log(`❌ [API /feature] Insufficient permissions`);
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    console.log(`✅ [API /feature] Permission granted for ${session.subscriptionLevel}`);

    // Step 3: Call server service
    const data = await FeatureService.getData(userId);

    // Step 4: Return success response
    console.log(`✅ [API /feature] Retrieved ${data.length} items`);
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('❌ [API /feature] GET error:', error);

    // Handle specific errors
    if (error.message.includes('Authorization') || 
        error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/feature
 * Create a new item
 */
export async function POST(request) {
  try {
    // 1. Authenticate & get session
    const session = await createApiSession(request);
    
    // 2. Check permissions
    if (!session.permissions[FEATURE_CONSTANTS.CREATE_PERMISSION]) {
      return NextResponse.json(
        { error: 'Forbidden: Requires Pro subscription' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();

    // 4. Validate input
    const validation = ValidationService.validateCreateInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 5. Check limits (if applicable)
    const currentCount = await FeatureService.getCount(session.userId);
    const limits = FEATURE_CONSTANTS.LIMITS[session.subscriptionLevel];
    
    if (currentCount >= limits.maxItems) {
      return NextResponse.json(
        { 
          error: 'Limit reached',
          limit: limits.maxItems,
          current: currentCount
        },
        { status: 429 }
      );
    }

    // 6. Create item via server service
    const newItem = await FeatureService.createItem(
      session.userId,
      validation.data
    );

    // 7. Return success response
    return NextResponse.json(newItem, { status: 201 });

  } catch (error) {
    console.error('❌ POST /api/user/feature error:', error);

    if (error.message.includes('Authorization')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error.message.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Item already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/feature/[id]
 * Update an existing item
 */
export async function PATCH(request, { params }) {
  try {
    const session = await createApiSession(request);
    
    if (!session.permissions[FEATURE_CONSTANTS.EDIT_PERMISSION]) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();

    // Validate input
    const validation = ValidationService.validateUpdateInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Update item
    const updatedItem = await FeatureService.updateItem(
      session.userId,
      id,
      validation.data
    );

    return NextResponse.json(updatedItem, { status: 200 });

  } catch (error) {
    console.error('❌ PATCH /api/user/feature/[id] error:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/feature/[id]
 * Delete an item
 */
export async function DELETE(request, { params }) {
  try {
    const session = await createApiSession(request);
    
    if (!session.permissions[FEATURE_CONSTANTS.DELETE_PERMISSION]) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Delete item
    await FeatureService.deleteItem(session.userId, id);

    return NextResponse.json(
      { message: 'Item deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ DELETE /api/user/feature/[id] error:', error);

    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Key Rules

#### ✅ DO:
- **ALWAYS** call `createApiSession(request)` first
- Check permissions before any business logic
- Validate all input data
- Use constants for permissions and limits
- Return consistent error response format
- Use appropriate HTTP status codes
- Log errors with context (`console.error`)
- Handle specific error types explicitly

#### ❌ DON'T:
- Skip session validation
- Use magic strings for permissions
- Trust client input without validation
- Expose internal error details to client
- Make direct database calls (use server services)
- Forget to handle edge cases
- Return 200 for errors

### HTTP Status Codes Reference

```javascript
200 OK              - Successful GET, PATCH, DELETE
201 Created         - Successful POST
400 Bad Request     - Invalid input
401 Unauthorized    - Missing/invalid token
403 Forbidden       - Valid token but insufficient permissions
404 Not Found       - Resource doesn't exist
409 Conflict        - Duplicate resource
429 Too Many Requests - Rate limit or quota exceeded
500 Internal Error  - Unexpected server error
```

### Common Patterns

#### Pattern 1: Query Parameters

```javascript
export async function GET(request) {
  try {
    const session = await createApiSession(request);
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const query = searchParams.get('q') || '';

    // Validate
    if (limit > 100) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 100' },
        { status: 400 }
      );
    }

    const results = await FeatureService.search(session.userId, {
      query,
      page,
      limit
    });

    return NextResponse.json(results);
  } catch (error) {
    // ... error handling
  }
}
```

#### Pattern 2: Team/Organization Context

```javascript
export async function POST(request) {
  try {
    const session = await createApiSession(request);
    const sessionManager = new SessionManager(session);
    const body = await request.json();
    
    console.log(`👤 [API /feature] Processing request for user ${session.userId}`);
    
    // Validate team context
    const { teamId, organizationId } = body;
    
    if (teamId) {
      // Check team permission using SessionManager
      console.log(`🔍 [API /feature] Checking team permissions for team ${teamId}`);
      
      if (!sessionManager.hasTeamPermission(PERMISSIONS.CAN_CREATE, teamId)) {
        console.log(`❌ [API /feature] User lacks CAN_CREATE permission for team ${teamId}`);
        return NextResponse.json(
          { error: 'Insufficient team permissions' },
          { status: 403 }
        );
      }

      console.log(`✅ [API /feature] Team permission granted`);
    }

    // Proceed with team context
    const result = await FeatureService.createForTeam(
      session.userId,
      teamId,
      body
    );

    console.log(`✅ [API /feature] Created item for team ${teamId}`);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('❌ [API /feature] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### Pattern 3: File Upload Handling

```javascript
export async function POST(request) {
  try {
    const session = await createApiSession(request);
    
    if (!session.permissions[FEATURE_CONSTANTS.UPLOAD_PERMISSION]) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');
    const metadata = JSON.parse(formData.get('metadata') || '{}');

    // Validate file
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Invalid file' },
        { status: 400 }
      );
    }

    // Check file size (e.g., 5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large (max 5MB)' },
        { status: 400 }
      );
    }

    // Process file
    const result = await FeatureService.processFile(
      session.userId,
      file,
      metadata
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('❌ File upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
```

---

## ⚙️ Layer 5: Server Services

### Purpose
- Execute business logic
- Interact with database (Firestore)
- Validate business rules
- Perform calculations
- Handle data transformations
- Call third-party APIs

### File Location
```
lib/services/service[Feature]/server/featureService.js
```

### Template

```javascript
// 1. Firebase Admin SDK
import { adminDb, FieldValue } from '@/lib/firebaseAdmin';

// 2. Other server services
import { ValidationService } from './validationService';
import { CostTrackingService } from '@/lib/services/serviceContact/server/costTrackingService';

// 3. Constants
import { 
  FEATURE_CONSTANTS,
  SUBSCRIPTION_LEVELS 
} from '@/lib/services/constants';

/**
 * Server service for [Feature] operations
 * Handles database interactions and business logic
 */
class FeatureService {

  /**
   * Get all items for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  static async getData(userId) {
    try {
      const docRef = adminDb.collection('FeatureData').doc(userId);
      const doc = await docRef.get();

      if (!doc.exists) {
        // Initialize if doesn't exist
        await docRef.set({
          userId,
          items: [],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        return [];
      }

      return doc.data().items || [];
    } catch (error) {
      console.error('❌ FeatureService.getData error:', error);
      throw new Error('Failed to fetch data');
    }
  }

  /**
   * Get item count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>}
   */
  static async getCount(userId) {
    try {
      const items = await this.getData(userId);
      return items.length;
    } catch (error) {
      console.error('❌ FeatureService.getCount error:', error);
      return 0;
    }
  }

  /**
   * Create a new item
   * @param {string} userId - User ID
   * @param {Object} itemData - Item data
   * @returns {Promise<Object>}
   */
  static async createItem(userId, itemData) {
    try {
      // Validate business rules
      const validation = ValidationService.validateItem(itemData);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate ID
      const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create item object
      const newItem = {
        id: itemId,
        ...itemData,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add to Firestore
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

  /**
   * Update an existing item
   * @param {string} userId - User ID
   * @param {string} itemId - Item ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>}
   */
  static async updateItem(userId, itemId, updates) {
    try {
      // Get current items
      const items = await this.getData(userId);
      
      // Find item
      const itemIndex = items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        throw new Error('Item not found');
      }

      // Apply updates
      const updatedItem = {
        ...items[itemIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Update array
      items[itemIndex] = updatedItem;

      // Save to Firestore
      const docRef = adminDb.collection('FeatureData').doc(userId);
      await docRef.update({
        items: items,
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`✅ Updated item ${itemId} for user ${userId}`);
      return updatedItem;
    } catch (error) {
      console.error('❌ FeatureService.updateItem error:', error);
      
      if (error.message === 'Item not found') {
        throw error;
      }
      
      throw new Error('Failed to update item');
    }
  }

  /**
   * Delete an item
   * @param {string} userId - User ID
   * @param {string} itemId - Item ID
   * @returns {Promise<void>}
   */
  static async deleteItem(userId, itemId) {
    try {
      // Get current items
      const items = await this.getData(userId);
      
      // Find item
      const item = items.find(item => item.id === itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Remove from array
      const docRef = adminDb.collection('FeatureData').doc(userId);
      await docRef.update({
        items: FieldValue.arrayRemove(item),
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`✅ Deleted item ${itemId} for user ${userId}`);
    } catch (error) {
      console.error('❌ FeatureService.deleteItem error:', error);
      
      if (error.message === 'Item not found') {
        throw error;
      }
      
      throw new Error('Failed to delete item');
    }
  }

  /**
   * Search items
   * @param {string} userId - User ID
   * @param {Object} options - Search options
   * @returns {Promise<Array>}
   */
  static async search(userId, options = {}) {
    try {
      const { query = '', page = 1, limit = 10 } = options;
      
      // Get all items
      const items = await this.getData(userId);

      // Filter by query
      let filtered = items;
      if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = items.filter(item => 
          item.name?.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery)
        );
      }

      // Paginate
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginated = filtered.slice(start, end);

      return {
        items: paginated,
        total: filtered.length,
        page,
        limit,
        hasMore: end < filtered.length
      };
    } catch (error) {
      console.error('❌ FeatureService.search error:', error);
      throw new Error('Search failed');
    }
  }

  /**
   * Batch update items
   * @param {string} userId - User ID
   * @param {Array} operations - Array of {id, updates} objects
   * @returns {Promise<Array>}
   */
  static async batchUpdate(userId, operations) {
    try {
      const items = await this.getData(userId);
      let updated = [...items];

      for (const op of operations) {
        const index = updated.findIndex(item => item.id === op.id);
        if (index !== -1) {
          updated[index] = {
            ...updated[index],
            ...op.updates,
            updatedAt: new Date().toISOString()
          };
        }
      }

      // Save all at once
      const docRef = adminDb.collection('FeatureData').doc(userId);
      await docRef.update({
        items: updated,
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log(`✅ Batch updated ${operations.length} items for user ${userId}`);
      return updated;
    } catch (error) {
      console.error('❌ FeatureService.batchUpdate error:', error);
      throw new Error('Batch update failed');
    }
  }
}

export { FeatureService };
```

### Key Rules

#### ✅ DO:
- Use Firebase Admin SDK (`adminDb`, not client SDK)
- Export as a class with static methods
- Validate all business rules
- Use transactions for critical operations
- Log all database operations
- Use `FieldValue` for timestamps and arrays
- Return consistent data structures
- Handle Firestore-specific errors

#### ❌ DON'T:
- Mix client and admin Firebase SDKs
- Skip error handling
- Expose raw Firestore errors to callers
- Hardcode collection names (use constants if repeated)
- Forget to update `updatedAt` timestamps
- Trust input data without validation
- Use synchronous operations

### Common Patterns

#### Pattern 1: Transactions

```javascript
static async transferItem(fromUserId, toUserId, itemId) {
  try {
    const batch = adminDb.batch();

    // Get references
    const fromRef = adminDb.collection('FeatureData').doc(fromUserId);
    const toRef = adminDb.collection('FeatureData').doc(toUserId);

    // Get docs
    const fromDoc = await fromRef.get();
    const toDoc = await toRef.get();

    if (!fromDoc.exists) throw new Error('Source not found');
    if (!toDoc.exists) throw new Error('Destination not found');

    // Find item
    const items = fromDoc.data().items || [];
    const item = items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');

    // Remove from source
    batch.update(fromRef, {
      items: FieldValue.arrayRemove(item),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Add to destination
    batch.update(toRef, {
      items: FieldValue.arrayUnion({
        ...item,
        transferredFrom: fromUserId,
        transferredAt: new Date().toISOString()
      }),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Commit transaction
    await batch.commit();

    console.log(`✅ Transferred item ${itemId} from ${fromUserId} to ${toUserId}`);
  } catch (error) {
    console.error('❌ Transfer failed:', error);
    throw new Error('Failed to transfer item');
  }
}
```

#### Pattern 2: Third-Party API Integration

```javascript
static async enrichItem(userId, itemId, apiKey) {
  try {
    // Get item
    const items = await this.getData(userId);
    const item = items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');

    // Call third-party API
    const response = await fetch(`https://api.example.com/enrich`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: item.name })
    });

    if (!response.ok) {
      throw new Error('API call failed');
    }

    const enrichedData = await response.json();

    // Track cost
    await CostTrackingService.recordUsage({
      userId,
      usageType: 'ApiUsage',
      feature: 'enrich_item',
      cost: 0.01,
      provider: 'example_api',
      metadata: { itemId }
    });

    // Update item
    const updatedItem = await this.updateItem(userId, itemId, {
      enrichedData,
      enrichedAt: new Date().toISOString()
    });

    return updatedItem;
  } catch (error) {
    console.error('❌ Enrichment failed:', error);
    throw new Error('Failed to enrich item');
  }
}
```

#### Pattern 3: Aggregation

```javascript
static async getStatistics(userId) {
  try {
    const items = await this.getData(userId);

    // Calculate statistics
    const stats = {
      total: items.length,
      byStatus: {},
      byCategory: {},
      recentCount: 0,
      oldestItem: null,
      newestItem: null
    };

    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    items.forEach(item => {
      // Count by status
      stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;

      // Count by category
      stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;

      // Recent count
      const itemTime = new Date(item.createdAt).getTime();
      if (itemTime > sevenDaysAgo) {
        stats.recentCount++;
      }

      // Track oldest/newest
      if (!stats.oldestItem || itemTime < new Date(stats.oldestItem.createdAt).getTime()) {
        stats.oldestItem = item;
      }
      if (!stats.newestItem || itemTime > new Date(stats.newestItem.createdAt).getTime()) {
        stats.newestItem = item;
      }
    });

    return stats;
  } catch (error) {
    console.error('❌ Statistics calculation failed:', error);
    throw new Error('Failed to calculate statistics');
  }
}
```

---

## 🔗 Cross-Cutting Concerns

### ContactApiClient (HTTP Requests)

#### What is ContactApiClient?

**File:** `lib/services/core/ApiClient.js`

ContactApiClient is a centralized HTTP client that handles:
- ✅ Authentication (auto-adds Firebase token to headers)
- ✅ Token caching (50-minute expiry to avoid quota issues)
- ✅ Request/response formatting (JSON by default)
- ✅ Error handling (consistent error format)
- ✅ Retries (for transient failures)

#### Why Use ContactApiClient?

**Before (Raw Fetch):**
```javascript
// ❌ Manual token management, error handling, headers
const auth = getAuth(app);
const user = auth.currentUser;
const token = await user.getIdToken();

const response = await fetch('/api/user/contacts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || 'Request failed');
}

const result = await response.json();
return result;
```

**After (ContactApiClient):**
```javascript
// ✅ Clean, simple, all handled automatically
import { ContactApiClient } from '@/lib/services/core/ApiClient';

const result = await ContactApiClient.post('/api/user/contacts', data);
return result;
```

#### Available Methods

```javascript
// GET request
const data = await ContactApiClient.get('/api/user/feature');
const data = await ContactApiClient.get('/api/user/feature?page=1&limit=10');

// POST request
const newItem = await ContactApiClient.post('/api/user/feature', { name: 'Test' });

// PATCH request
const updated = await ContactApiClient.patch('/api/user/feature/123', { name: 'Updated' });

// DELETE request
await ContactApiClient.delete('/api/user/feature/123');
```

#### Error Handling

ContactApiClient throws errors with consistent format:

```javascript
try {
  await ContactApiClient.post('/api/user/feature', data);
} catch (error) {
  // error.message contains user-friendly message
  console.error('Operation failed:', error.message);
  toast.error(error.message);
}
```

#### When to Use

✅ **Always use ContactApiClient for:**
- API calls to `/api/user/*` routes
- Any authenticated HTTP request
- Requests that need retry logic

❌ **Don't use ContactApiClient for:**
- Firebase client SDK operations (use Firebase directly)
- Third-party API calls (use fetch with specific headers)
- Server-side requests (use fetch or axios on server)

### Session & Authentication

#### Getting Session in API Routes

```javascript
import { createApiSession } from '@/lib/server/session';

export async function POST(request) {
  // Always first line of API route
  const session = await createApiSession(request);
  
  // session contains:
  // - userId: string
  // - permissions: { [feature]: boolean }
  // - subscriptionLevel: string
  // - userData: { email, username, ... }
  // - teams: Array<{ teamId, role, permissions }>
}
```

#### Token Management (Client-Side)

```javascript
// In Client Service
static async getToken() {
  const auth = getAuth(app);
  const user = auth.currentUser;
  
  if (!user) throw new Error('No authenticated user');

  // Use 50-minute cache to avoid quota issues
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
```

#### Permission Checks

```javascript
// In API Route
if (!session.permissions[FEATURE_CONSTANTS.EDIT_PERMISSION]) {
  return NextResponse.json(
    { error: 'Forbidden: Requires Pro subscription' },
    { status: 403 }
  );
}

// For team permissions
import { SessionManager } from '@/lib/server/session';

const sm = new SessionManager(session);
if (!sm.hasTeamPermission(PERMISSIONS.CAN_MANAGE_TEAM, teamId)) {
  return NextResponse.json(
    { error: 'Insufficient team permissions' },
    { status: 403 }
  );
}
```

### Error Handling

#### Error Response Format

```javascript
// Standard error response
{
  error: string,              // User-friendly message
  code?: string,              // Optional error code
  details?: object            // Optional additional info
}
```

#### Common Error Patterns

```javascript
// In API Routes
try {
  // ... business logic
} catch (error) {
  console.error('❌ Operation failed:', error);

  // Authorization errors
  if (error.message.includes('Authorization') || 
      error.message.includes('token')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Not found errors
  if (error.message.includes('not found')) {
    return NextResponse.json(
      { error: 'Resource not found' },
      { status: 404 }
    );
  }

  // Validation errors
  if (error.message.includes('Invalid') ||
      error.message.includes('required')) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  // Permission errors
  if (error.message.includes('Permission') ||
      error.message.includes('Forbidden')) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  // Duplicate/conflict errors
  if (error.message.includes('duplicate') ||
      error.message.includes('already exists')) {
    return NextResponse.json(
      { error: 'Resource already exists' },
      { status: 409 }
    );
  }

  // Limit/quota errors
  if (error.message.includes('limit') ||
      error.message.includes('quota')) {
    return NextResponse.json(
      { error: 'Limit exceeded' },
      { status: 429 }
    );
  }

  // Generic server error
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

#### Client-Side Error Handling

```javascript
// In Context
try {
  await FeatureService.createItem(data);
  toast.success(t('feature.created'));
} catch (error) {
  console.error('❌ Create failed:', error);
  toast.error(error.message || t('errors.createFailed'));
}

// In Component
const handleSubmit = async (data) => {
  try {
    setLoading(true);
    setError(null);
    await createItem(data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Constants Integration

See the **[Weavink Constants Management Skill](./Weavink_Constants_Management_Skill.md)** for complete details.

#### Import Pattern

```javascript
// ALWAYS import from barrel
import { 
  SUBSCRIPTION_LEVELS,
  CONTACT_FEATURES,
  PERMISSIONS,
  TEAM_ROLES
} from '@/lib/services/constants';

// NEVER import directly from domain files
// ❌ DON'T DO THIS:
// import { CONTACT_FEATURES } from '@/lib/services/serviceContact/.../contactConstants';
```

#### Feature Flags

```javascript
// Define in domain constants file
export const FEATURE_CONSTANTS = {
  VIEW_PERMISSION: 'feature_view',
  CREATE_PERMISSION: 'feature_create',
  EDIT_PERMISSION: 'feature_edit',
  DELETE_PERMISSION: 'feature_delete',
  ADVANCED_PERMISSION: 'feature_advanced'
};

// Use in API routes
if (!session.permissions[FEATURE_CONSTANTS.CREATE_PERMISSION]) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Use in components
const canCreate = session?.permissions?.[FEATURE_CONSTANTS.CREATE_PERMISSION];
```

#### Subscription Limits

```javascript
// Define in domain constants file
export const FEATURE_LIMITS = {
  [SUBSCRIPTION_LEVELS.BASE]: {
    maxItems: 10,
    features: [FEATURE_CONSTANTS.VIEW_PERMISSION]
  },
  [SUBSCRIPTION_LEVELS.PRO]: {
    maxItems: 100,
    features: [
      FEATURE_CONSTANTS.VIEW_PERMISSION,
      FEATURE_CONSTANTS.CREATE_PERMISSION,
      FEATURE_CONSTANTS.EDIT_PERMISSION
    ]
  },
  [SUBSCRIPTION_LEVELS.ENTERPRISE]: {
    maxItems: -1, // unlimited
    features: Object.values(FEATURE_CONSTANTS)
  }
};

// Use in API routes
const limits = FEATURE_LIMITS[session.subscriptionLevel];
const currentCount = await FeatureService.getCount(session.userId);

if (currentCount >= limits.maxItems && limits.maxItems !== -1) {
  return NextResponse.json(
    { 
      error: 'Limit reached',
      limit: limits.maxItems,
      current: currentCount
    },
    { status: 429 }
  );
}
```

### Cost Tracking Integration

See the **[Cost Tracking Refactoring Guide](./REFACTORING_GUIDE.md)** for complete details.

#### When to Track Costs

Track costs for:
- Third-party API calls (Google Maps, Pinecone, etc.)
- AI operations (OpenAI, Anthropic, etc.)
- Resource-intensive operations

#### Session vs Standalone Tracking

```javascript
// WITH sessionId - Multi-step workflow
const sessionId = `session_${Date.now()}_${userId}`;

// Step 1
await CostTrackingService.recordUsage({
  userId,
  usageType: 'ApiUsage',
  feature: 'google_maps_autocomplete',
  cost: API_COSTS.GOOGLE_MAPS.PLACES_AUTOCOMPLETE.PER_REQUEST,
  provider: 'google_maps',
  sessionId,  // Links operations together
  metadata: { input: 'pizza' }
});

// Step 2
await CostTrackingService.recordUsage({
  userId,
  usageType: 'ApiUsage',
  feature: 'google_maps_place_details',
  cost: API_COSTS.GOOGLE_MAPS.PLACES_DETAILS.PER_REQUEST,
  provider: 'google_maps',
  sessionId,  // Same session
  metadata: { placeId: 'ChIJ...' }
});

// Finalize
await CostTrackingService.finalizeSession(userId, sessionId);

// WITHOUT sessionId - Standalone operation
await CostTrackingService.recordUsage({
  userId,
  usageType: 'AIUsage',
  feature: 'ai_analysis',
  cost: 0.05,
  provider: 'openai',
  // No sessionId
  metadata: { model: 'gpt-4' }
});
```

#### Using API Cost Constants

```javascript
import { API_COSTS } from '@/lib/services/constants/apiCosts';

// Track Google Maps call
await CostTrackingService.recordUsage({
  userId,
  usageType: 'ApiUsage',
  feature: 'google_maps_geocode',
  cost: API_COSTS.GOOGLE_MAPS.GEOCODING.PER_REQUEST,
  provider: 'google_maps'
});

// Track Pinecone call
await CostTrackingService.recordUsage({
  userId,
  usageType: 'ApiUsage',
  feature: 'pinecone_query',
  cost: API_COSTS.PINECONE.QUERY.PER_REQUEST,
  provider: 'pinecone'
});
```

### Firebase Best Practices

#### Client vs Admin SDK

```javascript
// CLIENT-SIDE ONLY
// File: lib/services/serviceFeature/client/services/FeatureService.js
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { app } from '@/important/firebase';

const db = getFirestore(app);

// Use for real-time subscriptions in client services
static subscribe(userId, callback) {
  const docRef = doc(db, 'FeatureData', userId);
  return onSnapshot(docRef, (snapshot) => {
    callback(snapshot.data());
  });
}

// SERVER-SIDE ONLY
// File: lib/services/serviceFeature/server/featureService.js
import { adminDb, FieldValue } from '@/lib/firebaseAdmin';

// Use for all database operations in server services
static async createItem(userId, data) {
  const docRef = adminDb.collection('FeatureData').doc(userId);
  await docRef.update({
    items: FieldValue.arrayUnion(data)
  });
}
```

#### Firestore Array Operations

```javascript
// Add item to array
await docRef.update({
  items: FieldValue.arrayUnion(newItem)
});

// Remove item from array
await docRef.update({
  items: FieldValue.arrayRemove(itemToRemove)
});

// Replace entire array
await docRef.update({
  items: newArray
});

// ⚠️ Important: arrayUnion/arrayRemove use deep equality
// Objects must match exactly to be removed
```

#### Timestamps

```javascript
// Server timestamp (recommended)
await docRef.update({
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp()
});

// ISO string (if you need consistency with client)
const now = new Date().toISOString();
await docRef.update({
  createdAt: now,
  updatedAt: now
});
```

---

## 🎯 Common Workflows

### Workflow 1: Adding a New Feature

**Goal:** Implement a complete new feature following the 5-layer architecture.

#### Step 1: Plan the Architecture

```
1. Define data model
2. Identify required permissions
3. Determine subscription limits
4. Plan API endpoints
5. Design component structure
```

#### Step 2: Add Constants

```javascript
// File: lib/services/serviceFeature/constants/featureConstants.js

export const FEATURE_CONSTANTS = {
  // Permissions
  VIEW_PERMISSION: 'feature_view',
  CREATE_PERMISSION: 'feature_create',
  EDIT_PERMISSION: 'feature_edit',
  DELETE_PERMISSION: 'feature_delete',
  
  // Features
  BASIC_FEATURE: 'feature_basic',
  ADVANCED_FEATURE: 'feature_advanced'
};

export const FEATURE_LIMITS = {
  [SUBSCRIPTION_LEVELS.BASE]: {
    maxItems: 10,
    features: [FEATURE_CONSTANTS.BASIC_FEATURE]
  },
  [SUBSCRIPTION_LEVELS.PRO]: {
    maxItems: 100,
    features: [
      FEATURE_CONSTANTS.BASIC_FEATURE,
      FEATURE_CONSTANTS.ADVANCED_FEATURE
    ]
  }
};

// File: lib/services/constants.js (barrel)
export * from './serviceFeature/constants/featureConstants';
```

#### Step 3: Create Server Service

```javascript
// File: lib/services/serviceFeature/server/featureService.js

import { adminDb, FieldValue } from '@/lib/firebaseAdmin';
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

class FeatureService {
  static async getData(userId) {
    // Implementation
  }

  static async createItem(userId, data) {
    // Implementation
  }

  // ... other methods
}

export { FeatureService };
```

#### Step 4: Create API Routes

```javascript
// File: app/api/user/feature/route.js

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { FeatureService } from '@/lib/services/serviceFeature/server/featureService';
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

export async function GET(request) {
  const session = await createApiSession(request);
  if (!session.permissions[FEATURE_CONSTANTS.VIEW_PERMISSION]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const data = await FeatureService.getData(session.userId);
  return NextResponse.json(data);
}

export async function POST(request) {
  const session = await createApiSession(request);
  if (!session.permissions[FEATURE_CONSTANTS.CREATE_PERMISSION]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const body = await request.json();
  const newItem = await FeatureService.createItem(session.userId, body);
  return NextResponse.json(newItem, { status: 201 });
}
```

#### Step 5: Create Client Service

```javascript
// File: lib/services/serviceFeature/client/services/FeatureService.js

import { getAuth } from 'firebase/auth';
import { app } from '@/important/firebase';

class FeatureService {
  static async getToken() {
    // Token caching logic
  }

  static async getData(force = false) {
    const token = await this.getToken();
    const response = await fetch('/api/user/feature', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  static async createItem(data) {
    const token = await this.getToken();
    const response = await fetch('/api/user/feature', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
}

export { FeatureService };
```

#### Step 6: Create Context

```javascript
// File: app/dashboard/(dashboard pages)/feature/FeatureContext.js

"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const createItem = async (itemData) => {
    const newItem = await FeatureService.createItem(itemData);
    setData([...data, newItem]);
    return newItem;
  };

  return (
    <FeatureContext.Provider value={{ data, loading, createItem }}>
      {children}
    </FeatureContext.Provider>
  );
}

export const useFeature = () => useContext(FeatureContext);
```

#### Step 7: Create Page Component

```javascript
// File: app/dashboard/(dashboard pages)/feature/page.jsx

"use client";

import React from 'react';
import { useFeature } from './FeatureContext';
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

export default function FeaturePage() {
  const { data, loading, createItem } = useFeature();
  const { session } = useDashboard();
  
  const canCreate = session?.permissions?.[FEATURE_CONSTANTS.CREATE_PERMISSION];

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Feature</h1>
      {canCreate && (
        <button onClick={() => createItem({ name: 'Test' })}>
          Create Item
        </button>
      )}
      <ul>
        {data.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### Step 8: Wrap Page with Provider

```javascript
// File: app/dashboard/(dashboard pages)/feature/layout.jsx

import { FeatureProvider } from './FeatureContext';

export default function FeatureLayout({ children }) {
  return (
    <FeatureProvider>
      {children}
    </FeatureProvider>
  );
}
```

### Workflow 2: Adding a New API Endpoint

**Goal:** Add a new endpoint to an existing feature.

#### Step 1: Add Server Service Method

```javascript
// File: lib/services/serviceFeature/server/featureService.js

static async searchItems(userId, query) {
  const items = await this.getData(userId);
  return items.filter(item => 
    item.name.toLowerCase().includes(query.toLowerCase())
  );
}
```

#### Step 2: Create API Route

```javascript
// File: app/api/user/feature/search/route.js

import { NextResponse } from 'next/server';
import { createApiSession } from '@/lib/server/session';
import { FeatureService } from '@/lib/services/serviceFeature/server/featureService';

export async function GET(request) {
  const session = await createApiSession(request);
  
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  const results = await FeatureService.searchItems(session.userId, query);
  return NextResponse.json(results);
}
```

#### Step 3: Add Client Service Method

```javascript
// File: lib/services/serviceFeature/client/services/FeatureService.js

static async search(query) {
  const token = await this.getToken();
  const response = await fetch(`/api/user/feature/search?q=${encodeURIComponent(query)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

#### Step 4: Add to Context

```javascript
// File: app/dashboard/(dashboard pages)/feature/FeatureContext.js

const [searchResults, setSearchResults] = useState([]);

const search = useCallback(async (query) => {
  const results = await FeatureService.search(query);
  setSearchResults(results);
  return results;
}, []);

// Add to context value
return (
  <FeatureContext.Provider value={{ ..., search, searchResults }}>
    {children}
  </FeatureContext.Provider>
);
```

#### Step 5: Use in Component

```javascript
// In page.jsx

const { search, searchResults } = useFeature();

const handleSearch = async (e) => {
  const query = e.target.value;
  if (query.length > 2) {
    await search(query);
  }
};

<input type="text" onChange={handleSearch} placeholder="Search..." />
<ul>
  {searchResults.map(item => (
    <li key={item.id}>{item.name}</li>
  ))}
</ul>
```

### Workflow 3: Adding Permission Checks

**Goal:** Restrict a feature based on subscription level.

#### Step 1: Define Permission Constant

```javascript
// File: lib/services/serviceFeature/constants/featureConstants.js

export const FEATURE_CONSTANTS = {
  PREMIUM_FEATURE: 'feature_premium',
  // ...
};

export const FEATURE_LIMITS = {
  [SUBSCRIPTION_LEVELS.BASE]: {
    features: [] // No premium feature
  },
  [SUBSCRIPTION_LEVELS.PRO]: {
    features: [FEATURE_CONSTANTS.PREMIUM_FEATURE]
  }
};
```

#### Step 2: Check in API Route

```javascript
// File: app/api/user/feature/premium/route.js

export async function POST(request) {
  const session = await createApiSession(request);
  
  if (!session.permissions[FEATURE_CONSTANTS.PREMIUM_FEATURE]) {
    return NextResponse.json(
      { error: 'Requires Pro subscription' },
      { status: 403 }
    );
  }

  // Premium feature logic...
}
```

#### Step 3: Check in Component

```javascript
// In page.jsx

const { session } = useDashboard();
const hasPremium = session?.permissions?.[FEATURE_CONSTANTS.PREMIUM_FEATURE];

{hasPremium ? (
  <PremiumFeature />
) : (
  <UpgradePrompt feature="Premium Features" />
)}
```

---

## ✅ Testing & Validation

### Pre-Flight Checklist

Before committing code:

- [ ] All imports use barrel file (`from '@/lib/services/constants'`)
- [ ] No magic strings (check for hardcoded 'pro', 'base', etc.)
- [ ] All API routes call `createApiSession(request)` first
- [ ] All API routes check permissions before business logic
- [ ] Error handling in place (try-catch blocks)
- [ ] Loading and error states handled in components
- [ ] Constants use SCREAMING_SNAKE_CASE
- [ ] File naming follows conventions
- [ ] Comments added for complex logic
- [ ] No mixing of client/server Firebase SDKs

### Build Test

```bash
# Test that everything compiles
npm run build

# Or just lint
npm run lint
```

### Manual Testing Checklist

For new features:

- [ ] Test with BASE subscription
- [ ] Test with PRO subscription  
- [ ] Test with ENTERPRISE subscription
- [ ] Test permission denials (403 responses)
- [ ] Test unauthenticated access (401 responses)
- [ ] Test limit enforcement (429 responses)
- [ ] Test error handling (invalid input, network errors)
- [ ] Test loading states
- [ ] Test real-time updates (if applicable)

### Common Test Scenarios

#### Scenario 1: Permission Denied

```javascript
// API should return 403
// Component should show upgrade prompt
// Toast should show friendly error message
```

#### Scenario 2: Limit Reached

```javascript
// API should return 429 with limit details
// Component should show limit message
// Should offer upgrade path
```

#### Scenario 3: Network Error

```javascript
// Client service should throw error
// Context should catch and set error state
// Component should display error UI
// User should be able to retry
```

---

## 🛠️ Troubleshooting

### Common Issues

#### Issue 1: "Cannot find module '@/lib/services/constants'"

**Cause:** Barrel file missing or path alias not configured

**Solution:**
```bash
# Check barrel file exists
ls lib/services/constants.js

# Check tsconfig.json has path alias
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}

# Restart TypeScript server in VSCode
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

#### Issue 2: "Permission denied" even with correct subscription

**Cause:** Session not refreshed or permissions not calculated

**Solution:**
```javascript
// 1. Check session in API route
console.log('Session:', JSON.stringify(session, null, 2));

// 2. Check permission constant spelling
console.log('Checking:', FEATURE_CONSTANTS.CREATE_PERMISSION);
console.log('Available:', Object.keys(session.permissions));

// 3. Verify permission is in subscription limits
console.log(FEATURE_LIMITS[session.subscriptionLevel]);

// 4. Force session refresh on client
await signOut(auth);
await signInWithEmailAndPassword(auth, email, password);
```

#### Issue 3: "Circular dependency detected"

**Cause:** Domain files importing from each other

**Solution:**
```javascript
// ❌ BAD: Domain-to-domain import
// File: contactConstants.js
import { PERMISSIONS } from '../serviceEnterprise/constants/enterpriseConstants';

// ✅ GOOD: Move shared constant to core
// File: core/constants.js
export const PERMISSIONS = { ... };

// Both domains import from core
import { PERMISSIONS } from '../../core/constants';
```

#### Issue 4: Cache not invalidating

**Cause:** Service-level cache not cleared after mutations

**Solution:**
```javascript
// In Client Service
static async createItem(data) {
  const result = await fetch(...);
  
  // ✅ Always invalidate after mutations
  this.invalidateCache();
  
  return result;
}

// Or force refresh
const data = await FeatureService.getData(true); // force = true
```

#### Issue 5: Real-time updates not working

**Cause:** Using wrong Firebase SDK or subscription not set up

**Solution:**
```javascript
// ✅ CLIENT-SIDE ONLY - in Client Service
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { app } from '@/important/firebase';

const db = getFirestore(app);

static subscribe(userId, callback) {
  const docRef = doc(db, 'Collection', userId);
  return onSnapshot(docRef, (snapshot) => {
    callback(snapshot.data());
  });
}

// ❌ DON'T use adminDb in client code
// ❌ DON'T import from @/lib/firebaseAdmin
```

#### Issue 6: "Token expired" errors

**Cause:** Token cache not implemented or expired

**Solution:**
```javascript
// ✅ Implement 50-minute token cache
static async getToken() {
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');

  const now = Date.now();
  if (user._tokenCache && user._tokenCache.expiry > now) {
    return user._tokenCache.token;
  }

  const token = await user.getIdToken();
  user._tokenCache = {
    token,
    expiry: now + (50 * 60 * 1000)
  };

  return token;
}
```

#### Issue 7: "Max update depth exceeded"

**Cause:** Infinite re-render loop in component/context

**Solution:**
```javascript
// ❌ BAD: Missing dependency
useEffect(() => {
  loadData();
}, []); // loadData not in deps

// ✅ GOOD: Use useCallback
const loadData = useCallback(async () => {
  // ...
}, [session?.userId]);

useEffect(() => {
  if (session?.userId) {
    loadData();
  }
}, [session?.userId, loadData]);
```

### Debug Checklist

When something isn't working:

1. **Check the console**
   - Look for error messages
   - Check network tab for failed requests
   - Verify API responses

2. **Verify permissions**
   ```javascript
   console.log('Session:', session);
   console.log('Has permission:', session.permissions[FEATURE_CONSTANTS.X]);
   ```

3. **Check constants**
   ```javascript
   console.log('Constant value:', FEATURE_CONSTANTS.X);
   console.log('All constants:', FEATURE_CONSTANTS);
   ```

4. **Test API directly**
   ```bash
   # Use curl or Postman to test API route
   curl -H "Authorization: Bearer <token>" \
        https://your-app.com/api/user/feature
   ```

5. **Check Firestore data**
   - Open Firebase Console
   - Navigate to Firestore
   - Verify document structure

6. **Restart development server**
   ```bash
   # Sometimes cache issues require restart
   npm run dev
   ```

---

## 📚 Quick Reference

### File Naming Conventions

```
✅ page.jsx               (pages)
✅ route.js               (API routes)
✅ FeatureContext.js      (contexts - PascalCase)
✅ FeatureService.js      (client services - PascalCase)
✅ featureService.js      (server services - camelCase)
✅ FEATURE_CONSTANTS      (constants - SCREAMING_SNAKE_CASE)
```

### Import Order

```javascript
// 1. React
import React from 'react';

// 2. Next.js
import { useRouter } from 'next/navigation';

// 3. Third-party
import { toast } from 'react-hot-toast';

// 4. Internal utilities
import { useTranslation } from '@/lib/translation';

// 5. Contexts
import { useDashboard } from '@/app/dashboard/DashboardContext';

// 6. Constants
import { FEATURE_CONSTANTS } from '@/lib/services/constants';

// 7. Components
import FeatureList from './components/FeatureList';
```

### HTTP Status Codes

```
200 OK - Success (GET, PATCH, DELETE)
201 Created - Success (POST)
400 Bad Request - Invalid input
401 Unauthorized - Missing/invalid token
403 Forbidden - Insufficient permissions
404 Not Found - Resource doesn't exist
409 Conflict - Duplicate resource
429 Too Many Requests - Limit exceeded
500 Internal Error - Server error
```

### Key Patterns

```javascript
// Token caching (50 minutes)
user._tokenCache = { token, expiry: Date.now() + (50 * 60 * 1000) };

// Service-level caching
cache = { data: null, expiry: null, listeners: new Set() };

// Permission check
if (!session.permissions[FEATURE_CONSTANTS.X]) { return 403; }

// Limit check
if (count >= LIMITS[level].max) { return 429; }

// Error handling
try { } catch (error) { return NextResponse.json({ error }, { status }); }
```

---

## 🎓 Related Skills

- **[Weavink Constants Management Skill](./Weavink_Constants_Management_Skill.md)** - Complete guide to constants system
- **[Cost Tracking Refactoring Guide](./REFACTORING_GUIDE.md)** - Session-based cost tracking
- **Session Management** (coming soon) - Deep dive into permissions
- **Testing Guide** (coming soon) - Comprehensive testing strategies

---

## 📝 Changelog

**v1.0 - 2024-11-18**
- Initial release
- Complete 5-layer architecture guide
- Integration with Constants Skill
- Integration with Cost Tracking
- Common workflows and troubleshooting

---

**Remember:** When in doubt, follow the existing patterns in the codebase. Look at how similar features are implemented and maintain consistency. Happy coding! 🚀
