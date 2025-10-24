# Workspace App - Arquitetura

## 📐 Estrutura Geral

O Workspace é um **app standalone** com interface de **múltiplas seções**, similar ao TP-Capital.

## 🎨 Interface - Padrão Multi-Seções

### Comparação com TP-Capital

```
TP-Capital (Referência):
├── SignalTableCard        → Tabela de sinais
└── LogsCard               → Logs de ingestão

Workspace (Implementação):
├── AddItemSection         → Formulário rápido de criação
├── WorkspaceListSection   → Tabela completa de itens
├── StatusBoardSection     → Kanban drag & drop
└── CategoriesSection      → Estatísticas por categoria
```

## 📂 Estrutura de Arquivos

```
workspace/
├── src/
│   ├── components/
│   │   ├── WorkspacePageNew.tsx          ⭐ Página principal (4 seções)
│   │   ├── workspace/
│   │   │   ├── components/
│   │   │   │   ├── AddItemSection.tsx    ✅ Seção: Quick Add
│   │   │   │   ├── WorkspaceListSection.tsx ✅ Seção: Lista completa
│   │   │   │   ├── StatusBoardSection.tsx ✅ Seção: Kanban board
│   │   │   │   ├── CategoriesSection.tsx ✅ Seção: Stats por categoria
│   │   │   │   ├── AddItemDialog.tsx     (Dialog helper)
│   │   │   │   ├── EditItemDialog.tsx    (Dialog helper)
│   │   │   │   ├── ViewItemDialog.tsx    (Dialog helper)
│   │   │   │   ├── DeleteItemDialog.tsx  (Dialog helper)
│   │   │   │   ├── ItemActions.tsx       (Actions helper)
│   │   │   │   ├── DraggableItemCard.tsx (Kanban card)
│   │   │   │   └── DroppableColumn.tsx   (Kanban column)
│   │   │   ├── store/
│   │   │   │   └── useWorkspaceStore.ts  (Zustand)
│   │   │   ├── hooks/
│   │   │   │   ├── useItemDragDrop.ts
│   │   │   │   └── useItemFilters.ts
│   │   │   ├── types/
│   │   │   │   └── workspace.types.ts
│   │   │   └── constants/
│   │   │       └── workspace.constants.ts
│   │   ├── layout/
│   │   │   ├── Layout.tsx                (App layout)
│   │   │   ├── Header.tsx
│   │   │   ├── CustomizablePageLayout.tsx
│   │   │   ├── DraggableGridLayout.tsx
│   │   │   └── LayoutControls.tsx
│   │   └── ui/                           (Componentes compartilhados)
│   ├── services/
│   │   └── workspaceApi.ts              (API client)
│   ├── store/
│   │   └── toastStore.ts
│   ├── contexts/
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   ├── utils/
│   ├── lib/
│   ├── App.tsx                          (React Router setup)
│   ├── main.tsx                         (Entry point)
│   └── index.css                        (Global styles)
└── package.json                         (Porta 3900)
```

## 🎯 Padrão de Seções

### 1. AddItemSection
**Propósito:** Formulário rápido para criar novos itens

**Features:**
- Formulário compacto com validação
- Campos: título, descrição, categoria, prioridade, tags
- Feedback visual (sucesso/erro)
- CollapsibleCard expansível/colapsável

**Componente:**
```tsx
<CollapsibleCard cardId="workspace-add">
  <CollapsibleCardHeader>
    <Plus /> Adicionar Novo Item
  </CollapsibleCardHeader>
  <CollapsibleCardContent>
    {/* Formulário */}
  </CollapsibleCardContent>
</CollapsibleCard>
```

---

### 2. WorkspaceListSection
**Propósito:** Tabela completa de todos os itens

**Features:**
- Tabela com 7 colunas (título, categoria, status, prioridade, tags, data, ações)
- Indicador de sincronização
- Botão de adicionar item (abre dialog)
- Alerta se API indisponível
- Ações por item (view, edit, delete)
- Ordenação por data de criação

**Componente:**
```tsx
<CollapsibleCard cardId="workspace-list">
  <CollapsibleCardHeader>
    <Lightbulb /> Workspace
    {/* Status de sincronização */}
  </CollapsibleCardHeader>
  <CollapsibleCardContent>
    {/* Tabela de items */}
  </CollapsibleCardContent>
</CollapsibleCard>
```

---

### 3. StatusBoardSection
**Propósito:** Kanban board visual com drag & drop

**Features:**
- 5 colunas (new, review, in-progress, completed, rejected)
- Drag & drop entre colunas (altera status automaticamente)
- Cards visuais com cor por prioridade
- Agrupamento automático por status
- DnD Kit integration

**Componente:**
```tsx
<DndContext sensors={sensors} onDragStart={...} onDragEnd={...}>
  <CollapsibleCard cardId="workspace-status-board">
    <CollapsibleCardHeader>
      <BarChart3 /> Kanban dos Itens
    </CollapsibleCardHeader>
    <CollapsibleCardContent>
      {/* 5 DroppableColumn */}
    </CollapsibleCardContent>
  </CollapsibleCard>
  <DragOverlay>{/* activeItem */}</DragOverlay>
</DndContext>
```

---

### 4. CategoriesSection
**Propósito:** Estatísticas e distribuição por categoria

**Features:**
- 6 cards de categoria (documentacao, coleta-dados, etc)
- Contador de items por categoria
- Ícones e cores por categoria
- Grid responsivo (1/2/3 colunas)

**Componente:**
```tsx
<CollapsibleCard cardId="workspace-categories">
  <CollapsibleCardHeader>
    <Tag /> Itens por Categoria
  </CollapsibleCardHeader>
  <CollapsibleCardContent>
    {/* Grid de 6 cards */}
  </CollapsibleCardContent>
</CollapsibleCard>
```

---

## 🔄 Fluxo de Dados

### Estado Global (Zustand)
```typescript
interface WorkspaceState {
  items: Item[];
  loading: boolean;
  error: Error | null;
  lastSyncedAt: string | null;
  
  loadItems: () => Promise<void>;
  createItem: (data) => Promise<Item>;
  updateItem: (id, data) => Promise<Item>;
  deleteItem: (id) => Promise<void>;
}
```

### API Service
```typescript
workspaceApi.getAllItems()
workspaceApi.createItem(payload)
workspaceApi.updateItem(id, payload)
workspaceApi.deleteItem(id)
```

### Backend Integration
- **API:** `http://localhost:3200/api/items`
- **Proxy:** Configurado no Vite (`/api/workspace` → `:3200/api`)
- **Database:** TimescaleDB `frontend_apps.workspace`

---

## 🎨 Design System

### Padrões Visuais

**Cores de Status:**
- `new` → Azul
- `review` → Amarelo
- `in-progress` → Roxo
- `completed` → Verde
- `rejected` → Vermelho

**Cores de Prioridade:**
- `low` → Cinza
- `medium` → Azul
- `high` → Laranja
- `critical` → Vermelho

**Cores de Categoria:**
- `documentacao` → Azul (`text-blue-600`)
- `coleta-dados` → Verde (`text-green-600`)
- `banco-dados` → Roxo (`text-purple-600`)
- `analise-dados` → Amarelo (`text-amber-600`)
- `gestao-riscos` → Vermelho (`text-red-600`)
- `dashboard` → Cyan (`text-cyan-600`)

---

## 🚀 Uso

### Desenvolvimento
```bash
cd frontend/apps/workspace
npm run dev  # http://localhost:3900
```

### Build
```bash
npm run build
npm run preview
```

### Acesso

**Standalone:**
- `http://localhost:3900`

**Via Dashboard (Embed):**
- `http://localhost:3103/#/workspace`

---

## 📊 Comparação: Antes vs Depois

### ❌ Antes (Standalone Simples)
```tsx
<WorkspacePageNew>
  <CustomizablePageLayout sections={[
    { id: 'ideas-list', content: <WorkspaceListSection /> },
    { id: 'status-board', content: <StatusBoardSection /> }
  ]} defaultColumns={2} />
</WorkspacePageNew>
```

**Problemas:**
- Apenas 2 seções
- Layout fixo em 2 colunas
- Sem quick add
- Sem estatísticas

### ✅ Depois (Multi-Seções como TP-Capital)
```tsx
<WorkspacePageNew>
  <CustomizablePageLayout sections={[
    { id: 'add-item', content: <AddItemSection /> },
    { id: 'ideas-list', content: <WorkspaceListSection /> },
    { id: 'status-board', content: <StatusBoardSection /> },
    { id: 'categories', content: <CategoriesSection /> }
  ]} defaultColumns={1} />
</WorkspacePageNew>
```

**Melhorias:**
- ✅ 4 seções completas
- ✅ Layout em 1 coluna (vertical stack)
- ✅ Cada seção é CollapsibleCard independente
- ✅ Padrão consistente com TP-Capital
- ✅ Quick add form
- ✅ Estatísticas por categoria

---

## 🎯 Benefícios da Nova Estrutura

✅ **Modularidade** - Cada seção é independente  
✅ **Consistência** - Mesmo padrão do TP-Capital  
✅ **Escalabilidade** - Fácil adicionar novas seções  
✅ **UX** - Cada seção pode ser expandida/colapsada  
✅ **Performance** - Lazy loading de seções  
✅ **Manutenibilidade** - Código organizado e limpo

---

## 🔮 Próximas Seções (Futuras)

Seções que podem ser adicionadas:

- **StatisticsSection** - Gráficos e métricas
- **TimelineSection** - Histórico de alterações
- **FilterSection** - Filtros avançados
- **ExportSection** - Export CSV/JSON
- **SettingsSection** - Configurações do workspace

---

**Criado:** 2025-10-23  
**Padrão:** TP-Capital Multi-Section  
**Status:** ✅ Implementado e funcional

