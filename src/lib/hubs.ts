/** Sample content and settings for the Design and Customize hubs. Replace with real data when the APIs exist. */
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Calculator, FileText, Globe, Layers, Megaphone, Puzzle, Receipt, ShieldCheck, Smile, Wrench, Workflow } from 'lucide-react';
import type { FilterEntry } from '@/components/FilterPopover';

/** Destination for the banner's "Visit the standalone homepage" link. */
export const STANDALONE_URL = 'https://claude.ai';

export const DESIGN_FILTERS: FilterEntry[] = [
  { id: 'status', label: 'Status', options: ['Active', 'Archived', 'All'] },
  { id: 'activity', label: 'Last activity', options: ['All', 'Today', 'This week', 'This month'] },
  'divider',
  { id: 'group', label: 'Group by', options: ['Date', 'Type', 'None'] },
  { id: 'sort', label: 'Sort by', options: ['Last activity', 'Name', 'Created'] },
];

export const DESIGN_FILTER_DEFAULTS = { status: 'Active', activity: 'All', group: 'Date', sort: 'Last activity' };

export const CUSTOMIZE_FILTERS: FilterEntry[] = [
  { id: 'status', label: 'Status', options: ['Active', 'Disabled', 'All'] },
  { id: 'activity', label: 'Last activity', options: ['All', 'Today', 'This week', 'This month'] },
];

export const SORT_FILTERS: FilterEntry[] = [
  { id: 'sort', label: 'Sort by', options: ['Last activity', 'Name', 'Most installed'] },
];

export const CUSTOMIZE_DEFAULTS = { status: 'Active', activity: 'All', sort: 'Last activity' };

export type HubItem = { id: string; title: string; description: string; author: string; installs?: string; icon: LucideIcon };

export const NEW_SKILLS: HubItem[] = [
  { id: 'verification-foundation', title: 'verification-foundation', description: 'Check claims, figures and citations before a deliverable ships.', author: 'Anthropic Directory', icon: ShieldCheck },
  { id: 'revenue-grid', title: 'Revenue Grid', description: 'Turn raw sales rows into a revenue breakdown by month, region and product.', author: 'by Anthropic', icon: Calculator },
  { id: 'a-good-sign', title: 'A Good Sign', description: 'Write clear status updates and sign-off notes in a consistent tone.', author: 'Anthropic Directory', icon: Smile },
  { id: 'learn', title: 'learn', description: 'Turn any topic into a short guided lesson with quick checks for understanding.', author: 'by Anthropic', icon: BookOpen },
  { id: 'receipts', title: 'Receipt Sorter', description: 'Categorise receipts and invoices into a tidy expense sheet.', author: 'Anthropic Directory', icon: Receipt },
  { id: 'changelog', title: 'Changelog Writer', description: 'Draft release notes from a list of merged changes.', author: 'by Anthropic', icon: FileText },
];

export const POPULAR_SKILLS: HubItem[] = [
  { id: 'doc-coauthoring', title: 'doc-coauthoring', description: 'Co-write documents section by section with a shared outline.', author: 'by Anthropic', installs: '48.2k', icon: FileText },
  { id: 'web-artifacts-builder', title: 'web-artifacts-builder', description: 'Build interactive single-file web pages and small tools.', author: 'by Anthropic', installs: '36.9k', icon: Globe },
  { id: 'plugin-management', title: 'Plugin Management', description: 'Install, update and configure plugins for your workspace.', author: 'Anthropic Directory', installs: '21.4k', icon: Puzzle },
  { id: 'productivity', title: 'Productivity', description: 'Plan your week, track tasks and draft follow-ups.', author: 'Anthropic Directory', installs: '18.0k', icon: Workflow },
  { id: 'marketing', title: 'Marketing', description: 'Draft campaigns, launch copy and a content calendar.', author: 'Anthropic Directory', installs: '12.6k', icon: Megaphone },
  { id: 'automation', title: 'Workflow Automation', description: 'Chain steps together into repeatable, checked routines.', author: 'by Anthropic', installs: '9.8k', icon: Wrench },
];

export const CONNECTORS: HubItem[] = [
  { id: 'drive', title: 'Google Drive', description: 'Search, read and reference files stored in your Drive.', author: 'Anthropic Directory', installs: '32.1k', icon: Layers },
  { id: 'web', title: 'Web Search', description: 'Look up current pages and sources while you work.', author: 'by Anthropic', installs: '27.5k', icon: Globe },
  { id: 'sheets', title: 'Spreadsheet Tools', description: 'Read and write rows in connected spreadsheets.', author: 'Anthropic Directory', installs: '14.3k', icon: Calculator },
  { id: 'notes', title: 'Notes', description: 'Pull context from your notes into a conversation.', author: 'by Anthropic', installs: '6.7k', icon: FileText },
];

export const PLUGINS: HubItem[] = [
  { id: 'plugin-management', title: 'Plugin Management', description: 'Install, update and configure plugins for your workspace.', author: 'Anthropic Directory', installs: '21.4k', icon: Puzzle },
  { id: 'productivity', title: 'Productivity', description: 'Plan your week, track tasks and draft follow-ups.', author: 'Anthropic Directory', installs: '18.0k', icon: Workflow },
  { id: 'marketing', title: 'Marketing', description: 'Draft campaigns, launch copy and a content calendar.', author: 'Anthropic Directory', installs: '12.6k', icon: Megaphone },
  { id: 'automation', title: 'Workflow Automation', description: 'Chain steps together into repeatable, checked routines.', author: 'by Anthropic', installs: '9.8k', icon: Wrench },
];
