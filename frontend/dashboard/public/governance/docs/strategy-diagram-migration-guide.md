# PlantUML Diagram Migration Guide

**Purpose**: Copy 26 PlantUML diagrams from `docs/context/shared/diagrams/` to `docs/content/assets/diagrams/source/` with domain-based organization.

**Source**: `docs/context/shared/diagrams/` (26 `.puml` files)  
**Target**: `docs/content/assets/diagrams/source/{domain}/` (6 subdirectories)

## Directory Structure

Create domain-based subdirectories:

- `backend/` - 9 diagrams (TP Capital, Idea Bank, Order lifecycle, Trading pipeline)
- `frontend/` - 4 diagrams (Customizable layout)
- `ops/` - 5 diagrams (Deployment, Connection states, Firecrawl, Database UI, Docker)
- `agents/` - 5 diagrams (Agno Agents, LangGraph)
- `adr/` - 2 diagrams (ADR-0002 before/after)
- `shared/` - 1 diagram (System architecture)

## Migration Procedure

**Step 1: Create Directories**

```bash
cd docs/content/assets/diagrams/source
mkdir -p backend frontend ops agents adr shared
```

**Step 2: Copy Diagrams by Domain**

**Backend Diagrams**:

```bash
cp docs/context/shared/diagrams/tp-capital-*.puml docs/content/assets/diagrams/source/backend/
cp docs/context/shared/diagrams/idea-bank-*.puml docs/content/assets/diagrams/source/backend/
cp docs/context/shared/diagrams/state-machine-order-lifecycle.puml docs/content/assets/diagrams/source/backend/
cp docs/context/shared/diagrams/data-flow-trading-pipeline.puml docs/content/assets/diagrams/source/backend/
cp docs/context/shared/diagrams/sequence-telegram-bot-configuration.puml docs/content/assets/diagrams/source/backend/
```

**Frontend Diagrams**:

```bash
cp docs/context/shared/diagrams/customizable-layout-*.puml docs/content/assets/diagrams/source/frontend/
```

**Ops Diagrams**:

```bash
cp docs/context/shared/diagrams/deployment-architecture.puml docs/content/assets/diagrams/source/ops/
cp docs/context/shared/diagrams/state-machine-connection-states.puml docs/content/assets/diagrams/source/ops/
cp docs/context/shared/diagrams/firecrawl-*.puml docs/content/assets/diagrams/source/ops/
cp docs/context/shared/diagrams/database-ui-tools-architecture.puml docs/content/assets/diagrams/source/ops/
cp docs/context/shared/diagrams/docker-container-architecture.puml docs/content/assets/diagrams/source/ops/
```

**Agent Diagrams**:

```bash
cp docs/context/shared/diagrams/agno-agents-*.puml docs/content/assets/diagrams/source/agents/
cp docs/context/shared/diagrams/langgraph-*.puml docs/content/assets/diagrams/source/agents/
```

**ADR Diagrams**:

```bash
cp docs/context/shared/diagrams/adr-0002-*.puml docs/content/assets/diagrams/source/adr/
```

**Shared Diagrams**:

```bash
cp docs/context/shared/diagrams/system-architecture.puml docs/content/assets/diagrams/source/shared/
```

**Step 3: Verify Copy**

```bash
# Count files in each directory
find docs/content/assets/diagrams/source -name "*.puml" | wc -l
# Expected: 26

# List by domain
find docs/content/assets/diagrams/source -type f -name "*.puml" | sort
```

**Step 4: Update Diagram Index**

Update `docs/content/diagrams/diagrams.mdx` table to reflect new paths:

- Change all `assets/diagrams/source/shared/` entries to domain-specific paths
- Example: `assets/diagrams/source/backend/tp-capital-component-architecture.puml`

**Step 5: Test Rendering**

```bash
cd docs
npm run docs:dev
# Open http://localhost:3400/diagrams
# Verify all diagrams render correctly
```

## Validation Checklist

- [ ] All 26 `.puml` files copied to docs
- [ ] Files organized by domain (backend, frontend, ops, agents, adr, shared)
- [ ] Diagram index table updated with new paths
- [ ] All diagrams render in Docusaurus (test locally)
- [ ] No broken diagram references in documentation
- [ ] Legacy diagrams remain in `docs/context/` (don't delete during transition)

## Related Documentation

- [Diagram Catalogue](../content/diagrams/diagrams.mdx) - Complete diagram index
- [PlantUML Guide](../content/tools/plantuml/overview) - Rendering and syntax
- [Migration Mapping](../migration/MIGRATION-MAPPING.md) - Diagram migration rules
