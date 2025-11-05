#!/usr/bin/env python3
"""
Analyze Broken Links in Documentation

This script analyzes broken links detected during Docusaurus build,
categorizes them, and provides intelligent suggestions for fixes.

Features:
- Parse Docusaurus broken link warnings
- Categorize links (internal, external, governance, API)
- Provide smart suggestions based on file existence and naming
- Generate actionable fix report
- Support bulk link replacement
"""

import os
import re
import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime
from difflib import get_close_matches

# ==================== CONFIGURATION ====================

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DOCS_DIR = PROJECT_ROOT / "docs"
CONTENT_DIR = DOCS_DIR / "content"
REPORTS_DIR = DOCS_DIR / "reports"

# ==================== UTILITY FUNCTIONS ====================

def parse_docusaurus_warnings(build_output: str) -> List[Dict[str, any]]:
    """Parse broken links from Docusaurus build output"""
    broken_links = []
    
    # Regex patterns for broken links
    source_pattern = r"- Broken link on source page path = (.+):"
    link_pattern = r"   -> linking to (.+?) \(resolved as: (.+?)\)|   -> linking to (.+)"
    
    current_source = None
    
    for line in build_output.split('\n'):
        source_match = re.match(source_pattern, line)
        if source_match:
            current_source = source_match.group(1)
            continue
        
        link_match = re.match(link_pattern, line.strip())
        if link_match and current_source:
            if link_match.group(1):
                # Link with resolution
                target = link_match.group(1)
                resolved = link_match.group(2)
            else:
                # Link without resolution
                target = link_match.group(3)
                resolved = target
            
            broken_links.append({
                'source': current_source,
                'target': target,
                'resolved': resolved
            })
    
    return broken_links

def categorize_link(link: str) -> str:
    """Categorize a link by type"""
    if 'governance' in link.lower():
        return 'governance'
    elif link.startswith('http'):
        return 'external'
    elif link.startswith('/api/'):
        return 'api'
    elif link.endswith('.puml'):
        return 'diagram'
    elif 'backend/' in link or 'config/' in link:
        return 'source_code'
    elif link.startswith('/'):
        return 'internal_absolute'
    else:
        return 'internal_relative'

def find_similar_files(target: str, content_dir: Path) -> List[str]:
    """Find similar files in content directory using fuzzy matching"""
    # Extract filename from path
    target_name = Path(target).name.replace('.md', '').replace('.mdx', '')
    
    # Get all markdown files
    all_files = []
    for ext in ['*.md', '*.mdx']:
        all_files.extend(content_dir.rglob(ext))
    
    # Create list of relative paths
    file_paths = [str(f.relative_to(content_dir)) for f in all_files]
    file_names = [Path(f).stem for f in file_paths]
    
    # Find close matches
    close_name_matches = get_close_matches(target_name, file_names, n=3, cutoff=0.6)
    
    # Return full paths for matches
    suggestions = []
    for match_name in close_name_matches:
        for path in file_paths:
            if Path(path).stem == match_name:
                suggestions.append(path)
                break
    
    return suggestions

def suggest_fix(link: Dict[str, any]) -> Dict[str, any]:
    """Suggest a fix for a broken link"""
    target = link['target']
    resolved = link['resolved']
    category = categorize_link(target)
    
    suggestion = {
        'category': category,
        'original': target,
        'reason': '',
        'fixes': []
    }
    
    if category == 'governance':
        # Governance docs are outside content/ directory
        suggestion['reason'] = 'Governance documents are not part of Docusaurus content'
        
        # Check if file exists in governance/
        gov_path = DOCS_DIR / 'governance' / Path(target).name
        if gov_path.exists():
            suggestion['fixes'].append({
                'type': 'external_link',
                'replacement': f'https://github.com/marceloterra1983/TradingSystem/blob/main/governance/{Path(target).name}',
                'description': 'Link to GitHub (governance files are not published)'
            })
        else:
            suggestion['fixes'].append({
                'type': 'create_content',
                'replacement': None,
                'description': 'Create a summary page in content/ that links to governance docs'
            })
    
    elif category == 'api':
        # API documentation links
        suggestion['reason'] = 'API documentation reference is missing'
        
        # Check if target is workspace/tp-capital API
        if 'workspace' in target:
            suggestion['fixes'].append({
                'type': 'redocusaurus',
                'replacement': '/api/workspace',
                'description': 'Use Redocusaurus API documentation path'
            })
        elif 'rag-services' in target:
            suggestion['fixes'].append({
                'type': 'create_spec',
                'replacement': None,
                'description': 'Create OpenAPI spec for RAG services and add to Redocusaurus'
            })
    
    elif category == 'diagram':
        # PlantUML diagram references
        suggestion['reason'] = 'PlantUML source files are not published directly'
        suggestion['fixes'].append({
            'type': 'embed_diagram',
            'replacement': None,
            'description': 'Embed rendered diagram using @theme/PlantUML component'
        })
    
    elif category == 'source_code':
        # Source code references
        suggestion['reason'] = 'Source code files are not part of documentation'
        suggestion['fixes'].append({
            'type': 'github_link',
            'replacement': f'https://github.com/marceloterra1983/TradingSystem/blob/main{resolved}',
            'description': 'Link to source code on GitHub'
        })
    
    elif category in ['internal_absolute', 'internal_relative']:
        # Internal documentation links
        suggestion['reason'] = 'Documentation file not found at expected location'
        
        # Find similar files
        similar = find_similar_files(target, CONTENT_DIR)
        
        if similar:
            for match in similar:
                suggestion['fixes'].append({
                    'type': 'update_path',
                    'replacement': f'/{match.replace(".md", "").replace(".mdx", "")}',
                    'description': f'File exists at different location: {match}'
                })
        else:
            suggestion['fixes'].append({
                'type': 'create_or_remove',
                'replacement': None,
                'description': 'Either create the missing file or remove the link'
            })
    
    else:
        # External or unknown
        suggestion['reason'] = 'Link type not recognized'
        suggestion['fixes'].append({
            'type': 'manual_review',
            'replacement': None,
            'description': 'Requires manual review and correction'
        })
    
    return suggestion

def generate_report(broken_links: List[Dict[str, any]], suggestions: List[Dict[str, any]], output_file: Path):
    """Generate a markdown report with findings and suggestions"""
    
    # Group by category
    by_category = {}
    for i, link in enumerate(broken_links):
        cat = suggestions[i]['category']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append((link, suggestions[i]))
    
    # Count statistics
    total_links = len(broken_links)
    categories_count = {cat: len(links) for cat, links in by_category.items()}
    
    # Generate report
    with open(output_file, 'w') as f:
        f.write(f"""# Broken Links Analysis Report

**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Total Broken Links**: {total_links}
**Categories Detected**: {len(by_category)}

---

## Summary

""")
        
        for cat, count in sorted(categories_count.items(), key=lambda x: -x[1]):
            f.write(f"- **{cat.replace('_', ' ').title()}**: {count} links\n")
        
        f.write("\n---\n\n")
        
        # Detailed findings by category
        for cat, links in sorted(by_category.items()):
            f.write(f"## {cat.replace('_', ' ').title()} ({len(links)} links)\n\n")
            
            for link, suggestion in links:
                f.write(f"### Source: `{link['source']}`\n\n")
                f.write(f"**Broken Link**: `{link['target']}`\n\n")
                f.write(f"**Reason**: {suggestion['reason']}\n\n")
                
                if suggestion['fixes']:
                    f.write("**Suggested Fixes**:\n\n")
                    for i, fix in enumerate(suggestion['fixes'], 1):
                        f.write(f"{i}. **{fix['type'].replace('_', ' ').title()}**\n")
                        if fix['replacement']:
                            f.write(f"   - Replace with: `{fix['replacement']}`\n")
                        f.write(f"   - {fix['description']}\n\n")
                
                f.write("---\n\n")
        
        # Quick fix commands
        f.write("## Quick Fix Commands\n\n")
        f.write("### Remove All Governance Links (Not Published)\n\n")
        f.write("```bash\n")
        f.write("# Search for governance links\n")
        f.write("grep -r '/governance/' docs/content/\n\n")
        f.write("# Remove manually or create summary page\n")
        f.write("```\n\n")
        
        f.write("### Fix API Documentation Links\n\n")
        f.write("```bash\n")
        f.write("# Update workspace API links\n")
        f.write("find docs/content -name '*.mdx' -exec sed -i 's|/api/workspace|/api/workspace|g' {} +\n")
        f.write("```\n\n")
        
        f.write("---\n\n")
        f.write("## Recommendations\n\n")
        
        if 'governance' in by_category:
            f.write("1. **Governance Links**: Create a summary page in `content/` that describes governance processes with links to GitHub\n")
        
        if 'diagram' in by_category:
            f.write("2. **Diagram Links**: Use `@theme/PlantUML` component to embed rendered diagrams instead of linking to .puml files\n")
        
        if 'source_code' in by_category:
            f.write("3. **Source Code Links**: Replace with GitHub links or create code snippet examples in documentation\n")
        
        f.write("\n---\n\n")
        f.write("**Next Steps**:\n\n")
        f.write("1. Review each broken link and apply suggested fixes\n")
        f.write("2. Run `npm run docs:build` to verify fixes\n")
        f.write("3. Commit changes with descriptive message (e.g., 'docs: fix broken internal links')\n")

def generate_json_report(broken_links: List[Dict[str, any]], suggestions: List[Dict[str, any]], output_file: Path):
    """Generate a JSON report for programmatic processing"""
    report = {
        'timestamp': datetime.now().isoformat(),
        'total_broken_links': len(broken_links),
        'links': []
    }
    
    for link, suggestion in zip(broken_links, suggestions):
        report['links'].append({
            'source': link['source'],
            'target': link['target'],
            'resolved': link['resolved'],
            'category': suggestion['category'],
            'reason': suggestion['reason'],
            'fixes': suggestion['fixes']
        })
    
    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2)

# ==================== MAIN FUNCTION ====================

def main():
    parser = argparse.ArgumentParser(description='Analyze broken links in Docusaurus documentation')
    parser.add_argument('--build-log', type=str, help='Path to Docusaurus build log file')
    parser.add_argument('--output-dir', type=str, default=str(REPORTS_DIR), help='Output directory for reports')
    parser.add_argument('--format', choices=['markdown', 'json', 'both'], default='both', help='Report format')
    
    args = parser.parse_args()
    
    # Read build log
    if args.build_log:
        with open(args.build_log, 'r') as f:
            build_output = f.read()
    else:
        # Read from stdin or run build
        print("No build log provided. Reading from stdin...")
        import sys
        build_output = sys.stdin.read()
    
    # Parse broken links
    print("Parsing broken links...")
    broken_links = parse_docusaurus_warnings(build_output)
    
    if not broken_links:
        print("✅ No broken links found!")
        return 0
    
    print(f"Found {len(broken_links)} broken links")
    
    # Generate suggestions
    print("Analyzing links and generating suggestions...")
    suggestions = [suggest_fix(link) for link in broken_links]
    
    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    
    # Generate reports
    if args.format in ['markdown', 'both']:
        md_report = output_dir / f'broken-links-analysis-{timestamp}.md'
        print(f"Generating markdown report: {md_report}")
        generate_report(broken_links, suggestions, md_report)
    
    if args.format in ['json', 'both']:
        json_report = output_dir / f'broken-links-analysis-{timestamp}.json'
        print(f"Generating JSON report: {json_report}")
        generate_json_report(broken_links, suggestions, json_report)
    
    print(f"\n✅ Analysis complete!")
    print(f"   - Total broken links: {len(broken_links)}")
    print(f"   - Reports saved to: {output_dir}")
    
    return 0

if __name__ == '__main__':
    exit(main())






