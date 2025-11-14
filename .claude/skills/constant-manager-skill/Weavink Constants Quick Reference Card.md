# Weavink Constants Quick Reference Card

Keep this handy while coding! 📌

## 🎯 Golden Rules

1. **ALWAYS import from barrel:** `from '@/lib/services/constants'`
2. **NEVER import directly from domain files**
3. **Use constants, not magic strings**
4. **SCREAMING_SNAKE_CASE for all constants**

---

## 📥 Import Pattern (Copy & Paste)

```javascript
// ✅ ALWAYS USE THIS
import { 
  SUBSCRIPTION_LEVELS,
  CONTACT_FEATURES,
  PERMISSIONS,
  TEAM_ROLES
} from '@/lib/services/constants';

// ❌ NEVER DO THIS
import { CONTACT_FEATURES } from '@/lib/services/serviceContact/.../contactConstants';
```

---

## 🗂️ File Structure

```
lib/services/
├── constants.js              # 🎯 Import from here
├── core/constants.js         # Core (roles, levels)
└── service*/constants/       # Domain-specific
    └── *Constants.js
```

---

## 🤔 Decision Tree: Where Does My Constant Go?

```
Is it used by 3+ domains?
  YES → core/constants.js
  NO ↓

Is it fundamental (Roles, Levels, Status)?
  YES → core/constants.js
  NO ↓

Is it domain-specific (contacts, appearance, etc)?
  YES → service{Domain}/constants/{domain}Constants.js
  NO → Re-evaluate or ask for help
```

---

## 📝 Common Patterns

### Pattern 1: Feature Flag
```javascript
export const CONTACT_FEATURES = {
  BASIC_CONTACTS: 'BASIC_CONTACTS',
  AI_SCANNER: 'AI_SCANNER',
  SEMANTIC_SEARCH: 'SEMANTIC_SEARCH'
};

// Usage in code
if (session.permissions[CONTACT_FEATURES.AI_SCANNER]) {
  // Show AI scanner
}
```

### Pattern 2: Subscription Limits
```javascript
export const CONTACT_LIMITS = {
  [SUBSCRIPTION_LEVELS.BASE]: {
    maxContacts: 100,
    features: [CONTACT_FEATURES.BASIC_CONTACTS]
  },
  [SUBSCRIPTION_LEVELS.PRO]: {
    maxContacts: 1000,
    features: [
      CONTACT_FEATURES.BASIC_CONTACTS,
      CONTACT_FEATURES.AI_SCANNER
    ]
  }
};

// Usage in code
const limits = CONTACT_LIMITS[session.subscriptionLevel];
if (count >= limits.maxContacts) {
  throw new Error('Limit reached');
}
```

### Pattern 3: Permission Check
```javascript
// In API route
if (!session.permissions[CONTACT_FEATURES.AI_SCANNER]) {
  return NextResponse.json(
    { error: 'Requires Pro subscription' },
    { status: 403 }
  );
}

// Team permission
const sm = new SessionManager(session);
if (!sm.hasTeamPermission(PERMISSIONS.CAN_INVITE, teamId)) {
  return NextResponse.json(
    { error: 'Insufficient permissions' },
    { status: 403 }
  );
}
```

---

## ✅ Pre-Commit Checklist

Before committing code with constants:

- [ ] All imports use barrel file
- [ ] No magic strings (check for 'pro', 'base', 'premium', etc.)
- [ ] Constant names use SCREAMING_SNAKE_CASE
- [ ] If new domain constant file: added to barrel exports
- [ ] If new core constant: used by 3+ domains
- [ ] No domain-to-domain imports (only core → domain)

---

## 🚨 Common Mistakes

### ❌ Magic Strings
```javascript
// BAD
if (user.subscriptionLevel === 'pro') { }

// GOOD  
if (user.subscriptionLevel === SUBSCRIPTION_LEVELS.PRO) { }
```

### ❌ Direct Import
```javascript
// BAD
import { X } from '@/lib/services/serviceContact/.../contactConstants';

// GOOD
import { X } from '@/lib/services/constants';
```

### ❌ Wrong Naming
```javascript
// BAD
export const contactFeatures = { ... };
export const Contact_Features = { ... };

// GOOD
export const CONTACT_FEATURES = { ... };
```

### ❌ Domain-to-Domain Import
```javascript
// BAD - in contactConstants.js
import { PERMISSIONS } from '../serviceEnterprise/constants/enterpriseConstants';

// GOOD - move PERMISSIONS to core if shared
import { PERMISSIONS } from '../../core/constants';
```

---

## 🔍 Quick Debug

### "Cannot find module '@/lib/services/constants'"
1. Check barrel file exists
2. Verify path alias in tsconfig.json
3. Check spelling/capitalization

### "Circular dependency detected"
1. Check if importing between domain files
2. Move shared constant to core
3. Only import from core in domains

### "Constant undefined at runtime"
1. Check constant is exported in domain file
2. Check domain file is exported in barrel
3. Restart TypeScript server

---

## 📖 Common Constants Reference

```javascript
// Subscription Levels
SUBSCRIPTION_LEVELS.BASE
SUBSCRIPTION_LEVELS.PRO
SUBSCRIPTION_LEVELS.PREMIUM
SUBSCRIPTION_LEVELS.BUSINESS
SUBSCRIPTION_LEVELS.ENTERPRISE

// Team Roles
TEAM_ROLES.OWNER
TEAM_ROLES.MANAGER
TEAM_ROLES.TEAM_LEAD
TEAM_ROLES.EMPLOYEE

// Organization Roles
ORGANIZATION_ROLES.OWNER
ORGANIZATION_ROLES.MANAGER
ORGANIZATION_ROLES.EMPLOYEE

// Contact Features (examples)
CONTACT_FEATURES.BASIC_CONTACTS
CONTACT_FEATURES.AI_ENHANCED_CARD_SCANNER
CONTACT_FEATURES.SEMANTIC_SEARCH
CONTACT_FEATURES.AUTO_GROUPING

// Permissions (examples)
PERMISSIONS.CAN_VIEW_TEAM
PERMISSIONS.CAN_INVITE_TEAM_MEMBERS
PERMISSIONS.CAN_MANAGE_TEAM_SETTINGS
PERMISSIONS.CAN_VIEW_ANALYTICS
```

---

## 💡 Pro Tips

1. **Use autocomplete:** Type `SUBSCRIPTION_LEVELS.` and let your IDE suggest
2. **Search before adding:** Use Cmd+Shift+F to check if constant exists
3. **Keep constants grouped:** Related constants together in same file
4. **Comment complex maps:** Add JSDoc for nested permission objects
5. **Test changes:** Run `npm run build` after modifying constants

---

## 🔗 Full Documentation

For complete details, see:
- `weavink-constants-skill.md` - Full skill guide
- `README.md` - Implementation guide
- `claude-code-constants-analysis-prompt.md` - Analysis tool

---

## 🆘 Need Help?

1. Check skill file for pattern examples
2. Run Claude Code analysis for your specific issue
3. Search skill file for error message
4. Review recent PRs for similar changes

---

**Last Updated:** 2025-11-11  
**Version:** 1.0  
**Maintainer:** Weavink Core Team

---

_Print this and keep it at your desk, or bookmark it for quick reference!_ 📌