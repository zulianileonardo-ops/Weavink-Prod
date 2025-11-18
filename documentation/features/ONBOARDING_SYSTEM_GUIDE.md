# Onboarding System - Technical Guide & Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Core Components](#core-components)
5. [Authentication Flow](#authentication-flow)
6. [Translation System Integration](#translation-system-integration)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Step-by-Step User Flow](#step-by-step-user-flow)
10. [Extending the System](#extending-the-system)
11. [Troubleshooting](#troubleshooting)
12. [Code Examples](#code-examples)

---

## Overview

The onboarding system is a mandatory multi-step wizard that appears after user registration or login (including Google OAuth). It collects essential user preferences before granting access to the main dashboard.

### Key Features
- **Mandatory Flow**: Users cannot access the dashboard until onboarding is complete
- **Multi-Step Wizard**: Extensible architecture for adding more steps
- **iPhone-Style Language Rotation**: Animated language headers cycling every 5 seconds
- **Multi-Language Support**: Full translation support for en, fr, es, vm, zh
- **Real-Time Language Application**: Selected language is applied immediately
- **Authentication-Protected**: All API calls use Firebase Bearer tokens
- **Session Persistence**: Onboarding status persists across login sessions

### Current Steps
1. **Language Selection** - User chooses their preferred language
2. **Complete Setup** - Final confirmation step

### Future Steps (Planned)
- Interests selection
- Event preferences
- Tutorial walkthrough

---

## Architecture

### High-Level Flow
```
User Login/Signup
    ↓
AuthContext checks authentication
    ↓
Redirect to /dashboard
    ↓
DashboardLayout wraps with OnboardingGuard
    ↓
OnboardingGuard checks onboardingCompleted flag
    ↓
    ├── If false → Redirect to /onboarding
    │       ↓
    │   OnboardingWizard displays current step
    │       ↓
    │   User completes all steps
    │       ↓
    │   Click "Complete Setup" button
    │       ↓
    │   API call to /api/onboarding/complete
    │       ↓
    │   Update Firestore: onboardingCompleted = true
    │       ↓
    │   Redirect to /dashboard
    │
    └── If true → Render Dashboard
```

### Component Hierarchy
```
/onboarding/page.jsx (Protected Route)
    └── OnboardingProvider (State Management)
        └── OnboardingWizard (Multi-Step Container)
            ├── LanguageStep (Step 1)
            │   ├── RotatingHeader (5s animation)
            │   └── LanguageOptions (5 choices)
            └── CompleteStep (Final Step)
                └── CompleteSetupButton
```

### Guard System
```
/dashboard/layout.jsx
    └── ProtectedRoute (Auth Check)
        └── OnboardingGuard (Onboarding Check)
            └── Dashboard Content
```

---

## File Structure

### Created Files

```
/app/onboarding/
├── page.jsx                    # Main onboarding page (protected route)
├── OnboardingContext.jsx       # State management & API calls
├── OnboardingWizard.jsx        # Multi-step wizard container
├── steps/
│   ├── LanguageStep.jsx        # Language selection with rotation
│   └── CompleteStep.jsx        # Final confirmation step
└── onboarding.css              # Styles for onboarding flow

/app/dashboard/
└── components/
    └── OnboardingGuard.jsx     # Dashboard access guard

/app/api/onboarding/
└── complete/
    └── route.js                # API endpoint for completion
```

### Modified Files

```
/app/dashboard/layout.jsx       # Added OnboardingGuard wrapper
/contexts/AuthContext.js        # Simplified redirect logic
/lib/translation/useTranslation.js  # Added variable interpolation
/lib/services/serviceSetting/server/settingsService.js  # Added completeOnboarding method
/public/locales/*/common.json   # Added onboarding translations (all 5 languages)
```

---

## Core Components

### 1. OnboardingContext.jsx
**Purpose**: Central state management for the onboarding wizard

**Location**: `/app/onboarding/OnboardingContext.jsx`

**Key Responsibilities**:
- Manage current step navigation
- Store user answers across all steps
- Handle API authentication and submission
- Coordinate with Firebase Auth

**State Structure**:
```javascript
{
  currentStep: 1,           // Current wizard step (1-based)
  totalSteps: 2,            // Total number of steps
  answers: {
    language: null,         // Selected language code
    // Future: interests, events, etc.
  },
  isSubmitting: false       // Loading state during API call
}
```

**Key Methods**:
- `updateAnswer(key, value)` - Update a specific answer
- `nextStep()` - Navigate to next step
- `previousStep()` - Navigate to previous step
- `completeOnboarding()` - Submit data and mark complete

**Authentication Pattern**:
```javascript
const completeOnboarding = async () => {
  // Get Firebase auth token
  const auth = getAuth();
  const user = auth.currentUser;
  const token = await user.getIdToken();

  // Make authenticated API call
  const response = await fetch('/api/onboarding/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ answers }),
  });
};
```

---

### 2. OnboardingWizard.jsx
**Purpose**: Multi-step wizard UI container

**Location**: `/app/onboarding/OnboardingWizard.jsx`

**Features**:
- Progress indicator with step numbers
- Conditional button rendering (Back/Next/Complete)
- Step validation before proceeding
- Smooth transitions between steps

**Progress Indicator**:
```javascript
<div className="step-indicator">
  {t('onboarding.progress.step_of', {
    current: currentStep,
    total: totalSteps
  })}
</div>
```

**Step Rendering Logic**:
```javascript
const renderStep = () => {
  switch (currentStep) {
    case 1:
      return <LanguageStep />;
    case 2:
      return <CompleteStep />;
    default:
      return null;
  }
};
```

---

### 3. LanguageStep.jsx
**Purpose**: Language selection with iPhone-style rotation

**Location**: `/app/onboarding/steps/LanguageStep.jsx`

**Key Features**:
- Animated header rotation (5-second intervals)
- Real-time language preview
- Immediate language application on selection
- Fade transitions between languages

**Rotation Implementation**:
```javascript
const LANGUAGE_ROTATION_ORDER = ['en', 'fr', 'es', 'vm', 'zh'];
const ROTATION_INTERVAL = 5000; // 5 seconds

useEffect(() => {
  const rotationInterval = setInterval(() => {
    setIsTransitioning(true); // Fade out

    setTimeout(() => {
      // Switch to next language
      setDisplayLanguageIndex((prevIndex) =>
        (prevIndex + 1) % LANGUAGE_ROTATION_ORDER.length
      );
      setIsTransitioning(false); // Fade in
    }, 300);
  }, ROTATION_INTERVAL);

  return () => clearInterval(rotationInterval);
}, []);
```

**Language Data Structure**:
```javascript
const HEADER_TRANSLATIONS = {
  en: {
    title: "Choose Your Language",
    description: "Select your preferred language to get started"
  },
  fr: {
    title: "Choisissez Votre Langue",
    description: "Sélectionnez votre langue préférée pour commencer"
  },
  // ... etc
};

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'vm', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];
```

**CSS Transitions**:
```css
.rotating-header {
  transition: opacity 0.3s ease-in-out;
}

.rotating-header.transitioning {
  opacity: 0;
}

.language-option {
  transition: all 0.2s ease;
}

.language-option.selected {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transform: scale(1.02);
}
```

---

### 4. OnboardingGuard.jsx
**Purpose**: Prevent dashboard access until onboarding is complete

**Location**: `/app/dashboard/components/OnboardingGuard.jsx`

**Why It's Needed**:
- Prevents "flash" of dashboard before redirect
- Checks onboarding status on every dashboard access
- Ensures persistence across sessions

**Implementation**:
```javascript
export default function OnboardingGuard({ children }) {
  const { currentUser, loading: authLoading } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading) return;

      if (!currentUser) {
        router.push('/login');
        return;
      }

      // Check Firestore for onboardingCompleted flag
      const userDocRef = doc(fireApp, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const completed = userData.onboardingCompleted || false;

        if (!completed) {
          // Redirect to onboarding
          router.push('/onboarding');
          return;
        }

        setOnboardingCompleted(true);
      }

      setCheckingOnboarding(false);
    };

    checkOnboardingStatus();
  }, [currentUser, authLoading, router]);

  // Show loading spinner while checking
  if (authLoading || checkingOnboarding) {
    return <LoadingSpinner />;
  }

  // Don't render children if onboarding not complete
  if (!onboardingCompleted) {
    return null;
  }

  // Render dashboard
  return children;
}
```

**Critical Pattern**: The guard returns `null` when onboarding is not complete, preventing any dashboard content from rendering before redirect.

---

## Authentication Flow

### Firebase Authentication Integration

The onboarding system uses Firebase ID tokens for API authentication. This ensures that only authenticated users can complete onboarding.

**Step 1: Get Current User**
```javascript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
```

**Step 2: Get ID Token**
```javascript
if (!user) {
  throw new Error('User must be authenticated');
}
const token = await user.getIdToken();
```

**Step 3: Include in API Request**
```javascript
const response = await fetch('/api/onboarding/complete', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ answers }),
});
```

**Step 4: Server-Side Verification**
```javascript
// In /app/api/onboarding/complete/route.js
import { createApiSession } from '@/lib/services/serviceAuthentification/server/apiSession';

export async function POST(request) {
  // Verify token and get user session
  const session = await createApiSession(request);

  if (!session?.uid) {
    return new Response(
      JSON.stringify({ error: 'Authorization required' }),
      { status: 401 }
    );
  }

  // Process onboarding completion
  // ...
}
```

### Token Lifecycle
- **Generation**: `getIdToken()` creates a new token (valid for 1 hour)
- **Validation**: Server verifies token with Firebase Admin SDK
- **Refresh**: Tokens automatically refresh when expired
- **Security**: Tokens are JWT-signed and cannot be forged

---

## Translation System Integration

### Translation Structure

All onboarding text is stored in `/public/locales/{locale}/common.json`:

```json
{
  "onboarding": {
    "welcome": {
      "title": "Welcome to TapIt!",
      "subtitle": "Let's get you set up in just a few steps"
    },
    "progress": {
      "step_of": "Step {{current}} of {{total}}"
    },
    "language": {
      "title": "Choose Your Language",
      "description": "Select your preferred language to personalize your experience",
      "options": {
        "en": "English",
        "fr": "Français",
        "es": "Español",
        "vm": "Tiếng Việt",
        "zh": "中文"
      }
    },
    "buttons": {
      "next": "Continue",
      "back": "Back",
      "complete": "Complete Setup"
    },
    "ready_to_complete": "🎉 Ready to complete your setup!",
    "step_indicator": "Step {{current}} of {{total}}",
    "success": "Onboarding completed successfully!",
    "error": "Failed to complete onboarding. Please try again."
  }
}
```

### Variable Interpolation

The translation system supports variable replacement using `{{variable}}` syntax:

**Enhanced useTranslation Hook**:
```javascript
// In /lib/translation/useTranslation.js
const t = useCallback((key, variables = {}) => {
  // Get translation string from locale
  let result = getNestedValue(translations, key);

  // Replace variables if present
  if (typeof result === 'string' && Object.keys(variables).length > 0) {
    return result.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return variables[variable] !== undefined
        ? variables[variable]
        : match;
    });
  }

  return result;
}, [locale, translations]);
```

**Usage Example**:
```javascript
// In component
const { t } = useTranslation();

// Simple translation
t('onboarding.buttons.next')
// Output: "Continue"

// With variables
t('onboarding.progress.step_of', { current: 1, total: 2 })
// Output: "Step 1 of 2"
```

### Real-Time Language Switching

When a user selects a language in the onboarding:

```javascript
const handleLanguageSelect = (languageCode) => {
  // Update onboarding context
  updateAnswer('language', languageCode);

  // Apply language immediately
  changeLanguage(languageCode);

  // Update localStorage
  localStorage.setItem('tapit_language', languageCode);
};
```

This ensures the user sees the rest of the onboarding in their selected language.

---

## Database Schema

### Firestore User Document

**Collection**: `users`

**Document ID**: Firebase UID

**Onboarding Fields**:
```javascript
{
  uid: "string",                      // Firebase user ID
  email: "string",                    // User email
  displayName: "string",              // User name

  // Onboarding Status
  onboardingCompleted: boolean,       // true when setup complete
  onboardingCompletedAt: "ISO8601",   // Timestamp of completion

  // Onboarding Answers
  settings: {
    defaultLanguage: "string",        // Selected language code (en, fr, es, vm, zh)
    // Future: interests, eventPreferences, etc.
  },

  // Other user data...
  createdAt: "ISO8601",
  updatedAt: "ISO8601"
}
```

### Initial User Creation

When a user signs up (standard or Google OAuth), the user document is created with:

```javascript
{
  uid: user.uid,
  email: user.email,
  displayName: user.displayName || '',
  onboardingCompleted: false,  // ← Critical: defaults to false
  createdAt: new Date().toISOString(),
  settings: {}
}
```

### Onboarding Completion Update

When user completes onboarding:

```javascript
const updateData = {
  onboardingCompleted: true,
  onboardingCompletedAt: new Date().toISOString(),
  'settings.defaultLanguage': answers.language,
  updatedAt: new Date().toISOString()
};

await userDocRef.update(updateData);
```

**Using Dot Notation**: `'settings.defaultLanguage'` updates nested field without overwriting entire `settings` object.

---

## API Endpoints

### POST /api/onboarding/complete

**Purpose**: Mark user's onboarding as complete and save their answers

**Authentication**: Required (Firebase Bearer Token)

**Request**:
```javascript
POST /api/onboarding/complete
Headers:
  Content-Type: application/json
  Authorization: Bearer {firebase_token}

Body:
{
  "answers": {
    "language": "fr"
    // Future: interests, events, etc.
  }
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "message": "Onboarding completed successfully"
}
```

**Response Error (401)**:
```json
{
  "error": "Authorization required"
}
```

**Response Error (500)**:
```json
{
  "error": "Failed to complete onboarding: {error_message}"
}
```

**Implementation**:
```javascript
// /app/api/onboarding/complete/route.js
import { createApiSession } from '@/lib/services/serviceAuthentification/server/apiSession';
import { SettingsService } from '@/lib/services/serviceSetting/server/settingsService';

export async function POST(request) {
  try {
    // Verify authentication
    const session = await createApiSession(request);

    if (!session?.uid) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    const { answers } = body;

    // Call service method
    await SettingsService.completeOnboarding({
      answers,
      session
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Onboarding completed successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 API Error in POST /api/onboarding/complete:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

---

## Step-by-Step User Flow

### 1. User Signs Up / Logs In

**Standard Signup**:
```
/signup → Fill form → Submit → Firebase creates user → Firestore doc created
```

**Google OAuth**:
```
/signup → Click Google button → OAuth popup → Firebase creates user → Firestore doc created
```

**Common Result**: User document with `onboardingCompleted: false`

---

### 2. AuthContext Redirect

After successful authentication:

```javascript
// In AuthContext.js
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      setCurrentUser(user);

      // If on login/signup page, redirect to dashboard
      if (pathname === '/login' || pathname === '/signup') {
        router.push('/dashboard');
      }
    }
  });

  return unsubscribe;
}, [pathname]);
```

---

### 3. OnboardingGuard Intercepts

When user lands on `/dashboard`:

```javascript
// In OnboardingGuard.jsx
useEffect(() => {
  const checkOnboardingStatus = async () => {
    // Fetch user document
    const userDoc = await getDoc(doc(fireApp, 'users', currentUser.uid));
    const userData = userDoc.data();

    // Check onboarding status
    if (!userData.onboardingCompleted) {
      // ❌ Redirect to onboarding
      router.push('/onboarding');
      return;
    }

    // ✅ Allow dashboard access
    setOnboardingCompleted(true);
  };

  checkOnboardingStatus();
}, [currentUser]);
```

---

### 4. Onboarding Wizard

**Page Load**: `/onboarding/page.jsx`

```javascript
// Check if user is authenticated and needs onboarding
if (!currentUser || loading) {
  return <LoadingSpinner />;
}

// If onboarding already completed, redirect to dashboard
if (onboardingCompleted) {
  router.push('/dashboard');
  return null;
}

// Show onboarding wizard
return (
  <OnboardingProvider totalSteps={2}>
    <OnboardingWizard />
  </OnboardingProvider>
);
```

---

### 5. Step 1: Language Selection

**Visual Flow**:
```
┌─────────────────────────────────────┐
│   Choose Your Language              │  ← Rotating every 5s
│   Select your preferred language... │
├─────────────────────────────────────┤
│   🇺🇸 English                        │
│   🇫🇷 Français                       │  ← Click to select
│   🇪🇸 Español                        │
│   🇻🇳 Tiếng Việt                     │
│   🇨🇳 中文                           │
├─────────────────────────────────────┤
│           [Continue →]              │
└─────────────────────────────────────┘
```

**User Action**: Click language → Language applied immediately → Click Continue

**Code**:
```javascript
const handleLanguageSelect = (code) => {
  updateAnswer('language', code);
  changeLanguage(code); // Apply immediately
  setSelectedLanguage(code);
};
```

---

### 6. Step 2: Complete Setup

**Visual Flow**:
```
┌─────────────────────────────────────┐
│   🎉 Ready to complete your setup!  │
│                                     │
│   You've selected: Français 🇫🇷      │
│   You're all set!                   │
├─────────────────────────────────────┤
│   [← Back]    [Complete Setup ✓]   │
└─────────────────────────────────────┘
```

**User Action**: Click "Complete Setup"

---

### 7. API Call & Completion

**Sequence**:
```
1. User clicks "Complete Setup"
2. setIsSubmitting(true) → Button shows loading
3. Get Firebase auth token
4. POST /api/onboarding/complete with token
5. Server verifies token
6. Server updates Firestore: onboardingCompleted = true
7. Server responds success
8. Client shows success toast
9. Client redirects to /dashboard
10. OnboardingGuard checks status → Allows access ✅
```

**Code Flow**:
```javascript
// Client-side (OnboardingContext.jsx)
const completeOnboarding = async () => {
  setIsSubmitting(true);

  try {
    // Get auth token
    const auth = getAuth();
    const token = await auth.currentUser.getIdToken();

    // API call
    const response = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ answers }),
    });

    if (!response.ok) {
      throw new Error('Failed to complete onboarding');
    }

    // Success
    toast.success(t('onboarding.success'));
    setTimeout(() => router.push('/dashboard'), 500);

  } catch (error) {
    toast.error(t('onboarding.error'));
  } finally {
    setIsSubmitting(false);
  }
};
```

```javascript
// Server-side (settingsService.js)
static async completeOnboarding({ answers, session }) {
  const admin = await import('firebase-admin');
  const db = admin.firestore();
  const userDocRef = db.collection('users').doc(session.uid);

  const updateData = {
    onboardingCompleted: true,
    onboardingCompletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (answers?.language) {
    updateData['settings.defaultLanguage'] = answers.language;
  }

  await userDocRef.update(updateData);

  return { success: true };
}
```

---

### 8. Dashboard Access Granted

**OnboardingGuard Re-checks**:
```javascript
// Fetch fresh user data
const userDoc = await getDoc(doc(fireApp, 'users', uid));
const userData = userDoc.data();

if (userData.onboardingCompleted === true) {
  // ✅ Render dashboard
  return children;
}
```

**Result**: User sees dashboard with their selected language applied.

---

## Extending the System

### Adding a New Onboarding Step

**Example**: Add "Interests Selection" step

#### Step 1: Create the Component

```javascript
// /app/onboarding/steps/InterestsStep.jsx
'use client';

import { useOnboarding } from '../OnboardingContext';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useState } from 'react';

export default function InterestsStep() {
  const { t } = useTranslation();
  const { answers, updateAnswer } = useOnboarding();
  const [selectedInterests, setSelectedInterests] = useState(answers.interests || []);

  const INTERESTS = [
    { id: 'sports', label: t('onboarding.interests.sports'), icon: '⚽' },
    { id: 'music', label: t('onboarding.interests.music'), icon: '🎵' },
    { id: 'food', label: t('onboarding.interests.food'), icon: '🍕' },
    { id: 'travel', label: t('onboarding.interests.travel'), icon: '✈️' },
    { id: 'tech', label: t('onboarding.interests.tech'), icon: '💻' },
  ];

  const toggleInterest = (interestId) => {
    const updated = selectedInterests.includes(interestId)
      ? selectedInterests.filter(id => id !== interestId)
      : [...selectedInterests, interestId];

    setSelectedInterests(updated);
    updateAnswer('interests', updated);
  };

  return (
    <div className="onboarding-step">
      <h2>{t('onboarding.interests.title')}</h2>
      <p>{t('onboarding.interests.description')}</p>

      <div className="interests-grid">
        {INTERESTS.map((interest) => (
          <button
            key={interest.id}
            className={`interest-card ${
              selectedInterests.includes(interest.id) ? 'selected' : ''
            }`}
            onClick={() => toggleInterest(interest.id)}
          >
            <span className="interest-icon">{interest.icon}</span>
            <span className="interest-label">{interest.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

#### Step 2: Update OnboardingContext

```javascript
// Add interests to initial state
const [answers, setAnswers] = useState({
  language: null,
  interests: [],  // ← Add this
});
```

#### Step 3: Update OnboardingWizard

```javascript
// Increase totalSteps
<OnboardingProvider totalSteps={3}>  {/* Was 2 */}
  <OnboardingWizard />
</OnboardingProvider>

// Add case in renderStep()
const renderStep = () => {
  switch (currentStep) {
    case 1:
      return <LanguageStep />;
    case 2:
      return <InterestsStep />;  // ← Add this
    case 3:
      return <CompleteStep />;    // ← Update this
    default:
      return null;
  }
};
```

#### Step 4: Add Translations

```json
// In all locale files
{
  "onboarding": {
    "interests": {
      "title": "What are your interests?",
      "description": "Select topics that interest you",
      "sports": "Sports & Fitness",
      "music": "Music & Concerts",
      "food": "Food & Dining",
      "travel": "Travel & Adventure",
      "tech": "Technology"
    }
  }
}
```

#### Step 5: Update Database Schema (Optional)

```javascript
// In settingsService.js
static async completeOnboarding({ answers, session }) {
  const updateData = {
    onboardingCompleted: true,
    onboardingCompletedAt: new Date().toISOString(),
  };

  if (answers?.language) {
    updateData['settings.defaultLanguage'] = answers.language;
  }

  if (answers?.interests) {
    updateData['settings.interests'] = answers.interests;  // ← Add this
  }

  await userDocRef.update(updateData);
}
```

#### Step 6: Add Step Validation (Optional)

```javascript
// In OnboardingWizard.jsx
const canProceed = () => {
  switch (currentStep) {
    case 1:
      return answers.language !== null;
    case 2:
      return answers.interests && answers.interests.length > 0;  // ← Add this
    default:
      return true;
  }
};

// Disable next button if validation fails
<button
  onClick={nextStep}
  disabled={!canProceed()}
  className="btn-primary"
>
  {t('onboarding.buttons.next')}
</button>
```

---

### Making Onboarding Optional (Future)

If you want to make onboarding skippable in the future:

#### Option 1: Add "Skip" Button

```javascript
// In OnboardingWizard.jsx
<button
  onClick={handleSkip}
  className="btn-text"
>
  {t('onboarding.buttons.skip')}
</button>

const handleSkip = async () => {
  // Mark as completed without saving answers
  await completeOnboarding();
};
```

#### Option 2: Allow Dashboard Access with Warning

```javascript
// In OnboardingGuard.jsx
if (!userData.onboardingCompleted) {
  // Show banner instead of blocking
  return (
    <>
      <OnboardingBanner />
      {children}
    </>
  );
}
```

---

## Troubleshooting

### Issue 1: Dashboard Flash Before Redirect

**Symptom**: Dashboard briefly appears before redirecting to onboarding

**Root Cause**: Race condition between AuthContext redirect and OnboardingGuard check

**Solution**: OnboardingGuard returns `null` while checking:
```javascript
if (checkingOnboarding) {
  return <LoadingSpinner />;
}

if (!onboardingCompleted) {
  return null;  // ← Critical: Don't render anything
}

return children;
```

---

### Issue 2: Onboarding Not Showing on Re-login

**Symptom**: User completes part of onboarding, logs out, logs in → Dashboard appears

**Root Cause**: OnboardingGuard not wrapped around dashboard layout

**Solution**: Ensure OnboardingGuard is in `/app/dashboard/layout.jsx`:
```javascript
export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <OnboardingGuard>  {/* ← Must be here */}
        <DashboardProvider>
          {children}
        </DashboardProvider>
      </OnboardingGuard>
    </ProtectedRoute>
  );
}
```

---

### Issue 3: 401 Authorization Error

**Symptom**: API call to `/api/onboarding/complete` returns 401

**Root Cause**: Missing or invalid Firebase auth token

**Solution**: Ensure token is included in request:
```javascript
// Get token
const auth = getAuth();
const user = auth.currentUser;
if (!user) throw new Error('User must be authenticated');
const token = await user.getIdToken();

// Include in headers
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

**Debug**: Check token in Network tab → Request Headers

---

### Issue 4: Translation Variables Not Replacing

**Symptom**: "Step {{current}} of {{total}}" appears literally

**Root Cause**: Translation function doesn't support variable interpolation

**Solution**: Use enhanced `useTranslation` hook:
```javascript
// In useTranslation.js
const t = useCallback((key, variables = {}) => {
  let result = getNestedValue(translations, key);

  if (typeof result === 'string' && Object.keys(variables).length > 0) {
    return result.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return variables[variable] !== undefined ? variables[variable] : match;
    });
  }

  return result;
}, [locale, translations]);

// Usage
t('onboarding.progress.step_of', { current: 1, total: 2 })
```

---

### Issue 5: Language Not Persisting

**Symptom**: Selected language resets on page refresh

**Root Cause**: Language only stored in state, not persisted

**Solution**: Save to localStorage AND Firestore:
```javascript
const handleLanguageSelect = (code) => {
  // Update onboarding context
  updateAnswer('language', code);

  // Apply immediately
  changeLanguage(code);

  // Persist to localStorage
  localStorage.setItem('tapit_language', code);
};

// On completion, save to Firestore
await SettingsService.completeOnboarding({
  answers: { language: code }
});
```

---

### Issue 6: Infinite Redirect Loop

**Symptom**: Page keeps redirecting between `/onboarding` and `/dashboard`

**Root Cause**: Conflicting redirect logic in AuthContext and OnboardingGuard

**Solution**: Simplify AuthContext to only handle auth redirects:
```javascript
// AuthContext should NOT check onboarding
if (user && (pathname === '/login' || pathname === '/signup')) {
  router.push('/dashboard');
  // OnboardingGuard will handle onboarding check
}
```

---

### Issue 7: Onboarding Shows for Existing Users

**Symptom**: Users who signed up before onboarding feature now see onboarding

**Root Cause**: Existing users don't have `onboardingCompleted` field

**Solution**: Run migration script or handle undefined:
```javascript
// Option 1: Migration script
const users = await db.collection('users').where('onboardingCompleted', '==', null).get();
users.forEach(async (doc) => {
  await doc.ref.update({ onboardingCompleted: true });
});

// Option 2: Handle in guard
const completed = userData.onboardingCompleted ?? true;  // Default to true for old users
```

---

## Code Examples

### Example 1: Custom Step with Validation

```javascript
// /app/onboarding/steps/EventPreferencesStep.jsx
'use client';

import { useOnboarding } from '../OnboardingContext';
import { useTranslation } from '@/lib/translation/useTranslation';
import { useState, useEffect } from 'react';

export default function EventPreferencesStep() {
  const { t } = useTranslation();
  const { answers, updateAnswer } = useOnboarding();
  const [preferences, setPreferences] = useState(answers.eventPreferences || {
    notifications: true,
    emailDigest: false,
    radius: 10
  });

  // Auto-save to context on change
  useEffect(() => {
    updateAnswer('eventPreferences', preferences);
  }, [preferences, updateAnswer]);

  return (
    <div className="onboarding-step">
      <h2>{t('onboarding.events.title')}</h2>

      <div className="preference-section">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={preferences.notifications}
            onChange={(e) => setPreferences(prev => ({
              ...prev,
              notifications: e.target.checked
            }))}
          />
          <span>{t('onboarding.events.enable_notifications')}</span>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={preferences.emailDigest}
            onChange={(e) => setPreferences(prev => ({
              ...prev,
              emailDigest: e.target.checked
            }))}
          />
          <span>{t('onboarding.events.email_digest')}</span>
        </label>
      </div>

      <div className="radius-section">
        <label>{t('onboarding.events.search_radius')}</label>
        <input
          type="range"
          min="1"
          max="50"
          value={preferences.radius}
          onChange={(e) => setPreferences(prev => ({
            ...prev,
            radius: parseInt(e.target.value)
          }))}
        />
        <span>{preferences.radius} km</span>
      </div>
    </div>
  );
}
```

---

### Example 2: Conditional Step Rendering

```javascript
// /app/onboarding/OnboardingWizard.jsx

// Show different steps based on user type
const renderStep = () => {
  const userType = answers.userType; // Could be set in step 0

  switch (currentStep) {
    case 1:
      return <LanguageStep />;

    case 2:
      // Different steps for different user types
      if (userType === 'business') {
        return <BusinessInfoStep />;
      } else if (userType === 'personal') {
        return <InterestsStep />;
      }
      return <GenericStep />;

    case 3:
      return <CompleteStep />;

    default:
      return null;
  }
};
```

---

### Example 3: Progress Saving (Auto-save Draft)

```javascript
// /app/onboarding/OnboardingContext.jsx

// Save progress to localStorage
useEffect(() => {
  if (currentUser) {
    const progressKey = `onboarding_progress_${currentUser.uid}`;
    localStorage.setItem(progressKey, JSON.stringify({
      currentStep,
      answers,
      savedAt: new Date().toISOString()
    }));
  }
}, [currentStep, answers, currentUser]);

// Load progress on mount
useEffect(() => {
  if (currentUser) {
    const progressKey = `onboarding_progress_${currentUser.uid}`;
    const saved = localStorage.getItem(progressKey);

    if (saved) {
      const { currentStep: savedStep, answers: savedAnswers } = JSON.parse(saved);
      setCurrentStep(savedStep);
      setAnswers(savedAnswers);
    }
  }
}, [currentUser]);
```

---

### Example 4: Analytics Tracking

```javascript
// Track onboarding progress
import { logEvent } from '@/lib/analytics';

const nextStep = useCallback(() => {
  if (currentStep < totalSteps) {
    // Log step completion
    logEvent('onboarding_step_completed', {
      step: currentStep,
      step_name: getStepName(currentStep),
      answers_so_far: answers
    });

    setCurrentStep(prev => prev + 1);
  }
}, [currentStep, totalSteps, answers]);

const completeOnboarding = async () => {
  // ... existing code

  // Log completion
  logEvent('onboarding_completed', {
    duration_seconds: getDuration(),
    language: answers.language,
    interests: answers.interests,
    completion_method: 'manual' // vs 'skip'
  });
};
```

---

### Example 5: A/B Testing Different Onboarding Flows

```javascript
// /app/onboarding/page.jsx

const [variant, setVariant] = useState(null);

useEffect(() => {
  // Assign user to A/B test variant
  const assignedVariant = currentUser.uid.charCodeAt(0) % 2 === 0
    ? 'short_flow'   // 2 steps
    : 'long_flow';   // 4 steps

  setVariant(assignedVariant);

  // Log assignment
  logEvent('onboarding_variant_assigned', { variant: assignedVariant });
}, [currentUser]);

return (
  <OnboardingProvider totalSteps={variant === 'short_flow' ? 2 : 4}>
    <OnboardingWizard variant={variant} />
  </OnboardingProvider>
);
```

---

## Testing Checklist

### Manual Testing

- [ ] **Standard Signup Flow**
  - [ ] Sign up with email/password
  - [ ] Redirected to onboarding
  - [ ] Complete onboarding
  - [ ] Redirected to dashboard
  - [ ] Log out and log in → Dashboard appears (not onboarding)

- [ ] **Google OAuth Flow**
  - [ ] Sign up with Google
  - [ ] Redirected to onboarding
  - [ ] Complete onboarding
  - [ ] Redirected to dashboard

- [ ] **Language Selection**
  - [ ] Header rotates every 5 seconds
  - [ ] All 5 languages appear in rotation
  - [ ] Clicking a language applies it immediately
  - [ ] Rest of onboarding appears in selected language
  - [ ] Dashboard appears in selected language after completion

- [ ] **Navigation**
  - [ ] "Back" button works correctly
  - [ ] "Continue" button is disabled when answer not selected
  - [ ] Progress indicator updates correctly
  - [ ] Cannot skip to dashboard by URL manipulation

- [ ] **Edge Cases**
  - [ ] Refresh page during onboarding → Stay on current step
  - [ ] Close tab and reopen → Onboarding still required
  - [ ] Complete onboarding → Firestore updated correctly
  - [ ] Try to access /dashboard directly → Redirected to onboarding

### Automated Testing (Future)

```javascript
// Example Cypress test
describe('Onboarding Flow', () => {
  it('should complete onboarding successfully', () => {
    // Sign up
    cy.visit('/signup');
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="signup-button"]').click();

    // Should redirect to onboarding
    cy.url().should('include', '/onboarding');

    // Select language
    cy.get('[data-testid="language-option-fr"]').click();
    cy.get('[data-testid="next-button"]').click();

    // Complete setup
    cy.get('[data-testid="complete-button"]').click();

    // Should redirect to dashboard
    cy.url().should('include', '/dashboard');

    // Firestore should be updated
    cy.task('checkFirestore', {
      uid: 'test-uid',
      field: 'onboardingCompleted',
      expectedValue: true
    });
  });
});
```

---

## Performance Considerations

### Code Splitting

Onboarding components are only loaded when needed:

```javascript
// Lazy load onboarding steps
const LanguageStep = dynamic(() => import('./steps/LanguageStep'), {
  loading: () => <LoadingSpinner />
});

const InterestsStep = dynamic(() => import('./steps/InterestsStep'), {
  loading: () => <LoadingSpinner />
});
```

### Minimize API Calls

OnboardingGuard checks status once per session:

```javascript
// Cache onboarding status in context
const [onboardingStatusChecked, setOnboardingStatusChecked] = useState(false);

if (onboardingStatusChecked) {
  // Don't re-check on every render
  return children;
}
```

### Optimize Firestore Reads

Use server-side caching for onboarding status:

```javascript
// In settingsService.js
static async getOnboardingStatus(uid) {
  // Check cache first
  const cached = cache.get(`onboarding_${uid}`);
  if (cached) return cached;

  // Fetch from Firestore
  const doc = await db.collection('users').doc(uid).get();
  const status = doc.data().onboardingCompleted;

  // Cache for 5 minutes
  cache.set(`onboarding_${uid}`, status, 300);

  return status;
}
```

---

## Security Considerations

### 1. Authentication Required

All onboarding endpoints require Firebase authentication:

```javascript
// Server-side verification
const session = await createApiSession(request);
if (!session?.uid) {
  return new Response('Unauthorized', { status: 401 });
}
```

### 2. User Can Only Update Own Data

```javascript
// Ensure user can only update their own onboarding
if (session.uid !== requestedUid) {
  return new Response('Forbidden', { status: 403 });
}
```

### 3. Validate Input

```javascript
// Validate language code
const VALID_LANGUAGES = ['en', 'fr', 'es', 'vm', 'zh'];
if (!VALID_LANGUAGES.includes(answers.language)) {
  return new Response('Invalid language', { status: 400 });
}
```

### 4. Rate Limiting

```javascript
// Prevent abuse of completion endpoint
const rateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60000 // 1 minute
});

if (!rateLimiter.check(session.uid)) {
  return new Response('Too many requests', { status: 429 });
}
```

---

## Maintenance

### Monitoring

Track key metrics:
- Onboarding completion rate
- Average time to complete
- Drop-off rate per step
- Language selection distribution

```javascript
// Example analytics events
logEvent('onboarding_started', { uid, timestamp });
logEvent('onboarding_step_viewed', { step, timestamp });
logEvent('onboarding_step_completed', { step, duration });
logEvent('onboarding_completed', { totalDuration, language });
logEvent('onboarding_abandoned', { lastStep, timestamp });
```

### Updating Translations

When adding new text:
1. Add to `/public/locales/en/common.json`
2. Translate to all other locales (fr, es, vm, zh)
3. Test in each language
4. Verify variable interpolation works

### Database Migrations

When modifying onboarding schema:

```javascript
// Migration script
const migrateOnboardingData = async () => {
  const users = await db.collection('users').get();

  const batch = db.batch();
  users.forEach(doc => {
    const userData = doc.data();

    // Add new field with default value
    if (!userData.onboardingVersion) {
      batch.update(doc.ref, { onboardingVersion: 2 });
    }
  });

  await batch.commit();
  console.log('Migration complete');
};
```

---

## Key Takeaways

1. **Mandatory Flow**: OnboardingGuard ensures users cannot access dashboard until complete
2. **Authentication**: All API calls use Firebase Bearer tokens for security
3. **Translation**: Full i18n support with variable interpolation
4. **Extensible**: Easy to add new steps by creating components and updating totalSteps
5. **Persistent**: Status saved in Firestore, survives logout/login
6. **User-Friendly**: iPhone-style rotation, real-time language switching, smooth transitions
7. **Error Handling**: Comprehensive error handling with user-friendly messages
8. **No Flash Bug**: OnboardingGuard blocks render completely until check completes

---

## Related Files Reference

| File | Purpose |
|------|---------|
| `/app/onboarding/OnboardingContext.jsx` | State management & API calls |
| `/app/onboarding/OnboardingWizard.jsx` | Multi-step wizard container |
| `/app/onboarding/steps/LanguageStep.jsx` | Language selection with rotation |
| `/app/dashboard/components/OnboardingGuard.jsx` | Dashboard access control |
| `/app/api/onboarding/complete/route.js` | Completion API endpoint |
| `/lib/services/serviceSetting/server/settingsService.js` | Onboarding business logic |
| `/lib/translation/useTranslation.js` | Translation with interpolation |
| `/contexts/AuthContext.js` | Authentication state |
| `/public/locales/*/common.json` | Translations (5 languages) |

---

## Support & Further Development

For questions or issues:
1. Check this guide first
2. Review error logs in browser console
3. Check Firestore user document for onboardingCompleted status
4. Verify Firebase auth token in Network tab
5. Test in incognito mode to rule out cache issues

Happy coding!
