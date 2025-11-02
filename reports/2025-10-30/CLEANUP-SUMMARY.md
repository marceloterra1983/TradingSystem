# 🧹 TradingSystem - Cleanup & Reorganização Completa

**Data**: 2025-10-30
**Status**: ✅ Concluído

## 📋 Resumo

Realizamos uma limpeza completa e reorganização de todos os containers Docker do TradingSystem, restaurando a estrutura organizada por stacks com nomes padronizados.

---

## 🎯 Estrutura Final (Organizada)

### 📦 Total: 27 Containers em 6 Stacks

```
📦 APPS Stack         →  2 containers
🗄️  DATA Stack         →  9 containers
📚 DOCS Stack         →  2 containers
🧠 RAG Stack          →  3 containers
📊 MONITORING Stack   →  4 containers
🔧 TOOLS Stack        →  7 containers
```

---

## 🔧 Containers por Stack

### 📦 APPS Stack (2)
- `apps-workspace` → Port 3200
- `apps-tpcapital` → Port 4005

### 🗄️ DATA Stack (9)
- `data-timescale` → Port 5433 (PostgreSQL/TimescaleDB)
- `data-timescale-admin` → Port 8080 (Adminer)
- `data-timescale-pgweb` → Port 8081 (PgWeb)
- `data-timescale-pgadmin` → Port 5050 (PgAdmin)
- `data-timescale-exporter` → Port 9187 (Prometheus exporter)
- `data-timescale-backup` → Port 5434 (Backup instance)
- `data-questdb` → Ports 8812, 9000, 9009
- `data-qdrant` → Ports 6333, 6334 (Vector database)
- `data-postgres-langgraph` → Port 5435

### 📚 DOCS Stack (2)
- `docs-hub` → Port 3400 (Docusaurus)
- `docs-api` → Port 3401 (Documentation API)

### 🧠 RAG Stack (3)
- `rag-ollama` → Port 11434 (LLM inference)
- `rag-llamaindex-ingest` → Port 8201 (Document ingestion)
- `rag-llamaindex-query` → Port 8202 (Query service)

### 📊 MONITORING Stack (4)
- `monitor-prometheus` → Port 9090
- `monitor-grafana` → Port 3000
- `monitor-alertmanager` → Port 9093
- `monitor-alert-router` → Port 9094

### 🔧 TOOLS Stack (7)
- `tools-langgraph` → Port 8111
- `tools-agno-agents` → Port 8200
- `tools-firecrawl-api` → Port 3002
- `tools-firecrawl-proxy` → Port 3600
- `tools-firecrawl-postgres` → Port 5436
- `tools-firecrawl-redis` → Port 6379
- `tools-firecrawl-playwright` → Port 3003

---

## 🛠️ Scripts Atualizados

### 1. `scripts/cleanup-and-restart.sh` (NOVO)

Script de limpeza completa e restart organizado.

**Uso**:
```bash
bash scripts/cleanup-and-restart.sh
```

**O que faz**:
1. Para TODOS os containers
2. Remove TODOS os containers
3. Detecta compose files disponíveis
4. Inicia stacks na ordem de dependência:
   - DATABASE → APPS → DOCS → RAG → MONITORING → TOOLS → FIRECRAWL
5. Aguarda TimescaleDB ficar healthy antes de iniciar apps
6. Mostra resumo final organizado por stack

**Quando usar**:
- Quando houver containers órfãos
- Quando nomes ficarem bagunçados
- Para reset completo do ambiente
- Troubleshooting de conflitos de containers

---

### 2. `scripts/start.sh` (ATUALIZADO)

Script de startup universal agora usa modo "smart".

**Mudanças**:
```bash
# ❌ ANTES (causava conflitos)
docker compose up -d --force-recreate

# ✅ AGORA (modo smart)
docker compose up -d --remove-orphans
```

**Benefícios**:
- ✅ Detecta containers existentes e reusa quando possível
- ✅ Remove orphans automaticamente
- ✅ Preserva volumes e networks
- ✅ Startup mais rápido (não recria tudo sempre)

**Outras melhorias**:
- Timeout APPS aumentado (60s → 120s)
- Status em tempo real durante health checks
- Nome correto: `apps-tpcapital` (não `apps-tp-capital`)

---

### 3. `scripts/status.sh` (MELHORADO)

Status agora mostra estrutura organizada por stack.

**Output**:
```
📦 APPS Stack:
  ✓ apps-workspace               Ports: 3200
  ✓ apps-tpcapital               Ports: 4005

🗄️  DATA Stack:
  ✓ data-questdb                 Ports: 8812, 9000, 9009
  ✓ data-qdrant                  Ports: 6333, 6334
  ...
```

**Melhorias**:
- Agrupamento por stack com ícones
- Health status colorido (✓ ✗ ⟳ •)
- Portas simplificadas (só portas host)
- Sem duplicação IPv4/IPv6

---

### 4. Comandos Universais (CONFIGURADOS)

Os comandos `start`, `stop`, `status` agora funcionam de qualquer diretório.

**Instalação**:
```bash
bash install-shortcuts.sh
source ~/.bashrc
```

**Uso**:
```bash
# De qualquer diretório
start
stop
status
```

**Implementação**:
- Scripts wrapper em `.bin/`
- PATH atualizado em `~/.bashrc`
- Sem aliases ou funções (mais compatível)

---

## 📝 Arquivos de Configuração

### Docker Compose Files (7)

Localizados em `tools/compose/`:

1. **docker-compose.database.yml** → DATA stack
2. **docker-compose.apps.yml** → APPS stack
3. **docker-compose.docs.yml** → DOCS stack
4. **docker-compose.rag.yml** → RAG stack
5. **docker-compose.monitoring.yml** → MONITORING stack
6. **docker-compose.tools.yml** → TOOLS stack
7. **docker-compose.firecrawl.yml** → FIRECRAWL stack (parte de TOOLS)

---

## 🎨 Convenções de Nomenclatura

### Padrão de Nomes

```
<stack>-<service>
```

**Exemplos**:
- `apps-workspace`
- `data-timescale`
- `docs-hub`
- `rag-ollama`
- `monitor-prometheus`
- `tools-langgraph`

### Prefixos por Stack

| Stack | Prefixo | Exemplo |
|-------|---------|---------|
| APPS | `apps-` | `apps-tpcapital` |
| DATA | `data-` | `data-timescale` |
| DOCS | `docs-` | `docs-hub` |
| RAG | `rag-` | `rag-ollama` |
| MONITORING | `monitor-` | `monitor-grafana` |
| TOOLS | `tools-` | `tools-langgraph` |

---

## 🚀 Comandos Úteis

### Inicialização

```bash
# Startup normal (rápido)
start

# Cleanup completo e restart (quando houver problemas)
bash scripts/cleanup-and-restart.sh

# Startup sem RAG
start --skip-vectors

# Startup forçado (mata processos em portas ocupadas)
start --force-kill
```

### Status e Monitoramento

```bash
# Status único
status

# Status detalhado (CPU, MEM por container)
status --detailed

# Monitoramento contínuo (atualiza a cada 5s)
status --watch

# Output JSON para automação
status --json
```

### Shutdown

```bash
# Shutdown graceful (padrão)
stop

# Shutdown forçado (SIGKILL)
stop --force

# Shutdown e limpeza completa
stop --force --clean-logs --with-db --prune-networks
```

### Troubleshooting

```bash
# Ver logs de container específico
docker logs -f apps-workspace

# Ver logs de toda uma stack
docker compose -f tools/compose/docker-compose.apps.yml logs -f

# Listar containers órfãos
docker ps -a --filter "status=exited"

# Health check manual
docker inspect --format='{{.State.Health.Status}}' apps-workspace

# Ver redes Docker
docker network ls

# Ver volumes Docker
docker volume ls
```

---

## ✅ Checklist de Validação

Após executar `cleanup-and-restart.sh` ou `start`, verifique:

- [ ] 27 containers rodando
- [ ] Todos organizados por stack (apps-, data-, docs-, rag-, monitor-, tools-)
- [ ] Nenhum container órfão (nomes sem prefixo correto)
- [ ] TimescaleDB healthy (primeiro a subir)
- [ ] Apps healthy (workspace, tpcapital)
- [ ] Portas acessíveis (3200, 4005, 3400, etc.)
- [ ] Comando `status` mostra estrutura organizada

**Comando de validação rápida**:
```bash
status | grep -E "Stack:|containers running"
```

Deve mostrar 6 stacks e 27 containers.

---

## 🐛 Problemas Conhecidos e Soluções

### Problema: "container name already in use"

**Causa**: Containers órfãos de execuções anteriores

**Solução**:
```bash
bash scripts/cleanup-and-restart.sh
```

### Problema: Apps não ficam healthy em 60s

**Causa**: Containers grandes (workspace, tpcapital) demoram mais para iniciar

**Solução**: Timeout já aumentado para 120s no start.sh

### Problema: Estrutura bagunçada após múltiplos starts

**Causa**: Uso de `--force-recreate` ou `docker rm -f` manual

**Solução**: Sempre use os scripts oficiais (start, stop, cleanup-and-restart)

### Problema: Comandos universais não funcionam

**Causa**: Shell não recarregado após instalação

**Solução**:
```bash
source ~/.bashrc
# ou abra novo terminal
```

---

## 📚 Documentação Relacionada

- **CLAUDE.md** - Instruções para AI assistants
- **COMANDOS-UNIVERSAIS.md** - Guia completo de comandos universais
- **scripts/README.md** - Documentação de scripts
- **tools/compose/** - Docker Compose files organizados

---

## 🎉 Resultado Final

✅ **27 containers** organizados em **6 stacks**
✅ **Nomes padronizados** com prefixos por stack
✅ **Scripts universais** funcionando (`start`, `stop`, `status`)
✅ **Cleanup automático** de containers órfãos
✅ **Status organizado** com agrupamento visual
✅ **Startup inteligente** (não recria desnecessariamente)

**Sistema pronto para desenvolvimento!** 🚀

---

**Próximos passos**:
1. Execute `status` para confirmar tudo OK
2. Use `start`/`stop` conforme necessário
3. Se houver problemas: `bash scripts/cleanup-and-restart.sh`

---

**Versão**: 2.0
**Última Atualização**: 2025-10-30
**Status**: ✅ Produção
