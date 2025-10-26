---
title: Windows Native Deployment
sidebar_position: 10
tags: [ops, deployment, windows, runbook]
domain: ops
type: runbook
summary: Steps to build and publish TradingSystem services on Windows
status: active
last_review: "2025-10-17"
---

# Windows Native Deployment

## Prerequisites

- .NET 8 SDK.
- Python 3.11 (suporte a tooling e scripts).
- Node.js 18 (Idea Bank / Documentation APIs).
- ProfitDLL installed and configured on the host.

## Build

1. `dotnet build TradingSystem.sln -c Release --arch x64`
2. `npm install --omit=dev && npm run build` for Node services if needed.

## Install / Run as Services

- Use PowerShell scripts under `tools/scripts/` (e.g., `install-windows-services.ps1`) to register Windows services.
- Ensure services run under dedicated accounts with least privilege.

## Verification

- `sc.exe query TradingSystem-*`
- Check `/health` endpoints (Idea Bank, Documentation, API Gateway).
- Access dashboard at `http://localhost:5173` or target host.

## Rollback

- Follow `deployment/rollback-playbook.md` for steps to revert.
