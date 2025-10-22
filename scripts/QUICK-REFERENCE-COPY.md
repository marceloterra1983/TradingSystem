# ⚡ Quick Reference - Copy Terminal Output

## 🚀 Instalação (Uma Vez)

```bash
bash scripts/install-terminal-copy-shortcuts.sh
source ~/.bashrc  # ou ~/.zshrc
```

## 📝 Comandos

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `copyout` | Copia comando + saída (50 linhas) | `ls -la` → `copyout` |
| `copyout 100` | Copia comando + saída (100 linhas) | `npm test` → `copyout 100` |
| `copycmd` | Copia apenas o comando | `docker ps` → `copycmd` |
| `copylog` | Copia apenas saída (50 linhas) | Qualquer → `copylog` |
| `copylog 200` | Copia apenas saída (200 linhas) | Qualquer → `copylog 200` |
| `cop 100` | Atalho para `copyout 100` | `npm run build` → `cop 100` |
| `coprun <cmd>` | Executa comando e copia resultado | `coprun curl localhost:3500/api/health` |

## ⌨️ Atalhos (Terminal Cursor)

| Atalho | Ação |
|--------|------|
| `Ctrl+Shift+Alt+C` | Executar `copyout` |
| `Ctrl+Alt+C` | Executar `copycmd` |
| `Ctrl+Alt+O` | Executar `copylog` |

## 🎯 Uso Rápido

### Caso 1: Reportar Bug
```bash
npm run build
copyout  # Copia comando + erro completo
# Colar no GitHub Issue
```

### Caso 2: Compartilhar Logs
```bash
docker logs service-launcher
copylog 100  # Copia últimas 100 linhas
# Colar no Slack
```

### Caso 3: Testar API
```bash
coprun curl http://localhost:3500/api/health | jq
# Comando + resposta já copiados!
```

### Caso 4: Debug com IA
```bash
npm test
copyout 200  # Copia comando + stack trace
# Colar no Claude/ChatGPT
```

## 🔧 Customização

```bash
# ~/.bashrc ou ~/.zshrc

# Alias customizado (1000 linhas)
alias copyhuge='bash ~/projetos/TradingSystem/scripts/copy-terminal-output.sh 1000'

# Alias com pipe para JQ
alias copyjson='coprun curl'
```

## 💡 Dicas

1. Use `coprun` para **executar e copiar automaticamente**
2. Use `copyout 200` para erros grandes
3. Use `copycmd` para copiar apenas o comando (sem output)
4. Use `copylog` para copiar apenas logs (sem comando)
5. Em TMUX, a captura é mais precisa

## 📖 Ajuda Completa

```bash
copyout --help
```

**Documentação:** `scripts/COPY-TERMINAL-GUIDE.md`




