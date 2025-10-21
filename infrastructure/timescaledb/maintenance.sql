-- Compress dados com mais de 7 dias, reter 90 dias
SELECT add_compression_policy('trading_signals', INTERVAL '7 days');
SELECT add_compression_policy('executions', INTERVAL '7 days');
SELECT add_compression_policy('performance_metrics', INTERVAL '3 days');

SELECT add_retention_policy('trading_signals', INTERVAL '90 days');
SELECT add_retention_policy('executions', INTERVAL '90 days');
SELECT add_retention_policy('performance_metrics', INTERVAL '180 days');

-- Job para atualizar estatísticas básicas diariamente
CREATE OR REPLACE PROCEDURE refresh_signal_stats()
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM performance_metrics WHERE metric = 'signals_count_daily' AND bucket = date_trunc('day', now());
  INSERT INTO performance_metrics (bucket, metric, value)
  SELECT date_trunc('day', now()), 'signals_count_daily', COUNT(*)
  FROM trading_signals
  WHERE created_at >= date_trunc('day', now());
END;
$$;

SELECT add_job('refresh_signal_stats', '1 hour');

-- =============================================================================
-- WebScraper Maintenance Queries
-- =============================================================================

-- Check hypertable health
SELECT 
  h.hypertable_name,
  h.num_chunks,
  pg_size_pretty(hypertable_size(format('%I.%I', h.schema_name, h.table_name))) AS total_size,
  pg_size_pretty(hypertable_compressed_size(format('%I.%I', h.schema_name, h.table_name))) AS compressed_size
FROM timescaledb_information.hypertables h
WHERE h.hypertable_name = 'scrape_jobs';

-- Check compression status by chunk
SELECT 
  chunk_name,
  range_start,
  range_end,
  is_compressed,
  pg_size_pretty(before_compression_total_bytes) AS before_size,
  pg_size_pretty(after_compression_total_bytes) AS after_size,
  ROUND(100.0 * after_compression_total_bytes / NULLIF(before_compression_total_bytes, 0), 2) AS compression_ratio
FROM chunk_compression_stats('scrape_jobs')
ORDER BY range_start DESC
LIMIT 20;

-- Check continuous aggregate freshness
SELECT 
  ca.view_name,
  ca.materialization_hypertable_name,
  j.schedule_interval,
  j.last_run_started_at,
  j.last_run_status
FROM timescaledb_information.continuous_aggregates ca
LEFT JOIN timescaledb_information.jobs j ON j.hypertable_name = ca.materialization_hypertable_name
WHERE ca.view_name = 'scrape_jobs_daily_stats';

-- Check policy status
SELECT 
  j.job_id,
  j.application_name,
  j.schedule_interval,
  j.max_runtime,
  j.next_start,
  j.last_run_status,
  j.last_run_started_at
FROM timescaledb_information.jobs j
WHERE j.hypertable_name = 'scrape_jobs'
ORDER BY j.application_name;

-- Manually compress specific chunk (if needed)
-- SELECT compress_chunk('_timescaledb_internal._hyper_X_Y_chunk');

-- Manually refresh continuous aggregate (if needed)
-- CALL refresh_continuous_aggregate('scrape_jobs_daily_stats', NOW() - INTERVAL '7 days', NOW());

-- Check for bloated indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public' 
  AND tablename IN ('scrape_jobs', 'scrape_templates', 'job_schedules')
ORDER BY pg_relation_size(indexrelid) DESC;

-- Vacuum analyze (run periodically)
-- VACUUM ANALYZE scrape_jobs;
-- VACUUM ANALYZE scrape_templates;
-- VACUUM ANALYZE job_schedules;
