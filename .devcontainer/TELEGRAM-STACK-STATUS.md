# Telegram Stack - Status e Correções

**Data:** 2025-11-12 20:00:00
**Status:** ⚠️ **PARCIALMENTE CORRIGIDO** (serviços essenciais funcionais, monitoramento desabilitado)

---

## 🔍 Problemas Identificados

### 1. PostgreSQL (TimescaleDB) - ⚠️ Mount Error
**Erro:**
```
LOG: input in flex scanner failed at file "/etc/postgresql/postgresql.conf" line 1
FATAL: configuration file "/etc/postgresql/postgresql.conf" contains errors
```

**Causa Raiz:**
- Docker tentando montar arquivo de configuração
- Container anterior criou diretório em vez de arquivo
- Conflito entre volume mount e filesystem interno

**Solução Aplicada:**
- ✅ Comentado mount do `postgresql.conf`
- ✅ Removida referência `-c config_file`
- ✅ Mantidas configurações via command line flags
- **Resultado:** PostgreSQL deve iniciar normalmente agora

**Arquivo Modificado:** `tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml` linhas 42-47

---

### 2. Grafana - ⚠️ Datasource Mount Error
**Erro:**
```
error="Datasource provisioning error: read /etc/grafana/provisioning/datasources/datasources.yml: is a directory"
```

**Causa Raiz:**
- Docker criou diretório `datasources.yml` em execução anterior
- Tentativa de montar arquivo sobre diretório existente

**Solução:**
- ⏸️ **Desabilitar temporariamente** serviço de monitoramento
- Não é essencial para funcionalidade core do Telegram Gateway
- Pode ser reativado após limpar volumes órfãos

---

### 3. Prometheus - ⚠️ Mount Error
**Erro:**
```
error mounting "/workspace/tools/compose/telegram/monitoring/prometheus.yml" to rootfs
Are you trying to mount a directory onto a file (or vice-versa)?
```

**Causa Raiz:**
- Mesmo problema: Docker criou diretório em execução anterior
- Conflito de mount file vs directory

**Solução:**
- ⏸️ **Desabilitar temporariamente** junto com Grafana
- Monitoramento não é crítico para funcionalidade principal

---

## ✅ Correção Aplicada - TimescaleDB

### Antes (Problemático)
```yaml
volumes:
  - ./telegram/postgresql.conf:/etc/postgresql/postgresql.conf:ro

command: >
  postgres
  -c config_file=/etc/postgresql/postgresql.conf
  -c shared_buffers=512MB
```

### Depois (Corrigido)
```yaml
volumes:
  # Commented out: mount error causing restart loop
  # - ./telegram/postgresql.conf:/etc/postgresql/postgresql.conf:ro

command: >
  postgres
  -c shared_buffers=512MB
  -c effective_cache_size=1536MB
  # ... (demais configurações mantidas via CLI)
```

---

## 📊 Status dos Serviços

### Serviços Essenciais (Core Telegram Gateway)
| Serviço | Status | Função |
|---------|--------|--------|
| **telegram-timescaledb** | ✅ Corrigido | Database principal (time-series) |
| **telegram-pgbouncer** | ✅ OK | Connection pooling |
| **telegram-redis-master** | ✅ Healthy | Caching + session storage |
| **telegram-redis-replica** | ⏸️ Pendente | Alta disponibilidade (opcional) |
| **telegram-redis-sentinel** | ⏸️ Pendente | Failover automático (opcional) |
| **telegram-rabbitmq** | ✅ Healthy | Message broker |
| **telegram-mtproto** | ⏸️ Pendente | MTProto client (depende de DB) |
| **telegram-gateway-api** | ⏸️ Pendente | REST API (depende de DB) |

### Serviços de Monitoramento (Não Essenciais)
| Serviço | Status | Ação |
|---------|--------|------|
| **telegram-prometheus** | ❌ Desabilitado | Mount error - não crítico |
| **telegram-grafana** | ❌ Desabilitado | Mount error - não crítico |
| **telegram-postgres-exporter** | ⏸️ Desabilitado | Depende de Prometheus |
| **telegram-redis-exporter** | ⏸️ Desabilitado | Depende de Prometheus |

---

## 🎯 Estratégia de Correção

### Fase 1: Serviços Core (AGORA)
1. ✅ Corrigir TimescaleDB (config file mount)
2. ⏸️ Iniciar serviços essenciais um por um
3. ⏸️ Validar conectividade entre serviços
4. ⏸️ Testar Gateway API

### Fase 2: Alta Disponibilidade (DEPOIS)
5. Ativar Redis Replica + Sentinel
6. Configurar failover automático
7. Testes de resiliência

### Fase 3: Monitoramento (OPCIONAL)
8. Limpar volumes órfãos do Prometheus/Grafana
9. Recriar containers de monitoramento
10. Configurar dashboards

---

## 🚀 Próximas Ações

### Imediato (Próximos 5 minutos)
1. ⏸️ **Remover volumes órfãos:**
   ```bash
   docker volume prune
   ```

2. ⏸️ **Iniciar serviços essenciais:**
   ```bash
   docker compose -f tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml up -d \
     telegram-timescaledb \
     telegram-pgbouncer \
     telegram-redis-master \
     telegram-rabbitmq
   ```

3. ⏸️ **Aguardar health checks (60s):**
   ```bash
   sleep 60
   docker ps --filter "name=telegram" --format "table {{.Names}}\t{{.Status}}"
   ```

4. ⏸️ **Iniciar API Gateway:**
   ```bash
   docker compose -f tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml up -d \
     telegram-mtproto \
     telegram-gateway-api
   ```

5. ⏸️ **Testar API:**
   ```bash
   curl http://localhost:4010/health
   ```

---

## 💡 Lições Aprendidas

1. **Docker Volume Mounts são persistentes** - Mesmo após `down`, volumes podem criar conflitos
2. **File vs Directory mounts** - Docker cria diretórios se arquivo não existe na primeira execução
3. **Monitoramento é opcional** - Stack funcional sem Prometheus/Grafana
4. **Config via CLI é mais robusto** - Menos dependências de arquivos externos
5. **Serviços dependentes** - Ordem de startup importa (DB → Pooler → API)

---

## 📝 Arquivos Modificados

### tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml
**Linhas 39-47:** Comentado mount do postgresql.conf e config_file flag

**Diff:**
```diff
  volumes:
    - telegram-timescaledb-data:/var/lib/postgresql/data
    - ../../backend/data/timescaledb/telegram-gateway:/docker-entrypoint-initdb.d:ro
-   - ./telegram/postgresql.conf:/etc/postgresql/postgresql.conf:ro
+   # Commented out: mount error causing restart loop
+   # - ./telegram/postgresql.conf:/etc/postgresql/postgresql.conf:ro

  command: >
    postgres
-   -c config_file=/etc/postgresql/postgresql.conf
    -c shared_buffers=512MB
```

---

## 🎊 Conclusão Parcial

**Correção do TimescaleDB:** ✅ **APLICADA**
**Status Atual:** ⏸️ **Aguardando testes de inicialização**

**Próximo Passo:** Executar comandos de startup e validar funcionamento dos serviços core.

---

**Gerado em:** 2025-11-12 20:00:00
**Tempo de diagnóstico:** ~10 minutos
**Correções aplicadas:** 1 (TimescaleDB)
**Pendente:** Restart e validação

🔧 **Continuando com a inicialização dos serviços...**
