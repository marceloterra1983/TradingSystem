#!/usr/bin/env python3
"""
Script para corrigir TODOS os campos de frontmatter que contêm ':' e não estão entre aspas.
"""

import re
from pathlib import Path
import yaml

def fix_frontmatter_colons(filepath):
    """Adiciona aspas em todos os valores que contêm ':' e não estão entre aspas."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Verifica se tem frontmatter
    if not content.startswith('---'):
        return False, "Sem frontmatter"
    
    # Separa frontmatter do corpo
    parts = content.split('---', 2)
    if len(parts) < 3:
        return False, "Frontmatter malformado"
    
    frontmatter = parts[1]
    body = parts[2]
    
    # Processa cada linha do frontmatter
    lines = frontmatter.split('\n')
    modified = False
    
    for i, line in enumerate(lines):
        if ':' not in line or line.strip().startswith('#'):
            continue
        
        # Procura por campos que têm valores
        match = re.match(r'(\s*\w+:\s*)(.+)', line)
        if match:
            prefix = match.group(1)
            value = match.group(2).strip()
            
            # Skip arrays and valores já entre aspas
            if value.startswith('[') or (value.startswith('"') and value.endswith('"')):
                continue
            
            # Se o valor contém ':', adiciona aspas
            if ':' in value:
                # Remove aspas simples se existirem
                value = value.strip("'")
                lines[i] = f'{prefix}"{value}"'
                modified = True
    
    if modified:
        new_frontmatter = '\n'.join(lines)
        new_content = f"---{new_frontmatter}---{body}"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        return True, "✅ Corrigido"
    
    return False, "Não precisava correção"

def main():
    # Processa todos os arquivos markdown em docs/
    docs_dir = Path('docs')
    md_files = list(docs_dir.rglob('*.md'))
    
    print(f"🔧 Corrigindo ':' em frontmatter de {len(md_files)} arquivos...")
    print()
    
    stats = {'fixed': 0, 'skipped': 0, 'errors': 0}
    
    for filepath in md_files:
        try:
            success, message = fix_frontmatter_colons(filepath)
            if success:
                stats['fixed'] += 1
                if stats['fixed'] <= 20:  # Mostra apenas os primeiros 20
                    print(f"  {message}: {filepath}")
        except Exception as e:
            stats['errors'] += 1
            if stats['errors'] <= 5:  # Mostra apenas os primeiros 5 erros
                print(f"  ❌ Erro em {filepath}: {e}")
    
    if stats['fixed'] > 20:
        print(f"\n  ... e mais {stats['fixed'] - 20} arquivos corrigidos")
    
    if stats['errors'] > 5:
        print(f"\n  ... e mais {stats['errors'] - 5} erros")
    
    print()
    print("=" * 80)
    print(f"📊 RESUMO:")
    print(f"  • Arquivos corrigidos: {stats['fixed']}")
    print(f"  • Erros: {stats['errors']}")
    print("=" * 80)

if __name__ == '__main__':
    main()













