-- =============================================================================
-- WebScraper Development Seed
-- =============================================================================

INSERT INTO scrape_templates (id, name, description, url_pattern, options, usage_count)
VALUES
  (
    gen_random_uuid(),
    'GitHub Repository',
    'Scrape README and metadata from GitHub repositories.',
    '^https://github\\.com/.+',
    '{
      "formats": ["markdown", "links"],
      "onlyMainContent": true,
      "waitFor": 0,
      "timeout": 15000,
      "includeTags": ["article"],
      "excludeTags": ["nav", "footer"]
    }',
    12
  ),
  (
    gen_random_uuid(),
    'Documentation Site',
    'Optimised for docs portals and knowledge bases.',
    '.*/docs/.*',
    '{
      "formats": ["markdown", "html"],
      "onlyMainContent": true,
      "waitFor": 500,
      "timeout": 20000,
      "includeTags": ["main"],
      "excludeTags": ["aside"]
    }',
    8
  ),
  (
    gen_random_uuid(),
    'News Article',
    'Captures headline, body text and screenshot for news sites.',
    '.*/article/.*',
    '{
      "formats": ["markdown", "screenshot"],
      "onlyMainContent": true,
      "waitFor": 1000,
      "timeout": 25000,
      "includeTags": ["article"],
      "excludeTags": ["aside", "footer"]
    }',
    5
  )
ON CONFLICT (name) DO NOTHING;

WITH template_map AS (
  SELECT name, id FROM scrape_templates WHERE name IN ('GitHub Repository', 'Documentation Site', 'News Article')
)
INSERT INTO scrape_jobs (
  id,
  type,
  url,
  status,
  firecrawl_job_id,
  template_id,
  options,
  results,
  error,
  started_at,
  completed_at,
  duration_seconds
)
VALUES
  (
    gen_random_uuid(),
    'scrape',
    'https://github.com/tradingsystem/platform',
    'completed',
    NULL,
    (SELECT id FROM template_map WHERE name = 'GitHub Repository'),
    '{
      "url": "https://github.com/tradingsystem/platform",
      "formats": ["markdown", "links"],
      "onlyMainContent": true
    }',
    '{
      "markdown": "# TradingSystem Platform\\n...sample markdown...",
      "links": ["https://github.com/tradingsystem/platform/issues"]
    }',
    NULL,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days' + INTERVAL '5 minutes',
    300
  ),
  (
    gen_random_uuid(),
    'crawl',
    'https://docs.tradingsystem.local',
    'running',
    'crawl_job_demo_123',
    (SELECT id FROM template_map WHERE name = 'Documentation Site'),
    '{
      "url": "https://docs.tradingsystem.local",
      "limit": 25,
      "maxDepth": 3,
      "scrapeOptions": {
        "formats": ["markdown", "html"],
        "onlyMainContent": true
      }
    }',
    '{
      "id": "crawl_job_demo_123",
      "status": "scraping",
      "total": 25,
      "completed": 7
    }',
    NULL,
    NOW() - INTERVAL '3 hours',
    NULL,
    NULL
  ),
  (
    gen_random_uuid(),
    'scrape',
    'https://news.example.com/article/ai-markets',
    'failed',
    NULL,
    (SELECT id FROM template_map WHERE name = 'News Article'),
    '{
      "url": "https://news.example.com/article/ai-markets",
      "formats": ["markdown", "screenshot"],
      "onlyMainContent": true
    }',
    NULL,
    'Timeout while waiting for dynamic content',
    NOW() - INTERVAL '12 hours',
    NOW() - INTERVAL '12 hours' + INTERVAL '90 seconds',
    90
  )
ON CONFLICT DO NOTHING;

-- Seed export jobs
INSERT INTO export_jobs (
  id,
  name,
  description,
  export_type,
  formats,
  filters,
  status,
  file_paths,
  row_count,
  file_size_bytes,
  started_at,
  completed_at,
  expires_at,
  created_at
) VALUES
  (
    gen_random_uuid(),
    'Completed Jobs Snapshot',
    'Latest successful jobs for data pipeline.',
    'jobs',
    ARRAY['csv','json'],
    '{"status":"completed"}'::jsonb,
    'completed',
    '{"csv":"/tmp/webscraper-exports/sample/jobs.csv","json":"/tmp/webscraper-exports/sample/jobs.json","zip":"/tmp/webscraper-exports/sample/export.zip"}'::jsonb,
    156,
    524288,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour 50 minutes',
    NOW() + INTERVAL '22 hours',
    NOW() - INTERVAL '2 hours'
  ),
  (
    gen_random_uuid(),
    'Template Library Backup',
    'Nightly template audit for compliance.',
    'templates',
    ARRAY['json'],
    NULL,
    'completed',
    '{"json":"/tmp/webscraper-exports/sample/templates.json"}'::jsonb,
    8,
    4096,
    NOW() - INTERVAL '18 hours',
    NOW() - INTERVAL '17 hours 50 minutes',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '18 hours'
  ),
  (
    gen_random_uuid(),
    'Failed Jobs Investigation',
    'Troubleshooting recent failures.',
    'jobs',
    ARRAY['csv','parquet'],
    '{"status":"failed"}'::jsonb,
    'processing',
    NULL,
    NULL,
    NULL,
    NOW() - INTERVAL '5 minutes',
    NULL,
    NOW() + INTERVAL '23 hours 55 minutes',
    NOW() - INTERVAL '5 minutes'
  )
ON CONFLICT DO NOTHING;

WITH template_map AS (
  SELECT name, id FROM scrape_templates WHERE name IN ('GitHub Repository', 'Documentation Site', 'News Article')
)
INSERT INTO job_schedules (
  id,
  name,
  description,
  template_id,
  url,
  schedule_type,
  cron_expression,
  interval_seconds,
  scheduled_at,
  enabled,
  last_run_at,
  next_run_at,
  run_count,
  failure_count,
  options
)
VALUES
  (
    gen_random_uuid(),
    'Daily GitHub Trending',
    'Scrape GitHub trending repositories every weekday morning.',
    (SELECT id FROM template_map WHERE name = 'GitHub Repository'),
    'https://github.com/trending',
    'cron',
    '0 9 * * *',
    NULL,
    NULL,
    TRUE,
    NULL,
    (DATE_TRUNC('day', NOW()) + INTERVAL '9 hours')
      + CASE WHEN NOW() >= DATE_TRUNC('day', NOW()) + INTERVAL '9 hours' THEN INTERVAL '1 day' ELSE INTERVAL '0 day' END,
    0,
    0,
    '{"formats": ["markdown", "links"]}'
  ),
  (
    gen_random_uuid(),
    'Hourly Docs Monitor',
    'Monitor documentation site hourly for new changes.',
    (SELECT id FROM template_map WHERE name = 'Documentation Site'),
    'https://docs.example.com',
    'interval',
    NULL,
    3600,
    NULL,
    TRUE,
    NOW() - INTERVAL '30 minutes',
    NOW() + INTERVAL '30 minutes',
    24,
    0,
    '{"limit": 10}'
  ),
  (
    gen_random_uuid(),
    'Quarterly Report Scrape',
    'One-time scrape for upcoming quarterly report release.',
    (SELECT id FROM template_map WHERE name = 'News Article'),
    'https://news.example.com/quarterly-report',
    'one-time',
    NULL,
    NULL,
    NOW() + INTERVAL '7 days',
    TRUE,
    NULL,
    NOW() + INTERVAL '7 days',
    0,
    0,
    '{"formats": ["markdown", "screenshot"]}'
  ),
  (
    gen_random_uuid(),
    'Disabled Test Schedule',
    'Disabled schedule used for testing scheduler behaviour.',
    NULL,
    'https://test.example.com',
    'interval',
    NULL,
    300,
    NULL,
    FALSE,
    NULL,
    NULL,
    0,
    0,
    '{}'
  )
ON CONFLICT DO NOTHING;
