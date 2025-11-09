---
title: Generated Documentation Freshness Policy
domain: governance
type: policy
tags: [documentation, automation, quality]
status: active
last_review: "2025-11-09"
summary: Política obrigatória para manter arquivos de documentação gerados automaticamente atualizados antes de qualquer sincronização com o GitHub.
---

# Generated Documentation Freshness Policy

## 🎯 Objetivo

Garantir que todo artefato de documentação gerado automaticamente (ex.: `docs/content/tools/ports-services.mdx`, `docs/content/frontend/design-system/tokens.mdx`) seja regenerado e commitado com carimbos de data/hora válidos **antes** de sincronizações com o GitHub, evitando falhas em hooks (`docs:check`) e pipelines CI.

## 📋 Escopo

Aplicável a todos os contribuidores que alterem:
- Arquivos origem utilizados por `npm --prefix docs run docs:auto`
- Recursos de infraestrutura que impactem a tabela de portas ou tokens de design
- Scripts de automação em `scripts/docs/**` ou `tools/ports/**`

## ✅ Regras Obrigatórias

1. **Execução Pré-Commit**  
   Sempre rodar `npm --prefix docs run docs:auto` seguido de `npm --prefix docs run docs:validate-generated` antes de criar commits que possam impactar documentação gerada.  
   - Se o comando modificar arquivos, o colaborador **deve** revisar e incluir as mudanças no commit.

2. **Falha em Hooks = BLOQUEIO**  
   É proibido ignorar falhas do hook `docs:check`. Caso o pre-push gere novos timestamps ou arquivos, o push **deve ser abortado**, os artefatos precisam ser commitados e somente então o comando deve ser reexecutado.

3. **Sem Timestamps Estagnados**  
   Commits com timestamps de geração superiores a 24h são vetados. O objetivo é evitar bloqueio nos pipelines e divergências entre branches.

4. **Integração Contínua**  
   PRs que toquem em documentação gerada precisam demonstrar, na descrição, que os comandos acima foram executados (ex.: checklist ou link para log local).

5. **Automação Centralizada**  
   Novos scripts que gerem documentação devem escrever carimbos de data em formato ISO UTC (`YYYY-MM-DDTHH:mm:ss.SSSZ`) e atualizar tanto comentários (`<!-- Last generated: ... -->`) quanto trechos exibidos aos leitores.

## 🚨 Penalidades Operacionais

| Violação | Impacto | Ação |
|----------|---------|------|
| Push com `docs:check` falhando | Bloqueio no hook Husky | Reverter push, rodar automação e recommitar |
| PR com timestamps desatualizados | Falha no CI `docs:validate-generated` | Solicitar correção ao autor |
| Alteração manual em arquivos gerados | Inconsistência de fonte de verdade | Regerar com `docs:auto` e documentar causa |

## 🔁 Processo de Revisão

- Revisão obrigatória a cada **30 dias** ou sempre que o fluxo de geração for alterado.
- Métricas acompanhadas na dashboard de governança: taxa de sucesso do `docs:auto` e envelhecimento médio dos timestamps.

## 🧭 Responsabilidades

- **Documentation Guild**: manter scripts e política atualizados.
- **Todos os contribuintes**: executar os comandos e incluir artefatos regenerados nos commits.
- **Revisores de PR**: rejeitar mudanças que não evidenciem a execução de `docs:auto` + validações.

## 📚 Referências

- `scripts/docs/docs-auto.mjs`
- `docs/tests/validate-generated-content.test.mjs`
- `tools/ports/sync.js`

