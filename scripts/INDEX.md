# Scripts Index - TradingSystem

Índice completo de todos os scripts disponíveis no projeto, organizados por categoria.

> 📖 **Documentação Completa:** [README.md](./README.md)  
> ⚡ **Referência Rápida:** [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)

---

## 📂 Estrutura de Diretórios

```
scripts/
├── startup/              # 🚀 Inicialização de serviços (8 scripts)
├── database/             # 💾 Gerenciamento de banco de dados (4 scripts)
├── docker/               # 🐳 Orquestração Docker (7 scripts)
├── services/             # 🔧 Gerenciamento de serviços (4 scripts)
├── setup/                # ⚙️ Instalação e configuração (5 scripts)
├── maintenance/          # 🔨 Manutenção do sistema (4 scripts)
├── env/                  # 🌍 Gerenciamento de ambiente (3 scripts)
├── lib/                  # 📚 Bibliotecas compartilhadas (7 scripts)
├── utils/                # 🔧 Utilitários diversos (3 scripts)
└── refactor/             # 🔄 Ferramentas de refatoração (1 script)
```

**Total: 46 scripts**

---

## 🚀 Startup Scripts (8 scripts)

Scripts para inicialização de serviços de desenvolvimento.

| Script | Plataforma | Descrição |
|--------|------------|-----------|
| `start-trading-system-dev.ps1` | Windows | Inicia ambiente completo de desenvolvimento |
| `start-trading-system-dev.sh` | Linux | Inicia ambiente completo de desenvolvimento |
| `start-service-launcher.ps1` | Windows | Inicia Laucher API |
| `start-service-launcher.sh` | Linux | Inicia Laucher API |
| `launch-service.ps1` | Windows | Lançador genérico de serviços |
| `launch-service.sh` | Linux | Lançador genérico de serviços |
| `register-trading-system-dev-startup.ps1` | Windows | Registra tarefa agendada de startup |
| `welcome-message.sh` | Linux | Mensagem de boas-vindas |

**Uso mais comum:**
```bash
# Linux
bash scripts/startup/start-trading-system-dev.sh --start-monitoring

# Windows
.\scripts\startup\start-trading-system-dev.ps1 -StartMonitoring
```

---

## 💾 Database Scripts (4 scripts)

Scripts para gerenciamento de bancos de dados (QuestDB, TimescaleDB).

| Script | Descrição |
|--------|-----------|
| `backup-timescaledb.sh` | Executa backup manual do TimescaleDB |
| `restore-questdb.sh` | Restaura dados do QuestDB |
| `setup-timescaledb-stack.sh` | Provisiona/paralisa stack TimescaleDB |
| `questdb-restore-tables.sql` | Script SQL para restaurar tabelas |

**Uso mais comum:**
```bash
# Backup TimescaleDB
bash scripts/database/backup-timescaledb.sh

# Setup TimescaleDB
bash scripts/database/setup-timescaledb-stack.sh start
```

---

## 🐳 Docker Scripts (7 scripts)

Scripts para gerenciamento de containers e stacks Docker.

| Script | Descrição |
|--------|-----------|
| `start-stacks.sh` | Inicia todos os stacks Docker |
| `stop-stacks.sh` | Para todos os stacks Docker |
| `verify-docker.sh` | Verifica instalação e configuração Docker |
| `check-docs-services.sh` | Verifica serviços de documentação |
| `test-docs-api.sh` | Testa DocsAPI |
| `migrate-docs-to-docker.sh` | Migra docs para Docker |
| `migrate-docs-to-docker-v1.sh` | Migra docs (versão 1) |

**Uso mais comum:**
```bash
# Verificar Docker
bash scripts/docker/verify-docker.sh

# Iniciar stacks
bash scripts/docker/start-stacks.sh

# Parar stacks
bash scripts/docker/stop-stacks.sh
```

---

## 🔧 Services Scripts (4 scripts)

Scripts para gerenciamento de serviços do TradingSystem.

| Script | Descrição |
|--------|-----------|
| `start-all.sh` | Inicia todos os serviços |
| `stop-all.sh` | Para todos os serviços |
| `status.sh` | Verifica status de todos os serviços |
| `diagnose-services.sh` | Diagnóstico detalhado de serviços |

**Uso mais comum:**
```bash
# Iniciar todos
bash scripts/services/start-all.sh

# Ver status
bash scripts/services/status.sh

# Parar todos
bash scripts/services/stop-all.sh
```

---

## ⚙️ Setup Scripts (5 scripts)

Scripts para instalação e configuração inicial.

| Script | Descrição |
|--------|-----------|
| `setup-linux-environment.sh` | Configuração completa do ambiente Linux |
| `configure-sudo-docker.sh` | Configura Docker sem sudo |
| `install-dependencies.sh` | Instala dependências npm |
| `install-cursor-extensions.sh` | Instala extensões do Cursor/VSCode |
| `quick-start.sh` | Setup rápido para novos devs |

**Uso mais comum:**
```bash
# Setup completo Linux
bash scripts/setup/setup-linux-environment.sh

# Quick start
bash scripts/setup/quick-start.sh
```

---

## 🔨 Maintenance Scripts (4 scripts)

Scripts para manutenção e troubleshooting.

| Script | Descrição |
|--------|-----------|
| `fix-docker-issues.sh` | Corrige problemas comuns do Docker |
| `health-checks.sh` | Health checks em todos os serviços |
| `uninstall-docker-wsl.sh` | Desinstala Docker do WSL |
| `rewrite-history.sh` | Reescreve histórico Git (cuidado!) |

**Uso mais comum:**
```bash
# Health checks
bash scripts/maintenance/health-checks.sh

# Corrigir Docker
bash scripts/maintenance/fix-docker-issues.sh
```

---

## 🌍 Environment Scripts (3 scripts)

Scripts para gerenciamento de variáveis de ambiente.

| Script | Descrição |
|--------|-----------|
| `migrate-env.sh` | Migra arquivos de ambiente |
| `setup-env.sh` | Configura arquivos .env |
| `validate-env.sh` | Valida configuração de ambiente |

**Uso mais comum:**
```bash
# Validar .env
bash scripts/env/validate-env.sh

# Setup inicial
bash scripts/env/setup-env.sh
```

---

## 📚 Library Scripts (7 scripts)

Bibliotecas compartilhadas usadas por outros scripts.

| Script | Descrição |
|--------|-----------|
| `common.sh` | Funções comuns e utilitárias |
| `docker.sh` | Funções para gerenciar Docker |
| `health.sh` | Funções de health check |
| `logging.sh` | Sistema de logging |
| `pidfile.sh` | Gerenciamento de PID files |
| `portcheck.sh` | Verificação de portas |
| `terminal.sh` | Funções de terminal |

**Uso:**
```bash
# Exemplo de uso em outro script
source "$(dirname "$0")/../lib/common.sh"
source "$(dirname "$0")/../lib/portcheck.sh"
```

---

## 🔧 Utility Scripts (3 scripts)

Utilitários diversos.

| Script | Descrição |
|--------|-----------|
| `audit-installations.sh` | Audita instalações do sistema |
| `open-services.sh` | Abre serviços no browser |
| `verify-timezone.sh` | Verifica configuração de timezone |

**Uso mais comum:**
```bash
# Abrir serviços no browser
bash scripts/utils/open-services.sh

# Verificar timezone
bash scripts/utils/verify-timezone.sh
```

---

## 🔄 Refactor Scripts (1 script)

Scripts de refatoração e migração.

| Script | Descrição |
|--------|-----------|
| `rename-docs-services.sh` | Renomeia serviços de documentação |

---

## 📝 Root Scripts (2 scripts)

Scripts na raiz da pasta scripts/.

| Script | Descrição |
|--------|-----------|
| `validate.sh` | Valida todos os scripts do projeto |
| `migrate-to-new-structure.sh` | Migra para nova estrutura de scripts |

**Uso mais comum:**
```bash
# Validar tudo
bash scripts/validate.sh
```

---

## 🎯 Scripts por Caso de Uso

### Novo Desenvolvedor

```bash
# 1. Setup inicial
bash scripts/setup/setup-linux-environment.sh

# 2. Instalar dependências
bash scripts/setup/install-dependencies.sh

# 3. Iniciar ambiente
bash scripts/startup/start-trading-system-dev.sh --start-monitoring
```

### Desenvolvimento Full Stack

```bash
# Iniciar tudo
bash scripts/startup/start-trading-system-dev.sh --start-monitoring

# Verificar status
bash scripts/services/status.sh
```

### Desenvolvimento Backend Apenas

```bash
# Iniciar sem frontend
bash scripts/startup/start-trading-system-dev.sh --skip-frontend --skip-docs
```

### Manutenção e Troubleshooting

```bash
# Health checks
bash scripts/maintenance/health-checks.sh

# Verificar Docker
bash scripts/docker/verify-docker.sh

# Corrigir problemas
bash scripts/maintenance/fix-docker-issues.sh
```

### Gerenciamento de Dados

```bash
# Backup TimescaleDB
bash scripts/database/backup-timescaledb.sh

# Restaurar QuestDB
bash scripts/database/restore-questdb.sh
```

---

## 🔍 Encontrando Scripts

### Por Nome
```bash
find scripts/ -name "*docker*"
find scripts/ -name "*start*"
```

### Por Categoria
```bash
ls scripts/startup/
ls scripts/database/
ls scripts/docker/
```

### Por Tipo
```bash
# Scripts Linux
find scripts/ -name "*.sh"

# Scripts Windows
find scripts/ -name "*.ps1"

# Scripts SQL
find scripts/ -name "*.sql"
```

---

## 📖 Documentação Adicional

- **README Principal:** [README.md](./README.md)
- **Referência Rápida:** [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
- **Guia de Migração Linux:** [../docs/context/ops/linux-migration-guide.md](../docs/context/ops/linux-migration-guide.md)
- **Scripts Documentation:** [../docs/context/ops/scripts/README.md](../docs/context/ops/scripts/README.md)

---

## 🤝 Contribuindo

Ao adicionar novos scripts:

1. Coloque na pasta apropriada
2. Adicione permissão de execução: `chmod +x script.sh`
3. Atualize este INDEX.md
4. Atualize o README.md
5. Execute validação: `bash scripts/validate.sh`

---

**Última Atualização:** 15 de Outubro de 2025  
**Estrutura Reorganizada:** Scripts consolidados de `tools/scripts` para `scripts/`

