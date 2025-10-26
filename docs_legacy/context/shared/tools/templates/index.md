---
title: Templates Overview
sidebar_position: 1
tags: [templates, governance, shared, index]
domain: shared
type: index
summary: Coleção oficial de templates Markdown para PRDs, ADRs, guias e runbooks
status: active
last_review: "2025-10-17"
---

# Templates Overview

Cada template abaixo segue o padrão de front matter adotado pelo TradingSystem. Copie-os ao iniciar novos documentos para manter metadados, seções e terminologia consistentes.

| Template | Uso | Caminho |
|----------|-----|---------|
| ADR | Decisões arquiteturais com contexto, decisão e consequências. | [template-adr.md](template-adr.md) |
| PRD | Detalhamento de requisitos de produto e métricas de sucesso. | [template-prd.md](template-prd.md) |
| Runbook | Procedimentos operacionais com gatilhos, ações e validações. | [template-runbook.md](template-runbook.md) |
| Guide | Tutoriais passo a passo ou handbooks de desenvolvimento. | [template-guide.md](template-guide.md) |

## Como contribuir

1. Proponha alterações via PR e sinalize no título (`docs: templates`).
2. Atualize o campo `status`/`last_review` dentro do próprio template.
3. Se criar um novo tipo, adicione-o à tabela acima e aos glossários relevantes.
