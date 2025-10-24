# Unified Reverse Proxy Setup

This directory contains the Nginx configuration for routing all Trading System services under a single domain (`tradingsystem.local`), eliminating CORS requirements and simplifying development.

## Overview

The unified domain architecture routes all services through Nginx on a single domain:
- Dashboard: `http://tradingsystem.local/`
- Backend APIs: `http://tradingsystem.local/api/*`
- Documentation: `http://tradingsystem.local/docs`

### Benefits

- ✅ Eliminates CORS completely (all requests are same-origin)
- ✅ Single domain for all services
- ✅ Simplified API configuration
- ✅ Production-ready architecture
- ✅ Easy migration to HTTPS/VPS

## Prerequisites

1. Nginx installed in WSL2/Ubuntu:
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. All services running on their respective ports:
   - Dashboard: 3103
   - Workspace: 3102
   - TP Capital API: 3200
   - B3: 3302
   - Documentation API: 3400
   - Laucher: 3500
   - Docusaurus: 3004

## Local Setup

1. Add local domain to hosts file:
   ```bash
   echo "127.0.0.1 tradingsystem.local" | sudo tee -a /etc/hosts
   ```

2. Copy Nginx configuration:
   ```bash
   sudo cp tradingsystem.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/tradingsystem.conf /etc/nginx/sites-enabled/
   ```

3. Test and apply configuration:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. Verify setup:
    ```bash
    curl http://tradingsystem.local/health
    ```

## Production Deployment

### Pre-deployment Checklist
- Verify all backend services are running and healthy
- Test configuration with `sudo nginx -t`
- Backup existing configuration
- Document current service ports and URLs
- Verify SSL certificates (if applicable)

### SSL/TLS Setup
- Install Certbot: `sudo apt install certbot python3-certbot-nginx`
- Obtain certificate: `sudo certbot --nginx -d tradingsystem.yourdomain.com`
- Auto-renewal configuration
- Certificate verification commands
- Redirect HTTP to HTTPS configuration example

### Performance Tuning
- Worker processes configuration (`worker_processes auto`)
- Worker connections (`worker_connections 1024`)
- Keepalive timeout settings
- Buffer size optimization
- Gzip compression configuration
- Static asset caching strategies

### Security Hardening
- Rate limiting configuration (`limit_req_zone`)
- IP whitelisting/blacklisting
- Request size limits
- Security headers (already present, expand with CSP)
- DDoS protection strategies

## Configuration Management

### Version Control
- Keep `tradingsystem.conf` in git
- Use branches for testing configuration changes
- Document all configuration changes in commit messages
- Tag stable configurations

### Testing Configuration Changes
- Test syntax: `sudo nginx -t`
- Dry-run with staging environment
- Gradual rollout strategy
- Rollback procedures

### Configuration Templates
- Variables for environment-specific values
- Separate configs for dev/staging/production
- Include directives for modular configuration

### Backup and Restore
- Backup command: `sudo cp /etc/nginx/sites-available/tradingsystem.conf /etc/nginx/sites-available/tradingsystem.conf.backup-$(date +%Y%m%d)`
- Restore procedure
- Configuration history management

## Service URL Mapping

| Service | Unified URL | Direct Port URL |
|---------|-------------|-----------------|
| Dashboard | `http://tradingsystem.local/` | `http://localhost:3103` |
| Workspace | `http://tradingsystem.local/api/library` | `http://localhost:3102` |
| TP Capital API | `http://tradingsystem.local/api/tp-capital` | `http://localhost:3200` |
| B3 | `http://tradingsystem.local/api/b3` | `http://localhost:3302` |
| Documentation API | `http://tradingsystem.local/api/docs` | `http://localhost:3400` |
| Laucher | `http://tradingsystem.local/api/launcher` | `http://localhost:3500` |
| Docusaurus | `http://tradingsystem.local/docs` | `http://localhost:3004` |

## Troubleshooting

### Common Issues

1. Port 80 already in use:
   ```bash
   sudo netstat -tlnp | grep :80
   sudo systemctl stop apache2  # If Apache is running
   sudo systemctl restart nginx
   ```

2. Permission denied errors:
   ```bash
   sudo chmod 644 /etc/nginx/sites-available/tradingsystem.conf
   sudo chown root:root /etc/nginx/sites-available/tradingsystem.conf
   ```

3. 502 Bad Gateway:
   - Verify backend services are running
   - Check logs: `sudo tail -f /var/log/nginx/tradingsystem-error.log`

4. Configuration not taking effect:
    ```bash
    sudo nginx -t
    sudo systemctl reload nginx
    sudo systemctl restart nginx
    ```

### WebSocket Connection Issues
- Verify upgrade headers are set correctly
- Check proxy timeout settings (increase if needed)
- Test WebSocket connection: `wscat -c ws://tradingsystem.local/api/ws`
- Monitor WebSocket connections: `sudo tail -f /var/log/nginx/tradingsystem-access.log | grep Upgrade`
- Common error: "WebSocket connection failed" - increase `proxy_read_timeout`

### Performance Issues
- Monitor request latency in access logs
- Check upstream service response times
- Identify slow endpoints: `awk '{print $7, $NF}' /var/log/nginx/tradingsystem-access.log | sort -k2 -rn | head -20`
- Enable access log timing: Add `$request_time` to log format
- Optimize buffer sizes if seeing "upstream sent too big header"

### Load Balancing Issues (future)
- Health check configuration for upstream servers
- Failover testing procedures
- Session persistence strategies

### Cache Issues
- Clear Nginx cache: `sudo rm -rf /var/cache/nginx/*`
- Verify cache headers in responses
- Debug cache hits/misses with `add_header X-Cache-Status $upstream_cache_status`

### Certificate Issues
- Verify certificate: `sudo certbot certificates`
- Test SSL configuration: `openssl s_client -connect tradingsystem.local:443`
- Renew certificate manually: `sudo certbot renew --dry-run`
- Check certificate expiration: `echo | openssl s_client -connect tradingsystem.local:443 2>/dev/null | openssl x509 -noout -dates`

### Logs

- Access log: `/var/log/nginx/tradingsystem-access.log`
- Error log: `/var/log/nginx/tradingsystem-error.log`
- Nginx main error log: `/var/log/nginx/error.log`

## Monitoring and Observability

### Log Analysis
- Real-time monitoring: `sudo tail -f /var/log/nginx/tradingsystem-access.log`
- Error tracking: `sudo tail -f /var/log/nginx/tradingsystem-error.log`
- Log rotation configuration
- Centralized logging integration (if using ELK/Loki)

### Metrics Collection
- Nginx Prometheus exporter installation (optional)
- Key metrics to monitor: request rate, error rate, response time, upstream health
- Integration with existing Prometheus/Grafana stack
- Alert rules for critical issues

### Health Checks
- Nginx status module configuration
- Upstream health monitoring
- Automated health check scripts

### Performance Metrics
- Requests per second
- Average response time
- Error rate by endpoint
- Upstream server status

## Rollback Instructions

To revert to direct port access:

1. Remove Nginx configuration:
   ```bash
   sudo rm /etc/nginx/sites-enabled/tradingsystem.conf
   sudo systemctl reload nginx
   ```

2. Update frontend environment variables:
   ```bash
   VITE_USE_UNIFIED_DOMAIN=false
   ```

3. Re-enable CORS in backend services:
   ```bash
   DISABLE_CORS=false
   ```

## Security Considerations

- Only expose required ports in production
- Use HTTPS in production (see VPS migration guide)
- Monitor access logs for unusual patterns
- Keep Nginx updated: `sudo apt update && sudo apt upgrade`

## Quick Reference Commands

```bash
# Quick Reference
sudo nginx -t                    # Test configuration
sudo systemctl reload nginx      # Apply changes
sudo systemctl restart nginx     # Full restart
sudo systemctl status nginx      # Check status
sudo tail -f /var/log/nginx/tradingsystem-error.log  # Watch errors
curl -I http://tradingsystem.local/health            # Test endpoint
```

## Related Documentation

### Infrastructure Documentation
- **Architecture Overview**: `docs/context/ops/infrastructure/reverse-proxy-setup.md` - Detailed architecture and benefits
- **VPS Migration**: `infrastructure/nginx-proxy/VPS-MIGRATION-GUIDE.md` - Production deployment guide
- **Service Port Map**: `docs/context/ops/service-port-map.md` - Complete port reference
- **Environment Configuration**: `docs/context/ops/ENVIRONMENT-CONFIGURATION.md` - Centralized env management
- **Individual Service Configs**: Reference to other proxy configs in same directory (api-proxy.conf, tp-api-proxy.conf, b3-api-proxy.conf)

### Service Documentation
- **Workspace API**: `backend/api/workspace/README.md` - Library API (Port 3102)
- **TP Capital API**: `frontend/apps/tp-capital/README.md` - TP Capital signals (Port 3200)
- **B3 Market Data API**: `frontend/apps/b3-market-data/README.md` - B3 data service (Port 3302)
- **Documentation API**: `backend/api/documentation-api/README.md` - Documentation management (Port 3400)
- **Firecrawl Proxy API**: `backend/api/firecrawl-proxy/README.md` - Web scraping proxy (Port 3600)
- **Service Launcher**: `backend/api/service-launcher/README.md` - Service orchestration