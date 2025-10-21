#!/usr/bin/env python3
"""
Documentation Frontmatter Validation Script

Validates YAML frontmatter across all markdown files in the documentation directory.
Checks for required fields, validates field values, and checks document freshness.

Usage:
    python validate-frontmatter.py \
        --docs-dir ./docs/context \
        --output ./docs/reports/frontmatter-validation.json \
        --threshold-days 90 \
        --verbose
"""

import argparse
import json
import logging
import re
import sys
from datetime import datetime, timedelta, date
from pathlib import Path
from typing import Dict, List, Optional, Set, Any

import yaml


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return json.JSONEncoder.default(self, obj)


# Required frontmatter fields from DOCUMENTATION-STANDARD.md
REQUIRED_FIELDS = {
    'title': str,
    'sidebar_position': int,
    'tags': list,
    'domain': str,
    'type': str,
    'summary': str,
    'status': str,
    'last_review': str
}

# Allowed values for domain and type fields
ALLOWED_DOMAINS = {'frontend', 'backend', 'ops', 'shared'}
ALLOWED_TYPES = {
    'guide', 'reference', 'adr', 'prd', 'rfc', 'runbook',
    'overview', 'index', 'glossary', 'template', 'feature'
}

ALLOWED_STATUSES = {'draft', 'active', 'deprecated'}

# Exclude patterns
EXCLUDE_PATTERNS = {
    'node_modules', '.git', 'build', 'dist', '_archived',
    '.pytest_cache', '__pycache__', '.venv', 'venv'
}

# Files to intentionally skip (known exceptions)
SKIP_FILES = {
    # Add specific files that should be skipped
}


def setup_logging(verbose: bool = False) -> None:
    """Setup logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )


def extract_frontmatter(file_path: Path) -> tuple[Optional[Dict], str]:
    """
    Extract YAML frontmatter from a markdown file.

    Returns:
        Tuple of (frontmatter_dict, content_without_frontmatter)
    """
    content_text = ""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            content_text = content
    except UnicodeDecodeError:
        logging.warning(f"Could not decode file {file_path} as UTF-8, skipping.")
        return None, ""
    except Exception as e:
        logging.error(f"Error reading file {file_path}: {e}")
        return None, ""

    # Check if file has frontmatter (handle both \n and \r\n line endings)
    if not re.match(r'^---\r?\n', content):
        return None, content

    # Find the end of frontmatter (support various line endings)
    # Match closing --- with optional \r before \n, or at end of file
    end_match = re.search(r'\n---\r?\n|\n---\r?$', content[4:])
    if end_match is None:
        logging.warning(f"File {file_path} has unclosed frontmatter")
        return None, content

    # Calculate indices
    end_idx = 4 + end_match.start()  # Position of \n before ---
    frontmatter_end = 4 + end_match.end()  # Position after closing ---
    
    frontmatter_text = content[4:end_idx]
    content_without_frontmatter = content[frontmatter_end:]

    try:
        frontmatter = yaml.safe_load(frontmatter_text)
        return frontmatter, content_without_frontmatter
    except yaml.YAMLError as e:
        logging.error(f"Error parsing YAML in {file_path}: {e}")
        return None, content_without_frontmatter


def validate_date_format(date_input: Any) -> bool:
    """Validate that date input is in YYYY-MM-DD format or is a date object."""
    if hasattr(date_input, 'strftime'):  # Handles date and datetime objects
        return True
    try:
        datetime.strptime(str(date_input), '%Y-%m-%d')
        return True
    except (ValueError, TypeError):
        return False


def calculate_days_since_review(last_review: Any) -> int:
    """Calculate days since last review date."""
    review_date = None
    if hasattr(last_review, 'strftime'):
        # It's a date or datetime object. We need to get a date object from it.
        if isinstance(last_review, datetime):
            review_date = last_review.date()
        else: # it's a date object
            review_date = last_review
    else:
        try:
            review_date = datetime.strptime(str(last_review), '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return -1  # Invalid date format

    if review_date:
        return (datetime.now().date() - review_date).days
    return -1


def validate_frontmatter_fields(frontmatter: Dict, file_path: str) -> Dict[str, Any]:
    """Validate frontmatter fields against required specifications."""
    issues = []

    # Check for missing required fields
    for field, expected_type in REQUIRED_FIELDS.items():
        if field not in frontmatter:
            issues.append({
                'type': 'missing_field',
                'field': field,
                'message': f"Missing required field: {field}"
            })
        else:
            # Validate field type
            value = frontmatter[field]
            if expected_type == int and not isinstance(value, int):
                issues.append({
                    'type': 'invalid_type',
                    'field': field,
                    'value': value,
                    'expected': expected_type.__name__,
                    'message': f"Field {field} should be {expected_type.__name__}"
                })
            elif expected_type == str and not isinstance(value, str):
                issues.append({
                    'type': 'invalid_type',
                    'field': field,
                    'value': value,
                    'expected': expected_type.__name__,
                    'message': f"Field {field} should be {expected_type.__name__}"
                })
            elif expected_type == list and not isinstance(value, list):
                issues.append({
                    'type': 'invalid_type',
                    'field': field,
                    'value': value,
                    'expected': 'list',
                    'message': f"Field {field} should be a list"
                })

    # Validate domain values
    if 'domain' in frontmatter:
        domain = frontmatter['domain']
        if domain not in ALLOWED_DOMAINS:
            issues.append({
                'type': 'invalid_value',
                'field': 'domain',
                'value': domain,
                'allowed': list(ALLOWED_DOMAINS),
                'message': f"Invalid domain '{domain}'. Allowed: {', '.join(ALLOWED_DOMAINS)}"
            })

    # Validate type values
    if 'type' in frontmatter:
        doc_type = frontmatter['type']
        if doc_type not in ALLOWED_TYPES:
            issues.append({
                'type': 'invalid_value',
                'field': 'type',
                'value': doc_type,
                'allowed': list(ALLOWED_TYPES),
                'message': f"Invalid type '{doc_type}'. Allowed: {', '.join(ALLOWED_TYPES)}"
            })

    # Validate status values
    if 'status' in frontmatter:
        status = frontmatter['status']
        if status not in ALLOWED_STATUSES:
            issues.append({
                'type': 'invalid_value',
                'field': 'status',
                'value': status,
                'allowed': list(ALLOWED_STATUSES),
                'message': f"Invalid status '{status}'. Allowed: {', '.join(ALLOWED_STATUSES)}"
            })

    # Validate date format
    if 'last_review' in frontmatter:
        last_review = frontmatter['last_review']
        if not validate_date_format(last_review):
            issues.append({
                'type': 'invalid_date',
                'field': 'last_review',
                'value': str(last_review),
                'message': f"Invalid date format '{last_review}'. Expected: YYYY-MM-DD"
            })

    # Validate sidebar_position is positive
    if 'sidebar_position' in frontmatter:
        position = frontmatter['sidebar_position']
        if isinstance(position, int) and position < 0:
            issues.append({
                'type': 'invalid_value',
                'field': 'sidebar_position',
                'value': position,
                'message': f"sidebar_position should be non-negative, got {position}"
            })

    return {
        'file': file_path,
        'has_frontmatter': True,
        'issues': issues,
        'frontmatter': frontmatter
    }


def scan_markdown_files(docs_dir: Path) -> List[Path]:
    """Scan directory for markdown files, excluding symlinks and patterns."""
    markdown_files = []

    for file_path in docs_dir.rglob('*.md'):
        # Skip if file matches exclude patterns
        if any(pattern in str(file_path) for pattern in EXCLUDE_PATTERNS):
            continue

        # Skip symlinks to avoid duplicates
        if file_path.is_symlink():
            continue

        # Skip specific files
        if str(file_path) in SKIP_FILES:
            continue

        markdown_files.append(file_path)

    return sorted(markdown_files)


def analyze_document_freshness(results: List[Dict], threshold_days: int) -> Dict:
    """Analyze document freshness based on last_review dates."""
    outdated_documents = []
    current_date = datetime.now()

    for result in results:
        if not result.get('has_frontmatter'):
            continue

        frontmatter = result.get('frontmatter', {})
        last_review = frontmatter.get('last_review')

        if last_review and validate_date_format(last_review):
            days_old = calculate_days_since_review(last_review)
            if days_old > threshold_days:
                outdated_documents.append({
                    'file': result['file'],
                    'last_review': last_review,
                    'days_old': days_old,
                    'priority': 'high' if days_old > 365 else 'medium'
                })

    return {
        'outdated_documents': sorted(outdated_documents, key=lambda x: x['days_old'], reverse=True),
        'threshold_days': threshold_days,
        'analysis_date': current_date.strftime('%Y-%m-%d')
    }


def generate_statistics(results: List[Dict]) -> Dict:
    """Generate summary statistics from validation results."""
    total_files = len(results)
    files_with_frontmatter = sum(1 for r in results if r['has_frontmatter'])
    files_missing_frontmatter = total_files - files_with_frontmatter

    # Count files with issues
    files_with_issues = 0
    files_incomplete_frontmatter = 0

    issue_counts = {}
    domain_counts = {}
    type_counts = {}

    for result in results:
        if result['has_frontmatter']:
            issues = result.get('issues', [])
            if issues:
                files_with_issues += 1

            # Check if missing required fields
            missing_fields = [i for i in issues if i['type'] == 'missing_field']
            if missing_fields:
                files_incomplete_frontmatter += 1

            # Count issues by type
            for issue in issues:
                issue_type = issue['type']
                issue_counts[issue_type] = issue_counts.get(issue_type, 0) + 1

            # Count by domain and type
            frontmatter = result.get('frontmatter', {})
            domain = frontmatter.get('domain', 'unknown')
            doc_type = frontmatter.get('type', 'unknown')

            domain_counts[domain] = domain_counts.get(domain, 0) + 1
            type_counts[doc_type] = type_counts.get(doc_type, 0) + 1

    return {
        'total_files': total_files,
        'files_with_frontmatter': files_with_frontmatter,
        'files_missing_frontmatter': files_missing_frontmatter,
        'files_with_issues': files_with_issues,
        'files_incomplete_frontmatter': files_incomplete_frontmatter,
        'issue_counts': issue_counts,
        'domain_distribution': domain_counts,
        'type_distribution': type_counts
    }


def main():
    """Main script execution."""
    parser = argparse.ArgumentParser(description='Validate markdown frontmatter')
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
        default='./docs/reports/frontmatter-validation.json',
        help='Output JSON file path'
    )
    parser.add_argument(
        '--threshold-days',
        type=int,
        default=90,
        help='Days threshold for outdated documents'
    )
    parser.add_argument(
        '--strict',
        action='store_true',
        help='Strict mode: validate all fields including sidebar_position (default: True for backward compatibility)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )

    args = parser.parse_args()

    setup_logging(args.verbose)

    results = []
    all_markdown_files = []
    docs_dirs = [Path(d) for d in args.docs_dir]

    for docs_dir in docs_dirs:
        if not docs_dir.exists() or not docs_dir.is_dir():
            logging.warning(f"Documentation directory does not exist or is not a directory: {docs_dir}")
            continue

        logging.info(f"Scanning markdown files in {docs_dir}")
        markdown_files = scan_markdown_files(docs_dir)
        all_markdown_files.extend(markdown_files)
        logging.info(f"Found {len(markdown_files)} markdown files in {docs_dir}")

    logging.info(f"Processing a total of {len(all_markdown_files)} markdown files.")

    # Validate each file
    for file_path in all_markdown_files:
        logging.debug(f"Processing: {file_path}")

        frontmatter, content = extract_frontmatter(file_path)
        relative_path = str(file_path.relative_to(Path.cwd()))

        if frontmatter is None:
            results.append({
                'file': relative_path,
                'has_frontmatter': False,
                'issues': [{
                    'type': 'no_frontmatter',
                    'message': 'No YAML frontmatter found'
                }],
                'frontmatter': None
            })
        else:
            result = validate_frontmatter_fields(frontmatter, relative_path)
            results.append(result)

    # Generate statistics
    statistics = generate_statistics(results)

    # Analyze document freshness
    freshness_analysis = analyze_document_freshness(results, args.threshold_days)

    # Prepare final report
    report = {
        'metadata': {
            'scan_date': datetime.now().isoformat(),
            'docs_directory': [str(d) for d in docs_dirs],
            'threshold_days': args.threshold_days,
            'script_version': '1.0.0'
        },
        'summary': statistics,
        'freshness_analysis': freshness_analysis,
        'results': results,
        'missing_frontmatter': [r['file'] for r in results if not r['has_frontmatter']],
        'incomplete_frontmatter': [
            {
                'file': r['file'],
                'missing_fields': [i['field'] for i in r['issues'] if i['type'] == 'missing_field']
            }
            for r in results if r['has_frontmatter'] and any(i['type'] == 'missing_field' for i in r['issues'])
        ],
        'invalid_values': [
            {
                'file': r['file'],
                'field': i['field'],
                'value': i.get('value'),
                'allowed': i.get('allowed'),
                'message': i['message']
            }
            for r in results if r['has_frontmatter']
            for i in r['issues'] if i['type'] in ['invalid_value', 'invalid_type', 'invalid_date']
        ]
    }

    # Ensure output directory exists
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write report
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False, cls=CustomJSONEncoder)

    logging.info(f"Frontmatter validation complete. Report saved to {output_path}")

    # Print summary
    print(f"\n=== Frontmatter Validation Summary ===")
    print(f"Total files scanned: {statistics['total_files']}")
    print(f"Files with frontmatter: {statistics['files_with_frontmatter']}")
    print(f"Files missing frontmatter: {statistics['files_missing_frontmatter']}")
    print(f"Files with incomplete frontmatter: {statistics['files_incomplete_frontmatter']}")
    print(f"Outdated documents (> {args.threshold_days} days): {len(freshness_analysis['outdated_documents'])}")

    if statistics['files_with_issues'] > 0:
        print(f"\n⚠️  Found {statistics['files_with_issues']} files with issues")
        sys.exit(1)
    else:
        print(f"\n✅ All files passed validation")
        sys.exit(0)


if __name__ == '__main__':
    main()