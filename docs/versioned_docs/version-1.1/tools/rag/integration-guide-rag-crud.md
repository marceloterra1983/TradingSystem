---
title: "RAG Collections Integration Guide"
sidebar_position: 6
description: "How to embed the collections management card into LlamaIndexPage."
tags:
  - rag
  - frontend
  - integration
owner: ArchitectureGuild
lastReviewed: '2025-11-02'
---
# 🔗 Guia de Integração - RAG Collections CRUD

**Objetivo:** Integrar os novos componentes de gerenciamento de coleções no LlamaIndexPage.tsx

---

## 📝 Opção 1: Integração Simples (Recomendada)

Adicione o `CollectionsManagementCard` como um novo componente na página existente.

### Passo 1: Importar o Componente

```tsx
// frontend/dashboard/src/components/pages/LlamaIndexPage.tsx

// Adicionar no início do arquivo, junto com os outros imports
import { CollectionsManagementCard } from './CollectionsManagementCard';
```

### Passo 2: Adicionar na Seção "Ingestão e saúde"

Encontre a seção "Ingestão e saúde" no LlamaIndexPage.tsx (por volta da linha 500-600):

```tsx
// Exemplo de onde adicionar:
<CollapsibleCard
  id="ingestion-status"
  title="Ingestão e saúde"
  defaultCollapsed={false}
  className="bg-white dark:bg-slate-900 shadow-sm"
>
  {/* Código existente da LlamaIndexIngestionStatusCard */}
  <LlamaIndexIngestionStatusCard
    status={statusData}
    onIngest={handleIngest}
    onCleanOrphans={handleCleanOrphans}
    onDelete={handleDelete}
    onCreateCollection={handleCreateCollection}
    operationLoading={operationLoading}
    selectedCollection={selectedCollection}
    setSelectedCollection={setSelectedCollection}
    collections={collections}
    isCreatingCollection={isCreatingCollection}
  />

  {/* ADICIONAR AQUI: Nova seção de gerenciamento de coleções */}
  <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
    <CollectionsManagementCard />
  </div>
</CollapsibleCard>
```

### Passo 3: Testar

```bash
# Iniciar backend
cd tools/rag-services
npm run dev

# Em outro terminal, acessar dashboard
# http://localhost:3103/#/rag-services
```

---

## 📝 Opção 2: Substituir Implementação Existente

Se preferir substituir completamente a tabela atual por nossa nova implementação.

### Passo 1: Remover Código Antigo

Em `LlamaIndexIngestionStatusCard.tsx`:

1. Encontre a seção da tabela de coleções (linhas ~100-400)
2. Comente ou remova todo o código da tabela
3. Mantenha apenas os cards de status e logs

### Passo 2: Substituir pela Nova Tabela

```tsx
// LlamaIndexIngestionStatusCard.tsx

import { CollectionsManagementCard } from './CollectionsManagementCard';

// No render, substituir a tabela por:
<CollectionsManagementCard />
```

---

## 📝 Opção 3: Nova Aba/Seção Dedicada

Criar uma seção completamente separada para gerenciamento de coleções.

### Passo 1: Adicionar Nova Seção Colapsável

```tsx
// LlamaIndexPage.tsx

// Adicionar APÓS a seção "Ingestão e saúde":
<CollapsibleCard
  id="collections-management"
  title="Gerenciamento de Coleções"
  defaultCollapsed={false}
  className="bg-white dark:bg-slate-900 shadow-sm"
>
  <CollectionsManagementCard />
</CollapsibleCard>
```

---

## 🔧 Configuração Necessária

### Backend

1. **Instalar dependências:**
```bash
cd tools/rag-services
npm install
```

2. **Configurar .env:**
```bash
# Copiar variáveis de .env.example para .env
RAG_COLLECTIONS_PORT=3403
INTER_SERVICE_SECRET="seu-secret-aqui"
FILE_WATCHER_ENABLED=true
```

3. **Iniciar serviço:**
```bash
# Development
npm run dev

# Production
npm run build && npm start

# Docker
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d rag-collections-service
```

### Frontend

1. **Configurar variável de ambiente:**
```bash
# frontend/dashboard/.env
VITE_API_BASE_URL=http://localhost:3402
```

2. **Verificar imports:**
Certifique-se que todos os componentes estão acessíveis:
- ✅ CollectionsManagementCard
- ✅ CollectionFormDialog
- ✅ CollectionDeleteDialog
- ✅ EmbeddingModelSelector
- ✅ useCollections hook
- ✅ collectionsService
- ✅ types/collections

---

## 🧪 Checklist de Testes

### Backend
- [ ] `curl http://localhost:3402/health` retorna 200
- [ ] `curl http://localhost:3402/api/v1/rag/collections` lista coleções
- [ ] `curl http://localhost:3402/api/v1/rag/models` lista modelos
- [ ] Logs aparecem no console (Winston)
- [ ] CORS permite requests do frontend

### Frontend
- [ ] Página /rag-services carrega sem erros
- [ ] Tabela de coleções é exibida
- [ ] Botão "Nova Coleção" abre dialog
- [ ] Seletor de modelos mostra opções
- [ ] Validação funciona no formulário
- [ ] Create collection envia request correto
- [ ] Edit abre com dados pré-preenchidos
- [ ] Delete mostra confirmação com impacto
- [ ] Busca filtra coleções corretamente
- [ ] Auto-refresh atualiza dados (15s)

### Integração
- [ ] Backend e frontend se comunicam
- [ ] Erros são exibidos corretamente
- [ ] Loading states aparecem
- [ ] Dark mode funciona
- [ ] Responsividade mobile OK

---

## 🚨 Troubleshooting

### Problema: "Failed to fetch collections"

**Causa:** Backend não está rodando ou CORS bloqueado

**Solução:**
```bash
# Verificar se backend está rodando
curl http://localhost:3402/health

# Verificar CORS no console do navegador
# Deve permitir: http://localhost:3103

# Verificar variável de ambiente
echo $VITE_API_BASE_URL
```

### Problema: "Module not found: CollectionsManagementCard"

**Causa:** Componente não foi criado ou caminho incorreto

**Solução:**
```bash
# Verificar se arquivo existe
ls frontend/dashboard/src/components/pages/CollectionsManagementCard.tsx

# Verificar imports no arquivo
# Deve ser: import { CollectionsManagementCard } from './CollectionsManagementCard';
```

### Problema: "Modelos não aparecem no seletor"

**Causa:** Backend não consegue se conectar ao Ollama

**Solução:**
```bash
# Verificar Ollama está rodando
docker ps | grep ollama

# Testar conexão
curl http://localhost:11434/api/tags

# Verificar variável de ambiente
OLLAMA_EMBEDDINGS_URL=http://localhost:11434
```

### Problema: "File watcher não detecta mudanças"

**Causa:** FILE_WATCHER_ENABLED=false ou diretório incorreto

**Solução:**
```bash
# Verificar .env
FILE_WATCHER_ENABLED=true

# Verificar logs do backend
# Deve mostrar: "File Watcher Service started"

# Verificar collections-config.json
# Diretórios devem existir e estar acessíveis
```

---

## 📊 Estrutura de Diretórios Esperada

```
frontend/dashboard/src/
├── components/pages/
│   ├── LlamaIndexPage.tsx                  # ← MODIFICAR AQUI
│   ├── CollectionsManagementCard.tsx       # ✅ NOVO
│   ├── CollectionFormDialog.tsx            # ✅ NOVO
│   ├── CollectionDeleteDialog.tsx          # ✅ NOVO
│   └── EmbeddingModelSelector.tsx          # ✅ NOVO
├── services/
│   └── collectionsService.ts               # ✅ NOVO
├── hooks/llamaIndex/
│   └── useCollections.ts                   # ✅ NOVO
└── types/
    └── collections.ts                      # ✅ NOVO

tools/rag-services/
├── src/
│   ├── server.ts                           # ✅ NOVO
│   ├── routes/
│   │   ├── collections.ts                  # ✅ NOVO
│   │   └── models.ts                       # ✅ NOVO
│   ├── services/
│   │   ├── collectionManager.ts            # ✅ ATUALIZADO
│   │   ├── fileWatcher.ts                  # ✅ EXISTENTE
│   │   └── ingestionService.ts             # ✅ EXISTENTE
│   ├── middleware/
│   │   ├── validation.ts                   # ✅ NOVO
│   │   ├── responseWrapper.ts              # ✅ NOVO
│   │   └── errorHandler.ts                 # ✅ NOVO
│   ├── utils/
│   │   └── logger.ts                       # ✅ NOVO
│   └── config/
│       └── cors.ts                         # ✅ NOVO
├── collections-config.json                 # ✅ EXISTENTE
├── package.json                            # ✅ NOVO
├── tsconfig.json                           # ✅ NOVO
├── Dockerfile                              # ✅ NOVO
└── .env.example                            # ✅ NOVO
```

---

## 🎯 Exemplo Completo de Integração

```tsx
// frontend/dashboard/src/components/pages/LlamaIndexPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { CollapsibleCard } from '../layout/CollapsibleCard';
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { LlamaIndexQueryTool } from './LlamaIndexQueryTool';
import { LlamaIndexIngestionStatusCard } from './LlamaIndexIngestionStatusCard';
import { CollectionsManagementCard } from './CollectionsManagementCard'; // ← ADICIONAR

export const LlamaIndexPage: React.FC = () => {
  // ... código existente ...

  return (
    <CustomizablePageLayout
      pageTitle="RAG Services"
      pageDescription="Sistema de busca semântica e Q&A com LlamaIndex + Qdrant + Ollama"
    >
      {/* Seção 1: RAG Status (mantém como está) */}
      <CollapsibleCard
        id="rag-status"
        title="RAG Status"
        defaultCollapsed={false}
        className="bg-white dark:bg-slate-900 shadow-sm"
      >
        {/* ... código existente ... */}
      </CollapsibleCard>

      {/* Seção 2: Ingestão e saúde (mantém como está) */}
      <CollapsibleCard
        id="ingestion-status"
        title="Ingestão e saúde"
        defaultCollapsed={false}
        className="bg-white dark:bg-slate-900 shadow-sm"
      >
        <LlamaIndexIngestionStatusCard {...props} />
      </CollapsibleCard>

      {/* Seção 3: NOVA - Gerenciamento de Coleções */}
      <CollapsibleCard
        id="collections-management"
        title="Gerenciamento de Coleções"
        defaultCollapsed={false}
        className="bg-white dark:bg-slate-900 shadow-sm"
      >
        <CollectionsManagementCard />
      </CollapsibleCard>

      {/* Seção 4: Query Tool (mantém como está) */}
      <CollapsibleCard
        id="query-tool"
        title="Interactive Query Tool"
        defaultCollapsed={true}
        className="bg-white dark:bg-slate-900 shadow-sm"
      >
        <LlamaIndexQueryTool {...props} />
      </CollapsibleCard>
    </CustomizablePageLayout>
  );
};

export default LlamaIndexPage;
```

---

## 🚀 Quick Start (TL;DR)

```bash
# 1. Backend
cd tools/rag-services
npm install
npm run dev

# 2. Frontend (já deve estar rodando)
# Adicionar uma linha em LlamaIndexPage.tsx:
# <CollectionsManagementCard />

# 3. Testar
# http://localhost:3103/#/rag-services
```

---

## 📞 Suporte

Se encontrar problemas:

1. ✅ Verificar logs do backend (`npm run dev` mostra logs em tempo real)
2. ✅ Verificar console do navegador (F12)
3. ✅ Testar endpoints diretamente com `curl`
4. ✅ Verificar variáveis de ambiente (`.env` correto)
5. ✅ Verificar se todos os serviços Docker estão rodando (`docker ps`)

---

**Documentação completa:** `IMPLEMENTATION-SUMMARY-RAG-CRUD.md`
