# 🔐 Telegram MTProto - Guia de Configuração

**Data:** 2025-11-02  
**Status:** Configuração necessária para usar GramJS

---

## 📋 **Variáveis de Ambiente Necessárias**

Adicione as seguintes variáveis ao arquivo `.env` na raiz do projeto:

```bash
# ========================================
# Telegram MTProto (GramJS)
# ========================================

# Obter em: https://my.telegram.org/apps
TELEGRAM_API_ID=YOUR_API_ID_HERE
TELEGRAM_API_HASH=YOUR_API_HASH_HERE

# Seu número de telefone com código do país (ex: +5511999999999)
TELEGRAM_PHONE_NUMBER=+55_YOUR_PHONE_HERE

# ID do canal de sinais (opcional, pode ser username ou numeric ID)
# Ex: @tpcapital ou -1001649127710
TELEGRAM_SIGNALS_CHANNEL_ID=-1001649127710
```

---

## 🚀 **Passo a Passo de Configuração**

### 1. Criar Aplicação no Telegram

1. Acesse: https://my.telegram.org/
2. Faça login com seu número de telefone
3. Clique em **"API development tools"**
4. Preencha o formulário:
   - **App title:** TradingSystem Gateway
   - **Short name:** tradingsystem
   - **Platform:** Other
   - **Description:** (opcional)
5. Clique em **"Create application"**
6. Copie o **`api_id`** e **`api_hash`**

### 2. Adicionar Variáveis ao `.env`

```bash
# Editar .env na raiz do projeto
nano /home/marce/Projetos/TradingSystem/.env

# Adicionar:
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
TELEGRAM_PHONE_NUMBER=+5567991908000
TELEGRAM_SIGNALS_CHANNEL_ID=-1001649127710
```

### 3. Primeira Autenticação (Interativa)

Na **primeira vez** que rodar o Telegram Gateway, ele solicitará:

```bash
# Iniciar Gateway
cd backend/api/telegram-gateway
TELEGRAM_GATEWAY_PORT=4010 npm run dev

# Output esperado:
# [TelegramClient] No existing session found, will create new one
# [TelegramClient] Connecting to Telegram...
# [TelegramClient] Starting authentication...
# [TelegramClient] Authenticating with phone: +5567991908000
# 
# Please enter the code you received: _____
```

**Você receberá um código no Telegram (app móvel/desktop)**. Digite o código no terminal.

Se tiver **2FA** habilitado:
```
Please enter your 2FA password (if enabled): _____
```

Após autenticação bem-sucedida:
```
[TelegramClient] Authentication successful
[TelegramClient] Session saved to file
[TelegramClient] Successfully connected and authenticated
```

### 4. Execuções Subsequentes (Automáticas)

Nas próximas vezes, o Gateway usará a **session salva** e **NÃO** solicitará código novamente:

```bash
npm run dev

# Output:
# [TelegramClient] Session loaded from file
# [TelegramClient] Connecting to Telegram...
# [TelegramClient] Session is valid
# [TelegramClient] Successfully connected and authenticated
```

---

## 📂 **Arquivo de Session**

O TelegramClient salva a session em:

```
backend/api/telegram-gateway/.telegram-session
```

**⚠️ IMPORTANTE:**
- ✅ **NÃO commitar** este arquivo no Git (já está no `.gitignore`)
- ✅ **Fazer backup** deste arquivo (contém autenticação)
- ✅ **Regenerar** se perder acesso ao Telegram

---

## 🔍 **Obter ID de Canal**

### Método 1: Via Username
Se o canal tem username público (ex: `@tpcapital`):
```bash
TELEGRAM_SIGNALS_CHANNEL_ID=@tpcapital
```

### Método 2: Via Numeric ID

1. Abra o canal no Telegram Web: https://web.telegram.org/
2. A URL será algo como: `https://web.telegram.org/k/#-1001649127710`
3. O ID é: `-1001649127710` (incluir o `-` no início!)

```bash
TELEGRAM_SIGNALS_CHANNEL_ID=-1001649127710
```

---

## 🧪 **Testar Configuração**

### 1. Health Check
```bash
curl http://localhost:4010/health | jq
```

**Resultado esperado:**
```json
{
  "status": "healthy",
  "service": "telegram-gateway-api",
  "telegram": "connected"  // ← Deve mostrar "connected"
}
```

### 2. Sincronizar Mensagens
```bash
API_KEY="bbf913dad93ae879f1fbbec4490303a2c0d49be1d717342a64173a192f99f1a1"

curl -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}' \
  http://localhost:4005/sync-messages | jq
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "10 mensagem(ns) sincronizada(s) de 1 canal(is)",
  "data": {
    "totalMessagesSynced": 10,
    "channelsSynced": [
      {
        "channelId": "-1001649127710",
        "messagesSynced": 10,
        "latestMessageId": 123456
      }
    ],
    "timestamp": "2025-11-02T03:00:00.000Z"
  }
}
```

---

## ⚠️ **Troubleshooting**

### Erro: `TELEGRAM_API_ID and TELEGRAM_API_HASH are required`
**Solução:** Adicionar variáveis ao `.env` e reiniciar Gateway

### Erro: `Phone number invalid`
**Solução:** Verificar formato do número (incluir `+` e código do país)

### Erro: `Session invalid, re-authenticating`
**Solução:** Deletar `.telegram-session` e autenticar novamente

### Erro: `Two-steps verification is enabled`
**Solução:** Digite sua senha 2FA quando solicitado

### Erro: `Flood wait`
**Solução:** Telegram bloqueou temporariamente. Aguardar X segundos.

---

## 🔐 **Segurança**

1. ✅ **NUNCA** commitar `.env` ou `.telegram-session`
2. ✅ **Rotacionar** `API_HASH` periodicamente
3. ✅ **Limitar** permissões da aplicação no https://my.telegram.org/
4. ✅ **Monitorar** sessões ativas em: Telegram → Settings → Devices

---

## 📚 **Referências**

- **GramJS Docs:** https://gram.js.org/
- **Telegram API:** https://core.telegram.org/api
- **Create App:** https://my.telegram.org/apps
- **Session Management:** https://gram.js.org/advanced/session-management

---

**Última Atualização:** 2025-11-02  
**Status:** Pronto para uso após configuração

