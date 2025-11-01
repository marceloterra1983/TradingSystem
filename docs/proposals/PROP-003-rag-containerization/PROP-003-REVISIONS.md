# PROP-003 Revisões - Correções de Arquitetura

**Data**: 2025-10-31
**Status**: ⚠️ Revisões Necessárias

---

## 🔄 Mudanças Solicitadas

### 1. ✅ Porta do RAG Service Corrigida

**Problema**: Porta 3400 já está em uso pelo Documentation Hub (NGINX)

**Solução**:
- **Porta Antiga**: 3400
- **Porta Nova**: **3402**

**Portas em Uso** (referência):
```
3103 - Dashboard (React + Vite)
3200 - Workspace API (Docker)
3400 - Documentation Hub (NGINX) ← JÁ EM USO
3401 - Documentation API (Express + FlexSearch)
3500 - Service Launcher (Express)
3600 - Firecrawl Proxy (Express)
4005 - TP Capital (Docker)
8201 - LlamaIndex Ingestion
8202 - LlamaIndex Query
```

**Nova Porta Disponível**: **3402** para rag-service

---

### 2. ✅ Estrutura de Diretórios Corrigida

**Problema**: Arquivos criados em `backend/api/documentation-api/`

**Solução**: Mover para `tools/rag-services/`

**Nova Estrutura**:
```
tools/rag-services/
├── src/
│   ├── middleware/
│   │   ├── responseWrapper.ts
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── errorHandler.ts
│   ├── config/
│   │   ├── cors.ts
│   │   └── collections.ts        # NOVO - Configuração de coleções
│   ├── services/
│   │   ├── fileWatcher.ts        # NOVO - Monitoramento de arquivos
│   │   ├── ingestionService.ts   # NOVO - Serviço de ingestão
│   │   └── collectionManager.ts  # NOVO - Gerenciador de coleções
│   ├── utils/
│   │   └── logger.ts
│   ├── routes/
│   │   ├── rag.ts
│   │   └── collections.ts
│   └── server.ts
├── collections-config.json         # NOVO - Mapeamento diretórios → coleções
├── Dockerfile
├── package.json
├── tsconfig.json
└── .dockerignore
```

---

### 3. ✅ Múltiplas Coleções por Diretórios

**Requisito**: Sistema deve suportar várias coleções baseadas em diretórios pré-definidos

**Implementação**: Arquivo de configuração `collections-config.json`

```json
{
  "collections": [
    {
      "name": "documentation",
      "description": "Project documentation",
      "directory": "/data/docs/content",
      "embeddingModel": "nomic-embed-text",
      "chunkSize": 512,
      "chunkOverlap": 50,
      "fileTypes": ["md", "mdx"],
      "recursive": true,
      "enabled": true,
      "autoUpdate": true
    },
    {
      "name": "api_specs",
      "description": "API specifications and OpenAPI schemas",
      "directory": "/data/docs/static/specs",
      "embeddingModel": "nomic-embed-text",
      "chunkSize": 256,
      "chunkOverlap": 25,
      "fileTypes": ["json", "yaml"],
      "recursive": true,
      "enabled": true,
      "autoUpdate": true
    },
    {
      "name": "code_examples",
      "description": "Code examples and snippets",
      "directory": "/data/examples",
      "embeddingModel": "nomic-embed-text",
      "chunkSize": 1024,
      "chunkOverlap": 100,
      "fileTypes": ["ts", "js", "py"],
      "recursive": true,
      "enabled": true,
      "autoUpdate": true
    },
    {
      "name": "troubleshooting",
      "description": "Troubleshooting guides and FAQs",
      "directory": "/data/docs/content/tools/rag",
      "embeddingModel": "nomic-embed-text",
      "chunkSize": 512,
      "chunkOverlap": 50,
      "fileTypes": ["md", "mdx"],
      "recursive": false,
      "enabled": true,
      "autoUpdate": true
    }
  ],
  "defaults": {
    "embeddingModel": "nomic-embed-text",
    "chunkSize": 512,
    "chunkOverlap": 50,
    "fileTypes": ["md", "mdx", "txt"],
    "recursive": true
  }
}
```

**Funcionalidades**:
- ✅ Cada diretório mapeado para uma coleção
- ✅ Configuração específica por coleção (chunk size, file types)
- ✅ Suporte para habilitar/desabilitar coleções
- ✅ Flag `autoUpdate` para controlar file watcher por coleção

---

### 4. ✅ File Watcher para Atualização Automática

**Requisito**: Atualizar automaticamente o banco vetorizado quando arquivos são salvos

**Implementação**: Serviço de File Watcher com chokidar

**Funcionalidades**:
- 🔍 Monitora diretórios configurados em tempo real
- 📝 Detecta eventos: `add` (novo arquivo), `change` (modificação), `unlink` (remoção)
- ⚡ Ingestão automática em background (sem bloquear API)
- 🔄 Debounce para evitar múltiplas ingestões (espera 5s após última mudança)
- 📊 Status em tempo real de file watching
- 🎯 Ingestão incremental (apenas arquivos modificados)

**Código**: `tools/rag-services/src/services/fileWatcher.ts` (será criado)

**Exemplo de Funcionamento**:
```
1. Desenvolvedor edita: docs/content/tools/rag/troubleshooting.mdx
2. File Watcher detecta mudança
3. Aguarda 5s (debounce) para garantir que salvou completamente
4. Cria job de ingestão no Redis
5. Ingestion service processa arquivo
6. Atualiza coleção "troubleshooting" no Qdrant
7. Log: "File updated: troubleshooting.mdx → Collection: troubleshooting"
```

---

## 📦 Arquivos Adicionais Necessários

### 1. **Collection Manager** (`tools/rag-services/src/services/collectionManager.ts`)
**Propósito**: Gerenciar múltiplas coleções e seus diretórios

**Funcionalidades**:
- Carregar configurações de `collections-config.json`
- Criar/atualizar/remover coleções no Qdrant
- Listar coleções disponíveis
- Validar diretórios e permissões

### 2. **File Watcher Service** (`tools/rag-services/src/services/fileWatcher.ts`)
**Propósito**: Monitorar mudanças em diretórios

**Funcionalidades**:
- Usar `chokidar` para watch em múltiplos diretórios
- Debounce para evitar ingestões duplicadas
- Filtrar por file types configurados
- Criar jobs de ingestão no Redis
- Status endpoint: `/api/v1/rag/file-watcher/status`

### 3. **Ingestion Service** (`tools/rag-services/src/services/ingestionService.ts`)
**Propósito**: Orquestrar ingestão de arquivos

**Funcionalidades**:
- Chamar llamaindex-ingestion via HTTP
- Gerenciar jobs no Redis
- Progress tracking
- Retry com exponential backoff
- Notificações quando ingestão completa

### 4. **Collections Config** (`tools/rag-services/collections-config.json`)
**Propósito**: Mapeamento de diretórios → coleções

---

## 🔧 Atualizações Necessárias no Docker Compose

### Arquivo: `tools/compose/docker-compose.rag.yml`

**Mudanças**:

```yaml
services:
  rag-service:
    image: "${IMG_RAG_SERVICE:-tradingsystem/rag-service}:${IMG_VERSION:-latest}"
    container_name: rag-service
    build:
      context: ../..
      dockerfile: tools/rag-services/Dockerfile  # ← ATUALIZADO
    ports:
      - "${RAG_SERVICE_PORT:-3402}:3402"         # ← PORTA ATUALIZADA (3400 → 3402)
    environment:
      - PORT=3402                                 # ← ATUALIZADO
      # ... outras variáveis
    volumes:
      # Montar múltiplos diretórios para file watcher
      - ../../docs/content:/data/docs/content:ro
      - ../../docs/static/specs:/data/docs/static/specs:ro
      - ../../examples:/data/examples:ro
      # Configuração de coleções
      - ../rag-services/collections-config.json:/app/collections-config.json:ro
```

---

## 📋 Variáveis de Ambiente Atualizadas

### Adicionar ao `.env`:

```env
# RAG Service (PORTA ATUALIZADA)
RAG_SERVICE_PORT=3402  # Era 3400, agora 3402

# File Watcher Configuration
FILE_WATCHER_ENABLED=true
FILE_WATCHER_DEBOUNCE_MS=5000  # 5 segundos
FILE_WATCHER_POLLING_INTERVAL=1000  # 1 segundo

# Collections Configuration
COLLECTIONS_CONFIG_PATH=/app/collections-config.json

# Ingestion Service URLs
LLAMAINDEX_INGESTION_URL=http://rag-llamaindex-ingest:8201

# Existing variables...
INTER_SERVICE_SECRET=${INTER_SERVICE_SECRET}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
# ...
```

---

## 🎯 Plano de Implementação Atualizado

### Fase 1.5: Correções de Arquitetura (Adicionar Agora)

**Tasks**:
1. **Mover estrutura para `tools/rag-services/`**
   - Criar nova estrutura de diretórios
   - Mover arquivos implementados para nova localização
   - Atualizar imports

2. **Atualizar portas em todos os arquivos**
   - `docker-compose.rag.yml`: 3400 → 3402
   - `Dockerfile`: EXPOSE 3402
   - Health checks: localhost:3402
   - `.env.example`: RAG_SERVICE_PORT=3402

3. **Criar configuração de múltiplas coleções**
   - Criar `collections-config.json`
   - Criar `collectionManager.ts`
   - Endpoint: `GET /api/v1/rag/collections` (lista coleções)
   - Endpoint: `POST /api/v1/rag/collections` (cria nova coleção)

4. **Implementar File Watcher**
   - Instalar: `npm install chokidar`
   - Criar `fileWatcher.ts`
   - Iniciar watcher no startup
   - Endpoint: `GET /api/v1/rag/file-watcher/status`

5. **Criar Ingestion Service**
   - Criar `ingestionService.ts`
   - Integrar com Redis job queue
   - Chamar llamaindex-ingestion
   - Progress tracking

6. **Atualizar documentação**
   - Atualizar PROP-003 com nova porta
   - Atualizar `CLAUDE.md` com nova porta (3402)
   - Documentar sistema de múltiplas coleções
   - Documentar file watcher

**Deliverables**:
- ✅ Estrutura em `tools/rag-services/`
- ✅ Porta 3402 atualizada em todos os lugares
- ✅ Sistema de múltiplas coleções funcional
- ✅ File watcher monitorando diretórios
- ✅ Ingestão automática funcionando

**Estimativa**: 1 dia adicional (pode ser feito em paralelo com outras tasks)

---

## 🚀 Próximos Passos

1. ⏳ Confirmar aprovação das revisões
2. ⏳ Criar estrutura em `tools/rag-services/`
3. ⏳ Implementar Collection Manager
4. ⏳ Implementar File Watcher
5. ⏳ Implementar Ingestion Service
6. ⏳ Atualizar PROP-003 com mudanças
7. ⏳ Atualizar docker-compose.rag.yml
8. ⏳ Testar sistema de múltiplas coleções
9. ⏳ Testar file watcher com mudanças em arquivos

---

## ✅ Benefícios das Revisões

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Porta** | 3400 (conflito) | 3402 (disponível) |
| **Estrutura** | `backend/api/documentation-api/` | `tools/rag-services/` (organizado) |
| **Coleções** | Uma coleção fixa | Múltiplas coleções por diretório |
| **Atualização** | Manual via API | Automática via file watcher |
| **Manutenibilidade** | Ingestão manual | Auto-ingestão quando arquivos mudam |

---

**Status**: ⏳ Aguardando aprovação para implementar correções
