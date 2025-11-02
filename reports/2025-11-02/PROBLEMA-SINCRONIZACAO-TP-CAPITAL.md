# 🔍 Diagnóstico: Problema de Sincronização TP Capital

**Data:** 2025-11-02  
**Issue:** Botão "Checar Mensagens" não sincroniza adequadamente  
**Status:** 🔍 DIAGNOSTICADO

---

## 🚨 Problemas Identificados

### 1. **Telegram Gateway Offline** ❌

```
❌ Container não está rodando
❌ Porta 4006 não responde
❌ Endpoint /sync-messages falha (não consegue chamar Gateway)
```

**Impacto:**
- ❌ Sem novos sinais do Telegram
- ❌ Sincronização limitada a 10 msgs (em vez de 500)
- ❌ Funcionalidade degradada

---

### 2. **Gateway DB Vazio** ⚠️

```
SELECT COUNT(*) FROM telegram_gateway.messages
WHERE channel_id = '-1001649127710';

Resultado: 0 rows
```

**Causa:** Gateway não está capturando mensagens (offline)

---

### 3. **Timestamp `ts` como NULL** ⚠️

**Status:** Dados antigos têm `ts=null`

**Dados no banco:**
```sql
SELECT id, ts, asset FROM signals_v2 WHERE ts IS NOT NULL;

✅ 22 registros COM ts (correto)
⚠️ Alguns registros SEM ts (dados antigos/migrados)
```

**Solução:**
- Frontend já trata `ts=null` → mostra "?"
- Dados novos terão `ts` preenchido
- Pode usar `created_at` como fallback

---

## 🔧 Arquitetura do Sistema (Como Deveria Funcionar)

```
Telegram (Mensagens)
  ↓
Telegram Gateway (Port 4006) ← ❌ OFFLINE
  ↓
Gateway DB (telegram_gateway.messages) ← ❌ VAZIO
  ↓
TP Capital Polling Worker (a cada 5s)
  ↓
TP Capital DB (tp_capital.signals_v2)
  ↓
Dashboard (localhost:3103)
```

**Ponto de Falha:** Telegram Gateway está offline!

---

## ✅ Soluções

### Solução 1: Iniciar Telegram Gateway (Recomendado)

**Localização:** `backend/api/telegram-gateway/`

```bash
# Verificar se existe
ls backend/api/telegram-gateway/

# Se existir, iniciar
cd backend/api/telegram-gateway
npm install
npm run dev
```

**Porta:** 4006

---

### Solução 2: Popular Gateway DB Manualmente

Se Gateway não puder ser iniciado, popular mensagens de teste:

```sql
INSERT INTO telegram_gateway.messages (
  channel_id, message_id, text, telegram_date, 
  received_at, status, source
)
VALUES (
  '-1001649127710', 
  12345, 
  'ATIVO: PETR4 COMPRA: 25.00 A 26.00 STOP: 20.00', 
  NOW(), 
  NOW(), 
  'received',
  'manual'
);
```

Depois, Polling Worker processará automaticamente.

---

### Solução 3: Usar Dados Históricos (Temporário)

**Dashboard já funciona** com dados históricos:

```
✅ 22 sinais existentes no banco
✅ Visualização funciona
⚠️ Sem novos sinais até Gateway voltar
```

---

## 🎯 Ação Recomendada

### Opção A: Iniciar Full Stack (Ideal)

```bash
# Script que verifica e inicia tudo
sudo bash scripts/setup/start-full-tp-capital-stack.sh
```

**Vai iniciar:**
1. TimescaleDB (se offline)
2. Telegram Gateway (se disponível)
3. TP Capital API

---

### Opção B: Continuar Sem Gateway (Limitado)

```
✅ TP Capital funciona com dados históricos
✅ Polling Worker processa o que está no banco
⚠️ Sem novos sinais do Telegram
⚠️ Sincronização limitada
```

**Aceitável para:** Desenvolvimento, testes com dados existentes

---

## 🐛 Fix para Timestamp `ts=null`

### Backend já corrigido:

```javascript
// server.js linha 281
ts: row.ts ? Number(row.ts) : null,  // ✅ Converte BIGINT para number
```

### Frontend já trata:

```typescript
// utils.ts linha 56
export function formatTimestamp(ts: string | number) {
  if (!ts) return "?";  // ✅ Mostra "?" se null
  // ... resto do código
}
```

**Solução para "?":**
- Dados novos terão `ts` preenchido
- Ou usar fallback para `created_at`:

```typescript
const displayDate = row.ts || row.created_at || row.ingested_at;
formatTimestamp(displayDate);
```

---

## 📋 Checklist de Solução

- [x] TimescaleDB funcionando
- [x] VIEW corrigida (created_at, updated_at)
- [x] Código corrigido (ts conversion)
- [x] Circuit Breaker implementado
- [ ] **Telegram Gateway rodando (PENDENTE)**
- [ ] Gateway DB populado (PENDENTE)
- [ ] Sincronização de 500 msgs funcionando (PENDENTE)

---

## 🚀 Próximos Passos

### 1. Iniciar Telegram Gateway

```bash
cd backend/api/telegram-gateway
npm install
npm run dev
```

### 2. Validar Gateway

```bash
curl http://localhost:4006/health
```

### 3. Sincronizar Mensagens

```bash
curl -X POST -H "X-API-Key: bbf913dad..." http://localhost:4005/sync-messages
```

### 4. Ver Resultados no Dashboard

```
http://localhost:3103 → TP Capital → Checar Mensagens
```

---

**Aguardando sua decisão:**
- **Opção A:** Iniciar Telegram Gateway (funcionalidade completa)
- **Opção B:** Continuar sem Gateway (limitado aos dados existentes)

Qual prefere?

