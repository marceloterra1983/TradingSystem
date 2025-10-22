# Healthcheck Scripts

Diagnostic and status helpers for verifying local services.

## Available commands

- `hc-tradingsystem-status.sh`: comprehensive TradingSystem status (services, Docker, resources).
- `hc-tp-capital-quick.sh`: lightweight TP Capital port/log check.
- `hc-tp-capital-complete.sh`: full TP Capital diagnostic covering dashboard, workspace and backend.

Run the scripts from the repository root:

```bash
bash scripts/healthcheck/hc-tradingsystem-status.sh --quick
```

Use `--help` in each script to list the supported flags.
