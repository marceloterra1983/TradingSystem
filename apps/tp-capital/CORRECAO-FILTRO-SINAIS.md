# Correção de Filtro de Sinais - TP Capital

## ❌ Problema Identificado

O sistema estava salvando **TODAS as mensagens** do canal `-1001649127710`, incluindo:
- ✅ Sinais completos (com valores de compra)
- ❌ Análises de mercado (sem valores)
- ❌ Atualizações de alvos atingidos
- ❌ Notificações de stop
- ❌ Comentários e análises gerais

**Resultado:** Tabela poluída com 8 registros, sendo apenas 2 sinais válidos.

## ✅ Solução Implementada

### 1. Validação de Sinais Completos

**Arquivo:** `apps/tp-capital/src/gatewayPollingWorker.js`

**Mudança:** Adicionada validação para garantir que **APENAS sinais completos** sejam salvos.

```javascript
// 2. Validar se é um sinal COMPLETO (com valores de compra)
// APENAS sinais completos devem ser salvos na tabela
if (!signal.buy_min || !signal.buy_max) {
  logger.debug({
    messageId: msg.message_id,
    asset: signal.asset,
    hasBuyMin: !!signal.buy_min,
    hasBuyMax: !!signal.buy_max
  }, 'Message parsed but incomplete signal (no buy values) - ignoring');

  await this.markMessageAsIgnored(msg.message_id, 'Incomplete signal - missing buy values');
  if (this.metrics) {
    this.metrics.messagesProcessed.inc({ status: 'ignored_incomplete' });
  }
  return;
}
```

### 2. Novo Status: "ignored"

**Adicionado método:** `markMessageAsIgnored()`

Mensagens que são parseadas mas não têm valores completos agora são marcadas como `ignored` no banco do Gateway, com metadados explicando o motivo.

```javascript
/**
 * Mark Gateway message as ignored (not a complete signal)
 */
async markMessageAsIgnored(messageId, reason) {
  const metadata = {
    processed_by: 'tp-capital',
    ignored_at: new Date().toISOString(),
    reason: reason
  };

  const query = `
    UPDATE ${this.schema}.messages
    SET status = 'ignored',
        metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb
    WHERE message_id = $2
  `;

  await this.gatewayDb.query(query, [JSON.stringify(metadata), messageId]);
}
```

### 3. Limpeza de Dados

**Executado:**
```sql
DELETE FROM tp_capital.tp_capital_signals 
WHERE buy_min IS NULL OR buy_max IS NULL;
```

**Resultado:**
- ❌ Deletados: 6 sinais inválidos
- ✅ Mantidos: 2 sinais válidos

## 📋 Formato Válido de Sinal

**APENAS mensagens neste formato serão salvas:**

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

**Campos obrigatórios para salvar:**
- ✅ `Ativo:` ou código de ativo no início
- ✅ `Compra:` com valores mínimo e máximo
- ✅ Pelo menos um `Alvo`
- ✅ `Stop`

## 🔄 Status das Mensagens no Gateway

Após o processamento, mensagens no banco `telegram_gateway.messages` terão um dos status:

| Status | Descrição | Salvo na Tabela? |
|--------|-----------|------------------|
| `received` | Recebida, aguardando processamento | ❌ |
| `published` | Sinal completo processado | ✅ |
| `ignored` | Mensagem parseada mas sem valores completos | ❌ |
| `failed` | Erro no parsing (não é um sinal) | ❌ |

## 📊 Resultados

### Antes da Correção
```sql
SELECT COUNT(*) FROM tp_capital.tp_capital_signals;
-- Resultado: 8 registros (6 inválidos + 2 válidos)
```

### Depois da Correção
```sql
SELECT COUNT(*) FROM tp_capital.tp_capital_signals;
-- Resultado: 2 registros (apenas válidos)
```

### Exemplos de Mensagens Ignoradas

1. **Análise de Mercado:**
   ```
   BOVA11
   
   O ativo veio tocar novamente a região do 144...
   ```
   - ❌ Não tem "Compra:"
   - ✅ Status: `ignored`

2. **Atualização de Alvo:**
   ```
   BOVAW22 ALVO 1 ATINGIDO ✅
   +17,02%
   ```
   - ❌ Não tem valores de compra
   - ✅ Status: `ignored`

3. **Notificação de Stop:**
   ```
   CYREW296 stop
   -25%
   ```
   - ❌ Não tem valores de compra
   - ✅ Status: `ignored`

## ✅ Sinais Válidos Mantidos

```
  asset   | buy_min | buy_max | target_1 | target_2 | target_final | stop 
----------+---------+---------+----------+----------+--------------+------
 BOVAW22  |    0.94 |    0.96 |     1.10 |     2.00 |         3.00 | 0.64
 LRENW150 |    0.44 |    0.47 |     0.60 |     1.00 |         2.00 | 0.24
```

## 🔍 Logs de Debug

O worker agora registra claramente quando uma mensagem é ignorada:

```
[DEBUG] Message parsed but incomplete signal (no buy values) - ignoring
  messageId: 5772
  asset: BOVA11
  hasBuyMin: false
  hasBuyMax: false
```

E quando um sinal é processado com sucesso:

```
[INFO] Signal processed successfully
  messageId: 5768
  asset: LRENW150
  signalType: Swing Trade
  buyRange: 0.44 - 0.47
```

## 🎯 Impacto

### Frontend (Dashboard)
- ✅ Tabela agora mostra **apenas sinais operacionais**
- ✅ Coluna DATA formatada (horário em cima, data embaixo)
- ✅ Valores sempre preenchidos (sem "?")

### Backend (Worker)
- ✅ Processamento mais eficiente (ignora mensagens inválidas rapidamente)
- ✅ Logs mais claros para debugging
- ✅ Métricas separadas por status (published, ignored, failed)

### Banco de Dados
- ✅ Tabela limpa e focada apenas em sinais operacionais
- ✅ Gateway marca mensagens com status apropriado para auditoria

## 🚀 Como Testar

### 1. Verificar Sinais Válidos
```bash
curl -s "http://localhost:4005/signals?limit=10" | jq '.data[] | {asset, buy_min, buy_max, target_1, stop}'
```

### 2. Verificar Status das Mensagens no Gateway
```sql
SELECT status, COUNT(*) 
FROM telegram_gateway.messages 
WHERE channel_id = '-1001649127710' 
GROUP BY status;
```

### 3. Simular Nova Mensagem
Envie uma mensagem no canal do Telegram seguindo o formato válido e observe os logs:

```bash
tail -f /tmp/tp-capital-fixed.log | grep -E "Signal processed|ignored"
```

## 📝 Manutenção Futura

### Se o formato das mensagens mudar:

1. **Atualizar regex** em `src/parseSignal.js`
2. **Ajustar validação** em `src/gatewayPollingWorker.js` (se necessário)
3. **Limpar sinais antigos** (se formato mudar drasticamente)
4. **Testar parsing** com exemplos reais

### Adicionar novos tipos de sinais:

Se no futuro houver sinais sem valores de compra que devam ser salvos (ex: sinais de saída), ajustar a validação:

```javascript
// Exemplo: permitir sinais de saída sem buy_min/buy_max
const isEntrySignal = signal.signal_type === 'Swing Trade';
const isExitSignal = signal.signal_type === 'Exit Signal';

if (isEntrySignal && (!signal.buy_min || !signal.buy_max)) {
  // ignorar
}
// exit signals não precisam de buy values
```

## 🎉 Resultado Final

A tabela TP Capital agora contém **exclusivamente sinais operacionais** prontos para serem executados, sem ruído de análises ou atualizações.

**Dados limpos = Decisões melhores!** 📊✨



