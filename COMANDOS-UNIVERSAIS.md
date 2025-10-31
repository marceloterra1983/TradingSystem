# 🚀 Comandos Universais do TradingSystem

## Instalação

Execute o instalador uma única vez:

```bash
cd /home/marce/Projetos/TradingSystem
bash install-shortcuts.sh
source ~/.bashrc
```

**O que o instalador faz:**
1. Cria scripts wrapper em `.bin/` (start, stop, status)
2. Adiciona `.bin/` ao PATH no `~/.bashrc`
3. Torna os wrappers executáveis

## Comandos Disponíveis

### Comandos Principais

```bash
# Iniciar todos os serviços (de qualquer diretório)
start

# Parar todos os serviços
stop

# Ver status de todos os serviços
status
```

**Nota**: Os comandos funcionam de qualquer diretório e funcionam apenas em shells interativos (terminal).

## Opções Disponíveis

### Start Options

```bash
start --force-kill           # Mata processos em portas ocupadas antes de iniciar
start --skip-docker          # Pula containers Docker
start --skip-services        # Pula serviços Node.js locais
start --skip-vectors         # Não inicia RAG stack (Ollama, LlamaIndex)
start --with-vectors         # Inicia RAG stack (padrão)
start --skip-health-checks   # Pula health checks (startup mais rápido)
start --quiet                # Modo silencioso (só erros e resumo final)
start --help                 # Mostra ajuda completa
```

### Stop Options

```bash
stop --force                 # Usa SIGKILL em vez de SIGTERM
stop --clean-logs            # Remove logs após parar
stop --skip-docker           # Pula parar containers Docker
stop --skip-services         # Pula parar serviços Node.js
stop --with-db               # Também para stack de database
stop --with-vectors          # Também para RAG stack (padrão)
stop --skip-vectors          # Deixa LlamaIndex/Ollama rodando
stop --prune-networks        # Remove redes Docker compartilhadas
stop --help                  # Mostra ajuda completa
```

### Status Options

```bash
status --watch               # Monitoramento contínuo (atualiza a cada 5s)
status --detailed            # Mostra informações detalhadas de processos
status --json                # Output em formato JSON
status --help                # Mostra ajuda completa
```

## Exemplos de Uso

### Startup Completo

```bash
# Startup normal (tudo habilitado)
start

# Startup sem RAG (mais rápido)
start --skip-vectors

# Startup forçado (mata processos em portas ocupadas)
start --force-kill

# Startup silencioso
start --quiet
```

### Shutdown

```bash
# Shutdown graceful (padrão)
stop

# Shutdown forçado
stop --force

# Shutdown e limpeza completa
stop --force --clean-logs --with-db --prune-networks
```

### Monitoramento

```bash
# Status único
status

# Monitoramento contínuo
status --watch

# Status detalhado com CPU/MEM
status --detailed

# Output JSON para automação
status --json | jq '.services'
```

## Stacks Gerenciadas

Os scripts gerenciam 6 stacks Docker Compose:

### 1. APPS Stack
- **Arquivo**: `tools/compose/docker-compose.apps.yml`
- **Containers**: apps-tp-capital, apps-workspace
- **Portas**: 4005, 3200

### 2. DATA Stack
- **Arquivo**: `tools/compose/docker-compose.database.yml`
- **Containers**: data-timescale, data-questdb, data-qdrant, data-redis, + UI tools
- **Portas**: 5433, 9000, 6333, 6379, 8080, 8081, 5050

### 3. DOCS Stack
- **Arquivo**: `tools/compose/docker-compose.docs.yml`
- **Containers**: docs-hub, docs-api
- **Portas**: 3400, 3401

### 4. RAG Stack
- **Arquivo**: `tools/compose/docker-compose.rag.yml`
- **Containers**: rag-ollama, rag-llamaindex-ingest, rag-llamaindex-query
- **Portas**: 11434, 8201, 8202

### 5. MONITORING Stack
- **Arquivo**: `tools/compose/docker-compose.monitoring.yml`
- **Containers**: monitor-prometheus, monitor-grafana, monitor-alertmanager
- **Portas**: 9090, 3000, 9093

### 6. TOOLS Stack
- **Arquivo**: `tools/compose/docker-compose.tools.yml`
- **Containers**: tools-langgraph, tools-agno-agents
- **Portas**: 8111, 8200

### 7. FIRECRAWL Stack
- **Arquivo**: `tools/compose/docker-compose.firecrawl.yml`
- **Containers**: tools-firecrawl-api, tools-firecrawl-proxy, tools-firecrawl-postgres, tools-firecrawl-redis, tools-firecrawl-playwright
- **Portas**: 3002, 3600, 5436, 6379, 3003

## Serviços Node.js Locais

Os scripts também gerenciam serviços Node.js locais:

- **telegram-gateway** (4006)
- **telegram-gateway-api** (4010)
- **dashboard** (3103)
- **docusaurus** (3400)
- **status** (3500)

## Ordem de Inicialização

Os scripts seguem ordem de dependência:

1. **Database Stack** (DATA) - primeira a subir
2. **Apps Stack** - depende de database
3. **Docs Stack** - independente
4. **RAG Stack** - independente (opcional)
5. **Monitoring Stack** - independente
6. **Tools Stack** - independente
7. **Firecrawl Stack** - independente
8. **Serviços Node.js** - últimos a subir

## Ordem de Shutdown

Os scripts param em ordem reversa (seguro):

1. **Serviços Node.js** - primeiro a parar
2. **Firecrawl Stack**
3. **Tools Stack**
4. **Monitoring Stack**
5. **RAG Stack** (se `--with-vectors`)
6. **Docs Stack**
7. **Apps Stack**
8. **Database Stack** (se `--with-db`)

## Troubleshooting

### Comandos não encontrados após instalação

```bash
# Recarregue o shell
source ~/.bashrc

# Ou execute um novo shell
exec $SHELL
```

### Verificar se comandos estão no PATH

```bash
which start
which stop
which status
```

Deve mostrar o caminho `/home/marce/Projetos/TradingSystem/.bin/start` etc.

### Remover comandos universais

```bash
# Edite ~/.bashrc e remova a seção:
# TradingSystem Universal Commands
# ... até ...
# End TradingSystem Universal Commands

# Recarregue o shell
source ~/.bashrc
```

### Reinstalar comandos universais

```bash
cd /home/marce/Projetos/TradingSystem
bash install-shortcuts.sh
source ~/.bashrc
```

## Logs e Debug

### Verificar logs de serviços

```bash
# Logs em tempo real
tail -f /tmp/tradingsystem-logs/*.log

# Logs de container específico
docker logs -f apps-workspace

# Logs de todos os containers de uma stack
docker compose -f tools/compose/docker-compose.apps.yml logs -f
```

### Health Check Completo

```bash
# Via script
bash scripts/maintenance/health-check-all.sh

# Via API (Service Launcher)
curl http://localhost:3500/api/health/full | jq
```

## Integração com Claude Code CLI

Os comandos funcionam perfeitamente com Claude Code CLI:

```bash
# No terminal do Claude Code
start --skip-vectors
status --watch
stop --force
```

## Arquivos de Configuração

### Scripts Principais

- **scripts/start.sh** - Script de inicialização universal
- **scripts/stop.sh** - Script de parada universal
- **scripts/status.sh** - Script de status universal

### Instalador

- **install-shortcuts.sh** - Instalador de comandos universais

### Configuração Shell

- **~/.bashrc** - Funções shell são adicionadas aqui

## Notas Importantes

1. ✅ **Comandos funcionam de qualquer diretório**
2. ✅ **Argumentos são passados corretamente** (`"$@"`)
3. ✅ **Scripts wrapper simples** em `.bin/` (leves e confiáveis)
4. ✅ **Graceful shutdown por padrão** (SIGTERM)
5. ✅ **Health checks integrados** no startup
6. ✅ **Suporte a watch mode** no status
7. ✅ **JSON output** para automação
8. ⚠️ **Apenas shells interativos** (não funcionam em scripts bash -c)

## Atualizações Recentes

### 2025-10-30

- ✅ Scripts atualizados para suportar 6 stacks Docker
- ✅ Funções modulares para cada stack
- ✅ Ordem de dependência corrigida
- ✅ Health checks para 27 containers
- ✅ Comandos universais instalados com funções (não aliases)
- ✅ Nomes de função corrigidos (underscores em vez de hífens)
- ✅ Teste completo de sintaxe e execução

---

**Versão**: 2.0
**Última Atualização**: 2025-10-30
**Status**: ✅ Testado e Funcional
