export type ItemType = 'commit' | 'issue';

export type CategoryKey = 
  | 'features'
  | 'fixes'
  | 'documentation'
  | 'configuration'
  | 'internationalization'
  | 'testing'
  | 'security'
  | 'performance'
  | 'refactoring'
  | 'ui'
  | 'styling'
  | 'other';

export interface Commit {
  hash: string;
  author: string;
  date: Date;
  message: string;
  emoji: string;
  category: CategoryKey;
  subcategory?: string;
  type: 'commit';
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  description: string;
  labels: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  milestone?: string;
  assignee?: string;
  created: Date;
  updated: Date;
  url: string;
  category: CategoryKey;
  subcategory?: string;
  type: 'issue';
}

export type RoadmapItem = Commit | Issue;

export interface CategoryStats {
  commits: number;
  issues: number;
  total: number;
  completionRate: number;
}

export interface SubcategoryNode {
  name: string;
  displayName: string;
  items: RoadmapItem[];
}

export interface CategoryNode {
  name: CategoryKey;
  displayName: string;
  icon: string;
  description?: string;
  subcategories: Record<string, SubcategoryNode>;
  items: RoadmapItem[]; // Top level items in this category
  stats: CategoryStats;
}

export type CategoryTree = Record<string, CategoryNode>;
