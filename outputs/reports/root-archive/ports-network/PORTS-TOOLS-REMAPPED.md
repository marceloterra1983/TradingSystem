# 🔧 Portas Remapeadas - TOOLS Stack

**Date**: 2025-11-03  
**Reason**: Conflitos com containers órfãos/processos nativos  

---

## ⚠️ AÇÃO NECESSÁRIA ANTES DE RESTART

**Execute com sudo**:
```bash
sudo bash scripts/maintenance/ports/kill-docker-proxy-8111.sh
```

**O que faz**:
- Mata processos `docker-proxy` órfãos nas portas 8111 e 8200
- PIDs: 5892, 5899, 667324, 667335

---

## 🔧 Portas Remapeadas

### **ANTES** ❌
```yaml
tools-agno-agents:  8200:8200
tools-langgraph:    8111:8111
```

### **DEPOIS** ✅
```yaml
tools-agno-agents:  8204:8200  # Host 8204 → Container 8200
tools-langgraph:    8115:8111  # Host 8115 → Container 8111
```

---

## 🌐 Novos Acessos

### **TOOLS Stack**
```
http://localhost:8204  ← Agno Agents API (MUDOU!)
http://localhost:8115  ← LangGraph API (MUDOU!)
http://localhost:8100  ← Kestra UI (mantido)
```

---

## 📝 Passos para Finalizar

1. **Execute o script sudo**:
   ```bash
   sudo bash scripts/maintenance/ports/kill-docker-proxy-8111.sh
   ```

2. **Reinicie o TOOLS stack**:
   ```bash
   docker compose -f tools/compose/docker-compose.tools.yml down
   docker compose -f tools/compose/docker-compose.tools.yml up -d
   ```

3. **Verifique status**:
   ```bash
   docker ps --filter "name=tools-"
   ```

---

## ✅ Status Esperado

```
tools-agno-agents       Up (healthy)   8204:8200
tools-langgraph         Up (healthy)   8115:8111
tools-kestra            Up (healthy)   8100:8080
tools-kestra-postgres   Up (healthy)   5432
```

**Total**: 4 containers TOOLS

