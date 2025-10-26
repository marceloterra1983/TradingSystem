# Correção - Swagger UI e RapiDoc

## 🐛 Problema

Os visualizadores **Swagger UI** e **RapiDoc** não estavam funcionando quando acessados via CDN externo devido a problemas de **CORS** (Cross-Origin Resource Sharing).

### Causa
- CDNs externos (`petstore.swagger.io`, `mrin9.github.io/RapiDoc`) não conseguiam acessar specs OpenAPI servidas localmente em `localhost:3103`
- Navegadores bloqueavam requisições cross-origin para arquivos locais

## ✅ Solução

Criei **visualizadores locais** HTML que rodam no mesmo domínio do dashboard, eliminando problemas de CORS.

---

## 📁 Arquivos Criados

### 1. **Swagger UI Local**
**Arquivo:** `frontend/dashboard/public/viewers/swagger.html`

**Features:**
- ✅ Swagger UI 5.x via CDN (apenas biblioteca)
- ✅ Sem problemas de CORS (mesmo domínio)
- ✅ Try it out functionality
- ✅ Download spec
- ✅ Dark mode compatible
- ✅ Deep linking
- ✅ Filtros e busca

**Uso:**
```
http://localhost:3103/viewers/swagger.html?url=/specs/documentation-api.openapi.yaml
```

### 2. **RapiDoc Local**
**Arquivo:** `frontend/dashboard/public/viewers/rapidoc.html`

**Features:**
- ✅ RapiDoc via CDN (componente web)
- ✅ Sem problemas de CORS
- ✅ Dark theme pré-configurado
- ✅ Try it out functionality
- ✅ Layout responsivo
- ✅ Customização de cores (match do dashboard)

**Uso:**
```
http://localhost:3103/viewers/rapidoc.html?url=/specs/documentation-api.openapi.yaml
```

---

## 🔧 Mudanças no Código

### APIViewerPage.tsx

**ANTES (com CORS issues):**
```typescript
case 'swagger':
  url = `https://petstore.swagger.io/?url=${encodeURIComponent(absoluteSpecUrl)}`;
  break;

case 'rapidoc':
  url = `https://mrin9.github.io/RapiDoc/?spec-url=${encodeURIComponent(absoluteSpecUrl)}`;
  break;
```

**DEPOIS (sem CORS):**
```typescript
case 'swagger':
  // Use local Swagger UI HTML (no CORS issues)
  url = `/viewers/swagger.html?url=${encodeURIComponent(selectedApi.specUrl)}`;
  break;

case 'rapidoc':
  // Use local RapiDoc HTML (no CORS issues)
  url = `/viewers/rapidoc.html?url=${encodeURIComponent(selectedApi.specUrl)}`;
  break;
```

---

## 🎨 Configurações dos Visualizadores

### Swagger UI

**Tema:**
- Topbar: `#0f172a` (slate-900)
- Compatível com dark mode do dashboard

**Features Ativadas:**
- `tryItOutEnabled: true` - Try it out habilitado
- `deepLinking: true` - Links diretos para endpoints
- `filter: true` - Filtro de busca
- `docExpansion: 'list'` - Expande lista de endpoints
- `showRequestHeaders: true` - Mostra headers das requests

### RapiDoc

**Tema Dark:**
```javascript
theme="dark"
bg-color="#0f172a"
primary-color="#3b82f6"
nav-bg-color="#1e293b"
```

**Features:**
- `allow-try="true"` - Try it out habilitado
- `render-style="read"` - Modo de leitura otimizado
- `schema-style="table"` - Schemas em formato tabela
- `layout="column"` - Layout em coluna única

---

## 🧪 Como Testar

### Teste 1: Swagger UI

1. Abra o dashboard: `http://localhost:3103`
2. Navegue: Knowledge → Docs → DocsAPI
3. Selecione: "Documentation API"
4. Escolha: "Swagger"
5. Verifique:
   - ✅ Página carrega sem erros
   - ✅ Endpoints listados
   - ✅ "Try it out" funciona
   - ✅ Exemplos de response aparecem

### Teste 2: RapiDoc

1. Mesmo caminho até DocsAPI
2. Selecione: "Workspace API"
3. Escolha: "RapiDoc"
4. Verifique:
   - ✅ Página carrega com tema dark
   - ✅ Navegação lateral funciona
   - ✅ "TRY" buttons aparecem
   - ✅ Schemas formatados em tabela

### Teste 3: Open in New Tab

1. Com qualquer visualizador ativo
2. Click "Open in new tab"
3. Verifique:
   - ✅ Nova aba abre
   - ✅ Visualizador carrega corretamente
   - ✅ URL é compartilhável

---

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes (CDN Externo) | Depois (Local) |
|---------|---------------------|----------------|
| **CORS** | ❌ Problemas | ✅ Sem problemas |
| **Carregamento** | ⚠️ Dependente de CDN externo | ✅ Rápido (local) |
| **Funcionalidade** | ❌ Não carregava | ✅ Totalmente funcional |
| **Try It Out** | ❌ Não disponível | ✅ Funciona |
| **Customização** | ❌ Limitada | ✅ Tema customizado |
| **Offline** | ❌ Não funciona | ⚠️ Requer CDNs (biblioteca) |

---

## 🔍 Detalhes Técnicos

### Como Funciona

**1. Dashboard serve HTMLs locais:**
```
http://localhost:3103/viewers/swagger.html
http://localhost:3103/viewers/rapidoc.html
```

**2. HTMLs carregam bibliotecas via CDN:**
```html
<!-- Swagger UI -->
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>

<!-- RapiDoc -->
<script src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
```

**3. Specs são passadas via query parameter:**
```
?url=/specs/documentation-api.openapi.yaml
```

**4. JavaScript lê o parâmetro e carrega a spec:**
```javascript
const urlParams = new URLSearchParams(window.location.search);
const specUrl = urlParams.get('url');
```

**5. Sem problemas de CORS pois:**
- HTML está em `localhost:3103`
- Spec está em `localhost:3103`
- Mesma origem = sem CORS

### Swagger UI Initialization

```javascript
window.ui = SwaggerUIBundle({
  url: specUrl,
  dom_id: '#swagger-ui',
  deepLinking: true,
  presets: [
    SwaggerUIBundle.presets.apis,
    SwaggerUIStandalonePreset
  ],
  tryItOutEnabled: true,
  filter: true,
});
```

### RapiDoc Initialization

```javascript
const rapidoc = document.getElementById('thedoc');
rapidoc.setAttribute('spec-url', specUrl);
```

---

## 🚀 Próximas Melhorias

### Implementadas
- ✅ Visualizadores locais sem CORS
- ✅ Tema dark customizado
- ✅ Try it out functionality
- ✅ Query parameters para specs

### Futuras
- [ ] Cache de specs para offline
- [ ] Download de visualizadores para uso offline completo
- [ ] Temas customizáveis (light/dark toggle)
- [ ] Histórico de APIs visualizadas
- [ ] Favoritos de endpoints
- [ ] Compartilhamento de links diretos para endpoints

---

## 📚 Recursos

### Documentação Oficial
- **Swagger UI**: https://swagger.io/docs/open-source-tools/swagger-ui/
- **RapiDoc**: https://rapidocweb.com/
- **OpenAPI**: https://spec.openapis.org/

### CDNs Utilizados
- **Swagger UI**: https://unpkg.com/swagger-ui-dist@5
- **RapiDoc**: https://unpkg.com/rapidoc

### Arquivos do Projeto
- **Swagger Local**: [frontend/dashboard/public/viewers/swagger.html](public/viewers/swagger.html)
- **RapiDoc Local**: [frontend/dashboard/public/viewers/rapidoc.html](public/viewers/rapidoc.html)
- **API Viewer**: [src/components/pages/APIViewerPage.tsx](src/components/pages/APIViewerPage.tsx)

---

## ⚠️ Troubleshooting

### Swagger UI não carrega

**Sintoma:** Tela branca ou spinner infinito

**Soluções:**
1. Verificar console do browser para erros
2. Verificar se spec existe:
   ```bash
   curl http://localhost:3103/specs/documentation-api.openapi.yaml
   ```
3. Limpar cache (Ctrl+Shift+R)
4. Verificar URL está correta:
   ```
   /viewers/swagger.html?url=/specs/[api-id].openapi.yaml
   ```

### RapiDoc mostra erro de parsing

**Sintoma:** "Failed to parse spec"

**Soluções:**
1. Validar spec OpenAPI:
   ```bash
   npx @redocly/cli lint /path/to/spec.yaml
   ```
2. Verificar formato (deve ser YAML ou JSON válido)
3. Testar spec no Redoc (que tem melhor error handling)

### Try It Out não funciona

**Sintoma:** Botão "Execute" não responde

**Soluções:**
1. Verificar se API está rodando:
   ```bash
   curl http://localhost:3400/health  # Documentation API
   curl http://localhost:3200/health  # Workspace API
   ```
2. Verificar CORS na API (deve permitir localhost:3103)
3. Verificar console do browser para erros de rede

---

## ✅ Status Final

| Componente | Status | Notas |
|------------|--------|-------|
| **Swagger UI** | ✅ Funcionando | Via `/viewers/swagger.html` |
| **RapiDoc** | ✅ Funcionando | Via `/viewers/rapidoc.html` |
| **Redoc** | ✅ Funcionando | Via docs Redocusaurus |
| **Raw Spec** | ✅ Funcionando | Download direto |
| **CORS Issues** | ✅ Resolvidos | Visualizadores locais |
| **Try It Out** | ✅ Funcional | Swagger e RapiDoc |

---

**Data da Correção:** 2025-10-25
**Versão:** 1.0.0
**Status:** ✅ Correção Completa
