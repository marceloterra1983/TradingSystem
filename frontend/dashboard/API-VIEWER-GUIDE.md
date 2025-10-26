# API Viewer - Guia Completo

## 📋 Visão Geral

O botão **DocsAPI** no TradingSystem Dashboard agora abre um **visualizador dedicado de APIs** com múltiplas opções de visualização profissional.

### Localização
**Dashboard → Knowledge → Docs → Botão "DocsAPI"**

## 🎯 Funcionalidades

### 1. **Seleção de API**
Escolha entre as APIs disponíveis:
- **Documentation API** (Port 3400) - Gerenciamento de documentação, ideias, specs, busca e arquivos
- **Workspace API** (Port 3200) - CRUD de workspace com Kanban workflow

### 2. **Múltiplos Visualizadores**

#### 🎨 Redoc (Recomendado)
- **Descrição**: Beautiful, responsive documentation with 3-panel layout
- **Features**:
  - Layout responsivo de 3 painéis
  - Navegação lateral organizada
  - Exemplos de código automáticos
  - Suporte a dark mode
  - Melhor para: Leitura e exploração

#### ⚡ Swagger UI
- **Descrição**: Interactive explorer with "Try it out" functionality
- **Features**:
  - Interface interativa completa
  - **Try it out** - Teste endpoints ao vivo
  - Validação de parâmetros
  - Exemplos de request/response
  - Melhor para: Testes e desenvolvimento

#### 🚀 RapiDoc
- **Descrição**: Modern, customizable API documentation
- **Features**:
  - Design moderno e customizável
  - Layout flexível
  - Suporte a múltiplos temas
  - Navegação rápida
  - Melhor para: Apresentações e demos

#### 📄 Raw Spec
- **Descrição**: View or download raw OpenAPI specification
- **Features**:
  - Visualização da spec pura
  - Download do arquivo YAML
  - Links para outros visualizadores
  - Melhor para: Análise técnica

## 🚀 Como Usar

### Passo a Passo

1. **Abrir Dashboard**
   ```
   http://localhost:3103
   ```

2. **Navegar para Docs**
   ```
   Knowledge → Docs
   ```

3. **Clicar em "DocsAPI"**
   - Tab aparecerá com o API Viewer

4. **Selecionar API**
   - Clique em "Documentation API" ou "Workspace API"

5. **Escolher Visualizador**
   - Clique em "Redoc", "Swagger", "RapiDoc" ou "Raw"

6. **Explorar API**
   - Navegue pelos endpoints
   - Leia descrições
   - Teste (Swagger UI)
   - Download spec (Raw)

## 📊 Comparação de Visualizadores

| Feature | Redoc | Swagger UI | RapiDoc | Raw |
|---------|-------|------------|---------|-----|
| Layout Responsivo | ✅ Excelente | ✅ Bom | ✅ Excelente | ➖ N/A |
| Navegação | ✅ 3-panel | ✅ Sidebar | ✅ Flexível | ➖ N/A |
| Try It Out | ❌ Não | ✅ Sim | ✅ Sim | ❌ Não |
| Code Examples | ✅ Auto | ✅ Manual | ✅ Auto | ❌ Não |
| Dark Mode | ✅ Sim | ✅ Sim | ✅ Sim | ➖ N/A |
| Download Spec | ❌ Não | ✅ Sim | ✅ Sim | ✅ Sim |
| Performance | ✅ Rápido | ⚠️ Médio | ✅ Rápido | ✅ Instantâneo |
| **Melhor Para** | Leitura | Testes | Apresentações | Análise |

## 💡 Casos de Uso

### Para Desenvolvedores

**Desenvolvimento de Integração:**
1. Use **Swagger UI**
2. Teste endpoints com "Try it out"
3. Valide payloads
4. Copie exemplos de código

**Leitura de Documentação:**
1. Use **Redoc**
2. Navegue pelos endpoints
3. Leia descrições detalhadas
4. Copie exemplos automáticos

### Para Product Managers

**Planejamento de Features:**
1. Use **Redoc** ou **RapiDoc**
2. Visualize estrutura da API
3. Identifique endpoints relevantes
4. Compartilhe com time

### Para DevOps

**Análise Técnica:**
1. Use **Raw Spec**
2. Download do arquivo YAML
3. Valide especificação
4. Configure ferramentas (Postman, etc)

## 🔧 Configuração Técnica

### Arquivos Modificados

#### 1. Nova Página de Visualização
**Arquivo:** `frontend/dashboard/src/components/pages/APIViewerPage.tsx`

**Features:**
- Seleção dinâmica de API
- Múltiplos visualizadores (Redoc, Swagger, RapiDoc, Raw)
- URLs otimizados para cada visualizador
- Botões de ação (Open in tab, Download)

#### 2. Integração no DocusaurusPage
**Arquivo:** `frontend/dashboard/src/components/pages/DocusaurusPage.tsx`

**Mudanças:**
- Importa `APIViewerPage`
- Adiciona lógica condicional para renderizar APIViewerPage quando `isDocsApiView`
- Mantém compatibilidade com tabs existentes (Overview, Docusaurus)

#### 3. Navegação
**Arquivo:** `frontend/dashboard/src/data/navigation.tsx`

**Mudanças:**
- Lazy loading de `APIViewerPage`
- Mantém estrutura de navegação existente

#### 4. Specs OpenAPI
**Diretório:** `frontend/dashboard/public/specs/`

**Arquivos:**
- `documentation-api.openapi.yaml` (47KB)
- `workspace.openapi.yaml` (9.6KB)

**Fonte:** Copiados de `docs/static/specs/`

### URLs dos Visualizadores

**Redoc:**
```
https://redocly.github.io/redoc/?url=http://localhost:3103/specs/[api-id].openapi.yaml
```

**Swagger UI:**
```
https://petstore.swagger.io/?url=http://localhost:3103/specs/[api-id].openapi.yaml
```

**RapiDoc:**
```
https://mrin9.github.io/RapiDoc/examples/example1.html?spec-url=http://localhost:3103/specs/[api-id].openapi.yaml
```

**Raw:**
```
/specs/[api-id].openapi.yaml
```

## 🎨 Interface

### Controles Superiores

**Seleção de API:**
```
┌─────────────────────────────────────────────┐
│ [Documentation API] [Workspace API]         │
│  Port 3400          Port 3200               │
└─────────────────────────────────────────────┘
```

**Seleção de Visualizador:**
```
┌─────────────────────────────────────────────┐
│ [Redoc] [Swagger UI] [RapiDoc] [Raw]       │
└─────────────────────────────────────────────┘
```

**Ações:**
```
┌─────────────────────────────────────────────┐
│ [Open in new tab] [Download Spec]          │
└─────────────────────────────────────────────┘
```

### Área de Visualização

**Iframe (Redoc/Swagger/RapiDoc):**
```
┌─────────────────────────────────────────────┐
│                                             │
│         [Visualizador Embutido]            │
│                                             │
│              (Full Height)                  │
│                                             │
└─────────────────────────────────────────────┘
```

**Raw Spec:**
```
┌─────────────────────────────────────────────┐
│ Raw OpenAPI Specification                   │
│                                             │
│ Spec URL: /specs/documentation-api.op...   │
│                                             │
│ [View Raw Spec] [Download YAML]            │
│                                             │
│ Available Viewers:                          │
│ - Redoc - Beautiful, responsive...         │
│ - Swagger UI - Interactive explorer...     │
│ - RapiDoc - Modern, customizable...        │
└─────────────────────────────────────────────┘
```

## 🔄 Fluxo de Navegação

```
Dashboard (3103)
  └─> Knowledge Section
      └─> Docs Page
          ├─> Overview Tab (Escopo)
          ├─> Docusaurus Tab (Port 3205)
          └─> DocsAPI Tab ✅ API VIEWER
              ├─> Select API
              │   ├─> Documentation API
              │   └─> Workspace API
              └─> Select Viewer
                  ├─> Redoc (CDN)
                  ├─> Swagger UI (CDN)
                  ├─> RapiDoc (CDN)
                  └─> Raw Spec
```

## 📝 Manutenção

### Adicionar Nova API

1. **Copiar spec para public/specs/**
   ```bash
   cp path/to/new-api.openapi.yaml frontend/dashboard/public/specs/
   ```

2. **Atualizar API_SPECS em APIViewerPage.tsx**
   ```typescript
   const API_SPECS: ApiSpec[] = [
     // ... existing specs
     {
       id: 'new-api',
       name: 'New API',
       description: 'Description of new API',
       port: '3XXX',
       specUrl: '/specs/new-api.openapi.yaml',
     },
   ];
   ```

### Sincronizar Specs

As specs no dashboard são cópias das specs canônicas em `docs/static/specs/`.

**Para sincronizar:**
```bash
cp docs/static/specs/*.yaml frontend/dashboard/public/specs/
```

**Automatizar (futuro):**
```bash
# Adicionar ao build script do dashboard
npm run sync-specs
```

## ⚠️ Troubleshooting

### Visualizador não carrega

**Sintoma:** Tela branca ou erro ao selecionar visualizador

**Solução:**
1. Verificar se spec existe:
   ```bash
   ls frontend/dashboard/public/specs/
   ```

2. Verificar console do browser para erros
3. Testar URL da spec diretamente:
   ```
   http://localhost:3103/specs/documentation-api.openapi.yaml
   ```

4. Limpar cache do browser (Ctrl+Shift+R)

### CORS Error

**Sintoma:** Error de CORS ao carregar spec em visualizador externo

**Solução:**
- Specs são servidas pelo próprio dashboard (localhost:3103)
- Visualizadores externos (Redoc CDN, Swagger UI) podem acessar specs locais via `?url=` parameter
- Se problema persistir, usar visualizador local (Redocusaurus no docs)

### Spec desatualizada

**Sintoma:** Mudanças na API não aparecem no visualizador

**Solução:**
1. Sincronizar specs:
   ```bash
   cp docs/static/specs/*.yaml frontend/dashboard/public/specs/
   ```

2. Rebuild dashboard:
   ```bash
   cd frontend/dashboard
   npm run build
   ```

3. Hard refresh no browser (Ctrl+Shift+R)

## 🚀 Próximas Melhorias

- [ ] Adicionar mais APIs (B3, TP Capital, Service Launcher)
- [ ] Implementar visualizador offline (não depender de CDNs)
- [ ] Adicionar histórico de APIs visualizadas
- [ ] Sincronização automática de specs
- [ ] Comparação lado-a-lado de diferentes versões
- [ ] Export de collections (Postman, Insomnia)
- [ ] Geração de código cliente (SDK generator)

## 📚 Referências

- **Redoc**: https://redocly.com/redoc
- **Swagger UI**: https://swagger.io/tools/swagger-ui/
- **RapiDoc**: https://rapidocweb.com/
- **OpenAPI Spec**: https://spec.openapis.org/oas/latest.html
- **Componente**: [APIViewerPage.tsx](src/components/pages/APIViewerPage.tsx)
- **Specs Canônicas**: [docs/static/specs/](../../docs/static/specs/)

---

**Criado em:** 2025-10-25
**Última atualização:** 2025-10-25
**Versão:** 1.0.0
