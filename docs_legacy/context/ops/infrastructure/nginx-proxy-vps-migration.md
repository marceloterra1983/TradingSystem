---
title: VPS Migration Guide - Nginx Proxy
sidebar_position: 50
tags: [nginx, vps, migration, ops]
domain: ops
type: runbook
summary: Passo a passo para mover o reverse proxy Nginx do ambiente local para uma VPS dedicada mantendo o domínio interno tradingsystem.local.
status: active
last_review: "2025-10-17"
---

# VPS Migration Guide - Nginx Proxy

> 👷 Use este guia quando precisar publicar o reverse proxy do TradingSystem em uma VPS (Ubuntu 22.04+). Ele cobre provisionamento, sincronização de arquivos e validações pós-migração.

## Pré-Requisitos

- VPS com Ubuntu 22.04 LTS (mínimo 2 vCPU, 2 GB RAM)
- Acesso SSH com usuário `ops` (sudo)
- Repositório TradingSystem clonado em `/opt/tradingsystem`
- Domínio interno resolvido via VPN ou DNS privado (ex.: `tradingsystem.local`)

## 1. Preparar VPS

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git fail2ban ufw

# Criar usuário de serviço
sudo useradd -m -s /bin/bash tradingsystem
sudo usermod -aG sudo tradingsystem
```

Configure autenticação SSH (chaves) e desabilite login por senha.

## 2. Clonar Repositório

```bash
sudo -u tradingsystem git clone https://github.com/marceloterra/TradingSystem.git /opt/tradingsystem
cd /opt/tradingsystem
sudo chown -R tradingsystem:tradingsystem .
```

## 3. Sincronizar Configurações

```bash
cd /opt/tradingsystem
sudo cp tools/nginx-proxy/nginx.conf /etc/nginx/nginx.conf
sudo cp tools/nginx-proxy/tradingsystem.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/tradingsystem.conf /etc/nginx/sites-enabled/tradingsystem.conf
sudo mkdir -p /etc/nginx/includes/tradingsystem
sudo cp tools/nginx-proxy/*-proxy.conf /etc/nginx/includes/tradingsystem/
```

Certifique-se de que os serviços backend estejam acessíveis pelo endereço interno configurado (VPN, túnel, wireguard etc.).

## 4. Ajustar Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw enable
```

(Opcional) Habilite HTTPS e portas adicionais conforme roadmap.

## 5. Testar e Publicar

```bash
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

Valide:

- `curl -I http://tradingsystem.local` → resposta `200`
- `curl -I http://tradingsystem.local/docs` → redireciona para Docusaurus
- `curl http://tradingsystem.local/api/workspace/health` → resposta `200`

## 6. Observabilidade

- Configure `fail2ban` para proteger contra brute-force.
- Habilite `logrotate` para `/var/log/nginx/*.log`.
- Integre com stack de logs (Vector/Promtail) apontando para o cluster local.

## 7. Rollback

Para reverter à configuração anterior:

```bash
sudo systemctl stop nginx
sudo rm /etc/nginx/sites-enabled/tradingsystem.conf
sudo mv /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf
sudo systemctl start nginx
```

 Mantenha backup do `nginx.conf` original (`/etc/nginx/nginx.conf.backup`) antes de copiar os novos arquivos.

## Checklist Pós-Migração

- [ ] DNS interno atualizado apontando para a VPS
- [ ] Proxy responde aos endpoints críticos
- [ ] Logs coletados no observability stack
- [ ] Alertas configurados no Grafana (latência, 5xx, saturação)
- [ ] Documentação atualizada (este runbook + Service Startup Guide)

## Referências

- [Nginx Reverse Proxy Playbook](./nginx-proxy.md)
- [Reverse Proxy Setup](./reverse-proxy-setup.md)
- [Service Startup Guide](../service-startup-guide.md)
- [Checklist: Mudanças de Infraestrutura](../checklists/pre-deploy.md)
