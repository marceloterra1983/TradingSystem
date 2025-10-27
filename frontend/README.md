---
title: 🎨 Frontend - TradingSystem
sidebar_position: 1
tags:
  - frontend
domain: frontend
type: index
summary: '> TradingSystem Frontend - Sistema completo de dashboard para documentação,
  monitoramento e gestão d'
status: active
last_review: '2025-10-23'
---

# 🎨 Frontend - TradingSystem

> **TradingSystem Frontend** - Sistema completo de dashboard para documentação, monitoramento e gestão de trading
>
> **Stack:** React 18 + TypeScript + Vite + Tailwind CSS  
> **Architecture:** Component-based, Clean Architecture  
> **Status:** ✅ Production Ready

---

## 📋 Visão Geral

O frontend do TradingSystem é organizado em estrutura modular com aplicação principal e recursos compartilhados.

```text
frontend/
├── dashboard/        # Aplicação principal (React + TypeScript)
├── shared/           # Recursos compartilhados (branding)
└── tokens/           # Design tokens (cores, espaçamento)
```

---

## 🎯 Dashboard - Aplicação Principal

**URL:** http://localhost:3103  
**Versão:** 1.2.0  
**Status:** ✅ Totalmente Funcional

### Características Principais

- 📚 **46 páginas** interativas de documentação e gestão
- 📡 **TP Capital** - Monitoramento de sinais de opções via Telegram
- 🔌 **Connections** - Gestão de conexões e serviços
- 📈 **Analytics** - Métricas em tempo real
- ⚙️ **Settings** - Ferramentas administrativas

---

## 🏗️ Stack Tecnológico

### Core Framework
```
React 18.2.0          - Framework UI
TypeScript 5.3.3      - Tipagem estática
Vite 7.1.10           - Build tool e dev server
Node.js 22+           - Runtime
npm                   - Package manager
```

### UI & Styling
```
Tailwind CSS 3.4.1             - CSS utility-first
shadcn/ui + Radix UI           - Componentes acessíveis
@tailwindcss/typography 0.5.19 - Typography
Lucide React 0.309.0           - Ícones
Framer Motion 12.23.22         - Animações
```

### State & Data Management
```
Zustand 4.4.7                  - State management global
@tanstack/react-query 5.17.19  - Server state & caching
Axios 1.6.5                    - HTTP client
react-markdown 10.1.0          - Renderização de markdown
```

### Feature Libraries
```
@dnd-kit 6.3.1        - Drag-and-drop
Recharts 2.10.3       - Gráficos
date-fns 3.0.6        - Manipulação de datas
```

### Testing
```
Vitest 3.2.4                    - Test runner
@testing-library/react 14.1.2   - Testing utilities
@vitest/coverage-v8 3.2.4       - Cobertura de testes
```

---

## 🚀 Quick Start

### Desenvolvimento

```bash
# 1. Navegar para o dashboard
cd frontend/dashboard

# 2. Instalar dependências
npm install

# 3. Iniciar dev server
npm run dev
# Abre em: http://localhost:3103

# 4. Verificar tipos (opcional)
npm run type-check

# 5. Lint (opcional)
npm run lint
npm run lint:fix
```

### Build de Produção

```bash
cd frontend/dashboard

# Build otimizado
npm run build

# Preview do build
npm run preview

# Análise de bundles
npm run build:analyze
```

### Testes

```bash
# Testes unitários
npm run test

# Watch mode
npm run test:watch

# Cobertura
npm run test:coverage
```

---

## 📁 Estrutura de Componentes

### Dashboard (`/frontend/dashboard/`)

```
dashboard/
├── src/
│   ├── components/
│   │   ├── pages/           - 46 páginas refatoradas
│   │   │   ├── TPCapitalOpcoesPage.tsx
│   │   │   ├── tp-capital/  - Componentes do TP Capital
│   │   │   ├── launcher/    - Seção de launcher
│   │   │   ├── database/    - Páginas de database
│   │   │   └── workspace/   - Kanban board
│   │   ├── ui/              - 21 componentes UI (shadcn/ui)
│   │   ├── layout/          - Layouts customizáveis com drag-and-drop
│   │   ├── history/         - Histórico e jobs
│   │   ├── trading/         - Componentes de trading
│   │   └── scraping/        - Web scraping UI
│   ├── services/            - 7 clientes de API
│   │   ├── apiService.ts
│   │   ├── documentationService.ts
│   │   ├── firecrawlService.ts
│   │   ├── libraryService.ts
│   │   ├── tpCapitalService.ts
│   │   └── workspaceService.ts
│   ├── hooks/               - React hooks customizados
│   ├── contexts/            - React contexts (Theme, Search, Trading)
│   ├── store/               - Zustand stores
│   ├── utils/               - Funções utilitárias
│   ├── config/              - Configurações (api.ts)
│   ├── data/                - Dados de navegação
│   ├── lib/                 - Bibliotecas auxiliares
│   ├── types/               - TypeScript type definitions
│   └── __tests__/           - Testes unitários
│
├── public/
│   ├── assets/branding/     - Logos e identidade visual
│   └── docs/                - PRDs copiados (build)
│
├── scripts/                 - Scripts de build
│   ├── copy-docs.js         - Copia PRDs para public
│   └── watch-docs.js        - Watch de mudanças em PRDs
│
├── Dockerfile               - Container config
├── vite.config.ts           - Configuração Vite + Proxies
├── tailwind.config.js       - Configuração Tailwind
├── tsconfig.json            - TypeScript config
├── package.json             - Dependências (31 deps + 26 devDeps)
└── README.md                - Este arquivo
```

---

## 🎨 Sistema de Layout Customizável

### CustomizablePageLayout

Sistema completo de layout grid customizável com drag-and-drop para reorganização de componentes.

**Funcionalidades**:
- ✅ **Drag-and-drop** - Reorganize componentes arrastando
- ✅ **Grid responsivo** - 1, 2, 3 ou 4 colunas
- ✅ **Collapse/Expand All** - Colapsar/expandir todos cards
- ✅ **Persistência** - Layout salvo no localStorage
- ✅ **Reset** - Voltar ao layout padrão

**Uso Básico**:
```tsx
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { MinhaSection } from './sections/MinhaSection';

export function MinhaPage() {
  const sections = [
    { id: 'section-1', content: <MinhaSection /> },
    { id: 'section-2', content: <OutraSection /> },
  ];

  return (
    <CustomizablePageLayout
      pageId="minha-pagina"
      title="Minha Página"
      sections={sections}
      defaultColumns={2}
    />
  );
}
```

**Páginas que Usam CustomizablePageLayout**:
- ✅ TPCapitalOpcoesPage (refatorada)
- ✅ EscopoPageNew
- ✅ ConnectionsPageNew
- ✅ WorkspacePageNew

**Componentes**:
- `CustomizablePageLayout.tsx` - Wrapper completo
- `DraggableGridLayout.tsx` - Grid com drag-and-drop
- `LayoutControls.tsx` - Controles de colunas
- `useCustomLayout.tsx` - Hook de gerenciamento

---

## 🧩 Componentes UI (shadcn/ui)

### Componentes Disponíveis (21)

```
Formulários:
- button.tsx           - Botões (variants: default, ghost, outline)
- input.tsx            - Campos de entrada
- textarea.tsx         - Campos de texto longo
- checkbox.tsx         - Checkboxes
- select.tsx           - Seletores dropdown
- label.tsx            - Labels de formulário

Layout:
- card.tsx             - Cards básicos
- collapsible-card.tsx - Cards colapsáveis (drag-and-drop)
- collapsible.tsx      - Collapsible primitivo
- accordion.tsx        - Acordeão
- tabs.tsx             - Abas
- scroll-area.tsx      - Área com scroll customizado

Feedback:
- dialog.tsx           - Modais/Diálogos
- toast.tsx            - Notificações
- tooltip.tsx          - Tooltips
- badge.tsx            - Badges
- skeleton.tsx         - Loading skeletons

Actions:
- action-buttons.tsx   - Botões de ação padronizados
- button-with-dropdown.tsx - Botões com dropdown

Utilities:
- command.tsx          - Command palette
- placeholder-section.tsx - Placeholders
```

### Padrões de Ação

Todos os botões de ação seguem padrões consistentes:

```tsx
import { AddButton, EditButton, DeleteButton, ViewButton } from '../ui/action-buttons';

<AddButton onClick={handleCreate} />        // Adicionar
<ViewButton onClick={handleView} />         // Visualizar
<EditButton onClick={handleEdit} />         // Editar
<DeleteButton onClick={handleDelete} />     // Deletar
```

**Especificações**:
- Tamanho: `h-10 w-10` (40x40px)
- Ícone: `h-5 w-5` (20x20px)
- Padding: `p-0` (centralizado)
- Estilo: Ghost com hover

---

## 🔌 Configuração de APIs

### Proxies do Vite

```typescript
// vite.config.ts
proxy: {
  '/api/library':     → http://localhost:3200  // Workspace API
  '/api/tp-capital':  → http://localhost:4005  // TP Capital API
  '/api/docs':        → http://localhost:3400  // Documentation API
  '/api/launcher':    → http://localhost:3500  // Launcher/Status API
  '/api/firecrawl':   → http://localhost:3600  // Firecrawl Proxy
  '/mcp':             → http://localhost:3847  // MCP Server
  '/docs':            → http://localhost:3205  // Docusaurus (v3)
}
```

### Serviços de API

Cada serviço tem seu cliente dedicado em `src/services/`:

```typescript
// Exemplo de uso
import { tpCapitalService } from '../services/tpCapitalService';

const signals = await tpCapitalService.getSignals({ limit: 100 });
const logs = await tpCapitalService.getLogs({ limit: 50 });
```

---

## 🎨 Design System

### Brand Assets (`/frontend/shared/assets/branding/`)

```
Logos Disponíveis:
├── logo.svg          - Logo completo (400x80px) - tema claro
├── logo-dark.svg     - Logo completo (400x80px) - tema escuro
├── logo-compact.svg  - Logo compacto (280x60px) - sem tagline
└── logo-icon.svg     - Apenas ícone (60x80px) - favicon

Especificações:
- Cores primárias: #3b82f6 (blue), #10b981 (green), #f59e0b (amber)
- Tipografia: Inter, Segoe UI, system-ui
- Formato: SVG (escalável, ~2-4KB)
```

### Design Tokens (`/frontend/tokens/core.json`)

```json
{
  "color": {
    "primary": "#9333EA",    // Gemini CLI purple
    "success": "#10B981"     // Verde sucesso
  },
  "spacing": {
    "sm": "8px",
    "md": "16px"
  }
}
```

---

## 📊 Páginas Refatoradas (Padrão de Excelência)

### TP Capital Opções (785 → 39 linhas)

**Redução de 95%** através de componentização modular:

```
tp-capital/
├── TPCapitalOpcoesPage.tsx     39 linhas  - Página principal
├── SignalsTable.tsx           277 linhas  - Tabela de sinais
├── LogsViewer.tsx             156 linhas  - Logs de ingestão
├── api.ts                      62 linhas  - Camada de API
├── utils.ts                   129 linhas  - Utilitários
├── types.ts                    42 linhas  - Tipos TypeScript
└── constants.ts                52 linhas  - Constantes
```

## 📱 Páginas Disponíveis (46)

### 📊 Dashboard & Analytics
- DashboardPage - Visão geral do sistema
- OverviewPage - Overview geral
- PerformancePage - Performance e análises

### 📚 Documentação
- DocusaurusPage - Hub de documentação Docusaurus
- DocumentationPage - Sistema de documentação
- DocumentationStatsPageSimple - Estatísticas
- DocumentationSystemsPageSimple - Sistemas documentados
- PRDsPage - Product Requirements Documents
- ADRPage - Architecture Decision Records
- FeaturesPage - Funcionalidades
- RoadmapPage - Roadmap do projeto
- MetadataPage - Metadados

### 💡 Workspace & Ideas
- WorkspacePageNew - Kanban board com drag-and-drop
- EscopoPageNew - Escopo e planejamento

### 📡 Conexões & Integrações
- ConnectionsPageNew - Gestão de conexões (WebSocket, ProfitDLL, Services)
- TelegramDataPage - Dados do Telegram

### 📈 Trading & Mercado
- **TPCapitalOpcoesPage** ⭐ - Sinais TP Capital (refatorada)
- MarketOverviewPage - Overview do mercado
- SignalsPage - Sinais de trading
- PositionsPage - Posições abertas
- OrdersPage - Ordens
- SubscriptionsPage - Assinaturas

### 🤖 Infrastructure & AI
- LauncherPage - Status e launcher de serviços
- LangGraphPage - LangGraph orchestrator
- LlamaIndexPage - LlamaIndex RAG services
- LangChainVectorPage - Vector store (Qdrant)
- AgnoAgentsPage - Agno multi-agent framework

### 🗄️ Database & Tools
- DatabasePage - Ferramentas de database (pgAdmin, pgWeb, QuestDB)
- ParquetBrowserPage - Navegador de arquivos Parquet
- MiroPage - Miro board embarcado
- MCPControlPage - MCP server control

### ⚙️ Settings & Admin
- SettingsPage - Configurações do sistema
- AdminToolsPage - Ferramentas administrativas
- BackupRestorePage - Backup e restore
- RiskControlsPage - Controles de risco
- RiskLimitsPage - Limites de risco

### 📊 Logs & Monitoring
- LogsColetaPage - Logs de coleta
- LogsDashboardPage - Dashboard de logs
- LiveFeedPage - Feed ao vivo

### 🎯 Other
- URLsPage - Gerenciador de URLs
- DocsApiPage - API de documentação

---

## 🛠️ Scripts NPM Disponíveis

```bash
# Desenvolvimento
npm run dev              # Dev server (watch:docs + dev:vite)
npm run dev:vite         # Apenas Vite (sem watch de docs)

# Build
npm run build            # Build produção (com copy:docs)
npm run build:dev        # Build desenvolvimento
npm run build:analyze    # Build com análise de bundles
npm run preview          # Preview do build
npm run preview:open     # Preview e abre navegador

# Qualidade de Código
npm run lint             # ESLint
npm run lint:fix         # ESLint com auto-fix
npm run lint:report      # Relatório detalhado
npm run type-check       # TypeScript type checking

# Testes
npm run test             # Vitest
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Cobertura de testes

# Documentação
npm run watch:docs       # Observa mudanças em PRDs
npm run copy:docs        # Copia PRDs para public

# Utilitários
npm run check:bundle     # Verifica tamanhos de bundles
```

---

## 📦 Componentização Modular

### Estrutura de Página Refatorada (Padrão)

Para páginas complexas, siga o padrão de modularização:

```
pages/
├── MinhaPage.tsx              # Página principal (< 50 linhas)
└── minha-page/                # Pasta de componentes
    ├── types.ts               # Tipos TypeScript
    ├── constants.ts           # Constantes e dados de exemplo
    ├── utils.ts               # Utilitários e formatadores
    ├── api.ts                 # Camada de API
    ├── ComponentePrincipal.tsx  # Componente UI principal
    └── ComponenteSecundario.tsx # Outros componentes
```

**Benefícios**:
- ✅ Cada arquivo < 300 linhas
- ✅ Responsabilidades claras
- ✅ Fácil de testar
- ✅ Reutilizável
- ✅ Manutenível

---

## 🔧 Configuração do Vite

### Proxies Configurados

O Vite redireciona requisições `/api/*` para os respectivos backends:

```typescript
// Exemplo de requisição no frontend
fetch('/api/tp-capital/signals')
// É redirecionada para → http://localhost:4005/signals

fetch('/api/b3/overview')
// É redirecionada para → http://localhost:3302/overview
```

### Otimizações de Build

- **Code Splitting**: 30 chunks separados
- **Lazy Loading**: Páginas carregadas sob demanda
- **Tree Shaking**: Código não usado é removido
- **Minification**: Terser com drop_console em produção
- **Source Maps**: Disponíveis em desenvolvimento

**Bundle Sizes**:
- Total: ~1.1MB (gzipped: ~350KB)
- Initial load: ~400KB
- Lazy chunks: 10-50KB cada

---

## 🧪 Testes

### Vitest Configuration

```bash
# Executar testes
npm run test

# Watch mode
npm run test:watch

# Cobertura
npm run test:coverage
# Gera relatório em: coverage/index.html
```

**Testes Implementados**:
- ✅ `documentation-page.spec.tsx` - Testes de documentação
- ✅ `connections-page.fetch-service-launcher-status.test.ts` - Testes de API
- ✅ `setup.ts` - Setup global de testes

**Target de Cobertura**: 80% (branches, functions, lines, statements)

---

## 🎯 Padrões de Desenvolvimento

### Estrutura de Componente

```tsx
// 1. Imports (ordenados)
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';

// 2. Types
interface Props {
  data: DataType;
  onAction: () => void;
}

// 3. Component
export function MeuComponente({ data, onAction }: Props) {
  // 4. State
  const [state, setState] = useState();
  
  // 5. Queries
  const { data } = useQuery(...);
  
  // 6. Handlers
  const handleClick = () => { ... };
  
  // 7. Render
  return (
    <div>...</div>
  );
}
```

### Nomenclatura

- **Componentes**: PascalCase (`MinhaPage.tsx`)
- **Hooks**: camelCase com prefixo `use` (`useMinhaLogica.ts`)
- **Utils**: camelCase (`formatNumber.ts`)
- **Types**: PascalCase (`MinhaInterface`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_LIMIT`)

### Organização de Imports

```tsx
// 1. React
import { useState, useEffect } from 'react';

// 2. Bibliotecas externas
import { useQuery } from '@tanstack/react-query';

// 3. Componentes UI
import { Button } from '../ui/button';

// 4. Componentes locais
import { MinhaSection } from './sections/MinhaSection';

// 5. Services
import { apiService } from '../../services/apiService';

// 6. Utils e types
import { formatNumber } from '../../utils/formatters';
import type { MinhaInterface } from './types';
```

---

## 🚀 Performance & Otimizações

### Lazy Loading

Páginas carregadas sob demanda para reduzir bundle inicial:

```tsx
// navigation.tsx
const TPCapitalOpcoesPage = React.lazy(
  () => import('../components/pages/TPCapitalOpcoesPage')
);
```

### React Query

Cache inteligente com revalidação:

```tsx
useQuery({
  queryKey: ['tp-capital-signals'],
  queryFn: fetchSignals,
  staleTime: 60_000,        // 1 minuto
  refetchInterval: 5_000,    // Refetch a cada 5s
  placeholderData: (prev) => prev,  // Mantém dados anteriores
});
```

### Memoização

```tsx
// Computações pesadas
const filteredData = useMemo(
  () => data.filter(condition),
  [data, condition]
);

// Callbacks estáveis
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

---

## 🐛 Troubleshooting

### Dashboard não inicia

```bash
# Verificar se porta 3103 está livre
lsof -ti:3103

# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install

# Tentar novamente
npm run dev
```

### Erros de Tipo TypeScript

```bash
# Verificar tipos
npm run type-check

# Se muitos erros, pode ser cache do IDE
# Recarregar window do VS Code
```

### APIs retornam 404/500

```bash
# Verificar se backends estão rodando
lsof -ti:4005   # TP Capital
lsof -ti:3200   # Workspace

# Iniciar backends
cd apps/tp-capital && npm start
```

### Proxy não funciona

Verifique `vite.config.ts`:
- Portas corretas no proxy
- `changeOrigin: true` habilitado
- Paths de rewrite corretos

---

## 📝 Scripts de Manutenção

### Monitorar Arquivos Temporários

```bash
# Verificar arquivos temporários no projeto
bash scripts/maintenance/monitor-temp-files.sh

# Limpar arquivos temporários
bash scripts/maintenance/cleanup-temp-files.sh
```

### Verificar Componentes Não Usados

```bash
# Identificar componentes que não são importados
bash scripts/maintenance/check-unused-components.sh
```

---

## 📚 Documentação Técnica

### Guias de Componentes

Documentos dentro do código para referência:

- `src/components/ui/BUTTON-STANDARDS.md` - Padrões de botões
- `src/components/ui/TOAST-DOCUMENTATION.md` - Sistema de toast
- `src/components/ui/collapsible-card-standardization.md` - Cards colapsáveis

### PRDs Disponíveis

Product Requirements Documents em `public/docs/context/shared/product/prd/`:

- `en/docusaurus-implementation-prd.md`
- `en/idea-bank-prd.md`
- `en/prometheus-monitoring-prd.md`
- `en/tp-capital-signal-table-prd.md`
- `en/tp-capital-telegram-connections-prd.md`
- `pt/agno-integration-prd.md`
- `pt/documentation-specs-plan.md`

Estes arquivos são copiados automaticamente dos `docs/` principais durante build.

---

## 🔐 Variáveis de Ambiente

### Desenvolvimento

Criar `.env` em `frontend/dashboard/` (opcional - tem defaults):

```env
# Porta do dashboard
VITE_DASHBOARD_PORT=3103

# Base URL (para domínio unificado)
VITE_API_BASE_URL=http://tradingsystem.local

# Proxies individuais (sobrescrevem defaults)
VITE_TP_CAPITAL_PROXY_TARGET=http://localhost:4005
VITE_WORKSPACE_PROXY_TARGET=http://localhost:3200
```

### Produção

Ver `.env.example` para todas as opções disponíveis.

---

## 🎓 Como Adicionar Nova Página

### 1. Criar Componente

```bash
cd frontend/dashboard/src/components/pages
```

```tsx
// MinhaNovaPage.tsx
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { MinhaSection } from './minha-nova-page/MinhaSection';

export function MinhaNovaPage() {
  const sections = [
    { id: 'secao-1', content: <MinhaSection /> },
  ];

  return (
    <CustomizablePageLayout
      pageId="minha-nova-page"
      title="Minha Nova Página"
      sections={sections}
      defaultColumns={1}
    />
  );
}
```

### 2. Registrar em Navigation

```tsx
// src/data/navigation.tsx
import { MinhaNovaPage } from '../components/pages/MinhaNovaPage';

// Adicionar no array de pages da seção apropriada:
{
  id: 'minha-nova-page',
  title: 'Minha Nova Página',
  header: {
    title: 'Minha Nova Página',
    subtitle: 'Descrição opcional',
  },
  parts: [],
  customContent: <MinhaNovaPage />,
  icon: <IconName className="h-4 w-4" />,
}
```

### 3. Testar

```bash
npm run dev
# Acessar: http://localhost:3103
# Navegar para a nova página
```

---

## 📊 Métricas do Projeto

```
Total de arquivos:         196
Arquivos TypeScript/React: 151
Páginas:                    46
Componentes UI:             21
Serviços de API:             7
Hooks customizados:         ~15
Tamanho (com node_modules): 352MB
Tamanho (código fonte):     ~2MB
```

---

## 🔄 Roadmap de Melhorias

### Concluído ✅
- ✅ Refatoração TPCapitalOpcoesPage (785 → 39 linhas)
- ✅ Scripts de monitoramento de temporários
- ✅ Script de verificação de componentes não usados
- ✅ Limpeza de arquivos obsoletos
- ✅ Consolidação de READMEs

### Futuro (Opcional)
- [ ] Refatorar páginas de Launcher (>400 linhas cada)
- [ ] Implementar testes E2E com Playwright
- [ ] Adicionar Storybook para componentes UI
- [ ] Implementar i18n (internacionalização)
- [ ] PWA (Progressive Web App)
- [ ] Server-Side Rendering (SSR)

---

## 🤝 Contribuindo

1. Siga os padrões de componentização
2. Mantenha arquivos < 300 linhas
3. Use TypeScript strict mode
4. Adicione testes para novas funcionalidades
5. Documente componentes complexos
6. Execute `npm run lint` e `npm run type-check` antes de commitar

---

## 📞 Suporte

Para questões sobre o frontend:

1. Verifique esta documentação
2. Consulte `docs/context/frontend/` (documentação técnica)
3. Veja exemplos nas páginas refatoradas (TP Capital)
4. Crie uma issue no repositório

---

**Versão**: 2.0.0  
**Última Atualização**: 2025-10-23  
**Maintainer**: TradingSystem Team  
**Status**: ✅ Production Ready & Refatorado

---

## 🎉 Conquistas Recentes

- **Outubro 2025**: Refatoração completa das páginas maiores (TPCapital)
- **Redução total**: 1,208 → 76 linhas nas páginas principais (-94%)
- **Novos padrões**: Componentização modular estabelecida
- **Scripts de manutenção**: Monitoramento automático implementado
- **Limpeza**: 6 arquivos obsoletos removidos
- **Estrutura**: Pasta frontend 100% organizada e documentada
