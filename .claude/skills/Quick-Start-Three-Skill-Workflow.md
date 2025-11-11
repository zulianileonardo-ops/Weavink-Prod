# 🚀 Quick Start: Three-Skill Workflow

**Test → Document → Commit in 5 Minutes**

---

## Install Everything (30 seconds)

```bash
bash /mnt/user-data/outputs/install-all-skills.sh
```

That's it! All three skills installed.

---

## Initialize Indexes (30 seconds)

```bash
# 1. Initialize test index
cp ~/.claude/skills/test-manager/test-index-template.json ~/temp2/temp2/test-index.json

# 2. Your docs-index.json and INDEX.md should already exist
# If not, Claude Code will help you create them

# 3. Navigate to your project
cd ~/temp2/temp2
```

---

## Start Claude Code (10 seconds)

```bash
claude
```

---

## Verify Skills (10 seconds)

Ask Claude Code:
```
What skills are available?
```

You should see:
- ✅ **docs-manager** - Documentation management
- ✅ **test-manager** - Test management  
- ✅ **git-manager** - Version control

---

## Your First Workflow (2 minutes)

### Option 1: Full Workflow (Recommended)

```
You: "Run the RGPD consent tests and commit if they pass"

Claude Code will:
1. ✅ Run tests → 8/8 passing
2. ⚠️ Ask: "Update CONSENT_IMPLEMENTATION_GUIDE.md? [Y/n]"
3. ✅ Update docs → 3 files updated
4. ⚠️ Ask: "Commit changes? [Y/n]"
5. ✅ Create commit
6. ⚠️ Ask: "Push to remote? [Y/n]"
7. ✅ Push changes

Done! ✨
```

### Option 2: Step by Step

```
# Step 1: Just test
You: "Run the RGPD consent tests"
→ Tests run, results saved

# Step 2: Update docs
You: "Update CONSENT_IMPLEMENTATION_GUIDE.md with test coverage"
→ Docs updated

# Step 3: Commit
You: "Commit my changes"
→ Git commit + push
```

### Option 3: Test Only

```
You: "Run RGPD consent tests but don't update docs or commit"
→ Tests run
→ Results saved to test-index.json
→ Workflow stops
```

---

## Common Commands

### Running Tests

```
"Run the RGPD consent tests"
"Run all RGPD tests"
"Test the query enhancement"
"What's our test coverage?"
```

### Documentation

```
"Update the consent documentation"
"Find docs about login"
"Create a guide for my new feature"
"Link tests to documentation"
```

### Git Operations

```
"Show git status"
"Commit my changes"
"Push to remote"
"Create branch feature/my-feature"
"Show me the diff"
```

### Complete Workflows

```
"Run tests and commit if they pass"
"Test, document, and commit everything"
"Run RGPD tests, update docs, and push"
```

---

## What You'll See

### When Tests Run

```
🧪 Running RGPD Consent Tests...

Executing: node -r dotenv/config runConsentTests.mjs

✅ Results:
- Total: 8 tests
- Passed: 8 ✅
- Failed: 0
- Success Rate: 100%
- Duration: 1.8s

📋 Tested Functions:
- recordConsent
- getUserConsents
- hasConsent
- batchGrantConsents
- getConsentHistory
- withdrawConsent

📄 Related Documentation:
- CONSENT_IMPLEMENTATION_GUIDE.md
- RGPD_TESTING_GUIDE.md

✅ Test index updated
```

### When Docs Update

```
📝 Updating CONSENT_IMPLEMENTATION_GUIDE.md

Proposed changes:
- Add test coverage section
- Update function documentation:
  * recordConsent: Tested ✅ (8 tests, 100%)
  * getUserConsents: Tested ✅ (8 tests, 100%)
  * hasConsent: Tested ✅ (8 tests, 100%)
- Link to test suite: runConsentTests.mjs

Proceed? [Y/n/preview]
```

### When Git Commits

```
📋 Ready to commit

Files to commit:
- test-index.json (test results)
- CONSENT_IMPLEMENTATION_GUIDE.md (updated docs)
- docs-index.json (updated index)

Suggested commit message:
"✅ Tests: RGPD Consent (8/8 passing) + Updated docs"

Options:
1. Commit with this message
2. Edit message
3. Show diff
4. Cancel

Your choice: [1/2/3/4]
```

---

## Key Features

### 🤖 Automatic Integration

The skills work together automatically:
- Tests pass → Docs update → Git commits
- You control each step with confirmations
- No manual coordination needed

### ⚠️ Always Safe

Every skill asks before doing anything:
- ✅ test-manager asks before running tests (if destructive)
- ✅ docs-manager asks before updating documentation
- ✅ git-manager asks before every commit/push

### 📊 Full Tracking

Everything is tracked and linked:
- Tests tracked in test-index.json
- Docs tracked in docs-index.json  
- Tests linked to docs
- Docs linked to tests
- Git commits reference both

### 🎯 Your Control

You decide at every step:
- Run full workflow or individual parts
- Approve or reject changes
- Edit messages before committing
- Cancel at any point

---

## Examples

### Example 1: New Feature

```
# 1. Create feature
[You write code for new feature]

# 2. Write tests
[You write tests for new feature]

# 3. Full workflow
You: "Run my new feature tests and commit everything"

Result:
→ Tests run (10/10 passing)
→ Docs updated with test coverage
→ Git commit + push
✅ Done!
```

### Example 2: Bug Fix

```
# 1. Fix bug
[You fix the bug]

# 2. Run tests
You: "Run the affected tests"

Result:
→ Tests run (all passing)
→ You: "Just commit the fix, don't update docs yet"
→ Git commits fix only
✅ Quick fix deployed!
```

### Example 3: Documentation Sprint

```
# 1. Check test coverage
You: "What's our test coverage?"

Result:
→ Shows: 92% overall coverage
→ Identifies untested functions

# 2. Update docs for tested functions
You: "Update all documentation with test coverage"

Result:
→ Updates 15 guides with test info
→ Links all functions to their tests

# 3. Commit documentation
You: "Commit the documentation updates"

Result:
→ Commits all updated docs
→ Descriptive commit message
✅ Docs up to date!
```

---

## Troubleshooting

### Skills Don't Appear

```bash
# Check installation
ls ~/.claude/skills/

# Should see:
# docs-manager/
# test-manager/
# git-manager/

# Restart Claude Code
cd ~/temp2/temp2
claude
```

### Tests Won't Run

```
# Check test files exist
ls runConsentTests.mjs

# Check environment
cat .env  # Should have credentials

# Try manual run
node -r dotenv/config runConsentTests.mjs
```

### Docs Won't Update

```
# Check docs exist
ls CONSENT_IMPLEMENTATION_GUIDE.md

# Check docs-index.json exists
cat docs-index.json

# Ask Claude Code
"Why can't you update the documentation?"
```

### Git Won't Commit

```
# Check git status
git status

# Check if you have changes
git diff

# Ask Claude Code
"Show me git status"
```

---

## Configuration

### Test Index Location

Default: `~/temp2/temp2/test-index.json`

To use different location, ask Claude Code:
```
"Store test index in ~/my-project/test-index.json"
```

### Docs Location

Default: `~/temp2/temp2/` for all .md files

Your docs are wherever you put them!

### Git Settings

Uses your existing git configuration:
- Remote: From .git/config
- Branch: Current branch
- Credentials: Your SSH/HTTPS setup

---

## Pro Tips

### 1. Run Tests Before Committing

```
✅ ALWAYS: Test → Document → Commit

Never commit untested code!
```

### 2. Review Before Approving

```
At each confirmation:
1. Read what will change
2. Check if it's correct
3. Then approve

Each skill shows you exactly what it will do
```

### 3. Use Feature Branches

```
For big changes:
1. "Create branch feature/my-feature"
2. Work on feature branch
3. "Merge when tests pass"
```

### 4. Keep Docs Updated

```
After every test run:
"Update related documentation"

Docs stay in sync with code
```

---

## Next Steps

Now that you're set up:

1. **Read the full integration guide:**
   ```bash
   cat /mnt/user-data/outputs/SKILLS_INTEGRATION_GUIDE.md
   ```

2. **Try the full workflow:**
   ```
   "Run RGPD tests and commit if they pass"
   ```

3. **Explore each skill:**
   - test-manager: `cat ~/.claude/skills/test-manager/SKILL.md`
   - docs-manager: `cat ~/.claude/skills/docs-manager/SKILL.md`
   - git-manager: `cat ~/.claude/skills/git-manager/SKILL.md`

4. **Customize for your project:**
   - Add your test files to test-index.json
   - Link tests to documentation
   - Set up your git workflow

---

## Support

### Questions?

Ask Claude Code:
```
"How do I use the test-manager skill?"
"Show me an example of the full workflow"
"What's the difference between test-manager and docs-manager?"
```

### Documentation

- **Integration Guide**: `/mnt/user-data/outputs/SKILLS_INTEGRATION_GUIDE.md`
- **Individual Skills**: `~/.claude/skills/[skill-name]/SKILL.md`

### Troubleshooting

If something doesn't work:
1. Check that all skills are installed
2. Verify index files exist
3. Try individual skills separately
4. Ask Claude Code for help

---

**You're all set!** 🎉

Just say:
```
"Run my tests and commit if they pass"
```

The skills will handle the rest! 🚀

---

**Total Setup Time**: ~5 minutes
**Time Saved**: Hours per week
**Automation**: Test → Document → Commit
**Control**: You approve each step
