---
title: Documentation Scripts
description: Utility scripts for maintaining Docusaurus documentation
tags: [scripts, documentation, maintenance]
owner: DocsOps
lastReviewed: 2025-10-25
---

# Documentation Maintenance Scripts

Utility scripts for fixing common issues in Docusaurus MDX documentation.

## fix-mdx-syntax.py

Automatically fixes common MDX compilation errors.

### What it fixes

1. **Less-than operators with numbers** (`<300`) → Converts to `&lt;300`
2. **Greater-than operators with numbers** (`>100`) → Converts to `&gt;100`
3. **Comparison operators** (`<=`, `>=`) → Converts to `&lt;=`, `&gt;=`
4. **Curly braces in prose** (e.g., state transitions) → Escapes with backslashes

### Usage

```bash
# Fix all MDX files in the content directory
python3 scripts/fix-mdx-syntax.py

# Fix MDX files in a specific directory
python3 scripts/fix-mdx-syntax.py /path/to/content
```

### Why these fixes are needed

MDX is a superset of Markdown that allows JSX components. This means:

- `<` characters are interpreted as opening tags
- `{` characters are interpreted as JavaScript expressions
- These must be escaped when used in prose (not code blocks)

### Examples

**Before:**
```markdown
- Performance: <500ms p95
- States: PENDING → {SUBMITTED, REJECTED}
```

**After:**
```markdown
- Performance: &lt;500ms p95
- States: PENDING → \{SUBMITTED, REJECTED\}
```

### Safety

The script:
- ✅ Skips code blocks (between \`\`\`)
- ✅ Only modifies files with actual issues
- ✅ Preserves file structure and formatting
- ✅ Reports all changes made

### When to use

Run this script when you see MDX compilation errors like:

- "Unexpected character `X` before name"
- "Could not parse expression with acorn"
- "Unexpected character at expected expect"

## Adding new scripts

When adding new maintenance scripts:

1. Document the script in this README
2. Add usage examples
3. Explain what it fixes and why
4. Make scripts executable: `chmod +x script.py`
5. Use Python 3 for consistency

## Troubleshooting

If the script doesn't fix your issue:

1. Check if the error is in a code block (scripts preserve these)
2. Look for custom JSX components that might need different syntax
3. Check the Docusaurus error message for specific line numbers
4. Review [MDX documentation](https://mdxjs.com/) for syntax rules
