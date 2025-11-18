# Weavink Main Coding Skill - Complete Package

**Created:** 2024-11-18  
**Version:** 1.0  
**Purpose:** Comprehensive coding standards and patterns for Weavink codebase

---

## 📦 What's in This Package

This package contains everything you need to implement features consistently in the Weavink codebase:

### 1. **WEAVINK_MAIN_CODING_SKILL.md** (Main Reference - 160+ pages)
The comprehensive guide covering:
- ✅ 5-layer architecture (Page → Context → Client Service → API Route → Server Service)
- ✅ Decision trees for where code goes
- ✅ Detailed templates for each layer
- ✅ Cross-cutting concerns (auth, errors, constants, cost tracking)
- ✅ Common workflows
- ✅ Troubleshooting guide
- ✅ Integration with other skills

**Use this:** As your primary reference when implementing features

### 2. **WEAVINK_CODING_QUICK_REFERENCE.md** (Quick Reference Card)
One-page cheat sheet with:
- ✅ Essential code snippets
- ✅ File locations
- ✅ Decision trees
- ✅ Common patterns
- ✅ Pre-commit checklist
- ✅ Quick debug tips

**Use this:** Keep open while coding for quick lookups

### 3. **FEATURE_IMPLEMENTATION_CHECKLIST.md** (Step-by-Step Guide)
Complete checklist for implementing new features:
- ✅ 10 phases from planning to deployment
- ✅ Checkboxes for every step
- ✅ Time estimates
- ✅ Code templates for each phase
- ✅ Testing checklist
- ✅ Git workflow

**Use this:** Follow step-by-step when building new features

---

## 🚀 Quick Start Guide

### For Your First Feature

1. **Read the Quick Reference** (10 minutes)
   - Get familiar with the 5-layer architecture
   - Understand file locations
   - Review naming conventions

2. **Open the Implementation Checklist** (5 minutes)
   - Skim through all 10 phases
   - Get a sense of the workflow
   - Bookmark for easy access

3. **Start Building** (3-7 hours)
   - Follow the checklist step-by-step
   - Use code templates provided
   - Reference main skill for details

4. **Use Quick Reference While Coding**
   - Keep it open in a second window
   - Quick lookups for patterns
   - Pre-commit checklist

### For Ongoing Development

1. **Quick Reference** - Daily companion
2. **Main Skill** - Deep dives when needed
3. **Implementation Checklist** - For new features
4. **Constants Skill** - When working with constants

---

## 📚 Document Guide

### When to Use Each Document

| Situation | Use This Document |
|-----------|------------------|
| "Where does this code go?" | Quick Reference → Decision Trees |
| "How do I implement a feature?" | Implementation Checklist |
| "What's the exact pattern for X?" | Main Skill → Layer X section |
| "My code isn't working" | Main Skill → Troubleshooting |
| "Quick syntax reminder" | Quick Reference |
| "Need a code template" | Implementation Checklist or Main Skill |
| "Working with constants" | Constants Skill |
| "Setting up cost tracking" | Refactoring Guide |

---

## 🏗️ Architecture Overview

### The 5-Layer Pattern

Every feature in Weavink follows this architecture:

```
┌─────────────────────────────────────────────────┐
│ Layer 1: PAGE COMPONENT (page.jsx)             │
│ Purpose: UI, user interactions                  │
│ Location: app/dashboard/(pages)/feature/       │
└─────────────────────────────────────────────────┘
                    ↓ ↑
┌─────────────────────────────────────────────────┐
│ Layer 2: CONTEXT (FeatureContext.js)           │
│ Purpose: State management, data coordination   │
│ Location: app/dashboard/(pages)/feature/       │
└─────────────────────────────────────────────────┘
                    ↓ ↑
┌─────────────────────────────────────────────────┐
│ Layer 3: CLIENT SERVICE (FeatureService.js)    │
│ Purpose: HTTP calls, caching, subscriptions    │
│ Location: lib/services/serviceFeature/client/  │
└─────────────────────────────────────────────────┘
                    ↓ ↑
┌─────────────────────────────────────────────────┐
│ Layer 4: API ROUTE (route.js)                  │
│ Purpose: Auth, validation, orchestration       │
│ Location: app/api/user/feature/                │
└─────────────────────────────────────────────────┘
                    ↓ ↑
┌─────────────────────────────────────────────────┐
│ Layer 5: SERVER SERVICE (featureService.js)    │
│ Purpose: Business logic, database operations   │
│ Location: lib/services/serviceFeature/server/  │
└─────────────────────────────────────────────────┘
```

### Data Flow Example

```
User clicks button
    ↓
Page Component calls context method
    ↓
Context calls Client Service
    ↓
Client Service makes HTTP request
    ↓
API Route validates & calls Server Service
    ↓
Server Service updates Firestore
    ↓
Response bubbles back up
    ↓
UI updates with new data
```

---

## 🎯 Core Principles

### 1. **Separation of Concerns**
Each layer has ONE job:
- Page = Render UI
- Context = Manage state
- Client Service = Call APIs
- API Route = Validate & orchestrate
- Server Service = Business logic & database

### 2. **Constants Over Magic Strings**
```javascript
// ❌ BAD
if (user.subscription === 'pro') { ... }

// ✅ GOOD
if (user.subscription === SUBSCRIPTION_LEVELS.PRO) { ... }
```

### 3. **Permission Checks Everywhere**
```javascript
// In API Route
if (!session.permissions[FEATURE_CONSTANTS.CREATE]) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// In Component
const canCreate = session?.permissions?.[FEATURE_CONSTANTS.CREATE];
{canCreate && <CreateButton />}
```

### 4. **Consistent Error Handling**
```javascript
// API routes return structured errors
try {
  // ...
} catch (error) {
  console.error('❌ Operation failed:', error);
  return NextResponse.json({ error: 'Friendly message' }, { status: 500 });
}

// Components show user-friendly messages
try {
  await createItem(data);
  toast.success('Created!');
} catch (error) {
  toast.error(error.message || 'Failed to create');
}
```

### 5. **Service-Level Caching**
```javascript
// Client services implement caching
let cache = {
  data: null,
  expiry: null
};

static async getData(force = false) {
  if (!force && cache.data && Date.now() < cache.expiry) {
    return cache.data; // Return cached
  }
  // ... fetch fresh data
}
```

---

## 📝 File Naming Conventions

```
✅ page.jsx                 (pages)
✅ route.js                 (API routes)
✅ FeatureContext.js        (contexts - PascalCase)
✅ FeatureService.js        (client services - PascalCase)
✅ featureService.js        (server services - camelCase)
✅ FEATURE_CONSTANTS        (constants - SCREAMING_SNAKE_CASE)
```

---

## 🔗 Related Skills

This main coding skill integrates with:

### **Weavink Constants Management Skill**
- Where constants are defined
- How to import from barrel
- Decision tree for constant placement
- See: `Weavink_Constants_Management_Skill.md`

### **Cost Tracking Refactoring Guide**
- When to track costs
- Session vs standalone tracking
- Using API cost constants
- See: `REFACTORING_GUIDE.md`

### **Session Management** (Reference in main skill)
- Getting session in API routes
- Permission checks
- Team context handling

---

## ✅ Pre-Commit Checklist

Before committing ANY code:

### Constants & Imports
- [ ] All imports use barrel: `from '@/lib/services/constants'`
- [ ] No magic strings ('pro', 'base', 'premium', etc.)
- [ ] Constants use SCREAMING_SNAKE_CASE
- [ ] No direct imports from domain files

### Architecture
- [ ] Code follows 5-layer pattern
- [ ] Clear separation of concerns
- [ ] No circular dependencies
- [ ] Proper file locations

### Authentication & Permissions
- [ ] API routes call `createApiSession(request)` first
- [ ] Permission checks before business logic
- [ ] Token caching implemented (50-min in client services)

### Error Handling
- [ ] Try-catch blocks around all async operations
- [ ] User-friendly error messages
- [ ] Loading states in components
- [ ] Error states in components

### Firebase
- [ ] No mixing of client & server Firebase SDKs
- [ ] Client SDK only in client services
- [ ] Admin SDK only in server services

### Code Quality
- [ ] No ESLint errors
- [ ] No console.log in production code
- [ ] Comments for complex logic
- [ ] Descriptive variable names

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module '@/lib/services/constants'"
**Solution:** Check barrel file exists, restart TS server

### Issue: "Permission denied" with correct subscription
**Solution:** Check session, verify constant spelling, force refresh

### Issue: "Circular dependency detected"
**Solution:** Move shared constants to core, no domain-to-domain imports

### Issue: Cache not invalidating
**Solution:** Call `invalidateCache()` after mutations

### Issue: Real-time updates not working
**Solution:** Verify using client SDK, check subscription setup

### Issue: "Token expired" errors
**Solution:** Implement 50-minute token cache

**See Main Skill → Troubleshooting for complete list**

---

## 📊 Typical Feature Timeline

Based on complexity:

### Simple CRUD Feature
- Planning: 15 minutes
- Implementation: 2-3 hours
- Testing: 30 minutes
- Documentation: 15 minutes
- **Total: 3-4 hours**

### Medium Feature (with integrations)
- Planning: 30 minutes
- Implementation: 3-5 hours
- Testing: 1 hour
- Documentation: 30 minutes
- **Total: 5-7 hours**

### Complex Feature (multiple sub-features)
- Planning: 1 hour
- Implementation: 6-10 hours
- Testing: 2 hours
- Documentation: 1 hour
- **Total: 10-14 hours (1-2 days)**

---

## 💡 Best Practices

### Do's ✅
1. **Follow existing patterns** - Look at similar features first
2. **Use templates** - Copy from Implementation Checklist
3. **Test as you go** - Don't wait until the end
4. **Keep it simple** - Don't over-engineer
5. **Document decisions** - Future you will thank you
6. **Use constants** - No magic strings ever
7. **Check permissions** - At every layer

### Don'ts ❌
1. **Don't skip planning** - Saves hours of refactoring
2. **Don't mix concerns** - Keep layers separate
3. **Don't skip error handling** - Users need feedback
4. **Don't hardcode** - Use constants and config
5. **Don't forget loading states** - Users need feedback
6. **Don't mix Firebase SDKs** - Client vs server
7. **Don't skip testing** - Catch bugs early

---

## 🎓 Learning Path

### Week 1: Foundations
- [ ] Read Quick Reference (10 min)
- [ ] Skim Main Skill (1 hour)
- [ ] Read Implementation Checklist (20 min)
- [ ] Study one existing feature (30 min)

### Week 2: First Feature
- [ ] Follow Implementation Checklist
- [ ] Build a simple CRUD feature
- [ ] Get code review feedback
- [ ] Iterate based on feedback

### Week 3: Patterns
- [ ] Implement real-time subscriptions
- [ ] Add complex permission checks
- [ ] Work with team context
- [ ] Add cost tracking

### Week 4: Mastery
- [ ] Build complex feature independently
- [ ] Help review others' code
- [ ] Suggest improvements to skills
- [ ] Document new patterns

---

## 🔄 Skill Maintenance

This skill is a living document. Please:

### When You Find Issues
1. Document the issue
2. Note the solution
3. Suggest addition to skill

### When You Discover Patterns
1. Document the pattern
2. Add example code
3. Update checklist if needed

### Regular Reviews
- Review quarterly
- Update with new patterns
- Remove outdated practices
- Add new examples

---

## 📞 Getting Help

### For Quick Questions
1. Check Quick Reference
2. Search Main Skill
3. Look at similar features

### For Complex Issues
1. Review Troubleshooting section
2. Check related skills (Constants, Cost Tracking)
3. Create detailed issue with:
   - What you're trying to do
   - What you've tried
   - Error messages
   - Code snippets

### For Architecture Questions
1. Review architecture overview in Main Skill
2. Look at existing feature implementations
3. Use decision trees
4. Discuss with team

---

## 🎯 Success Metrics

You're successfully using this skill when:

- [ ] New features follow 5-layer pattern consistently
- [ ] No magic strings in codebase
- [ ] All imports use barrel file
- [ ] Permission checks at every layer
- [ ] Consistent error handling
- [ ] Service-level caching implemented
- [ ] Loading & error states in all UIs
- [ ] Features work across all subscription levels
- [ ] Code reviews mention fewer architecture issues
- [ ] New team members can follow patterns easily

---

## 📚 Complete File List

```
WEAVINK_MAIN_CODING_SKILL.md           # 160+ page comprehensive guide
WEAVINK_CODING_QUICK_REFERENCE.md      # One-page cheat sheet
FEATURE_IMPLEMENTATION_CHECKLIST.md    # Step-by-step checklist
README.md                               # This file
```

### Related Skills (Separate Files)
```
Weavink_Constants_Management_Skill.md  # Constants guide
REFACTORING_GUIDE.md                    # Cost tracking patterns
```

---

## 🚀 Next Steps

### Immediate (Next Hour)
1. [ ] Read Quick Reference
2. [ ] Bookmark all skill files
3. [ ] Review one existing feature

### Short-Term (This Week)
1. [ ] Read full Main Skill (section by section)
2. [ ] Follow Implementation Checklist for new feature
3. [ ] Get familiar with patterns

### Medium-Term (This Month)
1. [ ] Implement multiple features using skills
2. [ ] Contribute improvements to skills
3. [ ] Help others with the patterns

### Long-Term (This Quarter)
1. [ ] Master all patterns
2. [ ] Suggest architectural improvements
3. [ ] Help onboard new team members

---

## ✨ Final Tips

1. **Don't try to memorize everything** - Use as reference
2. **Start with templates** - Customize as needed
3. **Follow the checklist** - Ensures nothing is missed
4. **Look at existing code** - Real examples are best teachers
5. **Ask questions** - Better than guessing
6. **Document learnings** - Help future you and others
7. **Have fun!** - Good architecture makes coding enjoyable

---

**Happy Coding! 🎉**

---

## 📄 License

Internal use only - Weavink/Tapit SAS  
© 2024 All rights reserved

---

## 📝 Version History

**v1.0 - 2024-11-18**
- Initial release
- Complete 5-layer architecture
- Integration with Constants Skill
- Integration with Cost Tracking
- Comprehensive templates and examples
- Step-by-step implementation checklist
- Quick reference card

---

**Questions? Feedback? Improvements?**

This is a living document. Your feedback makes it better!
