# 🚀 FASE 2 & 3 - EXECUTION PLAN

**Date**: 2025-11-03  
**Status**: 🏃 **IN PROGRESS**

---

## 📋 **FASE 2: POPULAR QDRANT** (In Progress)

### Status Atual
- ✅ **Collection criada** (`documentation` - 384 dimensions, Cosine distance)
- 🏃 **Ingestão em andamento** (background process)
- ⏳ **Tempo estimado**: 5-10 minutos
- 📊 **Documentos a processar**: ~240 arquivos .md/.mdx

### Progresso
```bash
# Monitorar progresso:
docker logs -f rag-llamaindex-query

# Verificar vectors count:
curl -s http://localhost:6333/collections/documentation | \
  jq '{vectors_count: .result.vectors_count}'

# Health check:
curl -s http://localhost:8202/health | jq '.'
```

### Quando Completar
**Esperado**:
- ✅ Collection com 500-1000+ vectors
- ✅ Health check mostrando `collectionExists: true`
- ✅ Status: `"green"`

**Ação**:
```bash
# Run final load test
k6 run scripts/testing/load-test-rag-with-jwt.js --duration 3m --vus 50
```

**Resultado Esperado**:
- **P95**: 1-2ms (3-5x melhor que baseline!)
- **Throughput**: 40-70 req/s
- **Cache hit rate**: 70%+
- **Error rate**: < 1%

---

## 🎮 **FASE 3: GPU ACCELERATION** (Prepared)

### Pré-Requisitos

#### Hardware
- ✅ NVIDIA GPU (GTX 1660+, RTX 2060+, T4, A100, etc.)
- ✅ 6GB+ VRAM
- ✅ PCIe 3.0 x16 ou melhor

#### Software
```bash
# 1. NVIDIA Driver (525+)
sudo apt-get update
sudo apt-get install -y nvidia-driver-535
nvidia-smi  # Verify

# 2. NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] \
  https://nvidia.github.io/libnvidia-container/stable/deb/$(ARCH) /" | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# 3. Configure Docker
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# 4. Verify
docker run --rm --gpus all nvidia/cuda:12.2.0-base-ubuntu22.04 nvidia-smi
```

### Deployment

#### Script Criado
```bash
# Automated deployment
bash scripts/deployment/deploy-gpu-production.sh
```

**O script faz**:
1. ✅ Verifica GPU hardware
2. ✅ Verifica NVIDIA Container Toolkit
3. ✅ Para stack CPU-only
4. ✅ Inicia stack GPU
5. ✅ Aguarda inicialização (2 min)
6. ✅ Verifica GPU usage
7. ✅ Health checks

#### Manual Deployment
```bash
# Stop CPU stack
docker compose -f tools/compose/docker-compose.rag.yml down

# Start GPU stack
docker compose -f tools/compose/docker-compose.rag-gpu.yml up -d

# Wait for model preloading (2-3 minutes)
sleep 180

# Verify
docker exec rag-ollama-gpu nvidia-smi
curl -s http://localhost:8202/health | jq '.'
```

### Performance Esperada

#### CPU vs GPU Comparison
| Metric | CPU (Current) | GPU (Expected) | Improvement |
|--------|---------------|----------------|-------------|
| **P50** | 690µs | **< 200µs** | **3x faster** |
| **P90** | 966µs | **< 300µs** | **3x faster** |
| **P95** | 4.18ms | **< 500µs** | **8x faster!** |
| **P99** | 12ms | **< 2ms** | **6x faster** |
| **Throughput** | 22/s | **500-1000/s** | **25-45x faster!** |
| **Embedding** | 50-100ms | **5-10ms** | **10x faster** |
| **LLM Gen** | 2-5s | **200-500ms** | **10x faster** |

### Validation

#### Load Test
```bash
# Run with GPU
k6 run scripts/testing/load-test-rag-with-jwt.js --duration 3m --vus 50

# Expected results:
# - P95: < 0.5ms
# - Throughput: 500-1000 req/s
# - GPU Utilization: 60-90%
```

#### GPU Monitoring
```bash
# Real-time monitoring
watch -n 1 nvidia-smi

# Expected during load:
# - GPU Utilization: 60-90%
# - Memory Used: 4-8GB
# - Temperature: 60-80°C
```

---

## 📊 **PERFORMANCE ROADMAP SUMMARY**

### Current State (Fase 1 ✅)
```
P95: 4.18ms
Throughput: 22 req/s
Performance: +50% vs baseline
```

### With Data (Fase 2 🏃)
```
P95: 1-2ms (target)
Throughput: 40-70 req/s (target)
Performance: +300-500% vs baseline
```

### With GPU (Fase 3 📋)
```
P95: < 0.5ms (target)
Throughput: 500-1000 req/s (target)
Performance: +1000%+ vs baseline (10x+!)
```

---

## ✅ **CHECKLIST DE EXECUÇÃO**

### Fase 2: Dados
- [x] Collection criada
- [ ] Ingestão completa (in progress)
- [ ] Vectors count > 500
- [ ] Health check OK
- [ ] Load test executado
- [ ] Performance 3-5x validado

### Fase 3: GPU
- [x] GPU docker-compose criado
- [x] Deployment script criado
- [ ] NVIDIA driver instalado (requires hardware)
- [ ] NVIDIA Container Toolkit instalado
- [ ] GPU stack deployado
- [ ] Model preloading completo
- [ ] Load test executado
- [ ] Performance 10x+ validado

---

## 📁 **ARQUIVOS CRIADOS**

### Fase 2
- ✅ `scripts/rag/ingest-documents.py` - Ingestion script
- ✅ Collection 'documentation' no Qdrant

### Fase 3
- ✅ `tools/compose/docker-compose.rag-gpu.yml` - GPU stack
- ✅ `scripts/deployment/deploy-gpu-production.sh` - Deployment script
- ✅ `GPU-ACCELERATION-GUIDE.md` - Complete guide
- ✅ `PHASE-2-3-EXECUTION-PLAN.md` - This document

---

## 🎯 **PRÓXIMAS AÇÕES**

### Agora (Auto)
1. ⏳ Aguardar ingestão completar (5-10 min)
2. ✅ Verificar vectors count
3. ✅ Run load test
4. ✅ Validar performance 3-5x

### Quando Tiver GPU (Manual)
1. 📋 Instalar NVIDIA driver + toolkit
2. 📋 Executar `deploy-gpu-production.sh`
3. 📋 Run load test
4. 📋 Validar performance 10x+

---

## 📊 **EXPECTED TIMELINE**

```
Now:              Fase 2 in progress (10 min)
+10 min:          Fase 2 complete, load test
+15 min:          Performance 3-5x validated! ✅

With GPU:         Fase 3 deployment (15 min)
+GPU+15 min:      Performance 10x+ validated! ✅
```

---

## 🏆 **SUCCESS METRICS**

### Fase 2 Success
- ✅ P95 < 2ms
- ✅ Throughput > 40 req/s
- ✅ Cache hit rate > 70%
- ✅ Error rate < 1%

### Fase 3 Success
- ✅ P95 < 0.5ms
- ✅ Throughput > 500 req/s
- ✅ GPU utilization 60-90%
- ✅ Error rate < 1%

---

**Status**: 🏃 **Fase 2 executando, Fase 3 preparada!**  
**Next**: Aguardar ingestão completar (~5-10 min)

