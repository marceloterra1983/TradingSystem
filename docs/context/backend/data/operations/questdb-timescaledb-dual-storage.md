---
title: Arquitetura Dual QuestDB + TimescaleDB
sidebar_position: 40
tags: [data, questdb, timescaledb, backend, guide]
domain: backend
type: guide
summary: Como operar a ingestão em QuestDB com camada analítica em TimescaleDB mantendo replicação assíncrona
status: active
last_review: 2025-10-17
---

## Visão Geral

Adotamos TimescaleDB (PostgreSQL 15 + extensão) como camada analítica e relacional complementando o QuestDB. O objetivo é manter ingestão de baixa latência no QuestDB e disponibilizar dados históricos/com agregações via SQL padrão no Timescale.

```
QuestDB (ingestão) ──(ETL assíncrono)──▶ TimescaleDB (analytics)
```

## Provisionamento
- Stack: `infrastructure/compose/docker-compose.timescale.yml`
- Helper: `infrastructure/scripts/setup-timescaledb-stack.sh`
- Rede dedicada: `data-timescale-network`
- Exporter Prometheus (porta 9187) e container de backup incluídos.

Credenciais devem ser definidas em `.env.timescaledb` (copiar do `.example`).
pgAdmin 4 está disponível em `http://localhost:5050` (usuário/senha definidos no `.env`).

## Replicação
- Serviço `backend/services/timescaledb-sync/` consulta QuestDB via REST (`/exec`) e insere dados em `trading_signals`.
- Tabela `sync_control` guarda o último timestamp replicado por stream.
- SLA: atraso máximo 5 minutos (alerta Prometheus quando exceder).
- Para novos datasets, adicionar hypertable e stream correspondente no script de sync.

## Retenção & Compressão
- `infrastructure/timescaledb/maintenance.sql` cria políticas:
  - Compressão após 7 dias
  - Retenção de 90 dias (sinais/execuções) e 180 dias (métricas)
- QuestDB mantém retenção independente; alinhar janelas nas rotinas em `docs/context/backend/data/operations/retention-policy.md`.

## Backup
- Automatizado via `timescaledb-backup` (cron default `0 2 * * *`).
- Manual: `bash infrastructure/scripts/backup-timescaledb.sh`.
- Dumps são armazenados em `timescaledb-backups` (volume persistente). Configure rotação via `TIMESCALEDB_BACKUP_CRON`.

## Consultas
Exemplo para relatórios diários:

```sql
SELECT date_trunc('day', created_at) AS dia,
       symbol,
       COUNT(*) AS total_sinais,
       AVG((payload->>'confidence')::numeric) AS media_confidence
FROM trading_signals
WHERE created_at >= now() - INTERVAL '30 days'
GROUP BY dia, symbol
ORDER BY dia DESC, symbol;
```

## Monitoramento
- Exporter: `timescaledb-exporter` (Prometheus). Adicione job:

```yaml
- job_name: timescaledb
  static_configs:
    - targets: ['timescaledb-exporter:9187']
```

- Criar alerta Grafana para verificar atraso: `SELECT EXTRACT(EPOCH FROM (NOW() - last_synced)) FROM sync_control`.

## Fallback
1. Pausar job de replicação (`crontab -e`) se Timescale estiver indisponível.
2. Apps podem consultar diretamente QuestDB (limitar range) durante manutenção.
3. Após retorno, rodar `timescaledb-sync` com `QUESTDB_QUERY` cobrindo o período perdido.

## Próximos Passos
- Expandir replicação para execuções e métricas (jobs dedicados).
- Automatizar testes de consistência entre QuestDB e TimescaleDB no pipeline de dados.
