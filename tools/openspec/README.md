# OpenSpec - Spec-Driven Development Framework

> **Localização Canônica do OpenSpec**  
> Este é o diretório oficial do OpenSpec no projeto TradingSystem.  
> Todas as specs, changes e ferramentas estão centralizadas aqui.

## 📁 Estrutura

```
tools/openspec/
├── README.md               # Este arquivo
├── AGENTS.md              # Instruções para agentes de IA
├── CLAUDE.md              # Instruções específicas para Claude
├── project.md             # Convenções do projeto
├── cli.mjs                # CLI do OpenSpec
├── .openspec.json         # Configuração
├── openspec_jobs.yaml     # Jobs Kestra (CI/CD)
│
├── specs/                 # Especificações atuais (VERDADE)
│   ├── [capability]/
│   │   ├── spec.md        # Requisitos e cenários
│   │   └── design.md      # Decisões técnicas
│   └── ...
│
├── changes/               # Propostas de mudança (PLANEJAMENTO)
│   ├── [change-id]/
│   │   ├── proposal.md    # Por quê e o quê
│   │   ├── tasks.md       # Checklist de implementação
│   │   ├── design.md      # Decisões técnicas (opcional)
│   │   └── specs/         # Deltas de especificações
│   │       └── [capability]/
│   │           └── spec.md
│   │
│   └── archive/           # Mudanças implementadas
│       └── YYYY-MM-DD-[change-id]/
│
└── claude/                # Comandos customizados para Claude Code
    └── commands/
        └── openspec/
            └── *.md       # Slash commands (/openspec)
```

## 🚀 Quick Start

### Instalação

O OpenSpec já está configurado no projeto. Use via npm:

```bash
# Listar mudanças ativas
npm run openspec -- list

# Listar especificações
npm run openspec -- list --specs

# Ver detalhes de uma mudança
npm run openspec -- show [change-id]

# Validar uma mudança
npm run openspec -- validate [change-id] --strict

# Arquivar mudança implementada
npm run openspec -- archive [change-id] --yes
```

### Criar Nova Proposta

```bash
# 1. Entender contexto atual
npm run openspec -- list
npm run openspec -- list --specs

# 2. Criar estrutura de diretórios
mkdir -p changes/add-feature-name/specs/capability-name

# 3. Criar arquivos
cat > changes/add-feature-name/proposal.md << 'EOF'
## Why
[Problema ou oportunidade]

## What Changes
- [Mudanças propostas]

## Impact
- Affected specs: [capabilities]
- Affected code: [arquivos]
EOF

cat > changes/add-feature-name/tasks.md << 'EOF'
## 1. Implementation
- [ ] 1.1 Task description
- [ ] 1.2 Another task
EOF

# 4. Criar spec delta
cat > changes/add-feature-name/specs/capability-name/spec.md << 'EOF'
## ADDED Requirements
### Requirement: Feature Name
The system SHALL...

#### Scenario: Success case
- **WHEN** condition
- **THEN** expected result
EOF

# 5. Validar
npm run openspec -- validate add-feature-name --strict
```

## 📚 Documentação Completa

- **[AGENTS.md](AGENTS.md)** - Guia completo para agentes de IA
- **[project.md](project.md)** - Convenções e padrões do projeto
- **[CLAUDE.md](CLAUDE.md)** - Instruções para Claude Code

## 🔍 Comandos Úteis

### Busca

```bash
# Listar todas as specs
npm run openspec -- spec list --long

# Buscar texto nas specs
rg -n "Requirement:|Scenario:" tools/openspec/specs

# Ver detalhes de uma spec
npm run openspec -- show capability-name --type spec

# Ver deltas de uma mudança
npm run openspec -- show change-id --json --deltas-only
```

### Validação

```bash
# Validar mudança específica (strict mode)
npm run openspec -- validate change-id --strict

# Validar todas as mudanças
npm run openspec -- validate

# Debug de parsing
npm run openspec -- show change-id --json | jq '.deltas'
```

### Arquivamento

```bash
# Arquivar mudança implementada
npm run openspec -- archive change-id --yes

# Arquivar sem atualizar specs (apenas ferramental)
npm run openspec -- archive change-id --skip-specs --yes
```

## 🎯 Workflow de Desenvolvimento

### 1. Criar Proposta (Stage 1)

Quando criar proposta:
- ✅ Novas features ou funcionalidades
- ✅ Breaking changes (API, schema)
- ✅ Mudanças arquiteturais
- ✅ Otimizações de performance (que mudam comportamento)
- ✅ Atualizações de segurança

Quando NÃO criar:
- ❌ Bug fixes (restauram comportamento da spec)
- ❌ Typos, formatação, comentários
- ❌ Updates de dependências (non-breaking)
- ❌ Mudanças de configuração
- ❌ Testes para comportamento existente

### 2. Implementar (Stage 2)

1. Ler `proposal.md` - Entender o que está sendo construído
2. Ler `design.md` (se existe) - Revisar decisões técnicas
3. Ler `tasks.md` - Pegar checklist de implementação
4. Implementar tasks sequencialmente
5. Atualizar checklist conforme completa (`- [x]`)
6. **GATE:** Não começar sem aprovação da proposta!

### 3. Arquivar (Stage 3)

Após deployment:
1. Executar: `npm run openspec -- archive change-id --yes`
2. Commit separado para arquivamento
3. Validar: `npm run openspec -- validate --strict`

## ⚙️ Integração com CI/CD

O arquivo `openspec_jobs.yaml` contém jobs Kestra para:
- Validação automática de mudanças
- Arquivamento em production
- Sincronização de specs

**Kestra Dashboard:** http://localhost:8080 (quando rodando)

## 🔧 Troubleshooting

### "Change must have at least one delta"

```bash
# Verificar se existe specs/ com arquivos .md
ls changes/[name]/specs/

# Verificar se tem operações (## ADDED Requirements)
cat changes/[name]/specs/*/spec.md
```

### "Requirement must have at least one scenario"

```markdown
<!-- CORRETO -->
#### Scenario: Success case
- **WHEN** condition
- **THEN** result

<!-- ERRADO -->
- **Scenario: Success**  ❌
**Scenario**: Success    ❌
### Scenario: Success     ❌
```

### Silent scenario parsing failures

```bash
# Debug com JSON
npm run openspec -- show change-id --json --deltas-only | jq '.deltas'

# Formato exato requerido
#### Scenario: Name
```

## 📖 Best Practices

### Simplicidade Primeiro
- Default para < 100 linhas de código novo
- Implementações single-file até provar insuficiente
- Evitar frameworks sem justificativa clara
- Escolher padrões comprovados e "chatos"

### Naming Conventions

**Capabilities:**
- `user-auth` (verb-noun)
- Propósito único por capability
- Regra dos 10 minutos de compreensão
- Dividir se descrição precisa "AND"

**Change IDs:**
- `add-two-factor-auth` (kebab-case)
- Prefixos com verbos: `add-`, `update-`, `remove-`, `refactor-`
- Único; se já existe, adicionar `-2`, `-3`, etc.

## 🔗 Links Relacionados

- **[Project Root](../../README.md)** - Documentação principal do projeto
- **[CLAUDE.md](../../CLAUDE.md)** - Instruções para Claude Code (raiz)
- **[AI Agents](../../ai/AGENTS.md)** - Visão geral de ferramentas de IA

## ❌ OBSOLETO: /openspec/ na Raiz

**IMPORTANTE:** O diretório `/openspec/` na raiz do projeto foi REMOVIDO.

Ele era uma duplicação acidental. Todas as proposals antigas foram movidas para:
- **`/docs/proposals/PROP-003-rag-containerization/`**

**Use sempre:** `/tools/openspec/` como localização canônica!

---

**Última atualização:** 2025-10-31  
**Mantido por:** TradingSystem Development Team  
**Compatibilidade:** OpenSpec CLI v1.0+

