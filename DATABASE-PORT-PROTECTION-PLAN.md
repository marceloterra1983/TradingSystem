# 🛡️ Plano de Proteção dos Databases

**Date**: 2025-11-03 13:10 BRT  
**Objetivo**: **PROTEGER DATABASES DE CONFLITOS E PERDA DE DADOS**  

---

## ⚠️ PROBLEMA IDENTIFICADO

### **Situação Atual**
```
❌ Portas espalhadas (5432, 5433, 5437, 5438, 6333, 9001, etc.)
❌ Conflitos causam restart dos containers
❌ Restart pode causar perda de dados
❌ Não há faixa dedicada para databases
```

### **Risco**
- Conflitos de porta → Containers reiniciam
- Reinicialização → Dados podem ser perdidos
- Sem convenção → Difícil prevenir conflitos

---

## ✅ SOLUÇÃO PROPOSTA

### **1. Faixa de Portas Dedicada: 7000-7999**

**EXCLUSIVA PARA DATABASES E STACK DATA**

```
FAIXA: 7000-7999 (1000 portas)
USO: Databases, UIs de dados, exporters
BENEFÍCIO: Zero conflito com apps/serviços
```

### **2. Nova Convenção de Portas**

| Serviço | Porta ATUAL | Porta NOVA | Tipo |
|---------|-------------|------------|------|
| **TimescaleDB** | 5432 | **7000** | Database |
| **TimescaleDB Backup** | 5437 | **7001** | Database |
| **PostgreSQL LangGraph** | 5438 | **7002** | Database |
| **Kong DB** | 5433 | **7003** | Database |
| **QuestDB** | 9001 | **7010** | Database |
| **QuestDB HTTP** | 9010 | **7011** | Query API |
| **QuestDB ILP** | 8814 | **7012** | Ingestion |
| **Qdrant** | 6333 | **7020** | Vector DB |
| **Qdrant gRPC** | 6334 | **7021** | gRPC |
| **Redis** | 6380 | **7030** | Cache |
| **PgAdmin** | 5051 | **7100** | UI |
| **Adminer** | 8082 | **7101** | UI |
| **PgWeb** | 8083 | **7102** | UI |
| **Prometheus Exporter** | 9188 | **7200** | Metrics |

### **3. Proteção de Dados com Volumes Nomeados**

**Volumes Docker garantem persistência TOTAL:**
```yaml
volumes:
  data-timescale-data:     # Dados nunca são perdidos
  data-questdb-data:       # Mesmo recriando container
  data-qdrant-storage:     # Dados permanecem
  data-postgres-langgraph: # 100% persistente
```

**IMPORTANTE**: Dados só são perdidos se você:
- Executar `docker volume rm`
- Executar `docker volume prune -f`
- Deletar volume manualmente

---

## 🔧 IMPLEMENTAÇÃO

### **Fase 1: Backup Preventivo** (CRÍTICO!)

```bash
# 1. Backup de TODOS os databases
bash scripts/database/backup-all-databases.sh

# 2. Backup de volumes Docker
bash scripts/database/backup-docker-volumes.sh
```

### **Fase 2: Atualizar Portas**

```bash
# 1. Parar databases
docker compose -f tools/compose/docker-compose.database.yml down

# 2. Aplicar novo docker-compose.database.yml (com portas 7000+)
docker compose -f tools/compose/docker-compose.database.yml up -d

# 3. Verificar volumes (DADOS INTACTOS)
docker volume ls | grep data-
```

### **Fase 3: Atualizar .env**

```bash
# Atualizar .env com novas portas
TIMESCALEDB_PORT=7000
QUESTDB_HTTP_PORT=7010
QDRANT_HTTP_PORT=7020
REDIS_PORT=7030
```

### **Fase 4: Atualizar Apps**

```bash
# Reiniciar apps que conectam aos databases
docker compose -f tools/compose/docker-compose.apps.yml restart
```

---

## 🛡️ PROTEÇÃO PERMANENTE

### **1. Volumes Docker Nomeados** ✅ (JÁ IMPLEMENTADO)

**STATUS ATUAL**: ✅ DATABASES JÁ USAM VOLUMES NOMEADOS!

```yaml
# Exemplo do docker-compose.database.yml
volumes:
  data-timescale-data:
    name: data-timescale-data
    driver: local
  data-questdb-data:
    name: data-questdb-data
    driver: local
```

**BENEFÍCIO**: 
- Dados persistem mesmo recriando containers
- Só são perdidos se deletar volume manualmente
- Sobrevivem a conflitos de porta

### **2. Backup Automático Diário**

```bash
# Cron job para backup automático
0 2 * * * /home/marce/Projetos/TradingSystem/scripts/database/backup-all-databases.sh
```

### **3. Health Checks Aprimorados**

```yaml
healthcheck:
  test: ["CMD", "pg_isready", "-U", "timescale"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

### **4. Restart Policy**

```yaml
restart: unless-stopped  # Sempre reinicia automaticamente
```

### **5. Resource Limits (Prevenir OOM)**

```yaml
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '2'
    reservations:
      memory: 1G
      cpus: '1'
```

---

## 📋 CONVENÇÃO DE PORTAS (TODAS)

### **Faixa 7000-7999: DATABASES & DATA** 🔒
```
7000-7099: Databases primários
7100-7199: UIs de databases
7200-7299: Exporters e métricas de dados
7300-7399: Backup e replicação
7400-7999: Reservado para expansão
```

### **Faixa 3000-3999: FRONTEND & APIS**
```
3000-3199: Frontend apps
3200-3399: Backend APIs
3400-3599: Documentation
3600-3999: Serviços auxiliares
```

### **Faixa 4000-4999: SERVICES**
```
4000-4099: Trading services
4100-4199: Analytics
4200-4299: Ingestion
```

### **Faixa 8000-8999: TOOLS & INFRA**
```
8000-8099: Kong, Gateways
8100-8199: LlamaIndex, AI tools
8200-8299: RAG services
8300-8399: Monitoring
```

### **Faixa 9000-9999: MONITORING**
```
9000-9099: Prometheus
9100-9199: Grafana
9200-9299: Alertmanager
```

---

## 🚀 MIGRAÇÃO PASSO A PASSO

### **Etapa 1: Verificação Atual**
```bash
# Ver databases rodando
docker ps --filter "name=data-"

# Ver volumes (DADOS ESTÃO AQUI!)
docker volume ls | grep data-

# Ver tamanho dos dados
docker system df -v | grep "data-"
```

### **Etapa 2: Backup Completo**
```bash
# Backup databases
docker exec data-timescale pg_dumpall -U timescale > backup-timescale.sql
docker exec data-questdb tar czf - /root/.questdb/db > backup-questdb.tar.gz

# Backup volumes (IMPORTANTE!)
docker run --rm -v data-timescale-data:/data -v $(pwd):/backup alpine tar czf /backup/timescale-volume-backup.tar.gz /data
```

### **Etapa 3: Aplicar Novo docker-compose**
```bash
# Parar databases
docker compose -f tools/compose/docker-compose.database.yml down

# Aplicar novo compose (portas 7000+)
# (arquivo será atualizado)
docker compose -f tools/compose/docker-compose.database.yml up -d
```

### **Etapa 4: Atualizar .env**
```bash
# Atualizar automaticamente
sed -i 's/TIMESCALEDB_PORT=5432/TIMESCALEDB_PORT=7000/g' .env
sed -i 's/QUESTDB_HTTP_PORT=9001/QUESTDB_HTTP_PORT=7010/g' .env
sed -i 's/QDRANT_HTTP_PORT=6333/QDRANT_HTTP_PORT=7020/g' .env
```

### **Etapa 5: Reiniciar Apps**
```bash
# Apps que conectam aos databases
docker compose -f tools/compose/docker-compose.apps.yml restart
docker compose -f tools/compose/docker-compose.rag.yml restart
```

### **Etapa 6: Validar**
```bash
# Testar conexões
curl http://localhost:7000  # TimescaleDB
curl http://localhost:7010  # QuestDB
curl http://localhost:7020/collections  # Qdrant

# Testar apps
curl http://localhost:3201/health  # Workspace
curl http://localhost:4006/health  # TP Capital
```

---

## 🎯 BENEFÍCIOS

### **Antes** ❌
```
❌ Portas espalhadas
❌ Conflitos frequentes
❌ Risco de perda de dados
❌ Difícil gerenciar
```

### **Depois** ✅
```
✅ Faixa dedicada (7000-7999)
✅ Zero conflitos com apps
✅ Dados 100% protegidos (volumes)
✅ Fácil identificar databases (porta 7xxx)
✅ Convenção clara
```

---

## ⚠️ IMPORTANTE: DADOS JÁ ESTÃO PROTEGIDOS!

**BOA NOTÍCIA**: Seus databases **JÁ USAM VOLUMES NOMEADOS**!

```bash
# Ver volumes
$ docker volume ls | grep data-
data-postgres-langgraph-data
data-questdb-data
data-qdrant-storage
data-timescale-data
```

**Isso significa**:
- ✅ Dados **NÃO são perdidos** ao recriar containers
- ✅ Dados **PERSISTEM** em conflitos de porta
- ✅ Apenas um `docker compose down` + `up` **MANTÉM TODOS OS DADOS**

**Você só perde dados se**:
```bash
docker volume rm data-timescale-data  # ❌ NÃO FAZER!
docker volume prune -f                # ❌ NÃO FAZER!
```

---

## 📝 PRÓXIMOS PASSOS

1. ✅ **Backup preventivo** (antes de qualquer mudança)
2. ✅ **Criar novo docker-compose.database.yml** (portas 7000+)
3. ✅ **Atualizar .env** (novas portas)
4. ✅ **Migrar databases** (down → up)
5. ✅ **Atualizar apps** (restart)
6. ✅ **Validar tudo** (health checks)
7. ✅ **Documentar convenção** (PORTS-CONVENTION.md)

---

## ✅ CONCLUSÃO

**SOLUÇÃO COMPLETA**:
1. 🔒 **Faixa 7000-7999 exclusiva para databases**
2. 🛡️ **Volumes nomeados garantem persistência**
3. 💾 **Backup automático diário**
4. 📊 **Convenção clara de portas**
5. ✅ **Zero conflitos, zero perda de dados**

**Quer que eu implemente agora?**
```bash
# Comando único para migrar tudo
bash scripts/database/migrate-to-protected-ports.sh
```

