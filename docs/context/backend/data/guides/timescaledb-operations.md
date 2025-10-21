---
title: TimescaleDB Operations Guide
sidebar_position: 30
tags: [backend, data, timescaledb, operations, guide]
domain: backend
type: guide
summary: Operational guide for TimescaleDB including setup, maintenance, and troubleshooting
status: active
last_review: 2025-10-17
---

# TimescaleDB Operations Guide

> Guia rápido para operar a camada analítica PostgreSQL + TimescaleDB mantendo o QuestDB como ingestão primária.

## Provisionamento
- Stack Docker Compose: `infrastructure/compose/docker-compose.timescale.yml`
- Helper: `infrastructure/scripts/setup-timescaledb-stack.sh`
- Variáveis: utilize o `.env` na raiz do projeto (`cp .env.example .env`) e configure credenciais seguras, portas e cron de backup; os serviços referenciam esse arquivo compartilhado via `env_file: ../../.env`.

```bash
# subir stack
bash infrastructure/scripts/setup-timescaledb-stack.sh up

# reiniciar stack
bash infrastructure/scripts/setup-timescaledb-stack.sh restart
```

## Schema e manutenção
- SQL inicial: `infrastructure/timescaledb/schema.sql`
- Políticas de compressão/retention: `infrastructure/timescaledb/maintenance.sql`
- Seed opcional: `infrastructure/timescaledb/seed.sql`

Aplique via `psql`:

```bash
psql "$TIMESCALEDB_DSN" -f infrastructure/timescaledb/schema.sql
psql "$TIMESCALEDB_DSN" -f infrastructure/timescaledb/maintenance.sql
```

## Replicação QuestDB → TimescaleDB

Ao acessar via pgAdmin, adicione um servidor com host `timescaledb`, porta `5432` (interno) ou `localhost:5433` (host).

## Replicação QuestDB → TimescaleDB
- Serviço: `backend/services/timescaledb-sync/`
- Frequência recomendada: a cada 2–5 minutos (cron/systemd)
- SLA: atraso máximo 5 minutos (alerta Prometheus quando exceder)

Variáveis de ambiente principais:

```env
QUESTDB_REST_URL=http://questdb:9000
TIMESCALEDB_DSN=postgresql://timescale:***@timescaledb:5432/tradingsystem
TIMESCALEDB_STREAM=tp_capital_signals
```

## Backup e restore
- Automático: container `timescaledb-backup` gera dumps diários em `/backups`
- Manual: `bash infrastructure/scripts/backup-timescaledb.sh`

Restore:

```bash
pg_restore -h timescaledb -U $TIMESCALEDB_USER -d $TIMESCALEDB_DB /caminho/backup.dump
```

## Monitoramento
- Exporter Prometheus: `timescaledb-exporter` (porta padrão 9187)
- Métricas chave:
  - `pg_stat_database_xact_commit` e `pg_stat_database_tup_inserted`
  - `timescaledb_last_sync_age_seconds` (calcular via consulta em `sync_control`)
- Adicione regra de alerta em Grafana/Prometheus quando `last_synced` exceder 5 minutos.

## Retenção/Compressão
Políticas definidas em `maintenance.sql` (90 dias para sinais/execuções, 180 dias para métricas). Ajuste conforme necessidade e mantenha alinhamento com retention do QuestDB.

## Plano de fallback
1. Se TimescaleDB indisponível, pausar jobs de replicação (`crontab -e`).
2. Consultas analíticas podem apontar temporariamente para QuestDB (com filtros menores).
3. Após restauração, reexecutar `timescaledb-sync` com `QUESTDB_QUERY` cobrindo o intervalo perdido.
