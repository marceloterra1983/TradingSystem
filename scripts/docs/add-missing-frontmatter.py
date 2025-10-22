#!/usr/bin/env python3
"""
Script para adicionar frontmatter completo em arquivos que não têm.

Usa inteligência baseada em:
- Caminho do arquivo (para inferir domain/type)
- Título da primeira linha markdown (# Título)
- Conteúdo para gerar summary

Uso:
  python3 scripts/docs/add-missing-frontmatter.py --dry-run   # Simula
  python3 scripts/docs/add-missing-frontmatter.py --fix       # Aplica
"""

import argparse
import json
import re
from pathlib import Path
from datetime import date

def extract_title_from_content(content):
    """Extrai o primeiro heading H1 do conteúdo."""
    lines = content.strip().split('\n')
    for line in lines[:20]:  # Procura nos primeiros 20 linhas
        if line.startswith('# '):
            return line[2:].strip()
    
    # Se não encontrou, usa o nome do arquivo
    return None

def generate_summary(content, max_length=100):
    """Gera um summary baseado no conteúdo."""
    # Remove headers
    content = re.sub(r'^#+\s+', '', content, flags=re.MULTILINE)
    
    # Pega o primeiro parágrafo não-vazio
    paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
    
    if paragraphs:
        summary = paragraphs[0]
        # Remove markdown links
        summary = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', summary)
        # Remove markdown bold/italic
        summary = re.sub(r'[*_]{1,2}([^*_]+)[*_]{1,2}', r'\1', summary)
        # Remove code blocks
        summary = re.sub(r'`[^`]+`', '', summary)
        # Limita tamanho
        if len(summary) > max_length:
            summary = summary[:max_length].rsplit(' ', 1)[0] + '...'
        return summary
    
    return 'Documentation'

def infer_metadata(filepath, content):
    """Infere metadata baseado no caminho e conteúdo do arquivo."""
    path = Path(filepath)
    
    # Extrai título
    title = extract_title_from_content(content)
    if not title:
        # Usa o nome do arquivo
        title = path.stem.replace('-', ' ').replace('_', ' ').title()
    
    # Remove emojis e símbolos do título
    title = re.sub(r'[🎯📚🔧⚙️📝🚀🔍💡🌟✨📦🏗️⚡🐛🔥💻📊🎨🔐🌐📱]', '', title).strip()
    
    # Infere domain
    if 'frontend' in str(path):
        domain = 'frontend'
    elif 'backend' in str(path):
        domain = 'backend'
    elif 'ops' in str(path) or 'infrastructure' in str(path):
        domain = 'ops'
    else:
        domain = 'shared'
    
    # Infere type
    if path.name == 'README.md':
        doc_type = 'index'
    elif 'guide' in path.name.lower() or 'tutorial' in path.name.lower():
        doc_type = 'guide'
    elif 'adr' in path.name.lower() or path.parent.name == 'decisions':
        doc_type = 'adr'
    elif 'prd' in path.name.lower() or path.parent.name == 'prd':
        doc_type = 'prd'
    elif 'runbook' in path.name.lower():
        doc_type = 'runbook'
    elif 'spec' in path.name.lower():
        doc_type = 'reference'
    elif 'log' in path.name.lower() or 'report' in path.name.lower():
        doc_type = 'reference'
    elif 'checklist' in path.name.lower():
        doc_type = 'reference'
    else:
        doc_type = 'reference'
    
    # Infere tags
    tags = []
    path_str = str(path).lower()
    
    if 'api' in path_str:
        tags.append('api')
    if 'frontend' in path_str:
        tags.append('frontend')
    if 'backend' in path_str:
        tags.append('backend')
    if 'docker' in path_str or 'container' in path_str:
        tags.append('docker')
    if 'guide' in path_str:
        tags.append('guide')
    if 'architecture' in path_str:
        tags.append('architecture')
    if 'documentation' in path_str or 'docs' in path_str:
        tags.append('documentation')
    
    # Se não tem tags, usa tags genéricas baseadas no type
    if not tags:
        if doc_type == 'guide':
            tags = ['guide', 'documentation']
        elif doc_type == 'adr':
            tags = ['adr', 'architecture']
        elif doc_type == 'prd':
            tags = ['prd', 'product']
        else:
            tags = ['documentation']
    
    # Gera summary
    summary = generate_summary(content)
    
    # Status padrão
    status = 'active'
    
    # Data de review
    last_review = str(date.today())
    
    # Sidebar position padrão
    sidebar_position = 1
    
    return {
        'title': title,
        'sidebar_position': sidebar_position,
        'tags': tags,
        'domain': domain,
        'type': doc_type,
        'summary': summary,
        'status': status,
        'last_review': last_review
    }

def add_frontmatter(filepath, dry_run=True):
    """Adiciona frontmatter em arquivo que não tem."""
    # Ler conteúdo
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Se já tem frontmatter, pula
    if content.strip().startswith('---'):
        return False, "Já tem frontmatter"
    
    # Infere metadata
    metadata = infer_metadata(filepath, content)
    
    # Gera frontmatter
    frontmatter_lines = ['---']
    frontmatter_lines.append(f'title: {metadata["title"]}')
    frontmatter_lines.append(f'sidebar_position: {metadata["sidebar_position"]}')
    frontmatter_lines.append(f'tags: [{", ".join(metadata["tags"])}]')
    frontmatter_lines.append(f'domain: {metadata["domain"]}')
    frontmatter_lines.append(f'type: {metadata["type"]}')
    frontmatter_lines.append(f'summary: {metadata["summary"]}')
    frontmatter_lines.append(f'status: {metadata["status"]}')
    frontmatter_lines.append(f'last_review: {metadata["last_review"]}')
    frontmatter_lines.append('---')
    
    frontmatter = '\n'.join(frontmatter_lines)
    
    # Novo conteúdo com frontmatter
    new_content = f"{frontmatter}\n\n{content}"
    
    if not dry_run:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True, f"✅ Adicionado frontmatter"
    else:
        return True, f"[DRY-RUN] Adicionaria frontmatter: {metadata['title']}"

def main():
    parser = argparse.ArgumentParser(description='Adiciona frontmatter em arquivos sem frontmatter')
    parser.add_argument('--fix', action='store_true', help='Aplica correções')
    parser.add_argument('--dry-run', action='store_true', default=True, help='Simula sem modificar')
    parser.add_argument('--report', default='docs/reports/frontmatter-validation.json', help='Relatório JSON')
    
    args = parser.parse_args()
    dry_run = not args.fix
    
    # Carregar relatório
    with open(args.report) as f:
        report = json.load(f)
    
    print(f"{'=' * 80}")
    print(f"{'MODO: DRY-RUN' if dry_run else 'MODO: APLICANDO CORREÇÕES'}")
    print(f"{'=' * 80}")
    print()
    
    # Estatísticas
    stats = {
        'added': 0,
        'skipped': 0,
        'errors': 0
    }
    
    print(f"🔧 Adicionando frontmatter em {len(report['missing_frontmatter'])} arquivos...")
    print()
    
    for filepath in report['missing_frontmatter']:
        try:
            success, message = add_frontmatter(filepath, dry_run)
            if success:
                stats['added'] += 1
                # Mostra apenas os primeiros 10 no dry-run
                if not dry_run or stats['added'] <= 10:
                    print(f"  {message}")
                    print(f"    Arquivo: {filepath}")
            else:
                stats['skipped'] += 1
        except Exception as e:
            stats['errors'] += 1
            print(f"  ❌ Erro em {filepath}: {e}")
    
    if dry_run and stats['added'] > 10:
        print(f"\n  ... e mais {stats['added'] - 10} arquivos")
    
    print()
    print(f"{'=' * 80}")
    print("📊 RESUMO:")
    print(f"  • Frontmatter adicionado: {stats['added']}")
    print(f"  • Ignorados: {stats['skipped']}")
    print(f"  • Erros: {stats['errors']}")
    print(f"{'=' * 80}")
    
    if dry_run:
        print()
        print("ℹ️  Para aplicar as correções, execute:")
        print("   python3 scripts/docs/add-missing-frontmatter.py --fix")

if __name__ == '__main__':
    main()













