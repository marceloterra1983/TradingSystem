---
title: 📋 Guia Rápido - OpenSpec
sidebar_position: 1
tags: [documentation]
domain: shared
type: reference
summary: 📋 Guia Rápido - OpenSpec
status: active
last_review: 2025-10-22
---

# 📋 Guia Rápido - OpenSpec

**Status**: ✅ OpenSpec configurado em `infrastructure/openspec/`

---

## 🚀 Comandos Principais

### Listar Changes (Propostas Ativas)

```bash
# Ver todas as changes em andamento
openspec list --root infrastructure/openspec

# Ver com mais detalhes
openspec list --long --root infrastructure/openspec

# Ver em JSON (para scripts)
openspec list --json --root infrastructure/openspec
```

---

### Listar Specs (Capacidades Existentes)

```bash
# Ver todas as especificações
openspec list --specs --root infrastructure/openspec

# Ver com mais detalhes
openspec spec list --long --root infrastructure/openspec

# Ver em JSON
openspec spec list --json --root infrastructure/openspec
```

---

### Ver Detalhes

```bash
# Ver detalhes de uma change
openspec show add-agent-integration-platform --root infrastructure/openspec

# Ver detalhes de uma spec
openspec show dashboard --type spec --root infrastructure/openspec

# Ver apenas os deltas (mudanças propostas)
openspec show add-agent-integration-platform --json --deltas-only --root infrastructure/openspec

# Ver diferenças (diff)
openspec diff add-agent-integration-platform --root infrastructure/openspec
```

---

### Validar

```bash
# Validar uma change específica
openspec validate add-agent-integration-platform --root infrastructure/openspec

# Validação estrita (recomendado)
openspec validate add-agent-integration-platform --strict --root infrastructure/openspec

# Validar todas as changes
openspec validate --root infrastructure/openspec
```

---

### Arquivar (Após Deploy)

```bash
# Arquivar change completada
openspec archive add-agent-integration-platform --root infrastructure/openspec

# Arquivar sem atualizar specs (tooling-only changes)
openspec archive add-agent-integration-platform --skip-specs --root infrastructure/openspec

# Modo não-interativo (sem confirmação)
openspec archive add-agent-integration-platform --yes --root infrastructure/openspec
```

---

## 📊 Conteúdo Atual do Projeto

### 📂 Changes Ativas (12 propostas)

```
1. add-agent-integration-platform
2. add-service-launcher-health-summary
3. add-timescaledb-layer
4. cleanup-history-submodules
5. enhance-ops-visibility
6. implement-documentation-api-crud
7. implement-unified-docs-specs
8. introduce-docspecs-integration
9. refactor-repo-structure
10. relocate-docusaurus-structure
11. remove-portainer-b3-stack
12. remove-traefik-proxy
```

**Ver detalhes**:
```bash
openspec show add-agent-integration-platform --root infrastructure/openspec
```

---

### 📂 Specs Existentes (5 capacidades)

```
1. dashboard               - Dashboard principal
2. docs                    - Sistema de documentação
3. docs-navigation         - Navegação de documentos
4. documentation-hosting   - Hosting de documentação
5. service-launcher        - Orquestrador de serviços
```

**Ver spec**:
```bash
openspec show dashboard --type spec --root infrastructure/openspec
```

**Ver arquivos diretamente**:
```bash
cat infrastructure/openspec/specs/dashboard/spec.md
cat infrastructure/openspec/specs/service-launcher/spec.md
```

---

### 📂 Archive (3 completadas)

```
1. 2025-10-13-update-docs-navigation-api-spec
2. 2025-10-14-integrate-llamaindex-rag
3. 2025-10-14-relocate-docusaurus-structure
```

---

## 💡 Atalhos Úteis

### Criar Alias (Opcional)

Para não precisar digitar `--root infrastructure/openspec` toda vez:

```bash
# Adicionar ao ~/.bashrc ou ~/.zshrc
alias ospec='openspec --root /home/marce/projetos/TradingSystem/infrastructure/openspec'

# Depois pode usar:
ospec list
ospec list --specs
ospec show dashboard --type spec
```

---

### Explorar Manualmente

```bash
# Ver todas as changes
ls infrastructure/openspec/changes/

# Ver todas as specs
ls infrastructure/openspec/specs/

# Ver change específica
cat infrastructure/openspec/changes/add-agent-integration-platform/proposal.md

# Ver spec específica
cat infrastructure/openspec/specs/dashboard/spec.md
```

---

## 🔍 Buscar no OpenSpec

### Buscar Requirements

```bash
# Buscar todos os requirements
rg -n "Requirement:" infrastructure/openspec/specs

# Buscar scenarios
rg -n "Scenario:" infrastructure/openspec/specs

# Buscar por palavra-chave
rg -i "authentication" infrastructure/openspec/specs

# Buscar em changes ativas
rg -n "Requirement:" infrastructure/openspec/changes
```

---

## 📖 Exemplos Práticos

### Ver Spec do Dashboard

```bash
openspec show dashboard --type spec --root infrastructure/openspec

# Ou ler diretamente
cat infrastructure/openspec/specs/dashboard/spec.md
```

### Ver Change Específica

```bash
openspec show add-service-launcher-health-summary --root infrastructure/openspec

# Ver apenas proposta
cat infrastructure/openspec/changes/add-service-launcher-health-summary/proposal.md

# Ver tasks
cat infrastructure/openspec/changes/add-service-launcher-health-summary/tasks.md
```

### Ver Diferenças (Diff)

```bash
# Ver o que vai mudar
openspec diff add-service-launcher-health-summary --root infrastructure/openspec
```

---

## 🎯 Workflow Completo

### 1. Listar o que existe
```bash
openspec list --specs --root infrastructure/openspec
```

### 2. Ver detalhes de uma spec
```bash
openspec show service-launcher --type spec --root infrastructure/openspec
```

### 3. Listar changes ativas
```bash
openspec list --root infrastructure/openspec
```

### 4. Ver proposta de mudança
```bash
openspec show add-service-launcher-health-summary --root infrastructure/openspec
```

### 5. Validar antes de implementar
```bash
openspec validate add-service-launcher-health-summary --strict --root infrastructure/openspec
```

---

## 📚 Estrutura dos Arquivos

```
infrastructure/openspec/
├── project.md              # Convenções do projeto
├── specs/                  # O que ESTÁ construído
│   ├── dashboard/
│   │   └── spec.md         # Requisitos do Dashboard
│   ├── service-launcher/
│   │   └── spec.md         # Requisitos do Launcher
│   └── ...
├── changes/                # O que DEVE mudar
│   ├── add-feature-x/
│   │   ├── proposal.md     # Por quê e o quê
│   │   ├── tasks.md        # Checklist implementação
│   │   └── specs/
│   │       └── dashboard/
│   │           └── spec.md # ADDED/MODIFIED/REMOVED
│   └── archive/            # Changes completadas
└── .openspec.json          # Configuração
```

---

## 💡 Dicas

### Sempre use `--root infrastructure/openspec`

O OpenSpec está em um subdiretório, então sempre adicione o flag `--root`:

```bash
openspec list --root infrastructure/openspec
openspec show dashboard --type spec --root infrastructure/openspec
openspec validate my-change --root infrastructure/openspec
```

### Ou navegue até o diretório

```bash
cd infrastructure/openspec
openspec list
openspec list --specs
openspec show dashboard --type spec
```

---

## 🔧 Comandos Úteis

### Exploração Rápida

```bash
# Ver estrutura
tree -L 2 infrastructure/openspec/

# Contar specs
ls infrastructure/openspec/specs/ | wc -l

# Contar changes ativas
ls infrastructure/openspec/changes/ | grep -v archive | wc -l

# Ver últimas changes arquivadas
ls -lt infrastructure/openspec/changes/archive/ | head -5
```

---

## 📝 Exemplo Completo

```bash
# 1. Listar specs existentes
cd /home/marce/projetos/TradingSystem
openspec list --specs --root infrastructure/openspec

# 2. Ver spec do service-launcher
openspec show service-launcher --type spec --root infrastructure/openspec

# 3. Ver change que adiciona health summary
openspec show add-service-launcher-health-summary --root infrastructure/openspec

# 4. Ver diferenças propostas
openspec diff add-service-launcher-health-summary --root infrastructure/openspec

# 5. Validar change
openspec validate add-service-launcher-health-summary --strict --root infrastructure/openspec
```

---

## 📚 Recursos

### Documentação
- `infrastructure/openspec/AGENTS.md` - Instruções completas para agentes
- `infrastructure/openspec/project.md` - Convenções do projeto

### Arquivos Importantes
```bash
# Ver convenções
cat infrastructure/openspec/project.md

# Ver instruções para agentes
cat infrastructure/openspec/AGENTS.md

# Ver config
cat infrastructure/openspec/.openspec.json
```

---

**Criado**: 2025-10-16  
**Status**: ✅ Guia completo com todos os comandos OpenSpec  
**Localização**: OpenSpec está em `infrastructure/openspec/`

