---
title: OpenSpec Integration Guide
sidebar_position: 1
tags: [openspec, specs, ai-assistants, governance]
domain: shared
type: guide
summary: Integração do fluxo spec-driven ao TradingSystem para alinhar assistentes de IA, documentação e governança técnica
status: active
last_review: 2025-10-17
slug: /openspec
---

# OpenSpec Integration Guide

## Acesso rápido
- [ ] Ver mudanças abertas: `openspec list`
- [ ] Ver specs aprovadas: `openspec list --specs`
- [ ] Validar mudança: `openspec validate <change-id> --strict`
- [ ] Arquivar após deploy: `openspec archive <change-id> --yes`
- [ ] Leia sempre `openspec/project.md` antes de criar novas specs

## Objetivos
- Alinhar humanos e assistentes de IA antes da implementação, reforçando o controle de escopo.
- Conectar specs vivos (`openspec/specs/`) às fontes oficiais no Docusaurus (`docs/context/`).
- Garantir auditabilidade das decisões por meio de propostas (`openspec/changes/`) e validações (`openspec validate`).

## Setup Atual
- CLI instalada globalmente: `npm install -g @fission-ai/openspec`.
- Projeto inicializado com suporte para **Claude Code** e **Codex** (slash commands e AGENTS.md dedicados).
- Estrutura criada em `openspec/` com `project.md`, `specs/`, `changes/` e `changes/archive/`.
- `openspec/AGENTS.md` disponível como instrução universal para agentes compatíveis.

## CLI Rápido
- Carregue o CLI via terminal na raiz do projeto (`/home/marce/projetos/TradingSystem`).
- Comandos essenciais:
  ```bash
  openspec list                         # Lista changes ativas
  openspec list --specs                 # Lista specs oficiais
  openspec show <id> --json --deltas-only
  openspec validate <id> --strict
  openspec archive <id> --yes           # Após deploy/aceitação
  ```
- Para iniciar novo ciclo: `openspec init` (primeira vez) ou `openspec update` (sincronizar instruções após alterações).
- Mudanças ficam em `openspec/changes/<change-id>/`; specs aprovadas vivem em `openspec/specs/`.

## Onde cada artefato vive
- **Specs ativos** → `openspec/specs/<capability>/spec.md` (fonte de verdade operacional).
- **Propostas em discussão** → `openspec/changes/<change-id>/` (contém `proposal.md`, `tasks.md`, `design.md` opcional e deltas de spec).
- **Documentação canônica** → `docs/context/` (PRDs, ADRs, guias). Use links recíprocos entre specs e docs de contexto.
- **Instruções para agentes** → `CLAUDE.md` (raiz) e `openspec/AGENTS.md`.

## Boas práticas de mapeamento
1. **Antes de criar uma mudança**
   - Consulte PRDs e ADRs relevantes em `docs/context/`.
   - Atualize `openspec/project.md` com links para os documentos de contexto utilizados.
2. **Durante a proposta**
   - Use IDs verb-led: `update-order-manager-risk`, `add-signals-osciladores`.
   - Descreva dependências com links diretos (`docs/context/backend/...`) no `proposal.md`.
   - Registre requisitos usando `MUST/SHALL` e cenários `WHEN/THEN`.
3. **Após a implementação**
   - Rode `openspec validate <change> --strict`.
   - Se a mudança afetar documentação formal, atualize o PRD/ADR correspondente e referencie o `change-id`.
   - Arquive com `openspec archive <change> --yes` depois do deploy.

## Próximos passos recomendados
1. **Preencher `openspec/project.md`** com: stack detalhada, padrões de código (C#, Python, TypeScript), fluxos críticos (ProfitDLL, pipelines ML) e restrições (execução nativa Windows).
2. **Pilotar uma mudança real**: escolher uma melhoria pequena (ex.: endpoint `service-launcher`) para gerar proposta, checklist e validação ponta a ponta.
3. **Definir governança interna**:
   - Quem aprova specs?
   - Quando um change vira ADR ou atualização de PRD?
   - Como sincronizar `openspec/specs` com o Docusaurus (ex.: seção “Spec ID” em cada PRD).
4. **Automação opcional**: adicionar job em CI que roda `openspec validate --all --strict` para prevenir specs inválidos.

## Governança e Automação
- **Aprovação de proposals**: Product/Tech Lead revisa `proposal.md` e deltas; implementação só inicia após aprovação explícita no PR correspondente.
- **Sincronização com Docusaurus**: cada `change-id` aprovado deve citar a página em `docs/context/` que será atualizada; PRDs/ADRs recebem seção “Spec Reference” com link para `openspec/specs/...`.
- **Checklist de merge**: validar `tasks.md` 100% concluído, executar `openspec validate <change> --strict` e anexar output no PR.
- **CI sugerido**: workflow `code-quality.yml` pode incluir etapa `openspec validate --all --strict` em paralelo aos linters; falha bloqueia merge.
- **Arquivamento**: após deploy estável, rodar `openspec archive <change> --yes` e atualizar changelog operacional, mantendo rastro no `changes/archive/`.

## Referências úteis
- **CLI**: `openspec list`, `openspec list --specs`, `openspec show <item>`.
- **Guia oficial do projeto**: `docs/context/shared/tools/README.md`.
- **Atualizações de instruções**: `openspec update` (regerar prompts para agentes).

Manter specs e documentação sincronizados garante rastreabilidade total do trading system e reforça as salvaguardas de risco exigidas pelo pipeline ProfitDLL.
