---
title: Infrastructure Inventory Reports
sidebar_position: 1
tags: [documentation]
domain: shared
type: index
summary: Infrastructure Inventory Reports
status: active
last_review: 2025-10-22
---

# Infrastructure Inventory Reports

This directory stores infrastructure inventory snapshots in tabular formats such as Excel and CSV files. These reports capture point-in-time states for containers, services, ports, and runtime characteristics.

## Current Files
- `docker-containers.xlsx` – inventory of 28 containers with ports and stack membership
- `docker-container-groups.xlsx` – container grouping by category (data, infra, monitoring, docs, firecrawl, apps)
- `docker-containers-runtime.xlsx` – runtime snapshot with resource usage observations

## Purpose
Use these files to review historical infrastructure snapshots collected during maintenance or audit sessions. For real-time status, rely on automated health checks instead of these static reports.

## Preferred Format
Excel workbooks (`.xlsx`) are preferred for easier filtering and visualization. CSV exports are acceptable when spreadsheets are unavailable.

## Related Documentation
Refer to `docs/context/ops/tools/container-naming.md` for naming conventions and broader infrastructure context.
