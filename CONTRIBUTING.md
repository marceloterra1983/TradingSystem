# Contributing to TradingSystem

TradingSystem relies on a predictable workflow so that CI failures surface locally first. This guide highlights the minimum steps expected before opening a pull request, with extra focus on the documentation build policy that recently started blocking releases.

## 1. Workflow Expectations

- **Branches**: use `feat/*`, `fix/*`, or `chore/*` prefixes and keep them rebased on the target branch (`main` or `develop`).
- **Commits**: follow Conventional Commits (`feat:`, `fix:`, etc.) and keep history clean (squash before merge when asked).
- **Validation**: always run the relevant workspace checks before pushing.

| Scope | Mandatory Commands |
| --- | --- |
| Any change | `npm run lint:all`, `npm run test` (or service-specific tests) |
| Dashboard | `npm --prefix frontend/dashboard run build` |
| Documentation | see policy below |
| Ports/infrastructure | `npm run ports:validate`, `npm run ports:scan-hardcoded` |

## 2. Documentation Build Policy (🚨 new gate)

Any change to **`docs/**`, `governance/**`, `ref/**`, `.claude/**`, `scripts/docs/**`** or files referenced by Docusaurus must satisfy the following before the PR is opened:

1. **Run the full maintenance suite**

   ```bash
   bash scripts/docs/docs-maintenance-validate.sh
   ```

   This covers auto-generation, lint, type-check, tests, build, links, and frontmatter validation. Fix every failure locally.

2. **Generate the CI-aligned build log**

   ```bash
   npm run build:measure   # wraps scripts/build/parallel-build.sh --measure
   ```

   The script writes `./.build-logs/docs-build.log`. Do not delete this file; you will need it for the PR checklist and it lets reviewers download the exact log that CI expects.

3. **Share evidence in the PR**
   - Upload the latest `docs/reports/maintenance-*/validation-report-*.md` (or reference it if already committed).
   - Attach the tail of `.build-logs/docs-build.log` (≈200 lines) to the PR description or as a comment. This proves the log exists before CI runs.

4. **Keep the workspace clean**
   - Never commit `.build-logs/*.log`; they are for verification only.
   - If the log is missing locally, rerun `npm run build:measure` until it is produced—CI will now fail fast when the artifact is absent.

## 3. Pull Request Checklist (quick reference)

Before requesting a review:

- [ ] Lint/tests/build commands above completed successfully.
- [ ] Documentation policy satisfied (when applicable) and log evidence attached.
- [ ] `.env.defaults`, port registry, and ADRs updated when configuration changes.
- [ ] PR description links to related issues and includes testing notes.

For the full checklist, see [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).

## 4. Need Help?

- **Docs Ops / Governance**: check `docs/content/governance/maintenance-automation-guide.mdx`.
- **CI Issues**: raise in `#tradingsystem-ci` with the failing workflow URL and attach `.build-logs/docs-build.log`.
- **Agent / Automation updates**: see `AGENTS.md` and `scripts/agents/README.md`.

Thanks for keeping the pipelines green!
