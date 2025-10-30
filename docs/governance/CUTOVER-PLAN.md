# Documentation Cut-over Plan - Phase 6

**Cut-over Date**: 2025-11-15 (target)  
**Owner**: DocsOps + DevOps  
**Duration**: 4 hours (planned maintenance window)

## Pre-Cut-over Checklist

**Documentation Readiness** (Complete by Nov 14):
- [ ] All 135 docs files reviewed and approved
- [ ] Full validation suite passes (`npm run docs:check`, `npm run docs:links`)
- [ ] All critical issues resolved (P0, P1)
- [ ] Stakeholder sign-offs complete
- [ ] Internal communications sent
- [ ] PlantUML diagrams copied to `docs/content/assets/diagrams/source/`
- [ ] Diagram index updated with new paths
- [ ] Pre-cutover validation report completed and approved (see `docs/migration/PRE-CUTOVER-VALIDATION-REPORT.md`)

**Infrastructure Readiness**:
- [ ] `npm run docs:build` succeeds for docs
- [ ] docs serves on port 3400 (`npm run docs:dev`)
- [ ] Nginx reverse proxy configured (`tradingsystem.local/docs → localhost:3400`)
- [ ] Health endpoints responding (`http://localhost:3400/health`)
- [ ] Monitoring dashboards updated (Grafana, Prometheus)

**Code Readiness**:
- [ ] All technical references updated (150+ files - see `REFERENCE-UPDATE-TRACKING.md`)
- [ ] Configuration files updated (`package.json`, `config/services-manifest.json`, `.env.example`)
- [ ] Automation scripts updated (35+ scripts validated)
- [ ] Documentation links updated (60+ markdown files)
- [ ] Source code references updated (CORS, URLs, configs)
- [ ] Docker configurations updated (compose files, volumes)
- [ ] Reference validation commands executed successfully
- [ ] Frontend components updated (`apiConfig.docsUrl → port 3400`)
- [ ] Backend README references docs
- [ ] CI/CD workflows updated (validate docs)
- [ ] CORS configurations updated (allow ports 3400/3401)
- [ ] Environment variables updated (`.env`, `.env.example`)
- [ ] Cutover execution checklist reviewed (see `docs/migration/CUTOVER-EXECUTION-CHECKLIST.md`)
- [ ] Rollback procedure validated (see `docs/migration/ROLLBACK-PROCEDURE.md`)
- [ ] Post-cutover validation plan ready (see `docs/migration/POST-CUTOVER-VALIDATION.md`)

**Communication Readiness**:
- [ ] Launch announcement drafted
- [ ] Demo recording available
- [ ] FAQ updated with migration questions
- [ ] Support channels ready (`#docs-feedback`)

### Automated Cutover Option

**For teams preferring semi-automated execution:**

```bash
# Dry-run first (simulate without changes)
bash docs/migration/CUTOVER-AUTOMATION-SCRIPT.sh --dry-run

# Review dry-run output, then execute
bash docs/migration/CUTOVER-AUTOMATION-SCRIPT.sh --auto-commit
```

**Benefits**:
- Consistent execution (no manual errors)
- Automatic rollback on failure
- Complete logging
- Validation at each step

**Limitations**:
- Less control over individual steps
- Requires review of script before execution
- May need manual intervention for edge cases

**Recommendation**: Use manual procedure for first cutover; use automation for future migrations.

## Cut-over Procedure

### Phase 0: Reference Updates (T-7 days)

**Time**: 1 week before cutover (Nov 8-14)

**Objective**: Update all technical references from legacy system to docs.

**Actions**:

1. **Review Complete Inventory**
   ```bash
   cat docs/migration/COMPLETE-REFERENCE-INVENTORY.md
   cat docs/migration/REFERENCE-UPDATE-TRACKING.md
   ```

2. **Update Configuration Files (P0 - Day 1)**
   - Update `package.json` validate-docs script
   - Update `config/services-manifest.json` docusaurus service
   - Update `.env.example` documentation references
   - Validate: `npm run lint && npm run type-check`

3. **Update Automation Scripts (P1 - Days 2-3)**
   - Update 35+ scripts in `scripts/docs/`, `scripts/setup/`, `scripts/core/`, `scripts/docker/`
   - Test each script after update
   - Validate: Execute critical scripts in staging

4. **Update Source Code (P1 - Day 4)**
   - Update CORS configurations (5 backend files)
   - Update frontend URLs (3 files)
   - Update environment files (5 files)
   - Validate: `npm run build && npm run test`

5. **Update Documentation (P2 - Day 5)**
   - Update 60+ markdown files with links and commands
   - Add deprecation notices to legacy docs
   - Validate: `npm run docs:links`

6. **Update Docker & Infrastructure (P1 - Day 6)**
   - Update docker-compose files
   - Update openspec jobs
   - Validate: `docker compose config`

7. **Final Validation (Day 7)**
   ```bash
   # Validate no legacy references remain (except in archived docs)
   grep -r "docs/docusaurus" --exclude-dir=node_modules --exclude-dir=docs/context
   grep -r "\b3004\b" --exclude-dir=node_modules --exclude-dir=docs/context

   # Validate docs references are correct
   grep -r "docs" --exclude-dir=node_modules | grep -v "#"
   grep -r "\b3400\b" --exclude-dir=node_modules | grep -v "#"
   grep -r "\b3401\b" --exclude-dir=node_modules | grep -v "#"
   ```

**Success Criteria**:
- [ ] All P0 and P1 references updated
- [ ] All validation commands pass
- [ ] Staging environment tested successfully
- [ ] No blocking issues identified
- [ ] `REFERENCE-UPDATE-TRACKING.md` shows 100% completion for P0/P1

### Phase 1: Preparation (T-1 hour)

**Time**: 8:00 AM - 9:00 AM

**Actions**:
1. **Announce Maintenance Window**

   ```
   🚨 Documentation Maintenance Window

   Time: 9:00 AM - 1:00 PM (4 hours)
   Impact: Documentation temporarily unavailable
   Action: docs cut-over (legacy → new system)

   Updates will be posted in #docs-migration
   ```

2. **Final Validation**

   ```bash
   cd docs
   npm run docs:check  # Full validation pipeline
   npm run docs:links  # Link validation
   python ../scripts/docs/validate-frontmatter.py --docs-dir ./content
   ```

3. **Backup Legacy Docs**

   ```bash
   # Use automated backup script
   bash scripts/docs/backup-docusaurus.sh --compress --destination ~/backups/docs-legacy-backup-$(date +%Y%m%d-%H%M%S)

   # Verify backup created
   ls -lh ~/backups/docs-legacy-backup-*.tar.gz
   ```

4. **Tag Release**

   ```bash
   git tag -a docs-v2-launch-v1.0.0 -m "docs launch - Phase 6 complete"
   git push origin docs-v2-launch-v1.0.0
   ```

### Phase 2: Service Updates (T+0 to T+1 hour)

**Time**: 9:00 AM - 10:00 AM

**Actions**:

1. **Stop Legacy Docusaurus** (port 3004)

   ```bash
   pkill -f "docusaurus.*3004"
   lsof -ti:3004 | xargs kill -9
   ```

2. **Start docs** (port 3400)

   ```bash
   cd docs
   npm run docs:build
   npm run docs:serve -- --port 3400 --host 0.0.0.0
   ```

3. **Verify docs Health**

   ```bash
   curl http://localhost:3400
   curl http://localhost:3400/apps/workspace/overview
   curl http://localhost:3400/api/order-manager
   ```

4. **Update Nginx Configuration**

   ```nginx
   location /docs {
       proxy_pass http://localhost:3400;  # Changed from 3004
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Test Unified Domain**

   ```bash
   curl http://tradingsystem.local/docs
   curl http://tradingsystem.local/docs/apps/workspace/overview
   ```

### Phase 3: Application Updates (T+1 to T+2 hours)

**Time**: 10:00 AM - 11:00 AM

**Actions**:

1. **Deploy Frontend Changes**

   ```bash
   cd frontend/dashboard
   npm run build
   npm run dev
   ```

2. **Restart Backend Services** (update CORS)

   ```bash
   # Update .env
   # CORS_ORIGIN=http://localhost:3103,http://localhost:3400
   bash scripts/startup/start-all.sh
   ```

3. **Verify Integration**

   ```bash
   curl http://localhost:3103
   ```

### Phase 4: CI/CD Updates (T+2 to T+3 hours)

**Time**: 11:00 AM - 12:00 PM

**Actions**:

1. **Merge CI/CD Workflow Updates**

   ```bash
   git checkout main
   git pull origin main
   ```

2. **Trigger Validation Workflow**

   ```bash
   gh workflow run docs-link-validation.yml
   gh workflow run docs-audit-scheduled.yml
   ```

3. **Verify Workflow Success**
   - Check GitHub Actions tab
   - Ensure docs validation passes
   - Review any warnings or errors

### Phase 5: Legacy Archival (T+3 to T+4 hours)

**Time**: 12:00 PM - 1:00 PM

**Actions**:

1. **Add Redirect to Legacy Docs**

   ```typescript
   import { useEffect } from 'react';

   export default function LegacyRedirect() {
     useEffect(() => {
       window.location.href = 'http://localhost:3400';
     }, []);

     return (
       <div style={{ padding: '2rem', textAlign: 'center' }}>
         <h1>⚠️ Documentation Moved</h1>
         <p>This documentation system is deprecated.</p>
         <p>Redirecting to <a href="http://localhost:3400">docs</a>...</p>
         <p>If not redirected, <a href="http://localhost:3400">click here</a>.</p>
       </div>
     );
   }
   ```

2. **Update Legacy README** (already covered in separate change)

3. **Archive Legacy Content**

   ```bash
   mkdir -p docs/archive
   echo "docs/context/** linguist-documentation" >> .gitattributes
   ```

4. **Update Root README** (covered in separate change)

### Phase 6: Verification & Monitoring (T+4 hours)

**Time**: 1:00 PM - 2:00 PM

**Actions**:

1. **Smoke Tests**

   ```bash
   curl http://localhost:3400
   curl http://localhost:3400/apps/workspace/overview
   curl http://localhost:3400/api/order-manager
   curl http://localhost:3400/frontend/design-system/tokens
   curl http://localhost:3400/database/schema
   curl http://localhost:3400/tools/ports-services/overview
   curl http://localhost:3400/prd/products/trading-app/prd-overview
   curl http://localhost:3400/sdd/api/order-manager/v1/spec
   curl http://localhost:3400/diagrams/diagrams
   curl http://localhost:3400/faq
   curl http://localhost:3400/changelog
   ```

2. **Link Validation**

   ```bash
   cd docs
   npm run docs:links
   ```

3. **Search Functionality**
   - Test search with “order manager”, “workspace”, “database”
   - Verify results are relevant

4. **Navigation Testing**
   - Traverse sidebar categories
   - Ensure pages load, breadcrumbs work, mobile nav functions

5. **Monitor Metrics**

   ```bash
   curl http://localhost:3400/metrics
   ```

## Post-Cut-over Actions

**Immediate** (Day 1):
- [ ] Send “All Clear” announcement
- [ ] Monitor `#docs-feedback` for issues
- [ ] Address critical bugs within 4 hours
- [ ] Update status page (if applicable)

**Week 1** (Nov 15-22):
- [ ] Monitor page views and search queries
- [ ] Collect user feedback (survey)
- [ ] Fix reported issues (P0/P1 within 24 hours, P2/P3 within 1 week)
- [ ] Update documentation based on feedback

**Week 4** (Dec 15):
- [ ] Archive legacy `docs/` directory
- [ ] Remove legacy Docusaurus build directory from obsolete installations
- [ ] Update remaining legacy references
- [ ] Send “Transition Complete” announcement

## Rollback Plan

**If Critical Issues Arise**:

**Immediate Rollback** (within 1 hour):

1. **Stop docs**

   ```bash
   pkill -f "docusaurus.*3400"
   ```

2. **Restart Legacy Docusaurus**

   ```bash
   cd docs
   npm run start -- --port 3004 --host 0.0.0.0
   ```

3. **Revert Nginx Configuration**

   ```nginx
   location /docs {
       proxy_pass http://localhost:3004;
   }
   ```

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Revert Frontend Config**

   ```bash
   cd frontend/dashboard
   git revert <commit-sha>
   npm run build
   ```

5. **Communicate Rollback**

   ```
   ⚠️ docs Cut-over Postponed

   Critical issues detected. Rolled back to legacy docs.
   - Legacy docs: http://localhost:3004 (active)
   - docs: http://localhost:3400 (preview only)

   New cut-over date will be announced after issues resolved.
   ```

6. **Revert Technical References**

   ```bash
   git revert <commit-range>  # Revert commits that updated technical references
   ```

   ```bash
   # For detailed rollback procedure, see:
   cat docs/migration/ROLLBACK-PROCEDURE.md

   # Or execute automated rollback:
   bash docs/migration/CUTOVER-AUTOMATION-SCRIPT.sh --rollback
   ```

**Root Cause Analysis** (within 24 hours):
- Identify critical issues
- Prioritize fixes (P0 must resolve before relaunch)
- Assign owners and deadlines
- Schedule post-mortem
- Plan relaunch timeline

## Success Criteria

**Cut-over Successful When**:
- [ ] docs accessible at `http://localhost:3400` and `http://tradingsystem.local/docs`
- [ ] All pages load without errors
- [ ] Search functionality works
- [ ] Navigation and breadcrumbs functional
- [ ] 0 broken links (or all documented)
- [ ] Dashboard integration works (`DocsPage` opens docs)
- [ ] CI/CD workflows validate docs
- [ ] No critical bugs reported in first 4 hours
- [ ] Positive user feedback (>80% satisfaction)
- [ ] All technical references updated and validated (`REFERENCE-UPDATE-TRACKING.md` shows 100%)
- [ ] Post-cutover validation completed (see `docs/migration/POST-CUTOVER-VALIDATION.md`)
- [ ] 24-hour monitoring completed with no critical issues
- [ ] User acceptance survey shows >80% satisfaction

## Related Cutover Documents

**Pre-Cutover**:
- [Pre-Cutover Validation Report](../migration/PRE-CUTOVER-VALIDATION-REPORT.md)
- [Complete Reference Inventory](../migration/COMPLETE-REFERENCE-INVENTORY.md)
- [Reference Update Tracking](../migration/REFERENCE-UPDATE-TRACKING.md)

**Cutover Execution**:
- [Cutover Execution Checklist](../migration/CUTOVER-EXECUTION-CHECKLIST.md)
- [Cutover Automation Script](../migration/CUTOVER-AUTOMATION-SCRIPT.sh)
- [CORS Update Validation](../migration/CORS-UPDATE-VALIDATION.md)

**Post-Cutover**:
- [Post-Cutover Validation](../migration/POST-CUTOVER-VALIDATION.md)
- [Rollback Procedure](../migration/ROLLBACK-PROCEDURE.md)

**Governance**:
- [Review Checklist](./REVIEW-CHECKLIST.md)
- [Validation Guide](./VALIDATION-GUIDE.md)
- [Communication Plan](./COMMUNICATION-PLAN.md)
- [Maintenance Checklist](./MAINTENANCE-CHECKLIST.md)
