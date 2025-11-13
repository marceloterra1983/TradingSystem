> ⚠️ **Status:** Proposta cancelada em 2025-11-13 com a remoção da stack `crawler-course-meta`. Conteúdo mantido apenas para histórico de decisões.

## Why

O repositório já possui a especificação `Crawler Course Meta` (tools/openspec/specs/crawler-course-meta/spec.md), mas ainda não há plano de implantação que leve o template do papel para uma stack operacional. Precisamos transformar o design em entregáveis concretos para:

- Disponibilizar o backend Node.js + Crawlee + Playwright com plugins de plataforma e autenticação segura.
- Entregar o frontend Next.js 15 com experiência completa de jobs, logs, métricas e artefatos.
- Garantir observabilidade (Prometheus/Grafana), exportação organizada em `outputs/` e conformidade legal.
- Facilitar adoção por equipes internas/externas, com CLI, API REST e docker-compose reprodutível.

Sem essa implantação, o template segue como documentação aspiracional sem roteiro de execução nem checkpoints de qualidade.

## What Changes

1. **Backend operacional**: Implementar serviços `crawler-course-meta` com orquestração Crawlee/Playwright, plugins para Hotmart/Udemy/Moodle e suporte completo aos métodos de autenticação descritos na spec.
2. **Frontend unificado**: Entregar `crawler-course-meta-ui` em Next.js 15 + Tailwind + shadcn/ui com rotas `/login`, `/`, `/jobs`, `/jobs/new`, `/jobs/{id}`, `/jobs/{id}/run/{runId}`, `/artifacts`, `/metrics`, `/settings`.
3. **CLI + API**: Disponibilizar comandos `run|init|dry-run|export` e endpoints REST (`/api/jobs/**`, `/api/plugins`, `/api/sessions/**`, `/api/metrics`) com paridade funcional.
4. **Storage & exports**: Definir layout padrão em `outputs/<job>/` para JSON, Markdown, screenshots e `report.json`, com políticas de retenção e limpeza automatizadas.
5. **Observability**: Publicar `/api/metrics` + `:9234/metrics`, logs JSON estruturados, dashboards Grafana e alertas básicos (erros e tempo de execução).
6. **Qualidade & segurança**: Configurar matriz de testes (unit, integration, E2E, frontend), cobertura ≥70%, validação de schema dos `job-file.yml`, checklists legais e documentação de consentimento.
7. **Infra compartilhada**: Fornecer `docker-compose` (api/ui/prometheus), scripts npm, exemplos `.env` e integração opcional com Postgres/Redis para fila.

## Impact

| Área | Benefício |
| ---- | --------- |
| **Growth / Conteúdo** | Ferramenta única para levantar metadados confiáveis de cursos parceiros sem depender de scripts ad-hoc. |
| **Engenharia** | Fluxo padronizado (CLI/API) reduz retrabalho e simplifica extensões por plataforma. |
| **Observabilidade** | Métricas e logs padronizados permitem entender gargalos e taxas de erro rapidamente. |
| **Compliance** | Registro explícito de consentimento, respeito a robots.txt e isolamento de credenciais evita incidentes legais. |
| **AI/Automation** | Outputs limpos no diretório `outputs/` habilitam ingestão por workflows ou agentes sem passos manuais. |

## Success Metrics

1. **Execução ponta-a-ponta**: ≥3 plataformas suportadas (Hotmart, Udemy, Moodle) executando jobs reais com export JSON/MD.
2. **Tempo de preparo**: bootstrap completo (clonar repo → rodar docker-compose → executar job) em ≤15 minutos documentado.
3. **Observabilidade ativa**: dashboards Prometheus/Grafana exibindo métricas em tempo real durante runs.
4. **Qualidade**: Cobertura de testes combinada ≥70% e pipelines CI verdes (unit + integration + E2E + frontend).
5. **Conformidade**: 100% dos jobs privados registram consentimento e utilizam `session_store` criptografado.

## Out of Scope

- Integrações com marketplaces adicionais fora dos plugins descritos (ex.: Coursera, Skillshare) — podem virar novas mudanças.
- Automação de distribuição dos resultados para BI/Data Warehouse; o foco é geração local dos artefatos.
- Publicação pública de imagens Docker; inicialmente o compose utiliza build local.
- Implementações de RBAC avançado ou billing — previstos no roadmap futuro (F7+).

## Risks & Mitigations

| Risco | Probabilidade | Mitigação |
| ----- | ------------- | --------- |
| Mudanças frequentes de layout nas plataformas alvo quebram seletores. | Alta | Abstrair seletores em plugins versionados, com testes visuais e fallback de scraping. |
| Bloqueio de IP/anti-bot por excesso de requisições. | Média | Limitar `max_scrolls`, implementar throttling e suporte a proxies rotativos. |
| Vazamento de credenciais ou sessões. | Baixa | Centralizar `.env`, criptografar `session_store`, adicionar lint que impede commits de secrets. |
| Falta de adesão ao frontend (preferência por scripts CLI). | Média | Demonstrar valor do dashboard (progresso em tempo real, logs, artefatos) e documentar APIs. |
| Crescimento do diretório `outputs/` sem política de retenção. | Média | Adicionar rotina opcional de limpeza automatizada e documentação sobre versionamento externo. |
