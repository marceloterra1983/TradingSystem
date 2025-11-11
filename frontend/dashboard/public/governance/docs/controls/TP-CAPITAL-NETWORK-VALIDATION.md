---
title: "Checklist de Validação de Networking e Variáveis do TP-Capital"
id: SOP-NET-002
owner: DevOps
lastReviewed: "2025-11-05"
reviewCycleDays: 90
status: active
relatedPolicies:
  - POL-0003
relatedStandards:
  - STD-010
tags:
  - sop
  - networking
  - docker
  - environment-variables
  - incident-prevention
---

# Checklist de Validação de Networking e Variáveis do TP-Capital

**Objetivo**  
Evitar recorrência do incidente de 05/11/2025 (falha de conectividade TP-Capital) garantindo que serviços Telegram/TP-Capital e Dashboard iniciem com redes, portas e variáveis consistentes antes de liberar usuários.

## 1. Escopo

- Stacks: `tools/compose/docker-compose.4-2-telegram-stack.yml`, `docker-compose.4-1-tp-capital-stack.yml`, `docker-compose.1-dashboard-stack.yml`
- Serviços afetados: Telegram Gateway API, TP-Capital API, PgBouncer/Timescale, Dashboard UI
- Ambientes: dev local (Docker/WSL) e homologação

## 2. Preparação

1. Carregar `.env` central com `set -a && source ../../.env && set +a`.
2. Verificar criptos via `npm run governance:validate-envs`.
3. Executar `docker network ls | grep tradingsystem` para garantir redes `telegram_backend`, `tp_capital_backend`, `tradingsystem_backend` e `tradingsystem_frontend`.

## 3. Checklist de Variáveis

| Variável | Origem | Esperado |
|----------|--------|----------|
| `TELEGRAM_DB_PASSWORD` | `.env` | Nunca vazio; validar com `scripts/maintenance/health-check-all.sh --format json` |
| `TELEGRAM_GATEWAY_URL` | compose TP-Capital | Deve apontar para `http://telegram-gateway-api:4010` |
| `VITE_TP_CAPITAL_PROXY_TARGET` | compose Dashboard | Usar porta interna `http://tp-capital-api:4005` |
| `VITE_TP_CAPITAL_API_URL` | `.env` | Comentado (proxy faz o roteamento) |
| `WORKSPACE__API__BASE_URL` | `.env` | Deve usar hostname de serviço + porta interna |

> _Falha em qualquer linha acima bloqueia deploy até correção._

## 4. Checklist de Redes e Portas

1. **PgBouncer isolado**  
   ```bash
   docker inspect telegram-pgbouncer --format '{{ .HostConfig.NetworkMode }}'
   # Deve retornar "telegram_backend"
   ```
2. **APIs como pontes** (duas redes)  
   ```bash
   docker inspect telegram-gateway-api --format '{{ json .NetworkSettings.Networks }}' | jq 'keys'
   # Deve conter telegram_backend e tradingsystem_backend
   ```
3. **Dashboard isolado**  
   - `tradingsystem_frontend` + `tradingsystem_backend`; nunca conectar a `telegram_backend`.
4. **Portas internas x externas**  
   - Confirmar `docker compose ps tp-capital-api` usa `4005/tcp -> 4008`.
   - Dashboard deve consumir `4005` via proxy, não `4008`.

## 5. Validação Automatizada

Execute antes de qualquer `docker compose up`:

```bash
npm run governance:check
node scripts/maintenance/check-tp-capital-stack.mjs  # valida portas, redes e envs
```

`check-tp-capital-stack.mjs` (novo script) executa:
- Assert de variáveis obrigatórias com valores não vazios.
- Conferência de redes via `docker network inspect`.
- Verificação de portas com `docker compose config --services`.
- Resultado JSON em `governance/evidence/audits/tp-capital-network-YYYY-MM-DD.json`.

## 6. Critérios de Aprovação

- ✅ Todos os comandos retornam zero.
- ✅ Logs finais sem `Connection refused`, `password authentication failed` ou `host.docker.internal`.
- ✅ Evidência JSON anexada ao PR ou registro diário.

## 7. Ações Pós-Deploy

1. Executar `frontend/dashboard/e2e/workspace.functional.spec.ts --grep "@tp-capital"` para validar integrações.
2. Registrar resultado no `governance/evidence/reports/telegram-architecture-YYYY-MM-DD.md`.
3. Atualizar incidentes/resolved tickets se houve correção.

## 8. Histórico

| Data | Versão | Autor | Notas |
|------|--------|-------|-------|
| 2025-11-05 | 1.0 | DevOps | Criação baseada no incidente TP-Capital |

