import {
  Clock,
  AlertCircle,
  Zap,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Search,
  Rocket,
  FileText,
  Radio,
  Database,
  Brain,
  Shield,
  BarChart3,
} from 'lucide-react';
import type {
  ItemPriority,
  ItemStatus,
  ItemCategory,
  PriorityConfig,
  StatusConfig,
  CategoryConfig,
} from '../types/workspace.types';

export const PRIORITY_CONFIG: Record<ItemPriority, PriorityConfig> = {
  low: {
    label: 'Baixa',
    color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-400 dark:border-green-800',
    icon: Clock,
  },
  medium: {
    label: 'Média',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-400 dark:border-yellow-800',
    icon: AlertCircle,
  },
  high: {
    label: 'Alta',
    color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-400 dark:border-orange-800',
    icon: Zap,
  },
  critical: {
    label: 'Crítica',
    color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-400 dark:border-red-800',
    icon: AlertCircle,
  },
};

export const STATUS_CONFIG: Record<ItemStatus, StatusConfig> = {
  new: {
    label: 'Nova',
    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-400 dark:border-blue-800',
    icon: Lightbulb,
  },
  review: {
    label: 'Em Análise',
    color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900 dark:text-purple-400 dark:border-purple-800',
    icon: Search,
  },
  'in-progress': {
    label: 'Em Desenvolvimento',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-400 dark:border-cyan-800',
    icon: Rocket,
  },
  completed: {
    label: 'Concluída',
    color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-400 dark:border-green-800',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejeitada',
    color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    icon: XCircle,
  },
};

export const CATEGORY_CONFIG: Record<ItemCategory, CategoryConfig> = {
  documentacao: {
    label: 'Documentação',
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
    description: 'Melhorias na documentação do sistema',
  },
  'coleta-dados': {
    label: 'Coleta de Dados',
    icon: Radio,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
    description: 'Sistema de captura de dados de mercado',
  },
  'banco-dados': {
    label: 'Banco de Dados',
    icon: Database,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
    description: 'Armazenamento e gestão de dados',
  },
  'analise-dados': {
    label: 'Análise de Dados',
    icon: Brain,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800',
    description: 'ML, Analytics e processamento',
  },
  'gestao-riscos': {
    label: 'Gestão de Riscos',
    icon: Shield,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
    description: 'Sistema de gerenciamento de riscos',
  },
  dashboard: {
    label: 'Dashboard',
    icon: BarChart3,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800',
    description: 'Interface e visualização',
  },
};
