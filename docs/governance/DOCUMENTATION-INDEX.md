---
title: Documentation Index
sidebar_position: 1
tags: [governance, documentation, index]
domain: governance
type: index
summary: Complete index of all documentation locations in the TradingSystem project
status: active
last_review: "2025-10-29"
---

# Documentation Index

**Last Updated**: 2025-10-29
**Purpose**: Central index of all documentation files and their locations

## Root Documentation (Project Root)

Essential files that should always remain in the project root:

| File | Size | Description | Location |
|------|------|-------------|----------|
| **README.md** | 19K | Main project documentation and overview | `/README.md` |
| **CLAUDE.md** | 27K | AI assistant instructions (canonical source) | `/CLAUDE.md` |
| **CHANGELOG.md** | 7.8K | Version history and release notes | `/CHANGELOG.md` |
| **QUICK-START.md** | 3.4K | Quick start guide for developers | `/QUICK-START.md` |

## AI Agent Instructions (/)

Instructions and guidelines for AI assistants working with this codebase:

| File | Size | Description | Location |
|------|------|-------------|----------|
| **AGENTS.md** | 3.1K | Repository guidelines for AI agents | `/AGENTS.md` |
| **GEMINI.md** | 4.4K | Gemini-specific instructions | `/ai/GEMINI.md` |

**Note**: CLAUDE.md in the root is the canonical source - it's kept in root for easy access.

## Governance Documentation (/docs/governance/)

### Audits (/docs/governance/audits/)

Quality audits, compliance checks, and validation reports:

| File | Date | Size | Description |
|------|------|------|-------------|
| **APPS-DOCS-AUDIT-2025-10-27.md** | 2025-10-27 | 17K | Apps documentation audit report |
| **AUDIT-SUMMARY-2025-10-27.md** | 2025-10-27 | 9.9K | Summary of documentation audits |
| **CORRECTIONS-APPLIED-2025-10-27.md** | 2025-10-27 | 2.1K | Log of corrections applied |
| **ENV-AUDIT-REPORT.md** | 2025-10-29 | - | Environment variables audit |

### Organization Reports (/docs/governance/organization/)

Reports on project organization, restructuring, and refactoring:

| File | Date | Size | Description |
|------|------|------|-------------|
| **APPS-DOCS-ORGANIZATION-2025-10-27.md** | 2025-10-27 | 14K | Apps documentation organization |
| **DOCS-ORGANIZATION-2025-10-27.md** | 2025-10-27 | 11K | Documentation organization report |
| **SCRIPTS-REORGANIZATION-2025-10-27.md** | 2025-10-27 | 14K | Scripts reorganization report |

### Reviews (/docs/governance/reviews/)

Major review reports and assessments:

| File | Date | Size | Description |
|------|------|------|-------------|
| **DOCUSAURUS-REVIEW-FINAL-REPORT.md** | 2025-10-27 | 17K | Comprehensive Docusaurus v3 review |

**Note**: This is the consolidated final report. Earlier progress reports were removed as redundant.

### Planning (/docs/governance/planning/)

Planning documents, proposals, and roadmaps:

| File | Date | Size | Description |
|------|------|------|-------------|
| **PLANO-REVISAO-API-DOCS.md** | 2025-10-27 | 9.4K | API documentation revision plan |

### Standards & Guidelines (/docs/governance/)

| File | Description |
|------|-------------|
| **VALIDATION-GUIDE.md** | Documentation validation guide |
| **REVIEW-CHECKLIST.md** | Review checklist for documentation |
| **STANDARDS.md** | Documentation standards and conventions |

## Development Documentation (/docs/content/development/)

| File | Date | Description |
|------|------|-------------|
| **SHARED-MODULES-MIGRATION.md** | 2025-10-29 | Complete report of shared modules migration |

## Content Documentation (/docs/content/)

Organized by domain:

- **apps/** - Application-specific documentation
- **api/** - API specifications and guides
- **frontend/** - UI components, design system
- **database/** - Schemas, migrations, lifecycle
- **tools/** - Development tools and infrastructure
- **sdd/** - Software design documents
- **prd/** - Product requirements
- **reference/** - Templates, ADRs, standards
- **diagrams/** - PlantUML architectural diagrams

For detailed content structure, see [docs/README.md](../README.md).

## Migration & Cleanup History

### 2025-10-29: Root .md Files Organization

**Objective**: Clean up and organize 19 .md files scattered in project root.

**Actions Taken**:
1. ✅ Created `ai/` directory for AI agent instructions (2 files)
2. ✅ Created `docs/governance/` subdirectories (audits, organization, reviews, planning)
3. ✅ Moved 10 files to appropriate governance directories
4. ✅ Deleted 5 redundant Docusaurus review files (info consolidated in final report)
5. ✅ Kept 4 essential files in root (README, CLAUDE, CHANGELOG, QUICK-START)

**Result**:
- **Before**: 19 files in root
- **After**: 4 files in root + 12 organized in proper directories
- **Cleanup**: 5 redundant files deleted
- **Improvement**: 79% reduction in root clutter

### Files Deleted (Redundant)

The following files were deleted because their content was consolidated into `DOCUSAURUS-REVIEW-FINAL-REPORT.md`:

1. `DOCUSAURUS-REVIEW-DELIVERY.md` (8.4K)
2. `DOCUSAURUS-REVIEW-EXECUTIVE-REPORT.md` (8.7K)
3. `DOCUSAURUS-REVIEW-PROGRESS.md` (2.6K)
4. `DOCUSAURUS-REVIEW-SUMMARY.md` (3.0K)
5. `REVISAO-COMPLETA-DOCUSAURUS-CONCLUIDA.md` (3.4K)

## Quick Navigation

### For Developers
- Start here: [`/README.md`](/README.md)
- Quick start: [`/QUICK-START.md`](/QUICK-START.md)
- Development docs: [`/docs/content/development/`](/docs/content/development/)

### For AI Assistants
- Main instructions: [`/CLAUDE.md`](/CLAUDE.md)
- Repository guidelines: [`/AGENTS.md`](/AGENTS.md)
- Gemini-specific: [`/ai/GEMINI.md`](/ai/GEMINI.md)

### For Project Managers
- Audits: [`/docs/governance/audits/`](/docs/governance/audits/)
- Reviews: [`/docs/governance/reviews/`](/docs/governance/reviews/)
- Planning: [`/docs/governance/planning/`](/docs/governance/planning/)

### For Documentation Contributors
- Standards: [`/docs/governance/VALIDATION-GUIDE.md`](/docs/governance/VALIDATION-GUIDE.md)
- Review checklist: [`/docs/governance/REVIEW-CHECKLIST.md`](/docs/governance/REVIEW-CHECKLIST.md)
- Content structure: [`/docs/README.md`](/docs/README.md)

## Maintenance

This index should be updated whenever:
- New documentation files are created
- Documentation is moved or reorganized
- Major audits or reviews are completed
- Documentation standards change

**Last maintenance**: 2025-10-29 (Initial creation after root cleanup)
**Next review**: When new governance documents are added

---

**Document Version**: 1.0.0
**Maintained By**: Project Documentation Team
