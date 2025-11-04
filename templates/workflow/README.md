# Workflow Audit Templates

**Version:** 1.0
**Last Updated:** 2025-11-02
**Status:** ✅ Production Ready

---

## Overview

Este diretório contém **6 templates profissionais** para documentar outputs do Workflow de Auditoria Completa do TradingSystem.

**Benefícios:**
- ✅ Padronização de outputs
- ✅ Qualidade consistente
- ✅ Facilita consolidação automática
- ✅ Reduz tempo de documentação em 40-50%

---

## Templates Disponíveis

### 1. Architecture Review (`01-architecture-review.md`)

**Quando usar:** Fase 2 - Análise Arquitetural
**Duração:** 8-9 horas
**Seções:** 14 principais

**Key Features:**
- Clean Architecture assessment
- DDD (Bounded Contexts, Aggregates)
- Dependency analysis with coupling metrics
- Design patterns & anti-patterns
- Scalability & performance considerations
- Security architecture review
- ADR tracking
- Implementation roadmap

**Output Size:** ~15-20 pages
**Score System:** 0-100 with weighted categories

---

### 2. Code Review (`02-code-review.md`)

**Quando usar:** Fase 3 - Revisão de Código
**Duração:** 14-15 horas
**Seções:** 15 principais

**Key Features:**
- Code quality metrics (complexity, duplication)
- Module-level & file-level analysis
- Naming conventions audit
- Error handling assessment
- Testing analysis
- Security vulnerabilities in code
- Performance issues
- Code smells detection
- Refactoring roadmap

**Output Size:** ~20-25 pages
**Score System:** 0-100 with weighted categories

---

### 3. Security Audit (`03-security-audit.md`)

**Quando usar:** Fase 3 - Revisão de Código (subseção)
**Duração:** Incluído nas 14-15h da Fase 3
**Seções:** 15 principais

**Key Features:**
- OWASP Top 10 coverage
- Vulnerability summary (P0-P3)
- Authentication & authorization review
- Data protection (encryption at rest/transit)
- Input validation analysis
- Dependency vulnerabilities (npm audit)
- Security headers check
- Logging & monitoring for security
- Secret management audit
- API security
- Frontend security (XSS, CSRF)
- Infrastructure security
- Compliance (GDPR, PCI-DSS)
- Remediation roadmap

**Output Size:** ~18-22 pages
**CVSS Scoring:** Industry-standard vulnerability rating

---

### 4. Test Coverage (`04-test-coverage.md`)

**Quando usar:** Fase 5 - Testes e Qualidade
**Duração:** 20-22 horas
**Seções:** 12 principais

**Key Features:**
- Coverage dashboard (statements, branches, functions, lines)
- Critical paths analysis
- Module-level & file-level coverage
- Test quality assessment
- Test gaps by category (error handling, edge cases, integration)
- Test generation plan with code examples
- Test performance analysis
- Mutation testing analysis
- Test automation & CI/CD integration
- Implementation roadmap
- Metrics & success criteria

**Output Size:** ~15-18 pages
**Coverage Target:** 70% overall, 80% critical paths

---

### 5. Phase Consolidation (`05-phase-consolidation.md`)

**Quando usar:** Ao final de CADA fase (1-8)
**Duração:** 30-60 minutos por fase
**Seções:** 15 principais

**Key Features:**
- Phase objectives vs achievements
- Actual vs planned metrics
- Outputs generated (document list)
- Key findings summary (P0-P3)
- Commands executed (success/failures)
- Agents used
- Issues encountered
- Mandatory questions answered
- Approval criteria checklist (Go/No-Go)
- Lessons learned
- Recommendations for next phase
- Time breakdown
- Quality assessment
- Risk assessment
- Handoff to next phase

**Output Size:** ~5-8 pages per phase
**Purpose:** Enable decision-making between phases

---

### 6. Final Report (`06-final-report.md`)

**Quando usar:** Fase 8 - Consolidação (final)
**Duração:** 16-17 horas
**Seções:** 15 principais

**Key Features:**
- Executive summary (2-3 pages max)
- Overall health score breakdown
- Key findings by domain (6 domains)
- Critical issues deep dive (top 10)
- Metrics baseline vs target
- Technical debt summary
- Recommendations matrix (quick wins + strategic)
- Implementation roadmap (4 phases, 16 weeks)
- Resource planning & budget estimate
- Risk analysis
- Success metrics & KPIs (sprint, phase, program level)
- Governance & review structure
- Communication plan
- Appendices (full data references)

**Output Size:** 25-30 pages (NOT 40-60!)
**Purpose:** Executive decision-making, stakeholder buy-in

---

## Template Usage Guide

### How to Use Templates

1. **Copy template** to outputs directory:
   ```bash
   cp templates/workflow/01-architecture-review.md \
      outputs/workflow-auditoria-2025-11-02/fase-02-arquitetura/
   ```

2. **Fill in placeholders**:
   - `[Project Name]` → TradingSystem
   - `[Name]` → Your name
   - `YYYY-MM-DD` → Current date
   - `X/100` → Actual scores
   - `[Description]` → Actual findings

3. **Complete all sections** marked with:
   - `[ ]` - Checkboxes
   - `X` - Metrics to fill
   - `[Placeholder]` - Text to replace

4. **Validate structure** (all sections present)

5. **Review quality** (use checklist in each template)

---

## Template Customization

### Adapting for Your Project

**What to keep:**
- ✅ Section structure (enables automation)
- ✅ Scoring systems (enables comparison)
- ✅ Tables (enables data extraction)
- ✅ Status markers (✅/⚠️/❌)

**What to customize:**
- ✏️ Project-specific metrics
- ✏️ Domain-specific sections
- ✏️ Compliance requirements
- ✏️ Team-specific workflows

**Example - Adding Custom Section:**
```markdown
## X. Trading-Specific Analysis

### ProfitDLL Integration Health

| Component | Status | Latency | Issues |
|-----------|--------|---------|--------|
| Market Data Callback | ✅ | 12ms | None |
| Order Execution | ⚠️ | 450ms | Timeouts under load |
```

---

## Scoring Methodology

### Universal Scoring System (0-100)

**Interpretation:**
- **85-100:** Excellent - Best practices, minimal issues
- **70-84:** Good - Solid foundation, some improvements needed
- **50-69:** Needs Work - Significant issues, action plan required
- **0-49:** Critical - Immediate attention, may block production

**Score Calculation:**
```
Score = Σ(Category_Score × Category_Weight)

Example:
Architecture = (Domain: 80 × 0.25) + (Application: 75 × 0.25) + 
               (Infrastructure: 70 × 0.25) + (Presentation: 85 × 0.25)
             = 20 + 18.75 + 17.5 + 21.25 = 77.5/100
```

### Weighted Categories

Different templates use different weights based on importance:

**Architecture Review:**
- Domain Layer: 25%
- Application Layer: 25%
- Infrastructure Layer: 25%
- Presentation Layer: 25%

**Code Review:**
- Code Structure: 20%
- Code Complexity: 15%
- Testing: 20%
- Error Handling: 15%
- Code Duplication: 10%
- Naming: 10%
- Documentation: 10%

**Security Audit:**
- OWASP Top 10: 100% (each risk weighted equally)

---

## Automation Integration

### Machine-Readable Sections

Templates include structured data for automation:

**JSON-friendly tables:**
```markdown
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Coverage | 58% | 70% | ❌ |
```

**Can be parsed to:**
```json
{
  "metrics": [
    { "name": "Coverage", "value": 58, "target": 70, "status": "fail" }
  ]
}
```

### Consolidation Script Compatibility

Templates work with `scripts/workflow/consolidate-phase.sh`:
- Extracts metrics from tables
- Aggregates findings by priority
- Generates phase summary
- Feeds into final report

---

## Quality Checklist

### Before Submitting Output

**Completeness:**
- [ ] All sections filled (no `[Placeholder]` remaining)
- [ ] All tables populated
- [ ] All checkboxes addressed
- [ ] All scores calculated

**Accuracy:**
- [ ] Metrics verified against source data
- [ ] Findings include code examples
- [ ] Recommendations are actionable
- [ ] Effort estimates are realistic

**Clarity:**
- [ ] Executive summary tells the story
- [ ] Technical details in appendices
- [ ] Jargon explained or avoided
- [ ] Visualizations included where helpful

**Actionability:**
- [ ] Each issue has remediation
- [ ] Each recommendation has effort estimate
- [ ] Priorities clearly assigned (P0-P3)
- [ ] Owners identified (or TBD with process)

---

## Example Workflow

### Typical Usage Flow

```bash
# Phase 2: Architecture Analysis
cd outputs/workflow-auditoria-2025-11-02/fase-02-arquitetura/

# 1. Copy template
cp ../../../templates/workflow/01-architecture-review.md \
   01-architecture-review-full.md

# 2. Run analysis commands
/architecture-review --full

# 3. Fill template with findings
vim 01-architecture-review-full.md

# 4. Validate completeness
grep -c '\[Placeholder\]' 01-architecture-review-full.md  # Should be 0

# 5. Copy consolidation template
cp ../../../templates/workflow/05-phase-consolidation.md \
   CONSOLIDACAO-FASE-02.md

# 6. Fill consolidation with phase summary
vim CONSOLIDACAO-FASE-02.md

# 7. Decision: Go/No-Go for next phase
```

---

## Template Maintenance

### Versioning

Templates follow semantic versioning:
- **Major:** Breaking changes to structure
- **Minor:** New sections added
- **Patch:** Typo fixes, clarifications

**Current Version:** 1.0.0

### Update Process

1. Propose changes in `templates/workflow/CHANGELOG.md`
2. Review with team
3. Update template(s)
4. Update this README
5. Bump version
6. Tag release: `git tag templates-v1.1.0`

---

## FAQs

### Q: Can I skip sections?

**A:** Yes, mark as `N/A` with reason:
```markdown
## 5. Performance Analysis

**Status:** N/A - Performance audit moved to Phase 6
```

### Q: What if my project doesn't use DDD?

**A:** Adapt templates:
```markdown
## 3. Domain-Driven Design (DDD)

**Status:** Not applicable - Project uses data-driven architecture
**Alternative:** See Appendix C for data model analysis
```

### Q: How do I handle proprietary/sensitive data?

**A:** Use placeholders:
```markdown
**Customer:** [REDACTED]
**Revenue Impact:** $[REDACTED]
```

Or create internal vs external versions.

### Q: Can I use these for other projects?

**A:** Yes! Templates are project-agnostic. Just customize:
- Scoring weights
- Compliance requirements
- Technology stack specifics

---

## Template Statistics

| Template | Sections | Tables | Checkboxes | Typical Size | Fill Time |
|----------|----------|--------|------------|--------------|-----------|
| Architecture Review | 14 | 15 | 25 | 15-20 pages | 2-3h |
| Code Review | 15 | 18 | 30 | 20-25 pages | 3-4h |
| Security Audit | 15 | 12 | 40 | 18-22 pages | 2-3h |
| Test Coverage | 12 | 14 | 35 | 15-18 pages | 2-3h |
| Phase Consolidation | 15 | 10 | 25 | 5-8 pages | 0.5-1h |
| Final Report | 15 | 20 | 50 | 25-30 pages | 6-8h |

**Total:** 86 sections, 89 tables, 205 checkboxes

---

## Support & Feedback

**Questions?** 
- Check existing outputs in `outputs/workflow-auditoria-*/`
- Review CLAUDE.md for project context

**Improvements?**
- Create issue with `[template]` tag
- Propose changes via PR

**Need help?**
- Ask in #engineering-quality Slack channel

---

## Related Resources

- **Workflow Main:** `outputs/WORKFLOW-AUDITORIA-COMPLETA-V2.md`
- **Validation:** `scripts/validation/validate-workflow-commands.sh`
- **Consolidation:** `scripts/workflow/consolidate-phase.sh` (to be created)
- **Pre-flight Check:** `scripts/workflow/pre-flight-check.sh` (to be created)

---

**Last Updated:** 2025-11-02
**Maintained By:** Engineering Quality Team
**License:** Internal Use Only
**Version:** 1.0.0

