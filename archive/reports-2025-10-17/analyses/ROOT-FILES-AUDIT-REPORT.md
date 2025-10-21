# 📋 Auditoria de Arquivos na Raiz do Projeto

**Data:** 2025-10-15  
**Objetivo:** Avaliar todos os arquivos na raiz do TradingSystem quanto à finalidade e relevância

---

## 📊 Resumo Executivo

**Total de arquivos analisados:** 46  
**Status:**
- ✅ **Manter (Essenciais):** 25 arquivos
- ⚠️ **Revisar/Consolidar:** 10 arquivos
- 🗑️ **Remover (Obsoletos):** 11 arquivos

---

## 1️⃣ ARQUIVOS DE CONFIGURAÇÃO (Manter)

### ✅ `.editorconfig`
- **Finalidade:** Padrões de codificação (indentação, espaços, formatação)
- **Status:** ✅ ESSENCIAL
- **Detalhes:** Configura C#, Python, JS/TS, JSON, YAML, Markdown
- **Ação:** Manter

### ✅ `.gitattributes`
- **Finalidade:** Controle de line endings e diff handlers
- **Status:** ✅ ESSENCIAL
- **Detalhes:** Define tratamento de texto/binário, EOL por tipo de arquivo
- **Ação:** Manter

### ✅ `.gitignore`
- **Finalidade:** Exclusão de arquivos do controle de versão
- **Status:** ✅ ESSENCIAL
- **Detalhes:** 224 linhas, organizado por categoria, bem documentado
- **Ação:** Manter (revisar linha 107: referência obsoleta a `runs/`)

### ✅ `.gitmodules`
- **Finalidade:** Gerenciamento de submódulos Git
- **Status:** ⚠️ DESATUALIZADO
- **Detalhes:** Referência obsoleta a `external/Agent-MCP` (movido para `infrastructure/`)
- **Ação:** **ATUALIZAR PATH** (Agent-MCP agora em `infrastructure/`)

### ✅ `package.json` + `package-lock.json`
- **Finalidade:** Dependências raiz do workspace
- **Status:** ✅ NECESSÁRIO
- **Detalhes:** ESLint, TypeScript, express-rate-limit
- **Ação:** Manter

### ✅ `vitest.config.ts`
- **Finalidade:** Configuração de testes Vitest
- **Status:** ✅ NECESSÁRIO
- **Detalhes:** Ambiente jsdom, coverage 80%, exclusões corretas
- **Ação:** Manter

### ✅ `TradingSystem.code-workspace`
- **Finalidade:** Workspace do VS Code
- **Status:** ⚠️ REVISAR
- **Detalhes:** Referência a `../docker-local` (pasta externa?)
- **Ação:** **REVISAR** se `docker-local` ainda existe

### ✅ `TradingSystem.sln`
- **Finalidade:** Solution do Visual Studio (.NET/C#)
- **Status:** ✅ NECESSÁRIO
- **Detalhes:** Para serviços C# futuros (Data Capture, Order Manager)
- **Ação:** Manter

---

## 2️⃣ ARQUIVOS DE DOCUMENTAÇÃO

### ✅ `README.md`
- **Finalidade:** Documentação principal do projeto
- **Status:** ✅ ESSENCIAL
- **Ação:** Manter

### ✅ `CLAUDE.md`
- **Finalidade:** Instruções para agentes de IA (Claude, Cursor)
- **Status:** ✅ ESSENCIAL
- **Detalhes:** 495+ linhas, referência principal para AI assistants
- **Ação:** Manter

### ✅ `SYSTEM-OVERVIEW.md`
- **Finalidade:** Visão geral técnica do sistema
- **Status:** ✅ ESSENCIAL
- **Ação:** Manter

### ✅ `CHANGELOG.md`
- **Finalidade:** Histórico de mudanças do projeto
- **Status:** ✅ ESSENCIAL
- **Detalhes:** 367 linhas, bem estruturado, segue Keep a Changelog
- **Ação:** Manter

### ✅ `CONTRIBUTING.md`
- **Finalidade:** Guia para contribuidores
- **Status:** ✅ NECESSÁRIO
- **Detalhes:** 265 linhas
- **Ação:** Manter

### ⚠️ `CLEANUP-SUMMARY.md`
- **Finalidade:** Resumo de limpeza de pastas (2025-10-12)
- **Status:** ⚠️ ARQUIVO DE SESSÃO
- **Detalhes:** 189 linhas, documenta limpeza antiga
- **Ação:** **MOVER para `/archive/session-reports/`**

### ⚠️ `MARKDOWN-REVIEW-REPORT.md`
- **Finalidade:** Relatório de revisão de markdown
- **Status:** ⚠️ RELATÓRIO TÉCNICO
- **Detalhes:** 324 linhas
- **Ação:** **MOVER para `/docs/reports/`**

### ⚠️ `audit-report.txt`
- **Finalidade:** Inventário de dependências APT/Python
- **Status:** ⚠️ RELATÓRIO TÉCNICO
- **Detalhes:** Gerado em 2025-10-13
- **Ação:** **MOVER para `/docs/reports/` e renomear para `.md`**

---

## 3️⃣ SCRIPTS DE SETUP E CONFIGURAÇÃO

### ✅ `install.sh`
- **Finalidade:** Script principal de instalação
- **Status:** ✅ ESSENCIAL
- **Detalhes:** 4.0K, setup inicial do ambiente
- **Ação:** Manter

### ✅ `install-dependencies.sh`
- **Finalidade:** Instalação de dependências do projeto
- **Status:** ✅ ESSENCIAL
- **Detalhes:** 2.0K
- **Ação:** Manter

### ✅ `install-cursor-extensions.sh`
- **Finalidade:** Instalação de extensões do Cursor IDE
- **Status:** ✅ ÚTIL
- **Detalhes:** 1.4K
- **Ação:** Manter

### ⚠️ `configure-sudo-docker.sh`
- **Finalidade:** Configuração de Docker sem sudo
- **Status:** ⚠️ SETUP ÚNICO
- **Detalhes:** 2.7K, executado uma vez
- **Ação:** **MOVER para `/infrastructure/scripts/setup/`**

### ⚠️ `uninstall-docker-wsl.sh`
- **Finalidade:** Desinstalação do Docker no WSL
- **Status:** ⚠️ SCRIPT DE MANUTENÇÃO
- **Detalhes:** 1.8K, uso raro
- **Ação:** **MOVER para `/infrastructure/scripts/maintenance/`**

---

## 4️⃣ SCRIPTS DE INICIALIZAÇÃO

### ✅ `start-all-services.sh`
- **Finalidade:** Iniciar todos os serviços do projeto
- **Status:** ✅ ESSENCIAL
- **Detalhes:** 12K, script principal de start
- **Ação:** Manter

### ✅ `start-all-stacks.sh`
- **Finalidade:** Iniciar todos os stacks Docker Compose
- **Status:** ✅ ESSENCIAL
- **Detalhes:** 4.3K
- **Ação:** Manter

### ✅ `stop-all-stacks.sh`
- **Finalidade:** Parar todos os stacks Docker Compose
- **Status:** ✅ ESSENCIAL
- **Detalhes:** 3.1K
- **Ação:** Manter

### ✅ `QUICK-START.sh`
- **Finalidade:** Quick start do projeto
- **Status:** ✅ ÚTIL
- **Detalhes:** 2.3K
- **Ação:** Manter

### 🗑️ `start-agents-scheduler.sh`
- **Finalidade:** Iniciar scheduler da pasta `agents_platform/`
- **Status:** 🗑️ OBSOLETO
- **Detalhes:** Referencia pasta `agents_platform/` que foi removida
- **Ação:** **REMOVER** (agents_platform foi excluído do projeto)

### 🗑️ `start-agent-mcp.sh`
- **Finalidade:** Iniciar Agent-MCP
- **Status:** ⚠️ REVISAR
- **Detalhes:** 21K, grande script
- **Ação:** **MOVER para `/infrastructure/Agent-MCP/`** (centralizar com o submodule)

### 🗑️ `start-exa-node.js`
- **Finalidade:** Iniciar Exa.ai via Node.js
- **Status:** 🗑️ PROVAVELMENTE OBSOLETO
- **Detalhes:** Script Node.js para iniciar Exa
- **Ação:** **VERIFICAR** se ainda é usado, senão **REMOVER**

---

## 5️⃣ SCRIPTS DE MONITORAMENTO

### ✅ `status.sh`
- **Finalidade:** Verificar status de serviços
- **Status:** ✅ ESSENCIAL
- **Detalhes:** 12K, completo
- **Ação:** Manter

### ✅ `check-services.sh`
- **Finalidade:** Checar saúde dos serviços
- **Status:** ✅ ÚTIL
- **Detalhes:** 2.4K
- **Ação:** Manter

### ✅ `check-docker-permissions.sh`
- **Finalidade:** Verificar permissões do Docker
- **Status:** ✅ ÚTIL
- **Detalhes:** 4.2K, troubleshooting
- **Ação:** Manter

### ✅ `open-services.sh`
- **Finalidade:** Abrir serviços no navegador
- **Status:** ✅ ÚTIL
- **Detalhes:** 1.1K, conveniência
- **Ação:** Manter

---

## 6️⃣ WRAPPERS E ALIASES

### ✅ `glm` + `glm-modos`
- **Finalidade:** Wrappers para scripts GLM em `infrastructure/glm/`
- **Status:** ✅ CONVENIÊNCIA
- **Detalhes:** Permitem executar GLM da raiz do projeto
- **Ação:** Manter

---

## 7️⃣ ARQUIVOS DE AMBIENTE E SEGURANÇA

### ⚠️ `.env`
- **Finalidade:** Variáveis de ambiente (SECRETS)
- **Status:** ✅ NECESSÁRIO (mas não deve estar no repo)
- **Ação:** Verificar se está no `.gitignore` ✅

### 🗑️ `.env.example`
- **Status:** ❌ NÃO ENCONTRADO
- **Ação:** **Verificar** se existe em outro local ou criar

### 🗑️ `.env.security-notice`
- **Status:** ❌ NÃO ENCONTRADO
- **Ação:** Arquivo mencionado mas não existe

---

## 8️⃣ ARQUIVOS DE SESSÃO/TEMPORÁRIOS

### ⚠️ `.setup-complete.md`
- **Finalidade:** Documentação de setup de ambientes virtuais Python
- **Status:** ⚠️ DOCUMENTAÇÃO DE SESSÃO
- **Detalhes:** 122 linhas, documenta setup de 2025-10-13
- **Ação:** **MOVER para `/archive/session-reports/`** ou **CONSOLIDAR** em guia permanente

### ⚠️ `.welcome-message.sh`
- **Finalidade:** Script de boas-vindas exibindo ambientes virtuais
- **Status:** ✅ ÚTIL
- **Detalhes:** Mostra info quando abre terminal
- **Ação:** Manter (mas considerar mover para `/infrastructure/scripts/`)

### ⚠️ `.cursorrules-linux`
- **Finalidade:** Regras e comandos para desenvolvimento no Linux
- **Status:** ⚠️ DOCUMENTAÇÃO RÁPIDA
- **Detalhes:** 59 linhas, comandos úteis
- **Ação:** **CONSOLIDAR** em `/docs/context/ops/` ou manter como quick reference

---

## 9️⃣ ARQUIVOS DE PATCH/MODIFICAÇÃO

### 🗑️ `Agent-MCP.local.patch`
- **Finalidade:** Patch local para Agent-MCP submodule
- **Status:** 🗑️ POSSIVELMENTE OBSOLETO
- **Detalhes:** Diff mostrando mudanças no `.env.example`, health endpoints
- **Ação:** **VERIFICAR** se patch foi aplicado upstream, senão **MOVER para `/infrastructure/Agent-MCP/patches/`**

---

## 🔟 DOCKER COMPOSE

### ⚠️ `docker-compose.simple.yml`
- **Finalidade:** Compose simplificado (all-in-one)
- **Status:** ⚠️ DUPLICADO
- **Detalhes:** 169 linhas, duplica configs de `infrastructure/compose/`
- **Ação:** **REMOVER** se não é usado (preferir stacks modulares)

---

## 📋 RESUMO DE AÇÕES RECOMENDADAS

### 🗑️ REMOVER (11 arquivos)
1. `start-agents-scheduler.sh` - Referencia pasta removida
2. `.env.example` - Não existe (ou mover de outro local)
3. `.env.security-notice` - Não existe

### ⚠️ MOVER/RELOCAR (8 arquivos)

#### Para `/archive/session-reports/`:
4. `CLEANUP-SUMMARY.md` - Relatório de sessão

#### Para `/docs/reports/`:
5. `MARKDOWN-REVIEW-REPORT.md` - Relatório técnico
6. `audit-report.txt` → `DEPENDENCY-AUDIT-REPORT.md`

#### Para `/infrastructure/`:
7. `configure-sudo-docker.sh` → `infrastructure/scripts/setup/`
8. `uninstall-docker-wsl.sh` → `infrastructure/scripts/maintenance/`
9. `start-agent-mcp.sh` → `infrastructure/Agent-MCP/`
10. `.welcome-message.sh` → `infrastructure/scripts/`

#### Para `/infrastructure/Agent-MCP/patches/`:
11. `Agent-MCP.local.patch` - Se ainda necessário

### 🔍 VERIFICAR/REVISAR (3 arquivos)
12. `start-exa-node.js` - Verificar se ainda é usado
13. `docker-compose.simple.yml` - Verificar se é usado ou remover
14. `TradingSystem.code-workspace` - Verificar referência a `docker-local`

### ✏️ ATUALIZAR (2 arquivos)
15. `.gitmodules` - Atualizar path do Agent-MCP
16. `.gitignore` - Remover linha 107 (`runs/`)

---

## ✅ ARQUIVOS QUE DEVEM PERMANECER NA RAIZ (25)

### Configuração Essencial (9)
- `.editorconfig`
- `.gitattributes`
- `.gitignore` ✏️
- `.gitmodules` ✏️
- `package.json`
- `package-lock.json`
- `vitest.config.ts`
- `TradingSystem.code-workspace`
- `TradingSystem.sln`

### Documentação Principal (5)
- `README.md`
- `CLAUDE.md`
- `SYSTEM-OVERVIEW.md`
- `CHANGELOG.md`
- `CONTRIBUTING.md`

### Scripts Principais (9)
- `install.sh`
- `install-dependencies.sh`
- `install-cursor-extensions.sh`
- `start-all-services.sh`
- `start-all-stacks.sh`
- `stop-all-stacks.sh`
- `QUICK-START.sh`
- `status.sh`
- `check-services.sh`

### Utilidades (2)
- `glm`
- `glm-modos`

---

## 🎯 BENEFÍCIOS ESPERADOS

Após implementar as recomendações:

- ✅ **Raiz mais limpa** - 25 arquivos essenciais (vs 46 atuais)
- ✅ **Melhor organização** - Documentos em pastas apropriadas
- ✅ **Sem obsoletos** - Remove referências a código removido
- ✅ **Manutenibilidade** - Estrutura clara e consistente
- ✅ **Onboarding** - Mais fácil para novos desenvolvedores

---

**Próximos passos:** Implementar as ações recomendadas por categoria, começando pelas remoções mais óbvias.

