---
title: "RAG Container Fix"
sidebar_position: 7
description: "Running the collections service in Docker with native access to Ollama."
tags:
  - rag
  - docker
  - ops
owner: ArchitectureGuild
lastReviewed: '2025-11-02'
---
# ✅ RAG Container Corrigido!

## 🎯 O Que Foi Feito

O RAG Collections Service agora está rodando **como container Docker** (como deveria ser desde o início).

### Problema Anterior
- ❌ Serviço rodando como processo Node.js local
- ❌ Não conseguia acessar Ollama (que está na rede Docker)
- ❌ Modelos apareciam como "indisponíveis"

### Solução Implementada
- ✅ Container `rag-collections-service` construído e iniciado
- ✅ Conectado à rede Docker `tradingsystem_backend`
- ✅ Acesso direto ao Ollama via `http://rag-ollama:11434`

---

## 📊 Status Atual

### Backend (Container Docker)

```bash
Container: rag-collections-service
Status: Up and Healthy
Port: 3402:3402
Network: tradingsystem_backend
```

**Modelos Disponíveis:** ✅ **FUNCIONANDO!**
```json
{
  "nomic-embed-text": {
    "available": true,
    "dimensions": 384,
    "description": "Rápido e eficiente para buscas semânticas"
  },
  "mxbai-embed-large": {
    "available": true,
    "dimensions": 1024,
    "description": "Alta qualidade para tarefas complexas"
  }
}
```

**Coleções Pré-configuradas:** ✅ **9 coleções carregadas**
1. `documentation` - Documentação geral (/data/docs/content)
2. `api_specifications` - Especificações de API (/data/docs/static/specs)
3. `troubleshooting` - Guias de solução de problemas
4. `frontend_docs` - Documentação frontend
5. `backend_docs` - Documentação backend
6. `database_docs` - Documentação de banco de dados
7. `product_requirements` - Requisitos de produto (PRDs)
8. `design_documents` - Documentos de design (SDDs)
9. `reference_docs` - Documentação de referência

---

## 🚀 Próximo Passo: Reiniciar Dashboard

O dashboard ainda está usando a variável de ambiente antiga. **Você precisa reiniciá-lo:**

### Opção 1: Reiniciar Manualmente

No terminal onde o dashboard está rodando:

1. Pressione `Ctrl+C` para parar
2. Execute:
```bash
cd /home/marce/Projetos/TradingSystem/frontend/dashboard
npm run dev
```

### Opção 2: Usar Script

```bash
cd /home/marce/Projetos/TradingSystem
bash scripts/maintenance/restart-dashboard.sh
```

---

## 🧪 Como Testar Após Reiniciar

### 1. Hard Refresh no Navegador
```
Pressione: Ctrl + Shift + R
```

### 2. Abrir a Página RAG
```
http://localhost:9080/#/rag-services
```

### 3. Testar Funcionalidades

#### A. Visualizar Coleções Existentes
- Scroll até "Gerenciamento de Coleções" (ícone roxo Boxes)
- Você deve ver **9 coleções** na tabela
- Cada coleção mostra: nome, descrição, diretório, modelo, status

#### B. Criar Nova Coleção
1. Clicar em botão **"Nova Coleção"**
2. Preencher formulário:
   - **Nome:** (ex: "minha_colecao")
   - **Descrição:** (ex: "Teste de nova coleção")
   - **Modelo de Embedding:** Selecionar `nomic-embed-text` ou `mxbai-embed-large` ✅ **Ambos disponíveis agora!**
   - **Diretório de Origem:** Clicar "Navegar" para explorar pastas ✅ **Navegador funcionando!**

3. Expandir "Configurações Avançadas" (opcional):
   - Chunk Size: 1024 (padrão)
   - Chunk Overlap: 200 (padrão)
   - Tipos de Arquivo: `.md,.mdx` (padrão)
   - Recursivo: ✅ (padrão)
   - Habilitado: ✅ (padrão)
   - Auto-atualização: ✅ (padrão)

4. Clicar **"Criar Coleção"**

#### C. Ações em Coleções
- **Ver detalhes** - Visualizar configuração completa
- **Editar** - Modificar configurações
- **Deletar** - Remover coleção
- **Habilitar/Desabilitar** - Toggle de status

---

## 🔍 Verificações de Backend

### Health Check
```bash
curl http://localhost:3402/health | jq '.status'
# Expected: "healthy"
```

### Listar Modelos
```bash
curl http://localhost:3402/api/v1/rag/models | jq '.data.models[] | {name, available}'
# Expected: 2 modelos com available: true
```

### Listar Coleções
```bash
curl http://localhost:3402/api/v1/rag/collections | jq '.data.total'
# Expected: 9
```

### Listar Diretórios Base
```bash
curl http://localhost:3402/api/v1/rag/directories | jq '.data.total'
# Expected: 4 diretórios
```

### Navegar em Diretório
```bash
curl "http://localhost:3402/api/v1/rag/directories/browse?path=/data/docs/content" | jq '.data.directories | length'
# Expected: Lista de subdiretórios
```

---

## 📝 Arquivos de Configuração

### Coleções Pré-configuradas
```
tools/llamaindex/collection-config.json
```

### Docker Compose
```
tools/compose/docker-compose.4-4-rag-stack.yml
```

### Dockerfile
```
tools/rag-services/Dockerfile
```

### Environment Variables
```
frontend/dashboard/.env (VITE_API_BASE_URL=http://localhost:3402)
```

---

## 🐛 Se Encontrar Problemas

### Problema 1: Modelos ainda aparecem indisponíveis
```bash
# Verificar se Ollama está rodando
docker ps --filter "name=rag-ollama"

# Ver logs do Ollama
docker logs rag-ollama --tail 50

# Verificar modelos carregados
curl http://localhost:11434/api/tags | jq '.models[] | .name'
```

### Problema 2: Coleções não aparecem
```bash
# Ver logs do container
docker logs rag-collections-service --tail 50

# Verificar arquivo de configuração
docker exec rag-collections-service cat /app/collections-config.json
```

### Problema 3: Navegador de diretórios não funciona
```bash
# Verificar permissões dos volumes montados
docker exec rag-collections-service ls -la /data/docs/content

# Ver logs de erro
docker logs rag-collections-service | grep -i error
```

### Problema 4: Erros 404 no frontend
```bash
# Verificar variável de ambiente carregada
# No console do navegador (F12):
console.log(import.meta.env.VITE_API_BASE_URL)
# Expected: "http://localhost:3402"

# Se ainda mostrar 3401, fazer hard refresh:
# Ctrl + Shift + R
```

---

## 🎉 Resumo do Sucesso

✅ **Container rodando:** `rag-collections-service` up and healthy
✅ **Modelos disponíveis:** `nomic-embed-text` (384d) + `mxbai-embed-large` (1024d)
✅ **9 coleções carregadas:** documentation, api_specifications, troubleshooting, etc.
✅ **APIs funcionando:** /models, /collections, /directories
✅ **Navegador de pastas:** Funcionando com segurança (whitelist de paths)
✅ **Integração Docker:** Acesso ao Ollama via rede interna

---

## 🚀 Próximo Passo

**👉 Reinicie o dashboard agora e teste a interface completa!**

```bash
# No terminal do dashboard:
Ctrl+C

# Reiniciar:
cd /home/marce/Projetos/TradingSystem/frontend/dashboard
npm run dev
```

**Depois:**
- Hard refresh no navegador (Ctrl+Shift+R)
- Abrir http://localhost:9080/#/rag-services
- Testar criação de nova coleção
- Me dizer o resultado! 🎯
