---
title: "Documentation Deployment Guide"
slug: /tools/documentation/docusaurus/deployment-guide
description: "Pipeline and automation steps for deploying the Docusaurus site."
tags:
  - tools
  - docusaurus
  - deployment
owner: DocsOps
lastReviewed: '2025-11-02'
---
# Documentation Deployment Guide

**Purpose**: Step-by-step guide to deploy TradingSystem Docusaurus documentation to staging and production  
**Audience**: DevOps, Release Engineers  
**Last Updated**: 2025-11-02

---

## Deployment Overview

### Current Architecture

**Development** (localhost:3400):
```
npm run docs:dev
→ Docusaurus dev server
→ Hot reload enabled
→ Not optimized
```

**Staging/Production**:
```
npm run docs:build
→ Static HTML/CSS/JS in build/
→ Optimized and minified
→ Ready for web server (NGINX/Apache)
```

---

## Option 1: NGINX Deployment (Recommended)

### Prerequisites

- NGINX installed
- SSL certificate (for HTTPS)
- Domain name configured

### Deployment Steps

#### 1. Build Documentation

```bash
cd /home/marce/Projetos/TradingSystem/docs

# Production build
npm run docs:build

# Verify build
ls -lh build/
# Should show: 1.0.0/, next/, api/, assets/, sitemap.xml, etc.
```

---

#### 2. Copy to Web Server

**Option A: Local NGINX**

```bash
# Copy build to NGINX directory
sudo cp -r build/* /var/www/tradingsystem-docs/

# Set permissions
sudo chown -R www-data:www-data /var/www/tradingsystem-docs/
sudo chmod -R 755 /var/www/tradingsystem-docs/
```

**Option B: Remote Server**

```bash
# Using rsync (recommended)
rsync -avz --delete \
  build/ \
  user@server:/var/www/tradingsystem-docs/

# Using scp
scp -r build/* user@server:/var/www/tradingsystem-docs/
```

---

#### 3. Configure NGINX

**File**: `/etc/nginx/sites-available/tradingsystem-docs`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name docs.tradingsystem.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name docs.tradingsystem.example.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/tradingsystem-docs.crt;
    ssl_certificate_key /etc/ssl/private/tradingsystem-docs.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Root directory
    root /var/www/tradingsystem-docs;
    index index.html;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;

    # Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # HTML files (no caching for content updates)
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
    }

    # SPA fallback (for client-side routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Access logs
    access_log /var/log/nginx/tradingsystem-docs-access.log;
    error_log /var/log/nginx/tradingsystem-docs-error.log;
}
```

---

#### 4. Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/tradingsystem-docs \
           /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Expected output:
# nginx: configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload NGINX
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

---

#### 5. Verify Deployment

```bash
# Test local
curl -I http://localhost

# Test remote (if deployed)
curl -I https://docs.tradingsystem.example.com

# Expected:
# HTTP/2 200
# content-type: text/html
# (should see security headers)
```

**Browser Test**:
1. Visit `https://docs.tradingsystem.example.com`
2. Verify HTTPS certificate valid
3. Check all sections navigate correctly
4. Test API docs render
5. Verify version dropdown works

---

## Option 2: Docker Deployment

### Using Existing Docker Setup

**Compose File**: `tools/compose/docker-compose.docs.yml`

**Current Configuration**:

```yaml
services:
  docs-hub:
    image: nginx:alpine
    container_name: docs-hub
    ports:
      - "3400:80"
    volumes:
      - ../../docs/build:/usr/share/nginx/html:ro
      - ../../docs/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - tradingsystem
    restart: unless-stopped
```

---

### Deployment Steps

```bash
cd /home/marce/Projetos/TradingSystem

# 1. Build documentation
cd docs
npm run docs:build

# 2. Start container
cd ..
docker compose -f tools/compose/docker-compose.docs.yml up -d

# 3. Verify
curl -I http://localhost:3400

# 4. Check logs
docker logs docs-hub

# 5. Test in browser
# Visit: http://localhost:3400
```

---

### Update Existing Container

```bash
# Rebuild docs
cd docs
npm run docs:build

# Container automatically serves updated build/
# (volume mounted read-only)

# If changes don't appear:
docker compose -f tools/compose/docker-compose.docs.yml restart
```

---

## Option 3: GitHub Pages (Free Hosting)

### Prerequisites

- GitHub repository public
- GitHub Pages enabled

### Configuration

**File**: `docs/docusaurus.config.js`

```javascript
const config = {
  url: 'https://marceloterra1983.github.io',
  baseUrl: '/TradingSystem/',  // Repository name
  organizationName: 'marceloterra1983',
  projectName: 'TradingSystem',
  
  // ... rest of config
};
```

---

### Deployment

**Manual Deployment**:

```bash
cd /home/marce/Projetos/TradingSystem/docs

# Set Git user (if not set globally)
git config user.name "Your Name"
git config user.email "your@email.com"

# Deploy to gh-pages branch
npm run deploy

# This will:
# 1. Build the site
# 2. Push build/ to gh-pages branch
# 3. GitHub Pages automatically serves it
```

**Automated Deployment** (GitHub Actions):

**File**: `.github/workflows/deploy-docs.yml`

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: docs/package-lock.json
      
      - name: Install dependencies
        working-directory: docs
        run: npm ci
      
      - name: Build documentation
        working-directory: docs
        run: npm run docs:build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: docs/build
          cname: docs.tradingsystem.example.com  # If custom domain
```

**Access**: https://marceloterra1983.github.io/TradingSystem/

---

## Post-Deployment Validation

### Automated Checks

```bash
#!/bin/bash
# validate-deployment.sh

DOCS_URL="https://docs.tradingsystem.example.com"

echo "=== Deployment Validation ==="

# 1. Homepage
curl -f "$DOCS_URL" > /dev/null 2>&1 && \
  echo "✅ Homepage accessible" || \
  echo "❌ Homepage failed"

# 2. API docs
curl -f "$DOCS_URL/api/workspace" > /dev/null 2>&1 && \
  echo "✅ API docs accessible" || \
  echo "❌ API docs failed"

# 3. Sitemap
curl -f "$DOCS_URL/sitemap.xml" > /dev/null 2>&1 && \
  echo "✅ Sitemap accessible" || \
  echo "❌ Sitemap failed"

# 4. Version switcher
curl -s "$DOCS_URL" | grep -q "1.0.0" && \
  echo "✅ Version 1.0.0 present" || \
  echo "⚠️  Version 1.0.0 not found"

# 5. HTTPS
curl -I "$DOCS_URL" 2>&1 | grep -q "HTTP/2 200" && \
  echo "✅ HTTPS working" || \
  echo "⚠️  HTTPS issue"

echo ""
echo "=== Validation Complete ==="
```

---

### Manual Validation Checklist

**Functional Testing**:
- [ ] Homepage loads (`< 3s`)
- [ ] Navigation works (all sections)
- [ ] API docs render correctly (7 specs)
- [ ] Version dropdown functional
- [ ] Internal links work
- [ ] Images load
- [ ] Code blocks formatted correctly

**Cross-Browser Testing**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Mobile Testing**:
- [ ] iPhone/iOS Safari
- [ ] Android Chrome
- [ ] Responsive layout
- [ ] Touch navigation works

**Performance**:
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint (`< 1.5s`)
- [ ] Time to Interactive (`< 3.5s`)
- [ ] No console errors

---

## Rollback Procedure

### If Issues Found After Deployment

**Option A: Revert to Previous Build**

```bash
# If you saved previous build
sudo cp -r /var/www/tradingsystem-docs-backup/* \
           /var/www/tradingsystem-docs/

# Restart NGINX
sudo systemctl reload nginx
```

**Option B: Redeploy from Git**

```bash
# Checkout previous commit
git checkout <previous-commit-hash>

# Rebuild
cd docs
npm run docs:build

# Redeploy
sudo cp -r build/* /var/www/tradingsystem-docs/
```

**Option C: Emergency Maintenance Page**

```bash
# Create simple maintenance page
cat > /var/www/tradingsystem-docs/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Documentation Under Maintenance</title>
  <style>
    body { 
      font-family: system-ui; 
      text-align: center; 
      padding: 100px; 
    }
  </style>
</head>
<body>
  <h1>🔧 Documentation Under Maintenance</h1>
  <p>We'll be back shortly. Thank you for your patience.</p>
</body>
</html>
EOF
```

---

## Monitoring

### Health Checks

**Automated Monitoring**:

```bash
#!/bin/bash
# monitor-docs.sh

DOCS_URL="https://docs.tradingsystem.example.com"

while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOCS_URL")
  
  if [ "$STATUS" = "200" ]; then
    echo "[$(date)] ✅ Docs healthy (HTTP $STATUS)"
  else
    echo "[$(date)] ❌ Docs unhealthy (HTTP $STATUS)" | \
      mail -s "Docs Down!" ops@tradingsystem.com
  fi
  
  sleep 300  # Check every 5 minutes
done
```

**Run as systemd service** or add to existing monitoring (Prometheus).

---

### Metrics to Track

**Weekly Metrics**:
- Page views (total, unique)
- Popular pages
- Average session duration
- Bounce rate
- Geographic distribution

**Monthly Metrics**:
- Content growth (pages added)
- Search queries (if Algolia enabled)
- User feedback (if widget added)
- Broken links (run validation)

---

## Maintenance

### Weekly Tasks

- [ ] Review analytics (popular pages)
- [ ] Check for broken links
- [ ] Monitor search queries (Algolia)
- [ ] Review user feedback

### Monthly Tasks

- [ ] Update outdated content (lastReviewed > 90 days)
- [ ] Performance audit (Lighthouse)
- [ ] Dependency updates (`npm outdated`)
- [ ] Security audit (`npm audit`)

### Quarterly Tasks

- [ ] Major content review
- [ ] Version snapshot (if needed)
- [ ] Archive old versions
- [ ] SEO review

---

## Troubleshooting

### Issue: 404 Errors After Deployment

**Cause**: Incorrect baseUrl or missing files

**Solutions**:

```bash
# Check baseUrl in config
cat docs/docusaurus.config.js | grep baseUrl

# Verify files copied correctly
ls -la /var/www/tradingsystem-docs/
# Should see: 1.0.0/, next/, api/, assets/, etc.

# Check NGINX logs
sudo tail -f /var/log/nginx/tradingsystem-docs-error.log
```

---

### Issue: Assets Not Loading (403/404)

**Cause**: Incorrect file permissions or paths

**Solutions**:

```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/tradingsystem-docs/
sudo chmod -R 755 /var/www/tradingsystem-docs/

# Check NGINX config
sudo nginx -t

# Check file exists
ls -lh /var/www/tradingsystem-docs/assets/
```

---

### Issue: Version Switcher Not Working

**Cause**: Missing versioned directories or incorrect config

**Solutions**:

```bash
# Verify version directories exist
ls -la /var/www/tradingsystem-docs/
# Should see: 1.0.0/, next/

# Check versions.json
cat /var/www/tradingsystem-docs/versions.json

# Rebuild if needed
cd docs
npm run docs:build
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: docs
        run: npm ci
      
      - name: Build
        working-directory: docs
        run: npm run docs:build
      
      - name: Deploy to Server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          source: "docs/build/*"
          target: "/var/www/tradingsystem-docs/"
          strip_components: 2
      
      - name: Reload NGINX
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            sudo systemctl reload nginx
            curl -f https://docs.tradingsystem.example.com
```

---

## Backup Strategy

### Before Each Deployment

```bash
# Backup current version
BACKUP_DIR="/var/www/tradingsystem-docs-backup-$(date +%Y%m%d-%H%M%S)"
sudo cp -r /var/www/tradingsystem-docs "$BACKUP_DIR"

echo "Backup saved to: $BACKUP_DIR"

# Keep last 5 backups
ls -dt /var/www/tradingsystem-docs-backup-* | tail -n +6 | xargs sudo rm -rf
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passed locally
- [ ] Build succeeds (npm run docs:build)
- [ ] No critical errors or warnings
- [ ] Frontmatter validated
- [ ] Content reviewed and approved
- [ ] Backup current deployment

### Deployment

- [ ] Build directory copied to server
- [ ] File permissions set correctly
- [ ] NGINX configuration updated
- [ ] NGINX reloaded without errors
- [ ] Health check passes

### Post-Deployment

- [ ] Homepage loads from public URL
- [ ] All major sections accessible
- [ ] API docs render correctly
- [ ] Version switcher functional
- [ ] No 404 errors
- [ ] HTTPS certificate valid
- [ ] Performance acceptable (Lighthouse)
- [ ] Search works (if enabled)
- [ ] Analytics tracking (if enabled)

---

## Contact & Support

**For Deployment Issues**:
- DevOps Team
- Release Manager

**For Content Issues**:
- DocsOps Team Lead

**For Technical Issues**:
- Backend Guild
- Frontend Guild

---

**Status**: 📋 **READY FOR STAGING DEPLOYMENT**

**Recommended Next Action**: Execute deployment to staging environment and perform manual validation tests.

---

**Last Updated**: 2025-11-02  
**Version**: 1.0.0
