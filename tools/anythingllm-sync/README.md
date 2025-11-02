# AnythingLLM Auto-Sync

Sincronização automática de documentos do TradingSystem para o AnythingLLM.

## 🚀 Quick Start

### 1. Obter API Key

1. Acesse: http://localhost:3001
2. Settings → API Keys
3. Generate New API Key
4. Copie a chave

### 2. Configurar

Adicione ao `.env` principal do projeto:

```bash
# AnythingLLM Sync
ANYTHINGLLM_URL=http://localhost:3001
ANYTHINGLLM_API_KEY=J6BBZP5-PH3MSS4-KK7ZT54-1AF3PQ0
ANYTHINGLLM_WORKSPACE_SLUG=tradingsystem-docs
```

### 3. Instalar e Executar

```bash
cd tools/anythingllm-sync
npm install
npm start
```

## 📋 Features

- ✅ Sync inicial (bulk upload de ~237 arquivos)
- ✅ File watcher (detecta mudanças em tempo real)
- ✅ Auto-upload de arquivos novos/modificados
- ✅ Filtros inteligentes (.md, .mdx, .txt)
- ✅ Exclui node_modules, .git, dist, build
- ✅ Delay entre uploads (200ms) para não sobrecarregar
- ✅ Logs detalhados com timestamps

## 🔧 Comandos

```bash
# Executar normalmente
npm start

# Executar em modo watch (auto-restart)
npm run dev

# Executar em background
npm start &

# Parar
Ctrl+C (ou kill o processo)
```

## 📊 Como Funciona

```
1. Sync Inicial:
   • Varre docs/content/
   • Upload de todos .md/.mdx/txt
   • Progress a cada 10 arquivos

2. File Watcher:
   • Monitora mudanças em tempo real
   • Novo arquivo → upload
   • Arquivo modificado → re-upload
   • Arquivo deletado → log (sem API de delete)

3. Performance:
   • Delay de 200ms entre uploads
   • Processamento em batch
   • Ignora padrões configurados
```

## 🎯 Diretório Monitorado

```
docs/content/
├── apps/              # Documentação de apps
├── api/               # Specs de API
├── frontend/          # Design system
├── database/          # Schemas
├── sdd/               # Software design
├── prd/               # Product requirements
└── reference/         # ADRs, templates
```

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

| Variável | Valor Padrão | Descrição |
|----------|--------------|-----------|
| `ANYTHINGLLM_URL` | `http://localhost:3001` | URL do AnythingLLM |
| `ANYTHINGLLM_API_KEY` | *(requerido)* | API Key do AnythingLLM |
| `ANYTHINGLLM_WORKSPACE_SLUG` | `tradingsystem-docs` | Nome do workspace |

### Filtros (hardcoded)

**Incluir**: `.md`, `.mdx`, `.txt`  
**Excluir**: `node_modules`, `.git`, `dist`, `build`, `.DS_Store`

## 🐛 Troubleshooting

### API Key inválida
```
❌ 401 Unauthorized
```
**Solução**: Verifique se a API key no `.env` está correta

### Workspace não encontrado
```
❌ 404 Workspace not found
```
**Solução**: Crie o workspace "tradingsystem-docs" no AnythingLLM primeiro

### Muitos arquivos
```
⚠️  Upload muito lento
```
**Solução**: Aumente o delay entre uploads (linha 67: `setTimeout(resolve, 500)`)

## 📚 Documentação

- AnythingLLM API: https://docs.anythingllm.com/api
- File Watcher: https://github.com/paulmillr/chokidar

---

**Criado**: 2025-11-02  
**Versão**: 1.0.0

