---
title: "pgAdmin Upgrade: 8.11 → 9.0"
tags: [upgrade, pgadmin, database, docker]
domain: operations
type: changelog
summary: Upgrade do pgAdmin de versão 8.11 para 9.0 com script automatizado
status: completed
last_review: 2025-10-19
sidebar_position: 1
---

# pgAdmin Upgrade: 8.11 → 9.0

**Data:** 2025-10-19  
**Tipo:** Upgrade de versão  
**Impacto:** Baixo (retrocompatível)

## 📋 Resumo

Upgrade do pgAdmin de **versão 8.11 → 9.0** no container `data-timescaledb-pgadmin`.

## 🎯 Mudanças Aplicadas

### 1. Arquivo Atualizado

**[infrastructure/compose/docker-compose.timescale.yml](../../infrastructure/compose/docker-compose.timescale.yml)**

```diff
  timescaledb-pgadmin:
    container_name: data-timescaledb-pgadmin
-   image: "img-data-timescaledb-pgadmin:${IMG_VERSION:-2025.10.19}"  # pgAdmin 8.11
+   image: "img-data-timescaledb-pgadmin:${IMG_VERSION:-2025.10.19}"  # pgAdmin 9.0
+   platform: linux/amd64
    restart: unless-stopped
```

**[scripts/docker/build-images.sh](../../scripts/docker/build-images.sh)**

```diff
  base_images=(
-   "data-timescaledb-pgadmin=dpage/pgadmin4:8.11"
+   "data-timescaledb-pgadmin=dpage/pgadmin4:9.0"
  )
```

### 2. Script de Upgrade Criado

**[scripts/docker/upgrade-pgadmin.sh](../../scripts/docker/upgrade-pgadmin.sh)**

Script automatizado que:
- ✅ Cria backup automático das configurações
- ✅ Para e remove container antigo
- ✅ Baixa e aplica nova imagem
- ✅ Recria container com versão 9.0
- ✅ Valida saúde do serviço
- ✅ Fornece instruções de rollback

## 🆕 Novidades do pgAdmin 9.0

### Features Principais

1. **Novo Layout "Workspace"**
   - Além do layout "Classic", agora há o layout "Workspace"
   - Ambiente dedicado para Query Tool, PSQL e Schema Diff
   - Interface mais limpa e focada

2. **Suporte PostgreSQL 17**
   - Adiciona suporte ao privilege `MAINTAIN` (PostgreSQL 17+)

3. **Melhorias OAuth2**
   - Suporte para resposta de profile array no OAuth2
   - Correção para GitHub Private Email ID

4. **Remoção de Sufixo 'vX'**
   - Aplicação agora se chama simplesmente "pgAdmin 4"
   - Facilita upgrades entre major versions

### ⚠️ Breaking Changes

- **PostgreSQL 9.6 e anteriores não são mais suportados**
  - Nosso projeto usa PostgreSQL 15/16 ✅ (não afetado)

## 🚀 Como Executar o Upgrade

### Método 1: Script Automatizado (Recomendado)

```bash
# Tornar executável
chmod +x /home/marce/projetos/TradingSystem/scripts/docker/upgrade-pgadmin.sh

# Executar upgrade
bash scripts/docker/upgrade-pgadmin.sh
```

**O script faz automaticamente:**
1. ✅ Verifica versão atual do container
2. ✅ Cria backup automático em `backups/pgadmin-upgrade-YYYYMMDD-HHMMSS/`
3. ✅ Para e remove container antigo
4. ✅ Baixa imagem `dpage/pgadmin4:9.0` (platform: linux/amd64)
5. ✅ Retaggeia para `img-data-timescaledb-pgadmin:${IMG_VERSION}` (padrão do projeto)
6. ✅ Verifica se `build-images.sh` está atualizado
7. ✅ Recria container com nova versão
8. ✅ Valida saúde e testa acesso HTTP
9. ✅ Exibe informações de acesso e próximos passos

**Saída esperada:**
```
╔════════════════════════════════════════════════════════════════════╗
║           pgAdmin Upgrade: 8.11 → 9.0                              ║
║           Following TradingSystem Container Standards              ║
╚════════════════════════════════════════════════════════════════════╝

[INFO] IMG_VERSION: 2025.10.19
[INFO] PLATFORM: linux/amd64
...
[INFO] ✅ Upgrade bem-sucedido!
```

### Método 2: Usando build-images.sh (Seguindo Padrão do Projeto)

```bash
cd /home/marce/projetos/TradingSystem

# 1. Rebuild todas as imagens (inclui pgAdmin 9.0)
export IMG_VERSION="2025.10.19"
bash scripts/docker/build-images.sh

# 2. Recriar apenas o pgAdmin
cd infrastructure/compose
docker compose -f docker-compose.timescale.yml up -d --force-recreate timescaledb-pgadmin

# 3. Verificar
docker logs data-timescaledb-pgadmin --tail 30
```

### Método 3: Manual (Avançado)

```bash
cd /home/marce/projetos/TradingSystem

# 1. Parar e remover container
cd infrastructure/compose
docker compose -f docker-compose.timescale.yml stop timescaledb-pgadmin
docker compose -f docker-compose.timescale.yml rm -f timescaledb-pgadmin

# 2. Baixar e retaguear (seguindo padrão do projeto)
export IMG_VERSION="2025.10.19"
docker pull --platform linux/amd64 dpage/pgadmin4:9.0
docker tag dpage/pgadmin4:9.0 img-data-timescaledb-pgadmin:${IMG_VERSION}

# 3. Recriar container
docker compose -f docker-compose.timescale.yml up -d timescaledb-pgadmin

# 4. Verificar logs e status
docker logs data-timescaledb-pgadmin --tail 50
docker ps --filter name=data-timescaledb-pgadmin

# 5. Testar acesso
curl -I http://localhost:5050/login
```

## 🔍 Verificação Pós-Upgrade

### 1. Status do Container

```bash
docker ps --filter name=data-timescaledb-pgadmin
```

**Esperado:**
```
NAMES                        STATUS          PORTS
data-timescaledb-pgadmin     Up X minutes    127.0.0.1:5050->5050/tcp
```

### 2. Acesso Web

- **URL:** http://localhost:5050
- **Email:** (ver `.env` - `PGADMIN_DEFAULT_EMAIL`)
- **Senha:** (ver `.env` - `PGADMIN_DEFAULT_PASSWORD`)

### 3. Versão

Acesse pgAdmin → Help → About pgAdmin 4

**Esperado:** `Version 9.0`

## 📦 Backup e Rollback

### Localização do Backup

O script cria backup automático em:
```
backups/pgadmin-upgrade-YYYYMMDD-HHMMSS/
├── pgadmin-data.tar.gz    # Volume completo do pgAdmin
└── servers.json           # Configuração de servidores (se existir)
```

### Rollback (se necessário)

#### Opção 1: Usando build-images.sh com versão antiga

```bash
# 1. Editar build-images.sh
sed -i 's/pgadmin4:9.0/pgadmin4:8.11/' scripts/docker/build-images.sh

# 2. Rebuild imagem
export IMG_VERSION="2025.10.19"
bash scripts/docker/build-images.sh

# 3. Parar e remover container
cd infrastructure/compose
docker compose -f docker-compose.timescale.yml stop timescaledb-pgadmin
docker compose -f docker-compose.timescale.yml rm -f timescaledb-pgadmin

# 4. Remover volume (se quiser restaurar do backup)
docker volume rm timescaledb-pgadmin

# 5. Restaurar backup (opcional)
BACKUP_DIR="backups/pgadmin-upgrade-YYYYMMDD-HHMMSS"
docker volume create timescaledb-pgadmin
docker run --rm \
  -v timescaledb-pgadmin:/target \
  -v "${PWD}/${BACKUP_DIR}:/backup" \
  alpine sh -c "cd /target && tar xzf /backup/pgadmin-data.tar.gz"

# 6. Recriar container com versão antiga
docker compose -f docker-compose.timescale.yml up -d timescaledb-pgadmin
```

#### Opção 2: Rollback manual rápido

```bash
# 1. Parar container
docker compose -f infrastructure/compose/docker-compose.timescale.yml stop timescaledb-pgadmin

# 2. Retaguear imagem antiga
docker pull --platform linux/amd64 dpage/pgadmin4:8.11
docker tag dpage/pgadmin4:8.11 img-data-timescaledb-pgadmin:2025.10.19

# 3. Recriar container
docker compose -f infrastructure/compose/docker-compose.timescale.yml up -d --force-recreate timescaledb-pgadmin
```

## 🔗 Variáveis de Ambiente

**Nenhuma mudança necessária!** As variáveis de ambiente são 100% retrocompatíveis.

**Arquivo:** `.env` (raiz do projeto)

```bash
# Variáveis do pgAdmin (já existentes)
PGADMIN_DEFAULT_EMAIL=marcelo.terra@gmail.com
PGADMIN_DEFAULT_PASSWORD=postgress
PGADMIN_LISTEN_PORT=5050
PGADMIN_HOST_PORT=5050
PGADMIN_CONFIG_X_FRAME_OPTIONS=""
PGADMIN_CONFIG_CONTENT_SECURITY_POLICY="default-src ws: http: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'self' http://localhost:3103 http://127.0.0.1:3103;"

# Variável de versionamento (opcional - tem default)
IMG_VERSION=2025.10.19  # Usado por todos os containers do projeto
```

**Notas:**
- `IMG_VERSION` é global para todos os containers do projeto
- Se não definida, usa default `2025.10.19` do compose file
- Seguindo padrão documentado em [container-naming.md](../context/ops/infrastructure/container-naming.md)

## 📚 Referências

### Documentação do pgAdmin
- **Release Notes 9.0:** https://www.pgadmin.org/docs/pgadmin4/latest/release_notes_9_0.html
- **Container Deployment:** https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html
- **GitHub Releases:** https://github.com/pgadmin-org/pgadmin4/releases
- **Docker Hub:** https://hub.docker.com/r/dpage/pgadmin4

### Documentação do TradingSystem
- **Container Naming Convention:** [container-naming.md](../context/ops/infrastructure/container-naming.md)
- **Build Images Script:** [build-images.sh](../../scripts/docker/build-images.sh)
- **Environment Configuration:** [ENVIRONMENT-CONFIGURATION.md](../context/ops/ENVIRONMENT-CONFIGURATION.md)
- **Service Port Map:** [service-port-map.md](../context/ops/service-port-map.md)

## ✅ Checklist de Verificação

Após o upgrade, verifique:

- [ ] Container iniciou sem erros (`docker logs data-timescaledb-pgadmin`)
- [ ] Interface web acessível em http://localhost:5050
- [ ] Login funciona com credenciais do `.env`
- [ ] Conexões existentes com TimescaleDB funcionam
- [ ] Query Tool funciona corretamente
- [ ] Novo layout "Workspace" disponível (Settings → Preferences → Miscellaneous)

## 🎯 Próximos Passos

1. **Testar novo layout Workspace**
   - Settings → Preferences → Miscellaneous → Layout
   - Experimentar "Workspace Layout" vs "Classic Layout"

2. **Reconfigurar servidores (se necessário)**
   - Add New Server
   - Host: `timescaledb` (nome do container Docker)
   - Port: `5432`
   - Database: `tradingsystem`
   - Username/Password: Ver `.env`

3. **Explorar novos features**
   - OAuth2 melhorado
   - Novos shortcuts do Query Tool
   - Performance improvements

## 📝 Notas Adicionais

- **Compatibilidade:** PostgreSQL 10+ (nosso projeto usa 15/16 ✅)
- **Volume persistente:** `timescaledb-pgadmin` preservado durante upgrade
- **Downtime:** ~15-30 segundos durante recriação do container
- **Impact:** Baixo - apenas interface de administração afetada

---

**Status:** ✅ Documentação completa  
**Responsável:** Claude Code  
**Data de conclusão:** 2025-10-19
