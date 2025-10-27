# Configuração de Filtros - TP Capital

## 🎯 Objetivo

Configurar quais mensagens do Telegram Gateway o TP Capital deve processar, filtrando por:
- **Canal específico**
- **Tipo de mensagem**
- **Fonte** (bot, user_client, sync)
- **Conteúdo do texto** (palavras-chave)

---

## 📝 Variáveis de Ambiente

**IMPORTANTE:** Conforme diretrizes do projeto, adicione as variáveis em:
- `config/.env.defaults` (valores padrão versionados) OU
- `.env.local` na raiz do projeto (overrides locais, gitignored)

**❌ NÃO criar** arquivos `.env` nas pastas dos serviços!

```bash
# ==============================================================================
# 📊 TP CAPITAL - FILTROS DO TELEGRAM GATEWAY
# ==============================================================================

# Canal específico para monitorar (obrigatório)
TP_CAPITAL_SIGNALS_CHANNEL_ID=-1001649127710

# Polling
TP_CAPITAL_GATEWAY_POLLING_INTERVAL_MS=5000
TP_CAPITAL_GATEWAY_BATCH_SIZE=100

# Filtrar por tipos de mensagem (opcional, separados por vírgula)
# Valores possíveis: channel_post, text, photo, video, document
# Se vazio, aceita todos os tipos
TP_CAPITAL_GATEWAY_FILTER_MESSAGE_TYPES=

# Filtrar por fonte da mensagem (opcional, separados por vírgula)
# Valores possíveis: bot, user_client, sync
# Se vazio, aceita todas as fontes
TP_CAPITAL_GATEWAY_FILTER_SOURCES=

# Filtrar mensagens que CONTÉM determinado texto (opcional, regex)
# Exemplo: 'BUY|SELL' - só processa se tiver BUY ou SELL
# Exemplo: 'CALL|PUT' - só processa opções
TP_CAPITAL_GATEWAY_FILTER_TEXT_CONTAINS=(Ativo:|Compra:|Alvo|Stop:?)

# Filtrar mensagens que NÃO CONTÉM determinado texto (opcional, regex)
# Exemplo: 'spam|teste|demo' - ignora mensagens com essas palavras
TP_CAPITAL_GATEWAY_FILTER_TEXT_NOT_CONTAINS=(spam|teste|demo|cancelad|encerrad)
```

---

## 🔧 Exemplos de Configuração

### Exemplo 1: Apenas Sinais de Opções do TP Capital

```bash
TP_CAPITAL_SIGNALS_CHANNEL_ID=-1001649127710
TP_CAPITAL_GATEWAY_FILTER_MESSAGE_TYPES=channel_post
TP_CAPITAL_GATEWAY_FILTER_TEXT_CONTAINS=(CALL|PUT|OPC)
TP_CAPITAL_GATEWAY_FILTER_TEXT_NOT_CONTAINS=
```

**Resultado:** Processa apenas posts do canal que contenham CALL, PUT ou OPC no texto.

---

### Exemplo 2: Apenas Mensagens com BUY/SELL

```bash
TP_CAPITAL_SIGNALS_CHANNEL_ID=-1001649127710
TP_CAPITAL_GATEWAY_FILTER_MESSAGE_TYPES=
TP_CAPITAL_GATEWAY_FILTER_TEXT_CONTAINS=(BUY|SELL|COMPRA|VENDA)
TP_CAPITAL_GATEWAY_FILTER_TEXT_NOT_CONTAINS=
```

**Resultado:** Processa qualquer tipo de mensagem que contenha palavras de ação de trading.

---

### Exemplo 3: Excluir Spam e Mensagens de Teste

```bash
TP_CAPITAL_SIGNALS_CHANNEL_ID=-1001649127710
TP_CAPITAL_GATEWAY_FILTER_MESSAGE_TYPES=
TP_CAPITAL_GATEWAY_FILTER_TEXT_CONTAINS=
TP_CAPITAL_GATEWAY_FILTER_TEXT_NOT_CONTAINS=(spam|test|demo|exemplo)
```

**Resultado:** Ignora mensagens que contenham spam, test, demo ou exemplo.

---

### Exemplo 4: Apenas do Bot (não sync manual)

```bash
TP_CAPITAL_SIGNALS_CHANNEL_ID=-1001649127710
TP_CAPITAL_GATEWAY_FILTER_MESSAGE_TYPES=
TP_CAPITAL_GATEWAY_FILTER_SOURCES=bot,user_client
TP_CAPITAL_GATEWAY_FILTER_TEXT_CONTAINS=
TP_CAPITAL_GATEWAY_FILTER_TEXT_NOT_CONTAINS=
```

**Resultado:** Ignora mensagens de sincronização manual, processa apenas tempo real.

---

### Exemplo 5: Configuração Completa (Mais Restritivo)

```bash
TP_CAPITAL_SIGNALS_CHANNEL_ID=-1001649127710
TP_CAPITAL_GATEWAY_FILTER_MESSAGE_TYPES=channel_post
TP_CAPITAL_GATEWAY_FILTER_SOURCES=bot,user_client
TP_CAPITAL_GATEWAY_FILTER_TEXT_CONTAINS=(CALL|PUT)
TP_CAPITAL_GATEWAY_FILTER_TEXT_NOT_CONTAINS=(spam|test)
```

**Resultado:**
- ✅ Canal: -1001649127710
- ✅ Tipo: channel_post
- ✅ Fonte: bot OU user_client (não sync)
- ✅ Texto: Deve conter CALL OU PUT
- ✅ Texto: NÃO deve conter spam OU test

---

## 🔍 Como Verificar Filtros Ativos

1. **Logs ao Iniciar:** O TP Capital mostra no log os filtros configurados:

```
[INFO] Gateway Polling Worker initialized
  interval: 5000
  channelId: "-1001649127710"
  filters: {
    messageTypes: ["channel_post"],
    sources: ["bot", "user_client"],
    textContains: "(CALL|PUT)",
    textNotContains: "(spam|test)"
  }
```

2. **Endpoint de Status:**

```bash
curl http://localhost:4005/health
```

---

## 🎨 Interface no Dashboard (Futuro)

Em breve será possível configurar via dashboard em:
```
http://localhost:3103/#/tp-capital
```

Com interface para:
- Selecionar canal
- Escolher tipos de mensagem
- Definir filtros de texto
- Ver estatísticas de mensagens filtradas

---

## 📊 Métricas

O polling worker exporta métricas:

- `tp_capital_messages_processed_total{status="published"}` - Mensagens processadas
- `tp_capital_messages_processed_total{status="parse_failed"}` - Mensagens ignoradas (não são sinais)
- `tp_capital_polling_lag_seconds` - Lag entre mensagem recebida e processada

---

## ⚠️ Importante

**Regex:**
- Use `|` (pipe) para OR: `BUY|SELL` = BUY ou SELL
- Use `.` para qualquer caractere
- Use `\s` para espaços
- Use `^` para início de linha
- Use `$` para fim de linha

**Performance:**
- Evite regex muito complexos (podem deixar lento)
- Prefira filtros simples e específicos
- Use filtros de source/messageType antes de text (mais rápido)

**Reinicialização:**
- Após mudar `.env`, reinicie o serviço:
  ```bash
  cd apps/tp-capital && npm run dev
  ```

---

## 🧪 Teste de Configuração

Verifique se os filtros estão funcionando:

1. Configure os filtros no `.env`
2. Reinicie o TP Capital
3. Envie mensagem de teste no canal
4. Verifique nos logs se foi processada ou ignorada
5. Veja no dashboard: `http://localhost:3103/#/tp-capital`

