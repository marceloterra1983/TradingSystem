# Telegram Gateway - Polling Mode Ativado! 🎉

## ✅ Sistema Configurado para Polling

### O Que Foi Feito

Adicionei **event handler** no user client (MTProto) para capturar mensagens de canais via polling, sem necessidade de adicionar bot como admin.

### Como Funciona Agora

```
┌─────────────────────┐
│  Canal do Telegram  │ ← Qualquer canal que você tenha acesso
└──────────┬──────────┘
           │
           ↓ (MTProto User Client Polling)
┌──────────────────────┐
│  User Client         │ ← Sua conta: +5567991908000
│  (GramJS)            │    Escutando UpdateNewChannelMessage
└──────────┬───────────┘
           │
           ↓ Verifica se canal está permitido
┌──────────────────────┐
│  isChannelAllowed()  │ ← Consulta telegram_gateway.channels
└──────────┬───────────┘
           │
           ↓ Se permitido
┌──────────────────────┐
│  recordMessage()     │ ← Salva no banco com source='user_client'
└──────────┬───────────┘
           │
           ↓
┌──────────────────────┐
│  Dashboard           │ ← Mensagens aparecem automaticamente
└──────────────────────┘
```

### Código Adicionado

**Arquivo:** `apps/telegram-gateway/src/index.js`

**Linha ~324-458:**
```javascript
// Add event handler for new channel messages (polling mode)
userClient.addEventHandler(async (event) => {
  if (event.className === 'UpdateNewChannelMessage') {
    const message = event.message;
    
    // Process channel messages
    if (message.peerId?.channelId) {
      const channelId = `-100${message.peerId.channelId.toString()}`;
      // ... salvar no banco
      // ... publicar para APIs
    }
  }
});
```

**Características:**
- ✅ Escuta eventos em tempo real
- ✅ Não precisa ser admin do canal
- ✅ Funciona com qualquer canal que você tenha acesso
- ✅ Salva com `source='user_client'`
- ✅ Verifica permissões na tabela `channels`
- ✅ Incrementa métricas (telegram_messages_received_total)
- ✅ Publica para APIs configuradas

---

## 🧪 Como Testar

### Passo 1: Verificar se Gateway Está Rodando

```bash
curl http://localhost:4006/health
```

**Esperado:**
```json
{
  "status": "healthy",
  "telegram": "connected",
  "uptime": 2466
}
```

### Passo 2: Verificar Logs

```bash
tail -50 /tmp/telegram-gateway-polling.log | grep "event handler"
```

**Esperado:**
```
User client event handler registered for channel messages
```

### Passo 3: Enviar Mensagem em Canal

**Importante:** Você precisa ter acesso ao canal (como membro ou admin).

1. Abra Telegram
2. Vá para um dos canais configurados:
   - Operações | TP Capital (-1001649127710)
   - Jonas Esteves (-1001744113331)
   - Informa Ações - News (-1001412188586)
3. Se você **NÃO for admin**, mas **for membro**, mensagens públicas do canal serão capturadas
4. Aguarde alguns segundos

### Passo 4: Verificar Captura

```bash
# Ver métricas
curl http://localhost:4006/metrics | grep telegram_messages_received_total

# Ver logs
tail -20 /tmp/telegram-gateway-polling.log | grep "Received channel post"

# Ver no banco
PGPASSWORD=pass_timescale psql -h localhost -p 5433 -U timescale \
  -d APPS-TELEGRAM-GATEWAY \
  -c "SELECT COUNT(*) FROM telegram_gateway.messages WHERE source='user_client';"
```

### Passo 5: Ver no Dashboard

```
http://localhost:3103/#/telegram-gateway
```

- Aguarde até 15s (auto-refresh)
- OU clique em "Atualizar"
- Mensagens devem aparecer com source="user_client"

---

## 🔍 Diagnóstico

### Verificação 1: User Client Conectado?

```bash
tail -50 /tmp/telegram-gateway-polling.log | grep "Telegram user client connected"
```

**Se não aparecer:**
- User client não conectou
- Verificar sessão em: `apps/telegram-gateway/.session/telegram-gateway.session`

### Verificação 2: Event Handler Registrado?

```bash
grep "event handler registered" /tmp/telegram-gateway-polling.log
```

**Se não aparecer:**
- Código não foi executado
- Gateway pode ter errado antes de registrar
- Verificar logs completos: `tail -100 /tmp/telegram-gateway-polling.log`

### Verificação 3: Mensagens Sendo Ignoradas?

```bash
tail -50 /tmp/telegram-gateway-polling.log | grep "Ignoring"
```

**Se aparecer "Ignoring message from channel not registered":**
- Canal não está na tabela `telegram_gateway.channels`
- Adicionar canal via dashboard

### Verificação 4: Você Tem Acesso aos Canais?

**Com sua conta (+5567991908000), você:**
- ✅ Precisa ser **MEMBRO** do canal (público ou privado)
- ❌ NÃO precisa ser admin
- ✅ Mensagens públicas do canal serão capturadas

**Para verificar:**
1. Abra Telegram com sua conta
2. Veja se consegue ver mensagens dos canais
3. Se consegue ver, o user client também conseguirá capturar

---

## ⚙️ Configuração Atual

### Variáveis de Ambiente

```bash
TELEGRAM_PHONE_NUMBER=+5567991908000
TELEGRAM_API_ID=27987732
TELEGRAM_API_HASH=9f1a6f43e74f0a8d31ed9e8e73f7fc37
TELEGRAM_BOT_TOKEN=7824620102:AAGn4nvACZJ5TMRaWPfYtSmwriYBpXU5P-8
TELEGRAM_GATEWAY_DB_URL=postgresql://timescale:pass_timescale@localhost:5433/APPS-TELEGRAM-GATEWAY
```

### Canais Monitorados

```sql
SELECT channel_id, label, is_active 
FROM telegram_gateway.channels 
ORDER BY channel_id;
```

**Lista:**
1. `-1001234567890` - Canal Teste (criado via curl)
2. `-1001649127710` - Operações | TP Capital
3. `-1001412188586` - Informa Ações - News
4. `-1001744113331` - Jonas Esteves

### Modos Habilitados

- ✅ Bot Mode (Telegraf): ON
- ✅ User Client Mode (GramJS): ON com event handler
- ✅ Polling: ON (user client escutando)
- ✅ Database: TimescaleDB conectado
- ✅ HTTP Server: Porta 4006

---

## 🎯 Diferenças: Bot vs User Client

| Característica | Bot Mode | User Client Mode |
|----------------|----------|------------------|
| Precisa ser admin? | ✅ Sim | ❌ Não |
| Precisa ser membro? | N/A | ✅ Sim |
| Fonte no banco | `source='bot'` | `source='user_client'` |
| API usada | Telegram Bot API | MTProto (GramJS) |
| Captura histórico? | ❌ Não | ❌ Não (só tempo real) |
| Autenticação | Token | Telefone + código SMS |

---

## 🐛 Problemas Comuns

### Problema 1: "User client não conectou"

**Causa:** Sessão inválida ou expirada

**Solução:**
```bash
# Reautenticar (modo interativo)
cd /home/marce/Projetos/TradingSystem/apps/telegram-gateway
./authenticate-interactive.sh
```

### Problema 2: "Mensagens não estão sendo capturadas"

**Verificar:**
1. Você é membro dos canais? (abra Telegram e veja se vê os canais)
2. Canais estão na tabela `channels` com `is_active=true`?
3. Event handler foi registrado? (ver logs)
4. Gateway está rodando? (`curl http://localhost:4006/health`)

### Problema 3: "Erro ao processar mensagem"

**Ver logs de erro:**
```bash
tail -100 /tmp/telegram-gateway-polling.log | grep -i error
```

**Erros comuns:**
- `Failed to persist` → Problema no banco
- `channel not registered` → Canal não está na tabela
- `undefined` → Estrutura de mensagem inesperada

---

## ✅ Checklist de Validação

Após reiniciar gateway:

- [ ] Gateway está rodando (health OK)
- [ ] User client conectado ("connected successfully")
- [ ] Event handler registrado ("event handler registered")
- [ ] Você é membro dos canais monitorados
- [ ] Canais estão na tabela com is_active=true
- [ ] Mensagem enviada em canal de teste
- [ ] Logs mostram "Received channel post via user client"
- [ ] Contador telegram_messages_received_total incrementou
- [ ] Mensagem aparece no banco com source='user_client'
- [ ] Dashboard mostra a mensagem

---

## 🎉 Resultado Esperado

Após enviar mensagem em canal onde você é membro:

**Logs:**
```
[INFO]: Received channel post via user client
  channelId: -1001649127710
  messageId: 54321
  text: "mensagem de teste"
```

**Métricas:**
```bash
telegram_messages_received_total{channel_id="-1001649127710"} 1
```

**Banco:**
```sql
SELECT channel_id, text, source 
FROM telegram_gateway.messages 
WHERE source='user_client' 
ORDER BY received_at DESC 
LIMIT 1;
```

**Dashboard:**
- Mensagem aparece na tabela
- Source: "user_client"
- Badge: cyan (received)

---

## 📞 Se Ainda Não Funcionar

Me envie:

1. **Logs completos:**
   ```bash
   tail -100 /tmp/telegram-gateway-polling.log
   ```

2. **Você é membro dos canais?**
   - Consegue ver mensagens no Telegram app?

3. **Event handler registrado?**
   ```bash
   grep "event handler" /tmp/telegram-gateway-polling.log
   ```

4. **Canais na tabela:**
   ```bash
   curl -s http://localhost:3103/api/channels | jq '.data[] | {channelId, isActive}'
   ```

---

**Data:** 2025-10-27  
**Modo:** Polling via User Client  
**Status:** Implementado e ativo ✅  
**Próximo Passo:** Aguardar mensagens em canais onde você é membro



