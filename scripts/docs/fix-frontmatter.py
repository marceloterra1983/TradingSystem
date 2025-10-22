#!/usr/bin/env python3
"""
Script para corrigir problemas de frontmatter identificados no relatório de validação.

Correções aplicadas:
1. Substituir last_review: N/A por data atual (2025-10-22)
2. Adicionar sidebar_position faltando (usar 1 como padrão)
3. Adicionar outros campos faltando baseado no contexto do arquivo

Uso:
  python3 scripts/docs/fix-frontmatter.py --dry-run   # Simula sem modificar
  python3 scripts/docs/fix-frontmatter.py --fix       # Aplica correções
"""

import argparse
import json
import re
from pathlib import Path
from datetime import date

def read_file_with_frontmatter(filepath):
    """Lê arquivo e separa frontmatter do conteúdo."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Verifica se tem frontmatter
    if not content.startswith('---'):
        return None, content
    
    # Extrai frontmatter
    parts = content.split('---', 2)
    if len(parts) < 3:
        return None, content
    
    frontmatter = parts[1].strip()
    body = parts[2].lstrip()
    
    return frontmatter, body

def parse_frontmatter(frontmatter_text):
    """Parse simples de YAML frontmatter para dicionário."""
    if not frontmatter_text:
        return {}
    
    result = {}
    current_key = None
    current_value = []
    in_array = False
    
    for line in frontmatter_text.split('\n'):
        line = line.rstrip()
        
        if not line or line.startswith('#'):
            continue
        
        # Detecta início de array
        if ':' in line and not in_array:
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()
            
            if value == '[':
                in_array = True
                current_key = key
                current_value = []
            elif value.startswith('[') and value.endswith(']'):
                # Array inline
                result[key] = value
            else:
                result[key] = value
                
        elif in_array:
            if line.strip() == ']':
                # Fim do array
                result[current_key] = '[' + ', '.join(current_value) + ']'
                in_array = False
                current_key = None
                current_value = []
            elif line.strip().startswith('-'):
                # Item do array
                item = line.strip()[1:].strip()
                current_value.append(item)
    
    return result

def serialize_frontmatter(fields):
    """Serializa dicionário de campos para YAML frontmatter."""
    lines = []
    for key, value in fields.items():
        if isinstance(value, list):
            lines.append(f"{key}: [{', '.join(value)}]")
        else:
            lines.append(f"{key}: {value}")
    return '\n'.join(lines)

def infer_missing_fields(filepath, existing_fields):
    """Infere campos faltando baseado no caminho do arquivo."""
    path = Path(filepath)
    fields = existing_fields.copy()
    
    # Inferir domain
    if 'domain' not in fields or fields.get('domain') == 'N/A':
        if 'frontend' in str(path):
            fields['domain'] = 'frontend'
        elif 'backend' in str(path):
            fields['domain'] = 'backend'
        elif 'ops' in str(path):
            fields['domain'] = 'ops'
        else:
            fields['domain'] = 'shared'
    
    # Inferir type
    if 'type' not in fields or fields.get('type') == 'N/A':
        if path.name == 'README.md':
            fields['type'] = 'index'
        elif 'guide' in str(path).lower():
            fields['type'] = 'guide'
        elif 'adr' in str(path).lower():
            fields['type'] = 'adr'
        elif 'prd' in str(path).lower():
            fields['type'] = 'prd'
        elif 'runbook' in str(path).lower():
            fields['type'] = 'runbook'
        else:
            fields['type'] = 'reference'
    
    # Adicionar campos faltando com valores padrão
    if 'sidebar_position' not in fields:
        fields['sidebar_position'] = '1'
    
    if 'tags' not in fields:
        # Inferir tags baseado no caminho
        tags = []
        if 'api' in str(path):
            tags.append('api')
        if 'frontend' in str(path):
            tags.append('frontend')
        if 'backend' in str(path):
            tags.append('backend')
        if not tags:
            tags = ['documentation']
        fields['tags'] = tags
    
    if 'summary' not in fields or fields.get('summary') == 'N/A':
        # Extrair primeira linha do corpo como summary
        fields['summary'] = 'Documentation'
    
    if 'status' not in fields or fields.get('status') == 'N/A':
        fields['status'] = 'active'
    
    if 'last_review' not in fields or fields.get('last_review') == 'N/A':
        fields['last_review'] = str(date.today())
    
    return fields

def fix_last_review_na(filepath, dry_run=True):
    """Corrige last_review: N/A para data atual."""
    frontmatter, body = read_file_with_frontmatter(filepath)
    
    if not frontmatter:
        return False, "Sem frontmatter"
    
    if 'last_review: N/A' not in frontmatter:
        return False, "last_review já está válido"
    
    # Substituir N/A pela data atual
    today = str(date.today())
    new_frontmatter = frontmatter.replace('last_review: N/A', f'last_review: {today}')
    
    if not dry_run:
        new_content = f"---\n{new_frontmatter}\n---\n\n{body}"
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True, f"✅ Corrigido: last_review → {today}"
    else:
        return True, f"[DRY-RUN] Corrigiria: last_review → {today}"

def fix_missing_fields(filepath, missing_fields, dry_run=True):
    """Adiciona campos faltando no frontmatter."""
    frontmatter, body = read_file_with_frontmatter(filepath)
    
    if not frontmatter:
        return False, "Sem frontmatter"
    
    # Parse frontmatter existente
    fields = parse_frontmatter(frontmatter)
    
    # Inferir e adicionar campos faltando
    updated_fields = infer_missing_fields(filepath, fields)
    
    # Adicionar apenas os campos que estavam faltando
    for field in missing_fields:
        if field in updated_fields:
            fields[field] = updated_fields[field]
    
    # Serializar novo frontmatter
    new_frontmatter = serialize_frontmatter(fields)
    
    if not dry_run:
        new_content = f"---\n{new_frontmatter}\n---\n\n{body}"
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True, f"✅ Adicionados campos: {', '.join(missing_fields)}"
    else:
        return True, f"[DRY-RUN] Adicionaria campos: {', '.join(missing_fields)}"

def main():
    parser = argparse.ArgumentParser(description='Corrige problemas de frontmatter')
    parser.add_argument('--fix', action='store_true', help='Aplica correções (padrão: dry-run)')
    parser.add_argument('--dry-run', action='store_true', default=True, help='Simula correções sem modificar arquivos')
    parser.add_argument('--report', default='docs/reports/frontmatter-validation.json', help='Caminho do relatório JSON')
    
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
        'last_review_fixed': 0,
        'missing_fields_fixed': 0,
        'errors': 0
    }
    
    # 1. Corrigir last_review: N/A
    print("🔧 Corrigindo last_review: N/A...")
    invalid_values = report.get('invalid_values', [])
    for item in invalid_values:
        if item.get('field') == 'last_review' and item.get('current_value') == 'N/A':
            filepath = item['file']
            try:
                success, message = fix_last_review_na(filepath, dry_run)
                if success:
                    stats['last_review_fixed'] += 1
                    if not dry_run or stats['last_review_fixed'] <= 5:
                        print(f"  {message}: {filepath}")
            except Exception as e:
                stats['errors'] += 1
                print(f"  ❌ Erro em {filepath}: {e}")
    
    if dry_run and stats['last_review_fixed'] > 5:
        print(f"  ... e mais {stats['last_review_fixed'] - 5} arquivos")
    
    print()
    
    # 2. Adicionar campos faltando
    print("🔧 Adicionando campos faltando...")
    incomplete = report['incomplete_frontmatter']
    for item in incomplete:
        filepath = item['file']
        missing_fields = item['missing_fields']
        
        try:
            success, message = fix_missing_fields(filepath, missing_fields, dry_run)
            if success:
                stats['missing_fields_fixed'] += 1
                if not dry_run or stats['missing_fields_fixed'] <= 5:
                    print(f"  {message}: {filepath}")
        except Exception as e:
            stats['errors'] += 1
            print(f"  ❌ Erro em {filepath}: {e}")
    
    if dry_run and stats['missing_fields_fixed'] > 5:
        print(f"  ... e mais {stats['missing_fields_fixed'] - 5} arquivos")
    
    print()
    print(f"{'=' * 80}")
    print("📊 RESUMO:")
    print(f"  • last_review corrigidos: {stats['last_review_fixed']}")
    print(f"  • Campos adicionados: {stats['missing_fields_fixed']}")
    print(f"  • Erros: {stats['errors']}")
    print(f"{'=' * 80}")
    
    if dry_run:
        print()
        print("ℹ️  Para aplicar as correções, execute:")
        print("   python3 scripts/docs/fix-frontmatter.py --fix")

if __name__ == '__main__':
    main()













