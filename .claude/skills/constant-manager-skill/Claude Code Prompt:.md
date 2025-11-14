# Claude Code Prompt: Constants Architecture Analysis

Run this prompt in your Weavink codebase using Claude Code to gather comprehensive information about your constants architecture. Copy the entire prompt below and paste it into Claude Code.

---

## PROMPT START

I need you to perform a comprehensive analysis of the constants architecture in this Weavink codebase. This information will be used to enhance a skill file for managing constants.

### Phase 1: File Structure Analysis

1. **Locate all constants files:**
   - Find `lib/services/constants.js` (barrel file)
   - Find `lib/services/core/constants.js` (core constants)
   - Find all domain-specific constant files matching pattern: `lib/services/service*/constants/*Constants.js`
   
2. **For each file found, provide:**
   - Full file path
   - File size (line count)
   - Date last modified (if available via git)
   - List of all exported constant names (just the names, not values)

3. **Verify barrel file structure:**
   - List all export statements in `lib/services/constants.js`
   - Confirm the order (core first, then domains)
   - Check for any constants defined directly in the barrel file (should be none)

**Output format for Phase 1:**
```
FILE INVENTORY
=============

Barrel File: lib/services/constants.js
Lines: [count]
Exports [count] files:
  1. ./core/constants
  2. ./serviceContact/client/services/constants/contactConstants
  [etc...]

Core Constants: lib/services/core/constants.js
Lines: [count]
Exports [count] constants:
  - SUBSCRIPTION_LEVELS
  - ORGANIZATION_ROLES
  [etc...]

Domain Files:
1. lib/services/serviceContact/.../contactConstants.js
   Lines: [count]
   Exports: [count] constants
   - CONTACT_FEATURES
   - CONTACT_LIMITS
   [etc...]

2. [next domain file...]
```

### Phase 2: Dependency Analysis

1. **For each domain constant file:**
   - List all imports from other files
   - Identify if it imports from core constants (expected)
   - Identify if it imports from other domain constants (potential issue)
   - Check for circular dependency risks

2. **Create dependency graph:**
   - Show which files import from which
   - Identify the dependency chain depth

**Output format for Phase 2:**
```
DEPENDENCY ANALYSIS
==================

Core Constants (lib/services/core/constants.js):
  Imports: NONE (as expected)
  Imported by: [list of files]

Domain: contactConstants.js
  Imports from core: SUBSCRIPTION_LEVELS
  Imports from other domains: NONE (good)
  
Domain: enterpriseConstants.js
  Imports from core: ORGANIZATION_ROLES, TEAM_ROLES, INVITATION_STATUS
  Imports from other domains: NONE (good)

[If any issues found:]
⚠️ ISSUES DETECTED:
  - [File X] imports from [File Y] (domain-to-domain import)
  - Potential circular dependency: [describe]
```

### Phase 3: Constant Usage Analysis

1. **For core constants, find usage across codebase:**
   - How many files import SUBSCRIPTION_LEVELS?
   - How many files import TEAM_ROLES?
   - How many files import ORGANIZATION_ROLES?

2. **Check for magic strings:**
   - Search for hardcoded strings like 'pro', 'premium', 'base' in:
     - API route files: `app/api/**/*.js`
     - Service files: `lib/services/**/*.js`
     - Component files: `app/**/*.jsx` or `components/**/*.jsx`
   - List files that use these magic strings instead of constants

3. **Check import patterns:**
   - Find files that import directly from domain constant files (bypassing barrel)
   - Count files using barrel import vs direct import

**Output format for Phase 3:**
```
USAGE ANALYSIS
=============

Core Constants Usage:
  SUBSCRIPTION_LEVELS: imported by [count] files
    - [list top 5 importers]
  
  TEAM_ROLES: imported by [count] files
    - [list top 5 importers]

Magic Strings Found:
  ⚠️ Hardcoded 'pro' in:
    - app/api/contacts/route.js:45
    - lib/services/serviceContact/server/ContactService.js:123
  
  ⚠️ Hardcoded 'premium' in:
    - components/UpgradeModal.jsx:78

Import Pattern Violations:
  ❌ Direct import (bypassing barrel):
    - [File path] imports directly from contactConstants.js
  
  ✅ Correct barrel imports: [count] files
```

### Phase 4: Constant Value Analysis

1. **For SUBSCRIPTION_LEVELS:**
   - Show the actual values defined
   - Check if CONTACT_LIMITS has entries for all subscription levels
   - Check if APPEARANCE_LIMITS has entries for all subscription levels
   - Identify any subscription levels that don't have limits defined in domain files

2. **For TEAM_ROLES and ORGANIZATION_ROLES:**
   - Show the actual values defined
   - Check if DEFAULT_PERMISSIONS_BY_ROLE has entries for all roles
   - Check if TEAM_ROLE_HIERARCHY includes all roles

3. **Identify missing coverage:**
   - Features in CONTACT_FEATURES not referenced in CONTACT_LIMITS
   - Permissions in PERMISSIONS not referenced in DEFAULT_PERMISSIONS_BY_ROLE

**Output format for Phase 4:**
```
VALUE CONSISTENCY CHECK
======================

SUBSCRIPTION_LEVELS:
  Defined values: base, pro, premium, business, enterprise
  
  Coverage in CONTACT_LIMITS: ✅ All levels covered
  Coverage in APPEARANCE_LIMITS: ⚠️ Missing: business, enterprise
  
  Orphaned levels (no limits): [list if any]

TEAM_ROLES:
  Defined values: owner, manager, team_lead, employee
  
  Coverage in DEFAULT_PERMISSIONS_BY_ROLE: ✅ All covered
  Coverage in TEAM_ROLE_HIERARCHY: ✅ All covered

CONTACT_FEATURES:
  Total features: [count]
  Referenced in CONTACT_LIMITS: [count]
  
  ⚠️ Orphaned features (never assigned to any subscription):
    - [feature name]
    - [feature name]
```

### Phase 5: Naming Convention Check

1. **Constant names:**
   - Find any constants not using SCREAMING_SNAKE_CASE
   - Find any inconsistencies (mixing camelCase, PascalCase, etc.)

2. **File names:**
   - Verify all follow {domain}Constants.js pattern
   - Find any that don't match convention

**Output format for Phase 5:**
```
NAMING CONVENTION CHECK
======================

Constant Names:
  ✅ Correct SCREAMING_SNAKE_CASE: [count]
  ❌ Incorrect naming found:
    - [File]: [constant name] (should be [suggested name])

File Names:
  ✅ Following convention: [count] files
  ❌ Non-standard naming:
    - [file path] (should be [suggested name])
```

### Phase 6: Integration with Session System

1. **Find session.js file:**
   - Locate `lib/server/session.js`
   - Show which constants it imports
   - Show how it uses constants in permission calculation

2. **Find SessionManager usage:**
   - Where is SessionManager class defined?
   - Which constants does it use?
   - How does it check permissions using constants?

**Output format for Phase 6:**
```
SESSION INTEGRATION ANALYSIS
===========================

Session File: lib/server/session.js
Lines: [count]

Imported constants:
  - SUBSCRIPTION_LEVELS (from barrel)
  - CONTACT_FEATURES (from barrel)
  - [etc...]

Usage in createApiSession():
  [Show relevant code snippet showing how constants are used]

SessionManager Class:
  Location: [file path]
  Methods using constants: [count]
  
  Key patterns found:
    - Permission checks using CONTACT_FEATURES
    - Role hierarchy checks using TEAM_ROLE_HIERARCHY
    - [etc...]
```

### Phase 7: Undocumented Patterns

Look for any patterns or constants not covered in the existing documentation:

1. **Additional constant files:**
   - Any constants files not in the documented structure?
   - Any constants defined in unexpected locations?

2. **Unusual patterns:**
   - Constants with computed values
   - Constants that reference other constants in unexpected ways
   - Environment-dependent constants

3. **Test coverage:**
   - Are there any constant validation tests?
   - Where are they located?

**Output format for Phase 7:**
```
UNDOCUMENTED PATTERNS
====================

Additional Constant Files:
  [List any not documented]

Unusual Patterns Found:
  - [Description of pattern]
  - Location: [file path]
  - Suggestion: [how to handle]

Test Coverage:
  Found tests: [yes/no]
  Location: [file path if found]
  Coverage: [description]
```

### Phase 8: Recommendations

Based on all findings, provide:

1. **Critical issues** (must fix):
   - Circular dependencies
   - Direct imports bypassing barrel
   - Magic strings in critical code

2. **Improvements** (should fix):
   - Missing limits for subscription levels
   - Inconsistent naming
   - Orphaned constants

3. **Enhancements** (nice to have):
   - Better organization suggestions
   - Additional constants that could improve consistency
   - Testing recommendations

**Output format for Phase 8:**
```
RECOMMENDATIONS
==============

🚨 CRITICAL ISSUES (Fix Immediately):
  1. [Issue description]
     Location: [file:line]
     Fix: [specific action]
  
  2. [Next issue...]

⚠️ IMPROVEMENTS (Should Address):
  1. [Issue description]
     Impact: [description]
     Fix: [specific action]

💡 ENHANCEMENTS (Consider):
  1. [Suggestion]
     Benefit: [description]
     Implementation: [brief guide]
```

### Phase 9: Generate Updated Skill Content

Based on all findings, suggest additions to the skill file:

1. **New patterns discovered**
2. **Additional examples from actual codebase**
3. **Specific issues to warn about**
4. **Better decision trees based on actual usage**

**Output format for Phase 9:**
```
SKILL FILE ADDITIONS
===================

New Section: [Title]
[Suggested content based on findings]

Updated Example: [Section name]
[Updated example with real code from codebase]

New Warning: [Issue type]
[Description and how to avoid]
```

---

## Execution Instructions

1. **Run this analysis systematically** - Complete each phase before moving to the next
2. **Be thorough** - Check every file, don't skip or summarize too much
3. **Show actual code** - When referencing patterns, show real code snippets (5-10 lines)
4. **Highlight issues** - Use ✅, ⚠️, ❌ emojis to make issues clear
5. **Be specific** - Always include file paths, line numbers when mentioning issues
6. **Suggest fixes** - For every issue, provide a concrete fix

After completing all phases, summarize:
- Total constants files: [count]
- Total constants exported: [count]
- Critical issues found: [count]
- Files to fix: [count]
- Estimated refactoring effort: [time estimate]

## PROMPT END

---

## How to Use This Output

After Claude Code completes this analysis:

1. **Review the findings** - Go through each section systematically
2. **Create issues** - For critical items, create GitHub issues or tasks
3. **Update the skill file** - Incorporate the new patterns and examples found
4. **Fix violations** - Address magic strings and direct imports
5. **Add tests** - If missing, create constant validation tests
6. **Document edge cases** - Add any unusual patterns to the skill documentation

The output will be structured and comprehensive, making it easy to:
- Update the constants skill with real examples
- Identify and fix issues in the codebase
- Ensure consistency across the project
- Improve documentation accuracy