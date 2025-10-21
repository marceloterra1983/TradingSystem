# Claude Code CLI Integration - TradingSystem

This file extends the main `CLAUDE.md` with specific configurations for Claude Code CLI usage.

## 📚 Quick Reference

**Main documentation**: See `../../CLAUDE.md` for complete project guidelines

**This file covers**:
- Claude Code CLI specific setup
- Custom commands usage
- MCP servers configuration
- CLI workflows and best practices

## 🔧 Claude Code CLI Setup

### Installation

Claude Code is installed globally and configured for this project:

```bash
# Verify installation
claude --version

# Check MCP servers
claude mcp list

# Run in project directory
cd /home/marce/projetos/TradingSystem
claude
```

### Configuration Files

- **Global config**: `~/.claude.json` - API key, user preferences
- **Project config**: `.claude-plugin` - Project-specific settings
- **MCP servers**: Configured per-project in `~/.claude.json`
- **Custom commands**: `.claude/commands/` - Project shortcuts

## 🎯 Custom Commands

Claude Code provides custom commands for common TradingSystem operations:

### Git Workflows
```bash
/git-workflows commit feat "Add new feature"
/git-workflows branch feature my-feature
/git-workflows status
/git-workflows push
```

### Docker Compose
```bash
/docker-compose start-all
/docker-compose stop-all
/docker-compose status
/docker-compose logs prometheus
```

### Health Check
```bash
/health-check all
/health-check services
/health-check containers
```

### Service Launcher
```bash
/service-launcher start dashboard
/service-launcher status
/service-launcher logs dashboard
```

### Scripts
```bash
/scripts start-all-stacks
/scripts health-check-all
/scripts validate-env
```

## 🔌 MCP Servers

The following MCP servers are configured for this project:

1. **fs-tradingsystem** - Filesystem access
2. **git-tradingsystem** - Git operations
3. **fetch** - HTTP requests
4. **memory** - Persistent memory
5. **sequential-thinking** - Extended reasoning
6. **time** - Date/time information
7. **everything** - Universal search

**Check status:**
```bash
claude mcp list
```

## 🚀 Common Workflows

### Starting Development Environment

```bash
# 1. Start infrastructure
/docker-compose start-all

# 2. Check health
/health-check all

# 3. Start development services
/service-launcher start all

# 4. Verify everything is running
/service-launcher status
```

### Making Code Changes

```bash
# 1. Create feature branch
/git-workflows branch feature my-feature

# 2. Make changes using Claude Code
claude "implement feature X following CLAUDE.md guidelines"

# 3. Run tests
/scripts test-all

# 4. Commit with conventional commits
/git-workflows commit feat "Add feature X"

# 5. Push changes
/git-workflows push
```

### Troubleshooting

```bash
# Check system health
/health-check all --format json

# Check service logs
/service-launcher logs <service-name>

# Check container logs
/docker-compose logs <container-name>

# Restart service
/service-launcher restart <service-name>

# Kill port if needed
/service-launcher kill-port <port>
```

## 📋 CLI Best Practices

### 1. Always Work from Project Root

```bash
cd /home/marce/projetos/TradingSystem
claude
```

### 2. Use Custom Commands for Common Tasks

Instead of typing full commands, use shortcuts:

❌ **Don't do this:**
```bash
cd backend/api/workspace && npm run dev
```

✅ **Do this:**
```bash
/service-launcher start workspace-api
```

### 3. Check Health Before Starting Work

```bash
/health-check all
```

### 4. Follow Project Guidelines

Claude Code automatically loads project rules from:
- `CLAUDE.md` - Main guidelines
- `.claude-plugin` - Project configuration
- `.claude/commands/` - Custom commands

### 5. Use MCP Servers for Enhanced Capabilities

```bash
# Use git MCP for complex operations
claude "use git to show history of file X"

# Use fetch MCP for API testing
claude "fetch https://localhost:3200/api/health"

# Use memory MCP to remember context
claude "remember that we're using Clean Architecture + DDD"
```

## 🎨 Terminal Integration (Cursor)

Claude Code works seamlessly in Cursor's integrated terminal (WSL2):

1. Open Cursor
2. Open integrated terminal (`Ctrl + ` ` or `View > Terminal`)
3. Terminal automatically uses WSL2
4. Run `claude` commands directly

**Benefits:**
- Same environment as development
- Access to all project files
- Integrated with Git
- MCP servers available

## 🔐 Authentication

**First time setup:**

1. Run Claude Code:
   ```bash
   claude
   ```

2. Follow authentication flow (browser-based)

3. For long-lived token (requires subscription):
   ```bash
   claude setup-token
   ```

**API Key location:** Stored securely in `~/.claude.json`

## ⚙️ Advanced Configuration

### Custom System Prompt

The project uses a custom system prompt defined in `.claude-plugin`:

```json
{
  "settings": {
    "systemPrompt": "You are an expert software engineer working on the TradingSystem project..."
  }
}
```

### Allowed Directories

Claude Code can only access specified directories:

```json
{
  "settings": {
    "allowedDirectories": [
      "/home/marce/projetos/TradingSystem"
    ]
  }
}
```

### Adding More Directories

```bash
claude --add-dir /path/to/directory
```

## 📖 Documentation Integration

Claude Code automatically references project documentation:

- **Architecture**: `docs/context/backend/architecture/`
- **APIs**: `docs/context/backend/api/`
- **Features**: `docs/context/frontend/features/`
- **Operations**: `docs/context/ops/`

**Example:**
```bash
claude "explain the health monitoring system"
# Claude will read docs/context/ops/health-monitoring.md
```

## 🐛 Troubleshooting

### MCP Server Connection Failed

```bash
# Check server status
claude mcp list

# Restart Claude Code
# MCP servers reconnect automatically
```

### Command Not Found

```bash
# Verify custom command exists
ls .claude/commands/

# Check command syntax in README
cat .claude/commands/README.md
```

### Authentication Issues

```bash
# Re-authenticate
claude setup-token
```

### Permission Errors

```bash
# Check allowed directories
cat ~/.claude.json | grep allowedDirectories

# Add directory if needed
claude --add-dir /home/marce/projetos/TradingSystem
```

## 📚 See Also

- **Main Guidelines**: `../../CLAUDE.md`
- **Custom Commands**: `.claude/commands/README.md`
- **Project Structure**: `../../docs/DIRECTORY-STRUCTURE.md`
- **Documentation Standard**: `../../docs/DOCUMENTATION-STANDARD.md`
- **Claude Code Repo**: https://github.com/anthropics/claude-code

