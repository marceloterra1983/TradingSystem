---
title: Documentation Search Guide
sidebar_position: 45
tags: [shared, tools, search, guide, facets, filters]
domain: shared
type: guide
summary: User guide for advanced documentation search with faceted filtering by domain, type, tags, and status
status: active
last_review: 2025-10-18
---

# Documentation Search Guide

## Overview

The TradingSystem documentation site features an advanced faceted search system that allows you to quickly find relevant documentation across 195+ files. The search supports full-text queries combined with powerful filters for domain, document type, tags, and status.

### Key Features

-   **Full-text search** across all documentation content
-   **Faceted filtering** by domain, type, tags, and status
-   **Real-time result counts** showing available documents in each filter
-   **Autocomplete suggestions** with context (domain/type)
-   **Shareable URLs** - bookmark or share searches with filters
-   **100% local execution** - no external search services

## Quick Start

### Basic Search

1. **Access the search page:**

    - Click the "Search" link in the navbar
    - Or press `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac) from any page
    - Direct URL: `http://localhost:3004/search`

2. **Enter your search query:**

    - Type keywords in the search box
    - Results appear automatically after a short delay
    - Minimum 2 characters required

3. **Apply filters** (optional):

    - Select filters in the left sidebar
    - Results update immediately
    - Facet counts show how many documents match each filter

4. **Click a result** to navigate to the document

### Keyboard Shortcuts

-   `Ctrl+K` / `Cmd+K` - Focus search input
-   `Escape` - Clear search and close suggestions
-   `Arrow Up/Down` - Navigate autocomplete suggestions
-   `Enter` - Navigate to selected suggestion or execute search

## Search Syntax

### Simple Queries

Search for individual keywords or phrases:

```
dark mode
```

### Multi-word Queries

Search for multiple words (results contain all words):

```
implementation guide
```

### Exact Phrases (if supported)

Use quotes for exact phrase matching:

```
"customizable layout"
```

:::note
Wildcard searches (`*`) are not currently supported by FlexSearch.
:::

## Faceted Filters

### Domain Filter

Narrow results to a specific area of the system:

-   **Frontend** - React dashboard, UI components, frontend architecture
-   **Backend** - APIs, services, data schemas, backend architecture
-   **Ops** - Deployment, monitoring, infrastructure, runbooks
-   **Shared** - Product specs, templates, diagrams, cross-cutting concerns

**Example:** Find all frontend documentation  
URL: `?domain=frontend`

### Type Filter

Filter by document type to find specific kinds of documentation:

-   **Guide** - Implementation guides, tutorials, how-tos
-   **Reference** - API references, technical specifications
-   **ADR** - Architecture Decision Records
-   **PRD** - Product Requirements Documents
-   **RFC** - Request for Comments
-   **Runbook** - Operational procedures
-   **Overview** - High-level system overviews
-   **Index** - Catalog/navigation pages
-   **Glossary** - Term definitions
-   **Template** - Document templates
-   **Feature** - Feature specifications

**Example:** Find all implementation guides  
URL: `?type=guide`

### Tags Filter

Search by topic or category using tags. You can select multiple tags (AND logic - results must have all selected tags).

**Popular tags:**

-   `frontend`, `backend`, `api`, `guide`
-   `deployment`, `ui`, `layout`
-   And 40+ more...

**Example:** Find documents about UI and dark mode  
URL: `?tags=ui,dark-mode`

### Status Filter

Filter by document lifecycle status:

-   **Active** - Current, maintained documentation
-   **Draft** - Work in progress
-   **Deprecated** - Outdated, kept for reference only

**Example:** Find all active documents  
URL: `?status=active`

### Combining Filters

All filters work together (AND logic). For example:

**Find active frontend guides about deployment:**

```
?domain=frontend&type=guide&status=active&tags=deployment
```

**Find backend API references:**

```
?domain=backend&type=reference&tags=api
```

## Filter Examples

### Common Search Patterns

#### 1. Find all frontend guides

```
?domain=frontend&type=guide
```

#### 2. Search dark mode in frontend

```
?q=dark+mode&domain=frontend
```

#### 3. Find all ADRs

```
?type=adr
```

#### 4. Find deployment runbooks

```
?domain=ops&type=runbook&tags=deployment
```

#### 5. Find draft documents

```
?status=draft
```

#### 6. Search by multiple tags

```
?tags=ui,dark-mode,theming
```

#### 7. Find active deployment documentation

```
?q=deployment&domain=ops&type=runbook&status=active
```

## Shareable URLs

### Bookmarking Searches

1. Perform a search with your desired query and filters
2. Copy the URL from your browser's address bar
3. Save as a bookmark or share with team members

**Example bookmark:** "Active Frontend Guides"

```
http://localhost:3004/search?domain=frontend&type=guide&status=active
```

### Team Collaboration

Share search URLs in:

-   Slack/Teams messages
-   Documentation references
-   Onboarding guides
-   Issue trackers

**Example:** "Check these deployment guides"

```
http://localhost:3004/search?q=deployment&domain=ops&type=guide
```

## Search Tips

### 1. Use Specific Terms

❌ Bad: `impl`  
✅ Good: `implementation`

Specific terms provide better results than abbreviations.

### 2. Combine Filters for Precision

Instead of a broad query, use filters to narrow down:

❌ Searching: `api backend`  
✅ Better: Search `api` with filter `domain=backend, type=reference`

### 3. Check Facet Counts

Before applying a filter, check the count badge to see how many documents match. Filters with `0` count are disabled.

### 4. Use Tags for Topic Discovery

If you're not sure what document type you need, start with tag filters:

**Example:** Want to learn about dark mode?  
Filter by `tags=dark-mode` to see all related documentation types (guides, ADRs, etc.)

### 5. Try Different Filter Combinations

Don't stick to one approach:

1. Try broad search first
2. Apply domain filter
3. Add type filter if still too many results
4. Use tags for specific topics

## Troubleshooting

### No Results Found

**Possible causes:**

1. **Too specific filters** - Remove some filters and try again
2. **Spelling errors** - Check keyword spelling
3. **Wrong filter combination** - Try different filters

**Solutions:**

-   Click "Clear all filters" to reset
-   Use broader search terms
-   Check if the topic exists in another domain

### Slow Search

**If search feels slow:**

1. Check Documentation API is running: `curl http://localhost:3400/health`
2. Check network connection
3. Reduce result limit (controlled by backend)
4. Clear browser cache

### Missing Documents

**If expected documents don't appear:**

1. Verify the document has proper frontmatter (domain, type, tags, status)
2. Trigger manual reindex: `curl -X POST http://localhost:3400/api/v1/docs/reindex`
3. Check document is in `docs/context/` directory

### CORS Errors

**If you see CORS errors in browser console:**

1. Ensure CORS_ORIGIN in root `.env` includes `http://localhost:3004`
2. Restart Documentation API after `.env` changes
3. Clear browser cache and reload

## Advanced Features

### Autocomplete Suggestions

As you type in the search box, suggestions appear:

-   Suggestions include document title, domain, and type
-   Use arrow keys to navigate
-   Press Enter to navigate directly to suggested document
-   Click outside or press Escape to close

### Recent Searches (Future)

Coming soon: Your recent searches will be saved locally for quick access.

### Export Results (Future)

Coming soon: Export search results to CSV for offline analysis.

## API Access (For Developers)

### Search Endpoint

```bash
GET http://localhost:3400/api/v1/docs/search

# Query parameters:
# - q: Search query (required if not using filters)
# - domain: Filter by domain (frontend|backend|ops|shared)
# - type: Filter by type (guide|reference|adr|prd|etc.)
# - tags: Comma-separated tags
# - status: Filter by status (active|draft|deprecated)
# - limit: Max results (1-100, default: 20)

# Example:
curl 'http://localhost:3400/api/v1/docs/search?q=dark+mode&domain=frontend&type=guide' | jq
```

### Facets Endpoint

```bash
GET http://localhost:3400/api/v1/docs/facets

# Query parameters:
# - q: Optional query to filter facets

# Example:
curl 'http://localhost:3400/api/v1/docs/facets?q=deployment' | jq
```

### Suggest Endpoint

```bash
GET http://localhost:3400/api/v1/docs/suggest

# Query parameters:
# - q: Partial query (required, min 2 chars)
# - limit: Max suggestions (1-10, default: 5)

# Example:
curl 'http://localhost:3400/api/v1/docs/suggest?q=dark&limit=5' | jq
```

### Reindex Endpoint

```bash
POST http://localhost:3400/api/v1/docs/reindex

# Trigger manual reindexing of all documentation

# Example:
curl -X POST 'http://localhost:3400/api/v1/docs/reindex' | jq
```

## Search Analytics

### Metrics Tracked

The search system tracks usage via Prometheus metrics:

-   **Total searches** - How often search is used
-   **Filter usage** - Which filters are most popular
-   **Popular tags** - Most searched tags
-   **Zero-result queries** - Searches with no results (helps identify content gaps)
-   **Search performance** - Response times

### View Metrics

```bash
curl http://localhost:3400/metrics | grep docs_search
```

### Grafana Dashboard (Future)

Coming soon: Visual dashboard showing:

-   Search volume over time
-   Popular queries and filters
-   Content gap analysis (zero-result queries)
-   Search performance trends

## Related Documentation

-   [Documentation Standard](../../DOCUMENTATION-STANDARD.md) - Frontmatter requirements for searchable docs
-   [Documentation API](../../backend/api/documentation-api/implementation-plan.md) - Backend search API details
-   [Automated Code Quality](../../ops/automated-code-quality.md) - CI/CD documentation validation

## Support

For search-related issues:

1. Check this guide's troubleshooting section
2. Verify Documentation API is running (`curl http://localhost:3400/health`)
3. Check browser console for errors
4. Review backend logs for search errors
5. Report issues via GitHub with search query and filters used

