# ⚠️ Problema: Porta 5050 Ocupada

**Date**: 2025-11-03  
**Status**: ⚠️ **Porta ocupada impede pgAdmin de iniciar**

---

## ✅ **ÓTIMA NOTÍCIA: Script v3 Funcionou!**

O script de conflitos de containers foi **100% resolvido**:
```
[INFO] Container data-qdrant already running (standalone), skipping in compose
[WARNING] Removing stopped standalone container: data-questdb
[WARNING] Removing stopped standalone container: data-timescale
[WARNING] Removing stopped standalone container: data-timescale-backup
[WARNING] Removing stopped standalone container: data-timescale-pgadmin
[WARNING] Removing stopped standalone container: data-postgres-langgraph
[INFO] Excluding services from compose: qdrant
✅ Containers removidos corretamente!
✅ Qdrant excluído do compose corretamente!
```

**Problema de conflito de containers: RESOLVIDO!** 🎉

---

## ⚠️ **NOVO PROBLEMA: Porta Ocupada**

```
Error: failed to bind host port for 0.0.0.0:5050 - address already in use
```

### **O Que Aconteceu**
- ✅ Containers foram tratados corretamente (v3 funcionou!)
- ⚠️ Mas a porta **5050** (pgAdmin) já está ocupada por outro processo/container
- ❌ Isso impede o `data-timescale-pgadmin` de iniciar

### **Por Que Aconteceu**
- Provavelmente há um container ou processo anterior usando porta 5050
- Pode ser um pgAdmin de uma sessão anterior
- Ou outro serviço que usa essa porta

---

## 🔧 **SOLUÇÃO**

### **Opção 1: Liberar a Porta Manualmente**

```bash
# 1. Verificar o que está usando a porta
lsof -i:5050

# 2. Matar o processo (substitua PID pelo número real)
sudo kill -9 <PID>

# 3. Ou usar o script criado:
sudo bash scripts/liberar-porta-5050.sh

# 4. Depois rodar start novamente
start
```

### **Opção 2: Usar --force-kill no Script Start**

O script `start` já tem um flag `--force-kill` que mata processos em portas ocupadas:

```bash
start --force-kill
```

**PORÉM**, isso atualmente só cobre as portas 4005 e 3200. Precisaríamos expandir para incluir 5050.

---

## 🎯 **RECOMENDAÇÃO IMEDIATA**

### **Execute Este Comando**

```bash
# Liberar porta 5050
sudo bash scripts/liberar-porta-5050.sh

# Depois rodar start
start
```

### **Resultado Esperado**
```
✅ Porta 5050 livre!
✅ DATABASE stack inicia completamente
✅ TODOS os 9 serviços rodando (incluindo pgAdmin)
```

---

## 📊 **STATUS ATUAL DO SISTEMA**

### **✅ Serviços Rodando (9)**
- rag-collections-service (3403) ✅
- data-qdrant (6333) ✅
- rag-service (3402) ✅
- rag-llamaindex-ingest (8201) ✅
- rag-llamaindex-query (8202) ✅
- rag-ollama (11434) ✅
- kong-gateway (8000) ✅
- kong-db (5433) ✅
- rag-redis (6380) ✅

### **⚠️ DATABASE Stack (Parcial)**
- QuestDB: Iniciando...
- TimescaleDB: Iniciando...
- pgAdmin: ❌ Bloqueado (porta 5050 ocupada)

---

## 🚀 **PRÓXIMOS PASSOS**

1. **Liberar porta 5050** (executar script com sudo)
2. **Rodar `start` novamente**
3. **Verificar que tudo iniciou**

---

## 💡 **MELHORIA FUTURA PARA O SCRIPT**

Adicionar verificação de portas DATABASE no script `start.sh`:

```bash
# Portas a verificar antes de iniciar DATABASE stack
DB_PORTS=(5050 5433 5434 5435 8812)

if [ "$FORCE_KILL" = true ]; then
    for port in "${DB_PORTS[@]}"; do
        if port_in_use "$port"; then
            log_warning "Killing process on port $port (--force-kill)"
            kill_port "$port"
        fi
    done
fi
```

Isso pode ser adicionado em uma v4 do script.

---

## ✅ **RESUMO**

**Problema de Containers**: ✅ **RESOLVIDO** (v3 funcionou perfeitamente!)  
**Problema de Portas**: ⚠️ **Porta 5050 ocupada** (fácil de resolver)

**Execute agora**:
```bash
sudo bash scripts/liberar-porta-5050.sh
start
```

---

**O script v3 está funcionando corretamente!** 🎉

Só precisamos liberar a porta 5050 e tudo vai rodar.

