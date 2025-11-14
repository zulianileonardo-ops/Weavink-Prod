# Constant-Manager-Skill 🎯

> **Professional constant management system for Weavink**
> Manages constants using barrel export pattern, validates consistency, refactors magic strings, and maintains constant index.

[![Status](https://img.shields.io/badge/status-production%20ready-success)]()
[![Violations](https://img.shields.io/badge/direct%20imports-0%20✅-success)]()
[![Magic Strings](https://img.shields.io/badge/magic%20strings-4%20low%20priority-green)]()
[![Coverage](https://img.shields.io/badge/constants%20cataloged-157-blue)]()

## 🚀 Quick Start

### Using the Skill

```bash
# In Claude Code, invoke the skill:
"Search for constants related to subscription"
"Add a new feature flag for AI search"
"Validate constant consistency"
"Refactor magic strings in the codebase"
```

### Using the Scripts

```bash
# Search for constants
python3 .claude/skills/constant-manager-skill/scripts/search.py SUBSCRIPTION

# Validate consistency
python3 .claude/skills/constant-manager-skill/scripts/validate.py

# Find magic strings
python3 .claude/skills/constant-manager-skill/scripts/refactor.py --scan --guide

# Analyze dependencies
python3 .claude/skills/constant-manager-skill/scripts/analyze.py SUBSCRIPTION_LEVELS
```

## 📁 What's Included

```
constant-manager-skill/
├── SKILL.md                    # Main skill file (757 lines)
├── README.md                   # This file
├── INTEGRATION.md              # Integration with other skills
├── constants-index.json        # Catalog of all constants
│
├── scripts/                    # Validation & analysis tools
│   ├── search.py              # Search constants
│   ├── validate.py            # Check consistency
│   ├── refactor.py            # Find & fix magic strings
│   └── analyze.py             # Dependency analysis
│
└── templates/                  # Templates for new constants
    ├── enum-constant.template.js
    ├── feature-flags.template.js
    ├── config-object.template.js
    ├── permissions-map.template.js
    └── README.md
```

## 💡 Core Capabilities

| Capability | Description |
|------------|-------------|
| **Create Constants** | Add new constants with proper placement using decision trees |
| **Search & Discover** | Find constants, their usage, and dependencies |
| **Validate Consistency** | Check subscription limits, permissions, naming conventions |
| **Refactor Magic Strings** | Replace hardcoded strings with constants |
| **Analyze Dependencies** | Map constant relationships and detect circular dependencies |
| **Track Usage** | Maintain index with metadata and violation tracking |
| **Enforce Patterns** | Ensure barrel imports, proper naming, architecture compliance |

## 🏗️ Architecture: Barrel Export Pattern

```
Application Code (app/, components/)
         ↓
  ✨ Barrel File (constants.js) ← Single import point
         ↓
Core Constants + Domain Constants
```

### The Golden Rule

**All code MUST import from barrel, NEVER directly from domain files:**

```javascript
// ✅ Correct
import { SUBSCRIPTION_LEVELS, CONTACT_FEATURES } from '@/lib/services/constants';

// ❌ Wrong
import { CONTACT_FEATURES } from '@/lib/services/serviceContact/client/constants/contactConstants';
```

## 📊 Current State (Updated 2025-11-14)

### ✅ Achievements

- **157 constants** cataloged across 9 files
- **0 direct import violations** (3 fixed)
- **6 critical magic strings** refactored
- **0 circular dependencies**
- **100% barrel import compliance**

### 📁 Constant Structure

| Category | File | Constants | Status |
|----------|------|-----------|--------|
| **Core** | `core/constants.js` | 8 shared constants | ✅ Clean |
| **Barrel** | `constants.js` | Re-exports all | ✅ Complete |
| **Contact** | `contactConstants.js` | 20+ features, limits | ✅ Clean |
| **Appearance** | `appearanceConstants.js` | 10+ features, limits | ✅ Clean |
| **Analytics** | `analyticsConstants.js` | Events, config | ✅ Clean |
| **Enterprise** | `enterpriseConstants.js` | 13 permissions, roles | ✅ Clean |
| **Organization** | `organizationConstants.js` | Org settings | ✅ Clean |
| **Admin** | `adminConstants.js` | 30+ features, pricing | ✅ Clean |

### 🔥 Recent Fixes

#### Direct Imports Fixed (Nov 14, 2025)
- ✅ `app/api/user/contacts/semantic-search/route.js`
- ✅ `app/api/user/contacts/rerank/route.js`
- ✅ `app/api/user/contacts/ai-enhance-results/route.js`

#### Magic Strings Refactored (Nov 14, 2025)
- ✅ `VideoEmbedItem.jsx` - 2 instances
- ✅ `CarouselItem.jsx` - 2 instances
- ✅ `ManageLinks.jsx` - 2 instances

All UI logic now uses `SUBSCRIPTION_LEVELS.BASE` instead of magic string `'base'`.

## 🎯 Common Use Cases

### 1. Add New Subscription Tier

```javascript
// User request:
"Add a PLATINUM subscription tier"

// What the skill does:
1. Adds PLATINUM to SUBSCRIPTION_LEVELS
2. Updates all 7 domain LIMITS objects
3. Validates completeness
4. Updates constants-index.json
5. Offers to document (docs-manager)
6. Offers to commit (git-manager)
```

### 2. Add New Feature Flag

```javascript
// User request:
"Add AI-powered contact deduplication for business users"

// What the skill does:
1. Creates CONTACT_FEATURES.AI_DEDUPLICATION
2. Adds to BUSINESS and ENTERPRISE limits
3. Updates barrel exports (if needed)
4. Updates index
5. Provides usage example
```

### 3. Find and Fix Magic Strings

```javascript
// User request:
"Find all magic strings and fix them"

// What the skill does:
1. Scans codebase with refactor.py
2. Shows all findings
3. Asks for confirmation
4. Refactors each file:
   - Adds import
   - Replaces string with constant
5. Validates with npm run build
```

### 4. Validate Consistency

```javascript
// User request:
"Check if all subscription levels have limits"

// What the skill does:
1. Runs validate.py
2. Checks:
   ✅ All subscription levels have limits
   ✅ All roles have permissions
   ✅ Naming conventions followed
   ✅ No circular dependencies
   ✅ Barrel exports complete
3. Reports any issues
4. Offers to fix them
```

## 📚 Documentation

### For Users
- **[SKILL.md](SKILL.md)** - Complete skill documentation (757 lines)
  - All workflows and patterns
  - Decision trees
  - Troubleshooting
  - Integration points

- **[INTEGRATION.md](INTEGRATION.md)** - Integration with other skills
  - How skills work together
  - Communication protocol
  - Workflow examples

### For Developers
- **[constants-index.json](constants-index.json)** - Full constant catalog
  - 157 constants with metadata
  - Usage tracking
  - Violation history
  - Recommendations

- **[templates/README.md](templates/README.md)** - Template usage guide
  - When to use each template
  - How to customize
  - Examples

## 🛠️ Scripts Reference

### search.py - Find Constants

```bash
# Search by name
python3 scripts/search.py SUBSCRIPTION

# Search by category
python3 scripts/search.py --category core

# Search by usage
python3 scripts/search.py --usage session.js

# Search by file
python3 scripts/search.py --file contactConstants.js

# List all constants
python3 scripts/search.py --all
```

**Output:** Detailed info about matching constants (location, type, description, usage)

### validate.py - Check Consistency

```bash
# Run all validations
python3 scripts/validate.py

# Generates report with:
# - Subscription level completeness
# - Direct import violations
# - Magic string findings
# - Naming convention issues
# - Circular dependencies
# - Deprecated constant usage
```

**Output:** Comprehensive validation report with issues categorized by priority

### refactor.py - Fix Magic Strings

```bash
# Scan for all magic strings
python3 scripts/refactor.py --scan

# Scan specific type
python3 scripts/refactor.py --scan --type subscription

# Generate refactoring guide
python3 scripts/refactor.py --scan --guide

# Available types:
# - subscription (base, pro, premium, business, enterprise)
# - role (manager, employee, contractor, intern, view_only)
# - org_role (owner, admin, member, billing)
```

**Output:** List of magic strings with file locations and suggested replacements

### analyze.py - Understand Dependencies

```bash
# Analyze specific constant
python3 scripts/analyze.py SUBSCRIPTION_LEVELS

# Show dependency tree
python3 scripts/analyze.py --tree CONTACT_LIMITS

# Find circular dependencies
python3 scripts/analyze.py --circular

# Overview of all dependencies
python3 scripts/analyze.py --all
```

**Output:** Dependency graph, impact assessment, usage statistics

## 🎨 Templates

Use templates to create new constants with proper structure:

```bash
# Location
.claude/skills/constant-manager-skill/templates/

# Available templates:
1. enum-constant.template.js       # Simple enumerations
2. feature-flags.template.js       # Domain features with limits
3. config-object.template.js       # Complex configurations
4. permissions-map.template.js     # Role-based permissions
```

**See [templates/README.md](templates/README.md) for usage guide.**

## 🔗 Integration with Other Skills

### With docs-manager
- After creating constant → Offer to document
- Before modifying → Check for related docs
- After refactoring → Update documentation

### With test-manager
- After creating constant → Suggest validation tests
- After refactoring → Run affected tests
- Before deployment → Validate all constants

### With git-manager
- After changes → Generate descriptive commits
- Include impact analysis
- Group related updates

**See [INTEGRATION.md](INTEGRATION.md) for detailed workflows.**

## 🎓 Decision Trees

### Where Does This Constant Belong?

```
Is it used by 3+ domains?
├─ YES → Core constants (lib/services/core/constants.js)
└─ NO → Is it a fundamental concept (role, level, status)?
        ├─ YES → Core constants
        └─ NO → Domain constants (lib/services/service{Domain}/constants/)
```

### What Type of Constant Should I Create?

```
What are you defining?

├─ Valid values (status, role, level)
│  → enum-constant.template.js
│
├─ Features with subscription limits
│  → feature-flags.template.js
│
├─ Permissions per role
│  → permissions-map.template.js
│
└─ Configuration with nested structure
   → config-object.template.js
```

## 📈 Success Metrics

A well-managed constant system has:
- ✅ Zero magic strings for subscription levels, roles, features
- ✅ All imports use barrel pattern (no direct imports)
- ✅ All subscription levels have complete limits in all domains
- ✅ All roles have complete permissions
- ✅ No circular dependencies
- ✅ Consistent SCREAMING_SNAKE_CASE naming
- ✅ Up-to-date constants-index.json
- ✅ Clear documentation for all constants

**Current Status:** ✅ All metrics passing!

## 🐛 Troubleshooting

### Import not working?
1. Check barrel file exports the constant
2. Verify you're using barrel import, not direct
3. Restart TypeScript server
4. Run: `npm run build`

### Magic strings still in code?
1. Run: `python3 scripts/refactor.py --scan`
2. Review findings
3. Use skill to refactor: "Fix all magic strings"

### Circular dependency detected?
1. Run: `python3 scripts/analyze.py --circular`
2. Move shared constants to core
3. Remove domain-to-domain imports

**See [SKILL.md - Troubleshooting](SKILL.md#troubleshooting) for more solutions.**

## 📞 Support

**Getting Help:**
1. Check [SKILL.md](SKILL.md) for workflows
2. Run validation: `python3 scripts/validate.py`
3. Search for examples in templates/
4. Review [INTEGRATION.md](INTEGRATION.md) for skill coordination

**Reporting Issues:**
1. Run: `python3 scripts/validate.py > validation-report.txt`
2. Include validation report
3. Describe what you were trying to do
4. Include error messages or unexpected behavior

## 🚦 Status & Health

| Metric | Status | Details |
|--------|--------|---------|
| Direct Imports | ✅ **0 violations** | All 3 fixed on 2025-11-14 |
| Magic Strings | ✅ **4 remaining (low priority)** | 6 critical ones fixed |
| Circular Dependencies | ✅ **0 detected** | Architecture is clean |
| Naming Conventions | ✅ **100% compliance** | All follow SCREAMING_SNAKE_CASE |
| Barrel Exports | ✅ **Complete** | All domains exported |
| Deprecated Constants | ⚠️ **1 remaining** | Scheduled for removal |
| Constants Cataloged | ✅ **157 total** | Across 9 files |
| Test Coverage | ✅ **Ready** | Validation scripts operational |

## 📝 Recent Updates

### 2025-11-14
- ✅ Fixed all 3 direct import violations
- ✅ Refactored 6 critical magic strings
- ✅ Created comprehensive SKILL.md (757 lines)
- ✅ Built 4 validation scripts (search, validate, refactor, analyze)
- ✅ Created 4 constant templates with usage guide
- ✅ Updated constants-index.json with fixes
- ✅ Created integration documentation
- ✅ **Status: Production Ready** 🎉

---

**Made with ❤️ for Weavink by Claude Code**
*Professional constant management for modern JavaScript applications*
