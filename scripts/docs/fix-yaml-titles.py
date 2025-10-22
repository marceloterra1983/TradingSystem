#!/usr/bin/env python3
"""
Script para corrigir títulos com ':' no frontmatter que causam erros de parsing YAML.
Adiciona aspas duplas nos títulos que contêm ':'.
"""

import re
from pathlib import Path

# Arquivos com problemas reportados
problem_files = [
    "docs/architecture/ADR-001-clean-architecture.md",
    "docs/context/STRUCTURE.md",
    "docs/context/backend/data/webscraper-schema.md",
    "docs/docusaurus/DEV-SERVER-LOG-20251019-212855.md",
    "docs/docusaurus/INSTALL-LOG-20251019-210506.md",
    "docs/docusaurus/INSTALL-LOG-20251019-212600.md",
    "docs/docusaurus/INSTALL-LOG-20251019-214713.md",
    "docs/docusaurus/PHASE2-CLEANUP-GUIDE.md",
    "docs/docusaurus/PHASE3-CHECKLIST.md",
    "docs/docusaurus/PHASE3-INSTALLATION-GUIDE.md",
    "docs/docusaurus/PHASE4-CHECKLIST.md",
    "docs/docusaurus/PHASE4-VALIDATION-GUIDE.md",
    "docs/docusaurus/RESTORATION-REPORT.md",
]

def fix_yaml_title(filepath):
    """Adiciona aspas no título se ele contém ':' e não está entre aspas."""
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
    
    # Procura linha do título
    lines = frontmatter.split('\n')
    modified = False
    
    for i, line in enumerate(lines):
        if line.strip().startswith('title:'):
            # Extrai o título
            title_match = re.match(r'(\s*title:\s*)(.+)', line)
            if title_match:
                prefix = title_match.group(1)
                title = title_match.group(2).strip()
                
                # Se contém ':' e não está entre aspas, adiciona aspas
                if ':' in title and not (title.startswith('"') and title.endswith('"')):
                    # Remove aspas simples se existirem
                    title = title.strip("'")
                    lines[i] = f'{prefix}"{title}"'
                    modified = True
                    break
        
        # Também corrige summary se necessário
        if line.strip().startswith('summary:'):
            summary_match = re.match(r'(\s*summary:\s*)(.+)', line)
            if summary_match:
                prefix = summary_match.group(1)
                summary = summary_match.group(2).strip()
                
                # Se contém ':' e não está entre aspas, adiciona aspas
                if ':' in summary and not (summary.startswith('"') and summary.endswith('"')):
                    summary = summary.strip("'")
                    lines[i] = f'{prefix}"{summary}"'
                    modified = True
    
    if modified:
        new_frontmatter = '\n'.join(lines)
        new_content = f"---{new_frontmatter}---{body}"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        return True, "✅ Corrigido"
    
    return False, "Não precisava correção"

def main():
    print("🔧 Corrigindo títulos com ':' em YAML frontmatter...")
    print()
    
    stats = {'fixed': 0, 'skipped': 0, 'errors': 0}
    
    for filepath in problem_files:
        path = Path(filepath)
        if not path.exists():
            print(f"  ⚠️  Arquivo não encontrado: {filepath}")
            stats['skipped'] += 1
            continue
        
        try:
            success, message = fix_yaml_title(filepath)
            if success:
                stats['fixed'] += 1
                print(f"  {message}: {filepath}")
            else:
                stats['skipped'] += 1
        except Exception as e:
            stats['errors'] += 1
            print(f"  ❌ Erro em {filepath}: {e}")
    
    print()
    print("=" * 80)
    print(f"📊 RESUMO:")
    print(f"  • Arquivos corrigidos: {stats['fixed']}")
    print(f"  • Ignorados: {stats['skipped']}")
    print(f"  • Erros: {stats['errors']}")
    print("=" * 80)

if __name__ == '__main__':
    main()













