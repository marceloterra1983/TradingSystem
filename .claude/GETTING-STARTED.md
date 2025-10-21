# Getting Started - Claude Code CLI

Quick start guide for using Claude Code CLI with TradingSystem project.

## 📋 Prerequisites

✅ **Completed** (during installation):
- [x] Node.js v18+ installed (v22.20.0 detected)
- [x] Claude Code v2.0.22 installed globally
- [x] MCP servers configured (7 servers)
- [x] Custom commands created (5 commands)
- [x] Project configuration set up

⏳ **Required** (you need to do):
- [ ] Anthropic API key (free tier available)
- [ ] First-time authentication

## 🔐 Authentication Setup

### Step 1: Get API Key

1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy your API key (starts with `sk-ant-...`)

**Free tier includes:**
- $5 free credit
- No credit card required
- Perfect for testing

### Step 2: Authenticate Claude Code

**Option A: Interactive Login (Recommended)**

```bash
cd /home/marce/projetos/TradingSystem
claude
```

Follow the authentication flow in your browser.

**Option B: Setup Token (Requires Subscription)**

```bash
claude setup-token
```

For long-lived tokens with Claude Pro/Team subscription.

### Step 3: Verify Authentication

```bash
# Test with simple query
claude --print "What is the current date?"

# Test with project context
claude --print "List files in .claude directory"

# Test MCP servers
claude mcp list
```

**Expected output:** Claude responds normally without "Invalid API key" error.

## 🚀 First Commands

Once authenticated, try these commands:

### 1. Check System Health

```bash
cd /home/marce/projetos/TradingSystem
claude --print "/health-check services"
```

### 2. List Custom Commands

```bash
claude --print "What custom commands are available?"
```

### 3. Interactive Session

```bash
claude
```

Then try:
```
/health-check all
/service-launcher status
/git-workflows status
```

## 📚 Available Custom Commands

Once authenticated, you can use:

| Command | Description |
|---------|-------------|
| `/git-workflows` | Git operations (commit, branch, push) |
| `/docker-compose` | Docker stack management |
| `/health-check` | System health monitoring |
| `/service-launcher` | Service management |
| `/scripts` | Project automation scripts |

**Full documentation**: See [commands/README.md](commands/README.md)

## 🔌 MCP Servers Configured

| Server | Status | Description |
|--------|--------|-------------|
| fs-tradingsystem | ✅ | Filesystem access |
| git-tradingsystem | ⚠️ | Git operations |
| fetch | ⚠️ | HTTP requests |
| memory | ✅ | Persistent memory |
| sequential-thinking | ✅ | Extended reasoning |
| time | ⚠️ | Date/time info |
| everything | ✅ | Universal search |

**Note:** ⚠️ servers connect when needed (connection on-demand).

**Check status:**
```bash
claude mcp list
```

## 🖥️ Terminal Integration (Cursor)

### Using Claude Code in Cursor Terminal

1. **Open Cursor**
2. **Open Terminal**: `Ctrl + `` ` or `View > Terminal`
3. **Verify WSL2**: Terminal should show WSL2 prompt
4. **Run Claude Code**:
   ```bash
   cd /home/marce/projetos/TradingSystem
   claude
   ```

### Benefits

- ✅ Same environment as development
- ✅ Access to all project files
- ✅ Integrated with Git
- ✅ Custom commands available
- ✅ MCP servers accessible

## 🎯 Common Workflows

### Development Workflow

```bash
# 1. Start infrastructure
/docker-compose start-all

# 2. Check health
/health-check all

# 3. Start services
/service-launcher start dashboard

# 4. Make changes with Claude
claude "implement feature X"

# 5. Commit changes
/git-workflows commit feat "Add feature X"
```

### Troubleshooting Workflow

```bash
# 1. Check overall health
/health-check all

# 2. Check specific service
/service-launcher status

# 3. View logs
/service-launcher logs dashboard

# 4. Restart if needed
/service-launcher restart dashboard
```

## 📖 Next Steps

After completing authentication:

1. **Read main guidelines**: [`CLAUDE.md`](../../CLAUDE.md)
2. **Explore custom commands**: [`commands/README.md`](commands/README.md)
3. **Check CLI guide**: [`CLAUDE-CLI.md`](CLAUDE-CLI.md)
4. **Try a simple task**: `/health-check services`

## ❓ Troubleshooting

### "Invalid API key" Error

**Solution**: Complete authentication setup (see Step 2 above)

### MCP Connection Failed

**Issue**: Normal for some servers (connect on-demand)

**Check**: `claude mcp list` should show at least 4 connected

**If all fail**:
```bash
# Verify npx works
npx --version

# Verify MCP packages
npx -y @modelcontextprotocol/server-filesystem --version
```

### Command Not Found

**Issue**: Custom commands not recognized

**Solution**: Verify you're in project directory
```bash
cd /home/marce/projetos/TradingSystem
pwd
```

### Permission Denied

**Issue**: Claude Code can't access files

**Solution**: Check allowed directories
```bash
cat ~/.claude.json | grep allowedDirectories
```

Should include: `/home/marce/projetos/TradingSystem`

## 🆘 Getting Help

### Documentation

- **Main Guide**: [`CLAUDE.md`](../../CLAUDE.md)
- **CLI Guide**: [`CLAUDE-CLI.md`](CLAUDE-CLI.md)
- **Commands**: [`commands/README.md`](commands/README.md)
- **Project Structure**: [`../../docs/DIRECTORY-STRUCTURE.md`](../../docs/DIRECTORY-STRUCTURE.md)

### Commands

```bash
# General help
claude --help

# MCP help
claude mcp --help

# Plugin help
claude plugin --help
```

### Resources

- **Claude Code Repo**: https://github.com/anthropics/claude-code
- **Anthropic Console**: https://console.anthropic.com/
- **Anthropic Docs**: https://docs.anthropic.com/

## 🎉 Ready to Start!

Once authenticated, you're ready to use Claude Code with TradingSystem:

```bash
cd /home/marce/projetos/TradingSystem
claude

# Try your first command
/health-check all

# Or ask Claude to help
"Help me start the dashboard service"
```

**Welcome to Claude Code CLI + TradingSystem! 🚀**

