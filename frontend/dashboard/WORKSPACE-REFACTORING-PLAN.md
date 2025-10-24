# 📋 Plano de Refatoração - WorkspacePage.tsx

**Arquivo**: `src/components/pages/WorkspacePage.tsx`  
**Tamanho Atual**: 1,855 linhas  
**Tamanho Alvo**: ~100 linhas (componente principal)  
**Estimativa**: 8-12 horas

---

## 🎯 Objetivos

1. ✅ Desbloquear build de produção (corrigir 40+ erros TypeScript)
2. ✅ Melhorar manutenibilidade (arquivos <300 linhas)
3. ✅ Facilitar testes (componentes isolados)
4. ✅ Melhorar performance (componentes menores = re-renders mais rápidos)

---

## 📊 Análise Atual

### Estrutura Identificada

```
WorkspacePage.tsx (1,855 linhas)
├── Types & Interfaces (linhas 70-390)
│   ├── ItemCategory, ItemPriority, ItemStatus
│   ├── Item, Idea interfaces
│   ├── PriorityConfig, StatusConfig, CategoryConfig
│   └── ItemFormState, ItemFormWithStatus
│
├── Components Exportados
│   ├── WorkspaceListSection (linha 417, ~187 linhas)
│   ├── AddWorkspaceItemDialog (linha 604, ~177 linhas)
│   ├── AddWorkspaceItemSection (linha 781, ~172 linhas)
│   ├── CategoriesSection (linha 953, ~101 linhas)
│   ├── WorkspaceItemActions (linha 1059, ~40 linhas)
│   ├── EditWorkspaceItemDialogContent (linha 1106, ~179 linhas)
│   ├── DeleteWorkspaceItemDialogContent (linha 1292, ~78 linhas)
│   ├── ViewWorkspaceItemDialogContent (linha 1376, ~107 linhas)
│   ├── DraggableWorkspaceItemCard (linha 1487, ~136 linhas)
│   ├── DroppableColumn (linha 1628, ~46 linhas)
│   └── StatusBoardSection (linha 1674, ~180 linhas)
│
└── Exports Duplicados (linhas 1854-1855) ❌
```

### Principais Problemas

1. **Tipos duplicados** (linhas 83-85)
2. **Exports duplicados** (linha 1854-1855)
3. **Variáveis não declaradas** (ideas, setIdeas, loadItems)
4. **Componentes muito grandes** (StatusBoardSection ~180 linhas)
5. **Lógica de estado misturada** com UI

---

## 🏗️ Estrutura Alvo

```
src/components/pages/workspace/
├── WorkspacePage.tsx (100 linhas) ⭐ PRINCIPAL
│
├── types/
│   └── workspace.types.ts (80 linhas)
│       ├── ItemCategory, ItemPriority, ItemStatus
│       ├── Item, Idea
│       └── Config interfaces
│
├── components/
│   ├── WorkspaceListSection.tsx (150 linhas)
│   ├── AddItemDialog.tsx (180 linhas)
│   ├── AddItemSection.tsx (120 linhas)
│   ├── CategoriesSection.tsx (100 linhas)
│   ├── ItemActions.tsx (80 linhas)
│   ├── EditItemDialog.tsx (200 linhas)
│   ├── DeleteItemDialog.tsx (100 linhas)
│   ├── ViewItemDialog.tsx (120 linhas)
│   ├── DraggableItemCard.tsx (150 linhas)
│   ├── DroppableColumn.tsx (80 linhas)
│   └── StatusBoardSection.tsx (200 linhas)
│
├── hooks/
│   ├── useWorkspaceItems.ts (120 linhas) ⭐ CRÍTICO
│   ├── useItemFilters.ts (80 linhas)
│   ├── useItemActions.ts (100 linhas)
│   └── useItemDragDrop.ts (100 linhas)
│
└── constants/
    └── workspace.constants.ts (150 linhas)
        ├── CATEGORY_CONFIGS
        ├── PRIORITY_CONFIGS
        └── STATUS_CONFIGS
```

---

## 📝 Passos de Refatoração (Ordem Recomendada)

### **Fase 1: Preparação** (1-2 horas)

#### 1.1. Criar Estrutura de Diretórios
```bash
cd src/components/pages
mkdir -p workspace/{components,hooks,types,constants}
```

#### 1.2. Extrair Types (workspace/types/workspace.types.ts)
```typescript
// Mover linhas 70-99, 260-390
export type ItemCategory = 'documentacao' | 'coleta-dados' | ...;
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
  createdAt: string;
}

export type Idea = Item;

export interface PriorityConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface StatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export interface CategoryConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

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
```

**Resultado**: -320 linhas do arquivo principal

---

### **Fase 2: Extrair Constants** (30 min)

#### 2.1. Constants (workspace/constants/workspace.constants.ts)
```typescript
import { /* icons */ } from 'lucide-react';
import type { PriorityConfig, StatusConfig, CategoryConfig } from '../types/workspace.types';

export const PRIORITY_CONFIGS: Record<ItemPriority, PriorityConfig> = {
  low: { label: 'Baixa', icon: CheckCircle2, color: 'text-green-600', ... },
  medium: { label: 'Média', icon: AlertCircle, color: 'text-yellow-600', ... },
  high: { label: 'Alta', icon: Zap, color: 'text-orange-600', ... },
  critical: { label: 'Crítica', icon: XCircle, color: 'text-red-600', ... },
};

export const STATUS_CONFIGS: Record<ItemStatus, StatusConfig> = {
  new: { label: 'Nova', icon: Lightbulb, color: 'text-blue-600', ... },
  review: { label: 'Em Revisão', icon: Eye, color: 'text-purple-600', ... },
  'in-progress': { label: 'Em Progresso', icon: Clock, color: 'text-yellow-600', ... },
  completed: { label: 'Concluída', icon: CheckCircle2, color: 'text-green-600', ... },
  rejected: { label: 'Rejeitada', icon: XCircle, color: 'text-red-600', ... },
};

export const CATEGORY_CONFIGS: Record<ItemCategory, CategoryConfig> = {
  documentacao: { label: 'Documentação', icon: FileText, color: 'text-blue-600', ... },
  'coleta-dados': { label: 'Coleta de Dados', icon: Database, color: 'text-green-600', ... },
  'banco-dados': { label: 'Banco de Dados', icon: Database, color: 'text-purple-600', ... },
  'analise-dados': { label: 'Análise de Dados', icon: Brain, color: 'text-orange-600', ... },
  'gestao-riscos': { label: 'Gestão de Riscos', icon: Shield, color: 'text-red-600', ... },
  dashboard: { label: 'Dashboard', icon: BarChart3, color: 'text-cyan-600', ... },
};
```

**Resultado**: -150 linhas adicionais

---

### **Fase 3: Criar Custom Hooks** (2-3 horas) ⭐ CRÍTICO

#### 3.1. useWorkspaceItems.ts (Principal Hook)
```typescript
import { useState, useEffect, useCallback } from 'react';
import { libraryService } from '../../../services/libraryService';
import type { Item } from '../types/workspace.types';

export function useWorkspaceItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await libraryService.getAllItems();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  // Listen for custom events
  useEffect(() => {
    const handleRefresh = () => {
      void loadItems();
    };

    window.addEventListener('idea-created', handleRefresh);
    window.addEventListener('idea-updated', handleRefresh);
    window.addEventListener('idea-deleted', handleRefresh);

    return () => {
      window.removeEventListener('idea-created', handleRefresh);
      window.removeEventListener('idea-updated', handleRefresh);
      window.removeEventListener('idea-deleted', handleRefresh);
    };
  }, [loadItems]);

  return {
    items,
    loading,
    error,
    reload: loadItems,
  };
}
```

#### 3.2. useItemActions.ts
```typescript
import { useCallback } from 'react';
import { libraryService } from '../../../services/libraryService';
import type { Item, ItemFormWithStatus } from '../types/workspace.types';

export function useItemActions() {
  const createItem = useCallback(async (formData: Omit<Item, 'id' | 'createdAt' | 'status'>) => {
    await libraryService.createItem(formData);
    window.dispatchEvent(new CustomEvent('idea-created'));
  }, []);

  const updateItem = useCallback(async (id: string, formData: Partial<ItemFormWithStatus>) => {
    await libraryService.updateItem(id, formData);
    window.dispatchEvent(new CustomEvent('idea-updated'));
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await libraryService.deleteItem(id);
    window.dispatchEvent(new CustomEvent('idea-deleted'));
  }, []);

  return {
    createItem,
    updateItem,
    deleteItem,
  };
}
```

#### 3.3. useItemFilters.ts
```typescript
import { useState, useMemo } from 'react';
import type { Item, ItemCategory, ItemStatus } from '../types/workspace.types';

export function useItemFilters(items: Item[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchTerm === '' ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, statusFilter]);

  return {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    filteredItems,
  };
}
```

#### 3.4. useItemDragDrop.ts
```typescript
import { useState, useCallback } from 'react';
import { useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { Item } from '../types/workspace.types';

export function useItemDragDrop(items: Item[], onItemUpdate: (id: string, updates: Partial<Item>) => Promise<void>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) {
        return;
      }

      const activeItem = items.find((i) => i.id === active.id);
      const newStatus = over.id as ItemStatus;

      if (activeItem && activeItem.status !== newStatus) {
        await onItemUpdate(activeItem.id, { status: newStatus });
      }
    },
    [items, onItemUpdate]
  );

  return {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
  };
}
```

**Resultado**: -400 linhas, lógica isolada

---

### **Fase 4: Extrair Componentes** (4-6 horas)

#### 4.1. Prioridade Alta (Componentes Grandes)

**EditItemDialog.tsx** (~200 linhas)
```typescript
// Extrair linhas 1106-1285
import { useState } from 'react';
import { Dialog, DialogContent, ... } from '../../ui/dialog';
import type { Item, ItemFormWithStatus } from '../types/workspace.types';
import { useItemActions } from '../hooks/useItemActions';
import { CATEGORY_CONFIGS, PRIORITY_CONFIGS, STATUS_CONFIGS } from '../constants/workspace.constants';

interface EditItemDialogProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usingFallbackData?: boolean;
}

export function EditItemDialog({ item, open, onOpenChange, usingFallbackData }: EditItemDialogProps) {
  // ... implementação
}
```

**StatusBoardSection.tsx** (~200 linhas)
```typescript
// Extrair linhas 1674-1854
import { DndContext } from '@dnd-kit/core';
import { useWorkspaceItems } from '../hooks/useWorkspaceItems';
import { useItemActions } from '../hooks/useItemActions';
import { useItemDragDrop } from '../hooks/useItemDragDrop';
import { DroppableColumn } from './DroppableColumn';
import type { ItemStatus } from '../types/workspace.types';

export function StatusBoardSection() {
  const { items, loading } = useWorkspaceItems();
  const { updateItem } = useItemActions();
  const { sensors, activeId, handleDragStart, handleDragEnd } = useItemDragDrop(items, updateItem);

  // ... implementação
}
```

**WorkspaceListSection.tsx** (~150 linhas)
```typescript
// Extrair linhas 417-604
import { useState } from 'react';
import { CollapsibleCard, ... } from '../../ui/collapsible-card';
import { useWorkspaceItems } from '../hooks/useWorkspaceItems';
import { useItemFilters } from '../hooks/useItemFilters';

export function WorkspaceListSection() {
  const { items, loading } = useWorkspaceItems();
  const { filteredItems, searchTerm, setSearchTerm } = useItemFilters(items);

  // ... implementação
}
```

#### 4.2. Prioridade Média (Componentes Médios)

- **AddItemDialog.tsx** (~180 linhas) - Extrair linhas 604-781
- **AddItemSection.tsx** (~120 linhas) - Extrair linhas 781-953
- **DraggableItemCard.tsx** (~150 linhas) - Extrair linhas 1487-1623
- **ViewItemDialog.tsx** (~120 linhas) - Extrair linhas 1376-1483

#### 4.3. Prioridade Baixa (Componentes Pequenos)

- **CategoriesSection.tsx** (~100 linhas) - Extrair linhas 953-1054
- **DeleteItemDialog.tsx** (~100 linhas) - Extrair linhas 1292-1370
- **ItemActions.tsx** (~80 linhas) - Extrair linhas 1059-1099
- **DroppableColumn.tsx** (~80 linhas) - Extrair linhas 1628-1674

---

### **Fase 5: Criar WorkspacePage.tsx Principal** (1 hora)

```typescript
// src/components/pages/workspace/WorkspacePage.tsx (~100 linhas)

import { CollapsibleCard } from '../../ui/collapsible-card';
import { WorkspaceListSection } from './components/WorkspaceListSection';
import { AddItemSection } from './components/AddItemSection';
import { CategoriesSection } from './components/CategoriesSection';
import { StatusBoardSection } from './components/StatusBoardSection';

/**
 * Workspace Page - Central hub for managing ideas and workspace items
 * 
 * Features:
 * - List view with filters
 * - Kanban board with drag-and-drop
 * - Categories overview
 * - CRUD operations
 */
export function WorkspacePage() {
  return (
    <div className="space-y-6">
      {/* Add New Item Section */}
      <AddItemSection />

      {/* Items List with Filters */}
      <WorkspaceListSection />

      {/* Status Board (Kanban) */}
      <StatusBoardSection />

      {/* Categories Overview */}
      <CategoriesSection />
    </div>
  );
}

export default WorkspacePage;
```

---

### **Fase 6: Atualizar Imports** (30 min)

#### 6.1. Atualizar WorkspacePageNew.tsx
```typescript
// src/components/pages/WorkspacePageNew.tsx
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { WorkspaceListSection } from './workspace/components/WorkspaceListSection';
import { StatusBoardSection } from './workspace/components/StatusBoardSection';
import { AddItemSection } from './workspace/components/AddItemSection';
import { CategoriesSection } from './workspace/components/CategoriesSection';

export function WorkspacePageNew() {
  const sections = [
    { id: 'add-item', title: 'Adicionar Item', content: <AddItemSection /> },
    { id: 'list', title: 'Lista de Itens', content: <WorkspaceListSection /> },
    { id: 'board', title: 'Quadro Kanban', content: <StatusBoardSection /> },
    { id: 'categories', title: 'Categorias', content: <CategoriesSection /> },
  ];

  return <CustomizablePageLayout pageId="workspace" sections={sections} defaultColumns={2} />;
}

export default WorkspacePageNew;
```

#### 6.2. Atualizar navigation.tsx
```typescript
// src/data/navigation.tsx
const WorkspacePageNew = React.lazy(() => import('../components/pages/WorkspacePageNew'));
// Sem alterações necessárias - já usa WorkspacePageNew
```

---

### **Fase 7: Testes e Validação** (1-2 horas)

#### 7.1. Verificar Compilação
```bash
cd frontend/apps/dashboard
npm run build
```

#### 7.2. Testar Funcionalidades
- ✅ Criar novo item
- ✅ Editar item existente
- ✅ Deletar item
- ✅ Filtrar por categoria/status
- ✅ Drag & drop no Kanban board
- ✅ Visualizar detalhes

#### 7.3. Verificar Performance
```bash
npm run check:bundle
```

---

## 📈 Resultados Esperados

### Métricas de Código

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Linhas no arquivo principal** | 1,855 | ~100 | **95% ↓** |
| **Arquivos totais** | 1 | ~20 | Melhor organização |
| **Maior arquivo** | 1,855 | ~200 | **89% ↓** |
| **Erros TypeScript** | 40+ | 0 | ✅ Limpo |
| **Reusabilidade** | Baixa | Alta | ✅ Hooks/Componentes |

### Benefícios Imediatos

1. ✅ **Build funciona** - Sem erros TypeScript
2. ✅ **Manutenibilidade** - Arquivos pequenos e focados
3. ✅ **Testabilidade** - Componentes isolados
4. ✅ **Performance** - Re-renders otimizados
5. ✅ **Colaboração** - Múltiplos devs podem trabalhar simultaneamente

---

## 🚀 Atalho Rápido (Correção Mínima)

Se você quer apenas **desbloquear o build** sem refatoração completa:

### 1. Corrigir Exports Duplicados
```typescript
// Remover linhas 1854-1855
// ❌ export const WorkspaceListSection = WorkspaceListSection;
// ❌ export { WorkspaceListSection, StatusBoardSection };
```

### 2. Corrigir useMemo sem return
```typescript
// Linha 1727
const statusGroups = useMemo(() => {
  // ...
  return groups; // ✅ Adicionar return
}, [ideas]); // ✅ Corrigir dependência
```

### 3. Adicionar variáveis faltando
```typescript
// Adicionar no início do componente StatusBoardSection
const [ideas, setIdeas] = useState<Item[]>([]);
const loadItems = useCallback(async () => {
  const data = await libraryService.getAllItems();
  setIdeas(data);
}, []);
```

Isso permite build funcionar, mas **não resolve os problemas estruturais**.

---

## 📋 Checklist de Execução

- [ ] Criar estrutura de diretórios
- [ ] Extrair types para workspace/types/workspace.types.ts
- [ ] Extrair constants para workspace/constants/workspace.constants.ts
- [ ] Criar useWorkspaceItems hook
- [ ] Criar useItemActions hook
- [ ] Criar useItemFilters hook
- [ ] Criar useItemDragDrop hook
- [ ] Extrair StatusBoardSection component
- [ ] Extrair WorkspaceListSection component
- [ ] Extrair EditItemDialog component
- [ ] Extrair AddItemDialog component
- [ ] Extrair outros componentes menores
- [ ] Criar WorkspacePage.tsx principal
- [ ] Atualizar imports em WorkspacePageNew.tsx
- [ ] Testar compilação
- [ ] Testar funcionalidades
- [ ] Validar performance

---

## 💡 Dicas de Implementação

1. **Faça incremental**: Extraia um componente por vez
2. **Teste após cada mudança**: `npm run dev` e verifique funcionamento
3. **Use Git branches**: Crie branch para refatoração
4. **Comece pelos hooks**: Facilita extrair componentes depois
5. **Mantenha testes**: Se houver testes, atualize conforme refatora

---

**Tempo Total Estimado**: 8-12 horas  
**Complexidade**: Alta  
**Impacto**: Crítico (desbloqueia build + melhora manutenibilidade)

---

**Status**: ⚠️ Planejamento completo - Aguardando execução















