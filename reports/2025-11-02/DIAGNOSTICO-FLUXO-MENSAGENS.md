# 🔍 Diagnóstico: Fluxo de Mensagens

**Data:** 2025-11-02 05:45 UTC  
**Status:** ⚠️ Mensagens salvas, mas sinais não estão sendo criados

---

## 📊 **ESTADO ATUAL DO BANCO**

### 1. Mensagens do Telegram (telegram_gateway.messages)
```
Total: 1944 mensagens
├─ -1001412188586: 819 mensagens
├─ -1001744113331: 606 mensagens
└─ -1001649127710: 519 mensagens

Mensagem mais recente: 2025-11-02 01:32 (há 4 horas)
```

### 2. Sinais Processados (tp_capital.tp_capital_signals)
```
Total: 103 sinais
Últimas 2 horas: 0 sinais ❌
```

---

## 🎯 **PROBLEMA IDENTIFICADO**

```
1. MTProto busca mensagens ──────────✅ FUNCIONANDO
                │
                ▼
2. Salva em telegram_gateway.messages ──✅ FUNCIONANDO (1944 msgs)
                │
                ▼
3. Worker busca mensagens ────────── ⚠️  VERIFICAR
                │
                ▼
4. Worker processa (parseSignal) ─── ⚠️  VERIFICAR
                │
                ▼
5. Worker salva sinais ───────────── ❌ NÃO ESTÁ SALVANDO
                │
                ▼
6. Frontend busca sinais ────────────❌ NENHUM SINAL NOVO
```

---

## 🔍 **HIPÓTESES**

### Hipótese 1: Worker NÃO está rodando
```bash
# Verificar logs do worker
docker logs apps-tpcapital | grep "worker"
```

### Hipótese 2: Worker está rodando mas NÃO processa
Possíveis causas:
- Filtro incorreto (busca canal errado)
- Status incorreto (busca 'queued', mas salva como 'received')
- Intervalo de polling muito grande

### Hipótese 3: Worker processa mas FALHA ao salvar
- Erro ao inserir em `tp_capital.tp_capital_signals`
- Tabela não existe ou tem estrutura incorreta

---

## 🚀 **PRÓXIMOS PASSOS**

1. ✅ Verificar se worker está ativo
2. ✅ Verificar filtros e status
3. ✅ Ver logs de erros ao processar
4. ✅ Ajustar worker para processar mensagens com status 'received'

---

**Continuando investigação...**

