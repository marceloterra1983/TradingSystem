# Pre-Commit Checklist - Frontend Dashboard

## ✅ Antes de Commitar

### 1. Validação de Variáveis de Ambiente
```bash
npm run validate:env
```

**Resultado esperado:**
```
✅ All CRITICAL validations passed!
✅ Critical Telegram Gateway variables are properly defined
```

**Se falhar:** Variáveis críticas estão faltando no `vite.config.ts`

---

### 2. Linting
```bash
npm run lint
```

**Resultado esperado:** Max 50 warnings (configurado no package.json)

---

### 3. Type Checking
```bash
npm run type-check
```

**Resultado esperado:** No errors

---

### 4. Tests (se houver)
```bash
npm run test
```

---

### 5. Build Test
```bash
npm run build:dev
```

**Resultado esperado:** Build sem erros

---

## 🚨 Critical Checks

### Variáveis VITE_* Críticas

Se você adicionou/modificou código que usa `import.meta.env.VITE_*`:

- [ ] Variável está no `.env` ou `docker-compose.yml`
- [ ] Variável está no bloco `define` do `vite.config.ts`
- [ ] Se crítica, está no array `CRITICAL_VARS` do `validate-env-vars.mjs`
- [ ] `npm run validate:env` passa sem erros

### Telegram Gateway Específico

Se modificou código do Telegram Gateway:

- [ ] `VITE_GATEWAY_TOKEN` ainda está definido
- [ ] `VITE_TELEGRAM_GATEWAY_API_TOKEN` ainda está definido
- [ ] `VITE_TELEGRAM_GATEWAY_API_URL` ainda está definido
- [ ] Container testado: `docker compose up -d --force-recreate`

---

## 📝 Quick Commands

```bash
# Full validation suite
npm run lint && npm run type-check && npm run validate:env

# Test container locally
cd ../../tools/compose
docker compose -f docker-compose.dashboard.yml up -d --force-recreate
docker logs dashboard-ui | grep -E "\[vite\] VITE_GATEWAY_TOKEN"
```

---

**Lembre-se:** O validador (`npm run validate:env`) previne 99% dos problemas de variáveis undefined! ✅
