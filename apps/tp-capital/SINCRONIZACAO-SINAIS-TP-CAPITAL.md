# Sincronização de Sinais - TP Capital

## 📋 Visão Geral

Sistema de sincronização automática e manual de sinais de opções do canal TP Capital no Telegram. **APENAS sinais completos** com valores de compra são salvos na tabela.

## ✅ Formato de Sinal Válido

O sistema **APENAS processa e salva** mensagens neste formato:

```
🟢Swing Trade 
 
Ativo: BOVAW32
Compra: 1,04 a 1,06
Alvo 1: 1,15
Alvo 2: 2,15
Alvo final: 3,50

Stop: 0,70

A ordem ficará posicionada no Book até dia 28/10
```

### Campos Obrigatórios:
- ✅ `Ativo:` ou código de ativo
- ✅ `Compra:` com valores mínimo e máximo
- ✅ Pelo menos um `Alvo`
- ✅ `Stop`

### ❌ Mensagens Ignoradas:

**Não serão salvas na tabela:**
- Análises de mercado (sem valores de compra)
- Atualizações "ALVO ATINGIDO"
- Notificações de stop
- Comentários gerais
- Mensagens sem valores numéricos

## 🔄 Fluxo de Sincronização

### 1. Sincronização Automática (Polling)

**Intervalo:** 5 segundos  
**Worker:** `GatewayPollingWorker`

```
Telegram Gateway DB → TP Capital Worker → Validação → TP Capital DB
```

**Validação:**
```javascript
// Se NÃO tiver buy_min e buy_max, a mensagem é ignorada
if (!signal.buy_min || !signal.buy_max) {
  markMessageAsIgnored(messageId, 'Incomplete signal - missing buy values');
  return;
}
```

### 2. Sincronização Manual (Botão "Checar Mensagens")

**Acionada por:** Usuário clicando no botão no dashboard  
**Limite:** 100 últimas mensagens do Telegram

**Fluxo:**
```
1. Frontend → POST /api/tp-capital/sync-messages
2. TP Capital → POST http://localhost:4006/sync-messages { limit: 100 }
3. Telegram Gateway → Busca últimas 100 mensagens do Telegram
4. Telegram Gateway → Identifica mensagens faltantes
5. Telegram Gateway → Insere até 100 mensagens no banco
6. TP Capital → Converte mensagens 'queued' → 'received'
7. Worker → Processa mensagens com validação
8. Worker → Salva APENAS sinais completos na tabela
```

## 🛠️ Implementação

### Backend - Telegram Gateway

**Arquivo:** `apps/telegram-gateway/src/routes.js`

**Endpoint:** `POST /sync-messages`

**Body (opcional):**
```json
{
  "limit": 100
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "10 mensagem(ns) recuperada(s)",
  "data": {
    "totalMessagesSynced": 10,
    "channelsSynced": [
      {
        "channelId": "-1001649127710",
        "label": "Operações | TP Capital",
        "messagesSynced": 10
      }
    ],
    "timestamp": "2025-10-27T16:27:56.805Z"
  }
}
```

### Backend - TP Capital

**Arquivo:** `apps/tp-capital/src/server.js`

**Endpoint:** `POST /sync-messages`

**Funcionalidades:**
1. Chama Telegram Gateway com `limit: 100`
2. Converte mensagens `queued` → `received`
3. Retorna estatísticas de sincronização

**Resposta:**
```json
{
  "success": true,
  "message": "10 mensagem(ns) sincronizada(s). Processamento iniciado.",
  "data": {
    "messagesSynced": 10,
    "queuedConverted": 6,
    "channelId": "-1001649127710",
    "channelLabel": "Operações | TP Capital",
    "filters": {
      "textContains": "(Ativo:|Compra:|Alvo|Stop:?)",
      "textNotContains": "(spam|teste|demo)"
    }
  }
}
```

### Frontend - Dashboard

**Arquivo:** `frontend/dashboard/src/components/pages/tp-capital/SignalsTable.tsx`

**Botão "Checar Mensagens":**
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleSyncMessages}
  disabled={isSyncing}
>
  {isSyncing ? (
    <>
      <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
      Verificando...
    </>
  ) : (
    <>
      <RotateCcw className="h-4 w-4 mr-2" />
      Checar Mensagens
    </>
  )}
</Button>
```

## 📊 Status das Mensagens

| Status | Descrição | Na Tabela? | Ação do Worker |
|--------|-----------|------------|----------------|
| `received` | Nova mensagem aguardando processamento | ❌ | Processa |
| `published` | Sinal completo processado e salvo | ✅ | - |
| `ignored` | Mensagem sem valores de compra | ❌ | Marca como ignorada |
| `failed` | Erro no parsing | ❌ | Marca como falha |
| `queued` | Aguardando conversão para received | ❌ | Convertida em sync |

## 🎯 Exemplo de Processamento

### Mensagem 1: Sinal Completo ✅
```
🟢Swing Trade 
Ativo: BOVAW32
Compra: 1,04 a 1,06
Alvo 1: 1,15
Stop: 0,70
```
**Resultado:** ✅ Salvo na tabela

### Mensagem 2: Atualização ❌
```
BOVAW22 ALVO 1 ATINGIDO ✅
+17,02%
```
**Resultado:** ❌ Ignorada (sem valores de compra)

### Mensagem 3: Análise ❌
```
BOVA11

O ativo veio tocar a região do 144...
```
**Resultado:** ❌ Ignorada (sem valores de compra)

## 🚀 Como Usar

### 1. Via Dashboard (Recomendado)

1. Acesse: http://localhost:3103/#/tp-capital
2. Clique no botão **"Checar Mensagens"**
3. Aguarde o feedback: "X mensagem(ns) sincronizada(s)"
4. Tabela será recarregada automaticamente

### 2. Via API

```bash
# Sincronizar últimas 100 mensagens
curl -X POST http://localhost:4005/sync-messages \
  -H "Content-Type: application/json"

# Verificar sinais processados
curl http://localhost:4005/signals?limit=10 | jq .
```

## 📈 Resultado na Tabela

**Colunas:**
- **DATA**: Horário (negrito) na linha de cima, data (cinza) na linha de baixo
- **ATIVO**: Código do ativo
- **COMPRA MIN / MAX**: Valores de entrada
- **ALVO 1 / 2 / FINAL**: Metas de lucro
- **STOP**: Stop loss
- **AÇÕES**: Botão para deletar

**Exemplo:**
| DATA | ATIVO | COMPRA MIN | COMPRA MAX | ALVO 1 | ALVO 2 | ALVO FINAL | STOP |
|------|-------|------------|------------|--------|--------|------------|------|
| **10:27:22**<br><small>27/10/2025</small> | BOVAW32 | 1,04 | 1,06 | 1,15 | 2,15 | 3,50 | 0,70 |
| **11:33:07**<br><small>24/10/2025</small> | LRENW150 | 0,44 | 0,47 | 0,60 | 1,00 | 2,00 | 0,24 |

## 🔧 Configuração

### Variáveis de Ambiente

**Canal e Filtros:**
```bash
# Canal específico do TP Capital
TP_CAPITAL_SIGNALS_CHANNEL_ID="-1001649127710"

# Regex para identificar mensagens com padrão de sinal
TP_CAPITAL_GATEWAY_FILTER_TEXT_CONTAINS="(Ativo:|Compra:|Alvo|Stop:?)"

# Regex para excluir mensagens indesejadas
TP_CAPITAL_GATEWAY_FILTER_TEXT_NOT_CONTAINS="(spam|teste|demo)"
```

**Banco de Dados:**
```bash
# IMPORTANTE: TP Capital deve ler do mesmo banco que o Telegram Gateway grava
GATEWAY_DATABASE_NAME=APPS-TELEGRAM-GATEWAY
GATEWAY_DB_NAME=APPS-TELEGRAM-GATEWAY
GATEWAY_DATABASE_SCHEMA=telegram_gateway
```

**Polling:**
```bash
GATEWAY_POLLING_INTERVAL_MS=5000
```

### Executar Serviços

```bash
# Telegram Gateway (porta 4006)
cd apps/telegram-gateway
npm run dev

# TP Capital (porta 4005)
cd apps/tp-capital
GATEWAY_DATABASE_NAME=APPS-TELEGRAM-GATEWAY npm run dev
```

## 📝 Logs

### Sincronização Bem-Sucedida

**Telegram Gateway:**
```
[INFO] [SyncMessages] Iniciando verificação de sincronização...
  telegramLimit: 100
[INFO] [SyncChannel] Mensagens faltando detectadas. Recuperando...
  channelId: "-1001649127710"
  missingCount: 10
[INFO] [SyncMessages] Sincronização concluída
  totalMessagesSynced: 10
```

**TP Capital:**
```
[INFO] [SyncMessages] Sincronização solicitada via dashboard
[INFO] [SyncMessages] Mensagens sincronizadas do Telegram para Gateway
  messagesSynced: 10
[INFO] [SyncMessages] Mensagens queued convertidas para received
  queuedConverted: 6
[INFO] Signal processed successfully
  messageId: 5893
  asset: BOVAW32
  signalType: Swing Trade
  buyRange: 1.04 - 1.06
```

### Mensagem Ignorada

```
[DEBUG] Message parsed but incomplete signal (no buy values) - ignoring
  messageId: 5894
  asset: BOVAW22
  hasBuyMin: false
  hasBuyMax: false
```

## 🎯 Testes

### Testar Parsing

```bash
cd apps/tp-capital
node -e "
import { parseSignal } from './src/parseSignal.js';

const msg = \`🟢Swing Trade 
Ativo: BOVAW32
Compra: 1,04 a 1,06
Alvo 1: 1,15
Stop: 0,70\`;

const result = parseSignal(msg);
console.log(JSON.stringify(result, null, 2));
"
```

### Testar Sincronização

```bash
# Sincronizar manualmente
curl -X POST http://localhost:4005/sync-messages \
  -H "Content-Type: application/json"

# Verificar sinais
curl http://localhost:4005/signals?limit=10 | jq '.data[] | {asset, buy_min, buy_max}'
```

## 📊 Métricas

### Worker Status
```bash
curl http://localhost:4005/health | jq '.pollingWorker'
```

**Resposta:**
```json
{
  "running": true,
  "lastPollAt": "2025-10-27T16:27:56.805Z",
  "lagSeconds": 2.3,
  "consecutiveErrors": 0,
  "interval": 5000,
  "channelId": "-1001649127710",
  "batchSize": 100
}
```

## ⚙️ Troubleshooting

### Sinais não aparecem na tabela

**Verificar:**
1. Mensagem tem valores de compra? → Veja raw_message no banco
2. Formato está correto? → Teste com parseSignal
3. Worker está rodando? → `curl http://localhost:4005/health`

**Comandos:**
```bash
# Ver mensagens sem valores
curl -s "http://localhost:4005/signals?limit=50" | \
  jq '.data[] | select(.buy_min == null)'

# Ver apenas sinais completos
curl -s "http://localhost:4005/signals?limit=50" | \
  jq '.data[] | select(.buy_min != null)'
```

### Mensagem sincronizada mas não processada

**Causa:** Status `queued` ao invés de `received`

**Solução:** Clicar no botão "Checar Mensagens" (converte automaticamente)

Ou manualmente:
```sql
UPDATE telegram_gateway.messages
SET status = 'received'
WHERE channel_id = '-1001649127710'
AND status = 'queued';
```

### Sincronização retorna 0 mensagens

**Causa:** Todas as mensagens já estão no banco

**Verificar:**
```bash
curl -s "http://localhost:4005/sync-messages" -X POST -H "Content-Type: application/json" | jq '.message'
```

## 🎉 Resultado Final

**Dashboard TP Capital:**
- ✅ Tabela limpa com apenas sinais operacionais
- ✅ Data formatada (horário em cima, data embaixo)
- ✅ Valores sempre preenchidos
- ✅ Sincronização manual de 100 mensagens com um clique
- ✅ Feedback visual em tempo real

**Dados:**
- ✅ Apenas sinais completos salvos
- ✅ Parsing preciso dos valores
- ✅ Histórico auditável no banco Gateway

**Performance:**
- ✅ Polling a cada 5 segundos
- ✅ Sincronização de 100 mensagens em ~2 segundos
- ✅ Worker processa mensagens em lote



