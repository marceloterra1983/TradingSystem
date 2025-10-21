# Symlinks de Compatibilidade - Scripts da Raiz

Este documento descreve os symlinks criados para manter compatibilidade com scripts legados na raiz do projeto.

## Symlinks Criados

| Script Original (Raiz) | Novo Local | Status |
|------------------------|------------|--------|
| `check-services.sh` | `scripts/services/status.sh` | ✅ Consolidado |
| `start-all-services.sh` | `scripts/services/start-all.sh` | ✅ Consolidado |
| `stop-all-services.sh` | `scripts/services/stop-all.sh` | ✅ Consolidado (planejado) |
| `status.sh` | `scripts/services/status.sh` | ✅ Consolidado |
| `start-all-stacks.sh` | `scripts/docker/start-stacks.sh` | ✅ Movido |
| `stop-all-stacks.sh` | `scripts/docker/stop-stacks.sh` | ✅ Movido |
| `check-docker-permissions.sh` | `scripts/docker/verify-docker.sh` | ✅ Melhorado |
| `install-dependencies.sh` | `scripts/setup/install-dependencies.sh` | ✅ Melhorado |
| `QUICK-START.sh` | `scripts/setup/quick-start.sh` | ✅ Melhorado |
| `open-services.sh` | `scripts/utils/open-services.sh` | ✅ Melhorado |
| `install-cursor-extensions.sh` | `scripts/setup/install-cursor-extensions.sh` | ✅ Movido |

## Scripts Mantidos na Raiz

- `install.sh` - Instalador do Claude Code (externo, manter na raiz)

## Como Aplicar Symlinks

```bash
# Executar script de migração
bash scripts/migrate-to-new-structure.sh --dry-run  # Preview
bash scripts/migrate-to-new-structure.sh            # Aplicar
```

Ou manualmente:

```bash
# Criar symlinks
ln -sf scripts/services/status.sh check-services.sh
ln -sf scripts/services/start-all.sh start-all-services.sh
ln -sf scripts/services/status.sh status.sh
ln -sf scripts/docker/start-stacks.sh start-all-stacks.sh
ln -sf scripts/docker/stop-stacks.sh stop-all-stacks.sh
ln -sf scripts/docker/verify-docker.sh check-docker-permissions.sh
ln -sf scripts/setup/install-dependencies.sh install-dependencies.sh
ln -sf scripts/setup/quick-start.sh QUICK-START.sh
ln -sf scripts/utils/open-services.sh open-services.sh
ln -sf scripts/setup/install-cursor-extensions.sh install-cursor-extensions.sh
```

## Recomendação

**Use os novos scripts diretamente** ao invés dos symlinks:

```bash
# ❌ Antiga forma (via raiz)
bash check-services.sh

# ✅ Nova forma (estrutura organizada)
bash scripts/services/status.sh
```

---

**Data:** 2025-10-15
**Status:** Symlinks prontos para criação
