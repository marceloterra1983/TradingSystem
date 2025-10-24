---
title: Workspace App - Standalone
sidebar_position: 1
tags: [documentation]
domain: shared
type: index
summary: Sistema de gestão de ideias e funcionalidades para o TradingSystem. App standalone completo com interface drag-and-drop e kanban board.
status: active
last_review: "2025-10-23"
---

# Workspace App - Standalone

Sistema de gestão de ideias e funcionalidades para o TradingSystem. App standalone completo com interface drag-and-drop e kanban board.

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Backend API rodando na porta 3200 (workspace-api)

### Instalação

```bash
cd frontend/apps/workspace
npm install
```

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento (porta 3900)
npm run dev
```

O app estará disponível em: **http://localhost:3900**

### Build para Produção

```bash
npm run build        # Build otimizado
npm run preview      # Preview do build
```

## 📋 Funcionalidades

### ✨ Principais Features

- **Gestão de Ideias** - CRUD completo de itens com validação
- **Kanban Board** - Quadro visual com drag & drop
- **Categorização** - 6 categorias de sistema
- **Priorização** - 4 níveis de prioridade
- **Status Tracking** - 5 estados de progresso
- **Tags** - Sistema flexível de tags
- **Dark Mode** - Tema claro/escuro
- **Responsive** - Design responsivo mobile-first

### 🎨 Categorias

- `documentacao` - Documentação
- `coleta-dados` - Coleta de Dados
- `banco-dados` - Banco de Dados
- `analise-dados` - Análise de Dados
- `gestao-riscos` - Gestão de Riscos
- `dashboard` - Dashboard

### 📊 Prioridades

- `low` - Baixa
- `medium` - Média
- `high` - Alta
- `critical` - Crítica

### 🔄 Status

- `new` - Novo
- `review` - Em Revisão
- `in-progress` - Em Progresso
- `completed` - Concluído
- `rejected` - Rejeitado

## 🏗️ Estrutura do Projeto

```
workspace/
├── src/
│   ├── components/
│   │   ├── workspace/          # Componentes do workspace
│   │   │   ├── components/     # UI components
│   │   │   ├── store/          # Zustand store
│   │   │   ├── hooks/          # Hooks customizados
│   │   │   ├── types/          # TypeScript types
│   │   │   └── constants/      # Constantes
│   │   ├── layout/             # Layout components
│   │   └── ui/                 # UI components compartilhados
│   ├── contexts/               # React contexts
│   ├── hooks/                  # Hooks globais
│   ├── services/               # API services
│   ├── store/                  # Global stores
│   ├── lib/                    # Utilities
│   ├── utils/                  # Helper functions
│   ├── App.tsx                 # App principal
│   └── main.tsx                # Entry point
├── public/                     # Assets estáticos
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 🔌 Integração com Backend

### API Endpoint

O app se conecta com o backend via proxy configurado no Vite:

```typescript
// vite.config.ts
proxy: {
  '/api/workspace': {
    target: 'http://localhost:3200',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api\/workspace/, '/api')
  }
}
```

### Endpoints Utilizados

- `GET /api/items` - Listar todos os itens
- `POST /api/items` - Criar novo item
- `PUT /api/items/:id` - Atualizar item
- `DELETE /api/items/:id` - Deletar item

Veja [backend/api/workspace/README.md](../../../backend/api/workspace/README.md) para mais detalhes da API.

## 🎨 Tecnologias

### Core

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **React Router** - Hash routing

### Estado e Data

- **Zustand** - State management
- **TanStack Query** - Server state & caching
- **Axios** - HTTP client

### UI e Estilo

- **Tailwind CSS** - Utility-first CSS
- **Radix UI** - Headless components
- **Lucide React** - Icon library
- **Framer Motion** - Animations
- **@dnd-kit** - Drag and drop

## 🧪 Scripts Disponíveis

```bash
npm run dev          # Dev server (port 3900)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run type-check   # TypeScript check
npm run test         # Run tests
```

## 🔗 Integração com Dashboard

O Workspace pode ser acessado de duas formas:

### 1. Standalone (Recomendado)

Acesse diretamente: **http://localhost:3900**

### 2. Embedded no Dashboard

O dashboard principal (porta 3103) embute o workspace via iframe em: **http://localhost:3103/#/workspace**

O componente de embed está em:
- `dashboard/src/components/pages/WorkspaceEmbedPage.tsx`
- `dashboard/src/components/pages/workspace-embed/WorkspaceIframe.tsx`

## 🌐 Variáveis de Ambiente

Crie um arquivo `.env` (opcional):

```env
# API Backend URL (proxy configurado no vite.config.ts)
VITE_WORKSPACE_API_URL=http://localhost:3200

# Outras configurações...
```

## 📝 Desenvolvimento

### Adicionar Nova Feature

1. Criar componente em `src/components/workspace/components/`
2. Adicionar lógica no store `src/components/workspace/store/useWorkspaceStore.ts`
3. Criar hook se necessário em `src/components/workspace/hooks/`
4. Adicionar tipos em `src/components/workspace/types/`

### Debug

1. Verificar logs do browser console
2. Verificar Network tab para requests
3. Verificar que backend está rodando (porta 3200)
4. Verificar `http://localhost:3200/health`

## 🚨 Troubleshooting

### Porta 3900 já em uso

```bash
# Parar processo na porta 3900
lsof -ti:3900 | xargs kill
```

### Backend não responde

```bash
# Verificar se backend está rodando
curl http://localhost:3200/health

# Iniciar backend
cd backend/api/workspace
npm run dev
```

### Erros de TypeScript

```bash
# Verificar erros
npm run type-check

# Limpar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install
```

## 📚 Referências

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)

## ✅ Status

- ✅ **App Standalone** - Funcional na porta 3900
- ✅ **CRUD Completo** - Create, Read, Update, Delete
- ✅ **Kanban Board** - Drag & drop funcionando
- ✅ **Dark Mode** - Tema claro/escuro
- ✅ **API Integration** - Conectado ao backend (porta 3200)
- ✅ **Type Safety** - 100% TypeScript sem erros
- ✅ **Responsive** - Mobile-first design
- ✅ **Dashboard Embed** - Iframe no dashboard principal

---

**Criado:** 2025-10-23
**Última atualização:** 2025-10-23
**Versão:** 1.0.0
**Porta:** 3900
**Backend:** http://localhost:3200

