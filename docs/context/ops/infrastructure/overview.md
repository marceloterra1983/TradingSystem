---
title: Infrastructure Overview
sidebar_position: 10
tags: [infrastructure, overview, ops]
domain: ops
type: overview
summary: Visão resumida da infraestrutura de apoio do TradingSystem (proxy, scraping, observabilidade, dados).
status: active
last_review: 2025-10-17
---

# Infrastructure Overview

Este resumo apresenta os blocos principais de infraestrutura que sustentam o TradingSystem. Para instruções detalhadas, siga os guias específicos linkados abaixo.

## Camadas Principais

| Componente | Responsabilidade | Documentação |
|------------|------------------|--------------|
| Reverse Proxy (Nginx) | Domínio unificado `tradingsystem.local`, roteamento para serviços HTTP. | [Nginx Reverse Proxy Playbook](./nginx-proxy.md) |
| Firecrawl Stack | Web scraping/crawling local para enriquecimento de documentação. | [Firecrawl Stack Overview](./firecrawl-stack.md) |
| Centralized `.env` | Padroniza configuração de todos os serviços. | [Centralized ENV Implementation Plan](./CENTRALIZED-ENV-IMPLEMENTATION-PLAN.md) |
| Observabilidade | Prometheus, Grafana, Alertmanager, logs estruturados. | [Prometheus Setup](../monitoring/prometheus-setup.md), [Grafana Dashboards](../monitoring/grafana-dashboards.md) |
| Dados de Apoio | QuestDB e TimescaleDB para sinais, logs e scraping. | [Trading Core Schema](../../backend/data/schemas/trading-core/overview.md), [WebScraper Schema](../../backend/data/schemas/webscraper-schema-sql.md) |

## Fluxo de Implantação

1. **Provisionar VPS ou host local** com Docker, Node.js e Nginx.
2. **Sincronizar repositório** (`/opt/tradingsystem`) e carregar `.env` centralizado.
3. **Aplicar Nginx** com arquivos de `infrastructure/nginx-proxy`.
4. **Subir stacks**:
   - `bash start-all-stacks.sh` (serviços auxiliares)
   - `bash infrastructure/scripts/start-all-services.sh` (APIs em Node)
5. **Verificar saúde** via `http://tradingsystem.local/api/status` (Service Launcher) e dashboards Grafana.

## Checklists Recomendados

- [Service Startup Guide](../service-startup-guide.md)
- [Pre-Deploy Checklist](../checklists/pre-deploy.md)
- [Post-Deploy Checklist](../checklists/post-deploy.md)
- [Incident Review Checklist](../checklists/incident-review.md)

## Próximos Passos

- Automatizar backups (`infrastructure/scripts`).
- Configurar TLS interno (mkcert/step-ca) para `tradingsystem.local`.
- Versionar configurações críticas em `infrastructure/`.

---

**Mantido por:** Docs & Ops Guild  
**Última revisão:** 2025-10-17
