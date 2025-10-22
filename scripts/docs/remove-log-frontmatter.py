#!/usr/bin/env python3
"""
Remove frontmatter malformado de arquivos de LOG.
"""

from pathlib import Path
import re

# Arquivos de LOG que têm problemas
log_files = [
    "docs/docusaurus/INSTALL-LOG-20251019-210506.md",
    "docs/docusaurus/INSTALL-LOG-20251019-212600.md",
    "docs/docusaurus/INSTALL-LOG-20251019-214713.md",
    "docs/docusaurus/DEV-SERVER-LOG-20251019-212855.md",
]

def remove_malformed_frontmatter(filepath):
    """Remove frontmatter malformado de arquivos de LOG."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove tudo entre o primeiro --- e onde deveria estar o segundo ---
    # ou simplesmente remove se começar com ---
    if content.startswith('---'):
        # Encontra posição do segundo --- (se existir)
        parts = content.split('---', 2)
        if len(parts) >= 3:
            # Tem dois ---, mantém apenas o corpo
            body = parts[2].lstrip()
        else:
            # Só tem um ---, remove ele
            body = content.replace('---', '', 1).lstrip()
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(body)
        
        return True, "✅ Frontmatter removido"
    
    return False, "Sem frontmatter para remover"

def main():
    print("🔧 Removendo frontmatter malformado de arquivos de LOG...")
    print()
    
    stats = {'fixed': 0, 'skipped': 0, 'errors': 0}
    
    for filepath in log_files:
        path = Path(filepath)
        if not path.exists():
            print(f"  ⚠️  Arquivo não encontrado: {filepath}")
            stats['skipped'] += 1
            continue
        
        try:
            success, message = remove_malformed_frontmatter(filepath)
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













