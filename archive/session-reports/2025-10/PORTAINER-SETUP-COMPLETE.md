# ✅ Portainer - Setup Completo

## 🚀 Instalação em 3 Passos

### Passo 1: Execute o Script de Instalação

```bash
cd /home/marce/projetos/TradingSystem
bash infrastructure/scripts/setup-portainer.sh
```

**O que o script faz:**
- ✅ Adiciona usuário ao grupo docker
- ✅ Inicia serviço Docker
- ✅ Cria volume persistente `portainer_data`
- ✅ Remove containers antigos
- ✅ Instala Portainer CE (latest)

---

### Passo 2: Aplicar Permissões Docker

Após executar o script, aplique as permissões:

```bash
# Opção A: Aplicar imediatamente (mais rápido)
newgrp docker

# Opção B: Reiniciar sessão (mais confiável)
exit
# Faça login novamente no terminal
```

---

### Passo 3: Acessar Portainer

Abra seu navegador em:

🌐 **http://localhost:9000**

### Primeira Configuração

1. **Criar Usuário Admin**:
   - Username: `admin` (ou seu preferido)
   - Password: Mínimo 12 caracteres
   - Confirmar password
   - Clique em **"Create user"**

2. **Conectar ao Docker**:
   - Clique em **"Get Started"**
   - Portainer detectará o Docker local automaticamente

3. **Pronto!** 🎉
   - Agora você pode gerenciar todos os containers do TradingSystem

---

## 🐳 Containers do TradingSystem no Portainer

Após configurar, você verá todos estes serviços:

| Container | Porta | Status | Função |
|-----------|-------|--------|--------|
| **Frontend Dashboard** | 3101 | 🔄 | React UI |
| **Documentation Hub** | 3004 | 🔄 | Docusaurus |
| **Idea Bank API** | 3100 | 🔄 | Banco de Ideias |
| **TP Capital Signals** | 3200 | 🔄 | Telegram Signals |
| **B3 Market Data** | 3300 | 🔄 | Dados B3 |
| **Documentation API** | 3400 | 🔄 | API de Docs |
| **Service Launcher** | 3500 | 🔄 | Orquestração |
| **QuestDB** | 9000, 9009 | 🔄 | Time-series DB |
| **Prometheus** | 9090 | 🔄 | Métricas |
| **Grafana** | 3000 | 🔄 | Dashboards |
| **Portainer** | 9000, 9443 | ✅ | Gerenciamento |

---

## 📋 Operações Comuns no Portainer

### Ver Logs de um Container
1. Menu **Containers**
2. Clique no **nome** do container
3. Scroll até **Logs**
4. Configure auto-refresh para tempo real

### Iniciar/Parar Containers
1. Menu **Containers**
2. Marque checkbox do container
3. Clique em **Start** ou **Stop**

### Acessar Console do Container
1. Clique no **nome** do container
2. Botão **Console**
3. Selecione `/bin/bash` ou `/bin/sh`
4. **Connect**

### Ver Uso de Recursos
1. Clique no **nome** do container
2. Aba **Stats**
3. Veja CPU, Memory, Network, Disk I/O em tempo real

---

## 🛠️ Comandos Úteis

### Verificar se Portainer está rodando
```bash
docker ps | grep portainer
```

**Saída esperada:**
```
CONTAINER ID   IMAGE                          STATUS          PORTS
abc123def456   portainer/portainer-ce:latest  Up 10 minutes   0.0.0.0:9000->9000/tcp
```

### Ver logs do Portainer
```bash
docker logs portainer
```

### Reiniciar Portainer
```bash
docker restart portainer
```

### Status do Docker
```bash
sudo systemctl status docker
```

---

## 🚨 Troubleshooting

### ❌ Erro: "permission denied"

**Solução:**
```bash
# Execute o script de instalação
bash infrastructure/scripts/setup-portainer.sh

# Depois aplique permissões
newgrp docker

# Ou faça logout/login
```

### ❌ Porta 9000 já está em uso

**Verificar o que está usando:**
```bash
sudo lsof -i :9000
```

**Se for QuestDB ou outro serviço:**
```bash
# Parar o serviço conflitante
docker stop questdb

# Ou mudar porta do Portainer
docker run -d --name portainer -p 9001:9000 ...
```

### ❌ Docker não está rodando

**Solução:**
```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl status docker
```

### ❌ Não consigo acessar localhost:9000

**Verificar:**
```bash
# Container está rodando?
docker ps | grep portainer

# Porta está aberta?
curl http://localhost:9000

# Firewall bloqueando?
sudo ufw allow 9000/tcp
```

---

## 🔐 Segurança

### Mudar Senha Admin
1. Ícone do usuário → **My account**
2. **Change password**
3. Digite senha atual e nova
4. **Save**

### Habilitar HTTPS
Por padrão, Portainer já escuta em:
- HTTP: `http://localhost:9000`
- HTTPS: `https://localhost:9443` (auto-assinado)

---

## 📚 Documentação

- **README completo**: `infrastructure/portainer/README.md`
- **Guia oficial**: https://docs.portainer.io
- **Script de instalação**: `infrastructure/scripts/setup-portainer.sh`

---

## ✅ Checklist Pós-Instalação

- [ ] Script executado com sucesso
- [ ] Permissões Docker aplicadas (`newgrp docker`)
- [ ] Portainer acessível em http://localhost:9000
- [ ] Usuário admin criado
- [ ] Docker local conectado
- [ ] Containers do TradingSystem visíveis
- [ ] Testado iniciar/parar containers
- [ ] Testado visualizar logs
- [ ] Testado acessar console

---

**🎉 Parabéns! Portainer configurado com sucesso!**

Agora você pode gerenciar todos os containers do TradingSystem através de uma interface web intuitiva.

---

**Data**: 2025-10-13
**Versão**: Portainer CE Latest
**Ambiente**: WSL2 Ubuntu + Docker 28.2.2


