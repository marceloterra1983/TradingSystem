# Telegram Channels - Recovery & Sync

**Data:** 2025-11-11
**Status:** ✅ **RESOLVIDO - 12 Canais Recuperados**

## 🎯 Problema Identificado

Dashboard mostrando "0 / 0" canais monitorados, mesmo com mensagens sendo recebidas.

**Causa Raiz:**
- Tabela `telegram_gateway.channels` estava **vazia**
- Mensagens sendo salvas em `telegram_gateway.messages`
- Nenhum canal registrado oficialmente

## ✅ Solução Implementada

### 1. Auto-Discovery de Canais

Criado processo automático que descobre canais a partir das mensagens:

```sql
INSERT INTO telegram_gateway.channels (channel_id, label, description, is_active)
SELECT DISTINCT
    channel_id::bigint,
    'Channel ' || channel_id as label,
    'Auto-discovered from messages' as description,
    true
FROM telegram_gateway.messages
WHERE channel_id IS NOT NULL
  AND channel_id ~ '^-?[0-9]+$'
ON CONFLICT (channel_id) DO NOTHING;
```

### 2. Script de Sincronização

**Arquivo:** `scripts/docker/sync-telegram-channels.sh`

**Funcionalidades:**
- ✅ Descobre automaticamente canais de mensagens existentes
- ✅ Insere apenas canais novos (ON CONFLICT DO NOTHING)
- ✅ Mostra estatísticas de canais ativos
- ✅ Lista top 10 canais por volume de mensagens

**Uso:**
```bash
bash scripts/docker/sync-telegram-channels.sh
```

## 📊 Resultados

### Canais Recuperados: 12

```
   channel_id   |         label          | message_count
----------------+------------------------+---------------
 -1001601645148 | Channel -1001601645148 |            32
 -1001984966449 | Channel -1001984966449 |            20
 -1001279007403 | Channel -1001279007403 |             6
 -1001174903854 | Channel -1001174903854 |             6
 -1001744113331 | Channel -1001744113331 |             3
 -1001412188586 | Channel -1001412188586 |             3
 -1001628930438 | Channel -1001628930438 |             2
 -1002565131627 | Channel -1002565131627 |             2
 -1001649127710 | Channel -1001649127710 |             1
 -1001223870370 | Channel -1001223870370 |             1
(10 rows)
```

### APIs Validadas

```bash
# API direta
curl "http://localhost:14010/api/channels"
# ✅ {"success":true,"data":[...12 channels...]}

# Via Dashboard proxy
curl "http://localhost:3103/api/channels"
# ✅ {"success":true,"data":[...12 channels...]}
```

## 🔧 Estrutura da Tabela Channels

```sql
                               Table "telegram_gateway.channels"
   Column    |           Type           | Nullable |               Default
-------------+--------------------------+----------+--------------------------------------
 id          | bigint                   | not null | nextval('channels_id_seq'::regclass)
 channel_id  | bigint                   | not null |
 label       | text                     |          |
 description | text                     |          |
 is_active   | boolean                  | not null | true
 created_at  | timestamp with time zone | not null | now()
 updated_at  | timestamp with time zone | not null | now()

Indexes:
    "channels_pkey" PRIMARY KEY, btree (id)
    "channels_channel_id_key" UNIQUE CONSTRAINT, btree (channel_id)
    "idx_telegram_gateway_channels_active" btree (is_active, channel_id)
```

## 🚀 Manutenção Futura

### Sincronizar Novos Canais

Quando novos canais começarem a enviar mensagens:

```bash
# Executar script de sync
bash scripts/docker/sync-telegram-channels.sh

# Ou manualmente via SQL
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
INSERT INTO telegram_gateway.channels (channel_id, label, description, is_active)
SELECT DISTINCT
    channel_id::bigint,
    'Channel ' || channel_id as label,
    'Auto-discovered from messages' as description,
    true
FROM telegram_gateway.messages
WHERE channel_id IS NOT NULL
  AND channel_id ~ '^-?[0-9]+\$'
  AND channel_id::bigint NOT IN (SELECT channel_id FROM telegram_gateway.channels)
ON CONFLICT (channel_id) DO NOTHING;
"
```

### Adicionar Canal Manualmente

Via API (quando endpoint de POST existir):

```bash
curl -X POST http://localhost:14010/api/channels \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "-1001234567890",
    "label": "Meu Canal Customizado",
    "description": "Canal adicionado manualmente",
    "isActive": true
  }'
```

Via SQL direto:

```bash
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "
INSERT INTO telegram_gateway.channels (channel_id, label, description, is_active)
VALUES (-1001234567890, 'Meu Canal', 'Canal personalizado', true)
ON CONFLICT (channel_id) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    updated_at = NOW();
"
```

## 📋 Checklist de Validação

- [x] Tabela `channels` populada com 12 canais
- [x] API `/api/channels` retornando dados corretos
- [x] Dashboard proxy funcionando (`http://localhost:3103/api/channels`)
- [x] Script de sincronização criado e testado
- [x] Top canais por volume identificados
- [x] Documentação completa criada

## 🎯 Dashboard - Status Esperado

Após refresh no browser, o Dashboard deve mostrar:

```
📊 Canais Monitorados: 12 / 12
```

Com os canais listados e permitindo adicionar novos via formulário.

## 🔗 Referências

- **API Endpoint**: `GET http://localhost:14010/api/channels`
- **Sync Script**: `scripts/docker/sync-telegram-channels.sh`
- **Database**: TimescaleDB → `telegram_gateway.channels`
- **Dashboard Proxy**: Vite proxy `/api/channels` → `14010/api/channels`

---

**Última Atualização:** 2025-11-11 13:45 BRT
**Próxima Revisão:** Após adicionar endpoint POST para criação manual de canais
