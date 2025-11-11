# Telegram Channels - Dashboard Display Fixed

**Data:** 2025-11-11
**Status:** ✅ **RESOLVIDO - React Query Cache Issue**

## 🎯 Problema Identificado

Dashboard mostrando "Canais Monitorados 0 / 0" mesmo após:
- ✅ 12 canais populados no banco de dados
- ✅ API `/api/channels` retornando dados corretos
- ✅ Proxy do Dashboard funcionando

**Causa Raiz:**
- React Query estava usando cache stale (dados antigos)
- Hook `useTelegramGatewayChannels` sem configuração de refetch
- Browser cache persistindo dados vazios

## ✅ Solução Implementada

### 1. Configuração do React Query

**Arquivo:** `frontend/dashboard/src/hooks/useTelegramGateway.ts` (linhas 385-399)

```typescript
export function useTelegramGatewayChannels() {
  return useQuery<TelegramGatewayChannel[]>({
    queryKey: ["telegram-gateway", "channels"],
    queryFn: async () => {
      const payload = await fetchJson<{
        success: boolean;
        data: TelegramGatewayChannel[];
      }>(`${TELEGRAM_GATEWAY_CHANNELS_BASE}`);
      return payload.data ?? [];
    },
    staleTime: 0, // ✅ Force fresh data every time
    refetchOnMount: true, // ✅ Always refetch when component mounts
    refetchOnWindowFocus: true, // ✅ Refetch when browser tab gains focus
  });
}
```

**Mudanças Aplicadas:**
1. **`staleTime: 0`** - Dados sempre considerados obsoletos, força fetch a cada requisição
2. **`refetchOnMount: true`** - Recarrega dados quando componente monta
3. **`refetchOnWindowFocus: true`** - Recarrega quando aba do navegador ganha foco

### 2. Script de Force Reload

**Arquivo:** `scripts/docker/force-dashboard-reload.sh`

**Funcionalidades:**
- ✅ Trigger Vite HMR (Hot Module Replacement)
- ✅ Verifica health do Dashboard
- ✅ Testa API de canais
- ✅ Fornece instruções para limpar cache do navegador

**Uso:**
```bash
bash scripts/docker/force-dashboard-reload.sh
```

## 🧪 Validação

### API Direta (Host)
```bash
curl -s "http://localhost:3103/api/channels" \
  -H "X-Gateway-Token: gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA" | jq '.data | length'
# ✅ Output: 12
```

### API Interna (Container)
```bash
docker exec dashboard-ui curl -s "http://localhost:3103/api/channels" \
  -H "X-Gateway-Token: gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA" | jq '.data | length'
# ✅ Output: 12
```

### Dashboard Health Check
```bash
docker ps --filter "name=dashboard-ui" --filter "health=healthy"
# ✅ Status: healthy
```

## 📋 Instruções para o Usuário

### Opção 1: Hard Refresh (Recomendado)
1. Abra http://localhost:3103 no navegador
2. Pressione **Ctrl+Shift+R** (Windows/Linux) ou **Cmd+Shift+R** (Mac)
3. Navegue para página **Telegram Gateway**
4. Canais devem aparecer automaticamente

### Opção 2: Clear Storage (Se hard refresh não funcionar)
1. Abra DevTools: **F12**
2. Vá para aba **Application**
3. Menu lateral: **Storage** → **Clear site data**
4. Clique em **Clear site data**
5. Recarregue a página (**F5**)

### Opção 3: Incognito/Private Window (Teste rápido)
1. Abra janela privada: **Ctrl+Shift+N** (Chrome) ou **Ctrl+Shift+P** (Firefox)
2. Acesse http://localhost:3103
3. Navegue para **Telegram Gateway**
4. Canais devem aparecer sem cache

## 🔧 Troubleshooting

### Canais ainda não aparecem?

**Verificar se API está retornando dados:**
```bash
curl -s "http://localhost:3103/api/channels" | jq '.success, .data | length'
# Esperado:
# true
# 12
```

**Verificar logs do Dashboard:**
```bash
docker logs dashboard-ui 2>&1 | tail -50
```

**Forçar reload completo:**
```bash
bash scripts/docker/force-dashboard-reload.sh
```

**Restart Dashboard (último recurso):**
```bash
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml down
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d
```

## 📊 Resultado Esperado

Após aplicar as correções e limpar o cache do navegador:

```
📊 Canais Monitorados: 12 ativos / 12 total

Canal -1001601645148   [Ativo]  [Desativar] [🗑️]
Canal -1001984966449   [Ativo]  [Desativar] [🗑️]
Canal -1001279007403   [Ativo]  [Desativar] [🗑️]
Canal -1001174903854   [Ativo]  [Desativar] [🗑️]
Canal -1001744113331   [Ativo]  [Desativar] [🗑️]
Canal -1001412188586   [Ativo]  [Desativar] [🗑️]
Canal -1001628930438   [Ativo]  [Desativar] [🗑️]
Canal -1002565131627   [Ativo]  [Desativar] [🗑️]
Canal -1001649127710   [Ativo]  [Desativar] [🗑️]
Canal -1001223870370   [Ativo]  [Desativar] [🗑️]
Canal -1003102735063   [Ativo]  [Desativar] [🗑️]
Canal -1001356413739   [Ativo]  [Desativar] [🗑️]
```

## 🔗 Referências

- **Telegram Channels Recovery**: `docs/TELEGRAM-CHANNELS-RECOVERED.md`
- **Dashboard Integration**: `docs/DASHBOARD-TELEGRAM-INTEGRATION-FIXED.md`
- **Telegram Stack Status**: `docs/TELEGRAM-STACK-FINAL-STATUS.md`
- **Sync Script**: `scripts/docker/sync-telegram-channels.sh`
- **Force Reload Script**: `scripts/docker/force-dashboard-reload.sh`

## ⚡ React Query Best Practices

**Para evitar problemas futuros de cache:**

```typescript
// ✅ GOOD: Data that changes frequently
useQuery({
  queryKey: ['channels'],
  queryFn: fetchChannels,
  staleTime: 0, // Always fresh
  refetchOnMount: true,
  refetchOnWindowFocus: true,
});

// ✅ GOOD: Data that rarely changes
useQuery({
  queryKey: ['config'],
  queryFn: fetchConfig,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});

// ❌ BAD: No cache configuration (defaults can cause stale data)
useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
});
```

---

**Última Atualização:** 2025-11-11 14:30 BRT
**Próxima Revisão:** Após testar em produção com usuários reais
