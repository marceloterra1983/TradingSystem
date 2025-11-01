---
title: Padrão npm run dev com Auto-Kill de Porta
sidebar_position: 5
description: Padrão de desenvolvimento para evitar erros EADDRINUSE em serviços Node.js
tags:
  - development
  - nodejs
  - best-practices
owner: DevOps
lastReviewed: '2025-10-29'
---

## Visão Geral

Todos os serviços Node.js no projeto devem implementar auto-kill de porta no comando `npm run dev` para evitar erros `EADDRINUSE: address already in use`.

## Motivação

Durante o desenvolvimento, é comum deixar processos rodando em background. Isso causa erros como:

```bash
Error: listen EADDRINUSE: address already in use :::4005
```

A solução manual (identificar e matar o processo) interrompe o fluxo de desenvolvimento.

## Implementação Padrão

### 1. package.json

Adicione dois scripts:

```json
{
  "scripts": {
    "dev": "npm run kill-port && node --watch src/server.js",
    "kill-port": "lsof -ti:PORTA | xargs kill -9 2>/dev/null || true"
  }
}
```

**Substitua `PORTA` pela porta do seu serviço:**
- TP Capital: 4005
- Telegram Gateway: 4006
- Documentation API: 4007
- Workspace API: 4008
- Dashboard: 3103

### 2. Script Standalone (Opcional)

Crie `scripts/kill-port.sh`:

```bash
#!/bin/bash
# Kill process using specified port

PORT=${1:-4005}

echo "🔍 Verificando processos na porta $PORT..."

PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
  echo "✅ Porta $PORT está livre"
  exit 0
fi

echo "⚠️  Porta $PORT em uso pelo processo $PID"
echo "🔪 Matando processo..."

kill -9 $PID 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Processo $PID encerrado com sucesso"
else
  echo "❌ Falha ao encerrar processo $PID"
  exit 1
fi

exit 0
```

Torne executável:

```bash
chmod +x scripts/kill-port.sh
```

## Uso

### Desenvolvimento Normal

```bash
npm run dev
```

O comando automaticamente:
1. 🔍 Verifica se há processo na porta
2. 🔪 Mata o processo se encontrado
3. ✅ Inicia o servidor normalmente

### Matar Porta Manualmente

```bash
# Via npm
npm run kill-port

# Via script (qualquer porta)
./scripts/kill-port.sh 4005
./scripts/kill-port.sh 3103
```

## Exemplo de Saída

```bash
$ npm run dev

> service@1.0.0 kill-port
> lsof -ti:4005 | xargs kill -9 2>/dev/null || true

> service@1.0.0 dev
> node --watch src/server.js

[14:08:35.123] INFO: Server listening on port 4005
```

## Serviços Implementados

| Serviço | Porta | Status |
|---------|-------|--------|
| TP Capital | 4005 | ✅ Implementado |
| Telegram Gateway | 4006 | ⏳ Pendente |
| Documentation API | 4007 | ⏳ Pendente |
| Workspace API | 4008 | ⏳ Pendente |
| Dashboard (Vite) | 3103 | ⏳ Pendente |

## Notas Técnicas

### Por que `|| true`?

```bash
lsof -ti:4005 | xargs kill -9 2>/dev/null || true
```

- `2>/dev/null`: Suprime erros do stderr
- `|| true`: Garante exit code 0 mesmo se não houver processo
- Previne que npm pare a execução se a porta já estiver livre

### Alternativa: fuser (Linux)

Em alguns sistemas, `fuser` pode ser mais simples:

```bash
"kill-port": "fuser -k 4005/tcp 2>/dev/null || true"
```

### Windows (PowerShell)

Para Windows, use:

```json
"kill-port": "powershell -Command \"Get-Process -Id (Get-NetTCPConnection -LocalPort 4005).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force\""
```

## Integração com Docker Compose

Se usar Docker Compose, adicione `restart: unless-stopped`:

```yaml
services:
  tp-capital:
    restart: unless-stopped
    ports:
      - "4005:4005"
```

## Troubleshooting

### Erro: lsof: command not found

Instale o pacote:

```bash
# Ubuntu/Debian
sudo apt-get install lsof

# macOS (geralmente pré-instalado)
brew install lsof

# Windows WSL
sudo apt-get install lsof
```

### Porta ainda ocupada após kill

Aguarde 1-2 segundos para o SO liberar:

```bash
npm run kill-port && sleep 2 && npm start
```

### Permissão negada

Alguns processos exigem sudo:

```bash
sudo npm run kill-port
```

## Boas Práticas

1. ✅ **Use `--watch` em dev**: Recarrega código automaticamente
2. ✅ **Graceful shutdown**: Implemente handlers de SIGTERM
3. ✅ **Variáveis de ambiente**: Use `.env` para portas configuráveis
4. ❌ **Não use em produção**: Este padrão é apenas para desenvolvimento

## Próximos Passos

- [ ] Implementar em todos os serviços Node.js
- [ ] Adicionar ao template de novos serviços
- [ ] Criar script de setup que aplica em todos os serviços
- [ ] Documentar no onboarding de novos desenvolvedores

---

**Última atualização:** 29 de Outubro de 2025  
**Padrão estabelecido por:** Sistema de IA - Cursor  
**Status:** ✅ Ativo - Aplicar em todos os novos serviços







