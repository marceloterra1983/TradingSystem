# 🚀 Quick Fix Guide - Startup Warnings

**Última atualização:** 2025-10-20

Este guia fornece comandos rápidos para eliminar todos os warnings e configurar as chaves faltantes.

---

## 🎯 Solução Rápida (Recomendada)

Execute o script master que automatiza todas as correções:

```bash
cd /home/marce/projetos/TradingSystem
bash scripts/maintenance/fix-all-startup-warnings.sh
```

Este script irá:
- ✅ Corrigir warnings de rede Docker
- ✅ Remover containers órfãos
- ✅ Gerar senhas seguras
- ✅ Adicionar placeholders para API keys
- ✅ Reiniciar todos os serviços
- ✅ Validar as correções

---

## 📋 Correções Individuais

Se preferir executar as correções individualmente:

### 1. Corrigir Warnings de Rede Docker

```bash
bash scripts/docker/fix-network-warnings.sh
```

**O que faz:**
- Adiciona `external: true` à rede `langgraph-dev`
- Elimina warning "network exists but was not created for project"

---

### 2. Limpar Containers Órfãos

```bash
bash scripts/docker/cleanup-orphan-containers.sh
```

**O que faz:**
- Remove container `data-frontend-apps` órfão
- Executa compose files com `--remove-orphans`
- Limpa volumes não utilizados (com confirmação)

---

### 3. Gerar Senhas Seguras

```bash
bash scripts/env/generate-secure-passwords.sh
```

**O que faz:**
- Gera senhas aleatórias de 24-32 caracteres
- Adiciona ao `.env`:
  - `TIMESCALE_POSTGRES_PASSWORD`
  - `APP_DOCUMENTATION_DB_PASSWORD`
  - `APP_WEBSCRAPER_DB_PASSWORD`
  - `GF_SECURITY_ADMIN_PASSWORD`
  - `REDIS_PASSWORD`
  - `FIRECRAWL_DB_PASSWORD`
  - `LANGGRAPH_POSTGRES_PASSWORD`
- Cria backup automático do `.env` anterior

---

### 4. Adicionar Placeholders de API Keys

```bash
bash scripts/env/add-api-keys-template.sh
```

**O que faz:**
- Adiciona ao `.env`:
  - `LANGSMITH_API_KEY="CHANGE_ME_GET_FROM_LANGSMITH"`
  - `OPENAI_API_KEY="CHANGE_ME_GET_FROM_OPENAI"`
  - `ANTHROPIC_API_KEY="CHANGE_ME_GET_FROM_ANTHROPIC"`
  - `FIRECRAWL_API_KEY="CHANGE_ME_GET_FROM_FIRECRAWL"`

**⚠️ AÇÃO MANUAL NECESSÁRIA:** Substitua todos os `CHANGE_ME_*` por chaves reais!

---

## 🔑 Obtendo API Keys

### LangSmith (Tracing & Observability)

1. Visite: https://smith.langchain.com/
2. Crie uma conta (se necessário)
3. Vá em Settings → API Keys
4. Clique em "Create API Key"
5. Copie a chave (formato: `lsv2_pt_...`)
6. Cole no `.env`:
```bash
LANGSMITH_API_KEY="lsv2_pt_sua_chave_aqui"
```

---

### OpenAI (LLM para workflows)

1. Visite: https://platform.openai.com/api-keys
2. Faça login
3. Clique em "Create new secret key"
4. Dê um nome (ex: "TradingSystem")
5. Copie a chave (formato: `sk-proj-...`)
6. Cole no `.env`:
```bash
OPENAI_API_KEY="sk-proj-sua_chave_aqui"
```

**⚠️ Custos:** OpenAI cobra por uso. Configure billing limits!

---

### Anthropic Claude (Opcional)

1. Visite: https://console.anthropic.com/account/keys
2. Faça login
3. Clique em "Create Key"
4. Copie a chave (formato: `sk-ant-...`)
5. Cole no `.env`:
```bash
ANTHROPIC_API_KEY="sk-ant-sua_chave_aqui"
```

---

### Firecrawl (Web Scraping)

1. Visite: https://www.firecrawl.dev/app/api-keys
2. Crie uma conta (se necessário)
3. Vá em API Keys
4. Clique em "Create API Key"
5. Copie a chave (formato: `fc-...`)
6. Cole no `.env`:
```bash
FIRECRAWL_API_KEY="fc-sua_chave_aqui"
```

---

## ✅ Validação Pós-Correção

Após executar as correções, valide:

### 1. Verificar Warnings Docker

```bash
# Deve retornar SEM warnings
docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml config 2>&1 | grep -i warn
```

**Resultado esperado:** Nenhuma linha retornada

---

### 2. Verificar Containers Órfãos

```bash
docker ps -a | grep frontend-apps
```

**Resultado esperado:** Nenhum container `data-frontend-apps`

---

### 3. Verificar Senhas no .env

```bash
grep -E "PASSWORD=" .env | grep -v "CHANGE_ME"
```

**Resultado esperado:** Todas as senhas com valores aleatórios longos

---

### 4. Verificar API Keys

```bash
grep -E "API_KEY=" .env
```

**Resultado esperado:** Todas as chaves configuradas (sem `CHANGE_ME`)

---

### 5. Testar Startup Limpo

```bash
stop  # Para todos os serviços
start # Inicia todos os serviços
```

**Resultado esperado:** 
- Zero warnings Docker
- Todos os 33 serviços iniciados
- Health check 100% OK

---

### 6. Verificar Health Geral

```bash
curl -s http://localhost:3500/api/health/full | jq '.overallHealth'
```

**Resultado esperado:** `"healthy"`

---

## 🔒 Segurança das Senhas

### Backup das Senhas

As senhas foram salvas em:
```bash
ls -lh .env.backup-*
```

**⚠️ IMPORTANTE:** Armazene estas senhas em um gerenciador seguro!

### Rotação de Senhas (Recomendado a cada 90 dias)

```bash
# Gere novas senhas
bash scripts/env/generate-secure-passwords.sh

# Reinicie serviços com novas senhas
stop && start
```

---

## 📊 Métricas de Sucesso

Após correções completas:

| Métrica | Antes | Depois | Status |
|---------|-------|--------|--------|
| Warnings Docker | 3 | 0 | ✅ |
| Containers órfãos | 1 | 0 | ✅ |
| Senhas default | 7 | 0 | ✅ |
| API keys faltando | 4 | 0 | ✅ |
| Services healthy | ~90% | 100% | ✅ |
| Tempo de startup | ~52s | ~52s | ✅ |

---

## 🐛 Troubleshooting

### Problema: Script não tem permissão de execução

```bash
chmod +x scripts/maintenance/fix-all-startup-warnings.sh
chmod +x scripts/docker/*.sh
chmod +x scripts/env/*.sh
```

---

### Problema: Serviços não reiniciam após correções

```bash
# Para todos manualmente
docker compose -f infrastructure/compose/docker-compose.*.yml down
pkill -f "vite"
pkill -f "node.*3[0-9]{3}"

# Aguarde 5 segundos
sleep 5

# Reinicie
start
```

---

### Problema: API Keys não funcionam

Verifique se as chaves foram coladas corretamente (sem espaços extras):

```bash
# Deve mostrar chaves SEM espaços ou quebras de linha
grep "API_KEY=" .env | cat -A
```

---

### Problema: LangGraph ainda mostra warnings

```bash
# Verifique se external: true foi adicionado
grep -A 2 "name: tradingsystem_langgraph_dev" infrastructure/compose/docker-compose.langgraph-dev.yml

# Deve mostrar:
#     name: tradingsystem_langgraph_dev
#     external: true
```

---

## 📚 Documentação Completa

Para análise detalhada e explicação de cada warning:

```bash
cat STARTUP-WARNINGS-AND-MISSING-KEYS-AUDIT.md
```

---

## 🎉 Checklist Final

Marque quando completar cada item:

- [ ] Executado script master de correção
- [ ] Containers órfãos removidos
- [ ] Warnings Docker eliminados
- [ ] Senhas seguras geradas
- [ ] API keys obtidas e configuradas
- [ ] `.env` backup armazenado com segurança
- [ ] Serviços reiniciados sem warnings
- [ ] Health check retorna 100% healthy
- [ ] LangSmith tracing testado e funcionando
- [ ] Grafana acessível com nova senha
- [ ] Documentação atualizada (este guia marcado como concluído)

---

## 💡 Dicas Finais

1. **Nunca comitar `.env`** - Está no `.gitignore`, mantenha assim!
2. **Armazene senhas com segurança** - Use 1Password, Bitwarden, etc.
3. **Monitore custos de API** - Configure alertas nas plataformas (OpenAI, etc.)
4. **Revise logs após correções** - Garanta que tudo iniciou corretamente
5. **Documente mudanças** - Atualize este arquivo se fizer alterações

---

**Última execução bem-sucedida:** _Aguardando primeira execução_
**Tempo total de correção:** ~10-15 minutos (incluindo obtenção de API keys)
