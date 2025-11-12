---
id: features-tutorial-account-018
title: Tutorial and Account Page Structure
category: features
tags: [tutorial, account, tabs, navigation, ui, structure, progressive-disclosure, independence, component-separation]
status: active
created: 2025-11-12
updated: 2025-11-12
related:
  - ACCOUNT_PRIVACY_CENTER.md
  - CV_TOGGLE_FEATURE.md
---

# Tutorial and Account Page Structure

## Overview

This guide documents the restructured tutorial progression system and account page layout that implements a consistent visual hierarchy pattern across the dashboard. Both systems now follow a unified design where titles appear before navigation tabs, improving user experience and information architecture.

## Tutorial Progression System

### Architecture

The tutorial system is organized into a multi-tab interface with category-based organization:

**Location:** `/app/dashboard/(dashboard pages)/account/components/`

**Key Components:**
- `TutorialProgressionSection.jsx` - Main container with tab navigation
- `TutorialTabContext.js` - State management for active tab
- `TutorialStepCard.jsx` - Reusable component for displaying individual steps
- Individual tab components for each category

### Tab Structure

#### 1. Overview Tab (`tutorial-tabs/OverviewTab.jsx`)
**Purpose:** High-level view of all tutorial categories

**Design Pattern:**
- Progress tracking (X/6 steps completed)
- Category cards in 2x2 grid layout
- Each card shows:
  - Colored icon (Menu, Link2, Palette, Trophy)
  - Category title and description
  - Progress indicator (completed/total steps)
  - CTA button to navigate to category tab

**Category Cards:**
```javascript
{
  id: 'navbar',
  icon: Menu,
  iconColor: 'text-purple-600',
  iconBgColor: 'bg-purple-100',
  titleKey: 'tutorial.overview_cards.navbar.title',
  descriptionKey: 'tutorial.overview_cards.navbar.description',
  steps: [TUTORIAL_STEP_IDS.WELCOME, TUTORIAL_STEP_IDS.NAVBAR]
}
```

#### 2. Navbar Tab (`tutorial-tabs/NavbarTab.jsx`)
**Steps:** 0-1 (Welcome, Navbar navigation)
- Step 0: Welcome to Weavink
- Step 1: Navigation bar overview

#### 3. Links Tab (`tutorial-tabs/LinksTab.jsx`)
**Steps:** 2-3 (Link management)
- Step 2: Create your first link
- Step 3: Link form usage

#### 4. Appearance Tab (`tutorial-tabs/AppearanceTab.jsx`)
**Steps:** 4 (Customization)
- Step 4: Customize appearance

#### 5. Completion Tab (`tutorial-tabs/CompletionTab.jsx`)
**Steps:** 5 (Congratulations)
- Step 5: Tutorial complete

#### 6. Coming Soon Tabs
- Analytics (Statistics)
- Contacts
- Settings

### Visual Hierarchy Pattern

```
┌─────────────────────────────────────┐
│ Progression du Tutoriel             │ ← Title (h2, 2xl, bold)
│ Suivez votre progression...         │ ← Description (sm, gray-600)
├─────────────────────────────────────┤
│ [Overview] [Navbar] [Links] ...     │ ← Tab Navigation
├─────────────────────────────────────┤
│                                     │
│  Tab Content Here                   │ ← Active Tab Component
│                                     │
└─────────────────────────────────────┘
```

### Step Card Component

**File:** `tutorial-tabs/TutorialStepCard.jsx`

**Features:**
- Green border for completed steps (`border-[#3AE09A]`)
- Grey border for incomplete steps (`border-gray-300`)
- Checkmark icon for completed
- Step number for incomplete
- Status badge (Complété/Non complété)
- "Jump to Step" button (always visible)

**Props:**
```javascript
{
  step: {
    id: string,
    index: number,
    titleKey: string,
    descriptionKey: string
  },
  completed: boolean
}
```

## Account Page Structure

### Restructured Layout

**Location:** `/app/dashboard/(dashboard pages)/account/page.jsx`

**Previous Problem:** Tab navigation appeared before content titles, causing inconsistent visual hierarchy.

**Solution:** Dynamic title section added before tab navigation.

### Component Independence

**Critical Design Decision:** The Privacy Overview and Tutorial Progression sections are completely independent and detached from each other.

**Implementation:**
- **Privacy Overview**: Managed by account page tabs (Overview, Export, Delete, etc.)
- **Tutorial Progression**: Rendered at page level, always visible regardless of active Privacy tab

**Why This Matters:**
- Tutorial Progression remains visible when switching between Privacy tabs
- Users can reference tutorial steps while exploring different Privacy settings
- Both sections maintain their own state and navigation independently

### Visual Hierarchy Pattern

```
┌─────────────────────────────────────┐
│ Header: Account & Privacy           │
├─────────────────────────────────────┤
│ [Privacy Tab Title]                 │ ← Dynamic based on active tab
│ [Privacy Tab Description]           │ ← Changes with each tab
├─────────────────────────────────────┤
│ [Overview] [Export] [Delete]...     │ ← Privacy Tab Navigation
├─────────────────────────────────────┤
│                                     │
│  Privacy Tab Content (no title)     │ ← Content only
│                                     │
└─────────────────────────────────────┘
        ↓ (24px spacing)
┌─────────────────────────────────────┐
│ Progression du Tutoriel             │ ← Always visible
│ Suivez votre progression...         │
├─────────────────────────────────────┤
│ [Overview] [Navbar] [Links]...      │ ← Tutorial Tab Navigation
├─────────────────────────────────────┤
│                                     │
│  Tutorial Tab Content               │
│                                     │
└─────────────────────────────────────┘
        ↓ (24px spacing)
┌─────────────────────────────────────┐
│ Footer: Your Rights Under GDPR      │
└─────────────────────────────────────┘
```

### Implementation

**Tab Content Mapping:**
```javascript
const tabContent = {
  'overview': {
    titleKey: 'account.overview.title',
    descKey: 'account.overview.welcome',
  },
  'export': {
    titleKey: 'account.export.title',
    descKey: 'account.export.description',
  },
  // ... for all 7 tabs
};
```

**Dynamic Title Section:**
```jsx
<div className="px-6 pt-6">
  <h2 className="text-2xl font-bold text-gray-900">
    {t(tabContent[activeTab]?.titleKey)}
  </h2>
  <p className="text-sm text-gray-600 mt-1">
    {t(tabContent[activeTab]?.descKey)}
  </p>
</div>
```

### Modified Tab Components

All tab components had their title sections removed to prevent duplication:

1. **OverviewTab.jsx** - Privacy Overview (GDPR cards) - Also removed Tutorial Progression section (moved to page level)
2. **ExportDataTab.jsx** - Data export functionality
3. **DeleteAccountTab.jsx** - Account deletion (preserved pending state title)
4. **ConsentsTab.jsx** - Manage consents
5. **PrivacySettingsTab.jsx** - Privacy settings
6. **ContactDownloadTab.jsx** - Contact download settings
7. **WebsiteConfigTab.jsx** - Website configuration

### Tutorial Progression Section Placement

**Previous Location:** Inside `OverviewTab.jsx` (only visible on Overview tab)

**New Location:** `page.jsx` at page level (always visible)

**Implementation:**
```jsx
{/* Tutorial Progression Section */}
<div className="bg-white shadow-sm rounded-lg p-6 mb-6">
  <TutorialProgressionSection />
</div>
```

This ensures Tutorial Progression is rendered as a separate section between Privacy tabs and Footer, independent of which Privacy tab is active.

## Color Scheme

### Tutorial Progression Colors

**Completed State:**
- Border: `#3AE09A` (themeGreen)
- Background: White
- Icon background: `bg-[#3AE09A]`
- Text: `text-[#3AE09A]`

**Incomplete State:**
- Border: `border-gray-300`
- Background: White
- Icon background: `bg-gray-300`
- Text: `text-gray-400`

**Active Tab:**
- Border bottom: `border-[#8129D9]` (purple)
- Text: `text-[#8129D9]`

### Spacing and Separation

**Between Major Sections:**
- `mt-6` (24px) additional margin
- Combined with `space-y-6` = 48px total separation
- Creates clear visual distinction between GDPR info and Tutorial Progression

**Within Sections:**
- `space-y-6` (24px) between elements
- `gap-6` for grid layouts

## Translation Keys

### Tutorial Tab Labels

**All 5 Languages:** English, French, Spanish, Vietnamese, Chinese

```json
"tutorial": {
  "tabs": {
    "overview": "Overview / Aperçu / Vista General / Tổng Quan / 概览",
    "navbar": "Navbar / Barre de Navigation / Barra de Navegación / Thanh Điều Hướng / 导航栏",
    "links": "Links / Liens / Enlaces / Liên Kết / 链接",
    "appearance": "Appearance / Apparence / Apariencia / Giao Diện / 外观",
    "completion": "Completion / Achèvement / Finalización / Hoàn Thành / 完成"
  }
}
```

### Tutorial Overview Cards

```json
"tutorial": {
  "overview_cards": {
    "navbar": {
      "title": "Getting Started / Premiers Pas / Primeros Pasos / Bắt Đầu / 入门指南",
      "description": "Learn basics of navigation / Apprenez les bases / Aprende los conceptos básicos / Tìm hiểu kiến thức cơ bản / 学习基本导航",
      "cta": "Start Learning / Commencer / Comenzar a Aprender / Bắt Đầu Học / 开始学习"
    },
    // ... similar for links, appearance, completion
  }
}
```

### Account Tab Titles

Added translation keys for previously hardcoded titles:

```json
"account": {
  "consents": {
    "title": "Manage Consents / Gérer les Consentements / ...",
    "description": "Control which features... / Contrôlez quelles fonctionnalités..."
  },
  "contact_download": {
    "title": "Contact Download Settings / Paramètres de Téléchargement / ...",
    "description": "Control who can download... / Contrôlez qui peut télécharger..."
  }
}
```

## Component Relationships

### TutorialProgressionSection
```
TutorialProgressionSection
├── TutorialTabProvider (context)
└── TutorialProgressionContent
    ├── Header (title + description)
    ├── Tab Navigation (7 tabs)
    └── Tab Content
        ├── OverviewTab (category cards)
        ├── NavbarTab (steps 0-1)
        ├── LinksTab (steps 2-3)
        ├── AppearanceTab (step 4)
        ├── CompletionTab (step 5)
        └── ComingSoonTab (3 tabs)
```

### Account Page
```
AccountPage
├── AccountProvider (context)
├── Header (Account & Privacy)
├── Pending Deletion Warning (conditional)
├── Privacy Section (white card)
│   ├── Dynamic Title Section
│   ├── Tab Navigation (7 tabs)
│   └── Tab Content (titles removed)
├── Tutorial Progression Section (white card - ALWAYS VISIBLE)
│   └── TutorialProgressionSection
└── Footer (GDPR Rights)
```

**Key Change:** Tutorial Progression is now a sibling to Privacy Section, not a child of OverviewTab.

## User Experience Benefits

1. **Consistent Visual Hierarchy** - Titles always appear in the same location
2. **Better Information Architecture** - Clear separation between navigation and content
3. **Progressive Disclosure** - Overview tab provides high-level view, detail tabs provide depth
4. **Reduced Cognitive Load** - Titles don't jump around when switching tabs
5. **Improved Scannability** - Users can quickly understand what each tab contains
6. **Complete Independence** - Tutorial Progression always visible regardless of active Privacy tab
7. **Persistent Reference** - Users can reference tutorial while exploring Privacy settings
8. **Multilingual Support** - All text properly internationalized across 5 languages

## Implementation Files

### Created Files
- `tutorial-tabs/NavbarTab.jsx`
- `tutorial-tabs/CompletionTab.jsx`
- `tutorial-tabs/OverviewTab.jsx` (transformed)

### Modified Files
- `TutorialProgressionSection.jsx` - Added navbar/completion tabs
- `page.jsx` - Added dynamic title section + Tutorial Progression at page level
- `OverviewTab.jsx` (account) - Removed title section + removed Tutorial Progression (moved to page level)
- `ExportDataTab.jsx` - Removed title section
- `DeleteAccountTab.jsx` - Removed title section
- `ConsentsTab.jsx` - Removed title section
- `PrivacySettingsTab.jsx` - Removed title section
- `ContactDownloadTab.jsx` - Removed title section
- `WebsiteConfigTab.jsx` - Removed title section

### Translation Files (All 5 Languages)
- `/public/locales/en/common.json`
- `/public/locales/fr/common.json`
- `/public/locales/es/common.json`
- `/public/locales/vm/common.json`
- `/public/locales/ch/common.json`

## Maintenance Notes

### Adding New Tutorial Steps

1. Add step to appropriate tab component
2. Update `TUTORIAL_STEP_IDS` if needed
3. Add translation keys for step title/description
4. Update overview card progress calculation

### Adding New Account Tabs

1. Add tab to `tabs` array in `page.jsx`
2. Add entry to `tabContent` mapping
3. Create tab component without title section
4. Add translation keys for title/description
5. Import and route component in page.jsx

### Updating Translations

All tutorial and account page text uses i18n keys. Update in `/public/locales/{lang}/common.json`:
- `tutorial.*` - Tutorial-related text
- `account.*` - Account page text

## Testing

### Manual Test Checklist

**Tutorial Progression:**
- [ ] Overview tab shows 4 category cards
- [ ] Progress tracker shows correct completion (X/6)
- [ ] Category cards navigate to correct tabs
- [ ] Step cards show correct completed/incomplete states
- [ ] Jump to Step buttons work for all steps
- [ ] Coming Soon tabs display placeholder content

**Account Page:**
- [ ] Title changes when switching tabs
- [ ] Description changes when switching tabs
- [ ] No duplicate titles appear in content
- [ ] All 7 tabs display correctly
- [ ] Tutorial Progression section visible on ALL Privacy tabs (Overview, Export, Delete, Consents, Settings, Contact Download, Website Config)
- [ ] Tutorial Progression maintains its own tab state independently from Privacy tabs
- [ ] Translations work in all 5 languages

## Future Enhancements

### Planned Features
1. **Tutorial Completion Rewards** - Badge or achievement for completing all steps
2. **Tutorial Analytics** - Track which steps users complete/skip
3. **Contextual Hints** - Show tutorial steps contextually when user visits features
4. **Tutorial Reset** - Allow users to restart tutorial
5. **Additional Tabs** - Complete Statistics, Contacts, Settings tutorials

### Performance Optimizations
1. Lazy load tab components
2. Cache tutorial progress in local storage
3. Optimize Firestore reads with batching

---

**Related Documentation:**
- Account & Privacy Center implementation
- i18n translation system
- Tutorial Context API usage
- Firebase Firestore integration
