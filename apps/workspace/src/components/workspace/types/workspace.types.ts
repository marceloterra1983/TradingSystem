import type { LucideIcon } from 'lucide-react';

/**
 * Data Structures
 */
export type ItemCategory =
  | 'documentacao'
  | 'coleta-dados'
  | 'banco-dados'
  | 'analise-dados'
  | 'gestao-riscos'
  | 'dashboard';

export type ItemPriority = 'low' | 'medium' | 'high' | 'critical';

export type ItemStatus = 'new' | 'review' | 'in-progress' | 'completed' | 'rejected';

export interface Item {
  id: string;
  title: string;
  description: string;
  category: ItemCategory;
  priority: ItemPriority;
  status: ItemStatus;
  tags: string[];
  createdAt: string; // ISO date
}

// Alias for backward compatibility
export type Idea = Item;

/**
 * Configuration Interfaces
 */
export interface PriorityConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

export interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

export interface CategoryConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description: string;
}

/**
 * Form State Interfaces
 */
export interface ItemFormState {
  title: string;
  description: string;
  category: ItemCategory;
  priority: ItemPriority;
  tags: string;
}

export interface ItemFormWithStatus extends ItemFormState {
  status: ItemStatus;
}
