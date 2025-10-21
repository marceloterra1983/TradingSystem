# 🚫 Quick Start - Claude Code com Z.AI (Desativado)

Este guia foi arquivado porque o Claude Code e a integração com a API Z.AI foram removidos dos ambientes WSL2 em 18/10/2025.

## O que mudou?
- O binário `claude` não está mais disponível.
- O script `./scripts/claude-z-ai.sh` foi removido.
- Tokens e configurações em `~/.claude/` foram apagados.
- O instalador `install.sh` agora apenas informa que a ferramenta está desativada.

## Como proceder?
1. Abra um novo terminal WSL2 para carregar o perfil sem variáveis do Claude Code.
2. Utilize as ferramentas aprovadas listadas em `docs/context/shared/tools/`.
3. Caso ainda veja artefatos do Claude, siga as validações descritas em `docs/context/ops/claude-z-ai-guide.md`.

> **Importante:** É proibido reinstalar o Claude Code em WSL2. Qualquer necessidade de automação deve ser alinhada com a equipe de operações.
