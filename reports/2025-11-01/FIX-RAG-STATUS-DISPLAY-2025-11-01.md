# Fix: RAG Services Status Display - "Sem dados"

**Data**: 2025-11-01
**Status**: ✅ Resolvido
**Prioridade**: Alta
**Impacto**: Dashboard exibindo status incorretos

---

## 🐛 Problema Identificado

O dashboard estava exibindo "Sem dados" (com triângulo amarelo) para os seguintes serviços:
- ❌ Ollama LLM
- ❌ Redis Cache
- ❌ Collections Service

**Apesar de todos os containers estarem rodando e saudáveis!**

---

## 🔍 Causa Raiz

**Configuração incorreta da porta da API no `.env`:**

```bash
# ❌ INCORRETO (antes)
VITE_API_BASE_URL=http://localhost:3403  # rag-collections-service
```

O problema era que:
1. **rag-collections-service** (porta 3403) é apenas um serviço auxiliar com endpoint `/health`
2. **documentation-api** (porta 3401) tem o endpoint completo `/api/v1/rag/status` 
3. O frontend estava buscando dados da porta errada

---

## 🔧 Solução Aplicada

### 1. Correção no `.env`

```bash
# ✅ CORRETO (depois)
VITE_API_BASE_URL=http://localhost:3401  # documentation-api
```

### 2. Script de Correção

Criado: `/home/marce/Projetos/TradingSystem/scripts/setup/fix-rag-api-url.sh`

**Funcionalidades:**
- ✅ Cria backup automático do `.env`
- ✅ Atualiza `VITE_API_BASE_URL` para a porta correta
- ✅ Valida a configuração aplicada
- ✅ Fornece instruções de restart

**Uso:**
```bash
sudo bash /home/marce/Projetos/TradingSystem/scripts/setup/fix-rag-api-url.sh
```

### 3. Restart do Dashboard

```bash
# Parar processo na porta 3103
lsof -ti:3103 | xargs kill -9

# Reiniciar dashboard
cd frontend/dashboard && npm run dev
```

---

## ✅ Validação

### Containers Running

```bash
$ docker ps | grep -E "(ollama|redis|collections|qdrant)"

rag-collections-service      Up (healthy)         0.0.0.0:3403->3402/tcp
rag-llamaindex-query         Up (healthy)         0.0.0.0:8202->8000/tcp
rag-ollama                   Up (healthy)         0.0.0.0:11434->11434/tcp
rag-redis                    Up (healthy)         0.0.0.0:6380->6379/tcp
data-qdrant                  Up (healthy)         0.0.0.0:6333-6334->6333-6334/tcp
```

### API Response (Port 3401)

```bash
$ curl -s http://localhost:3401/api/v1/rag/status | jq '.services'

{
  "query": {
    "ok": true,
    "status": 200,
    "message": "healthy",
    "collection": "documentation__nomic"
  },
  "ingestion": {
    "ok": true,
    "status": 200,
    "message": "healthy"
  },
  "ollama": {
    "ok": true,
    "status": 200,
    "message": "4 modelo(s)"
  },
  "redis": {
    "ok": true,
    "status": 200,
    "message": "connected"
  },
  "collections": {
    "ok": true,
    "status": 200,
    "message": "healthy"
  }
}
```

### Dashboard Status

✅ Dashboard acessível em http://localhost:3103
✅ Todas as chamadas de API agora direcionadas para porta 3401
✅ Status corretos exibidos no dashboard

---

## 📊 Resultado Final

**Antes:**
- 🟡 Ollama LLM: "Sem dados"
- 🟡 Redis Cache: "Sem dados"
- 🟡 Collections Service: "Sem dados"
- ✅ Query Service: "healthy"
- ✅ Ingestion Service: "healthy"
- ✅ Qdrant Vector DB: "documentation • 9.606 vetores"

**Depois:**
- ✅ Ollama LLM: "4 modelo(s)"
- ✅ Redis Cache: "connected"
- ✅ Collections Service: "healthy"
- ✅ Query Service: "healthy"
- ✅ Ingestion Service: "healthy"
- ✅ Qdrant Vector DB: "documentation • 51.940 vetores"

---

## 🏗️ Arquitetura Corrigida

```
Dashboard (Port 3103)
    ↓
VITE_API_BASE_URL=http://localhost:3401
    ↓
documentation-api (Port 3401)
    ├─ GET /api/v1/rag/status
    ├─ GET /api/v1/rag/status/health
    └─ POST /api/v1/rag/ingest
    ↓
[Queries all RAG services internally]
    ├─ llamaindex-query (8202)
    ├─ llamaindex-ingest (8201)
    ├─ ollama (11434)
    ├─ redis (6380)
    ├─ collections-service (3403)
    └─ qdrant (6333)
```

---

## 📝 Portas Documentadas

| Serviço | Porta Externa | Porta Interna | Propósito |
|---------|---------------|---------------|-----------|
| **documentation-api** | **3401** | 3000 | API principal + proxy RAG |
| rag-collections-service | 3403 | 3402 | Serviço auxiliar |
| llamaindex-query | 8202 | 8000 | Query engine |
| llamaindex-ingest | 8201 | 8000 | Ingestion engine |
| ollama | 11434 | 11434 | LLM inference |
| redis | 6380 | 6379 | Cache |
| qdrant | 6333-6334 | 6333-6334 | Vector DB |

---

## 🔐 Arquivos Modificados

### 1. `.env` (root)
```diff
- VITE_API_BASE_URL=http://localhost:3403
+ VITE_API_BASE_URL=http://localhost:3401
```

### 2. Scripts Criados
- `/home/marce/Projetos/TradingSystem/scripts/setup/fix-rag-api-url.sh`

### 3. Backups Criados
- `.env.backup.20251101_150123`

---

## 🎓 Lições Aprendidas

### 1. Validação de Configuração
**Problema**: `.env` apontando para porta errada sem validação
**Solução**: Script de correção automática com backup

### 2. Documentação de Portas
**Problema**: Confusão entre porta 3401 (documentation-api) e 3403 (collections-service)
**Solução**: Tabela clara de portas documentada

### 3. Separação de Responsabilidades
**Clarificação**:
- **documentation-api (3401)** → API principal com proxy RAG
- **collections-service (3403)** → Serviço auxiliar de collections

### 4. Health Check vs Status Endpoint
**Diferença**:
- `/health` → Lightweight probe (básico)
- `/api/v1/rag/status` → Comprehensive status (completo)

---

## 🚀 Recomendações Futuras

### 1. Validação de Configuração no Startup
Adicionar script de validação que verifica:
```bash
# Check if VITE_API_BASE_URL points to correct port
if [[ "$VITE_API_BASE_URL" =~ 3403 ]]; then
  echo "⚠️  WARNING: VITE_API_BASE_URL should be 3401, not 3403"
  exit 1
fi
```

### 2. Health Check Endpoint no Dashboard
Adicionar verificação visual no dashboard:
- 🟢 Verde: API respondendo corretamente
- 🟡 Amarelo: Timeout ou porta errada
- 🔴 Vermelho: API indisponível

### 3. Documentação de Environment Variables
Atualizar `docs/content/tools/security-config/env.mdx` com:
```markdown
## RAG Services Configuration

### VITE_API_BASE_URL
**Default**: `http://localhost:3401`
**Purpose**: Documentation API with RAG proxy
**⚠️ Common Mistake**: Using port 3403 (collections-service) instead
```

### 4. Testes de Integração
Criar testes que validam:
- [ ] `.env` tem variáveis corretas
- [ ] APIs respondem nas portas esperadas
- [ ] Dashboard consegue acessar endpoints
- [ ] Status mostrado no UI corresponde aos containers

---

## ✅ Checklist de Validação

- [x] `.env` corrigido com porta 3401
- [x] Backup do `.env` anterior criado
- [x] Dashboard reiniciado
- [x] API respondendo corretamente
- [x] Todos os serviços mostrando status corretos
- [x] Script de correção documentado
- [x] Portas documentadas claramente
- [x] Arquitetura atualizada no diagrama

---

## 📞 Contato

**Resolvido por**: Claude Code (Anthropic)
**Data**: 2025-11-01 18:02 BRT
**Tempo de Resolução**: ~45 minutos

**Arquivos Relacionados**:
- `/home/marce/Projetos/TradingSystem/.env`
- `/home/marce/Projetos/TradingSystem/scripts/setup/fix-rag-api-url.sh`
- `/home/marce/Projetos/TradingSystem/frontend/dashboard/src/hooks/llamaIndex/useRagManager.ts`
- `/home/marce/Projetos/TradingSystem/frontend/dashboard/src/components/pages/LlamaIndexPage.tsx`

---

**Status Final**: ✅ **RESOLVIDO - Todos os serviços exibindo status corretos no dashboard**

