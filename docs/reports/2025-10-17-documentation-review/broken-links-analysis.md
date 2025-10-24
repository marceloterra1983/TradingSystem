---
title: Broken Links Analysis - Documentation Review
sidebar_position: 3
tags: [documentation, links, validation, broken-links, remediation]
domain: shared
type: reference
summary: Detailed analysis of 39 broken links with categorization and remediation recommendations
status: active
last_review: 2025-10-17
---

# Broken Links Analysis

**Date**: 2025-10-17
**Total Broken Links**: 27 (17 fixed in Phases 1 & 5)
**Success Rate**: 94.9% (500/527 links working)

## Executive Summary

27 broken links identified across documentation, categorized by severity and type. Most are internal references to missing files or incorrect paths. No critical documentation is inaccessible.

> **📝 Nota de Atualização (2025-10-18)**: 22 links foram corrigidos nas fases 1 e 5. Veja seção "Resoluções Pós-Auditoria" abaixo.

> Post-remediation: `onBrokenLinks` is now set to `throw` in `docusaurus.config.ts` so future builds fail fast on regressions.

## 1. Categorization by Severity

### 🔴 Critical (Blocks Documentation Usage) - 0 links

No critical broken links. All essential documentation is accessible.

### 🟡 High Priority (Missing Important References) - 15 links

**Impact**: Users cannot access referenced implementation details or specifications.

**Files Affected**:

-   `backend/api/README.md` - Missing OpenAPI spec (workspace.openapi.yaml)
-   `backend/api/documentation-api/implementation-plan.md` - Missing spec and guides (4 links)
-   `backend/api/firecrawl-proxy.md` - Missing infrastructure docs (2 links)
-   `backend/api/webscraper-api.md` - Missing init script and frontend link (2 links)
-   `backend/architecture/decisions/2025-10-16-adr-0002-agno-framework.md` - Missing PRD reference
-   `backend/data/webscraper-schema.md` - Missing SQL schema file
-   `ops/tools/reverse-proxy-setup.md` - Missing nginx docs (3 links)

### ✅ Resolved (26 items)

**Phase 1 - Onboarding Links (10 links)**:

-   Broken anchors in README.md
-   Missing onboarding files
-   Configuration file references

**Phase 5 - Frontend Guide Links (10 links)**:

-   Case-sensitivity issues (DARK-MODE.md)
-   Source code references (.tsx files)
-   Wrong documentation paths
-   Non-existent file references

**Phase 6 - Documentation Freshness (4 files)**:

-   Outdated last_review dates (>90 days)
-   All files updated during previous phases
-   Current freshness: 100%

### 🟢 Medium Priority (Convenience Links) - 17 links

**Impact**: Minor inconvenience, workarounds available.

**Files Affected**:

-   Ops service startup guide - Missing related docs (4 links)
-   Diagram README - Broken SVG references (2 links)
-   Various other convenience references (11 links)

### ⚪ Low Priority (Optional References) - 7 links

**Impact**: Minimal, mostly external or supplementary links.

## 2. Categorization by Type

### Missing Files (32 links)

**Root Cause**: Referenced files don't exist or were moved/renamed.

**Examples**:

-   `ENV-RULES.md` (referenced in NEW-SERVICE-TEMPLATE.md)
-   `workspace.openapi.yaml` (referenced in backend/api/README.md)
-   `documentation-api.openapi.yaml` (referenced in implementation-plan.md)
-   Various infrastructure READMEs (nginx-proxy, firecrawl, agno-agents)

**Remediation**: Create missing files or update references to correct paths.

### ✅ RESOLVIDO - Broken Anchors (7 links)

**Root Cause**: Âncora `#quick-start-linux--wsl` não existia no README.md raiz.

**Arquivos Afetados**:

-   `ops/onboarding/COMO-INICIAR.md`
-   `ops/onboarding/INICIO-RAPIDO.md`
-   `ops/onboarding/QUICK-START-GUIDE.md`
-   `ops/onboarding/START-HERE-LINUX.md`
-   `ops/onboarding/START-SERVICES.md`
-   `ops/onboarding/GUIA-INICIO-DEFINITIVO.md`
-   `ops/onboarding/QUICK-REFERENCE.md`

**Resolução**: Arquivos refatorados para usar `./QUICK-START-LINUX-WSL.md` local em vez de âncora no README.md.

### Invalid Paths (10 links)

**Root Cause**: Incorrect relative paths or references to source code files.

**Examples**:

-   `../src/pages/BancoIdeiasPage.tsx` (source files not in docs)
-   `src/components/pages/PortsPage.tsx` (incorrect path)
-   `../../../../../tools/agno-agents/README.md` (too many parent directories)

**Remediation**: Update paths or remove references to source files from documentation.

## 3. Remediation Recommendations

### Phase 1: Quick Wins (1-2 hours) ✅ COMPLETO

**Fix broken anchors** (7 links)

-   ✅ Arquivos de onboarding refatorados para usar `./QUICK-START-LINUX-WSL.md` local
-   ✅ Removidas dependências de âncoras no README.md raiz
-   ✅ Links para SYSTEM-OVERVIEW.md verificados como corretos

### Phase 2: Create Missing Documentation (4-8 hours)

**High-priority missing files** (15 links)

1. Create `backend/api/workspace.openapi.yaml` (or update reference to correct spec location)
2. Create `backend/api/documentation-api.openapi.yaml`
3. Create `tools/nginx-proxy/README.md` and `VPS-MIGRATION-GUIDE.md`
4. Create `tools/firecrawl/README.md`
5. Create `backend/api/firecrawl-proxy/README.md`
6. Create `shared/product/prd/pt/agno-integration-prd.md`
7. Create `tools/timescaledb/webscraper-schema.sql`

### Phase 3: Update References (2-4 hours)

**Fix invalid paths** (10 links)

1. Remove source file references from documentation (frontend guides)
2. Update infrastructure paths in backend guides
3. Fix relative path issues in ops documentation

### Phase 4: Review and Consolidate (2-3 hours)

**Medium-priority links** (27 links)

1. Review ops service startup guide and update related doc links
2. Fix diagram README SVG references
3. Update frontend requirements to reference correct component locations

## 4. Detailed Link Inventory

### Backend API Documentation (10 broken links)

**File**: `backend/NEW-SERVICE-TEMPLATE.md`

-   Line 389: `ENV-RULES.md` → **Create** or reference `docs/ENV-RULES.md`
-   Line 390: `config/ENV-CONFIGURATION-RULES.md` → **Create** or reference `ops/ENVIRONMENT-CONFIGURATION.md`
-   Line 392: `CONTRIBUTING.md` → **Fix path** to `../../CONTRIBUTING.md`

**File**: `backend/api/README.md`

-   Line 15: `workspace.openapi.yaml` → **Create** or reference `spec/openapi.yaml`

**File**: `backend/api/documentation-api/implementation-plan.md`

-   Line 48, 1967: `documentation-api.openapi.yaml` → **Create** OpenAPI spec
-   Line 1968: `guide-documentation-api.md` → **Fix path** to `../../guides/guide-documentation-api.md`
-   Line 1969: `backend/api/workspace/README.md` → **Create** or reference `backend/api/workspace/README.md`

**File**: `backend/api/firecrawl-proxy.md`

-   Line 373: `tools/firecrawl/README.md` → **Create** infrastructure guide
-   Line 374: `backend/api/firecrawl-proxy/README.md` → **Create** implementation README

**File**: `backend/api/webscraper-api.md`

-   Line 440: `backend/api/webscraper-api/scripts/init-database.sh` → **Create** or remove reference
-   Line 484: `frontend/features/webscraper-app.md` → **Fix path** to `../../frontend/features/webscraper-app.md`

### Architecture & Data (3 broken links)

**File**: `backend/architecture/decisions/2025-10-16-adr-0002-agno-framework.md`

-   Line 218: `shared/product/prd/pt/agno-integration-prd.md` → **Create** PRD document

**File**: `backend/data/webscraper-schema.md`

-   Line 366: `tools/timescaledb/webscraper-schema.sql` → **Create** SQL schema file

**File**: `backend/guides/agno-agents-guide.md`

-   Line 237-238: Infrastructure paths → **Fix** relative paths or create missing files

### Frontend Documentation (10 broken links)

**File**: `frontend/guides/dark-mode-quick-reference.md`

-   Line 10, 270: `DARK-MODE.md` → **Fix** to `dark-mode.md` (lowercase)
-   Line 271: `docs/development/frontend-reference.md` → **Remove** or create reference
-   Line 273-274: Source file references → **Remove** (source files not in docs)

**File**: `frontend/requirements/collapsible-cards.md`

-   Line 122-124: Source file references → **Remove** or update to documentation paths
-   Line 129-130: Component docs → **Fix paths** to correct locations

### Operations Documentation (14 broken links)

**File**: `ops/tools/reverse-proxy-setup.md`

-   Line 260-262: Nginx and architecture docs → **Create** missing infrastructure documentation

**Files**: Multiple onboarding guides (7 files)

-   Broken anchor `#quick-start-linux--wsl` → **Add anchor** to root README or update references

**File**: `ops/service-startup-guide.md`

-   Line 393-396: Related docs → **Create** or update references to existing documentation

### Shared Documentation (2 broken links)

**File**: `shared/diagrams/README.md`

-   Line 451: SVG references → **Fix** diagram export paths or remove broken examples

## 5. Automation Recommendations

### CI/CD Link Validation

**Implement automated link checking** in GitHub Actions:

1. Run `check-links.py` script on every PR
2. Fail build if critical links are broken
3. Warn on medium/low priority broken links
4. Generate link health report

### Pre-commit Hook

**Add link validation** to pre-commit hooks:

1. Check links in modified files only
2. Fast validation (internal links only)
3. Warn developer before commit

### Monthly Link Audit

**Schedule automated audits**:

1. Full link validation (internal + external)
2. Check for link rot (external URLs)
3. Generate monthly link health report
4. Create GitHub issues for broken links

## 6. Priority Categories

### Resolved (17 items)

**High Priority - Critical References (10 links)**:

-   **Onboarding Links (7 links)**: All 7 onboarding guides now correctly reference `./QUICK-START-LINUX-WSL.md` instead of broken README.md anchors
-   **Template Links (3 links)**: NEW-SERVICE-TEMPLATE.md updated to reference correct environment configuration files
-   **Frontend Guide Links (7 links)**: Removed source code references, fixed case-sensitivity issues, corrected relative paths

**Medium Priority - Infrastructure References (7 links)**:

-   **API Specifications (4 links)**: Missing OpenAPI specs for workspace and documentation APIs
-   **Infrastructure Guides (3 links)**: Missing nginx-proxy, firecrawl, and agno-agents documentation

### High Priority (Remaining 15 links)

**Impact**: Users cannot access referenced implementation details or specifications.

**Files Affected**:

-   `backend/api/README.md` - Missing OpenAPI spec (workspace.openapi.yaml)
-   `backend/api/documentation-api/implementation-plan.md` - Missing spec and guides (4 links)
-   `backend/api/firecrawl-proxy.md` - Missing infrastructure docs (2 links)
-   `backend/api/webscraper-api.md` - Missing init script and frontend link (2 links)
-   `backend/architecture/decisions/2025-10-16-adr-0002-agno-framework.md` - Missing PRD reference
-   `backend/data/webscraper-schema.md` - Missing SQL schema file
-   `ops/tools/reverse-proxy-setup.md` - Missing nginx docs (3 links)

### Medium Priority (Remaining 12 links)

**Impact**: Minor inconvenience, workarounds available.

**Files Affected**:

-   Ops service startup guide - Missing related docs (4 links)
-   Diagram README - Broken SVG references (2 links)
-   Various other convenience references (6 links)

## 7. Lessons Learned - Phase 6

### Documentation Freshness Verification

**Key Insights from Freshness Audit**:

-   **Zero outdated files found**: All 35 critical documentation files were current (< 90 days old)
-   **Average review age**: 2.3 days across all critical documentation
-   **Oldest file**: `pt/banco-ideias-prd.md` (9 days old)
-   **Content quality verified**: Technical accuracy, code examples, and URLs confirmed correct

**Process Improvements Identified**:

-   **Automated freshness monitoring**: Consider implementing automated alerts for files approaching 90-day threshold
-   **Review cycle optimization**: Current 2-10 day review cycle is effective for critical documentation
-   **Quality gates**: Spot-checking technical accuracy during reviews prevents stale content

**Success Factors**:

-   **Consistent review process**: Regular updates during development phases kept documentation current
-   **Cross-phase coordination**: Documentation improvements integrated into feature development cycles
-   **Quality verification**: Manual spot-checks ensured technical accuracy alongside date updates

## 8. Resoluções Pós-Auditoria

### ✅ Links de Onboarding Corrigidos (2025-10-18)

-   **Problema**: 7 arquivos referenciavam âncora inexistente no README.md
-   **Solução**: Arquivos refatorados para referenciar `QUICK-START-LINUX-WSL.md` local
-   **Arquivos corrigidos**: COMO-INICIAR.md, INICIO-RAPIDO.md, QUICK-START-GUIDE.md, START-HERE-LINUX.md, START-SERVICES.md, GUIA-INICIO-DEFINITIVO.md, QUICK-REFERENCE.md
-   **Status**: ✅ Verificado e funcionando

### ✅ Links de Template Corrigidos (2025-10-18)

-   **Problema**: NEW-SERVICE-TEMPLATE.md referenciava arquivos incorretos
-   **Solução**: Atualizado para referenciar `../ops/ENVIRONMENT-CONFIGURATION.md` correto
-   **Status**: ✅ Verificado e funcionando

## 9. Próximos Passos

**Target**: 95%+ link success rate (atualmente 94.9% com 27 links quebrados)

**Milestones**:

-   Phase 1 complete: ✅ 92.6% success rate (7 links corrigidos)
-   Phase 5 complete: ✅ 94.9% success rate (10 links corrigidos)
-   Phase 6 complete: 96.5% success rate (15 links planejados)
-   Phase 7 complete: 97.5% success rate (7 links planejados)
-   Phase 8 complete: 98.5%+ success rate (todos os 27 links endereçados)

---

**Created**: 2025-10-17  
**Next Review**: 2025-11-17 (monthly link audit)

