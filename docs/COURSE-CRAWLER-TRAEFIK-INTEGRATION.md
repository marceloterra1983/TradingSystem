# Course Crawler - Integração com Traefik API Gateway

**Data:** 2025-11-13 | **Status:** ✅ INTEGRADO

## Resumo

O Course Crawler foi integrado ao Traefik API Gateway, permitindo acesso centralizado via `http://localhost:9082/api/courses/*`.

## Configuração Implementada

### Docker Compose (`docker-compose.4-5-course-crawler-stack.yml`)

```yaml
services:
  course-crawler-api:
    networks:
      - default
      - tradingsystem_backend  # ✅ Conectado ao gateway

    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=tradingsystem_backend"
      - "traefik.http.routers.course-crawler.rule=PathPrefix(`/api/courses`)"
      - "traefik.http.routers.course-crawler.priority=85"
      - "traefik.http.routers.course-crawler.entrypoints=web"
      - "traefik.http.services.course-crawler.loadbalancer.server.port=3601"
      - "traefik.http.middlewares.course-crawler-strip.stripprefix.prefixes=/api/courses"
      - "traefik.http.routers.course-crawler.middlewares=course-crawler-strip"
```

## Acesso

### Via Traefik Gateway (RECOMENDADO)

```bash
# Health check
curl http://localhost:9082/api/courses/health

# Outros endpoints da API
curl http://localhost:9082/api/courses/{endpoint}
```

### Acesso Direto (Development/Debug apenas)

```bash
# Porta direta (funciona apenas dentro da rede Docker)
curl http://course-crawler-api:3601/health

# Porta publicada (pode ter problemas de WSL2 port binding)
curl http://localhost:3601/health
```

## Arquitetura

```
Browser/CLI Request
        ↓
   localhost:9082/api/courses/*
        ↓
   Traefik Gateway (tradingsystem_backend network)
        ↓
   Middleware: Strip /api/courses prefix
        ↓
   course-crawler-api:3601/*
        ↓
   Course Crawler API
```

## Mudanças Realizadas

### 1. Redes Docker

- ✅ Adicionada rede `tradingsystem_backend` ao serviço `course-crawler-api`
- ✅ Container agora está em 2 redes:
  - `4-5-course-crawler-stack_default` (rede privada com DB e worker)
  - `tradingsystem_backend` (rede compartilhada com Traefik)

### 2. Labels Traefik

- ✅ `traefik.enable=true` - Habilita service discovery automático
- ✅ `PathPrefix(/api/courses)` - Rota de acesso via gateway
- ✅ `priority=85` - Prioridade de roteamento (APIs padrão: 50-89)
- ✅ `stripprefix` middleware - Remove `/api/courses` do path antes de encaminhar

### 3. CORS

- ✅ Atualizado `COURSE_CRAWLER_CORS_ORIGINS` para incluir `http://localhost:9082`

## Validação

```bash
# ✅ Health check retorna JSON com status
curl http://localhost:9082/api/courses/health
{
  "status": "healthy",
  "timestamp": "2025-11-13T22:01:34.318Z",
  "uptime": 72.573763995,
  "worker": {
    "isRunning": true,
    "lastPollTime": "2025-11-13T22:01:31.954Z",
    "timeSinceLastPollMs": 2364,
    "activeRunsCount": 0,
    "activeRuns": []
  }
}

# ✅ Container está em ambas as redes
docker inspect course-crawler-api | jq -r '.[0].NetworkSettings.Networks | keys[]'
# Output:
# 4-5-course-crawler-stack_default
# tradingsystem_backend

# ✅ Traefik detectou o serviço (sem erros nos logs após 19:00)
docker logs api-gateway --tail 50 | grep -i "course"
```

## Troubleshooting

### 404 Not Found

**Sintoma:** `curl http://localhost:9082/api/courses/{endpoint}` retorna 404

**Verificar:**
1. Container está healthy: `docker ps --filter name=course-crawler-api --filter health=healthy`
2. Container está na rede correta: `docker inspect course-crawler-api | jq '.[0].NetworkSettings.Networks'`
3. Traefik detectou o serviço: `docker logs api-gateway | grep course`

### Middleware Error

**Sintoma:** Logs do Traefik mostram `middleware "api-standard@file" does not exist`

**Solução:** Removido middleware inexistente dos labels. Use apenas middlewares definidos ou remova a referência.

### WSL2 Port Binding

**Problema:** Porta 3601 mapeada mas não acessível em `localhost:3601`

**Solução:** Use o Traefik Gateway (`http://localhost:9082/api/courses/*`) em vez de acesso direto. O port binding WSL2 é não-confiável.

## Dashboard Integration

**✅ COMPLETO:** Interface do Course Crawler integrada ao Dashboard principal!

### UI Customizada

O dashboard agora possui uma interface dedicada que consome a API do course-crawler via Traefik Gateway:

**Arquivo:** [frontend/dashboard/src/components/pages/CourseCrawlerPage.tsx](../frontend/dashboard/src/components/pages/CourseCrawlerPage.tsx)

**Funcionalidades:**

- ✅ **API Status Card** - Status em tempo real (healthy/unhealthy) com uptime
- ✅ **Worker Status Card** - Estado do worker com timestamp do último poll
- ✅ **Active Runs Card** - Contador de tarefas em execução
- ✅ **API Integration Info** - Documentação de endpoints disponíveis
- ✅ **Auto-refresh** - Health checks a cada 30 segundos

**Acesso:** `http://localhost:9082/#/course-crawler`

**Screenshot:**
```
┌─────────────────────────────────────────────────────────────┐
│ Course Crawler                                              │
│ Sistema de extração automatizada de cursos online via      │
│ Traefik API Gateway                                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│ API Status      │ Worker Status   │ Active Runs             │
│ ● Healthy       │ ● Running       │ 0                       │
│ Uptime: 16m     │ Ativo           │ Tarefas em execução     │
├─────────────────┴─────────────────┴─────────────────────────┤
│ Integração com API Gateway                                  │
│ GET /api/courses/health ✅                                  │
│ http://localhost:9082/api/courses/*                         │
└─────────────────────────────────────────────────────────────┘
```

## Próximos Passos

- [x] ~~Integrar UI do course-crawler no dashboard principal~~ ✅ COMPLETO
- [ ] Documentar todos os endpoints da API course-crawler
- [ ] Adicionar autenticação JWT via Traefik middleware
- [ ] Configurar rate limiting específico para course-crawler
- [ ] Adicionar métricas Prometheus específicas

## Referências

- **Compose File:** `/workspace/tools/compose/docker-compose.4-5-course-crawler-stack.yml`
- **Traefik Config:** `/workspace/tools/compose/traefik/traefik.yml`
- **WSL2 Port Forwarding:** `/workspace/scripts/docker/WSL2-PORT-FORWARDING-README.md`
- **Gateway Architecture:** `/workspace/docs/TRAEFIK-GATEWAY-MIGRATION.md`
