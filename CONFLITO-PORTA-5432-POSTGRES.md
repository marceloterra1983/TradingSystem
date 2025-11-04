# ⚠️ Conflito Porta 5432 - PostgreSQL Nativo

**Date**: 2025-11-03  
**Problema**: Porta 5432 ocupada por PostgreSQL nativo  
**Status**: ⚠️ **REQUER SUDO**

---

## 🐛 **PROBLEMA**

```
Error: failed to bind host port for 0.0.0.0:5432 - address already in use
```

### **Causa**
Você tem um **PostgreSQL nativo** instalado no sistema que está usando a porta **5432** (porta padrão do PostgreSQL).

### **Conflito**
- PostgreSQL nativo → porta 5432
- data-timescale (Docker) → quer usar porta 5432

---

## 🔧 **SOLUÇÃO**

### **Opção 1: Parar PostgreSQL Nativo** (RECOMENDADO)

**Script criado**: `scripts/kill-postgres-nativo.sh`

```bash
sudo bash scripts/kill-postgres-nativo.sh
```

**O que faz**:
1. Para PostgreSQL via systemctl/service
2. Mata processos postgres se necessário
3. Libera porta 5432

**Depois execute**:
```bash
start
```

---

### **Opção 2: Mudar Porta do TimescaleDB** (ALTERNATIVA)

Se você **precisa** do PostgreSQL nativo rodando:

```bash
# Editar docker-compose.database.yml
# Mudar porta de 5432 para 5439

sed -i 's/"5432:5432"/"5439:5432"/' tools/compose/docker-compose.database.yml
```

**Pros**:
- ✅ PostgreSQL nativo continua rodando
- ✅ TimescaleDB usa porta diferente

**Contras**:
- ⚠️ Precisará atualizar `.env` com nova porta
- ⚠️ Pode quebrar outras dependências

---

## 💡 **RECOMENDAÇÃO**

**Use Opção 1** (Parar PostgreSQL nativo):

**Por quê?**:
1. ✅ TimescaleDB é mais completo (PostgreSQL + Time-series)
2. ✅ Já configurado no projeto
3. ✅ Integrado com outros serviços
4. ✅ Porta padrão 5432 facilita conexões

**PostgreSQL nativo provavelmente não está sendo usado**, então é seguro parar.

---

## 🚀 **EXECUTE AGORA**

```bash
# 1. Parar PostgreSQL nativo
sudo bash scripts/kill-postgres-nativo.sh

# 2. Iniciar TradingSystem completo
start

# 3. Resultado esperado:
#    ✅ DATABASE stack inicia (porta 5432)
#    ✅ APPS stack inicia
#    ✅ DOCS stack inicia
#    ✅ TUDO funcionando!
```

---

## ✅ **PROGRESSO ATUAL**

### **Fases Completas**

- ✅ Fase 1: Portas DATABASE remapeadas
- ✅ Fase 2: DOCS build corrigido
- ✅ Fase 3: APPS build corrigido
- ✅ Fase 4: Todos os stacks habilitados
- ⏳ Fase 5: **Teste completo** (aguardando liberar porta 5432)
- ⏳ Fase 6: Validação health

---

## 📋 **PRÓXIMO PASSO**

**Execute este comando** (requer sua senha sudo):

```bash
sudo bash scripts/kill-postgres-nativo.sh
```

**Depois**:

```bash
start
```

**E TUDO vai funcionar!** 🚀

---

**Estamos a 1 comando de distância de ter TUDO funcionando!**

