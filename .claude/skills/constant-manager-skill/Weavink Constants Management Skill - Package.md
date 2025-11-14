# Weavink Constants Management Skill - Package

This package contains a comprehensive constants management skill for the Weavink codebase, along with a Claude Code analysis prompt to gather additional information and validate the current implementation.

## 📦 What's Included

### 1. **weavink-constants-skill.md** (Main Skill File)
The complete constants management skill that covers:
- ✅ Barrel export pattern (single import point)
- ✅ Three-tier architecture (Core → Domain → Barrel)
- ✅ Naming conventions and file organization
- ✅ Decision trees for where constants belong
- ✅ Integration with session/permission system
- ✅ Common patterns and best practices
- ✅ Migration strategies
- ✅ Testing and validation
- ✅ Troubleshooting guide

**Total Coverage:** ~500 lines of comprehensive documentation with code examples

### 2. **claude-code-constants-analysis-prompt.md** (Analysis Tool)
A structured prompt to run in Claude Code that will:
- 🔍 Analyze your current constants architecture
- 📊 Map dependencies and usage patterns
- ⚠️ Identify issues (magic strings, direct imports, circular dependencies)
- ✅ Verify consistency across the codebase
- 💡 Provide specific recommendations and fixes
- 📝 Generate additions for the skill file based on real findings

**Output:** 9 comprehensive phases of analysis with actionable insights

## 🚀 How to Use

### Step 1: Review the Main Skill

1. Open `weavink-constants-skill.md`
2. Read through the architecture overview
3. Understand the three-tier system
4. Review the decision trees and patterns
5. Familiarize yourself with best practices

**Key Sections to Focus On:**
- "Barrel Export Pattern" - The foundation of the system
- "Decision Tree: Where Does This Constant Belong?" - When adding new constants
- "Integration with Session & Permissions" - How constants drive your permission system
- "Common Patterns" - Real-world usage examples

### Step 2: Run the Claude Code Analysis

1. Open your terminal in the Weavink project root
2. Run Claude Code: `claude-code`
3. Copy the entire contents of `claude-code-constants-analysis-prompt.md`
4. Paste it into Claude Code
5. Wait for the comprehensive analysis (may take 5-10 minutes)

**What Claude Code Will Do:**
```
Phase 1: File Structure Analysis
  → Find all constants files
  → Verify barrel file structure
  → Map the architecture

Phase 2: Dependency Analysis  
  → Check for circular dependencies
  → Verify import patterns
  → Create dependency graph

Phase 3: Usage Analysis
  → Find magic strings in code
  → Check import pattern violations
  → Count usage of each constant

Phase 4: Value Consistency
  → Verify all subscription levels have limits
  → Check all roles have permissions
  → Find orphaned constants

Phase 5: Naming Convention Check
  → Verify SCREAMING_SNAKE_CASE
  → Check file naming patterns

Phase 6: Session Integration
  → Analyze how constants integrate with session.js
  → Map permission calculation flow

Phase 7: Undocumented Patterns
  → Find unusual patterns
  → Locate test coverage
  → Identify edge cases

Phase 8: Recommendations
  → Critical issues to fix immediately
  → Improvements to make
  → Nice-to-have enhancements

Phase 9: Skill File Additions
  → Suggest new content for skill
  → Provide real code examples
  → Add warnings based on findings
```

### Step 3: Review the Analysis Results

Claude Code will output structured findings. Review each section:

1. **Critical Issues** (🚨 Red flags)
   - Fix these immediately
   - Usually: circular dependencies, magic strings, security issues

2. **Improvements** (⚠️ Yellow flags)
   - Address these soon
   - Usually: missing limits, inconsistent naming, orphaned constants

3. **Enhancements** (💡 Green suggestions)
   - Consider for future iterations
   - Usually: better organization, additional tests, documentation

### Step 4: Update the Skill File

Based on Claude Code's findings:

1. **Add Real Examples:**
   - Replace generic examples with actual code from your codebase
   - Add specific file paths and line numbers

2. **Document Edge Cases:**
   - Add any unusual patterns found
   - Document workarounds or special cases

3. **Update Decision Trees:**
   - Refine based on actual usage patterns
   - Add clarifications for ambiguous cases

4. **Enhance Troubleshooting:**
   - Add issues found in your codebase
   - Document how they were solved

### Step 5: Fix Issues in Your Codebase

Use the analysis to improve your code:

1. **Fix Magic Strings:**
   ```bash
   # Example: Find all hardcoded subscription levels
   grep -r "'pro'" app/ lib/ --include="*.js" --include="*.jsx"
   
   # Replace with constants
   # Before: if (user.subscriptionLevel === 'pro')
   # After:  if (user.subscriptionLevel === SUBSCRIPTION_LEVELS.PRO)
   ```

2. **Fix Direct Imports:**
   ```bash
   # Find direct imports bypassing barrel
   grep -r "from.*serviceContact.*constants" app/ lib/ --include="*.js"
   
   # Replace with barrel imports
   # Before: import { X } from '@/lib/services/serviceContact/.../contactConstants'
   # After:  import { X } from '@/lib/services/constants'
   ```

3. **Add Missing Limits:**
   - Check which subscription levels lack limits in domain files
   - Add complete limit objects for all levels

4. **Fix Circular Dependencies:**
   - Move shared constants to core
   - Remove domain-to-domain imports

## 📁 File Structure Reference

After implementing this skill, your constants should look like:

```
lib/services/
├── constants.js                              # 🎯 Barrel (single import point)
│   ├─ export * from './core/constants'
│   ├─ export * from './serviceContact/.../contactConstants'
│   └─ export * from './service*/.../constants'
│
├── core/
│   └── constants.js                         # 🏛️ Core (foundation)
│       ├─ SUBSCRIPTION_LEVELS
│       ├─ ORGANIZATION_ROLES
│       ├─ TEAM_ROLES
│       ├─ TEAM_ROLE_HIERARCHY
│       └─ INVITATION_STATUS
│
└── service*/
    └── constants/
        └── *Constants.js                    # 🎨 Domain-specific
            ├─ {DOMAIN}_FEATURES
            ├─ {DOMAIN}_LIMITS
            └─ {DOMAIN}_CONFIG
```

## 🎯 Quick Start Checklist

Use this checklist when working with constants:

### When Adding a New Constant:

- [ ] Determine location using decision tree
  - [ ] Used by 3+ domains? → Core constants
  - [ ] Fundamental concept (roles/levels)? → Core constants  
  - [ ] Domain-specific? → Domain constants
  
- [ ] Create/update appropriate file
  - [ ] Use SCREAMING_SNAKE_CASE naming
  - [ ] Add JSDoc comments for complex constants
  - [ ] Group related constants together
  
- [ ] Update barrel file (if new domain)
  - [ ] Add export line to `lib/services/constants.js`
  - [ ] Maintain order (core first, then domains)
  
- [ ] Verify imports
  - [ ] All imports use barrel: `from '@/lib/services/constants'`
  - [ ] No direct imports from domain files
  
- [ ] Update related systems
  - [ ] Add to session permission calculation if needed
  - [ ] Update UI components that check the constant
  - [ ] Add validation tests

### When Refactoring Constants:

- [ ] Search for all usages
  - [ ] Use IDE's "Find Usages" feature
  - [ ] Check for magic strings to replace
  
- [ ] Update imports
  - [ ] Ensure all use barrel file
  - [ ] Remove any direct imports
  
- [ ] Run tests
  - [ ] `npm run build` or `npm run lint`
  - [ ] Check for import errors
  - [ ] Validate constant usage
  
- [ ] Update documentation
  - [ ] Update constant file docs
  - [ ] Update architecture overview
  - [ ] Add migration notes if needed

## 🔧 Integration with Other Skills

This constants skill is designed to work with other skills:

### Main Coding Skill (Future)
The main coding skill will reference this constants skill for:
- Proper import patterns
- Permission checking patterns
- Feature flag usage
- Limit enforcement

Example reference in main coding skill:
```markdown
When implementing a new feature:
1. Check if constants are needed (see Constants Skill)
2. Add feature flag if needed (see Constants Skill - Feature Flags pattern)
3. Define limits per subscription level (see Constants Skill - Limits pattern)
4. Import from barrel file (see Constants Skill - Import Patterns)
```

### Session Management Skill (Future)
Will reference how constants integrate with session:
- Permission calculation using constants
- Limit checking using constants
- Role hierarchy using constants

### Testing Skill (Future)
Will reference how to test constants:
- Validation tests
- Coverage tests
- Integration tests with session

## 📊 Success Metrics

After implementing this skill, you should see:

1. **Code Quality:**
   - ✅ Zero magic strings for subscription levels, roles, features
   - ✅ All imports use barrel file pattern
   - ✅ No circular dependencies
   - ✅ Consistent naming conventions

2. **Maintainability:**
   - ✅ Single source of truth for all constants
   - ✅ Easy to add new constants (clear decision tree)
   - ✅ Easy to refactor (imports don't break)
   - ✅ Clear documentation for all constants

3. **Developer Experience:**
   - ✅ Autocomplete works for all constants
   - ✅ TypeScript inference works correctly
   - ✅ Easy to understand constant purpose
   - ✅ Quick to find constant definition

4. **System Reliability:**
   - ✅ Permission system uses constants consistently
   - ✅ All subscription levels have complete limits
   - ✅ All roles have complete permissions
   - ✅ No undefined constant references

## 🐛 Common Issues and Solutions

### Issue: "I don't know where to put this constant"
**Solution:** Use the decision tree in the skill file
- Is it used by 3+ domains? → Core
- Is it a fundamental concept? → Core
- Is it domain-specific? → Domain constants
- Still unsure? → Post in Phase 7 of the analysis

### Issue: "Import not working"
**Solution:** 
1. Check barrel file has export for the constant
2. Verify you're importing from barrel, not direct
3. Restart TypeScript server if needed
4. Check constant name spelling

### Issue: "Circular dependency detected"
**Solution:**
1. Identify the cycle using Phase 2 analysis
2. Move shared constants to core
3. Remove domain-to-domain imports
4. Only import from core in domain files

### Issue: "Magic strings still in code"
**Solution:**
1. Run Phase 3 analysis to find all occurrences
2. Create constant if it doesn't exist
3. Replace magic string with constant import
4. Add to CI/CD to prevent future magic strings

## 📚 Additional Resources

### Documentation Files to Review:
- `lib/services/core/constants.js` - Core constant definitions
- `lib/services/constants.js` - Barrel file structure
- `lib/server/session.js` - How constants integrate with permissions

### Patterns to Study:
- Feature flags in `contactConstants.js`
- Permission maps in `enterpriseConstants.js`
- Config objects in domain constants

### Related Architecture:
- Session management system
- Permission calculation flow
- Subscription service integration

## 🎓 Next Steps

1. **Immediate:**
   - [ ] Review main skill file
   - [ ] Run Claude Code analysis
   - [ ] Fix critical issues found

2. **Short-term (This Week):**
   - [ ] Fix all magic strings
   - [ ] Update direct imports to barrel
   - [ ] Add missing limits for subscription levels
   - [ ] Update skill file with real examples

3. **Medium-term (This Month):**
   - [ ] Create constant validation tests
   - [ ] Add TypeScript types for constants
   - [ ] Document all constants in code
   - [ ] Create main coding skill that references this

4. **Long-term (This Quarter):**
   - [ ] Add CI/CD checks for constant patterns
   - [ ] Create developer guidelines document
   - [ ] Train team on constants system
   - [ ] Regular audits of constant usage

## 💬 Feedback and Improvements

As you use this skill and the analysis tool:

1. **Track Issues Found:**
   - Document patterns not covered in the skill
   - Note areas where guidance is unclear
   - Record common mistakes or confusion points

2. **Enhance the Skill:**
   - Add new patterns discovered
   - Include real examples from your codebase
   - Clarify decision trees based on actual usage
   - Add troubleshooting sections for recurring issues

3. **Share Findings:**
   - Document unusual patterns for the team
   - Create internal guides if needed
   - Update onboarding materials

## 📞 Support

If you encounter issues or have questions:

1. **Re-run Analysis:** Often reveals the root cause
2. **Check Skill File:** Search for relevant section
3. **Review Examples:** Compare your code to skill examples
4. **Ask Specific Questions:** With file paths and code snippets

---

## Summary

You now have:
1. ✅ **Comprehensive skill file** - Complete guide to constants management
2. ✅ **Analysis tool** - Claude Code prompt to audit your codebase
3. ✅ **Action plan** - Step-by-step process to implement and improve
4. ✅ **Reference materials** - Quick checklists and troubleshooting guides

**Next Action:** Run the Claude Code analysis to see how your current implementation compares to the skill guidelines, then use the findings to improve both your code and the skill documentation.

Good luck! 🚀