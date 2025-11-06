# GitHub Actions Workflows - Análise Profunda

**Data:** 2025-11-06 00:01:50
**Total de workflows:** 21

## 📊 Problemas Identificados

### 1. Uso Incorreto de Secrets

✅ Nenhum problema encontrado

### 2. Padrões FREEZE-NOTICE.md

**Workflows usando FREEZE-NOTICE.md:** 9

**Padrões de detecção encontrados:**

- `if grep -Eiq '(\*\*)?status(\*\*)?[^\n]*:\s*active' FREEZE-NOTICE.md; then`
- `status_line=$(grep -i '^\*\*Status' FREEZE-NOTICE.md 2>/dev/null | head -n1 | tr -d '\r')`
- `status_line=$(grep -i '^\*\*Status' FREEZE-NOTICE.md 2>/dev/null | head -n1 | tr -d '\r')`

### 3. Actions Deprecated ou Antigas

✅ Todas as actions estão atualizadas

### 4. Jobs com Dependência de Freeze Guard

- **code-quality.yml** - depende do freeze_guard
