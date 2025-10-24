# Remove Claude Code from WSL2

## Why
- Claude Code binaries, configs, and editor integrations still exist inside multiple WSL2 distributions, conflicting with the directive to standardize automation agents and potentially exposing credentials.
- Keeping unused AI tooling inside developer WSL2 environments increases maintenance overhead (extra updates, PATH pollution) and confuses onboarding.
- WSL2 images are the base for infrastructure scripts; lingering Claude artifacts break reproducibility and violate current security posture.

## What Changes
- Inventory every WSL2 distro, identify all Claude Code binaries, packages, state folders, environment variables, and IDE hooks.
- Remove Claude Code executables and uninstall packages/toolchains that deploy it (npm, pip, cargo, standalone binaries) from each distro.
- Purge residual configuration, cache, logs, and editor/vscode extensions referencing Claude Code to ensure clean shells.
- Document the validated removal procedure and add guardrails so future bootstrap scripts do not reintroduce Claude tooling.

## Impact
- Developers temporarily lose Claude Code features in WSL2; ensure alternate tooling is documented.
- Removal may affect scripts referencing `claude` binaries—these must be updated or deprecated.
- Validation requires downtime for WSL2 shells while uninstall commands run; schedule to avoid active workloads.

## Decisions
- Verificamos `.github/workflows`, scripts de automação e pipelines internos e não há dependências do comando `claude`; apenas utilitários manuais foram impactados.
- Não existem integrações Windows-side que dependam de sockets ou configurações do Claude Code (nenhum atalho/agendamento referenciando o binário foi encontrado).
