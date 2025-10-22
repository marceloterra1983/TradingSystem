# Tasks

## 1. Content foundations
- [ ] 1.1 Create `docs/context/prd/` and `docs/context/frontend/` trees with `_category_.json`, overview pages, and starter MDX files mirroring the plan structure.
- [ ] 1.2 Author reusable PRD feature and frontend template MDX files plus document frontmatter expectations.
- [ ] 1.3 Wire required crosslinks between PRD pages, frontend documentation, and existing API/SDD references.

## 2. Automation & tooling
- [ ] 2.1 Extend `scripts/docs/new-page.ts` with `--type prd` and `--type frontend` options that pull the new templates.
- [ ] 2.2 Implement `scripts/docs/prd-index.ts` to rebuild `docs/context/prd/overview.mdx` from product directories.
- [ ] 2.3 Implement `scripts/docs/frontend-sync-tokens.ts` to transform JSON design tokens into `docs/context/frontend/design-system/tokens.mdx`.

## 3. Workspace integration
- [ ] 3.1 Update `docs/docusaurus/sidebars.ts` to surface the PRD and Frontend categories with nested items.
- [ ] 3.2 Expand `docs/docusaurus/package.json` with `docs:auto` and `docs:new` scripts that invoke the generators.
- [ ] 3.3 Ensure generated content remains lint-clean and compatible with existing DocOps scripts.

## 4. Governance & validation
- [ ] 4.1 Add PR template prompts (PRD Impact / Frontend Impact) and CI checks enforcing `npm run docs:auto`.
- [ ] 4.2 Document ownership expectations for PRD and Frontend sections in workspace READMEs or contributing guides.
- [ ] 4.3 Verify `npm run docs:auto` and lint/build pipelines succeed with the new automation.
