from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence

import psycopg2
from psycopg2.extras import execute_values, Json
import requests

from config import settings

logging.basicConfig(level=settings.log_level.upper(), format='[%(asctime)s] %(levelname)s %(message)s')
logger = logging.getLogger(__name__)


def fetch_last_synced(conn) -> Optional[datetime]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT last_synced
            FROM sync_control
            WHERE stream = %s
            """,
            (settings.replication_stream_name,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return row[0]


def update_last_synced(conn, last_synced: datetime):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO sync_control (stream, last_synced)
            VALUES (%s, %s)
            ON CONFLICT (stream)
            DO UPDATE SET last_synced = EXCLUDED.last_synced, updated_at = NOW()
            """,
            (settings.replication_stream_name, last_synced),
        )
    conn.commit()


def build_query(last_synced: Optional[datetime]) -> str:
    if last_synced is None:
        return settings.questdb_query
    return settings.questdb_incremental_query.replace('{last_synced}', last_synced.isoformat())


def fetch_questdb_rows(query: str) -> List[Dict[str, Any]]:
    resp = requests.get(f"{settings.questdb_rest_url}/exec", params={'query': query}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    columns = [col['name'] for col in payload.get('columns', [])]
    dataset: Sequence[Sequence[Any]] = payload.get('dataset', [])
    rows: List[Dict[str, Any]] = []
    for raw in dataset:
        row = {columns[idx]: value for idx, value in enumerate(raw)}
        if 'created_at' in row and isinstance(row['created_at'], str):
            row['created_at'] = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')).astimezone(timezone.utc)
        rows.append(row)
    return rows


def transform_rows(rows: List[Dict[str, Any]]) -> List[tuple]:
    transformed = []
    for row in rows:
        transformed.append(
            (
                row.get('signal_id') or row.get('id') or row.get('trade_id'),
                row.get('source', 'questdb'),
                row.get('symbol'),
                row.get('direction'),
                row.get('confidence'),
                Json(row),
                row.get('created_at'),
            )
        )
    return transformed


def insert_into_timescale(conn, batch: List[tuple]):
    if not batch:
        return
    insert_sql = """
    INSERT INTO trading_signals (
        signal_id, source, symbol, direction, confidence, payload, created_at, ingested_at
    )
    VALUES %s
    ON CONFLICT (signal_id) DO UPDATE
    SET payload = EXCLUDED.payload,
        confidence = EXCLUDED.confidence,
        created_at = EXCLUDED.created_at,
        ingested_at = NOW()
    """
    with conn.cursor() as cur:
        execute_values(cur, insert_sql, [row + (datetime.now(timezone.utc),) for row in batch], page_size=settings.batch_size)
    conn.commit()


def main():
    logger.info('Inicializando sincronização QuestDB → TimescaleDB')
    conn = psycopg2.connect(settings.timescaledb_dsn)
    try:
        last_synced = fetch_last_synced(conn)
        query = build_query(last_synced)
        logger.info('Executando consulta QuestDB: %s', query)
        rows = fetch_questdb_rows(query)
        if not rows:
            logger.info('Nenhuma linha nova encontrada. Última sincronização permanece %s', last_synced)
            return
        batch = transform_rows(rows)
        insert_into_timescale(conn, batch)
        latest_created = max(row[6] for row in batch if row[6] is not None)
        if latest_created:
            update_last_synced(conn, latest_created)
            logger.info('Sincronização concluída. Última linha em %s', latest_created.isoformat())
    finally:
        conn.close()


if __name__ == '__main__':
    main()
