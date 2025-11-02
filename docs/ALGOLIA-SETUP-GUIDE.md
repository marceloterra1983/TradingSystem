# Algolia DocSearch Setup Guide

**Purpose**: Step-by-step guide to apply for and configure Algolia DocSearch for TradingSystem documentation  
**Estimated Time**: 2 hours (+ 1-3 days for approval)  
**Owner**: DocsOps  
**Priority**: P1 (High)

---

## Overview

**Algolia DocSearch** provides free, high-quality search for open-source documentation. It's the recommended search solution for Docusaurus sites.

**Benefits**:
- ✅ Free for open-source projects
- ✅ Instant, relevant results
- ✅ Keyboard shortcuts (Ctrl+K)
- ✅ Mobile-optimized
- ✅ Analytics included
- ✅ No backend maintenance required

---

## Step 1: Application Process

### 1.1 Requirements Check

**Before applying, ensure**:

- [x] Documentation is publicly accessible
- [x] Site is production-ready (deployed to staging/prod)
- [x] You are the maintainer or have permission to apply
- [x] Site uses Docusaurus (or similar documentation generator)

**Current Status**: ✅ All requirements met (once deployed to staging)

---

### 1.2 Apply for DocSearch

**Application URL**: https://docsearch.algolia.com/apply/

**Information Required**:

| Field | Value for TradingSystem |
|-------|-------------------------|
| **Website URL** | `https://your-staging-url.com` or `http://localhost:3400` |
| **Email** | Your maintainer email |
| **Repository URL** | `https://github.com/marceloterra1983/TradingSystem` |
| **Documentation Tool** | Docusaurus v3 |
| **Index Name** | `tradingsystem-docs` (suggested) |

**Application Template**:

```
Website URL: https://tradingsystem-docs.example.com
Email: your-email@example.com
Repository: https://github.com/marceloterra1983/TradingSystem

We're building a local trading system with comprehensive documentation 
using Docusaurus v3. Our documentation includes API references, 
architecture guides, and implementation tutorials.

We would love to provide search functionality to help developers 
navigate our 200+ documentation pages.
```

---

### 1.3 Wait for Approval

**Typical Timeline**: 1-3 business days  
**You'll Receive**:
- Email confirmation
- Application ID
- API credentials (once approved)

**While Waiting**:
- Continue with other optimizations
- Prepare configuration (see Step 2)
- Test site in staging

---

## Step 2: Configuration (After Approval)

### 2.1 Credentials Received

After approval, Algolia will provide:

```javascript
{
  "appId": "YOUR_APP_ID",           // e.g., "BH4D9OD16A"
  "apiKey": "YOUR_SEARCH_API_KEY",  // Search-only API key (safe for public)
  "indexName": "tradingsystem-docs" // Your index name
}
```

**IMPORTANT**: 
- ✅ `apiKey` is **search-only** and safe to commit
- ❌ Never commit admin API key (if provided separately)

---

### 2.2 Update Docusaurus Configuration

**File**: `docs/docusaurus.config.js`

**Add to `themeConfig`**:

```javascript
/** @type {import('@docusaurus/preset-classic').ThemeConfig} */
({
  // ... existing config
  
  algolia: {
    // Provided by Algolia
    appId: 'YOUR_APP_ID',
    apiKey: 'YOUR_SEARCH_API_KEY',
    indexName: 'tradingsystem-docs',
    
    // Optional: Advanced configuration
    contextualSearch: true,  // Enable version-aware search
    searchParameters: {
      facetFilters: [],      // Filtering options
    },
    searchPagePath: 'search', // URL for dedicated search page
    
    // Optional: Customization
    placeholder: 'Search documentation...',
    translations: {
      button: {
        buttonText: 'Search',
        buttonAriaLabel: 'Search',
      },
    },
  },
  
  // ... rest of config
})
```

---

### 2.3 Commit Configuration

```bash
cd /home/marce/Projetos/TradingSystem

# Add Algolia config
git add docs/docusaurus.config.js

# Commit
git commit -m "feat(docs): Add Algolia DocSearch integration

- Configure Algolia search with appId, apiKey, indexName
- Enable contextualSearch for version-aware results
- Add search page at /search route

Closes #XXX"

# Push
git push origin main
```

---

### 2.4 Rebuild and Deploy

```bash
cd docs

# Rebuild with search enabled
npm run docs:build

# Verify search box appears in navbar
# Look for: <div class="navbar__search">

# Deploy to staging/production
# (Upload build/ directory to server)
```

---

## Step 3: Testing Search Functionality

### 3.1 Visual Check

**After deployment**, visit your documentation site:

1. **Search Box Visible**:
   - ✅ Located in navbar (top right)
   - ✅ Placeholder text shows
   - ✅ Icon present

2. **Keyboard Shortcut**:
   - ✅ Press `Ctrl+K` (or `Cmd+K` on Mac)
   - ✅ Search modal opens
   - ✅ Focus on input field

---

### 3.2 Functional Testing

**Test Queries**:

| Query | Expected Results |
|-------|------------------|
| `workspace` | Workspace API, Workspace Overview, etc. |
| `api` | All API documentation pages |
| `docker` | Docker tools, compose files, setup guides |
| `profitdll` | ProfitDLL integration docs |
| `installation` | Installation guides across tools |

**Success Criteria**:
- ✅ Results appear instantly (<200ms)
- ✅ Results are relevant to query
- ✅ Click result navigates to correct page
- ✅ Recent searches shown
- ✅ Keyboard navigation works (arrows, Enter, Esc)

---

### 3.3 Advanced Features

**Test Version-Aware Search**:

1. Switch to version 1.0.0 (via dropdown)
2. Search for "API"
3. Verify results show content from 1.0.0
4. Switch to "next" version
5. Search again - results should update

**Test Filters** (if configured):

- Category filters (APIs, Tools, Apps)
- Tag filters
- Version filters

---

## Step 4: Analytics & Monitoring

### 4.1 Algolia Dashboard

**Access**: https://www.algolia.com/dashboard

**Metrics to Monitor**:
- **Total searches**: Daily/weekly/monthly
- **Popular queries**: What users search for
- **No results queries**: Gaps in documentation
- **Click-through rate**: Search effectiveness

**Review Cadence**: Weekly (first month), then monthly

---

### 4.2 Optimization Based on Analytics

**Common Issues & Fixes**:

**Issue**: Users search "how to install" but no results
**Fix**: Add "installation" synonym or improve content

**Issue**: High "no results" rate for technical terms
**Fix**: Add synonyms configuration

```javascript
// docusaurus.config.js
algolia: {
  searchParameters: {
    synonyms: [
      ['docker', 'container', 'containerization'],
      ['api', 'endpoint', 'route'],
      ['install', 'setup', 'installation'],
    ],
  },
}
```

---

## Troubleshooting

### Issue: Search Box Not Appearing

**Possible Causes**:
1. Configuration not applied (check docusaurus.config.js)
2. Build cache issue
3. Credentials incorrect

**Solutions**:

```bash
# Clear cache and rebuild
cd docs
rm -rf .docusaurus build
npm run docs:build

# Verify config
cat docusaurus.config.js | grep -A 10 "algolia:"

# Check browser console (F12)
# Look for: Algolia API errors
```

---

### Issue: Search Returns No Results

**Possible Causes**:
1. Index not populated yet (Algolia crawling in progress)
2. Wrong index name
3. Crawler configuration issue

**Solutions**:

1. **Wait for Initial Crawl** (24-48 hours after approval)
2. **Check Index Status** in Algolia dashboard
3. **Manual Reindex** (if available)

**Verify Index**:

```bash
# Test API directly
curl -X GET \
  "https://YOUR_APP_ID-dsn.algolia.net/1/indexes/tradingsystem-docs" \
  -H "X-Algolia-API-Key: YOUR_SEARCH_API_KEY" \
  -H "X-Algolia-Application-Id: YOUR_APP_ID"

# Should return: { "nbHits": 797, ... }
```

---

### Issue: Results Not Updated After Content Changes

**Cause**: Algolia crawler runs periodically (not real-time)

**Solutions**:

1. **Wait for Next Crawl** (usually daily)
2. **Request Manual Crawl** (via Algolia dashboard)
3. **Configure Webhook** (advanced - trigger crawl on git push)

---

## Advanced Configuration

### Custom Crawler Config

**If you need to customize what's indexed**:

**File**: `.algolia/config.json` (create in repo root)

```json
{
  "index_name": "tradingsystem-docs",
  "start_urls": [
    {
      "url": "https://tradingsystem-docs.example.com/",
      "selectors_key": "default"
    }
  ],
  "selectors": {
    "default": {
      "lvl0": {
        "selector": ".menu__link--sublist.menu__link--active",
        "global": true,
        "default_value": "Documentation"
      },
      "lvl1": "article h1",
      "lvl2": "article h2",
      "lvl3": "article h3",
      "lvl4": "article h4",
      "text": "article p, article li"
    }
  },
  "strip_chars": " .,;:#",
  "custom_settings": {
    "separatorsToIndex": "_",
    "attributesForFaceting": ["language", "version"],
    "attributesToRetrieve": ["hierarchy", "content", "anchor", "url"]
  }
}
```

**Submit config to Algolia support for custom crawling**

---

## Success Metrics

### Week 1 After Launch

- [ ] Search box visible to 100% of users
- [ ] >50% of users discover search feature
- [ ] Average searches per session > 0.5
- [ ] No technical errors in console

### Month 1 After Launch

- [ ] >1000 total searches performed
- [ ] Click-through rate > 60%
- [ ] No-results rate < 20%
- [ ] Average results per query > 5

### Ongoing

- [ ] Monitor popular queries (inform content strategy)
- [ ] Optimize synonyms based on no-results queries
- [ ] Track search-to-conversion (docs → action)

---

## Alternative: Self-Hosted Search

**If Algolia is not available**, consider:

### Option A: Docusaurus Search (Built-in)

```javascript
// Requires @docusaurus/theme-search-algolia alternatives
// Currently no official built-in search in Docusaurus v3
```

### Option B: Typesense (Self-Hosted)

**Pros**: Free, self-hosted, privacy-friendly  
**Cons**: Requires server, more setup

```bash
# Install Typesense server
docker run -p 8108:8108 typesense/typesense:latest

# Install Docusaurus plugin
npm install docusaurus-theme-search-typesense
```

### Option C: Meilisearch (Self-Hosted)

**Pros**: Fast, easy to set up  
**Cons**: Requires server, manual indexing

```bash
# Install Meilisearch
curl -L https://install.meilisearch.com | sh

# Run server
./meilisearch --master-key="your-secret-key"
```

**Recommendation**: **Stick with Algolia** - best UX and zero maintenance

---

## Checklist

### Pre-Application

- [x] Site deployed to public URL (or staging)
- [x] Documentation structure finalized
- [x] Content reviewed and approved
- [ ] Ready to provide public access for crawler

### Application

- [ ] Application submitted to Algolia
- [ ] Confirmation email received
- [ ] Waiting for approval (1-3 days)

### Post-Approval

- [ ] Credentials received
- [ ] Configuration updated in docusaurus.config.js
- [ ] Site rebuilt with search enabled
- [ ] Search box visible
- [ ] Search functionality tested
- [ ] Analytics monitored

### Optimization

- [ ] Popular queries identified
- [ ] No-results queries addressed
- [ ] Synonyms configured (if needed)
- [ ] Click-through rate monitored

---

## Support & Resources

### Official Documentation

- [Algolia DocSearch](https://docsearch.algolia.com/)
- [Docusaurus Search Docs](https://docusaurus.io/docs/search)
- [Algolia Dashboard](https://www.algolia.com/dashboard)

### Community

- [Docusaurus Discord](https://discord.gg/docusaurus)
- [Algolia Community Forum](https://discourse.algolia.com/)

### TradingSystem Resources

- [Docusaurus Review Report](./DOCUSAURUS-REVIEW-REPORT-2025-11-02.md)
- [Next Steps Action Plan](./NEXT-STEPS-ACTION-PLAN.md)
- [Staging Test Report](./STAGING-TEST-REPORT-2025-11-02.md)

---

## Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| Application submission | 30 minutes | DocsOps |
| Algolia review | 1-3 days | Algolia |
| Configuration | 30 minutes | DocsOps |
| Testing | 1 hour | QA + DocsOps |
| **Total** | **~2 hours** + approval time | - |

---

**Status**: 📋 **READY TO APPLY** (after staging deployment)

**Next Action**: Deploy to staging, then submit Algolia application

---

**Last Updated**: 2025-11-02  
**Version**: 1.0.0

