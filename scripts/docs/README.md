# Docs Automation Scripts

Utility scripts for the `docs` workspace live here so they can be reused by CI,
local developers, and future automation hooks described in the OpenSpec plan.

All scripts assume they are executed from anywhere inside the repository and
resolve the repo root before running the matching `npm --prefix docs ...`
command.

Available helpers:

- `build.sh` – run the production build (`npm --prefix docs run docs:build`)
- `serve.sh` – serve the built site locally on port 3400 by default
- `lint.sh` – execute Markdown/remark linting
- `check-links.sh` – rebuild and run Linkinator; set `EXTRA_SKIP="pattern1 pattern2"` to ignore additional URLs
- `docs-auto.mjs` – placeholder automation entry point for generated content
- `new.sh` – scaffold a new MDX page with required frontmatter metadata

> **Note**  
> These scripts are scaffolding only; Phase 3 automation tasks will gradually
> replace the TODOs with concrete implementations.

## Pre-push pipeline

The Husky `pre-push` hook (see `.husky/pre-push`) always runs the following
chain before any ref reaches GitHub:

1. `npm --prefix docs run docs:auto`
2. `npm --prefix docs run docs:validate-generated`
3. `npm --prefix docs run docs:lint` (non-blocking)
4. `npm --prefix docs run docs:typecheck`
5. `npm --prefix docs run docs:test`
6. `npm --prefix docs run docs:build`

Set `SKIP_DOCS_HOOKS=1` only for emergency situations (e.g. broken build you
need to force-push to fix) and document the reason in the commit/PR. Otherwise,
expect push attempts to fail until generated docs, lint and tests are green.

## Auto-commit helper

For solo development cycles it is convenient to keep generated files in their
own commit. Run the following command before opening a PR:

```bash
npm run docs:auto:commit
```

This script executes the full `docs:auto` + validation flow, stages the
generated artifacts (`ports-services.mdx`, `tokens.mdx`, `reference/ports.mdx`)
and creates a `chore(docs): sync generated docs` commit only if something
changed. Aborting is safe—no files stay staged if nothing was regenerated.
