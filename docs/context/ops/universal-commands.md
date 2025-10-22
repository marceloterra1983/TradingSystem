---
title: "Comandos Universais do TradingSystem"
tags: [operations, startup, shutdown, cli, automation]
domain: ops
type: guide
summary: "Guia completo dos comandos universais start e stop para gerenciar o TradingSystem"
status: active
last_review: 2025-10-20
last_update: 2025-10-20
sidebar_position: 1
---

# Comandos Universais do TradingSystem

## Visão Geral

O TradingSystem possui comandos universais (`start` e `stop`) que podem ser executados de qualquer diretório após a instalação dos shortcuts. Eles fornecem controle completo sobre todos os serviços e containers do sistema.

## Instalação

### Primeira Vez

Execute o instalador de shortcuts:

```bash
bash /home/marce/projetos/TradingSystem/install-shortcuts.sh
```

Recarregue o shell:

```bash
source ~/.bashrc  # ou source ~/.zshrc
```

### Verificar Instalação

Execute `start --help` ou `stop --help` para confirmar que os comandos estão disponíveis.

## Comando `start`

### Uso Básico

```bash
# Startup completo (Docker + Node.js)
start

# Apenas containers Docker
start --docker

# Apenas serviços Node.js
start --services

# Modo mínimo (Dashboard + Workspace + Docusaurus)
start --minimal

# Force restart (mata processos em portas ocupadas)
start --force-kill
```

### Opções Avançadas

```bash
# Pular serviços específicos
start --skip-frontend    # Não inicia Dashboard
start --skip-backend     # Não inicia APIs backend
start --skip-docs        # Não inicia Docusaurus

# Combinações
start --services --force-kill    # Restart forçado apenas dos serviços Node.js
start --minimal --skip-docs      # Dashboard + Workspace apenas
```

### Serviços Iniciados

#### Docker Stacks

-   **Infrastructure**: Qdrant, Redis, etc.
-   **Data**: QuestDB, TimescaleDB, pgAdmin
-   **Monitoring**: Prometheus, Grafana
-   **Documentation API**: Port 3400
-   **LangGraph**: Desenvolvimento de AI agents
-   **Firecrawl**: Web scraping

#### Node.js Services

| Serviço          | Porta | Descrição                  |
| ---------------- | ----- | -------------------------- |
| Dashboard        | 3103  | Interface React + Vite     |
| Docusaurus       | 3004  | Documentação do projeto    |
| Workspace API    | 3200  | Gerenciamento de ideias    |
| TP Capital       | 3200  | Ingestão de dados Telegram |
| B3 Market Data   | 3302  | Dados de mercado           |
| Service Launcher | 3500  | Orquestração de serviços   |
| Firecrawl Proxy  | 3600  | Proxy para Firecrawl       |
| WebScraper API   | 3700  | Web scraping backend       |
| WebScraper UI    | 3800  | Web scraping frontend      |

## Comando `stop`

### Uso Básico

```bash
# Parar tudo (gracefully com SIGTERM)
stop

# Parar apenas containers Docker
stop --docker

# Parar apenas serviços Node.js
stop --services

# Force kill tudo (SIGKILL imediato)
stop --force

# Parar e limpar logs
stop --clean-logs
```

### Processo de Shutdown

1. **Para Serviços com PID Files**

    - Identifica serviços com PID files em `/tmp/tradingsystem-logs/`
    - **Graceful Shutdown** (padrão): Envia SIGTERM, aguarda 5 segundos, depois força SIGKILL se necessário
    - **Force Kill** (`--force`): SIGKILL imediato sem espera

2. **Para Processos por Porta**

    - Verifica todas as portas conhecidas (3103, 3004, 3200, 3302, 3400, 3500, 3600, 3700, 3800)
    - Identifica processos rodando nessas portas (mesmo sem PID files)
    - Para processos órfãos que não têm PID files
    - **NOVO**: Mata processos por porta automaticamente

3. **Para Docker Containers**

    - Executa `docker compose down` em todos os stacks conhecidos:
        - Infrastructure (`docker-compose.infra.yml`)
        - Monitoring (`docker-compose.yml`)
        - TimescaleDB (`docker-compose.timescale.yml`)
        - Frontend Apps (`docker-compose.frontend-apps.yml`)
        - Docs (`docker-compose.docs.yml`)
        - Firecrawl (via `scripts/firecrawl/stop.sh`)
    - **NOVO**: Para containers restantes que correspondem ao padrão `(infra-|data-|docs-|mon-|firecrawl-|frontend-apps-|apps-|ollama)`
    - Volumes são preservados (dados não perdidos)

4. **Verificação Pós-Shutdown**
    - Verifica processos Node.js restantes
    - Verifica containers Docker restantes
    - Verifica portas em uso
    - Sugere ações corretivas se necessário (`stop --force`)

### Aliases Úteis

```bash
stop              # Parar tudo gracefully
stop-docker       # Parar apenas containers
stop-services     # Parar apenas Node.js
stop-force        # Force kill tudo
```

## Comando `status`

```bash
# Ver status de todos os serviços
status

# Ou diretamente
bash /home/marce/projetos/TradingSystem/scripts/services/status.sh
```

## Comando `health`

```bash
# Health check completo (serviços + containers + databases)
health

# Ou diretamente
bash /home/marce/projetos/TradingSystem/scripts/maintenance/health-check-all.sh

# Opções do health check
health --format json          # Saída JSON para automação
health --format prometheus    # Métricas Prometheus
health --services-only        # Apenas serviços locais
health --containers-only      # Apenas containers Docker
```

## Comando `logs`

```bash
# Ver logs em tempo real de todos os serviços
logs

# Equivalente a
tail -f /tmp/tradingsystem-logs/*.log
```

## Fluxo de Trabalho Diário

### Morning Startup

```bash
# 1. Iniciar tudo
start

# 2. Verificar health
health

# 3. Monitorar logs (em terminal separado)
logs
```

### Development Mode

```bash
# Apenas serviços essenciais
start --minimal

# Ou serviços específicos
start --services --skip-docs
```

### End of Day

```bash
# Parar tudo gracefully
stop

# Ou manter Docker rodando
stop --services
```

### Troubleshooting

```bash
# Restart forçado
stop --force
start --force-kill

# Limpar tudo e começar do zero
stop --force --clean-logs
docker system prune -a --volumes  # CUIDADO: Remove volumes!
start
```

## Variáveis de Ambiente

Os comandos respeitam as seguintes variáveis:

-   `LOG_DIR`: Diretório de logs (default: `/tmp/tradingsystem-logs`)
-   `PROJECT_ROOT`: Raiz do projeto (auto-detectado)

## Scripts Subjacentes

### Start

-   **Entrypoint**: `scripts/startup/start-tradingsystem.sh`
-   **Full workflow**: `scripts/startup/start-tradingsystem-full.sh`
-   **Docker**: `scripts/docker/start-stacks.sh`
-   **Services**: `scripts/services/start-all.sh`

### Stop

-   **Entrypoint**: `scripts/shutdown/stop-tradingsystem.sh`
-   **Full workflow**: `scripts/shutdown/stop-tradingsystem-full.sh`
-   **Docker**: `scripts/docker/stop-stacks.sh`
-   **Services**: `scripts/services/stop-all.sh`

## Troubleshooting

### Portas Ocupadas

```bash
# Verificar porta específica
lsof -i :3103

# Matar processo na porta
stop --force

# Ou manual
kill -9 $(lsof -t -i:3103)
```

### Containers não param

```bash
# Forçar parada de todos os containers
docker stop $(docker ps -q)

# Remover containers parados
docker container prune -f
```

### Logs crescendo muito

```bash
# Parar e limpar logs
stop --clean-logs

# Ou manual
rm -f /tmp/tradingsystem-logs/*.log
```

### Reinstalar Shortcuts

```bash
# Remover seção antiga do .bashrc/.zshrc
# Procurar por "# TradingSystem - Universal Startup (2025-10-20)"
vim ~/.bashrc

# Reinstalar
bash /home/marce/projetos/TradingSystem/install-shortcuts.sh

# Recarregar
source ~/.bashrc
```

## Integração com CI/CD

```bash
# GitHub Actions / Jenkins
start --docker --services
sleep 10  # Aguardar inicialização
npm run test
stop --force
```

## Performance Tips

1. **Startup Paralelo**: O script já inicia serviços em paralelo
2. **Modo Mínimo**: Use `--minimal` para desenvolvimento rápido
3. **Docker Pré-build**: Mantenha images em cache com `docker pull`
4. **Logs Separados**: Use `logs` em terminal separado para não poluir

## Segurança

-   ✅ **Graceful Shutdown**: Preserva estado dos serviços
-   ✅ **Volumes Preservados**: Dados não são perdidos no `stop`
-   ✅ **PID Files**: Gerenciamento seguro de processos
-   ⚠️ **Force Kill**: Use apenas quando necessário
-   ⚠️ **Clean Logs**: Pode remover informações de debug importantes

## Próximos Passos

-   [ ] Adicionar comando `restart` (stop + start atômico)
-   [ ] Suporte a `systemd` para auto-start no boot
-   [ ] Dashboard web para controle dos serviços
-   [ ] Notificações de falha via Telegram/Email
-   [ ] Backup automático antes de `stop --force`

## Referências

-   [Health Monitoring Guide](./health-monitoring.md)
-   [Service Startup Guide](./service-startup-guide.md)
-   [Environment Configuration](./ENVIRONMENT-CONFIGURATION.md)
-   [Docker Compose Documentation](https://docs.docker.com/compose/)

---

**Última atualização**: 2025-10-20  
**Autor**: TradingSystem Team  
**Status**: Active
