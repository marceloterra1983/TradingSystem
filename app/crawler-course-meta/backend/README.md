# Crawler Course Meta – Backend

API + CLI em Node.js/TypeScript responsável por orquestrar Crawlee/Playwright, expor endpoints REST e gerar métricas Prometheus.

## Scripts

```bash
npm run dev       # inicia API em modo watch (tsx)
npm run build     # compila para dist/
npm run start     # executa versão compilada
npm run cli -- run ./jobs/job-hotmart.yml
```

## Endpoints

- `GET /health`
- `GET /api/jobs` / `POST /api/jobs`
- `POST /api/jobs/:id/run` / `POST /api/jobs/:id/dry-run`
- `GET /api/jobs/:id/artifacts` / `GET /api/jobs/:id/report`
- `GET /api/plugins`
- `POST /api/sessions/login|logout`
- `GET /api/metrics`

## Observabilidade

Prometheus coleta em `/api/metrics` (ou `PROMETHEUS_PORT`). Métricas principais: `crawler_pages_visited_total`, `crawler_items_extracted_total`, `crawler_errors_total`, `crawler_runtime_seconds`.

## Outputs

Artefatos ficam em `outputs/crawler-course-meta/<jobId>/<runId>/` (json, md, report, screenshots placeholder). O caminho pode ser alterado via `CCM_OUTPUT_ROOT`.
