---
title: Proposal
sidebar_position: 1
tags:
  - documentation
domain: ops
type: guide
summary: '- Operações precisam de uma visão rápida sobre a saúde geral dos serviços
  auxiliares executados via '
status: active
last_review: '2025-10-23'
---

## Why
- Operações precisam de uma visão rápida sobre a saúde geral dos serviços auxiliares executados via Docker Compose/Laucher.
- Hoje o endpoint `/api/status` só lista itens individuais, dificultando alertas e dashboards centralizados.

## What Changes
- Adicionar cálculo de `overallStatus` e métricas agregadas (latência média, contagem de serviços degradados) na resposta do Laucher.
- Persistir timestamp da última verificação bem-sucedida para consumo pelo dashboard em tempo real.
- Atualizar documentação do endpoint em `docs/context/apps/service-launcher/`.

## Impact
- Dashboard pode exibir um card único com semáforo (verde/amarelo/vermelho) baseado em `overallStatus`.
- Facilita automações futuras (alertas Prometheus) reutilizando o mesmo endpoint HTTP.
- Não altera contratos existentes: o array atual permanece disponível.

## Rollout
- Implementar e testar no ambiente local.
- Validar no dashboard (`frontend/dashboard`) com mock do novo campo.
- Após deploy, monitorar logs do Laucher por 24h para garantir estabilidade.
