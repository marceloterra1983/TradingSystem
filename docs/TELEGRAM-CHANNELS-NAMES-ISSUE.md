# Telegram Channels - Nomes Genéricos (Limitação Conhecida)

**Data:** 2025-11-11
**Status:** ⚠️ **LIMITAÇÃO CONHECIDA - Workarounds Disponíveis**

## 🎯 Problema Identificado

Os canais carregam com **IDs numéricos** ao invés dos **nomes reais**:

```
❌ Atual:
- Channel -1001601645148
- Channel -1001984966449
- Channel -1001279007403

✅ Esperado:
- Ações Brasil (Canal Oficial)
- Estratégias Day Trade
- Análises Técnicas Premium
```

## 📋 Causa Raiz

### Auto-Discovery Limitation

Os canais foram **auto-descobertos** a partir das mensagens existentes no banco de dados:

```sql
-- Script que criou os canais (sync-telegram-channels.sh)
INSERT INTO telegram_gateway.channels (channel_id, label, description, is_active)
SELECT DISTINCT
    channel_id::bigint,
    'Channel ' || channel_id as label,  -- ❌ Nome genérico (ID apenas)
    'Auto-discovered from messages' as description,
    true
FROM telegram_gateway.messages
WHERE channel_id IS NOT NULL;
```

**Por que não temos os nomes reais?**
- Mensagens no banco de dados **não incluem o título do canal** nos metadados
- Para pegar o nome real, precisamos **consultar a API do Telegram** via MTProto
- Auto-discovery foi focado em **rapidez** (registrar canais sem consultas externas)

## ✅ Soluções Disponíveis

### Opção 1: Edição Manual (RÁPIDA) ⚡

Você pode editar os nomes diretamente no Dashboard:

1. Abra http://localhost:3103
2. Navegue para **Telegram Gateway**
3. Na lista de canais, clique no botão de edição (✏️) de cada canal
4. Insira o **nome real** que você conhece
5. Salve

**Vantagem:** Controle total sobre os nomes exibidos

### Opção 2: SQL Direto (BATCH)

Se você tem uma lista dos canais e seus nomes:

```bash
# Exemplo: Atualizar nome de um canal específico
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
UPDATE telegram_gateway.channels
SET
    label = 'Ações Brasil - Canal Oficial',
    description = 'Canal de análise de ações da bolsa brasileira',
    updated_at = NOW()
WHERE channel_id = -1001601645148;
"

# Verificar mudança
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
SELECT channel_id, label, description
FROM telegram_gateway.channels
WHERE channel_id = -1001601645148;
"
```

**Vantagem:** Atualização em massa de vários canais

### Opção 3: Fetch Automático via API (FUTURO) 🚧

**Status:** Não implementado ainda

**Como funcionar esquerdo:**
1. Criar endpoint `/api/channels/{id}/fetch-name` no Gateway API
2. Gateway API chama MTProto: `GET /channel-info/{channelId}`
3. MTProto consulta Telegram API: `client.getEntity(channelId)`
4. Retorna título real do canal
5. Atualiza banco de dados automaticamente

**Requisitos:**
- MTProto Session ativa e autenticada
- Permissões de leitura nos canais
- Implementação do endpoint (aprox. 2-3 horas)

## 🔍 Como Descobrir o Nome Real de um Canal?

### Método 1: Via Mensagens

Olhe o conteúdo das mensagens recentes:

```bash
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
SELECT
    channel_id,
    text,
    created_at
FROM telegram_gateway.messages
WHERE channel_id = '-1001601645148'
ORDER BY created_at DESC
LIMIT 5;
"
```

O contexto das mensagens pode revelar qual é o canal.

### Método 2: Via Telegram Desktop/Mobile

1. Abra o Telegram no seu celular/desktop
2. Vá em **Configurações** → **Privacidade e Segurança** → **Sessões Ativas**
3. Encontre a sessão do MTProto Gateway
4. Veja quais canais você está inscrito
5. Compare os IDs com os IDs no banco

### Método 3: Via MTProto Logs

Os logs do MTProto mostram quando uma mensagem chega com informações do canal:

```bash
docker logs telegram-mtproto 2>&1 | grep "channelId" | grep "1001601645148" | head -5
```

## 📊 Status Atual

### Canais Registrados: 12

```bash
# Ver lista completa
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
SELECT
    id,
    channel_id,
    label,
    is_active,
    (SELECT COUNT(*) FROM telegram_gateway.messages m WHERE m.channel_id::text = c.channel_id::text) as message_count
FROM telegram_gateway.channels c
ORDER BY message_count DESC;
"
```

**Top Canais por Volume de Mensagens:**
1. `-1001601645148` - 32 mensagens
2. `-1001984966449` - 20 mensagens
3. `-1001279007403` - 6 mensagens

## 🚀 Roadmap (Futuro)

### Short-term (1-2 semanas)
- [ ] Implementar endpoint `/api/channels/{id}/fetch-name`
- [ ] Adicionar botão "Buscar Nome" no Dashboard
- [ ] Teste com 1-2 canais primeiro

### Medium-term (1 mês)
- [ ] Batch fetch de todos os canais sem nome
- [ ] Cache de nomes (evitar consultas repetidas)
- [ ] Refresh automático de nomes desatualizados

### Long-term (2-3 meses)
- [ ] Auto-detect de mudanças de nome (canal renomeado)
- [ ] Histórico de nomes anteriores
- [ ] Sugestões de nomes baseadas em conteúdo

## 📚 Referências

- **Telegram API**: https://core.telegram.org/method/channels.getFullChannel
- **Gramjs** (lib usada): https://gram.js.org/classes/TelegramClient.html#getEntity
- **Sync Script**: `scripts/docker/sync-telegram-channels.sh`
- **Database Schema**: `docs/content/database/schema.mdx`

## 💡 Dica Rápida

**Se você conhece os nomes dos canais, atualize manualmente agora:**

```bash
# Template para atualizar
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
UPDATE telegram_gateway.channels
SET label = 'SEU_NOME_AQUI', updated_at = NOW()
WHERE channel_id = -1001234567890;
"

# Force reload do Dashboard
bash scripts/docker/force-dashboard-reload.sh
# + Hard refresh no navegador (Ctrl+Shift+R)
```

---

**Última Atualização:** 2025-11-11 14:10 BRT
**Próxima Revisão:** Após implementação do endpoint de fetch automático
