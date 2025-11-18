---
name: git-manager
description: Version control management system for git operations with intelligent commit messages and workflow automation. Handles commits, pushes, branches, merges, and integrates with test-manager and docs-manager for automated workflows. Use when committing changes, pushing code, creating branches, or managing git workflows. Always asks for confirmation before any destructive operations.
allowed-tools: Read, Write, Bash
---

# Git Manager

Professional version control system for Weavink with automated workflows and intelligent commit message generation.

## Core Capabilities

1. **Commit Changes** - Create commits with descriptive messages
2. **Push/Pull** - Sync with remote repositories  
3. **Branch Management** - Create, switch, merge branches
4. **Status Checks** - View git status and history
5. **Workflow Automation** - Integrate with test and docs workflows
6. **Commit Message Generation** - AI-powered commit messages based on changes

## Git Workflow Patterns

### Pattern 1: Test → Docs → Commit (Recommended)
```
1. test-manager runs tests → All pass ✅
2. docs-manager updates docs → Confirmed ✅
3. git-manager commits both → User approves ✅
```

### Pattern 2: Quick Commit
```
1. User makes changes
2. git-manager shows diff
3. git-manager suggests commit message
4. User approves → Commit ✅
```

### Pattern 3: Feature Branch Workflow
```
1. git-manager creates feature branch
2. User develops feature
3. test-manager runs tests
4. git-manager commits to feature branch
5. git-manager creates PR/merge request
```

## Confirmation Protocol

**CRITICAL: ALWAYS ASK BEFORE ANY GIT OPERATION**

Before ANY git operation:
1. ✅ Show what will change (files, commits, branches)
2. ✅ Show the exact command that will run
3. ✅ Ask for explicit confirmation
4. ✅ Wait for user approval
5. ❌ NEVER commit, push, or merge without confirmation

**Especially important for**:
- Commits (show files and message first)
- Pushes (show what will be pushed)
- Force pushes (extra warning)
- Merges (show branches involved)
- Branch deletions (confirm branch name)

## Workflow Instructions

### 1. Committing Changes

**Triggers**:
- "Commit my changes"
- "Create a commit"
- After tests pass and docs updated
- "git commit"

**Process**:
1. **Check Git Status**
   ```bash
   cd ~/temp2/temp2
   git status
   ```

2. **Show Changes to User**
   ```
   📝 Changes to commit:
   
   Modified files:
   - test-index.json (12 lines changed)
   - documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md (5 lines changed)
   - lib/services/servicePrivacy/consentService.js (8 lines changed)
   
   New files:
   - test-reports/rgpd-consent-2025-11-11.md
   
   Total: 4 files, 25 lines changed
   ```

3. **Generate Commit Message**
   Based on changes, suggest message:
   ```
   Suggested commit message:
   
   ✅ Tests: RGPD Consent Categories (12/12 passing)
   
   - Updated test index with latest results
   - Added test coverage to documentation
   - Generated test report
   
   Files: test-index.json, documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md, test report
   ```

4. **ASK FOR CONFIRMATION** ⚠️ MANDATORY
   ```
   📋 Ready to commit
   
   Files to commit:
   - test-index.json
   - documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md
   - lib/services/servicePrivacy/consentService.js
   - test-reports/rgpd-consent-2025-11-11.md
   
   Commit message:
   "✅ Tests: RGPD Consent Categories (12/12 passing)"
   
   Options:
   1. Commit with this message
   2. Edit commit message
   3. Show detailed diff
   4. Cancel
   
   Your choice: [1/2/3/4]
   ```

5. **Execute Commit** (only after approval)
   ```bash
   git add test-index.json
   git add documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md
   git add lib/services/servicePrivacy/consentService.js
   git add test-reports/rgpd-consent-2025-11-11.md
   git commit -m "✅ Tests: RGPD Consent Categories (12/12 passing)"
   ```

6. **Confirm Success**
   ```
   ✅ Committed successfully!
   
   Commit: a1b2c3d
   Message: "✅ Tests: RGPD Consent Categories (12/12 passing)"
   Files: 4 files changed, 25 insertions(+), 3 deletions(-)
   
   Next steps:
   - Push to remote? (git push)
   - View commit: git show
   - Continue working
   ```

### 2. Pushing Changes

**Triggers**:
- "Push my changes"
- "git push"
- After committing
- "Push to origin"

**Process**:
1. **Check What Will Be Pushed**
   ```bash
   # Check if there are commits to push
   git log origin/main..HEAD --oneline
   ```

2. **Show User What Will Push**
   ```
   📤 Ready to push
   
   Commits to push (3):
   1. a1b2c3d - ✅ Tests: RGPD Consent (12/12 passing)
   2. b2c3d4e - 📝 Updated consent documentation
   3. c3d4e5f - 🐛 Fixed consent validation bug
   
   Branch: main → origin/main
   Remote: origin (git@github.com:user/weavink.git)
   ```

3. **ASK FOR CONFIRMATION** ⚠️ MANDATORY
   ```
   ⚠️  About to push 3 commits to origin/main
   
   This will:
   - Upload commits to remote repository
   - Make changes visible to team
   - Trigger CI/CD if configured
   
   Proceed with push? [Y/n/view]
   ```

4. **Execute Push** (only after approval)
   ```bash
   git push origin main
   ```

5. **Confirm Success**
   ```
   ✅ Pushed successfully!
   
   Remote: origin/main
   Commits pushed: 3
   
   View on GitHub:
   https://github.com/user/weavink/commits/main
   ```

### 3. Checking Status

**Triggers**:
- "Git status"
- "What changed?"
- "Show me uncommitted changes"

**Process**:
1. **Run Git Status**
   ```bash
   git status
   ```

2. **Parse and Display**
   ```
   📊 Git Status
   
   Branch: main
   Remote: origin/main (up to date)
   
   Modified files (3):
   - test-index.json
   - documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md
   - lib/services/servicePrivacy/consentService.js
   
   Untracked files (1):
   - test-reports/rgpd-consent-2025-11-11.md
   
   Status: Ready to commit
   ```

3. **Suggest Actions**
   ```
   Suggested actions:
   1. View changes: git diff
   2. Commit changes
   3. Discard changes: git checkout .
   ```

### 4. Viewing Diff

**Triggers**:
- "Show me the diff"
- "What changed in this file?"
- "git diff"

**Process**:
1. **Generate Diff**
   ```bash
   # For specific file
   git diff documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md
   
   # For all files
   git diff
   ```

2. **Show User-Friendly Diff**
   ```
   📄 Changes in documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md
   
   @@ Line 45 @@
   -## Functions
   +## Functions (Test Coverage: 95%)
   
   +### recordConsent()
   +**Tested**: ✅ 12 tests passing
   +**Coverage**: 100%
   
   Summary:
   - 5 lines added
   - 1 line removed
   - Added test coverage section
   ```

### 5. Creating Branches

**Triggers**:
- "Create a branch"
- "Start feature branch"
- "git checkout -b feature/X"

**Process**:
1. **Ask for Branch Name**
   ```
   🌿 Create new branch
   
   Current branch: main
   
   Enter branch name:
   (Suggestion: feature/test-coverage-improvements)
   ```

2. **Validate Branch Name**
   - Check name follows conventions
   - Verify branch doesn't exist
   - Suggest improvements

3. **ASK FOR CONFIRMATION**
   ```
   📋 Create branch
   
   Name: feature/test-coverage-improvements
   Based on: main
   
   This will:
   - Create new branch
   - Switch to new branch
   - Keep current changes
   
   Command: git checkout -b feature/test-coverage-improvements
   
   Proceed? [Y/n]
   ```

4. **Create Branch**
   ```bash
   git checkout -b feature/test-coverage-improvements
   ```

5. **Confirm**
   ```
   ✅ Branch created!
   
   Branch: feature/test-coverage-improvements
   Based on: main (commit a1b2c3d)
   
   You can now:
   - Make changes
   - Commit to this branch
   - Push: git push -u origin feature/test-coverage-improvements
   ```

### 6. Merging Branches

**Triggers**:
- "Merge feature branch"
- "git merge"
- "Merge X into main"

**Process**:
1. **Check Current Branch**
   ```bash
   git branch --show-current
   ```

2. **Show Merge Preview**
   ```
   🔀 Merge preview
   
   Current branch: main
   Merging from: feature/test-coverage-improvements
   
   Commits to merge (5):
   1. a1b2c3d - Added test coverage tracking
   2. b2c3d4e - Updated documentation
   3. c3d4e5f - Fixed coverage calculation
   4. d4e5f6g - Added coverage reports
   5. e5f6g7h - Updated README
   
   Files affected (8):
   - test-index.json
   - 5 documentation files
   - 2 test files
   ```

3. **ASK FOR CONFIRMATION** ⚠️ MANDATORY
   ```
   ⚠️  About to merge feature/test-coverage-improvements into main
   
   This will:
   - Merge 5 commits into main
   - Affect 8 files
   - Cannot be easily undone
   
   ⚠️  Have you:
   - Run tests? ✅ (Required)
   - Updated docs? ✅ (Required)
   - Reviewed changes? (Your confirmation)
   
   Proceed with merge? [Y/n/abort]
   ```

4. **Execute Merge**
   ```bash
   git merge feature/test-coverage-improvements
   ```

5. **Handle Conflicts** (if any)
   ```
   ⚠️  Merge conflicts detected
   
   Conflicting files:
   - documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md (lines 45-52)
   
   Actions:
   1. Show conflicts
   2. Abort merge
   3. I'll resolve manually
   
   Your choice: [1/2/3]
   ```

6. **Confirm Success**
   ```
   ✅ Merged successfully!
   
   Branch: feature/test-coverage-improvements → main
   Commits merged: 5
   Files changed: 8
   
   Next steps:
   - Delete feature branch? git branch -d feature/test-coverage-improvements
   - Push merged changes? git push
   ```

### 7. Integration with test-manager

**After tests pass**:

```javascript
// Receive from test-manager
{
  source: "test-manager",
  action: "commit_test_results",
  message: "✅ Tests: RGPD Consent Categories (12/12 passing)",
  files: [
    "test-index.json",
    "test-reports/rgpd-consent-categories.md"
  ]
}

// git-manager process:
1. ✅ Receive test results
2. ✅ Check which files changed
3. ✅ Generate commit message
4. ⚠️  ASK USER: "Tests passed. Commit results? [Y/n]"
5. If Y: Commit test files
6. ⚠️  ASK USER: "Push to remote? [Y/n]"
7. If Y: Push changes
```

### 8. Integration with docs-manager

**After docs updated**:

```javascript
// Receive from docs-manager
{
  source: "docs-manager",
  action: "commit_documentation",
  message: "📝 Updated consent documentation with test coverage",
  files: [
    "documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md",
    "docs-index.json",
    "INDEX.md"
  ]
}

// git-manager process:
1. ✅ Receive doc changes
2. ✅ Check which files changed
3. ✅ Generate commit message
4. ⚠️  ASK USER: "Docs updated. Commit changes? [Y/n]"
5. If Y: Commit documentation
```

### 9. Complete Workflow Integration

**Full workflow: test → docs → git**:

```
User: "Run tests and commit if they pass"

test-manager:
1. Runs tests
2. All pass ✅
3. Updates test-index.json
4. Signals docs-manager: "Update docs with test results"

docs-manager:
5. Finds related docs
6. ⚠️ ASKS: "Update documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md? [Y/n]"
   User: "Y"
7. Updates documentation
8. Updates docs-index.json
9. Signals git-manager: "Ready to commit"

git-manager:
10. ⚠️ ASKS: "Commit test results + docs?
    Files:
    - test-index.json
    - test-reports/rgpd-consent.md
    - documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md
    - docs-index.json
    
    Message: '✅ Tests: RGPD Consent (12/12) + Updated docs'
    
    Proceed? [Y/n/edit]"
    
User: "Y"

git-manager:
11. ✅ Commits all changes
12. ⚠️ ASKS: "Push to origin/main? [Y/n]"

User: "Y"

git-manager:
13. ✅ Pushes to remote
14. ✅ Reports: "Complete! Tests → Docs → Git ✅"
```

## Commit Message Templates

### Test-Related Commits
```
✅ Tests: [Test Suite] ([X]/[Y] passing)

- Updated test index with results
- [Additional changes]

Files: test-index.json, [test files]
```

### Documentation Commits
```
📝 Updated [Document Name]

- [Change 1]
- [Change 2]

Related: [Test Suite/Feature]
```

### Bug Fix Commits
```
🐛 Fixed [Bug Description]

- [What was wrong]
- [How it's fixed]
- [Tests added]

Fixes: #[issue number]
```

### Feature Commits
```
✨ Added [Feature Name]

- [Feature description]
- [Implementation details]
- [Tests: X/Y passing]

Related docs: [Documentation files]
```

### Refactor Commits
```
♻️ Refactored [Module/Function]

- [What changed]
- [Why changed]
- [Impact]

Tests: All passing ✅
```

## Git Command Reference

### Safe Commands (No Confirmation Needed)
```bash
git status              # Check status
git log                 # View history
git diff                # View changes
git branch              # List branches
git show <commit>       # View commit
git log --graph         # Visual history
```

### Commands Requiring Confirmation
```bash
git add <files>         # Stage files
git commit              # Create commit
git push                # Push to remote
git pull                # Pull from remote
git merge               # Merge branches
git checkout -b         # Create branch
git branch -d           # Delete branch
git reset               # Reset changes
git revert              # Revert commit
```

### Dangerous Commands (Extra Warning)
```bash
git push --force        # Force push
git reset --hard        # Hard reset
git clean -fd           # Delete untracked
git branch -D           # Force delete branch
```

## Error Handling

### Merge Conflicts
```
⚠️  Merge conflict detected

File: documentation/rgpd/CONSENT_IMPLEMENTATION_GUIDE.md
Lines: 45-52

<<<<<<< HEAD
## Test Coverage
Coverage: 92%
=======
## Function Tests
All tests passing
>>>>>>> feature/updates

Actions:
1. Show full conflict
2. Abort merge (git merge --abort)
3. I'll resolve manually

Your choice: [1/2/3]
```

### Push Rejected
```
❌ Push rejected

Reason: Remote has changes you don't have

Solution:
1. Pull first: git pull origin main
2. Resolve conflicts (if any)
3. Try push again

Proceed with pull? [Y/n/abort]
```

### Detached HEAD
```
⚠️  Detached HEAD state detected

You're not on a branch. Changes won't be saved unless
you create a branch.

Actions:
1. Create branch: git checkout -b temp-branch
2. Return to main: git checkout main
3. Show current commit: git show

Your choice: [1/2/3]
```

## Critical Rules

1. **ALWAYS ASK BEFORE COMMIT** - Never commit without user confirmation
2. **ALWAYS ASK BEFORE PUSH** - Never push without user confirmation  
3. **ALWAYS SHOW DIFF** - Let user see what will be committed
4. **ALWAYS VALIDATE BRANCH** - Check branch name before creating
5. **ALWAYS CHECK REMOTE** - Verify remote before pushing
6. **ALWAYS HANDLE CONFLICTS** - Guide user through merge conflicts
7. **NEVER FORCE PUSH** - Unless explicitly requested with extra warning
8. **NEVER AUTO-MERGE** - Always confirm merges
9. **ALWAYS INTEGRATE WITH TESTS** - Only commit if tests pass
10. **ALWAYS GENERATE GOOD MESSAGES** - Create descriptive commit messages

## Integration Summary

### Workflow Chain

```
┌─────────────────┐
│  test-manager   │ Runs tests, tracks results
└────────┬────────┘
         │ Tests pass ✅
         ↓
┌─────────────────┐
│  docs-manager   │ Updates documentation
└────────┬────────┘
         │ Docs updated ✅
         ↓
┌─────────────────┐
│  git-manager    │ Commits & pushes
└─────────────────┘
         │ Committed ✅
         ↓
      Complete!
```

### Data Flow

```javascript
// test-manager → git-manager
{
  files: ["test-index.json", "test-reports/X.md"],
  message: "✅ Tests: X (Y/Z passing)",
  testsPass: true
}

// docs-manager → git-manager  
{
  files: ["GUIDE.md", "docs-index.json"],
  message: "📝 Updated documentation",
  docsUpdated: true
}

// git-manager confirmation
{
  action: "commit",
  files: [...all files...],
  message: "Combined message",
  needsConfirmation: true
}
```

## Success Metrics

A well-managed git workflow should have:
- ✅ All commits have descriptive messages
- ✅ Tests pass before every commit
- ✅ Documentation updated with code
- ✅ Clean commit history
- ✅ No merge conflicts
- ✅ Regular pushes to remote
- ✅ Feature branches for big changes
- ✅ User always confirms before operations

---

*This skill manages version control for Weavink with automated workflows integrating testing and documentation, ensuring code quality and maintainability.*