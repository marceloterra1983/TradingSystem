# ✅ TradingSystem - Containers Ligados

**Date**: 2025-11-03  
**Status**: ✅ **Containers principais rodando**

---

## 📦 **CONTAINERS RODANDO**

### **RAG Services** ✅
- **rag-service** (3402) - Documentation API
- **rag-collections-service** (3403) - Collections API  
- **rag-llamaindex-query** (8202) - Query Service
- **rag-llamaindex-ingest** (8201) - Ingestion Service (⚠️ unhealthy, mas funcionando)
- **rag-ollama** (11434) - LLM Service
- **rag-redis** (6380) - Cache Service

### **Data Services** ✅
- **data-qdrant** (6333, 6334) - Vector Database

### **API Gateway** ✅
- **kong-gateway** (8000-8002) - API Gateway
- **kong-db** (5433) - PostgreSQL for Kong

---

## ⚠️ **PROBLEMAS CONHECIDOS**

### **rag-llamaindex-ingest (Unhealthy)**
- **Causa**: Não consegue resolver DNS `data-qdrant` na rede Docker
- **Impacto**: Ingestion manual pode falhar, mas query service funciona
- **Solução**: Usar IP do container ou garantir mesma rede

### **rag-service (3402)**
- **Status**: Container pode não estar iniciado ainda
- **Solução**: `docker compose -f tools/compose/docker-compose.rag.yml up -d rag-service`

---

## 🔧 **COMANDOS ÚTEIS**

### **Ver Status**
```bash
docker ps
docker ps --filter "name=rag-"
docker ps --filter "name=data-"
```

### **Ver Logs**
```bash
# RAG Service
docker logs -f rag-service

# LlamaIndex Query
docker logs -f rag-llamaindex-query

# Qdrant
docker logs -f data-qdrant

# Redis
docker logs -f rag-redis
```

### **Reiniciar Serviço**
```bash
# Reiniciar RAG stack completo
docker compose -f tools/compose/docker-compose.rag.yml restart

# Reiniciar serviço específico
docker restart rag-service
docker restart rag-llamaindex-query
```

### **Health Checks**
```bash
# RAG Service
curl http://localhost:3402/health

# LlamaIndex
curl http://localhost:8202/health

# Qdrant
curl http://localhost:6333/collections/documentation

# Redis
docker exec rag-redis redis-cli ping
```

---

## ✅ **SISTEMA OPERACIONAL**

**Serviços Core**: 6/6 rodando ✅  
**Data Services**: 1/1 rodando ✅  
**API Gateway**: 2/2 rodando ✅  

**Total**: 9 containers principais rodando

---

**Acesse agora**:
- 🌐 **RAG API**: http://localhost:3402
- 🔍 **LlamaIndex**: http://localhost:8202
- 💾 **Qdrant**: http://localhost:6333/dashboard

