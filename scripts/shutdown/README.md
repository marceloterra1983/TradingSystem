# TradingSystem - Shutdown Scripts

## Visão Geral

Diretório contendo scripts para parar todos os serviços e containers do TradingSystem de forma controlada.

## Scripts Disponíveis

### `stop-tradingsystem-full.sh`

Script principal de shutdown que gerencia todo o processo de parada do sistema.

**Uso:**

```bash
bash scripts/shutdown/stop-tradingsystem-full.sh [OPTIONS]
```

**Opções:**

-   `--services` - Para apenas serviços Node.js locais
-   `--docker` - Para apenas containers Docker
-   `--force` - Force kill (SIGKILL) sem shutdown gracioso
-   `--clean-logs` - Remove arquivos de log após parar
-   `--help` - Exibe ajuda completa

**Exemplos:**

```bash
# Parar tudo gracefully
bash scripts/shutdown/stop-tradingsystem-full.sh

# Force kill tudo
bash scripts/shutdown/stop-tradingsystem-full.sh --force

# Parar apenas serviços Node.js
bash scripts/shutdown/stop-tradingsystem-full.sh --services

# Parar e limpar logs
bash scripts/shutdown/stop-tradingsystem-full.sh --clean-logs
```

## Wrapper na Raiz

O script é mais facilmente acessado via wrapper na raiz do projeto:

```bash
# Via wrapper
bash /home/marce/projetos/TradingSystem/stop-tradingsystem [OPTIONS]

# Ou com alias (após instalação)
stop [OPTIONS]
```

## Processo de Shutdown

### 1. Graceful Shutdown (Padrão)

1. Para serviços Node.js com SIGTERM
2. Aguarda 5 segundos para finalização
3. Se ainda rodando, força SIGKILL
4. Para containers Docker com `docker compose down`
5. Verifica processos órfãos
6. Reporta status final

### 2. Force Kill (`--force`)

1. SIGKILL imediato em todos os processos
2. Para containers Docker imediatamente
3. Não aguarda graceful shutdown

### 3. Docker Only (`--docker`)

1. Para apenas containers Docker
2. Mantém serviços Node.js rodando

### 4. Services Only (`--services`)

1. Para apenas serviços Node.js
2. Mantém containers Docker rodando

## Serviços Gerenciados

### Node.js Services

-   Dashboard (Port 3103)
-   Docusaurus (Port 3004)
-   Workspace API (Port 3200)
-   TP Capital (Port 3200)
-   B3 Market Data (Port 3302)
-   Documentation API (Port 3400)
-   Service Launcher (Port 3500)
-   Firecrawl Proxy (Port 3600)
-   WebScraper API (Port 3700)

### Docker Stacks

-   Infrastructure (Qdrant, Redis)
-   Data (QuestDB, TimescaleDB, pgAdmin)
-   Monitoring (Prometheus, Grafana)
-   Documentation API
-   LangGraph Development
-   Firecrawl

## Scripts Relacionados

-   **Start**: `scripts/startup/start-tradingsystem-full.sh`
-   **Status**: `scripts/services/status.sh`
-   **Health**: `scripts/maintenance/health-check-all.sh`
-   **Stop Services**: `scripts/services/stop-all.sh`
-   **Stop Docker**: `scripts/docker/stop-stacks.sh`

## Volumes e Dados

⚠️ **IMPORTANTE**: Volumes Docker são **preservados** durante o shutdown.

-   Dados não são perdidos no `stop`
-   Para remover volumes: `docker volume prune`
-   Backup recomendado antes de remover volumes

## Logs

Logs são mantidos em `/tmp/tradingsystem-logs/` a menos que `--clean-logs` seja usado.

**Ver logs:**

```bash
ls -lh /tmp/tradingsystem-logs/
tail -f /tmp/tradingsystem-logs/*.log
```

**Limpar manualmente:**

```bash
rm -f /tmp/tradingsystem-logs/*.log
```

## Troubleshooting

### Processos não param

```bash
# Usar force kill
bash scripts/shutdown/stop-tradingsystem-full.sh --force
```

### Containers não param

```bash
# Parar manualmente
docker stop $(docker ps -q)
docker rm $(docker ps -aq)
```

### Portas ainda ocupadas

```bash
# Verificar porta específica
lsof -i :3103

# Matar processo
kill -9 $(lsof -t -i:3103)
```

## Instalação de Aliases

Para usar comandos curtos como `stop`, execute:

```bash
bash /home/marce/projetos/TradingSystem/install-shortcuts.sh
source ~/.bashrc  # ou ~/.zshrc
```

Depois poderá usar:

```bash
stop              # Parar tudo
stop-docker       # Apenas Docker
stop-services     # Apenas Node.js
stop-force        # Force kill
```

## Documentação

Para documentação completa, consulte:

-   [Universal Commands Guide](../../docs/context/ops/universal-commands.md)
-   [Service Startup Guide](../../docs/context/ops/service-startup-guide.md)
-   [Health Monitoring](../../docs/context/ops/health-monitoring.md)

---

**Criado em**: 2025-10-20  
**Autor**: TradingSystem Team  
**Última atualização**: 2025-10-20


