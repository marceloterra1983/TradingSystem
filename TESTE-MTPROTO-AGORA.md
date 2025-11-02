# 🧪 TESTE MTPROTO - EXECUTAR AGORA

**Status:** Gateway rodando, aguardando código do Telegram

---

## 🚀 **EXECUTE ESTE COMANDO (em outro terminal)**

Abra um **NOVO TERMINAL** e execute:

```bash
API_KEY="bbf913dad93ae879f1fbbec4490303a2c0d49be1d717342a64173a192f99f1a1"

curl -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}' \
  http://localhost:4005/sync-messages
```

---

## 📱 **O QUE VAI ACONTECER**

### 1. No Terminal do Gateway (onde está rodando o script):

Você verá aparecer:
```
[TelegramClient] No existing session found, will create new one
[TelegramClient] Connecting to Telegram...
[TelegramClient] Starting authentication...
[TelegramClient] Authenticating with phone: +5567991908000
Please enter the code you received: _____
```

### 2. No App do Telegram (móvel/desktop):

Você receberá uma mensagem:
```
Telegram code: 12345

You can also automatically copy the code by tapping on this message.
```

### 3. VOCÊ DIGITA O CÓDIGO:

No terminal do Gateway, digite o código de 5 dígitos:
```
Please enter the code you received: 12345
```

Pressione **ENTER**

### 4. Se tiver 2FA:

```
Please enter your 2FA password (if enabled): sua_senha_2fa
```

Pressione **ENTER**

### 5. SUCESSO! 🎉

```
[TelegramClient] Authentication successful
[TelegramClient] Session saved to file
[TelegramClient] Successfully connected and authenticated
```

O `curl` retornará:
```json
{
  "success": true,
  "message": "10 mensagem(ns) sincronizada(s) de 1 canal(is)",
  "data": {
    "totalMessagesSynced": 10,
    "channelsSynced": [...]
  }
}
```

---

## ⚠️ **IMPORTANTE**

- O Gateway **DEVE estar rodando no terminal interativo** (não em background)
- **Mantenha o terminal do Gateway visível** para ver o prompt
- **NÃO feche o terminal** até completar a autenticação

---

## ✅ **APÓS AUTENTICAÇÃO**

1. Pressione `Ctrl+C` no terminal do Gateway para parar
2. O arquivo `.telegram-session` foi criado
3. Agora pode rodar em background:

```bash
cd backend/api/telegram-gateway
TELEGRAM_GATEWAY_PORT=4010 npm run dev &
```

4. Testar novamente (sem precisar de código):

```bash
curl -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}' \
  http://localhost:4005/sync-messages | jq
```

**Deve funcionar sem pedir código!** ✅

---

**Execute o curl agora em outro terminal!** 🚀

