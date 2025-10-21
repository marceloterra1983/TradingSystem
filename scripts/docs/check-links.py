#!/usr/bin/env python3
"""
Documentation Link Validation Script

Validates internal and external links in markdown documentation files.
Checks for broken internal links, missing files, and validates external URLs.

Usage:
    python check-links.py \
        --docs-dir ./docs/context \
        --output ./docs/reports/link-validation.json \
        --skip-external \
        --verbose
"""

import argparse
import json
import logging
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# Link patterns
MARKDOWN_LINK_PATTERN = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
IMAGE_LINK_PATTERN = re.compile(r'!\[([^\]]*)\]\(([^)]+)\)')

# Exclude patterns
EXCLUDE_PATTERNS = {
    'node_modules', '.git', 'build', 'dist', '_archived',
    '.pytest_cache', '__pycache__', '.venv', 'venv'
}

# URL patterns to skip (common non-documentation URLs)
SKIP_URL_PATTERNS = {
    'http://localhost',
    'https://localhost',
    'http://127.0.0.1',
    'https://127.0.0.1',
    'example.com',
    'test.com',
}

# File extensions that should exist as targets
VALID_TARGET_EXTENSIONS = {
    '.md', '.txt', '.json', '.yaml', '.yml', '.xml',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf',
    '.html', '.htm', '.css', '.js'
}

# HTTP status codes that indicate success
SUCCESS_STATUS_CODES = {200, 201, 202, 204}
# HTTP status codes that indicate redirection (considered success)
REDIRECT_STATUS_CODES = {301, 302, 303, 307, 308}


def setup_logging(verbose: bool = False) -> None:
    """Setup logging configuration."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )


def create_requests_session() -> requests.Session:
    """Create a requests session with retry configuration."""
    session = requests.Session()

    # Configure retry strategy
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "OPTIONS"]
    )

    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    # Set default headers
    session.headers.update({
        'User-Agent': 'Documentation-Link-Validator/1.0'
    })

    return session


def extract_markdown_links(content: str, line_number: int) -> List[Dict]:
    """
    Extract all markdown links from content.

    Returns:
        List of dictionaries with link information including line number.
    """
    links = []

    # Find all markdown links [text](url)
    for match in MARKDOWN_LINK_PATTERN.finditer(content):
        link_text = match.group(1)
        link_url = match.group(2)

        # Get line number for this match
        text_before = content[:match.start()]
        line_num = text_before.count('\n') + 1

        links.append({
            'text': link_text,
            'url': link_url,
            'line': line_num,
            'type': 'markdown_link',
            'full_match': match.group(0)
        })

    # Find all image links ![alt](url)
    for match in IMAGE_LINK_PATTERN.finditer(content):
        alt_text = match.group(1)
        image_url = match.group(2)

        # Get line number for this match
        text_before = content[:match.start()]
        line_num = text_before.count('\n') + 1

        links.append({
            'text': alt_text,
            'url': image_url,
            'line': line_num,
            'type': 'image_link',
            'full_match': match.group(0)
        })

    return links


def is_external_url(url: str) -> bool:
    """Check if URL is external (starts with http:// or https://)."""
    return url.startswith(('http://', 'https://'))


def is_internal_url(url: str) -> bool:
    """Check if URL is internal (relative path)."""
    return not is_external_url(url) and not url.startswith('#')


def normalize_internal_path(file_path: Path, link_url: str, docs_root: Path, repo_root: Optional[Path] = None) -> Optional[Path]:
    """
    Normalize internal link path to absolute path.

    Args:
        file_path: Path to the file containing the link
        link_url: The URL from the link
        docs_root: Root directory of documentation
        repo_root: Repository root directory (for repo-relative links)

    Returns:
        Absolute Path to target file, or None if invalid
    """
    try:
        # Remove anchor if present
        if '#' in link_url:
            link_url = link_url.split('#')[0]

        # Handle empty links
        if not link_url:
            return None

        # Resolve relative to file directory
        file_dir = file_path.parent
        target_path = file_dir / link_url

        # Normalize path (remove .. and .)
        target_path = target_path.resolve()

        # First check if path is within docs root
        if str(target_path).startswith(str(docs_root.resolve())):
            return target_path
        
        # If not in docs root but we have repo_root, check if it's in repo
        if repo_root:
            if str(target_path).startswith(str(repo_root.resolve())):
                logging.debug(f"Link outside docs but within repo: {file_path} -> {link_url}")
                return target_path
        
        # Path is outside both docs and repo roots
        logging.warning(f"Link outside allowed paths: {file_path} -> {link_url}")
        return None

    except (ValueError, OSError) as e:
        logging.debug(f"Error normalizing path {link_url}: {e}")
        return None


def validate_internal_link(target_path: Optional[Path], link_url: str) -> Dict:
    """Validate an internal link target."""
    if target_path is None:
        return {
            'valid': False,
            'error': 'Invalid path',
            'error_type': 'invalid_path'
        }

    if not target_path.exists():
        return {
            'valid': False,
            'error': 'File not found',
            'error_type': 'file_not_found',
            'target_path': str(target_path)
        }

    # Check if it's a directory (should have index.md, README.md, or _category_.json)
    if target_path.is_dir():
        valid_index_files = [
            target_path / 'index.md',
            target_path / 'README.md',
            target_path / '_category_.json'  # Docusaurus category file
        ]
        if not any(f.exists() for f in valid_index_files):
            return {
                'valid': False,
                'error': 'Directory missing index.md, README.md, or _category_.json',
                'error_type': 'missing_index',
                'target_path': str(target_path)
            }

    return {
        'valid': True,
        'target_path': str(target_path)
    }


def validate_external_url(session: requests.Session, url: str, timeout: int = 5) -> Dict:
    """
    Validate an external URL using HTTP HEAD request.

    Args:
        session: Requests session with retry configuration
        url: URL to validate
        timeout: Request timeout in seconds

    Returns:
        Dictionary with validation result
    """
    try:
        # Skip certain URL patterns
        if any(pattern in url for pattern in SKIP_URL_PATTERNS):
            return {
                'valid': True,
                'error': 'Skipped (localhost/test URL)',
                'error_type': 'skipped'
            }

        # Try HEAD request first (faster)
        response = session.head(url, timeout=timeout, allow_redirects=True)

        # If HEAD fails, try GET
        if response.status_code >= 400:
            response = session.get(url, timeout=timeout, allow_redirects=True)

        if response.status_code in SUCCESS_STATUS_CODES or response.status_code in REDIRECT_STATUS_CODES:
            return {
                'valid': True,
                'status_code': response.status_code,
                'final_url': response.url if response.url != url else None
            }
        else:
            return {
                'valid': False,
                'error': f'HTTP {response.status_code}',
                'error_type': 'http_error',
                'status_code': response.status_code
            }

    except requests.exceptions.Timeout:
        return {
            'valid': False,
            'error': 'Request timeout',
            'error_type': 'timeout'
        }
    except requests.exceptions.ConnectionError:
        return {
            'valid': False,
            'error': 'Connection error',
            'error_type': 'connection_error'
        }
    except requests.exceptions.RequestException as e:
        return {
            'valid': False,
            'error': str(e),
            'error_type': 'request_error'
        }


def slugify_docusaurus(text: str) -> str:
    """
    Generate Docusaurus-compatible anchor slug from header text.
    
    Follows Docusaurus anchor generation rules:
    - Convert to lowercase
    - Replace spaces with hyphens
    - Remove special characters (except hyphens and alphanumeric)
    - Handle Unicode characters (keep them)
    - Remove consecutive hyphens
    - Strip leading/trailing hyphens
    
    Args:
        text: Header text to slugify
        
    Returns:
        Slugified anchor string
    """
    if not text:
        return ""
    
    # Convert to lowercase
    slug = text.lower()
    
    # Replace spaces and underscores with hyphens
    slug = slug.replace(' ', '-').replace('_', '-')
    
    # Remove special characters but keep Unicode letters, numbers, and hyphens
    # Docusaurus keeps accented characters and Unicode
    slug = re.sub(r'[^\w\-]', '', slug, flags=re.UNICODE)
    
    # Remove consecutive hyphens
    slug = re.sub(r'-+', '-', slug)
    
    # Strip leading and trailing hyphens
    slug = slug.strip('-')
    
    return slug


def validate_anchor_link(target_path: Path, anchor: str) -> Dict:
    """
    Validate anchor link by checking if header exists in target file.
    
    Uses Docusaurus-compatible anchor slug generation for matching.

    Args:
        target_path: Path to target markdown file
        anchor: Anchor text (without #)

    Returns:
        Dictionary with validation result
    """
    if not target_path.exists() or not target_path.suffix == '.md':
        return {
            'valid': False,
            'error': 'Target file not found or not markdown',
            'error_type': 'file_not_found'
        }

    try:
        with open(target_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Normalize anchor using Docusaurus slugify
        anchor_normalized = slugify_docusaurus(anchor)

        # Find all headers in the file
        header_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
        headers = []

        for match in header_pattern.finditer(content):
            header_level = len(match.group(1))
            header_text = match.group(2).strip()

            # Normalize header text using Docusaurus slugify
            header_normalized = slugify_docusaurus(header_text)

            headers.append({
                'level': header_level,
                'text': header_text,
                'anchor': header_normalized
            })

        # Check if anchor exists
        for header in headers:
            if header['anchor'] == anchor_normalized:
                return {
                    'valid': True,
                    'header_text': header['text'],
                    'header_level': header['level']
                }

        return {
            'valid': False,
            'error': f'Anchor "{anchor}" not found',
            'error_type': 'anchor_not_found',
            'available_anchors': [h['anchor'] for h in headers[:10]]  # First 10 for debugging
        }

    except Exception as e:
        return {
            'valid': False,
            'error': f'Error reading file: {e}',
            'error_type': 'file_read_error'
        }


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


def check_links_in_file(
    file_path: Path,
    docs_root: Path,
    docs_dirs: List[Path],
    repo_root: Optional[Path] = None,
    session: Optional[requests.Session] = None,
    skip_external: bool = False
) -> Dict:
    """Check all links in a single markdown file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return {
            'file': str(file_path.relative_to(docs_root)),
            'error': f'Could not read file: {e}',
            'links': [],
            'summary': {'total': 0, 'broken': 0, 'external': 0, 'internal': 0}
        }

    links = extract_markdown_links(content, 1)
    results = []

    internal_count = 0
    external_count = 0
    broken_count = 0

    for link_info in links:
        link_url = link_info['url']
        result = {
            'text': link_info['text'],
            'url': link_url,
            'line': link_info['line'],
            'type': link_info['type']
        }

        if is_external_url(link_url):
            external_count += 1
            if not skip_external and session:
                validation = validate_external_url(session, link_url)
                result.update(validation)
                result['link_category'] = 'external'
                if not validation.get('valid', False):
                    broken_count += 1
            else:
                result['valid'] = True
                result['link_category'] = 'external'
                result['note'] = 'Skipped external link validation'

        elif is_internal_url(link_url):
            internal_count += 1
            result['link_category'] = 'internal'

            # Check for anchor
            if '#' in link_url:
                base_url, anchor = link_url.split('#', 1)
                target_path = normalize_internal_path(file_path, base_url, docs_root, repo_root)

                # First validate the file
                file_validation = validate_internal_link(target_path, base_url)
                result.update(file_validation)

                if target_path:
                    is_docs_internal = any(str(target_path).startswith(str(d.resolve())) for d in docs_dirs)
                    result['link_scope'] = 'docs_internal' if is_docs_internal else 'repo_internal'

                # If file exists, validate anchor
                if file_validation.get('valid', False) and target_path:
                    anchor_validation = validate_anchor_link(target_path, anchor)
                    if not anchor_validation.get('valid', False):
                        result.update(anchor_validation)
                        broken_count += 1
            else:
                target_path = normalize_internal_path(file_path, link_url, docs_root, repo_root)
                validation = validate_internal_link(target_path, link_url)
                result.update(validation)

                if target_path:
                    is_docs_internal = any(str(target_path).startswith(str(d.resolve())) for d in docs_dirs)
                    result['link_scope'] = 'docs_internal' if is_docs_internal else 'repo_internal'

                if not validation.get('valid', False):
                    broken_count += 1

        else:
            # Anchor-only link (starts with #)
            internal_count += 1
            result['link_category'] = 'anchor'
            anchor = link_url[1:]  # Remove #
            target_path = file_path  # Same file

            anchor_validation = validate_anchor_link(target_path, anchor)
            result.update(anchor_validation)
            if not anchor_validation.get('valid', False):
                broken_count += 1

        results.append(result)

    return {
        'file': str(file_path.relative_to(docs_root)),
        'links': results,
        'summary': {
            'total': len(results),
            'broken': broken_count,
            'external': external_count,
            'internal': internal_count
        }
    }


def main():
    """Main script execution."""
    parser = argparse.ArgumentParser(description='Validate documentation links')
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
        default='./docs/reports/link-validation.json',
        help='Output JSON file path'
    )
    parser.add_argument(
        '--skip-external',
        action='store_true',
        help='Skip external link validation'
    )
    parser.add_argument(
        '--timeout',
        type=int,
        default=5,
        help='HTTP request timeout in seconds'
    )
    parser.add_argument(
        '--repo-root',
        type=str,
        default='.',
        help='Repository root directory for resolving absolute links.'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )

    args = parser.parse_args()

    setup_logging(args.verbose)

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

    # Use repo_root as the root for resolving paths
    repo_root = Path(args.repo_root).resolve()
    
    # For backward compatibility, use repo_root as docs_root for path resolution
    docs_root = repo_root

    # Create requests session for external link validation
    session = None if args.skip_external else create_requests_session()

    # Process files
    all_results = []
    total_broken_links = 0
    total_links = 0
    total_external = 0
    total_internal = 0

    for i, file_path in enumerate(all_markdown_files, 1):
        logging.debug(f"Processing ({i}/{len(all_markdown_files)}): {file_path}")

        result = check_links_in_file(
            file_path,
            docs_root,
            docs_dirs,
            repo_root,  # Pass repo_root for repo-relative link validation
            session,
            args.skip_external
        )

        all_results.append(result)

        # Update counters
        summary = result['summary']
        total_links += summary['total']
        total_broken_links += summary['broken']
        total_external += summary['external']
        total_internal += summary['internal']

        if summary['broken'] > 0:
            logging.info(f"Found {summary['broken']} broken links in {file_path.name}")

    # Close session
    if session:
        session.close()

    # Collect broken links
    broken_links = []
    for result in all_results:
        for link in result['links']:
            if not link.get('valid', False):
                broken_links.append({
                    'file': result['file'],
                    'line': link['line'],
                    'link_text': link['text'],
                    'link_url': link['url'],
                    'error': link.get('error', 'Unknown error'),
                    'error_type': link.get('error_type', 'unknown'),
                    'link_category': link.get('link_category', 'unknown')
                })

    # Prepare final report
    report = {
        'metadata': {
            'scan_date': datetime.now().isoformat(),
            'docs_directory': [str(d) for d in docs_dirs],
            'skip_external': args.skip_external,
            'timeout_seconds': args.timeout,
            'script_version': '1.0.0'
        },
        'summary': {
            'total_files': len(markdown_files),
            'total_links': total_links,
            'internal_links': total_internal,
            'external_links': total_external,
            'broken_links': len(broken_links),
            'success_rate': round((total_links - len(broken_links)) / total_links * 100, 2) if total_links > 0 else 100
        },
        'broken_links': broken_links,
        'results': all_results
    }

    # Ensure output directory exists
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write report
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    logging.info(f"Link validation complete. Report saved to {output_path}")

    # Print summary
    print(f"\n=== Link Validation Summary ===")
    print(f"Total files scanned: {report['summary']['total_files']}")
    print(f"Total links found: {report['summary']['total_links']}")
    print(f"Internal links: {report['summary']['internal_links']}")
    print(f"External links: {report['summary']['external_links']}")
    print(f"Broken links: {report['summary']['broken_links']}")
    print(f"Success rate: {report['summary']['success_rate']}%")

    if broken_links:
        print(f"\n⚠️  Found {len(broken_links)} broken links")
        for link in broken_links[:5]:  # Show first 5
            print(f"  - {link['file']}:{link['line']} - {link['link_url']} ({link['error']})")

        if len(broken_links) > 5:
            print(f"  ... and {len(broken_links) - 5} more")

        sys.exit(1)
    else:
        print(f"\n✅ All links are valid")
        sys.exit(0)


if __name__ == '__main__':
    main()