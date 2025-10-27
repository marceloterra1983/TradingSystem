---
capability-id: docs-apps
capability-type: NEW
status: proposal
domain: documentation
tags: [docusaurus, apps, governance]
---

# Specification: Docs Apps Navigation & Content

## Overview

Esta capacidade garante que a seção **Apps** do Docusaurus represente com precisão os aplicativos ativos do TradingSystem—**TP Capital**, **Workspace** e **Telegram Gateway**—incluindo configurações, fluxos operacionais e referências cruzadas.

---

## ADDED Requirements

### Requirement: Sidebar reflete catálogo atual

A navegação de Apps SHALL exibir apenas aplicativos ativos no Docusaurus.

#### Scenario: Aplicativos ativos aparecem e legados somem
- **GIVEN** a navegação `Apps` é carregada
- **WHEN** a barra lateral é renderizada
- **THEN** os itens raiz exibidos são, nesta ordem: TP Capital, Workspace, Telegram Gateway
- **AND** nenhum item legado (Data Capture, Order Manager) aparece
- **AND** os metadados (`position`, `slug`) refletem os novos diretórios
- **Source of truth**: `docs/sidebars.js`, `docs/content/apps/<app>/_category_.json`

### Requirement: Docs do TP Capital usam dados reais

A documentação do TP Capital SHALL refletir a implementação Timescale + Telegram Gateway.

#### Scenario: Configuração de TP Capital está alinhada ao código
- **GIVEN** `docs/content/apps/tp-capital/config.mdx`
- **WHEN** as variáveis obrigatórias são listadas
- **THEN** os valores/descrições batem com `apps/tp-capital/.env.example` e `.env.local`
- **AND** a porta documentada para produção é 4005 (`apps/tp-capital/src/config.js:283`)
- **AND** o banco padrão é TimescaleDB com schema `tp_capital`
- **AND** endpoints `/sync-messages` e `/forwarded-messages` constam conforme `apps/tp-capital/src/server.js:200`

### Requirement: Docs do Workspace refletem TimescaleDB

A documentação do Workspace SHALL referenciar o schema Timescale oficial.

#### Scenario: Modelo de dados referencia schema correto
- **GIVEN** `docs/content/apps/workspace/api.mdx`
- **WHEN** descreve o modelo de banco
- **THEN** aponta para `workspace.workspace_items` com colunas `id`, `title`, `metadata`, `created_by`, `updated_by`
- **AND** cita TimescaleDB como storage principal (`backend/api/workspace/src/config.js:12`)
- **AND** referências a LowDB/porta 3900 aparecem apenas como contexto frontend (ou são removidas se obsoletas)

### Requirement: Documentação do Telegram Gateway cobre fluxos principais

A documentação do Telegram Gateway SHALL cobrir serviço MTProto e REST API de ponta a ponta.

#### Scenario: Nova árvore descreve Gateway de ponta a ponta
- **GIVEN** `docs/content/apps/telegram-gateway/overview.mdx`
- **WHEN** operadores consultam a seção
- **THEN** encontram arquitetura MTProto → HTTP, portas 4006/4010 e variáveis críticas
- **AND** existem páginas complementares (config, operations, runbook, changelog) com frontmatter válido
- **Source of truth**: `apps/telegram-gateway/README.md`, `backend/api/telegram-gateway/README.md`

### Requirement: Referências cruzadas atualizadas

Páginas de visão geral SHALL apontar apenas para os apps ativos.

#### Scenario: Overview e changelog listam apenas apps ativos
- **GIVEN** `docs/content/apps/overview.mdx` e `docs/content/changelog.mdx`
- **WHEN** listam aplicativos
- **THEN** referenciam TP Capital, Workspace e Telegram Gateway com links válidos
- **AND** não mencionam Data Capture ou Order Manager

### Requirement: Validação automatizada

Os pipelines de validação SHALL continuar aprovando após as alterações.

#### Scenario: Pipelines de lint/documentação aprovam alterações
- **WHEN** executamos `npm run validate-docs`
- **AND** executamos `npm run lint`
- **AND** executamos `npx openspec validate --changes` com `OPENSPEC_ROOT=tools/openspec`
- **THEN** todos os comandos finalizam com exit code 0
