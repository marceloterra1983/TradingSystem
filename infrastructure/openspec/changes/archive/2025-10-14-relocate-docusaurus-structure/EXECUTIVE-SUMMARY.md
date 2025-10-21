# Executive Summary: Relocate Docusaurus Structure

**Change ID:** `relocate-docusaurus-structure`
**Status:** ✅ Validated (Ready for Approval)
**Estimated Effort:** 6-7 hours
**Risk Level:** 🟡 Medium (High impact, low complexity)

---

## 📋 Quick Overview

Esta mudança reorganiza a estrutura de documentação do projeto, movendo todos os arquivos relacionados ao **Docusaurus** (ferramenta) para um subdiretório dedicado (`/docs/docusaurus/`), enquanto mantém o **conteúdo de documentação** (markdown, diagramas, PRDs, ADRs) na raiz de `/docs`.

### Estrutura Atual vs. Proposta

```diff
/docs/
- ├── package.json                    # 🔄 Mover para docusaurus/
- ├── node_modules/                   # 🔄 Mover para docusaurus/
- ├── docusaurus.config.ts            # 🔄 Mover para docusaurus/
- ├── sidebars.ts                     # 🔄 Mover para docusaurus/
- ├── src/                            # 🔄 Mover para docusaurus/
- ├── static/                         # 🔄 Mover para docusaurus/
+ ├── docusaurus/                     # 🆕 NOVO: Tudo da ferramenta aqui
+ │   ├── package.json
+ │   ├── node_modules/
+ │   ├── docusaurus.config.ts
+ │   ├── sidebars.ts
+ │   ├── src/
+ │   ├── static/
+ │   └── build/
  ├── context/                        # ✅ MANTÉM: Conteúdo
  ├── architecture/                   # ✅ MANTÉM: Conteúdo
  ├── features/                       # ✅ MANTÉM: Conteúdo
  ├── README.md                       # ✅ MANTÉM: Conteúdo
  └── DOCUMENTATION-STANDARD.md       # ✅ MANTÉM: Conteúdo
```

---

## 🎯 Objetivos e Benefícios

### Objetivos

1. ✅ **Separar ferramenta de conteúdo** - Facilitar gestão independente
2. ✅ **Backup seletivo** - Permitir backup apenas do conteúdo sem node_modules
3. ✅ **Preparar migração futura** - Se mudarmos de Docusaurus, apenas `/docs/docusaurus/` é afetado
4. ✅ **Clareza organizacional** - Novos desenvolvedores distinguem facilmente ferramenta vs conteúdo

### Benefícios

- 📦 **Backup mais eficiente**: Backup de conteúdo fica 90% menor (sem node_modules)
- 🔄 **Portabilidade**: Conteúdo pode ser migrado para MkDocs, Vitepress, etc. sem alterações
- 🧹 **Organização**: Estrutura mais limpa e semântica
- 🎓 **Onboarding**: Desenvolvedores entendem rapidamente onde estão os arquivos importantes

---

## 🚨 Breaking Changes e Impactos

### ⚠️ Breaking Change Principal

**Todos os comandos npm relacionados ao Docusaurus mudam de caminho:**

```bash
# ANTES
cd docs && npm run start -- --port 3004
cd docs && npm run build

# DEPOIS
cd docs/docusaurus && npm run start -- --port 3004
cd docs/docusaurus && npm run build
```

### Componentes Afetados (Total: ~100 referências)

| Categoria | Componentes | Quantidade |
|-----------|-------------|------------|
| **Scripts** | start-all-services.sh, status.sh, check-services.sh, etc. | ~10 arquivos |
| **Backend APIs** | Service Launcher, Documentation API, TP Capital, B3, Library | 5 serviços |
| **Frontend** | DocsPage, EscopoPage, PortsPage | 3 componentes |
| **Documentação** | CLAUDE.md, SYSTEM-OVERVIEW.md, guias em /guides | ~15 arquivos |
| **Configs** | Docker, nginx, CI/CD workflows | ~5 arquivos |
| **Archive** | Documentos históricos (opcional atualizar) | ~60 arquivos |

---

## 📝 Plano de Implementação (11 Fases)

### **Phase 1: Preparation & Analysis** (1 hora)
- Criar backup completo
- Auditar todas as referências a `docs/`
- Testar build atual como baseline

### **Phase 2: Directory Structure Migration** (30 min)
- Mover arquivos Docusaurus para `/docs/docusaurus/`
- Verificar integridade dos arquivos

### **Phase 3: Docusaurus Configuration Updates** (1 hora)
- Atualizar paths em `docusaurus.config.ts` (ex: `path: '../context'`)
- Testar build e dev server no novo local

### **Phase 4: Infrastructure Scripts Update** (30 min)
- Atualizar scripts de start/stop/status
- Atualizar scripts em `/scripts` e `/infrastructure/scripts`

### **Phase 5: Backend Services Update** (30 min)
- Service Launcher: mudar `defaultPath`
- Atualizar APIs que referenciam docs

### **Phase 6: Frontend Dashboard Update** (30 min)
- Atualizar instruções em `DocsPage.tsx`
- Atualizar `EscopoPage.tsx`

### **Phase 7: Documentation Updates** (1 hora)
- Atualizar CLAUDE.md, SYSTEM-OVERVIEW.md
- Atualizar guias de onboarding
- Atualizar diagramas arquiteturais

### **Phase 8: Docker & Infrastructure Config** (30 min)
- Atualizar compose files
- Atualizar CI/CD workflows

### **Phase 9: Testing & Validation** (1 hora)
- Testar build, dev server, links internos
- Testar serviços integrados
- Validar PlantUML rendering

### **Phase 10: Archive & Cleanup** (30 min)
- Atualizar `.gitignore` se necessário
- Remover backup após confirmação
- Documentar nova estrutura

### **Phase 11: Communication & Documentation** (30 min)
- Criar change summary
- Arquivar proposta OpenSpec

**Total:** ~6-7 horas

---

## 🛡️ Estratégia de Mitigação de Riscos

### Risk 1: Links Internos Quebrados 🟡

**Mitigação:**
- Testar build completo antes de commit
- Verificar warnings do Docusaurus
- Scan manual de links críticos (home, API Hub, PRDs)

### Risk 2: CI/CD Quebrado 🔴

**Mitigação:**
- Revisar `.github/workflows/` antes da migração
- Testar builds localmente antes de push
- Preparar rollback rápido

### Risk 3: Service Launcher Timeout 🟡

**Mitigação:**
- Testar start/stop manual antes de atualizar código
- Adicionar logging detalhado
- Fallback para inicialização manual

### Risk 4: Paths Absolutos Hardcoded 🟢

**Mitigação:**
- Grep abrangente: `rg -i "\/docs[\/\"]" --type js --type ts --type sh`
- Monitorar logs por erros de "file not found"

---

## 🔄 Rollback Strategy

### Rollback Rápido (< 5 minutos)

```bash
# Restaurar do backup
cd /home/marce/projetos/TradingSystem
rm -rf docs
tar -xzf /tmp/docs-backup-YYYYMMDD-HHMMSS.tar.gz
```

### Rollback de Código (< 15 minutos)

```bash
# Reverter commits
git log --oneline | grep "relocate docusaurus"
git revert <commit-hash>

# Ou reset (se não pushed)
git reset --hard HEAD~1
```

---

## ✅ Critérios de Sucesso

### Technical Metrics

- ✅ Build time não aumenta (max +5%)
- ✅ Dev server start time mantém < 10 segundos
- ✅ Todos os links internos funcionam (0 broken links)
- ✅ Todos os serviços passam health checks

### Process Metrics

- ✅ Zero downtime para usuários
- ✅ Rollback plan testado
- ✅ Equipe executa novos comandos sem confusão

### Quality Metrics

- ✅ Documentação atualizada reflete nova estrutura
- ✅ Novos desenvolvedores seguem guias atualizados
- ✅ Busca no código encontra 0 referências ao path antigo

---

## 📊 Arquivos Criados no OpenSpec

```
openspec/changes/relocate-docusaurus-structure/
├── proposal.md                           # ✅ Por que, o que muda, impacto
├── tasks.md                              # ✅ 11 fases, 91 tarefas ordenadas
├── design.md                             # ✅ Decisões técnicas, trade-offs, riscos
├── EXECUTIVE-SUMMARY.md                  # ✅ Este documento
└── specs/
    └── documentation-hosting/
        └── spec.md                       # ✅ Requirements e scenarios
```

---

## 🚀 Próximos Passos

### Para Aprovar e Implementar:

1. **Revisar documentos:**
   ```bash
   cd /home/marce/projetos/TradingSystem
   
   # Ver proposta completa
   npx openspec show relocate-docusaurus-structure
   
   # Ver diferenças nas specs
   npx openspec diff relocate-docusaurus-structure
   ```

2. **Aprovar proposta:**
   - Revisar `proposal.md`, `tasks.md`, `design.md`
   - Dar aprovação explícita para implementação

3. **Implementar:**
   - Seguir tasks.md fase por fase
   - Marcar tarefas concluídas: `- [x]`
   - Testar após cada fase crítica

4. **Arquivar após deploy:**
   ```bash
   npx openspec archive relocate-docusaurus-structure --yes
   ```

---

## 📞 Pontos de Contato e Dúvidas

### Perguntas em Aberto

1. ✅ **Q:** Devemos mover arquivos de review/summary também?
   - **A:** SIM, manter na raiz `/docs` (são meta-documentação sobre conteúdo)

2. ✅ **Q:** O que fazer com `nginx.conf`?
   - **A:** Verificar se específico do Docusaurus → mover; genérico → manter

3. ✅ **Q:** Como lidar com paths absolutos em dev vs prod?
   - **A:** Usar paths relativos sempre; variáveis de ambiente quando necessário

### Para Esclarecimentos Adicionais

- Consultar `design.md` para decisões técnicas detalhadas
- Consultar `tasks.md` para dependências entre fases
- Consultar `specs/documentation-hosting/spec.md` para requirements formais

---

## 📈 Estimativa de Tempo vs. Valor

| Métrica | Valor |
|---------|-------|
| **Tempo de implementação** | 6-7 horas |
| **Tempo de rollback** | < 15 minutos |
| **Risco técnico** | 🟡 Médio |
| **Risco operacional** | 🟡 Médio |
| **Valor de longo prazo** | 🟢 Alto |
| **Complexidade técnica** | 🟢 Baixa |

**Recomendação:** ✅ Aprovar e implementar em horário de baixo movimento, com pessoa de plantão para rollback se necessário.

---

**Validação OpenSpec:** ✅ Passou em modo `--strict`

```bash
npx openspec validate relocate-docusaurus-structure --strict
# Change 'relocate-docusaurus-structure' is valid
```

