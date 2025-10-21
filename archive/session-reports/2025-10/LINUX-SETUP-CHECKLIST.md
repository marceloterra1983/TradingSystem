# ✅ Checklist de Configuração Linux - TradingSystem

Execute estes passos após mover o projeto para o ambiente Linux.

## 🚀 Setup Rápido

Execute o script de configuração automática:

```bash
cd ~/projetos/TradingSystem
bash infrastructure/scripts/setup-linux-environment.sh
```

---

## 📝 Checklist Manual

### 1. Permissões de Scripts

```bash
# Tornar todos os scripts bash executáveis
chmod +x infrastructure/scripts/*.sh

# Verificar
ls -la infrastructure/scripts/*.sh
```

**Status:** ⬜

---

### 2. Dependências do Sistema

#### Node.js e npm

```bash
# Verificar instalação
node --version
npm --version

# Se não estiver instalado, usar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
```

**Status:** ⬜

#### Docker

```bash
# Verificar instalação
docker --version
docker compose version

# Se não estiver instalado
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
# Fazer logout e login novamente
```

**Status:** ⬜

#### Terminal Emulator

```bash
# Verificar se está instalado
gnome-terminal --version

# Se não estiver instalado (Ubuntu/Debian)
sudo apt install gnome-terminal

# Alternativas: konsole (KDE) ou xterm
```

**Status:** ⬜

#### Ferramentas de sistema

```bash
# Ubuntu/Debian
sudo apt install -y git curl wget build-essential lsof net-tools

# Verificar
which git curl wget lsof
```

**Status:** ⬜

---

### 3. Estrutura de Diretórios

```bash
# Criar diretórios necessários
cd ~/projetos/TradingSystem

mkdir -p frontend/apps/tp-capital/logs
mkdir -p backend/api/idea-bank/uploads
mkdir -p backend/api/documentation-api/uploads

# Verificar
ls -la frontend/apps/tp-capital/logs
```

**Status:** ⬜

---

### 4. Arquivos de Ambiente

#### TP Capital Signals

```bash
cd frontend/apps/tp-capital/infrastructure
cp tp-capital-signals.env.example tp-capital-signals.env
nano tp-capital-signals.env  # Adicionar tokens

# Verificar (não mostrar senhas)
cat tp-capital-signals.env | grep -v "^#" | grep -v "^$"
```

**Status:** ⬜

---

### 5. Variáveis de Ambiente do Shell

```bash
# Adicionar ao ~/.bashrc ou ~/.zshrc
cat >> ~/.bashrc << 'EOF'

# TradingSystem
export TRADING_SYSTEM_ROOT="$HOME/projetos/TradingSystem"
export PATH="$TRADING_SYSTEM_ROOT/infrastructure/scripts:$PATH"
export COMPOSE_PROFILES=linux

EOF

# Recarregar
source ~/.bashrc

# Verificar
echo $TRADING_SYSTEM_ROOT
```

**Status:** ⬜

---

### 6. Dependências Node.js

```bash
cd ~/projetos/TradingSystem

# Idea Bank API
cd backend/api/idea-bank
npm install
cd ../../..

# Service Launcher
cd frontend/apps/service-launcher
npm install
cd ../../..

# Dashboard
cd frontend/apps/dashboard
npm install
cd ../../..

# Documentação
cd docs
npm install
cd ..
```

**Status:** ⬜

---

### 7. Configuração Docker

```bash
# Testar Docker sem sudo
docker ps

# Se der erro de permissão, verificar grupo
groups | grep docker

# Se não estiver no grupo
sudo usermod -aG docker $USER
# Logout e login novamente

# Testar novamente
docker ps
```

**Status:** ⬜

---

### 8. Configuração do Cursor/VSCode

#### Extensões

- [ ] Remote - WSL (se usar WSL)
- [ ] Docker
- [ ] ESLint
- [ ] Prettier
- [ ] GitLens

#### Settings

```bash
# Criar diretório .vscode se não existir
mkdir -p .vscode

# Copiar configurações (se houver templates)
# Ou criar manualmente
```

**Status:** ⬜

---

### 9. Teste dos Scripts

#### Service Launcher

```bash
./infrastructure/scripts/start-service-launcher.sh

# Verificar se está rodando
curl http://localhost:9999/health

# Parar
pkill -f "node.*service-launcher"
```

**Status:** ⬜

#### Todos os Serviços de Dev

```bash
./infrastructure/scripts/start-trading-system-dev.sh

# Verificar portas
lsof -i :3200  # Idea Bank
lsof -i :5173  # Dashboard
lsof -i :3004  # Docs

# Testar nos navegadores
# http://localhost:3200
# http://localhost:5173
# http://localhost:3004
```

**Status:** ⬜

#### Stack de Monitoring

```bash
cd infrastructure/monitoring
COMPOSE_PROFILES=linux docker compose up -d

# Verificar containers
docker ps

# Acessar interfaces
# http://localhost:9090 - Prometheus
# http://localhost:3000 - Grafana (admin/admin)
# http://localhost:9093 - Alertmanager

# Parar
docker compose down
```

**Status:** ⬜

### 10. Git Configuration

```bash
# Verificar configuração
git config --list

# Configurar se necessário
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"

# Configurar line endings para Linux
git config --global core.autocrlf input
```

**Status:** ⬜

---

### 11. Firewall (Opcional)

Se você tiver firewall ativo, liberar as portas:

```bash
# UFW (Ubuntu)
sudo ufw allow 3000/tcp   # Grafana
sudo ufw allow 3004/tcp   # Docs
sudo ufw allow 3200/tcp   # Idea Bank
sudo ufw allow 5173/tcp   # Dashboard
sudo ufw allow 9090/tcp   # Prometheus
sudo ufw allow 9093/tcp   # Alertmanager
sudo ufw allow 9999/tcp   # Service Launcher

# Verificar status
sudo ufw status
```

**Status:** ⬜ (N/A se não usar firewall)

---

### 12. Backup de Dados (Recomendado)

```bash
# Fazer backup dos dados importantes
tar -czf ~/trading-system-backup-$(date +%Y%m%d).tar.gz \
  data/ \
  infrastructure/flowise/.env \
  frontend/apps/tp-capital/infrastructure/tp-capital-signals.env

# Verificar backup
ls -lh ~/trading-system-backup-*.tar.gz
```

**Status:** ⬜

---

## 🎯 Verificação Final

Execute todos os testes para verificar que tudo está funcionando:

```bash
# 1. Testar scripts
./infrastructure/scripts/start-service-launcher.sh
sleep 5
curl http://localhost:9999/health

# 2. Testar Docker
cd infrastructure/monitoring
COMPOSE_PROFILES=linux docker compose up -d
docker ps
curl http://localhost:9090

# 3. Limpar tudo
docker compose down
pkill node

# 4. Iniciar ambiente completo
./infrastructure/scripts/start-trading-system-dev.sh --start-monitoring
```

**Status:** ⬜

---

## 📚 Documentação

- [ ] Revisar: `docs/context/ops/linux-migration-guide.md`
- [ ] Revisar: `README.md`
- [ ] Criar alias personalizados (opcional)

---

## 🆘 Troubleshooting

### Scripts não executam

```bash
chmod +x infrastructure/scripts/*.sh
```

### Docker requer sudo

```bash
sudo usermod -aG docker $USER
# Logout e login
```

### Porta já em uso

```bash
lsof -i :PORTA
kill -9 PID
```

### node_modules com problemas

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## ✅ Checklist Resumido

- [ ] 1. Permissões de scripts (`chmod +x`)
- [ ] 2. Node.js/npm instalado
- [ ] 3. Docker instalado e configurado
- [ ] 4. Terminal emulator instalado
- [ ] 5. Ferramentas de sistema
- [ ] 6. Diretórios criados
- [ ] 7. Arquivos .env configurados
- [ ] 8. Variáveis de ambiente do shell
- [ ] 9. Dependências npm instaladas
- [ ] 10. Docker sem sudo
- [ ] 11. Extensões do Cursor/VSCode
- [ ] 12. Scripts testados
- [ ] 13. Git configurado
- [ ] 14. Backup realizado

---

**Data:** 12 de Outubro de 2025

Para mais detalhes, consulte o guia completo em:
`docs/context/ops/linux-migration-guide.md`



