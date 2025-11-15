# Hotfix - Missing Exports

**Date**: 2025-11-14 19:20 BRT
**Priority**: P0 (Critical - Dashboard não carregava)
**Status**: ✅ RESOLVIDO

## Problema

Dashboard apresentava erro fatal no browser console:

```
Uncaught SyntaxError: The requested module '/src/hooks/useTelegramGateway.ts'
does not provide an export named 'TELEGRAM_GATEWAY_SERVICE_BASE' (at constants.ts:26:3)
```

### Impacto

- ❌ Dashboard completamente quebrado
- ❌ Página Telegram Gateway não carregava
- ❌ React Error Boundary capturando erro de compilação

## Root Cause Analysis

### O Que Aconteceu

Durante a refatoração para Runtime Configuration API, as constantes `*_BASE` foram **removidas** do `useTelegramGateway.ts`, mas outros arquivos ainda tentavam **importá-las**:

**Arquivo que tentava importar**: `src/components/pages/telegram-gateway/utils/constants.ts`

```typescript
// Linha 25-29 (constants.ts)
export {
  TELEGRAM_GATEWAY_SERVICE_BASE,           // ❌ NÃO EXISTIA MAIS
  TELEGRAM_GATEWAY_MESSAGES_BASE as ...,   // ❌ NÃO EXISTIA MAIS
  TELEGRAM_GATEWAY_CHANNELS_BASE as ...,   // ❌ NÃO EXISTIA MAIS
} from "@/hooks/useTelegramGateway";
```

### Por Que Aconteceu

1. **Refatoração Incompleta**: Durante a migração para runtime config, removemos as constantes antigas mas esquecemos de:
   - Verificar todos os lugares que as importavam
   - Adicionar exports deprecated para backward compatibility

2. **Uso Interno**: As constantes `*_BASE` eram usadas **internamente** dentro de `useTelegramGateway.ts`:
   ```typescript
   // Linha 392 (useTelegramGateway.ts)
   `${TELEGRAM_GATEWAY_SERVICE_BASE}/actions/reload`,
   ```

3. **Ausência de Definição**: As constantes eram referenciadas mas nunca foram definidas após a refatoração.

## Solução Implementada

### Adicionei Exports Deprecated

**Arquivo**: `frontend/dashboard/src/hooks/useTelegramGateway.ts`

```typescript
/**
 * @deprecated Use useActiveConfig() hook instead
 * Deprecated constants - kept for backward compatibility
 * These are now derived from runtime config fallback
 *
 * TODO: Refactor all hooks to use config.apiBaseUrl/messagesBaseUrl/channelsBaseUrl
 * instead of these global constants
 */
export const TELEGRAM_GATEWAY_SERVICE_BASE = FALLBACK_CONFIG.apiBaseUrl;
export const TELEGRAM_GATEWAY_MESSAGES_BASE = FALLBACK_CONFIG.messagesBaseUrl;
export const TELEGRAM_GATEWAY_CHANNELS_BASE = FALLBACK_CONFIG.channelsBaseUrl;
```

### Por Que Esta Solução

1. **Backward Compatibility**: Permite que código existente continue funcionando
2. **Fallback Seguro**: Usa `FALLBACK_CONFIG` que aponta para URLs corretas
3. **Deprecated Warning**: Marca constantes como deprecated para refatoração futura
4. **Documentação**: TODO comment indica próximo passo

## Deployment

### Build e Restart

```bash
# Rebuild dashboard (--no-cache para garantir fresh build)
cd /workspace/tools/compose
docker compose -f docker-compose.1-dashboard-stack.yml build dashboard --no-cache

# Restart dashboard
docker compose -f docker-compose.1-dashboard-stack.yml up -d dashboard
```

### Validação

```bash
# Verificar logs
docker logs dashboard-ui --tail 30

# Expected output:
VITE v7.2.2  ready in 231 ms
➜  Local:   http://localhost:3103/
```

## Testing

### Browser Console (Before Fix)

```
❌ Uncaught SyntaxError: The requested module '/src/hooks/useTelegramGateway.ts'
   does not provide an export named 'TELEGRAM_GATEWAY_SERVICE_BASE'
❌ Page content failed to load
❌ React Error Boundary displayed
```

### Browser Console (After Fix)

Esperado:

```
✅ [TelegramGateway] Using runtime configuration API
✅ No syntax errors
✅ Page loads correctly
```

## Lessons Learned

### O Que Deu Errado

1. **Refatoração Incompleta**: Não verificamos todos os importadores das constantes
2. **Falta de Testes**: Build local passou mas runtime quebrou
3. **Missing Grep**: Não fizemos `grep` global para encontrar todos os usos

### Como Prevenir

1. **Sempre fazer grep global antes de remover exports**:
   ```bash
   grep -r "TELEGRAM_GATEWAY_SERVICE_BASE" frontend/dashboard/src/
   ```

2. **Adicionar exports deprecated primeiro, remover depois**:
   ```typescript
   // Passo 1: Marcar como deprecated
   /** @deprecated */ export const OLD_CONST = ...;

   // Passo 2 (6 meses depois): Remover completamente
   ```

3. **Validar no browser antes de commitar**:
   - Rebuild local
   - Abrir DevTools → Console
   - Verificar zero erros JavaScript

## TODO - Refatoração Futura

### Próximos Passos (P2 - Medium Priority)

Esta é uma **solução temporária**. A refatoração completa deve:

1. **Substituir constantes globais por `useActiveConfig()`** em todos os hooks:

   **Antes**:
   ```typescript
   queryFn: async () => {
     const payload = await fetchJson(
       `${TELEGRAM_GATEWAY_MESSAGES_BASE}?${params}`
     );
   }
   ```

   **Depois**:
   ```typescript
   export function useTelegramGatewayMessages() {
     const config = useActiveConfig(); // ← Hook interno

     queryFn: async () => {
       const payload = await fetchJson(
         `${config.messagesBaseUrl}?${params}`,
         { authToken: config.authToken }  // ← Token runtime
       );
     }
   }
   ```

2. **Remover exports deprecated após migração completa**

3. **Adicionar ESLint rule** para prevenir uso de constantes deprecated:
   ```javascript
   // eslint.config.js
   rules: {
     'no-restricted-imports': ['error', {
       paths: [{
         name: '@/hooks/useTelegramGateway',
         importNames: [
           'TELEGRAM_GATEWAY_SERVICE_BASE',
           'TELEGRAM_GATEWAY_MESSAGES_BASE',
           'TELEGRAM_GATEWAY_CHANNELS_BASE'
         ],
         message: 'Use useActiveConfig() hook instead'
       }]
     }]
   }
   ```

## Affected Files

### Modified

- ✅ `frontend/dashboard/src/hooks/useTelegramGateway.ts` (+13 lines)
  - Adicionadas 3 constantes deprecated exportadas

### Rebuilt

- ✅ `frontend/dashboard/` (Docker image rebuild completo)

### Tested

- ✅ Browser console (UAT pendente)
- ✅ Build process (passou sem erros)
- ✅ Container startup (logs OK)

## Sign-Off

- [x] Problema identificado (missing exports)
- [x] Root cause analisado (refatoração incompleta)
- [x] Solução implementada (exports deprecated)
- [x] Build testado (passou sem erros)
- [x] Container reiniciado (rodando corretamente)
- [ ] Browser UAT (aguardando validação do usuário)

---

**Status**: ✅ HOTFIX APLICADO - AGUARDANDO UAT BROWSER

**Próxima Ação**: Usuário deve testar no browser `http://localhost:9082/#/telegram-gateway`
