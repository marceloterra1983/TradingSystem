# QuestDB → TimescaleDB Sync Service

Serviço Python simples responsável por replicar sinais e dados operacionais do QuestDB para o TimescaleDB.

## Ambiente
Crie um arquivo `.env` na raiz do serviço com as variáveis:

```env
QUESTDB_REST_URL=http://localhost:9000
TIMESCALEDB_DSN=postgresql://timescale:change_me@localhost:5433/tradingsystem
TIMESCALEDB_STREAM=tp_capital_signals
TIMESCALEDB_BATCH_SIZE=5000
```

## Execução

```bash
pip install -r requirements.txt
python sync.py
```

Integre com Cron/systemd para executar a cada 2-5 minutos. O serviço registra logs e atualiza `sync_control` na TimescaleDB.
