---
title: 📁 Configuration Directory
sidebar_position: 1
tags:
  - documentation
domain: shared
type: index
summary: Configuração Centralizada do TradingSystem
status: active
last_review: '2025-10-23'
---

# 📁 Configuration Directory

**Configuração Centralizada do TradingSystem**

Este diretório contém toda a configuração centralizada do projeto, incluindo variáveis de ambiente padrão, manifesto de serviços, e mapeamentos de imagens Docker.

---

## 📂 Estrutura de Arquivos

```
config/
├── .env.defaults              # Valores padrão de todas as variáveis (versionado)
├── container-images.env       # Mapeamento de imagens Docker (versionado)
├── docker.env                 # Variáveis específicas do Docker (versionado)
├── services-manifest.json     # Registro de todos os serviços do projeto
└── README.md                  # Este arquivo
```

---

## 📋 Descrição dos Arquivos

### `.env.defaults`

**Propósito:** Define valores padrão para TODAS as variáveis de ambiente do projeto.

**Características:**
- ✅ **Versionado no git** - Mudanças são rastreadas
- ✅ **Sem segredos** - Apenas valores padrão seguros
- ✅ **Carregado automaticamente** - Via `backend/shared/config/load-env.js/cjs`
- ✅ **Documentado** - Cada seção tem comentários explicativos

**Estrutura:**
```bash
# ==============================================================================
# 🌍 GLOBAL SERVICE SETTINGS
# ==============================================================================
ENVIRONMENT=development
NODE_ENV=development
TZ=America/Sao_Paulo

# ==============================================================================
# 🗃️ FRONTEND APPS DATABASE (PostgreSQL 16 + Timescale)
# ==============================================================================
FRONTEND_APPS_DB_HOST=localhost
FRONTEND_APPS_DB_PORT=5444
# ... mais variáveis ...

# ==============================================================================
# 🌐 BACKEND APIS (PORTS & BASE SETTINGS)
# ==============================================================================
B3_API_PORT=3302
B3_API_QUESTDB_HTTP_URL=http://localhost:9002
# ... mais variáveis ...
```

**Categorias de Variáveis:**
- 🌍 **Global Settings** - Ambiente, timezone, debug
- 🗃️ **Database** - PostgreSQL, TimescaleDB, QuestDB
- 🌐 **Backend APIs** - Portas e configurações dos serviços
- 🔥 **Firecrawl Stack** - Integração Firecrawl
- 🎨 **Frontend** - Dashboard e apps Vite
- 📡 **Telegram** - Bots de ingestão
- 🤖 **AI/ML Tools** - OpenAI, LlamaIndex, Qdrant
- 📊 **Monitoring** - Prometheus, Grafana
- 🔒 **Security** - CORS, JWT, rate limiting

**Como Usar:**
```javascript
// As variáveis são carregadas automaticamente nos serviços
import '../../../../backend/shared/config/load-env.js';

// Então podem ser acessadas normalmente
const port = process.env.B3_API_PORT; // 3302
```

**Override de Valores:**
Para sobrescrever localmente, use `.env.local` na raiz do projeto (gitignored).

---

### `container-images.env`

**Propósito:** Mapeia nomes de variáveis para repositórios de imagens Docker.

**Características:**
- ✅ **Versionado no git** - Padroniza imagens em todo o time
- ✅ **Customizável** - Pode ser sobrescrito via `.env.local`
- ✅ **Organizado por categoria** - Database, docs, tools, monitoring

**Estrutura:**
```bash
# ---- Database & tooling ----
IMG_DATA_TIMESCALEDB=timescale/timescaledb
IMG_DATA_QUESTDB=questdb/questdb
IMG_DATA_QDRANT=qdrant/qdrant

# ---- Documentation ----
IMG_DOCS_API=nginx

# ---- Tools ----
IMG_TOOLS_LLAMAINDEX_INGESTION=img-tools-llamaindex-ingestion
IMG_TOOLS_LLAMAINDEX_QUERY=img-tools-llamaindex-query

# ---- Monitoring ----
IMG_MON_PROMETHEUS=prom/prometheus
IMG_MON_GRAFANA=grafana/grafana

# ---- Firecrawl stack ----
IMG_FIRECRAWL_API=nginx
IMG_FIRECRAWL_POSTGRES=postgres
```

**Como Usar:**
```yaml
# docker-compose.yml
services:
  timescaledb:
    image: "${IMG_DATA_TIMESCALEDB}:${IMG_VERSION}"
```

**Customização:**
```bash
# .env.local (na raiz)
IMG_DATA_TIMESCALEDB=my-registry.com/timescaledb
IMG_VERSION=15-pg16
```

---

### `docker.env`

**Propósito:** Variáveis específicas para containers Docker.

**Características:**
- ✅ **Versionado no git** - Configurações padrão de containers
- ✅ **Separado** - Não mistura com configs de aplicação
- ✅ **Ports & Credentials** - Portas, usuários, senhas padrão

**Conteúdo Típico:**
```bash
# ---- Database Configuration ----
TIMESCALEDB_DB=trading
TIMESCALEDB_USER=timescale
TIMESCALEDB_PORT=5433

# ---- pgAdmin Configuration ----
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_HOST_PORT=5050

# ---- QuestDB Configuration ----
QUESTDB_HTTP_PORT_NEW=9000
QUESTDB_PG_PORT_NEW=9009
```

**Uso:**
As variáveis são referenciadas em `docker-compose.yml` files:
```yaml
services:
  timescaledb:
    environment:
      POSTGRES_DB: ${TIMESCALEDB_DB}
      POSTGRES_USER: ${TIMESCALEDB_USER}
    ports:
      - "${TIMESCALEDB_PORT}:5432"
```

---

### `services-manifest.json`

**Propósito:** Registro centralizado de TODOS os serviços do projeto.

**Características:**
- ✅ **Single Source of Truth** - Lista todos os serviços
- ✅ **Metadata Rico** - Tipo, path, comandos, porta, etc.
- ✅ **Usado por Scripts** - Automação, dashboards, monitoramento

**Estrutura:**
```json
{
  "version": 1,
  "services": [
    {
      "id": "tp-capital-signals",
      "type": "backend",
      "path": "apps/tp-capital",
      "start": "npm run dev",
      "build": "npm run build",
      "test": "npm test",
      "port": 3200,
      "env": ".env.example",
      "workspace": true,
      "managed": "internal"
    }
  ]
}
```

**Campos:**
- `id` - Identificador único do serviço
- `type` - Categoria: `backend`, `frontend`, `docs`, `tools`, `external`
- `path` - Caminho relativo à raiz do projeto
- `start` - Comando para iniciar em desenvolvimento
- `build` - Comando para build de produção
- `test` - Comando para executar testes
- `port` - Porta padrão do serviço
- `env` - Arquivo de template de variáveis
- `workspace` - Se faz parte do npm/pnpm workspace
- `managed` - `internal` (nosso) ou `external` (terceiros)

**Como Usar:**
```bash
# Listar todos os serviços
node scripts/lib/service-manifest.js list

# Obter detalhes de um serviço
node scripts/lib/service-manifest.js get tp-capital-signals

# Obter porta de um serviço
node scripts/lib/service-manifest.js get tp-capital-signals --field port
```

**Usado por:**
- Scripts de automação (`scripts/services/`)
- Dashboards de status
- Health checkers

---

## 🔧 Hierarquia de Carregamento

As variáveis de ambiente são carregadas nesta ordem (últimas sobrescrevem primeiras):

```
1. config/.env.defaults          (Defaults seguros versionados)
         ↓
2. config/container-images.env   (Mapeamento de imagens)
         ↓
3. config/docker.env             (Configs Docker específicas)
         ↓
4. .env (raiz do projeto)        (Valores do ambiente atual)
         ↓
5. .env.local (raiz)             (Overrides locais - gitignored)
         ↓
6. Environment Variables         (Runtime - mais alta prioridade)
```

### Carregamento Automático

Todos os serviços usam o loader compartilhado:

**JavaScript/ESM:**
```javascript
// No início do arquivo de entrada
import '../../../../backend/shared/config/load-env.js';

// Agora todas as variáveis estão disponíveis
const port = process.env.B3_API_PORT;
```

**JavaScript/CommonJS:**
```javascript
// No início do arquivo
const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../..');
require(path.join(projectRoot, 'backend/shared/config/load-env.cjs'));

// Usar variáveis normalmente
const port = process.env.SERVICE_LAUNCHER_PORT;
```

---

## 📝 Convenções e Boas Práticas

### Nomenclatura de Variáveis

**✅ CORRETO - Use prefixos de serviço:**
```bash
B3_API_PORT=3302
B3_API_QUESTDB_HTTP_URL=http://localhost:9002
B3_API_CORS_ORIGIN=http://localhost:3103

SERVICE_LAUNCHER_PORT=3500
SERVICE_LAUNCHER_TIMEOUT_MS=2500
```

**❌ ERRADO - Variáveis genéricas sem prefixo:**
```bash
PORT=3302           # Qual serviço?
TIMEOUT=5000        # De que?
DATABASE_URL=...    # Qual database?
```

### Onde Adicionar Novas Variáveis

**Para valores padrão (todo mundo usa):**
- ✅ Adicionar em `config/.env.defaults`
- ✅ Documentar com comentários
- ✅ Agrupar por categoria
- ✅ Usar prefixo do serviço

**Para valores específicos do ambiente:**
- ✅ Adicionar em `.env` (raiz) ou `.env.local`
- ❌ NUNCA criar `.env` local em pastas de serviços

**Para imagens Docker:**
- ✅ Adicionar em `config/container-images.env`
- ✅ Seguir padrão `IMG_CATEGORIA_NOME`

**Para configurações de containers:**
- ✅ Adicionar em `config/docker.env`
- ✅ Usar para ports, credenciais padrão, etc.

### Organização no .env.defaults

```bash
# ==============================================================================
# 🌐 NOME DA CATEGORIA
# ==============================================================================
# Breve descrição da categoria
# Documentação: docs/context/path/to/docs.md
# ==============================================================================

# Server Configuration
SERVICE_PORT=3000
SERVICE_HOST=localhost

# Database Configuration  
SERVICE_DATABASE_URL=postgresql://...
SERVICE_DATABASE_POOL_MAX=10

# Feature Flags
SERVICE_FEATURE_X_ENABLED=true
```

---

## 🚨 Regras Críticas

### ❌ NUNCA Faça Isso

1. **NUNCA crie arquivos `.env` em pastas de serviços**
   ```
   ❌ backend/api/my-service/.env
   ❌ apps/my-app/.env
   ❌ backend/services/my-service/.env
   ```

2. **NUNCA commite segredos reais**
   ```
   ❌ API keys reais em .env.defaults
   ❌ Senhas reais em docker.env
   ❌ Tokens reais em qualquer arquivo versionado
   ```

3. **NUNCA use variáveis sem prefixo** (exceto globais como NODE_ENV)

### ✅ SEMPRE Faça Isso

1. **SEMPRE use o loader compartilhado**
   ```javascript
   import '../../../../backend/shared/config/load-env.js';
   ```

2. **SEMPRE adicione variáveis ao .env.defaults** com valores padrão seguros

3. **SEMPRE use prefixos de serviço** nas variáveis

4. **SEMPRE documente** novas variáveis com comentários

5. **SEMPRE valide** a estrutura antes de commit:
   ```bash
   bash scripts/env/validate-env-structure.sh
   ```

---

## 🔍 Validação e Conformidade

### Script de Validação

Execute para verificar conformidade:
```bash
bash scripts/env/validate-env-structure.sh
```

**Verifica:**
- ✅ Não há arquivos `.env` locais em serviços
- ✅ Arquivos obrigatórios existem (`.env.example`, `.env.defaults`)
- ✅ Estrutura está correta

### Pre-commit Hook

O projeto tem um hook que **bloqueia automaticamente** commits com `.env` locais:

```bash
# Se você tentar:
git add backend/api/my-service/.env
git commit -m "test"

# Hook bloqueia com:
❌ ERROR: Local .env files detected!
🔧 How to fix:
   1. Remove these files from your commit
   2. Move variables to config/.env.defaults
   3. Delete the local .env files
```

### CI/CD

GitHub Actions valida automaticamente em cada PR:
- Estrutura de `.env`
- Arquivos obrigatórios
- Conformidade com regras

---

## 📖 Documentação Relacionada

### Guias Principais
- 📄 [CONSOLIDACAO-ENV-COMPLETA.md](../CONSOLIDACAO-ENV-COMPLETA.md) - Histórico da consolidação
- 📄 [PROXIMOS-PASSOS-COMPLETO.md](../PROXIMOS-PASSOS-COMPLETO.md) - Validações implementadas
- 📄 [ANALISE-ESTRUTURA-ENV.md](../ANALISE-ESTRUTURA-ENV.md) - Análise detalhada

### Scripts
- 🔧 [validate-env-structure.sh](../scripts/env/validate-env-structure.sh) - Validação local

### Workflows
- ⚙️ [env-validation.yml](../.github/workflows/env-validation.yml) - Validação CI/CD

## 🎯 Exemplos Práticos

### Adicionar Novo Serviço

**1. Adicionar variáveis ao `.env.defaults`:**
```bash
# ==============================================================================
# 🌐 MY NEW SERVICE
# ==============================================================================
MY_SERVICE_PORT=6000
MY_SERVICE_API_KEY=placeholder-change-in-local
MY_SERVICE_DATABASE_URL=postgresql://user:pass@localhost:5432/db
MY_SERVICE_LOG_LEVEL=info
```

**2. Adicionar ao `services-manifest.json`:**
```json
{
  "id": "my-new-service",
  "type": "backend",
  "path": "backend/api/my-new-service",
  "start": "npm run dev",
  "port": 6000,
  "env": ".env.example",
  "workspace": true,
  "managed": "internal"
}
```

**3. Criar config no serviço:**
```javascript
// backend/api/my-new-service/src/config.js
import '../../../../backend/shared/config/load-env.js';

export const config = {
  port: Number(process.env.MY_SERVICE_PORT || 6000),
  apiKey: process.env.MY_SERVICE_API_KEY,
  database: {
    url: process.env.MY_SERVICE_DATABASE_URL,
  },
  logging: {
    level: process.env.MY_SERVICE_LOG_LEVEL || 'info',
  },
};
```

### Override Local para Desenvolvimento

**Criar `.env.local` na raiz (gitignored):**
```bash
# Local overrides for development
MY_SERVICE_PORT=7000
MY_SERVICE_API_KEY=sk-real-key-abc123
MY_SERVICE_LOG_LEVEL=debug

# Override image for testing
IMG_DATA_TIMESCALEDB=my-custom-timescale:test
```

### Adicionar Nova Imagem Docker

**Em `container-images.env`:**
```bash
# ---- My Category ----
IMG_MY_CATEGORY_SERVICE=my-registry/my-image
```

**Usar em `docker-compose.yml`:**
```yaml
services:
  my-service:
    image: "${IMG_MY_CATEGORY_SERVICE}:${IMG_VERSION}"
```

---

## 🔄 Migração de Variáveis Antigas

Se você encontrar variáveis sem prefixo em código antigo:

**Antes:**
```javascript
const port = process.env.PORT;
const url = process.env.QUESTDB_HTTP_URL;
```

**Depois:**
```javascript
// Com fallback para compatibilidade
const port = process.env.B3_API_PORT || process.env.PORT;
const url = process.env.B3_API_QUESTDB_HTTP_URL || process.env.QUESTDB_HTTP_URL;
```

**Longo prazo:** Remover fallbacks quando todas as variáveis estiverem migradas.

---

## 📊 Estatísticas da Pasta Config

| Arquivo | Tamanho | Linhas | Versionado | Propósito |
|---------|---------|--------|------------|-----------|
| `.env.defaults` | ~13 KB | ~320 | ✅ Sim | Defaults de todas as variáveis |
| `container-images.env` | ~1.6 KB | ~50 | ✅ Sim | Mapeamento de imagens Docker |
| `docker.env` | ~2.6 KB | ~107 | ✅ Sim | Configurações de containers |
| `services-manifest.json` | ~3.4 KB | ~110 | ✅ Sim | Registro de serviços |
| `README.md` | Este arquivo | ~700 | ✅ Sim | Documentação completa |

**Total:** ~21 KB de configuração centralizada

---

## 🚀 Próximos Passos

Se você está começando no projeto:

1. ✅ **Leia este README** completamente
2. ✅ **Copie `.env.example` para `.env`** na raiz
3. ✅ **Configure valores necessários** em `.env.local`
4. ✅ **Execute validação**: `bash scripts/env/validate-env-structure.sh`
5. ✅ **Leia os READMEs** dos serviços que vai usar

Se você vai adicionar um novo serviço:

1. ✅ Adicione variáveis a `config/.env.defaults`
2. ✅ Adicione entrada em `services-manifest.json`
3. ✅ Crie `.env.example` no serviço (template)
4. ✅ Use `load-env.js/cjs` no código
5. ✅ Valide: `bash scripts/env/validate-env-structure.sh`
6. ✅ Documente no README do serviço

---

## ❓ FAQ

**P: Onde coloco minhas senhas e API keys?**
R: Em `.env.local` na raiz do projeto (gitignored).

**P: Posso criar um `.env` na pasta do meu serviço?**
R: ❌ NÃO! Use apenas o `.env` da raiz. Crie `.env.example` como template.

**P: Como sobrescrevo uma variável localmente?**
R: Adicione em `.env.local` na raiz ou exporte no shell.

**P: Onde vejo todas as variáveis disponíveis?**
R: Em `config/.env.defaults` - todas estão lá com comentários.

**P: Como adiciono variáveis ao CI/CD?**
R: Configure no GitHub Secrets e referencie no workflow.

**P: Posso mudar o valor de uma variável em `.env.defaults`?**
R: Sim, mas apenas valores padrão seguros (sem segredos).

---

**Mantido por:** Time TradingSystem  
**Última Atualização:** 2025-10-23  
**Versão:** 2.0 (Pós-consolidação)
