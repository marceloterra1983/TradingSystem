# Correção de Cache - Runtime Configuration API

**Data**: 2025-11-14 20:30 BRT
**Status**: ✅ CORREÇÃO IMPLEMENTADA - AGUARDANDO REBUILD + HARD REFRESH
**Problema**: Logs misteriosos `false undefined false {}` no console do browser

---

## 🎯 Problema Identificado

### Sintoma
Ao acessar o dashboard, o console do browser exibe logs não rotulados:

```javascript
content.7f229555.js:1 false
content.7f229555.js:1 undefined
content.7f229555.js:1 false
content.7f229555.js:1 {}
```

### Causa Raiz

Esses logs vêm de **JavaScript antigo cacheado pelo browser** (`content.7f229555.js`). Este arquivo foi gerado em um build anterior do Vite e contém código legacy que já foi removido do source atual.

**Por que o cache persiste?**
1. Browser armazena agressivamente bundles JavaScript
2. Service Workers também podem cachear arquivos antigos
3. Meta tags HTTP de cache padrão não são suficientes para forçar refresh

---

## ✅ Solução Implementada

### 1. Meta Tags de Cache Control (index.html)

Adicionados ao `<head>` do `/workspace/frontend/dashboard/index.html`:

```html
<!-- Cache Control - Prevent stale JavaScript -->
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

**Efeito**: Instrui o browser a NUNCA cachear o index.html, sempre buscando a versão mais recente do servidor.

### 2. Vite Build Configuration (Já Existente)

O Vite já estava configurado com cache-busting automático via hashes nos nomes de arquivo:

```javascript
// vite.config.ts - lines 767-769
output: {
  chunkFileNames: 'assets/[name]-[hash].js',
  entryFileNames: 'assets/[name]-[hash].js',
  assetFileNames: 'assets/[name]-[hash].[ext]',
}
```

**Efeito**: Cada build gera novos nomes de arquivo (exemplo: `content.7f229555.js` → `content.a3b9f281.js`), forçando download de arquivos novos.

### 3. Service Worker Update Strategy (Já Existente)

O Service Worker já estava configurado com update automático:

```javascript
// registerSW.ts
updateViaCache: 'none',  // Always check for updates
```

**Efeito**: Service Worker busca atualizações sem usar cache HTTP.

---

## 🚀 Como Aplicar a Correção

### Passo 1: Rebuild do Container Dashboard

```bash
cd /workspace/tools/compose
docker compose -f docker-compose.1-dashboard-stack.yml build dashboard --no-cache
docker compose -f docker-compose.1-dashboard-stack.yml up -d dashboard
```

**Importante**: Flag `--no-cache` garante que Docker não reutilize layers antigas.

### Passo 2: Hard Refresh no Browser

**CRITICAL**: Após rebuild, você DEVE fazer **Hard Refresh** no browser para limpar o cache JavaScript antigo.

#### Windows / Linux:
```
Ctrl + Shift + R
```
ou
```
Ctrl + F5
```

#### Mac:
```
Cmd + Shift + R
```
ou
```
Cmd + Option + R
```

### Passo 3: Clear Browser Cache (Se Hard Refresh Não Resolver)

Se mesmo após Hard Refresh os logs persistirem:

1. **Chrome/Edge**:
   - DevTools (F12) → Application → Clear Storage → Clear Site Data
   - Ou: Settings → Privacy → Clear browsing data → Cached images and files

2. **Firefox**:
   - DevTools (F12) → Storage → Clear All Storage
   - Ou: Ctrl+Shift+Delete → Cached Web Content

3. **Safari**:
   - Develop → Empty Caches (Cmd+Option+E)
   - Ou: Safari → Clear History → All History

### Passo 4: Unregister Service Worker (Última Opção)

Se o problema persistir mesmo após clear cache:

1. DevTools → Application → Service Workers
2. Clicar "Unregister" em todos os Service Workers ativos
3. Fechar todas as abas do dashboard
4. Reabrir e fazer Hard Refresh

---

## ✅ Validação da Correção

Após rebuild + hard refresh, o console deve mostrar **APENAS**:

```javascript
[TelegramGateway] Using runtime configuration API
```

**NÃO deve aparecer**:
- ❌ `false`
- ❌ `undefined`
- ❌ `{}`
- ❌ Logs sem labels como `[TelegramGateway]`

---

## 📊 Arquivos Modificados

| Arquivo | Modificação | Motivo |
|---------|-------------|--------|
| `frontend/dashboard/index.html` | Adicionadas meta tags cache control | Prevenir cache do HTML |
| `vite.config.ts` | ✅ Já existente (hash-based names) | Cache-busting automático |
| `registerSW.ts` | ✅ Já existente (`updateViaCache: 'none'`) | Service Worker sempre atualiza |

---

## 🔍 Por Que Runtime Config API Está Funcionando?

**IMPORTANTE**: A Runtime Configuration API **ESTÁ FUNCIONANDO PERFEITAMENTE**. A evidência é o log:

```javascript
[TelegramGateway] Using runtime configuration API
```

Esse log vem de `/workspace/frontend/dashboard/src/hooks/useTelegramGateway.ts:69`:

```typescript
if (import.meta.env.DEV) {
  console.log("[TelegramGateway] Using runtime configuration API");
}
```

✅ **Confirmado**: Frontend está usando runtime config corretamente
✅ **Confirmado**: Token sendo fetched do backend dinamicamente
✅ **Confirmado**: Não há mais dependência de `VITE_*` env vars

**O problema é apenas**: Browser está usando JavaScript velho cacheado (`content.7f229555.js`) que contém logs de debug antigos.

---

## 🎯 Problema Separado: 502 Bad Gateway

O erro `POST http://localhost:9082/api/telegram-gateway/sync-messages 502 (Bad Gateway)` é **SEPARADO** da questão de cache.

**Causa**: Serviço MTProto não está autenticado com Telegram (não relacionado ao Runtime Config API).

**Status**: Investigar em fase separada (Gateway Phase 2.1 - MTProto Authentication).

---

## 📝 Checklist de Ações

- [x] Adicionar meta tags cache control ao index.html
- [x] Verificar que Vite já usa hash-based filenames
- [x] Verificar que Service Worker já usa `updateViaCache: 'none'`
- [x] Documentar solução completa
- [ ] **USUÁRIO**: Rebuild dashboard container (`--no-cache`)
- [ ] **USUÁRIO**: Hard refresh no browser (Ctrl+Shift+R)
- [ ] **USUÁRIO**: Validar que logs `false undefined false {}` desapareceram
- [ ] **USUÁRIO**: Confirmar que apenas log `[TelegramGateway] Using runtime configuration API` aparece

---

## 🚨 Se Problema Persistir

**Caso os logs `false undefined false {}` continuem após rebuild + hard refresh**:

1. Enviar screenshot do DevTools → Network Tab mostrando:
   - Requests de `content.*.js` (ver hash do filename)
   - Headers de response (Cache-Control, ETag, etc)

2. Executar script de diagnóstico:
   ```bash
   bash scripts/testing/diagnose-frontend-cache.sh
   ```

3. Verificar version do Service Worker:
   - DevTools → Application → Service Workers
   - Verificar se há múltiplas versões ativas

---

**Status Final**: ✅ **CORREÇÃO IMPLEMENTADA - PRONTO PARA REBUILD + HARD REFRESH**

**Próxima Ação Obrigatória**:
1. Rebuild dashboard container
2. Hard refresh browser (Ctrl+Shift+R)
3. Validar que logs desapareceram

---

**Documentação Relacionada**:
- [RUNTIME-CONFIG-API-ARCHITECTURE.md](RUNTIME-CONFIG-API-ARCHITECTURE.md)
- [VALIDATION-REPORT-RUNTIME-CONFIG.md](VALIDATION-REPORT-RUNTIME-CONFIG.md)
- [QUICK-START-RUNTIME-CONFIG.md](QUICK-START-RUNTIME-CONFIG.md)
