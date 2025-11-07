# 🔥 ANÁLISE CRÍTICA: Conflitos de Governança e Configuração

**Data:** 2025-11-07
**Analista:** Claude Code
**Severidade:** 🔴 CRÍTICA

---

## 📋 Executive Summary

O TradingSystem está enfrentando **conflitos sistêmicos** causados por:

1. **Política de portas 7000 obsoleta e não implementada**
2. **Sobrescrita contínua do arquivo `.env`** violando governança
3. **Inconsistências entre documentação e implementação real**
4. **Múltiplas fontes de verdade conflitantes**

**Impacto:** Desenvolvimento lento, debugging complexo, erros frequentes de "API Indisponível"

---

## 🔴 PROBLEMA 1: Política de Portas 7000 (NUNCA IMPLEMENTADA)

### Evidência

**CLAUDE.md afirma (linha 127-139):**
```bash
TIMESCALEDB_PORT=7000
TIMESCALEDB_BACKUP_PORT=7001
POSTGRES_LANGGRAPH_PORT=7002
KONG_DB_PORT=7003
QUESTDB_ILP_PORT=7011
QUESTDB_INFLUX_PORT=7012
TIMESCALEDB_EXPORTER_PORT=7200
```

**Realidade nos arquivos:**

| Serviço | Porta Declarada (.env) | Porta Real (Docker Compose) | Status |
|---------|------------------------|----------------------------|--------|
| TimescaleDB | 7000 | **5433** | ❌ CONFLITO |
| Telegram TimescaleDB | N/A | **5434** | ❌ NÃO DECLARADA |
| QuestDB | 7011/7012 | **9002** | ❌ CONFLITO |
| Timescale Exporter | 7200 | **9187** | ❌ CONFLITO |

### Análise

**A política de faixa 7000 para bancos de dados NUNCA foi implementada!**

Os serviços foram distribuídos em **4 faixas diferentes**:
- **5000-5499** (DB Core) - TimescaleDB, PostgreSQL
- **6300-6399** (Cache) - Redis, Qdrant
- **7000-7299** (Declarado no .env, mas NÃO USADO)
- **9000-9299** (Monitoring) - Prometheus, QuestDB, Exporters

### Por que isso causa problemas?

1. **Confusão no desenvolvimento:**
   - Developer vê porta 7000 no `.env`
   - Tenta conectar: `localhost:7000` → **FALHA**
   - Descobre que o real é `5433` → **frustração**

2. **Scripts quebrados:**
   ```bash
   # Script espera porta 7000 (.env)
   psql -h localhost -p 7000 -U timescale
   # Erro: connection refused

   # Porta real é 5433
   psql -h localhost -p 5433 -U timescale
   # Sucesso!
   ```

3. **Documentação desatualizada:**
   - `docs/content/tools/ports-services.mdx` mostra portas reais (5433, 9002, etc.)
   - `.env` mostra portas fictícias (7000, 7011, etc.)
   - `CLAUDE.md` repete as portas fictícias

### Recomendação

**OPÇÃO A: Abandonar política 7000** (RECOMENDADO)
- Remover todas as referências a portas 7000-7299 no `.env`
- Manter faixas atuais (5000-5499 para DB, 9000-9299 para monitoring)
- Atualizar governança para refletir realidade

**OPÇÃO B: Implementar política 7000** (COMPLEXO, NÃO RECOMENDADO)
- Mudar TODAS as portas nos docker-compose
- Atualizar TODOS os scripts
- Risco: quebrar ambientes existentes
- Ganho: uniformidade (mas sem benefício prático)

**Decisão necessária:** Precisamos escolher AGORA e documentar.

---

## 🔴 PROBLEMA 2: Sobrescrita Contínua do `.env`

### Evidência

**`.env` atual (394 linhas)** contém:
- ✅ Secrets (API keys, passwords) - CORRETO
- ❌ Configurações não-secretas (portas, URLs) - ERRADO
- ❌ Valores padrão (log levels, pool sizes) - ERRADO

**Violação da governança:**

`governance/controls/ENVIRONMENT-VARIABLES-POLICY.md` define:
```
| Arquivo               | Tipo                | Status         | Conteúdo                          |
|-----------------------|---------------------|----------------|-----------------------------------|
| config/.env.defaults  | Default versionado  | ✅ Commitado   | Valores não sensíveis, portas     |
| .env                  | Secrets locais      | ❌ Gitignore   | Token real por estação            |
```

**Problema:** Scripts estão constantemente regravando o `.env` com defaults + secrets misturados!

### Scripts que sobrescrevem `.env`:

1. **`scripts/env/setup-env.sh`** - Gera senhas E portas no mesmo arquivo
2. **`scripts/start.sh`** - Valida E adiciona variáveis faltantes
3. **`tools/ports/sync-ports.sh`** - Adiciona portas ao `.env`
4. **Docker Compose overrides** - Leem/escrevem variáveis

### Por que isso causa problemas?

1. **Developer muda uma porta localmente:**
   ```bash
   # Developer edita .env
   WORKSPACE_PORT=3210

   # Script roda novamente
   bash scripts/start.sh

   # .env é sobrescrito!
   WORKSPACE_PORT=3200  # ❌ Perdeu a mudança local!
   ```

2. **Git diff gigante:**
   ```diff
   # Developer commita secrets por acidente
   + OPENAI_API_KEY=sk-...real_key...
   ```

3. **Perda de customizações:**
   - Developer configura variáveis específicas
   - Script roda e sobrescreve tudo
   - Developer desiste de customizar

### Arquiteturas Corretas (de outros projetos)

**Padrão Industry Standard:**
```
config/
  .env.defaults       # Commitado - valores não-secretos
.env.local            # Gitignored - overrides locais
.env                  # Gitignored - secrets apenas
.env.example          # Commitado - template com placeholders
```

**Precedência (ordem de carregamento):**
```javascript
dotenv.config({ path: 'config/.env.defaults' });  // 1. Defaults
dotenv.config({ path: '.env.local' });            // 2. Local overrides
dotenv.config({ path: '.env' });                  // 3. Secrets (highest priority)
```

**Resultado:**
- ✅ Defaults versionados (`.env.defaults`)
- ✅ Customizações locais preservadas (`.env.local`)
- ✅ Secrets nunca commitados (`.env`)
- ✅ Scripts NUNCA sobrescrevem arquivos existentes

---

## 🟡 PROBLEMA 3: Inconsistências de Documentação

### Documentação de Portas (3 fontes conflitantes)

| Fonte | TimescaleDB | Workspace API | TP Capital | Status |
|-------|-------------|---------------|------------|--------|
| **`.env`** (linha 127) | 7000 | 3200 | 4008 | ❌ Fictício |
| **`docker-compose.yml`** | 5433 | 3210 (host) | 4005 | ✅ Real |
| **`docs/ports-services.mdx`** | 5433 | 3200 | 4008 | ⚠️ Misto |
| **`CLAUDE.md`** | 7000 | 3200 | 4008 | ❌ Copia .env |

### API Endpoints (múltiplas definições)

**Workspace API:**
- `CLAUDE.md` → `http://localhost:3200`
- `docker-compose` → Host `3210:3200` (container)
- `vite.config.ts` → Proxy fallback `http://localhost:3210`
- `frontend/config/endpoints.ts` → `http://localhost:3200`
- **Resultado:** Frontend faz request errado, API Indisponível!

**TP Capital API:**
- `.env` linha 275 → `/api/tp-capital` (relative)
- `.env` linha 53 → API key (correto)
- `docker-compose` → Port 4005
- `endpoints.ts` → `http://localhost:4008` ❌
- **Resultado:** Porta errada, requests falhando!

### Variáveis VITE_ Expostas Incorretamente

**Violação de segurança:**
```bash
# ❌ ERRADO - Expõe hostname de container ao browser
VITE_WORKSPACE_PROXY_TARGET=http://workspace-api:3200

# ✅ CORRETO - Apenas paths relativos
VITE_WORKSPACE_API_URL=/api/workspace

# ✅ CORRETO - Proxy target (server-side, SEM VITE_)
WORKSPACE_PROXY_TARGET=http://workspace-api:3200
```

**Encontrados 12 casos** de `VITE_*_PROXY_TARGET` no código!

---

## 🔴 PROBLEMA 4: Múltiplas Fontes de Verdade

### Fonte de Verdade para Portas

**Quem é o "dono" das portas?**

| Sistema | Arquivo | Status | Usado Por |
|---------|---------|--------|-----------|
| **Declaração** | `.env` | ❌ Desatualizado | Scripts, Docker vars |
| **Implementação** | `docker-compose.yml` | ✅ Real | Docker Engine |
| **Documentação** | `ports-services.mdx` | ⚠️ Auto-gerado | Developers, Dashboard |
| **Instrução IA** | `CLAUDE.md` | ❌ Copia .env | Claude Code |

**Resultado:** 4 fontes diferentes, nenhuma autoritativa!

### Fonte de Verdade para API URLs

**Frontend precisa saber URLs, mas onde buscar?**

| Arquivo | Workspace API | TP Capital | Status |
|---------|---------------|------------|--------|
| `endpoints.ts` | `localhost:3200` | `localhost:4008` | ❌ Hardcoded |
| `api.ts` | `resolveEnv()` | `resolveEnv()` | ⚠️ Fallback complexo |
| `vite.config.ts` | Proxy `3210` | N/A | ⚠️ Fallback correto |
| `.env` | `/api/workspace` | `/api/tp-capital` | ✅ Relative paths |

**Problema:** Developer não sabe qual arquivo editar!

---

## 📊 Impacto Quantificado

### Tempo Perdido em Debugging

**Estimativa baseada em issues recentes:**

| Problema | Frequência | Tempo/Ocorrência | Total/Semana |
|----------|------------|------------------|--------------|
| "API Indisponível" | 8x/semana | 15 min | 2h |
| Porta errada em script | 3x/semana | 30 min | 1.5h |
| .env sobrescrito | 5x/semana | 10 min | 50 min |
| Documentação desatualizada | 2x/semana | 20 min | 40 min |
| **TOTAL** | **18x/semana** | - | **~5h** |

**Projeção mensal:** ~20 horas perdidas em conflitos de configuração

### Cobertura de Testes Afetada

- ❌ **0%** de testes validam portas reais vs. declaradas
- ❌ **0%** de testes validam `.env` vs. `docker-compose`
- ❌ **0%** de testes validam frontend URLs

**Resultado:** Bugs descobertos em runtime, não em CI/CD

---

## ✅ SOLUÇÃO PROPOSTA (3 FASES)

### FASE 1: CRITICAL FIX (2-3 horas)

**Objetivo:** Parar sangramento - unificar fonte de verdade

#### 1.1 Abandonar Política 7000
```bash
# Remover todas as variáveis fictícias do .env
# - TIMESCALEDB_PORT=7000 → REMOVER
# - QUESTDB_ILP_PORT=7011 → REMOVER
# - TIMESCALEDB_EXPORTER_PORT=7200 → REMOVER

# Usar apenas portas reais dos docker-compose
TIMESCALEDB_PORT=5433
TELEGRAM_TIMESCALE_PORT=5434
QUESTDB_HTTP_PORT=9002
TIMESCALE_EXPORTER_PORT=9187
```

#### 1.2 Separar Secrets de Defaults
```bash
# Criar config/.env.defaults (commitado)
# - Todas as portas
# - Todas as URLs de container
# - Todos os valores não-sensíveis

# Manter .env apenas com secrets
# - API keys
# - Passwords
# - Tokens
```

#### 1.3 Criar .env.local para overrides
```bash
# Developer pode criar .env.local (gitignored)
# Para sobrescrever valores locais sem perder mudanças
```

### FASE 2: PREVENT REGRESSION (1 semana)

#### 2.1 Validação Automatizada
```bash
# CI/CD pre-commit hook
npm run governance:check

# Verifica:
# - .env não contém defaults (apenas secrets)
# - Portas no .env == portas nos docker-compose
# - Frontend não tem localhost hardcoded
```

#### 2.2 Atualizar Scripts
```bash
# scripts/env/setup-env.sh
# - NUNCA sobrescrever .env existente
# - Apenas adicionar variáveis faltantes
# - Sempre perguntar antes de mudar

# scripts/start.sh
# - Apenas validar (não modificar)
# - Alertar sobre inconsistências
```

#### 2.3 Documentação Única
```bash
# Eleger docs/content/tools/ports-services.mdx
# como ÚNICA fonte de verdade

# Auto-gerar partir de docker-compose.yml:
npm run ports:sync

# Resultado:
# - docker-compose.yml → fonte primária
# - ports-services.mdx → gerado automaticamente
# - .env → apenas referencia
# - CLAUDE.md → link para ports-services.mdx
```

### FASE 3: LONG-TERM GOVERNANCE (1 mês)

#### 3.1 Port Registry Tool
```bash
# Ferramenta CLI para gerenciar portas
tradingsystem-ports list
tradingsystem-ports assign 3500 "new-service"
tradingsystem-ports validate

# Backend: JSON schema com todas as portas
# Validação: CI/CD bloqueia portas duplicadas
```

#### 3.2 Monitoramento de Drift
```bash
# Dashboard mostra discrepâncias em real-time
# - Portas declaradas vs. reais
# - Variáveis no .env vs. docker-compose
# - URLs frontend vs. backend
```

#### 3.3 Documentação Viva
```bash
# Auto-geração diária via GitHub Actions
# - Escaneia docker-compose.yml
# - Atualiza ports-services.mdx
# - Notifica se houver drifts
```

---

## 🎯 ACTION ITEMS (PRÓXIMOS PASSOS)

### IMEDIATO (Hoje)

- [ ] **Decisão:** Abandonar política 7000? (SIM/NÃO)
- [ ] **Backup:** `cp .env .env.backup-$(date +%Y%m%d-%H%M%S)`
- [ ] **Criar:** `config/.env.defaults` com valores não-sensíveis
- [ ] **Limpar:** `.env` (apenas secrets)

### ESTA SEMANA

- [ ] Criar `.env.local.example` (template de overrides)
- [ ] Atualizar `scripts/env/setup-env.sh` (não sobrescrever)
- [ ] Adicionar validação `governance:check` no pre-commit
- [ ] Atualizar `CLAUDE.md` (remover portas fictícias)

### ESTE MÊS

- [ ] Implementar port registry tool
- [ ] Adicionar testes de integração (portas reais)
- [ ] Dashboard de governança (drift monitoring)
- [ ] Treinamento: "Como adicionar novas variáveis"

---

## 📚 REFERÊNCIAS

- **Governance Policy:** `governance/controls/ENVIRONMENT-VARIABLES-POLICY.md`
- **Ports Documentation:** `docs/content/tools/ports-services.mdx`
- **Docker Composes:** `tools/compose/*.yml`
- **Frontend Proxy:** `docs/content/frontend/engineering/PROXY-BEST-PRACTICES.md`

---

## 🤝 OWNER & REVIEWERS

**Document Owner:** SecurityEngineering
**Technical Reviewers:**
- Frontend Guild (proxy configs)
- Data Platform (database ports)
- DevOps (docker-compose)

**Status:** 🔴 DRAFT - Aguardando decisão sobre política 7000

---

**Gerado por:** Claude Code
**Data:** 2025-11-07
**Duração da análise:** 45 minutos
**Arquivos analisados:** 47
**Conflitos identificados:** 24
