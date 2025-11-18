# 🎯 Three-Skill Integration Guide
## test-manager + docs-manager + git-manager

**The Complete Workflow: Test → Document → Commit**

---

## Overview

This guide explains how the three skills work together to automate your development workflow:

1. **test-manager** - Runs tests and tracks results
2. **docs-manager** - Updates documentation based on test results  
3. **git-manager** - Commits and pushes all changes

```
┌──────────────┐
│ test-manager │  Runs tests
└──────┬───────┘
       │ ✅ Tests pass
       │ Sends: {testResults, testedFunctions, relatedDocs}
       ↓
┌──────────────┐
│ docs-manager │  Updates docs
└──────┬───────┘
       │ ✅ Docs updated
       │ Sends: {updatedFiles, message}
       ↓
┌──────────────┐
│ git-manager  │  Commits & pushes
└──────────────┘
       │ ✅ Committed
       ↓
    Complete!
```

---

## Installation

### Install All Three Skills

```bash
# Install docs-manager
bash /mnt/user-data/outputs/docs-manager-skill/install.sh

# Install test-manager
bash /mnt/user-data/outputs/test-manager-skill/install.sh

# Install git-manager  
bash /mnt/user-data/outputs/git-manager-skill/install.sh
```

### Verify Installation

```bash
cd ~/your-project
claude
```

Then ask:
```
What skills are available?
```

You should see all three:
- ✅ docs-manager
- ✅ test-manager
- ✅ git-manager

---

## Complete Workflow Examples

### Example 1: Test, Document, and Commit

```
You: "Run the RGPD consent tests and commit if they pass"

┌─────────────────────────────────────────────┐
│ STEP 1: test-manager                        │
└─────────────────────────────────────────────┘

test-manager:
1. Executes: node -r dotenv/config runConsentTests.mjs
2. Parses output:
   ✅ 8/8 tests passed
   ⏱️ Duration: 1.8s
   📋 Functions tested: recordConsent, getUserConsents, hasConsent...
3. Updates test-index.json
4. Identifies related docs:
   - documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md
   - documentation/rgpd/RGPD_TESTING_GUIDE.md
5. Signals docs-manager:
   "Tests passed! Update documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md with coverage"

┌─────────────────────────────────────────────┐
│ STEP 2: docs-manager                        │
└─────────────────────────────────────────────┘

docs-manager:
6. Reads documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md
7. ⚠️ ASKS YOU:
   "📝 Ready to update documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md
   
   Proposed changes:
   - Add test coverage section
   - Link to test suite: runConsentTests.mjs
   - Update function documentation:
     * recordConsent: Tested ✅ (8 tests)
     * getUserConsents: Tested ✅ (8 tests)
   
   Proceed? [Y/n/preview]"

You: "Y"

docs-manager:
8. Updates guide with test coverage
9. Updates docs-index.json
10. Updates INDEX.md
11. Signals git-manager:
    "Docs updated! Ready to commit"

┌─────────────────────────────────────────────┐
│ STEP 3: git-manager                         │
└─────────────────────────────────────────────┘

git-manager:
12. Checks git status
13. ⚠️ ASKS YOU:
    "📋 Ready to commit
    
    Files to commit:
    - test-index.json (test results)
    - documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md (updated docs)
    - docs-index.json (updated index)
    - INDEX.md (updated master index)
    
    Suggested commit message:
    '✅ Tests: RGPD Consent (8/8 passing) + Updated docs'
    
    Options:
    1. Commit with this message
    2. Edit message
    3. Show diff
    4. Cancel
    
    Your choice: [1/2/3/4]"

You: "1"

git-manager:
14. Creates commit with message
15. ⚠️ ASKS YOU:
    "⬆️ Push to origin/main?
    
    Commits to push (1):
    - ✅ Tests: RGPD Consent (8/8 passing) + Updated docs
    
    Proceed? [Y/n]"

You: "Y"

git-manager:
16. Pushes to remote
17. Reports:
    "✅ Complete!
    
    Workflow Summary:
    ✅ Tests: 8/8 passed
    ✅ Docs: 3 files updated
    ✅ Git: Committed & pushed
    
    Commit: a1b2c3d
    Remote: origin/main"
```

---

### Example 2: Tests Fail - Workflow Stops

```
You: "Run all RGPD tests and commit"

test-manager:
1. Runs: node -r dotenv/config runAllRGPDTests.mjs
2. Parses output:
   ❌ 115/116 passed, 1 failed
   
3. Reports:
   "❌ Test failed: Account Deletion Grace Period
   
   Error: Expected 30 days, got 29 days
   
   ❌ Workflow STOPPED
   ❌ NOT proceeding to docs or git
   
   Action required:
   1. Fix the failing test
   2. Re-run tests
   3. Only when 100% pass → update docs → commit"

❌ docs-manager: NOT called (tests must pass first)
❌ git-manager: NOT called (no commits on failed tests)

Status: Workflow halted at test stage
```

---

### Example 3: Manual Control

```
You: "Run tests but don't commit yet"

test-manager:
1. Runs tests
2. All pass ✅
3. Updates test-index.json
4. ⚠️ ASKS:
   "Tests passed! 
   
   Options:
   1. Update docs now (call docs-manager)
   2. Just save test results
   3. Show test report
   
   Your choice: [1/2/3]"

You: "2"

test-manager:
5. Saves test results
6. Reports: "✅ Test results saved to test-index.json"

❌ docs-manager: NOT called (you chose option 2)
❌ git-manager: NOT called (no docs to commit)

Status: Manual control - stopped at test stage
```

---

## Integration Points

### 1. test-manager → docs-manager

**Data Passed:**
```javascript
{
  source: "test-manager",
  action: "update_documentation",
  testSuite: "RGPD Consent Management",
  testFile: "runConsentTests.mjs",
  results: {
    passed: 8,
    failed: 0,
    total: 8,
    successRate: "100%",
    duration: "1.8s"
  },
  testedFunctions: [
    "recordConsent",
    "withdrawConsent", 
    "getUserConsents",
    "hasConsent",
    "batchGrantConsents",
    "getConsentHistory"
  ],
  coverage: {
    files: ["lib/services/servicePrivacy/consentService.js"],
    percentage: 95
  },
  relatedDocs: [
    "documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md",
    "documentation/rgpd/RGPD_TESTING_GUIDE.md"
  ],
  request: "Update documentation with test coverage information"
}
```

**docs-manager Response:**
```javascript
{
  success: true,
  filesUpdated: [
    "documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md",
    "docs-index.json",
    "INDEX.md"
  ],
  message: "Documentation updated with test coverage"
}
```

---

### 2. docs-manager → git-manager

**Data Passed:**
```javascript
{
  source: "docs-manager",
  action: "commit_documentation",
  files: [
    "documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md",
    "docs-index.json",
    "INDEX.md",
    "test-index.json"  // Also from test-manager
  ],
  message: "📝 Updated consent documentation with test coverage (8/8 passing)",
  metadata: {
    docsUpdated: true,
    testsLinked: true,
    guidesAffected: 1
  }
}
```

**git-manager Response:**
```javascript
{
  success: true,
  committed: true,
  pushed: true,
  commitHash: "a1b2c3d",
  message: "✅ Tests: RGPD Consent (8/8) + Updated docs"
}
```

---

### 3. Combined Integration

**Full workflow data flow:**

```javascript
// Step 1: test-manager runs
test-manager.runTests("runConsentTests.mjs")
  → results: {passed: 8, failed: 0, ...}
  → updates: test-index.json
  → signals: docs-manager

// Step 2: docs-manager updates (after user confirms)
docs-manager.updateDocumentation({
  testResults: {...},
  relatedDocs: [...]
})
  → updates: documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md
  → updates: docs-index.json, INDEX.md
  → signals: git-manager

// Step 3: git-manager commits (after user confirms)
git-manager.commitChanges({
  files: [test-index.json, *.md files],
  message: "Tests + docs updated"
})
  → commits: All changed files
  → pushes: To remote (if user confirms)
  → complete: Workflow done ✅
```

---

## User Confirmation Points

The workflow has **3 mandatory confirmation points**:

### Confirmation 1: Update Documentation?
```
docs-manager asks:
"📝 Ready to update documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md

Proposed changes:
- Add test coverage (8/8 passing)
- Update function documentation

Proceed? [Y/n/preview]"

Why: User should review doc changes before applying
```

### Confirmation 2: Commit Changes?
```
git-manager asks:
"📋 Ready to commit

Files:
- test-index.json
- documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md
- docs-index.json

Message: '✅ Tests: RGPD Consent (8/8) + Updated docs'

Proceed? [Y/n/edit]"

Why: User should review what's being committed
```

### Confirmation 3: Push to Remote?
```
git-manager asks:
"⬆️ Push to origin/main?

Commits: 1 commit to push

Proceed? [Y/n]"

Why: User controls when changes go to remote
```

**You can say "no" at any point to stop the workflow!**

---

## Configuration

### Enable/Disable Skills

You can control which parts of the workflow run:

```javascript
// In Claude Code, you can say:

"Run tests only, don't update docs"
→ test-manager runs
→ docs-manager skipped
→ git-manager skipped

"Run tests and update docs, but don't commit"
→ test-manager runs
→ docs-manager runs (with confirmation)
→ git-manager skipped

"Full workflow: test, document, commit"
→ All three skills run
→ Each asks for confirmation
```

---

## Advanced Workflows

### Workflow 1: Feature Branch Development

```
1. Create feature branch:
   "Create branch feature/add-consent-categories"
   → git-manager creates branch

2. Develop feature:
   "Run tests for consent categories"
   → test-manager runs tests
   
3. Update docs:
   "Document the consent category feature"
   → docs-manager creates guide

4. Commit to feature branch:
   "Commit to feature branch"
   → git-manager commits to feature/add-consent-categories

5. Merge when ready:
   "Merge feature branch to main"
   → git-manager merges (after running tests again)
```

### Workflow 2: Hot Fix

```
1. Identify problem:
   "The consent validation is broken"

2. Fix the code:
   [You fix the code]

3. Run specific tests:
   "Run consent validation tests"
   → test-manager runs targeted tests

4. Quick commit:
   "Quick commit: Fixed consent validation"
   → git-manager commits with your message
   → docs updated later
```

### Workflow 3: Comprehensive Update

```
1. Run all tests:
   "Run all RGPD tests"
   → test-manager runs full suite (116 tests)

2. Update all related docs:
   "Update all RGPD documentation with test coverage"
   → docs-manager updates 9 RGPD guides

3. Single commit:
   "Commit everything with comprehensive message"
   → git-manager creates detailed commit
```

---

## Troubleshooting

### Problem: Skills Don't See Each Other

**Solution:**
```bash
# Verify all skills are installed
ls ~/.claude/skills/

# Should see:
# - docs-manager/
# - test-manager/
# - git-manager/

# Restart Claude Code
# Skills load on startup
```

### Problem: Tests Pass But Docs Don't Update

**Check:**
1. Did you approve the docs-manager confirmation?
2. Are related docs listed in test-index.json?
3. Do the doc files exist?

**Solution:**
```
"Show me which docs are related to these tests"
→ test-manager shows relatedDocs array

"Update documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md manually"
→ docs-manager updates specific file
```

### Problem: Commits Include Wrong Files

**Check:**
```
"Show git status"
→ git-manager shows all changed files

"Show me what will be committed"
→ git-manager shows detailed diff
```

**Solution:**
```
"Commit only test-index.json"
→ git-manager commits specific file

OR

"Reset the docs changes"
→ git-manager resets specific files
```

---

## Best Practices

### 1. Always Run Tests First
```
✅ GOOD:
1. Code changes
2. Run tests
3. Tests pass → Update docs → Commit

❌ BAD:
1. Code changes
2. Update docs (without testing)
3. Commit (untested code)
```

### 2. Keep Docs in Sync
```
✅ GOOD:
Tests pass → Immediately update related docs

❌ BAD:
Tests pass → "I'll update docs later" → Never happens
```

### 3. Descriptive Commits
```
✅ GOOD:
"✅ Tests: RGPD Consent (8/8 passing) + Updated docs"

❌ BAD:
"update stuff"
"fixes"
"WIP"
```

### 4. Review Before Confirming
```
At each confirmation:
1. Read what will change
2. Verify it's correct
3. Then approve

Don't blindly click "Y"
```

---

## Quick Reference

### Run Full Workflow
```
"Run RGPD consent tests and commit if they pass"

Result:
→ Tests run
→ Docs update (you confirm)
→ Commit & push (you confirm)
```

### Run Tests Only
```
"Run RGPD consent tests"

Result:
→ Tests run
→ Results saved
→ No docs or commits
```

### Update Docs Only
```
"Update documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md with latest test coverage"

Result:
→ Docs update
→ No test run or commit
```

### Commit Only
```
"Commit my changes"

Result:
→ Git commit
→ No tests or docs
```

---

## Summary

**The Power of Integration:**

1. **Automated Quality** - Tests must pass before commits
2. **Always Updated** - Docs stay in sync with code
3. **Clean History** - Descriptive commits with context
4. **User Control** - You approve each step
5. **Time Savings** - Workflow automation saves hours

**Workflow Pattern:**
```
Code → Test → Pass? → Update Docs → Commit → Push
        ↓      
       Fail → Fix → Test again
```

**You Control:**
- ✅ When tests run
- ✅ Which docs update
- ✅ What gets committed
- ✅ When to push

**Skills Handle:**
- ✅ Running tests
- ✅ Parsing results
- ✅ Updating docs
- ✅ Creating commits
- ✅ Linking everything together

---

**Ready to use?** Just install all three skills and say:

```
"Run my tests and commit if they pass"
```

The skills will guide you through the rest! ��
