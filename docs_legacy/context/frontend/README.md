---
title: "Frontend Documentation Hub"
tags: ["frontend", "documentation", "index", "hub"]
domain: "frontend"
type: "index"
summary: "Índice central de toda documentação frontend do TradingSystem"
status: "active"
last_review: "2025-10-19"
sidebar_position: 1
---

# Frontend Documentation Hub

> **Central de documentação** para todas as aplicações frontend, componentes, guias e análises do TradingSystem.

## 🎯 Quick Navigation

### 📱 Aplicações

-   **[Dashboard](../../dashboard/README.md)** - Aplicação React principal (Port 3103)
-   **[TP Capital](../../apps/tp-capital/README.md)** - Interface TP Capital (Port 3200)
-   **[B3 Market Data](../../apps/b3-market-data/README.md)** - Interface B3 (Port 3302)

### 📚 Docusaurus (Port 3004)

-   **[Main README](../../../docs/README.md)** - Documentação principal do Docusaurus
-   **[Context Structure](../../../docs/DIRECTORY-STRUCTURE.md)** - Estrutura de documentação
-   **[Documentation Standard](../../../docs/DOCUMENTATION-STANDARD.md)** - Padrão oficial de docs

## 🎨 Design & Themes

### Tema Gemini CLI (Novo! ⭐)

Análise completa e plano de implementação do tema profissional do Gemini CLI.

| Documento                                                                | Descrição                                    | Linhas | Status      |
| ------------------------------------------------------------------------ | -------------------------------------------- | ------ | ----------- |
| **[📊 Resumo Executivo](./GEMINI-CLI-THEME-EXECUTIVE-SUMMARY.md)**       | Overview completo com plano de implementação | 462    | ✅ Ready    |
| **[🔍 Análise Detalhada](./analysis/gemini-cli-style-extraction.md)**    | Sistema de cores, tipografia, componentes    | 951    | ✅ Complete |
| **[📖 Guia de Migração](./guides/gemini-cli-theme-migration.md)**        | Passo-a-passo com código CSS pronto          | 822    | ✅ Complete |
| **[🤖 Script de Extração](./scripts/SCRIPT-EXTRACTION-INSTRUCTIONS.md)** | Automação via Firecrawl                      | 408    | ✅ Complete |

**Total**: 2.643 linhas de documentação técnica

#### Quick Start: Implementar Tema Gemini CLI

```bash
# 1. Revisar resumo executivo
cat docs/context/frontend/GEMINI-CLI-THEME-EXECUTIVE-SUMMARY.md

# 2. Seguir guia de migração
cat docs/context/frontend/guides/gemini-cli-theme-migration.md

# 3. Implementar (mudar para Code mode)
# Use switch_mode para começar implementação
```

## 🧩 Componentes UI

### Biblioteca de Componentes

-   **[Button Standards](../../dashboard/src/components/ui/BUTTON-STANDARDS.md)** - Padrões de botões
-   **[Collapsible Card](../../dashboard/src/components/ui/collapsible-card-standardization.md)** - Cards colapsáveis
-   **[Toast Documentation](../../dashboard/src/components/ui/TOAST-DOCUMENTATION.md)** - Sistema de notificações
-   **[UI Components README](../../dashboard/src/components/ui/README.md)** - Visão geral de componentes

### Componentes Disponíveis

```typescript
// shadcn/ui components
- Accordion
- Badge
- Button
- Button with Dropdown
- Card
- Checkbox
- Collapsible
- Command
- Dialog
- Input
- Label
- Scroll Area
- Select
- Tabs
- Textarea
- Toast
- Tooltip
```

## 📋 Features & Guides

### Features Documentadas

-   **[Idea Bank](./features/idea-bank.md)** - Banco de ideias para documentação
-   **[Escopo Page](./features/escopo-page.md)** - Página de escopo do projeto
-   **[API Hub](../shared/integrations/frontend-backend-api-hub.md)** - Hub de APIs Frontend ↔ Backend

### Guias de Implementação

-   **[Gemini CLI Theme Migration](./guides/gemini-cli-theme-migration.md)** - Migração de tema
-   **[Component Development](../../dashboard/src/components/ui/README.md)** - Desenvolvimento de componentes

## 🏗️ Arquitetura Frontend

### Estrutura de Diretórios

```
frontend/
├── apps/                          # Aplicações frontend
│   ├── dashboard/                # Dashboard principal (React + Vite)
│   │   ├── src/
│   │   │   ├── components/       # Componentes React
│   │   │   ├── contexts/         # React contexts
│   │   │   ├── store/            # Zustand stores
│   │   │   ├── hooks/            # Custom hooks
│   │   │   ├── utils/            # Utilities
│   │   │   └── types/            # TypeScript types
│   │   └── public/               # Static assets
│   ├── tp-capital/               # TP Capital interface
│   └── b3-market-data/           # B3 interface
│
├── shared/                        # Código compartilhado
│   ├── assets/                   # Branding, icons, images
│   │   └── branding/            # Logo variants
│   └── styles/                   # Tailwind configs
│
└── compose/                      # Docker compose files
```

### Tech Stack

-   **Framework**: React 18 + TypeScript
-   **Build Tool**: Vite
-   **Styling**: Tailwind CSS + shadcn/ui
-   **State Management**: Zustand
-   **Routing**: React Router
-   **Forms**: React Hook Form + Zod
-   **HTTP Client**: Axios
-   **Testing**: Vitest + React Testing Library

## 🎨 Design System

### Cores (Atual)

```css
/* Dashboard atual usa Tailwind default */
Primary: Blue (#3B82F6)
Success: Green (#10B981)
Warning: Yellow (#F59E0B)
Danger: Red (#EF4444)
```

### Cores (Gemini CLI - Proposto)

```css
Primary: Purple (#9333EA)
Background: White (#FFFFFF)
Text: Gray (#1F2937)
Border: Light Gray (#E5E7EB)
```

### Tipografia (Atual)

```css
Font Family: System fonts
Headings: Bold
Body: Regular
Code: Monospace
```

### Tipografia (Gemini CLI - Proposto)

```css
Font Family: Inter (UI), JetBrains Mono (Code)
H1: 48px / 800 weight
H2: 32px / 700 weight
Body: 16px / 400 weight
Code: 14px / 400 weight
```

## 🚀 Desenvolvimento

### Executar Dashboard Localmente

```bash
cd frontend/dashboard
npm install
npm run dev
# Acesse: http://localhost:3103
```

### Executar Docusaurus Localmente

```bash
cd docs/docusaurus
npm install
npm run start -- --port 3004
# Acesse: http://localhost:3004
```

### Build de Produção

```bash
# Dashboard
cd frontend/dashboard
npm run build

# Docusaurus
cd docs/docusaurus
npm run build
```

## 🧪 Testes

### Dashboard

```bash
cd frontend/dashboard
npm run test              # Vitest
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### Docusaurus

```bash
cd docs/docusaurus
npm run test
```

## 📦 Dependências Principais

### Dashboard

```json
{
    "react": "^18.x",
    "react-router-dom": "^6.x",
    "zustand": "^4.x",
    "axios": "^1.x",
    "tailwindcss": "^3.x",
    "@radix-ui/react-*": "latest",
    "lucide-react": "latest",
    "recharts": "^2.x"
}
```

### Docusaurus

```json
{
    "@docusaurus/core": "^3.x",
    "@docusaurus/preset-classic": "^3.x",
    "@fontsource/inter": "^5.x",
    "@fontsource/jetbrains-mono": "^5.x"
}
```

## 🔗 Integrações

### APIs Backend

-   **Workspace API** (Port 3200) - Library/Docs management
-   **TP Capital** (Port 3200) - Telegram ingestion
-   **B3** (Port 3302) - Market data
-   **Documentation API** (Port 3400) - Documentation search
-   **Service Launcher** (Port 3500) - Service orchestration
-   **Firecrawl Proxy** (Port 3600) - Web scraping

Ver: [API Hub](../shared/integrations/frontend-backend-api-hub.md)

## 📖 Documentação Relacionada

### Backend

-   [Backend README](../backend/README.md)
-   [API Documentation](../backend/api/)
-   [Service Launcher](../../backend/api/service-launcher/README.md)

### Operations

-   [Health Monitoring](../ops/health-monitoring.md)
-   [Service Startup Guide](../ops/service-startup-guide.md)
-   [Environment Configuration](../ops/ENVIRONMENT-CONFIGURATION.md)

### Product

-   [PRD: Documentation Specs](../shared/product/prd/documentation-specs-plan.md)
-   [PRD: Idea Bank](../shared/product/prd/idea-bank-prd.md)
-   [PRD: Escopo Page](../shared/product/prd/escopo-page-prd.md)

## 🎯 Próximos Passos

### Curto Prazo (Esta Sprint)

1. ✅ Analisar tema Gemini CLI (COMPLETO)
2. ⏳ Implementar tema no Docusaurus
3. ⏳ Criar componentes de navegação melhorados
4. ⏳ Adicionar dark mode consistente

### Médio Prazo (Próximo Mês)

1. Padronizar componentes entre apps
2. Criar biblioteca de componentes compartilhados
3. Implementar design system completo
4. Melhorar performance e acessibilidade

### Longo Prazo (Trimestre)

1. Migrar para arquitetura monorepo
2. Implementar micro-frontends
3. Adicionar testes E2E
4. CI/CD completo para frontend

## 🆘 Precisa de Ajuda?

### Para Design/UI

1. Revise o [Resumo Executivo Gemini CLI](./GEMINI-CLI-THEME-EXECUTIVE-SUMMARY.md)
2. Consulte o [Guia de Migração](./guides/gemini-cli-theme-migration.md)
3. Veja os [UI Components](../../dashboard/src/components/ui/)

### Para Implementação

1. Leia o [Dashboard README](../../dashboard/README.md)
2. Consulte a [API Hub](../shared/integrations/frontend-backend-api-hub.md)
3. Verifique os [Environment Variables](../ops/ENVIRONMENT-CONFIGURATION.md)

### Para Arquitetura

1. Revise o [Directory Structure](../../../docs/DIRECTORY-STRUCTURE.md)
2. Consulte o [Documentation Standard](../../../docs/DOCUMENTATION-STANDARD.md)
3. Veja as [Architecture Decisions](../backend/architecture/decisions/)

## 📝 Contribuindo

### Adicionar Nova Documentação

1. Seguir [Documentation Standard](../../../docs/DOCUMENTATION-STANDARD.md)
2. Incluir YAML frontmatter
3. Adicionar link neste README
4. Criar PR para revisão

### Adicionar Novo Componente

1. Seguir [Button Standards](../../dashboard/src/components/ui/BUTTON-STANDARDS.md)
2. Incluir TypeScript types
3. Adicionar testes
4. Documentar no README do componente

### Adicionar Nova Feature

1. Criar PRD em `docs/context/shared/product/prd/`
2. Documentar em `docs/context/frontend/features/`
3. Implementar seguindo arquitetura
4. Adicionar testes e documentação

---

**Última Atualização**: 2025-10-19  
**Mantido por**: Frontend Team  
**Status**: 🟢 Active

