# 🎯 Instruções: Como Usar o Botão "Checar Mensagens"

**Atualizado**: 2025-11-03

---

## ✅ O Que Foi Corrigido

Todos os problemas técnicos foram resolvidos:

1. ✅ Variável `VITE_TP_CAPITAL_API_KEY` adicionada ao `.env`
2. ✅ Dashboard reiniciado para carregar variável
3. ✅ TP Capital atualizado para enviar X-API-Key ao Gateway
4. ✅ Container `apps-tpcapital` reiniciado
5. ✅ Tabelas do banco criadas (`telegram_gateway.messages`, `telegram_gateway.channels`)
6. ✅ Bug `sessionString is not defined` corrigido

---

## ⚠️ Ação Necessária: Autenticação do Telegram

O **Telegram Gateway** precisa de autenticação one-time com o Telegram.

### Por Que Isso Acontece?

O serviço usa **MTProto** (protocolo nativo do Telegram) e precisa autenticar uma vez. Após isso, a sessão é salva e funciona automaticamente.

---

## 📋 Passo a Passo

### 1. Abra o Terminal de Logs

Em um terminal, execute:

```bash
tail -f /tmp/tradingsystem-logs/telegram-gateway-api-$(date +%Y%m%d).log
```

### 2. Aguarde a Mensagem de Código

Você verá:

```
[TelegramClient] Authenticating with phone: +5567991908000
? Please enter the code you received: _
```

### 3. Verifique Seu Telegram

- Abra o aplicativo **Telegram** no celular/desktop
- Verifique as mensagens no número **+5567991908000**
- Você deve ter recebido um código de 5 dígitos
- Exemplo: `12345`

### 4. Digite o Código

No terminal onde está mostrando "Please enter the code:", digite o código e pressione Enter:

```
? Please enter the code you received: 12345
```

### 5. Confirmação

Após digitar o código corretamente, você verá:

```
[TelegramClient] Successfully connected and authenticated
Session saved (encrypted): ~/.config/telegram-gateway/session.enc
```

### 6. Teste o Botão

Agora você pode testar:

1. Abra: http://localhost:3103
2. Vá para: **TP Capital** (menu lateral)
3. Clique em: **"Checar Mensagens"**
4. **Resultado esperado**:
   ```
   ✅ X mensagem(ns) sincronizada(s) de Y canal(is). Z salvas no banco.
   ```

---

## 🔄 Se Algo Der Errado

### Problema: Button ainda mostra erro

**Solução 1**: Limpar cache do browser
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

**Solução 2**: Verificar se Dashboard carregou a variável
```bash
# Open browser DevTools → Console
console.log(import.meta.env.VITE_TP_CAPITAL_API_KEY)
// Should show: "bbf913dad93ae879f1fbbec4490303a2c0d49be1d717342a64173a192f99f1a1"
```

### Problema: Timeout (15+ segundos)

**Causa**: Telegram Gateway esperando código de autenticação

**Solução**: Siga os passos 1-5 acima para autenticar

### Problema: Erro "503 Service Unavailable"

**Causa**: Telegram Gateway API não está rodando

**Solução**:
```bash
cd /home/marce/Projetos/TradingSystem/backend/api/telegram-gateway
npm run dev
```

---

## 📊 Como Funciona (Fluxo Completo)

```
┌─────────────┐  1. POST /sync-messages      ┌───────────────┐
│  Dashboard  │─────────────────────────────>│  TP Capital   │
│  (3103)     │  X-API-Key: bbf9...          │  (4006)       │
└─────────────┘                               └───────┬───────┘
                                                     │
                                                     │ 2. POST /api/telegram-gateway/sync-messages
                                                     │    X-API-Key: f7b2...
                                                     ▼
                                             ┌────────────────┐
                                             │  Telegram      │
                                             │  Gateway API   │
                                             │  (4010)        │
                                             └───────┬────────┘
                                                     │
                                                     │ 3. Connect to Telegram
                                                     │    MTProto (requires code)
                                                     ▼
                                             ┌────────────────┐
                                             │   Telegram     │
                                             │   Servers      │
                                             └───────┬────────┘
                                                     │
                                                     │ 4. Return messages
                                                     ▼
                                             ┌────────────────┐
                                             │  TimescaleDB   │
                                             │  telegram_     │
                                             │  gateway.      │
                                             │  messages      │
                                             └────────────────┘
```

---

## 🎉 Success Indicators

Você saberá que está tudo funcionando quando:

✅ Botão "Checar Mensagens" fica azul (não vermelho)  
✅ Ao clicar, mostra "Verificando..." com spinner  
✅ Após 2-5 segundos, mostra mensagem de sucesso verde  
✅ Número de mensagens sincronizadas aparece  
✅ Tabela de sinais é atualizada automaticamente  

---

## 📞 Troubleshooting

### Logs Úteis

```bash
# Dashboard
tail -f /tmp/tradingsystem-logs/dashboard-$(date +%Y%m%d).log

# TP Capital
docker logs -f apps-tpcapital

# Telegram Gateway API
tail -f /tmp/tradingsystem-logs/telegram-gateway-api-$(date +%Y%m%d).log

# Database
docker logs -f data-timescale
```

### Verificar Saúde dos Serviços

```bash
# Status geral
bash scripts/status.sh

# Health check completo
bash scripts/maintenance/health-check-all.sh

# Testar endpoint direto
curl -X POST http://localhost:4006/sync-messages \
  -H "X-API-Key: bbf913dad93ae879f1fbbec4490303a2c0d49be1d717342a64173a192f99f1a1" \
  -H "Content-Type: application/json"
```

---

## 📚 Documentação Completa

Para análise técnica detalhada, veja:

- **`FIX-CHECAR-MENSAGENS-REPORT.md`** - Relatório completo de todos os problemas e correções
- **`UNHEALTHY-CONTAINERS-REPORT.md`** - Análise dos containers unhealthy (Qdrant, etc.)

---

**Precisa de ajuda?** Verifique os logs acima e procure por erros específicos. A maioria dos problemas agora se resume à autenticação do Telegram (ação manual única).


