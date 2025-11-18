# Tutorial Constants Refactoring Plan

## Executive Summary

Extract all hardcoded values, arrays, and configurations from 9 tutorial files into 3 organized constants files with barrel exports for maintainability and consistency.

---

## File Structure

```
lib/tutorial/
├── index.js                      # NEW - Barrel export file
├── tutorialConstants.js          # NEW - Core config values
├── tutorialCategories.js         # NEW - Category & tab definitions
├── tutorialStepConfigs.js        # NEW - Step configurations
├── tutorialSteps.js              # EXISTING - Will be updated
└── tutorialStyles.js             # EXISTING - No changes needed

app/dashboard/(dashboard pages)/account/components/tutorial-tabs/
├── OverviewTab.jsx               # REFACTOR - Use constants
├── NavbarTab.jsx                 # REFACTOR - Use constants
├── AccountTab.jsx                # REFACTOR - Use constants
├── LinksTab.jsx                  # REFACTOR - Use constants
├── AppearanceTab.jsx             # REFACTOR - Use constants
└── CompletionTab.jsx             # REFACTOR - Use constants

app/dashboard/(dashboard pages)/account/components/
└── TutorialProgressionSection.jsx # REFACTOR - Use constants

app/components/tutorial/
└── TutorialOverlay.jsx           # REFACTOR - Use constants
```

---

## Phase 1: Create New Constants Files

### File 1: `/lib/tutorial/tutorialConstants.js`

**Purpose**: Core configuration values used across the tutorial system

**Contents**:

```javascript
/**
 * Tutorial Configuration Constants
 *
 * Centralized configuration for timing, layout, and styling values
 * used throughout the tutorial system.
 */

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

export const TUTORIAL_TIMING = {
  // Navigation and animation delays
  HASH_CLEAR_DELAY: 100,           // ms - Delay before clearing URL hash
  SHARE_MODAL_DELAY: 500,          // ms - Delay before opening share modal
  NAVIGATION_DELAY: 500,           // ms - Wait time after navigation

  // Highlight and scroll timing
  HIGHLIGHT_DURATION: 3000,        // ms - Auto-dismiss highlight duration
  SCROLL_INITIAL_DELAY: 500,       // ms - Initial delay before scroll attempt
  SCROLL_RETRY_TIMEOUT: 200,       // ms - Timeout between scroll retries
  MAX_SCROLL_ATTEMPTS: 10,         // Maximum scroll retry attempts
};

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

export const TUTORIAL_LAYOUT = {
  // Responsive breakpoints
  MOBILE_BREAKPOINT: 768,          // px - Mobile vs desktop breakpoint

  // Joyride positioning
  SCROLL_OFFSET: 200,              // px - Offset from top when scrolling
  SPOTLIGHT_PADDING: 8,            // px - Padding around spotlight
  ARROW_LENGTH: 8,                 // px - Tooltip arrow length
  ARROW_SPREAD: 12,                // px - Tooltip arrow spread

  // Modal dimensions
  CENTERED_MODAL_WIDTH: 500,       // px - Width for centered tooltips

  // Loading skeletons
  SKELETON_SIZES: {
    OVERVIEW: 4,                   // Number of skeleton cards in overview
    NAVBAR: 2,                     // Number of skeleton items in navbar tab
    ACCOUNT: 9,                    // Number of skeleton items in account tab
    LINKS: 2,                      // Number of skeleton items in links tab
    APPEARANCE: 1,                 // Number of skeleton items in appearance tab
    COMPLETION: 1,                 // Number of skeleton items in completion tab
  },
};

// ============================================================================
// COLOR CONSTANTS
// ============================================================================

export const TUTORIAL_COLORS = {
  // Brand colors
  PRIMARY_BRAND: '#8129D9',        // Purple - Primary brand color
  PRIMARY_BRAND_HOVER: '#6B1FB5',  // Darker purple - Hover state
  PROGRESS_BAR: '#3AE09A',         // Green - Progress bar color

  // Gradients
  GRADIENT_START: '#8129D9',       // Purple - Gradient start
  GRADIENT_END: '#5D18A2',         // Darker purple - Gradient end

  // UI highlights
  ACTIVE_TAB_COLOR: '#8129D9',     // Purple - Active tab indicator
  HIGHLIGHT_RING: 'ring-amber-400', // Tailwind class - Section highlight
};

// ============================================================================
// TUTORIAL PLACEMENTS
// ============================================================================

export const TUTORIAL_PLACEMENTS = {
  CENTER: 'center',
  BOTTOM: 'bottom',
  TOP: 'top',
  LEFT: 'left',
  RIGHT: 'right',
  AUTO: 'auto',
};

// ============================================================================
// TUTORIAL NAVIGATION PATHS
// ============================================================================

export const TUTORIAL_ROUTES = {
  ACCOUNT: '/dashboard/account',
  APPEARANCE: '/dashboard/appearance',
  LINKS: '/dashboard/links',
  ANALYTICS: '/dashboard/analytics',
  CONTACTS: '/dashboard/contacts',
  SETTINGS: '/dashboard/settings',
};
```

---

### File 2: `/lib/tutorial/tutorialCategories.js`

**Purpose**: Category and tab configuration data

**Contents**:

```javascript
/**
 * Tutorial Categories and Tabs Configuration
 *
 * Defines the structure of tutorial categories and navigation tabs
 * used in the Tutorial Progression section.
 */

import { Menu, Shield, Link2, Palette, Trophy, Info } from 'lucide-react';
import { TUTORIAL_STEP_IDS } from './tutorialSteps';

// ============================================================================
// ICON URLS (External Assets)
// ============================================================================

export const TUTORIAL_ICON_URLS = {
  LINKS: 'https://linktree.sirv.com/Images/icons/links.svg',
  APPEARANCE: 'https://linktree.sirv.com/Images/icons/appearance.svg',
  ANALYTICS: 'https://linktree.sirv.com/Images/icons/analytics.svg',
  SETTINGS: 'https://linktree.sirv.com/Images/icons/setting.svg',
};

// ============================================================================
// CONTACTS ICON (Inline SVG Component)
// ============================================================================

export const ContactsIconSvg = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

// ============================================================================
// TUTORIAL CATEGORIES (Overview Tab)
// ============================================================================

export const TUTORIAL_CATEGORIES = [
  {
    id: 'navbar',
    icon: Menu,
    iconColor: 'text-purple-600',
    iconBgColor: 'bg-purple-100',
    titleKey: 'tutorial.overview_cards.navbar.title',
    descriptionKey: 'tutorial.overview_cards.navbar.description',
    ctaKey: 'tutorial.overview_cards.navbar.cta',
    steps: [
      TUTORIAL_STEP_IDS.WELCOME,
      TUTORIAL_STEP_IDS.NAVBAR,
      TUTORIAL_STEP_IDS.NAVBAR_LINKS,
      TUTORIAL_STEP_IDS.NAVBAR_APPEARANCE,
      TUTORIAL_STEP_IDS.NAVBAR_ANALYTICS,
      TUTORIAL_STEP_IDS.NAVBAR_CONTACTS,
      TUTORIAL_STEP_IDS.NAVBAR_SETTINGS,
      TUTORIAL_STEP_IDS.NAVBAR_SHARE,
      TUTORIAL_STEP_IDS.NAVBAR_ACCOUNT,
    ],
  },
  {
    id: 'account',
    icon: Shield,
    iconColor: 'text-indigo-600',
    iconBgColor: 'bg-indigo-100',
    titleKey: 'tutorial.categories.account.title',
    descriptionKey: 'tutorial.categories.account.description',
    ctaKey: 'tutorial.categories.account.cta',
    steps: [
      TUTORIAL_STEP_IDS.ACCOUNT_PRIVACY_OVERVIEW,
      TUTORIAL_STEP_IDS.ACCOUNT_PRIVACY_TABS,
      TUTORIAL_STEP_IDS.ACCOUNT_TAB_OVERVIEW,
      TUTORIAL_STEP_IDS.ACCOUNT_TAB_EXPORT,
      TUTORIAL_STEP_IDS.ACCOUNT_TAB_DELETE,
      TUTORIAL_STEP_IDS.ACCOUNT_TAB_CONSENTS,
      TUTORIAL_STEP_IDS.ACCOUNT_TAB_SETTINGS,
      TUTORIAL_STEP_IDS.ACCOUNT_TAB_CONTACT_DOWNLOAD,
      TUTORIAL_STEP_IDS.ACCOUNT_TAB_WEBSITE_CONFIG,
      TUTORIAL_STEP_IDS.ACCOUNT_TUTORIAL_PROGRESSION,
    ],
  },
  {
    id: 'links',
    icon: Link2,
    iconColor: 'text-blue-600',
    iconBgColor: 'bg-blue-100',
    titleKey: 'tutorial.overview_cards.links.title',
    descriptionKey: 'tutorial.overview_cards.links.description',
    ctaKey: 'tutorial.overview_cards.links.cta',
    steps: [
      TUTORIAL_STEP_IDS.CREATE_LINK,
      TUTORIAL_STEP_IDS.LINK_FORM,
    ],
  },
  {
    id: 'appearance',
    icon: Palette,
    iconColor: 'text-green-600',
    iconBgColor: 'bg-green-100',
    titleKey: 'tutorial.overview_cards.appearance.title',
    descriptionKey: 'tutorial.overview_cards.appearance.description',
    ctaKey: 'tutorial.overview_cards.appearance.cta',
    steps: [TUTORIAL_STEP_IDS.APPEARANCE],
  },
  {
    id: 'completion',
    icon: Trophy,
    iconColor: 'text-yellow-600',
    iconBgColor: 'bg-yellow-100',
    titleKey: 'tutorial.overview_cards.completion.title',
    descriptionKey: 'tutorial.overview_cards.completion.description',
    ctaKey: 'tutorial.overview_cards.completion.cta',
    steps: [TUTORIAL_STEP_IDS.COMPLETION],
  },
];

// ============================================================================
// TUTORIAL PROGRESSION TABS
// ============================================================================

export const TUTORIAL_TABS = [
  {
    id: 'overview',
    labelKey: 'tutorial.tabs.overview',
    iconComponent: Info,
  },
  {
    id: 'navbar',
    labelKey: 'tutorial.tabs.navbar',
    iconComponent: Menu,
  },
  {
    id: 'account',
    labelKey: 'tutorial.tabs.account',
    iconComponent: Shield,
  },
  {
    id: 'links',
    labelKey: 'tutorial.tabs.links',
    icon: TUTORIAL_ICON_URLS.LINKS,
    iconAlt: 'links icon',
  },
  {
    id: 'appearance',
    labelKey: 'tutorial.tabs.appearance',
    icon: TUTORIAL_ICON_URLS.APPEARANCE,
    iconAlt: 'appearance icon',
  },
  {
    id: 'completion',
    labelKey: 'tutorial.tabs.completion',
    iconComponent: Trophy,
  },
  {
    id: 'analytics',
    labelKey: 'tutorial.tabs.analytics',
    icon: TUTORIAL_ICON_URLS.ANALYTICS,
    iconAlt: 'analytics icon',
  },
  {
    id: 'contacts',
    labelKey: 'tutorial.tabs.contacts',
    iconSvg: ContactsIconSvg,
  },
  {
    id: 'settings',
    labelKey: 'tutorial.tabs.settings',
    icon: TUTORIAL_ICON_URLS.SETTINGS,
    iconAlt: 'settings icon',
  },
];
```

---

### File 3: `/lib/tutorial/tutorialStepConfigs.js`

**Purpose**: Step configurations for each tab

**Contents**:

```javascript
/**
 * Tutorial Step Configurations
 *
 * Defines the step arrays used in each tutorial tab component.
 * Each step includes ID, index, and translation keys.
 */

import { TUTORIAL_STEP_IDS } from './tutorialSteps';

// ============================================================================
// MASTER STEP LIST (All 23 steps in order)
// ============================================================================

export const ALL_TUTORIAL_STEPS = [
  TUTORIAL_STEP_IDS.WELCOME,
  TUTORIAL_STEP_IDS.NAVBAR,
  TUTORIAL_STEP_IDS.NAVBAR_LINKS,
  TUTORIAL_STEP_IDS.NAVBAR_APPEARANCE,
  TUTORIAL_STEP_IDS.NAVBAR_ANALYTICS,
  TUTORIAL_STEP_IDS.NAVBAR_CONTACTS,
  TUTORIAL_STEP_IDS.NAVBAR_SETTINGS,
  TUTORIAL_STEP_IDS.NAVBAR_SHARE,
  TUTORIAL_STEP_IDS.NAVBAR_ACCOUNT,
  TUTORIAL_STEP_IDS.ACCOUNT_PRIVACY_OVERVIEW,
  TUTORIAL_STEP_IDS.ACCOUNT_PRIVACY_TABS,
  TUTORIAL_STEP_IDS.ACCOUNT_TAB_OVERVIEW,
  TUTORIAL_STEP_IDS.ACCOUNT_TAB_EXPORT,
  TUTORIAL_STEP_IDS.ACCOUNT_TAB_DELETE,
  TUTORIAL_STEP_IDS.ACCOUNT_TAB_CONSENTS,
  TUTORIAL_STEP_IDS.ACCOUNT_TAB_SETTINGS,
  TUTORIAL_STEP_IDS.ACCOUNT_TAB_CONTACT_DOWNLOAD,
  TUTORIAL_STEP_IDS.ACCOUNT_TAB_WEBSITE_CONFIG,
  TUTORIAL_STEP_IDS.ACCOUNT_TUTORIAL_PROGRESSION,
  TUTORIAL_STEP_IDS.CREATE_LINK,
  TUTORIAL_STEP_IDS.LINK_FORM,
  TUTORIAL_STEP_IDS.APPEARANCE,
  TUTORIAL_STEP_IDS.COMPLETION,
];

// ============================================================================
// NAVBAR TAB STEPS (8 steps)
// ============================================================================

export const NAVBAR_STEPS = [
  {
    id: TUTORIAL_STEP_IDS.NAVBAR,
    index: 1,
    titleKey: 'tutorial.steps.navbar.title',
    descriptionKey: 'tutorial.steps.navbar.description',
  },
  {
    id: TUTORIAL_STEP_IDS.NAVBAR_LINKS,
    index: 2,
    titleKey: 'tutorial.steps.navbar_links.title',
    descriptionKey: 'tutorial.steps.navbar_links.description',
  },
  {
    id: TUTORIAL_STEP_IDS.NAVBAR_APPEARANCE,
    index: 3,
    titleKey: 'tutorial.steps.navbar_appearance.title',
    descriptionKey: 'tutorial.steps.navbar_appearance.description',
  },
  {
    id: TUTORIAL_STEP_IDS.NAVBAR_ANALYTICS,
    index: 4,
    titleKey: 'tutorial.steps.navbar_analytics.title',
    descriptionKey: 'tutorial.steps.navbar_analytics.description',
  },
  {
    id: TUTORIAL_STEP_IDS.NAVBAR_CONTACTS,
    index: 5,
    titleKey: 'tutorial.steps.navbar_contacts.title',
    descriptionKey: 'tutorial.steps.navbar_contacts.description',
  },
  {
    id: TUTORIAL_STEP_IDS.NAVBAR_SETTINGS,
    index: 6,
    titleKey: 'tutorial.steps.navbar_settings.title',
    descriptionKey: 'tutorial.steps.navbar_settings.description',
  },
  {
    id: TUTORIAL_STEP_IDS.NAVBAR_SHARE,
    index: 7,
    titleKey: 'tutorial.steps.navbar_share.title',
    descriptionKey: 'tutorial.steps.navbar_share.description',
  },
  {
    id: TUTORIAL_STEP_IDS.NAVBAR_ACCOUNT,
    index: 8,
    titleKey: 'tutorial.steps.navbar_account.title',
    descriptionKey: 'tutorial.steps.navbar_account.description',
  },
];

// ============================================================================
// ACCOUNT TAB STEPS (9 steps)
// ============================================================================

export const ACCOUNT_STEPS = [
  {
    id: TUTORIAL_STEP_IDS.ACCOUNT_PRIVACY_OVERVIEW,
    index: 10,
    titleKey: 'tutorial.steps.account_privacy_overview.title',
    descriptionKey: 'tutorial.steps.account_privacy_overview.description',
  },
  {
    id: TUTORIAL_STEP_IDS.ACCOUNT_PRIVACY_TABS,
    index: 11,
    titleKey: 'tutorial.steps.account_privacy_tabs.title',
    descriptionKey: 'tutorial.steps.account_privacy_tabs.description',
  },
  {
    id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_OVERVIEW,
    index: 12,
    titleKey: 'tutorial.steps.account_tab_overview.title',
    descriptionKey: 'tutorial.steps.account_tab_overview.description',
  },
  {
    id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_EXPORT,
    index: 13,
    titleKey: 'tutorial.steps.account_tab_export.title',
    descriptionKey: 'tutorial.steps.account_tab_export.description',
  },
  {
    id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_DELETE,
    index: 14,
    titleKey: 'tutorial.steps.account_tab_delete.title',
    descriptionKey: 'tutorial.steps.account_tab_delete.description',
  },
  {
    id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_CONSENTS,
    index: 15,
    titleKey: 'tutorial.steps.account_tab_consents.title',
    descriptionKey: 'tutorial.steps.account_tab_consents.description',
  },
  {
    id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_SETTINGS,
    index: 16,
    titleKey: 'tutorial.steps.account_tab_settings.title',
    descriptionKey: 'tutorial.steps.account_tab_settings.description',
  },
  {
    id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_CONTACT_DOWNLOAD,
    index: 17,
    titleKey: 'tutorial.steps.account_tab_contact_download.title',
    descriptionKey: 'tutorial.steps.account_tab_contact_download.description',
  },
  {
    id: TUTORIAL_STEP_IDS.ACCOUNT_TAB_WEBSITE_CONFIG,
    index: 18,
    titleKey: 'tutorial.steps.account_tab_website_config.title',
    descriptionKey: 'tutorial.steps.account_tab_website_config.description',
  },
];

// ============================================================================
// LINKS TAB STEPS (2 steps)
// ============================================================================

export const LINKS_STEPS = [
  {
    id: TUTORIAL_STEP_IDS.CREATE_LINK,
    index: 20,
    titleKey: 'tutorial.steps.create_link.title',
    descriptionKey: 'tutorial.steps.create_link.description',
  },
  {
    id: TUTORIAL_STEP_IDS.LINK_FORM,
    index: 21,
    titleKey: 'tutorial.steps.link_form.title',
    descriptionKey: 'tutorial.steps.link_form.description',
  },
];

// ============================================================================
// APPEARANCE TAB STEPS (1 step)
// ============================================================================

export const APPEARANCE_STEPS = [
  {
    id: TUTORIAL_STEP_IDS.APPEARANCE,
    index: 22,
    titleKey: 'tutorial.steps.appearance.title',
    descriptionKey: 'tutorial.steps.appearance.description',
  },
];

// ============================================================================
// COMPLETION TAB STEPS (1 step)
// ============================================================================

export const COMPLETION_STEPS = [
  {
    id: TUTORIAL_STEP_IDS.COMPLETION,
    index: 23,
    titleKey: 'tutorial.steps.completion.title',
    descriptionKey: 'tutorial.steps.completion.description',
  },
];
```

---

### File 4: `/lib/tutorial/index.js` (Barrel Export)

**Purpose**: Single import point for all tutorial constants

**Contents**:

```javascript
/**
 * Tutorial Module Barrel Export
 *
 * Provides a single import point for all tutorial constants,
 * configurations, and utilities.
 *
 * Usage:
 *   import { TUTORIAL_TIMING, TUTORIAL_CATEGORIES, NAVBAR_STEPS } from '@/lib/tutorial';
 */

// Re-export all from tutorialConstants
export {
  TUTORIAL_TIMING,
  TUTORIAL_LAYOUT,
  TUTORIAL_COLORS,
  TUTORIAL_PLACEMENTS,
  TUTORIAL_ROUTES,
} from './tutorialConstants';

// Re-export all from tutorialCategories
export {
  TUTORIAL_ICON_URLS,
  ContactsIconSvg,
  TUTORIAL_CATEGORIES,
  TUTORIAL_TABS,
} from './tutorialCategories';

// Re-export all from tutorialStepConfigs
export {
  ALL_TUTORIAL_STEPS,
  NAVBAR_STEPS,
  ACCOUNT_STEPS,
  LINKS_STEPS,
  APPEARANCE_STEPS,
  COMPLETION_STEPS,
} from './tutorialStepConfigs';

// Re-export from existing files
export { TUTORIAL_STEP_IDS } from './tutorialSteps';
export { getTutorialSteps } from './tutorialSteps';
export { tutorialStyles, mobileTutorialStyles, mergeTutorialStyles } from './tutorialStyles';
```

---

## Phase 2: Refactor Existing Files

### 1. OverviewTab.jsx

**Changes**:
- Remove `allSteps` array (lines 28-52) → Import `ALL_TUTORIAL_STEPS`
- Remove `categories` array (lines 115-187) → Import `TUTORIAL_CATEGORIES`
- Replace hardcoded colors with `TUTORIAL_COLORS` constants

**Before**:
```javascript
const allSteps = [
  TUTORIAL_STEP_IDS.WELCOME,
  TUTORIAL_STEP_IDS.NAVBAR,
  // ... 21 more steps
];

const categories = [
  {
    id: 'navbar',
    icon: Menu,
    iconColor: 'text-purple-600',
    // ... rest of config
  },
  // ... 4 more categories
];
```

**After**:
```javascript
import { ALL_TUTORIAL_STEPS, TUTORIAL_CATEGORIES, TUTORIAL_COLORS } from '@/lib/tutorial';

// Use directly:
const allSteps = ALL_TUTORIAL_STEPS;
const categories = TUTORIAL_CATEGORIES;

// For progress bar:
style={{ width: `${getProgressPercentage()}%` }}
className={`h-full bg-[${TUTORIAL_COLORS.PROGRESS_BAR}] rounded-full`}
```

---

### 2. NavbarTab.jsx

**Changes**:
- Remove `navbarSteps` array (lines 25-74) → Import `NAVBAR_STEPS`
- Update skeleton array from `[...Array(2)]` → Use `TUTORIAL_LAYOUT.SKELETON_SIZES.NAVBAR`

**Before**:
```javascript
const navbarSteps = [
  {
    id: TUTORIAL_STEP_IDS.NAVBAR,
    index: 1,
    titleKey: 'tutorial.steps.navbar.title',
    descriptionKey: 'tutorial.steps.navbar.description',
  },
  // ... 7 more steps
];

{[...Array(2)].map((_, i) => (...))}
```

**After**:
```javascript
import { NAVBAR_STEPS, TUTORIAL_LAYOUT } from '@/lib/tutorial';

const navbarSteps = NAVBAR_STEPS;

{[...Array(TUTORIAL_LAYOUT.SKELETON_SIZES.NAVBAR)].map((_, i) => (...))}
```

---

### 3. AccountTab.jsx

**Changes**:
- Remove `accountSteps` array (lines 25-80) → Import `ACCOUNT_STEPS`
- Update skeleton array size

**Before**:
```javascript
const accountSteps = [
  {
    id: TUTORIAL_STEP_IDS.ACCOUNT_PRIVACY_OVERVIEW,
    index: 10,
    // ... config
  },
  // ... 8 more steps
];

{[...Array(9)].map((_, i) => (...))}
```

**After**:
```javascript
import { ACCOUNT_STEPS, TUTORIAL_LAYOUT } from '@/lib/tutorial';

const accountSteps = ACCOUNT_STEPS;

{[...Array(TUTORIAL_LAYOUT.SKELETON_SIZES.ACCOUNT)].map((_, i) => (...))}
```

---

### 4. LinksTab.jsx

**Changes**:
- Remove `linksSteps` array → Import `LINKS_STEPS`
- Update skeleton array size

**After**:
```javascript
import { LINKS_STEPS, TUTORIAL_LAYOUT } from '@/lib/tutorial';

const linksSteps = LINKS_STEPS;
{[...Array(TUTORIAL_LAYOUT.SKELETON_SIZES.LINKS)].map((_, i) => (...))}
```

---

### 5. AppearanceTab.jsx

**Changes**:
- Remove `appearanceSteps` array → Import `APPEARANCE_STEPS`

**After**:
```javascript
import { APPEARANCE_STEPS } from '@/lib/tutorial';

const appearanceSteps = APPEARANCE_STEPS;
```

---

### 6. CompletionTab.jsx

**Changes**:
- Remove `completionSteps` array → Import `COMPLETION_STEPS`

**After**:
```javascript
import { COMPLETION_STEPS } from '@/lib/tutorial';

const completionSteps = COMPLETION_STEPS;
```

---

### 7. TutorialProgressionSection.jsx

**Changes**:
- Remove `tabs` array (lines 88-144) → Import `TUTORIAL_TABS`
- Replace hardcoded timing values with `TUTORIAL_TIMING` constants
- Replace hardcoded colors with `TUTORIAL_COLORS` constants

**Before**:
```javascript
const tabs = [
  {
    id: 'overview',
    labelKey: 'tutorial.tabs.overview',
    iconComponent: Info,
  },
  // ... 8 more tabs
];

setTimeout(() => scrollToSection(), 500);
const timer = setTimeout(() => { ... }, 3000);
```

**After**:
```javascript
import { TUTORIAL_TABS, TUTORIAL_TIMING, TUTORIAL_COLORS } from '@/lib/tutorial';

const tabs = TUTORIAL_TABS;

setTimeout(() => scrollToSection(), TUTORIAL_TIMING.SCROLL_INITIAL_DELAY);
const timer = setTimeout(() => { ... }, TUTORIAL_TIMING.HIGHLIGHT_DURATION);
```

---

### 8. TutorialOverlay.jsx

**Changes**:
- Replace hardcoded timing values with `TUTORIAL_TIMING`
- Replace hardcoded layout values with `TUTORIAL_LAYOUT`

**Before**:
```javascript
const isMobile = window.innerWidth < 768;

setTimeout(() => { ... }, 100);
setTimeout(() => { ... }, 500);

<Joyride
  scrollOffset={200}
  spotlightPadding={8}
  floaterProps={{
    arrow: { length: 8, spread: 12 }
  }}
/>
```

**After**:
```javascript
import { TUTORIAL_TIMING, TUTORIAL_LAYOUT } from '@/lib/tutorial';

const isMobile = window.innerWidth < TUTORIAL_LAYOUT.MOBILE_BREAKPOINT;

setTimeout(() => { ... }, TUTORIAL_TIMING.HASH_CLEAR_DELAY);
setTimeout(() => { ... }, TUTORIAL_TIMING.SHARE_MODAL_DELAY);

<Joyride
  scrollOffset={TUTORIAL_LAYOUT.SCROLL_OFFSET}
  spotlightPadding={TUTORIAL_LAYOUT.SPOTLIGHT_PADDING}
  floaterProps={{
    arrow: {
      length: TUTORIAL_LAYOUT.ARROW_LENGTH,
      spread: TUTORIAL_LAYOUT.ARROW_SPREAD
    }
  }}
/>
```

---

### 9. tutorialSteps.js

**Changes**:
- Replace hardcoded gradient colors with `TUTORIAL_COLORS`
- Replace hardcoded width with `TUTORIAL_LAYOUT.CENTERED_MODAL_WIDTH`

**Before**:
```javascript
background: 'linear-gradient(135deg, #8129D9 0%, #5D18A2 100%)',
width: 500,
```

**After**:
```javascript
import { TUTORIAL_COLORS, TUTORIAL_LAYOUT } from './tutorialConstants';

background: `linear-gradient(135deg, ${TUTORIAL_COLORS.GRADIENT_START} 0%, ${TUTORIAL_COLORS.GRADIENT_END} 100%)`,
width: TUTORIAL_LAYOUT.CENTERED_MODAL_WIDTH,
```

---

## Phase 3: Testing Checklist

### Functionality Tests
- [ ] Tutorial starts correctly from welcome screen
- [ ] All 23 steps navigate properly in sequence
- [ ] Back/Next buttons work correctly
- [ ] Skip tutorial functionality works
- [ ] Tutorial completion saves to Firestore
- [ ] Overview tab shows correct categories
- [ ] Each tab (Navbar, Account, Links, etc.) displays correct steps
- [ ] Progress bar updates correctly
- [ ] Category cards show correct step counts

### Visual Tests
- [ ] Colors match original (purple #8129D9, green #3AE09A)
- [ ] Tooltips positioned correctly
- [ ] Icons display properly (Lucide + external URLs)
- [ ] Skeleton loaders show correct number of items
- [ ] Highlight ring appears on section navigation
- [ ] Active tab styling correct

### Responsive Tests
- [ ] Mobile breakpoint works at 768px
- [ ] Tooltip sizing adapts to mobile
- [ ] Tab navigation scrolls on mobile
- [ ] Bottom navigation doesn't overlap tooltips

### Performance Tests
- [ ] No console errors
- [ ] No duplicate imports
- [ ] Barrel exports load correctly
- [ ] File sizes reasonable (<50KB per constants file)

---

## Phase 4: Commit Strategy

### Commit 1: Create Constants Files
```bash
git add lib/tutorial/tutorialConstants.js
git add lib/tutorial/tutorialCategories.js
git add lib/tutorial/tutorialStepConfigs.js
git add lib/tutorial/index.js
git commit -m "✨ Add tutorial constants files with barrel exports"
```

### Commit 2: Refactor Tab Components
```bash
git add app/dashboard/(dashboard\ pages)/account/components/tutorial-tabs/*.jsx
git commit -m "♻️ Refactor tutorial tab components to use constants"
```

### Commit 3: Refactor Main Components
```bash
git add app/dashboard/(dashboard\ pages)/account/components/TutorialProgressionSection.jsx
git add app/components/tutorial/TutorialOverlay.jsx
git add lib/tutorial/tutorialSteps.js
git commit -m "♻️ Refactor tutorial overlay and steps to use constants"
```

---

## Benefits Summary

### 1. **Maintainability**
- Single source of truth for all values
- Easy to update timing/colors/layouts globally
- No hunting through files to find hardcoded values

### 2. **Consistency**
- All components use exact same values
- No discrepancies between files
- Enforces design system compliance

### 3. **Developer Experience**
- Barrel exports = clean imports
- Autocomplete works better
- Self-documenting code with descriptive constant names

### 4. **Testing**
- Easy to mock constants in tests
- Can swap values for different environments
- Simpler to test edge cases

### 5. **Performance**
- No impact - constants are compile-time
- Tree-shaking works with named exports
- Better code minification

---

## Import Examples

### Before (Scattered)
```javascript
// In OverviewTab.jsx
const allSteps = [TUTORIAL_STEP_IDS.WELCOME, ...]; // 23 lines
const categories = [{id: 'navbar', icon: Menu, ...}]; // 72 lines

// In TutorialProgressionSection.jsx
const tabs = [{id: 'overview', ...}]; // 56 lines
setTimeout(() => scrollToSection(), 500); // Magic number
const timer = setTimeout(() => {}, 3000); // Magic number
```

### After (Clean with Barrel Exports)
```javascript
// In OverviewTab.jsx
import { ALL_TUTORIAL_STEPS, TUTORIAL_CATEGORIES } from '@/lib/tutorial';

// In TutorialProgressionSection.jsx
import { TUTORIAL_TABS, TUTORIAL_TIMING } from '@/lib/tutorial';
setTimeout(() => scrollToSection(), TUTORIAL_TIMING.SCROLL_INITIAL_DELAY);
const timer = setTimeout(() => {}, TUTORIAL_TIMING.HIGHLIGHT_DURATION);
```

---

## File Size Estimates

```
tutorialConstants.js:     ~4 KB (well-commented, organized)
tutorialCategories.js:    ~8 KB (includes arrays and icons)
tutorialStepConfigs.js:   ~6 KB (step definitions)
index.js:                 ~1 KB (barrel exports)
─────────────────────────────────
Total:                   ~19 KB

Removed from components: ~35 KB (duplicated data)
Net reduction:           ~16 KB
```

---

## Timeline Estimate

- **Phase 1** (Create constants): ~30 minutes
- **Phase 2** (Refactor 9 files): ~45 minutes
- **Phase 3** (Testing): ~30 minutes
- **Phase 4** (Commit & document): ~15 minutes
- **Total**: ~2 hours

---

## Risk Assessment

### Low Risk ✅
- All changes are structural, not functional
- Constants have exact same values
- Existing tests should pass unchanged
- Easy to rollback if needed

### Potential Issues
- Import path updates needed (`@/lib/tutorial`)
- Ensure jsconfig.json has path alias configured
- Watch for circular dependencies (avoid importing constants back to tutorialSteps.js)

### Mitigation
- Test each component individually after refactor
- Use barrel exports to avoid direct file imports
- Run full app in dev mode before committing

---

## Success Criteria

✅ All 9 files refactored
✅ 3 new constants files created
✅ Barrel export file working
✅ All tests passing
✅ No console errors
✅ Tutorial works identically to before
✅ Clean git history with 3 logical commits
✅ Documentation updated (this plan)

---

## Future Enhancements

After this refactor, we can easily add:

1. **Mobile-specific constants**
   ```javascript
   TUTORIAL_LAYOUT.MOBILE_SCROLL_OFFSET = 100;
   TUTORIAL_LAYOUT.MOBILE_SPOTLIGHT_PADDING = 12;
   ```

2. **Theme variations**
   ```javascript
   TUTORIAL_COLORS.DARK_MODE = { ... };
   ```

3. **A/B testing values**
   ```javascript
   TUTORIAL_TIMING.VARIANT_A = { HIGHLIGHT_DURATION: 3000 };
   TUTORIAL_TIMING.VARIANT_B = { HIGHLIGHT_DURATION: 5000 };
   ```

4. **Environment-specific configs**
   ```javascript
   TUTORIAL_CONFIG.DEV = { ... };
   TUTORIAL_CONFIG.PROD = { ... };
   ```

---

## Questions & Concerns

**Q: Will this break existing functionality?**
A: No, we're only moving values to constants. Functionality remains identical.

**Q: Do we need to update tests?**
A: Only import paths. Test logic should work unchanged.

**Q: What if we need component-specific values?**
A: Keep them local. Only extract shared/repeated values.

**Q: Can we add TypeScript types later?**
A: Yes! These files are perfect candidates for adding JSDoc or converting to .ts

---

**END OF PLAN**
