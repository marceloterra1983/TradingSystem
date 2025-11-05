# Port Governance Toolkit

This folder centralises automation around `config/ports/registry.yaml`. All commands are exposed via `npm` scripts and run in CI, pre-commit hooks, and local workflows.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run ports:validate` | Validates schema, duplicates, ranges and dependencies. |
| `npm run ports:duplicates` | Shortcut to fail fast if duplicate names or ports exist. |
| `npm run ports:check-ranges` | Ensures every service respects the configured range. |
| `npm run ports:sync` | Generates `.env.shared`, documentation, health script, Compose dictionary and `config/ports/index.json`. |
| `npm run ports:scan-hardcoded` | Scans sources for `localhost:<port>` references that bypass the registry. |
| `npm run ports:report` | Prints a quick summary of stacks, services and ranges. |
| `npm run ports:test` | Runs unit tests for the toolkit. |

## Generated Assets

- `.env.shared` – canonical environment variables for every service.
- `docs/content/tools/ports-services.mdx` – documentation consumed by Docusaurus.
- `scripts/maintenance/ports-health.sh` – health verification script (curl-based).
- `tools/compose/docker-compose.ports.generated.yml` – dictionary for compose overrides.
- `config/ports/index.json` – lightweight runtime index for scripts and dashboards.

Run `npm run ports:sync` after modifying `config/ports/registry.yaml`. The pre-commit hook enforces this automatically and will stage generated files for you.
