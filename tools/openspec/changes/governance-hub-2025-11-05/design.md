# Design - Governance Hub Consolidation

## 1. Target Folder Structure

```
governance/
├── README.md                # Guia rápido e navegação
├── strategy/                # Planos, roadmaps, comms
│   ├── communication-plan.md
│   ├── cutover-plan.md
│   └── ...
├── controls/                # Guias, políticas, checklists, runbooks
│   ├── maintenance-checklist.md
│   ├── validation-guide.md
│   └── review-checklist.md
├── evidence/                # Relatórios, auditorias, CSV/JSON de métricas
│   ├── audits/
│   ├── metrics/
│   ├── reports/
│   └── review-tracking.csv
├── registry/
│   ├── registry.json        # Canonical metadata
│   ├── templates/
│   └── schemas/
├── automation/
│   ├── generate-docs-index.mjs
│   ├── sync-docusaurus.mjs
│   └── governance-metrics.mjs
└── archive/                 # Conteúdo obsoleto (opcional)
```

### Principles
- **Single Source:** Markdown, CSV, JSON ficam sob `/governance`. Docusaurus consome cópias geradas automaticamente.
- **Categories:** Cada arquivo possui `category`, `owner`, `reviewCycle` descritos no `registry.json`.
- **Automation First:** Nenhuma página de índice é editada manualmente (apenas scripts tocam).

## 2. Registry Schema

```json
{
  "version": 1,
  "generatedAt": "2025-11-05T12:00:00Z",
  "artifacts": [
    {
      "id": "controls.validation-guide",
      "path": "controls/VALIDATION-GUIDE.md",
      "type": "guide",
      "category": "controls",
      "owner": "DocsOps",
      "reviewCycleDays": 30,
      "lastReviewed": "2025-10-29",
      "tags": ["validation", "docs"],
      "docusaurus": {
        "slug": "/governance/controls/validation-guide",
        "sidebar": "governance"
      }
    }
  ]
}
```

- `registry.json` serve como entrada para scripts de sync e para validações de freshness.
- Aceita múltiplos tipos (`plan`, `policy`, `audit`, `report`, `metric`, `script`).
- Pode ser estendido futuramente com links externos (Sentry, Kestra, Grafana).

## 3. Automation Scripts

### 3.1 `generate-docs-index.mjs`
- Lê `registry.json` e produz `governance/index.md` (local) + `docs/content/governance/index.mdx` (public).
- Agrupa por categoria e gera tábuas (file, owner, review data, status).
- Inclui seção “Maintenance Log” com dados de `evidence/review-tracking.csv`.

### 3.2 `sync-docusaurus.mjs`
- Copia conteúdos relevantes (ex.: guias, checklists) para `docs/content/governance/<category>/...` preservando frontmatter.
- Adiciona frontmatter padrão a partir dos campos do registry (title, description, tags, owner, lastReviewed).
- Atualiza `docs/sidebars.js` automaticamente com base nas categorias presentes.

### 3.3 `governance-metrics.mjs`
- Consolida relatórios JSON/CSV de `evidence/` e gera `docs/content/reports/governance-status.mdx` com KPIs (freshness %, audits abertos, etc.).
- Opcionalmente exporta `reports/agents/governance-summary.json` para consumo por Claude/Codex.
- Expõe endpoint JSON (`reports/governance/latest.json`) consumido pelo frontend.

Todos os scripts ficam acessíveis via npm scripts no root:
```json
{
  "scripts": {
    "governance:auto": "node governance/automation/generate-docs-index.mjs && node governance/automation/sync-docusaurus.mjs",
    "governance:metrics": "node governance/automation/governance-metrics.mjs",
    "docs:auto": "npm run governance:auto && <pipeline atual>"
  }
}
```

## 4. Governance Frontend (Header Knowledge)

- **Localização:** `frontend/dashboard` → adicionar página/aba “Governance” sob o header **Knowledge** (mesma área já usada para relatórios).
- **Alimentação:** consome `reports/governance/latest.json` + `registry/registry.json` (via API interna ou fetch local) para renderizar cards.
- **Componentes principais:**
  - KPI cards (Freshness %, Itens com auditoria atrasada, Próximos reviews).
  - Tabela dinâmica dos principais artefatos com filtros (categoria, owner, SLA).
  - Timeline de evidências recentes (audits, relatórios, migrations).
  - Alertas automáticos quando `governance:check` falhar ou houver itens >90 dias.
- **Auto-atualização:** build do dashboard observa mudanças em `/governance`; pipeline `governance:auto` gera JSON + invalida cache. Na aplicação, hook `useGovernanceData` faz polling leve (ex.: 60s) em ambiente dev e utiliza SWR/React Query para revalidar após deploys.
- **Estados offline:** se JSON não estiver acessível, renderiza cards com fallback e link para `/governance`.
- **Deployment obrigatório via container:** dashboard deve ser iniciado através de `tools/compose/docker-compose.dashboard.yml` (ex.: `npm run dev:dashboard-docs` → `docker compose ... up --build`) para manter parity com ambientes QA/Prod.

## 5. Data Flows

1. **Conteúdo primário** vive em `/governance` (editado manualmente).
2. **Registry** descreve cada artefato e é atualizado ao criar/mover arquivos.
3. **Scripts** leem o registry:
   - Geram índices/dashboards para Docusaurus.
   - Validam freshness e owners (falha se inconsistentes).
   - Exportam artefatos para outros sistemas (ex.: `reports/agents/`).
4. **Docusaurus** importa somente resultados gerados (read-only), mantendo processos anti-drift.

## 6. Docusaurus & Knowledge Integration

- Adicionar novo plugin/custom script executado antes de build para garantir que `governance:auto` rodou.
- Atualizar `docs/README.md` para refletir que governança agora é gerada.
- Configurar redirects (Netlify/Vercel ou Docusaurus `createRedirects`) para rotas antigas (`/governance/...`).
- Expor endpoint JSON via static assets para que o frontend Knowledge possa consumir os mesmos dados (shared source).

## 7. Validation & Compliance

- Nova etapa `npm run governance:check` executa:
  1. `node governance/automation/validate-registry.mjs` (schema + caminhos reais).
  2. Freshness check (threshold 90 dias com exceções definidas no registry).
  3. Cross-check com `review-tracking.csv` para garantir que status bate com real.
- CI falha se qualquer etapa sinalizar artefato fora da política.

## 8. Rollout Plan

| Passo | Detalhe | Dependências |
|-------|---------|--------------|
| Blueprint | Mapear arquivos atuais, preencher registry inicial | Inventory script | 
| Infra | Criar pasta `/governance`, seeds, npm scripts | None |
| Migração | Mover markdown/relatórios, atualizar imports/links | Blueprint + Infra |
| Automation | Gerar índices, dashboards, sidebars | Registry estável |
| Frontend | Construir página Knowledge, integrar APIs e estados | Automation |
| Cutover | Atualizar docs, remover `docs/governance`, comunicar | Todos anteriores |

## 9. Open Questions

1. Onde armazenar anexos binários (PDF, imagens) que atualmente residem em `docs/static`? → Proposta: `governance/evidence/assets/` com ponte no Docusaurus.
2. Precisamos versionar `review-tracking.csv` ou migrar para formato JSON+MDX? → Manter CSV (excel-friendly) e gerar JSON durante automação.
3. Como alinhar com `tools/openspec/changes/port-governance-2025-11-05` para evitar conflito de scripts? → Compartilhar utilitário comum em `scripts/governance/`.
