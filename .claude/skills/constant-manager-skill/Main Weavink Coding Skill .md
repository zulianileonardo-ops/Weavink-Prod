# Main Weavink Coding Skill (Template - How it References Constants Skill)

This is a template showing how your main coding skill would reference and integrate with the Constants Management Skill.

---

## Overview

This is the primary skill for developing features in the Weavink codebase. It covers the complete development workflow from planning to deployment.

**Prerequisites:** 
- Read the [Constants Management Skill](./weavink-constants-skill.md) first
- Understand session-based authentication
- Familiar with Next.js 14 App Router

---

## Section 1: Project Setup & Architecture

[... main coding skill content ...]

### Working with Constants

**Critical Reference:** All constant management follows the [Constants Management Skill](./weavink-constants-skill.md).

**Quick Rules:**
1. Import from barrel only: `from '@/lib/services/constants'`
2. Use decision tree in Constants Skill to determine constant location
3. Follow SCREAMING_SNAKE_CASE naming convention

**See:** [Constants Skill - Barrel Export Pattern](./weavink-constants-skill.md#barrel-export-pattern)

---

## Section 2: Implementing a New Feature

### Step 1: Define Feature Constants

Before writing any code, define your feature in constants:

```javascript
// 1. Determine constant location (see Constants Skill decision tree)
// 2. Add feature flag to domain constants

// Example: Adding new contact feature
// Location: lib/services/serviceContact/client/services/constants/contactConstants.js

export const CONTACT_FEATURES = {
  // ... existing features ...
  ADVANCED_FILTERING: 'ADVANCED_FILTERING',  // New feature
};

// 3. Add limits for each subscription level
export const CONTACT_LIMITS = {
  [SUBSCRIPTION_LEVELS.BASE]: {
    features: [
      CONTACT_FEATURES.BASIC_CONTACTS
      // ADVANCED_FILTERING not included in base
    ]
  },
  [SUBSCRIPTION_LEVELS.PRO]: {
    features: [
      CONTACT_FEATURES.BASIC_CONTACTS,
      CONTACT_FEATURES.ADVANCED_FILTERING  // Available in Pro
    ]
  }
};
```

**See:** 
- [Constants Skill - Feature Flag Pattern](./weavink-constants-skill.md#pattern-1-feature-flag-constants)
- [Constants Skill - Subscription Limits Pattern](./weavink-constants-skill.md#pattern-2-subscription-limits-map)

### Step 2: Update Session Permission Calculation

[... code showing how to integrate with session ...]

**See:** [Constants Skill - Integration with Session](./weavink-constants-skill.md#integration-with-session--permissions)

### Step 3: Implement Permission Checks

```javascript
// In your API route
import { CONTACT_FEATURES } from '@/lib/services/constants';  // From barrel!

export async function POST(request) {
  const session = await createApiSession(request);
  
  // Permission check using constant
  if (!session.permissions[CONTACT_FEATURES.ADVANCED_FILTERING]) {
    return NextResponse.json(
      { error: 'This feature requires Pro subscription' },
      { status: 403 }
    );
  }
  
  // Implementation...
}
```

**See:** [Constants Skill - Using Constants in Permission Checks](./weavink-constants-skill.md#using-constants-in-permission-checks)

### Step 4: Implement UI with Feature Gates

```jsx
// In your React component
import { CONTACT_FEATURES } from '@/lib/services/constants';  // From barrel!

function AdvancedFilters({ session }) {
  // Check if user has access to this feature
  if (!session.permissions[CONTACT_FEATURES.ADVANCED_FILTERING]) {
    return (
      <UpgradePrompt 
        feature="Advanced Filtering" 
        requiredLevel="Pro"
      />
    );
  }
  
  return <AdvancedFilterComponent />;
}
```

---

## Section 3: Adding Configuration Values

When you need to add configuration constants:

**Decision Process:**
1. Is this configuration used in multiple domains?
   - YES → Add to core constants
   - NO → Add to domain-specific constants

**Example: Adding AI Model Configuration**

```javascript
// Location: lib/services/serviceContact/client/services/constants/contactConstants.js

export const AI_SCANNER_CONFIG = {
  MODEL_NAME: 'gemini-pro-vision',
  MAX_IMAGE_SIZE: 10 * 1024 * 1024,  // 10MB
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3
};

// Usage in service
import { AI_SCANNER_CONFIG } from '@/lib/services/constants';

async function scanBusinessCard(imageFile) {
  if (imageFile.size > AI_SCANNER_CONFIG.MAX_IMAGE_SIZE) {
    throw new Error('Image too large');
  }
  
  if (!AI_SCANNER_CONFIG.SUPPORTED_FORMATS.includes(imageFile.type)) {
    throw new Error('Unsupported format');
  }
  
  // Implementation...
}
```

**See:** [Constants Skill - Configuration Constants Pattern](./weavink-constants-skill.md#pattern-4-configuration-constants)

---

## Section 4: Working with Role-Based Permissions

When implementing team/organization features with role-based access:

```javascript
// 1. Define permission constants (if not already defined)
// Location: lib/services/serviceEnterprise/constants/enterpriseConstants.js

export const PERMISSIONS = {
  // ... existing permissions ...
  CAN_EXPORT_TEAM_DATA: 'CAN_EXPORT_TEAM_DATA',  // New permission
};

// 2. Update default permissions by role
export const DEFAULT_PERMISSIONS_BY_ROLE = {
  [TEAM_ROLES.OWNER]: {
    // ... other permissions ...
    [PERMISSIONS.CAN_EXPORT_TEAM_DATA]: true
  },
  [TEAM_ROLES.MANAGER]: {
    // ... other permissions ...
    [PERMISSIONS.CAN_EXPORT_TEAM_DATA]: true  // Managers can export too
  },
  [TEAM_ROLES.EMPLOYEE]: {
    // ... other permissions ...
    [PERMISSIONS.CAN_EXPORT_TEAM_DATA]: false  // Employees cannot
  }
};

// 3. Check permission in API route
import { PERMISSIONS } from '@/lib/services/constants';

export async function GET(request) {
  const session = await createApiSession(request);
  const sessionManager = new SessionManager(session);
  
  if (!sessionManager.hasTeamPermission(PERMISSIONS.CAN_EXPORT_TEAM_DATA, teamId)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  
  // Export team data...
}
```

**See:** [Constants Skill - Role-Based Permissions Pattern](./weavink-constants-skill.md#pattern-3-role-based-permissions-map)

---

## Section 5: Refactoring Magic Strings

If you encounter magic strings in the codebase, refactor them to use constants:

### Before (Bad):
```javascript
if (user.subscriptionLevel === 'pro') {
  // Enable AI scanner
}

if (invitation.status === 'pending') {
  // Show accept button
}
```

### After (Good):
```javascript
import { SUBSCRIPTION_LEVELS, INVITATION_STATUS } from '@/lib/services/constants';

if (user.subscriptionLevel === SUBSCRIPTION_LEVELS.PRO) {
  // Enable AI scanner
}

if (invitation.status === INVITATION_STATUS.PENDING) {
  // Show accept button
}
```

**See:** [Constants Skill - Migration from Magic Strings](./weavink-constants-skill.md#migrating-from-magic-strings-to-constants)

---

## Section 6: Testing Features with Constants

When writing tests, use constants for consistency:

```javascript
import { 
  SUBSCRIPTION_LEVELS, 
  CONTACT_FEATURES,
  CONTACT_LIMITS 
} from '@/lib/services/constants';

describe('Advanced Filtering Feature', () => {
  test('Pro users can access advanced filtering', () => {
    const session = createMockSession({
      subscriptionLevel: SUBSCRIPTION_LEVELS.PRO
    });
    
    expect(session.permissions[CONTACT_FEATURES.ADVANCED_FILTERING]).toBe(true);
  });
  
  test('Base users cannot access advanced filtering', () => {
    const session = createMockSession({
      subscriptionLevel: SUBSCRIPTION_LEVELS.BASE
    });
    
    expect(session.permissions[CONTACT_FEATURES.ADVANCED_FILTERING]).toBeFalsy();
  });
  
  test('All subscription levels have complete limits', () => {
    Object.values(SUBSCRIPTION_LEVELS).forEach(level => {
      expect(CONTACT_LIMITS[level]).toBeDefined();
      expect(CONTACT_LIMITS[level].features).toBeInstanceOf(Array);
    });
  });
});
```

---

## Section 7: Common Development Workflows

### Workflow: Adding a New Subscription Level

**Scenario:** Adding a "Startup" tier between Base and Pro

1. **Add to Core Constants** (see Constants Skill)
```javascript
// lib/services/core/constants.js
export const SUBSCRIPTION_LEVELS = {
  BASE: 'base',
  STARTUP: 'startup',  // NEW
  PRO: 'pro',
  // ... rest
};
```

2. **Update All Domain Limits** (see Constants Skill)
```javascript
// Each domain's constants file
export const CONTACT_LIMITS = {
  [SUBSCRIPTION_LEVELS.BASE]: { /* ... */ },
  [SUBSCRIPTION_LEVELS.STARTUP]: {  // ADD THIS
    maxContacts: 500,
    features: [
      CONTACT_FEATURES.BASIC_CONTACTS,
      CONTACT_FEATURES.AI_SCANNER  // More than base
    ]
  },
  [SUBSCRIPTION_LEVELS.PRO]: { /* ... */ },
  // ... rest
};
```

3. **Update UI Components**
4. **Update Pricing Pages**
5. **Run Tests**

**See:** [Constants Skill - Adding a New Constant](./weavink-constants-skill.md#adding-a-new-constant)

### Workflow: Adding a New Permission

**Scenario:** Add permission for managing team billing

1. **Add Permission Constant**
```javascript
// lib/services/serviceEnterprise/constants/enterpriseConstants.js
export const PERMISSIONS = {
  // ... existing ...
  CAN_MANAGE_BILLING: 'CAN_MANAGE_BILLING',
};
```

2. **Update Role Defaults**
```javascript
export const DEFAULT_PERMISSIONS_BY_ROLE = {
  [TEAM_ROLES.OWNER]: {
    [PERMISSIONS.CAN_MANAGE_BILLING]: true,  // Only owners
  },
  [TEAM_ROLES.MANAGER]: {
    [PERMISSIONS.CAN_MANAGE_BILLING]: false,
  },
  // ... rest
};
```

3. **Implement Permission Checks in API Routes**
4. **Update UI to Show/Hide Features**
5. **Add Tests**

---

## Section 8: Pre-Deployment Checklist

Before deploying features that use constants:

### Constants Check:
- [ ] All constants imported from barrel file
- [ ] No magic strings in code
- [ ] All subscription levels have limits defined
- [ ] All roles have permissions defined
- [ ] Constant names follow SCREAMING_SNAKE_CASE
- [ ] No circular dependencies

**Tool:** Run the Constants Analysis (see Constants Skill README)

### Integration Check:
- [ ] Session properly calculates permissions
- [ ] API routes check permissions correctly
- [ ] UI components show/hide based on permissions
- [ ] Error messages are user-friendly

### Testing Check:
- [ ] Tests use constants (not magic strings)
- [ ] Tests cover all subscription levels
- [ ] Tests cover all role types
- [ ] Integration tests verify permission flow

---

## Section 9: Code Review Guidelines

When reviewing PRs involving constants:

### Required Checks:
1. ✅ Imports use barrel file (`from '@/lib/services/constants'`)
2. ✅ No magic strings
3. ✅ Constant names use correct convention
4. ✅ New constants in correct location (use decision tree)
5. ✅ All subscription levels/roles covered
6. ✅ Permission checks properly implemented

### Common Issues to Flag:
- ❌ Direct imports from domain files
- ❌ Magic strings like 'pro', 'manager', 'pending'
- ❌ Incomplete limits (missing subscription levels)
- ❌ New core concepts in domain files
- ❌ Domain-to-domain imports

**Reference:** Use [Constants Skill Quick Reference](./QUICK_REFERENCE.md) during reviews

---

## Section 10: Troubleshooting

### Issue: Import errors when using constants

**Solution:** Check these in order:
1. Verify barrel file exports the constant
2. Check constant spelling/capitalization
3. Restart TypeScript server
4. Run `npm run build` to catch errors

**See:** [Constants Skill - Common Issues](./weavink-constants-skill.md#common-issues--solutions)

### Issue: Permission check not working

**Solution:**
1. Verify constant is defined
2. Check session includes the permission
3. Verify subscription limits include the feature
4. Check permission calculation in session.js

**See:** [Constants Skill - Integration with Session](./weavink-constants-skill.md#integration-with-session--permissions)

---

## Quick Links to Constants Skill

For detailed information, see these sections in the Constants Management Skill:

- 📖 [Barrel Export Pattern](./weavink-constants-skill.md#barrel-export-pattern)
- 📖 [Decision Tree](./weavink-constants-skill.md#decision-tree-where-does-this-constant-belong)
- 📖 [Common Patterns](./weavink-constants-skill.md#common-patterns)
- 📖 [Best Practices](./weavink-constants-skill.md#best-practices)
- 📖 [Integration with Session](./weavink-constants-skill.md#integration-with-session--permissions)
- 📖 [Troubleshooting](./weavink-constants-skill.md#common-issues--solutions)
- 📋 [Quick Reference Card](./QUICK_REFERENCE.md)

---

## Summary

**Constant-Related Development Flow:**
1. Define constants (using Constants Skill decision tree)
2. Update session permission calculation
3. Implement permission checks (using constants)
4. Build UI with feature gates (using constants)
5. Write tests (using constants)
6. Review (check Constants Skill guidelines)
7. Deploy

**Remember:** The Constants Management Skill is the source of truth for all constant-related decisions. Reference it frequently!

---

_This template demonstrates how the main coding skill would integrate with and reference the Constants Management Skill. All constant-related decisions, patterns, and troubleshooting are handled by the dedicated Constants Skill._