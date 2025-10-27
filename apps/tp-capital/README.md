---
title: TP Capital Ingestion
sidebar_position: 1
tags: [api]
domain: backend
type: index
summary: Node-based microservice that ingests TP Capital Telegram messages, normalizes the payload, and writes records into TimescaleDB.
status: active
last_review: "2025-10-23"
---

# TP Capital Ingestion

Node-based microservice that ingests TP Capital Telegram messages, normalizes the payload, and writes records into TimescaleDB.

## Features
- Telegram bot listener (polling or webhook).
- Message parser that extracts asset, buy range, targets, and stop.
- TimescaleDB writer with healthcheck endpoint.
- Prometheus /metrics endpoint.

## Getting Started
```bash
cd apps/tp-capital
cp .env.example .env  # fill Telegram tokens as needed
npm install
npm run dev
```

### Docker Compose stack (service + TimescaleDB)
```bash
cd apps/tp-capital
cp .env.example .env
# optional: adjust passwords/ports in .env
docker compose up -d

# initialise or reset the schema
./scripts/init-database.sh        # append --force to recreate from scratch
```

The stack exposes the API on `http://localhost:4005` and TimescaleDB on `localhost:5445`. Override the host port with `TIMESCALEDB_HOST_PORT` if it conflicts with another PostgreSQL instance.

### Seed sample data
```bash
npm run seed
```
Ensure the Docker stack (or your target TimescaleDB instance) is running before seeding.

## Deployment

A GitHub Actions workflow (`.github/workflows/tp-capital.yml`) builds the Docker image and pushes it to GHCR on every push to `main`.

To run the production stack on a server:

```bash
cd apps/tp-capital
docker compose build
docker compose push
```

TimescaleDB data is persisted via the `tp-capital-timescaledb-data` volume.
