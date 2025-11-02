# 📁 Coleções e Diretórios de Monitoramento

**Data**: 2025-10-31  
**Status**: 🟡 PARCIALMENTE IMPLEMENTADO

---

## 🎯 Pergunta

**"Toda coleção tem uma pasta de arquivos onde monitora se tem modificação ou novos arquivos, certo?"**

**Resposta**: 🟡 **Parcialmente**. Veja detalhes abaixo.

---

## 📊 Sistema Atual

### Configuração de Coleções

**Arquivo**: `tools/llamaindex/collection-config.json`

Cada coleção **TEM** um campo `"source"` definindo o diretório:

```json
{
  "collections": [
    {
      "name": "documentation__nomic",
      "embeddingModel": "nomic-embed-text",
      "source": "docs/content",  ← Diretório configurado
      "enabled": true
    },
    {
      "name": "documentation__mxbai",
      "embeddingModel": "mxbai-embed-large",
      "source": "docs/content",  ← Mesmo diretório
      "enabled": true
    },
    {
      "name": "repository__nomic",
      "embeddingModel": "nomic-embed-text",
      "source": ".",  ← Raiz do projeto (código fonte)
      "enabled": false
    }
  ]
}
```

### Mapeamento no Backend (rag-status.js)

**Implementação atual** (HARDCODED):

```javascript
const DEFAULT_DOCS_DIR = '/app/docs/content';  // Diretório padrão
const DEFAULT_REPOSITORY_DIR = '/data/tradingsystem';  // Diretório de código

const collectionDirectories = new Map();
collectionDirectories.set(QDRANT_COLLECTION.toLowerCase(), DEFAULT_DOCS_DIR);
collectionDirectories.set('repository', DEFAULT_REPOSITORY_DIR);

const targetDirectory = 
  collectionDirectories.get(targetCollection.toLowerCase()) || DEFAULT_DOCS_DIR;
```

**Problema**: 🔴 **Não lê do `collection-config.json`!**

---

## 🟢 Coleções com Diretório Específico

| Coleção | Diretório | Status |
|---------|-----------|--------|
| `documentation__nomic` | `/app/docs/content` | ✅ Hardcoded |
| `repository` | `/data/tradingsystem` | ✅ Hardcoded |

## 🔴 Coleções sem Diretório Específico

| Coleção | Diretório | Status |
|---------|-----------|--------|
| `documentation__mxbai` | `/app/docs/content` (fallback) | ⚠️ Usa padrão |
| `documentation__gemma` | `/app/docs/content` (fallback) | ⚠️ Usa padrão |
| **Novas coleções criadas** | `/app/docs/content` (fallback) | ⚠️ Usa padrão |

---

## ⚠️ Limitações Atuais

### 1. Todas as Coleções de Documentação Monitoram o Mesmo Diretório

**Situação atual**:
- `documentation__nomic` → `docs/content` ✅
- `documentation__mxbai` → `docs/content` (fallback) ⚠️
- `documentation__gemma` → `docs/content` (fallback) ⚠️

**Resultado**:
- ✅ Todas veem os mesmos 218 arquivos
- ✅ Status de "pendentes" e "indexados" é sincronizado
- ⚠️ Não é possível indexar diretórios diferentes por coleção

### 2. Configuração Não É Lida Dinamicamente

**Problema**:
```json
// collection-config.json tem "source": "docs/content"
// MAS backend NÃO lê esse campo!
```

**Consequência**:
- ❌ Campo `"source"` é ignorado
- ❌ Mapeamento está hardcoded em JavaScript
- ❌ Não é possível configurar via JSON

### 3. Novas Coleções Não Podem Especificar Diretório

**Ao criar nova coleção**:
```
Nome: test__nomic
Modelo: nomic-embed-text
Diretório: ??? ← NÃO HÁ CAMPO!
```

**Resultado**:
- ⚠️ Usa `/app/docs/content` (padrão)
- ⚠️ Não pode monitorar outro diretório

---

## 🎯 Proposta de Melhoria

### Arquitetura Ideal

Cada coleção deveria poder ter:
1. **Diretório específico de monitoramento**
2. **Modelo de embedding específico** ✅ (já implementado)
3. **Configuração independente**

### Exemplo de Uso

```json
{
  "collections": [
    {
      "name": "documentation__nomic",
      "embeddingModel": "nomic-embed-text",
      "source": "/app/docs/content",  ← Documentação
      "enabled": true
    },
    {
      "name": "api__nomic",
      "embeddingModel": "nomic-embed-text",
      "source": "/app/docs/content/api",  ← Apenas API docs
      "enabled": true
    },
    {
      "name": "repository__nomic",
      "embeddingModel": "nomic-embed-text",
      "source": "/app",  ← Código fonte
      "enabled": true
    },
    {
      "name": "frontend__nomic",
      "embeddingModel": "nomic-embed-text",
      "source": "/app/frontend",  ← Apenas frontend
      "enabled": true
    }
  ]
}
```

---

## 🛠️ Como Implementar

### 1. Atualizar Backend para Ler `collection-config.json`

**Arquivo**: `backend/api/documentation-api/src/routes/rag-status.js`

```javascript
// Ler configuração do arquivo
const collectionConfig = JSON.parse(
  fs.readFileSync('../../tools/llamaindex/collection-config.json', 'utf-8')
);

// Criar mapeamento dinâmico
const collectionDirectories = new Map();
collectionConfig.collections.forEach(collection => {
  if (collection.enabled && collection.source) {
    const fullPath = path.resolve(projectRoot, collection.source);
    collectionDirectories.set(collection.name.toLowerCase(), fullPath);
  }
});

// Fallback para coleções não configuradas
const targetDirectory = 
  collectionDirectories.get(targetCollection.toLowerCase()) || DEFAULT_DOCS_DIR;
```

### 2. Adicionar Campo "Diretório" no Dialog de Criação

**Frontend**: `LlamaIndexIngestionStatusCard.tsx`

```typescript
// Estado adicional
const [selectedDirectory, setSelectedDirectory] = useState('docs/content');

// Campo no formulário
<div className="grid gap-2">
  <Label htmlFor="source-directory">Diretório de Monitoramento</Label>
  <Select
    value={selectedDirectory}
    onValueChange={setSelectedDirectory}
    disabled={creatingCollection}
  >
    <SelectTrigger id="source-directory">
      <SelectValue placeholder="Selecione um diretório" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="docs/content">📚 Documentação</SelectItem>
      <SelectItem value=".">💻 Repositório Completo</SelectItem>
      <SelectItem value="frontend">🎨 Frontend</SelectItem>
      <SelectItem value="backend">⚙️ Backend</SelectItem>
      <SelectItem value="tools">🔧 Tools</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### 3. Criar Endpoint para Adicionar Coleção ao Config

**Endpoint**: `POST /api/v1/rag/collections/{name}/configure`

**Request**:
```json
{
  "collection_name": "frontend__nomic",
  "embedding_model": "nomic-embed-text",
  "source_directory": "frontend",
  "enabled": true
}
```

**Ação**:
1. Atualiza `collection-config.json`
2. Cria coleção no Qdrant
3. Dispara ingestão inicial

---

## 📊 Comparação

### Sistema Atual (Limitado)

```
┌────────────────────────────────────┐
│ Coleção: documentation__nomic      │
│ Modelo: nomic-embed-text           │
│ Diretório: docs/content (fixo) ❌  │
├────────────────────────────────────┤
│ Coleção: documentation__mxbai      │
│ Modelo: mxbai-embed-large          │
│ Diretório: docs/content (fixo) ❌  │
└────────────────────────────────────┘

Todas monitoram docs/content
```

### Sistema Proposto (Flexível)

```
┌────────────────────────────────────┐
│ Coleção: documentation__nomic      │
│ Modelo: nomic-embed-text           │
│ Diretório: docs/content ✅         │
├────────────────────────────────────┤
│ Coleção: api__nomic                │
│ Modelo: nomic-embed-text           │
│ Diretório: docs/content/api ✅     │
├────────────────────────────────────┤
│ Coleção: frontend__nomic           │
│ Modelo: nomic-embed-text           │
│ Diretório: frontend ✅             │
└────────────────────────────────────┘

Cada coleção monitora diretório específico
```

---

## 🚀 Casos de Uso

### Caso 1: Documentação por Domínio

```json
{
  "name": "docs-api__nomic",
  "source": "docs/content/api",
  "description": "Apenas documentação de APIs"
}

{
  "name": "docs-frontend__nomic",
  "source": "docs/content/frontend",
  "description": "Apenas documentação de frontend"
}
```

**Benefício**: Busca mais focada e rápida

### Caso 2: Código Fonte por Módulo

```json
{
  "name": "frontend__nomic",
  "source": "frontend",
  "description": "Código do frontend"
}

{
  "name": "backend__nomic",
  "source": "backend",
  "description": "Código do backend"
}
```

**Benefício**: RAG para código fonte segmentado

### Caso 3: Múltiplas Fontes de Dados

```json
{
  "name": "docs__nomic",
  "source": "docs/content"
}

{
  "name": "external-docs__nomic",
  "source": "/data/external-docs"
}

{
  "name": "customer-docs__nomic",
  "source": "/data/customer-knowledge"
}
```

**Benefício**: RAG multi-fonte

---

## ❓ Resposta à Pergunta

### Estado Atual

**Pergunta**: "Toda coleção tem uma pasta de arquivos onde monitora se tem modificação ou novos arquivos?"

**Resposta**: 🟡 **Parcialmente**

**O que funciona**:
- ✅ Campo `"source"` existe no `collection-config.json`
- ✅ Cada coleção **PODE** ter diretório específico (em teoria)
- ✅ Coleção `repository` usa diretório diferente

**O que NÃO funciona**:
- ❌ Backend não lê `"source"` do `collection-config.json`
- ❌ Mapeamento está hardcoded (apenas 2 coleções)
- ❌ Novas coleções sempre usam `docs/content` (fallback)
- ❌ Dialog de criação não permite escolher diretório

---

## 🔧 Para Implementar Totalmente

### Checklist de Implementação

- [ ] **1. Backend lê `collection-config.json`**
  - Carregar mapeamento de `source` por coleção
  - Usar configuração dinâmica vs hardcoded

- [ ] **2. Adicionar campo "Diretório" no dialog de criação**
  - Dropdown com opções predefinidas
  - Validação de diretório existente

- [ ] **3. Endpoint para atualizar `collection-config.json`**
  - Permitir adicionar novas configurações de coleção
  - Persistir em arquivo JSON

- [ ] **4. Exibir diretório na tabela de coleções**
  - Coluna adicional: "Diretório"
  - Tooltip mostrando caminho completo

- [ ] **5. Watcher de arquivos por coleção**
  - Monitorar apenas o diretório específico
  - Notificar quando houver mudanças

---

## 🎯 Resumo Executivo

### Sistema Atual (2025-10-31)

**Modelo atual**:
```
Coleção → Modelo de Embedding (dinâmico ✅) + Diretório (estático ❌)
```

**Limitações**:
1. Todas as coleções de documentação monitoram `docs/content`
2. Não é possível criar coleção para diretório específico
3. Mapeamento hardcoded (apenas 2 coleções configuradas)

### Sistema Ideal (Proposta)

**Modelo proposto**:
```
Coleção → Modelo de Embedding (dinâmico ✅) + Diretório (dinâmico ✅)
```

**Benefícios**:
1. Cada coleção pode monitorar diretório específico
2. RAG focado por domínio/módulo
3. Configuração totalmente via JSON
4. Interface permite escolher diretório na criação

---

## 📝 Próximos Passos Sugeridos

### Opção 1: Implementação Completa (Recomendado)

**Esforço**: ~2-3 horas  
**Benefício**: Sistema totalmente flexível

**Tarefas**:
1. Atualizar `rag-status.js` para ler `collection-config.json`
2. Adicionar campo "Diretório" no dialog de criação
3. Criar endpoint para atualizar configuração
4. Adicionar coluna "Diretório" na tabela
5. Documentar novo fluxo

### Opção 2: Manter Atual (Mais Simples)

**Esforço**: ~0 horas  
**Benefício**: Evita complexidade adicional

**Justificativa**:
- Todas as coleções de documentação usam o mesmo diretório
- Coleções diferentes são diferenciadas apenas pelo modelo
- Simplicidade na configuração

### Opção 3: Híbrido (Compromisso)

**Esforço**: ~1 hora  
**Benefício**: Flexibilidade parcial

**Tarefas**:
1. Apenas ler `collection-config.json` no backend
2. Não adicionar campo no dialog (usar padrão)
3. Documentar como adicionar manualmente via JSON

---

## 🤔 Qual Opção Você Prefere?

### Cenário A: Você precisa de coleções em diretórios diferentes?

**Exemplo**:
- `docs-api__nomic` → `docs/content/api` apenas
- `docs-frontend__nomic` → `docs/content/frontend` apenas
- `code-frontend__nomic` → `frontend/` (código fonte)

**Resposta**: "Sim" → **Opção 1** (Implementação Completa)

### Cenário B: Todas as coleções podem usar docs/content?

**Exemplo**:
- `documentation__nomic` → `docs/content`
- `documentation__mxbai` → `docs/content`
- `documentation__gemma` → `docs/content`
- (Mesmo diretório, modelos diferentes)

**Resposta**: "Sim" → **Opção 2** (Manter Atual)

---

## 📊 Status Atual vs Ideal

| Funcionalidade | Atual | Ideal |
|----------------|-------|-------|
| **Modelo por coleção** | ✅ Sim | ✅ Sim |
| **Diretório configurável** | 🟡 Hardcoded | ✅ Dinâmico |
| **Leitura de collection-config.json** | ❌ Não | ✅ Sim |
| **Campo no dialog de criação** | ❌ Não | ✅ Sim |
| **Monitoramento independente** | ❌ Não | ✅ Sim |
| **Watcher de mudanças** | ❌ Não | ✅ Sim |

---

## 💡 Recomendação

### Para Seu Caso de Uso

**Se todas as coleções monitoram `docs/content`**:
- ✅ Sistema atual é suficiente
- ✅ Múltiplos modelos no mesmo diretório funcionam bem
- ✅ Mais simples e direto

**Se você precisa indexar diretórios diferentes**:
- 🚀 Implementar Opção 1 (diretório configurável)
- 🚀 Permite RAG segmentado por domínio
- 🚀 Mais flexível mas mais complexo

---

## 🎯 Resposta Final

**Atualmente**:
- 🟡 **Parcialmente**: Configuração existe mas não é usada
- ✅ 2 coleções têm diretório específico (hardcoded)
- ⚠️ Demais coleções usam fallback (`docs/content`)
- ❌ Não é possível escolher diretório ao criar coleção

**Para tornar totalmente configurável**:
- Precisa implementar leitura de `collection-config.json`
- Adicionar campo "Diretório" no dialog de criação
- Atualizar backend para suportar múltiplos diretórios

---

**Você quer que eu implemente a funcionalidade completa de diretórios por coleção? Ou o sistema atual (todas as coleções em `docs/content`) é suficiente?**

**Documentação**: `COLECOES-E-DIRETORIOS.md`

