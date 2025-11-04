# 📋 Serviços Telegram & Status no `start`

**Date**: 2025-11-03  
**Question**: "Os serviços do telegram e status estão iniciando no comando start?"

---

## ✅ RESPOSTA: SIM, ESTÃO DEFINIDOS!

**Configuração**: `SKIP_SERVICES=false` (por padrão)

Os serviços **Node.js** são iniciados automaticamente pelo comando `start`, a menos que você use `--skip-services`.

---

## 📋 SERVIÇOS DEFINIDOS

### **1. Telegram Gateway** ✅
```yaml
Nome: telegram-gateway
Path: apps/telegram-gateway
Porta: 4006
Comando: npm run dev
Status Atual: ✅ RODANDO (processo ativo)
```

**Processo**:
```
marce  15180  node .../nodemon src/index.js
```

---

### **2. Telegram Gateway API** ⚠️
```yaml
Nome: telegram-gateway-api
Path: backend/api/telegram-gateway
Porta: 4010
Comando: npm run dev
Dependência: telegram-gateway
Status Atual: ❓ DEFINIDO (não verificado)
```

**Nota**: Este serviço depende do `telegram-gateway` estar rodando primeiro.

---

### **3. Status API** ❓
```yaml
Nome: status
Path: apps/status
Porta: 3500
Comando: npm start
Status Atual: ❓ DEFINIDO mas não rodando
```

**Observação**: 
- Definido em `start.sh` como `apps/status`
- Pode ser o **Service Launcher** antigo
- Porta 3500 não está respondendo no momento

---

## ⚙️ COMO FUNCIONAM NO `start`

### **Comportamento Padrão**
```bash
# Inicia TUDO (Docker + Node.js services)
start

# Inicia APENAS Docker (skip Node.js)
start --skip-services

# Inicia APENAS serviços específicos
start telegram-gateway
start status
```

---

## 🔍 STATUS ATUAL

### **Rodando**
```
✅ telegram-gateway (porta 4006)
   • Processo ativo desde Nov02
   • 1 processo Node.js
```

### **Não Verificados**
```
⚠️  telegram-gateway-api (porta 4010)
   • Definido mas não confirmado

❓ status/Service Launcher (porta 3500)
   • Porta não responde
   • Pode não ter iniciado corretamente
```

---

## 🧪 TESTE: Iniciar do Zero

### **1. Parar Tudo**
```bash
stop
```

### **2. Iniciar com Logs**
```bash
start
```

### **3. Verificar Status**
```bash
# Ver processos Node.js
ps aux | grep -E "telegram|4006|4010|3500" | grep -v grep

# Testar endpoints
curl http://localhost:4006/health  # Telegram Gateway
curl http://localhost:4010/health  # Telegram API
curl http://localhost:3500/health  # Status API
```

---

## 📝 DEFINIÇÕES NO `start.sh`

```bash
# Linha 85-90 em scripts/start.sh
["telegram-gateway"]="apps/telegram-gateway:4006:npm run dev:::3"
["telegram-gateway-api"]="backend/api/telegram-gateway:4010:npm run dev::telegram-gateway:3"
["status"]="apps/status:3500:npm start:::2"
```

**Formato**:
```
[nome]="path:porta:comando:dependência:prioridade"
```

---

## ⚠️ POSSÍVEIS PROBLEMAS

### **1. Status API (3500) não inicia**
- **Causa**: `apps/status` pode estar incompleto ou desatualizado
- **Solução**: Verificar se `apps/status/package.json` existe e está correto

### **2. Telegram Gateway API (4010) depende do Gateway (4006)**
- **Causa**: Se o Gateway não iniciar, a API falha
- **Solução**: Garantir que `telegram-gateway` inicia primeiro (já configurado)

---

## ✅ CONCLUSÃO

**SIM, os serviços estão configurados para iniciar automaticamente no `start`:**

1. ✅ **telegram-gateway** (4006) - RODANDO
2. ⚠️ **telegram-gateway-api** (4010) - DEFINIDO
3. ❓ **status** (3500) - DEFINIDO mas não confirmado

**Para garantir que TODOS iniciem**:
```bash
# Parar tudo
stop

# Iniciar tudo
start

# Aguardar 30s e verificar
sleep 30
curl http://localhost:4006/health
curl http://localhost:4010/health
curl http://localhost:3500/health
```

---

## 🔧 DESABILITAR SERVIÇOS NODE.JS

Se você NÃO quer que iniciem:
```bash
start --skip-services
```

Ou edite `scripts/start.sh`:
```bash
SKIP_SERVICES=true  # Linha 61
```

