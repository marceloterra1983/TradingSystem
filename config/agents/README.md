---
title: Agents Registry
sidebar_position: 1
tags: [automation, agents]
---

Agents Registry (local CLI)

This folder contains JSON manifests describing local agents: role, instructions, runtime, entrypoint, arguments and environment variables. The runner script can list, describe and execute agents without HTTP servers.

Manifest fields:
- id: unique identifier (kebab-case)
- name: human-friendly name
- version: semver string
- role: short purpose of the agent
- instructions: longer instructions/goals
- runtime: node | python
- entry: relative path to entry script
- env: list of environment variable names used
- argsSchema: JSON schema-like description of supported CLI args (name, type, default, description)
- schedule (optional): cron expression (documentation only)

Use scripts:
- npm run agent:list – list all agents
- npm run agent:describe -- <id> – show details
- npm run agent:run -- <id> [--args '{"k":"v"}'] – run with args

Legacy HTTP APIs were removed; the manifests now serve only the local CLI runners (Node.js or Python scripts).
