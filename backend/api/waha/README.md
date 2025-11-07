# WAHA Webhook Service

Service responsável por receber eventos enviados pelo WAHA (WhatsApp HTTP API)
e encaminhá-los para a stack TradingSystem. Ele expõe um único endpoint HTTP
(`POST /webhooks/waha`) que valida um token compartilhado e registra as cargas
recebidas para processamento posterior.

## Features

- Recebe `message`, `message.ack`, `session.status` ou qualquer outro evento
  configurado na instância WAHA.
- Valida o header `X-WAHA-TOKEN` usando `WAHA_WEBHOOK_TOKEN`.
- Responde em `~20ms` com `204 No Content` para evitar reenvios desnecessários.
- Health-check exposto em `GET /healthz`.
- Logging estruturado via `pino`.

## Scripts

```bash
npm run dev      # Hot reload com tsx
npm run build    # Compila para ./dist
npm start        # Executa o bundle compilado
```

## Environment Variables

| Variável                | Default | Descrição                                           |
|-------------------------|---------|-----------------------------------------------------|
| `WAHA_WEBHOOK_PORT`     | `3908`  | Porta HTTP exposta pelo serviço                     |
| `WAHA_WEBHOOK_TOKEN`    | -       | Token obrigatório enviado em `X-WAHA-TOKEN`         |
| `WAHA_HOOK_URL`         | -       | URL configurada no WAHA para apontar para este app  |
| `WAHA_HOOK_EVENTS`      | -       | Lista de eventos (ex.: `message,message.ack`)       |

No `docker-compose.waha.yml` o serviço é exposto como `waha-webhook`. A URL
interna padrão utilizada pelo WAHA é
`http://waha-webhook:3908/webhooks/waha`.

## WAHA integration quick steps

1. Ajuste o `.env` (ou `.env.local`):

   ```bash
   WAHA_WEBHOOK_PORT=3908
   WAHA_WEBHOOK_TOKEN="CHANGE_ME_STRONG_TOKEN"
   WAHA_HOOK_URL=http://waha-webhook:3908/webhooks/waha
   WAHA_HOOK_EVENTS=message,message.ack,session.status
   WAHA_HOOK_CUSTOM_HEADERS=X-WAHA-TOKEN:${WAHA_WEBHOOK_TOKEN}
   ```

2. Recrie o stack:

   ```bash
   set -a && source .env
   docker compose -f tools/compose/docker-compose.waha.yml up -d --build
   ```

3. Valide enviando/recebendo mensagens no WAHA; os eventos aparecerão nos logs
   deste serviço.
