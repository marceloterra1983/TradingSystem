# Custom Commands - TradingSystem

This directory contains custom commands for Claude Code CLI, providing shortcuts and helpers for common TradingSystem operations.

## Available Commands

### 1. Git Workflows (`git-workflows.md`)
Git operations following project conventions (Conventional Commits, branch naming).

**Usage:**
```bash
/git-workflows commit feat "Add new feature"
/git-workflows branch feature my-feature
/git-workflows status
/git-workflows push
/git-workflows pr "Pull request title"
```

### 2. Docker Compose (`docker-compose.md`)
Docker Compose stack management for infrastructure services.

**Usage:**
```bash
/docker-compose start-all
/docker-compose stop-all
/docker-compose start infra
/docker-compose status
/docker-compose logs prometheus
```

### 3. Health Check (`health-check.md`)
Comprehensive health monitoring of services, containers, and databases.

**Usage:**
```bash
/health-check all
/health-check services
/health-check containers
/health-check databases
/health-check api
```

### 4. Service Launcher (`service-launcher.md`)
Start, stop, and manage local Node.js services.

**Usage:**
```bash
/service-launcher start dashboard
/service-launcher stop all
/service-launcher status
/service-launcher logs dashboard
/service-launcher ports
/service-launcher kill-port 3103
```

## How Commands Work

Custom commands are Markdown files that Claude Code reads and interprets. They provide:

1. **Documentation** - Detailed usage instructions
2. **Examples** - Real-world usage patterns
3. **Context** - Project-specific information
4. **Shortcuts** - Common operations simplified

When you invoke a command like `/git-workflows commit feat "My feature"`, Claude Code:
1. Reads the `git-workflows.md` file
2. Understands the command structure
3. Executes the appropriate Git commands
4. Follows project conventions (Conventional Commits)

## Creating New Commands

To add a new custom command:

1. Create a Markdown file: `.claude/commands/my-command.md`
2. Document the command with:
   - Title and description
   - Usage syntax
   - Available actions/options
   - Examples
   - Related documentation
3. Test the command: `/my-command <action>`

**Template:**
```markdown
# My Command - TradingSystem

Description of what this command does.

## Usage

\`\`\`bash
/my-command <action> [options]
\`\`\`

## Actions

### \`action-name\` - Action description
Details about the action.

**Example:**
\`\`\`bash
/my-command action-name
\`\`\`

## See Also

- [Related Documentation](../../docs/...)
```

## Command Conventions

### Naming
- Use kebab-case for command files: `my-command.md`
- Command names should be descriptive and specific
- Avoid generic names like `run`, `exec`, `do`

### Structure
- Start with project name: `# Command Name - TradingSystem`
- Include usage section with syntax
- Document all actions/options
- Provide examples for common use cases
- Link to related documentation

### Content
- Use Brazilian Portuguese (ptbr) for descriptions when appropriate
- Follow project guidelines from CLAUDE.md
- Include error handling and troubleshooting tips
- Reference actual scripts and tools used by the project

## Integration with Scripts

Commands should map to actual project scripts when possible:

**Direct mapping:**
```bash
/health-check all → bash scripts/maintenance/health-check-all.sh
/docker-compose start-all → bash start-all-stacks.sh
```

**Enhanced functionality:**
```bash
/service-launcher start dashboard → cd frontend/apps/dashboard && npm run dev
/git-workflows commit feat "Message" → git commit -m "feat: Message"
```

## Testing Commands

Before committing new commands, test them:

1. **Syntax check:**
   ```bash
   cat .claude/commands/my-command.md
   ```

2. **Command execution:**
   ```bash
   claude --print "/my-command help"
   ```

3. **Real-world usage:**
   ```bash
   claude "/my-command action"
   ```

## See Also

- [Claude Code Documentation](https://github.com/anthropics/claude-code)
- [Custom Commands Guide](https://docs.anthropic.com/claude/custom-commands)
- [TradingSystem CLAUDE.md](../../CLAUDE.md)
- [Service Startup Guide](../../docs/context/ops/service-startup-guide.md)








