# Proposal: Containerize TP Capital and Workspace Services

## Why

Os serviços **TP Capital** (porta 4005) e **Workspace** (porta 3200) atualmente rodam como processos Node.js locais, iniciados manualmente via `scripts/universal/start.sh`. Esta abordagem apresenta limitações significativas:

- **Gestão manual de processos**: Requer tracking de PIDs, logs espalhados em diferentes diretórios
- **Deploy inconsistente**: Comportamento diferente entre ambientes (dev/staging/prod)
- **Falta de isolamento**: Conflitos de dependências npm entre serviços
- **Rollback complexo**: Não há versioning de runtime, dificulta voltar para versão anterior
- **Health monitoring limitado**: Não há health checks nativos, depende de polling HTTP manual

A containerização resolve esses problemas fundamentais mantendo a flexibilidade de desenvolvimento (hot-reload) necessária para iteração rápida.

## What Changes

### Serviços Afetados
- ✅ **TP Capital** (apps/tp-capital) → Docker container com hot-reload
- ✅ **Workspace** (backend/api/workspace) → Docker container com hot-reload
- ⚠️ **Universal Startup Script** (`scripts/universal/start.sh`) → Detecta e gerencia containers
- ⚠️ **Service Launcher API** → Detecta serviços containerizados automaticamente
- ⚠️ **Documentation** → Atualiza referências de arquitetura e deployment

### Principais Mudanças

#### 1. Containerização com Hot-Reload
- Criar `Dockerfile.dev` para cada serviço (Node 20 Alpine + nodemon)
- Volumes montados para código fonte (instant changes)
- Logs centralizados via Docker logging driver

#### 2. Integração Docker Compose
- Novo arquivo `tools/compose/docker-compose.apps.yml`
- Integração com networks existentes (`tradingsystem_backend`)
- Health checks + depends_on (TimescaleDB)

#### 3. Resiliência de Startup
- Application-level retry logic para conexão TimescaleDB (5 retries, 2s delay)
- Docker healthchecks integrados
- Logs estruturados indicando estado de dependências

#### 4. Workspace: TimescaleDB Only
- **BREAKING**: Remove suporte a LowDB (dual-strategy)
- Script de migração `scripts/database/migrate-lowdb-to-timescale.js`
- Validação de integridade de dados pós-migração

#### 5. Scripts de Automação
- Atualiza `scripts/universal/start.sh` para detectar containers
- Atualiza `scripts/universal/stop.sh` para graceful shutdown
- Atualiza `scripts/maintenance/health-check-all.sh`

## Impact

### Breaking Changes

1. **BREAKING**: Workspace remove suporte a LowDB
   - **Before**: Dual-strategy (TimescaleDB + LowDB fallback)
   - **After**: TimescaleDB only (requires migration if LowDB data exists)
   - **Migration**: Run `node scripts/database/migrate-lowdb-to-timescale.js` antes de deployar

2. **BREAKING**: Serviços não podem mais ser iniciados via `npm run dev` diretamente
   - **Before**: `cd apps/tp-capital && npm run dev`
   - **After**: `docker compose -f tools/compose/docker-compose.apps.yml up tp-capital`
   - **Workaround**: Use `start` universal command que gerencia containers automaticamente

### Affected Components

| Component | Impact | Action Required |
|-----------|--------|-----------------|
| TP Capital | Container migration | Update .env, test Telegram webhooks |
| Workspace | Container + LowDB removal | Migrate data if exists, update tests |
| Universal Scripts | Container detection | Test start/stop/status commands |
| Service Launcher API | Container detection | Verify `/api/health/full` detects containers |
| Dashboard | API calls | No changes (ports remain 3200, 4005) |
| Documentation | Architecture diagrams | Update deployment guides |

### Benefits

✨ **Isolamento de Dependências**
- Cada serviço com suas versões npm independentes
- Zero conflitos de dependências entre serviços

✨ **Hot-Reload Mantido**
- Volumes montados + nodemon = reload < 2s
- Experiência de desenvolvimento não prejudicada

✨ **Health Checks Integrados**
- Docker healthchecks nativos
- Prometheus metrics expostos automaticamente
- Service discovery simplificado

✨ **Logs Centralizados**
- `docker compose logs -f workspace tp-capital`
- Integração com logging drivers (json-file, syslog, etc.)
- Facilita debugging e troubleshooting

✨ **Rollback Trivial**
- Tag de imagens com versionamento
- `docker compose down && docker compose up` com versão anterior
- Recovery time < 30s

✨ **Deploy Consistente**
- Mesmo Dockerfile entre dev/staging/prod
- Parity garantida (reduz "works on my machine")

### Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Perda de dados na migração LowDB | Backup obrigatório + validação de count |
| Hot-reload lento com volumes | Usar volume anônimo para node_modules |
| TimescaleDB indisponível no startup | Retry logic (5x, 2s) + logs claros |
| Conflito com processos locais nas portas | `start.sh` detecta e oferece `--force-kill` |

## Compatibility

- ✅ **Backward Compatible**: Portas mantidas (3200, 4005)
- ✅ **Backward Compatible**: Frontend Dashboard sem mudanças
- ✅ **Backward Compatible**: Universal commands (`start`, `stop`, `status`)
- ⚠️ **Breaking**: Workspace LowDB removal (requires migration)
- ⚠️ **Breaking**: Services não iniciam via `npm run dev` diretamente

## Timeline

**Estimated Effort**: 8-12 hours (incluindo testes e documentação)

**Phases**:
1. **Preparação** (1h): Backup dados, validar .env, testar TimescaleDB
2. **Containerização** (3-4h): Criar Dockerfiles, .dockerignore, retry logic
3. **Docker Compose** (2h): Integrar com stack existente, configurar networks/volumes
4. **Scripts** (1-2h): Atualizar start/stop/health scripts
5. **Migração Dados** (1h): Script LowDB → TimescaleDB (se necessário)
6. **Testing** (2-3h): Testes end-to-end, validação hot-reload, health checks
7. **Documentation** (1-2h): Atualizar CLAUDE.md, guides, ADRs

## Open Questions

1. ⚠️ **Resolver inconsistência documental**: TP Capital está documentado como porta 3200 em alguns lugares, mas roda em 4005. Precisamos auditar e padronizar.
   - **Action**: Grep recursivo em `docs/` para referências incorretas

2. ⚠️ **Logs persistence**: Containers devem usar Docker logging driver (json-file) ou volume externo?
   - **Recommendation**: json-file com logrotate (simples, integra com `docker logs`)

## Success Metrics

### Implementation Success
- ✅ Both services start via `docker compose up -d` without errors
- ✅ Hot-reload < 2s após mudança de código
- ✅ Health checks passing (Docker + Prometheus)
- ✅ Zero data loss após migração LowDB → TimescaleDB
- ✅ Startup universal (`start`) funciona sem regressões

### Post-Deploy Monitoring
- Container restart count < 1/day
- Memory usage < 200MB/container (dev mode)
- Response time < 100ms (p95)
- TimescaleDB connection errors = 0

## References

- **Related Specs**:
  - `specs/tp-capital-service/spec.md` (NEW)
  - `specs/workspace-service/spec.md` (NEW)
- **Affected Documentation**:
  - `CLAUDE.md` (remove local services references)
  - `docs/context/ops/service-startup-guide.md`
  - `docs/context/backend/guides/guide-tp-capital.md`
  - `docs/context/backend/api/workspace/README.md`
- **Related ADRs**:
  - Future: ADR-00X - Containerization strategy for auxiliary services

---

**Status**: 🟡 Proposal Stage (awaiting approval)
**Author**: Claude Code AI Agent
**Date**: 2025-10-25
**Change ID**: `containerize-tp-capital-workspace`
