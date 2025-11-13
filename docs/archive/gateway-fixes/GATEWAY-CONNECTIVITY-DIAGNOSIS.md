# 🔍 Gateway Connectivity Diagnosis

**Date:** 2025-11-12
**Status:** ❌ CRITICAL - Gateway não acessível apesar de estar rodando

---

## ✅ O QUE FUNCIONA

### 1. Middlewares Traefik
- ✅ Arquivo `middlewares.yml` criado dentro do container
- ✅ Traefik carregou todos os middlewares com sucesso:
  - `static-standard@file`
  - `admin-standard@file`
  - `compress@file`
  - `cors-dev@file`
  - `security-headers@file`
- ✅ 8 routers configurados
- ✅ 9 serviços configurados

### 2. Container do Gateway
- ✅ Container `api-gateway` rodando e saudável
- ✅ Traefik respondendo internamente:
  - Port 8080: ✅ API funcional
  - Port 9080: ✅ API funcional
- ✅ Portas mapeadas corretamente:
  - `9080/tcp -> 0.0.0.0:9080`
  - `9080/tcp -> 0.0.0.0:9081`

### 3. Redes Docker
- ✅ Gateway conectado a 3 redes:
  - `tradingsystem_backend` (172.20.0.3)
  - `tradingsystem_frontend` (172.21.0.3)
  - `tp_capital_backend` (192.168.160.2)

---

## ❌ O QUE NÃO FUNCIONA

### 1. Acesso via localhost (Host → Container)
```bash
curl http://localhost:9080/
# Result: Connection refused (7)
```

**Diagnóstico:**
- Porta 9080 mapeada mas não acessível do host
- Possível problema de Docker-in-Docker (DinD) no devcontainer
- Portas podem estar vinculadas apenas no daemon Docker interno

### 2. Comunicação Inter-Container (Container → Container)
```bash
# De dashboard-ui para api-gateway
docker exec dashboard-ui wget -qO- http://api-gateway:9080/api/overview
# Result: Operation timed out

# De api-gateway para dashboard-ui
docker exec api-gateway wget -qO- http://172.20.0.12:3103/health
# Result: Operation timed out
```

**Diagnóstico:**
- Containers na MESMA rede (`tradingsystem_backend`) não conseguem se comunicar
- Firewall ou política de rede bloqueando tráfego inter-container
- Possível problema de isolamento de rede do Docker

### 3. Health Checks Falhando
```
WRN Health check failed: Get "http://172.20.0.12:3103/health": context deadline exceeded
WRN Health check failed: Get "http://172.21.0.5:80/health": context deadline exceeded
```

**Impacto:**
- Traefik marca `dashboard-ui` e `docs-hub` como DOWN
- Mesmo que o gateway estivesse acessível, requests falhariam (503 Service Unavailable)

---

## 🔬 CAUSA RAIZ IDENTIFICADA

### Docker-in-Docker Network Isolation

O sistema está rodando em um **devcontainer com Docker-in-Docker**:

1. **Host** → WSL2 Linux
2. **Devcontainer** → VSCode container (isolado)
3. **Docker Daemon** → Rodando DENTRO do devcontainer
4. **Application Containers** → Rodando no daemon interno

**Problema:**
- Portas mapeadas no daemon interno do Docker (9080, 9081) não são automaticamente encaminhadas para o devcontainer ou host
- Containers no daemon interno têm isolamento de rede que impede comunicação inter-container
- Volume mounts não funcionam (vimos isso com `/etc/traefik/dynamic/`)

**Evidências:**
- Volume mount `/workspace/tools/traefik/dynamic` → `/etc/traefik/dynamic` estava vazio
- Solução: Criar arquivos diretamente dentro do container com `docker exec`
- Port forwarding `9080:9080` configurado mas conexões são recusadas
- Containers na mesma rede Docker timeout ao tentar se comunicar

---

## 💡 SOLUÇÕES PROPOSTAS

### Opção A: Configurar Port Forwarding no Devcontainer (Recomendado)

**Ação:** Adicionar configuração de port forwarding em `.devcontainer/devcontainer.json`

```json
{
  "forwardPorts": [9080, 9081, 8090],
  "portsAttributes": {
    "9080": {
      "label": "API Gateway",
      "onAutoForward": "notify"
    },
    "9081": {
      "label": "Traefik Dashboard",
      "onAutoForward": "notify"
    },
    "8090": {
      "label": "Dashboard UI",
      "onAutoForward": "notify"
    }
  }
}
```

**Resultado Esperado:**
- VSCode encaminhará portas do daemon Docker interno para o host
- Gateway acessível em `http://localhost:9080`

---

### Opção B: Reiniciar Docker Daemon (Quick Fix Temporário)

**Ação:** Executar o script de correção de conflitos

```bash
sudo bash .devcontainer/scripts/fix-docker-port-conflict.sh
```

**Resultado Esperado:**
- Limpa regras iptables que podem estar bloqueando tráfego
- Pode resolver isolamento de rede entre containers

**Limitação:**
- Solução temporária, pode não resolver port forwarding host → container

---

### Opção C: Expor Portas Diretamente no Host (Alternativa)

**Ação:** Adicionar publicação de portas no `docker-compose.0-gateway-stack.yml` com bind no IP do devcontainer

```yaml
ports:
  - "0.0.0.0:9080:9080"   # Bind em todas as interfaces
  - "0.0.0.0:9081:9080"
```

**Resultado Esperado:**
- Garante que portas sejam expostas em todas as interfaces de rede
- Pode melhorar acessibilidade

---

### Opção D: Rede Host Mode (Última Opção)

**Ação:** Mudar gateway para usar `network_mode: host`

```yaml
services:
  traefik:
    network_mode: host
    # Remove 'networks' e 'ports' quando usar host mode
```

**Resultado Esperado:**
- Gateway usa rede do host diretamente
- Sem isolamento de rede

**Desvantagens:**
- Perde isolamento de segurança
- Não funciona em Windows/Mac Docker Desktop
- Conflitos de porta mais prováveis

---

## 🎯 RECOMENDAÇÃO

**Executar nesta ordem:**

1. **[URGENTE]** Adicionar port forwarding em `.devcontainer/devcontainer.json` (Opção A)
2. **[TESTE]** Rebuild devcontainer para aplicar configuração
3. **[SE FALHAR]** Tentar reiniciar Docker daemon (Opção B)
4. **[SE FALHAR]** Investigar políticas de rede Docker ou configurar network mode (Opção D)

---

## 📋 CHECKLIST DE PRÓXIMOS PASSOS

- [ ] 1. Adicionar `forwardPorts` em `.devcontainer/devcontainer.json`
- [ ] 2. Rebuild devcontainer
- [ ] 3. Testar acesso: `curl http://localhost:9080/`
- [ ] 4. Se funcionar, testar rotas do gateway:
  - [ ] Dashboard: `http://localhost:9080/`
  - [ ] Traefik Dashboard: `http://localhost:9081/dashboard/`
  - [ ] Docs: `http://localhost:9080/docs/`
  - [ ] Workspace API: `http://localhost:9080/api/workspace/health`
- [ ] 5. Se NÃO funcionar:
  - [ ] Executar `sudo bash .devcontainer/scripts/fix-docker-port-conflict.sh`
  - [ ] Reiniciar containers: `docker compose -f tools/compose/docker-compose.0-gateway-stack.yml restart`
  - [ ] Testar novamente
- [ ] 6. Documentar solução final em `STARTUP-FINAL-STATUS.md`

---

## 📚 REFERÊNCIAS

- **Status Anterior:** `STARTUP-FINAL-STATUS.md`
- **Compose File:** `tools/compose/docker-compose.0-gateway-stack.yml`
- **Devcontainer Config:** `.devcontainer/devcontainer.json`
- **Network Fix Script:** `.devcontainer/scripts/fix-docker-port-conflict.sh`

---

**Última Atualização:** 2025-11-12 15:15 BRT
