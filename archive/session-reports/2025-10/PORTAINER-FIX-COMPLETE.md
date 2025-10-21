# 🔧 Portainer - Guia de Correção Completo

## 📋 Problema Identificado

**Status Atual:**
- ❌ Usuário `marce` **NÃO** está no grupo `docker`
- ❌ Sem permissão para acessar Docker daemon socket
- ✅ Docker instalado: `/usr/bin/docker`
- ✅ Documentação existente: completa e bem estruturada

**Erro Atual:**
```
permission denied while trying to connect to the Docker daemon socket
```

---

## ✅ Solução Completa (10 Passos)

### 🔐 Etapa 1: Corrigir Permissões Docker

```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Criar grupo docker (se não existir)
sudo groupadd docker 2>/dev/null || true

# Ajustar permissões do socket
sudo chmod 666 /var/run/docker.sock
```

---

### 🚀 Etapa 2: Iniciar Docker Daemon

```bash
# Iniciar serviço
sudo systemctl start docker

# Habilitar início automático
sudo systemctl enable docker

# Verificar status
sudo systemctl status docker
```

**Saída esperada:** `Active: active (running)`

---

### 🔄 Etapa 3: Aplicar Permissões

**Opção A - Recarregar grupo (mais rápido):**
```bash
newgrp docker
```

**Opção B - Logout/Login (mais confiável - RECOMENDADO):**
```bash
exit
# Faça login novamente no terminal WSL
```

---

### ✔️ Etapa 4: Verificar Permissões

```bash
# Verificar grupos do usuário (deve incluir 'docker')
groups

# Testar acesso ao Docker (não deve dar erro)
docker version

# Listar containers (deve funcionar)
docker ps
```

**Saída esperada em `groups`:**
```
marce : marce adm cdrom sudo dip plugdev users docker
```

---

### 📦 Etapa 5: Criar Volume do Portainer

```bash
# Criar volume persistente
docker volume create portainer_data

# Verificar criação
docker volume ls | grep portainer
```

---

### 🧹 Etapa 6: Limpar Instalações Antigas

```bash
# Parar container antigo (se existir)
docker stop portainer 2>/dev/null || true

# Remover container antigo
docker rm portainer 2>/dev/null || true

# Verificar limpeza
docker ps -a | grep portainer
```

**Resultado esperado:** Nenhuma saída (container removido)

---

### 🐳 Etapa 7: Instalar Portainer CE

```bash
docker run -d \
  --name portainer \
  --restart unless-stopped \
  -p 9000:9000 \
  -p 9443:9443 \
  -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

**Explicação dos parâmetros:**
- `-d` → Executa em background (daemon)
- `--name portainer` → Nome do container
- `--restart unless-stopped` → Reinicia automaticamente
- `-p 9000:9000` → Porta HTTP da interface web
- `-p 9443:9443` → Porta HTTPS (certificado auto-assinado)
- `-p 8000:8000` → Porta para Edge Agent
- `-v /var/run/docker.sock` → Acesso ao Docker daemon
- `-v portainer_data:/data` → Dados persistentes

---

### 🔍 Etapa 8: Verificar Instalação

```bash
# Ver container rodando
docker ps | grep portainer

# Ver logs do Portainer
docker logs portainer

# Verificar portas abertas
sudo netstat -tlnp | grep -E '9000|9443|8000'
```

**Saída esperada em `docker ps`:**
```
CONTAINER ID   IMAGE                          STATUS          PORTS
abc123def456   portainer/portainer-ce:latest  Up 2 minutes    0.0.0.0:9000->9000/tcp, ...
```

---

### 🌐 Etapa 9: Acessar Portainer Web UI

**URL de acesso:**
- **HTTP:** [http://localhost:9000](http://localhost:9000)
- **HTTPS:** [https://localhost:9443](https://localhost:9443)

**Se estiver em WSL2:**
- **Encontre o IP do WSL:**
  ```bash
  hostname -I | awk '{print $1}'
  ```
- **Acesse via:** `http://<IP_WSL>:9000`

---

### ⚙️ Etapa 10: Configuração Inicial do Portainer

#### 1️⃣ Criar Usuário Admin (Primeira Vez)

1. Acesse `http://localhost:9000`
2. **Criar admin:**
   - Username: `admin` (ou seu preferido)
   - Password: **Mínimo 12 caracteres** (use senha forte!)
   - Confirme a senha
3. Clique em **"Create user"**

⏰ **IMPORTANTE:** Você tem **5 minutos** após iniciar o Portainer para criar o admin. Depois disso, precisa reiniciar o container.

#### 2️⃣ Conectar ao Docker Local

1. Clique em **"Get Started"**
2. Ou selecione **"Docker"** → **"Connect"**
3. Portainer detectará automaticamente o Docker local via `/var/run/docker.sock`

#### 3️⃣ Explorar a Interface

**Menu principal:**
- **Dashboard** → Visão geral dos recursos
- **Containers** → Gerenciar containers
- **Images** → Gerenciar imagens
- **Volumes** → Gerenciar volumes
- **Networks** → Gerenciar redes
- **Stacks** → Gerenciar stacks (Docker Compose)

---

## 🎯 Usando Portainer com TradingSystem

### Ver Containers do TradingSystem

Após iniciar os serviços com `docker compose`, você verá:

| Container | Porta(s) | Status | Função |
|-----------|----------|--------|--------|
| `tradingsystem-frontend-1` | 3101 | 🟢 Running | Dashboard React |
| `tradingsystem-docs-1` | 3004 | 🟢 Running | Docusaurus |
| `tradingsystem-idea-bank-1` | 3100 | 🟢 Running | API Banco de Ideias |
| `tradingsystem-tp-capital-1` | 3200 | 🟢 Running | Telegram Signals |
| `tradingsystem-b3-data-1` | 3300 | 🟢 Running | B3 Market Data |
| `tradingsystem-questdb-1` | 9000, 9009 | 🟢 Running | Time-series DB |
| `tradingsystem-prometheus-1` | 9090 | 🟢 Running | Monitoring |
| `tradingsystem-grafana-1` | 3000 | 🟢 Running | Dashboards |

### Operações Comuns no Portainer

#### ▶️ Iniciar um Container
1. **Containers** → Marque o checkbox
2. Clique em **"Start"**
3. Aguarde status mudar para **"Running"**

#### ⏸️ Parar um Container
1. **Containers** → Marque o checkbox
2. Clique em **"Stop"**
3. Confirme

#### 🔄 Reiniciar um Container
1. **Containers** → Marque o checkbox
2. Clique em **"Restart"**

#### 📜 Ver Logs
1. Clique no **nome do container**
2. Scroll até seção **"Logs"**
3. Configure:
   - Últimas N linhas
   - Auto-refresh (tempo real)
   - Busca por texto

#### 💻 Acessar Console (Shell)
1. Clique no **nome do container**
2. Clique em **"Console"**
3. Selecione shell (`/bin/bash` ou `/bin/sh`)
4. Clique em **"Connect"**
5. Execute comandos diretamente no container

#### 📊 Ver Uso de Recursos
1. Clique no **nome do container**
2. Aba **"Stats"**
3. Veja gráficos em tempo real:
   - CPU Usage
   - Memory Usage
   - Network I/O
   - Block I/O

---

## 🚨 Troubleshooting

### ❌ Problema: "Permission denied" ao executar `docker ps`

**Causa:** Usuário não está no grupo `docker` ou permissões não foram aplicadas

**Solução:**
```bash
# Adicionar ao grupo
sudo usermod -aG docker $USER

# Opção 1: Aplicar imediatamente
newgrp docker

# Opção 2: Logout/Login (mais confiável)
exit
# Faça login novamente

# Verificar
groups | grep docker
```

---

### ❌ Problema: Porta 9000 já está em uso

**Causa:** QuestDB ou outro serviço usando a porta 9000

**Verificar o que está usando:**
```bash
sudo lsof -i :9000
```

**Solução A - Parar o serviço conflitante:**
```bash
# Se for QuestDB
docker stop questdb

# Depois instalar Portainer
docker run -d ... portainer/portainer-ce:latest
```

**Solução B - Usar porta diferente para Portainer:**
```bash
docker run -d \
  --name portainer \
  --restart unless-stopped \
  -p 9001:9000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# Acessar em: http://localhost:9001
```

---

### ❌ Problema: Docker não está rodando

**Causa:** Serviço Docker não foi iniciado

**Solução:**
```bash
# Iniciar Docker
sudo systemctl start docker

# Habilitar início automático
sudo systemctl enable docker

# Verificar status
sudo systemctl status docker
```

---

### ❌ Problema: Não consigo acessar localhost:9000

**Diagnóstico:**
```bash
# 1. Container está rodando?
docker ps | grep portainer

# 2. Porta está aberta?
curl http://localhost:9000

# 3. Logs do Portainer
docker logs portainer

# 4. Firewall bloqueando?
sudo ufw status
sudo ufw allow 9000/tcp
```

---

### ❌ Problema: Tempo esgotado para criar admin (5 minutos)

**Causa:** Demorou mais de 5 minutos após iniciar o Portainer

**Solução:**
```bash
# Reiniciar container
docker restart portainer

# Aguardar 10 segundos
sleep 10

# Acessar rapidamente: http://localhost:9000
# Criar admin em até 5 minutos
```

---

### ❌ Problema: Volume de dados corrompido

**Backup e reset:**
```bash
# 1. Backup do volume (se possível)
docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/portainer_backup.tar.gz /data

# 2. Parar e remover container
docker stop portainer
docker rm portainer

# 3. Remover volume corrompido
docker volume rm portainer_data

# 4. Reinstalar Portainer
docker volume create portainer_data
docker run -d ... portainer/portainer-ce:latest

# 5. Restaurar backup (opcional)
docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/portainer_backup.tar.gz -C /
```

---

## 🔐 Segurança e Melhores Práticas

### 1️⃣ Usar Senha Forte

- Mínimo 12 caracteres
- Incluir: maiúsculas, minúsculas, números, símbolos
- Não reutilizar senhas

### 2️⃣ Habilitar HTTPS

Por padrão, Portainer escuta em:
- HTTP: `http://localhost:9000` (não criptografado)
- HTTPS: `https://localhost:9443` (certificado auto-assinado)

**Para produção, use certificado válido:**
1. Settings → SSL Certificate
2. Upload `.crt` e `.key`
3. Reiniciar Portainer

### 3️⃣ Criar Usuários Separados

Não compartilhe a conta admin:
1. Users → Add user
2. Configure:
   - Username
   - Password
   - Role (Admin ou User)

### 4️⃣ Limitar Permissões

Use **RBAC (Role-Based Access Control)**:
- **Admin** → Acesso total
- **User** → Somente visualização/operações limitadas

### 5️⃣ Backup Regular

```bash
# Backup semanal do volume
docker run --rm \
  -v portainer_data:/data \
  -v /backups:/backup \
  alpine tar czf /backup/portainer_$(date +%Y%m%d).tar.gz /data
```

### 6️⃣ Monitorar Logs de Auditoria

1. Settings → Audit Logs
2. Revisar ações de usuários
3. Identificar atividades suspeitas

---

## 📚 Referências e Documentação

### Documentação Local (TradingSystem)

- **Guia de uso detalhado:** [../../guides/portainer/PORTAINER-GUIDE.md](../../guides/portainer/PORTAINER-GUIDE.md)
- **Setup rápido:** [PORTAINER-SETUP-COMPLETE.md](PORTAINER-SETUP-COMPLETE.md)
- **README técnico:** [infrastructure/portainer/README.md](infrastructure/portainer/README.md)
- **Script de instalação:** [infrastructure/scripts/setup-portainer.sh](infrastructure/scripts/setup-portainer.sh)

### Documentação Oficial

- **Docs:** https://docs.portainer.io
- **Quickstart:** https://docs.portainer.io/start/install/server/docker/linux
- **GitHub:** https://github.com/portainer/portainer
- **Community Forum:** https://community.portainer.io

---

## 🎯 Checklist Pós-Instalação

- [ ] Usuário adicionado ao grupo `docker`
- [ ] Permissões aplicadas (`newgrp docker` ou logout/login)
- [ ] Docker daemon rodando (`sudo systemctl status docker`)
- [ ] Volume `portainer_data` criado
- [ ] Container `portainer` rodando (`docker ps | grep portainer`)
- [ ] Interface web acessível em `http://localhost:9000`
- [ ] Usuário admin criado (em até 5 minutos)
- [ ] Docker local conectado ("Get Started")
- [ ] Testado: visualizar containers
- [ ] Testado: ver logs de um container
- [ ] Testado: acessar console de um container
- [ ] Testado: visualizar stats de recursos

---

## ✅ Status Final

**Problema identificado:** ✅ Permissões Docker
**Solução disponível:** ✅ Guia completo de 10 passos
**Documentação:** ✅ Atualizada e consolidada
**Script de instalação:** ✅ Disponível
**Próximo passo:** 🔄 Executar comandos com `sudo` manualmente

---

## 📞 Suporte

**Problemas com a instalação?**
1. Revise este guia completo
2. Confira [../../guides/portainer/PORTAINER-GUIDE.md](../../guides/portainer/PORTAINER-GUIDE.md)
3. Consulte logs: `docker logs portainer`
4. Verifique permissões: `groups | grep docker`

**Quer adicionar o Portainer ao startup do sistema?**
```bash
# Já está configurado com --restart unless-stopped
# Para confirmar:
docker inspect portainer | grep -i restart
```

---

**Última Atualização:** 2025-10-13
**Versão Portainer:** CE (Community Edition) Latest
**Ambiente:** WSL2 Ubuntu + Docker 28.2.2
**Autor:** Claude Code

---

**🎉 Boa sorte com a instalação do Portainer!**
