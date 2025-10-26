# TradingSystem - Universal Commands

Scripts universais para gerenciar todos os serviços do TradingSystem com comandos simples.

## 🚀 Instalação

Execute uma única vez:

```bash
bash install-shortcuts.sh
source ~/.bashrc  # ou source ~/.zshrc
```

## 📋 Comandos Disponíveis

### `start` - Iniciar Todos os Serviços

Inicia todos os serviços Node.js em background:

```bash
start

# Com opções
start --force-kill    # Mata processos existentes nas portas
start --help          # Mostra ajuda
```

**Serviços iniciados:**
- Dashboard (porta 3103)
- Workspace API (porta 3200)
- Documentation API (porta 3400)
- Status API (porta 3500)
- TP-Capital (porta 4005)

**Logs:** `logs/services/*.log`

---

### `stop` - Parar Todos os Serviços

Para todos os serviços Node.js:

```bash
stop

# Com opções
stop --force          # Usa SIGKILL ao invés de SIGTERM
stop --clean-logs     # Remove logs após parar
stop --help           # Mostra ajuda
```

---

### `status` - Ver Status dos Serviços

Mostra o status de todos os serviços:

```bash
status
```

**Exemplo de saída:**
```
╔════════════════════════════════════════════════════════════╗
║  📊 TradingSystem - Service Status                         ║
╚════════════════════════════════════════════════════════════╝

Node.js Services:
  ✓ Dashboard         (Port: 3103, PID: 8281)
  ✓ Workspace API     (Port: 3200, PID: 10756)
  ✓ Documentation API (Port: 3400, PID: 11234)
  ✓ Status API        (Port: 3500, PID: 10092)
  ✓ TP-Capital        (Port: 4005, PID: 9683)

Docker Containers:
  ✓ 27 containers running
```

---

## 🔧 Comandos Alternativos (Evitar Conflitos)

Se você já tem comandos `start`, `stop` ou `status` definidos, use as versões prefixadas:

```bash
ts-start    # Equivalente a 'start'
ts-stop     # Equivalente a 'stop'
ts-status   # Equivalente a 'status'
```

---

## 📂 Estrutura de Arquivos

```
TradingSystem/
├── install-shortcuts.sh          # Instalador de shortcuts
├── scripts/
│   └── universal/
│       ├── start.sh              # Script de start
│       ├── stop.sh               # Script de stop
│       ├── status.sh             # Script de status
│       └── README.md             # Este arquivo
└── logs/
    └── services/                 # Logs dos serviços
        ├── dashboard.log
        ├── workspace.log
        ├── documentation-api.log
        ├── status.log
        └── tp-capital.log
```

---

## 🐛 Troubleshooting

### Porta ocupada
Se uma porta estiver ocupada, use:
```bash
start --force-kill
```

### Ver logs de um serviço
```bash
tail -f logs/services/dashboard.log
tail -f logs/services/workspace.log
tail -f logs/services/documentation-api.log
tail -f logs/services/status.log
tail -f logs/services/tp-capital.log
```

### Limpar logs antigos
```bash
stop --clean-logs
```

### Reiniciar tudo
```bash
stop && start
```

---

## 🔄 Workflow Diário

**Iniciar trabalho:**
```bash
start
```

**Verificar status:**
```bash
status
```

**Finalizar trabalho:**
```bash
stop
```

---

## ⚙️ Configuração

Os serviços são configurados via `.env` e `.env.local` na raiz do projeto.

**Variáveis importantes:**
- `TIMESCALEDB_PORT` - Porta do TimescaleDB (padrão: 5433)
- `WORKSPACE_PORT` - Porta da Workspace API (padrão: 3200)

---

## 📝 Notas

- Os scripts detectam automaticamente se um serviço já está rodando
- Logs são salvos automaticamente em `logs/services/`
- Docker containers devem ser iniciados separadamente (ver `scripts/docker/`)
- Os comandos funcionam de qualquer diretório após instalação

---

## 🆘 Suporte

Para problemas ou dúvidas, consulte:
- `docs/context/ops/universal-commands.md`
- `CLAUDE.md` (seção Development Commands)

