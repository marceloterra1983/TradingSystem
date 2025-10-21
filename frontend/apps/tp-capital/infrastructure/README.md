# TP-Capital Infrastructure

## Local Development
```bash
cd frontend/apps/tp-capital/infrastructure
docker compose up --build
```

## Production Deployment
1. Ensure GitHub Actions has pushed the latest image to GHCR (`ghcr.io/<owner>/tp-capital-signals`).
2. Copy env file and update secrets:
   ```bash
   cp tp-capital-signals.env.example tp-capital-signals.env
   # edit tp-capital-signals.env with production credentials
   ```
3. Pull and run:
   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```
4. Verify health: `curl http://<host>:4005/health` and QuestDB UI at `http://<host>:9000`.
