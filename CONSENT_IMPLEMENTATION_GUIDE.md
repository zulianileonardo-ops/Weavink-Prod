# Consent Management Implementation Guide

A comprehensive guide for implementing GDPR-compliant consent checks with greyed-out buttons and consent popovers in React/Next.js applications.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Common Pitfalls](#common-pitfalls)
5. [Best Practices](#best-practices)
6. [Testing Checklist](#testing-checklist)

---

## Overview

This pattern implements user consent requirements for AI-powered features by:
- **Blocking functionality** until consent is granted
- **Visual feedback** through greyed-out UI elements
- **User guidance** via consent popovers on hover
- **Easy consent access** with one-click navigation to settings

### Example Use Cases
- AI Semantic Search
- Business Card Scanner (OCR + AI)
- AI Auto-Grouping
- Any feature requiring explicit GDPR consent

---

## Architecture

### Consent Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Action Attempt                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Check Consent │
                    │   Status      │
                    └───────┬───────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │   Consent    │        │  No Consent  │
        │   Granted    │        │              │
        └──────┬───────┘        └──────┬───────┘
               │                       │
               ▼                       ▼
      ┌────────────────┐      ┌────────────────┐
      │ Execute Feature│      │ Show Popover + │
      │                │      │ Navigate to    │
      │                │      │ Consent Page   │
      └────────────────┘      └────────────────┘
```

### Component Structure

```
DashboardProvider (Context)
    └── consents: { [consentType]: { status, timestamp, ... } }
        │
        └── Feature Component
            ├── useDashboard() hook → access consent state
            ├── Consent check logic
            ├── Button with conditional styling
            └── Consent popover (conditional render)
```

---

## Step-by-Step Implementation

### Step 1: Define Consent Type

Ensure your consent type is registered in the consent service.

**File:** `lib/services/servicePrivacy/server/consentService.js`

```javascript
const CONSENT_TYPES = {
  // ... other consent types
  AI_BUSINESS_CARD_ENHANCEMENT: 'ai_business_card_enhancement',
  // Add your new consent type here
};
```

### Step 2: Add Translation Keys

Add consent-related translation keys for all supported languages.

**File:** `public/locales/en/common.json`

```json
{
  "your_feature": {
    "consent_required": "Feature Name requires your consent to use AI/OCR features",
    "enable_consent": "Enable in Settings"
  }
}
```

Repeat for all language files: `fr`, `es`, `ch`, `vm`, etc.

### Step 3: Import Required Hooks

In your feature component, import the necessary hooks.

```javascript
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
```

### Step 4: Access Consent State

```javascript
function YourFeatureComponent() {
  const { consents } = useDashboard();
  const router = useRouter();
  const [showConsentPopover, setShowConsentPopover] = useState(false);

  // Check consent status
  const hasFeatureConsent = consents?.ai_business_card_enhancement?.status === true;

  // ... rest of component
}
```

### Step 5: Create Click Handler

Create a handler that checks consent before executing the feature.

```javascript
const handleFeatureClick = useCallback(() => {
  if (!hasFeatureConsent) {
    // Navigate to consent settings
    router.push('/dashboard/account?tab=consents&expand=ai_features');
    return;
  }

  // Consent granted - execute feature
  executeYourFeature();
}, [hasFeatureConsent, router]);
```

### Step 6: Implement Button with Consent Check

**IMPORTANT:** Do NOT use the `disabled` attribute for consent checks! It blocks mouse events.

```javascript
<div className="relative">
  <button
    onClick={handleFeatureClick}
    onMouseEnter={() => {
      if (!hasFeatureConsent) {
        setShowConsentPopover(true);
      }
    }}
    onMouseLeave={() => setShowConsentPopover(false)}
    className={`px-4 py-2 rounded-md transition-colors ${
      hasFeatureConsent
        ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
        : 'bg-blue-300 text-white cursor-not-allowed opacity-50'
    }`}
  >
    Your Feature Button
  </button>

  {/* Consent Popover */}
  {showConsentPopover && !hasFeatureConsent && (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 z-50">
      <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3">
        <p className="mb-2">
          {t('your_feature.consent_required') || 'Feature requires your consent'}
        </p>
        <button
          onClick={() => router.push('/dashboard/account?tab=consents&expand=ai_features')}
          className="w-full text-blue-300 hover:text-blue-200 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors font-medium"
        >
          {t('your_feature.enable_consent') || 'Enable in Settings'} →
        </button>
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  )}
</div>
```

### Step 7: Block Feature Execution

In nested components or modal dialogs, also check consent:

```javascript
function FeatureModal({ isOpen, onClose }) {
  const { consents } = useDashboard();
  const router = useRouter();

  const hasFeatureConsent = consents?.ai_business_card_enhancement?.status === true;

  // Wrapper functions that check consent
  const handleCameraStart = useCallback(() => {
    if (!hasFeatureConsent) {
      router.push('/dashboard/account?tab=consents&expand=ai_features');
      return;
    }
    startCamera();
  }, [hasFeatureConsent, router, startCamera]);

  // Pass hasConsent to child components
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ChildComponent
        onStart={handleCameraStart}
        hasConsent={hasFeatureConsent}
        showConsentPopover={showConsentPopover}
        setShowConsentPopover={setShowConsentPopover}
      />
    </Modal>
  );
}
```

---

## Common Pitfalls

### ❌ Pitfall #1: Using `disabled` Attribute for Consent

**WRONG:**
```javascript
<button
  onClick={handleClick}
  onMouseEnter={() => !hasConsent && setShowPopover(true)}
  disabled={!hasConsent}  // ❌ Blocks mouse events!
>
  Button
</button>
```

**CORRECT:**
```javascript
<button
  onClick={handleClick}
  onMouseEnter={() => {
    if (!hasConsent) {
      setShowPopover(true);
    }
  }}
  className={`${!hasConsent ? 'cursor-not-allowed opacity-50' : ''}`}
  // No disabled attribute! Use CSS only
>
  Button
</button>
```

**Why:** The `disabled` attribute prevents `onMouseEnter` and `onMouseLeave` from firing, so the popover never appears.

### ❌ Pitfall #2: Forgetting to Check Consent in Multiple Locations

If your feature has multiple entry points, check consent at ALL of them:
- Main button on the page
- Modal trigger buttons
- Keyboard shortcuts
- URL deep links

### ❌ Pitfall #3: Not Handling Consent Changes Reactively

The consent state from `useDashboard()` is reactive. When the user grants consent in another tab/window, the UI should update automatically. Don't cache the consent status.

**WRONG:**
```javascript
const [hasConsent] = useState(consents?.feature?.status); // ❌ Won't update
```

**CORRECT:**
```javascript
const hasConsent = consents?.feature?.status === true; // ✅ Reactive
```

### ❌ Pitfall #4: Missing Translation Keys

Always provide fallback text for translation keys:

```javascript
{t('feature.consent_required') || 'Fallback text here'}
```

### ❌ Pitfall #5: Wrong Consent Navigation URL

Make sure to navigate to the correct consent category:

```javascript
// AI Features
router.push('/dashboard/account?tab=consents&expand=ai_features');

// Analytics
router.push('/dashboard/account?tab=consents&expand=analytics');

// Marketing
router.push('/dashboard/account?tab=consents&expand=marketing');
```

---

## Best Practices

### 1. Consistent Visual Design

Use consistent colors across all consent-blocked features:
- **Enabled:** `bg-blue-500 hover:bg-blue-600`
- **Disabled:** `bg-blue-300 opacity-50 cursor-not-allowed`

### 2. Clear User Communication

Popover text should:
- State the feature name clearly
- Explain WHY consent is needed (AI/OCR, data processing, etc.)
- Provide a clear action: "Enable in Settings →"

### 3. Minimal Click Distance

Always provide a direct navigation link to the consent settings. Don't make users hunt for it.

### 4. Responsive Popover Positioning

Use Tailwind's responsive utilities:
```javascript
className="w-72 sm:w-80 md:w-96"  // Adjust width by screen size
```

For mobile, consider positioning adjustments:
```javascript
className="bottom-full sm:bottom-auto sm:top-full"
```

### 5. Z-Index Management

Ensure popovers appear above other UI elements:
```javascript
className="z-50"  // High z-index for popover
```

### 6. Accessibility

Add ARIA attributes:
```javascript
<button
  aria-label="Scan business card"
  aria-disabled={!hasConsent}
  aria-describedby={!hasConsent ? 'consent-tooltip' : undefined}
>
```

### 7. Loading States

Show loading states while consent is being fetched:
```javascript
if (consents === undefined) {
  return <LoadingSpinner />;
}
```

---

## Testing Checklist

### Manual Testing

- [ ] **Without Consent**
  - [ ] Button appears greyed out
  - [ ] Cursor shows "not-allowed" on hover
  - [ ] Popover appears on hover
  - [ ] Popover disappears on mouse leave
  - [ ] Clicking button navigates to consent settings
  - [ ] Feature is completely blocked (no execution)

- [ ] **With Consent**
  - [ ] Button appears fully enabled
  - [ ] Button responds to hover (normal hover state)
  - [ ] No popover appears on hover
  - [ ] Clicking button executes feature
  - [ ] All feature functionality works

- [ ] **Consent Granting Flow**
  - [ ] Navigate to consent settings
  - [ ] Grant consent for the feature
  - [ ] Return to feature page
  - [ ] Button automatically becomes enabled (reactive)
  - [ ] Feature now works without refresh

- [ ] **Consent Withdrawal Flow**
  - [ ] Withdraw consent in settings
  - [ ] Button automatically becomes disabled (reactive)
  - [ ] Popover reappears on hover
  - [ ] Feature is blocked again

### Cross-Browser Testing

- [ ] Chrome (disabled attribute behavior)
- [ ] Firefox (disabled attribute behavior)
- [ ] Safari (disabled attribute behavior)
- [ ] Mobile browsers (touch events)

### Responsive Testing

- [ ] Mobile view (small screens)
- [ ] Tablet view (medium screens)
- [ ] Desktop view (large screens)
- [ ] Popover positioning on all screen sizes
- [ ] Touch interaction on mobile

### Multi-Language Testing

- [ ] Test all supported languages
- [ ] Verify translation keys exist
- [ ] Check fallback text displays correctly
- [ ] Verify text fits in popover on all languages

---

## Code Examples

### Example 1: Simple Button with Consent

```javascript
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

function SimpleFeatureButton() {
  const { consents } = useDashboard();
  const router = useRouter();
  const [showPopover, setShowPopover] = useState(false);

  const hasConsent = consents?.ai_feature?.status === true;

  const handleClick = () => {
    if (!hasConsent) {
      router.push('/dashboard/account?tab=consents&expand=ai_features');
      return;
    }
    executeFeature();
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        onMouseEnter={() => !hasConsent && setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
        className={`px-4 py-2 rounded ${
          hasConsent
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-blue-300 opacity-50 cursor-not-allowed'
        }`}
      >
        Execute Feature
      </button>

      {showPopover && !hasConsent && (
        <ConsentPopover
          onNavigate={() => router.push('/dashboard/account?tab=consents&expand=ai_features')}
        />
      )}
    </div>
  );
}
```

### Example 2: Modal with Consent

```javascript
import { useDashboard } from '@/app/dashboard/DashboardContext';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

function FeatureModal({ isOpen, onClose }) {
  const { consents } = useDashboard();
  const router = useRouter();

  const hasConsent = consents?.ai_feature?.status === true;

  const handleAction = useCallback(() => {
    if (!hasConsent) {
      router.push('/dashboard/account?tab=consents&expand=ai_features');
      onClose();
      return;
    }
    performAction();
  }, [hasConsent, router, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ActionButton
          onClick={handleAction}
          disabled={!hasConsent}
          hasConsent={hasConsent}
        />
      </ModalContent>
    </Modal>
  );
}
```

### Example 3: Reusable Consent Popover Component

```javascript
function ConsentPopover({ message, onNavigate, position = 'top' }) {
  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  return (
    <div className={`absolute ${positionClasses[position]} left-1/2 transform -translate-x-1/2 w-72 z-50`}>
      <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3">
        <p className="mb-2">{message}</p>
        <button
          onClick={onNavigate}
          className="w-full text-blue-300 hover:text-blue-200 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors font-medium"
        >
          Enable in Settings →
        </button>
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}
```

---

## Integration with Existing Features

### SearchBar Example (Reference Implementation)

The semantic search in `SearchBar.jsx` is the reference implementation:

**Key Features:**
1. No `disabled` attribute on button
2. Conditional styling based on consent
3. Popover shows on hover when disabled
4. Click navigates to consent settings
5. Reactive to consent changes

**Location:** `app/dashboard/(dashboard pages)/contacts/components/SearchBar.jsx:163-206`

### Business Card Scanner Example

Full implementation across multiple components:

1. **Main Component:** `BusinessCardScanner.jsx`
   - Checks consent on mount
   - Wraps handlers with consent checks
   - Passes consent state to children

2. **UI Component:** `InitialScreen.jsx`
   - Receives consent props
   - Shows greyed-out buttons
   - Displays consent popovers

3. **Page Component:** `contacts/page.jsx`
   - Checks consent for button display
   - Shows popover on hover
   - Navigates to consent settings

---

## Troubleshooting

### Popover Not Showing

**Problem:** Hovering over greyed-out button doesn't show popover

**Solution:** Remove `disabled` attribute from button. Use CSS styling only.

```javascript
// Remove this:
disabled={!hasConsent}

// Keep only CSS styling:
className={!hasConsent ? 'cursor-not-allowed opacity-50' : ''}
```

### Consent State Not Updating

**Problem:** UI doesn't update when consent is granted/withdrawn

**Solution:** Don't cache consent state. Use direct reference:

```javascript
// Direct reference (reactive):
const hasConsent = consents?.feature?.status === true;
```

### Popover Positioning Issues

**Problem:** Popover appears off-screen or in wrong position

**Solution:** Use responsive Tailwind classes:

```javascript
className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72"
// On mobile, adjust: bottom-full sm:top-full
```

### Translation Keys Missing

**Problem:** Text shows as key names instead of translations

**Solution:** Always provide fallback:

```javascript
{t('feature.consent_required') || 'Feature requires consent'}
```

---

## Automated Test Coverage

### Test Suite: RGPD Consent Categories
**Status:** ✅ 100% Passing (12/12 tests)
**Test File:** `runConsentCategoryTests.mjs`
**Last Run:** 2025-11-11
**Duration:** ~3 seconds

#### Tested Functions

All core consent management functions are fully tested:

| Function | Tests | Status | Coverage |
|----------|-------|--------|----------|
| `batchGrantConsents()` | 5 tests | ✅ Passing | Batch granting across all 5 consent categories |
| `getUserConsents()` | 2 tests | ✅ Passing | Retrieving all 12 consent types, mixed states |
| `withdrawConsent()` | 2 tests | ✅ Passing | Individual withdrawal, category-level withdrawal |
| `getConsentHistory()` | 1 test | ✅ Passing | Complete audit trail with 15+ entries |
| `hasConsent()` | 2 tests | ✅ Passing | Category-level and individual consent checks |

#### Test Coverage by Category

The test suite validates consent management across all 5 GDPR consent categories:

1. **Essential** (2 consent types)
   - ✅ Batch granting TERMS_OF_SERVICE and PRIVACY_POLICY
   - ✅ Verification of essential consents

2. **AI Features** (3 consent types)
   - ✅ Batch granting AI_SEMANTIC_SEARCH, AI_AUTO_GROUPING, AI_BUSINESS_CARD_ENHANCEMENT
   - ✅ Category-wide withdrawal
   - ✅ Re-granting previously withdrawn consents

3. **Analytics** (3 consent types)
   - ✅ Batch granting ANALYTICS_BASIC, ANALYTICS_DETAILED, COOKIES_ANALYTICS
   - ✅ Mixed consent states across categories

4. **Communication** (2 consent types)
   - ✅ Batch granting MARKETING_EMAILS, CONTACT_RECOMMENDATIONS
   - ✅ Communication preferences validation

5. **Personalization** (2 consent types)
   - ✅ Batch granting PROFILE_PUBLIC, COOKIES_PERSONALIZATION
   - ✅ Personalization feature enablement

#### Detailed Test Results

```
Test 1: Grant All Essential Category Consents - ✅ PASSED
Test 2: Grant All AI Features Category Consents - ✅ PASSED
Test 3: Grant All Analytics Category Consents - ✅ PASSED
Test 4: Grant All Communication Category Consents - ✅ PASSED
Test 5: Grant All Personalization Category Consents - ✅ PASSED
Test 6: Verify All 12 Consent Types Are Granted - ✅ PASSED
Test 7: Withdraw Entire AI Features Category - ✅ PASSED
Test 8: Verify Mixed Consent States Across Categories - ✅ PASSED
Test 9: Verify Consent History Covers All Categories - ✅ PASSED
Test 10: Export Data Contains All Category Consents - ✅ PASSED
Test 11: Re-grant Previously Withdrawn AI Features Category - ✅ PASSED
Test 12: Check If Entire Category Is Enabled - ✅ PASSED
```

#### GDPR Compliance Validation

The test suite ensures full GDPR compliance by validating:
- ✅ **Consent Granularity:** All 12 consent types independently manageable
- ✅ **Audit Trail:** Complete history of all consent changes with timestamps
- ✅ **Data Portability:** Consent data included in user export
- ✅ **Withdrawal Rights:** Users can withdraw any consent at any time
- ✅ **Category Management:** Batch operations for related consents
- ✅ **State Persistence:** Consent states correctly stored and retrieved
- ✅ **Reactivity:** Mixed consent states handled correctly

#### Running the Tests

To run the consent category tests:

```bash
# Run from project root
node -r dotenv/config runConsentCategoryTests.mjs

# Expected output:
# ✅ ALL CONSENT CATEGORY TESTS PASSED!
# Passed: 12
# Failed: 0
# Total: 12
# Success: ✅ YES
```

#### Test Coverage Summary

- **Service Layer:** `lib/services/servicePrivacy/consentService.js` - 85% coverage
- **Functions Tested:** 5 out of 6 core functions
- **Test Scenarios:** 12 comprehensive test cases
- **Categories Covered:** All 5 consent categories
- **Consent Types Tested:** All 12 consent types
- **Edge Cases:** Withdrawal, re-granting, mixed states, audit trails

For complete RGPD test coverage (116 tests), see [RGPD_TESTING_GUIDE.md](./RGPD_TESTING_GUIDE.md).

---

## Related Documentation

- [RGPD_Conformite_Tapit.md](./RGPD_Conformite_Tapit.md) - GDPR compliance overview
- [RGPD_IMPLEMENTATION_SUMMARY.md](./RGPD_IMPLEMENTATION_SUMMARY.md) - Implementation summary
- [RGPD_TESTING_GUIDE.md](./RGPD_TESTING_GUIDE.md) - Testing procedures

---

## Summary

Implementing consent checks requires:

1. ✅ Register consent type in service
2. ✅ Add translation keys (all languages)
3. ✅ Import `useDashboard` hook
4. ✅ Check consent status reactively
5. ✅ Create click handler with consent check
6. ✅ Style button conditionally (NO `disabled` attribute!)
7. ✅ Show consent popover on hover
8. ✅ Navigate to consent settings on click
9. ✅ Block feature execution without consent
10. ✅ Test across all scenarios

**Key Principle:** Use CSS styling, not the `disabled` attribute, to make buttons appear disabled while preserving mouse event handlers for the consent popover.

---

**Last Updated:** 2025-11-11
**Version:** 1.1
**Maintainer:** Development Team
