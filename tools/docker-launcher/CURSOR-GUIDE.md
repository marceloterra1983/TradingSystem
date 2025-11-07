# Guia Rápido - Docker Control no Cursor

## 🎯 Como Usar as Tasks Docker no Cursor

### Método 1: Via Command Palette

1. Pressione `Ctrl+Shift+P` (ou `Cmd+Shift+P` no Mac)
2. Digite "Tasks: Run Task"
3. Escolha uma das 10 tasks disponíveis:
   - 🐳 Docker: Restart Docs Hub
   - 🐳 Docker: Restart Docs API
   - 🐳 Docker: Restart Course Crawler API
   - 🐳 Docker: Restart Course Crawler Worker
   - 🐳 Docker: Restart Workspace API
   - 🐳 Docker: Restart Documentation API
   - 🐳 Docker: List All Containers
   - 🐳 Docker: Restart TimescaleDB
   - 🐳 Docker: View Dashboard Logs
   - 🐳 Docker: View Docs Logs

### Método 2: Atalhos de Teclado (Opcional)

Adicione atalhos personalizados em `.vscode/keybindings.json`:

```json
[
  {
    "key": "ctrl+alt+shift+d",
    "command": "workbench.action.tasks.runTask",
    "args": "🐳 Docker: Restart Docs Hub"
  },
  {
    "key": "ctrl+alt+shift+a",
    "command": "workbench.action.tasks.runTask",
    "args": "🐳 Docker: Restart Docs API"
  },
  {
    "key": "ctrl+alt+shift+c",
    "command": "workbench.action.tasks.runTask",
    "args": "🐳 Docker: Restart Course Crawler API"
  },
  {
    "key": "ctrl+alt+shift+l",
    "command": "workbench.action.tasks.runTask",
    "args": "🐳 Docker: List All Containers"
  }
]
```

### Método 3: Terminal Integrado

Se preferir usar o terminal do Cursor:

```bash
# Listar containers
tools/docker-launcher/docker-control-cli.sh list

# Reiniciar container
tools/docker-launcher/docker-control-cli.sh restart docs-hub

# Ver logs
tools/docker-launcher/docker-control-cli.sh logs course-crawler-api
```

## 📝 Adicionar Mais Tasks

Para adicionar novos containers às tasks, edite `.vscode/tasks.json`:

```json
{
  "label": "🐳 Docker: Restart [Nome do Container]",
  "type": "shell",
  "command": "${workspaceFolder}/tools/docker-launcher/docker-control-cli.sh",
  "args": ["restart", "nome-do-container"],
  "problemMatcher": [],
  "presentation": {
    "reveal": "always",
    "panel": "new"
  }
}
```

Containers disponíveis: veja a lista em `tools/docker-launcher/docker-control-server.js` na constante `ALLOWED_CONTAINERS`.

## 🔧 Troubleshooting

### Tasks não aparecem no menu

1. Recarregue o Cursor: `Ctrl+Shift+P` → "Developer: Reload Window"
2. Verifique se `.vscode/tasks.json` existe
3. Verifique a sintaxe JSON do arquivo

### Erro ao executar task

1. Verifique se o Docker Control Server está rodando:
   ```bash
   curl http://127.0.0.1:9876/health
   ```

2. Se não estiver, reinicie:
   ```bash
   sudo systemctl restart docker-control
   ```

3. Verifique os logs:
   ```bash
   sudo journalctl -u docker-control -f
   ```

### Container não está na lista permitida

1. Edite `tools/docker-launcher/docker-control-server.js`
2. Adicione o container à lista `ALLOWED_CONTAINERS`
3. Reinicie o service:
   ```bash
   bash tools/docker-launcher/restart-service.sh
   ```

## 💡 Dicas

- **Use a task "List All Containers"** para ver o status de todos os containers
- **Use tasks de "View Logs"** para debug rápido sem sair do Cursor
- **Crie tasks personalizadas** para seus workflows mais comuns
- **Combine com snippets** do Cursor para workflows ainda mais rápidos

## 🚀 Próximos Passos

1. **Teste uma task**: `Ctrl+Shift+P` → "Tasks: Run Task" → "🐳 Docker: List All Containers"
2. **Configure atalhos**: Adicione seus atalhos favoritos em `keybindings.json`
3. **Adicione mais tasks**: Personalize para seus containers mais usados
4. **Explore o CLI**: Use `tools/docker-launcher/docker-control-cli.sh` no terminal

## 📚 Mais Informações

- **Documentação completa**: `tools/docker-launcher/README.md`
- **Instalação**: `tools/docker-launcher/INSTALL.md`
- **Lista de containers**: Execute a task "🐳 Docker: List All Containers"
