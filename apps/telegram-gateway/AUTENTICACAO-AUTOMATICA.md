# Autenticação Automática do Telegram Gateway

## 🎯 Como Funciona

O script `start.sh` agora detecta automaticamente quando o Telegram Gateway precisa de autenticação e inicia o processo interativo para você!

---

## 🚀 Fluxo Automático

### 1. Você executa:
```bash
bash scripts/universal/start.sh
```

### 2. O script verifica (em ordem):

#### Cenário A: Gateway já está rodando
- ✅ Gateway está rodando?
- ✅ Telegram está conectado?
- ❌ Se Telegram **desconectado**: Para o Gateway e vai para autenticação

#### Cenário B: Gateway não está rodando
- ✅ Verifica se existe sessão salva (`.session/`)
- ❌ Se **não existe sessão**: Vai para autenticação
- ✅ Se **existe sessão**: Inicia Gateway normalmente

### 3. Se autenticação for necessária:

O script automaticamente:
1. **Para o Gateway (se estiver rodando)**
2. **Verifica se sessão existe (se Gateway não estava rodando)**
3. **Inicia o processo de autenticação interativa**
4. **Mostra instruções claras**
5. **Aguarda você digitar o código SMS**
6. **Após autenticação (Ctrl+C), reinicia o Gateway em background**
7. **Continua com o resto do startup (Docker, APIs, etc.)**

---

## 📱 O Que Você Precisa Fazer

### Quando Solicitar o Código:

```
════════════════════════════════════════════
  Telegram Authentication Required
════════════════════════════════════════════

You will receive an SMS code on: +55 67 99190-8000

Starting interactive authentication...
Please enter the code when prompted.

? Please enter the code you received: _
```

**Passos:**
1. ✅ Verifique o SMS no celular (+55 67 99190-8000)
2. ✅ Digite o código de 5 dígitos
3. ✅ Aguarde ver: `[INFO] - Signed in successfully as Marcelo Terra`
4. ✅ Pressione `Ctrl+C`

**O script continua automaticamente após você pressionar Ctrl+C!**

---

## ✅ Após Autenticação Bem-Sucedida

O script automaticamente:
```
✓ Authentication process completed
✓ Session saved successfully
→ Continuing with system startup...

  Restarting Gateway in background...
  ✓ Gateway restarted (PID: 12345)
  ✓ Telegram connected successfully
```

E continua iniciando os outros serviços (Docker containers, Dashboard, etc.)

---

## 🔄 Comportamento em Diferentes Cenários

### Cenário 1: Telegram Já Autenticado
```bash
bash scripts/universal/start.sh
```
**Resultado:**
- ✅ Gateway inicia normalmente
- ✅ Detects sessão salva
- ✅ Conecta automaticamente
- ✅ Sem interação necessária

---

### Cenário 2: Primeira Vez / Sessão Expirada
```bash
bash scripts/universal/start.sh
```
**Resultado:**
- ⚠️ Gateway detecta que Telegram está desconectado
- 📱 Inicia processo de autenticação interativa
- ⏸️ **PAUSA** para você digitar o código
- ✅ Após Ctrl+C, reinicia automaticamente
- ✅ Continua com o startup

---

### Cenário 3: Após `stop` (Gateway foi morto)
```bash
bash scripts/universal/stop.sh
# ... (Gateway é parado)

bash scripts/universal/start.sh
```
**Resultado:**
- ✅ Se a sessão ainda existe: conecta automaticamente
- ⚠️ Se a sessão foi limpa: pede autenticação interativa

---

## 🛠️ Verificação Manual

Se quiser verificar o status do Telegram sem iniciar todo o sistema:

```bash
# Verificar se está conectado
curl http://localhost:4006/health | jq '.telegram'

# Resultado esperado (conectado):
"connected"

# Resultado esperado (desconectado):
"disconnected"
```

---

## 🔑 Localização da Sessão

A sessão autenticada é salva automaticamente em:
```
/home/marce/Projetos/TradingSystem/apps/telegram-gateway/.session/telegram-gateway/
```

**IMPORTANTE:**
- ✅ **Não delete esta pasta!** Ela contém sua autenticação
- ✅ A sessão persiste automaticamente entre restarts
- ✅ Só precisa autenticar uma vez (até expirar ou ser deletada)
- ✅ **Nova versão:** Usa `StoreSession` para persistência automática (não precisa mais copiar string para .env)

---

## ⚠️ Problemas Comuns

### Problema 1: Código SMS não chega

**Solução:**
1. Verifique se o celular está ligado (+55 67 99190-8000)
2. Aguarde até 2 minutos
3. Tente reiniciar o processo (Ctrl+C e `start.sh` novamente)

---

### Problema 2: Código inválido (PHONE_CODE_INVALID)

**Causa:** Código expirou (1-2 minutos)

**Solução:**
1. Pressione Ctrl+C
2. Execute `bash scripts/universal/start.sh` novamente
3. Digite o código **imediatamente** quando receber

---

### Problema 3: Gateway não conecta após autenticação

**Diagnóstico:**
```bash
# Verificar logs
tail -100 logs/services/telegram-gateway.log

# Verificar saúde
curl http://localhost:4006/health | jq
```

**Solução:**
```bash
# Parar e reiniciar
bash scripts/universal/stop.sh
bash scripts/universal/start.sh
```

---

## 📊 Logs

Todos os logs são salvos em:
```
/home/marce/Projetos/TradingSystem/logs/services/telegram-gateway.log
```

Para acompanhar em tempo real:
```bash
tail -f logs/services/telegram-gateway.log
```

---

## 🎯 Resumo

### Autenticação é Automática! ✅

Você **não precisa** rodar scripts separados. Apenas:

```bash
bash scripts/universal/start.sh
```

**O script detecta e pede autenticação quando necessário!**

### Você só precisa:
1. ✅ Verificar o SMS quando solicitado
2. ✅ Digitar o código
3. ✅ Pressionar Ctrl+C após ver "Signed in successfully"

**Tudo o resto é automático!** 🚀

---

**Criado**: 2025-10-25
**Última Atualização**: 2025-10-25
**Versão**: 2.0 (Autenticação Automática)
