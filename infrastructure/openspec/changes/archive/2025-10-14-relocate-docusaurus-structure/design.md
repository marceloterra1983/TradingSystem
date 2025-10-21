# Design: Relocate Docusaurus Structure

## Context

O projeto TradingSystem mantém toda sua documentação técnica sob `/docs`, utilizando Docusaurus como ferramenta de renderização. Atualmente, a estrutura mistura:

- **Infraestrutura do Docusaurus**: configs, node_modules, build artifacts, código React
- **Conteúdo de documentação**: markdown, diagramas PlantUML, PRDs, ADRs, guias

Essa mistura cria problemas de:
- **Backup seletivo**: Difícil separar conteúdo (importante) de dependências (reinstalável)
- **Migração**: Se mudarmos de Docusaurus para outra ferramenta, há acoplamento excessivo
- **Clareza**: Novos desenvolvedores não distinguem facilmente ferramenta vs conteúdo
- **Portabilidade**: Conteúdo deveria ser independente da ferramenta de renderização

## Goals / Non-Goals

### Goals

✅ Separar claramente **ferramenta** (Docusaurus) de **conteúdo** (markdown/diagramas)
✅ Permitir backup seletivo do diretório `/docs/context`, `/docs/architecture`, etc.
✅ Facilitar eventual migração para outra ferramenta de documentação
✅ Manter compatibilidade com todos os serviços existentes (porta 3004, URLs, scripts)
✅ Preservar 100% do conteúdo e histórico git

### Non-Goals

❌ Mudar a ferramenta de documentação (continua sendo Docusaurus)
❌ Alterar a porta 3004 ou URLs acessíveis externamente
❌ Reorganizar o conteúdo dentro de `/docs/context`
❌ Modificar o comportamento do Docusaurus (apenas reorganizar arquivos)
❌ Criar novas features ou funcionalidades

## Decisions

### Decision 1: Estrutura de Diretórios

**Opção Escolhida:**

```
/docs/
├── docusaurus/              # 🆕 NOVO: Tudo relacionado à ferramenta
│   ├── package.json
│   ├── node_modules/
│   ├── docusaurus.config.ts
│   ├── sidebars.ts
│   ├── tsconfig.json
│   ├── src/                 # Componentes React customizados
│   ├── static/              # Assets do tema Docusaurus
│   └── build/               # Artefatos de build
├── context/                 # ✅ MANTÉM: Conteúdo contextual
├── architecture/            # ✅ MANTÉM: Diagramas e ADRs
├── features/                # ✅ MANTÉM: Specs de features
├── frontend/                # ✅ MANTÉM: Docs de frontend
├── README.md                # ✅ MANTÉM: Hub de documentação
└── DOCUMENTATION-STANDARD.md
```

**Rationale:**
- Separação clara entre engine (docusaurus/) e content (tudo mais)
- Alinhado com princípio "separation of concerns"
- Facilita .gitignore específicos (ex: ignorar `docusaurus/build/`)
- Permite backup independente de conteúdo

**Alternativas Consideradas:**

1. ❌ **Criar `/docs-engine` e `/docs-content`**: Mais disruptivo, quebraria URLs e convenções existentes
2. ❌ **Manter tudo junto**: Não resolve os problemas identificados
3. ❌ **Usar submodule git**: Complexidade desnecessária para problema simples

### Decision 2: Ajuste de Caminhos no Docusaurus Config

**Opção Escolhida:** Ajustar caminhos relativos em `docusaurus.config.ts` usando `../../` para acessar conteúdo.

**Exemplo:**

```typescript
// ANTES (em /docs/docusaurus.config.ts)
const config: Config = {
  // ...
  presets: [
    [
      'classic',
      {
        docs: {
          path: 'context',  // ← relativo a /docs
          // ...
        }
      }
    ]
  ]
};

// DEPOIS (em /docs/docusaurus/docusaurus.config.ts)
const config: Config = {
  // ...
  presets: [
    [
      'classic',
      {
        docs: {
          path: '../context',  // ← agora relativo a /docs/docusaurus
          // ...
        }
      }
    ]
  ]
};
```

**Rationale:**
- Docusaurus suporta paths relativos nativamente
- Mantém conteúdo fora do diretório da ferramenta
- Não requer symlinks ou soluções hacky

**Alternativas Consideradas:**

1. ❌ **Symlinks**: Problemas com Windows, Git, e CI/CD
2. ❌ **Caminhos absolutos**: Quebrariam portabilidade entre ambientes
3. ❌ **Mover conteúdo para dentro de docusaurus/**: Desfaz o propósito da mudança

### Decision 3: Estratégia de Atualização de Referências

**Opção Escolhida:** Atualização em fases por categoria de arquivo.

**Ordem de Atualização:**

1. **Infraestrutura (scripts)**: Atualizar scripts de início/parada primeiro
2. **Backend (serviços)**: Atualizar Service Launcher e APIs
3. **Frontend (componentes)**: Atualizar referências no Dashboard
4. **Documentação (markdown)**: Atualizar guias e instruções
5. **Configuração (Docker, CI/CD)**: Atualizar configs de deployment

**Rationale:**
- Minimiza risco de conflitos durante migração
- Permite testar cada camada antes de avançar
- Facilita rollback parcial se necessário

**Alternativas Consideradas:**

1. ❌ **Big bang (tudo de uma vez)**: Alto risco de quebrar múltiplos serviços
2. ❌ **Ordem alfabética**: Não respeita dependências entre componentes
3. ❌ **Por ordem de importância**: Subjetivo e difícil de rastrear progresso

### Decision 4: Tratamento de npm Scripts

**Opção Escolhida:** Manter scripts npm dentro de `/docs/docusaurus/package.json` e atualizar comandos externos.

**Comandos Atualizados:**

```bash
# ANTES
cd docs && npm run start -- --port 3004

# DEPOIS
cd docs/docusaurus && npm run start -- --port 3004
```

**Rationale:**
- Scripts npm permanecem dentro do contexto do projeto Node.js
- Não requer wrapper scripts adicionais
- Comandos continuam explícitos e claros

**Alternativas Consideradas:**

1. ❌ **Criar `docs/package.json` wrapper**: Complexidade desnecessária
2. ❌ **Usar npm workspaces**: Overkill para projeto simples
3. ❌ **Scripts globais no root**: Desvia da convenção `cd + npm run`

### Decision 5: Migração de node_modules

**Opção Escolhida:** Mover `node_modules/` existente e permitir reinstalação limpa.

**Processo:**

1. Mover `node_modules/` para `/docs/docusaurus/`
2. Recomendar `npm ci` para instalação limpa
3. Atualizar `.gitignore` se necessário

**Rationale:**
- `node_modules/` já está em `.gitignore`
- Instalação limpa evita paths quebrados ou cache corrompido
- Tamanho do diretório (~500MB+) torna cópia demorada

**Alternativas Consideradas:**

1. ❌ **Copiar em vez de mover**: Duplicação desnecessária de espaço
2. ❌ **Deletar e reinstalar**: Mais lento que mover
3. ❌ **Usar cache npm**: Não resolve problema de paths relativos

## Technical Approach

### File Movement Strategy

**Script de Migração (bash):**

```bash
#!/bin/bash
# migrate-docusaurus.sh

set -e

DOCS_ROOT="/home/marce/projetos/TradingSystem/docs"
DOCUSAURUS_NEW="$DOCS_ROOT/docusaurus"

echo "Creating backup..."
tar -czf /tmp/docs-backup-$(date +%Y%m%d-%H%M%S).tar.gz "$DOCS_ROOT"

echo "Creating new structure..."
mkdir -p "$DOCUSAURUS_NEW"

echo "Moving Docusaurus files..."
mv "$DOCS_ROOT/package.json" "$DOCUSAURUS_NEW/"
mv "$DOCS_ROOT/package-lock.json" "$DOCUSAURUS_NEW/"
mv "$DOCS_ROOT/docusaurus.config.ts" "$DOCUSAURUS_NEW/"
mv "$DOCS_ROOT/sidebars.ts" "$DOCUSAURUS_NEW/"
mv "$DOCS_ROOT/tsconfig.json" "$DOCUSAURUS_NEW/"
mv "$DOCS_ROOT/src" "$DOCUSAURUS_NEW/"
mv "$DOCS_ROOT/static" "$DOCUSAURUS_NEW/"

# node_modules (if exists)
if [ -d "$DOCS_ROOT/node_modules" ]; then
  mv "$DOCS_ROOT/node_modules" "$DOCUSAURUS_NEW/"
fi

# build (if exists)
if [ -d "$DOCS_ROOT/build" ]; then
  mv "$DOCS_ROOT/build" "$DOCUSAURUS_NEW/"
fi

echo "Migration complete!"
echo "Next: Update docusaurus.config.ts paths and test build"
```

### Path Resolution Table

| Arquivo | Caminho Antes | Caminho Depois | Tipo de Mudança |
|---------|---------------|----------------|-----------------|
| `docusaurus.config.ts` | `/docs/docusaurus.config.ts` | `/docs/docusaurus/docusaurus.config.ts` | Move + Update paths |
| `package.json` | `/docs/package.json` | `/docs/docusaurus/package.json` | Move only |
| `context/` (content) | `/docs/context/` | `/docs/context/` | **No change** |
| `README.md` | `/docs/README.md` | `/docs/README.md` | **No change** |
| `src/components/` | `/docs/src/components/` | `/docs/docusaurus/src/components/` | Move + Update imports |

### Config Updates Required

**1. docusaurus.config.ts:**

```typescript
const config: Config = {
  // ...
  staticDirectories: ['static'],  // ✅ Sem mudança (relativo a docusaurus/)
  
  presets: [
    [
      'classic',
      {
        docs: {
          path: '../context',           // ← ERA: 'context'
          routeBasePath: '/',
          sidebarPath: './sidebars.ts', // ✅ Sem mudança
          // ...
        },
        theme: {
          customCss: './src/css/custom.css', // ✅ Sem mudança
        },
      } satisfies Preset.Options,
    ],
  ],
};
```

**2. sidebars.ts:**

```typescript
// Paths são relativos ao `docs.path` definido em config
// Provavelmente SEM MUDANÇA necessária
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'shared/product/prd/PRD-en',  // ✅ Relativo a 'context'
    },
    // ...
  ],
};
```

**3. Service Launcher (frontend/apps/service-launcher/server.js):**

```javascript
// ANTES
{
  id: 'docusaurus',
  name: 'Documentation Hub',
  defaultPath: '/home/marce/projetos/TradingSystem/docs',
  defaultCommand: 'npm run start -- --port 3004',
  // ...
}

// DEPOIS
{
  id: 'docusaurus',
  name: 'Documentation Hub',
  defaultPath: '/home/marce/projetos/TradingSystem/docs/docusaurus',
  defaultCommand: 'npm run start -- --port 3004',
  // ...
}
```

## Risks / Trade-offs

### Risk 1: Broken Internal Links

**Descrição:** Links internos no Docusaurus podem quebrar se paths não forem atualizados corretamente.

**Mitigação:**
- ✅ Testar build completo antes de commit
- ✅ Verificar warnings do Docusaurus sobre links quebrados
- ✅ Fazer scan manual de links críticos (home, API Hub, PRDs)

**Impacto:** 🟡 Médio (afeta usabilidade da documentação)

### Risk 2: Scripts de CI/CD Quebrados

**Descrição:** Workflows do GitHub Actions ou outros CI/CD podem ter paths hardcoded.

**Mitigação:**
- ✅ Revisar `.github/workflows/` antes da migração
- ✅ Testar builds localmente antes de push
- ✅ Preparar rollback rápido se CI falhar

**Impacto:** 🔴 Alto (pode bloquear deploys)

### Risk 3: Service Launcher Timeout

**Descrição:** Service Launcher pode falhar ao iniciar Docusaurus se path estiver incorreto.

**Mitigação:**
- ✅ Testar start/stop manual antes de atualizar Service Launcher
- ✅ Adicionar logging detalhado no Service Launcher
- ✅ Criar fallback para inicialização manual

**Impacto:** 🟡 Médio (workaround manual disponível)

### Risk 4: Hardcoded Absolute Paths

**Descrição:** Algum código pode ter paths absolutos como `/docs` que não foram detectados no scan.

**Mitigação:**
- ✅ Fazer grep abrangente: `rg -i "\/docs[\/\"]" --type js --type ts --type sh`
- ✅ Testar todos os serviços após migração
- ✅ Monitorar logs por erros de "file not found"

**Impacto:** 🟢 Baixo (scan reduz probabilidade)

### Trade-off 1: Path Depth Increase

**Before:** `docs/docusaurus.config.ts` (depth: 1)
**After:** `docs/docusaurus/docusaurus.config.ts` (depth: 2)

**Implicação:**
- ➕ Melhor organização e separação de responsabilidades
- ➖ Comandos ficam ligeiramente mais longos (`cd docs/docusaurus`)

**Decisão:** Aceitar trade-off; benefícios de organização superam inconveniência mínima.

### Trade-off 2: Two-Step Navigation

**Before:** Editar config: `vim docs/docusaurus.config.ts`
**After:** Editar config: `vim docs/docusaurus/docusaurus.config.ts`

**Implicação:**
- ➕ Clareza: desenvolvedor sabe que está mexendo na ferramenta, não no conteúdo
- ➖ Alguns comandos requerem TAB extra para autocomplete

**Decisão:** Aceitar; benefício de clareza vale o custo.

## Migration Plan

### Phase 1: Pre-Migration (1 hora)

1. ✅ Criar backup completo de `/docs`
2. ✅ Executar audit de paths (grep, find)
3. ✅ Documentar estrutura atual (tree, du -sh)
4. ✅ Testar build atual para baseline: `cd docs && npm run build`

### Phase 2: File Migration (30 minutos)

1. ✅ Executar script de migração (ou mover manualmente)
2. ✅ Verificar que conteúdo permanece em `/docs/context`, etc.
3. ✅ Verificar que ferramenta moveu para `/docs/docusaurus`

### Phase 3: Configuration Updates (1 hora)

1. ✅ Atualizar `docusaurus.config.ts` (paths relativos)
2. ✅ Atualizar `sidebars.ts` (se necessário)
3. ✅ Verificar imports em `src/components/`
4. ✅ Testar build: `cd docs/docusaurus && npm run build`
5. ✅ Testar dev server: `npm run start -- --port 3004`

### Phase 4: Code Updates (2-3 horas)

**Por categoria (ordem):**

1. ✅ Scripts de infraestrutura (start-all-services.sh, etc.)
2. ✅ Service Launcher (frontend/apps/service-launcher)
3. ✅ Componentes Frontend (Dashboard)
4. ✅ Documentação markdown (CLAUDE.md, README.md, guias)
5. ✅ Configs de deploy (Docker, CI/CD)

### Phase 5: Testing (1 hora)

1. ✅ Testar build: `cd docs/docusaurus && npm run build`
2. ✅ Testar dev server local
3. ✅ Testar Service Launcher start/stop
4. ✅ Testar scripts: `./start-all-services.sh`, `./status.sh`
5. ✅ Verificar Dashboard integração
6. ✅ Verificar links internos e assets (imagens, diagramas PlantUML)

### Phase 6: Deployment & Monitoring (30 minutos)

1. ✅ Commit mudanças com mensagem descritiva
2. ✅ Push para repositório
3. ✅ Monitorar CI/CD builds
4. ✅ Verificar deploy em staging (se aplicável)
5. ✅ Remover backup após confirmação de sucesso

**Tempo Total Estimado:** 6-7 horas

## Rollback Strategy

### Rollback Rápido (< 5 minutos)

Se descoberto imediatamente após migração:

```bash
# Restaurar do backup
cd /home/marce/projetos/TradingSystem
rm -rf docs
tar -xzf /tmp/docs-backup-YYYYMMDD-HHMMSS.tar.gz
```

### Rollback de Código (< 15 minutos)

Se já commitado:

```bash
# Reverter commits
git log --oneline | grep "relocate docusaurus"  # Encontrar hash
git revert <commit-hash>

# Ou reset (se não pushed)
git reset --hard HEAD~1
```

### Rollback Parcial

Se alguns serviços funcionam e outros não:

1. Manter arquivos no novo local
2. Criar symlink temporário: `ln -s docs/docusaurus docs-old`
3. Atualizar apenas serviços críticos
4. Agendar nova tentativa

## Open Questions

### Q1: Devemos mover arquivos de review/summary também?

**Arquivos em questão:**
- `DOCUMENTATION-REVIEW-2025-10-11.md`
- `IMPLEMENTATION-SUMMARY-2025-10-11.md`
- `VISUAL-DOCUMENTATION-SUMMARY-2025-10-11.md`

**Resposta Proposta:** ✅ SIM, manter na raiz `/docs` (são meta-documentação sobre o conteúdo, não sobre a ferramenta).

### Q2: O que fazer com `nginx.conf`?

**Análise:** Verificar se é específico do Docusaurus ou genérico para servir docs.

**Resposta Proposta:**
- Se específico do Docusaurus → mover para `/docs/docusaurus/`
- Se genérico para servir qualquer docs → manter em `/docs/`

### Q3: Como lidar com paths absolutos em ambiente de desenvolvimento vs produção?

**Cenário:** Alguns ambientes podem ter paths diferentes (`/home/marce/` vs `/app/` em container).

**Resposta Proposta:** Usar paths relativos sempre que possível; onde absolutamente necessário, usar variáveis de ambiente.

**Exemplo:**

```javascript
// Ruim
const docsPath = '/home/marce/projetos/TradingSystem/docs/docusaurus';

// Bom
const docsPath = process.env.DOCS_PATH || path.join(__dirname, '../../docs/docusaurus');
```

## Success Metrics

### Technical Metrics

- ✅ Build time não aumenta (max +5%)
- ✅ Dev server start time mantém < 10 segundos
- ✅ Todos os links internos funcionam (0 broken links)
- ✅ Todos os serviços passam health checks

### Process Metrics

- ✅ Zero downtime para usuários (docs acessíveis durante migração)
- ✅ Rollback plan testado e documentado
- ✅ Equipe pode executar novos comandos sem confusão

### Quality Metrics

- ✅ Documentação atualizada reflete nova estrutura
- ✅ Novos desenvolvedores conseguem seguir guias atualizados
- ✅ Busca no código encontra 0 referências ao path antigo (exceto histórico git)

## Conclusion

Esta migração é **baixa complexidade técnica** mas **alto impacto operacional**. O risco principal não é a complexidade da mudança em si, mas sim garantir que **todos os pontos de referência** sejam atualizados de forma consistente.

**Recomendação:** Executar em horário de baixo movimento, com pessoa de plantão para rollback rápido se necessário. Priorizar teste abrangente antes de commit final.

