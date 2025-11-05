# Codex Command Bridge

This folder contains the glue layer that lets **Codex/Cline** trigger the same
high-value workflows that previously lived only as Claude slash commands under
`.claude/commands/`.

## Available Bridges

| Command            | Codex entry point                                     | Underlying script                                       |
|--------------------|--------------------------------------------------------|---------------------------------------------------------|
| `/quality-check`   | `npm run codex:quality-check -- [options]`             | `scripts/maintenance/code-quality-check.sh`             |
| `/health-check`    | `npm run codex:health-check -- [--format json]`        | `scripts/maintenance/health-check-all.sh`               |
| `/docker-compose`* | `npm run codex:docker -- <action> [stack [service]]`   | `scripts/codex/docker-stacks.sh` + compose helpers      |
| `/service-launcher`| `npm run codex:service-launcher -- <start|stop|...>`   | `scripts/codex/service-launcher.sh`                     |
| `/scripts`         | `npm run codex:scripts -- <list|search|run...>`        | `scripts/codex/scripts-tool.sh`                         |

\*Supports the documented actions `start`, `stop`, `restart`, `ps`, `logs`.

### Examples

```bash
# Run the full quality gate and emit HTML artifacts
npm run codex:quality-check -- --full --format html

# Fetch JSON status for every service (mirrors /health-check all)
npm run codex:health-check -- --format json

# Start only the infra + docs stacks
npm run codex:docker -- start infra docs

# Tail logs for the RAG stack (single service)
npm run codex:docker -- logs rag rag-service

# Restart Service Launcher
npm run codex:service-launcher -- restart

# List all scripts + run a maintenance task
npm run codex:scripts -- list
npm run codex:scripts -- run maintenance/health-check-all.sh --format json
```

## Implementation Notes

- `scripts/codex/run-command.sh` is the unified dispatcher. Add new cases there
  when you port the next slash command.
- `scripts/codex/docker-stacks.sh` wraps the existing stack scripts and compose
  files so that Codex can start/stop/tail without touching `.claude/commands`.
- `package.json` exposes `codex:*` npm scripts so the Codex CLI can call them
  with `npm run <script> -- --args`, which mirrors how Claude forwards slash
  command arguments.

## Next Steps

1. Identify the next Claude command with meaningful automation.
2. Ensure there is a standalone script (bash/node/python) that performs the work.
3. Add a dispatch case and, if useful, another `npm run codex:<name>` alias.

Once the command has a Codex bridge, update `.claude/commands/<name>.md` to
reference the new script so both assistants stay in sync.
