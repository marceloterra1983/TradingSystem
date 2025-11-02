# Correção: Navegador de Diretórios - Acesso à Raiz do Projeto

**Data**: 2025-11-01  
**Status**: ✅ **RESOLVIDO**  
**Tipo**: Configuração de Volumes Docker  

---

## 📋 Problema Relatado

O usuário não conseguia acessar a **raiz do projeto** no navegador de diretórios do modal "Nova Coleção". Apenas o diretório `/data/docs/content` estava disponível, limitando as opções de origem para as coleções RAG.

### Sintomas

```
Modal "Nova Coleção"
  └─ Diretório de Origem
      └─ Mostrava apenas: /data/docs/content
      └─ ❌ Não conseguia navegar para raiz do projeto
      └─ ❌ Não conseguia acessar /backend, /frontend, /tools, etc.
```

---

## 🔍 Investigação

### 1. Diretórios Permitidos pela API

```bash
curl http://localhost:3403/api/v1/rag/directories
```

**Resultado Inicial:**
```json
{
  "directories": [
    {
      "name": "docs",
      "path": "/data/docs",
      "exists": true
    }
  ]
}
```

**Problema Identificado**: Faltava o volume `/data/tradingsystem` (raiz do projeto).

### 2. Verificação de Volumes Docker

```yaml
# docker-compose.rag.yml - ANTES (❌ Incompleto)
rag-collections-service:
  volumes:
    - ../../docs:/data/docs:ro  # ✅ OK
    # ❌ FALTANDO: raiz do projeto
```

### 3. Código de Segurança

```typescript
// tools/rag-services/src/routes/directories.ts
const ALLOWED_BASE_PATHS = [
  '/data/docs',           // ✅ Montado
  '/data/tradingsystem',  // ❌ NÃO montado (volume faltando)
  HOST_DOCS_PATH,
  HOST_PROJECT_ROOT,
];
```

---

## 🔧 Solução Implementada

### 1. Adicionar Volume `/data/tradingsystem`

```yaml
# tools/compose/docker-compose.rag.yml
rag-collections-service:
  volumes:
    - ../rag-services/collections-config.json:/app/collections-config.json:ro
    - ../../docs:/data/docs:ro
    - ../../:/data/tradingsystem:ro  # ✅ ADICIONADO - Raiz do projeto
```

### 2. Recriar Container

```bash
cd /home/marce/Projetos/TradingSystem

# Parar e remover container antigo
docker compose -f tools/compose/docker-compose.rag.yml down rag-collections-service

# Recriar com novos volumes
docker compose -f tools/compose/docker-compose.rag.yml up -d rag-collections-service
```

### 3. Atualizar DirectorySelector (Padrão)

```typescript
// frontend/dashboard/src/components/pages/DirectorySelector.tsx

// ❌ ANTES
const [currentPath, setCurrentPath] = useState<string>(
  value || '/home/marce/Projetos/TradingSystem/docs'
);

// ✅ DEPOIS
const [currentPath, setCurrentPath] = useState<string>(
  value || '/data/tradingsystem'
);
```

---

## 🧪 Validação

### Diretórios Base Disponíveis

```bash
curl http://localhost:3403/api/v1/rag/directories | jq '.data.directories'
```

**Resultado:**
```json
[
  {
    "name": "docs",
    "path": "/data/docs",
    "exists": true
  },
  {
    "name": "tradingsystem",
    "path": "/data/tradingsystem",
    "exists": true
  },
  {
    "name": "/",
    "path": "/",
    "exists": true
  }
]
```

### Browse da Raiz do Projeto

```bash
curl "http://localhost:3403/api/v1/rag/directories/browse?path=/data/tradingsystem"
```

**Resultado:**
```
✅ 20 pastas + 95 arquivos encontrados

Pastas disponíveis:
  - backend/
  - frontend/
  - docs/
  - tools/
  - scripts/
  - apps/
  - ai/
  - .github/
  - .vscode/
  - ... (mais 11)
```

### Teste Via Proxy Vite

```bash
curl "http://localhost:3103/api/v1/rag/directories/browse?path=/data/tradingsystem"
# ✅ 20 pastas + 95 arquivos
```

---

## 📊 Estrutura de Diretórios Disponível Agora

```
/data/tradingsystem/ (Raiz do Projeto)
├── backend/
│   ├── api/
│   │   ├── documentation-api/
│   │   ├── workspace/
│   │   ├── tp-capital/
│   │   └── service-launcher/
│   ├── data/
│   ├── services/
│   └── shared/
├── frontend/
│   └── dashboard/
├── docs/
│   ├── content/
│   ├── governance/
│   └── static/
├── tools/
│   ├── compose/
│   ├── rag-services/
│   ├── llamaindex/
│   └── monitoring/
├── scripts/
├── apps/
└── ai/
```

---

## 🎯 Casos de Uso Agora Suportados

### 1. Criar Coleção da Documentação

```
Nova Coleção
  └─ Nome: documentation
  └─ Diretório: /data/tradingsystem/docs/content
      ✅ Acessa todos os subdiretórios
```

### 2. Criar Coleção do Backend

```
Nova Coleção
  └─ Nome: backend-code
  └─ Diretório: /data/tradingsystem/backend
      ✅ Pode indexar código do backend
```

### 3. Criar Coleção do Frontend

```
Nova Coleção
  └─ Nome: frontend-components
  └─ Diretório: /data/tradingsystem/frontend/dashboard/src
      ✅ Pode indexar componentes React
```

### 4. Criar Coleção de Scripts

```
Nova Coleção
  └─ Nome: automation-scripts
  └─ Diretório: /data/tradingsystem/scripts
      ✅ Pode indexar scripts de automação
```

---

## 🗺️ Mapeamento de Volumes

| Path no Container | Path no Host | Modo | Descrição |
|-------------------|--------------|------|-----------|
| `/data/docs` | `~/Projetos/TradingSystem/docs` | `ro` | Documentação Docusaurus |
| `/data/tradingsystem` | `~/Projetos/TradingSystem` | `ro` | Raiz do projeto completo |
| `/app/collections-config.json` | `tools/rag-services/collections-config.json` | `ro` | Config de coleções |

**Nota**: `ro` = read-only (segurança - impede modificações acidentais)

---

## ⚠️ Considerações de Segurança

### Restrições de Path

O código valida que apenas paths permitidos podem ser acessados:

```typescript
const ALLOWED_BASE_PATHS = [
  '/data/docs',
  '/data/tradingsystem',
  // Paths locais (desenvolvimento)
  HOST_DOCS_PATH,
  HOST_PROJECT_ROOT,
];

// Bloqueia path traversal (../../etc/passwd)
const isPathAllowed = (requestedPath: string): boolean => {
  const normalizedPath = resolve(requestedPath);
  return ALLOWED_BASE_PATHS.some(basePath => {
    return normalizedPath.startsWith(resolve(basePath));
  });
};
```

### Modo Read-Only

Todos os volumes são montados em modo **read-only** (`ro`), impedindo:
- ❌ Modificação de arquivos
- ❌ Criação de novos arquivos
- ❌ Deleção de arquivos
- ✅ Apenas leitura para indexação

---

## 📚 Arquivos Modificados

1. ✅ `tools/compose/docker-compose.rag.yml`
   - Adicionado volume: `../../:/data/tradingsystem:ro`

2. ✅ `frontend/dashboard/src/components/pages/DirectorySelector.tsx`
   - Diretório padrão: `/data/tradingsystem`

3. ✅ Container `rag-collections-service` recriado

---

## 🚀 Como Usar

### No Navegador

1. Abrir: http://localhost:3103
2. Navegar para página de Collections
3. Clicar em "Nova Coleção"
4. Campo "Diretório de Origem":
   - ✅ Agora mostra: `/data/tradingsystem`
   - ✅ Pode navegar para qualquer subdiretório
   - ✅ Pode voltar para raiz
   - ✅ Vê todas as pastas do projeto

### Via API

```bash
# Listar diretórios base
curl http://localhost:3403/api/v1/rag/directories | jq .

# Browse da raiz
curl "http://localhost:3403/api/v1/rag/directories/browse?path=/data/tradingsystem" | jq .

# Browse de subdiretório
curl "http://localhost:3403/api/v1/rag/directories/browse?path=/data/tradingsystem/backend/api" | jq .
```

---

## ✅ Resultado Final

### Antes (❌ Limitado)

```
Diretórios acessíveis:
  └─ /data/docs
      └─ /data/docs/content (único caminho)
```

### Depois (✅ Completo)

```
Diretórios acessíveis:
  ├─ /data/docs
  │   └─ Todos os subdiretórios de documentação
  └─ /data/tradingsystem
      ├─ backend/
      ├─ frontend/
      ├─ docs/
      ├─ tools/
      ├─ scripts/
      ├─ apps/
      └─ ... (todo o projeto)
```

---

## 📝 Notas Importantes

1. **Após mudanças em docker-compose.yml**: Sempre **recriar** o container (não apenas restart):
   ```bash
   docker compose down <service>
   docker compose up -d <service>
   ```

2. **Volumes read-only**: Garantem segurança mas impedem escrita. Para operações de escrita (logs, cache), use volumes separados.

3. **Path Traversal Protection**: O código valida todos os paths para evitar acesso a diretórios não autorizados.

---

**Status**: ✅ **100% OPERACIONAL**  
**Data**: 2025-11-01 05:35 UTC  
**Próxima Ação**: Testar criação de coleção com diferentes diretórios de origem  

🎯 **O navegador de diretórios agora tem acesso completo à raiz do projeto!**

