# ⚠️ Problema Arquitetural: Startup Sync

## 🔍 O Que Aconteceu

Implementamos a funcionalidade de **sincronização automática no startup**, mas descobrimos um **problema arquitetural** que precisa ser corrigido.

## 🏗️ Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│  Serviço MTProto (Porta 4006)                               │
│  - Conecta ao Telegram via MTProto                          │
│  - TEM sessão autenticada                                   │
│  - Recebe mensagens em tempo real                           │
│  - Publica para TP Capital (porta 4005)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  API REST (Porta 4010)                                      │
│  - Expõe endpoints HTTP (/api/channels, /api/messages)     │
│  - StartupSync tenta conectar ao Telegram DIRETAMENTE ❌    │
│  - NÃO TEM sessão própria                                   │
│  - Pede autenticação interativa (código SMS)                │
└─────────────────────────────────────────────────────────────┘
```

## ❌ Problema

O **StartupSync** foi implementado na API (porta 4010) e tenta:
1. Conectar ao Telegram diretamente
2. Buscar mensagens dos canais
3. Salvar no banco

Mas:
- ❌ A API **não tem sessão MTProto própria**
- ❌ Tentou pedir autenticação interativa (código SMS)
- ❌ **Duplica a responsabilidade** do serviço MTProto

## ✅ Solução Correta (Arquitetura Limpa)

### Opção 1: API Delega para Serviço MTProto (Recomendado)

```
┌─────────────────────────────────────────────────────────────┐
│  API REST (Porta 4010)                                      │
│  ┌──────────────────────────────────────────────┐           │
│  │  StartupSync                                 │           │
│  │  - Chama endpoint do serviço MTProto         │           │
│  │  - HTTP GET /sync-messages (porta 4006)     │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP Request
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Serviço MTProto (Porta 4006)                               │
│  ┌──────────────────────────────────────────────┐           │
│  │  Endpoint: GET /sync-messages                │           │
│  │  - USA sessão existente                      │           │
│  │  - Conecta ao Telegram                       │           │
│  │  - Busca mensagens                           │           │
│  │  - Salva no banco (via porta 4005)          │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

**Vantagens:**
- ✅ Usa sessão existente (sem autenticação duplicada)
- ✅ Responsabilidade única (serviço MTProto = conexão Telegram)
- ✅ API apenas coordena, não conecta diretamente

### Opção 2: Sessão Compartilhada

Fazer a API usar a **mesma sessão** do serviço MTProto:
- Copiar `apps/telegram-gateway/.session/telegram-gateway.session`
- Converter para formato usado pela API
- Ambos usam a mesma sessão

**Desvantagens:**
- ⚠️ Duplica conexões ao Telegram
- ⚠️ Aumenta complexidade (duas conexões ativas)

## 🔧 Solução Temporária (Atual)

**Desabilitamos o StartupSync temporariamente** até implementar a solução correta.

```bash
# .env
TELEGRAM_GATEWAY_SYNC_ON_STARTUP=false
```

### O Que Ainda Funciona

✅ **Botão "Checar Mensagens"** no dashboard
- Funciona normalmente
- Usa endpoint `/api/telegram-gateway/sync-messages`
- Requer configuração de API key

✅ **Sincronização em tempo real**
- Serviço MTProto (4006) continua recebendo mensagens
- Publica para TP Capital (4005)

## 📋 Próximos Passos

### 1. Implementar Endpoint no Serviço MTProto

Adicionar endpoint `GET /sync-messages` em `apps/telegram-gateway/src/server.ts`:

```typescript
app.get('/sync-messages', async (req, res) => {
  const { limit = 500, channelIds } = req.query;
  
  // Usar TelegramClient existente (já autenticado)
  const channels = channelIds || await getActiveChannels();
  
  const results = await Promise.all(
    channels.map(channelId => 
      syncChannelMessages(channelId, limit)
    )
  );
  
  res.json({
    success: true,
    totalSynced: results.reduce((sum, r) => sum + r.count, 0),
    channels: results
  });
});
```

### 2. Modificar StartupSync para Usar HTTP

Modificar `backend/api/telegram-gateway/src/services/StartupSyncService.js`:

```javascript
async runSync() {
  // Ao invés de conectar ao Telegram diretamente:
  // const telegramClient = await getTelegramClient();
  
  // Chamar serviço MTProto via HTTP:
  const response = await fetch('http://localhost:4006/sync-messages', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  
  this.logger.info({
    totalSynced: result.totalSynced,
    channels: result.channels.length
  }, '[StartupSync] ✅ Sync completed via MTProto service');
}
```

### 3. Re-habilitar StartupSync

```bash
# .env
TELEGRAM_GATEWAY_SYNC_ON_STARTUP=true
```

### 4. Testar

```bash
# Reiniciar API
bash scripts/restart-telegram-api.sh

# Verificar logs
tail -f logs/telegram-gateway-api.log | grep StartupSync

# Deve aparecer:
# [INFO] [StartupSync] ✅ Sync completed via MTProto service
#        totalSynced: 245
#        channels: 3
```

## 📚 Referências

- **TelegramClientService**: `backend/api/telegram-gateway/src/services/TelegramClientService.js`
- **StartupSyncService**: `backend/api/telegram-gateway/src/services/StartupSyncService.js`
- **Serviço MTProto**: `apps/telegram-gateway/src/server.ts`
- **Sessão MTProto**: `apps/telegram-gateway/.session/telegram-gateway.session`

## 🐛 Issues Relacionados

- [ ] Implementar endpoint `/sync-messages` no serviço MTProto (4006)
- [ ] Modificar StartupSync para usar HTTP em vez de conexão direta
- [ ] Documentar arquitetura correta (quem faz o quê)
- [ ] Adicionar health check mostrando se sessão está válida

---

**Status**: ⚠️ **Desabilitado temporariamente**  
**Data**: 2025-11-04  
**Próxima Ação**: Implementar Opção 1 (Delegação via HTTP)

