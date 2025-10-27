# Fix: Telegram Gateway - Mensagens não sendo salvas

## 🐛 Problema Identificado

As mensagens do Telegram não estavam sendo salvas/exibidas no banco de dados devido a **configurações incorretas**:

1. **Variável `TELEGRAM_BOT_TOKEN` ausente** - O gateway esperava essa variável mas ela não existia no `.env`
2. **Porta do banco incorreta** - Configurado para `5432` mas TimescaleDB estava na `5433`
3. **Senha do banco incorreta** - Usando `changeme` mas a senha correta era `pass_timescale`
4. **API REST com configuração local desatualizada** - Arquivo `.env` no diretório da API com valores antigos

## ✅ Correções Aplicadas

### 1. Adicionado `TELEGRAM_BOT_TOKEN` ao `.env` raiz

```bash
# Arquivo: /home/marce/Projetos/TradingSystem/.env
TELEGRAM_BOT_TOKEN=7824620102:AAGn4nvACZJ5TMRaWPfYtSmwriYBpXU5P-8
```

**Por quê:** O gateway (`apps/telegram-gateway/src/config.js`) espera `process.env.TELEGRAM_BOT_TOKEN` para inicializar o bot Telegraf.

### 2. Corrigida porta do banco de dados

```bash
# ANTES (errado):
TELEGRAM_GATEWAY_DB_URL=postgresql://timescale:changeme@localhost:5432/APPS-TELEGRAM-GATEWAY

# DEPOIS (correto):
TELEGRAM_GATEWAY_DB_URL=postgresql://timescale:pass_timescale@localhost:5433/APPS-TELEGRAM-GATEWAY
```

**Arquivos alterados:**
- `/home/marce/Projetos/TradingSystem/.env`
- `/home/marce/Projetos/TradingSystem/backend/api/telegram-gateway/.env`

### 3. Corrigida senha do banco de dados

A senha correta do TimescaleDB é `pass_timescale` (definida em `TIMESCALE_POSTGRES_PASSWORD`), não `changeme`.

### 4. Reiniciados os serviços

```bash
# Gateway MTProto
cd /home/marce/Projetos/TradingSystem/apps/telegram-gateway
pkill -f "node.*telegram-gateway"
npm start

# API REST
cd /home/marce/Projetos/TradingSystem/backend/api/telegram-gateway
lsof -ti:4010 | xargs kill -9
npm run dev
```

---

## 🎯 Resultado

### Antes
- ❌ Gateway não recebia mensagens (bot não inicializado)
- ❌ API REST conectava no banco errado (porta 5432)
- ❌ `telegram_messages_received_total = 0`
- ❌ Dashboard mostrava "0 mensagens"

### Depois
- ✅ Gateway conectado com Telegram (`botEnabled: true`)
- ✅ API REST conectada no banco correto (porta 5433)
- ✅ Mensagem de teste salva com sucesso
- ✅ Dashboard exibindo "1 mensagem"
- ✅ Endpoint `/api/messages` retornando dados

---

## 📊 Verificação do Sistema

### 1. Verificar Gateway

```bash
curl http://localhost:4006/health
# {"status":"healthy","telegram":"connected","uptime":X,"timestamp":"..."}

curl http://localhost:4006/metrics | grep telegram_connection_status
# telegram_connection_status 1
```

### 2. Verificar API REST

```bash
curl http://localhost:4010/health
# {"status":"healthy","service":"telegram-gateway-api","timestamp":"..."}

curl http://localhost:4010/api/messages?limit=5 | jq '.pagination.total'
# 1 (ou mais)
```

### 3. Verificar Banco de Dados

```bash
PGPASSWORD=pass_timescale psql -h localhost -p 5433 -U timescale -d APPS-TELEGRAM-GATEWAY \
  -c "SELECT COUNT(*) FROM telegram_gateway.messages WHERE deleted_at IS NULL;"
# total: 1 (ou mais)
```

### 4. Verificar Dashboard

```bash
curl http://localhost:3103/api/telegram-gateway/overview | jq '.data.messages.total'
# 1 (ou mais)
```

**Acesse:** `http://localhost:3103/#/telegram-gateway`

---

## 🔄 Fluxo de Captura de Mensagens

```
┌─────────────────┐
│   Telegram      │
│   Servers       │
└────────┬────────┘
         │ MTProto
         ↓
┌─────────────────┐
│  Gateway (4006) │ ← Requer TELEGRAM_BOT_TOKEN
│  + Bot Telegraf │
└────────┬────────┘
         │ SQL INSERT
         ↓
┌─────────────────┐
│  TimescaleDB    │ ← Porta 5433, senha pass_timescale
│  (5433)         │
└────────┬────────┘
         │ SQL SELECT
         ↓
┌─────────────────┐
│  API REST       │ ← Deve usar porta e senha corretas
│  (4010)         │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│  Dashboard      │
│  (3103)         │
└─────────────────┘
```

---

## 📝 Configurações Necessárias

### Variáveis de Ambiente Essenciais

```bash
# Bot Token (OBRIGATÓRIO para receber mensagens)
TELEGRAM_BOT_TOKEN=7824620102:AAGn4nvACZJ5TMRaWPfYtSmwriYBpXU5P-8

# Credenciais MTProto (OBRIGATÓRIO para user client)
TELEGRAM_API_ID=23522437
TELEGRAM_API_HASH=c5f138fdd8e50f3f71462ce577cb3e60
TELEGRAM_PHONE_NUMBER=+5567991908000

# Banco de Dados (OBRIGATÓRIO - porta e senha corretas)
TELEGRAM_GATEWAY_DB_URL=postgresql://timescale:pass_timescale@localhost:5433/APPS-TELEGRAM-GATEWAY
TELEGRAM_GATEWAY_DB_SCHEMA=telegram_gateway
TELEGRAM_GATEWAY_DB_TABLE=messages

# Outros
GATEWAY_PORT=4006
TELEGRAM_GATEWAY_API_PORT=4010
```

---

## 🚨 Problemas Comuns

### Problema 1: "No messages received"
**Causa:** `TELEGRAM_BOT_TOKEN` ausente ou inválido  
**Solução:** Verificar se a variável está no `.env` e reiniciar o gateway

### Problema 2: "API returns total: 0 but DB has messages"
**Causa:** API conectando no banco errado (porta ou senha)  
**Solução:** Corrigir `.env` da API e reiniciar

### Problema 3: "Bot not receiving messages"
**Causas possíveis:**
- Bot não adicionado como admin nos canais
- Canais não estão ativos na tabela `telegram_gateway.channels`
- Gateway não está rodando

**Solução:**
```bash
# Verificar se gateway está rodando
curl http://localhost:4006/health

# Verificar canais ativos
curl http://localhost:4010/api/channels

# Ver logs do gateway
tail -f /tmp/telegram-gateway.log
```

### Problema 4: "Connection refused to database"
**Causa:** TimescaleDB não está rodando ou porta incorreta  
**Solução:**
```bash
# Verificar se container está rodando
docker ps | grep timescale

# Verificar porta correta
docker ps | grep timescale | grep 5433
```

---

## 🧪 Teste de Integração

Para verificar que tudo está funcionando, envie uma mensagem de teste em um dos canais monitorados e execute:

```bash
# 1. Verificar que o gateway recebeu
curl http://localhost:4006/metrics | grep telegram_messages_received_total

# 2. Verificar que foi salva no banco
PGPASSWORD=pass_timescale psql -h localhost -p 5433 -U timescale -d APPS-TELEGRAM-GATEWAY \
  -c "SELECT COUNT(*) FROM telegram_gateway.messages WHERE created_at > NOW() - INTERVAL '1 minute';"

# 3. Verificar que a API está retornando
curl "http://localhost:4010/api/messages?limit=1&sort=desc" | jq '.data[0].text'

# 4. Verificar no dashboard
open http://localhost:3103/#/telegram-gateway
```

---

## 📚 Arquivos de Configuração

### Arquivos que foram modificados:

1. **`.env` (raiz)** - Adicionado `TELEGRAM_BOT_TOKEN` e corrigido `TELEGRAM_GATEWAY_DB_URL`
2. **`backend/api/telegram-gateway/.env`** - Corrigido `TELEGRAM_GATEWAY_DB_URL`

### Arquivos de referência:

- `apps/telegram-gateway/src/config.js` - Configuração do gateway
- `apps/telegram-gateway/src/messageStore.js` - Lógica de persistência
- `backend/api/telegram-gateway/src/config.js` - Configuração da API
- `backend/api/telegram-gateway/src/db/messagesRepository.js` - Repository pattern

---

## ✅ Checklist Final

- [x] `TELEGRAM_BOT_TOKEN` definido no `.env` raiz
- [x] Porta do banco corrigida para `5433`
- [x] Senha do banco corrigida para `pass_timescale`
- [x] Gateway MTProto rodando e conectado
- [x] API REST rodando e conectada no banco correto
- [x] Mensagem de teste inserida e visível
- [x] Dashboard exibindo mensagens corretamente
- [x] Canais configurados e ativos no banco

---

**Status:** ✅ RESOLVIDO  
**Data:** 2025-10-27  
**Versão:** 1.0.0



