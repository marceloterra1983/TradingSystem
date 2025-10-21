# 📑 Índice Completo - Migração Linux

> Índice de todos os arquivos e recursos criados para suporte Linux

---

## 🚀 Comece Por Aqui

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| **[../../guides/onboarding/START-HERE-LINUX.md](../../guides/onboarding/START-HERE-LINUX.md)** | Ponto de partida com setup rápido | 👈 Primeira vez no Linux |
| **[LINUX-SETUP-CHECKLIST.md](LINUX-SETUP-CHECKLIST.md)** | Checklist interativo completo | Configuração passo a passo |
| **[LINUX-MIGRATION-SUMMARY.md](LINUX-MIGRATION-SUMMARY.md)** | Resumo técnico da migração | Entender o que foi feito |

---

## 📖 Documentação Detalhada

### Guias Principais

| Documento | Localização | Descrição |
|-----------|-------------|-----------|
| **Linux Migration Guide** | `docs/context/ops/linux-migration-guide.md` | Guia completo com todas as configurações detalhadas |
| **Scripts README** | `infrastructure/scripts/README.md` | Documentação completa de todos os scripts |
| **Quick Reference** | `../../guides/onboarding/QUICK-REFERENCE.md` | Comandos mais usados no dia a dia |
| **Systemd Services** | `infrastructure/systemd/README.md` | Configurar autostart com systemd (opcional) |

### Seções Específicas

#### Instalação e Setup
- [../../guides/onboarding/START-HERE-LINUX.md](../../guides/onboarding/START-HERE-LINUX.md) - Setup rápido (5 minutos)
- [LINUX-SETUP-CHECKLIST.md](LINUX-SETUP-CHECKLIST.md) - Checklist de 14 pontos
- [docs/context/ops/linux-migration-guide.md](docs/context/ops/linux-migration-guide.md) - Guia detalhado

#### Uso Diário
- [../../guides/onboarding/QUICK-REFERENCE.md](../../guides/onboarding/QUICK-REFERENCE.md) - Comandos mais usados
- [.cursorrules-linux](.cursorrules-linux) - Regras para Cursor no Linux

#### Referência Técnica
- [LINUX-MIGRATION-SUMMARY.md](LINUX-MIGRATION-SUMMARY.md) - Resumo técnico completo
- [infrastructure/scripts/README.md](infrastructure/scripts/README.md) - Documentação dos scripts

---

## 🛠️ Scripts Criados

### Scripts de Inicialização

| Script | Descrição | Uso |
|--------|-----------|-----|
| `start-trading-system-dev.sh` | Inicia todos os serviços de desenvolvimento | `./infrastructure/scripts/start-trading-system-dev.sh` |
| `start-service-launcher.sh` | Inicia Service Launcher API | `./infrastructure/scripts/start-service-launcher.sh` |
| `launch-service.sh` | Lança serviço genérico em nova aba | `./infrastructure/scripts/launch-service.sh --name "..." --dir "..." --command "..."` |

### Scripts de Configuração

| Script | Descrição | Uso |
|--------|-----------|-----|
| `setup-linux-environment.sh` | Setup automático do ambiente Linux | `bash infrastructure/scripts/setup-linux-environment.sh` |

**Localização:** `infrastructure/scripts/`

---

## 📄 Arquivos Systemd (Opcional)

### Unit Files

| Arquivo | Serviço | Porta |
|---------|---------|-------|
| `tradingsystem-service-launcher.service` | Service Launcher API | 9999 |
| `tradingsystem-idea-bank.service` | Idea Bank API | 3200 |
| `tradingsystem-dashboard.service` | Dashboard Frontend | 5173 |

**Localização:** `infrastructure/systemd/`
**Documentação:** `infrastructure/systemd/README.md`

---

## 🔧 Arquivos de Configuração

### Configurações Criadas/Modificadas

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `.cursorrules-linux` | Config | Regras para desenvolvimento Linux no Cursor |
| `README.md` | Doc | Atualizado com seção "🐧 Linux Support" |
| `infrastructure/monitoring/docker-compose.yml` | Config | Profile Linux para node-exporter |

### Arquivos de Ambiente

| Arquivo | Exemplo | Localização |
|---------|---------|-------------|
| `.env` | `flowise.env.example` | `infrastructure/flowise/` |
| `tp-capital-signals.env` | `tp-capital-signals.env.example` | `frontend/apps/tp-capital/infrastructure/` |

---

## 📊 Mapa de Documentação

```
TradingSystem/
│
├── 🚀 INÍCIO RÁPIDO
│   ├── ../../guides/tooling/CURSOR-SETUP-RAPIDO.md                 ⚡ Setup ultra-rápido
│   ├── ../../guides/onboarding/START-HERE-LINUX.md                    ⭐ Comece aqui!
│   ├── ../../guides/tooling/CURSOR-LINUX-SETUP.md                  🎯 Setup do Cursor
│   ├── LINUX-INDEX.md                         📑 Este arquivo
│   └── .cursorrules-linux                     ⚙️ Regras Cursor
│
├── 📋 CHECKLISTS E GUIAS
│   ├── LINUX-SETUP-CHECKLIST.md              ✅ Checklist de 14 passos
│   ├── LINUX-MIGRATION-SUMMARY.md            📊 Resumo técnico
│   └── docs/context/ops/
│       └── linux-migration-guide.md          📖 Guia completo
│
├── 🛠️ SCRIPTS BASH
│   └── infrastructure/scripts/
│       ├── start-trading-system-dev.sh       🚀 Inicia tudo
│       ├── start-service-launcher.sh         🔧 Service Launcher
│       ├── launch-service.sh                 🪟 Serviço genérico
│       ├── setup-linux-environment.sh        ⚙️ Setup automático
│       ├── README.md                         📘 Documentação
│       └── ../../guides/onboarding/QUICK-REFERENCE.md                ⚡ Referência rápida
│
├── 🔄 SYSTEMD (Opcional)
│   └── infrastructure/systemd/
│       ├── README.md                         📖 Guia systemd
│       ├── tradingsystem-service-launcher.service
│       ├── tradingsystem-idea-bank.service
│       └── tradingsystem-dashboard.service
│
└── 📚 DOCUMENTAÇÃO PRINCIPAL
    └── README.md                             📘 README atualizado
```

---

## 🎯 Fluxo de Uso Recomendado

### 1. Primeira Vez

```
../../guides/onboarding/START-HERE-LINUX.md
      ↓
setup-linux-environment.sh
      ↓
LINUX-SETUP-CHECKLIST.md
      ↓
Configurar .env files
      ↓
start-trading-system-dev.sh
```

### 2. Uso Diário

```
../../guides/onboarding/QUICK-REFERENCE.md
      ↓
start-trading-system-dev.sh
      ↓
Desenvolvimento
      ↓
pkill node / docker compose down
```

### 3. Troubleshooting

```
Erro encontrado
      ↓
../../guides/onboarding/QUICK-REFERENCE.md (Troubleshooting)
      ↓
LINUX-MIGRATION-GUIDE.md (Troubleshooting)
      ↓
LINUX-SETUP-CHECKLIST.md (Verificação)
```

---

## 📞 Busca Rápida

### "Como faço para..."

| Pergunta | Resposta |
|----------|----------|
| **Configurar o Cursor para Linux?** | [../../guides/tooling/CURSOR-LINUX-SETUP.md](../../guides/tooling/CURSOR-LINUX-SETUP.md) ⭐ |
| **Configurar o ambiente pela primeira vez?** | [../../guides/onboarding/START-HERE-LINUX.md](../../guides/onboarding/START-HERE-LINUX.md) |
| **Ver checklist completo?** | [LINUX-SETUP-CHECKLIST.md](LINUX-SETUP-CHECKLIST.md) |
| **Iniciar os serviços?** | `./infrastructure/scripts/start-trading-system-dev.sh` |
| **Parar os serviços?** | `pkill node && docker compose down` |
| **Ver comandos úteis?** | [../../guides/onboarding/QUICK-REFERENCE.md](../../guides/onboarding/QUICK-REFERENCE.md) |
| **Resolver um problema?** | [Linux Migration Guide - Troubleshooting](docs/context/ops/linux-migration-guide.md#troubleshooting) |
| **Configurar autostart?** | [Systemd README](infrastructure/systemd/README.md) |
| **Entender o que mudou?** | [LINUX-MIGRATION-SUMMARY.md](LINUX-MIGRATION-SUMMARY.md) |
| **Ver documentação dos scripts?** | [Scripts README](infrastructure/scripts/README.md) |
| **Ver configurações do VSCode?** | [.vscode/README.md](.vscode/README.md) |

---

## 🔍 Por Tipo de Arquivo

### Markdown (Documentação)

| Arquivo | Tamanho | Categoria |
|---------|---------|-----------|
| ../../guides/onboarding/START-HERE-LINUX.md | ~ 3 KB | Quick Start |
| LINUX-INDEX.md | ~ 5 KB | Índice |
| LINUX-SETUP-CHECKLIST.md | ~ 8 KB | Checklist |
| LINUX-MIGRATION-SUMMARY.md | ~ 12 KB | Resumo Técnico |
| linux-migration-guide.md | ~ 15 KB | Guia Completo |
| infrastructure/scripts/README.md | ~ 10 KB | Scripts Docs |
| ../../guides/onboarding/QUICK-REFERENCE.md | ~ 3 KB | Referência |
| infrastructure/systemd/README.md | ~ 6 KB | Systemd Guide |

### Shell Scripts (.sh)

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| start-trading-system-dev.sh | ~150 | Inicia ambiente dev |
| start-service-launcher.sh | ~60 | Inicia Service Launcher |
| launch-service.sh | ~80 | Lança serviço genérico |
| setup-linux-environment.sh | ~150 | Setup automático |

### Systemd Unit Files (.service)

| Arquivo | Serviço |
|---------|---------|
| tradingsystem-service-launcher.service | Service Launcher |
| tradingsystem-idea-bank.service | Idea Bank API |
| tradingsystem-dashboard.service | Dashboard |

### Configuração

| Arquivo | Tipo |
|---------|------|
| .cursorrules-linux | Cursor Rules |
| README.md | Main README (modificado) |

---

## 📈 Estatísticas

### Arquivos Criados

- **Documentação Markdown:** 9 arquivos
- **Scripts Bash:** 5 arquivos
- **Unit Files Systemd:** 3 arquivos
- **Configuração:** 2 arquivos

**Total:** 19 arquivos novos + 1 modificado (README.md)

### Linhas de Código/Documentação

- **Scripts Bash:** ~540 linhas
- **Documentação:** ~1200 linhas
- **Unit Files:** ~60 linhas

**Total:** ~1800 linhas

---

## ✅ Validação

### Checklist de Qualidade

- [x] Todos os scripts PowerShell têm equivalente Bash
- [x] Documentação completa criada
- [x] Checklist interativo disponível
- [x] Quick reference para uso diário
- [x] Guia de troubleshooting incluído
- [x] Exemplos de uso para todos os scripts
- [x] Systemd services documentados
- [x] README principal atualizado
- [x] Índice mestre criado
- [x] Fluxo de uso documentado

---

## 🎓 Para Novos Usuários

**Recomendação de leitura (ordem):**

1. **[../../guides/onboarding/START-HERE-LINUX.md](../../guides/onboarding/START-HERE-LINUX.md)** (5 min)
   → Quick start e overview

2. **[LINUX-SETUP-CHECKLIST.md](LINUX-SETUP-CHECKLIST.md)** (15-30 min)
   → Seguir o checklist passo a passo

3. **[../../guides/onboarding/QUICK-REFERENCE.md](../../guides/onboarding/QUICK-REFERENCE.md)** (5 min)
   → Comandos para uso diário

4. **[LINUX-MIGRATION-SUMMARY.md](LINUX-MIGRATION-SUMMARY.md)** (10 min)
   → Entender o que foi feito tecnicamente

5. **[docs/context/ops/linux-migration-guide.md](docs/context/ops/linux-migration-guide.md)** (referência)
   → Consultar quando necessário

---

## 🔗 Links Úteis

### Internos

- [README Principal](README.md)
- [CONTRIBUTING](CONTRIBUTING.md)
- [CLAUDE.md](CLAUDE.md)

### Externos

- [Docker on Linux](https://docs.docker.com/engine/install/ubuntu/)
- [Node.js via NVM](https://github.com/nvm-sh/nvm)
- [Systemd User Services](https://wiki.archlinux.org/title/Systemd/User)

---

**📅 Última Atualização:** 12 de Outubro de 2025
**👤 Autor:** Marcelo Terra
**📌 Versão:** 1.0

---

**🎉 Tudo pronto para Linux!**

Comece em: **[../../guides/onboarding/START-HERE-LINUX.md](../../guides/onboarding/START-HERE-LINUX.md)**
