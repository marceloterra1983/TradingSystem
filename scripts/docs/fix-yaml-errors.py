#!/usr/bin/env python3
"""
Script para corrigir erros de parsing YAML em arquivos markdown.
Re-escreve o frontmatter dos arquivos com erros de YAML.
"""

import os
import re
import subprocess
import sys
from datetime import date
from pathlib import Path
from typing import Dict, List, Tuple
import yaml

def get_staged_markdown_files() -> List[str]:
    """Obtém lista de arquivos markdown staged."""
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

def extract_frontmatter_raw(content: str) -> Tuple[str, str]:
    """Extrai frontmatter bruto do conteúdo."""
    if not content.startswith('---'):
        return '', content
    
    match = re.search(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL | re.MULTILINE)
    if not match:
        return '', content
    
    frontmatter_text = match.group(1)
    body = content[match.end():]
    
    return frontmatter_text, body

def parse_frontmatter_safe(frontmatter_text: str) -> Dict:
    """Tenta fazer parse do frontmatter, retorna dict vazio se falhar."""
    try:
        return yaml.safe_load(frontmatter_text) or {}
    except yaml.YAMLError:
        return {}

def extract_values_from_invalid_yaml(frontmatter_text: str) -> Dict:
    """Extrai valores de YAML inválido usando regex."""
    fields = {}
    
    lines = frontmatter_text.split('\n')
    for line in lines:
        if ':' in line and not line.strip().startswith('#'):
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()
            
            # Remover aspas e caracteres especiais
            value = re.sub(r'^["\']|["\']$', '', value)
            value = re.sub(r'^[\[\]]|[\[\]]$', '', value)
            
            if value and not value.startswith('-'):
                fields[key] = value
    
    return fields

def infer_field_values(filepath: str, content: str) -> Dict:
    """Infere valores dos campos."""
    path = Path(filepath)
    fields = {}
    
    # Título
    match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    if match:
        fields['title'] = match.group(1).strip()
    else:
        fields['title'] = path.stem.replace('-', ' ').replace('_', ' ').title()
    
    # Domain
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
    filename = path.name.lower()
    if filename == 'readme.md':
        fields['type'] = 'index'
    elif 'changelog' in filename:
        fields['type'] = 'reference'
    elif 'todo' in filename:
        fields['type'] = 'reference'
    else:
        fields['type'] = 'guide'
    
    # Tags
    tags = []
    if 'frontend' in path_str:
        tags.append('frontend')
    if 'backend' in path_str:
        tags.append('backend')
    if 'api' in path_str:
        tags.append('api')
    if not tags:
        tags = ['documentation']
    fields['tags'] = tags
    
    # Summary - extrair primeira linha significativa
    lines = content.strip().split('\n')
    summary = None
    for line in lines:
        line = line.strip()
        # Pular headings e linhas vazias
        if line and not line.startswith('#') and len(line) > 20:
            # Limpar markdown
            summary = re.sub(r'\*\*|\*|`|#|\[|\]|\(|\)', '', line)
            summary = summary[:100]
            break
    
    if not summary:
        summary = f"Documentation for {fields['title']}"
    
    fields['summary'] = summary
    fields['status'] = 'active'
    fields['last_review'] = str(date.today())
    fields['sidebar_position'] = 1
    
    return fields

def serialize_yaml_safe(fields: Dict) -> str:
    """Serializa campos para YAML de forma segura."""
    lines = []
    field_order = ['title', 'sidebar_position', 'tags', 'domain', 'type', 'summary', 'status', 'last_review']
    
    for field in field_order:
        if field in fields:
            value = fields[field]
            
            if isinstance(value, list):
                lines.append(f"{field}:")
                for item in value:
                    lines.append(f"  - {item}")
            elif isinstance(value, (int, float)):
                lines.append(f"{field}: {value}")
            else:
                # Usar yaml.dump para garantir escape correto
                yaml_value = yaml.dump({field: value}, default_flow_style=False, allow_unicode=True)
                lines.append(yaml_value.strip())
    
    return '\n'.join(lines)

def fix_file(filepath: str) -> Tuple[bool, str]:
    """Corrige um arquivo com erro de YAML."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        frontmatter_text, body = extract_frontmatter_raw(content)
        
        if not frontmatter_text:
            return False, "Sem frontmatter"
        
        # Tentar parse
        parsed = parse_frontmatter_safe(frontmatter_text)
        
        if parsed and len(parsed) >= 7:
            # YAML válido e completo
            return False, "YAML válido"
        
        # YAML inválido ou incompleto - regenerar
        fields = infer_field_values(filepath, body)
        
        # Tentar aproveitar valores válidos do YAML antigo
        if parsed:
            for key in ['title', 'domain', 'type', 'status']:
                if key in parsed and parsed[key]:
                    fields[key] = parsed[key]
        
        # Gerar novo frontmatter
        new_frontmatter = serialize_yaml_safe(fields)
        new_content = f"---\n{new_frontmatter}\n---\n\n{body.lstrip()}"
        
        # Escrever arquivo
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        # Re-stage
        subprocess.run(['git', 'add', filepath], check=True, capture_output=True)
        
        return True, "✅ Frontmatter regenerado"
        
    except Exception as e:
        return False, f"❌ Erro: {str(e)}"

def main():
    files = get_staged_markdown_files()
    
    if not files:
        print("ℹ️  Nenhum arquivo markdown staged")
        return
    
    print("=" * 80)
    print("🔧 Corrigindo erros de YAML em arquivos staged")
    print("=" * 80)
    print()
    
    fixed = 0
    skipped = 0
    errors = 0
    
    for filepath in files:
        success, message = fix_file(filepath)
        
        if success:
            fixed += 1
            print(f"  {message}: {filepath}")
        elif 'Erro' in message:
            errors += 1
            print(f"  {message}: {filepath}")
        else:
            skipped += 1
    
    print()
    print("=" * 80)
    print("📊 RESUMO:")
    print(f"  • Arquivos corrigidos: {fixed}")
    print(f"  • Arquivos válidos: {skipped}")
    print(f"  • Erros: {errors}")
    print("=" * 80)

if __name__ == '__main__':
    main()



