---
title: TP Capital Ingestion
sidebar_position: 1
tags: [api]
domain: backend
type: index
summary: Node-based microservice that ingests TP Capital Telegram messages, normalizes the payload, and writes records into QuestDB.
status: active
last_review: "2025-10-23"
---

# TP Capital Ingestion

Node-based microservice that ingests TP Capital Telegram messages, normalizes the payload, and writes records into QuestDB.

## Features
- Telegram bot listener (polling or webhook).
- Message parser that extracts asset, buy range, targets, and stop.
- QuestDB line protocol writer with healthcheck endpoint.
- Prometheus /metrics endpoint.

## Getting Started
```bash
cd apps/tp-capital
cp .env.example .env
# Edit .env and set PORT=4005
npm install
npm run dev
```

Run QuestDB and the ingestion service via Docker Compose:
```bash
cd apps/tp-capital/infrastructure
docker compose up --build
```

Adjust environment variables to match production credentials (see .env.example).


### Seed sample data
```bash
npm run seed
```
Make sure QuestDB is running (e.g., via `docker compose up`) before seeding.

## Deployment

A GitHub Actions workflow (`.github/workflows/tp-capital.yml`) builds the Docker image and pushes it to GHCR on every push to `main`.

To run the production stack on a server:

```bash
cd apps/tp-capital/infrastructure
cp tp-capital.env.example tp-capital.env
# update secrets in tp-capital.env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

QuestDB data is persisted via the `questdb-data` volume.
