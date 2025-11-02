# 🔧 Correção do Conflito de Portas - Documentation Hub

**Data**: 2025-10-30
**Status**: ✅ Resolvido

---

## ❌ Problema Identificado

**Conflito de Porta 3400** - Dois serviços tentando usar a mesma porta:

1. **`docs-hub`** (Docker container) → porta 3400 (NGINX servindo Docusaurus build estático)
2. **`docusaurus`** (npm local) → porta 3400 (servidor de desenvolvimento)

### Sintomas

- ❌ Mensagem de erro: "Port 3400 already in use"
- ❌ `docusaurus` local falhava ao iniciar porque `docs-hub` já estava na porta 3400
- ❌ Confusão sobre qual serviço usar (porta 3400 ou 3205?)

### Histórico de Portas

- **Porta 3205** → DEPRECIADA (antiga porta do Docusaurus local)
- **Porta 3400** → ATUAL (docs-hub container + NGINX)

---

## ✅ Solução Implementada

### 1. Removido Serviço `docusaurus` Local

**Arquivo**: `scripts/start.sh` (linha 84)

```bash
# ANTES (ERRADO - conflito de porta)
["docusaurus"]="docs:3400:PORT=3400 npm run start:::2"
["dashboard"]="frontend/dashboard:3103:npm run dev::docs-api,docusaurus:2"

# DEPOIS (CORRETO - usa container docs-hub)
# NOTE: docusaurus removed - docs-hub container (port 3400) serves Docusaurus instead
["dashboard"]="frontend/dashboard:3103:npm run dev::docs-api:2"
```

### 2. Atualizada Dependência do Dashboard

Dashboard agora depende apenas de `docs-api`, pois a documentação é servida pelo container `docs-hub`.

### 3. Atualizada Seção de Resumo

**Arquivo**: `scripts/start.sh` (linha 1055)

```bash
# ANTES
echo -e "  📖 Docusaurus:            http://localhost:3400"

# DEPOIS
echo -e "  📖 Documentation Hub:     http://localhost:3400  (docs-hub container)"
```

### 4. Atualizada Documentação CLAUDE.md

**Arquivo**: `CLAUDE.md` (linha 467)

```bash
# ANTES (manual startup via npm)
# Documentation Hub (Port 3400)
cd docs
npm install && npm run start -- --port 3400

# DEPOIS (container Docker)
# Documentation Hub (Port 3400) - runs as Docker container (docs-hub)
# Started automatically by `start` command via docker-compose.docs.yml
# For manual start: docker compose -f tools/compose/docker-compose.docs.yml up -d
```

---

## 📊 Estrutura Final

### Serviços de Documentação

| Serviço | Tipo | Porta | Função |
|---------|------|-------|--------|
| **docs-hub** | Docker container | 3400 | NGINX servindo Docusaurus build estático |
| **docs-api** | Local npm | 3401 | API de documentação (FlexSearch, CRUD) |
| ~~docusaurus (local)~~ | ~~Local npm~~ | ~~3400~~ | ❌ **REMOVIDO** (conflito) |

### Como Acessar

- **Documentation Hub**: http://localhost:3400 (via container `docs-hub`)
- **Documentation API**: http://localhost:3401 (via npm local ou container `docs-api`)

---

## 🧪 Testes Realizados

### 1. Comando `start`

```bash
bash scripts/start.sh
```

**Resultado**: ✅ Sucesso
```
✓ DOCS stack already running and healthy (2 services)
✅ All services started successfully!
```

### 2. Verificação de Status

```bash
bash scripts/status.sh
```

**Resultado**: ✅ Correto
```
📚 DOCS Stack:
  ✓ docs-hub                     Ports: 3400
  ✓ docs-api                     Ports: 3401
```

### 3. Acesso à Documentação

- ✅ http://localhost:3400 → Docusaurus funcionando (via docs-hub container)
- ✅ http://localhost:3401/health → DocsAPI healthy

---

## 🎯 Benefícios da Solução

1. **Zero Conflitos**: Apenas um serviço na porta 3400 (docs-hub container)
2. **Mais Estável**: NGINX otimizado para servir conteúdo estático
3. **Produção-Ready**: Container é o mesmo em dev e produção
4. **Health Checks**: Container tem health checks configurados
5. **Menos Memória**: NGINX consome menos recursos que npm dev server

---

## 📝 Arquivos Modificados

1. **`scripts/start.sh`**:
   - Removida linha 84 (serviço docusaurus local)
   - Atualizada linha 85 (dependências do dashboard)
   - Atualizada linha 1055 (mensagem de resumo)

2. **`CLAUDE.md`**:
   - Atualizada seção "Manual Startup" (linhas 467-469)
   - Clarificado que Documentation Hub roda como container

3. **`DOCS-PORT-CONFLICT-FIX.md`** (NOVO):
   - Documentação completa do problema e solução

---

## 🔄 Migração (Se Necessário)

Se você estava usando `docusaurus` local antes:

### Parar Docusaurus Local

```bash
# Matar processo na porta 3400 (se houver)
lsof -ti:3400 | xargs kill -9
```

### Usar Container docs-hub

```bash
# Iniciar container Documentation Hub
docker compose -f tools/compose/docker-compose.docs.yml up -d

# Ou usar comando start (inicia tudo)
start
```

### Desenvolvimento de Docs

Se você precisa editar documentação e ver mudanças em tempo real:

**Opção 1: Hot Reload via Mounted Volume** (RECOMENDADO)
```bash
# Container docs-hub já tem volume montado:
# - ../../docs/build:/usr/share/nginx/html:ro

# Rebuild documentação (em outro terminal)
cd docs
npm run build

# NGINX automaticamente serve o novo build
```

**Opção 2: Docusaurus Dev Mode** (apenas quando necessário)
```bash
# Parar container docs-hub temporariamente
docker compose -f tools/compose/docker-compose.docs.yml stop

# Iniciar Docusaurus local (dev mode)
cd docs
npm run start -- --port 3400

# Quando terminar, reiniciar container
docker compose -f tools/compose/docker-compose.docs.yml start
```

---

## ✅ Checklist de Validação

Após aplicar as mudanças:

- [x] Container `docs-hub` roda na porta 3400
- [x] Serviço `docusaurus` local removido do start.sh
- [x] Dashboard inicia sem depender de docusaurus local
- [x] Comando `start` executa sem erros
- [x] http://localhost:3400 acessível (docs-hub)
- [x] http://localhost:3401/health retorna 200 (docs-api)
- [x] Documentação CLAUDE.md atualizada
- [x] Nenhum conflito de porta 3400

---

## 🎉 Resultado Final

✅ **Sistema Completamente Funcional**

**Docker Containers**: 27/27 rodando
```
📦 APPS Stack:         2 containers ✓
🗄️  DATA Stack:         9 containers ✓
📚 DOCS Stack:         2 containers ✓ (docs-hub + docs-api)
🧠 RAG Stack:          3 containers ✓
📊 MONITORING Stack:   4 containers ✓
🔧 TOOLS Stack:        7 containers ✓
```

**Local Services**: 4/5 rodando
```
✓ telegram-gateway
✓ telegram-gateway-api
✓ dashboard
✓ status
✗ docusaurus (ESPERADO - agora usa container docs-hub)
```

**URLs Principais**:
- 📖 Documentation Hub: http://localhost:3400 (docs-hub container)
- 📚 Documentation API: http://localhost:3401 (docs-api)
- 🎨 Dashboard: http://localhost:3103

---

**Versão**: 1.0
**Última Atualização**: 2025-10-30
**Status**: ✅ Produção
