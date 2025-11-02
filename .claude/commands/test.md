# Test Command

Execute testes unitários com Vitest.

## Usage

```bash
/test [target] [options]
```

## Targets

- `frontend` - Test frontend/dashboard (default)
- `backend` - Test all backend APIs
- `all` - Test frontend + backend

## Options

- `--coverage` - Generate coverage report
- `--watch` - Watch mode (re-run on changes)
- `--file <name>` - Run specific test file
- `--only-failed` - Run only failed tests
- `--ui` - Open Vitest UI

## Examples

```bash
# Run all frontend tests
/test

# Run with coverage
/test --coverage

# Watch mode
/test --watch

# Specific test file
/test --file DocsHybridSearchPage

# Only failed tests
/test --only-failed

# All tests (frontend + backend)
/test all --coverage
```

## Implementation

```bash
# Frontend tests
if [[ "{{target}}" == "frontend" ]] || [[ "{{target}}" == "" ]]; then
  cd frontend/dashboard

  if [[ "{{args}}" == *"--coverage"* ]]; then
    npm run test:coverage
  elif [[ "{{args}}" == *"--watch"* ]]; then
    npm test -- --watch
  elif [[ "{{args}}" == *"--ui"* ]]; then
    npm test -- --ui
  elif [[ "{{args}}" == *"--file"* ]]; then
    test_name=$(echo "{{args}}" | grep -oP '(?<=--file )\S+')
    npm test "$test_name"
  elif [[ "{{args}}" == *"--only-failed"* ]]; then
    npm test -- --only-failed
  else
    npm test
  fi

  cd ../..
fi

# Backend tests
if [[ "{{target}}" == "backend" ]] || [[ "{{target}}" == "all" ]]; then
  for api in backend/api/*/; do
    cd "$api"
    if [[ -f "package.json" ]] && grep -q '"test"' package.json; then
      echo "Testing $api..."
      npm test
    fi
    cd ../../..
  done
fi
```

## Coverage Report

After running with `--coverage`, open the report:

```bash
# Linux
xdg-open frontend/dashboard/coverage/index.html

# macOS
open frontend/dashboard/coverage/index.html

# Windows (WSL)
explorer.exe frontend/dashboard/coverage/index.html
```

## Coverage Targets

- **Statements**: ≥ 80%
- **Branches**: ≥ 75%
- **Functions**: ≥ 80%
- **Lines**: ≥ 80%

## Test File Patterns

- `*.spec.ts` - Unit tests
- `*.test.ts` - Unit tests
- `*.spec.tsx` - Component tests
- `*.test.tsx` - Component tests

## Related Commands

- `/quality-check` - Full quality check (includes tests)
- `/lint` - Linting only
- `/type-check` - TypeScript verification
