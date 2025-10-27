# Telegram Gateway REST API

REST API que expõe mensagens do Telegram capturadas pelo gateway pipeline e persistidas no TimescaleDB.

## 📋 Pré-requisitos

- Node.js v18+ 
- TimescaleDB rodando (PostgreSQL 14+ com extensão TimescaleDB)
- Gateway MTProto rodando em `apps/telegram-gateway` (para capturar mensagens)

## 🚀 Quick Start

### 1. Configuração do Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite o .env e configure:
# - TELEGRAM_GATEWAY_API_TOKEN (token de autenticação para API)
# - TELEGRAM_GATEWAY_DB_URL (connection string do TimescaleDB)
```

**Variáveis Essenciais:**

```bash
TELEGRAM_GATEWAY_API_TOKEN=gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA
TELEGRAM_GATEWAY_DB_URL=postgresql://timescale:changeme@localhost:5432/APPS-TELEGRAM-GATEWAY
```

### 2. Instalação e Inicialização

```bash
# Instale dependências
npm install

# (Opcional) Inicialize o banco de dados
# Apenas necessário na primeira vez ou após mudanças no schema
./scripts/init-database.sh

# Inicie o servidor
npm run dev
```

O servidor iniciará em `http://localhost:4010`

### 3. Validação

```bash
# Verifique o health check
curl http://localhost:4010/health

# Liste endpoints disponíveis
curl -H "X-Gateway-Token: gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA" \
  http://localhost:4010/

# Busque mensagens
curl -H "X-Gateway-Token: gw_secret_9K7j2mPq8nXwR5tY4vL1zD3fH6bN0sA" \
  "http://localhost:4010/api/messages?limit=10"
```

## 🏗️ Stack Completo (Recomendado)

Para ter o sistema completo funcionando, use o script de inicialização:

```bash
# Do diretório raiz do projeto
bash tools/scripts/start-local-telegram-gateway.sh
```

Este script irá:
1. ✅ Provisionar o banco TimescaleDB
2. ✅ Configurar variáveis de ambiente
3. ✅ Instalar dependências
4. ✅ Iniciar o Gateway MTProto (porta 4006)
5. ✅ Iniciar esta API REST (porta 4010)

## 📡 Endpoints

### Públicos (sem autenticação)

- `GET /health` - Health check do serviço
- `GET /metrics` - Métricas Prometheus

### Autenticados (requer `X-Gateway-Token`)

- `GET /` - Lista endpoints disponíveis
- `GET /api/messages` - Lista mensagens do Telegram
  - Query params: `limit`, `offset`, `channelId`, `since`, `until`
- `GET /api/channels` - Lista canais/chats monitorados
  - Query params: `limit`, `offset`, `active`

### Exemplos de Uso

**Buscar últimas 20 mensagens:**
```bash
curl -H "X-Gateway-Token: YOUR_TOKEN" \
  "http://localhost:4010/api/messages?limit=20"
```

**Buscar mensagens de um canal específico:**
```bash
curl -H "X-Gateway-Token: YOUR_TOKEN" \
  "http://localhost:4010/api/messages?channelId=1234567890&limit=50"
```

**Buscar mensagens em um período:**
```bash
curl -H "X-Gateway-Token: YOUR_TOKEN" \
  "http://localhost:4010/api/messages?since=2025-01-01&until=2025-01-31"
```

## 🔐 Autenticação

A API usa autenticação por token via header HTTP:

```
X-Gateway-Token: seu_token_aqui
```

O token deve corresponder à variável `TELEGRAM_GATEWAY_API_TOKEN` (ou `API_SECRET_TOKEN`) configurada no `.env`.

**⚠️ Importante:** Em produção, use tokens fortes e mantenha-os seguros!

## ⚙️ Configuração Avançada

### Variáveis de Ambiente

Veja `.env.example` para lista completa. Principais:

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `TELEGRAM_GATEWAY_API_PORT` | Porta do servidor | `4010` |
| `TELEGRAM_GATEWAY_API_TOKEN` | Token de autenticação | *(obrigatório)* |
| `TELEGRAM_GATEWAY_DB_URL` | Connection string do banco | *(obrigatório)* |
| `TELEGRAM_GATEWAY_DB_SCHEMA` | Schema do banco | `telegram_gateway` |
| `TELEGRAM_GATEWAY_DEFAULT_PAGE_SIZE` | Tamanho padrão da página | `50` |
| `TELEGRAM_GATEWAY_MAX_PAGE_SIZE` | Tamanho máximo da página | `200` |
| `LOG_LEVEL` | Nível de log (debug/info/warn/error) | `info` |

### Hierarquia de Configuração

As variáveis são carregadas na seguinte ordem (maior prioridade por último):

1. `config/.env.defaults` (projeto)
2. `.env` (raiz do projeto)
3. `.env.local` (sobrescritas locais)
4. `backend/api/telegram-gateway/.env` (específico do serviço)

Veja [backend/shared/config/README.md](../../shared/config/README.md) para detalhes.

## 🗄️ Database Migrations

O schema DDL vive em `backend/data/timescaledb/telegram-gateway`.

**Aplicar mudanças no schema:**

```bash
# Aplicar migrações
./scripts/init-database.sh

# Recriar do zero (⚠️ apaga dados!)
./scripts/init-database.sh --force
```

## 🐛 Troubleshooting

### Erro: "TELEGRAM_GATEWAY_API_TOKEN is required"

**Causa:** O arquivo `.env` não existe ou não contém o token.

**Solução:**
```bash
cp .env.example .env
# Edite .env e adicione TELEGRAM_GATEWAY_API_TOKEN
```

### Erro: "Failed to connect to database"

**Causa:** TimescaleDB não está rodando ou credenciais incorretas.

**Solução:**
```bash
# Verifique se o TimescaleDB está rodando
psql "$TELEGRAM_GATEWAY_DB_URL" -c "SELECT 1"

# Se não estiver, inicie-o ou ajuste TELEGRAM_GATEWAY_DB_URL
```

### Erro: "address already in use :4010"

**Causa:** Outro processo já está usando a porta 4010.

**Solução:**
```bash
# Encontre o processo
lsof -i :4010

# Finalize-o
kill <PID>
```

### Nenhuma mensagem retornada

**Possíveis causas:**
1. Gateway MTProto não está rodando (porta 4006)
2. Gateway não está autenticado no Telegram
3. Nenhum canal está sendo monitorado
4. Banco de dados vazio

**Solução:**
```bash
# Verifique o Gateway
curl http://localhost:4006/health

# Deve retornar: {"status":"healthy","telegram":"connected"}
# Se não, veja apps/telegram-gateway/README.md
```

## 📦 Scripts Disponíveis

```bash
npm run dev        # Inicia servidor em modo desenvolvimento (com hot reload)
npm start          # Inicia servidor em modo produção
npm run lint       # Executa linter
npm run lint:fix   # Corrige problemas de lint automaticamente
npm test           # Executa testes (se disponível)
```

## 🏗️ Arquitetura

```
┌─────────────────┐
│   Telegram      │
│   (MTProto)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐     ┌──────────────┐
│  Gateway        │────→│ TimescaleDB  │
│  (Port 4006)    │     │              │
└─────────────────┘     └──────┬───────┘
                               │
                               ↓
                        ┌──────────────┐
                        │  REST API    │
                        │  (Port 4010) │
                        └──────────────┘
```

1. **Gateway MTProto** (`apps/telegram-gateway`) conecta ao Telegram via MTProto
2. Mensagens são armazenadas no **TimescaleDB**
3. **REST API** (este serviço) expõe os dados via HTTP

## 📚 Recursos Adicionais

- [Documentação do TimescaleDB](https://docs.timescale.com/)
- [Telegram MTProto API](https://core.telegram.org/api)
- [Sistema de Configuração](../../shared/config/README.md)

## 🤝 Contribuindo

Ao fazer mudanças:
1. Atualize o `.env.example` se adicionar variáveis
2. Rode `npm run lint:fix` antes de commitar
3. Documente mudanças no schema em `backend/data/timescaledb/telegram-gateway`
4. Teste localmente com o script completo
