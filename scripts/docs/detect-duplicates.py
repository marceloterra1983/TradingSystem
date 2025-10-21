#!/usr/bin/env python3
"""
Documentation Duplicate Detection Script

Detects potential duplicate documentation by comparing titles, summaries,
and content to identify files that might need consolidation.

Usage:
    python detect-duplicates.py \
        --docs-dir ./docs/context \
        --output ./docs/reports/duplicate-detection.json \
        --title-threshold 0.8 \
        --summary-threshold 0.7 \
        --verbose
"""

import argparse
import hashlib
import json
import logging
import re
import sys
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import yaml


# Similarity thresholds
DEFAULT_TITLE_THRESHOLD = 0.8
DEFAULT_SUMMARY_THRESHOLD = 0.7
DEFAULT_CONTENT_THRESHOLD = 0.9

# Exclude patterns
EXCLUDE_PATTERNS = {
    'node_modules', '.git', 'build', 'dist', '_archived',
    '.pytest_cache', '__pycache__', '.venv', 'venv'
}

# Files that are expected to be similar (intentional duplicates)
INTENTIONAL_DUPLICATES = {
    # README files that serve as indices for different directories
    'README.md',
    # Common template files
    'template.md',
    'TEMPLATE.md'
}


def setup_logging(verbose: bool = False) -> None:
    """Setup logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )


def extract_frontmatter(file_path: Path) -> Optional[Dict]:
    """Extract YAML frontmatter from a markdown file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        logging.error(f"Error reading file {file_path}: {e}")
        return None

    # Check if file has frontmatter (handle both \n and \r\n line endings)
    if not re.match(r'^---\r?\n', content):
        return None

    # Find the end of frontmatter (support various line endings)
    end_match = re.search(r'\n---\r?\n|\n---\r?$', content[4:])
    if end_match is None:
        logging.warning(f"File {file_path} has unclosed frontmatter")
        return None

    end_idx = 4 + end_match.start()  # Position of \n before ---
    frontmatter_text = content[4:end_idx]

    try:
        frontmatter = yaml.safe_load(frontmatter_text)
        return frontmatter
    except yaml.YAMLError as e:
        logging.error(f"Error parsing YAML in {file_path}: {e}")
        return None


def extract_full_normalized_content(file_path: Path) -> str:
    """
    Extract and normalize full content from markdown file (excluding frontmatter).
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        logging.error(f"Error reading file {file_path}: {e}")
        return ""

    # Remove frontmatter if present (handle both \n and \r\n line endings)
    if re.match(r'^---\r?\n', content):
        end_match = re.search(r'\n---\r?\n|\n---\r?$', content[4:])
        if end_match is not None:
            frontmatter_end = 4 + end_match.end()
            content = content[frontmatter_end:]

    # Remove markdown formatting for comparison
    content = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', content)  # Links
    content = re.sub(r'!\[([^\]]*)\]\([^)]+\)', '', content)    # Images
    content = re.sub(r'[*_`]', '', content)                     # Emphasis and code
    content = re.sub(r'#{1,6}\s+', '', content)                # Headers
    content = re.sub(r'\n+', ' ', content)                     # Newlines to spaces
    return content.strip()


def generate_content_hash(content: str) -> str:
    """Generate MD5 hash of content."""
    return hashlib.md5(content.encode('utf-8')).hexdigest()


def calculate_similarity(text1: str, text2: str) -> float:
    """Calculate similarity ratio between two text strings."""
    return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()


def normalize_text(text: str) -> str:
    """Normalize text for comparison."""
    if not text:
        return ""

    # Convert to lowercase and remove extra whitespace
    text = text.lower().strip()
    text = ' '.join(text.split())

    # Remove common punctuation
    import re
    text = re.sub(r'[^\w\s]', '', text)

    return text


def find_exact_duplicates(file_data: List[Dict]) -> List[Dict]:
    """
    Find files with identical content hashes.
    
    Uses full normalized content hash for accurate duplicate detection.
    """
    hash_groups = {}

    # Group files by content hash
    for data in file_data:
        content_hash = data.get('content_hash')
        if content_hash:
            if content_hash not in hash_groups:
                hash_groups[content_hash] = []
            hash_groups[content_hash].append(data)

    # Find groups with more than one file
    exact_duplicates = []
    for content_hash, files in hash_groups.items():
        if len(files) > 1:
            exact_duplicates.append({
                'content_hash': content_hash,
                'files': files,
                'count': len(files)
            })

    return exact_duplicates


def find_similar_titles(file_data: List[Dict], threshold: float) -> List[Dict]:
    """Find files with similar titles."""
    similar_titles = []

    # Filter files with titles
    files_with_titles = [f for f in file_data if f.get('title')]

    for i, file1 in enumerate(files_with_titles):
        for file2 in files_with_titles[i+1:]:
            title1 = normalize_text(file1['title'])
            title2 = normalize_text(file2['title'])

            if not title1 or not title2:
                continue

            similarity = calculate_similarity(title1, title2)

            if similarity >= threshold:
                similar_titles.append({
                    'file1': file1,
                    'file2': file2,
                    'title_similarity': round(similarity, 3),
                    'title1': file1['title'],
                    'title2': file2['title'],
                    'recommendation': 'Review for potential consolidation'
                })

    return sorted(similar_titles, key=lambda x: x['title_similarity'], reverse=True)


def find_similar_summaries(file_data: List[Dict], threshold: float) -> List[Dict]:
    """Find files with similar summaries."""
    similar_summaries = []

    # Filter files with summaries
    files_with_summaries = [f for f in file_data if f.get('summary')]

    for i, file1 in enumerate(files_with_summaries):
        for file2 in files_with_summaries[i+1:]:
            summary1 = normalize_text(file1['summary'])
            summary2 = normalize_text(file2['summary'])

            if not summary1 or not summary2:
                continue

            similarity = calculate_similarity(summary1, summary2)

            if similarity >= threshold:
                similar_summaries.append({
                    'file1': file1,
                    'file2': file2,
                    'summary_similarity': round(similarity, 3),
                    'summary1': file1['summary'],
                    'summary2': file2['summary'],
                    'recommendation': 'Review for potential consolidation'
                })

    return sorted(similar_summaries, key=lambda x: x['summary_similarity'], reverse=True)


def find_similar_content(file_data: List[Dict], threshold: float) -> List[Dict]:
    """Find files with similar content previews."""
    similar_content = []

    for i, file1 in enumerate(file_data):
        for file2 in file_data[i+1:]:
            content1 = normalize_text(file1.get('content_preview', ''))
            content2 = normalize_text(file2.get('content_preview', ''))

            if not content1 or not content2:
                continue

            similarity = calculate_similarity(content1, content2)

            if similarity >= threshold:
                similar_content.append({
                    'file1': file1,
                    'file2': file2,
                    'content_similarity': round(similarity, 3),
                    'recommendation': 'Review for potential consolidation'
                })

    return sorted(similar_content, key=lambda x: x['content_similarity'], reverse=True)


def find_similar_filenames(file_data: List[Dict]) -> List[Dict]:
    """Find files with similar names in different directories."""
    similar_filenames = []

    # Group by filename (without directory)
    filename_groups = {}
    for data in file_data:
        filename = Path(data['file_path']).name
        if filename not in filename_groups:
            filename_groups[filename] = []
        filename_groups[filename].append(data)

    # Find groups with more than one file
    for filename, files in filename_groups.items():
        if len(files) > 1 and filename not in INTENTIONAL_DUPLICATES:
            similar_filenames.append({
                'filename': filename,
                'files': files,
                'count': len(files),
                'recommendation': 'Review if multiple instances are necessary'
            })

    return similar_filenames


def analyze_domain_overlap(similar_items: List[Dict], file_data: List[Dict]) -> Dict:
    """Analyze duplicate patterns across different domains."""
    domain_analysis = {
        'cross_domain_duplicates': [],
        'domain_specific_duplicates': {},
        'domain_patterns': {}
    }

    # Build domain lookup
    file_domains = {data['file_path']: data.get('domain', 'unknown') for data in file_data}

    # Analyze similar items for cross-domain patterns
    for item in similar_items:
        if 'file1' in item and 'file2' in item:
            domain1 = file_domains.get(item['file1']['file_path'], 'unknown')
            domain2 = file_domains.get(item['file2']['file_path'], 'unknown')

            if domain1 != domain2 and domain1 != 'unknown' and domain2 != 'unknown':
                domain_analysis['cross_domain_duplicates'].append({
                    'item': item,
                    'domains': [domain1, domain2],
                    'recommendation': 'Consider consolidating to shared domain'
                })

    # Count duplicates by domain
    for data in file_data:
        domain = data.get('domain', 'unknown')
        if domain not in domain_analysis['domain_patterns']:
            domain_analysis['domain_patterns'][domain] = {
                'total_files': 0,
                'files_with_duplicates': 0
            }

        domain_analysis['domain_patterns'][domain]['total_files'] += 1

    return domain_analysis


def scan_markdown_files(docs_dir: Path) -> List[Path]:
    """Scan directory for markdown files, excluding patterns."""
    markdown_files = []

    for file_path in docs_dir.rglob('*.md'):
        # Skip if file matches exclude patterns
        if any(pattern in str(file_path) for pattern in EXCLUDE_PATTERNS):
            continue

        # Skip symlinks
        if file_path.is_symlink():
            continue

        markdown_files.append(file_path)

    return sorted(markdown_files)


def main():
    """Main script execution."""
    parser = argparse.ArgumentParser(description='Detect duplicate documentation')
    parser.add_argument(
        '--docs-dir',
        type=str,
        nargs='+',
        default=['./docs/context'],
        help='One or more documentation directories to scan'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='./docs/reports/duplicate-detection.json',
        help='Output JSON file path'
    )
    parser.add_argument(
        '--title-threshold',
        type=float,
        default=DEFAULT_TITLE_THRESHOLD,
        help='Title similarity threshold (0.0-1.0)'
    )
    parser.add_argument(
        '--summary-threshold',
        type=float,
        default=DEFAULT_SUMMARY_THRESHOLD,
        help='Summary similarity threshold (0.0-1.0)'
    )
    parser.add_argument(
        '--content-threshold',
        type=float,
        default=DEFAULT_CONTENT_THRESHOLD,
        help='Content similarity threshold (0.0-1.0)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )

    args = parser.parse_args()

    setup_logging(args.verbose)

    # Validate thresholds
    for threshold, name in [
        (args.title_threshold, 'title'),
        (args.summary_threshold, 'summary'),
        (args.content_threshold, 'content')
    ]:
        if not 0.0 <= threshold <= 1.0:
            logging.error(f"{name} threshold must be between 0.0 and 1.0, got {threshold}")
            sys.exit(1)

    # Validate input directories
    docs_dirs = [Path(d) for d in args.docs_dir]
    all_markdown_files = []
    for docs_dir in docs_dirs:
        if not docs_dir.exists() or not docs_dir.is_dir():
            logging.warning(f"Documentation directory does not exist or is not a directory: {docs_dir}")
            continue
        logging.info(f"Scanning markdown files in {docs_dir}")
        markdown_files = scan_markdown_files(docs_dir)
        all_markdown_files.extend(markdown_files)
        logging.info(f"Found {len(markdown_files)} markdown files in {docs_dir}")

    logging.info(f"Processing a total of {len(all_markdown_files)} markdown files.")

    # Process files
    file_data = []
    for file_path in all_markdown_files:
        logging.debug(f"Processing: {file_path}")

        # Extract frontmatter
        frontmatter = extract_frontmatter(file_path)

        # Extract and normalize full content
        full_content = extract_full_normalized_content(file_path)

        # Generate content hash from full normalized content
        content_hash = generate_content_hash(full_content)

        # Create a preview for similarity checks
        content_preview = full_content[:500]

        data = {
            'file_path': str(file_path.relative_to(Path.cwd())),
            'absolute_path': str(file_path),
            'title': frontmatter.get('title') if frontmatter else None,
            'summary': frontmatter.get('summary') if frontmatter else None,
            'domain': frontmatter.get('domain') if frontmatter else None,
            'type': frontmatter.get('type') if frontmatter else None,
            'status': frontmatter.get('status') if frontmatter else None,
            'has_frontmatter': frontmatter is not None,
            'content_preview': content_preview,
            'content_hash': content_hash
        }

        file_data.append(data)

    logging.info(f"Processed {len(file_data)} files")

    # Find duplicates
    logging.info("Finding exact duplicates...")
    exact_duplicates = find_exact_duplicates(file_data)

    logging.info("Finding similar titles...")
    similar_titles = find_similar_titles(file_data, args.title_threshold)

    logging.info("Finding similar summaries...")
    similar_summaries = find_similar_summaries(file_data, args.summary_threshold)

    logging.info("Finding similar content...")
    similar_content = find_similar_content(file_data, args.content_threshold)

    logging.info("Finding similar filenames...")
    similar_filenames = find_similar_filenames(file_data)

    # Analyze domain patterns
    all_similar = similar_titles + similar_summaries + similar_content
    domain_analysis = analyze_domain_overlap(all_similar, file_data)

    # Generate recommendations
    recommendations = []

    if exact_duplicates:
        recommendations.append({
            'priority': 'high',
            'category': 'exact_duplicates',
            'description': f"Found {len(exact_duplicates)} groups of exact duplicates",
            'action': 'Consolidate or remove duplicate files',
            'affected_files': sum(len(d['files']) for d in exact_duplicates)
        })

    if similar_titles:
        recommendations.append({
            'priority': 'medium',
            'category': 'similar_titles',
            'description': f"Found {len(similar_titles)} pairs with similar titles",
            'action': 'Review for potential consolidation',
            'affected_files': len(similar_titles) * 2
        })

    if domain_analysis['cross_domain_duplicates']:
        recommendations.append({
            'priority': 'medium',
            'category': 'cross_domain_duplicates',
            'description': f"Found {len(domain_analysis['cross_domain_duplicates'])} cross-domain duplicates",
            'action': 'Consider moving to shared domain or consolidating',
            'affected_files': len(domain_analysis['cross_domain_duplicates']) * 2
        })

    # Prepare final report
    report = {
        'metadata': {
            'scan_date': datetime.now().isoformat(),
            'docs_directory': [str(d) for d in docs_dirs],
            'title_threshold': args.title_threshold,
            'summary_threshold': args.summary_threshold,
            'content_threshold': args.content_threshold,
            'script_version': '1.0.0'
        },
        'summary': {
            'total_files': len(file_data),
            'files_with_frontmatter': sum(1 for f in file_data if f['has_frontmatter']),
            'exact_duplicates': len(exact_duplicates),
            'total_exact_duplicate_files': sum(len(d['files']) for d in exact_duplicates),
            'similar_titles': len(similar_titles),
            'similar_summaries': len(similar_summaries),
            'similar_content': len(similar_content),
            'similar_filenames': len(similar_filenames),
            'cross_domain_duplicates': len(domain_analysis['cross_domain_duplicates'])
        },
        'exact_duplicates': exact_duplicates,
        'similar_titles': similar_titles,
        'similar_summaries': similar_summaries,
        'similar_content': similar_content,
        'similar_filenames': similar_filenames,
        'domain_analysis': domain_analysis,
        'recommendations': recommendations,
        'file_data': file_data
    }

    # Ensure output directory exists
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write report
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    logging.info(f"Duplicate detection complete. Report saved to {output_path}")

    # Print summary
    print(f"\n=== Duplicate Detection Summary ===")
    print(f"Total files scanned: {report['summary']['total_files']}")
    print(f"Files with frontmatter: {report['summary']['files_with_frontmatter']}")
    print(f"Exact duplicate groups: {report['summary']['exact_duplicates']}")
    print(f"Files in exact duplicates: {report['summary']['total_exact_duplicate_files']}")
    print(f"Similar title pairs: {report['summary']['similar_titles']}")
    print(f"Similar summary pairs: {report['summary']['similar_summaries']}")
    print(f"Similar content pairs: {report['summary']['similar_content']}")
    print(f"Similar filename groups: {report['summary']['similar_filenames']}")
    print(f"Cross-domain duplicates: {report['summary']['cross_domain_duplicates']}")

    if recommendations:
        print(f"\n📋 Recommendations:")
        for rec in recommendations:
            print(f"  - [{rec['priority'].upper()}] {rec['description']}")
            print(f"    Action: {rec['action']}")

        total_issues = sum(r['affected_files'] for r in recommendations)
        print(f"\n⚠️  Found {total_issues} files that may need attention")
        sys.exit(1)
    else:
        print(f"\n✅ No significant duplicates found")
        sys.exit(0)


if __name__ == '__main__':
    main()