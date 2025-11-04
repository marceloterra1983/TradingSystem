# 📊 Convenção de Portas - TradingSystem

**Date**: 2025-11-03  
**Status**: ✅ **IMPLEMENTADO**  

---

## 🎯 OBJETIVO

**Prevenir conflitos e PROTEGER DATABASES com faixas dedicadas de portas.**

---

## 🔒 FAIXA 7000-7999: DATABASES & DATA (PROTEGIDA!)

### **Databases Primários (7000-7099)**
| Porta | Serviço | Uso |
|-------|---------|-----|
| **7000** | TimescaleDB | Database principal |
| **7001** | TimescaleDB Backup | Réplica/backup |
| **7002** | PostgreSQL LangGraph | LangGraph data |
| **7003** | Kong DB | Kong PostgreSQL |
| **7010** | QuestDB | Time-series DB |
| **7011** | QuestDB HTTP | Query API |
| **7012** | QuestDB ILP | Ingestion |
| **7020** | Qdrant | Vector database |
| **7021** | Qdrant gRPC | gRPC API |
| **7030** | Redis | Cache |

### **UIs de Databases (7100-7199)**
| Porta | Serviço | Acesso |
|-------|---------|--------|
| **7100** | PgAdmin | http://localhost:7100 |
| **7101** | Adminer | http://localhost:7101 |
| **7102** | PgWeb | http://localhost:7102 |

### **Exporters & Métricas (7200-7299)**
| Porta | Serviço | Uso |
|-------|---------|-----|
| **7200** | TimescaleDB Exporter | Prometheus metrics |

### **Backup & Replicação (7300-7399)**
| Porta | Serviço | Uso |
|-------|---------|-----|
| 7300+ | Reservado | Futura expansão |

---

## 🌐 FAIXA 3000-3999: FRONTEND & APIS

### **Frontend Apps (3000-3199)**
| Porta | Serviço | Acesso |
|-------|---------|--------|
| **3103** | Dashboard | http://localhost:3103 |

### **Backend APIs (3200-3399)**
| Porta | Serviço | Acesso |
|-------|---------|--------|
| **3201** | Workspace API | http://localhost:3201 |

### **Documentation (3400-3599)**
| Porta | Serviço | Acesso |
|-------|---------|--------|
| **3404** | Docs Hub | http://localhost:3404 |
| **3405** | Docs API | http://localhost:3405 |

### **Serviços Auxiliares (3600-3799)**
| Porta | Serviço | Acesso |
|-------|---------|--------|
| **3600** | Firecrawl Proxy | http://localhost:3600 |

---

## 🔧 FAIXA 4000-4999: SERVICES

### **Trading Services (4000-4099)**
| Porta | Serviço | Acesso |
|-------|---------|--------|
| **4006** | TP Capital | http://localhost:4006 |
| **4010** | Telegram Gateway API | http://localhost:4010 |

---

## 🤖 FAIXA 8000-8999: TOOLS & INFRA

### **Kong & Gateways (8000-8099)**
| Porta | Serviço | Acesso |
|-------|---------|--------|
| **8000** | Kong API | http://localhost:8000 |
| **8001** | Kong Admin | http://localhost:8001 |

### **LlamaIndex & AI (8100-8299)**
| Porta | Serviço | Acesso |
|-------|---------|--------|
| **8115** | LangGraph | http://localhost:8115 |
| **8201** | LlamaIndex Ingest | http://localhost:8201 |
| **8202** | LlamaIndex Query | http://localhost:8202 |
| **8204** | Agno Agents | http://localhost:8204 |

---

## 📊 FAIXA 9000-9999: MONITORING

### **Prometheus & Grafana (9000-9199)**
| Porta | Serviço | Acesso |
|-------|---------|--------|
| **9091** | Prometheus | http://localhost:9091 |
| **3104** | Grafana | http://localhost:3104 |

---

## 🛡️ PROTEÇÃO DE DADOS

### **Volumes Docker Nomeados** ✅
```yaml
volumes:
  data-timescale-data:
  data-questdb-data:
  data-qdrant-storage:
  data-postgres-langgraph:
  data-redis:
```

**BENEFÍCIO**: Dados NUNCA são perdidos ao recriar containers!

### **Restart Policy** ✅
```yaml
restart: unless-stopped
```

### **Health Checks** ✅
```yaml
healthcheck:
  test: ["CMD", "pg_isready"]
  interval: 10s
  retries: 5
```

---

## 🚀 MIGRAÇÃO

### **Script Automático**
```bash
bash scripts/database/migrate-to-protected-ports.sh
```

### **Manual**
```bash
# 1. Backup
docker exec data-timescale pg_dumpall -U timescale > backup.sql

# 2. Parar databases
docker compose -f tools/compose/docker-compose.database.yml down

# 3. Atualizar portas no docker-compose.database.yml

# 4. Reiniciar
docker compose -f tools/compose/docker-compose.database.yml up -d
```

---

## ✅ BENEFÍCIOS

### **Antes** ❌
```
❌ Portas espalhadas
❌ Conflitos frequentes
❌ Risco de perda de dados
```

### **Depois** ✅
```
✅ Faixa dedicada (7000-7999)
✅ Zero conflitos
✅ Dados 100% protegidos
✅ Fácil identificar databases
```

---

## 📝 REGRAS

1. **7000-7999**: APENAS databases e dados
2. **Volumes nomeados**: OBRIGATÓRIO para databases
3. **restart: unless-stopped**: OBRIGATÓRIO
4. **Health checks**: OBRIGATÓRIO
5. **Backups diários**: RECOMENDADO

---

**🔒 DATABASES PROTEGIDOS, DADOS SEGUROS! 🔒**

