---
title: Root Markdown Files Review Report
sidebar_position: 2
tags: [documentation, markdown, root-cleanup, organization]
domain: shared
type: reference
summary: Review of 22 markdown files in project root with recommendations for organization and cleanup
status: active
last_review: 2025-10-17
---

# Revisão de Arquivos .md na Raiz do Projeto

**Data da Revisão:** 2025-10-14  
**Total de arquivos .md analisados:** 22

---

## 📊 Sumário Executivo

### Categorias

| Categoria | Quantidade | Ação Recomendada |
|-----------|------------|------------------|
| **Manter na Raiz** | 5 | Essenciais para projeto |
| **Mover para /docs/** | 7 | Documentação histórica/técnica |
| **Mover para /archive/** | 8 | Implementações concluídas |
| **Deletar** | 2 | Obsoletos/duplicados |

---

## ✅ MANTER NA RAIZ (5 arquivos)

### 1. `README.md`
- **Status:** ✅ Essencial
- **Motivo:** Entry point do projeto, visão geral
- **Ação:** MANTER

### 2. `CLAUDE.md` / `AGENTS.md` 
- **Status:** ✅ Essencial (AGENTS.md é symlink para CLAUDE.md)
- **Motivo:** Instruções principais para AI agents, seguem padrão da comunidade
- **Ação:** MANTER AMBOS
- **Nota:** CLAUDE.md é o arquivo real, AGENTS.md é link simbólico

### 3. `CONTRIBUTING.md`
- **Status:** ✅ Essencial
- **Motivo:** Padrão GitHub, guia de contribuição
- **Ação:** MANTER

### 4. `CHANGELOG.md`
- **Status:** ✅ Essencial
- **Motivo:** Histórico de versões, padrão da indústria
- **Ação:** MANTER

### 5. `SYSTEM-OVERVIEW.md`
- **Status:** ✅ Importante
- **Motivo:** Visão geral completa do sistema (1262 linhas), útil para onboarding
- **Ação:** MANTER (mas considerar mover para `/docs/` futuramente)

---

## 📁 MOVER PARA /docs/ (7 arquivos)

### 1. `GLM-README.md`
- **Destino:** `docs/context/shared/tools/glm-readme.md`
- **Motivo:** Documentação de ferramenta específica
- **Nota:** Já existe doc completa em `tools/glm/`

### 2. `OPENSPEC-WORKFLOW-GUIDE.md`
- **Destino:** `docs/context/shared/tools/openspec-workflow.md`
- **Motivo:** Guia de workflow, não é configuração essencial

### 3. `OPENSPEC-REVIEW-REPORT.md`
- **Destino:** `docs/context/backend/architecture/decisions/openspec-review-report.md`
- **Motivo:** Report técnico específico

### 4. `new documentation.md`
- **Destino:** `docs/context/shared/product/prd/documentation-specs-plan.md`
- **Motivo:** Plano de documentação (OpenSpec-oriented plan)
- **Nota:** Renomear para nome mais descritivo

### 5. `DOCUMENTATION-API-IMPLEMENTATION-PLAN.md`
- **Destino:** `docs/context/backend/api/documentation-api/implementation-plan.md`
- **Motivo:** Plano técnico específico de API

### 6. `DOCUMENTATION-API-OPENSPEC-PROPOSAL-CREATED.md`
- **Destino:** `docs/context/backend/api/documentation-api/openspec-proposal-summary.md`
- **Motivo:** Summary de proposta OpenSpec

### 7. `DOCUSAURUS-RELOCATION-COMPLETE.md`
- **Destino:** `docs/context/ops/migrations/docusaurus-relocation-summary.md`
- **Motivo:** Documentação de migração completada

---

## 🗄️ MOVER PARA /archive/ (8 arquivos)

Estes arquivos documentam implementações **concluídas** e podem ser arquivados para referência histórica.

### 1. `AGENTS-MONITOR-IMPLEMENTATION-SUMMARY.md`
- **Destino:** `archive/implementations/2025-10/agents-monitor-implementation.md`
- **Status:** ✅ Implementação concluída
- **Data:** 2025-10-14

### 2. `B3-MARKET-FIX-COMPLETE.md`
- **Destino:** `archive/fixes/2025-10/b3-market-page-fix.md`
- **Status:** ✅ Correção concluída
- **Data:** 2025-10-14

### 3. `CORRECAO-CURSOR.md`
- **Destino:** `archive/fixes/2025-10/cursor-claude-models-fix.md`
- **Status:** ✅ Correção concluída
- **Data:** 2025-10-14

### 4. `IMPLEMENTATION_SUMMARY.md`
- **Destino:** `archive/implementations/2025-10/environment-variables-improvements.md`
- **Status:** ✅ Implementação concluída (Environment Variable Handling)
- **Data:** 2025-10-14

### 5. `IMPLEMENTATION-SESSION-SUMMARY.md`
- **Destino:** `archive/implementations/2025-10/documentation-api-phase1.md`
- **Status:** ✅ Phase 1 completa (Documentation API)
- **Data:** 2025-10-13

### 6. `SECURITY-IMPROVEMENTS-SUMMARY.md`
- **Destino:** `archive/security/2025-10/shell-security-improvements.md`
- **Status:** ✅ Melhorias implementadas
- **Data:** 2025-10-14

### 7. `SECURITY-MCP-IMPROVEMENTS.md`
- **Destino:** `archive/security/2025-10/agent-mcp-security-config.md`
- **Status:** ✅ Configurações aplicadas
- **Data:** 2025-10-14

### 8. `VERIFICATION_CHANGES_SUMMARY.md`
- **Destino:** `archive/implementations/2025-10/traefik-removal-verification.md`
- **Status:** ✅ Verificação concluída
- **Data:** 2025-10-14

---

## 🗑️ DELETAR (2 arquivos)

### 1. `SECURITY-ALERT-OPENAI-KEY-ROTATION.md`
- **Motivo:** 
  - Criado em 2025-10-14 com alerta de segurança crítico
  - Contém chave exposta que já deve ter sido rotacionada
  - ⚠️ **VERIFICAR PRIMEIRO**: Se checklist foi completado (rotação de chave)
  - Se rotação completa → DELETAR (não manter chaves expostas no histórico)
  - Se rotação pendente → USUÁRIO DEVE COMPLETAR AÇÕES PRIMEIRO

### 2. `SECURITY-AUDIT-ACTIONS.md`
- **Motivo:** 
  - Similar ao anterior, documenta ações de segurança de 2025-10-14
  - Se todas as ações foram completadas → DELETAR
  - Se há pendências → Resolver primeiro

---

## 📋 Plano de Ação Recomendado

### Passo 1: Criar estrutura de diretórios
```bash
mkdir -p archive/implementations/2025-10
mkdir -p archive/fixes/2025-10
mkdir -p archive/security/2025-10
```

### Passo 2: Mover arquivos para /docs/
```bash
# GLM
mv GLM-README.md docs/context/shared/tools/glm-readme.md

# OpenSpec
mv OPENSPEC-WORKFLOW-GUIDE.md docs/context/shared/tools/openspec-workflow.md
mv OPENSPEC-REVIEW-REPORT.md docs/context/backend/architecture/decisions/openspec-review-report.md

# Documentation
mv "new documentation.md" docs/context/shared/product/prd/documentation-specs-plan.md
mv DOCUMENTATION-API-IMPLEMENTATION-PLAN.md docs/context/backend/api/documentation-api/implementation-plan.md
mv DOCUMENTATION-API-OPENSPEC-PROPOSAL-CREATED.md docs/context/backend/api/documentation-api/openspec-proposal-summary.md

# Ops
mv DOCUSAURUS-RELOCATION-COMPLETE.md docs/context/ops/migrations/docusaurus-relocation-summary.md
```

### Passo 3: Mover arquivos para /archive/
```bash
# Implementations
mv AGENTS-MONITOR-IMPLEMENTATION-SUMMARY.md archive/implementations/2025-10/agents-monitor-implementation.md
mv IMPLEMENTATION_SUMMARY.md archive/implementations/2025-10/environment-variables-improvements.md
mv IMPLEMENTATION-SESSION-SUMMARY.md archive/implementations/2025-10/documentation-api-phase1.md
mv VERIFICATION_CHANGES_SUMMARY.md archive/implementations/2025-10/traefik-removal-verification.md

# Fixes
mv B3-MARKET-FIX-COMPLETE.md archive/fixes/2025-10/b3-market-page-fix.md
mv CORRECAO-CURSOR.md archive/fixes/2025-10/cursor-claude-models-fix.md

# Security
mv SECURITY-IMPROVEMENTS-SUMMARY.md archive/security/2025-10/shell-security-improvements.md
mv SECURITY-MCP-IMPROVEMENTS.md archive/security/2025-10/agent-mcp-security-config.md
```

### Passo 4: Verificar e deletar arquivos de segurança
```bash
# ⚠️ PRIMEIRO: Verificar se rotação de chaves foi completada
# Checklist em SECURITY-ALERT-OPENAI-KEY-ROTATION.md

# Se completado:
rm SECURITY-ALERT-OPENAI-KEY-ROTATION.md
rm SECURITY-AUDIT-ACTIONS.md

# Se NÃO completado: USUÁRIO DEVE AGIR PRIMEIRO!
```

### Passo 5: Atualizar .gitignore (se necessário)
```bash
# Garantir que /archive/ não seja ignorado
echo "# Archive historical documentation" >> .gitignore
echo "!archive/" >> .gitignore
```

---

## ⚠️ IMPORTANTE: Arquivos de Segurança

Antes de deletar `SECURITY-ALERT-OPENAI-KEY-ROTATION.md` e `SECURITY-AUDIT-ACTIONS.md`:

### Checklist de Verificação

- [ ] OpenAI API key foi rotacionada
- [ ] Nova chave configurada no `.env`
- [ ] Chave antiga revogada no OpenAI dashboard
- [ ] Verificado que não há uso não autorizado
- [ ] Teste do Agent-MCP com nova chave funcionando

### ⚠️ SE CHECKLIST NÃO ESTÁ COMPLETO

**NÃO DELETAR OS ARQUIVOS!** O usuário precisa:

1. Acessar https://platform.openai.com/api-keys
2. Revogar a chave exposta: `sk-proj-MdkFBE-KG4KhakZcDDm2...`
3. Criar nova chave
4. Atualizar `.env` com nova chave
5. Testar Agent-MCP
6. Verificar logs de uso no OpenAI
7. **ENTÃO** deletar os arquivos de alerta

---

## 📊 Estrutura Final da Raiz

Após reorganização, a raiz terá **apenas 5 arquivos .md essenciais**:

```
TradingSystem/
├── README.md                    ✅ Entry point
├── CLAUDE.md                    ✅ AI instructions
├── AGENTS.md                    ✅ Symlink to CLAUDE.md
├── CONTRIBUTING.md              ✅ Contribution guide
├── CHANGELOG.md                 ✅ Version history
└── SYSTEM-OVERVIEW.md           ✅ System overview (considerar mover depois)
```

---

## 🎯 Benefícios da Reorganização

### 1. Raiz Limpa
- Apenas arquivos essenciais e padronizados
- Melhor first impression para novos desenvolvedores
- Segue convenções da comunidade (README, CONTRIBUTING, etc.)

### 2. Documentação Organizada
- Documentação técnica em `/docs/context/`
- Histórico em `/archive/`
- Facilita busca e manutenção

### 3. Histórico Preservado
- Nada é perdido, apenas reorganizado
- `/archive/` mantém implementações completadas
- Fácil consulta para referências futuras

### 4. Melhor Navegação
- Estrutura clara e intuitiva
- Arquivos no lugar certo
- Reduz confusão sobre "onde está X?"

---

## 📝 Notas Adicionais

### Sobre SYSTEM-OVERVIEW.md
Este arquivo tem **1262 linhas** e é extremamente completo. Considerar:
- **Opção 1:** Manter na raiz temporariamente (útil para onboarding rápido)
- **Opção 2:** Mover para `docs/README.md` (já existe um README.md em docs)
- **Opção 3:** Split em múltiplos arquivos temáticos em `/docs/context/`

**Recomendação:** Manter na raiz por enquanto, considerar refatoração futura.

### Sobre "new documentation.md"
Nome não descritivo. Ao mover, renomear para algo mais claro como:
- `documentation-specs-plan.md`
- `openspec-oriented-documentation-plan.md`

### Criação do diretório /archive/
Este diretório não existe ainda. É uma boa prática para manter histórico de:
- Implementações completadas
- Correções aplicadas
- Migrações realizadas
- Melhorias de segurança

---

## ✅ Resumo de Ações

| Ação | Arquivos | Prioridade |
|------|----------|------------|
| **Manter** | 5 (README, CLAUDE, AGENTS, CONTRIBUTING, CHANGELOG) | - |
| **Mover para /docs/** | 7 arquivos | Alta |
| **Mover para /archive/** | 8 arquivos | Média |
| **Verificar & Deletar** | 2 arquivos (segurança) | ⚠️ Crítica |

---

**Total de arquivos processados:** 22  
**Raiz após reorganização:** 5-6 arquivos .md essenciais  
**Status:** ✅ Análise completa, aguardando aprovação para execução

---

**Preparado por:** Claude AI Assistant  
**Data:** 2025-10-14  
**Versão:** 1.0.0

