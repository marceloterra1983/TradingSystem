# Governance Hub

The Governance Hub centralizes every plan, checklist, audit and automation that used to live under `governance/**`. All canonical sources now live in this directory and downstream systems (Docusaurus, dashboard Knowledge tab, agents) consume generated artifacts instead of editing files in `docs/`.

## Structure

```
governance/
├── policies/      # Formal policies (POL-XXXX)
├── standards/     # Technical standards (STD-XXXX)
├── controls/      # SOPs, runbooks, checklists
├── adr/           # Architecture Decision Records (reserved)
├── strategy/      # Plans, roadmaps, communication/cutover guides
├── evidence/      # Audits, metrics, reports and tracking CSVs
│   ├── audits/
│   ├── metrics/
│   ├── reports/
│   └── review-tracking.csv
├── registry/      # Canonical metadata + schemas/templates
│   ├── registry.json
│   ├── templates/
│   └── schemas/registry.schema.json
├── automation/    # Scripts that sync content with docs + dashboard
└── archive/       # Legacy content (optional)
```

## Policies Model

O TradingSystem adota um modelo formal de governança com **Policies**, **Standards** e **Controls (SOPs)** para garantir compliance, rastreabilidade e automação de processos críticos.

### Hierarquia

```
Policies (POL-XXXX)
  ↓
Standards (STD-XXXX)
  ↓
Controls/SOPs (SOP-XXX-XXX)
```

### Tipos de Documentos

#### 1. **Policies (Políticas)**

- **ID Format**: `POL-XXXX` (ex: POL-0002)
- **Owner**: Team or role responsible (ex: SecurityEngineering)
- **Review Cycle**: 90 days (default)
- **Purpose**: Estabelecer **diretrizes obrigatórias** de alto nível
- **Exemplo**: POL-0002 - Política de Gerenciamento de Segredos

**Front-matter obrigatório**:
```yaml
---
title: "Nome da Política"
id: POL-XXXX
owner: SecurityEngineering
lastReviewed: YYYY-MM-DD
reviewCycleDays: 90
status: active  # active | draft | deprecated
appliesTo:
  - OrderManager
  - DataCapture
related:
  - STD-XXX
tags:
  - security
  - compliance
---
```

#### 2. **Standards (Padrões Técnicos)**

- **ID Format**: `STD-XXXX` (ex: STD-010)
- **Owner**: Technical team
- **Review Cycle**: 90 days (default)
- **Purpose**: Definir **requisitos testáveis** para implementação de políticas
- **Exemplo**: STD-010 - Secrets Standard (implementa POL-0002)

**Front-matter obrigatório**:
```yaml
---
title: "Nome do Padrão"
id: STD-XXXX
owner: SecurityEngineering
lastReviewed: YYYY-MM-DD
reviewCycleDays: 90
status: active
relatedPolicies:
  - POL-XXXX
tags:
  - technical-standard
  - testing
---
```

#### 3. **Controls/SOPs (Standard Operating Procedures)**

- **ID Format**: `SOP-XXX-XXX` (ex: SOP-SEC-001)
- **Owner**: Operations team
- **Review Cycle**: 180 days (default)
- **Purpose**: Procedimentos **passo-a-passo** para execução
- **Exemplo**: SOP-SEC-001 - Secrets Rotation SOP

**Front-matter obrigatório**:
```yaml
---
title: "Nome do SOP"
id: SOP-XXX-XXX
owner: SecurityEngineering
lastReviewed: YYYY-MM-DD
reviewCycleDays: 180
status: active
relatedPolicies:
  - POL-XXXX
relatedStandards:
  - STD-XXXX
tags:
  - sop
  - runbook
---
```

### Exemplo Completo: Governança de Segredos

```
POL-0002: Política de Gerenciamento de Segredos
├── Define: Nunca versionar .env reais, usar SOPS/age, rotacionar a cada 90 dias
│
├─> STD-010: Secrets Standard
│   ├── Define: .env.example obrigatório, TruffleHog scan, mascaramento de logs
│   ├── Testes: npm run governance:validate-envs
│   └── Validação: Build falha se política expirada
│
└─> SOP-SEC-001: Secrets Rotation SOP
    ├── Procedimento: Como rotacionar senhas de DB, tokens de API, JWT secrets
    ├── Evidências: JSON em governance/evidence/audits/
    └── Rollback: Janela de 24h para reverter
```

### Validação Automatizada

**Scripts de validação** (executados em CI/CD):

```bash
# Validar políticas (front-matter + expiração)
npm run governance:validate-policies

# Validar templates .env
npm run governance:validate-envs

# Scan de segredos
npm run governance:scan-secrets

# Execução completa
npm run governance:check
```

**Critérios de falha**:
- Policy expirada (`lastReviewed + reviewCycleDays < hoje`)
- Owner vazio ou "TBD"
- Segredos detectados em plaintext
- Front-matter inválido ou incompleto

### Evidências de Auditoria

Todas as validações geram **evidências rastreáveis** em JSON:

```
governance/evidence/audits/
├── secrets-audit-YYYY-MM.json       # Validação de .env
├── secrets-scan-YYYY-MM-DD.json     # TruffleHog scan results
└── secrets-rotation-YYYY-MM-DD.json # Rotações executadas
```

**Formato padrão**:
```json
{
  "timestamp": "2025-11-05T14:32:00Z",
  "type": "secrets_rotation",
  "actor": "devops-team",
  "environment": "production",
  "secrets_rotated": [...],
  "policy": "POL-0002",
  "standard": "STD-010"
}
```

### CI/CD Integration

**GitHub Actions workflow** (`.github/workflows/governance-secrets.yml.example`):
- Valida políticas em TODOS os PRs
- Falha se segredos verificados forem detectados
- Gera artefatos de auditoria
- Notifica owners de políticas próximas de expirar

**Habilitar**:
```bash
mv .github/workflows/governance-secrets.yml.example \
   .github/workflows/governance-secrets.yml
```

### Responsabilidades

| Papel | Atividade |
|-------|-----------|
| **Policy Owner** | Revisar policy a cada `reviewCycleDays`, aprovar exceções |
| **Developers** | Seguir policies, nunca commitar secrets, reportar violações |
| **DevOps/SRE** | Executar SOPs, manter evidências, automatizar validações |
| **CI/CD** | Bloquear builds se policies expiradas ou segredos detectados |

### Próximos Passos

1. **Criar nova policy**:
   - Copiar template de `governance/policies/secrets-env-policy.md`
   - Atualizar front-matter com novo ID (POL-XXXX)
   - Adicionar ao `registry/registry.json`

2. **Criar novo standard**:
   - Relacionar a policy pai (`relatedPolicies: [POL-XXXX]`)
   - Definir requisitos testáveis
   - Criar testes em `governance/automation/`

3. **Criar novo SOP**:
   - Documentar procedimento passo-a-passo
   - Incluir rollback e tratamento de emergência
   - Testar em staging antes de publicar

## Workflow

1. **Add or update content** inside the relevant category (strategy/controls/evidence).
2. **Update `registry/registry.json`** if you add a new artifact or change metadata (owner, cadence, slug).
3. Run `npm run governance:auto` to regenerate the local index and push updates into `docs/content/governance/**`.
4. Run `npm run governance:metrics` to refresh `reports/governance/latest.json` and the Knowledge dashboard feed.
5. Run `npm run governance:check` (or rely on CI) before committing to validate schema, freshness and sync results.

## Automation Scripts

| Script | Description |
|--------|-------------|
| `governance/automation/generate-docs-index.mjs` | Produces `governance/index.md` and `docs/content/governance/index.mdx` from the registry. |
| `governance/automation/sync-docusaurus.mjs` | Publishes strategy/controls artifacts to Docusaurus with auto frontmatter. |
| `governance/automation/governance-metrics.mjs` | Generates `reports/governance/latest.json` plus `docs/content/reports/governance-status.mdx`. |
| `governance/automation/validate-registry.mjs` | Validates JSON schema, freshness windows and file paths. |

All scripts assume Node 18+ and use the repo root as working directory.

## Publishing Rules

- Canonical content lives here in Markdown/CSV/JSON form.
- Docusaurus copies are generated — never edit `docs/content/governance/**` manually.
- Additions must include `lastReviewed`, `reviewCycleDays`, `owner` and `tags` in the registry.
- Evidence files can include supporting assets (PDF/PNG) under `evidence/assets/` with links captured in the registry.

## Dashboard Integration

`npm run governance:metrics` writes the aggregated JSON feed consumed by the dashboard Knowledge tab (`frontend/dashboard`). Any automation/build should run `npm run governance:auto && npm run governance:metrics` before `docs:auto` to guarantee fresh data across CLI, Docs and UI.
