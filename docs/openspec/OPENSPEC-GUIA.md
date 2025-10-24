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

**Status**: ✅ OpenSpec configurado em `tools/openspec/`

---

## 🚀 Comandos Principais

### Listar Changes (Propostas Ativas)

```bash
# Ver todas as changes em andamento
openspec list --root tools/openspec

# Ver com mais detalhes
openspec list --long --root tools/openspec

# Ver em JSON (para scripts)
openspec list --json --root tools/openspec
```

---

### Listar Specs (Capacidades Existentes)

```bash
# Ver todas as especificações
openspec list --specs --root tools/openspec

# Ver com mais detalhes
openspec spec list --long --root tools/openspec

# Ver em JSON
openspec spec list --json --root tools/openspec
```

---

### Ver Detalhes

```bash
# Ver detalhes de uma change
openspec show add-agent-integration-platform --root tools/openspec

# Ver detalhes de uma spec
openspec show dashboard --type spec --root tools/openspec

# Ver apenas os deltas (mudanças propostas)
openspec show add-agent-integration-platform --json --deltas-only --root tools/openspec

# Ver diferenças (diff)
openspec diff add-agent-integration-platform --root tools/openspec
```

---

### Validar

```bash
# Validar uma change específica
openspec validate add-agent-integration-platform --root tools/openspec

# Validação estrita (recomendado)
openspec validate add-agent-integration-platform --strict --root tools/openspec

# Validar todas as changes
openspec validate --root tools/openspec
```

---

### Arquivar (Após Deploy)

```bash
# Arquivar change completada
openspec archive add-agent-integration-platform --root tools/openspec

# Arquivar sem atualizar specs (tooling-only changes)
openspec archive add-agent-integration-platform --skip-specs --root tools/openspec

# Modo não-interativo (sem confirmação)
openspec archive add-agent-integration-platform --yes --root tools/openspec
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
openspec show add-agent-integration-platform --root tools/openspec
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
openspec show dashboard --type spec --root tools/openspec
```

**Ver arquivos diretamente**:
```bash
cat tools/openspec/specs/dashboard/spec.md
cat tools/openspec/specs/service-launcher/spec.md
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

Para não precisar digitar `--root tools/openspec` toda vez:

```bash
# Adicionar ao ~/.bashrc ou ~/.zshrc
alias ospec='openspec --root /home/marce/projetos/TradingSystem/tools/openspec'

# Depois pode usar:
ospec list
ospec list --specs
ospec show dashboard --type spec
```

---

### Explorar Manualmente

```bash
# Ver todas as changes
ls tools/openspec/changes/

# Ver todas as specs
ls tools/openspec/specs/

# Ver change específica
cat tools/openspec/changes/add-agent-integration-platform/proposal.md

# Ver spec específica
cat tools/openspec/specs/dashboard/spec.md
```

---

## 🔍 Buscar no OpenSpec

### Buscar Requirements

```bash
# Buscar todos os requirements
rg -n "Requirement:" tools/openspec/specs

# Buscar scenarios
rg -n "Scenario:" tools/openspec/specs

# Buscar por palavra-chave
rg -i "authentication" tools/openspec/specs

# Buscar em changes ativas
rg -n "Requirement:" tools/openspec/changes
```

---

## 📖 Exemplos Práticos

### Ver Spec do Dashboard

```bash
openspec show dashboard --type spec --root tools/openspec

# Ou ler diretamente
cat tools/openspec/specs/dashboard/spec.md
```

### Ver Change Específica

```bash
openspec show add-service-launcher-health-summary --root tools/openspec

# Ver apenas proposta
cat tools/openspec/changes/add-service-launcher-health-summary/proposal.md

# Ver tasks
cat tools/openspec/changes/add-service-launcher-health-summary/tasks.md
```

### Ver Diferenças (Diff)

```bash
# Ver o que vai mudar
openspec diff add-service-launcher-health-summary --root tools/openspec
```

---

## 🎯 Workflow Completo

### 1. Listar o que existe
```bash
openspec list --specs --root tools/openspec
```

### 2. Ver detalhes de uma spec
```bash
openspec show service-launcher --type spec --root tools/openspec
```

### 3. Listar changes ativas
```bash
openspec list --root tools/openspec
```

### 4. Ver proposta de mudança
```bash
openspec show add-service-launcher-health-summary --root tools/openspec
```

### 5. Validar antes de implementar
```bash
openspec validate add-service-launcher-health-summary --strict --root tools/openspec
```

---

## 📚 Estrutura dos Arquivos

```
tools/openspec/
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

### Sempre use `--root tools/openspec`

O OpenSpec está em um subdiretório, então sempre adicione o flag `--root`:

```bash
openspec list --root tools/openspec
openspec show dashboard --type spec --root tools/openspec
openspec validate my-change --root tools/openspec
```

### Ou navegue até o diretório

```bash
cd tools/openspec
openspec list
openspec list --specs
openspec show dashboard --type spec
```

---

## 🔧 Comandos Úteis

### Exploração Rápida

```bash
# Ver estrutura
tree -L 2 tools/openspec/

# Contar specs
ls tools/openspec/specs/ | wc -l

# Contar changes ativas
ls tools/openspec/changes/ | grep -v archive | wc -l

# Ver últimas changes arquivadas
ls -lt tools/openspec/changes/archive/ | head -5
```

---

## 📝 Exemplo Completo

```bash
# 1. Listar specs existentes
cd /home/marce/projetos/TradingSystem
openspec list --specs --root tools/openspec

# 2. Ver spec do service-launcher
openspec show service-launcher --type spec --root tools/openspec

# 3. Ver change que adiciona health summary
openspec show add-service-launcher-health-summary --root tools/openspec

# 4. Ver diferenças propostas
openspec diff add-service-launcher-health-summary --root tools/openspec

# 5. Validar change
openspec validate add-service-launcher-health-summary --strict --root tools/openspec
```

---

## 📚 Recursos

### Documentação
- `tools/openspec/AGENTS.md` - Instruções completas para agentes
- `tools/openspec/project.md` - Convenções do projeto

### Arquivos Importantes
```bash
# Ver convenções
cat tools/openspec/project.md

# Ver instruções para agentes
cat tools/openspec/AGENTS.md

# Ver config
cat tools/openspec/.openspec.json
```

---

**Criado**: 2025-10-16  
**Status**: ✅ Guia completo com todos os comandos OpenSpec  
**Localização**: OpenSpec está em `tools/openspec/`

