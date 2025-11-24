# SSO Implementation Plan: Firebase Identity Platform (SAML/OIDC)

This plan outlines the code changes required to upgrade your existing Firebase Authentication setup to support Enterprise SSO (SAML and OIDC) using Google Cloud Identity Platform.

## 1. Overview
**Goal**: Enable users to log in via Enterprise Identity Providers (like Okta, Azure AD, Salesforce) while maintaining your existing "Perfect User Document" structure in Firestore.
**Strategy**: Generalize the existing Google Sign-In logic to handle *any* federated identity provider.

---

## 2. Backend Service Refactoring
**File**: `lib/services/server/authService.js`

The current `findOrCreateUserForGoogleSignIn` method is too specific. We will rename it and make it generic.

### Steps:
1.  **Rename Method**: Change `findOrCreateUserForGoogleSignIn` to `findOrCreateUserForProvider`.
2.  **Update Signature**: Accept a `providerId` or `providerType` alongside the `firebaseUser` object.
3.  **Generalize Data Mapping**:
    *   **Username**: Continue generating from `email` or `displayName`.
    *   **Avatar**: SSO providers don't always return a `photoURL`. Add a fallback or check specific provider claims if needed.
    *   **Display Name**: Use `displayName` if available, otherwise fallback to the local part of the email.

### Code Blueprint:
```javascript
/**
 * ✅ GENERIC: Handles account creation/lookup for ANY provider (Google, SAML, OIDC)
 */
static async findOrCreateUserForProvider(firebaseUser, providerType = 'unknown') {
    const userDocRef = adminDb.collection('users').doc(firebaseUser.uid);
    const userDoc = await userDocRef.get();
    let userData;

    if (userDoc.exists) {
        // Existing user: Just update login timestamp
        console.log(`SSO (${providerType}): Found existing user ${firebaseUser.uid}`);
        userData = userDoc.data();
        await userDocRef.update({ lastLoginAt: new Date() });
    } else {
        // New user: Create "Perfect User Document"
        console.log(`SSO (${providerType}): Creating new user ${firebaseUser.uid}`);
        
        // 1. Generate Username (same logic as before)
        let username = (firebaseUser.displayName || firebaseUser.email.split('@')[0])
            .toLowerCase().replace(/[^a-z0-9_.-]/g, '').substring(0, 20);
        
        // ... (Include your existing username uniqueness loop here) ...

        // 2. Create Document
        userData = this.createPerfectUserDocument(
            firebaseUser, 
            username, 
            firebaseUser.displayName || username, // Fallback for display name
            firebaseUser.photoURL || null         // Fallback for avatar
        );
        
        // Add provider metadata if useful for debugging
        userData.authProvider = providerType; 

        await userDocRef.set(userData);
    }

    // Create custom token for client
    const customToken = await adminAuth.createCustomToken(firebaseUser.uid);
    
    return { customToken, user: userData };
}
```

---

## 3. Frontend Context Updates
**File**: `contexts/AuthContext.js`

We need to expose a function that triggers the SSO popup flow.

### Steps:
1.  **Import Providers**: Import `OAuthProvider` and `SAMLAuthProvider` from `firebase/auth`.
2.  **Add `loginWithSSO` Function**: This function will take a `providerId` (configured in GCP Console) and handle the popup flow.

### Code Blueprint:
```javascript
import { SAMLAuthProvider, OAuthProvider, signInWithPopup } from 'firebase/auth';

// ... inside AuthProvider ...

/**
 * Initiates SSO Login Flow
 * @param {string} providerId - The ID from GCP Console (e.g., 'saml.okta-enterprise', 'oidc.azure-ad')
 */
const loginWithSSO = async (providerId) => {
    setLoading(true);
    try {
        // Determine provider type based on ID string or pass explicitly
        let provider;
        if (providerId.startsWith('saml.')) {
            provider = new SAMLAuthProvider(providerId);
        } else {
            provider = new OAuthProvider(providerId);
        }

        // Trigger Popup
        const userCredential = await signInWithPopup(auth, provider);
        
        // Call your backend to ensure Firestore document exists
        // You might need a new API route for this, OR just rely on the client 
        // if you move the "create document" logic to a Cloud Function trigger (Recommended for SSO).
        
        // IF keeping logic in AuthService (as per current architecture):
        // You need to call an API route that invokes AuthService.findOrCreateUserForProvider
        // passing the user's UID/Email to verify/create the doc.
        
        return userCredential.user;
    } catch (error) {
        console.error("SSO Login Failed:", error);
        throw error;
    } finally {
        setLoading(false);
    }
};
```

---

## 4. API Route Update (Crucial)
**File**: `app/api/auth/sso-callback/route.js` (New File)

Since `AuthService` runs on the server, and `signInWithPopup` happens on the client, you need a bridge to trigger the "User Document Creation" logic after a successful SSO login.

### Steps:
1.  Create a new API route.
2.  Client calls this route immediately after `signInWithPopup` succeeds.
3.  Route verifies the ID token and calls `AuthService.findOrCreateUserForProvider`.

### Code Blueprint:
```javascript
// app/api/auth/sso-sync/route.js
import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/server/authService';
import { auth } from 'firebase-admin'; // Ensure you have admin auth

export async function POST(request) {
    const { idToken, providerId } = await request.json();
    
    try {
        // 1. Verify the token from the client
        const decodedToken = await auth().verifyIdToken(idToken);
        
        // 2. Sync user to Firestore
        // We construct a "user-like" object from the token to pass to AuthService
        const firebaseUser = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified,
            displayName: decodedToken.name,
            photoURL: decodedToken.picture
        };

        const result = await AuthService.findOrCreateUserForProvider(firebaseUser, providerId);
        
        return NextResponse.json({ success: true, user: result.user });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
```

## 5. Configuration (Google Cloud Console)
*   Go to **Identity Platform** > **Providers**.
*   Click **Add Provider**.
*   Select **SAML** or **OpenID Connect**.
*   Enter the details from your Identity Provider (Okta, Auth0, etc.).
*   Copy the **Provider ID** (e.g., `saml.my-enterprise-app`). This is what you pass to `loginWithSSO`.
