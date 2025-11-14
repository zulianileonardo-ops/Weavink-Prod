# Constant Templates

This directory contains templates for creating new constants in the Weavink codebase.

## Available Templates

### 1. `enum-constant.template.js`
**Use for:** Simple enumerations of valid values

**Examples:**
- Subscription levels (base, pro, premium, business, enterprise)
- Status values (pending, accepted, expired)
- Role names (owner, admin, member, billing)

**Replace placeholders:**
- `[CONSTANT_NAME]` - Name of the constant (SCREAMING_SNAKE_CASE)
- `[DESCRIPTION]` - Description of what this enum represents
- `[VALUE_1]`, `[VALUE_2]`, etc. - Enum keys (SCREAMING_SNAKE_CASE)
- `[value_1]`, `[value_2]`, etc. - Enum values (snake_case strings)

### 2. `feature-flags.template.js`
**Use for:** Domain-specific features with subscription-based limits

**Examples:**
- Contact features (basic_contacts, semantic_search, ai_scanner)
- Appearance features (custom_themes, advanced_branding)
- Admin features (security_logs, audit_trail, analytics_dashboard)

**Replace placeholders:**
- `[DOMAIN]` - Domain name uppercase (CONTACT, APPEARANCE, ADMIN)
- `[domain]` - Domain name lowercase (contact, appearance, admin)
- `[Domain]` - Domain name PascalCase (Contact, Appearance, Admin)
- `[FEATURE_1]`, `[FEATURE_2]`, etc. - Feature names
- `[Resource]` - Resource name PascalCase (Contacts, Themes, Users)

**Important:** This template includes:
- Feature flag definitions
- Subscription limits map (ALL 5 subscription levels)
- Helper function for checking features

### 3. `config-object.template.js`
**Use for:** Complex configuration with nested structures

**Examples:**
- Semantic search config (vector DB, reranking, embedding)
- AI provider config (endpoint, pricing, limits)
- Event detection config (rules, thresholds, actions)

**Replace placeholders:**
- `[FEATURE_NAME]` - Human-readable feature name
- `[FEATURE]` - Feature name uppercase (SEMANTIC_SEARCH, AI_PROVIDER)
- `[provider_name]` - Provider/service name
- `[api_endpoint]` - API endpoint URL
- `[API_KEY_ENV_VAR]` - Environment variable name

### 4. `permissions-map.template.js`
**Use for:** Role-based permissions matrices

**Examples:**
- Team contact permissions (view, create, edit, delete, export)
- Organization permissions (manage members, billing, settings)
- Admin permissions (view logs, manage users, configure system)

**Replace placeholders:**
- `[DOMAIN]` - Domain name uppercase
- `[RESOURCE]` - Resource name uppercase (CONTACT, USER, LOG)
- `[resource]` - Resource name lowercase (contact, user, log)

**Important:** This template includes ALL 5 team roles:
- MANAGER - Full permissions
- EMPLOYEE - Most permissions except manage/delete
- CONTRACTOR - Limited permissions
- INTERN - View only + limited create
- VIEW_ONLY - View only

## Usage

1. **Choose the appropriate template** based on what you're creating

2. **Copy the template** to the correct location:
   ```bash
   # Core constants
   cp templates/enum-constant.template.js lib/services/core/constants.js

   # Domain constants
   cp templates/feature-flags.template.js lib/services/service[Domain]/constants/[domain]Constants.js
   ```

3. **Replace all placeholders** with actual values:
   - Use Find & Replace in your editor
   - Search for `[PLACEHOLDER]` and replace with actual value
   - Ensure naming conventions:
     - Constants: SCREAMING_SNAKE_CASE
     - Values: snake_case
     - Functions: camelCase

4. **Update barrel file** (if creating new domain):
   ```javascript
   // lib/services/constants.js
   export * from './service[Domain]/constants/[domain]Constants.js';
   ```

5. **Update constants-index.json**:
   - Add entry for each new constant
   - Update file metadata
   - Update statistics

6. **Test the constant**:
   ```bash
   # Import in a test file
   import { YOUR_CONSTANT } from '@/lib/services/constants';

   # Run build
   npm run build
   ```

## Decision Tree: Which Template to Use?

```
What are you creating?

├─ A set of valid values (status, role, level)
│  → enum-constant.template.js
│
├─ Features with subscription-based availability
│  → feature-flags.template.js
│
├─ Permissions for different roles
│  → permissions-map.template.js
│
└─ Configuration with nested settings
   → config-object.template.js
```

## Best Practices

1. **Always use templates** - Don't create constants from scratch
2. **Replace ALL placeholders** - Search for `[` to find any you missed
3. **Follow naming conventions** - SCREAMING_SNAKE_CASE for constants
4. **Add JSDoc comments** - Describe what the constant represents
5. **Include usage examples** - Show how to import and use
6. **Update barrel file** - Ensure constant is exported
7. **Test imports** - Verify imports work before committing

## Examples

### Example 1: Creating STATUS enum

```javascript
// Using: enum-constant.template.js

/**
 * Invitation status values
 * @type {Object}
 * @constant
 */
export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  DECLINED: 'declined'
};
```

### Example 2: Creating notification features

```javascript
// Using: feature-flags.template.js

import { SUBSCRIPTION_LEVELS } from '../core/constants.js';

export const NOTIFICATION_FEATURES = {
  BASIC_NOTIFICATIONS: 'basic_notifications',
  EMAIL_NOTIFICATIONS: 'email_notifications',
  SMS_NOTIFICATIONS: 'sms_notifications',
  PUSH_NOTIFICATIONS: 'push_notifications'
};

export const NOTIFICATION_LIMITS = {
  [SUBSCRIPTION_LEVELS.BASE]: {
    maxNotifications: 10,
    features: [NOTIFICATION_FEATURES.BASIC_NOTIFICATIONS]
  },
  [SUBSCRIPTION_LEVELS.PRO]: {
    maxNotifications: 100,
    features: [
      NOTIFICATION_FEATURES.BASIC_NOTIFICATIONS,
      NOTIFICATION_FEATURES.EMAIL_NOTIFICATIONS
    ]
  },
  // ... all 5 levels
};
```

### Example 3: Creating AI provider config

```javascript
// Using: config-object.template.js

export const AI_PROVIDER_CONFIG = {
  enabled: true,
  version: '1.0.0',

  provider: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY
  },

  settings: {
    maxTokens: 4000,
    timeout: 30000,
    retryAttempts: 3,
    cacheEnabled: true,
    cacheDuration: 3600
  }
};
```

## Troubleshooting

**Import not working?**
- Check barrel file has export statement
- Verify file path is correct
- Restart TypeScript server

**Constant not appearing in autocomplete?**
- Ensure barrel file exports it
- Check TypeScript cache
- Rebuild: `npm run build`

**Naming convention error?**
- Use SCREAMING_SNAKE_CASE
- No camelCase or PascalCase for constants
- Functions can be camelCase

---

**Need help?** Check the SKILL.md file for comprehensive guidance on constant management.
