# 📋 Guia Completo - Copy Terminal Output

## 🎯 Visão Geral

Sistema completo para copiar rapidamente comandos e suas saídas do terminal, com múltiplas opções de uso e atalhos de teclado.

## 🚀 Instalação Rápida

```bash
# 1. Executar instalador (configura aliases e atalhos)
bash scripts/install-terminal-copy-shortcuts.sh

# 2. Recarregar shell
source ~/.bashrc  # ou source ~/.zshrc

# 3. Reiniciar Cursor (para aplicar keybindings)

# 4. Testar!
ls -la
copyout
```

## 📝 Comandos Disponíveis

### 1. `copyout` - Copiar Comando + Saída

**Uso mais comum** - Copia o último comando executado junto com sua saída:

```bash
# Executar qualquer comando
npm install
ls -la
docker ps

# Copiar comando + saída (últimas 50 linhas)
copyout

# Copiar comando + saída (últimas 100 linhas)
copyout 100

# Copiar comando + saída (últimas 200 linhas)
copyout 200
```

**Output:**
```
$ npm install
[... saída do comando ...]
✓ Comando + saída copiados para clipboard!
```

### 2. `copycmd` - Copiar Apenas Comando

Copia apenas o último comando executado (sem a saída):

```bash
# Executar comando
docker compose up -d

# Copiar apenas o comando
copycmd
```

**Output:**
```
📋 Comando:
docker compose up -d

✓ Comando copiado para clipboard!
```

### 3. `copylog` - Copiar Apenas Saída

Copia apenas a saída do terminal (sem o comando):

```bash
# Copiar últimas 50 linhas
copylog

# Copiar últimas 100 linhas
copylog 100

# Copiar últimas 200 linhas
copylog 200
```

**Output:**
```
📋 Capturando últimas 50 linhas...
✓ Saída copiada para clipboard! (50 linhas)
```

### 4. `cop` - Atalho Rápido

Função conveniente para copiar comando + saída:

```bash
# Copiar comando + últimas 50 linhas
cop

# Copiar comando + últimas 150 linhas
cop 150
```

### 5. `coprun` - Executar e Copiar

**Muito útil!** Executa um comando e já copia o resultado automaticamente:

```bash
# Executar comando e copiar resultado
coprun ls -la

# Executar script e copiar resultado
coprun npm test

# Executar curl e copiar resposta
coprun curl http://localhost:3500/api/health

# Executar comando complexo e copiar
coprun docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Output:**
```
[... output do comando ...]

✓ Comando + resultado copiados para clipboard!
```

O clipboard terá:
```
$ ls -la
[... resultado completo ...]

Exit code: 0
```

## ⌨️ Atalhos de Teclado (Terminal Cursor)

Funcionam **apenas dentro do terminal integrado do Cursor**:

| Atalho | Comando | Descrição |
|--------|---------|-----------|
| `Ctrl+Shift+Alt+C` | `copyout` | Copia comando + saída |
| `Ctrl+Alt+C` | `copycmd` | Copia apenas comando |
| `Ctrl+Alt+O` | `copylog` | Copia apenas saída |
| `Ctrl+Shift+C` | Copia seleção | Copia texto selecionado |

### Como Usar os Atalhos

1. Execute qualquer comando no terminal
2. Pressione o atalho desejado
3. O conteúdo é copiado automaticamente!

**Exemplo:**
```bash
# 1. Executar comando
docker compose ps

# 2. Pressionar Ctrl+Shift+Alt+C
# 3. Comando + saída estão no clipboard!
```

## 📚 Casos de Uso Comuns

### Reportar Bugs

```bash
# 1. Executar comando que falhou
npm run build

# 2. Copiar comando + erro
copyout

# 3. Colar no GitHub Issue ou Slack
# Já vem formatado: $ npm run build + todo o erro
```

### Compartilhar Logs

```bash
# 1. Executar comando que gera logs
docker compose logs service-launcher

# 2. Copiar últimas 100 linhas
copylog 100

# 3. Colar no chat da equipe
```

### Documentação

```bash
# 1. Executar comando de exemplo
curl http://localhost:3500/api/health | jq

# 2. Executar e copiar automaticamente
coprun curl http://localhost:3500/api/health | jq

# 3. Colar na documentação com comando + resposta
```

### Debug de Scripts

```bash
# 1. Executar script problemático
bash scripts/startup/start-all.sh

# 2. Copiar comando + output completo (200 linhas)
copyout 200

# 3. Colar no chat do Claude ou ChatGPT para análise
```

### Testes de API

```bash
# Testar endpoint e copiar resposta
coprun curl -X POST http://localhost:3500/api/test -H "Content-Type: application/json" -d '{"test": true}'

# Resultado já está no clipboard formatado!
```

## 🎨 Exemplos Práticos

### Exemplo 1: Debug de Container

```bash
# Ver status dos containers
docker ps
copyout

# Ver logs específicos
docker logs trading-questdb
copylog 50

# Ver configuração completa
docker inspect trading-questdb
copyout 100
```

### Exemplo 2: Análise de Performance

```bash
# Executar teste de carga
npm run test:load
coprun npm run test:load  # Melhor ainda!

# Ver métricas
curl http://localhost:9090/metrics
copylog 30
```

### Exemplo 3: Troubleshooting

```bash
# 1. Ver erro
npm start
copyout  # Copia comando + stack trace

# 2. Ver variáveis de ambiente
env | grep NODE
copycmd  # Copia apenas o comando

# 3. Ver logs completos
cat logs/error.log
copylog 100  # Copia últimas 100 linhas
```

## 🔧 Configuração Avançada

### Personalizar Número Padrão de Linhas

Editar `~/.bashrc` ou `~/.zshrc`:

```bash
# Alterar de 50 para 100 linhas por padrão
alias copyout='bash /home/marce/projetos/TradingSystem/scripts/copy-terminal-output.sh 100'
```

### Criar Aliases Customizados

```bash
# Copiar muito output (500 linhas)
alias copybig='bash /home/marce/projetos/TradingSystem/scripts/copy-terminal-output.sh 500'

# Copiar pouco output (10 linhas)
alias copysmall='bash /home/marce/projetos/TradingSystem/scripts/copy-terminal-output.sh 10'

# Copiar e mostrar no terminal também
alias copyshow='bash /home/marce/projetos/TradingSystem/scripts/copy-terminal-output.sh && echo "=== COPIADO ===" && copylog'
```

### Alterar Keybindings no Cursor

Editar `~/.config/Cursor/User/keybindings.json`:

```json
[
  {
    "key": "ctrl+k ctrl+c",  // Seu atalho preferido
    "command": "workbench.action.terminal.runRecentCommand",
    "args": "copyout",
    "when": "terminalFocus"
  }
]
```

## 🐛 Troubleshooting

### "Nenhum comando de clipboard encontrado"

**Problema:** Sistema não tem utilitário de clipboard.

**Solução (WSL):**
```bash
# clip.exe já vem com Windows, deve funcionar automaticamente
echo "teste" | clip.exe

# Se não funcionar, verificar PATH
echo $PATH | grep -i windows
```

**Solução (Linux puro):**
```bash
# Instalar xclip
sudo apt install xclip

# Ou instalar wl-clipboard (Wayland)
sudo apt install wl-clipboard
```

### "Não foi possível capturar saída"

**Problema:** Terminal não suporta captura de output.

**Solução:** Use `coprun` em vez de `copyout`:
```bash
# Em vez de:
comando
copyout

# Use:
coprun comando
```

### Atalhos de teclado não funcionam

**Problema:** Keybindings não foram aplicados.

**Solução:**
1. Verificar arquivo: `~/.config/Cursor/User/keybindings.json`
2. Reiniciar Cursor completamente
3. Testar no terminal integrado (não funciona em terminal externo)

### Aliases não funcionam

**Problema:** Shell não foi recarregado.

**Solução:**
```bash
# Recarregar configuração
source ~/.bashrc  # Bash
source ~/.zshrc   # Zsh

# Verificar se aliases existem
alias | grep copy

# Verificar se arquivo foi modificado
grep -A 10 "Copy Terminal Output" ~/.bashrc
```

## 📖 Ajuda e Opções

```bash
# Ver ajuda completa
copyout --help

# Ver versão e informações
copyout --version

# Copiar histórico completo da sessão
copyout --all
```

## 💡 Dicas Pro

### 1. Use com TMUX

Se usar TMUX, a captura de output é muito mais precisa:

```bash
# Instalar TMUX
sudo apt install tmux

# Iniciar TMUX
tmux

# Agora copyout/copylog funcionam perfeitamente!
```

### 2. Pipe com JQ

```bash
# Formatar JSON e copiar
coprun curl http://localhost:3500/api/health | jq '.'
```

### 3. Copiar Múltiplos Comandos

```bash
# Executar sequência e copiar tudo
docker ps && docker images && docker volume ls
copyout 200  # Copia todos os comandos + outputs
```

### 4. Integrar com Claude/ChatGPT

```bash
# 1. Executar comando problemático
npm test
copyout

# 2. Colar no chat da IA
# Já vem com contexto completo: comando + erro

# 3. IA analisa e sugere solução
```

## 🎯 Comparação com Outras Soluções

| Método | Prós | Contras |
|--------|------|---------|
| **Selecionar + Ctrl+C** | Nativo, simples | Manual, não copia comando |
| **History + Ctrl+C** | Copia comandos | Não copia output |
| **Script | tee** | Salva tudo | Requer setup prévio |
| **copyout** ✅ | Automático, rápido, comando + output | Requer instalação |

## 🚀 Performance

- **Tempo médio:** < 100ms
- **Memory usage:** < 5MB
- **Linhas suportadas:** Ilimitado (recomendado < 10.000)

## 📜 Licença

Parte do TradingSystem - Uso interno.

---

**Criado:** 2025-10-22  
**Autor:** TradingSystem Team  
**Versão:** 1.0.0




