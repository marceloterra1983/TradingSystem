---
title: "Claude Code com Z.AI (Desativado)"
tags: ["claude", "ops", "deprecation"]
domain: "ops"
type: "guide"
summary: "Registro oficial da remoção do Claude Code e da integração Z.AI dos ambientes WSL2."
status: "deprecated"
last_review: "2025-10-18"
---

# Claude Code com Z.AI (Desativado)

> **Status:** Integração descontinuada em 18/10/2025.  
> **Motivo:** Padronização dos agentes suportados pelo TradingSystem e política de segurança que removeu Claude Code dos ambientes WSL2.

Este documento substitui o guia anterior de instalação e uso do Claude Code com a API Z.AI. Todas as instruções de setup foram removidas para evitar reinstalação acidental.

## ✅ Remoções Aplicadas

- CLI `claude` desinstalada de todas as distribuições WSL2.
- Diretórios `~/.claude`, `~/.local/share/claude`, caches e estados associados eliminados.
- Extensões do Cursor (`anthropic.claude-code`, `saoudrizwan.claude-dev`) removidas.
- Script auxiliar `scripts/claude-z-ai.sh` deletado.
- Instalador `install.sh` desativado (apenas exibe aviso).
- Variáveis de ambiente (`CLAUDE_CODE_SSE_PORT`, tokens Z.AI) limpas dos perfis de shell.

## 🔁 Ações Requeridas

1. **Não reinstalar o Claude Code**: o repositório e os scripts oficiais agora bloqueiam essa ação.
2. **Atualizar ambientes locais**: abra um novo shell WSL2 para herdar o perfil sem variáveis do Claude.
3. **Usar alternativas suportadas**: consulte `docs/context/shared/tools/` para automações aprovadas (ex.: Cursor com Gemeni, LangGraph, ferramentas internas).

## 🔍 Como Validar

```bash
# 1. Comando deve retornar vazio
which claude

# 2. Verificar que não há diretórios residuais
find ~ -maxdepth 2 -name '*claude*'

# 3. Conferir que Cursor não tem extensões da Anthropic
ls ~/.cursor-server/extensions | grep -i claude
```

Os três comandos devem retornar **sem resultados**.

## 📝 Histórico

- 2025-10-18: Remoção completa do Claude Code e desativação deste guia.
- 2025-10-17: Última revisão do guia de uso (agora obsoleto).

Para dúvidas adicionais, acione a equipe de operações.
