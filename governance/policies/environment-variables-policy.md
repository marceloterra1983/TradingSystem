# Environment Variables Governance Policy

> Última revisão: 2025-11-05 — Owner: SecurityEngineering

## Objetivo
Garantir que todos os serviços do TradingSystem usem um modelo único de variáveis de ambiente, evitando secrets órfãos, arquivos duplicados e configurações divergentes entre stacks locais, Docker e pipelines automatizados.

## Fontes Canônicas
| Arquivo | Tipo | Status | Conteúdo |
| --- | --- | --- | --- |
| `config/.env.defaults` | Default versionado | ✅ Commitado | Valores não sensíveis, portas, imagens Docker e toggles. |
| `.env` | Secrets locais | ❌ Gitignore | Token real por estação. Deriva de `.env.example` + `scripts/env/setup-env.sh`. |
| `.env.shared` | Gerado | ✅ Commitado | Portas/hosts sincronizados via `npm run ports:sync` (não editar manualmente). |
| `.env.example` | Template mínimo | ✅ Commitado | Apenas chaves que exigem ação humana (API keys, senhas). Mantido sincronizado com este documento. |

> Qualquer outro arquivo `.env*` na raiz é proibido. Arquivos específicos de serviço devem seguir o padrão `<service>/.env.example` + `.env.local` (gitignored).

## Processo para adicionar uma nova variável
1. **Planeje**: registre o motivo e o serviço impactado.
2. **Defaults**: inclua o valor seguro em `config/.env.defaults` (nunca em `.env`).
3. **Template**: se o valor for secreto, adicione o placeholder em `.env.example` com instruções claras.
4. **Documentação**: atualize `docs/content/tools/security-config/env.mdx` com descrição, owner e ciclo de rotação.
5. **Governança**: anexe evidências de revisão nesta política via PR.
6. **Validação**: rode `bash scripts/env/validate-env.sh` para garantir consistência.

## Regras Operacionais
- `scripts/env/setup-env.sh` deve ser usado após clonar o repositório para gerar senhas fortes (Timescale, Redis, RabbitMQ, etc.).
- `scripts/env/validate-env.sh` roda em CI/CD e localmente antes de qualquer PR que altere variáveis.
- `.env.shared` é regenerado por `npm run ports:sync` e serve como única fonte para dashboards, docs e agentes. Nunca edite manualmente.
- Secrets não podem aparecer em `config/.env.defaults`, `docs/`, `governance/` ou qualquer workspace público.
- Sempre que uma variável é descontinuada, remova-a de **todos** os arquivos acima e registre no changelog do PR.

## Grupos de Variáveis
- **API Keys & Observability**: `OPENAI_API_KEY`, `LANGSMITH_API_KEY`, `SENTRY_AUTH_TOKEN`, `GITHUB_TOKEN`, `SLACK_WEBHOOK_URL`.
- **Mensageria/Telegram**: `TELEGRAM_*`, `TP_CAPITAL_*`, `VITE_TELEGRAM_*` — exigem dupla rotação (bot + gateway) e armazenam tokens gerados manualmente.
- **Bancos & Filas**: todos os `*_PASSWORD`, `*_PASS`, `*_TOKEN` relacionados a Timescale, Redis, RabbitMQ, Neon e Kestra são gerados pelo script e jamais podem ser commitados.
- **Inter-service**: `GATEWAY_SECRET_TOKEN`, `API_SECRET_TOKEN`, `INTER_SERVICE_SECRET`, `VITE_GATEWAY_TOKEN` — compartilham o mesmo ciclo de rotação (90 dias) definido em `governance/controls/secrets-rotation-sop.md`.

## Auditoria Contínua
- `bash scripts/env/validate-env.sh --json` gera relatórios em `reports/env/` (gitignored) e deve ser anexado em revisões trimestrais.
- O dashboard de governança (`frontend/dashboard → Knowledge → Governance`) consome `.env.shared` + `config/.env.defaults` para exibir portas e owners.
- Incidentes envolvendo vazamento de `.env` seguem o fluxo definido em `governance/controls/secrets-rotation-sop.md`.

Cumprir esta política é obrigatório para qualquer agente (humano ou IA) antes de gerar novos arquivos de configuração.
