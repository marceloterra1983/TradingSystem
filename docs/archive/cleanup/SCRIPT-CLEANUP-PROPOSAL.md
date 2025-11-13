# Script Cleanup Proposal

**Date:** 2025-11-13
**Total Scripts Found:** 286 scripts
**Root Scripts:** 13 scripts
**Scripts in /scripts:** 273+ scripts

---

## 🎯 Executive Summary

Identificamos **alto nível de duplicação e desorganização** nos scripts do projeto:

- **13 scripts na raiz** que deveriam estar em `/scripts/`
- **Múltiplas versões duplicadas** (start-all-stacks.sh tem 3+ versões)
- **Scripts obsoletos** de funcionalidades removidas (Kong, Snap, etc.)
- **Falta de padrão** de nomenclatura e organização

---

## 🚨 CRITICAL: Scripts na Raiz (Devem ser Movidos/Removidos)

### Scripts de Startup (Duplicados)
```
/workspace/start-all-stacks.sh                    # Duplicado
/workspace/start-all-stacks-ordered.sh            # Duplicado
/workspace/start-all-remaining-stacks.sh          # Duplicado
```

**ACTION:** Remover da raiz - já existem em `/scripts/docker/` e `/scripts/presets/`

### Scripts de Fix Temporários (One-off)
```
/workspace/fix-auth.sh                            # Temporário - PgBouncer
/workspace/fix-docker-compose-duplicate.sh        # Temporário - group_add
/workspace/fix-everything.sh                      # Temporário - Fix geral
/workspace/fix-pg-hba.sh                          # Temporário - pg_hba.conf
/workspace/fix-stacks.sh                          # Temporário - Stacks issues
```

**ACTION:** Mover para `/scripts/maintenance/dangerous/fixes-archive/` (histórico)

### Scripts de Reset de Senha (Temporários)
```
/workspace/reset-password-md5.sh                  # Temporário - v1
/workspace/reset-password-md5-v2.sh               # Temporário - v2
```

**ACTION:** Mover para `/scripts/maintenance/dangerous/` (ou remover se não usado mais)

### Scripts de Setup (DevContainer)
```
/workspace/setup-devcontainer-perfect.sh          # Setup inicial
/workspace/post-create.sh                         # DevContainer hook
/workspace/post-start.sh                          # DevContainer hook
```

**ACTION:** Mover para `/scripts/setup/` e atualizar `.devcontainer/devcontainer.json`

---

## 📂 Scripts em /scripts/ (Duplicações Identificadas)

### 1. Startup Scripts (ALTA DUPLICAÇÃO)

**Duplicados identificados:**
```
/scripts/docker/start-all-stacks.sh               # PRINCIPAL (melhor documentado)
/scripts/docker/start-stacks.sh                   # Duplicado?
/scripts/docker/startup-all.sh                    # Duplicado?
/scripts/docker/startup-all-services.sh           # Duplicado?
/scripts/presets/start-all-fixed.sh               # Duplicado
/scripts/presets/start-clean.sh                   # Preset específico
/scripts/presets/start-minimal.sh                 # Preset específico
/scripts/presets/start-with-gateway.sh            # Preset específico
/scripts/presets/startup-all-services.sh          # Duplicado
/scripts/presets/startup-everything.sh            # Duplicado
/scripts/presets/ultimate-startup.sh              # Duplicado
```

**ACTION:**
- MANTER: `/scripts/docker/start-all-stacks.sh` (principal)
- MANTER: `/scripts/presets/*` (presets específicos - minimal, clean, etc.)
- REMOVER: Duplicados em `/scripts/docker/` (startup-all.sh, startup-all-services.sh)

### 2. TP Capital Scripts (ALTA DUPLICAÇÃO)

**Scripts redundantes:**
```
/scripts/setup/restart-tp-capital.sh              # v1
/scripts/setup/restart-tp-capital-final.sh        # v2
/scripts/setup/restart-tp-capital-docker.sh       # v3
/scripts/setup/force-restart-tp-capital-clean.sh  # v4 (force)
/scripts/setup/kill-all-tp-capital.sh             # Complementar
```

**ACTION:**
- CONSOLIDAR em 2 scripts:
  - `restart-tp-capital.sh` (graceful restart)
  - `force-restart-tp-capital.sh` (force kill + restart)
- REMOVER: Versões intermediárias (-final, -docker, etc.)

### 3. Dashboard Scripts (DUPLICAÇÃO MÉDIA)

**Scripts redundantes:**
```
/scripts/setup/restart-dashboard.sh                      # v1
/scripts/setup/restart-dashboard-tp-capital.sh           # v2 (com TP Capital)
/scripts/maintenance/restart-dashboard.sh                # Duplicado em local diferente
/scripts/dashboard/dashboard-docker.sh                   # Específico Docker
```

**ACTION:**
- MANTER: `/scripts/setup/restart-dashboard.sh` (principal)
- MANTER: `/scripts/dashboard/dashboard-docker.sh` (docker-specific)
- REMOVER: `/scripts/maintenance/restart-dashboard.sh` (duplicado)
- AVALIAR: `restart-dashboard-tp-capital.sh` (pode ser merge com principal)

### 4. Telegram Scripts (CONSOLIDAÇÃO NECESSÁRIA)

**Scripts em múltiplos locais:**
```
/scripts/setup/configure-telegram-gateway-api-key.sh     # Setup
/scripts/setup/authenticate-telegram-mtproto.sh          # Setup
/scripts/setup/migrate-telegram-session.sh               # Setup
/scripts/setup/enable-telegram-startup-sync.sh           # Setup

/scripts/telegram/authenticate.sh                        # Duplicado?
/scripts/telegram/authenticate-mtproto.sh                # Duplicado?
/scripts/telegram/autenticar-telegram.sh                 # Duplicado PT-BR
```

**ACTION:**
- CONSOLIDAR em `/scripts/telegram/` (tudo relacionado a Telegram)
- REMOVER duplicados em `/scripts/setup/`
- PADRONIZAR nomenclatura (inglês only)

### 5. Scripts Obsoletos (REMOÇÃO IMEDIATA)

**Funcionalidades removidas do projeto:**
```
/scripts/.legacy-backup/kong/*                           # Kong API Gateway (substituído por Traefik)
/scripts/setup/remove-snap-act.sh                        # Snap removido
/scripts/deployment/stop-snap-services.sh                # Snap removido
/scripts/docker/stop-questdb-host*.sh                    # QuestDB host-based (agora Docker)
```

**ACTION:**
- MANTER em `/scripts/.legacy-backup/` (já arquivado)
- REMOVER scripts snap e questdb-host de `/scripts/setup/` e `/scripts/deployment/`

### 6. Backup Files (LIMPEZA)

**Arquivos de backup encontrados:**
```
/scripts/codex/docker-stacks.sh.backup-20251111-144029
/scripts/codex/docker-stacks.sh.bak
/scripts/docker/start-stacks.sh.bak
/scripts/docker/stop-stacks.sh.bak
/scripts/presets/ultimate-startup.sh.bak
/scripts/start.sh.bak
/scripts/stop.sh.bak
```

**ACTION:** REMOVER todos arquivos `.bak` e `.backup-*` (git já versiona tudo)

---

## 🎯 Plano de Limpeza Proposto

### Fase 1: Remoção de Scripts Temporários da Raiz (IMEDIATO)

```bash
# Criar pasta de arquivo histórico
mkdir -p scripts/maintenance/dangerous/fixes-archive

# Mover scripts temporários fix-*
mv /workspace/fix-*.sh scripts/maintenance/dangerous/fixes-archive/

# Mover scripts de reset de senha
mv /workspace/reset-password-md5*.sh scripts/maintenance/dangerous/

# Remover duplicados de startup da raiz
rm /workspace/start-all-*.sh

# Mover scripts DevContainer
mv /workspace/setup-devcontainer-perfect.sh scripts/setup/
mv /workspace/post-*.sh scripts/setup/
```

### Fase 2: Limpeza de Arquivos Backup (IMEDIATO)

```bash
# Remover todos arquivos .bak e .backup-*
find /workspace/scripts -type f \( -name "*.bak" -o -name "*.backup-*" \) -delete
```

### Fase 3: Consolidação de Scripts Duplicados (CUIDADO)

**TP Capital:**
```bash
# Manter apenas restart principal e force
mv scripts/setup/restart-tp-capital-final.sh scripts/setup/restart-tp-capital.sh
mv scripts/setup/force-restart-tp-capital-clean.sh scripts/setup/force-restart-tp-capital.sh

# Remover versões antigas
rm scripts/setup/restart-tp-capital-docker.sh
```

**Dashboard:**
```bash
# Remover duplicado
rm scripts/maintenance/restart-dashboard.sh

# Avaliar merge de restart-dashboard-tp-capital.sh com principal
```

**Startup Scripts:**
```bash
# Remover duplicados em /scripts/docker/
rm scripts/docker/startup-all.sh
rm scripts/docker/startup-all-services.sh

# Manter /scripts/docker/start-all-stacks.sh como PRINCIPAL
# Manter presets em /scripts/presets/* (são variações específicas)
```

### Fase 4: Reorganização de Scripts Telegram (CONSOLIDAÇÃO)

```bash
# Mover tudo de Telegram para /scripts/telegram/
mv scripts/setup/*telegram* scripts/telegram/
mv scripts/setup/*mtproto* scripts/telegram/

# Remover duplicados PT-BR
rm scripts/telegram/autenticar-telegram.sh  # Usar authenticate.sh

# Padronizar nomenclatura
```

### Fase 5: Remoção de Scripts Obsoletos (SEGURO)

```bash
# Remover scripts Snap
rm scripts/setup/remove-snap-act.sh
rm scripts/deployment/stop-snap-services.sh

# Remover scripts QuestDB host-based
rm scripts/docker/stop-questdb-host*.sh

# Kong já está em .legacy-backup/ - OK
```

---

## 📊 Resultado Esperado

### Antes (Atual)
- **Total:** 286+ scripts
- **Root:** 13 scripts
- **Duplicações:** ~30-40 scripts
- **Obsoletos:** ~15 scripts
- **Backups:** ~10 arquivos

### Depois (Proposto)
- **Total:** ~220-230 scripts ✅
- **Root:** 0 scripts ✅
- **Duplicações:** 0 scripts ✅
- **Obsoletos:** 0 scripts ✅
- **Backups:** 0 arquivos (git versiona) ✅

**Redução estimada:** ~60-70 scripts (20-25% do total)

---

## ✅ Checklist de Execução

### Fase 1: Limpeza Raiz
- [ ] Criar `/scripts/maintenance/dangerous/fixes-archive/`
- [ ] Mover scripts fix-* para archive
- [ ] Mover reset-password-* para dangerous
- [ ] Remover start-all-* da raiz
- [ ] Mover setup-devcontainer e post-* para setup
- [ ] Atualizar `.devcontainer/devcontainer.json` com novos paths

### Fase 2: Backup Files
- [ ] Executar find/delete para .bak e .backup-*
- [ ] Validar que git versiona tudo
- [ ] Commit removal

### Fase 3: Consolidação
- [ ] TP Capital: consolidar restart scripts
- [ ] Dashboard: remover duplicado maintenance
- [ ] Startup: remover duplicados docker/
- [ ] Testar scripts após consolidação

### Fase 4: Telegram
- [ ] Mover scripts para /scripts/telegram/
- [ ] Remover duplicados PT-BR
- [ ] Padronizar nomes (inglês)
- [ ] Testar autenticação

### Fase 5: Obsoletos
- [ ] Remover scripts Snap
- [ ] Remover scripts QuestDB host
- [ ] Validar .legacy-backup/

### Fase Final: Documentação
- [ ] Atualizar `/scripts/README.md` com nova estrutura
- [ ] Atualizar `CLAUDE.md` se necessário
- [ ] Criar commit com mensagem descritiva
- [ ] Validar health checks

---

## 🚦 Recomendação de Execução

**ORDEM SEGURA:**

1. ✅ **Fase 2 primeiro** (backup files) - ZERO RISCO
2. ✅ **Fase 5** (obsoletos) - BAIXO RISCO
3. ⚠️ **Fase 1** (raiz) - MÉDIO RISCO (atualizar devcontainer.json)
4. ⚠️ **Fase 4** (telegram) - MÉDIO RISCO (testar auth depois)
5. 🚨 **Fase 3** (consolidação) - ALTO RISCO (testar cada script após)

**NUNCA executar tudo de uma vez!** Validar cada fase antes de próxima.

---

## 📝 Notas Importantes

1. **Git Versiona Tudo** - Não precisamos de .bak files
2. **Testar Após Cada Fase** - Health checks e smoke tests
3. **Documentar Mudanças** - Atualizar READMEs afetados
4. **Commit Atômico por Fase** - Facilita rollback se necessário
5. **Validar DevContainer** - Scripts de setup podem afetar rebuild

**Questões?** Revisar antes de executar qualquer fase!
