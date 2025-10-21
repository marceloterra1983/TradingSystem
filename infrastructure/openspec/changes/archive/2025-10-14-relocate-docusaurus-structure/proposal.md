# Relocate Docusaurus Structure

## Why

O projeto atualmente mantém todos os arquivos do Docusaurus (configuração, código-fonte, dependências) diretamente na raiz de `/docs`, misturados com o conteúdo de documentação em `context/`, `architecture/`, etc. Essa organização dificulta a separação entre:

- **Ferramenta** (Docusaurus: engine, configurações, build artifacts)
- **Conteúdo** (Markdown, diagramas PlantUML, PRDs, ADRs)

Mover a estrutura do Docusaurus para `/docs/docusaurus/` cria uma separação clara, facilitando manutenção, backup seletivo do conteúdo, e eventual migração da ferramenta de documentação sem afetar os arquivos de conteúdo.

## What Changes

- **Mover arquivos do Docusaurus** de `/docs/` para `/docs/docusaurus/`:
  - `package.json`, `package-lock.json`, `node_modules/`
  - `docusaurus.config.ts`, `sidebars.ts`, `tsconfig.json`
  - `src/` (componentes React do Docusaurus)
  - `static/` (assets estáticos do Docusaurus)
  - `build/` (artefatos de build)
  - Arquivos de teste/debug HTML do logo

- **Manter na raiz de `/docs/`** (conteúdo de documentação):
  - `context/` (documentação contextual organizada por domínio)
  - `architecture/` (diagramas e decisões arquiteturais)
  - `features/` (especificações de features)
  - `frontend/` (documentação de frontend)
  - `README.md` (hub principal de documentação)
  - `DOCUMENTATION-STANDARD.md` (padrões de documentação)
  - Arquivos `.md` de resumos e guias

- **Atualizar referências** em todos os arquivos que apontam para `/docs`:
  - Scripts de inicialização (`start-all-services.sh`, `start-all-stacks.sh`, etc.)
  - Scripts de diagnóstico (`status.sh`, `check-services.sh`, etc.)
  - Documentação (`CLAUDE.md`, `SYSTEM-OVERVIEW.md`, guias em `/guides`)
  - Configurações de serviços (Service Launcher, APIs)
  - Componentes do frontend (Dashboard, DocsPage, EscopoPage, PortsPage)
  - Arquivos de configuração (Docker, nginx, etc.)

- **Ajustar comandos npm** para refletir novo caminho:
  - De: `cd docs && npm run start -- --port 3004`
  - Para: `cd docs/docusaurus && npm run start -- --port 3004`

## Impact

### Affected Components

**Backend:**
- Service Launcher (`frontend/apps/service-launcher/server.js`)
- Documentation API (`backend/api/documentation-api/`)
- TP Capital Signals (`frontend/apps/tp-capital/src/server.js`)
- B3 Market Data (`frontend/apps/b3-market-data/`)
- Library API (`backend/api/library/`)

**Frontend:**
- Dashboard (`frontend/apps/dashboard/`)
  - `DocsPage.tsx`
  - `EscopoPage.tsx`
  - `PortsPage.tsx` (archived)

**Infrastructure:**
- Scripts: `start-all-services.sh`, `status.sh`, `check-services.sh`, `start-all-stacks.sh`
- Guias de onboarding: `guides/onboarding/`
- Docker configs: `compose.dev.yml`, nginx configs

**Documentation:**
- `CLAUDE.md` (instruções para agentes de IA)
- `SYSTEM-OVERVIEW.md`
- `docs/README.md`
- `docs/context/ops/` (service maps, guides, troubleshooting)
- `docs/context/frontend/features/`
- Arquivos em `archive/` (referências históricas)

### Breaking Changes

⚠️ **BREAKING**: Todos os comandos que executam `cd docs && npm ...` precisam ser atualizados para `cd docs/docusaurus && npm ...`

### Migration Path

1. Criar nova estrutura em `/docs/docusaurus/`
2. Mover arquivos gradualmente (configuração → código → dependências)
3. Atualizar referências em lote por categoria (scripts → docs → código)
4. Testar cada serviço após atualização
5. Validar build do Docusaurus no novo caminho
6. Atualizar documentação oficial

### Rollback Strategy

Se problemas forem encontrados:
- Mover arquivos de volta para `/docs/`
- Reverter alterações em scripts/código via git
- Re-testar serviços afetados
- Documentar lições aprendidas

