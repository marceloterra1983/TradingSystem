# 🔍 Plano de Verificação Frontend - Portas Protegidas

**Date**: 2025-11-03 14:45 BRT  
**Objetivo**: Verificar se frontend está compatível com novas portas 7000-7999  
**Usando**: Agentes e Comandos Claude  

---

## 🤖 AGENTES CLAUDE RECOMENDADOS

### **1. frontend-developer** ⭐⭐⭐
**Uso**: Verificação completa de código frontend

**Quando usar**:
- Validar configurações de endpoints
- Verificar importações e uso de ENDPOINTS
- Revisar componentes que acessam databases/UIs
- Checar .env.example atualizado

**Como invocar**:
```markdown
@frontend-developer.md 

Tarefa: Verificar se o frontend do dashboard está usando corretamente 
as novas portas de databases (7000-7999) e endpoints configurados em 
src/config/endpoints.ts
```

---

### **2. fullstack-developer** ⭐⭐⭐
**Uso**: Revisão end-to-end (frontend + backend)

**Quando usar**:
- Validar integração completa frontend-backend
- Verificar API calls usando portas corretas
- Checar health checks e monitoring
- Validar fluxo completo de dados

**Como invocar**:
```markdown
@fullstack-developer.md 

Tarefa: Revisar integração frontend-backend após migração de portas.
Verificar se dashboard conecta corretamente aos serviços nas novas portas
(Workspace 3201, TP Capital 4006, PgAdmin 7100, QuestDB 7010, etc.)
```

---

### **3. react-performance-optimizer** ⭐⭐
**Uso**: Validar se mudanças não afetaram performance

**Quando usar**:
- Checar se novos imports afetam bundle size
- Verificar re-renders desnecessários
- Validar lazy loading de endpoints
- Otimizar config loading

**Como invocar**:
```markdown
@react-performance-optimizer.md 

Tarefa: Verificar se adição de src/config/endpoints.ts não afetou 
performance do dashboard. Analisar bundle size e sugerir otimizações.
```

---

### **4. test-engineer** ⭐⭐⭐
**Uso**: Criar/validar testes para novos endpoints

**Quando usar**:
- Criar testes para endpoints.ts
- Validar configuração de URLs
- Testar fallbacks (quando .env não carrega)
- Integration tests

**Como invocar**:
```markdown
@test-engineer.md 

Tarefa: Criar testes para frontend/dashboard/src/config/endpoints.ts
Validar que endpoints usam variáveis de ambiente corretas e fallbacks
para portas na faixa 7000-7999.
```

---

### **5. ui-ux-designer** ⭐
**Uso**: Verificar UI de links para database UIs

**Quando usar**:
- Se dashboard tem links para PgAdmin/Adminer
- Validar UX de acesso aos admin tools
- Checar que URLs estão atualizadas no UI

**Como invocar**:
```markdown
@ui-ux-designer.md 

Tarefa: Verificar se dashboard tem links para database admin UIs
(PgAdmin, Adminer, etc.) e se estão usando as novas portas 7100+.
```

---

### **6. code-reviewer** ⭐⭐
**Uso**: Revisão geral de código

**Quando usar**:
- Code review do endpoints.ts
- Verificar best practices
- Checar TypeScript types
- Validar estrutura

**Como invocar**:
```markdown
@code-reviewer.md 

Tarefa: Revisar frontend/dashboard/src/config/endpoints.ts
Verificar type safety, best practices, e documentação.
```

---

## 🛠️ COMANDOS CLAUDE RECOMENDADOS

### **1. /test** ⭐⭐⭐
**Uso**: Rodar suite de testes do frontend

**Quando usar**:
- Após mudanças de configuração
- Validar nenhum teste quebrou
- Coverage de novos arquivos

**Como usar**:
```bash
/test frontend/dashboard
```

**O que faz**:
- Roda `npm test` no dashboard
- Verifica coverage
- Reporta testes falhando

---

### **2. /code-review** ⭐⭐⭐
**Uso**: Revisão automática de código

**Quando usar**:
- Após adicionar endpoints.ts
- Validar qualidade do código novo
- Checar convenções do projeto

**Como usar**:
```bash
/code-review frontend/dashboard/src/config/endpoints.ts
```

**O que faz**:
- Analisa código
- Sugere melhorias
- Valida TypeScript types
- Checa best practices

---

### **3. /refactor-code** ⭐⭐
**Uso**: Refatorar código existente

**Quando usar**:
- Se encontrar código duplicado
- Se precisar melhorar endpoints.ts
- Otimizar imports

**Como usar**:
```bash
/refactor-code frontend/dashboard/src
```

---

### **4. /generate-tests** ⭐⭐⭐
**Uso**: Gerar testes automaticamente

**Quando usar**:
- Para endpoints.ts
- Para validateEndpoint()
- Para getDatabaseUIEndpoints()

**Como usar**:
```bash
/generate-tests frontend/dashboard/src/config/endpoints.ts
```

---

### **5. /format** ⭐
**Uso**: Formatar código

**Quando usar**:
- Garantir código segue style guide
- Antes de commit

**Como usar**:
```bash
/format frontend/dashboard
```

---

### **6. /lint** ⭐⭐
**Uso**: Checar problemas de linting

**Quando usar**:
- Validar ESLint rules
- Checar imports não usados
- Verificar type errors

**Como usar**:
```bash
/lint frontend/dashboard
```

---

### **7. /optimize** ⭐⭐
**Uso**: Otimizar bundle size

**Quando usar**:
- Verificar impacto de novos imports
- Otimizar tree-shaking
- Lazy loading

**Como usar**:
```bash
/optimize frontend/dashboard --bundle-size
```

---

### **8. /quality-check** ⭐⭐⭐
**Uso**: Checagem completa de qualidade

**Quando usar**:
- Verificação abrangente
- Antes de deploy
- Após mudanças estruturais

**Como usar**:
```bash
/quality-check frontend/dashboard
```

**O que faz**:
- Linting
- Type checking
- Tests
- Bundle analysis
- Best practices

---

## 📋 PLANO DE VERIFICAÇÃO RECOMENDADO

### **Fase 1: Verificação Rápida** (15 min)

```bash
# 1. Lint check
/lint frontend/dashboard

# 2. Type check
cd frontend/dashboard && npm run type-check

# 3. Test suite
/test frontend/dashboard
```

---

### **Fase 2: Code Review** (30 min)

```bash
# 1. Revisar endpoints.ts
/code-review frontend/dashboard/src/config/endpoints.ts

# 2. Verificar uso de ENDPOINTS no código
grep -r "ENDPOINTS" frontend/dashboard/src/

# 3. Fullstack review
@fullstack-developer.md 
Verificar integração frontend-backend com novas portas
```

---

### **Fase 3: Testes Automáticos** (20 min)

```bash
# 1. Gerar testes para endpoints.ts
/generate-tests frontend/dashboard/src/config/endpoints.ts

# 2. Testar validateEndpoint()
# Criar teste manual para função

# 3. Integration test
# Testar que dashboard acessa PgAdmin em 7100
```

---

### **Fase 4: Performance** (15 min)

```bash
# 1. Check bundle size
/optimize frontend/dashboard --bundle-size

# 2. Performance review
@react-performance-optimizer.md 
Verificar impacto de endpoints.ts no bundle
```

---

### **Fase 5: Quality Gate** (10 min)

```bash
# 1. Quality check completo
/quality-check frontend/dashboard

# 2. Build production
cd frontend/dashboard && npm run build

# 3. Preview build
npm run preview
```

---

## 🚀 PLANO DE AÇÃO AUTOMATIZADO

### **Opção A: Verificação Completa** (1.5h)

```markdown
1. /lint frontend/dashboard
2. /code-review frontend/dashboard/src/config/endpoints.ts
3. @fullstack-developer.md - Review integração
4. /generate-tests frontend/dashboard/src/config/endpoints.ts
5. @test-engineer.md - Validar testes
6. @react-performance-optimizer.md - Bundle size
7. /quality-check frontend/dashboard
8. Build & preview production
```

---

### **Opção B: Verificação Essencial** (30 min)

```markdown
1. /lint frontend/dashboard
2. /test frontend/dashboard
3. @frontend-developer.md - Revisar endpoints.ts
4. Build production (npm run build)
```

---

### **Opção C: Verificação Mínima** (10 min)

```markdown
1. /lint frontend/dashboard
2. npm test (quick)
3. npm run build (verificar build passa)
```

---

## 🎯 RECOMENDAÇÃO

**Usar: Opção B (Verificação Essencial) - 30 minutos**

**Sequência**:
1. `/lint` - Checar problemas óbvios
2. `/test` - Rodar suite de testes
3. `@frontend-developer` - Review detalhado
4. Build production - Garantir que builda

**Por quê**:
- Cobre aspectos críticos
- Tempo razoável (30 min)
- Identifica problemas principais
- Valida build production

---

## 📝 CHECKLIST DE VERIFICAÇÃO

### **Configuração** ✅
- [ ] `endpoints.ts` criado e funcionando
- [ ] `.env.example` atualizado com portas 7xxx
- [ ] Variáveis VITE_* corretas
- [ ] Fallbacks para portas 7xxx

### **Código** ✅
- [ ] Imports de ENDPOINTS corretos
- [ ] Componentes usando ENDPOINTS
- [ ] Sem hardcoded URLs antigas
- [ ] TypeScript types corretos

### **Testes** ✅
- [ ] Unit tests para endpoints.ts
- [ ] Integration tests (se houver)
- [ ] E2E tests (se houver)
- [ ] Mocks atualizados

### **Build** ✅
- [ ] `npm run build` passa sem erros
- [ ] Bundle size aceitável
- [ ] No warnings críticos
- [ ] Preview funciona

### **Runtime** ✅
- [ ] Dashboard carrega corretamente
- [ ] Links para database UIs funcionam
- [ ] Health checks passam
- [ ] Monitoring endpoints acessíveis

---

## 🔍 VERIFICAÇÕES ESPECÍFICAS

### **1. Endpoints.ts está sendo usado?**
```bash
grep -r "import.*endpoints" frontend/dashboard/src/
grep -r "ENDPOINTS\." frontend/dashboard/src/
```

### **2. URLs antigas hardcoded?**
```bash
# Procurar URLs antigas
grep -r "localhost:5432\|localhost:5051\|localhost:6333\|localhost:9001" frontend/dashboard/src/
```

### **3. .env.example atualizado?**
```bash
grep "7000\|7100" frontend/dashboard/.env.example
```

### **4. Build production funciona?**
```bash
cd frontend/dashboard
npm run build
```

---

## ✅ EXECUÇÃO AUTOMÁTICA

Quer que eu execute agora:

**Opção A**: Verificação Completa (1.5h) - Mais abrangente  
**Opção B**: Verificação Essencial (30 min) - Recomendado ⭐  
**Opção C**: Verificação Mínima (10 min) - Rápida  

---

## 🎯 MINHA RECOMENDAÇÃO

**Executar Opção B (30 min):**

1. **Lint check** - Identificar problemas imediatos
2. **Code review** (frontend-developer) - Review detalhado do endpoints.ts
3. **Test suite** - Validar nada quebrou
4. **Build production** - Garantir build passa

**Quer que eu execute a Opção B agora?**

