# Nova Arquitetura - MTProto Gateway Isolado

**Data**: 2025-11-14 21:00 BRT
**Status**: 🎯 **PROPOSTA DE REDESENHO ARQUITETURAL**
**Problema**: Arquitetura atual acopla Gateway API com MTProto, causando problemas recorrentes

---

## 🔴 Problemas Identificados na Arquitetura Atual

### Arquitetura Atual (Problemática)

```
┌──────────────────────────────────────────────────────────────┐
│                    BROWSER (Frontend)                        │
│  http://localhost:9082/#/telegram-gateway                    │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼ HTTP POST /api/telegram-gateway/sync-messages
┌──────────────────────────────────────────────────────────────┐
│               Traefik API Gateway (9082)                     │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼ Forward to port 4010
┌──────────────────────────────────────────────────────────────┐
│          Telegram Gateway REST API (4010)                    │
│  ❌ PROBLEMA: Depende de MTProto estar SEMPRE conectado     │
│  ❌ PROBLEMA: Cada request faz sync direto com Telegram     │
│  ❌ PROBLEMA: Não há separação de responsabilidades         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼ HTTP POST http://telegram-mtproto:4007/sync
┌──────────────────────────────────────────────────────────────┐
│        Telegram MTProto Gateway (4007)                       │
│  ❌ PROBLEMA: Sessão não persiste (container restart)       │
│  ❌ PROBLEMA: Autenticação interativa não funciona          │
│  ❌ PROBLEMA: Telegram client disconnects constantemente    │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼ MTProto Protocol
┌──────────────────────────────────────────────────────────────┐
│                  Telegram API Servers                        │
│                (api.telegram.org)                            │
└──────────────────────────────────────────────────────────────┘
```

### Falhas Críticas

1. **❌ Acoplamento Forte**: Gateway API → MTProto = dependência síncrona
2. **❌ Sessão Não Persiste**: Container restart = perda de autenticação
3. **❌ Sem Queue/Buffer**: Cada request frontend = request direto ao Telegram
4. **❌ Sem Fallback**: MTProto offline = Gateway API retorna 502
5. **❌ Sem Cache Inteligente**: Mensagens já baixadas são re-baixadas
6. **❌ Sem Retry Logic**: Falha temporária = erro imediato ao usuário

---

## ✅ Nova Arquitetura Proposta - MTProto Isolado

### Princípios de Design

1. **Isolamento**: MTProto é um serviço INDEPENDENTE que roda continuamente
2. **Assíncrono**: Gateway API não espera resposta imediata do MTProto
3. **Event-Driven**: Comunicação via RabbitMQ (já disponível na stack)
4. **Resiliente**: Gateway API funciona MESMO com MTProto offline
5. **Cacheable**: Redis cache para mensagens já baixadas
6. **Persistente**: Sessão Telegram persiste em volume Docker

### Diagrama da Nova Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                    BROWSER (Frontend)                        │
│  http://localhost:9082/#/telegram-gateway                    │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼ HTTP GET/POST /api/telegram-gateway/*
┌──────────────────────────────────────────────────────────────┐
│               Traefik API Gateway (9082)                     │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│          Telegram Gateway REST API (4010)                    │
│  ✅ SEMPRE responde (mesmo com MTProto offline)             │
│  ✅ Retorna dados de Redis Cache primeiro                   │
│  ✅ Enfileira pedidos no RabbitMQ para MTProto              │
│  ✅ Response imediato: 202 Accepted + Job ID                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ Publish Message
                     ▼
┌──────────────────────────────────────────────────────────────┐
│              RabbitMQ (Message Broker)                       │
│  Queue: telegram.sync.requests                               │
│  Queue: telegram.sync.responses                              │
│  Exchange: telegram.events                                   │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ Consume Messages (async)
                     ▼
┌──────────────────────────────────────────────────────────────┐
│     MTProto Worker Service (ISOLATED)                        │
│  ✅ Roda 24/7 mantendo sessão Telegram ativa                │
│  ✅ Processa fila RabbitMQ no seu próprio ritmo             │
│  ✅ Sessão persiste em /data/.session                       │
│  ✅ Não afeta Gateway API se offline                        │
│  ✅ Auto-reconnect em caso de desconexão                    │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼ Publish Results
┌──────────────────────────────────────────────────────────────┐
│              RabbitMQ (Response Queue)                       │
│  telegram.sync.responses → Gateway API consume              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│          Redis Cache + TimescaleDB                           │
│  ✅ Mensagens cacheadas por 5 min (Redis)                   │
│  ✅ Histórico completo (TimescaleDB)                         │
│  ✅ Gateway API lê daqui PRIMEIRO                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 Componentes da Nova Arquitetura

### 1. Gateway REST API (Port 4010) - REFATORADO

**Responsabilidades**:
- ✅ Autenticação de requests (X-Gateway-Token)
- ✅ Validação de payloads
- ✅ **Cache-first**: Busca dados no Redis antes de pedir MTProto
- ✅ **Async request**: Enfileira pedido no RabbitMQ se cache miss
- ✅ **Response imediato**: Retorna 202 Accepted + Job ID
- ✅ **Polling endpoint**: `/api/telegram-gateway/jobs/:id` para verificar status

**Exemplo de Flow**:

```javascript
// Frontend faz request
POST /api/telegram-gateway/sync-messages
{ limit: 50, channelId: "jonas" }

// Gateway API responde IMEDIATAMENTE
202 Accepted
{
  "jobId": "sync-abc123",
  "status": "queued",
  "pollUrl": "/api/telegram-gateway/jobs/sync-abc123"
}

// Frontend faz polling
GET /api/telegram-gateway/jobs/sync-abc123
{
  "jobId": "sync-abc123",
  "status": "processing", // ou "completed" ou "failed"
  "progress": 75,
  "result": { ... } // quando status=completed
}
```

### 2. MTProto Worker Service (Port 4007) - ISOLADO

**Características**:
- ✅ **Container rodando 24/7** (restart: always)
- ✅ **Não expõe HTTP API** (apenas consome RabbitMQ)
- ✅ **Sessão persiste**: Volume mount `/data/.session`
- ✅ **Auto-reconnect**: Reconnect lógica para Telegram
- ✅ **Graceful shutdown**: Aguarda fila esvaziar antes de parar

**Dockerfile do Worker**:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Dependências
COPY package*.json ./
RUN npm ci --production

# Código
COPY src/ ./src/

# Health check via RabbitMQ connection
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
  CMD node -e "require('./src/healthcheck.js')" || exit 1

# Worker mode (não HTTP server)
CMD ["node", "src/worker.js"]
```

**Worker Script (`worker.js`)**:

```javascript
const amqp = require('amqplib');
const { TelegramClient } = require('telegram');

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const SESSION_FILE = '/app/data/.session/telegram.session';

let telegramClient;
let rabbitConnection;
let rabbitChannel;

async function connectTelegram() {
  telegramClient = new TelegramClient(SESSION_FILE, apiId, apiHash, {
    connectionRetries: 5,
  });

  await telegramClient.start({
    phoneNumber: () => process.env.TELEGRAM_PHONE,
    password: () => process.env.TELEGRAM_PASSWORD,
    phoneCode: () => {
      // Para autenticação inicial, usar script interativo separado
      throw new Error('Interactive auth required - run auth script first');
    },
    onError: (err) => console.error('Telegram error:', err),
  });

  console.log('[Worker] Telegram client connected!');
}

async function connectRabbitMQ() {
  rabbitConnection = await amqp.connect(RABBITMQ_URL);
  rabbitChannel = await rabbitConnection.createChannel();

  // Assegurar que queues existem
  await rabbitChannel.assertQueue('telegram.sync.requests', { durable: true });
  await rabbitChannel.assertQueue('telegram.sync.responses', { durable: true });

  console.log('[Worker] RabbitMQ connected!');
}

async function processMessage(msg) {
  const request = JSON.parse(msg.content.toString());
  const { jobId, action, params } = request;

  console.log(`[Worker] Processing job ${jobId}: ${action}`);

  try {
    let result;

    switch (action) {
      case 'sync-messages':
        result = await syncMessages(params);
        break;
      case 'get-channels':
        result = await getChannels(params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Publicar resultado na response queue
    await rabbitChannel.sendToQueue(
      'telegram.sync.responses',
      Buffer.from(JSON.stringify({
        jobId,
        status: 'completed',
        result,
        timestamp: new Date().toISOString(),
      })),
      { persistent: true }
    );

    // Ack message
    rabbitChannel.ack(msg);

    console.log(`[Worker] Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`[Worker] Job ${jobId} failed:`, error);

    // Publicar erro
    await rabbitChannel.sendToQueue(
      'telegram.sync.responses',
      Buffer.from(JSON.stringify({
        jobId,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      })),
      { persistent: true }
    );

    // Nack message (requeue se não foi tentado muitas vezes)
    const retryCount = msg.properties.headers['x-retry-count'] || 0;
    if (retryCount < 3) {
      rabbitChannel.nack(msg, false, true);
    } else {
      rabbitChannel.ack(msg); // Descartar após 3 tentativas
    }
  }
}

async function syncMessages(params) {
  const { channelId, limit } = params;

  // Lógica real de sync com Telegram API
  const messages = await telegramClient.getMessages(channelId, { limit });

  return {
    count: messages.length,
    messages: messages.map(m => ({
      id: m.id,
      text: m.text,
      date: m.date,
      // ...
    })),
  };
}

async function main() {
  await connectTelegram();
  await connectRabbitMQ();

  // Consumir fila
  rabbitChannel.consume('telegram.sync.requests', processMessage, {
    noAck: false, // Manual ack
  });

  console.log('[Worker] Listening for jobs...');
}

main().catch(console.error);
```

### 3. Redis Cache Layer

**Cache Strategy**:

```javascript
// Gateway API code
async function getMessages(channelId, limit) {
  const cacheKey = `telegram:messages:${channelId}:${limit}`;

  // 1. Try Redis cache first (5 min TTL)
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('[Cache] HIT - Returning cached messages');
    return JSON.parse(cached);
  }

  console.log('[Cache] MISS - Enqueueing job');

  // 2. Enqueue job in RabbitMQ
  const jobId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  await rabbitChannel.sendToQueue(
    'telegram.sync.requests',
    Buffer.from(JSON.stringify({
      jobId,
      action: 'sync-messages',
      params: { channelId, limit },
    })),
    { persistent: true }
  );

  // 3. Store job metadata
  await redis.setex(`job:${jobId}`, 600, JSON.stringify({
    status: 'queued',
    createdAt: new Date().toISOString(),
  }));

  // 4. Return job ID for polling
  return { jobId, status: 'queued' };
}
```

### 4. Job Polling Endpoint

```javascript
// GET /api/telegram-gateway/jobs/:id
app.get('/jobs/:jobId', async (req, res) => {
  const { jobId } = req.params;

  // Buscar status do job no Redis
  const jobData = await redis.get(`job:${jobId}`);

  if (!jobData) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const job = JSON.parse(jobData);

  res.json({
    jobId,
    status: job.status, // queued | processing | completed | failed
    result: job.result, // se status=completed
    error: job.error, // se status=failed
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
});
```

---

## 📊 Comparação: Antes vs Depois

### Antes (Síncrono - Problemático)

```
Frontend → Gateway API → MTProto → Telegram API
          ↓ (aguarda)
         502 se MTProto offline
```

**Problemas**:
- ❌ Frontend aguarda resposta síncrona
- ❌ Gateway API trava se MTProto lento
- ❌ 502 Bad Gateway se MTProto offline
- ❌ Sem cache = sempre baixa mensagens
- ❌ Sem retry = falha temporária vira erro permanente

### Depois (Assíncrono - Resiliente)

```
Frontend → Gateway API → RabbitMQ → MTProto Worker → Telegram API
          ↓ (202 Accepted)      ↑ (consume async)
      jobId + pollUrl      Redis Cache HIT/MISS
```

**Benefícios**:
- ✅ Frontend recebe resposta IMEDIATA (202 Accepted)
- ✅ Gateway API SEMPRE funciona (mesmo MTProto offline)
- ✅ Cache Redis evita requests desnecessários
- ✅ RabbitMQ queue absorve picos de carga
- ✅ MTProto Worker processa no seu ritmo
- ✅ Retry automático via RabbitMQ (x-retry-count)
- ✅ Sessão Telegram persiste entre restarts

---

## 🚀 Plano de Migração

### Fase 1: Preparação (1-2 dias)

1. **Criar Docker volume para sessão**:
   ```yaml
   volumes:
     telegram-mtproto-session:
       name: telegram-mtproto-session
   ```

2. **Autenticação interativa inicial**:
   ```bash
   # Script one-time para autenticar e gerar .session
   docker exec -it telegram-mtproto node scripts/authenticate.js
   # Entrada de phone code via stdin
   ```

3. **Configurar RabbitMQ queues**:
   ```bash
   # Criar queues e exchanges via Management UI
   curl -X PUT http://localhost:15672/api/queues/telegram/telegram.sync.requests \
     -H "Content-Type: application/json" \
     -d '{"durable": true}'
   ```

### Fase 2: Refatoração MTProto Worker (2-3 dias)

1. Criar `worker.js` (código acima)
2. Implementar health check via RabbitMQ connection
3. Adicionar graceful shutdown handler
4. Testar sessão persistence entre restarts

### Fase 3: Refatoração Gateway API (2-3 dias)

1. Implementar cache-first logic (Redis)
2. Criar `/jobs/:id` polling endpoint
3. Mudar `/sync-messages` para async (202 Accepted)
4. Adicionar RabbitMQ producer logic

### Fase 4: Frontend Updates (1 dia)

1. Implementar polling logic no `useTelegramGateway.ts`
2. Adicionar loading states (queued, processing, completed)
3. Tratamento de erros async

### Fase 5: Validação E2E (1 dia)

1. Testar full flow: Frontend → Gateway → RabbitMQ → Worker → Telegram
2. Validar cache hit/miss scenarios
3. Testar MTProto Worker offline/online
4. Verificar sessão persistence

---

## ✅ Critérios de Sucesso

### Must-Have

- [ ] MTProto Worker roda 24/7 sem intervention
- [ ] Sessão Telegram persiste entre container restarts
- [ ] Gateway API retorna 202 Accepted (não 502)
- [ ] Cache Redis funciona (5 min TTL)
- [ ] Polling endpoint retorna job status
- [ ] Frontend exibe loading states corretamente

### Nice-to-Have

- [ ] WebSocket para notificação real-time (em vez de polling)
- [ ] Prometheus metrics (queue depth, processing time)
- [ ] Dead letter queue para mensagens falhadas
- [ ] Admin UI para visualizar RabbitMQ queues

---

## 📚 Referências Técnicas

### RabbitMQ

- [Work Queues Tutorial](https://www.rabbitmq.com/tutorials/tutorial-two-javascript.html)
- [Publisher Confirms](https://www.rabbitmq.com/confirms.html)
- [Dead Letter Exchanges](https://www.rabbitmq.com/dlx.html)

### Telegram Client

- [GramJS Documentation](https://gram.js.org/)
- [Session Management](https://gram.js.org/beta/modules/sessions.html)

### Async Patterns

- [Job Queue Pattern](https://www.enterpriseintegrationpatterns.com/patterns/messaging/JobQueuePattern.html)
- [Request-Reply Pattern](https://www.enterpriseintegrationpatterns.com/patterns/messaging/RequestReply.html)

---

**Status**: 🎯 **PROPOSTA COMPLETA - AGUARDANDO APROVAÇÃO PARA IMPLEMENTAÇÃO**

**Próxima Ação**: Validar proposta com stakeholder e iniciar Fase 1 (Preparação)

**Tempo Estimado Total**: 7-10 dias de implementação
