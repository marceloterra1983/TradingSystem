#!/usr/bin/env python3
"""
Analisa os problemas de invalid_type no relatório de validação.
"""

import json
from collections import defaultdict

with open('docs/reports/frontmatter-validation.json') as f:
    report = json.load(f)

print("=" * 80)
print("ANÁLISE DE PROBLEMAS DE TYPE")
print("=" * 80)
print()

# Analisa os resultados detalhados (que é uma lista)
issues_by_message = defaultdict(int)
files_with_invalid_type = []

for entry in report.get('results', []):
    filename = entry.get('file', '')
    issues = entry.get('issues', [])
    
    for issue in issues:
        if 'Invalid type' in issue or 'type' in issue.lower():
            files_with_invalid_type.append((filename, issue))
            issues_by_message[issue] += 1

print(f"Total de problemas encontrados: {len(files_with_invalid_type)}")
print()

# Mostra os problemas mais comuns
print("=== MENSAGENS DE PROBLEMA MAIS COMUNS ===")
for issue, count in sorted(issues_by_message.items(), key=lambda x: x[1], reverse=True)[:15]:
    print(f"{count:3d}x {issue}")

print()

# Mostra exemplos de arquivos com problemas
print("=== EXEMPLOS DE ARQUIVOS COM PROBLEMA (primeiros 10) ===")
for filename, issue in files_with_invalid_type[:10]:
    print(f"\n{filename}")
    print(f"  Issue: {issue}")
    
    try:
        with open(filename) as f:
            content = f.read()
        
        # Extrai linha do type
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 2:
                frontmatter = parts[1]
                for line in frontmatter.split('\n'):
                    if line.strip().startswith('type:'):
                        print(f"  Tipo atual: {line.strip()}")
                        break
    except Exception as e:
        print(f"  (Erro ao ler arquivo: {e})")

print()
print("=" * 80)
