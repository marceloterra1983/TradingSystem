# Format Command

Execute Prettier para formatação de código.

## Usage

```bash
/format [target] [options]
```

## Targets

- `frontend` - Format frontend/dashboard (default)
- `backend` - Format all backend code
- `all` - Format frontend + backend
- `<path>` - Format specific file or directory

## Options

- `--check` - Only check (don't modify files)
- `--staged` - Format only staged files (Git)

## Examples

```bash
# Format frontend
/format

# Check only (no changes)
/format --check

# Format specific file
/format src/components/pages/DocsHybridSearchPage.tsx

# Format specific directory
/format src/components/

# Format only staged files
/format --staged

# Format all code
/format all
```

## Implementation

```bash
# Frontend
if [[ "{{target}}" == "frontend" ]] || [[ "{{target}}" == "" ]]; then
  cd frontend/dashboard

  if [[ "{{args}}" == *"--check"* ]]; then
    npx prettier --check src/
  elif [[ "{{args}}" == *"--staged"* ]]; then
    npx prettier --write $(git diff --cached --name-only --diff-filter=ACMR "*.ts" "*.tsx" "*.js" "*.jsx" "*.json" "*.css" "*.md")
  else
    npx prettier --write src/
  fi

  cd ../..
fi

# Specific path
if [[ "{{target}}" != "frontend" ]] && [[ "{{target}}" != "backend" ]] && [[ "{{target}}" != "all" ]] && [[ "{{target}}" != "" ]]; then
  npx prettier --write "{{target}}"
fi

# Backend
if [[ "{{target}}" == "backend" ]] || [[ "{{target}}" == "all" ]]; then
  for api in backend/api/*/; do
    cd "$api"
    if [[ -f ".prettierrc" ]] || [[ -f "package.json" ]]; then
      echo "Formatting $api..."
      npx prettier --write src/
    fi
    cd ../../..
  done
fi
```

## Prettier Configuration

`.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

## File Types Formatted

- JavaScript/TypeScript: `.js`, `.jsx`, `.ts`, `.tsx`
- JSON: `.json`
- CSS: `.css`, `.scss`
- HTML: `.html`
- Markdown: `.md`

## VSCode Integration

Install extension:
```bash
code --install-extension esbenp.prettier-vscode
```

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## Pre-commit Hook

Setup with Husky:

```bash
# Install
npm install --save-dev husky lint-staged

# Init
npx husky init

# Add hook
echo "npx lint-staged" > .husky/pre-commit
```

`package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,json,css,md}": [
      "prettier --write"
    ]
  }
}
```

## Ignore Files

`.prettierignore`:
```
dist/
build/
coverage/
node_modules/
*.min.js
*.bundle.js
package-lock.json
```

## Common Formatting

### Before
```typescript
const user={name:"John",age:30,city:"NYC"}
function greet(name){return "Hello "+name}
```

### After
```typescript
const user = {
  name: 'John',
  age: 30,
  city: 'NYC',
};

function greet(name) {
  return 'Hello ' + name;
}
```

## Check Format in CI

```yaml
# .github/workflows/format.yml
- name: Check Format
  run: |
    cd frontend/dashboard
    npx prettier --check src/
```

## Related Commands

- `/lint` - ESLint (includes some formatting rules)
- `/quality-check` - Full quality check
- `/fix-all` - Auto-fix linting + formatting
