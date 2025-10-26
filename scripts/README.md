---
title: 📚 TradingSystem - Guia Completo de Scripts
sidebar_position: 1
tags:
  - documentation
domain: shared
type: index
summary: Documentação unificada de todos os scripts do projeto
status: active
last_review: '2025-10-23'
---

# 📚 TradingSystem - Guia Completo de Scripts

**Documentação unificada de todos os scripts do projeto**

---

## 📋 Índice Rápido

- [Quick Start](#-quick-start)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Core - Scripts Principais](#-core---scripts-principais)
- [Docker & BuildKit](#-docker--buildkit)
- [Database](#-database)
- [Documentação](#-documentação)
- [Setup & Configuração](#-setup--configuração)
- [Maintenance & Utils](#-maintenance--utils)
- [Bibliotecas (lib/)](#-bibliotecas-lib)
- [Referência Rápida](#-referência-rápida-de-comandos)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start

### Iniciar Ambiente Completo

**Linux:**
```bash
bash scripts/core/start-trading-system-dev.sh --start-monitoring
```

**Windows:**
```powershell
.\scripts\core\start-trading-system-dev.ps1 -StartMonitoring
```

**Serviços Iniciados:**
- Launcher (3500)
- Workspace (3200)
- TP-Capital (4005)
- B3 Market Data (3302)
- DocsAPI (3400)
- Dashboard Frontend (3103 ou 5173)
- Documentação (3205)
- Prometheus (9090)
- Grafana (3000)

### Verificar Status
```bash
bash scripts/core/status-tradingsystem.sh
```

### Parar Todos os Serviços
```bash
bash scripts/core/stop-tradingsystem-full.sh
```

---

## 📁 Estrutura de Pastas

```
scripts/
├── 📂 core/          16 scripts  - Startup, stop, status, controle
├── 📂 docker/        13 scripts  - Docker + BuildKit
├── 📂 database/       8 scripts  - Database + Firecrawl + LangGraph
├── 📂 docs/          12 scripts  - Documentação e validação
├── 📂 setup/          7 scripts  - Instalação e configuração
├── 📂 maintenance/   19 scripts  - Manutenção, health, terminal, utils
└── 📂 lib/            7 scripts  - Bibliotecas compartilhadas

Total: 7 pastas, ~82 scripts
```

---

## 🎯 core/ - Scripts Principais

**Propósito:** Scripts principais de controle do sistema (startup, stop, status)

### Scripts de Startup

#### `start-trading-system-dev.sh` / `.ps1`
Inicia ambiente completo de desenvolvimento.

**Opções Linux:**
```bash
bash scripts/core/start-trading-system-dev.sh [opções]

--skip-frontend          # Não inicia Dashboard
--skip-idea-bank         # Não inicia Idea Bank API
--skip-docs              # Não inicia Documentação
--start-monitoring       # Inicia Prometheus/Grafana
--start-docs-docker      # Inicia docs via Docker
--skip-service-launcher  # Não inicia Launcher
```

**Opções Windows:**
```powershell
.\scripts\core\start-trading-system-dev.ps1 [opções]

-SkipFrontend          # Não inicia Dashboard
-SkipIdeaBank          # Não inicia Idea Bank API
-SkipDocs              # Não inicia Documentação
-StartMonitoring       # Inicia Prometheus/Grafana
-StartDocsDocker       # Inicia docs via Docker
-SkipServiceLauncher   # Não inicia Launcher
```

#### `start-dashboard-stack.sh`
Inicia stack completo do dashboard.

```bash
bash scripts/core/start-dashboard-stack.sh
```

**Inicia:**
- Docker: TimescaleDB, QuestDB, LangGraph Postgres, pgAdmin, Firecrawl stack, Documentation API
- Node.js: Workspace API, TP Capital, B3 Market Data, Firecrawl Proxy, Service Launcher, Dashboard App

**Features:**
- Instalação automática de dependências
- Carregamento de variáveis de ambiente
- Gerenciamento de PID files
- Logs em `scripts/.runtime/dashboard-stack/logs/`

#### `start-tradingsystem-full.sh`
Startup completo e abrangente do sistema.

```bash
bash scripts/core/start-tradingsystem-full.sh
```

#### `launch-service.sh` / `.ps1`
Lançador genérico para qualquer serviço.

**Linux:**
```bash
bash scripts/core/launch-service.sh \
  --name "Service Name" \
  --dir "/path/to/service" \
  --command "npm run dev"
```

**Windows:**
```powershell
.\scripts\core\launch-service.ps1 `
  -ServiceName "Service Name" `
  -WorkingDir "C:\path\to\service" `
  -Command "npm run dev"
```

### Scripts de Stop

#### `stop-dashboard-stack.sh`
Para todo o dashboard stack.

```bash
bash scripts/core/stop-dashboard-stack.sh
```

**Estratégia:**
1. Mata processos Node.js via PID file
2. Force kill processos remanescentes
3. Para containers Docker
4. Preserva logs

#### `stop-tradingsystem-full.sh`
Para todos os serviços do sistema.

```bash
bash scripts/core/stop-tradingsystem-full.sh
```

### Scripts de Status

#### `status-tradingsystem.sh`
Status completo e detalhado de todos os serviços.

```bash
bash scripts/core/status-tradingsystem.sh
```

**Mostra:**
- Status de processos Node.js
- Status de containers Docker
- Portas em uso
- Health checks

#### `diagnose-services.sh`
Diagnóstico detalhado de serviços.

```bash
bash scripts/core/diagnose-services.sh
```

### Outros Scripts Core

#### `restart-dashboard-stack.sh`
Reinicia o dashboard stack.

```bash
bash scripts/core/restart-dashboard-stack.sh
```

#### `welcome-message.sh`
Mensagem de boas-vindas no terminal.

#### `register-trading-system-dev-startup.ps1` (Windows)
Registra tarefa agendada para startup automático.

```powershell
# Registrar
.\scripts\core\register-trading-system-dev-startup.ps1

# Remover
.\scripts\core\register-trading-system-dev-startup.ps1 -Remove
```

---

## 🐳 docker/ - Docker & BuildKit

**Propósito:** Gerenciamento de Docker e BuildKit

### Scripts Docker Core

#### `docker-manager.sh`
Manager centralizado para todos os containers.

```bash
bash scripts/docker/docker-manager.sh [comando] [grupo]

# Comandos: start, stop, restart, status, logs, clean
# Grupos: all, database, documentation, firecrawl, infrastructure, monitoring
```

**Exemplos:**
```bash
bash scripts/docker/docker-manager.sh start all
bash scripts/docker/docker-manager.sh stop database
bash scripts/docker/docker-manager.sh status monitoring
bash scripts/docker/docker-manager.sh logs firecrawl
bash scripts/docker/docker-manager.sh clean all
```

#### `start-stacks.sh` / `stop-stacks.sh`
Inicia/para todos os stacks Docker.

```bash
bash scripts/docker/start-stacks.sh
bash scripts/docker/stop-stacks.sh
```

#### `build-images.sh`
Compila e retaggeia todas as imagens `img-*`.

```bash
IMG_VERSION=2025.10.19 bash scripts/docker/build-images.sh
```

**Funcionalidade:**
- Aplica `IMG_VERSION` em todas as imagens
- Garante builds para `linux/amd64`
- Usado antes de promover versões

#### `verify-docker.sh`
Verifica instalação e configuração do Docker.

```bash
bash scripts/docker/verify-docker.sh
```

**Verifica:**
- Docker instalado
- Docker Compose v2+
- Permissões (sudo/rootless)
- Networks
- Volumes

#### `cleanup-orphans.sh`
Remove containers órfãos.

```bash
bash scripts/docker/cleanup-orphans.sh
```

#### `check-docs-services.sh`
Verifica status dos serviços de documentação.

```bash
bash scripts/docker/check-docs-services.sh
```

**Verifica:**
- DocsAPI (porta 3400)
- Docusaurus (porta 3205)
- TimescaleDB (porta 5433)

### Scripts BuildKit

**Nota:** Scripts BuildKit consolidados com prefixo `buildkit-*`

#### `buildkit-wrapper-cached.sh`
Wrapper principal para comandos buildctl com cache avançado.

```bash
./scripts/docker/buildkit-wrapper-cached.sh build \
    context_dir \
    dockerfile_dir \
    image_name:tag

./scripts/docker/buildkit-wrapper-cached.sh build-registry \
    context_dir \
    dockerfile_dir \
    image_name:tag

./scripts/docker/buildkit-wrapper-cached.sh clean-cache
```

**Performance:**
- Build inicial: ~3.8s
- Build com cache local: ~0.35s (90% mais rápido)
- Build com cache do registry: ~0.4s (89% mais rápido)

#### `buildkit-install-buildkit.sh`
Instala BuildKit e dependências.

```bash
bash scripts/docker/buildkit-install-buildkit.sh
```

#### `buildkit-fix-buildkit-permissions.sh`
Corrige problemas de permissões do BuildKit.

```bash
bash scripts/docker/buildkit-fix-buildkit-permissions.sh
```

**O que faz:**
- Cria grupo buildkit
- Adiciona usuário ao grupo
- Configura permissões do socket
- Atualiza serviço systemd

#### `buildkit-setup-buildkit-cache-improved.sh`
Setup de cache distribuído com registry.

```bash
bash scripts/docker/buildkit-setup-buildkit-cache-improved.sh
```

#### `buildkit-setup-registry-cache.sh`
Configura registry local para cache.

```bash
bash scripts/docker/buildkit-setup-registry-cache.sh
```

#### `buildkit-test-buildkit-cache.sh`
Teste de performance do cache.

```bash
bash scripts/docker/buildkit-test-buildkit-cache.sh
```

---

## 💾 database/ - Database

**Propósito:** Gerenciamento de bancos de dados, Firecrawl e LangGraph

### Scripts Database Core

#### `backup-timescaledb.sh`
Executa backup manual do TimescaleDB.

```bash
bash scripts/database/backup-timescaledb.sh
```

**Cria backup em:** `backend/data/timescaledb/backups/`

#### `restore-questdb.sh`
Restaura dados do QuestDB.

```bash
bash scripts/database/restore-questdb.sh
```

#### `setup-timescaledb-stack.sh`
Provisiona ou para stack TimescaleDB.

```bash
bash scripts/database/setup-timescaledb-stack.sh [start|stop]
```

#### `questdb-restore-tables.sql`
Script SQL para restaurar tabelas do QuestDB.

```bash
questdb < scripts/database/questdb-restore-tables.sql
```

### Scripts Firecrawl

**Nota:** Scripts com prefixo `firecrawl-*`

#### `firecrawl-start.sh`
Inicia stack Firecrawl.

```bash
bash scripts/database/firecrawl-start.sh
```

**Inicia:**
- Firecrawl API
- Redis
- Postgres
- Playwright service
- Proxy

#### `firecrawl-stop.sh`
Para stack Firecrawl.

```bash
bash scripts/database/firecrawl-stop.sh
```

### Scripts LangGraph

**Nota:** Scripts com prefixo `langgraph-*`

#### `langgraph-start-dev.sh`
Inicia LangGraph em modo desenvolvimento.

```bash
bash scripts/database/langgraph-start-dev.sh
```

#### `langgraph-stop-dev.sh`
Para LangGraph dev.

```bash
bash scripts/database/langgraph-stop-dev.sh
```

#### `langgraph-studio-proxy.sh`
Proxy para LangGraph Studio.

```bash
bash scripts/database/langgraph-studio-proxy.sh
```

---

## 📚 docs/ - Documentação

**Propósito:** Scripts de documentação, validação e testes

### Scripts de Validação Principal

#### `validate-docusaurus-integrity.sh`
Validação completa da integridade do Docusaurus.

```bash
bash scripts/docs/validate-docusaurus-integrity.sh [--verbose] [--json]
```

**Verifica:**
- Estrutura de arquivos
- Configuração
- Plugins
- Build artifacts
- Links internos

#### `validate-production-build.sh`
Valida build de produção.

```bash
bash scripts/docs/validate-production-build.sh
```

**Executa:**
- Build completo
- Validação de output
- Verificação de erros
- Análise de tamanho

#### `validate-frontmatter.py`
Valida frontmatter de todos os arquivos markdown.

```bash
python3 scripts/docs/validate-frontmatter.py
```

### Scripts de Health Check

#### `run-all-health-tests-v2.sh`
Executa todos os testes de saúde com proteção anti-hang.

```bash
bash scripts/docs/run-all-health-tests-v2.sh
```

**Features:**
- Timeouts automáticos
- Proteção anti-hang
- Logs detalhados
- Relatório de resultados

#### `troubleshoot-health-dashboard.sh`
Troubleshooting do health dashboard.

```bash
bash scripts/docs/troubleshoot-health-dashboard.sh
```

### Scripts Python

#### `check-links-v2.py`
Verifica links em toda a documentação.

```bash
python3 scripts/docs/check-links-v2.py
```

**Features:**
- Resolução melhorada de links
- Detecção de links quebrados
- Links externos
- Relatório detalhado

#### `detect-duplicates.py`
Detecta conteúdo duplicado.

```bash
python3 scripts/docs/detect-duplicates.py
```

#### `fix-frontmatter.py`
Corrige problemas de frontmatter.

```bash
python3 scripts/docs/fix-frontmatter.py
```

#### `docs_health.py`
Health checks de documentação.

```bash
python3 scripts/docs/docs_health.py
```

### Scripts JavaScript

#### `frontend-sync-tokens.js`
Sincroniza tokens do frontend.

```bash
node scripts/docs/frontend-sync-tokens.js
```

#### `new-page.js`
Cria nova página com template.

```bash
node scripts/docs/new-page.js <category> <title>
```

#### `prd-index.js`
Gera índice de PRDs.

```bash
node scripts/docs/prd-index.js
```

### Outros Scripts

#### `backup-docusaurus.sh`
Cria backup timestamped do Docusaurus.

```bash
bash scripts/docs/backup-docusaurus.sh [--compress] [--destination DIR]
```

#### `install-dependencies.sh`
Instala dependências Python para scripts de saúde.

```bash
bash scripts/docs/install-dependencies.sh
```

#### `pre-flight-check.sh`
Validação de ambiente antes de executar scripts.

```bash
bash scripts/docs/pre-flight-check.sh
```

---

## ⚙️ setup/ - Setup & Configuração

**Propósito:** Scripts de instalação e configuração inicial

### Scripts Principais

#### `setup-linux-environment.sh`
Setup inicial completo para ambiente Linux.

```bash
bash scripts/setup/setup-linux-environment.sh
```

**O que faz:**
- Torna scripts executáveis
- Verifica dependências do sistema
- Cria diretórios necessários
- Verifica arquivos de ambiente
- Testa permissões Docker
- Opcionalmente instala dependências npm

#### `install-dependencies.sh`
Instala todas as dependências npm do projeto.

```bash
bash scripts/setup/install-dependencies.sh
```

**Instala em:**
- Root
- Frontend apps
- Backend APIs
- Tools

#### `quick-start.sh`
Setup rápido para novos desenvolvedores.

```bash
bash scripts/setup/quick-start.sh
```

**Workflow:**
1. Verifica Docker
2. Clona/verifica repositório
3. Instala dependências
4. Configura ambiente
5. Inicia serviços

#### `configure-sudo-docker.sh`
Configura Docker para rodar sem sudo.

```bash
bash scripts/setup/configure-sudo-docker.sh
```

**O que faz:**
- Cria grupo docker
- Adiciona usuário ao grupo
- Reinicia Docker daemon
- Testa permissões

#### `install-cursor-extensions.sh`
Instala extensões recomendadas do Cursor/VSCode.

```bash
bash scripts/setup/install-cursor-extensions.sh
```

#### `setup-workspace-database.sh`
Configura banco de dados do workspace.

```bash
bash scripts/setup/setup-workspace-database.sh
```

#### `setup-dev-env.ps1` (Windows)
Setup de ambiente de desenvolvimento para Windows.

```powershell
.\scripts\setup\setup-dev-env.ps1
```

---

## 🔧 maintenance/ - Maintenance & Utils

**Propósito:** Manutenção, health checks, terminal, utils, validation

### Scripts de Cleanup

#### `cleanup-and-restart.sh`
Limpeza completa e reinício do sistema.

```bash
bash scripts/maintenance/cleanup-and-restart.sh [OPTIONS]

--skip-logs         # Não remove logs
--no-restart        # Apenas limpa, não reinicia
--help              # Exibe ajuda
```

**O que faz:**
1. Para todos os serviços e containers
2. Remove containers órfãos
3. Limpa logs (opcional)
4. Reinicia tudo (opcional)

#### `cleanup-unused-scripts.sh`
Remove scripts não utilizados identificados em análises.

```bash
bash scripts/maintenance/cleanup-unused-scripts.sh [--dry-run] [--backup]
```

### Scripts de Health Check

#### `health-check-all.sh`
Health check completo do sistema.

```bash
bash scripts/maintenance/health-check-all.sh
```

**Verifica:**
- Serviços Node.js
- Containers Docker
- Bancos de dados
- APIs
- Portas
- Processos

#### `hc-tp-capital-complete.sh`
Health check completo do TP Capital.

```bash
bash scripts/maintenance/hc-tp-capital-complete.sh
```

**Verifica:**
- API endpoints
- Banco de dados
- Logs
- Dependências
- Configuração

### Scripts de Fix

#### `fix-docker-issues.sh`
Corrige problemas comuns do Docker.

```bash
bash scripts/maintenance/fix-docker-issues.sh
```

**Corrige:**
- Permissões
- Networks
- Volumes órfãos
- Cache
- Daemon config

### Scripts de Terminal

**Nota:** Scripts com prefixo `terminal-*`

#### `terminal-copy-terminal-output.sh`
Copia comandos e output do terminal para clipboard.

```bash
# Após instalação:
copyout           # Copia comando + saída (50 linhas)
copyout 100       # Copia comando + 100 linhas
copycmd           # Copia apenas comando
copylog           # Copia apenas saída
coprun docker ps  # Executa e copia automaticamente
```

**Instalação:**
```bash
bash scripts/maintenance/terminal-install-all-terminal-extensions.sh
source ~/.bashrc
```

**Atalhos de Teclado (Cursor Terminal):**
- `Ctrl+Shift+Alt+C` → `copyout`
- `Ctrl+Alt+C` → `copycmd`
- `Ctrl+Alt+O` → `copylog`

#### `terminal-install-all-terminal-extensions.sh`
Instala todas as extensões de terminal.

```bash
bash scripts/maintenance/terminal-install-all-terminal-extensions.sh
```

### Scripts de Utils

**Nota:** Scripts com prefixo `util-*`

#### `util-open-services.sh`
Abre serviços no browser.

```bash
bash scripts/maintenance/util-open-services.sh
```

**Abre:**
- Dashboard
- Documentação
- APIs
- Monitoring (Grafana, Prometheus)
- pgAdmin

#### `util-audit-installations.sh`
Audita instalações do sistema.

```bash
bash scripts/maintenance/util-audit-installations.sh
```

**Verifica:**
- Node.js & npm
- Docker & Docker Compose
- Git
- Python & pip
- Build tools

#### `util-verify-timezone.sh`
Verifica configuração de timezone.

```bash
bash scripts/maintenance/util-verify-timezone.sh
```

### Scripts de Validation

**Nota:** Scripts com prefixo `validate-*` ou `verify-*`

#### `validate-validate.sh`
Valida todos os scripts do projeto.

```bash
bash scripts/maintenance/validate-validate.sh
```

**Verifica:**
- Sintaxe de scripts
- Permissões de execução
- Dependências
- Referências

#### `validate-validate_specs.py`
Valida especificações Python.

```bash
python3 scripts/maintenance/validate-validate_specs.py
```

#### `validate-version_specs.py`
Valida especificações de versão.

```bash
python3 scripts/maintenance/validate-version_specs.py
```

#### `verify-container-names.sh`
Verifica naming conventions de containers.

```bash
bash scripts/maintenance/verify-container-names.sh
```

**Verifica:**
- Padrão de nomes
- Conflitos
- Convenções do projeto

---

## 📚 lib/ - Bibliotecas

**Propósito:** Bibliotecas compartilhadas usadas por outros scripts

### Bibliotecas Shell

#### `common.sh`
Funções comuns e utilitárias.

**Funções:**
- `log_info()`, `log_error()`, `log_success()`
- `check_command()`
- `get_project_root()`
- `check_port()`

**Uso:**
```bash
source "$(dirname "$0")/../lib/common.sh"
log_info "Mensagem"
```

#### `docker.sh`
Funções para gerenciar Docker.

**Funções:**
- `docker_is_running()`
- `docker_compose_version()`
- `start_container()`
- `stop_container()`
- `container_exists()`

**Uso:**
```bash
source "$(dirname "$0")/../lib/docker.sh"
if docker_is_running; then
    echo "Docker está rodando"
fi
```

#### `health.sh`
Funções de health check (49KB - biblioteca grande e importante).

**Funções:**
- `check_service_health()`
- `check_port_open()`
- `check_process_running()`
- `wait_for_service()`
- `health_report()`

#### `logging.sh`
Sistema de logging.

**Funções:**
- `log_to_file()`
- `log_with_timestamp()`
- `rotate_logs()`
- `get_log_file()`

#### `pidfile.sh`
Gerenciamento de PID files.

**Funções:**
- `create_pidfile()`
- `read_pidfile()`
- `remove_pidfile()`
- `check_process_from_pidfile()`

**Uso:**
```bash
source "$(dirname "$0")/../lib/pidfile.sh"
create_pidfile $$ "/path/to/pidfile"
```

#### `portcheck.sh`
Verificação de portas.

**Funções:**
- `is_port_in_use()`
- `find_free_port()`
- `wait_for_port()`
- `get_process_on_port()`

#### `terminal.sh`
Funções de terminal.

**Funções:**
- `open_terminal()`
- `run_in_new_terminal()`
- `get_terminal_emulator()`

### Outros

#### `service-manifest.js`
Manifest de serviços em JavaScript.

```javascript
const manifest = require('./lib/service-manifest.js');
console.log(manifest.services);
```

#### `python/__init__.py` & `python/health_logger.py`
Módulos Python para health logging.

```python
from lib.python.health_logger import HealthLogger

logger = HealthLogger('service-name')
logger.log_health_check('passed')
```

---

## ⚡ Referência Rápida de Comandos

### Desenvolvimento Diário

```bash
# Iniciar tudo
bash scripts/core/start-trading-system-dev.sh --start-monitoring

# Verificar status
bash scripts/core/status-tradingsystem.sh

# Parar tudo
bash scripts/core/stop-tradingsystem-full.sh

# Reiniciar apenas dashboard
bash scripts/core/stop-dashboard-stack.sh
bash scripts/core/start-dashboard-stack.sh
```

### Docker

```bash
# Verificar Docker
bash scripts/docker/verify-docker.sh

# Iniciar stacks
bash scripts/docker/start-stacks.sh

# Parar stacks
bash scripts/docker/stop-stacks.sh

# Limpar órfãos
bash scripts/docker/cleanup-orphans.sh

# Manager centralizado
bash scripts/docker/docker-manager.sh start all
bash scripts/docker/docker-manager.sh status monitoring
```

### Database

```bash
# Backup TimescaleDB
bash scripts/database/backup-timescaledb.sh

# Setup TimescaleDB
bash scripts/database/setup-timescaledb-stack.sh start

# Restaurar QuestDB
bash scripts/database/restore-questdb.sh
```

### Documentação

```bash
# Validar integridade
bash scripts/docs/validate-docusaurus-integrity.sh

# Validar build produção
bash scripts/docs/validate-production-build.sh

# Health tests
bash scripts/docs/run-all-health-tests-v2.sh

# Verificar links
python3 scripts/docs/check-links-v2.py
```

### Manutenção

```bash
# Health check completo
bash scripts/maintenance/health-check-all.sh

# Cleanup e restart
bash scripts/maintenance/cleanup-and-restart.sh

# Corrigir Docker
bash scripts/maintenance/fix-docker-issues.sh

# Abrir serviços
bash scripts/maintenance/util-open-services.sh
```

### Setup (Novo Dev)

```bash
# Setup completo Linux
bash scripts/setup/setup-linux-environment.sh

# Quick start
bash scripts/setup/quick-start.sh

# Instalar dependências
bash scripts/setup/install-dependencies.sh

# Configurar Docker sem sudo
bash scripts/setup/configure-sudo-docker.sh
```

---

## 🔍 Troubleshooting

### Script não executa (Linux)

**Problema:** Permissão negada

**Solução:**
```bash
chmod +x scripts/**/*.sh
```

### Porta já em uso

**Windows:**
```powershell
# Encontrar processo
netstat -ano | findstr "PORTA"

# Matar processo
taskkill /PID NUMERO_PID /F
```

**Linux:**
```bash
# Encontrar processo
lsof -i :PORTA

# Matar processo
kill -9 PID
```

### Docker requer sudo (Linux)

**Solução:**
```bash
bash scripts/setup/configure-sudo-docker.sh

# Ou manual:
sudo usermod -aG docker $USER
# Fazer logout e login
```

### node_modules corrompido

**Solução:**
```bash
rm -rf node_modules package-lock.json
bash scripts/setup/install-dependencies.sh
```

### Terminal não abre (Linux)

**Solução:**
```bash
sudo apt install gnome-terminal
```

### BuildKit não conecta

**Solução:**
```bash
# Verificar status
sudo systemctl status buildkit

# Reinstalar
bash scripts/docker/buildkit-install-buildkit.sh

# Corrigir permissões
bash scripts/docker/buildkit-fix-buildkit-permissions.sh
```

### Docker Compose v1 vs v2

**Problema:** Comando `docker-compose` não encontrado

**Solução:** Usar `docker compose` (sem hífen) - v2 está integrado ao Docker

### Serviço não inicia

**Diagnóstico:**
```bash
# Health check específico
bash scripts/maintenance/hc-tp-capital-complete.sh

# Diagnóstico geral
bash scripts/core/diagnose-services.sh

# Verificar logs
tail -f scripts/.runtime/dashboard-stack/logs/[service].log
```

### Containers órfãos

**Solução:**
```bash
bash scripts/docker/cleanup-orphans.sh
```

### Problemas de timezone

**Solução:**
```bash
bash scripts/maintenance/util-verify-timezone.sh
```

---

## 📝 Convenções e Padrões

### Nomenclatura de Scripts

**Prefixos por função:**
- `start-*` - Scripts de inicialização
- `stop-*` - Scripts de parada
- `restart-*` - Scripts de reinício
- `status-*` - Scripts de status
- `setup-*` - Scripts de setup
- `install-*` - Scripts de instalação
- `configure-*` - Scripts de configuração
- `validate-*` - Scripts de validação
- `verify-*` - Scripts de verificação
- `check-*` - Scripts de checagem
- `fix-*` - Scripts de correção
- `cleanup-*` - Scripts de limpeza
- `backup-*` - Scripts de backup
- `restore-*` - Scripts de restore

**Prefixos por tecnologia/serviço:**
- `buildkit-*` - Scripts BuildKit
- `firecrawl-*` - Scripts Firecrawl
- `langgraph-*` - Scripts LangGraph
- `terminal-*` - Scripts de terminal
- `util-*` - Scripts utilitários
- `hc-*` - Health checks

### Estrutura de Script

```bash
#!/bin/bash
# ==============================================================================
# Nome do Script
# ==============================================================================
# Descrição breve do script
#
# Usage:
#   bash scripts/pasta/script.sh [options]
#
# Options:
#   --option1    Descrição da opção 1
#   --option2    Descrição da opção 2
#
# Author: TradingSystem Team
# Date: YYYY-MM-DD
# ==============================================================================

set -euo pipefail

# Variáveis
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Carregar bibliotecas
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/logging.sh"

# Funções
function main() {
    # Lógica principal
}

# Executar
main "$@"
```

### Logs

**Localização:**
- Scripts runtime: `scripts/.runtime/*/logs/`
- Serviços: cada serviço tem seu próprio diretório de logs

**Formato:**
```
YYYY-MM-DD HH:MM:SS [LEVEL] Message
```

**Níveis:**
- INFO - Informação geral
- WARN - Avisos
- ERROR - Erros
- DEBUG - Debug detalhado

---

## 🚀 Uso por Plataforma

### Linux

**Setup Inicial:**
```bash
cd ~/projetos/TradingSystem

# Setup completo
bash scripts/setup/setup-linux-environment.sh

# Iniciar
bash scripts/core/start-trading-system-dev.sh --start-monitoring
```

**Parar:**
```bash
# Parar tudo
bash scripts/core/stop-tradingsystem-full.sh

# Ou específico
cd tools/monitoring && docker compose down
pkill node
```

**Verificar Portas:**
```bash
lsof -i :3200  # Workspace
lsof -i :3103  # Dashboard
lsof -i :3205  # Docs
lsof -i :3500  # Launcher
```

### Windows

**Setup Inicial:**
```powershell
cd C:\projetos\TradingSystem

# Copiar e configurar .env
cd infrastructure\tp-capital
cp tp-capital-signals.env.example tp-capital-signals.env
notepad tp-capital-signals.env

cd ..\..\..

# Iniciar
.\scripts\core\start-trading-system-dev.ps1 -StartMonitoring
```

**Parar:**
```powershell
# Parar Docker
cd infrastructure\monitoring
docker compose down

# Parar Node
Stop-Process -Name node -Force
```

**Verificar Portas:**
```powershell
netstat -ano | findstr "3200"  # Workspace
netstat -ano | findstr "3103"  # Dashboard
netstat -ano | findstr "3205"  # Docs
netstat -ano | findstr "3500"  # Launcher
```

---

## 📊 Estatísticas

### Distribuição de Scripts

| Pasta | Scripts | Tamanho | Propósito |
|-------|---------|---------|-----------|
| core/ | 16 | 144KB | Startup, stop, status, control |
| maintenance/ | 19 | 176KB | Cleanup, health, terminal, utils, validation |
| docker/ | 13 | 84KB | Docker + BuildKit |
| docs/ | 12 | 252KB | Documentação e validação |
| database/ | 8 | 52KB | DB + Firecrawl + LangGraph |
| setup/ | 7 | 44KB | Instalação e configuração |
| lib/ | 7 | 116KB | Bibliotecas compartilhadas |
| **Total** | **82** | **868KB** | |

### Por Linguagem

- **Shell Scripts (.sh):** ~60 scripts
- **PowerShell (.ps1):** ~3 scripts
- **Python (.py):** ~10 scripts
- **JavaScript (.js):** ~3 scripts
- **SQL (.sql):** ~1 script

### Por Categoria Funcional

- **Startup/Stop:** ~10 scripts
- **Docker:** ~15 scripts
- **Database:** ~10 scripts
- **Health/Status:** ~8 scripts
- **Validation:** ~8 scripts
- **Setup/Config:** ~7 scripts
- **Maintenance:** ~10 scripts
- **Libraries:** ~7 scripts
- **Utils:** ~7 scripts

---

## 🤝 Contribuindo

### Ao adicionar novos scripts:

1. **Escolha a pasta apropriada** (core, docker, database, docs, setup, maintenance, lib)
2. **Use nomenclatura descritiva** com prefixos apropriados
3. **Adicione permissões de execução:** `chmod +x script.sh`
4. **Documente no cabeçalho** (propósito, uso, opções, autor, data)
5. **Use bibliotecas compartilhadas** (`lib/common.sh`, `lib/docker.sh`, etc)
6. **Siga convenções** de estrutura e nomenclatura
7. **Teste em ambas plataformas** (Linux e Windows se aplicável)
8. **Atualize este README** na seção apropriada

### Template para novos scripts:

```bash
#!/bin/bash
# ==============================================================================
# Título do Script
# ==============================================================================
# Descrição detalhada do que o script faz
#
# Usage:
#   bash scripts/pasta/script.sh [OPTIONS]
#
# Options:
#   --option1    Descrição
#   --help       Mostra ajuda
#
# Examples:
#   bash scripts/pasta/script.sh --option1
#
# Author: Seu Nome
# Date: YYYY-MM-DD
# ==============================================================================

set -euo pipefail

# Diretórios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Carregar bibliotecas
source "$SCRIPT_DIR/../lib/common.sh"

# Funções
show_help() {
    head -n 20 "$0" | grep "^#" | sed 's/^# \?//'
}

main() {
    # Lógica principal aqui
    log_info "Executando..."
}

# Parse argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --help) show_help; exit 0 ;;
        *) echo "Opção desconhecida: $1"; exit 1 ;;
    esac
done

# Executar
main "$@"
```

---

## 📖 Recursos Adicionais

### Documentação Externa

- **Docker:** https://docs.docker.com/
- **BuildKit:** https://github.com/moby/buildkit
- **TimescaleDB:** https://docs.timescale.com/
- **QuestDB:** https://questdb.io/docs/
- **Docusaurus:** https://docusaurus.io/
- **Node.js:** https://nodejs.org/docs/

### Documentação Interna

- **Guia de Migração Linux:** `docs/context/ops/linux-migration-guide.md`
- **Container Naming:** `docs/context/ops/tools/container-naming.md`
- **BuildKit Guide:** `docs/context/backend/guides/buildkit-guide.md`
- **Services Manifest:** `config/services-manifest.json`

---

## 📅 Changelog

### 2025-10-23
- **Reorganização completa:** De 18 para 7 pastas (-61%)
- **Consolidação:** Múltiplas pastas pequenas unificadas
- **Nomenclatura:** Prefixos descritivos adicionados (buildkit-, firecrawl-, langgraph-, terminal-, util-)
- **Documentação:** README único e completo criado
- **Limpeza:** Scripts duplicados e obsoletos removidos

### Estrutura Anterior → Atual
- `startup/` + `shutdown/` + `services/` → `core/`
- `docker/` + `buildkit/` → `docker/`
- `database/` + `firecrawl/` + `langgraph/` → `database/`
- `maintenance/` + `terminal/` + `utils/` + `validation/` + `healthcheck/` → `maintenance/`

---

## ✅ Validação

Para validar scripts após modificações:

```bash
# Validar sintaxe
bash scripts/maintenance/validate-validate.sh

# Verificar permissões
find scripts/ -name "*.sh" ! -executable

# Testar scripts principais
bash scripts/core/status-tradingsystem.sh
bash scripts/docker/verify-docker.sh
bash scripts/setup/install-dependencies.sh --check
```

---

## 📞 Suporte

**Problemas ou dúvidas?**

1. Verificar [Troubleshooting](#-troubleshooting)
2. Executar diagnósticos: `bash scripts/core/diagnose-services.sh`
3. Verificar logs em `scripts/.runtime/*/logs/`
4. Consultar documentação específica em `docs/`

---

**Última Atualização:** 23 de Outubro de 2025  
**Versão:** 2.0.0 (Pós-Reorganização)  
**Total de Scripts:** 82 scripts em 7 pastas organizadas
