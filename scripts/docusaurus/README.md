# Docusaurus Automation Scripts

Utility scripts for the `docs` workspace live here so they can be reused by CI,
local developers, and future automation hooks described in the OpenSpec plan.

All scripts assume they are executed from anywhere inside the repository and
resolve the repo root before running the matching `npm --prefix docs ...`
command.

Available helpers:

- `build.sh` – run the production build (`npm --prefix docs run docs:build`)
- `serve.sh` – serve the built site locally on port 3205 by default
- `lint.sh` – execute Markdown/remark linting
- `check-links.sh` – rebuild and run Linkinator; set `EXTRA_SKIP="pattern1 pattern2"` to ignore additional URLs
- `docs-auto.mjs` – placeholder automation entry point for generated content
- `new.sh` – scaffold a new MDX page with required frontmatter metadata

> **Note**  
> These scripts are scaffolding only; Phase 3 automation tasks will gradually
> replace the TODOs with concrete implementations.
