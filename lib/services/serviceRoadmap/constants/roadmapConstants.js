// ============================================
// ROADMAP FEATURES & LIMITS
// ============================================

export const ROADMAP_FEATURES = {
  PUBLIC_ROADMAP: 'public_roadmap',
  DASHBOARD_ROADMAP: 'dashboard_roadmap',
  GRAPH_VISUALIZATION: 'graph_visualization',
  ADVANCED_FILTERS: 'advanced_filters',
};

// ============================================
// CATEGORY CONFIGURATION
// ============================================

export const CATEGORY_KEYS = {
  FEATURES: 'features',
  FIXES: 'fixes',
  DOCUMENTATION: 'documentation',
  CONFIGURATION: 'configuration',
  INTERNATIONALIZATION: 'internationalization',
  TESTING: 'testing',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  REFACTORING: 'refactoring',
  UI: 'ui',
  STYLING: 'styling',
  OTHER: 'other',
};

export const CATEGORY_CONFIG = {
  [CATEGORY_KEYS.FEATURES]: {
    displayName: 'Features', // Fallback if translation missing
    translationKey: 'roadmap.categories.features.name',
    descriptionKey: 'roadmap.categories.features.description',
    icon: '✨',
    colorBg: 'bg-purple-100',
    colorText: 'text-purple-700',
    description: 'New features and enhancements',
    priority: 1,
  },
  [CATEGORY_KEYS.FIXES]: {
    displayName: 'Bug Fixes',
    translationKey: 'roadmap.categories.fixes.name',
    descriptionKey: 'roadmap.categories.fixes.description',
    icon: '🐛',
    colorBg: 'bg-red-100',
    colorText: 'text-red-700',
    description: 'Bug fixes and corrections',
    priority: 2,
  },
  [CATEGORY_KEYS.DOCUMENTATION]: {
    displayName: 'Documentation',
    translationKey: 'roadmap.categories.documentation.name',
    descriptionKey: 'roadmap.categories.documentation.description',
    icon: '📚',
    colorBg: 'bg-blue-100',
    colorText: 'text-blue-700',
    description: 'Documentation updates',
    priority: 8,
  },
  [CATEGORY_KEYS.CONFIGURATION]: {
    displayName: 'Configuration',
    translationKey: 'roadmap.categories.configuration.name',
    descriptionKey: 'roadmap.categories.configuration.description',
    icon: '🔧',
    colorBg: 'bg-yellow-100',
    colorText: 'text-yellow-700',
    description: 'Configuration changes',
    priority: 9,
  },
  [CATEGORY_KEYS.INTERNATIONALIZATION]: {
    displayName: 'Internationalization',
    translationKey: 'roadmap.categories.internationalization.name',
    descriptionKey: 'roadmap.categories.internationalization.description',
    icon: '🌐',
    colorBg: 'bg-green-100',
    colorText: 'text-green-700',
    description: 'Language and localization',
    priority: 7,
  },
  [CATEGORY_KEYS.TESTING]: {
    displayName: 'Testing',
    translationKey: 'roadmap.categories.testing.name',
    descriptionKey: 'roadmap.categories.testing.description',
    icon: '✅',
    colorBg: 'bg-teal-100',
    colorText: 'text-teal-700',
    description: 'Test coverage and quality',
    priority: 6,
  },
  [CATEGORY_KEYS.SECURITY]: {
    displayName: 'Security',
    translationKey: 'roadmap.categories.security.name',
    descriptionKey: 'roadmap.categories.security.description',
    icon: '🔒',
    colorBg: 'bg-orange-100',
    colorText: 'text-orange-700',
    description: 'Security improvements',
    priority: 3,
  },
  [CATEGORY_KEYS.PERFORMANCE]: {
    displayName: 'Performance',
    translationKey: 'roadmap.categories.performance.name',
    descriptionKey: 'roadmap.categories.performance.description',
    icon: '⚡',
    colorBg: 'bg-indigo-100',
    colorText: 'text-indigo-700',
    description: 'Performance optimizations',
    priority: 4,
  },
  [CATEGORY_KEYS.REFACTORING]: {
    displayName: 'Refactoring',
    translationKey: 'roadmap.categories.refactoring.name',
    descriptionKey: 'roadmap.categories.refactoring.description',
    icon: '♻️',
    colorBg: 'bg-gray-100',
    colorText: 'text-gray-700',
    description: 'Code quality improvements',
    priority: 10,
  },
  [CATEGORY_KEYS.UI]: {
    displayName: 'User Interface',
    translationKey: 'roadmap.categories.ui.name',
    descriptionKey: 'roadmap.categories.ui.description',
    icon: '💄',
    colorBg: 'bg-pink-100',
    colorText: 'text-pink-700',
    description: 'UI/UX improvements',
    priority: 5,
  },
  [CATEGORY_KEYS.STYLING]: {
    displayName: 'Styling',
    translationKey: 'roadmap.categories.styling.name',
    descriptionKey: 'roadmap.categories.styling.description',
    icon: '🎨',
    colorBg: 'bg-cyan-100',
    colorText: 'text-cyan-700',
    description: 'Visual design updates',
    priority: 11,
  },
  [CATEGORY_KEYS.OTHER]: {
    displayName: 'Other',
    translationKey: 'roadmap.categories.other.name',
    descriptionKey: 'roadmap.categories.other.description',
    icon: '📦',
    colorBg: 'bg-slate-100',
    colorText: 'text-slate-700',
    description: 'Miscellaneous changes',
    priority: 12,
  },
};

// ============================================
// GITMOJI TO CATEGORY MAPPING
// ============================================

export const EMOJI_CATEGORY_MAP = {
  '✨': CATEGORY_KEYS.FEATURES,
  '🐛': CATEGORY_KEYS.FIXES,
  '🚑': CATEGORY_KEYS.FIXES,
  '📚': CATEGORY_KEYS.DOCUMENTATION,
  '📝': CATEGORY_KEYS.DOCUMENTATION,
  '🔧': CATEGORY_KEYS.CONFIGURATION,
  '🌐': CATEGORY_KEYS.INTERNATIONALIZATION,
  '✅': CATEGORY_KEYS.TESTING,
  '🔒': CATEGORY_KEYS.SECURITY,
  '🔐': CATEGORY_KEYS.SECURITY,
  '⚡': CATEGORY_KEYS.PERFORMANCE,
  '♻️': CATEGORY_KEYS.REFACTORING,
  '🎨': CATEGORY_KEYS.STYLING,
  '💄': CATEGORY_KEYS.UI,
  '🚀': CATEGORY_KEYS.FEATURES,
  '🔥': CATEGORY_KEYS.REFACTORING,
  '🚧': CATEGORY_KEYS.OTHER,
  '💚': CATEGORY_KEYS.TESTING,
  '⬇️': CATEGORY_KEYS.CONFIGURATION,
  '⬆️': CATEGORY_KEYS.CONFIGURATION,
  '📌': CATEGORY_KEYS.CONFIGURATION,
  '👷': CATEGORY_KEYS.CONFIGURATION,
  '🔨': CATEGORY_KEYS.REFACTORING,
  '🩹': CATEGORY_KEYS.FIXES,
  '🚨': CATEGORY_KEYS.FIXES,
  '💡': CATEGORY_KEYS.DOCUMENTATION,
  '🌱': CATEGORY_KEYS.FEATURES,
};

// ============================================
// GITHUB LABEL TO CATEGORY MAPPING
// ============================================

export const LABEL_CATEGORY_MAP = {
  'enhancement': CATEGORY_KEYS.FEATURES,
  'feature': CATEGORY_KEYS.FEATURES,
  'bug': CATEGORY_KEYS.FIXES,
  'hotfix': CATEGORY_KEYS.FIXES,
  'documentation': CATEGORY_KEYS.DOCUMENTATION,
  'docs': CATEGORY_KEYS.DOCUMENTATION,
  'config': CATEGORY_KEYS.CONFIGURATION,
  'configuration': CATEGORY_KEYS.CONFIGURATION,
  'i18n': CATEGORY_KEYS.INTERNATIONALIZATION,
  'internationalization': CATEGORY_KEYS.INTERNATIONALIZATION,
  'test': CATEGORY_KEYS.TESTING,
  'testing': CATEGORY_KEYS.TESTING,
  'security': CATEGORY_KEYS.SECURITY,
  'performance': CATEGORY_KEYS.PERFORMANCE,
  'perf': CATEGORY_KEYS.PERFORMANCE,
  'refactor': CATEGORY_KEYS.REFACTORING,
  'refactoring': CATEGORY_KEYS.REFACTORING,
  'ui': CATEGORY_KEYS.UI,
  'ux': CATEGORY_KEYS.UI,
  'style': CATEGORY_KEYS.STYLING,
  'styling': CATEGORY_KEYS.STYLING,
  'design': CATEGORY_KEYS.STYLING,
};

// ============================================
// LIMITS & CONFIGURATION
// ============================================

export const ROADMAP_LIMITS = {
  MAX_COMMITS: 500,
  MAX_ISSUES: 100,
  GIT_TIMEOUT_MS: 30000,
  GITHUB_CACHE_TTL: 15 * 60 * 1000,
  CLIENT_CACHE_TTL: 5 * 60 * 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  NEW_BADGE_THRESHOLD_DAYS: 3, // Days to show "NEW" badge on commits
};

// ============================================
// SUBCATEGORY KEYWORDS
// ============================================

export const SUBCATEGORY_KEYWORDS = {
  // Authentication subcategories
  'auth': 'authentication',
  'login': 'authentication',
  'oauth': 'authentication',
  'jwt': 'authentication',
  'session': 'authentication',
  'token': 'authentication',

  // Data subcategories
  'database': 'data-storage',
  'firestore': 'data-storage',
  'firebase': 'data-storage',
  'cache': 'caching',
  'api': 'api',
  'endpoint': 'api',

  // UI subcategories
  'modal': 'modals',
  'dialog': 'modals',
  'form': 'forms',
  'input': 'forms',
  'button': 'buttons',
  'chart': 'charts',
  'graph': 'charts',
  'table': 'tables',
  'dashboard': 'dashboard',
  'card': 'cards',

  // Feature subcategories
  'analytics': 'analytics',
  'contact': 'contacts',
  'subscription': 'subscriptions',
  'payment': 'payments',
  'stripe': 'payments',
  'gdpr': 'compliance',
  'privacy': 'compliance',
  'consent': 'compliance',

  // Technical subcategories
  'optimization': 'optimization',
  'build': 'build-system',
  'webpack': 'build-system',
  'deploy': 'deployment',
  'docker': 'deployment',

  // Roadmap specific
  'roadmap': 'roadmap-feature',
  'changelog': 'roadmap-feature',
  'commit': 'version-control',
  'issue': 'issue-tracking',
};

// ============================================
// ERROR MESSAGES
// ============================================

export const ROADMAP_ERRORS = {
  GIT_COMMAND_FAILED: 'Failed to execute git command',
  GIT_PARSE_ERROR: 'Failed to parse git log output',
  GIT_NOT_REPOSITORY: 'Not a git repository',
  GIT_TIMEOUT: 'Git command timed out',
  GITHUB_API_ERROR: 'GitHub API request failed',
  GITHUB_RATE_LIMIT: 'GitHub API rate limit exceeded',
  GITHUB_AUTH_ERROR: 'GitHub authentication failed',
  INVALID_CATEGORY: 'Invalid category specified',
  TREE_BUILD_FAILED: 'Failed to build category tree',
  CACHE_ERROR: 'Cache operation failed',
  MISSING_CONFIG: 'Missing required configuration',
};
