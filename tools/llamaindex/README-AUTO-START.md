# Auto-Start Documentation Watcher

O **docs-watcher** agora é **iniciado automaticamente** com o projeto!

## 🚀 Inicialização Automática

### Via Scripts Universais (Recomendado)

```bash
# Inicia TODO o projeto (Docker + Node.js + docs-watcher)
bash scripts/universal/start.sh

# Ou usando o atalho (se instalado)
start
```

O watcher é iniciado automaticamente como parte do stack de serviços Node.js, **dependendo do docs-api** (aguarda docs-api estar online antes de iniciar).

### Parar Tudo (Incluindo Watcher)

```bash
# Para todos os serviços
bash scripts/universal/stop.sh

# Ou usando o atalho
stop

# Force kill (SIGKILL)
stop --force
```

## 📋 Status do Watcher

### Verificar se está Rodando

```bash
# Verificar processo
ps aux | grep watch-docs.js | grep -v grep

# Ver logs em tempo real
tail -f /tmp/tradingsystem-logs/docs-watcher.log

# Verificar última atividade
ls -lh /tmp/tradingsystem-logs/docs-watcher.log
```

### Logs e Troubleshooting

**Localização dos logs:** `/tmp/tradingsystem-logs/docs-watcher.log`

```bash
# Ver últimas 50 linhas
tail -50 /tmp/tradingsystem-logs/docs-watcher.log

# Ver em tempo real
tail -f /tmp/tradingsystem-logs/docs-watcher.log

# Buscar erros
grep -i "error\|failed" /tmp/tradingsystem-logs/docs-watcher.log
```

## 🔧 Gerenciamento Manual

### Iniciar Apenas o Watcher

```bash
cd tools/llamaindex
npm run watch &
```

### Parar Apenas o Watcher

```bash
pkill -f watch-docs.js

# Ou force kill
pkill -9 -f watch-docs.js
```

### Reiniciar Apenas o Watcher

```bash
pkill -f watch-docs.js && cd tools/llamaindex && npm run watch &
```

## 📊 Monitoramento

### Verificar Atividade

O watcher loga toda atividade de re-ingestão:

```bash
# Ver logs
tail -f /tmp/tradingsystem-logs/docs-watcher.log

# Contar re-ingestões hoje
grep "Re-ingestion completed" /tmp/tradingsystem-logs/docs-watcher.log | grep $(date +%Y-%m-%d) | wc -l
```

### Status do RAG

```bash
# Ver status completo
curl http://localhost:3401/api/v1/rag/status | jq '{
  services,
  qdrant: {collection, count},
  documentation: {total, indexed, missing}
}'
```

## 🎯 Como Funciona

1. **Startup Sequence:**
   ```
   Docker containers → docs-api → docs-watcher
   ```

2. **Watcher monitora:** `docs/content/` recursivamente

3. **Ao detectar mudanças:**
   - Debounce de 5 segundos (agrupa mudanças)
   - Re-indexa FlexSearch (`/api/v1/docs/reindex`)
   - Re-ingere Qdrant (`/api/v1/rag/status/ingest`)
   - Loga resultado

4. **Auto-restart:** Se o watcher crashar, o script de start pode ser reexecutado

## ⚙️ Configuração

### Variáveis de Ambiente (`.env`)

```bash
# Diretório monitorado (padrão: docs/content)
DOCS_DIR=/path/to/docs

# URL da Documentation API (padrão: http://localhost:3401)
DOCS_API_URL=http://localhost:3401

# Debounce em ms (padrão: 5000)
WATCH_DEBOUNCE_MS=5000
```

### Desabilitar Watcher

Se você NÃO quiser que o watcher inicie automaticamente, comente a linha no `start.sh`:

```bash
# Editar scripts/universal/start.sh
# Comentar a linha:
# ["docs-watcher"]="tools/llamaindex::npm run watch::docs-api:1"
```

## 🔄 Opções Alternativas

### PM2 (Auto-Restart + Startup)

Para gerenciamento mais robusto com auto-restart:

```bash
npm install -g pm2
cd tools/llamaindex
pm2 start watch-docs.js --name docs-watcher
pm2 save
pm2 startup
```

**Comandos PM2:**
```bash
pm2 list              # Ver status
pm2 logs docs-watcher # Ver logs
pm2 restart docs-watcher
pm2 stop docs-watcher
pm2 delete docs-watcher
```

### systemd (Linux Native)

Para iniciar com o sistema operacional, ver `README-WATCHER.md` seção systemd.

## 🐛 Troubleshooting

### Watcher não inicia

```bash
# 1. Verificar se docs-api está rodando
curl http://localhost:3401/health

# 2. Verificar dependências npm
cd tools/llamaindex
npm install

# 3. Tentar manual
npm run watch

# 4. Ver logs de erro
tail -100 /tmp/tradingsystem-logs/docs-watcher.log
```

### Múltiplas instâncias rodando

```bash
# Parar todas
pkill -9 -f watch-docs.js

# Verificar
ps aux | grep watch-docs.js | grep -v grep

# Reiniciar limpo
cd tools/llamaindex
npm run watch &
```

### Re-ingestão não aciona

```bash
# 1. Verificar se watcher detecta mudanças
tail -f /tmp/tradingsystem-logs/docs-watcher.log

# 2. Tocar um arquivo de teste
touch docs/content/test.md
# Deve aparecer no log em ~5 segundos

# 3. Verificar APIs manualmente
curl -X POST http://localhost:3401/api/v1/docs/reindex
curl -X POST http://localhost:3401/api/v1/rag/status/ingest
```

## 📚 Recursos

- **Watcher Script:** `tools/llamaindex/watch-docs.js`
- **Startup Script:** `scripts/universal/start.sh`
- **Stop Script:** `scripts/universal/stop.sh`
- **Documentação Completa:** `tools/llamaindex/README-WATCHER.md`
- **Análise RAG:** `governance/audits/RAG-SYSTEM-ANALYSIS-2025-10-29.md`
