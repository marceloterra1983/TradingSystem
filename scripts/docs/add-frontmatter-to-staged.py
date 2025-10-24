#!/usr/bin/env python3
"""
Script para adicionar/corrigir frontmatter em arquivos markdown staged.

Este script:
1. Verifica arquivos markdown staged no git
2. Adiciona frontmatter aos arquivos que não têm
3. Completa campos faltantes em frontmatter existente

Uso:
  python3 scripts/docs/add-frontmatter-to-staged.py --dry-run   # Simula
  python3 scripts/docs/add-frontmatter-to-staged.py --fix       # Aplica
"""

import argparse
import os
import re
import subprocess
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Campos obrigatórios do frontmatter
REQUIRED_FIELDS = [
    'title',
    'sidebar_position',
    'tags',
    'domain',
    'type',
    'summary',
    'status',
    'last_review'
]

def get_staged_markdown_files() -> List[str]:
    """Obtém lista de arquivos markdown staged no git."""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
            capture_output=True,
            text=True,
            check=True
        )
        files = [f for f in result.stdout.strip().split('\n') if f.endswith(('.md', '.mdx'))]
        return [f for f in files if os.path.exists(f)]
    except subprocess.CalledProcessError:
        return []

def extract_frontmatter(content: str) -> Tuple[Optional[Dict], str]:
    """Extrai frontmatter YAML do conteúdo markdown."""
    if not content.startswith('---'):
        return None, content
    
    # Encontrar fim do frontmatter
    match = re.search(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL | re.MULTILINE)
    if not match:
        return None, content
    
    frontmatter_text = match.group(1)
    body = content[match.end():]
    
    # Parse simples do YAML
    frontmatter = {}
    lines = frontmatter_text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line or line.startswith('#'):
            i += 1
            continue
        
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()
            
            # Detectar arrays
            if value == '' and i + 1 < len(lines) and lines[i + 1].strip().startswith('-'):
                # Array multi-linha
                array_items = []
                i += 1
                while i < len(lines) and lines[i].strip().startswith('-'):
                    item = lines[i].strip()[1:].strip()
                    if item:
                        array_items.append(item)
                    i += 1
                frontmatter[key] = array_items
                continue
            elif value.startswith('[') and value.endswith(']'):
                # Array inline
                items = value[1:-1].split(',')
                frontmatter[key] = [item.strip().strip('"').strip("'") for item in items if item.strip()]
            else:
                # Valor simples - remover aspas se houver
                value = value.strip('"').strip("'")
                frontmatter[key] = value
        
        i += 1
    
    return frontmatter, body

def infer_field_values(filepath: str, content: str, existing_fields: Dict) -> Dict:
    """Infere valores dos campos baseado no contexto do arquivo."""
    path = Path(filepath)
    fields = existing_fields.copy() if existing_fields else {}
    
    # Título
    if 'title' not in fields or not fields.get('title'):
        # Tentar extrair do primeiro # heading
        match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        if match:
            fields['title'] = match.group(1).strip()
        else:
            # Usar nome do arquivo sem extensão
            fields['title'] = path.stem.replace('-', ' ').replace('_', ' ').title()
    
    # Domain
    if 'domain' not in fields or not fields.get('domain'):
        path_str = str(path).lower()
        if 'frontend' in path_str or 'dashboard' in path_str:
            fields['domain'] = 'frontend'
        elif 'backend' in path_str or 'api' in path_str:
            fields['domain'] = 'backend'
        elif 'ops' in path_str or 'infrastructure' in path_str or 'tools' in path_str:
            fields['domain'] = 'ops'
        else:
            fields['domain'] = 'shared'
    
    # Type
    if 'type' not in fields or not fields.get('type'):
        filename = path.name.lower()
        if filename == 'readme.md':
            fields['type'] = 'index'
        elif 'guide' in str(path).lower():
            fields['type'] = 'guide'
        elif 'adr' in str(path).lower():
            fields['type'] = 'adr'
        elif 'prd' in str(path).lower():
            fields['type'] = 'prd'
        elif 'rfc' in str(path).lower():
            fields['type'] = 'rfc'
        elif 'runbook' in str(path).lower():
            fields['type'] = 'runbook'
        elif 'architecture' in str(path).lower():
            fields['type'] = 'reference'
        else:
            fields['type'] = 'guide'
    
    # Tags
    if 'tags' not in fields or not fields.get('tags'):
        tags = []
        path_str = str(path).lower()
        
        if 'frontend' in path_str:
            tags.append('frontend')
        if 'backend' in path_str:
            tags.append('backend')
        if 'api' in path_str:
            tags.append('api')
        if 'database' in path_str or 'db' in path_str:
            tags.append('database')
        if 'docker' in path_str or 'compose' in path_str:
            tags.append('docker')
        if 'deployment' in path_str:
            tags.append('deployment')
        if 'monitoring' in path_str:
            tags.append('monitoring')
        if 'ops' in path_str or 'infrastructure' in path_str:
            tags.append('ops')
        
        if not tags:
            tags = ['documentation']
        
        fields['tags'] = tags
    
    # Summary
    if 'summary' not in fields or not fields.get('summary'):
        # Tentar extrair primeiro parágrafo
        lines = content.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#') and len(line) > 20:
                fields['summary'] = line[:150] + ('...' if len(line) > 150 else '')
                break
        
        if 'summary' not in fields or not fields.get('summary'):
            fields['summary'] = f"Documentation for {fields.get('title', path.stem)}"
    
    # Status
    if 'status' not in fields or not fields.get('status'):
        fields['status'] = 'active'
    
    # Last review
    if 'last_review' not in fields or not fields.get('last_review'):
        fields['last_review'] = str(date.today())
    
    # Sidebar position
    if 'sidebar_position' not in fields or not fields.get('sidebar_position'):
        fields['sidebar_position'] = 1
    
    return fields

def serialize_frontmatter(fields: Dict) -> str:
    """Serializa campos para YAML frontmatter."""
    lines = []
    
    # Ordem dos campos
    field_order = ['title', 'sidebar_position', 'tags', 'domain', 'type', 'summary', 'status', 'last_review']
    
    def needs_quotes(value: str) -> bool:
        """Verifica se um valor precisa de aspas no YAML."""
        special_chars = [':', '#', '*', '&', '!', '|', '>', '@', '`', '"', "'", '-', '[', ']', '{', '}', '?', '%']
        str_value = str(value)
        
        # Sempre colocar entre aspas se contiver caracteres especiais
        if any(char in str_value for char in special_chars):
            return True
        
        # Se começar com espaço ou terminar com espaço
        if str_value != str_value.strip():
            return True
        
        # Se for um número ou boolean que queremos como string
        if str_value.lower() in ['true', 'false', 'yes', 'no', 'on', 'off']:
            return True
        
        return False
    
    def escape_value(value: str) -> str:
        """Escapa um valor para YAML, usando aspas duplas e escapando aspas internas."""
        str_value = str(value)
        # Substituir aspas duplas por aspas duplas escapadas
        str_value = str_value.replace('"', '\\"')
        return f'"{str_value}"'
    
    for field in field_order:
        if field in fields:
            value = fields[field]
            
            if isinstance(value, list):
                if len(value) == 0:
                    lines.append(f"{field}: []")
                elif len(value) == 1:
                    item = value[0]
                    if needs_quotes(item):
                        lines.append(f"{field}: [{escape_value(item)}]")
                    else:
                        lines.append(f"{field}: [{item}]")
                else:
                    lines.append(f"{field}:")
                    for item in value:
                        if needs_quotes(item):
                            lines.append(f"  - {escape_value(item)}")
                        else:
                            lines.append(f"  - {item}")
            elif isinstance(value, (int, float)):
                lines.append(f"{field}: {value}")
            else:
                # Escapar valor se necessário
                if needs_quotes(value):
                    lines.append(f'{field}: {escape_value(value)}')
                else:
                    lines.append(f"{field}: {value}")
    
    # Adicionar campos extras que não estão na ordem
    for field, value in fields.items():
        if field not in field_order:
            if isinstance(value, list):
                lines.append(f"{field}:")
                for item in value:
                    if needs_quotes(item):
                        lines.append(f"  - {escape_value(item)}")
                    else:
                        lines.append(f"  - {item}")
            elif needs_quotes(value):
                lines.append(f'{field}: {escape_value(value)}')
            else:
                lines.append(f"{field}: {value}")
    
    return '\n'.join(lines)

def process_file(filepath: str, dry_run: bool = True) -> Tuple[bool, str]:
    """Processa um arquivo adicionando/corrigindo frontmatter."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extrair frontmatter existente
        existing_frontmatter, body = extract_frontmatter(content)
        
        # Inferir valores dos campos
        complete_fields = infer_field_values(filepath, body, existing_frontmatter or {})
        
        # Verificar se algo mudou
        if existing_frontmatter == complete_fields:
            return False, "Já possui frontmatter completo"
        
        # Gerar novo frontmatter
        new_frontmatter = serialize_frontmatter(complete_fields)
        new_content = f"---\n{new_frontmatter}\n---\n\n{body.lstrip()}"
        
        if not dry_run:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            # Re-stage o arquivo
            subprocess.run(['git', 'add', filepath], check=True)
            
            return True, "✅ Frontmatter adicionado/corrigido"
        else:
            action = "Corrigir" if existing_frontmatter else "Adicionar"
            return True, f"[DRY-RUN] {action} frontmatter"
            
    except Exception as e:
        return False, f"❌ Erro: {str(e)}"

def main():
    parser = argparse.ArgumentParser(description='Adiciona/corrige frontmatter em arquivos staged')
    parser.add_argument('--fix', action='store_true', help='Aplica correções (padrão: dry-run)')
    parser.add_argument('--dry-run', action='store_true', help='Simula sem modificar')
    
    args = parser.parse_args()
    dry_run = not args.fix or args.dry_run
    
    # Obter arquivos staged
    files = get_staged_markdown_files()
    
    if not files:
        print("ℹ️  Nenhum arquivo markdown staged")
        return
    
    print(f"{'=' * 80}")
    print(f"{'🔍 MODO: DRY-RUN (simulação)' if dry_run else '🔧 MODO: APLICANDO CORREÇÕES'}")
    print(f"{'=' * 80}")
    print(f"\n📄 Encontrados {len(files)} arquivos markdown staged\n")
    
    # Estatísticas
    stats = {
        'processed': 0,
        'skipped': 0,
        'errors': 0
    }
    
    # Processar cada arquivo
    for filepath in files:
        success, message = process_file(filepath, dry_run)
        
        if success:
            stats['processed'] += 1
            if stats['processed'] <= 10 or not dry_run:
                print(f"  {message}: {filepath}")
        elif 'Já possui' in message:
            stats['skipped'] += 1
        else:
            stats['errors'] += 1
            print(f"  {message}: {filepath}")
    
    if dry_run and stats['processed'] > 10:
        print(f"  ... e mais {stats['processed'] - 10} arquivos")
    
    print(f"\n{'=' * 80}")
    print("📊 RESUMO:")
    print(f"  • Arquivos processados: {stats['processed']}")
    print(f"  • Arquivos já corretos: {stats['skipped']}")
    print(f"  • Erros: {stats['errors']}")
    print(f"{'=' * 80}")
    
    if dry_run and stats['processed'] > 0:
        print()
        print("✅ Para aplicar as correções, execute:")
        print("   python3 scripts/docs/add-frontmatter-to-staged.py --fix")

if __name__ == '__main__':
    main()

