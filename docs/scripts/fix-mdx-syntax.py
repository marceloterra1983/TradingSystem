#!/usr/bin/env python3
"""
Fix common MDX syntax issues that cause compilation errors.

This script handles:
1. < followed by numbers (e.g., <300) - converts to &lt;
2. > followed by numbers (e.g., >100) - converts to &gt;
3. Curly braces in prose that MDX interprets as JSX expressions
"""

import os
import re
from pathlib import Path
import sys

def fix_mdx_syntax(filepath):
    """Fix MDX syntax issues in a file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    original_content = ''.join(lines)
    fixed_lines = []
    in_code_block = False
    changes_made = False

    for line in lines:
        original_line = line

        # Track code blocks to avoid modifying code
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            fixed_lines.append(line)
            continue

        # Skip lines in code blocks
        if in_code_block:
            fixed_lines.append(line)
            continue

        # Fix 1: Replace < followed by digit with &lt;
        line = re.sub(r'(?<!&)(<)(\d)', r'&lt;\2', line)

        # Fix 2: Replace <= with &lt;=
        line = re.sub(r'(?<!&)(<)(=)', r'&lt;\2', line)

        # Fix 3: Replace > followed by digit with &gt;
        line = re.sub(r'(?<!&)(>)(\d)', r'&gt;\2', line)

        # Fix 4: Replace >= with &gt;=
        line = re.sub(r'(?<!&)(>)(=)', r'&gt;\2', line)

        # Fix 5: Escape curly braces in state transitions and similar patterns
        # Look for patterns like "→ {WORD, WORD}" outside of code
        if '→ {' in line and '\\{' not in line:
            # Escape curly braces in state transition notation
            line = re.sub(r'(?<!\\){([A-Z_,\s()]+)}', r'\\\{\1\\\}', line)

        if line != original_line:
            changes_made = True

        fixed_lines.append(line)

    if changes_made:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(fixed_lines)
        return True
    return False

def main():
    if len(sys.argv) > 1:
        content_dir = Path(sys.argv[1])
    else:
        content_dir = Path('/home/marce/Projetos/TradingSystem/docs/content')

    if not content_dir.exists():
        print(f"Error: Directory {content_dir} does not exist")
        sys.exit(1)

    fixed_files = []

    for mdx_file in content_dir.rglob('*.mdx'):
        if fix_mdx_syntax(mdx_file):
            fixed_files.append(mdx_file)
            print(f"Fixed: {mdx_file.relative_to(content_dir)}")

    print(f"\nTotal files fixed: {len(fixed_files)}")

    if fixed_files:
        print("\nFixed files:")
        for f in fixed_files:
            print(f"  - {f.relative_to(content_dir)}")
    else:
        print("No files needed fixing.")

if __name__ == '__main__':
    main()
