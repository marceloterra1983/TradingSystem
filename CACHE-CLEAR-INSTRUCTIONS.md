# 🔥 Instruções de Limpeza de Cache - Dashboard

**Quando usar:** Após rebuild do dashboard, quando mudanças não aparecem no browser.

---

## Método 1: Clear Site Data (RECOMENDADO)

### Chrome/Edge

1. Abra **DevTools** (`F12`)
2. Vá na aba **"Application"** (ou "Aplicativo")
3. No menu esquerdo, clique em **"Storage"**
4. Clique em **"Clear site data"**
5. Marque **TODAS** as opções:
   - ☑️ Cookies and site data
   - ☑️ Cache storage  
   - ☑️ Application cache
   - ☑️ Local storage
   - ☑️ Session storage
6. Clique em **"Clear site data"**
7. **FECHE e REABRA** o browser
8. Acesse novamente: `http://localhost:3103`

### Firefox

1. `F12` → Aba **"Storage"**
2. Botão direito em **"localhost:3103"**
3. **"Delete All"**
4. Feche e reabra o browser

---

## Método 2: Hard Refresh (Mais Rápido)

### Windows/Linux
```
Ctrl + Shift + R
ou
Ctrl + F5
```

### macOS
```
Cmd + Shift + R
```

⚠️ **Nota:** Hard refresh nem sempre funciona para Service Workers e cache de API!

---

## Método 3: Modo Anônimo/Privado (Para Testes)

### Chrome/Edge
```
Ctrl + Shift + N
```

### Firefox
```
Ctrl + Shift + P
```

Depois acesse: `http://localhost:3103/telegram-gateway`

**Vantagem:** Sem cache, sem cookies, sem service workers

---

## Método 4: Linha de Comando (DevTools Console)

```javascript
// Cola no Console (F12) e pressiona Enter
caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))))
  .then(() => location.reload(true));
```

---

## ✅ Como Confirmar Que o Cache Foi Limpo?

1. Abra **Network** tab (F12)
2. Marque **"Disable cache"**
3. Recarregue a página
4. Verifique que os arquivos `.js` têm **novos hashes**:
   - Antes: `chunk-NXESFFTV.js?v=27eb121b`
   - Depois: `chunk-NXESFFTV.js?v=<NOVO_HASH>`

---

## 🚨 Se Ainda Não Funcionar

Tente **limpar cache do Vite no servidor**:

```bash
docker exec dashboard-ui rm -rf /app/node_modules/.vite
docker compose -f tools/compose/docker-compose.dashboard.yml restart
```

---

**Última Atualização:** 2025-11-05

