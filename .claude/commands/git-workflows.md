# Git Workflows - TradingSystem

Custom command for Git operations following project conventions.

## Usage

```bash
/git-workflows <action> [arguments]
```

## Actions

### `commit` - Create conventional commit
Creates a commit following Conventional Commits standard.

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `chore:` - Maintenance tasks
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `style:` - Code style changes
- `perf:` - Performance improvements
- `ci:` - CI/CD changes

**Examples:**
```bash
/git-workflows commit feat "Add Claude Code integration"
/git-workflows commit fix "Resolve MCP connection timeout"
/git-workflows commit docs "Update CLAUDE.md with new guidelines"
```

### `branch` - Create feature branch
Creates a new branch following naming conventions.

**Patterns:**
- `feature/<name>` - New features
- `fix/<name>` - Bug fixes
- `docs/<name>` - Documentation updates
- `refactor/<name>` - Code refactoring

**Examples:**
```bash
/git-workflows branch feature claude-code-setup
/git-workflows branch fix mcp-connection-error
```

### `status` - Check repository status
Shows current branch, uncommitted changes, and pending commits.

**Example:**
```bash
/git-workflows status
```

### `push` - Push changes with safety checks
Pushes changes to remote with pre-push validation.

**Checks:**
- No uncommitted changes
- No pending migrations
- All tests passing (if configured)

**Example:**
```bash
/git-workflows push
```

### `pr` - Create pull request template
Generates PR description following project template.

**Example:**
```bash
/git-workflows pr "Add Claude Code CLI integration"
```

## Configuration

Git user configuration for TradingSystem:
- Conventional Commits enforced
- Branch protection on `main`
- PR reviews required for merging

## See Also

- [Git Conventional Commits](https://www.conventionalcommits.org/)
- [TradingSystem Git Guidelines](../../docs/context/ops/git-guidelines.md)








