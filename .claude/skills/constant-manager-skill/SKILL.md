---
name: constant-manager
description: Professional constant management system for Weavink. Manages constants using barrel export pattern, validates consistency, refactors magic strings, and maintains constant index. Use when adding constants, checking for magic strings, validating subscription limits, or before modifying features. Integrates with docs-manager, test-manager, and git-manager.
allowed-tools: Read, Write, Glob, Grep, Bash
---

# Constant Manager

Professional constant management system for Weavink with barrel export pattern, validation, and consistency checking.

## Core Capabilities

1. **Create Constants** - Add new constants with proper placement and naming
2. **Search & Discover** - Find constants, their usage, and dependencies
3. **Validate Consistency** - Check subscription limits, permissions, naming conventions
4. **Refactor Magic Strings** - Replace hardcoded strings with constants
5. **Analyze Dependencies** - Map constant relationships and detect circular dependencies
6. **Track Usage** - Maintain constants-index.json with metadata and violations
7. **Enforce Patterns** - Ensure barrel imports, proper naming, and architecture compliance

## Constant Structure

### Architecture: Three-Tier System

```
Application Code (app/, components/)
         ↓
Barrel File (constants.js) ← Single import point
         ↓
Core Constants + Domain Constants
```

**The Rule:** All code MUST import from the barrel file, NEVER directly from domain files.

### File Locations

**Barrel File:**
- `lib/services/constants.js` - Single import point for all constants

**Core Constants:**
- `lib/services/core/constants.js` - Shared cross-domain constants

**Domain Constants:**
- `lib/services/serviceContact/client/constants/contactConstants.js` - Contact features/limits
- `lib/services/serviceAppearance/constants/appearanceConstants.js` - Appearance features/limits
- `lib/services/serviceAnalytics/constants/analyticsConstants.js` - Analytics constants
- `lib/services/serviceUser/constants/analyticsConstants.js` - User analytics tracking
- `lib/services/serviceEnterprise/constants/enterpriseConstants.js` - Team permissions
- `lib/services/serviceEnterprise/constants/organizationConstants.js` - Organization settings
- `lib/services/serviceAdmin/constants/adminConstants.js` - Admin features/limits

**Constant Index:**
- `.claude/skills/constant-manager-skill/constants-index.json` - Metadata and tracking

### Current Constants (Weavink)

**Core Constants (lib/services/core/constants.js):**
- `SUBSCRIPTION_LEVELS` - base, pro, premium, business, enterprise
- `ORGANIZATION_ROLES` - owner, admin, member, billing
- `TEAM_ROLES` - manager, employee, contractor, intern, view_only
- `TEAM_ROLE_HIERARCHY` - Role permission levels
- `INVITATION_STATUS` - pending, accepted, expired
- Billing limits and cost budgets

**Domain Constants:**
- Contact: 20+ features, limits per subscription, semantic search config
- Appearance: 10+ features, UI customization limits
- Analytics: Tracking events, AI provider pricing
- Enterprise: 13 permissions, role-based defaults
- Admin: 30+ features, security configurations

## Confirmation Protocol

**CRITICAL: ALWAYS ASK BEFORE MODIFYING CONSTANTS OR CODE**

Before creating, updating, or refactoring constants:
1. ✅ Show what will be changed
2. ✅ Show where changes will occur (which files)
3. ✅ Show impact (what code uses these constants)
4. ✅ Ask for explicit confirmation
5. ✅ Wait for user approval

**Safe to do without asking:**
- Searching for constants
- Analyzing usage
- Validating consistency (read-only)
- Generating reports

## Workflow Instructions

### 1. Creating New Constant

**Triggers:**
- "Add a new constant for..."
- "Create a feature flag for..."
- "Define a new subscription level"

**Process:**

1. **Determine Constant Location**

   Use this decision tree:

   ```
   Is it used by 3+ domains?
   ├─ YES → Core constants (lib/services/core/constants.js)
   └─ NO → Is it a fundamental concept (role, level, status)?
          ├─ YES → Core constants
          └─ NO → Domain constants (lib/services/service{Domain}/constants/)
   ```

   **Examples:**
   - `SUBSCRIPTION_LEVELS` → Core (used by all domains)
   - `TEAM_ROLES` → Core (fundamental concept)
   - `CONTACT_FEATURES` → Domain (contact-specific)
   - `APPEARANCE_LIMITS` → Domain (appearance-specific)

2. **Check for Duplicates**
   ```bash
   # Search constants-index.json
   grep -i "CONSTANT_NAME" .claude/skills/constant-manager-skill/constants-index.json

   # Search actual files
   grep -r "CONSTANT_NAME" lib/services/core/constants.js lib/services/service*/constants/
   ```

3. **Validate Naming Convention**
   - ✅ SCREAMING_SNAKE_CASE for constants
   - ✅ Descriptive name (not `TEMP_THING`)
   - ✅ Consistent with existing patterns
   - ❌ No camelCase, PascalCase, or kebab-case

4. **ASK FOR CONFIRMATION**
   ```
   📝 Ready to create new constant

   Constant Details:
   - Name: CONSTANT_NAME
   - Location: lib/services/core/constants.js
   - Type: enum|feature|limit|config
   - Value: { ... }

   This will:
   - Add to core/constants.js
   - Update barrel file (if needed)
   - Update constants-index.json

   Proceed? [Y/n]
   ```

5. **Create Constant** (only after confirmation)

   Add to appropriate file with JSDoc:
   ```javascript
   /**
    * Description of what this constant represents
    * @type {Object}
    */
   export const CONSTANT_NAME = {
     VALUE_1: 'value_1',
     VALUE_2: 'value_2'
   };
   ```

6. **Update Barrel File** (if new domain)

   Add export to `lib/services/constants.js`:
   ```javascript
   // Core constants (foundation)
   export * from './core/constants.js';

   // Domain constants
   export * from './serviceContact/client/constants/contactConstants.js';
   export * from './serviceNewDomain/constants/newDomainConstants.js'; // ← Add here
   ```

7. **Update Constants Index**

   Add entry to `constants-index.json`:
   ```json
   {
     "id": "CONSTANT_NAME",
     "file": "lib/services/core/constants.js",
     "type": "enum",
     "category": "core",
     "values": ["value_1", "value_2"],
     "usedBy": [],
     "importCount": 0,
     "description": "Constant description",
     "created": "2025-11-14"
   }
   ```

8. **Report Completion**
   ```
   ✅ Created constant: CONSTANT_NAME

   Location: lib/services/core/constants.js
   Exported from: lib/services/constants.js

   Usage:
   import { CONSTANT_NAME } from '@/lib/services/constants';

   Next steps:
   1. Use the constant in your code
   2. Update tests to cover the constant
   3. Document if needed (use docs-manager)
   ```

### 2. Adding New Subscription Level

**Trigger:** "Add a new subscription tier called 'platinum'"

**Process:**

1. **Update Core Constants**
   ```javascript
   // lib/services/core/constants.js
   export const SUBSCRIPTION_LEVELS = {
     BASE: 'base',
     PRO: 'pro',
     PREMIUM: 'premium',
     BUSINESS: 'business',
     ENTERPRISE: 'enterprise',
     PLATINUM: 'platinum'  // ← Add here
   };
   ```

2. **Find All Domain LIMITS Objects**
   ```bash
   grep -r "SUBSCRIPTION_LEVELS\." lib/services/service*/constants/ -A 10 | grep -E "(CONTACT_LIMITS|APPEARANCE_LIMITS|ADMIN_LIMITS)"
   ```

3. **For Each Domain, Add Limits**

   Example for Contact domain:
   ```javascript
   // lib/services/serviceContact/client/constants/contactConstants.js
   export const CONTACT_LIMITS = {
     [SUBSCRIPTION_LEVELS.BASE]: {
       maxContacts: 0,
       maxGroups: 0,
       features: []
     },
     // ... other levels ...
     [SUBSCRIPTION_LEVELS.PLATINUM]: {  // ← Add complete limits
       maxContacts: 50000,
       maxGroups: 200,
       features: [
         CONTACT_FEATURES.BASIC_CONTACTS,
         CONTACT_FEATURES.AI_ENHANCED_CARD_SCANNER,
         CONTACT_FEATURES.SEMANTIC_SEARCH,
         // ... all platinum features
       ]
     }
   };
   ```

4. **ASK FOR CONFIRMATION**
   ```
   📝 Adding new subscription level: PLATINUM

   Will update 7 domain constant files:
   - contactConstants.js - Add PLATINUM limits
   - appearanceConstants.js - Add PLATINUM limits
   - analyticsConstants.js - Add PLATINUM limits
   - enterpriseConstants.js - Add PLATINUM permissions
   - organizationConstants.js - Add PLATINUM settings
   - adminConstants.js - Add PLATINUM features

   Proceed with updating all domain limits? [Y/n]
   ```

5. **Validate Completeness**
   ```bash
   # After adding, verify all domains have the new level
   grep -r "PLATINUM" lib/services/service*/constants/ --include="*Constants.js"
   ```

6. **Update Index and Report**
   ```
   ✅ Added subscription level: PLATINUM

   Updated files (7):
   - core/constants.js ✅
   - contactConstants.js ✅
   - appearanceConstants.js ✅
   - analyticsConstants.js ✅
   - enterpriseConstants.js ✅
   - organizationConstants.js ✅
   - adminConstants.js ✅

   Validation: All 7 domains have complete limits ✅

   Next steps:
   1. Update pricing in database
   2. Update UI to show platinum tier
   3. Add platinum-specific features
   4. Update tests (use test-manager)
   5. Document new tier (use docs-manager)
   ```

### 3. Searching for Constants

**Triggers:**
- "Find constants related to..."
- "Where is X constant defined?"
- "What constants are used in this file?"

**Process:**

1. **Read Constants Index**
   ```bash
   cat .claude/skills/constant-manager-skill/constants-index.json
   ```

2. **Search Strategy**

   Search in order:
   - Exact constant name match
   - Partial name match
   - Category match
   - File location match
   - Description/tags match

3. **Show Results**
   ```
   🔍 Search Results for "subscription"

   Found 3 constants:

   1. SUBSCRIPTION_LEVELS
      Location: lib/services/core/constants.js:15
      Type: enum
      Values: base, pro, premium, business, enterprise
      Used by: 21 files
      Imports: 25 occurrences

   2. SUBSCRIPTION_FEATURE_MAP
      Location: lib/services/serviceContact/client/constants/contactConstants.js:45
      Type: feature map
      Used by: 8 files
      Related: CONTACT_FEATURES, CONTACT_LIMITS

   3. MAX_BILLABLE_RUNS_PER_SUBSCRIPTION
      Location: lib/services/core/constants.js:78
      Type: limit
      Status: ⚠️ deprecated
      Replaced by: MAX_BILLABLE_RUNS_API_PER_MONTH
   ```

4. **Analyze Usage** (if requested)
   ```bash
   # Find all imports
   grep -r "SUBSCRIPTION_LEVELS" app/ lib/ --include="*.js" --include="*.jsx" | wc -l

   # Find magic strings that should use this constant
   grep -r "'pro'" app/ lib/ --include="*.js" --include="*.jsx"
   grep -r "'premium'" app/ lib/ --include="*.js" --include="*.jsx"
   ```

5. **Report Dependencies**
   ```
   📊 SUBSCRIPTION_LEVELS Usage Analysis

   Import Count: 25 files
   Direct Usage: 45 occurrences

   Magic Strings Found: 8 occurrences (should be refactored)
   - app/components/VideoEmbedItem.jsx:42 - 'pro'
   - app/components/CarouselItem.jsx:28 - 'premium'
   - app/(dashboard)/contacts/page.jsx:156 - 'base'
   [... more ...]

   Dependencies:
   - CONTACT_LIMITS uses SUBSCRIPTION_LEVELS
   - APPEARANCE_LIMITS uses SUBSCRIPTION_LEVELS
   - session.js uses SUBSCRIPTION_LEVELS

   Recommendation: Refactor 8 magic strings to use constant
   ```

### 4. Validating Constants

**Triggers:**
- "Validate constants consistency"
- "Check if all subscription levels have limits"
- "Find constant violations"

**Process:**

1. **Validate Subscription Level Completeness**
   ```javascript
   // For each domain LIMITS object, check all subscription levels exist
   const requiredLevels = Object.values(SUBSCRIPTION_LEVELS);

   // Check CONTACT_LIMITS
   const contactLevels = Object.keys(CONTACT_LIMITS);
   const missingInContact = requiredLevels.filter(level => !contactLevels.includes(level));

   // Repeat for all domains
   ```

2. **Validate Role Permissions Completeness**
   ```javascript
   // Check all roles have complete permissions
   const allRoles = Object.values(TEAM_ROLES);
   const allPermissions = Object.values(PERMISSIONS);

   // Verify each role has all permissions defined
   ```

3. **Check Naming Conventions**
   ```bash
   # Find constants not using SCREAMING_SNAKE_CASE
   grep -E "export const [a-z][A-Za-z]+" lib/services/core/constants.js
   ```

4. **Find Direct Import Violations**
   ```bash
   # Find imports bypassing barrel file
   grep -r "from.*serviceContact.*constants" app/ lib/ --include="*.js" | grep -v "from '@/lib/services/constants'"
   grep -r "from.*serviceAppearance.*constants" app/ lib/ --include="*.js" | grep -v "from '@/lib/services/constants'"
   ```

5. **Find Magic Strings**
   ```bash
   # Subscription levels
   grep -r "'base'" app/ lib/ --include="*.js" --include="*.jsx" | grep -v "database"
   grep -r "'pro'" app/ lib/ --include="*.js" --include="*.jsx"
   grep -r "'premium'" app/ lib/ --include="*.js" --include="*.jsx"
   grep -r "'business'" app/ lib/ --include="*.js" --include="*.jsx"
   grep -r "'enterprise'" app/ lib/ --include="*.js" --include="*.jsx"

   # Role names
   grep -r "'manager'" app/ lib/ --include="*.js" --include="*.jsx"
   grep -r "'employee'" app/ lib/ --include="*.js" --include="*.jsx"
   ```

6. **Generate Validation Report**
   ```
   📋 Constants Validation Report
   Generated: 2025-11-14

   ✅ PASSING CHECKS (5):
   - All subscription levels have limits in core domains ✅
   - All team roles have complete permissions ✅
   - Naming conventions followed ✅
   - No circular dependencies ✅
   - Barrel file exports all domains ✅

   ⚠️ WARNINGS (2):
   - 3 files use direct imports (bypassing barrel)
     → app/api/user/contacts/semantic-search/route.js:5
     → app/api/user/contacts/rerank/route.js:8
     → app/api/user/contacts/ai-enhance-results/route.js:6

   - 1 deprecated constant still in use
     → MAX_BILLABLE_RUNS_PER_MONTH (use MAX_BILLABLE_RUNS_API_PER_MONTH)

   ❌ ISSUES (1):
   - 8 files contain magic strings that should use constants:
     → app/components/VideoEmbedItem.jsx:42 - 'pro'
     → app/components/CarouselItem.jsx:28 - 'premium'
     → app/(dashboard)/contacts/page.jsx:156 - 'base'
     [... 5 more ...]

   Recommendations:
   1. Fix direct imports to use barrel pattern (Priority: High)
   2. Refactor magic strings to use constants (Priority: High)
   3. Remove deprecated constant usage (Priority: Medium)

   Would you like me to fix these issues? [Y/n]
   ```

### 5. Refactoring Magic Strings

**Trigger:** "Replace magic strings with constants"

**Process:**

1. **Scan for Magic Strings**
   ```bash
   # Subscription levels
   grep -rn "'pro'" app/ lib/ --include="*.js" --include="*.jsx" > magic-strings-pro.txt
   grep -rn "'premium'" app/ lib/ --include="*.js" --include="*.jsx" > magic-strings-premium.txt
   grep -rn "'base'" app/ lib/ --include="*.js" --include="*.jsx" | grep -v "database" > magic-strings-base.txt
   ```

2. **Categorize Findings**
   ```
   Found 8 magic strings to refactor:

   Subscription Levels (6):
   - app/components/VideoEmbedItem.jsx:42
   - app/components/CarouselItem.jsx:28
   - app/(dashboard)/contacts/page.jsx:156
   - app/components/MediaManager.jsx:89
   - app/components/ManageLinks.jsx:134
   - app/(dashboard)/manage/page.jsx:67

   Role Names (2):
   - app/(dashboard)/team/TeamMemberRow.jsx:45
   - lib/utils/permissionHelper.js:23
   ```

3. **ASK FOR CONFIRMATION**
   ```
   📝 Ready to refactor magic strings

   Will update 8 files:

   1. app/components/VideoEmbedItem.jsx
      Line 42: 'pro' → SUBSCRIPTION_LEVELS.PRO
      Will add import: import { SUBSCRIPTION_LEVELS } from '@/lib/services/constants';

   2. app/components/CarouselItem.jsx
      Line 28: 'premium' → SUBSCRIPTION_LEVELS.PREMIUM
      Will add import: import { SUBSCRIPTION_LEVELS } from '@/lib/services/constants';

   [... show all 8 files ...]

   This will:
   - Replace 8 magic strings
   - Add 6 import statements
   - Update constants-index.json

   Proceed? [Y/n]
   ```

4. **Refactor Each File** (only after confirmation)

   For each file:
   ```javascript
   // Before:
   if (user.subscriptionLevel === 'pro') {
     // ...
   }

   // After:
   import { SUBSCRIPTION_LEVELS } from '@/lib/services/constants';

   if (user.subscriptionLevel === SUBSCRIPTION_LEVELS.PRO) {
     // ...
   }
   ```

5. **Verify Refactoring**
   ```bash
   # Check that magic strings are gone
   grep -r "'pro'" app/components/VideoEmbedItem.jsx

   # Check that import was added
   grep "SUBSCRIPTION_LEVELS" app/components/VideoEmbedItem.jsx
   ```

6. **Update Index**

   Update `importCount` and `usedBy` in constants-index.json

7. **Report Completion**
   ```
   ✅ Refactored 8 magic strings

   Files Updated:
   - app/components/VideoEmbedItem.jsx ✅
   - app/components/CarouselItem.jsx ✅
   - app/(dashboard)/contacts/page.jsx ✅
   - app/components/MediaManager.jsx ✅
   - app/components/ManageLinks.jsx ✅
   - app/(dashboard)/manage/page.jsx ✅
   - app/(dashboard)/team/TeamMemberRow.jsx ✅
   - lib/utils/permissionHelper.js ✅

   Changes:
   - Magic strings replaced: 8
   - Imports added: 6
   - Constants used: SUBSCRIPTION_LEVELS (6), TEAM_ROLES (2)

   Next steps:
   1. Run build to verify no errors: npm run build
   2. Run tests: npm test
   3. Commit changes (use git-manager)
   ```

### 6. Fixing Direct Import Violations

**Trigger:** "Fix direct imports to use barrel pattern"

**Process:**

1. **Find Direct Imports**
   ```bash
   # Find all imports bypassing barrel
   grep -rn "from.*service[A-Z].*constants" app/ lib/ --include="*.js" | grep -v "from '@/lib/services/constants'"
   ```

2. **Categorize Violations**
   ```
   Found 3 direct import violations:

   1. app/api/user/contacts/semantic-search/route.js:5
      import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';

   2. app/api/user/contacts/rerank/route.js:8
      import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';

   3. app/api/user/contacts/ai-enhance-results/route.js:6
      import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';
   ```

3. **Verify Barrel Exports**
   ```bash
   # Check that constant is exported from barrel
   grep "SEMANTIC_SEARCH_CONFIG" lib/services/constants.js
   grep "export.*from.*contactConstants" lib/services/constants.js
   ```

4. **ASK FOR CONFIRMATION**
   ```
   📝 Fix direct import violations

   Will update 3 files to use barrel import:

   Before:
   import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';

   After:
   import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/constants';

   Files to update:
   - app/api/user/contacts/semantic-search/route.js
   - app/api/user/contacts/rerank/route.js
   - app/api/user/contacts/ai-enhance-results/route.js

   Proceed? [Y/n]
   ```

5. **Fix Imports** (only after confirmation)

   For each file, replace the import statement:
   ```javascript
   // Use Edit tool to replace
   old: import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/serviceContact/client/constants/contactConstants';
   new: import { SEMANTIC_SEARCH_CONFIG } from '@/lib/services/constants';
   ```

6. **Verify Fix**
   ```bash
   # Check no more direct imports
   grep -r "from.*serviceContact.*constants" app/api/user/contacts/ --include="*.js" | grep -v "from '@/lib/services/constants'"
   ```

7. **Report Completion**
   ```
   ✅ Fixed 3 direct import violations

   Updated files:
   - app/api/user/contacts/semantic-search/route.js ✅
   - app/api/user/contacts/rerank/route.js ✅
   - app/api/user/contacts/ai-enhance-results/route.js ✅

   All imports now use barrel pattern ✅

   Validation: No direct imports remaining ✅

   Next steps:
   1. Test that imports work: npm run build
   2. Run affected API endpoints to verify
   3. Commit changes (use git-manager)
   ```

### 7. Analyzing Constant Dependencies

**Trigger:** "Show dependencies for SUBSCRIPTION_LEVELS"

**Process:**

1. **Find Constant Definition**
   ```bash
   grep -n "export const SUBSCRIPTION_LEVELS" lib/services/core/constants.js
   ```

2. **Find Direct Usage**
   ```bash
   # Where is it imported?
   grep -r "SUBSCRIPTION_LEVELS" lib/services/ --include="*.js" | grep import

   # Where is it used in code?
   grep -r "SUBSCRIPTION_LEVELS\." lib/services/ --include="*.js"
   ```

3. **Map Dependencies**
   ```javascript
   // Constants that depend on SUBSCRIPTION_LEVELS:
   - CONTACT_LIMITS (uses as keys)
   - APPEARANCE_LIMITS (uses as keys)
   - ANALYTICS_LIMITS (uses as keys)
   - ADMIN_LIMITS (uses as keys)
   - ENTERPRISE_LIMITS (uses as keys)

   // Files that import SUBSCRIPTION_LEVELS:
   - lib/server/session.js
   - lib/services/serviceContact/client/constants/contactConstants.js
   - lib/services/serviceAppearance/constants/appearanceConstants.js
   [... 18 more ...]
   ```

4. **Generate Dependency Graph**
   ```
   📊 Dependency Graph: SUBSCRIPTION_LEVELS

   SUBSCRIPTION_LEVELS (core/constants.js)
     ├─→ CONTACT_LIMITS (contactConstants.js) - uses as keys
     ├─→ APPEARANCE_LIMITS (appearanceConstants.js) - uses as keys
     ├─→ ANALYTICS_LIMITS (analyticsConstants.js) - uses as keys
     ├─→ ADMIN_LIMITS (adminConstants.js) - uses as keys
     ├─→ ENTERPRISE_LIMITS (enterpriseConstants.js) - uses as keys
     │
     ├─→ session.js - permission calculation
     ├─→ subscriptionService.js - tier management
     │
     └─→ 25 total imports across codebase

   Impact of changes:
   - Adding new level: Must update 5 domain LIMITS objects
   - Renaming level: Must update 45+ occurrences
   - Removing level: Must refactor 8+ features

   Recommendation: Changes to this constant have HIGH impact
   ```

5. **Check for Circular Dependencies**
   ```bash
   # Verify no circular imports
   # Core should not import from domain
   # Domain should not import from other domains
   grep "from.*serviceContact" lib/services/core/constants.js
   grep "from.*serviceAppearance" lib/services/serviceContact/client/constants/contactConstants.js
   ```

6. **Report**
   ```
   ✅ No circular dependencies detected

   Dependency Flow:
   Domain files → Core constants ✅ (correct)
   Core constants → Domain files ❌ (not found) ✅
   Domain → Domain imports ❌ (not found) ✅

   Architecture is clean ✅
   ```

### 8. Before Modifying Features

**Trigger:** User wants to add/modify a feature

**Automatic Process:**

1. **Extract Feature Keywords**
   From user request: "I want to add semantic search to premium tier"
   Keywords: semantic search, premium, tier

2. **Search for Related Constants**
   ```bash
   # Search index for keywords
   grep -i "semantic" .claude/skills/constant-manager-skill/constants-index.json
   grep -i "search" .claude/skills/constant-manager-skill/constants-index.json
   ```

3. **Present Findings**
   ```
   📚 Found related constants:

   1. CONTACT_FEATURES.SEMANTIC_SEARCH
      Location: lib/services/serviceContact/client/constants/contactConstants.js:78
      Description: Semantic search feature flag
      Currently available in: PREMIUM, BUSINESS, ENTERPRISE

   2. SEMANTIC_SEARCH_CONFIG
      Location: lib/services/serviceContact/client/constants/contactConstants.js:145
      Description: Configuration for semantic search (vector DB, reranking)

   3. CONTACT_LIMITS[SUBSCRIPTION_LEVELS.PREMIUM]
      Includes: CONTACT_FEATURES.SEMANTIC_SEARCH

   ⚠️ Note: Semantic search is already available in PREMIUM tier

   Did you mean to:
   1. Add to a different tier?
   2. Modify the semantic search feature?
   3. Configure semantic search differently?

   Please clarify what you'd like to do.
   ```

4. **Offer Guidance**
   ```
   💡 To modify semantic search feature:

   1. Feature flag: CONTACT_FEATURES.SEMANTIC_SEARCH
   2. Limits/availability: CONTACT_LIMITS[tier].features
   3. Configuration: SEMANTIC_SEARCH_CONFIG

   Current configuration:
   - Vector DB: Pinecone, dimension 1536
   - Reranking: Gemini 2.0 Flash Lite, topK 5
   - Embedding model: text-embedding-3-small

   What would you like to change?
   ```

## Constant Patterns

### Pattern 1: Simple Enum

```javascript
/**
 * Available subscription tiers
 * @type {Object}
 */
export const SUBSCRIPTION_LEVELS = {
  BASE: 'base',
  PRO: 'pro',
  PREMIUM: 'premium',
  BUSINESS: 'business',
  ENTERPRISE: 'enterprise'
};
```

**Usage:** Status values, role names, tier names

### Pattern 2: Feature Flags

```javascript
/**
 * Contact management features
 * @type {Object}
 */
export const CONTACT_FEATURES = {
  BASIC_CONTACTS: 'basic_contacts',
  AI_ENHANCED_CARD_SCANNER: 'ai_enhanced_card_scanner',
  SEMANTIC_SEARCH: 'semantic_search',
  ADVANCED_FILTERS: 'advanced_filters',
  GROUP_MANAGEMENT: 'group_management',
  // ... 20+ features
};
```

**Usage:** Feature availability flags

### Pattern 3: Subscription Limits Map

```javascript
/**
 * Contact limits per subscription level
 * @type {Object}
 */
export const CONTACT_LIMITS = {
  [SUBSCRIPTION_LEVELS.BASE]: {
    maxContacts: 0,
    maxGroups: 0,
    features: []
  },
  [SUBSCRIPTION_LEVELS.PRO]: {
    maxContacts: 2000,
    maxGroups: 10,
    features: [
      CONTACT_FEATURES.BASIC_CONTACTS,
      CONTACT_FEATURES.GROUP_MANAGEMENT
    ]
  },
  [SUBSCRIPTION_LEVELS.PREMIUM]: {
    maxContacts: 10000,
    maxGroups: 50,
    features: [
      CONTACT_FEATURES.BASIC_CONTACTS,
      CONTACT_FEATURES.GROUP_MANAGEMENT,
      CONTACT_FEATURES.SEMANTIC_SEARCH,
      CONTACT_FEATURES.AI_ENHANCED_CARD_SCANNER
    ]
  }
  // ... all 5 subscription levels
};
```

**Usage:** Maps subscription levels to limits and features

**CRITICAL RULE:** ALL subscription levels MUST have complete limits

### Pattern 4: Role-Based Permissions Map

```javascript
/**
 * Default permissions by team role
 * @type {Object}
 */
export const DEFAULT_PERMISSIONS_BY_ROLE = {
  [TEAM_ROLES.MANAGER]: {
    [PERMISSIONS.CAN_VIEW_ALL_TEAM_CONTACTS]: true,
    [PERMISSIONS.CAN_EDIT_ALL_TEAM_CONTACTS]: true,
    [PERMISSIONS.CAN_DELETE_TEAM_CONTACTS]: true,
    [PERMISSIONS.CAN_EXPORT_TEAM_DATA]: true,
    [PERMISSIONS.CAN_MANAGE_TEAM_MEMBERS]: true,
    // ... 13 permissions
  },
  [TEAM_ROLES.EMPLOYEE]: {
    [PERMISSIONS.CAN_VIEW_ALL_TEAM_CONTACTS]: true,
    [PERMISSIONS.CAN_EDIT_ALL_TEAM_CONTACTS]: false,
    [PERMISSIONS.CAN_DELETE_TEAM_CONTACTS]: false,
    // ... 13 permissions
  }
  // ... all 5 roles
};
```

**Usage:** Default permissions per role

**CRITICAL RULE:** ALL roles MUST have ALL permissions defined

### Pattern 5: Configuration Objects

```javascript
/**
 * Semantic search configuration
 * @type {Object}
 */
export const SEMANTIC_SEARCH_CONFIG = {
  vectorDb: {
    provider: 'pinecone',
    indexName: 'contacts',
    dimension: 1536,
    metric: 'cosine'
  },
  embedding: {
    model: 'text-embedding-3-small',
    batchSize: 100
  },
  reranking: {
    enabled: true,
    model: 'gemini-2.0-flash-lite',
    topK: 5,
    temperature: 0.0
  }
};
```

**Usage:** Complex configuration with nested structures

### Pattern 6: Helper Functions

```javascript
/**
 * Check if subscription level has a specific appearance feature
 * @param {string} subscriptionLevel
 * @param {string} feature
 * @returns {boolean}
 */
export function hasAppearanceFeature(subscriptionLevel, feature) {
  const level = subscriptionLevel?.toLowerCase() || 'base';
  const config = APPEARANCE_LIMITS[level];
  return config?.features?.includes(feature) || false;
}
```

**Usage:** Utility functions for constant lookups

### Pattern 7: Pricing Constants

```javascript
/**
 * AI provider pricing information for admin dashboard
 * @type {Object}
 */
export const AI_PROVIDER_PRICING = {
  'gemini-2.5-flash-lite': {
    displayName: 'Gemini 2.5 Flash Lite',
    inputCostPerMillionTokens: 0.10,
    outputCostPerMillionTokens: 0.40,
    estimatedCostPerOperation: 0.00013,
    freeTier: {
      enabled: true,
      limit: 500,
      resetPeriod: 'monthly'
    }
  }
};
```

**Usage:** Pricing/cost information for admin features

## Integration Points

### With docs-manager

**Before Creating Constant:**
1. Search for existing documentation about the feature
2. Check if constant should be documented

**After Creating Constant:**
```javascript
{
  source: "constant-manager",
  action: "document_new_constant",
  constant: {
    name: "CONSTANT_NAME",
    file: "lib/services/core/constants.js",
    description: "What this constant represents"
  },
  request: "Document this constant in the appropriate guide"
}
```

**After Adding Subscription Level:**
```javascript
{
  source: "constant-manager",
  action: "update_subscription_docs",
  level: "PLATINUM",
  updates: [
    "Updated SUBSCRIPTION_TIERS_GUIDE.md",
    "Updated CONTACT_FEATURES_GUIDE.md",
    "Updated APPEARANCE_FEATURES_GUIDE.md"
  ],
  request: "Update subscription tier documentation with PLATINUM"
}
```

### With test-manager

**After Creating Constant:**
```javascript
{
  source: "constant-manager",
  action: "request_validation_tests",
  constant: "SUBSCRIPTION_LEVELS",
  tests_needed: [
    "Test all subscription levels have limits",
    "Test session permission calculation",
    "Test feature availability per tier"
  ],
  request: "Create validation tests for constant usage"
}
```

**After Refactoring:**
```javascript
{
  source: "constant-manager",
  action: "run_tests_after_refactor",
  files_changed: [
    "app/components/VideoEmbedItem.jsx",
    "app/components/CarouselItem.jsx"
  ],
  request: "Run tests to verify magic string refactoring didn't break anything"
}
```

### With git-manager

**After Constant Changes:**
```javascript
{
  source: "constant-manager",
  action: "commit_constant_changes",
  changes: {
    created: ["NEW_CONSTANT"],
    updated: ["SUBSCRIPTION_LEVELS"],
    files: [
      "lib/services/core/constants.js",
      "lib/services/constants.js",
      "constants-index.json"
    ]
  },
  message: "✨ Add PLATINUM subscription tier with complete limits across 7 domains",
  request: "Commit constant changes with descriptive message"
}
```

**After Refactoring:**
```javascript
{
  source: "constant-manager",
  action: "commit_refactoring",
  refactored: {
    magic_strings: 8,
    files_updated: 8,
    constants_used: ["SUBSCRIPTION_LEVELS", "TEAM_ROLES"]
  },
  message: "♻️ Refactor: Replace 8 magic strings with constants in UI components",
  request: "Commit magic string refactoring"
}
```

## Helper Functions

### Search Constants by Name
```bash
# Search index
jq '.constants[] | select(.id | contains("SUBSCRIPTION"))' .claude/skills/constant-manager-skill/constants-index.json

# Search actual files
grep -r "SUBSCRIPTION" lib/services/core/constants.js lib/services/service*/constants/
```

### Find All Imports of a Constant
```bash
# Find import statements
grep -r "import.*CONSTANT_NAME" app/ lib/ --include="*.js" --include="*.jsx"

# Count occurrences
grep -r "CONSTANT_NAME" app/ lib/ --include="*.js" --include="*.jsx" | wc -l
```

### Validate Subscription Level Completeness
```bash
# Get all subscription levels
grep "SUBSCRIPTION_LEVELS" lib/services/core/constants.js

# For each domain, check all levels exist
grep -A 50 "CONTACT_LIMITS" lib/services/serviceContact/client/constants/contactConstants.js | grep -E "(base|pro|premium|business|enterprise)"
```

### Find Magic Strings
```bash
# Subscription levels
grep -rn "'pro'" app/ lib/ --include="*.js" --include="*.jsx"
grep -rn "'premium'" app/ lib/ --include="*.js" --include="*.jsx"

# Roles
grep -rn "'manager'" app/ lib/ --include="*.js" --include="*.jsx"
grep -rn "'employee'" app/ lib/ --include="*.js" --include="*.jsx"
```

### Generate Constants Report
```bash
# Count total constants
grep -r "export const" lib/services/core/constants.js lib/services/service*/constants/ | wc -l

# List all constant names
grep -r "export const" lib/services/core/constants.js lib/services/service*/constants/ | awk '{print $3}' | sort
```

## Critical Rules

1. **ALWAYS USE BARREL IMPORTS** - All code must import from `@/lib/services/constants`, NEVER directly from domain files
2. **ALWAYS ASK BEFORE MODIFYING** - Get user confirmation before creating, updating, or refactoring constants
3. **ALWAYS VALIDATE COMPLETENESS** - All subscription levels must have limits, all roles must have permissions
4. **ALWAYS USE SCREAMING_SNAKE_CASE** - Constant names must follow naming convention
5. **ALWAYS UPDATE INDEX** - Keep constants-index.json in sync with actual files
6. **NEVER CREATE CIRCULAR DEPENDENCIES** - Core can't import from domain, domain can't import from domain
7. **ALWAYS CHECK FOR DUPLICATES** - Search before creating new constants
8. **ALWAYS UPDATE ALL DOMAINS** - When adding subscription level, update ALL domain limit files
9. **ALWAYS REFACTOR MAGIC STRINGS** - Replace hardcoded values with constants
10. **ALWAYS VERIFY BARREL EXPORTS** - Ensure new constants are exported from barrel file

## Decision Trees

### Where Does This Constant Belong?

```
Is the constant used by 3+ domains?
├─ YES → Core constants (lib/services/core/constants.js)
│
└─ NO → Is it a fundamental concept?
        (subscription level, role, organization role, status, invitation status)
        │
        ├─ YES → Core constants (lib/services/core/constants.js)
        │
        └─ NO → Domain-specific
                │
                ├─ Contact-related → lib/services/serviceContact/client/constants/contactConstants.js
                ├─ Appearance-related → lib/services/serviceAppearance/constants/appearanceConstants.js
                ├─ Analytics-related → lib/services/serviceAnalytics/constants/analyticsConstants.js
                ├─ Enterprise-related → lib/services/serviceEnterprise/constants/enterpriseConstants.js
                ├─ Organization-related → lib/services/serviceEnterprise/constants/organizationConstants.js
                └─ Admin-related → lib/services/serviceAdmin/constants/adminConstants.js
```

**Examples:**
- `SUBSCRIPTION_LEVELS` → Core (used by all domains)
- `TEAM_ROLES` → Core (fundamental concept)
- `CONTACT_FEATURES` → Domain (contact-specific)
- `APPEARANCE_FEATURES` → Domain (appearance-specific)

### What Type of Constant Should I Create?

```
What are you defining?

├─ A set of valid values (status, role, level)
│  → Pattern 1: Simple Enum
│
├─ Available features for a domain
│  → Pattern 2: Feature Flags
│
├─ Limits per subscription level
│  → Pattern 3: Subscription Limits Map
│
├─ Permissions per role
│  → Pattern 4: Role-Based Permissions Map
│
├─ Configuration with nested structure
│  → Pattern 5: Configuration Objects
│
├─ Pricing or cost information
│  → Pattern 7: Pricing Constants
│
└─ Need to check a constant value?
   → Pattern 6: Helper Function
```

## Troubleshooting

### Issue: Import not working

**Symptoms:**
- `Cannot find module '@/lib/services/constants'`
- `CONSTANT_NAME is not exported`

**Solutions:**
1. Check barrel file exports the constant:
   ```bash
   grep "export.*from.*contactConstants" lib/services/constants.js
   ```

2. Check constant exists in domain file:
   ```bash
   grep "export const CONSTANT_NAME" lib/services/serviceContact/client/constants/contactConstants.js
   ```

3. Verify you're using barrel import, not direct:
   ```javascript
   // ✅ Correct
   import { CONSTANT_NAME } from '@/lib/services/constants';

   // ❌ Wrong
   import { CONSTANT_NAME } from '@/lib/services/serviceContact/client/constants/contactConstants';
   ```

4. Restart dev server / TypeScript server

### Issue: Circular dependency detected

**Symptoms:**
- Build error: "Circular dependency detected"
- Import errors at runtime

**Solutions:**
1. Find the cycle:
   ```bash
   # Check if core imports from domain (shouldn't happen)
   grep "from.*service[A-Z]" lib/services/core/constants.js

   # Check if domain imports from other domain (shouldn't happen)
   grep "from.*service[A-Z]" lib/services/serviceContact/client/constants/contactConstants.js | grep -v "from '@/lib/services/constants'"
   ```

2. Move shared constant to core:
   - If two domains need same constant → move to core
   - Update barrel exports
   - Fix imports

3. Verify fix:
   ```bash
   npm run build
   ```

### Issue: Magic strings still in code

**Symptoms:**
- Hardcoded `'pro'`, `'premium'`, etc. in code
- Not using constants

**Solutions:**
1. Find all magic strings:
   ```bash
   grep -rn "'pro'" app/ lib/ --include="*.js" --include="*.jsx"
   ```

2. For each file, replace with constant:
   ```javascript
   // Before
   if (tier === 'pro') {

   // After
   import { SUBSCRIPTION_LEVELS } from '@/lib/services/constants';
   if (tier === SUBSCRIPTION_LEVELS.PRO) {
   ```

3. Use constant-manager to automate:
   ```
   "Refactor magic strings to use constants"
   ```

### Issue: Missing limits for new subscription level

**Symptoms:**
- Added new tier but some features don't work
- `undefined` when accessing limits

**Solutions:**
1. Check which domains are missing:
   ```bash
   # Search for new tier in all domain files
   grep -r "PLATINUM" lib/services/service*/constants/ --include="*Constants.js"
   ```

2. Add to each missing domain:
   ```javascript
   export const CONTACT_LIMITS = {
     // ... other levels ...
     [SUBSCRIPTION_LEVELS.PLATINUM]: {
       maxContacts: 50000,
       maxGroups: 200,
       features: [/* all platinum features */]
     }
   };
   ```

3. Validate completeness:
   ```
   "Validate constants consistency"
   ```

## Workflow Examples

### Example 1: Add New Feature Flag

```
User: "Add a new contact feature for AI-powered duplicate detection"

constant-manager:
1. ✅ Determine location: Domain (contact-specific)
2. ✅ Choose pattern: Feature Flags (Pattern 2)
3. ⚠️ ASK: "Add AI_DUPLICATE_DETECTION to CONTACT_FEATURES? [Y/n]"

User: "Y"

constant-manager:
4. ✅ Add to contactConstants.js:
   CONTACT_FEATURES.AI_DUPLICATE_DETECTION = 'ai_duplicate_detection'
5. ✅ Ask which tiers should have it
6. ✅ Update CONTACT_LIMITS for selected tiers
7. ✅ Update constants-index.json
8. ✅ Report completion

Complete: Feature flag created ✅
```

### Example 2: Refactor Magic Strings

```
User: "Find and fix all magic strings"

constant-manager:
1. ✅ Scan codebase for magic strings
2. ✅ Find 8 occurrences
3. ✅ Categorize by type (subscription, role, status)
4. ⚠️ ASK: "Replace 8 magic strings with constants? [Y/n]"

User: "Y"

constant-manager:
5. ✅ For each file:
   - Add import statement
   - Replace magic string with constant
   - Verify syntax
6. ✅ Update constants-index.json (increase import count)
7. ✅ Validate: grep -r "'pro'" returns 0 results
8. ✅ Report: "Refactored 8 magic strings in 8 files"
9. ✅ Offer to commit (pass to git-manager)

Complete: Magic strings refactored ✅
```

### Example 3: Add Subscription Level

```
User: "Add a PLATINUM subscription tier"

constant-manager:
1. ✅ Add to SUBSCRIPTION_LEVELS in core/constants.js
2. ✅ Find all domain LIMITS objects (7 domains)
3. ⚠️ ASK: "Update all 7 domain limit files with PLATINUM tier? [Y/n]"

User: "Y"

constant-manager:
4. ✅ For each domain, ask for limits:
   "PLATINUM contact limits? [maxContacts, maxGroups, features]"
5. ✅ Update contactConstants.js CONTACT_LIMITS
6. ✅ Repeat for all 7 domains
7. ✅ Validate: All domains have PLATINUM
8. ✅ Update constants-index.json
9. ✅ Report: "Added PLATINUM to 7 domains with complete limits"
10. ✅ Offer to document (pass to docs-manager)
11. ✅ Offer to commit (pass to git-manager)

Complete: PLATINUM tier added ✅
```

### Example 4: Validate Before Code Change

```
User: "I want to modify the semantic search feature"

constant-manager (automatic):
1. ✅ Extract keywords: "semantic", "search"
2. ✅ Search constants-index.json
3. ✅ Find: CONTACT_FEATURES.SEMANTIC_SEARCH, SEMANTIC_SEARCH_CONFIG
4. ✅ Present findings:

📚 Related constants:
- CONTACT_FEATURES.SEMANTIC_SEARCH (feature flag)
- SEMANTIC_SEARCH_CONFIG (configuration)
- Available in: PREMIUM, BUSINESS, ENTERPRISE
- Used by: 5 files

Current config:
- Vector DB: Pinecone
- Reranking: Gemini 2.0 Flash Lite

What would you like to modify?

User: "Change the reranking model to Claude"

constant-manager:
5. ✅ Show current SEMANTIC_SEARCH_CONFIG
6. ⚠️ ASK: "Update reranking.model to 'claude-3-5-sonnet'? [Y/n]"
7. ✅ Update constant
8. ✅ Report files affected (5 files use this config)
9. ✅ Suggest testing
10. ✅ Offer to document change
11. ✅ Offer to commit

Complete: Config updated, user informed of impact ✅
```

## Success Metrics

A well-managed constant system should have:
- ✅ Zero magic strings for subscription levels, roles, features
- ✅ All imports use barrel pattern (no direct imports)
- ✅ All subscription levels have complete limits in all domains
- ✅ All roles have complete permissions
- ✅ No circular dependencies
- ✅ Consistent SCREAMING_SNAKE_CASE naming
- ✅ constants-index.json accurate and up-to-date
- ✅ All constants documented with JSDoc
- ✅ Clear import patterns throughout codebase
- ✅ Easy to add new constants (clear decision tree)

---

*This skill manages Weavink's constant system with 150+ constants across 9 files, ensuring consistency, preventing magic strings, and maintaining a clean barrel export architecture for easy refactoring and type safety.*
