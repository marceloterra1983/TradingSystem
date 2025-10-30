# Troubleshooting - Instabilidade do Docusaurus

**Data**: 2025-10-29  
**Status**: ✅ **RESOLVIDO**

---

## 🔍 Problemas Identificados

### 1. Health Check do Service Launcher Falhando
**Sintoma**: Banner vermelho "1 serviço offline: Docusaurus"

**Causa Raiz**: 
- Service Launcher estava verificando `http://localhost:3400/`
- Esse endpoint retorna 301 (redirect) para `/next/`
- O fetch do Service Launcher não seguia redirects ou tratava como falha
- Circuit Breaker acionava após múltiplas falhas

**Solução**:
- ✅ Atualizado Service Launcher para usar `/health` em vez de `/`
- ✅ Endpoint `/health` retorna 200 OK diretamente, sem redirects

### 2. Configuração do NGINX
**Problema**: Autoindex habilitado, causando listagem de diretórios em vez de servir conteúdo

**Solução**:
- ✅ Desabilitado `autoindex off`
- ✅ Configurado redirect de `/` → `/next/`
- ✅ Endpoint `/health` retorna JSON válido

### 3. Frontend Iframe
**Problema**: Tentando acessar `/docs` sem o path correto

**Solução**:
- ✅ Atualizado para usar `/docs/next/` (via proxy Vite)
- ✅ Proxy encaminha para `http://localhost:3400/next/`

---

## 🛠️ Correções Aplicadas

### Arquivo: `apps/status/server.js`
```javascript
createServiceTarget({
  id: 'docusaurus',
  name: 'Docusaurus',
  description: 'Site oficial de documentação técnica',
  category: 'docs',
  defaultPort: 3400,
  portEnv: 'SERVICE_LAUNCHER_DOCUSAURUS_PORT',
  urlEnv: 'SERVICE_LAUNCHER_DOCUSAURUS_URL',
  path: '/health', // ✅ Alterado de '/' para '/health'
}),
```

### Arquivo: `tools/compose/documentation/nginx.conf`
- ✅ `autoindex off` (desabilitado)
- ✅ Endpoint `/health` retorna JSON válido
- ✅ Redirect `/` → `/next/` configurado

### Arquivo: `frontend/dashboard/src/components/pages/DocusaurusPage.tsx`
- ✅ Usa `/docs/next/` em vez de `/docs`
- ✅ URL completa: `http://localhost:3103/docs/next/`

---

## ✅ Verificação

### 1. Container NGINX
```bash
docker ps --filter name=documentation
# Deve mostrar: Up X minutes (healthy)
```

### 2. Health Endpoint
```bash
curl http://localhost:3400/health
# Deve retornar: {"status":"healthy","service":"documentation"}
```

### 3. Service Launcher
```bash
curl -s http://localhost:3500/api/status | jq '.services[] | select(.id=="docusaurus")'
# Deve mostrar: "status": "ok" ou "online"
```

### 4. Frontend (Iframe)
- Acesse: `http://localhost:3103/#/docs`
- Clique na aba "Docusaurus"
- O iframe deve carregar corretamente

---

## 🎯 Estratégia de Portas (Padronizada)

address>**Porta Única: 3400**

| Modo | Comando | URL | Health Check |
|------|---------|-----|--------------|
| **Container** | `docker compose up` | `http://localhost:3400` | `/health` |
| **Dev Local** | `npm run docs:dev` | `http://localhost:3400` | `/health` (se disponível) |
| **Frontend** | Via proxy Vite | `/docs/next/` → `3400/next/` | N/A |

---

## 📝 Arquivos Modificados

1. ✅ `apps/status/server.js` - Health check path atualizado
2. ✅ `tools/compose/documentation/nginx.conf` - Autoindex desabilitado
3. ✅ `frontend/dashboard/src/components/pages/DocusaurusPage.tsx` - URL do iframe corrigida

---

## 🚨 Possíveis Problemas Futuros

### Se o Service Launcher ainda mostrar offline:
1. Verifique se o container está rodando: `docker ps | grep documentation`
2. Verifique o health endpoint: `curl http://localhost:3400/health`
3. Reinicie o Service Launcher: `npm run dev` (no diretório `apps/status`)
4. Limpe o cache: Aguarde 15 segundos (cache TTL)

### Se o iframe não carregar:
1. Verifique se o proxy Vite está funcionando: `curl http://localhost:3103/docs/next/`
2. Verifique logs do console do navegador (F12)
3. Verifique se há erros de CORS (não deveria haver, usando proxy)

---

**Última Atualização**: 2025-10-29

