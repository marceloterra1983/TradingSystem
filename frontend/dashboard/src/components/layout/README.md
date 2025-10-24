# Sistema de Layout Customizável

Sistema completo de layout grid customizável com drag-and-drop para reorganização de componentes.

## 📁 Arquivos

### Hook
- **`useCustomLayout.tsx`** - Hook React para gerenciar estado do layout
  - Controla número de colunas (1, 2, 3, 4)
  - Gerencia mapeamento de componentes → colunas
  - Persiste configuração no `localStorage` por página
  - API: `{ columns, setColumns, getComponentColumn, moveComponent, getComponentsInColumn, resetLayout }`

### Componentes

- **`LayoutControls.tsx`** - Barra de controle do layout
  - Botões para selecionar 1, 2, 3 ou 4 colunas
  - Botão de reset para layout padrão
  - Dica visual sobre drag-and-drop

- **`DraggableGridLayout.tsx`** - Grid com drag-and-drop
  - Usa `@dnd-kit/core` e `@dnd-kit/sortable`
  - Renderiza grid CSS responsivo baseado em número de colunas
  - Cada coluna é uma droppable zone (`useDroppable`)
  - Cada componente usa `useSortable` com `setActivatorNodeRef` para drag handle isolado
  - **Drag handle**: Barra vertical à esquerda (não interfere com cliques no card)
  - **Indicadores visuais**: Números de posição, drop zones, highlights durante drag

- **`CustomizablePageLayout.tsx`** - Wrapper completo para páginas
  - Combina título + controles + grid
  - Recebe array de seções e renderiza automaticamente
  - **Collapse/Expand All**: Botão nos controles para colapsar/expandir todos cards
  - Sincronização via `CustomEvent` ('collapse-all-cards')

## 🎯 Como Usar

### 1. Criar componente de seção

**🚨 CRITICAL REQUIREMENT**: **ALL sections MUST use `CollapsibleCard`** for compatibility with drag-and-drop, collapse/expand all, and state persistence.

**❌ NEVER use plain `<Card>`, `<div>`, or direct content in sections!**

```tsx
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardContent,
} from '../ui/collapsible-card';

export function MinhaSectionComponent() {
  return (
    <CollapsibleCard cardId="minha-section" defaultCollapsed={false}>
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>Minha Seção</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div>Conteúdo da seção...</div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
```

**⚠️ Regras Importantes**:
- ✅ **ALWAYS** use `CollapsibleCard` (NEVER plain `Card`)
- ✅ **ALWAYS** provide unique `cardId` for state persistence
- ✅ Drag handle is managed automatically by `DraggableGridLayout`
- ❌ **NEVER** add drag handlers manually to cards
- ❌ **NEVER** use plain `<div>` or direct content
- ❌ **NEVER** skip `CollapsibleCard` - it breaks all features!

**📖 See full guide:** [collapsible-card-standardization.md](../ui/collapsible-card-standardization.md)

### 2. Criar página com layout customizável

```tsx
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { MinhaSectionComponent } from './MinhaPagina';

export function MinhaPageNew() {
  const sections = [
    {
      id: 'section-1',
      content: <MinhaSectionComponent />,
    },
    {
      id: 'section-2',
      content: <OutraSectionComponent />,
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="minha-pagina"
      title="Minha Página"
      subtitle="Descrição da página"
      sections={sections}
      defaultColumns={2}
    />
  );
}
```

### 3. Registrar na navegação

**IMPORTANTE**: Use `customContent` (não `parts`) para layouts customizáveis.

```tsx
// Em navigation.tsx
import { MinhaPageNew } from '../components/pages/MinhaPageNew';

// ...

{
  id: 'minha-pagina',
  title: 'Minha Página',
  icon: FileText, // Ícone opcional
  header: {
    title: 'Minha Página',
    subtitle: 'Descrição opcional',
  },
  // Use customContent para páginas com CustomizablePageLayout
  customContent: <MinhaPageNew />,
}
```

**📌 Padrão de Navegação**:
- **`customContent`**: Para páginas com `CustomizablePageLayout` (layout grid drag-and-drop)
- **`parts`**: Para páginas com accordion tradicional (padrão antigo - sendo migrado)

## ✨ Funcionalidades

### Controle de Colunas
- **1 Coluna**: Todas seções empilhadas verticalmente
- **2 Colunas**: Grid 2 colunas (responsivo: 1 col em mobile)
- **3 Colunas**: Grid 3 colunas (responsivo: 2 cols em tablet, 1 em mobile)
- **4 Colunas**: Grid 4 colunas (responsivo: 2 cols em tablet, 1 em mobile)

### Drag-and-Drop
- **Drag Handle**: Barra vertical à esquerda de cada card
  - Aparece no hover (`opacity-0` → `opacity-100`)
  - Largura: 1.5px (expande para 2px e fica cyan no hover)
  - Cursor: `grab` (vira `grabbing` durante drag)
  - Separação clara: **arraste a barra** para mover, **clique no header** para colapsar
- **Funcionamento**:
  - Hover sobre componente → aparece barra cinza à esquerda
  - Clique e arraste a barra para mover componente
  - Solte em qualquer coluna ou posição
  - Visual feedback durante drag (opacity, border highlight, indicador de posição)
- **Compatibilidade com Collapse**:
  - Drag handle usa `setActivatorNodeRef` isolado
  - Header do card permanece livre para onClick (collapse/expand)
  - Ambas funcionalidades coexistem sem conflito

### Persistência
- **Storage**: `localStorage`
- **Chave**: `tradingSystem_layout_{pageId}`
- **Formato**: `{ columns: 2, componentLayout: { comp1: 0, comp2: 1, ... } }`
- **Auto-save**: Cada mudança salva automaticamente
- **Isolamento**: Cada página tem sua própria configuração

### Reset
- Botão "Resetar" volta ao layout padrão
- Redistribui componentes igualmente entre colunas
- Útil quando layout fica desorganizado

## 📱 Responsividade

Grid CSS com breakpoints:
- **Mobile** (`< 768px`): Sempre 1 coluna
- **Tablet** (`768px - 1024px`):
  - 3 cols → 2 cols
  - 4 cols → 2 cols
- **Desktop** (`> 1024px`): Respeita escolha do usuário

## 🎨 Estilização

### Classes Tailwind
- Grid: `grid gap-4 grid-cols-{1-4}`
- Droppable zone: `border-2 border-dashed` com hover cyan
- Drag handle: `opacity-0 group-hover:opacity-100 transition-opacity`
- Dark mode: Todas classes com variantes `dark:`

### Animações
- Transições suaves com `transition-colors`, `transition-opacity`
- Transform durante drag com `@dnd-kit/utilities`
- Feedback visual instantâneo

## 📦 Dependências

- **React 18**
- **@dnd-kit/core** (já instalado)
- **@dnd-kit/sortable** (já instalado)
- **@dnd-kit/utilities** (já instalado)
- **lucide-react** (ícones)
- **Tailwind CSS**

## 🔧 Configuração Avançada

### Hook personalizado

```tsx
const {
  columns,
  setColumns,
  getComponentColumn,
  moveComponent,
  getComponentsInColumn,
  resetLayout,
} = useCustomLayout({
  pageId: 'my-page',
  componentIds: ['comp1', 'comp2', 'comp3'],
  defaultColumns: 3,
});

// Alterar colunas programaticamente
setColumns(4);

// Mover componente programaticamente
moveComponent('comp1', 2); // Move para coluna 2

// Obter componentes de uma coluna
const column0Components = getComponentsInColumn(0);

// Reset manual
resetLayout();
```

## 📊 Exemplos de Uso

### ✅ Páginas Implementadas (CustomizablePageLayout)

1. **EscopoPage** (`EscopoPageNew.tsx`)
   - 7 seções collapsible: Overview, Objectives, Architecture, Tech Stack, Systems, Requirements, Constraints
   - Default: 2 colunas
   - Arquivo: `frontend/apps/dashboard/src/components/pages/EscopoPageNew.tsx`
   - Status: ✅ Implementada com drag-and-drop + collapse

**📌 Padrão a seguir**: Todas novas páginas devem usar esta estrutura.

### 🔄 Páginas Pendentes de Migração

As seguintes páginas ainda usam o padrão antigo (accordion) e devem ser migradas:

- **BancoIdeiasPage** → Criar `BancoIdeiasPageNew.tsx`
- **ConnectionsPage** → Criar `ConnectionsPageNew.tsx`
- **PRDsPage** → Já usa CustomizablePageLayout (verificar)
- **DocsPage** → Verificar se precisa migração

## 🚀 Performance

- **Memoização**: Hook usa `useCallback` para prevenir re-renders
- **LocalStorage**: I/O mínimo (apenas em mudanças)
- **Drag**: Activation constraint de 8px previne drags acidentais
- **Renders**: Apenas componentes afetados re-renderizam

## 🐛 Troubleshooting

### Layout não persiste
- Verifique se `pageId` é único e consistente
- Confirme que localStorage está habilitado no navegador

### Drag não funciona
- Verifique se `@dnd-kit/*` está instalado
- Confirme que componentes têm IDs únicos
- **NÃO** adicione drag handlers nos cards - use apenas `DraggableGridLayout`

### Collapse não funciona
- ✅ **Solução implementada**: Usamos `setActivatorNodeRef` para isolar drag handle
- Drag handle é a barra vertical à esquerda (não interfere com cliques)
- Header do `CollapsibleCard` permanece clicável

### Componentes sobrepostos
- Use `gap-1` ou `gap-4` no grid para espaçamento adequado
- Verifique se todos componentes estão em cards com padding

### ⚠️ CONFLITO DRAG + COLLAPSE (RESOLVIDO)
**Problema anterior**: Aplicar drag `listeners` diretamente no card capturava todos eventos de clique.

**Solução atual**:
- Drag handle isolado (`setActivatorNodeRef`) como barra vertical à esquerda
- Header do card livre para onClick (collapse/expand)
- Ambas funcionalidades coexistem perfeitamente

**Não faça**:
```tsx
// ❌ ERRADO - Captura todos cliques
<div {...listeners} onClick={toggleCollapse}>
  <Card>...</Card>
</div>
```

**Faça**:
```tsx
// ✅ CORRETO - DraggableGridLayout gerencia tudo
<CustomizablePageLayout sections={[...]} />
// O drag handle e collapse são automáticos
```

## 🔄 Guia de Migração (Accordion → CustomizablePageLayout)

### Passo a Passo

**1. Criar arquivo `*PageNew.tsx`** (manter arquivo antigo por enquanto)

**2. Extrair seções do accordion para componentes**

Antes (accordion):
```tsx
<Accordion>
  <AccordionItem value="section1">
    <AccordionTrigger>Título</AccordionTrigger>
    <AccordionContent>Conteúdo...</AccordionContent>
  </AccordionItem>
</Accordion>
```

Depois (CollapsibleCard):
```tsx
function Section1() {
  return (
    <CollapsibleCard cardId="page-section1">
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>Título</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div>Conteúdo...</div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
```

**3. Criar array de seções**

```tsx
const sections = [
  { id: 'section1', content: <Section1 /> },
  { id: 'section2', content: <Section2 /> },
  // ... mais seções
];
```

**4. Usar CustomizablePageLayout**

```tsx
return (
  <CustomizablePageLayout
    pageId="nome-da-pagina"
    title="Título da Página"
    sections={sections}
    defaultColumns={2}
  />
);
```

**5. Atualizar navigation.tsx**

```tsx
// De:
{
  id: 'pagina',
  title: 'Página',
  parts: [...]
}

// Para:
{
  id: 'pagina',
  title: 'Página',
  customContent: <PaginaPageNew />
}
```

**6. Testar e substituir**
- Teste todas funcionalidades (drag, collapse, persistência)
- Quando estável, renomear `*PageNew.tsx` → `*Page.tsx`
- Deletar arquivo antigo

## 📝 TODO Futuro

- [ ] Migrar BancoIdeiasPage para CustomizablePageLayout
- [ ] Migrar ConnectionsPage para CustomizablePageLayout
- [ ] Adicionar undo/redo para mudanças de layout
- [ ] Exportar/importar configurações de layout
- [ ] Adicionar mais opções de grid (5, 6 colunas)
- [ ] Layout masonry (colunas de altura variável)
- [ ] Compartilhar layouts entre usuários
