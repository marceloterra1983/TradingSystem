# Lint Command

Execute ESLint para verificar qualidade de código JavaScript/TypeScript.

## Usage

```bash
/lint [target] [options]
```

## Targets

- `frontend` - Lint frontend/dashboard (default)
- `backend` - Lint all backend APIs
- `workspace` - Lint workspace API
- `all` - Lint frontend + backend

## Options

- `--fix` - Auto-fix linting issues
- `--file <path>` - Lint specific file

## Examples

```bash
# Lint frontend
/lint

# Lint with auto-fix
/lint --fix

# Lint backend
/lint backend

# Lint specific file
/lint --file src/components/pages/DocsHybridSearchPage.tsx

# Lint everything
/lint all --fix
```

## Implementation

```bash
# Frontend
if [[ "{{target}}" == "frontend" ]] || [[ "{{target}}" == "" ]]; then
  cd frontend/dashboard
  if [[ "{{args}}" == *"--fix"* ]]; then
    npm run lint:fix
  else
    npm run lint
  fi
  cd ../..
fi

# Backend
if [[ "{{target}}" == "backend" ]] || [[ "{{target}}" == "all" ]]; then
  for api in backend/api/*/; do
    cd "$api"
    if [[ -f "package.json" ]] && grep -q '"lint"' package.json; then
      if [[ "{{args}}" == *"--fix"* ]]; then
        npm run lint:fix
      else
        npm run lint
      fi
    fi
    cd ../../..
  done
fi

# Specific file
if [[ "{{args}}" == *"--file"* ]]; then
  file_path=$(echo "{{args}}" | grep -oP '(?<=--file )\S+')
  npx eslint "$file_path" $(echo "{{args}}" | grep -q -- "--fix" && echo "--fix")
fi
```

## Common Issues Fixed

- `no-unused-vars` - Remove unused variables
- `no-console` - Remove console.log statements
- `eqeqeq` - Replace `==` with `===`
- `semi` - Add missing semicolons
- `quotes` - Standardize quote style

## Related Commands

- `/quality-check` - Full quality check
- `/format` - Prettier formatting
- `/type-check` - TypeScript verification
