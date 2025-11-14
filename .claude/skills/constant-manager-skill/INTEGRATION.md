# Constant-Manager Integration Guide

This document explains how the constant-manager-skill integrates with other skills and workflows in your Weavink development environment.

## Integration with Other Skills

### 1. docs-manager Integration

The constant-manager and docs-manager work together to keep constants documented.

**Workflow:**

```
User: "Add a new subscription tier called PLATINUM"

constant-manager:
1. Adds PLATINUM to SUBSCRIPTION_LEVELS
2. Updates all 7 domain LIMITS objects
3. Updates constants-index.json
4. ✅ Passes to docs-manager:
   {
     action: "document_subscription_tier",
     tier: "PLATINUM",
     limits: [...],
     request: "Update subscription documentation"
   }

docs-manager:
5. Searches for SUBSCRIPTION_TIERS_GUIDE.md
6. Updates guide with PLATINUM information
7. Updates related feature guides
8. ✅ Confirms documentation updated

Complete: PLATINUM added and documented ✅
```

**Integration Points:**
- After creating constants → Offer to document
- Before modifying constants → Check for related docs
- After refactoring → Update affected documentation

**Usage:**
```javascript
// In Claude Code conversation:
"Add a new feature flag ADVANCED_AI_SEARCH"

// constant-manager creates it, then:
"Should I document this feature? (docs-manager)"
// User: "Yes"

// docs-manager takes over
```

### 2. test-manager Integration

The constant-manager and test-manager ensure constants have proper test coverage.

**Workflow:**

```
User: "Add validation tests for SUBSCRIPTION_LEVELS"

constant-manager:
1. Analyzes SUBSCRIPTION_LEVELS usage
2. Identifies critical validation points:
   - All levels have limits in all domains
   - All levels have complete permissions
   - No undefined references
3. ✅ Passes to test-manager:
   {
     action: "create_validation_tests",
     constant: "SUBSCRIPTION_LEVELS",
     validations: [...]
   }

test-manager:
4. Creates test file: constants.validation.test.js
5. Writes tests for each validation
6. Runs tests
7. ✅ Reports: All 15 tests passing

Complete: SUBSCRIPTION_LEVELS validated ✅
```

**Integration Points:**
- After creating constants → Suggest validation tests
- After refactoring → Run affected tests
- Before deployment → Validate all constants

**Usage:**
```javascript
// After adding PLATINUM tier:
"Run tests to verify all subscription levels work"

// test-manager runs relevant tests
// Reports any missing configurations
```

### 3. git-manager Integration

The constant-manager and git-manager handle version control for constant changes.

**Workflow:**

```
User: "Commit the constant changes"

constant-manager:
1. Summarizes changes:
   - Added: PLATINUM subscription tier
   - Updated: 7 domain limit files
   - Refactored: 6 magic strings
2. ✅ Passes to git-manager:
   {
     action: "commit_constant_changes",
     changes: { ... },
     files: [...]
   }

git-manager:
3. Stages files
4. Generates commit message:
   "✨ Add PLATINUM subscription tier

   - Add PLATINUM to SUBSCRIPTION_LEVELS
   - Update all 7 domain LIMITS objects
   - Refactor 6 magic strings to use constants

   Affects: contact, appearance, analytics, enterprise, admin
   Impact: HIGH (25+ files import this constant)"
5. ⚠️ ASKS: "Commit with this message? [Y/n]"
6. Creates commit after confirmation

Complete: Changes committed ✅
```

**Integration Points:**
- After constant changes → Generate descriptive commits
- Include impact analysis in commit messages
- Group related constant updates together

**Usage:**
```javascript
// After multiple constant operations:
"Commit all constant changes"

// git-manager creates comprehensive commit
// with full change summary and impact analysis
```

## Integration Workflows

### Workflow 1: Add New Feature with Complete Setup

```
User: "Add a new semantic caching feature for premium users"

1. constant-manager:
   - Creates CONTACT_FEATURES.SEMANTIC_CACHING
   - Adds to CONTACT_LIMITS for premium/business/enterprise
   - Updates constants-index.json

2. docs-manager:
   - Creates SEMANTIC_CACHING_FEATURE.md
   - Documents usage and limits
   - Links to contact features guide

3. test-manager:
   - Creates feature validation tests
   - Tests permission checking
   - Tests limit enforcement

4. git-manager:
   - Commits all changes
   - Message: "✨ Add semantic caching feature

     - Add feature flag and limits
     - Add documentation
     - Add validation tests

     Available in: premium, business, enterprise"

Complete: Feature fully set up ✅
```

### Workflow 2: Refactor Magic Strings Across Codebase

```
User: "Find and fix all magic strings"

1. constant-manager:
   - Runs refactor.py --scan
   - Finds 8 magic strings
   - Shows refactoring plan

2. User confirms

3. constant-manager:
   - Refactors all 8 files
   - Adds imports
   - Replaces strings with constants

4. test-manager:
   - Runs affected tests
   - Verifies no breakage

5. git-manager:
   - Commits refactoring
   - Message: "♻️ Refactor: Replace magic strings with constants

     - Refactored 8 files
     - Added SUBSCRIPTION_LEVELS imports
     - Improved type safety

     No functional changes"

Complete: Codebase cleaned up ✅
```

### Workflow 3: Before Code Modification

```
User: "I want to modify the contact feature limits"

1. constant-manager (automatic):
   - Searches for CONTACT_LIMITS
   - Shows current structure
   - Analyzes dependencies

2. docs-manager (automatic):
   - Searches for related documentation
   - Shows CONTACT_FEATURES_GUIDE.md
   - Highlights impact sections

3. test-manager (automatic):
   - Shows related tests
   - Displays current test coverage

User now has complete context before making changes

4. User makes modifications

5. constant-manager:
   - Validates changes
   - Checks all subscription levels updated

6. test-manager:
   - Runs contact feature tests
   - Verifies changes work

7. docs-manager:
   - Updates documentation

8. git-manager:
   - Commits everything

Complete: Safe modification with validation ✅
```

## Cross-Skill Communication Protocol

### Message Format

Skills communicate using structured messages:

```javascript
{
  source: "constant-manager",
  action: "document_new_constant",
  data: {
    constant: "CONSTANT_NAME",
    file: "path/to/file.js",
    type: "enum",
    description: "What it represents"
  },
  request: "Human-readable request for the receiving skill"
}
```

### Action Types

**From constant-manager to docs-manager:**
- `document_new_constant` - Document a newly created constant
- `update_constant_docs` - Update docs after constant change
- `link_constants_to_docs` - Connect constants to relevant guides

**From constant-manager to test-manager:**
- `request_validation_tests` - Create tests for constant validation
- `run_tests_after_refactor` - Test after magic string refactoring
- `validate_constant_usage` - Check constant usage in tests

**From constant-manager to git-manager:**
- `commit_constant_changes` - Commit constant modifications
- `commit_refactoring` - Commit magic string refactoring
- `create_feature_branch` - Create branch for constant work

### Confirmation Flow

All skills follow a confirmation protocol:

1. **Show what will change**
2. **Show impact**
3. **Ask for confirmation**
4. **Wait for approval**
5. **Execute**
6. **Report result**

Example:
```
constant-manager: "Ready to add PLATINUM tier. Will update 7 files. Proceed? [Y/n]"
User: "Y"
constant-manager: ✅ Done. Should I document this? (docs-manager)
User: "Y"
docs-manager: "Ready to update 3 documentation files. Proceed? [Y/n]"
User: "Y"
docs-manager: ✅ Done. Ready to commit? (git-manager)
User: "Y"
git-manager: "Commit with message: [...]. Proceed? [Y/n]"
User: "Y"
git-manager: ✅ Committed!
```

## Best Practices for Integration

### 1. Always Use the Right Order

```
Recommended flow:
1. constant-manager (create/modify constants)
2. test-manager (validate changes)
3. docs-manager (update documentation)
4. git-manager (commit everything)

Wrong order:
❌ git-manager → constant-manager (can't commit what doesn't exist)
❌ docs-manager → constant-manager (documenting non-existent constants)
```

### 2. Let Skills Collaborate

```
✅ Good:
"Add PLATINUM tier, test it, document it, and commit"
// constant-manager → test-manager → docs-manager → git-manager

❌ Bad:
"Add PLATINUM tier" [wait]
"Test it" [wait]
"Document it" [wait]
"Commit it" [wait]
// Slow, manual coordination
```

### 3. Trust the Validation Chain

```
constant-manager validates:
- Naming conventions
- Completeness (all subscription levels)
- No circular dependencies

test-manager validates:
- Functionality works
- No regressions
- Coverage maintained

docs-manager validates:
- Documentation complete
- Examples accurate
- Links valid

git-manager validates:
- Commit message quality
- File staging correct
- Branch state clean
```

### 4. Use Skill Strengths

| Skill | Best For |
|-------|----------|
| constant-manager | Creating, searching, refactoring constants |
| docs-manager | Writing guides, maintaining INDEX.md |
| test-manager | Running tests, tracking coverage |
| git-manager | Commits, branches, PRs |

Don't ask constant-manager to write tests or docs-manager to refactor constants. Use the right skill for each task.

## Troubleshooting Integration Issues

### Issue: Skills not communicating

**Symptoms:** One skill completes but doesn't pass to next skill

**Solution:**
```
Check if you explicitly requested the chain:
✅ "Add feature, test it, and commit"  (triggers chain)
❌ "Add feature" (stops at constant-manager)

Always be explicit about what you want:
"Add X, then document it, then commit"
```

### Issue: Conflicting recommendations

**Symptoms:** constant-manager says one thing, test-manager says another

**Solution:**
```
Prioritize in this order:
1. test-manager (if tests fail, fix first)
2. constant-manager (fix constants)
3. docs-manager (update docs)
4. git-manager (commit)

Tests are source of truth for functionality.
```

### Issue: Lost context between skills

**Symptoms:** Later skill doesn't know what earlier skill did

**Solution:**
```
Each skill documents what it did. If context is lost:
1. Ask skill to summarize: "What did you just do?"
2. Check skill output messages
3. Look at constants-index.json, docs-index.json, test-index.json
```

## Examples of Great Integration

### Example 1: Complete Feature Addition

```
User: "Add AI-powered contact deduplication feature for business+ users"

constant-manager:
✅ Added CONTACT_FEATURES.AI_DEDUPLICATION
✅ Added to BUSINESS and ENTERPRISE limits
✅ Updated constants-index.json

test-manager:
✅ Created validation tests
✅ All 12 tests passing
✅ Coverage: 95%

docs-manager:
✅ Created AI_DEDUPLICATION_FEATURE.md
✅ Updated CONTACT_FEATURES_GUIDE.md
✅ Added usage examples

git-manager:
✅ Committed: "✨ Add AI contact deduplication feature"
✅ All changes in single commit

Result: Complete feature setup in one smooth workflow ✅
```

### Example 2: Large Refactoring

```
User: "Refactor all subscription-related magic strings and improve type safety"

constant-manager:
✅ Scanned codebase: Found 15 magic strings
✅ Refactored 12 files
✅ Added TypeScript hints (JSDoc)

test-manager:
✅ Ran all affected tests
✅ 156/156 tests passing
✅ No regressions detected

docs-manager:
✅ Updated REFACTORING_GUIDE.md
✅ Added "Constant Usage" section
✅ Updated code examples

git-manager:
✅ Committed: "♻️ Major refactoring: Eliminate magic strings"
✅ Detailed change summary
✅ Impact analysis included

Result: Codebase improved, fully validated, documented, and committed ✅
```

---

**Need Help?**
- Check individual skill SKILL.md files for detailed workflows
- Run validation: `python3 scripts/validate.py`
- Search constants: `python3 scripts/search.py --help`
- Analyze dependencies: `python3 scripts/analyze.py --help`
