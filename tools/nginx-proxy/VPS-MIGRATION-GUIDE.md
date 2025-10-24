---
title: VPS Migration Guide
sidebar_position: 1
tags: [documentation]
domain: ops
type: guide
summary: This guide details the process of deploying the Trading System's unified reverse proxy architecture to a Virtual Private Server (VPS) with HTTPS suppo...
status: active
last_review: "2025-10-23"
---

# VPS Migration Guide

This guide details the process of deploying the Trading System's unified reverse proxy architecture to a Virtual Private Server (VPS) with HTTPS support.

## Prerequisites

- Ubuntu 22.04+ VPS with root access
- Domain name pointing to VPS IP address
- Open ports: 80 (HTTP) and 443 (HTTPS)
- Backend services running and accessible

## 1. DNS Configuration

1. Add A record to your domain's DNS settings:
   ```
   Type: A
   Name: tradingsystem
   Value: <Your VPS IP>
   TTL: 3600
   ```

2. Add subdomain if needed:
   ```
   Type: A
   Name: api.tradingsystem
   Value: <Your VPS IP>
   TTL: 3600
   ```

3. Verify DNS propagation:
   ```bash
   dig tradingsystem.yourdomain.com
   ```

## 2. Initial Server Setup

1. Update system packages:
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

2. Install required packages:
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

3. Configure firewall:
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow ssh
   sudo ufw enable
   sudo ufw status
   ```

## 3. Nginx Configuration

1. Copy configuration file:
   ```bash
   sudo cp tradingsystem.conf /etc/nginx/sites-available/tradingsystem.yourdomain.com
   ```

2. Update server_name:
   ```bash
   sudo sed -i 's/tradingsystem.local/tradingsystem.yourdomain.com/g' \
     /etc/nginx/sites-available/tradingsystem.yourdomain.com
   ```

3. Create symbolic link:
   ```bash
   sudo ln -s /etc/nginx/sites-available/tradingsystem.yourdomain.com \
     /etc/nginx/sites-enabled/
   ```

4. Test configuration:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## 4. SSL/TLS Setup

1. Obtain SSL certificate:
   ```bash
   sudo certbot --nginx -d tradingsystem.yourdomain.com
   ```

2. Choose redirect option when prompted (2 - Redirect all traffic to HTTPS)

3. Verify auto-renewal:
   ```bash
   sudo certbot renew --dry-run
   ```

4. Check certificate status:
   ```bash
   curl -vI https://tradingsystem.yourdomain.com
   ```

## 5. Security Hardening

1. Add security headers to Nginx config:
   ```nginx
   # Inside server block
   add_header X-Frame-Options "SAMEORIGIN";
   add_header X-Content-Type-Options "nosniff";
   add_header X-XSS-Protection "1; mode=block";
   add_header Referrer-Policy "strict-origin-when-cross-origin";
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';";

   # Disable server tokens
   server_tokens off;
   ```

2. Configure rate limiting:
   ```nginx
   # At the top of nginx config
   limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

   # Inside location blocks for APIs
   location /api/ {
       limit_req zone=api_limit burst=20 nodelay;
       # ... existing config
   }
   ```

3. Enable SSL security headers:
   ```nginx
   ssl_protocols TLSv1.2 TLSv1.3;
   ssl_prefer_server_ciphers on;
   ssl_session_cache shared:SSL:10m;
   ssl_session_timeout 10m;
   ```

## 6. Backend Service Configuration

1. Update backend services to listen on localhost only:
   ```javascript
   // In each backend service
   app.listen(port, '127.0.0.1', () => {
     console.log(`Service listening on port ${port}`);
   });
   ```

2. Verify services are not externally accessible:
   ```bash
   sudo netstat -tlnp | grep LISTEN
   ```

## 7. Monitoring Setup

1. Configure Nginx logging:
   ```nginx
   # Inside http block
   log_format detailed '$remote_addr - $remote_user [$time_local] '
                      '"$request" $status $body_bytes_sent '
                      '"$http_referer" "$http_user_agent" '
                      '$request_time';

   # Inside server block
   access_log /var/log/nginx/tradingsystem-access.log detailed;
   error_log /var/log/nginx/tradingsystem-error.log warn;
   ```

2. Set up log rotation:
   ```bash
   sudo nano /etc/logrotate.d/nginx
   ```
   ```
   /var/log/nginx/*.log {
       daily
       missingok
       rotate 14
       compress
       delaycompress
       notifempty
       create 0640 www-data adm
       sharedscripts
       prerotate
           if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
               run-parts /etc/logrotate.d/httpd-prerotate; \
           fi \
       endscript
       postrotate
           invoke-rc.d nginx rotate >/dev/null 2>&1
       endscript
   }
   ```

## 8. Testing Checklist

- [ ] HTTPS works and redirects from HTTP
- [ ] SSL Labs test score A+ (https://www.ssllabs.com/ssltest/)
- [ ] All API endpoints accessible via HTTPS
- [ ] WebSocket connections work over WSS
- [ ] Rate limiting functions as expected
- [ ] Logs are being written and rotated
- [ ] Backend services not directly accessible
- [ ] Security headers present in responses

## 9. Maintenance

1. Auto-renew SSL certificates:
   ```bash
   sudo systemctl status certbot.timer
   ```

2. Monitor SSL expiry:
   ```bash
   sudo certbot certificates
   ```

3. Regular updates:
   ```bash
   sudo apt update
   sudo apt upgrade
   sudo systemctl restart nginx
   ```

4. Log monitoring:
   ```bash
   sudo tail -f /var/log/nginx/tradingsystem-error.log
   ```

## 10. Rollback Plan

1. Backup configuration:
   ```bash
   sudo cp /etc/nginx/sites-available/tradingsystem.yourdomain.com{,.bak}
   ```

2. In case of issues:
   ```bash
   sudo mv /etc/nginx/sites-available/tradingsystem.yourdomain.com{.bak,}
   sudo systemctl reload nginx
   ```

3. DNS rollback:
   - Keep old A records for 24h after changes
   - Use short TTL during migration (300s)
   - Have backup DNS configuration documented

## Security Notes

- Keep SSL certificates up to date
- Regularly audit access logs for unusual patterns
- Monitor server resources and set up alerts
- Keep all packages updated, especially Nginx and Certbot
- Backup Nginx configuration and SSL certificates
- Document all configuration changes
- Use staging certificates for testing
- Monitor failed authentication attempts
- Keep backups of access and error logs