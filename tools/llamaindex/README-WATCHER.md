# Documentation File Watcher

Monitora alterações em `docs/content/` e aciona re-ingestão automaticamente para FlexSearch e Qdrant.

## 🚀 Uso

### Instalação

```bash
cd tools/llamaindex
npm install
```

### Executar Watcher

```bash
# Modo normal (aciona re-ingestão real)
npm run watch

# Modo dry-run (apenas loga mudanças, sem API calls)
npm run watch:dry
```

### Configuração (Variáveis de Ambiente)

```bash
# Diretório de documentação (padrão: ../../docs/content)
export DOCS_DIR=/path/to/docs

# URL base da Documentation API (padrão: http://localhost:3401)
export DOCS_API_URL=http://localhost:3401

# Debounce em milissegundos (padrão: 5000)
export WATCH_DEBOUNCE_MS=5000

# Modo dry-run (padrão: false)
export DRY_RUN=true
```

## 📋 Funcionalidades

- ✅ **Monitoramento Recursivo**: Assiste todos os subdiretórios de `docs/content/`
- ✅ **Filtro de Arquivos**: Apenas `.md` e `.mdx` são monitorados
- ✅ **Debouncing**: Agrupa mudanças rápidas (padrão: 5s)
- ✅ **Re-ingestão Dual**:
  - FlexSearch: `POST /api/v1/docs/reindex`
  - Qdrant: `POST /api/v1/rag/status/ingest`
- ✅ **Modo Dry-Run**: Teste sem acionar APIs
- ✅ **Graceful Shutdown**: Ctrl+C para parar

## 🔧 Integração

### systemd (Linux)

Criar `/etc/systemd/system/docs-watcher.service`:

```ini
[Unit]
Description=Documentation File Watcher
After=network.target

[Service]
Type=simple
User=marce
WorkingDirectory=/home/marce/Projetos/TradingSystem/tools/llamaindex
Environment="NODE_ENV=production"
Environment="DOCS_DIR=/home/marce/Projetos/TradingSystem/docs/content"
Environment="DOCS_API_URL=http://localhost:3401"
ExecStart=/usr/bin/npm run watch
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable docs-watcher
sudo systemctl start docs-watcher
sudo systemctl status docs-watcher
```

### Docker Compose

Adicionar serviço no `docker-compose.yml`:

```yaml
services:
  docs-watcher:
    image: node:18-alpine
    container_name: docs-watcher
    working_dir: /app
    command: npm run watch
    volumes:
      - ./tools/llamaindex:/app
      - ./docs/content:/docs:ro
    environment:
      - DOCS_DIR=/docs
      - DOCS_API_URL=http://documentation-api:3401
      - WATCH_DEBOUNCE_MS=5000
    restart: unless-stopped
    depends_on:
      - documentation-api
```

### PM2 (Node.js Process Manager)

```bash
pm2 start tools/llamaindex/watch-docs.js --name docs-watcher
pm2 save
pm2 startup
```

## 📊 Monitoramento

O watcher loga todas as atividades:

```
📚 Documentation File Watcher
   Watching: /home/marce/Projetos/TradingSystem/docs/content
   API: http://localhost:3401
   Debounce: 5000ms
   Dry Run: NO

👀 Watching for changes... (Press Ctrl+C to stop)

📝 Modified: apps/workspace/overview.md

🔄 Triggering re-ingestion (1 changes detected)...
   📇 Re-indexing FlexSearch...
   ✅ FlexSearch: 203 files indexed
   🔍 Re-ingesting Qdrant...
   ✅ Qdrant: 293 documents processed

✨ Re-ingestion completed successfully
```

## 🐛 Troubleshooting

### Watcher não detecta mudanças

- Verifique se o diretório existe: `ls $DOCS_DIR`
- Aumente o debounce: `WATCH_DEBOUNCE_MS=10000`
- Teste em dry-run: `npm run watch:dry`

### Re-ingestão falha

- Verifique se a Documentation API está rodando: `curl http://localhost:3401/health`
- Verifique logs do LlamaIndex: `docker logs tools-llamaindex-ingestion`
- Rate limit: Aguarde 1 minuto entre reindex (proteção built-in)

### Performance

- Watcher é leve (~10MB RAM)
- Re-ingestão consome GPU durante processamento
- Ajuste o debounce para ambientes com muitas mudanças
