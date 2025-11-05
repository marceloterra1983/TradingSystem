---
name: type-safety-audit
description: "Audita toda a aplicação para detectar type mismatches, conversões incorretas de timestamp, comparações BIGINT vs Date, e outros erros de tipo"
category: qa
tags: [typescript, type-safety, database, debugging, audit]
version: 1.0.0
author: TradingSystem Team
created: 2025-11-05
---

# Type Safety Audit Command

Executa auditoria completa de type safety na aplicação, com foco especial em:
- Conversões de timestamp (BIGINT ↔ Date ↔ number)
- Comparações SQL com tipos incorretos
- Type coercion em queries de banco de dados
- Fallback data com tipos inconsistentes

## Uso

```bash
/type-safety-audit [scope]
```

### Scopes disponíveis:
- `all` - Audita todo o projeto (padrão)
- `backend` - Apenas backend/api
- `frontend` - Apenas frontend/dashboard
- `database` - Apenas queries e schemas
- `tp-capital` - Apenas stack TP Capital
- `workspace` - Apenas stack Workspace

## Exemplo

```bash
/type-safety-audit tp-capital
```

## O que é verificado

### 1. **Timestamp Conversions** (⚠️ CRÍTICO)

Busca por:
- `new Date(ts)` sem `.getTime()` antes de SQL
- Comparações `BIGINT >= Date object`
- Sample data com `ts: 'string'` ao invés de `ts: number`
- `formatTimestamp()` recebendo tipos incorretos

**Arquivos-alvo:**
- `backend/api/*/src/*Client.js` (queries)
- `backend/api/*/src/workers/*.js` (workers)
- `frontend/dashboard/src/components/*/utils.ts` (formatters)

### 2. **Database Type Mismatches**

Busca por:
- `pool.query(sql, [new Date(...)])` quando coluna é BIGINT
- `parseInt(value)` sem validação
- String ISO dates em JSON quando número é esperado

**Padrões a detectar:**
```javascript
// ❌ ERRADO
values.push(new Date(fromTs));  // Date object para BIGINT

// ✅ CORRETO
values.push(new Date(fromTs).getTime()); // número
```

### 3. **Fallback Data Inconsistencies**

Busca por:
- `sampleSignals` com tipos diferentes dos reais
- Dados de exemplo sem validação de schema
- Fallback que quebra UI por tipo diferente

**Exemplo do erro encontrado hoje:**
```javascript
// ❌ Real data
{ ts: 1762263400000 }  // number

// ❌ Sample data
{ ts: '2025-10-07T17:25:59Z' }  // string

// Frontend esperava number → formatTimestamp falha → "?"
```

### 4. **API Response Type Safety**

Busca por:
- Respostas sem schema validation (Zod, Joi, etc.)
- Endpoints que retornam tipos diferentes em erro/sucesso
- Missing type guards em data fetching

## Arquivos de Configuração

### `.eslintrc.json` - Regras TypeScript

Adicionar regras strict:
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/strict-boolean-expressions": "warn",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error"
  }
}
```

### `tsconfig.json` - Strict Mode

Habilitar:
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictPropertyInitialization": true
  }
}
```

## Relatório Gerado

O comando gera relatório em:
```
reports/type-safety/audit-YYYY-MM-DD-HHmmss.md
```

### Estrutura do Relatório

```markdown
# Type Safety Audit Report

**Data**: 2025-11-05 12:45:00
**Scope**: tp-capital
**Status**: ⚠️ ISSUES FOUND

## Resumo Executivo

- 🔴 Críticos: 3
- 🟡 Warnings: 7
- 🟢 Info: 12

## Detalhes

### 🔴 CRÍTICO: Timestamp Type Mismatch
**Arquivo**: apps/tp-capital/src/timescaleClient.js:337
**Linha**: values.push(new Date(fromTs));
**Problema**: Date object sendo passado para coluna BIGINT
**Solução**: values.push(new Date(fromTs).getTime());

---

### 🟡 WARNING: Missing Type Guard
**Arquivo**: frontend/dashboard/src/utils/formatTimestamp.ts:105
**Problema**: Função assume `ts` é number, mas pode receber string
**Solução**: Adicionar type guard no início
```

## Comandos Relacionados

- `/lint` - Lint check completo
- `/test` - Testes unitários
- `/health-check` - Health check de APIs
- `/quality-check` - Análise de qualidade geral

## Integração CI/CD

Adicionar ao pipeline:
```yaml
- name: Type Safety Audit
  run: |
    npm run type-safety:audit
    if [ -f reports/type-safety/latest.md ]; then
      cat reports/type-safety/latest.md
      exit 1  # Fail if issues found
    fi
```

## Ferramentas Utilizadas

1. **TypeScript Compiler** (`tsc --noEmit`)
2. **ESLint** com plugins TypeScript
3. **Grep patterns** customizados
4. **AST analysis** (via `@typescript-eslint/parser`)

## Exemplos de Patterns Detectados

### Pattern 1: SQL Date Injection
```javascript
// ❌ Detectado
const query = `SELECT * FROM signals WHERE ts >= $1`;
values.push(new Date(fromTs));

// ✅ Sugerido
values.push(typeof fromTs === 'number' ? fromTs : new Date(fromTs).getTime());
```

### Pattern 2: Inconsistent Sample Data
```javascript
// ❌ Detectado
sampleSignals = [
  { ts: '2025-10-07T17:25:59Z', ... }  // string
];

// ✅ Sugerido
sampleSignals = [
  { ts: new Date('2025-10-07T17:25:59Z').getTime(), ... }  // number
];
```

### Pattern 3: Missing Validation
```javascript
// ❌ Detectado
function formatTimestamp(ts) {
  const date = new Date(ts);  // Assume ts é válido
  return date.toLocaleString();
}

// ✅ Sugerido
function formatTimestamp(ts: string | number): string | '?' {
  if (!ts) return '?';
  const timestamp = typeof ts === 'string' ? Number(ts) : ts;
  if (Number.isNaN(timestamp)) return '?';
  // ...
}
```

## Manutenção

Este comando deve ser executado:
- ✅ Antes de cada PR (CI/CD)
- ✅ Após mudanças em schemas de banco
- ✅ Após atualização de dependências
- ✅ Semanalmente (agendado)

## Autores e Histórico

- **v1.0.0** (2025-11-05): Criação inicial após bug de timestamp no TP Capital
- **Baseado em**: Issue #tp-capital-date-filter-bug

