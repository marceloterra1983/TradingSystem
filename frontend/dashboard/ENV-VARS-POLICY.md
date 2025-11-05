# Environment Variables Policy - Vite Dashboard

> **Política Definitiva para Prevenir Erros de Variáveis Undefined**

## 🎯 Problema

Variáveis `import.meta.env.VITE_*` podem funcionar em **development** mas ficarem **undefined em production** se não forem propriamente configuradas no `vite.config.ts`.

**Sintoma:** Erros como "Invalid API key", "undefined" em logs, funcionalidades quebradas apenas em produção.

---

## ✅ Política Mandatória

### 1. **Todas** as variáveis `VITE_*` usadas no código **DEVEM** estar no bloco `define` do `vite.config.ts`

```typescript
// ✅ CORRETO
define: {
  'import.meta.env.VITE_GATEWAY_TOKEN': JSON.stringify(
    env.VITE_GATEWAY_TOKEN || env.TELEGRAM_GATEWAY_API_TOKEN || ''
  ),
  'import.meta.env.VITE_API_SECRET_TOKEN': JSON.stringify(
    env.VITE_API_SECRET_TOKEN || ''
  ),
}

// ❌ ERRADO - variável usada no código mas não definida em vite.config.ts
// Resultado: undefined em production!
```

### 2. **Sempre** forneça fallbacks em cadeia

```typescript
// ✅ MELHOR: Múltiplos fallbacks
env.VITE_GATEWAY_TOKEN || env.TELEGRAM_GATEWAY_API_TOKEN || env.API_SECRET_TOKEN || ''

// ⚠️ OK: Um fallback
env.VITE_GATEWAY_TOKEN || ''

// ❌ RUIM: Sem fallback (pode causar undefined)
env.VITE_GATEWAY_TOKEN
```

### 3. **Valide** antes de cada commit

```bash
# Execute antes de commitar mudanças no frontend
npm run validate:env
```

### 4. **Logue** variáveis críticas em development

```typescript
if (mode === 'development') {
  console.log('[vite] VITE_GATEWAY_TOKEN=', env.VITE_GATEWAY_TOKEN);
  console.log('[vite] VITE_API_SECRET_TOKEN=', env.VITE_API_SECRET_TOKEN);
  // ...outras variáveis críticas
}
```

---

## 🔧 Estrutura Recomendada

### 1. **Docker Compose** (Container Environment)

**Arquivo:** `tools/compose/docker-compose.dashboard.yml`

```yaml
services:
  dashboard:
    environment:
      # Defina TODAS as variáveis VITE_* necessárias
      - VITE_GATEWAY_TOKEN=${TELEGRAM_GATEWAY_API_TOKEN:-defaultValue}
      - VITE_API_SECRET_TOKEN=${API_SECRET_TOKEN:-defaultValue}
      # ... outras
```

**Regra:** Use `${VAR:-default}` para fallback automático

### 2. **Vite Config** (Build Time Injection)

**Arquivo:** `frontend/dashboard/vite.config.ts`

```typescript
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(...), ...process.env };
  
  // Log em development
  if (mode === 'development') {
    console.log('[vite] VITE_GATEWAY_TOKEN=', env.VITE_GATEWAY_TOKEN);
  }
  
  return {
    define: {
      // CRÍTICO: Defina TODAS as variáveis usadas no código
      'import.meta.env.VITE_GATEWAY_TOKEN': JSON.stringify(
        env.VITE_GATEWAY_TOKEN || env.TELEGRAM_GATEWAY_API_TOKEN || ''
      ),
    }
  };
});
```

### 3. **Source Code** (Runtime Usage)

**Arquivo:** `src/utils/getToken.ts` (exemplo)

```typescript
// ✅ RECOMENDADO: Função centralizada
export const getGatewayToken = () => {
  return import.meta.env.VITE_GATEWAY_TOKEN || 
         import.meta.env.VITE_TELEGRAM_GATEWAY_API_TOKEN || 
         '';
};

// ❌ EVITAR: Acesso direto espalhado no código
const token = import.meta.env.VITE_GATEWAY_TOKEN; // Dificulta auditoria
```

---

## 🚨 Variáveis Críticas (MUST HAVE)

Estas variáveis **DEVEM** estar sempre definidas:

| Variável | Propósito | Fallback |
|----------|-----------|----------|
| `VITE_GATEWAY_TOKEN` | Autenticação Telegram Gateway | `VITE_TELEGRAM_GATEWAY_API_TOKEN` |
| `VITE_TELEGRAM_GATEWAY_API_TOKEN` | Token de API alternativo | `TELEGRAM_GATEWAY_API_TOKEN` |
| `VITE_TELEGRAM_GATEWAY_API_URL` | URL do serviço | `http://localhost:4010` |
| `VITE_API_SECRET_TOKEN` | Token secreto geral | `API_SECRET_TOKEN` |

---

## 🔍 Validação Automática

### Script de Validação

**Executar antes de commits:**

```bash
npm run validate:env
```

**O que valida:**
1. ✅ Todas as variáveis `import.meta.env.VITE_*` usadas no código estão definidas em `vite.config.ts`
2. ✅ Variáveis críticas estão presentes
3. ✅ Fallbacks estão configurados

**Saída esperada:**
```
🔍 Validating environment variables...

📦 Found 12 VITE_* variables in source code
⚙️  Found 12 variables defined in vite.config.ts

✅ All validations passed!
✅ All VITE_* variables used in code are properly defined
✅ All critical variables are present

🎉 No "undefined" variables will occur in production!
```

---

## 🛠️ Troubleshooting

### Erro: "Invalid API key" ou "undefined"

**Diagnóstico:**

1. Verifique se a variável está definida no container:
   ```bash
   docker exec dashboard-ui printenv | grep VITE_GATEWAY_TOKEN
   ```

2. Verifique se está definida no `vite.config.ts`:
   ```bash
   grep "VITE_GATEWAY_TOKEN" frontend/dashboard/vite.config.ts
   ```

3. Execute validação:
   ```bash
   cd frontend/dashboard && npm run validate:env
   ```

**Solução:**

1. Adicione ao `docker-compose.dashboard.yml`:
   ```yaml
   - VITE_GATEWAY_TOKEN=${TELEGRAM_GATEWAY_API_TOKEN:-default}
   ```

2. Adicione ao `vite.config.ts` no bloco `define`:
   ```typescript
   'import.meta.env.VITE_GATEWAY_TOKEN': JSON.stringify(env.VITE_GATEWAY_TOKEN || ''),
   ```

3. Rebuild container:
   ```bash
   docker compose -f tools/compose/docker-compose.dashboard.yml up -d --force-recreate
   ```

---

## 📋 Checklist para Novas Variáveis

Quando adicionar uma nova variável `VITE_*`:

- [ ] Adicionar no `docker-compose.dashboard.yml` com fallback
- [ ] Adicionar no bloco `define` do `vite.config.ts` com fallbacks
- [ ] Adicionar log em development no `vite.config.ts`
- [ ] Se crítica, adicionar no array `CRITICAL_VARS` do `validate-env-vars.mjs`
- [ ] Executar `npm run validate:env`
- [ ] Testar em development e production
- [ ] Documentar neste arquivo se for crítica

---

## 🎓 Boas Práticas

1. **Centralize** acesso a variáveis em funções utilitárias
2. **Valide** com o script antes de commits
3. **Logue** em development para debugging
4. **Documente** variáveis críticas
5. **Teste** em ambos os modos (dev/prod)
6. **Use fallbacks** em cadeia para resiliência

---

**Última Atualização:** 2025-11-05  
**Autor:** TradingSystem Team  
**Versão:** 1.0

