# Padrão de Mensagem de Sinal - TP Capital

## 📋 Formato Esperado

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

---

## 🔍 Elementos Detectados

### 1. **Tipo de Operação** (Opcional)
- `🟢Swing Trade`
- `🔵Day Trade`
- `⚡️Scalping`
- Pode ter emoji colorido

### 2. **Ativo** (Obrigatório)
```
Ativo: BOVAW32
```
- Palavras-chave: `Ativo:`, `Papel:`, `Ticker:`
- Formato: código do ativo (ex: BOVAW32, PETR4, VALE3)

### 3. **Preço de Compra** (Obrigatório)
```
Compra: 1,04 a 1,06
```
- Palavras-chave: `Compra:`, `Entrada:`, `Buy:`
- Pode ser preço único ou faixa (com "a" ou "até")

### 4. **Alvos** (Obrigatório)
```
Alvo 1: 1,15
Alvo 2: 2,15
Alvo final: 3,50
```
- Múltiplos alvos numerados
- Palavras-chave: `Alvo`, `TP`, `Take Profit`, `Target`

### 5. **Stop Loss** (Obrigatório)
```
Stop: 0,70
```
- Palavras-chave: `Stop:`, `SL:`, `Stop Loss:`
- Preço de proteção

### 6. **Informações Adicionais** (Opcional)
```
A ordem ficará posicionada no Book até dia 28/10
```
- Validade, observações, etc.

---

## 🎯 Regex de Detecção

### Regex Atual Configurado

```regex
(Ativo:|Compra:|Alvo|Stop:?)
```

**Detecta mensagens que contenham pelo menos uma dessas palavras-chave.**

### Variações Aceitas

```
Ativo: PETR4
Papel: VALE3
Ticker: BBDC4

Compra: 25,50
Entrada: 25,50 a 25,80
Buy: 25.50

Alvo 1: 28,00
TP1: 28,00
Target 1: 28.00

Stop: 23,00
SL: 23,00
Stop Loss: 23,00
```

---

## ⚙️ Configuração Recomendada

### **Para Mensagens de Swing Trade**

```bash
SIGNALS_CHANNEL_ID=-1001649127710
GATEWAY_FILTER_TEXT_CONTAINS=(Swing Trade|Ativo:|Compra:|Alvo|Stop)
GATEWAY_FILTER_TEXT_NOT_CONTAINS=(spam|teste|demo|cancelad)
```

### **Para Mensagens de Day Trade**

```bash
SIGNALS_CHANNEL_ID=-1001649127710
GATEWAY_FILTER_TEXT_CONTAINS=(Day Trade|Ativo:|Compra:|Alvo|Stop)
GATEWAY_FILTER_TEXT_NOT_CONTAINS=(spam|teste|demo|cancelad)
```

### **Para Qualquer Tipo de Sinal**

```bash
SIGNALS_CHANNEL_ID=-1001649127710
GATEWAY_FILTER_TEXT_CONTAINS=(Ativo:|Papel:|Compra:|Entrada:|Alvo|Target|Stop)
GATEWAY_FILTER_TEXT_NOT_CONTAINS=(spam|teste|demo|cancelad|encerrad)
```

### **Mais Restritivo (Apenas Completos)**

Para garantir que a mensagem tem TODOS os elementos essenciais, use o parser que já existe no TP Capital. Os filtros de regex servem apenas para pré-filtrar e reduzir processamento.

---

## 📊 Como o Sistema Funciona

```
┌─────────────────────────────────────────┐
│  1. Telegram Gateway                    │
│     Recebe TODAS as mensagens           │
│     Canal: -1001649127710               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. Filtro SQL (TP Capital Worker)      │
│     WHERE channel_id = -1001649127710   │
│     AND text ~* '(Ativo:|Compra:|...)'  │
│     AND text !~* '(spam|teste|...)'     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. Parser de Sinal (parseSignal.js)    │
│     Valida formato completo:            │
│     - Ativo                             │
│     - Compra/Entrada                    │
│     - Alvos                             │
│     - Stop                              │
└──────────────┬──────────────────────────┘
               │
               ▼ (Se válido)
┌─────────────────────────────────────────┐
│  4. Banco TP Capital                    │
│     Salva sinal na tabela               │
│     tp_capital_signals                  │
└─────────────────────────────────────────┘
```

---

## 🧪 Teste de Configuração

### 1. Criar arquivo .env

```bash
cd /home/marce/Projetos/TradingSystem/apps/tp-capital

cat > .env << 'EOF'
# Canal TP Capital
SIGNALS_CHANNEL_ID=-1001649127710

# Filtros para detectar sinais
GATEWAY_FILTER_TEXT_CONTAINS=(Ativo:|Compra:|Alvo|Stop)
GATEWAY_FILTER_TEXT_NOT_CONTAINS=(spam|teste|cancelad|encerrad)

# Database
TP_CAPITAL_DATABASE_URL=postgresql://timescale:changeme@localhost:5433/APPS-TPCAPITAL
GATEWAY_DATABASE_URL=postgresql://timescale:changeme@localhost:5433/APPS-TELEGRAM-GATEWAY
GATEWAY_DATABASE_SCHEMA=telegram_gateway

PORT=4005
EOF
```

### 2. Reiniciar TP Capital

```bash
npm run dev
```

### 3. Verificar Logs

Deve aparecer:
```
[INFO] Gateway polling worker configured
  channelId: "-1001649127710"
  filters: {
    textContains: "(Ativo:|Compra:|Alvo|Stop)"
    textNotContains: "(spam|teste|cancelad|encerrad)"
  }
```

---

## 📝 Exemplos de Mensagens

### ✅ Será Processada

```
🟢Swing Trade 
 
Ativo: BOVAW32
Compra: 1,04 a 1,06
Alvo 1: 1,15
Stop: 0,70
```
**Motivo:** Contém "Ativo:", "Compra:", "Alvo" e "Stop"

---

### ✅ Será Processada

```
Day Trade 🔵

Papel: PETR4
Entrada: 38,50
TP: 39,00
SL: 38,00
```
**Motivo:** Será detectada se ajustar regex para incluir "Papel:", "Entrada:", "TP", "SL"

---

### ❌ Será Ignorada

```
Bom dia pessoal! Hoje vamos ter um dia interessante...
```
**Motivo:** Não contém palavras-chave de sinal

---

### ❌ Será Ignorada

```
Operação CANCELADA - ignore o sinal anterior
```
**Motivo:** Contém "cancelad" no filtro de exclusão

---

## 🔧 Ajuste Fino

Se quiser capturar mais variações, ajuste o regex:

```bash
# Versão expandida - aceita mais formatos
GATEWAY_FILTER_TEXT_CONTAINS=(Ativo:|Papel:|Ticker:|Compra:|Entrada:|Buy:|Alvo|Target|TP|Stop|SL)
```

**Benefícios:**
- ✅ Aceita "Papel:" além de "Ativo:"
- ✅ Aceita "Entrada:" além de "Compra:"
- ✅ Aceita "TP" e "SL" (abreviações)
- ✅ Aceita termos em inglês

---

## ⚡ Performance

**Antes (sem filtros):**
- Processa TODAS as 100+ mensagens do canal
- Parser tenta validar mensagens de texto comum
- Muitos "parse_failed"

**Depois (com filtros):**
- Processa apenas ~10-20 mensagens de sinal
- Parser só recebe mensagens com padrão de sinal
- Menos erros e mais eficiente

---

## 📊 Monitoramento

Métricas no Prometheus:

```
tp_capital_messages_processed_total{status="published"} = sinais válidos
tp_capital_messages_processed_total{status="parse_failed"} = mensagens ignoradas
tp_capital_messages_processed_total{status="duplicate"} = duplicatas
```

Se `parse_failed` continuar alto, ajuste os filtros para ser mais restritivo!

