# Design Notes

## Content taxonomy
- Mirror the existing doc taxonomy by introducing sibling `prd` and `frontend` roots under `docs/context/`, each with `_category_.json` to control sidebar ordering.
- Within `prd`, nest `templates/`, `products/<app>/`, and `archive/` folders so the generator can enumerate active features while keeping deprecated material isolated.
- Within `frontend`, split documentation into `design-system/`, `guidelines/`, and `engineering/` to serve distinct audiences while sharing common frontmatter metadata.

## Automation pipeline
- `scripts/docs/prd-index.ts` walks product directories, extracting frontmatter metadata (title, description, last_update) to build tables in `docs/context/prd/overview.mdx`, ensuring the index stays current after new PRDs land.
- `scripts/docs/frontend-sync-tokens.ts` reads the canonical design token JSON from `frontend/tokens/*.json`, converts it into Markdown tables, and writes them into `docs/context/frontend/design-system/tokens.mdx`; hashes allow drift detection during CI.
- Extend `scripts/docs/new-page.ts` with typed template resolution so future additions only require placing an MDX template in `docs/context/<area>/templates/`.

## Governance hooks
- Update `npm run docs:auto` to include both new generators so token and index drift is caught automatically before build.
- CI jobs should enforce `npm run docs:auto` and compare committed artifacts, failing if regenerated content differs.
- PR templates gain PRD/Frontend impact prompts, nudging contributors to update relevant docs and scripts when app or UI changes occur.
