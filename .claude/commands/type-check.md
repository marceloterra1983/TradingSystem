# Type Check Command

Execute verificação de tipos TypeScript sem gerar arquivos.

## Usage

```bash
/type-check [target] [options]
```

## Targets

- `frontend` - Check frontend/dashboard (default)
- `backend` - Check backend TypeScript files
- `all` - Check all TypeScript code

## Options

- `--file <path>` - Check specific file
- `--watch` - Watch mode (re-check on changes)
- `--pretty` - Pretty output with colors

## Examples

```bash
# Check frontend types
/type-check

# Check with pretty output
/type-check --pretty

# Check specific file
/type-check --file src/components/pages/DocsHybridSearchPage.tsx

# Watch mode
/type-check --watch

# Check all
/type-check all
```

## Implementation

```bash
# Frontend
if [[ "{{target}}" == "frontend" ]] || [[ "{{target}}" == "" ]]; then
  cd frontend/dashboard

  if [[ "{{args}}" == *"--watch"* ]]; then
    npx tsc --noEmit --watch
  elif [[ "{{args}}" == *"--pretty"* ]]; then
    npx tsc --noEmit --pretty
  elif [[ "{{args}}" == *"--file"* ]]; then
    file_path=$(echo "{{args}}" | grep -oP '(?<=--file )\S+')
    npx tsc --noEmit "$file_path"
  else
    npx tsc --noEmit
  fi

  cd ../..
fi

# Backend (if TypeScript)
if [[ "{{target}}" == "backend" ]] || [[ "{{target}}" == "all" ]]; then
  for api in backend/api/*/; do
    cd "$api"
    if [[ -f "tsconfig.json" ]]; then
      echo "Type checking $api..."
      npx tsc --noEmit
    fi
    cd ../../..
  done
fi
```

## Common Type Errors

### TS2345 - Argument type mismatch
```typescript
// ❌ Error
function greet(name: string) { }
greet(123);

// ✅ Fix
greet("John");
```

### TS2322 - Type incompatible
```typescript
// ❌ Error
const num: number = "hello";

// ✅ Fix
const num: number = 42;
```

### TS2339 - Property not found
```typescript
// ❌ Error
interface User { name: string; }
const user: User = { name: "John" };
console.log(user.age);

// ✅ Fix
interface User { name: string; age?: number; }
const user: User = { name: "John", age: 30 };
console.log(user.age);
```

### TS7006 - Implicit any
```typescript
// ❌ Error
function add(a, b) {
  return a + b;
}

// ✅ Fix
function add(a: number, b: number): number {
  return a + b;
}
```

## TypeScript Config

Frontend uses strict TypeScript config:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

## Performance Tips

For faster type checking:

```bash
# Incremental mode (caches type info)
npx tsc --noEmit --incremental

# Skip library checks
npx tsc --noEmit --skipLibCheck
```

## Related Commands

- `/quality-check` - Full quality check (includes type check)
- `/lint` - ESLint verification
- `/build` - Production build (includes type check)
