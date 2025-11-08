#!/usr/bin/env python3
"""
External Link Validator with Retry Logic and Health Monitoring
Validates external links in documentation with comprehensive error handling
"""

import re
import sys
import json
import time
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Set
from urllib.parse import urlparse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import requests
    from requests.adapters import HTTPAdapter
    from requests.packages.urllib3.util.retry import Retry
except ImportError:
    print("Error: requests library not found. Install with: pip install requests")
    sys.exit(1)

class LinkValidator:
    """Validate external links with retry logic and caching"""

    def __init__(self, timeout=10, max_retries=3, cache_file=None):
        self.timeout = timeout
        self.max_retries = max_retries
        self.cache_file = cache_file or Path("docs/reports/link-cache.json")
        self.cache = self._load_cache()
        self.session = self._create_session()
        self.results = {
            'valid': [],
            'invalid': [],
            'timeout': [],
            'error': []
        }

    def _create_session(self):
        """Create requests session with retry strategy"""
        session = requests.Session()
        retry_strategy = Retry(
            total=self.max_retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        # Set user agent to avoid blocks
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Documentation Link Validator/2.0)'
        })

        return session

    def _load_cache(self) -> Dict:
        """Load link validation cache"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file) as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def _save_cache(self):
        """Save link validation cache"""
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.cache_file, 'w') as f:
            json.dump(self.cache, f, indent=2)

    def validate_link(self, url: str) -> Tuple[bool, str, int]:
        """
        Validate a single link
        Returns: (is_valid, status_message, status_code)
        """
        # Check cache first (valid for 7 days)
        if url in self.cache:
            cache_entry = self.cache[url]
            cache_age = time.time() - cache_entry.get('timestamp', 0)
            if cache_age < 7 * 24 * 3600:  # 7 days
                return (
                    cache_entry['valid'],
                    cache_entry['message'],
                    cache_entry['status_code']
                )

        try:
            # Try HEAD request first (faster)
            response = self.session.head(url, timeout=self.timeout, allow_redirects=True)

            # Some servers don't support HEAD, try GET
            if response.status_code == 405:
                response = self.session.get(url, timeout=self.timeout, allow_redirects=True)

            is_valid = 200 <= response.status_code < 400
            message = f"HTTP {response.status_code}"

            # Cache result
            self.cache[url] = {
                'valid': is_valid,
                'message': message,
                'status_code': response.status_code,
                'timestamp': time.time()
            }

            return is_valid, message, response.status_code

        except requests.Timeout:
            self.cache[url] = {
                'valid': False,
                'message': 'Timeout',
                'status_code': 0,
                'timestamp': time.time()
            }
            return False, "Timeout", 0

        except requests.RequestException as e:
            message = str(e)[:100]
            self.cache[url] = {
                'valid': False,
                'message': message,
                'status_code': 0,
                'timestamp': time.time()
            }
            return False, message, 0

    def extract_links_from_file(self, file_path: Path) -> List[Tuple[str, int]]:
        """Extract external links from markdown file with line numbers"""
        try:
            content = file_path.read_text(errors='ignore')
        except Exception:
            return []

        links = []
        # Match markdown links [text](url) and bare URLs
        patterns = [
            r'\[([^\]]+)\]\((https?://[^)]+)\)',  # [text](url)
            r'(?<!\()(https?://[^\s<>\)]+)',      # bare URLs
        ]

        for line_num, line in enumerate(content.split('\n'), 1):
            for pattern in patterns:
                for match in re.finditer(pattern, line):
                    url = match.group(2) if '](http' in pattern else match.group(1)
                    # Clean URL
                    url = url.rstrip('.,;:!?')
                    links.append((url, line_num))

        return links

    def validate_all_links(self, docs_dir: Path, max_workers=10) -> Dict:
        """Validate all external links in documentation"""
        print(f"Scanning documentation in: {docs_dir}")

        # Find all markdown files
        md_files = list(docs_dir.rglob('*.md')) + list(docs_dir.rglob('*.mdx'))
        print(f"Found {len(md_files)} documentation files")

        # Extract all links
        all_links = {}
        for file_path in md_files:
            links = self.extract_links_from_file(file_path)
            if links:
                all_links[str(file_path.relative_to(docs_dir))] = links

        # Get unique URLs
        unique_urls = set()
        for file_links in all_links.values():
            for url, _ in file_links:
                unique_urls.add(url)

        print(f"Found {len(unique_urls)} unique external links")
        print(f"Validating links (max {max_workers} concurrent)...\n")

        # Validate links concurrently
        url_status = {}
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_url = {
                executor.submit(self.validate_link, url): url
                for url in unique_urls
            }

            completed = 0
            for future in as_completed(future_to_url):
                url = future_to_url[future]
                try:
                    is_valid, message, status_code = future.result()
                    url_status[url] = {
                        'valid': is_valid,
                        'message': message,
                        'status_code': status_code
                    }

                    # Update results
                    if is_valid:
                        self.results['valid'].append(url)
                    elif 'timeout' in message.lower():
                        self.results['timeout'].append(url)
                    elif status_code > 0:
                        self.results['invalid'].append(url)
                    else:
                        self.results['error'].append(url)

                    completed += 1
                    if completed % 10 == 0:
                        print(f"Progress: {completed}/{len(unique_urls)} links validated")

                except Exception as e:
                    url_status[url] = {
                        'valid': False,
                        'message': str(e),
                        'status_code': 0
                    }
                    self.results['error'].append(url)

        # Save cache
        self._save_cache()

        # Build detailed results
        file_results = []
        for file_path, links in all_links.items():
            file_issues = []
            for url, line_num in links:
                status = url_status.get(url, {})
                if not status.get('valid', False):
                    file_issues.append({
                        'line': line_num,
                        'url': url,
                        'status': status.get('message', 'Unknown'),
                        'code': status.get('status_code', 0)
                    })

            if file_issues:
                file_results.append({
                    'file': file_path,
                    'issues': file_issues
                })

        return {
            'summary': {
                'total_links': len(unique_urls),
                'valid': len(self.results['valid']),
                'invalid': len(self.results['invalid']),
                'timeout': len(self.results['timeout']),
                'error': len(self.results['error']),
                'success_rate': (len(self.results['valid']) / len(unique_urls) * 100) if unique_urls else 100
            },
            'files_with_issues': file_results,
            'timestamp': datetime.now().isoformat()
        }

def generate_report(results: Dict, output_file: Path):
    """Generate markdown report"""
    summary = results['summary']

    report = f"""# External Link Validation Report

**Generated**: {results['timestamp']}
**Total Links Checked**: {summary['total_links']}

---

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Valid | {summary['valid']} | {summary['success_rate']:.1f}% |
| ❌ Invalid | {summary['invalid']} | {summary['invalid']/summary['total_links']*100:.1f}% |
| ⏱️ Timeout | {summary['timeout']} | {summary['timeout']/summary['total_links']*100:.1f}% |
| ⚠️ Error | {summary['error']} | {summary['error']/summary['total_links']*100:.1f}% |

---

## Files with Issues

"""

    if results['files_with_issues']:
        for file_data in results['files_with_issues']:
            report += f"\n### {file_data['file']}\n\n"
            for issue in file_data['issues']:
                report += f"- Line {issue['line']}: `{issue['url']}`\n"
                report += f"  - Status: {issue['status']} (HTTP {issue['code']})\n"
    else:
        report += "✅ No issues found! All external links are valid.\n"

    report += "\n---\n\n*Generated by External Link Validator v2.0*\n"

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(report)
    print(f"\nReport generated: {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Validate external links in documentation')
    parser.add_argument('docs_dir', type=Path, help='Documentation directory')
    parser.add_argument('--output', type=Path, default=Path('docs/reports/external-links-validation.md'),
                       help='Output report file')
    parser.add_argument('--timeout', type=int, default=10, help='Request timeout in seconds')
    parser.add_argument('--max-retries', type=int, default=3, help='Maximum retries per link')
    parser.add_argument('--max-workers', type=int, default=10, help='Maximum concurrent validations')
    parser.add_argument('--json', action='store_true', help='Output JSON format')

    args = parser.parse_args()

    if not args.docs_dir.exists():
        print(f"Error: Documentation directory not found: {args.docs_dir}")
        sys.exit(1)

    # Validate links
    validator = LinkValidator(timeout=args.timeout, max_retries=args.max_retries)
    results = validator.validate_all_links(args.docs_dir, max_workers=args.max_workers)

    # Generate report
    if args.json:
        json_output = args.output.with_suffix('.json')
        with open(json_output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nJSON report generated: {json_output}")
    else:
        generate_report(results, args.output)

    # Print summary
    summary = results['summary']
    print(f"\n{'='*60}")
    print(f"Validation Complete!")
    print(f"{'='*60}")
    print(f"Total Links: {summary['total_links']}")
    print(f"Valid: {summary['valid']} ({summary['success_rate']:.1f}%)")
    print(f"Invalid: {summary['invalid']}")
    print(f"Timeout: {summary['timeout']}")
    print(f"Error: {summary['error']}")
    print(f"{'='*60}\n")

    # Exit code based on results
    if summary['invalid'] > 0 or summary['error'] > 0:
        sys.exit(1)
    sys.exit(0)

if __name__ == '__main__':
    main()
