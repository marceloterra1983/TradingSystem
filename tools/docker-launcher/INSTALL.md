# Instalação Rápida - Docker Control Server

## Instalação Automática (Recomendado)

```bash
cd /home/marce/Projetos/TradingSystem
sudo bash tools/docker-launcher/install.sh
```

**O que o script faz:**
1. ✓ Verifica se Docker e Node.js estão instalados
2. ✓ Adiciona seu usuário ao grupo docker (se necessário)
3. ✓ Instala o service systemd
4. ✓ Inicia o servidor automaticamente
5. ✓ Configura para iniciar no boot

**Após a instalação:**

O servidor estará rodando em `http://127.0.0.1:9876`

Teste com:
```bash
curl http://127.0.0.1:9876/health
```

## Uso Básico

### Via CLI (Mais Fácil)

```bash
# Listar containers
tools/docker-launcher/docker-control-cli.sh list

# Reiniciar um container
tools/docker-launcher/docker-control-cli.sh restart dashboard

# Ver logs
tools/docker-launcher/docker-control-cli.sh logs docs-hub
```

### Via API HTTP

```bash
# Reiniciar container
curl -X POST http://127.0.0.1:9876 \
  -H "Content-Type: application/json" \
  -d '{"action":"restart","container":"dashboard"}'
```

## Integração com Cursor

### 1. Copiar arquivo de tasks

```bash
cd /home/marce/Projetos/TradingSystem
cp .vscode/docker-tasks.json.example .vscode/tasks.json
```

### 2. Usar no Cursor

- Pressione `Ctrl+Shift+P`
- Digite "Tasks: Run Task"
- Escolha a task desejada (ex: "🐳 Docker: Restart Dashboard")

### 3. Criar atalhos de teclado (opcional)

Adicione em `.vscode/keybindings.json`:

```json
[
  {
    "key": "ctrl+alt+d",
    "command": "workbench.action.tasks.runTask",
    "args": "🐳 Docker: Restart Dashboard"
  },
  {
    "key": "ctrl+alt+h",
    "command": "workbench.action.tasks.runTask",
    "args": "🐳 Docker: Restart Docs Hub"
  }
]
```

## Gerenciamento

```bash
# Ver status do service
sudo systemctl status docker-control

# Ver logs em tempo real
sudo journalctl -u docker-control -f

# Reiniciar o server
sudo systemctl restart docker-control

# Parar o server
sudo systemctl stop docker-control

# Iniciar o server
sudo systemctl start docker-control
```

## Troubleshooting

### Service não está rodando

```bash
# Verificar logs
sudo journalctl -u docker-control -n 50

# Reiniciar
sudo systemctl restart docker-control
```

### Permissão negada

```bash
# Verificar se está no grupo docker
groups | grep docker

# Se não estiver, adicionar e recarregar
sudo usermod -aG docker $USER
newgrp docker

# Reiniciar service
sudo systemctl restart docker-control
```

### Porta já em uso

```bash
# Ver o que está usando a porta 9876
lsof -i :9876

# Matar processo
fuser -k 9876/tcp
```

## Desinstalação

```bash
# Parar e desabilitar service
sudo systemctl stop docker-control
sudo systemctl disable docker-control

# Remover service
sudo rm /etc/systemd/system/docker-control.service

# Recarregar systemd
sudo systemctl daemon-reload
```

## Próximos Passos

1. **Teste o CLI**: `tools/docker-launcher/docker-control-cli.sh list`
2. **Configure tasks no Cursor**: Copie o arquivo `.vscode/docker-tasks.json.example`
3. **Leia a documentação completa**: `tools/docker-launcher/README.md`

## Suporte

- Documentação: `tools/docker-launcher/README.md`
- Issues: GitHub Issues do projeto
- Logs: `sudo journalctl -u docker-control -f`
