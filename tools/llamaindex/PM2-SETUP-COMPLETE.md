# ✅ PM2 Setup Complete - Manual Steps

## 🎉 Status Atual

✅ **PM2 instalado:** Versão 6.0.13
✅ **docs-watcher rodando:** Online, auto-restart configurado
✅ **Configuração salva:** `/home/marce/.pm2/dump.pm2`
✅ **Service file gerado:** `/tmp/pm2-marce.service`
✅ **PATH limpo:** 76 → 52 entradas (espaços removidos)

## 📊 Verificar Status Atual

```bash
# Ver processos PM2
pm2 list

# Ver logs em tempo real
pm2 logs docs-watcher

# Ver informações detalhadas
pm2 show docs-watcher

# Ver monitoramento
pm2 monit
```

## 🚀 Comandos PM2 Úteis

### Gerenciamento Básico

```bash
# Reiniciar
pm2 restart docs-watcher

# Parar
pm2 stop docs-watcher

# Iniciar (se parado)
pm2 start docs-watcher

# Deletar do PM2
pm2 delete docs-watcher
```

### Logs

```bash
# Ver logs
pm2 logs docs-watcher

# Últimas 100 linhas
pm2 logs docs-watcher --lines 100

# Apenas erros
pm2 logs docs-watcher --err

# Limpar logs
pm2 flush
```

### Monitoramento

```bash
# Dashboard interativo
pm2 monit

# Status JSON
pm2 jlist

# Métricas
pm2 describe docs-watcher
```

## 🔧 Configurar Startup no Boot (Opcional)

**Se você quiser que o PM2 inicie automaticamente ao reiniciar o computador**, execute no seu terminal:

```bash
# 1. Copiar service file
sudo cp /tmp/pm2-marce.service /etc/systemd/system/pm2-marce.service

# 2. Recarregar systemd
sudo systemctl daemon-reload

# 3. Habilitar no boot
sudo systemctl enable pm2-marce

# 4. Iniciar service
sudo systemctl start pm2-marce

# 5. Verificar status
sudo systemctl status pm2-marce
```

### Gerenciar Systemd Service

```bash
# Ver status
sudo systemctl status pm2-marce

# Reiniciar
sudo systemctl restart pm2-marce

# Parar
sudo systemctl stop pm2-marce

# Desabilitar boot
sudo systemctl disable pm2-marce

# Ver logs
sudo journalctl -u pm2-marce -f
```

## 📋 Troubleshooting

### PM2 não inicia no boot

```bash
# Verificar se service está habilitado
sudo systemctl is-enabled pm2-marce

# Ver erros
sudo journalctl -u pm2-marce --no-pager -n 50

# Recriar service
cd /home/marce/Projetos/TradingSystem/tools/llamaindex
bash pm2-startup-fix.sh
```

### Watcher não está funcionando

```bash
# Ver logs de erro
pm2 logs docs-watcher --err

# Verificar se está rodando
pm2 list | grep docs-watcher

# Reiniciar
pm2 restart docs-watcher

# Ver detalhes
pm2 describe docs-watcher
```

### Re-adicionar watcher ao PM2

```bash
cd /home/marce/Projetos/TradingSystem/tools/llamaindex

# Remover instância antiga
pm2 delete docs-watcher

# Adicionar nova
pm2 start watch-docs.js --name docs-watcher --time

# Salvar
pm2 save
```

### PATH com espaços voltou

```bash
# Recriar service com PATH limpo
cd /home/marce/Projetos/TradingSystem/tools/llamaindex
bash pm2-startup-fix.sh

# Reinstalar
sudo cp /tmp/pm2-marce.service /etc/systemd/system/pm2-marce.service
sudo systemctl daemon-reload
sudo systemctl restart pm2-marce
```

## 🎯 Como Funciona Agora

### Sem Systemd (Atual)

✅ **Auto-restart:** Se o watcher crashar, PM2 reinicia automaticamente
❌ **Boot startup:** NÃO inicia ao reiniciar o computador
✅ **Logs:** Gerenciados pelo PM2
✅ **Monitoramento:** PM2 dashboard disponível

**Para iniciar manualmente após reboot:**
```bash
pm2 resurrect
# ou
pm2 start docs-watcher
```

### Com Systemd (Opcional)

✅ **Auto-restart:** PM2 reinicia automaticamente
✅ **Boot startup:** Inicia automaticamente ao reiniciar o computador
✅ **Logs:** Gerenciados pelo PM2 + systemd journal
✅ **Monitoramento:** PM2 dashboard + systemctl status

## 🔄 Workflow Recomendado

### Desenvolvimento Diário

```bash
# Iniciar projeto (Docker + serviços)
start

# PM2 já está rodando! Verificar:
pm2 list

# Ver logs do watcher
pm2 logs docs-watcher --lines 50
```

### Parar Tudo

```bash
# Parar serviços Node.js + Docker
stop

# PM2 continua rodando em background
# Se quiser parar PM2 também:
pm2 stop docs-watcher
```

### Reiniciar Sistema

**Sem systemd:**
```bash
# Após reboot, restaurar PM2:
pm2 resurrect
pm2 list
```

**Com systemd:**
```bash
# PM2 inicia automaticamente!
pm2 list
```

## 📚 Recursos

- **PM2 Docs:** https://pm2.keymetrics.io/docs/usage/quick-start/
- **PM2 Logs:** `pm2 logs --help`
- **PM2 Monitoring:** `pm2 monit`
- **Systemd Guide:** `man systemd.service`

## 🎉 Conclusão

✅ **PM2 está configurado e rodando!**
✅ **Auto-restart funciona** (testa crashando o processo)
✅ **Service file gerado** (para boot startup opcional)
✅ **PATH limpo** (problema resolvido)

**Para habilitar boot startup**, execute os comandos da seção "Configurar Startup no Boot" no seu terminal.

**Sem isso, o watcher funciona perfeitamente**, mas precisa ser iniciado manualmente após reiniciar o computador (`pm2 resurrect`).
