# TradingSystem Shell Scripts

Automated scripts for managing TradingSystem services, Docker containers, and infrastructure.

## 📋 Índice

- [Quick Start](#-quick-start)
- [Directory Structure](#-directory-structure)
- [Scripts por Categoria](#-scripts-por-categoria)
  - [Startup & Development](#-startup--development)
  - [Database](#-database)
  - [Docker & Services](#-docker--services)
  - [Setup & Configuration](#-setup--configuration)
  - [Maintenance](#-maintenance)
  - [Utilities](#-utilities)
- [Uso por Plataforma](#-uso-por-plataforma)
- [Troubleshooting](#-troubleshooting)
- [Validation](#-validation)

---

## 🚀 Quick Start

### Iniciar Ambiente Completo de Desenvolvimento

**Windows:**
```powershell
.\scripts\startup\start-trading-system-dev.ps1 -StartMonitoring
```

**Linux:**
```bash
bash scripts/startup/start-trading-system-dev.sh --start-monitoring
```

**Serviços iniciados:**
- Laucher (3500)
- Workspace (3100)
- TP-Capital (3200)
- B3 (3302)
- DocsAPI (3400)
- Dashboard Frontend (3103)
- Documentação (3004)
- Prometheus (9090)
- Grafana (3000)
- Alertmanager (9093)

```bash
# Alternative: Start dashboard stack only (no monitoring)
bash scripts/startup/start-dashboard-stack.sh
```

### Verificar Status

```bash
bash scripts/services/status.sh
```

### Parar Todos os Serviços

```bash
bash scripts/services/stop-all.sh
```

---

## 📁 Directory Structure

```
scripts/
├── startup/              # 🚀 Scripts de inicialização de serviços
│   ├── start-trading-system-dev.ps1/.sh
│   ├── start-service-launcher.ps1/.sh
│   ├── start-dashboard-stack.sh
│   ├── restart-dashboard-stack.sh
│   ├── launch-service.ps1/.sh
│   ├── register-trading-system-dev-startup.ps1
│   └── welcome-message.sh
│
├── shutdown/             # ⏹️ Scripts de parada de serviços
│   ├── stop-dashboard-stack.sh
│   ├── stop-tradingsystem-full.sh
│   └── README.md
│
├── database/             # 💾 Scripts de banco de dados
│   ├── backup-timescaledb.sh
│   ├── restore-questdb.sh
│   ├── setup-timescaledb-stack.sh
│   └── questdb-restore-tables.sql
│
├── docker/               # 🐳 Orquestração Docker
│   ├── start-stacks.sh
│   ├── stop-stacks.sh
│   ├── check-docs-services.sh
│   ├── verify-docker.sh
│   └── ...
│
├── services/             # 🔧 Gerenciamento de serviços
│   ├── start-all.sh
│   ├── stop-all.sh
│   ├── status.sh
│   └── diagnose-services.sh
│
├── setup/                # ⚙️ Instalação e configuração
│   ├── setup-linux-environment.sh
│   ├── configure-sudo-docker.sh
│   ├── install-dependencies.sh
│   ├── install-cursor-extensions.sh
│   └── quick-start.sh
│
├── maintenance/          # 🔨 Manutenção do sistema
│   ├── fix-docker-issues.sh
│   ├── health-checks.sh
│   ├── uninstall-docker-wsl.sh
│   └── rewrite-history.sh
│
├── healthcheck/          # 🩺 Diagnósticos e verificações de runtime
│   ├── hc-tradingsystem-status.sh
│   ├── hc-tp-capital-complete.sh
│   ├── hc-tp-capital-quick.sh
│   └── README.md
│
├── backup/               # 💼 Backup utilities
├── dev/                  # 🛠️ Development scripts
├── env/                  # 🌍 Environment management
├── lib/                  # 📚 Shared libraries
│   ├── common.sh
│   ├── portcheck.sh
│   ├── health.sh
│   ├── logging.sh
│   ├── docker.sh
│   ├── terminal.sh
│   └── pidfile.sh
│
├── utils/                # 🔧 Miscellaneous tools
├── refactor/             # 🔄 Refactoring tools
│
├── README.md             # 📖 This file
├── QUICK-REFERENCE.md    # ⚡ Quick commands reference
└── validate.sh           # ✅ Validation script
```

---

## 📚 Scripts por Categoria

### 🚀 Startup & Development

#### `start-trading-system-dev` (.ps1 / .sh)

Inicia todos os serviços de desenvolvimento do TradingSystem.

**Localização:** `scripts/startup/`

**Opções Windows:**
```powershell
.\scripts\startup\start-trading-system-dev.ps1 [opções]

# Opções disponíveis:
-SkipFrontend          # Não inicia Dashboard
-SkipIdeaBank          # Não inicia Idea Bank API
-SkipDocs              # Não inicia Documentação
-StartMonitoring       # Inicia Prometheus/Grafana
-StartDocsDocker       # Inicia docs via Docker
-SkipServiceLauncher   # Não inicia Laucher
```

**Opções Linux:**
```bash
bash scripts/startup/start-trading-system-dev.sh [opções]

# Opções disponíveis:
--skip-frontend          # Não inicia Dashboard
--skip-idea-bank         # Não inicia Idea Bank API
--skip-docs              # Não inicia Documentação
--start-monitoring       # Inicia Prometheus/Grafana
--start-docs-docker      # Inicia docs via Docker
--skip-service-launcher  # Não inicia Laucher
```

---

#### `start-service-launcher` (.ps1 / .sh)

Inicia o Laucher API que permite controlar serviços via HTTP.

**Localização:** `scripts/startup/`

**Windows:**
```powershell
.\scripts\startup\start-service-launcher.ps1 [-ForceRestart]
```

**Linux:**
```bash
bash scripts/startup/start-service-launcher.sh [--force-restart]
```

**Verificar se está rodando:**
```bash
curl http://localhost:3500/health
```

---

#### `launch-service` (.ps1 / .sh)

Script genérico para lançar qualquer serviço em uma nova aba/janela de terminal.

**Localização:** `scripts/startup/`

**Windows:**
```powershell
.\scripts\startup\launch-service.ps1 `
  -ServiceName "My Service" `
  -WorkingDir "C:\path\to\service" `
  -Command "npm run dev"
```

**Linux:**
```bash
bash scripts/startup/launch-service.sh \
  --name "My Service" \
  --dir "/path/to/service" \
  --command "npm run dev"
```

---

#### `register-trading-system-dev-startup` (.ps1)

Registra uma tarefa agendada do Windows para iniciar serviços automaticamente no logon.

**Localização:** `scripts/startup/`

**Windows apenas:**
```powershell
# Registrar
.\scripts\startup\register-trading-system-dev-startup.ps1

# Remover
.\scripts\startup\register-trading-system-dev-startup.ps1 -Remove
```

**Linux equivalente:** Use systemd user services ou adicione ao `~/.bashrc`

---

### 💾 Database

#### `backup-timescaledb.sh`

Executa backup manual do TimescaleDB.

**Localização:** `scripts/database/`

```bash
bash scripts/database/backup-timescaledb.sh
```

---

#### `restore-questdb.sh`

Restaura dados do QuestDB a partir de backup.

**Localização:** `scripts/database/`

```bash
bash scripts/database/restore-questdb.sh
```

---

#### `setup-timescaledb-stack.sh`

Provisiona ou paralisa o stack TimescaleDB.

**Localização:** `scripts/database/`

```bash
bash scripts/database/setup-timescaledb-stack.sh [start|stop]
```

---

#### `questdb-restore-tables.sql`

Script SQL para restaurar tabelas do QuestDB.

**Localização:** `scripts/database/`

```bash
# Executar via QuestDB CLI
questdb < scripts/database/questdb-restore-tables.sql
```

---

### 🐳 Docker & Services

#### `start-all.sh`

Inicia todos os serviços do TradingSystem.

**Localização:** `scripts/services/`

```bash
bash scripts/services/start-all.sh
```

---

#### `stop-all.sh`

Para todos os serviços do TradingSystem.

**Localização:** `scripts/services/`

```bash
bash scripts/services/stop-all.sh
```

---

#### `status.sh`

Verifica status de todos os serviços.

**Localização:** `scripts/services/`

```bash
bash scripts/services/status.sh
```

---

#### `diagnose-services.sh`

Diagnóstico detalhado de serviços.

**Localização:** `scripts/services/`

```bash
bash scripts/services/diagnose-services.sh
```

---

#### `start-dashboard-stack.sh`

Starts the complete dashboard stack including Docker containers and Node.js services.

**Localização:** `scripts/startup/`

```bash
bash scripts/startup/start-dashboard-stack.sh
```

**Services Started:**
- **Docker Containers:** TimescaleDB, QuestDB, LangGraph Postgres, pgAdmin, pgWeb, Firecrawl stack (API, Redis, Postgres, Playwright, Proxy), Documentation API
- **Node.js Services:** Workspace API (3200), TP Capital (4005), B3 Market Data (3302), WebScraper API (3700), Firecrawl Proxy (3600), Service Launcher (3500), Dashboard App (3103), WebScraper App (3800)

**Features:**
- Automatic dependency installation (`npm install` if `node_modules` missing)
- Environment variable loading from multiple sources (`.env.defaults`, `.env`, `.env.local`)
- PID file management for graceful shutdown
- Comprehensive logging to `scripts/.runtime/dashboard-stack/logs/`

---

#### `stop-dashboard-stack.sh`

Stops all dashboard stack services (Docker containers and Node.js processes).

**Localização:** `scripts/shutdown/`

```bash
bash scripts/shutdown/stop-dashboard-stack.sh
```

**Stopping Strategy:**
1. Kill Node.js processes using PID file
2. Force kill any remaining processes by pattern matching
3. Stop Docker containers (Firecrawl, TimescaleDB, Documentation API)
4. Preserve logs in `scripts/.runtime/dashboard-stack/logs/`

---

#### `restart-dashboard-stack.sh`

Restarts the dashboard stack by sequentially calling stop and start scripts.

**Localização:** `scripts/startup/`

```bash
bash scripts/startup/restart-dashboard-stack.sh

# Or use symlink from project root (backward compatibility)
./reiniciar
```

**Behavior:**
- Calls `scripts/shutdown/stop-dashboard-stack.sh`
- Waits for graceful shutdown
- Calls `scripts/startup/start-dashboard-stack.sh`
- Useful for applying configuration changes or recovering from errors

---

#### `start-stacks.sh`

Inicia todos os stacks Docker (infra, monitoring, etc).

**Localização:** `scripts/docker/`

```bash
bash scripts/docker/start-stacks.sh
```

---

#### `stop-stacks.sh`

Para todos os stacks Docker.

**Localização:** `scripts/docker/`

```bash
bash scripts/docker/stop-stacks.sh
```

---

#### `build-images.sh`

Compila e retaggeia todas as imagens `img-*`, aplicando `IMG_VERSION` e garantindo builds para `linux/amd64`. Execute antes de promover versões ou subir novos serviços Node/Python/Firecrawl.

**Localização:** `scripts/docker/`

```bash
IMG_VERSION=2025.10.19 bash scripts/docker/build-images.sh
```

---

#### `verify-docker.sh`

Verifica instalação e configuração do Docker.

**Localização:** `scripts/docker/`

```bash
bash scripts/docker/verify-docker.sh
```

---

### ⚙️ Setup & Configuration
---

#### `tag-image.sh`

Retaggeia rapidamente uma imagem base para o formato padronizado `img-*:${IMG_VERSION}`. Útil para novos serviços ou ajustes pontuais.

**Localização:** `scripts/services/`

```bash
bash scripts/services/tag-image.sh data-timescaledb timescale/timescaledb:2.15.2-pg15
```

---

#### `pull-images.sh`

Baixa todas as tags `img-*` usando o `IMG_VERSION` atual, garantindo que o ambiente esteja alinhado com a release.

**Localização:** `scripts/services/`

```bash
bash scripts/services/pull-images.sh
```

---

#### `prune-old-images.sh`

Remove tags antigas `img-*`, preservando apenas as mais recentes (valor padrão: 3). Define `KEEP_VERSIONS` para ajustar o comportamento.

**Localização:** `scripts/docker/`

```bash
KEEP_VERSIONS=2 bash scripts/docker/prune-old-images.sh
```

---



#### `setup-linux-environment.sh`

Script de configuração inicial para ambiente Linux. Verifica dependências, cria diretórios, configura permissões.

**Localização:** `scripts/setup/`

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

---

#### `configure-sudo-docker.sh`

Configura Docker para rodar sem sudo.

**Localização:** `scripts/setup/`

```bash
bash scripts/setup/configure-sudo-docker.sh
```

---

#### `install-dependencies.sh`

Instala todas as dependências npm do projeto.

**Localização:** `scripts/setup/`

```bash
bash scripts/setup/install-dependencies.sh
```

---

#### `install-cursor-extensions.sh`

Instala extensões recomendadas do Cursor/VSCode.

**Localização:** `scripts/setup/`

```bash
bash scripts/setup/install-cursor-extensions.sh
```

---

#### `quick-start.sh`

Setup rápido para novos desenvolvedores.

**Localização:** `scripts/setup/`

```bash
bash scripts/setup/quick-start.sh
```

---

### 🔨 Maintenance

#### `fix-docker-issues.sh`

Corrige problemas comuns do Docker.

**Localização:** `scripts/maintenance/`

```bash
bash scripts/maintenance/fix-docker-issues.sh
```

---

#### `health-checks.sh`

Executa health checks em todos os serviços.

**Localização:** `scripts/maintenance/`

```bash
bash scripts/maintenance/health-checks.sh
```

---

#### `uninstall-docker-wsl.sh`

Desinstala Docker do WSL.

**Localização:** `scripts/maintenance/`

```bash
bash scripts/maintenance/uninstall-docker-wsl.sh
```

---

#### `rewrite-history.sh`

Ferramentas para reescrever histórico Git (use com cuidado!).

**Localização:** `scripts/maintenance/`

```bash
bash scripts/maintenance/rewrite-history.sh
```

---

### 🩺 Healthcheck

#### `hc-tradingsystem-status.sh`

Relatório completo da saúde do TradingSystem (serviços, Docker, recursos, JSON opcional).

```bash
bash scripts/healthcheck/hc-tradingsystem-status.sh --quick
```

#### `hc-tp-capital-quick.sh` & `hc-tp-capital-complete.sh`

Diagnósticos rápidos e completos do serviço TP Capital (portas, logs, dependências).

```bash
bash scripts/healthcheck/hc-tp-capital-quick.sh
bash scripts/healthcheck/hc-tp-capital-complete.sh
```

---

### 🔧 Utilities

#### `copy-terminal-output.sh`

**🆕 NOVO:** Copia rapidamente comandos e suas saídas do terminal para o clipboard.

**Localização:** `scripts/`

**Quick Start:**
```bash
# Instalação única
bash scripts/install-terminal-copy-shortcuts.sh
source ~/.bashrc  # ou ~/.zshrc

# Uso diário
ls -la
copyout            # Copia 'ls -la' + saída (50 linhas)
copyout 100        # Copia comando + 100 linhas
copycmd            # Copia apenas o comando
copylog            # Copia apenas a saída
coprun docker ps   # Executa e copia automaticamente
```

**Atalhos de Teclado (Cursor Terminal):**
- `Ctrl+Shift+Alt+C` → Executar `copyout`
- `Ctrl+Alt+C` → Executar `copycmd`
- `Ctrl+Alt+O` → Executar `copylog`

**Documentação Completa:**
- [COPY-TERMINAL-GUIDE.md](./COPY-TERMINAL-GUIDE.md) - Guia completo
- [QUICK-REFERENCE-COPY.md](./QUICK-REFERENCE-COPY.md) - Referência rápida

---

#### `validate.sh`

Valida todos os scripts do projeto.

**Localização:** `scripts/`

```bash
bash scripts/validate.sh
```

---

## 💻 Uso por Plataforma

### Windows (PowerShell)

**Setup Inicial:**
```powershell
cd C:\path\to\TradingSystem

# Copiar e configurar arquivos de ambiente
cd infrastructure\tp-capital
cp tp-capital-signals.env.example tp-capital-signals.env
notepad tp-capital-signals.env

cd ..\..\..

# Iniciar ambiente de desenvolvimento completo
.\scripts\startup\start-trading-system-dev.ps1 -StartMonitoring
```

**Parar Serviços:**
```powershell
# Parar Docker
cd infrastructure\monitoring
docker compose down

# Parar Node
Stop-Process -Name node -Force
```

**Verificar Portas:**
```powershell
netstat -ano | findstr "3100"  # Idea Bank
netstat -ano | findstr "3103"  # Dashboard
netstat -ano | findstr "3004"  # Docs
netstat -ano | findstr "3500"  # Laucher
```

---

### Linux (Bash)

**Setup Inicial:**
```bash
cd ~/projetos/TradingSystem

# Executar script de setup
bash scripts/setup/setup-linux-environment.sh

# Seguir instruções do script para configurar .env files

# Iniciar ambiente de desenvolvimento completo
bash scripts/startup/start-trading-system-dev.sh --start-monitoring
```

**Parar Serviços:**
```bash
# Parar containers Docker
cd infrastructure/monitoring
docker compose down

# Parar processos específicos
pkill -f "node.*idea-bank"
pkill -f "node.*service-launcher"
pkill -f "node.*dashboard"

# Ou parar todos os processos Node
pkill node
```

**Verificar Portas:**
```bash
lsof -i :3100  # Idea Bank
lsof -i :3103  # Dashboard
lsof -i :3004  # Docs
lsof -i :3500  # Laucher
```

---

## 🔍 Troubleshooting

### Script não executa (Linux)

```bash
# Adicionar permissão de execução
chmod +x scripts/**/*.sh
```

---

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

---

### Docker requer sudo (Linux)

```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
# Fazer logout e login novamente

# Ou usar script de configuração
bash scripts/setup/configure-sudo-docker.sh
```

---

### node_modules corrompido

```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Terminal não abre (Linux)

```bash
sudo apt install gnome-terminal
```

---

## ✅ Validation

Valide todos os scripts antes de commitar:

```bash
bash scripts/validate.sh
```

---

## 📖 Documentação Relacionada

- **Quick Reference:** [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
- **Linux Migration Guide:** [docs/context/ops/linux-migration-guide.md](../docs/context/ops/linux-migration-guide.md)
- **Scripts Documentation:** [docs/context/ops/scripts/README.md](../docs/context/ops/scripts/README.md)
- **Infrastructure Documentation:** [infrastructure/README.md](../infrastructure/README.md)

---

## 🤝 Contribuindo

Ao adicionar novos scripts:

1. **Escolha a categoria apropriada** (startup, database, docker, services, setup, maintenance, utils)
2. **Criar versão PowerShell (.ps1) para Windows** (se aplicável)
3. **Criar versão Bash (.sh) para Linux**
4. **Adicionar permissões de execução no Linux:** `chmod +x script.sh`
5. **Documentar neste README** (na seção apropriada)
6. **Adicionar exemplos de uso**
7. **Testar em ambas as plataformas** (Windows e Linux)
8. **Executar validação:** `bash scripts/validate.sh`

---

## 📝 Logs

### Laucher

```bash
tail -f frontend/apps/service-launcher/logs/app.log
```

### Idea Bank API

```bash
tail -f backend/api/idea-bank/logs/app.log
```

### Containers Docker

```bash
# Logs de todos os containers
docker compose logs -f

# Logs de um container específico
docker logs -f <container-name>
```

---

**Última Atualização:** 15 de Outubro de 2025  
**Estrutura Reorganizada:** Scripts consolidados de `infrastructure/scripts` para `scripts/`
