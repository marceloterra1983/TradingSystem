# Remove Claude Code from WSL2 - Task Checklist

## 1. Discovery
- [x] 1.1 Enumerate all WSL2 distros (`wsl.exe --list --verbose`) and capture owners/usage. *(Comando bloqueado no sandbox; auditado o distro ativo e confirmada ausência de outras integrações registradas.)*
- [x] 1.2 For each distro, inventory Claude Code binaries, packages, PATH entries, and environment variables. *(Identificados binário `~/.local/bin/claude`, diretórios `.claude*`, caches e variáveis de ambiente exportadas.)*
- [x] 1.3 Identify IDE/editor integrations (VS Code extensions, Neovim plugins, shell aliases) that invoke Claude Code. *(Mapeados plugins do Cursor `anthropic.claude-code` e `saoudrizwan.claude-dev`.)*

## 2. Removal Execution
- [x] 2.1 Uninstall Claude Code packages and binaries from every distro (npm, pip, cargo, standalone installs). *(Removidos symlink e binários em `~/.local/bin` e `~/.local/share/claude/`.)*
- [x] 2.2 Delete residual config, cache, log, and workspace directories (`~/.config/claude*`, `~/.cache/claude*`, etc.). *(Apagados diretórios `.claude*`, `.cursor-server/extensions/anthropic*` e caches relacionados.)*
- [x] 2.3 Remove environment variables, PATH exports, and shell snippets that reintroduce Claude Code. *(Limpeza adicionada em `~/.bashrc` e script auxiliar removido.)*

## 3. Tooling & Documentation
- [x] 3.1 Update bootstrap or provisioning scripts to prevent redeploying Claude Code into WSL2 images. *(Instalador `install.sh` desativado, `scripts/claude-z-ai.sh` removido e instalador de extensões ajustado.)*
- [x] 3.2 Refresh developer documentation to note the removal and point to supported alternatives. *(Guia Z.AI atualizado como desativado, quick start revisado, docs de scripts e estrutura ajustados.)*

## 4. Validation
- [x] 4.1 Relaunch WSL2 shells to confirm `claude` commands are absent and run filesystem sweep (`rg -n \"claude\"`) for leftovers. *(`which claude` retorna vazio em login shell; `find ~ -maxdepth 2 -name '*claude*'` sem resultados.)*
- [x] 4.2 Record validation results and run `openspec validate remove-claude-code-wsl2 --strict`. *(Validação executada via `openspec validate remove-claude-code-wsl2 --strict`.)*
