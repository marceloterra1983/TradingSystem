# Crawler Course Meta

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-≥20-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)
[![Playwright](https://img.shields.io/badge/Playwright-Crawlee-00D9FF.svg)](https://playwright.dev/)

> **Open-source template** para extração de metadados de cursos online (Hotmart, Udemy, Moodle e outros) com autenticação segura, frontend integrado e observabilidade completa.

---

## 🎯 Visão Geral

**Crawler Course Meta** é um sistema completo para navegar em plataformas de cursos online, realizar scroll automático, coletar metadados públicos ou privados (autorizados) e exportar em JSON e Markdown.

### ✨ Principais Características

- ✅ **Backend em Node.js + TypeScript** com Playwright + Crawlee
- ✅ **Frontend em Next.js 15** com dashboard interativo
- ✅ **Autenticação segura** (form, cookie, bearer, OAuth2, SSO)
- ✅ **Suporte a múltiplas plataformas** (Hotmart, Udemy, Moodle)
- ✅ **Exportação em JSON e Markdown**
- ✅ **Observabilidade completa** (Prometheus, logs estruturados)
- ✅ **Reuso de sessões** com criptografia
- ✅ **Respeito legal aos ToS** e robots.txt

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                    │
│              Dashboard | Jobs | Metrics | Artifacts         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────▼────────────────────────────────────┐
│                  API Server (Express/Fastify)               │
│                    /api/jobs, /metrics                      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Crawlee Orchestrator + Playwright              │
│         Browser Pool | Job Queue | State Management        │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    ┌───▼──┐      ┌──────▼──────┐   ┌────▼────┐
    │Target│      │   Storage   │   │Prometheus
    │Sites │      │ JSON/MD/PG  │   │ Metrics
    └──────┘      └─────────────┘   └─────────┘
```

---

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** ≥ 20
- **PNPM** ou **NPM** 10+
- **Docker** + **Docker Compose** (opcional)
- **Git**

### Instalação Local

#### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/crawler-course-meta.git
cd crawler-course-meta
```

#### 2. Instale dependências

```bash
# Backend
cd backend
pnpm install

# Frontend
cd ../frontend
pnpm install
```

#### 3. Configure variáveis de ambiente

```bash
# Na raiz do projeto
cp .env.example .env
```

Edite `.env` com suas configurações:

```env
# Backend
NODE_ENV=development
API_PORT=8080
PROMETHEUS_PORT=9234

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080

# Autenticação (opcional)
SESSION_ENCRYPTION_KEY=your-secret-key-here

# Database (opcional)
DATABASE_URL=postgresql://user:password@localhost:5432/crawler
```

#### 4. Inicie os serviços

**Terminal 1 - Backend:**

```bash
cd backend
pnpm run dev
# API disponível em http://localhost:8080
```

**Terminal 2 - Frontend:**

```bash
cd frontend
pnpm run dev
# Dashboard disponível em http://localhost:3000
```

#### 5. Acesse o dashboard

Abra [http://localhost:3000](http://localhost:3000) no navegador.

---

## 🐳 Docker Compose

Para iniciar todos os serviços com Docker:

```bash
docker compose up -d
```

Serviços disponíveis:

- **API**: http://localhost:8080
- **Frontend**: http://localhost:3000
- **Prometheus**: http://localhost:9090

---

## 📖 Uso

### Via Dashboard (Recomendado)

1. Acesse http://localhost:3000
2. Clique em **"Novo Job"**
3. Preencha o formulário:
   - **Plataforma**: Hotmart, Udemy, Moodle, etc.
   - **URL**: Link do curso
   - **Autenticação**: Selecione método (none, form, cookie, etc.)
4. Clique em **"Executar"**
5. Acompanhe o progresso em tempo real
6. Baixe os artefatos (JSON, Markdown, screenshots)

### Via CLI

```bash
cd backend

# Listar jobs
pnpm run cli jobs list

# Criar novo job
pnpm run cli jobs create --platform hotmart --url "https://hotmart.com/course/..."

# Executar job
pnpm run cli jobs run <job-id>

# Teste de navegação (dry-run)
pnpm run cli jobs dry-run <job-id>

# Exportar resultados
pnpm run cli export <job-id> --format json,md
```

### Via API REST

```bash
# Listar jobs
curl http://localhost:8080/api/jobs

# Criar job
curl -X POST http://localhost:8080/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "hotmart",
    "start_urls": ["https://hotmart.com/course/..."],
    "auth": { "method": "form" }
  }'

# Executar job
curl -X POST http://localhost:8080/api/jobs/{id}/run

# Métricas Prometheus
curl http://localhost:8080/api/metrics
```

---

## 🔐 Autenticação

Suporte a múltiplos métodos de autenticação:

| Método   | Descrição                     | Caso de Uso                |
| -------- | ----------------------------- | -------------------------- |
| `none`   | Conteúdo público              | Cursos gratuitos            |
| `form`   | Login com usuário/senha       | Hotmart, Moodle            |
| `cookie` | Importação de cookies válidos | Sessão existente           |
| `bearer` | Token direto                  | API oficial                |
| `oauth2` | Client credentials flow       | Integrações corporativas   |
| `sso`    | Login federado                | Google, Okta, Azure        |

### Exemplo: Autenticação por Formulário

```yaml
auth:
  method: form
  owner_login: true
  credentials_env:
    username: OWNER_USERNAME
    password: OWNER_PASSWORD
  session_store:
    enabled: true
    path: ./sessions/hotmart.session.enc
    encrypt_with_env: SESSION_KEY
```

---

## 📊 Observabilidade

### Métricas Prometheus

Endpoint: `http://localhost:8080/api/metrics`

Métricas disponíveis:

```
crawler_pages_visited_total        # Total de páginas visitadas
crawler_items_extracted_total      # Total de itens extraídos
crawler_errors_total               # Total de erros
crawler_runtime_seconds            # Tempo de execução
```

### Logs Estruturados

Logs em formato JSON:

```json
{
  "ts": "2025-11-08T12:00:00Z",
  "level": "info",
  "msg": "page_extracted",
  "url": "https://hotmart.com/course/...",
  "items": 24,
  "duration_ms": 1250
}
```

### Grafana (Opcional)

Configure Grafana para visualizar métricas:

```bash
docker run -d -p 3001:3000 grafana/grafana
```

Adicione Prometheus como data source: `http://prometheus:9090`

---

## 📁 Estrutura do Projeto

```
crawler-course-meta/
├── backend/
│   ├── src/
│   │   ├── cli/                    # Interface de linha de comando
│   │   ├── api/                    # Endpoints REST
│   │   ├── core/                   # Lógica principal
│   │   ├── plugins/                # Adaptadores por plataforma
│   │   │   ├── hotmart/
│   │   │   ├── udemy/
│   │   │   └── moodle/
│   │   ├── utils/                  # Utilitários
│   │   └── schemas/                # Validação (Zod/Joi)
│   ├── tests/                      # Testes unitários e integração
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── jobs/                   # Página de jobs
│   │   ├── metrics/                # Dashboard de métricas
│   │   ├── artifacts/              # Visualizador de artefatos
│   │   └── settings/               # Configurações
│   ├── components/                 # Componentes React
│   ├── lib/api/                    # Cliente HTTP
│   ├── public/                     # Assets estáticos
│   ├── Dockerfile
│   └── package.json
├── outputs/
│   ├── reports/                    # Relatórios gerados
│   ├── screenshots/                # Screenshots capturados
│   └── artifacts/                  # JSON, Markdown, etc.
├── sessions/                       # Sessões criptografadas
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🧪 Testes

### Executar testes

```bash
cd backend

# Testes unitários
pnpm run test

# Testes com cobertura
pnpm run test:coverage

# Testes de integração
pnpm run test:integration

# Testes E2E (frontend)
cd ../frontend
pnpm run test:e2e
```

### Cobertura mínima

- **Backend**: 70%
- **Frontend**: 60%

---

## 📋 Job File (YAML)

Exemplo de arquivo de configuração de job:

```yaml
id: "job-hotmart-2025-11-08"
platform: "hotmart"
start_urls:
  - "https://hotmart.com/course/meu-curso"

auth:
  method: form
  owner_login: true
  credentials_env:
    username: OWNER_USERNAME
    password: OWNER_PASSWORD

selectors:
  course:
    title: "css:h1.course-title"
    description: "css:div.course-description"
    author: "css:.instructor-name"
  modules:
    root: "css:ul.modules > li"
    title: "css:.module-title"
    lessons:
      root: "css:.lessons > li"
      title: "css:.lesson-title"
      url: "css:a::href"

scroll:
  enabled: true
  step: 800
  delay_ms: 300
  max_scrolls: 120

output:
  format: ["json", "md"]
  directory: "./outputs/hotmart"
```

---

## 🔌 API Endpoints

| Método | Endpoint                   | Descrição           |
| ------ | -------------------------- | ------------------- |
| GET    | `/api/jobs`                | Lista todos os jobs |
| POST   | `/api/jobs`                | Cria novo job       |
| GET    | `/api/jobs/{id}`           | Detalhes do job     |
| POST   | `/api/jobs/{id}/run`       | Executa job         |
| POST   | `/api/jobs/{id}/dry-run`   | Teste de navegação  |
| GET    | `/api/jobs/{id}/artifacts` | Lista outputs       |
| GET    | `/api/jobs/{id}/report`    | Relatório final     |
| GET    | `/api/metrics`             | Métricas Prometheus |
| GET    | `/api/plugins`             | Plugins instalados  |
| POST   | `/api/sessions/login`      | Efetua login        |
| POST   | `/api/sessions/logout`     | Finaliza sessão     |

---

## 🛠️ Desenvolvimento

### Stack Tecnológico

**Backend:**
- Node.js 20+
- TypeScript 5.x
- Express ou Fastify
- Playwright + Crawlee
- Zod (validação)
- Pino (logging)
- Prometheus (métricas)

**Frontend:**
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zod

**DevOps:**
- Docker + Docker Compose
- GitHub Actions
- ESLint + Prettier
- Jest + Vitest
- Playwright (E2E)

### Contribuindo

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
- **Formatação**: Prettier (2 espaços)
- **Linting**: ESLint
- **Testes**: Mínimo 70% de cobertura

---

## ⚖️ Considerações Legais

⚠️ **Importante**: Este projeto deve ser usado de forma ética e legal.

- ✅ Respeita **robots.txt** quando configurado
- ✅ Extrai apenas conteúdo **público ou autorizado**
- ✅ Não burla DRM, paywalls ou autenticações de terceiros
- ✅ Credenciais nunca são versionadas
- ✅ Sessões são criptografadas

**Responsabilidade do usuário**: Garantir conformidade com os Termos de Serviço das plataformas alvo.

---

## 📚 Documentação Completa

- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)
- [API Reference](./docs/API.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

---

## 🐛 Troubleshooting

### Problema: "Port 8080 already in use"

```bash
# Encontre o processo usando a porta
lsof -i :8080

# Mate o processo
kill -9 <PID>
```

### Problema: "Playwright browser not found"

```bash
cd backend
npx playwright install
```

### Problema: "Database connection failed"

Verifique `.env`:

```bash
# Certifique-se de que DATABASE_URL está correto
echo $DATABASE_URL
```

---

## 📞 Suporte

- 📖 [Documentação](./docs)
- 🐛 [Issues](https://github.com/seu-usuario/crawler-course-meta/issues)
- 💬 [Discussions](https://github.com/seu-usuario/crawler-course-meta/discussions)

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** — veja o arquivo [LICENSE](./LICENSE) para detalhes.

**Aviso**: Use este projeto de forma ética e legal. O autor não é responsável por uso indevido.

---

## 🙏 Agradecimentos

- [Crawlee](https://crawlee.dev/) — Web scraping framework
- [Playwright](https://playwright.dev/) — Browser automation
- [Next.js](https://nextjs.org/) — React framework
- [shadcn/ui](https://ui.shadcn.com/) — UI components

---

## 📈 Roadmap

| Fase | Entrega                    | Status |
| ---- | -------------------------- | ------ |
| F1   | Backend CLI + Crawlee      | ✅     |
| F2   | Autenticação + Sessões     | ✅     |
| F3   | Export JSON/Markdown       | ✅     |
| F4   | API REST + Observability   | 🔄     |
| F5   | Frontend básico            | 🔄     |
| F6   | Métricas e Artefatos UI    | ⏳      |
| F7   | RBAC e segurança           | 🔜     |
| F8   | Testes completos e release | 🔜     |

---

**Desenvolvido com ❤️ para a comunidade open-source**

⭐ Se este projeto foi útil, considere dar uma estrela!
