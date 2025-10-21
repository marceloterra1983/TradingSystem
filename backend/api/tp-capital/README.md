# TP Capital Ingestion

Node-based microservice that ingests TP Capital Telegram messages, normalizes the payload, and writes records into QuestDB.

## Features
- Telegram bot listener (polling or webhook).
- Message parser that extracts asset, buy range, targets, and stop.
- QuestDB line protocol writer with healthcheck endpoint.
- Prometheus /metrics endpoint.

## Getting Started
```bash
cd backend/api/tp-capital
cp .env.example .env
npm install
npm run dev
```

Run QuestDB and the ingestion service via Docker Compose:
```bash
cd infrastructure/tp-capital
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
cd infrastructure/tp-capital
cp tp-capital.env.example tp-capital.env
# update secrets in tp-capital.env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

QuestDB data is persisted via the `questdb-data` volume.
