# 📋 Resumo da Migração Linux - TradingSystem

**Data:** 12 de Outubro de 2025  
**Versão:** 1.0

## 🎯 Objetivo

Migrar o projeto TradingSystem de ambiente Windows para Linux, mantendo compatibilidade com ambas as plataformas e garantindo que todos os serviços Node.js, Docker e ferramentas de desenvolvimento funcionem corretamente no Linux.

---

## ✅ Mudanças Realizadas

### 1. Scripts Bash Criados

Todos os scripts PowerShell foram convertidos para Bash:

| Script PowerShell | Script Bash | Localização |
|-------------------|-------------|-------------|
| `start-trading-system-dev.ps1` | `start-trading-system-dev.sh` | `infrastructure/scripts/` |
| `start-service-launcher.ps1` | `start-service-launcher.sh` | `infrastructure/scripts/` |
| `launch-service.ps1` | `launch-service.sh` | `infrastructure/scripts/` |
| `start-flowise.ps1` | `start-flowise.sh` | `infrastructure/scripts/` |
| - | `setup-linux-environment.sh` | `infrastructure/scripts/` (novo) |

**Recursos dos Scripts:**
- ✅ Detecção automática de terminal emulator (gnome-terminal, konsole, xterm)
- ✅ Fallback para execução em background se nenhum terminal estiver disponível
- ✅ Verificação de portas antes de iniciar serviços
- ✅ Instalação automática de dependências npm quando necessário
- ✅ Suporte a múltiplas flags/opções de linha de comando
- ✅ Mensagens coloridas e informativas

---

### 2. Documentação Criada

#### Guias Principais

| Documento | Descrição | Localização |
|-----------|-----------|-------------|
| **Linux Migration Guide** | Guia completo de migração com todos os passos detalhados | `docs/context/ops/linux-migration-guide.md` |
| **Linux Setup Checklist** | Checklist interativo para configuração inicial | `LINUX-SETUP-CHECKLIST.md` |
| **Scripts README** | Documentação completa de todos os scripts | `infrastructure/scripts/README.md` |
| **Quick Reference** | Referência rápida de comandos mais usados | `../../guides/onboarding/QUICK-REFERENCE.md` |
| **Migration Summary** | Este documento | `LINUX-MIGRATION-SUMMARY.md` |

#### Documentação Adicional

| Documento | Descrição | Localização |
|-----------|-----------|-------------|
| **Systemd Services** | Guia de configuração de serviços systemd | `infrastructure/systemd/README.md` |
| **Unit Files** | Arquivos de serviço systemd prontos para uso | `infrastructure/systemd/*.service` |

---

### 3. Configurações Docker

#### Profile Linux

O Docker Compose do monitoring stack foi configurado com profile Linux:

```yaml
node-exporter:
  profiles: ['linux']
```

**Uso:**
```bash
COMPOSE_PROFILES=linux docker compose up -d
```

#### Volumes e Permissões

- Caminhos relativos mantidos para compatibilidade
- Documentação sobre permissões adicionada
- Instruções para verificar e corrigir permissões

---

### 4. Systemd User Services (Opcional)

Criados unit files para executar serviços como systemd services:

- `tradingsystem-service-launcher.service`
- `tradingsystem-idea-bank.service`
- `tradingsystem-dashboard.service`

**Vantagens:**
- ✅ Auto-start no login
- ✅ Restart automático em caso de falha
- ✅ Logs centralizados com journalctl
- ✅ Gerenciamento via systemctl

---

### 5. README Principal Atualizado

Adicionada seção "🐧 Linux Support" ao README.md principal com:

- Quick start para Linux
- Lista de serviços suportados
- Lista de recursos do sistema necessários
- Links para documentação específica
- Exemplos de comandos

---

## 📦 Estrutura de Arquivos Criados/Modificados

```
TradingSystem/
├── infrastructure/
│   ├── scripts/
│   │   ├── start-trading-system-dev.sh       ✅ NOVO
│   │   ├── start-service-launcher.sh          ✅ NOVO
│   │   ├── launch-service.sh                  ✅ NOVO
│   │   ├── start-flowise.sh                   ✅ NOVO
│   │   ├── setup-linux-environment.sh         ✅ NOVO
│   │   ├── README.md                          ✅ NOVO
│   │   └── ../../guides/onboarding/QUICK-REFERENCE.md                 ✅ NOVO
│   └── systemd/                               ✅ NOVO
│       ├── README.md
│       ├── tradingsystem-service-launcher.service
│       ├── tradingsystem-idea-bank.service
│       └── tradingsystem-dashboard.service
├── docs/
│   └── context/
│       └── ops/
│           └── linux-migration-guide.md       ✅ NOVO
├── LINUX-SETUP-CHECKLIST.md                   ✅ NOVO
├── LINUX-MIGRATION-SUMMARY.md                 ✅ NOVO
└── README.md                                  🔄 ATUALIZADO
```

---

## 🚀 Como Usar (Quick Start)

### Primeira Vez no Linux

```bash
# 1. Navegar para o diretório do projeto
cd ~/projetos/TradingSystem

# 2. Executar script de setup
bash infrastructure/scripts/setup-linux-environment.sh

# 3. Seguir instruções para configurar arquivos .env
cd infrastructure/flowise
cp flowise.env.example .env
nano .env

cd ../tp-capital
cp tp-capital-signals.env.example tp-capital-signals.env
nano tp-capital-signals.env

# 4. Iniciar ambiente de desenvolvimento
cd ~/projetos/TradingSystem
./infrastructure/scripts/start-trading-system-dev.sh --start-monitoring
```

### Uso Diário

```bash
# Iniciar tudo
./infrastructure/scripts/start-trading-system-dev.sh --start-monitoring

# Parar tudo
pkill node
cd infrastructure/monitoring && docker compose down
```

---

## 📋 Checklist de Configuração

Use o checklist completo em `LINUX-SETUP-CHECKLIST.md`. Resumo:

- [ ] 1. Permissões de scripts (`chmod +x`)
- [ ] 2. Node.js/npm instalado
- [ ] 3. Docker instalado e configurado
- [ ] 4. Terminal emulator instalado
- [ ] 5. Ferramentas de sistema (`git`, `curl`, `lsof`)
- [ ] 6. Diretórios criados
- [ ] 7. Arquivos `.env` configurados
- [ ] 8. Variáveis de ambiente do shell
- [ ] 9. Dependências npm instaladas
- [ ] 10. Docker sem sudo
- [ ] 11. Extensões do Cursor/VSCode
- [ ] 12. Scripts testados

---

## 🔧 Dependências do Sistema

### Essenciais

```bash
# Ubuntu/Debian
sudo apt install -y git curl wget build-essential gnome-terminal lsof net-tools

# Arch Linux
sudo pacman -S git curl wget base-devel gnome-terminal lsof net-tools
```

### Node.js (via nvm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
```

### Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Logout e login novamente
```

---

## 🎯 Serviços Suportados no Linux

### ✅ Totalmente Suportados

| Serviço | Porta | Tecnologia |
|---------|-------|------------|
| Service Launcher API | 9999 | Node.js |
| Idea Bank API | 3200 | Node.js |
| Dashboard Frontend | 5173 | React + Vite |
| Documentação (Docusaurus) | 3004 | Node.js |
| TP Capital Signals API | 4005 | Node.js |
| QuestDB | 9000, 8812, 9009 | Docker |
| Prometheus | 9090 | Docker |
| Grafana | 3000 | Docker |
| Alertmanager | 9093 | Docker |

### ❌ Apenas Windows

| Serviço | Motivo |
|---------|--------|
| Data Capture (.NET) | Requer ProfitDLL (Windows-native DLL) |
| Order Manager (.NET) | Requer ProfitDLL (Windows-native DLL) |
| Analytics Pipeline (Python) | Integrado com ProfitDLL |

---

## 🛠️ Comandos Úteis

### Verificar Status

```bash
# Portas em uso
lsof -i :3200  # Idea Bank
lsof -i :5173  # Dashboard
lsof -i :9999  # Service Launcher

# Containers Docker
docker ps

# Processos Node
ps aux | grep node
```

### Parar Serviços

```bash
# Parar Node.js
pkill node

# Parar Docker
cd infrastructure/monitoring && docker compose down
cd frontend/apps/tp-capital/infrastructure && docker compose down
```

### Ver Logs

```bash
# Logs Docker
docker compose logs -f
docker logs -f <container-name>

# Logs de serviços
tail -f backend/api/idea-bank/logs/app.log
```

---

## 🔍 Diferenças Windows vs Linux

| Aspecto | Windows | Linux |
|---------|---------|-------|
| **Scripts** | `.ps1` (PowerShell) | `.sh` (Bash) |
| **Separador de caminho** | `\` | `/` |
| **Variáveis de ambiente** | `$env:VAR` | `$VAR` |
| **Permissões** | ACL | chmod/chown |
| **Terminal múltiplo** | Windows Terminal | gnome-terminal |
| **Processos** | Task Manager | ps/htop/lsof |
| **Startup automático** | Task Scheduler | systemd/cron |

---

## 🐛 Troubleshooting Comum

### Script não executa

```bash
chmod +x infrastructure/scripts/*.sh
```

### Docker requer sudo

```bash
sudo usermod -aG docker $USER
# Fazer logout e login novamente
```

### Porta já em uso

```bash
lsof -i :PORT | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Terminal não abre abas

```bash
sudo apt install gnome-terminal
# Ou os scripts farão fallback para background
```

---

## 📚 Documentação Completa

### Leitura Obrigatória

1. **[LINUX-SETUP-CHECKLIST.md](LINUX-SETUP-CHECKLIST.md)**  
   Checklist completo passo a passo

2. **[docs/context/ops/linux-migration-guide.md](docs/context/ops/linux-migration-guide.md)**  
   Guia detalhado com todas as configurações

3. **[infrastructure/scripts/README.md](infrastructure/scripts/README.md)**  
   Documentação completa dos scripts

### Referência Rápida

4. **[../../guides/onboarding/QUICK-REFERENCE.md](../../guides/onboarding/QUICK-REFERENCE.md)**  
   Comandos mais usados no dia a dia

### Opcionais

5. **[infrastructure/systemd/README.md](infrastructure/systemd/README.md)**  
   Configurar serviços systemd para autostart

---

## 🎉 Próximos Passos

### Imediato

1. ✅ Executar `setup-linux-environment.sh`
2. ✅ Configurar arquivos `.env`
3. ✅ Testar todos os scripts
4. ✅ Verificar que serviços iniciam corretamente

### Opcional

5. ⏳ Configurar systemd services para autostart
6. ⏳ Criar aliases personalizados no `.bashrc`
7. ⏳ Configurar backup automático

### Futuro

8. ⏳ CI/CD para ambiente Linux
9. ⏳ Documentação de deployment em servidor Linux
10. ⏳ Otimizações de performance específicas do Linux

---

## 📊 Compatibilidade

| Componente | Windows | Linux | Status |
|------------|---------|-------|--------|
| Node.js APIs | ✅ | ✅ | Completo |
| Frontend | ✅ | ✅ | Completo |
| Docker Services | ✅ | ✅ | Completo |
| Scripts de Dev | ✅ | ✅ | Completo |
| .NET Services | ✅ | ❌ | Limitação do ProfitDLL |
| Python Services | ✅ | ⚠️ | Parcial (sem ProfitDLL) |

---

## 🤝 Contribuindo

Se você encontrar problemas ou tiver sugestões de melhorias:

1. Abra uma issue no GitHub
2. Documente o problema encontrado
3. Sugira melhorias nos scripts
4. Compartilhe configurações úteis

---

## 📝 Notas Finais

### Considerações Importantes

1. **ProfitDLL é Windows-only**: Serviços de trading core ainda requerem Windows
2. **Ambiente Híbrido**: Você pode desenvolver no Linux e executar trading no Windows
3. **Performance**: Serviços Node.js e Docker têm performance equivalente ou melhor no Linux
4. **WSL2**: Você pode usar WSL2 no Windows para ter "o melhor dos dois mundos"

### Recomendações

- ✅ Use Linux para desenvolvimento de APIs Node.js
- ✅ Use Linux para stack de monitoring (Prometheus/Grafana)
- ✅ Use Linux para QuestDB e bancos de dados
- ⚠️ Mantenha Windows para serviços .NET/ProfitDLL

---

## 📞 Suporte

Se tiver dúvidas ou problemas:

1. Consulte a documentação completa
2. Verifique o troubleshooting
3. Execute o script de diagnóstico: `setup-linux-environment.sh`
4. Abra uma issue com detalhes do erro

---

**Autor:** Marcelo Terra  
**Data:** 12 de Outubro de 2025  
**Versão:** 1.0

---

**🎉 Parabéns! Seu ambiente Linux está configurado!**

Para começar, execute:
```bash
./infrastructure/scripts/start-trading-system-dev.sh --start-monitoring
```





