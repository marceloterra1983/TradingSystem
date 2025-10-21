# Relocate Docusaurus Structure - OpenSpec Change Proposal

> **Status:** ✅ Validated | **Effort:** 6-7h | **Risk:** 🟡 Medium

---

## 📚 Documentação Disponível

| Documento | Descrição | Público-alvo |
|-----------|-----------|--------------|
| **[EXECUTIVE-SUMMARY.md](./EXECUTIVE-SUMMARY.md)** | 📊 Sumário executivo completo com todas as informações consolidadas | Tomadores de decisão, revisores |
| **[proposal.md](./proposal.md)** | 📝 Proposta formal: Por que, o que muda, impacto | Todos os stakeholders |
| **[tasks.md](./tasks.md)** | ✅ Lista de tarefas organizadas em 11 fases (91 tarefas) | Implementadores |
| **[design.md](./design.md)** | 🏗️ Decisões técnicas, trade-offs, riscos, estratégias | Arquitetos, tech leads |
| **[specs/documentation-hosting/spec.md](./specs/documentation-hosting/spec.md)** | 📋 Requirements formais e scenarios | QA, compliance |

---

## 🎯 O Que Esta Mudança Faz?

Reorganiza a estrutura de documentação do projeto, separando:

- **Ferramenta** (Docusaurus: configs, código, dependências) → `/docs/docusaurus/`
- **Conteúdo** (Markdown, diagramas, PRDs, ADRs) → `/docs/` (raiz)

### Antes vs. Depois

```diff
/docs/
- package.json (Docusaurus)           →  /docs/docusaurus/package.json
- node_modules/                       →  /docs/docusaurus/node_modules/
- docusaurus.config.ts                →  /docs/docusaurus/docusaurus.config.ts
- src/ (React components)             →  /docs/docusaurus/src/
+ docusaurus/ (NOVO)
  context/ (conteúdo - sem mudança)
  architecture/ (conteúdo - sem mudança)
  README.md (conteúdo - sem mudança)
```

---

## 🚀 Quick Start

### Para Revisar:

```bash
# Ver sumário executivo
cat openspec/changes/relocate-docusaurus-structure/EXECUTIVE-SUMMARY.md

# Ver proposta completa via CLI
npx openspec show relocate-docusaurus-structure

# Ver diferenças nas specs
npx openspec diff relocate-docusaurus-structure
```

### Para Implementar:

1. **Ler documentação na ordem:**
   - `EXECUTIVE-SUMMARY.md` → visão geral
   - `proposal.md` → contexto e justificativa
   - `design.md` → decisões técnicas
   - `tasks.md` → plano de ação

2. **Executar tarefas:**
   - Seguir `tasks.md` fase por fase
   - Marcar completadas: `- [x]`
   - Testar após cada fase crítica

3. **Validar:**
   ```bash
   cd docs/docusaurus
   npm run build
   npm run start -- --port 3004
   ```

4. **Arquivar após deploy:**
   ```bash
   npx openspec archive relocate-docusaurus-structure --yes
   ```

---

## 📊 Métricas Rápidas

| Métrica | Valor |
|---------|-------|
| Arquivos afetados | ~100 referências |
| Fases de implementação | 11 fases |
| Tarefas totais | 91 tarefas |
| Tempo estimado | 6-7 horas |
| Breaking changes | ✅ SIM (comandos npm) |
| Rollback time | < 15 minutos |

---

## ⚠️ Breaking Changes

**Todos os comandos npm mudam de caminho:**

```bash
# ❌ ANTES
cd docs && npm run start -- --port 3004

# ✅ DEPOIS  
cd docs/docusaurus && npm run start -- --port 3004
```

**Componentes afetados:**
- 🔧 Scripts: start-all-services.sh, status.sh, check-services.sh (~10 arquivos)
- 🔌 Backend: Service Launcher, APIs (5 serviços)
- 🎨 Frontend: Dashboard components (3 componentes)
- 📖 Docs: CLAUDE.md, guias, diagramas (~15 arquivos)

---

## 🛡️ Riscos e Mitigações

| Risco | Nível | Mitigação |
|-------|-------|-----------|
| Links internos quebrados | 🟡 Médio | Testar build completo, verificar warnings |
| CI/CD quebrado | 🔴 Alto | Revisar workflows antes, testar local |
| Service Launcher timeout | 🟡 Médio | Testar manual, logging, fallback |
| Paths absolutos hardcoded | 🟢 Baixo | Grep abrangente, monitorar logs |

---

## ✅ Validação OpenSpec

```bash
$ npx openspec validate relocate-docusaurus-structure --strict
Change 'relocate-docusaurus-structure' is valid ✅
```

---

## 📞 Precisa de Ajuda?

- **Perguntas conceituais:** Ler `proposal.md` seção "Why"
- **Dúvidas técnicas:** Consultar `design.md` seção "Decisions"
- **Problemas na implementação:** Seguir `tasks.md` passo a passo
- **Rollback necessário:** Ver `design.md` seção "Rollback Strategy"

---

## 🔗 Links Úteis

- [OpenSpec AGENTS.md](../../../openspec/AGENTS.md) - Instruções gerais OpenSpec
- [Project Context](../../../openspec/project.md) - Contexto do projeto
- [Documentation Standard](../../../docs/DOCUMENTATION-STANDARD.md) - Padrões de docs

---

**Criado em:** 2025-10-14  
**Autor:** Claude (via openspec-proposal)  
**Validação:** ✅ Strict mode passed

