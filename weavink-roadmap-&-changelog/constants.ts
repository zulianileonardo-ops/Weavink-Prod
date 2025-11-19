import { CategoryKey } from './types';

export const CATEGORY_CONFIG: Record<CategoryKey, { displayName: string; icon: string; colorBg: string; colorText: string }> = {
  features: { displayName: 'Features', icon: '✨', colorBg: 'bg-purple-100', colorText: 'text-purple-700' },
  fixes: { displayName: 'Bug Fixes', icon: '🐛', colorBg: 'bg-red-100', colorText: 'text-red-700' },
  documentation: { displayName: 'Documentation', icon: '📚', colorBg: 'bg-blue-100', colorText: 'text-blue-700' },
  configuration: { displayName: 'Configuration', icon: '🔧', colorBg: 'bg-yellow-100', colorText: 'text-yellow-700' },
  internationalization: { displayName: 'Internationalization', icon: '🌐', colorBg: 'bg-green-100', colorText: 'text-green-700' },
  testing: { displayName: 'Testing', icon: '✅', colorBg: 'bg-teal-100', colorText: 'text-teal-700' },
  security: { displayName: 'Security', icon: '🔒', colorBg: 'bg-orange-100', colorText: 'text-orange-700' },
  performance: { displayName: 'Performance', icon: '⚡', colorBg: 'bg-indigo-100', colorText: 'text-indigo-700' },
  refactoring: { displayName: 'Refactoring', icon: '♻️', colorBg: 'bg-gray-100', colorText: 'text-gray-700' },
  ui: { displayName: 'User Interface', icon: '💄', colorBg: 'bg-pink-100', colorText: 'text-pink-700' },
  styling: { displayName: 'Styling', icon: '🎨', colorBg: 'bg-cyan-100', colorText: 'text-cyan-700' },
  other: { displayName: 'Other', icon: '📦', colorBg: 'bg-slate-100', colorText: 'text-slate-700' },
};

export const EMOJI_MAP: Record<string, CategoryKey> = {
  '✨': 'features',
  '🐛': 'fixes',
  '📚': 'documentation',
  '📝': 'documentation',
  '🔧': 'configuration',
  '🌐': 'internationalization',
  '✅': 'testing',
  '🔒': 'security',
  '⚡': 'performance',
  '♻️': 'refactoring',
  '💄': 'ui',
  '🎨': 'styling',
  '🚀': 'features', // Deployment often coincides with feature release in this simplified view
  '🚑': 'fixes',
  '🚧': 'other',
};

export const LABEL_CATEGORY_MAP: Record<string, CategoryKey> = {
  'enhancement': 'features',
  'feature': 'features',
  'bug': 'fixes',
  'documentation': 'documentation',
  'config': 'configuration',
  'i18n': 'internationalization',
  'test': 'testing',
  'security': 'security',
  'performance': 'performance',
  'refactor': 'refactoring',
  'ui': 'ui',
  'ux': 'ui',
  'style': 'styling',
  'design': 'styling'
};
