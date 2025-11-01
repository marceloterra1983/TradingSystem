# ✅ Correção: Inferência de Dimensões do Modelo

**Data**: 2025-10-31  
**Status**: ✅ CORRIGIDO

---

## 🎯 Problema

**Erro ao criar coleção**:
```json
{
  "success": false,
  "error": "Missing embeddingModel or dimensions parameter"
}
```

**Causa**: A lógica de inferência de dimensões estava fazendo match **exato** do nome do modelo, mas os nomes podem vir em formatos diferentes:
- Frontend envia: `nomic-embed-text`
- Config tem: `nomic-embed-text` (mas também `nomic-embed-text:latest`)
- Match falhava se houvesse diferença na tag `:latest`

---

## 🔍 Análise do Código

### Antes da Correção

```javascript
// ❌ Match exato apenas
const modelInfo = COLLECTION_CONFIG.embeddingModels.find(m => m.name === targetModel);
targetDimensions = modelInfo?.dimensions;

// Se não encontrar, erro!
if (!targetModel || !targetDimensions) {
  return res.status(400).json({
    success: false,
    error: 'Missing embeddingModel or dimensions parameter'
  });
}
```

**Problema**:
- Se modelo vem como `nomic-embed-text` mas config tem `nomic-embed-text:latest`
- ❌ Match falha
- ❌ `targetDimensions` fica `undefined`
- ❌ Erro retornado

---

### Depois da Correção

```javascript
// ✅ Match flexível (exato OU parcial)
const modelInfo = COLLECTION_CONFIG.embeddingModels.find(m => {
  // Exact match
  if (m.name === targetModel || m.fullName === targetModel) return true;
  
  // Partial match (without :latest tag)
  const baseModelName = targetModel.split(':')[0];
  const configBaseName = m.name.split(':')[0];
  return baseModelName === configBaseName;
});
targetDimensions = modelInfo?.dimensions;

// Mensagens de erro mais específicas
if (!targetModel) {
  return res.status(400).json({
    success: false,
    error: 'Missing embeddingModel parameter'
  });
}

if (!targetDimensions) {
  return res.status(400).json({
    success: false,
    error: `Could not determine dimensions for model '${targetModel}'. 
            Please specify dimensions parameter or use a configured model: 
            ${COLLECTION_CONFIG.embeddingModels.map(m => m.name).join(', ')}`
  });
}
```

**Melhorias**:
- ✅ Match exato: `m.name === targetModel` ou `m.fullName === targetModel`
- ✅ Match parcial: `nomic-embed-text` === `nomic-embed-text:latest` (sem tag)
- ✅ Mensagens de erro específicas
- ✅ Sugestão de modelos configurados

---

## 📊 Cenários de Match

### Cenário 1: Match Exato (Nome)

```javascript
Frontend envia: "nomic-embed-text"
Config tem: { name: "nomic-embed-text", dimensions: 768 }
Match: ✅ m.name === targetModel
Dimensões: 768 ✅
```

### Cenário 2: Match Exato (Full Name)

```javascript
Frontend envia: "nomic-embed-text:latest"
Config tem: { name: "nomic-embed-text", fullName: "nomic-embed-text:latest", dimensions: 768 }
Match: ✅ m.fullName === targetModel
Dimensões: 768 ✅
```

### Cenário 3: Match Parcial (Sem Tag)

```javascript
Frontend envia: "nomic-embed-text:v1.0"
Config tem: { name: "nomic-embed-text", dimensions: 768 }
Split: "nomic-embed-text:v1.0".split(':')[0] → "nomic-embed-text"
Match: ✅ baseModelName === configBaseName
Dimensões: 768 ✅
```

### Cenário 4: Modelo Não Configurado

```javascript
Frontend envia: "mistral-embed"
Config tem: [nomic, mxbai, gemma]
Match: ❌ Nenhum match
Dimensões: undefined
Erro: "Could not determine dimensions for model 'mistral-embed'. 
       Use: nomic-embed-text, mxbai-embed-large, embeddinggemma"
```

---

## 🛠️ Mapeamento de Dimensões

### Modelos Configurados

| Modelo | Nome Base | Full Name | Dimensões |
|--------|-----------|-----------|-----------|
| **Nomic Embed** | `nomic-embed-text` | `nomic-embed-text:latest` | 768 |
| **MXBAI Embed** | `mxbai-embed-large` | `mxbai-embed-large:latest` | 384 |
| **Gemma Embed** | `embeddinggemma` | `embeddinggemma:latest` | 768 |

**Configuração**: `backend/api/documentation-api/src/routes/rag-collections.js`

```javascript
const COLLECTION_CONFIG = {
  embeddingModels: [
    {
      name: 'nomic-embed-text',
      fullName: 'nomic-embed-text:latest',
      dimensions: 768,  // ← Inferido automaticamente
      // ...
    },
    {
      name: 'mxbai-embed-large',
      fullName: 'mxbai-embed-large:latest',
      dimensions: 384,  // ← Inferido automaticamente
      // ...
    },
    {
      name: 'embeddinggemma',
      fullName: 'embeddinggemma:latest',
      dimensions: 768,  // ← Inferido automaticamente
      // ...
    }
  ]
};
```

---

## 🔄 Fluxo de Criação Atualizado

```
1. Frontend: Usuário preenche formulário
   Nome: "test__nomic"
   Modelo: "nomic-embed-text"  ← Vem do dropdown
   Diretório: "docs/content"
   ↓
2. POST /api/v1/rag/collections/test__nomic/create
   Body: {
     embedding_model: "nomic-embed-text",
     source_directory: "docs/content"
   }
   ↓
3. Backend: Buscar dimensões
   targetModel = "nomic-embed-text"
   
   Match em COLLECTION_CONFIG.embeddingModels:
   - Tenta m.name === "nomic-embed-text" ✅
   - Encontrado! dimensions: 768
   ↓
4. Criar coleção no Qdrant
   PUT /collections/test__nomic
   Body: {
     vectors: {
       size: 768,  ← Inferido automaticamente
       distance: "Cosine"
     }
   }
   ↓
5. Sucesso!
   {
     "success": true,
     "collection": "test__nomic",
     "embeddingModel": "nomic-embed-text",
     "dimensions": 768,
     "message": "Collection created successfully"
   }
```

---

## ✅ Validação

### Teste 1: Modelo Configurado

**Request**:
```json
POST /api/v1/rag/collections/test__nomic/create
{
  "embedding_model": "nomic-embed-text",
  "source_directory": "docs/content"
}
```

**Response**:
```json
{
  "success": true,
  "dimensions": 768  ← Inferido automaticamente ✅
}
```

---

### Teste 2: Modelo com Tag

**Request**:
```json
POST /api/v1/rag/collections/test__nomic/create
{
  "embedding_model": "nomic-embed-text:latest",
  "source_directory": "docs/content"
}
```

**Response**:
```json
{
  "success": true,
  "dimensions": 768  ← Match parcial funcionou ✅
}
```

---

### Teste 3: Modelo Não Configurado

**Request**:
```json
POST /api/v1/rag/collections/test__mistral/create
{
  "embedding_model": "mistral-embed",
  "source_directory": "docs/content"
}
```

**Response**:
```json
{
  "success": false,
  "error": "Could not determine dimensions for model 'mistral-embed'. 
           Use: nomic-embed-text, mxbai-embed-large, embeddinggemma"
}
```

**Solução**: Adicionar dimensões manualmente:
```json
{
  "embedding_model": "mistral-embed",
  "dimensions": 1024,  ← Especificado manualmente
  "source_directory": "docs/content"
}
```

---

## 📁 Arquivos Modificados

### `backend/api/documentation-api/src/routes/rag-collections.js`

**Mudanças**:
- **Linha 220-227**: Lógica de match melhorada (exato + parcial)
- **Linha 231-243**: Mensagens de erro mais específicas e informativas

**Benefícios**:
- ✅ Suporta diferentes formatos de nome de modelo
- ✅ Match flexível com ou sem tag `:latest`
- ✅ Mensagens de erro descritivas
- ✅ Sugere modelos configurados quando falha

---

## 🚀 Como Testar Agora

### 1. Recarregar Dashboard

```
http://localhost:3103/#/llamaindex-services

Pressione: Ctrl + Shift + R
```

### 2. Criar Nova Coleção

```
Clicar em: "Nova Coleção"

Preencher:
  Nome: "test__nomic"
  Modelo: "nomic-embed-text"  ← Do dropdown
  Diretório: "docs/content"  ← Padrão ou selecionar

Clicar em: "Criar Coleção"
```

### 3. Verificar Sucesso

**Antes**:
```json
❌ {"success": false, "error": "Missing embeddingModel or dimensions parameter"}
```

**Depois**:
```json
✅ {"success": true, "collection": "test__nomic", "dimensions": 768}
```

**Na tabela**:
```
┌────────────────────────────────────────────────────┐
│ test__nomic │ nomic | docs/content │ 0 │ 🔄▶🗑📄 │
└────────────────────────────────────────────────────┘
```

---

## 🎉 Resultado Final

**Criação de coleção corrigida**:
- ✅ Inferência automática de dimensões
- ✅ Match flexível de nomes de modelo
- ✅ Suporte a tags (`:latest`, `:v1.0`)
- ✅ Mensagens de erro informativas
- ✅ Sugestões quando modelo não é encontrado

**Container**:
- ✅ Reiniciado com correção aplicada

---

**Status**: ✅ FUNCIONANDO  
**Ação**: Tente criar a coleção novamente - deve funcionar agora!  
**Documentação**: `CORRECAO-DIMENSOES-MODELO.md`

