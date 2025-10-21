---
title: Shell Scripts Reference
sidebar_position: 1
tags: [ops, scripts, shell, automation, bash]
domain: ops
type: index
summary: Comprehensive reference for all TradingSystem shell scripts and automation tools
status: active
last_review: 2025-10-18
---

# TradingSystem Shell Scripts Reference

## 🚀 Quick Start

> ⚠️ Desde 18/10/2025 o instalador `scripts/setup/install.sh` está desativado para impedir a reinstalação do Claude Code. Consulte `docs/context/ops/claude-z-ai-guide.md` para detalhes.

```bash
# Start all local services (Node.js)
bash scripts/services/start-all.sh

# Start Docker containers
bash scripts/docker/start-stacks.sh

# Check status
bash scripts/services/status.sh

# Stop everything
bash scripts/services/stop-all.sh
bash scripts/docker/stop-stacks.sh
```

## 📁 Script Organization

### `/scripts/lib/` - Shared Libraries

Biblioteca compartilhada que pode ser reutilizada por qualquer script:

- **`common.sh`** - Funções utilitárias gerais
  - Detecção de project root
  - Logging colorizado (log_info, log_success, log_warning, log_error)
  - Validação de comandos
  - Helpers de ambiente

- **`portcheck.sh`** - Gerenciamento de portas
  - Detecção de portas em uso (lsof/ss/netstat)
  - Descoberta de PIDs em portas
  - Kill gracioso de processos em portas

- **`health.sh`** - Health checks
  - HTTP health checks
  - MCP server health checks
  - Container health checks

- **`logging.sh`** - Sistema de logging estruturado
  - Logs timestamped
  - Rotação de logs
  - Tail/follow de logs

- **`docker.sh`** - Utilitários Docker
  - Validação de Docker
  - Gerenciamento de containers
  - Docker Compose wrappers

- **`terminal.sh`** - Terminal emulator detection
  - Lançamento em tabs/janelas
  - Abertura de URLs no browser
  - Detecção WSL

- **`pidfile.sh`** - Gerenciamento de PID files
  - Criação/leitura segura de PID files
  - Validação de processos
  - Cleanup de PIDs órfãos

**Uso:**
```bash
#!/bin/bash
set -euo pipefail

# Carregar biblioteca
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"
source "$SCRIPT_DIR/../lib/portcheck.sh"

# Usar funções
PROJECT_ROOT=$(get_project_root)
log_info "Starting service..."

if is_port_in_use 3000; then
    log_warning "Port 3000 is busy"
    kill_port 3000
fi
```

### `/scripts/services/` - Gerenciamento de Serviços

Scripts para gerenciar serviços Node.js locais:

- **`start-all.sh`** - Inicia todos os serviços locais
  - Dashboard (3103)
  - Documentation Hub (3004)
  - Backend APIs (3102, 3200, 3302, 3400, 3500)
  - Instalação automática de dependências
  - Health checks

- **`stop-all.sh`** - Para todos os serviços
  - Shutdown gracioso (SIGTERM → SIGKILL)
  - Cleanup de PID files
  - Opção de limpar logs

- **`status.sh`** - Verifica status de todos os serviços
  - Serviços locais
  - Docker containers
  - Health checks
  - Modo detalhado disponível

- **`restart-all.sh`** - Reinicia todos os serviços (planned)

- **`diagnose.sh`** - Diagnóstico avançado (planned)

### `/scripts/docker/` - Docker Orchestration

Scripts para gerenciar Docker Compose stacks:

- **`start-stacks.sh`** - Inicia todos os Docker stacks
  - Infrastructure (QuestDB, etc.)
  - Monitoring (Prometheus, Grafana)
  - Frontend (containerizado)
  - AI Tools

- **`stop-stacks.sh`** - Para todos os stacks
  - Ordem reversa de inicialização
  - Preserva volumes por padrão

- **`verify-docker.sh`** - Valida configuração Docker (planned)

### `/scripts/setup/` - Instalação e Configuração

Scripts de setup inicial:

- **`install.sh`** - **Desativado:** exibe aviso sobre a remoção do Claude Code
- **`install-dependencies.sh`** - Instala dependências Node.js
- **`check-requirements.sh`** - Valida requisitos do sistema

### `/scripts/backup/` - Backup e Restore

Scripts de backup de dados:

- **`backup-questdb.sh`** - Backup do QuestDB
- **`backup-timescaledb.sh`** - Backup do TimescaleDB
- **`restore.sh`** - Restore unificado

### `/scripts/utils/` - Utilitários Diversos

- **`open-services.sh`** - Abre URLs dos serviços no browser
- **`verify-timezone.sh`** - Valida configuração de timezone
- **`audit.sh`** - Auditoria de dependências instaladas

### `/scripts/dev/` - Scripts de Desenvolvimento

- **`quick-start.sh`** - Setup rápido para desenvolvimento
- **`launch-service.sh`** - Lança serviço individual em terminal

## 🔧 Common Tasks

### Iniciar Ambiente Completo

```bash
# 1. Iniciar Docker (databases, monitoring)
bash scripts/docker/start-stacks.sh

# 2. Aguardar QuestDB inicializar (10s)
sleep 10

# 3. Iniciar serviços locais
bash scripts/services/start-all.sh

# 4. Verificar status
bash scripts/services/status.sh
```

### Parar Tudo

```bash
# Para serviços locais
bash scripts/services/stop-all.sh

# Para Docker stacks
bash scripts/docker/stop-stacks.sh
```

### Reiniciar Serviço Específico

```bash
# Para o serviço
bash scripts/services/stop-all.sh

# Inicia novamente (apenas um)
cd backend/api/workspace && npm run dev
```

### Ver Logs

```bash
# Logs de serviço específico
tail -f /tmp/tradingsystem-logs/workspace-api.log

# Todos os logs
ls -lh /tmp/tradingsystem-logs/

# Usar função da biblioteca
source scripts/lib/logging.sh
tail_log "workspace-api" 50
```

### Verificar Portas

```bash
# Usando biblioteca
source scripts/lib/portcheck.sh

# Verificar porta
is_port_in_use 3103 && echo "Busy" || echo "Free"

# Ver quem usa a porta
get_port_pids 3103

# Matar porta
kill_port 3103
```

## 🛡️ Best Practices

### Criando Novos Scripts

1. **Use o template padrão:**
```bash
#!/bin/bash
# Script Name: my-script.sh
# Purpose: Brief description
# Author: TradingSystem Team
# Last Modified: YYYY-MM-DD

set -euo pipefail

# Load libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/common.sh"

# Show help
show_help() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]
...
EOF
}

# Cleanup on exit
cleanup() {
    local exit_code=$?
    # Cleanup resources
    exit "$exit_code"
}
trap cleanup EXIT INT TERM

# Main function
main() {
    # Your logic here
    :
}

main "$@"
```

2. **Sempre use `set -euo pipefail`**
   - `-e`: Exit on error
   - `-u`: Exit on undefined variable
   - `-o pipefail`: Fail on pipe errors

3. **Source bibliotecas compartilhadas**
   - Evite duplicar código
   - Use funções da lib/

4. **Adicione help/usage**
   - `--help` deve sempre funcionar
   - Documente opções e exemplos

5. **Implemente cleanup**
   - Use `trap` para cleanup em EXIT/INT/TERM
   - Limpe arquivos temporários

6. **Valide inputs**
   - Use `validate_safe_string` para prevenir injection
   - Valide argumentos obrigatórios

7. **Logging adequado**
   - Use `log_info`, `log_success`, `log_warning`, `log_error`
   - Evite `echo` direto (exceto para output de dados)

### Validação com Shellcheck

```bash
# Validar todos os scripts
bash scripts/validate.sh

# Validar diretório específico
bash scripts/validate.sh --path scripts/services/

# Modo estrito (fail on warnings)
bash scripts/validate.sh --strict
```

## 🐛 Troubleshooting

### Serviços não iniciam

```bash
# 1. Verificar logs
tail -f /tmp/tradingsystem-logs/<service>.log

# 2. Verificar portas
bash scripts/services/status.sh --detailed

# 3. Matar processos órfãos
bash scripts/services/stop-all.sh --force

# 4. Tentar iniciar novamente
bash scripts/services/start-all.sh --force-kill-ports
```

### Docker não funciona

```bash
# Verificar permissões
bash check-docker-permissions.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Iniciar daemon
sudo systemctl start docker
```

### PID files órfãos

```bash
# Limpar PID files antigos
source scripts/lib/pidfile.sh
clean_stale_pidfiles
```

### Logs muito grandes

```bash
# Rotacionar logs manualmente
source scripts/lib/logging.sh
rotate_log_if_needed /tmp/tradingsystem-logs/workspace-api.log 5  # 5MB limit

# Limpar logs antigos
clean_old_logs 7  # 7 days
```

## 📚 Additional Resources

- **Shellcheck Documentation:** https://github.com/koalaman/shellcheck/wiki
- **Bash Best Practices:** https://google.github.io/styleguide/shellguide.html
- **Docker Compose Reference:** https://docs.docker.com/compose/

## 🤝 Contributing

Ao modificar ou adicionar scripts:

1. Siga o template padrão
2. Use as bibliotecas compartilhadas (`scripts/lib/`)
3. Adicione `--help` documentation
4. Valide com shellcheck: `bash scripts/validate.sh`
5. Teste em WSL2 e Linux nativo
6. Documente mudanças neste README

## 📝 Change Log

### 2025-10-15 - Major Refactoring
- ✅ Criada biblioteca compartilhada (`scripts/lib/`)
- ✅ Consolidados scripts duplicados
- ✅ Reorganizada estrutura de diretórios
- ✅ Adicionado shellcheck validation
- ✅ Removidos hardcoded paths
- ✅ Implementado help system
- ✅ Melhorado error handling e robustness
