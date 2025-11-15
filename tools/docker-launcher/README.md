# Docker Control Server

Servidor HTTP local para gerenciar containers Docker sem precisar de `sudo` a cada comando.

## 🎯 Objetivo

Facilitar o gerenciamento de containers Docker através de:
- **API HTTP**: Endpoints REST para controlar containers
- **CLI**: Script Bash para uso no terminal
- **Status Bar**: Integração com Cursor para controle rápido
- **Systemd Service**: Execução automática no boot

## 🚀 Instalação

### 1. Instalação Rápida

```bash
cd /home/marce/Projetos/TradingSystem
sudo bash tools/docker-launcher/install.sh
```

O script irá:
- ✓ Verificar requisitos (Docker, Node.js, usuário no grupo docker)
- ✓ Instalar service systemd
- ✓ Iniciar servidor automaticamente
- ✓ Configurar para iniciar no boot

### 2. Instalação Manual

Se preferir instalar manualmente:

```bash
# 1. Adicionar usuário ao grupo docker (se necessário)
sudo usermod -aG docker $USER
newgrp docker  # ou faça logout/login

# 2. Copiar service para systemd
sudo cp tools/docker-launcher/docker-control.service /etc/systemd/system/

# 3. Habilitar e iniciar service
sudo systemctl daemon-reload
sudo systemctl enable docker-control.service
sudo systemctl start docker-control.service

# 4. Verificar status
sudo systemctl status docker-control.service
```

## 📖 Uso

### API HTTP

**Base URL**: `http://127.0.0.1:9880`

#### Health Check
```bash
curl http://127.0.0.1:9880/health
```

#### Listar Containers
```bash
curl http://127.0.0.1:9880/containers
```

#### Reiniciar Container
```bash
curl -X POST http://127.0.0.1:9880 \
  -H "Content-Type: application/json" \
  -d '{"action":"restart","container":"dashboard"}'
```

#### Parar Container
```bash
curl -X POST http://127.0.0.1:9880 \
  -H "Content-Type: application/json" \
  -d '{"action":"stop","container":"docs-hub"}'
```

#### Logs do Container
```bash
curl -X POST http://127.0.0.1:9880 \
  -H "Content-Type: application/json" \
  -d '{"action":"logs","container":"workspace-api"}'
```

### CLI (Linha de Comando)

O CLI wrapper facilita o uso:

```bash
# Listar containers rodando
tools/docker-launcher/docker-control-cli.sh list

# Reiniciar container
tools/docker-launcher/docker-control-cli.sh restart dashboard

# Reiniciar Dashboard com limpeza automática de imagens antigas
bash tools/docker-launcher/restart-dashboard-clean.sh

# Ver logs
tools/docker-launcher/docker-control-cli.sh logs docs-hub

# Parar container
tools/docker-launcher/docker-control-cli.sh stop workspace-api

# Iniciar container
tools/docker-launcher/docker-control-cli.sh start workspace-api

# Check health
tools/docker-launcher/docker-control-cli.sh health dashboard
```

### Integração com Cursor

Para adicionar ao status bar do Cursor, crie arquivo `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Docker: Restart Dashboard",
      "type": "shell",
      "command": "tools/docker-launcher/docker-control-cli.sh restart dashboard",
      "problemMatcher": []
    },
    {
      "label": "Docker: Restart Docs",
      "type": "shell",
      "command": "tools/docker-launcher/docker-control-cli.sh restart docs-hub",
      "problemMatcher": []
    },
    {
      "label": "Docker: List Containers",
      "type": "shell",
      "command": "tools/docker-launcher/docker-control-cli.sh list",
      "problemMatcher": []
    }
  ]
}
```

Depois, adicione botões ao status bar em `.vscode/settings.json`:

```json
{
  "customStatusBarItems": {
    "docker-restart-dashboard": {
      "text": "$(sync) Restart Dashboard",
      "tooltip": "Restart Dashboard container",
      "command": "workbench.action.tasks.runTask",
      "arguments": ["Docker: Restart Dashboard"]
    },
    "docker-restart-docs": {
      "text": "$(book) Restart Docs",
      "tooltip": "Restart Docs Hub container",
      "command": "workbench.action.tasks.runTask",
      "arguments": ["Docker: Restart Docs"]
    }
  }
}
```

## 🔒 Segurança

### Containers Permitidos

Por padrão, apenas estes containers podem ser controlados:

- `course-crawler-ui`
- `workspace-api`
- `tp-capital-api`
- `documentation-api`
- `docs-hub`
- `firecrawl-proxy`
- `data-timescaledb`
- `data-questdb`
- `rag-qdrant`
- `data-redis`
- `rag-ollama`
- `rag-llamaindex`
- `dashboard`

Para adicionar mais containers, edite a lista `ALLOWED_CONTAINERS` em `docker-control-server.js`.

### Acesso

- **Bind**: `127.0.0.1` (apenas localhost)
- **Porta**: `9880`
- **CORS**: Habilitado para `*` (apenas localhost)
- **Validação**: Nomes de containers são validados contra lista permitida

## 🛠️ Gerenciamento do Service

```bash
# Ver status
sudo systemctl status docker-control.service

# Ver logs em tempo real
sudo journalctl -u docker-control.service -f

# Reiniciar service
sudo systemctl restart docker-control.service

# Parar service
sudo systemctl stop docker-control.service

# Iniciar service
sudo systemctl start docker-control.service

# Desabilitar auto-start
sudo systemctl disable docker-control.service

# Habilitar auto-start
sudo systemctl enable docker-control.service
```

## 🐛 Troubleshooting

### Service não inicia

```bash
# Ver logs detalhados
sudo journalctl -u docker-control.service -n 50

# Verificar permissões Docker
docker ps

# Se falhar, adicionar usuário ao grupo docker
sudo usermod -aG docker marce
newgrp docker
```

### Porta já em uso

```bash
# Verificar o que está usando a porta 9880
lsof -i :9880

# Matar processo na porta
fuser -k 9880/tcp
```

### Container não permitido

Edite `docker-control-server.js` e adicione o container à lista `ALLOWED_CONTAINERS`.

## 📝 Logs

Logs são gerenciados pelo systemd:

```bash
# Ver logs
sudo journalctl -u docker-control.service

# Últimas 50 linhas
sudo journalctl -u docker-control.service -n 50

# Seguir logs em tempo real
sudo journalctl -u docker-control.service -f

# Logs desde hoje
sudo journalctl -u docker-control.service --since today
```

## 🔄 Atualização

Para atualizar o servidor:

```bash
# 1. Editar o código
nano tools/docker-launcher/docker-control-server.js

# 2. Reiniciar service
sudo systemctl restart docker-control.service

# 3. Verificar
sudo systemctl status docker-control.service
```

## 📚 Referências

- Docker API: https://docs.docker.com/engine/api/
- Systemd Services: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- Node.js HTTP Server: https://nodejs.org/api/http.html
