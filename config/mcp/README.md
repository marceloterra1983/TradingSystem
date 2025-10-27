---
title: MCP Configuration
sidebar_position: 10
tags:
  - mcp
  - configuration
domain: shared
type: index
summary: Project-scoped MCP server templates and environment mapping.
status: active
last_review: '2025-10-27'
---

# MCP Configuration

This directory contains project-scoped templates for configuring Model Context Protocol (MCP) servers used by Coding/Docs assistants (Claude Code CLI, OpenAI MCP-compatible tools, etc.).

Contents:
- `servers.json`: Declarative list of recommended MCP servers for TradingSystem
  - Filesystem (repo root)
  - GitHub (PRs, issues, reviews)
  - OpenAPI (Workspace/Documentation/TP Capital specs)
  - Docker Compose (tools/compose stacks)
  - PostgreSQL (frontend apps DB cluster)

Once environment variables are set (see `.env.example`), import these settings into your MCP client (e.g., copy into `~/.claude.json` or use the setup script below).

Setup helpers:
- `scripts/setup/mcp-config.sh` prints a ready-to-copy block for `~/.claude.json`

Notes:
- This repository does not ship MCP server binaries. Install the appropriate MCP servers for your client (filesystem, github, openapi, docker/compose, postgres). See `docs/content/mcp/connectors.mdx`.

