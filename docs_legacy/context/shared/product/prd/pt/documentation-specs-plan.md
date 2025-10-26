---
title: OpenSpec-Oriented Plan for TradingSystem AI
sidebar_position: 40
tags: [openspec, documentation, ai, specs, plan]
domain: shared
type: guide
summary: Plan to deliver living specification package with OpenAPI, AsyncAPI, and automated tasks for AI agents
status: active
last_review: "2025-10-17"
---

# OpenSpec-Oriented Plan for TradingSystem AI

> Goal: deliver a **living specification package** (OpenAPI + AsyncAPI + Schemas + Examples) and an **automated task set** for the **OpenSpec agent** to execute inside the project, enabling AI querying (RAG + function-calling/MCP), continuous validation, and optional human-facing documentation.

---

## 1) Objectives

* **Single source of truth** for HTTP APIs and event channels in **machine‑readable format** (OpenAPI 3.1 + AsyncAPI 3.0).
* **AI‑ready documentation**: specs chunkable for RAG + direct mapping to tools (function calling / MCP tools).
* **Continuous quality**: linting/validation (Spectral), verified examples, versioned contracts.
* **DX/HX**: optional human‑readable layer (Redoc/Swagger UI) without breaking AI integration.

---

## 2) Scope

* REST endpoints of TradingSystem running at `http://localhost:3101`.
* **Market data and order events** through **WebSocket** or equivalent streams.
* **Reusable JSON Schemas** and **real‑world examples**.
* Automation pipeline for **build / validate / publish / RAG indexing**.

Out of scope (this cycle): external auth (OAuth2), public portal, multi‑tenant support.

---

## 3) Documentation Architecture

```
/docs/
  /docusaurus/            # existing, untouched
  /spec/                  # new
    openapi.yaml
    asyncapi.yaml
    /schemas/
    /examples/
  spectral.yaml
  /public/
    redoc.html            # optional, used by DocsSPECS iframe
  /ingest/
    from_docusaurus.py    # extracts knowledge from MD/MDX to enrich specs
    heuristics.yaml       # mapping rules (naming, tables, fields)
  /ingest/assets/
    symbols.yaml          # provisional market symbols and metadata
```

**Static routes to expose:**

* `GET /spec/openapi.yaml`
* `GET /spec/asyncapi.yaml`
* `GET /spec/schemas/*`
* `GET /spec/examples/*`
* `GET /docs` → serves `redoc.html` (DocsSPECS iframe)

---

## 4) Docusaurus Integration

* Keep the Docusaurus site exactly as is in `\\docs\\docusaurus` (Windows) / `./docs/docusaurus` (Linux/WSL).
* Specs remain the authoritative source; Docusaurus serves as **context and narrative source** for enrichment.
* The ingestion pipeline parses MD/MDX from `docs/docusaurus` and merges useful content (descriptions, examples, glossaries) into specs.
* Any divergence: **spec prevails**; the agent opens an issue for human review.

### Frontmatter Keys in Docusaurus Files

```mdx
---
id: placing-orders
title: Sending Orders
spec: true
---
```

* `spec: false` → skip ingestion (page ignored by the spec builder).
* `spec: true` → force inclusion.
* `specOnly: true` → index only for spec (excluded from text RAG).

---

## 5) DocsSPECS Frontend (React/Next.js)

* **Sidebar integration** (not header) within the TradingSystem UI.
* Menu items:

  * **API Reference (Redoc embedded)** → internal route `/docs/specs` with iframe loading `/_static/redoc.html`.
  * **Spec Files** → links to `/spec/openapi.yaml`, `/spec/asyncapi.yaml`, `/spec/schemas/`, `/spec/examples/`.
  * **Project Guides (Docusaurus)** → `http://localhost:3005/` (opens in new tab by default).

**Sidebar Example (pseudo‑code):**

```tsx
const items = [
  { label: 'Dashboard', href: '/' },
  {
    label: 'DocsSPECS',
    children: [
      { label: 'API Reference', href: '/docs/specs' },
      { label: 'Spec Files', href: '/docs/specs/files' },
      { label: 'Project Guides (Docusaurus)', href: 'http://localhost:3005/', external: true }
    ],
    status: useDocsStatus() // green | yellow | red
  }
]
```

**DocsSPECS Page (iframe):**

```tsx
export default function DocsSpecs() {
  return (
    <div style={{height: '100vh'}}>
      <iframe
        src={"/_static/redoc.html"}
        style={{width: '100%', height: '100%', border: 'none'}}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
```

---

## 6) Provisional Market Symbols (for heuristics)

File: `./docs/ingest/assets/symbols.yaml`

```yaml
markets:
  futures:
    - { symbol: WIN,  desc: "Mini Ibovespa Futures",    multiplier: 0.2, currency: BRL }
    - { symbol: IND,  desc: "Full Ibovespa Futures",    multiplier: 1.0, currency: BRL }
    - { symbol: WDO,  desc: "Mini Dollar Futures",      multiplier: 10.0, currency: BRL }
    - { symbol: DOL,  desc: "Full Dollar Futures",      multiplier: 50.0, currency: BRL }
  equities:
    - { symbol: PETR4, desc: "Petrobras PN" }
    - { symbol: VALE3, desc: "Vale ON" }
    - { symbol: ITUB4, desc: "Itaú PN" }
    - { symbol: BOVA11, desc: "ETF Ibovespa" }
  indices:
    - { symbol: IBOV,  desc: "Ibovespa Index" }
    - { symbol: IFIX,  desc: "Real Estate Fund Index" }
  fx:
    - { symbol: USDBRL, desc: "USD/BRL Spot (indicative)" }
conventions:
  symbol_case: upper
  option_style: "B3-default"
  timezone: "America/Sao_Paulo"
```

---

## 7) Independent Versioning with Cross‑Linked Changelogs

* **Spec** → version field `info.version` (OpenAPI/AsyncAPI) evolves independently.
* **Docusaurus** → keeps its own versions or tags.
* Each time ingestion modifies a spec, it logs the originating MDX file ID and commit hash in `CHANGELOG_SPEC.md`.
* Cross‑reference entries in `CHANGELOG_DOCS.md` for transparency.

---

## 8) OpenSpec Agent Jobs

```yaml
jobs:
  ingest-docusaurus:
    steps:
      - name: Extract and enrich specs from Docusaurus
        cmd: "python ./docs/ingest/from_docusaurus.py --root ./docs/docusaurus --symbols ./docs/ingest/assets/symbols.yaml --out ./docs/spec"
      - name: Validate specs
        cmd: "npx @stoplight/spectral-cli lint ./docs/spec/openapi.yaml"

  docs-health:
    steps:
      - name: Publish documentation status
        cmd: "python scripts/docs_health.py --spec ./docs/spec/openapi.yaml --async ./docs/spec/asyncapi.yaml --out ./docs/public/status.json"
```

---

## 9) Acceptance Criteria

* **DocsSPECS** visible in sidebar with embedded Redoc.
* **Project Guides** link functional (`http://localhost:3005/`).
* `ingest-docusaurus` respects frontmatter flags and produces clear diffs.
* `symbols.yaml` applied to normalize and validate examples.
* Independent spec and doc versions, both with updated changelogs.

---

## 10) Roadmap Summary

1. Enable **DocsSPECS** in the TradingSystem sidebar.
2. Implement **Docusaurus ingestion** and validate with Spectral.
3. Extend heuristics to parse tables → JSON Schema and code blocks → examples.
4. Reach 95% route and event coverage.

---

## 11) Notes for Implementation

* Static serving: map `/_static/*` → `./docs/public/*`, `/spec/*` → `./docs/spec/*`.
* Run `ingest-docusaurus` in PRs or hourly schedule.
* The agent must prioritize **spec truth over doc context**.
* Warnings from `spectral lint` should trigger a visible badge in DocsSPECS.

> Next: generate the supporting scripts (`from_docusaurus.py`, `docs_health.py`, `rag_index.py`) and Next.js pages (`DocsSPECS`, `SpecFiles`) to finalize the ecosystem.
