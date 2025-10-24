---
title: Workspace App - Estrutura Simplificada
sidebar_position: 1
tags: [documentation]
domain: shared
type: guide
summary: ┌─────────────────────────────────────────┐
status: active
last_review: "2025-10-23"
---

# Workspace App - Estrutura Simplificada

## 🎯 Padrão: 2 Seções (Similar ao TP-Capital)

```
┌─────────────────────────────────────────┐
│ 💡 Workspace                      [+]   │ ← Seção 1: Tabela CRUD
│ ────────────────────────────────────── │
│ Título | Categoria | Status | ...      │
│ • View, Edit, Delete por item          │
│ • Botão "+" no header para adicionar   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📊 Kanban dos Itens                     │ ← Seção 2: Kanban Board
│ ────────────────────────────────────── │
│ [New] [Review] [Progress] [Done] [X]   │
│ • Drag & drop entre colunas            │
│ • 5 colunas de status                  │
└─────────────────────────────────────────┘
```

## 📊 Comparação: TP-Capital vs Workspace

| Item | TP-Capital | Workspace |
|------|------------|-----------|
| **Seções** | 2 (Signals + Logs) | 2 (Table + Kanban) ✅ |
| **Seção 1** | SignalTableCard | WorkspaceListSection ✅ |
| **Seção 2** | LogsCard | StatusBoardSection ✅ |
| **Pattern** | CollapsibleCard | CollapsibleCard ✅ |
| **Layout** | defaultColumns={1} | defaultColumns={1} ✅ |
| **Add Button** | No header | No header (+) ✅ |

## 📂 Estrutura Final

```
WorkspacePageNew.tsx
├── Section 1: WorkspaceListSection
│   ├── Header com botão "+"
│   ├── Tabela CRUD (7 colunas)
│   ├── Ações: View, Edit, Delete
│   └── AddItemDialog (modal ao clicar "+")
│
└── Section 2: StatusBoardSection
    ├── 5 colunas de status
    ├── Drag & drop cards
    └── Atualiza status automaticamente
```

## 🎨 Seções Detalhadas

### 1️⃣ WorkspaceListSection - Tabela CRUD

**Features:**
- ✅ Tabela com 7 colunas
  - Título
  - Categoria
  - Status
  - Prioridade
  - Tags
  - Data
  - Ações
- ✅ Botão "+" no header → Abre AddItemDialog
- ✅ Indicador de sincronização
- ✅ Alerta se API offline
- ✅ Ações por linha: View, Edit, Delete

**Componente:**
```tsx
<CollapsibleCard cardId="workspace-list">
  <CollapsibleCardHeader>
    <div>Workspace</div>
    <Button onClick={() => setShowAddDialog(true)}>
      <Plus /> {/* Botão "+" */}
    </Button>
  </CollapsibleCardHeader>
  <CollapsibleCardContent>
    <table>{/* 7 colunas */}</table>
  </CollapsibleCardContent>
</CollapsibleCard>
```

---

### 2️⃣ StatusBoardSection - Kanban Board

**Features:**
- ✅ 5 colunas de status
  - New (Azul)
  - Review (Amarelo)
  - In Progress (Roxo)
  - Completed (Verde)
  - Rejected (Vermelho)
- ✅ Drag & drop entre colunas
- ✅ Cards visuais com cor por prioridade
- ✅ Atualiza status automaticamente ao mover

**Componente:**
```tsx
<DndContext onDragEnd={handleDragEnd}>
  <CollapsibleCard cardId="workspace-status-board">
    <CollapsibleCardHeader>
      Kanban dos Itens
    </CollapsibleCardHeader>
    <CollapsibleCardContent>
      <div className="grid grid-cols-5">
        {/* 5 DroppableColumn */}
      </div>
    </CollapsibleCardContent>
  </CollapsibleCard>
</DndContext>
```

## 🔄 Fluxo de Uso

### Adicionar Item
```
1. Clicar botão "+" no header da tabela
2. Modal AddItemDialog abre
3. Preencher formulário
4. Salvar
5. Item aparece na tabela E no kanban (coluna "New")
```

### Editar Item
```
Tabela:
1. Clicar botão "Edit" na linha
2. Modal EditItemDialog abre
3. Editar campos
4. Salvar
5. Atualiza na tabela E no kanban

Kanban:
1. Arrastar card entre colunas
2. Status atualiza automaticamente
3. Sincroniza com a tabela
```

### Deletar Item
```
1. Clicar botão "Delete" na linha
2. Confirmar exclusão
3. Remove da tabela E do kanban
```

## 📝 Código Principal

```tsx
// WorkspacePageNew.tsx
export function WorkspacePageNew() {
  useInitializeWorkspaceEvents();

  const sections = useMemo(
    () => [
      {
        id: 'workspace-table',
        content: <WorkspaceListSection />,
      },
      {
        id: 'workspace-kanban',
        content: <StatusBoardSection />,
      },
    ],
    [],
  );

  return (
    <CustomizablePageLayout
      pageId="workspace"
      title="Workspace"
      subtitle="Gestão de ideias, funcionalidades e backlog do projeto"
      sections={sections}
      defaultColumns={1}  // Layout vertical
    />
  );
}
```

## ✅ Checklist Final

- ✅ Apenas 2 seções
- ✅ Seção 1: Tabela CRUD com botão "+"
- ✅ Seção 2: Kanban drag & drop
- ✅ Sem AddItemSection standalone
- ✅ Sem CategoriesSection
- ✅ Layout vertical (1 coluna)
- ✅ Padrão CollapsibleCard
- ✅ Similar ao TP-Capital
- ✅ TypeScript sem erros
- ✅ Build funciona

## 🚀 Uso

```bash
# Backend
cd backend/api/workspace
npm run dev  # http://localhost:3200

# Frontend
cd frontend/apps/workspace
npm run dev  # http://localhost:3900
```

**Acesso:**
- Standalone: `http://localhost:3900`
- Dashboard: `http://localhost:3103/#/workspace`

---

**Estrutura:** ✅ Simplificada (2 seções)  
**Padrão:** ✅ TP-Capital  
**Status:** ✅ Pronto para uso

