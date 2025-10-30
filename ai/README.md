# AI Agent Instructions

This directory contains instructions and guidelines for AI assistants working with the TradingSystem codebase.

## Files

### AGENTS.md
Repository guidelines for AI agents, including:
- Project structure and module organization
- Build, test, and development commands
- Coding conventions and best practices

### GEMINI.md
Gemini-specific instructions and configurations.

## Main Instructions

**The canonical AI instruction file is `/CLAUDE.md` in the project root.**

This file contains comprehensive guidelines for:
- Project overview and architecture
- Service dependencies and Docker configurations
- Development workflows
- Documentation standards
- Security and configuration management

## Why This Directory?

AI-specific instructions are separated from the main codebase to:
- Keep the project root clean
- Organize AI-related documentation in one place
- Make it easy to manage different AI assistant configurations
- Avoid confusion between user-facing docs and AI instructions

## Usage

When working with this codebase:
1. Always read `/CLAUDE.md` first (canonical source)
2. Refer to `AGENTS.md` for repository-specific guidelines
3. Check `GEMINI.md` if using Gemini

## Updates

When updating AI instructions:
- Update `/CLAUDE.md` for general guidelines (affects all AI assistants)
- Update files in this directory for assistant-specific configurations
- Keep instructions synchronized across files where applicable
