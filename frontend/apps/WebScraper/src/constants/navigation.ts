import type { LucideIcon } from 'lucide-react';
import { Calendar, Download, Globe, Home, Layers, Timer } from 'lucide-react';

export type PageId =
  | 'home'
  | 'scraping'
  | 'templates'
  | 'history'
  | 'schedules'
  | 'exports';

export interface NavigationItem {
  id: PageId;
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavigationItem[] = [
  {
    id: 'home',
    path: '/',
    label: 'Home',
    description: 'Overview of scraping activity, quick insights, and shortcuts.',
    icon: Home
  },
  {
    id: 'scraping',
    path: '/scraping',
    label: 'Scraping',
    description: 'Launch new scrapes or crawling jobs with advanced configuration.',
    icon: Globe
  },
  {
    id: 'templates',
    path: '/templates',
    label: 'Templates',
    description: 'Manage reusable scraping templates and automation presets.',
    icon: Layers
  },
  {
    id: 'history',
    path: '/history',
    label: 'History',
    description: 'Explore historical runs, monitor statuses, and re-run jobs.',
    icon: Timer
  },
  {
    id: 'schedules',
    path: '/schedules',
    label: 'Schedules',
    description: 'Automate recurring scrapes with cron, interval, or one-time runs.',
    icon: Calendar
  },
  {
    id: 'exports',
    path: '/exports',
    label: 'Exports',
    description: 'Download job data in CSV, JSON, or Parquet formats for analysis.',
    icon: Download
  }
];
