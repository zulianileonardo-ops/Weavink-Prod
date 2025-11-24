# Security Remediation Plan

This guide outlines the steps to fix the security vulnerabilities identified in the API audit.

## 🚨 Phase 1: Critical Fixes (Immediate)

**Goal:** Prevent unauthorized access to sensitive test routes in production.

### 1. Secure `app/api/test/comprehensive/route.js`
The comprehensive test route is currently exposed. You must ensure it only runs in development or requires admin authentication.

**Recommended Fix (Environment Check):**
Add this check at the very top of the `GET` function:

```javascript
// app/api/test/comprehensive/route.js

export async function GET(req) {
    // 🔒 SECURITY: Block in production
    if (process.env.NODE_ENV === 'production') {
        return new Response(null, { status: 404 });
    }

    // ... existing code ...
}
```

**Alternative Fix (Admin Auth):**
If you need to run tests in production, require an admin token:

```javascript
import { adminAuth } from '@/lib/firebaseAdmin';
import { AdminService } from '@/lib/services/serviceAdmin/server/adminService';

export async function GET(req) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        const decoded = await adminAuth.verifyIdToken(token);
        if (!AdminService.isServerAdmin(decoded.email)) {
             throw new Error('Not admin');
        }
    } catch (e) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ... existing code ...
}
```

---

## 🛠 Phase 2: Refactoring (Recommended)

**Goal:** Reduce code duplication and prevent future security gaps by standardizing authentication.

### 1. Create a Reusable Auth Wrapper
Instead of manually verifying tokens in every route, create a higher-order function.

**Create `lib/api-middleware.js`:**
```javascript
import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

export function withAuth(handler) {
    return async (request, context) => {
        try {
            const authHeader = request.headers.get('authorization');
            if (!authHeader?.startsWith('Bearer ')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const token = authHeader.split('Bearer ')[1];
            const decodedToken = await adminAuth.verifyIdToken(token);
            
            // Attach user to request for the handler to use
            request.user = decodedToken;

            return handler(request, context);
        } catch (error) {
            console.error('Auth Error:', error);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    };
}
```

### 2. Apply to Routes
Refactor existing routes to use the wrapper.

**Example (`app/api/user/analytics/route.js`):**
```javascript
import { withAuth } from '@/lib/api-middleware';

async function handler(request) {
    const { uid } = request.user; // Access user directly
    // ... rest of your logic ...
}

export const GET = withAuth(handler);
```

---

## ✅ Phase 3: Verification

After applying changes:
1.  **Test Production Safety:** Try to access `/api/test/comprehensive` in a production-like environment (or set `NODE_ENV=production` locally) and verify it returns 404.
2.  **Verify Auth:** Check that normal user routes still work with valid tokens and reject invalid ones.
