# Frontend Scripts - Dashboard Console Error Fixes

Scripts para identificar e corrigir todos os erros e warnings do console do navegador no Dashboard.

## 🚀 Quick Start (Recomendado)

**Para uma varredura completa e correção interativa, use o script mestre:**

```bash
bash scripts/frontend/fix-all-dashboard-issues.sh
```

Este script oferece um menu interativo com as seguintes opções:

1. **Quick Analysis** - Análise rápida de padrões comuns
2. **Full Analysis** - Relatório abrangente completo
3. **Auto-fix Issues** - Correção automática (ESLint + Prettier)
4. **Complete Fix** - Análise + Correção + Validação
5. **Type Check Only** - Verificação TypeScript isolada
6. **Build Validation** - Build de produção e estatísticas
7. **Show Reports** - Visualizar relatórios gerados

## 📋 Scripts Disponíveis

### 1. `fix-all-dashboard-issues.sh` (RECOMENDADO)

**Script mestre interativo** que orquestra todos os outros scripts.

```bash
bash scripts/frontend/fix-all-dashboard-issues.sh
```

**Funcionalidades:**
- Menu interativo
- Análise rápida ou completa
- Correção automática
- Validação de build
- Visualização de relatórios

---

### 2. `check-browser-console.sh`

**Análise rápida** de padrões comuns de erros no console.

```bash
bash scripts/frontend/check-browser-console.sh
```

**Verifica:**
- ✓ Missing keys em `.map()`
- ✓ URLs hardcoded (problemas de CORS)
- ✓ Console statements não guardados
- ✓ Padrões deprecated do React
- ✓ Imagens sem `alt`
- ✓ useEffect dependency issues
- ✓ PropTypes usage
- ✓ Event handler naming
- ✓ Inline styles excessivos
- ✓ Componentes muito grandes (>500 linhas)

**Saída:** Relatório no terminal com contagem de issues.

---

### 3. `fix-console-errors.sh`

**Análise completa** que gera relatórios detalhados.

```bash
bash scripts/frontend/fix-console-errors.sh
```

**Gera os seguintes relatórios em `frontend/dashboard/reports/`:**

- `COMPREHENSIVE-REPORT-{timestamp}.md` - Relatório consolidado
- `eslint-report-{timestamp}.txt` - Issues do ESLint
- `eslint-report-{timestamp}.json` - ESLint em formato JSON
- `unused-imports-{timestamp}.txt` - Imports não utilizados
- `react-warnings-{timestamp}.txt` - Anti-patterns do React
- `typescript-errors-{timestamp}.txt` - Erros TypeScript
- `hardcoded-urls-{timestamp}.txt` - URLs hardcoded
- `console-statements-{timestamp}.txt` - Console statements
- `build-output-{timestamp}.txt` - Output do build

**Uso:**
```bash
# Gerar relatório
bash scripts/frontend/fix-console-errors.sh

# Ver último relatório gerado
cat frontend/dashboard/reports/COMPREHENSIVE-REPORT-*.md | tail -1
```

---

### 4. `auto-fix-issues.sh`

**Correção automática** de issues que podem ser corrigidos sem intervenção manual.

```bash
bash scripts/frontend/auto-fix-issues.sh
```

**Executa:**
1. ESLint auto-fix (`npm run lint:fix`)
2. Prettier formatting (`npm run format`)
3. Remoção de imports não utilizados
4. Fix de padrões React comuns
5. Type check
6. Build validation

**Após execução:**
```bash
# Revisar mudanças
git diff

# Testar dashboard
cd frontend/dashboard
npm run dev

# Commit fixes
git add .
git commit -m "fix: auto-fix console errors and warnings"
```

---

## 🔍 Tipos de Problemas Detectados

### High Priority (Críticos)

1. **Missing Keys em Lists**
   ```tsx
   // ❌ ERRADO
   items.map(item => <div>{item.name}</div>)

   // ✅ CORRETO
   items.map(item => <div key={item.id}>{item.name}</div>)
   ```

2. **Hardcoded URLs (CORS)**
   ```tsx
   // ❌ ERRADO
   fetch('http://localhost:3200/api/items')

   // ✅ CORRETO
   fetch('/api/workspace/items')
   ```

3. **TypeScript Errors**
   ```bash
   npm run type-check
   ```

### Medium Priority

1. **useEffect Dependencies**
   ```tsx
   // ❌ ERRADO
   useEffect(() => {
     fetchData(userId);
   }, []); // eslint-disable-line

   // ✅ CORRETO
   useEffect(() => {
     fetchData(userId);
   }, [userId]);
   ```

2. **Deprecated React Patterns**
   ```tsx
   // ❌ ERRADO
   componentWillMount() { }
   ref="myRef"

   // ✅ CORRETO
   componentDidMount() { }
   ref={myRef}
   ```

### Low Priority

1. **Console Statements**
   ```tsx
   // ❌ AVOID
   console.log('debug info');

   // ✅ BETTER
   if (process.env.NODE_ENV === 'development') {
     console.log('debug info');
   }
   ```

2. **Images sem alt**
   ```tsx
   // ❌ ERRADO
   <img src="logo.png" />

   // ✅ CORRETO
   <img src="logo.png" alt="Company Logo" />
   ```

---

## 📊 Workflow Recomendado

### Para Fix Completo (First Time)

```bash
# 1. Executar script mestre
bash scripts/frontend/fix-all-dashboard-issues.sh

# Escolher opção 4 (Complete Fix)
# Isso vai:
# - Analisar todos os problemas
# - Corrigir automaticamente o que for possível
# - Validar build

# 2. Revisar mudanças
git diff

# 3. Testar dashboard
cd frontend/dashboard
npm run dev
# Abrir http://localhost:9082
# Inspecionar console (F12)

# 4. Commit se tudo estiver OK
git add .
git commit -m "fix: resolve all dashboard console errors and warnings"
```

### Para Análise Rápida (Daily Check)

```bash
# Quick check
bash scripts/frontend/check-browser-console.sh

# Se issues forem encontrados:
bash scripts/frontend/auto-fix-issues.sh
```

### Para Geração de Relatórios (Review)

```bash
# Gerar relatório completo
bash scripts/frontend/fix-console-errors.sh

# Ver relatório
cat frontend/dashboard/reports/COMPREHENSIVE-REPORT-*.md | tail -1
```

---

## 🛠️ Comandos Úteis

### ESLint

```bash
cd frontend/dashboard

# Ver todos os problemas
npm run lint

# Auto-fix
npm run lint:fix

# Gerar relatório JSON
npm run lint:report
```

### Prettier

```bash
cd frontend/dashboard

# Verificar formatação
npm run format:check

# Corrigir formatação
npm run format
```

### TypeScript

```bash
cd frontend/dashboard

# Type check
npm run type-check
```

### Build

```bash
cd frontend/dashboard

# Build de desenvolvimento
npm run build:dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

---

## 📁 Estrutura de Relatórios

```
frontend/dashboard/reports/
├── COMPREHENSIVE-REPORT-20250115_143022.md
├── eslint-report-20250115_143022.txt
├── eslint-report-20250115_143022.json
├── unused-imports-20250115_143022.txt
├── react-warnings-20250115_143022.txt
├── typescript-errors-20250115_143022.txt
├── hardcoded-urls-20250115_143022.txt
├── console-statements-20250115_143022.txt
└── build-output-20250115_143022.txt
```

**Relatórios são timestamped** para facilitar comparações ao longo do tempo.

---

## 🎯 Métricas de Sucesso

### Antes do Fix
- ESLint errors: ~50-100
- TypeScript errors: ~20-30
- Console warnings no navegador: ~30-50

### Depois do Fix (Target)
- ESLint errors: 0
- ESLint warnings: < 50
- TypeScript errors: 0
- Console warnings no navegador: 0

---

## 🚨 Troubleshooting

### "Permission denied" ao executar scripts

```bash
chmod +x scripts/frontend/*.sh
```

### Build falha após auto-fix

```bash
# Restaurar estado anterior
git checkout .

# Executar fix novamente com validação
bash scripts/frontend/fix-all-dashboard-issues.sh
# Escolher opção 4 (Complete Fix)
```

### TypeScript errors não resolvidos

```bash
# Ver erros detalhados
cd frontend/dashboard
npm run type-check

# Corrigir manualmente e re-testar
npm run type-check
```

### ESLint auto-fix não corrige tudo

Alguns problemas requerem intervenção manual:
- Missing keys em `.map()` (precisa saber qual propriedade usar como key)
- useEffect dependencies (precisa análise de lógica)
- TypeScript type errors (precisa definir tipos corretos)

**Nesses casos:**
1. Gerar relatório completo
2. Revisar arquivo por arquivo
3. Corrigir manualmente

---

## 📚 Referências

- **ESLint Rules**: [eslint.org/docs/rules](https://eslint.org/docs/rules/)
- **React Rules**: [react.dev/learn](https://react.dev/learn)
- **TypeScript**: [typescriptlang.org/docs](https://www.typescriptlang.org/docs/)
- **Projeto CLAUDE.md**: `/workspace/CLAUDE.md`

---

## 💡 Tips

1. **Execute análise antes de commit**
   ```bash
   bash scripts/frontend/check-browser-console.sh
   ```

2. **Configure pre-commit hook**
   ```bash
   # .husky/pre-commit
   npm run lint
   npm run type-check
   ```

3. **Monitor bundle size**
   ```bash
   npm run check:bundle:size
   ```

4. **Use o menu interativo**
   ```bash
   bash scripts/frontend/fix-all-dashboard-issues.sh
   # É mais fácil que lembrar todos os comandos!
   ```

---

## ✅ Checklist Pós-Fix

- [ ] Executar `bash scripts/frontend/fix-all-dashboard-issues.sh`
- [ ] Escolher opção 4 (Complete Fix)
- [ ] Revisar mudanças com `git diff`
- [ ] Testar dashboard (`npm run dev`)
- [ ] Abrir console do navegador (F12)
- [ ] Verificar que não há erros/warnings
- [ ] Commit mudanças
- [ ] Deploy para produção

---

**Última atualização:** 2025-01-15
**Mantido por:** TradingSystem Team
