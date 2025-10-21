# 📜 Revisão Completa dos Scripts da Raiz

**Data:** 2025-10-15  
**Total de scripts:** 11 arquivos `.sh`  
**Total de linhas:** 1.411 linhas de código

---

## 📊 Resumo Executivo

| Categoria | Quantidade | Status |
|-----------|-----------|--------|
| Scripts de Setup | 3 | ✅ Essenciais |
| Scripts de Inicialização | 3 | ✅ Essenciais |
| Scripts de Status/Verificação | 3 | ✅ Essenciais |
| Scripts de Utilidade | 2 | ✅ Úteis |
| **Total** | **11** | **Todos ativos** |

---

## 1️⃣ SCRIPTS DE SETUP (Instalação e Configuração)

### `install.sh`
**Tamanho:** 150 linhas  
**Finalidade:** Instalador do Claude Code  
**Complexidade:** ⭐⭐⭐ Alta

**O que faz:**
- Baixa e instala o Claude Code (CLI tool)
- Detecta plataforma (Linux/Mac, x64/arm64, musl/glibc)
- Verifica checksum SHA256 para segurança
- Suporta instalação de versões: `stable`, `latest`, ou específica
- Funciona com `curl` ou `wget`
- Funciona com ou sem `jq` (parser JSON puro bash como fallback)

**Dependências:** `curl`/`wget`, `shasum`/`sha256sum`

**Uso:**
```bash
./install.sh              # Instala versão stable
./install.sh latest       # Instala versão latest
./install.sh 1.2.3        # Instala versão específica
```

**Status:** ✅ **ESSENCIAL** - Claude Code é usado no projeto

---

### `install-dependencies.sh`
**Tamanho:** 81 linhas  
**Finalidade:** Instalar dependências npm de todos os serviços  
**Complexidade:** ⭐⭐ Média

**O que faz:**
- Percorre todos os serviços backend e frontend
- Executa `npm install` em cada `package.json` encontrado
- Verifica se `node_modules` já existe (atualiza se sim)
- Mostra progresso e erros detalhados
- Silencia output do npm (mais limpo)

**Serviços cobertos:**
1. **Backend APIs:** Library, TP Capital, B3, Documentation, Laucher
2. **Frontend:** Dashboard
3. **Docs:** Documentation Hub

**Uso:**
```bash
./install-dependencies.sh
```

**Output esperado:**
```
TradingSystem Dependencies Installation
========================================

1. Backend API Services
-----------------------
Installing Workspace...
  ✓ Workspace dependencies installed
...
```

**Status:** ✅ **ESSENCIAL** - Necessário para setup inicial

---

### `install-cursor-extensions.sh`
**Tamanho:** 41 linhas  
**Finalidade:** Instalar extensões essenciais do Cursor IDE  
**Complexidade:** ⭐ Baixa

**O que faz:**
- Instala 20+ extensões do Cursor via CLI
- Categorias: Python, Git, Formatação, Markdown, Visualização, Utilitários

**Extensões instaladas:**
- **Essenciais:** Claude Code, Pyright
- **Python:** Debugpy, Python
- **Git:** GitLens, GitHub PR
- **Formatação:** ESLint, Prettier, ShellCheck
- **Visualização:** Rainbow CSV, SQLite Viewer, PDF
- **Markdown:** GitHub Preview, Mermaid, All-in-One
- **Utilitários:** TODO Tree, Thunder Client, YAML, Spell Checker

**Uso:**
```bash
./install-cursor-extensions.sh
```

**Status:** ✅ **ÚTIL** - Melhora experiência de desenvolvimento

---

## 2️⃣ SCRIPTS DE INICIALIZAÇÃO (Start/Stop)

### `start-all-services.sh`
**Tamanho:** 333 linhas  
**Finalidade:** Iniciar todos os serviços Node.js localmente  
**Complexidade:** ⭐⭐⭐⭐ Muito Alta

**O que faz:**
- Inicia serviços Node.js em background
- Detecta conflitos de porta (usa `lsof`, `ss`, ou `netstat`)
- Mata processos ocupando portas se necessário
- Cria logs em `/tmp/tradingsystem-logs/`
- Aguarda serviços iniciarem e verifica health
- Suporta parâmetros: `--skip-mcp`, `--skip-health-check`
- Lê configurações do `.env` (portas customizadas)

**Serviços iniciados:**
1. **Agent-MCP** - Porta 8080 (via Python)
2. **Workspace** - Porta 3102 (QuestDB integration)
3. **TP-Capital** - Porta 3200
4. **B3** - Porta 3302
5. **Documentation API** - Porta 3400
6. **Laucher** - Porta 3500
7. **Dashboard** - Porta 3103 (Vite dev server)
8. **Documentation Hub** - Porta 3004 (Docusaurus)

**Fluxo:**
```
1. Detectar tool de porta (lsof/ss/netstat)
2. Para cada serviço:
   - Verificar se porta está em uso
   - Matar processo se conflito
   - Executar npm run dev/start em background
   - Redirecionar logs para arquivo
3. Aguardar health checks (5s por serviço)
4. Exibir status final e URLs
```

**Logs:**
```
/tmp/tradingsystem-logs/
├── agent-mcp.log
├── library-api.log
├── tp-capital-signals.log
├── b3-market-data.log
├── documentation-api.log
├── service-launcher.log
├── dashboard.log
└── docs.log
```

**Uso:**
```bash
./start-all-services.sh                    # Start tudo
./start-all-services.sh --skip-mcp         # Pular Agent-MCP
./start-all-services.sh --skip-health-check # Sem health checks
```

**Status:** ✅ **ESSENCIAL** - Script principal de start

---

### `start-all-stacks.sh`
**Tamanho:** 102 linhas  
**Finalidade:** Iniciar todos os Docker Compose stacks  
**Complexidade:** ⭐⭐ Média

**O que faz:**
- Inicia 5 stacks Docker Compose em ordem
- Aguarda serviços críticos inicializarem
- Exibe status final e URLs de acesso
- Usa cores para feedback visual

**Stacks iniciados (em ordem):**
1. **Infrastructure** (`docker-compose.infra.yml`) - Placeholder (no containers defined)
2. **Data** (`docker-compose.data.yml`) - QuestDB
3. **Monitoring** (`docker-compose.monitoring.yml`) - Prometheus, Grafana, Alertmanager
4. **Frontend** (`docker-compose.frontend.yml`) - Dashboard, Docs
5. **AI Tools** (`docker-compose.ai-tools.yml`) - LangGraph, LlamaIndex, Qdrant

**Esperas estratégicas:**
- 10s após QuestDB (garantir disponibilidade antes de monitoring)
- 5s final para todos containers estabilizarem

**URLs exibidas:**
```
Data:
  QuestDB API:    http://localhost:9000
  QuestDB UI:     http://localhost:9009

Monitoring:
  Prometheus:     http://localhost:9090
  Grafana:        http://localhost:3000

Frontend:
  Dashboard:      http://localhost:3101
  Docs:           http://localhost:3004

AI & ML Tools:
  LangGraph:      http://localhost:8111
  LlamaIndex:     http://localhost:3450
  Qdrant:         http://localhost:6333
```

**Uso:**
```bash
./start-all-stacks.sh
```

**Status:** ✅ **ESSENCIAL** - Infraestrutura Docker

---

### `stop-all-stacks.sh`
**Tamanho:** 80 linhas  
**Finalidade:** Parar todos os Docker Compose stacks  
**Complexidade:** ⭐⭐ Média

**O que faz:**
- Para stacks em ordem reversa (dependentes primeiro)
- Preserva volumes (dados não são perdidos)
- Exibe containers restantes (se houver)
- Fornece dicas de limpeza

**Ordem de parada (reversa do start):**
1. AI & ML Tools (5/5)
2. Frontend (4/5)
3. Monitoring (3/5)
4. Data (2/5)
5. Infrastructure (1/5)

**Preservação de dados:**
- ✅ Volumes QuestDB mantidos
- ✅ Volumes Prometheus mantidos
- ✅ Volumes Grafana mantidos
- ✅ Dados LangGraph mantidos

**Uso:**
```bash
./stop-all-stacks.sh
```

**Status:** ✅ **ESSENCIAL** - Shutdown limpo

---

## 3️⃣ SCRIPTS DE STATUS E VERIFICAÇÃO

### `status.sh`
**Tamanho:** 318 linhas  
**Finalidade:** Status completo do TradingSystem (containers + serviços)  
**Complexidade:** ⭐⭐⭐⭐ Muito Alta

**O que faz:**
- Exibe status de containers Docker por stack
- Verifica serviços locais Node.js (portas)
- Testa health do Agent-MCP (com fallbacks inteligentes)
- Conta containers rodando vs total
- Agrupa por categoria (Infrastructure, Data, Frontend, AI)
- Exibe serviços locais vs remotos
- Mostra URLs de acesso

**Verificação de Agent-MCP (multi-camada):**
1. **Port check** - Verifica se porta 8080 está aberta (`lsof`/`ss`/`netstat`)
2. **HTTP health** - Tenta `/health` endpoint
3. **Fallback** - Tenta `/messages/` (pode retornar 401/405, mas está UP)
4. **Process check** - Verifica processo Python se HTTP falha

**Categorias de containers:**
```
🏗️  INFRASTRUCTURE
  nginx-proxy

💾 DATA
  questdb

🎨 FRONTEND
  dashboard
  docs

🤖 AI TOOLS
  langgraph
  llamaindex
  qdrant
```

**Serviços locais verificados:**
- Workspace (3102)
- TP-Capital (3200)
- B3 (3302)
- Documentation API (3400)
- Laucher (3500)
- Dashboard (3103)
- Documentation Hub (3004)
- Agent-MCP (8080)

**Output típico:**
```
🚀 TradingSystem - Status dos Containers
==========================================

📊 Resumo: 8/10 containers rodando

🏗️  INFRASTRUCTURE
-------------------
  infra-nginx-proxy        Up 2 hours

💾 DATA
-------
  data-questdb             Up 2 hours

🎨 FRONTEND
-----------
  fe-dashboard             Up 1 hour

🤖 AI TOOLS
-----------
  infra-langgraph             Up 30 minutes

🔌 MCP SERVER
-------------
  Status: ✅ UP (PID: 12345)
  Health: ✓ /health endpoint OK
  Port:   8080

🌐 LOCAL SERVICES
-----------------
  Workspace (3102):       ✅ UP
  TP Capital (3200):        ✅ UP
  Dashboard (3103):         ✅ UP
  ...
```

**Uso:**
```bash
./status.sh
```

**Status:** ✅ **ESSENCIAL** - Diagnóstico completo

---

### `check-services.sh`
**Tamanho:** 76 linhas  
**Finalidade:** Verificação rápida de serviços locais  
**Complexidade:** ⭐⭐ Média

**O que faz:**
- Verifica se portas estão em uso (`lsof`)
- Testa health checks via `curl` (se URL fornecida)
- Exibe PIDs dos processos
- Lista processos Node.js relacionados
- Fornece comandos úteis

**Serviços verificados:**
1. Dashboard (3103)
2. Workspace (3102) - Health: `/health`
3. TP-Capital (3200) - Health: `/health`
4. Documentation Hub (3004)
5. Documentation API (3400) - Health: `/health`
6. Laucher (3500) - Health: `/api/status`

**Container services (informativo):**
- QuestDB (9000, 9009)
- Prometheus (9090)
- Grafana (3000)
- B3 (via Traefik/Nginx)

**Output típico:**
```
======================================
TradingSystem Services Status
======================================

📊 Local Services
-----------------

Dashboard (Port 3103): ✓ RUNNING (PID: 12345)
  → Access: http://localhost:3103

Workspace (Port 3102): ✓ RUNNING (PID: 12346)
  → Health check: ✓ OK
  → Access: http://localhost:3102
...

======================================
Node.js Processes
======================================

PID 12345: npm run dev (dashboard)
PID 12346: node server.js (library)
...

💡 Commands:
  Start all: bash start-all-services.sh
  Stop all:  pkill -9 node
  View logs: ls -lh /tmp/tradingsystem-logs/
```

**Uso:**
```bash
./check-services.sh
```

**Status:** ✅ **ÚTIL** - Verificação rápida

---

### `check-docker-permissions.sh`
**Tamanho:** 126 linhas  
**Finalidade:** Diagnóstico de permissões Docker  
**Complexidade:** ⭐⭐ Média

**O que faz:**
- Executa 5 testes de verificação Docker
- Conta sucessos e falhas
- Fornece soluções específicas para cada erro
- Exit code = número de falhas (0 = tudo OK)

**Testes executados:**
1. **Docker instalado** - Verifica `docker --version`
2. **Usuário no grupo docker** - Verifica `groups | grep docker`
3. **Docker daemon rodando** - Verifica `docker info`
4. **Permissão para listar containers** - Verifica `docker ps`
5. **Docker socket acessível** - Verifica `/var/run/docker.sock`

**Diagnóstico inteligente:**
- 0 falhas → ✅ "TUDO CERTO!"
- 1-2 falhas → ⚠️ "ATENÇÃO!" + soluções
- 3+ falhas → ❌ "PROBLEMAS DETECTADOS!" + link para docs

**Soluções sugeridas:**
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker  # ou logout/login

# Iniciar Docker daemon
sudo systemctl start docker
```

**Output típico:**
```
════════════════════════════════════════════════════════
  🔍 Verificação de Permissões Docker - TradingSystem
════════════════════════════════════════════════════════

1. Docker instalado............................ ✓ PASS
   Version: Docker version 24.0.5

2. Usuário no grupo 'docker'................... ✓ PASS

3. Docker daemon rodando....................... ✓ PASS

4. Permissão para listar containers............ ✓ PASS
   Containers rodando: 8

5. Docker socket acessível..................... ✓ PASS
   Permissões: srw-rw---- root docker

════════════════════════════════════════════════════════
  📊 RESUMO
════════════════════════════════════════════════════════

  ✓ Testes OK: 5
  ✗ Testes com falha: 0

🎉 TUDO CERTO! Docker configurado corretamente.
```

**Uso:**
```bash
./check-docker-permissions.sh
echo $?  # 0 = sucesso, >0 = número de falhas
```

**Status:** ✅ **ESSENCIAL** - Troubleshooting Docker

---

## 4️⃣ SCRIPTS DE UTILIDADE

### `QUICK-START.sh`
**Tamanho:** 71 linhas  
**Finalidade:** Setup rápido inicial (Docker + Nginx)  
**Complexidade:** ⭐⭐ Média

**O que faz:**
- Setup one-liner para copiar/colar no terminal
- Configura Docker (grupo, permissões, systemd)
- Instala e configura Nginx
- Adiciona domínio local `tradingsystem.local`
- Configura proxy reverso
- Atualiza `.env` para usar unified domain

**Passos automatizados:**
1. Adiciona usuário ao grupo docker
2. Ajusta permissões do socket Docker
3. Inicia e habilita Docker no boot
4. Instala Nginx (se não instalado)
5. Adiciona `tradingsystem.local` ao `/etc/hosts`
6. Copia config Nginx de `infrastructure/nginx-proxy/`
7. Recarrega Nginx
8. Atualiza frontend `.env` para unified domain
9. Habilita CORS disable nos backends

**URLs finais:**
```
Dashboard:     http://tradingsystem.local
Documentation: http://tradingsystem.local/docs
API:           http://tradingsystem.local/api/*
```

**Uso:**
```bash
# Copiar TODO o script e colar no terminal WSL
./QUICK-START.sh

# Depois executar (conforme instruções):
newgrp docker
# OU
exit  # e fazer login novamente
```

**Status:** ✅ **ÚTIL** - Onboarding rápido

---

### `open-services.sh`
**Tamanho:** 44 linhas  
**Finalidade:** Abrir serviços no navegador automaticamente  
**Complexidade:** ⭐ Baixa

**O que faz:**
- Detecta se está no WSL ou Linux nativo
- Abre URLs no navegador padrão
- WSL → usa `explorer.exe`
- Linux → usa `xdg-open`
- Abre 3 serviços principais com delay

**Serviços abertos:**
1. Dashboard - `http://localhost:3102`
2. Idea Bank API - `http://localhost:3200`
3. TP Capital API - `http://localhost:4005`

**Uso:**
```bash
./open-services.sh
```

**Status:** ✅ **ÚTIL** - Conveniência

---

## 🎯 Análise de Complexidade

### Distribuição por Complexidade

| Complexidade | Scripts | % |
|--------------|---------|---|
| ⭐ Baixa (< 50 linhas) | 2 | 18% |
| ⭐⭐ Média (50-100 linhas) | 5 | 45% |
| ⭐⭐⭐ Alta (100-200 linhas) | 2 | 18% |
| ⭐⭐⭐⭐ Muito Alta (200+ linhas) | 2 | 18% |

### Top 3 Mais Complexos

1. **`start-all-services.sh`** (333 linhas) - Gerenciamento completo de serviços Node.js
2. **`status.sh`** (318 linhas) - Status detalhado multi-camada
3. **`install.sh`** (150 linhas) - Instalador robusto com fallbacks

---

## 📋 Checklist de Uso

### Setup Inicial (primeira vez)
```bash
# 1. Instalar Claude Code
./install.sh

# 2. Instalar extensões Cursor
./install-cursor-extensions.sh

# 3. Configurar Docker e Nginx
./QUICK-START.sh

# 4. Instalar dependências
./install-dependencies.sh

# 5. Iniciar stacks Docker
./start-all-stacks.sh

# 6. Iniciar serviços locais
./start-all-services.sh

# 7. Verificar status
./status.sh

# 8. Abrir no navegador
./open-services.sh
```

### Dia a dia
```bash
# Verificar status
./check-services.sh  # Rápido
./status.sh          # Completo

# Iniciar ambiente
./start-all-stacks.sh      # Containers
./start-all-services.sh    # Node.js

# Parar ambiente
pkill -9 node              # Serviços locais
./stop-all-stacks.sh       # Containers
```

### Troubleshooting
```bash
# Problemas Docker
./check-docker-permissions.sh

# Ver logs
ls -lh /tmp/tradingsystem-logs/
tail -f /tmp/tradingsystem-logs/library-api.log

# Reiniciar um serviço específico
pkill -9 -f "library"
cd backend/api/library && npm run dev > /tmp/tradingsystem-logs/library-api.log 2>&1 &
```

---

## ✅ Conclusão

### Scripts Essenciais (9)
- ✅ `install.sh`
- ✅ `install-dependencies.sh`
- ✅ `start-all-services.sh`
- ✅ `start-all-stacks.sh`
- ✅ `stop-all-stacks.sh`
- ✅ `status.sh`
- ✅ `check-services.sh`
- ✅ `check-docker-permissions.sh`
- ✅ `QUICK-START.sh`

### Scripts Úteis (2)
- ✅ `install-cursor-extensions.sh`
- ✅ `open-services.sh`

### Qualidade Geral
- ✅ **Bem documentados** - Comentários claros
- ✅ **Robustos** - Tratamento de erros
- ✅ **Portáveis** - Funciona em WSL e Linux nativo
- ✅ **User-friendly** - Cores, mensagens claras, dicas
- ✅ **Manuteníveis** - Código modular com funções

### Recomendações

1. **Manter todos os scripts** - Todos são úteis e bem feitos
2. **Considerar criar um script master** - `setup.sh` que executa ordem correta
3. **Adicionar testes** - Validar scripts em CI/CD
4. **Documentar no README** - Incluir referência a este relatório

---

**Scripts totais analisados:** 11  
**Linhas de código:** ~800  
**Status:** ✅ Todos ativos e essenciais  
**Qualidade:** ⭐⭐⭐⭐⭐ Excelente
