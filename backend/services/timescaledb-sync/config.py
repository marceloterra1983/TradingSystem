from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    questdb_rest_url: str = os.getenv('QUESTDB_REST_URL', 'http://localhost:9000')
    questdb_query: str = os.getenv(
        'QUESTDB_QUERY',
        "SELECT * FROM tp_capital_signals WHERE created_at > now() - 24h",
    )
    questdb_incremental_query: str = os.getenv(
        'QUESTDB_INCREMENTAL_QUERY',
        "SELECT * FROM tp_capital_signals WHERE created_at > TIMESTAMP '{last_synced}' ORDER BY created_at",
    )
    timescaledb_dsn: str = os.getenv(
        'TIMESCALEDB_DSN',
        'postgresql://timescale:pass_timescale@localhost:5433/tradingsystem',
    )
    replication_stream_name: str = os.getenv('TIMESCALEDB_STREAM', 'tp_capital_signals')
    batch_size: int = int(os.getenv('TIMESCALEDB_BATCH_SIZE', '5000'))
    log_level: str = os.getenv('TIMESCALEDB_SYNC_LOG_LEVEL', 'INFO')


settings = Settings()
