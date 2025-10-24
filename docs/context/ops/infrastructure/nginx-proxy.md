---
title: Nginx Reverse Proxy Playbook
sidebar_position: 20
tags: [nginx, reverse-proxy, ops, networking]
domain: ops
type: guide
summary: Configuração padronizada do Nginx para expor os serviços do TradingSystem sob um único domínio interno.
status: active
last_review: "2025-10-17"
---

# Nginx Reverse Proxy Playbook

> 🛡️ O Nginx consolida todos os serviços em `tradingsystem.local`, facilita TLS interno e elimina problemas de CORS. Este guia complementa o [Reverse Proxy Setup](./reverse-proxy-setup.md) com detalhes operacionais e arquivos de configuração.

## Visão Geral

- **Domínio interno:** `tradingsystem.local`
- **Porta externa:** `80` (TLS opcional em roadmap)
- **Serviços roteados:**
  - `/` → Dashboard (3103)
  - `/docs` → Docusaurus (3004)
  - `/api/workspace` → Library API (3200)
  - `/api/b3` → B3 Market Data API (3302)
  - `/api/docs` → Documentation API (3400)
  - `/api/launcher` → Service Launcher API (3500)
  - `/api/firecrawl` → Firecrawl Proxy (3600)

## Estrutura de Arquivos

```text
tools/nginx-proxy/
├── nginx.conf                    # Include principal
├── tradingsystem.conf            # Virtual host (tradingsystem.local)
├── api-proxy.conf                # Regras para APIs HTTP
├── tp-api-proxy.conf             # Regras específicas (TP Capital)
├── b3-api-proxy.conf             # Regras B3
├── ideas-api-proxy.conf          # Legacy (Library API)
└── VPS-MIGRATION-GUIDE.md        # Passo a passo para VPS dedicada
```

> Todos os arquivos incluem apenas caminhos relatórios. Ajuste portas se serviços mudarem.

## Configuração Rápida

1. **Instalar Nginx**
   ```bash
   sudo apt update
   sudo apt install -y nginx
   ```

2. **Copiar arquivos**
   ```bash
   sudo cp tools/nginx-proxy/nginx.conf /etc/nginx/nginx.conf
   sudo cp tools/nginx-proxy/tradingsystem.conf /etc/nginx/sites-available/
   sudo ln -sf /etc/nginx/sites-available/tradingsystem.conf /etc/nginx/sites-enabled/tradingsystem.conf
   sudo mkdir -p /etc/nginx/includes/tradingsystem
   sudo cp tools/nginx-proxy/*-proxy.conf /etc/nginx/includes/tradingsystem/
   ```

3. **Aplicar e testar**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   sudo systemctl status nginx
   ```

4. **Resolver DNS local**
   ```bash
   # Windows (PowerShell admin)
   Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "`n127.0.0.1 tradingsystem.local"

   # Linux
   echo "127.0.0.1 tradingsystem.local" | sudo tee -a /etc/hosts
   ```

## Segurança

- Ativar `brotli` e `gzip` para payloads estáticos.
- Habilitar `proxy_set_header X-Forwarded-For` para preservar IP de origem.
- Configurar `client_max_body_size` conforme necessidade de uploads.
- Rate limiting e TLS podem ser adicionados posteriormente (ver backlog da squad Ops).

## Observabilidade

- Logs em `/var/log/nginx/tradingsystem.access.log` e `.error.log`.
- Coletar com Filebeat/Vector e enviar para stack de observabilidade.
- Status endpoint: habilite `stub_status` em ambientes internos (`/status`).

## Fluxos de Implantação

- **Dev:** Execução local (Windows ou WSL) usando host file.
- **Homolog/Prod:** VPS dedicada com script de migração ([VPS Migration Guide](./nginx-proxy-vps-migration.md)).

## Próximos Passos

- Automatizar reload com Ansible (playbook em planejamento).
- Adicionar TLS interno via mkcert ou step-ca.
- Integrar rate limiting por API crítica.

## Referências

- [Reverse Proxy Setup](./reverse-proxy-setup.md)
- [Service Port Map](../service-port-map.md)
- [Firecrawl Stack Overview](./firecrawl-stack.md)

