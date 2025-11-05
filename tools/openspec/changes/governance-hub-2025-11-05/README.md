# OpenSpec Proposal: Governance Hub Consolidation

**ID:** governance-hub-2025-11-05  
**Status:** 🚧 Draft  
**Priority:** P0 (Critical)  
**Created:** 2025-11-05  
**Owner:** DocsOps / Platform Architecture

---

## Quick Links

-   **Proposal:** [proposal.md](./proposal.md)
-   **Design:** [design.md](./design.md)
-   **Tasks:** [tasks.md](./tasks.md)

---

## Summary

TradingSystem possui documentação e artefatos de governança distribuídos principalmente em `docs/governance/**`, relatórios soltos em `reports/`, scripts em `scripts/docs/**` e planilhas CSV isoladas. Esta mudança cria o **Governance Hub** na raiz do repo (`/governance`) como fonte única de estratégia, controles e evidências, com automação para sincronizar com Docusaurus e pipelines.

### Objetivos

1. Consolidar todo o conteúdo de governança em `/governance` com taxonomia clara (strategy, controls, evidence, registry, automation).
2. Automatizar inventário e índices (Registry JSON → `docs` e dashboards) eliminando manutenção manual.
3. Atualizar Docusaurus e scripts para consumir o novo hub em vez de `docs/governance/**`.
4. Garantir que pipelines (validation, quarterly review, agents) leiam/escrevam evidências no novo local.

### Benefícios Esperados

-   ✅ Navegação única para governança (reduz tempo de onboarding).
-   ✅ Automação de índices e dashboards (nenhum checklist manual esquecido).
-   ✅ Controles auditáveis (logs, métricas, owners centralizados).
-   ✅ Preparação para auditorias externas (estrutura ISO/SOC compatível).

### Impacto

| Área                | Mudança                                                           | Resultado                             |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| Estrutura de pastas | Criação de `/governance` com subpastas específicas.               | Reduz dispersão de ~40 arquivos.      |
| Docusaurus          | Referências apontarão para conteúdo sincronizado a partir do hub. | Docs continuam acessíveis via site.   |
| Pipelines           | Novos scripts de sync e validação.                                | Automação garante estado consistente. |
| Equipes             | DocsOps, ProductOps, ArchitectureGuild.                           | Processos revisados e treinados.      |

---

## Timeline de Alto Nível

| Fase                      | Foco                                     | Duração  |
| ------------------------- | ---------------------------------------- | -------- |
| 1. Blueprint & Inventário | Confirmar conteúdo, definir taxonomia    | 2 dias   |
| 2. Infra & Automação Base | Criar `/governance`, registry, scripts   | 3 dias   |
| 3. Migração de Conteúdo   | Mover arquivos, ajustar links e sidebars | 3-4 dias |
| 4. Automação & Dashboards | Índice, métricas, review-tracking        | 2 dias   |
| 5. Cutover & Treinamento  | Atualizar guias, comunicar stakeholders  | 1-2 dias |

---

## Aprovações Necessárias

-   [x] DocsOps Lead
-   [x] Platform Architect
-   [x] Backend Guild (impacto em scripts)
-   [x] DevOps Lead (pipelines)

---

## Próximos Passos

1. Revisar [proposal.md](./proposal.md) para entender o problema e escopo.
2. Validar decisões técnicas em [design.md](./design.md).
3. Estimar e agendar as atividades de [tasks.md](./tasks.md).
4. Coletar feedback e promover para **Ready for Implementation**.
