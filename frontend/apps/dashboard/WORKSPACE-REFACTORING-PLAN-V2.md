# 📋 Plano de Refatoração - WorkspacePage.tsx (Versão 2 - Revisado)

**Arquivo**: `src/components/pages/WorkspacePage.tsx`  
**Tamanho Atual**: 1,855 linhas  
**Tamanho Alvo**: ~100 linhas (componente principal)  
**Estimativa**: 9-14 horas (ajustado para incluir testes e Zustand)

---

## 🎯 Objetivos

1. ✅ Desbloquear build de produção (corrigir 40+ erros TypeScript)
2. ✅ Melhorar manutenibilidade (arquivos <300 linhas)
3. ✅ Facilitar testes (componentes e lógica isolados)
4. ✅ Melhorar performance (componentes menores e estado centralizado)

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
│
├── components/
│   ├── WorkspaceListSection.tsx (150 linhas)
│   ├── AddItemDialog.tsx (180 linhas)
│   ├── ... (outros componentes)
│
├── hooks/
│   ├── useItemFilters.ts (80 linhas)
│   └── useItemDragDrop.ts (100 linhas)
│
├── store/
│   └── useWorkspaceStore.ts (100 linhas) ⭐ CRÍTICO
│
└── constants/
    └── workspace.constants.ts (150 linhas)
```

---

## 📝 Passos de Refatoração (Ordem Recomendada)

### **Fase 1: Preparação** (1-2 horas)

#### 1.1. Criar Estrutura de Diretórios
```bash
cd src/components/pages
mkdir -p workspace/{components,hooks,types,constants,store}
```

#### 1.2. Extrair Types (workspace/types/workspace.types.ts)
```typescript
// Mover todas as definições de tipo e interface para este ficheiro.
export type ItemCategory = 'documentacao' | 'coleta-dados' | ...;
export type ItemPriority = 'low' | 'medium' | 'high' | 'critical';
// ... etc.
```
**Resultado**: -320 linhas do arquivo principal

---

### **Fase 2: Extrair Constants** (30 min)

#### 2.1. Constants (workspace/constants/workspace.constants.ts)
```typescript
// Mover PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG para este ficheiro.
import { /* icons */ } from 'lucide-react';
import type { PriorityConfig, StatusConfig, CategoryConfig } from '../types/workspace.types';

export const PRIORITY_CONFIGS: Record<ItemPriority, PriorityConfig> = { /* ... */ };
export const STATUS_CONFIGS: Record<ItemStatus, StatusConfig> = { /* ... */ };
export const CATEGORY_CONFIGS: Record<ItemCategory, CategoryConfig> = { /* ... */ };
```
**Resultado**: -150 linhas adicionais

---

### **Fase 3: Criar Store Centralizado com Zustand** (2-3 horas) ⭐ CRÍTICO

**Melhoria Sugerida:** Utilizar a dependência `zustand` para criar um *store* global. Isto simplifica o acesso ao estado, evita "prop-drilling" e melhora a performance dos re-renders.

#### 3.1. useWorkspaceStore.ts (Principal Hook de Estado)
```typescript
// src/components/pages/workspace/store/useWorkspaceStore.ts
import create from 'zustand';
import { libraryService } from '../../../services/libraryService';
import type { Item, ItemFormWithStatus } from '../types/workspace.types';

interface WorkspaceState {
  items: Item[];
  loading: boolean;
  error: Error | null;
  loadItems: () => Promise<void>;
  createItem: (formData: Omit<Item, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateItem: (id: string, formData: Partial<ItemFormWithStatus>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  items: [],
  loading: true,
  error: null,
  loadItems: async () => {
    try {
      set({ loading: true, error: null });
      const data = await libraryService.getAllItems();
      set({ items: data, loading: false });
    } catch (err) {
      set({ error: err as Error, loading: false });
      console.error('Error loading items:', err);
    }
  },
  createItem: async (formData) => {
    await libraryService.createItem(formData);
    window.dispatchEvent(new CustomEvent('idea-created')); // Dispara evento para outros listeners
    await get().loadItems(); // Recarrega os dados
  },
  updateItem: async (id, formData) => {
    await libraryService.updateItem(id, formData);
    window.dispatchEvent(new CustomEvent('idea-updated'));
    await get().loadItems();
  },
  deleteItem: async (id) => {
    await libraryService.deleteItem(id);
    window.dispatchEvent(new CustomEvent('idea-deleted'));
    await get().loadItems();
  },
}));
```
**Resultado**: Lógica de estado centralizada, testável e desacoplada da UI. Os hooks `useWorkspaceItems` e `useItemActions` tornam-se desnecessários.

---

### **Fase 4: Criar Hooks de UI** (1-2 horas)

Com o estado no Zustand, os hooks restantes focam-se na lógica da UI.

#### 4.1. useItemFilters.ts
```typescript
// Lógica para filtrar os itens recebidos do store.
import { useState, useMemo } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
// ... implementação ...
```

#### 4.2. useItemDragDrop.ts
```typescript
// Lógica para o drag-and-drop no Kanban.
import { useCallback } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
// ... implementação ...
```

---

### **Fase 5: Extrair Componentes** (4-6 horas)

Extrair todos os sub-componentes para o diretório `workspace/components/`. Eles agora irão consumir o estado e as ações diretamente do `useWorkspaceStore` em vez de receberem tudo por props.

**Exemplo: StatusBoardSection.tsx**
```typescript
import { DndContext } from '@dnd-kit/core';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useItemDragDrop } from '../hooks/useItemDragDrop';
import { DroppableColumn } from './DroppableColumn';

export function StatusBoardSection() {
  const { items, loading, updateItem } = useWorkspaceStore();
  const { sensors, activeId, handleDragStart, handleDragEnd } = useItemDragDrop(items, updateItem);

  // ... implementação que usa 'items' e 'loading' do store.
}
```

---

### **Fase 6: Criar WorkspacePage.tsx Principal** (1 hora)

O componente principal torna-se um simples orquestrador de layout.

```typescript
// src/components/pages/workspace/WorkspacePage.tsx
import { WorkspaceListSection } from './components/WorkspaceListSection';
import { AddItemSection } from './components/AddItemSection';
import { CategoriesSection } from './components/CategoriesSection';
import { StatusBoardSection } from './components/StatusBoardSection';

export function WorkspacePage() {
  return (
    <div className="space-y-6">
      <AddItemSection />
      <WorkspaceListSection />
      <StatusBoardSection />
      <CategoriesSection />
    </div>
  );
}

export default WorkspacePage;
```

---

### **Fase 7: Testes e Validação (2-3 horas)**

**Melhoria Sugerida:** Adicionar testes automatizados para garantir a qualidade e prevenir regressões.

#### 7.1. Testes Unitários para Store e Hooks
Escrever testes unitários para a lógica de negócio.
*   **Ferramenta**: `vitest` + `React Testing Library (renderHook)`.
*   **Exemplos:**
    *   **`useWorkspaceStore.ts`**: Testar as ações (`loadItems`, `createItem`), mockando o `libraryService`. Verificar se o estado (`items`, `loading`) é atualizado corretamente.
    *   **`useItemFilters.ts`**: Testar a lógica de filtragem, verificando se o `filteredItems` retornado está correto.

#### 7.2. Testes de Componente
Escrever testes de componente para os novos componentes de UI.
*   **Ferramenta**: `vitest` + `React Testing Library`.
*   **Exemplos:**
    *   **`AddItemDialog.tsx`**: Simular o preenchimento do formulário e a submissão, verificando se a ação `createItem` do store é chamada.
    *   **`DroppableColumn.tsx`**: Renderizar a coluna com itens e verificar se todos são exibidos.

#### 7.3. Verificação Manual e de Build
Após a cobertura de testes, realizar uma verificação final.
```bash
# 1. Executar todos os testes automatizados
cd frontend/apps/dashboard
npm test

# 2. Verificar Compilação
npm run build

# 3. Testar Funcionalidades Manualmente (sanity check)
# - Criar, editar e deletar um item.
# - Usar os filtros da lista.
# - Arrastar e soltar um item no quadro Kanban.
```

---

## 📋 Checklist de Execução Revisado

- [ ] Criar estrutura de diretórios (incluindo `store`)
- [ ] Extrair types para `workspace/types/workspace.types.ts`
- [ ] Extrair constants para `workspace/constants/workspace.constants.ts`
- [ ] Criar store Zustand em `workspace/store/useWorkspaceStore.ts`
- [ ] Criar hooks de UI (`useItemFilters`, `useItemDragDrop`)
- [ ] **Escrever testes unitários para o store e os hooks**
- [ ] Extrair `StatusBoardSection` e outros componentes para `workspace/components/`
- [ ] Refatorar componentes para usar o `useWorkspaceStore`
- [ ] **Escrever testes de componente para os componentes extraídos**
- [ ] Criar `WorkspacePage.tsx` principal
- [ ] Atualizar imports e integrações onde `WorkspacePage` é usado
- [ ] **Executar todos os testes automatizados (`npm test`)**
- [ ] Testar compilação (`npm run build`)
- [ ] Realizar teste funcional manual completo

---

**Tempo Total Estimado**: 9-14 horas  
**Complexidade**: Alta  
**Impacto**: Crítico (desbloqueia build + melhora manutenibilidade e testabilidade)
