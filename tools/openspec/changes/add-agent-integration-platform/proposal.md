---
title: Add Agent Integration Platform
sidebar_position: 1
tags: [documentation]
domain: ops
type: guide
summary: The project currently has scattered agent-related files and configurations with inconsistent management approaches. Multiple agent systems (docs-merma...
status: active
last_review: "2025-10-23"
---

# Add Agent Integration Platform

## Why

The project currently has scattered agent-related files and configurations with inconsistent management approaches. Multiple agent systems (docs-mermaid-bot, docs-mermaid-lg, etc.) exist without centralized orchestration, monitoring, or lifecycle management. This creates operational overhead and makes it difficult to:

- Monitor agent health and performance across different frameworks
- Standardize agent configuration and deployment patterns
- Scale agent operations as the system grows
- Ensure consistent logging and observability
- Manage agent versions and updates safely

A unified Agent Integration Platform will provide centralized management, monitoring, and orchestration for all AI agents in the trading system ecosystem.

## What Changes

- **Create Agent Platform service** (Node.js/Express, Port 3600) with REST API for agent lifecycle management
- **Add agent registry** with QuestDB persistence for agent metadata, configurations, and status tracking
- **Implement agent orchestrator** for starting, stopping, and monitoring agents across different frameworks (LangGraph, custom Python, etc.)
- **Add health monitoring** with real-time status checks, resource usage tracking, and automatic restart policies
- **Create agent configuration management** with versioning, validation, and secure credential handling
- **Build unified logging** with structured JSONL logs aggregation from all agents
- **Add web dashboard** for agent management UI with status overviews and controls
- **Implement agent communication bus** for inter-agent messaging and event coordination
- **Add backup/restore** capabilities for agent configurations and state

## Impact

- **Affected specs**: Creates new `agent-platform` capability
- **Affected code**:
  - `backend/api/agent-platform/` - New service for agent orchestration
  - `infrastructure/agent-platform/` - Docker compose and configs
  - `frontend/dashboard/src/components/agents/` - React UI for agent management
  - `frontend/dashboard/src/services/agentService.ts` - API client
  - QuestDB schemas - New `agents` and `agent_metrics` tables
  - Consolidated agent configurations from scattered locations

- **Dependencies**:
  - Backend: `node-cron`, `ps-tree`, `ws`, `joi` (new)
  - Infrastructure: Docker network for agent communication
  - Monitoring: Prometheus metrics for agent health

- **Breaking changes**: None (new functionality, existing agents can be migrated incrementally)

- **Migration path**: Existing agents can be registered and managed without code changes initially