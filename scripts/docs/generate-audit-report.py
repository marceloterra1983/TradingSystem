#!/usr/bin/env python3
"""
Documentation Audit Report Generator

Transforms JSON validation outputs from the documentation audit scripts
into a comprehensive human-readable markdown report.

Usage:
    python generate-audit-report.py \
        --frontmatter-json /tmp/audit/frontmatter.json \
        --links-json /tmp/audit/links.json \
        --duplicates-json /tmp/audit/duplicates.json \
        --output ./docs/reports/2025-10-17-documentation-audit.md \
        --date 2025-10-17
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any


class AuditReportGenerator:
    """Generates comprehensive documentation audit reports."""

    def __init__(self, report_dir: Optional[Path] = None, strip_prefix: str = "", docs_base: Optional[str] = None) -> None:
        self.report_date = datetime.now().strftime('%Y-%m-%d')
        self.frontmatter_data = None
        self.links_data = None
        self.duplicates_data = None
        self.report_dir = report_dir
        self.strip_prefix = strip_prefix
        self.docs_base = Path(docs_base) if docs_base else None
        self.repo_root = Path.cwd().resolve()

    def _format_path(self, file_path: str) -> str:
        """
        Format file path as a relative path from the report's location to the target file.
        
        This ensures links in the report correctly resolve to the actual file locations.
        
        Args:
            file_path: File path from JSON report (typically repo-root relative, e.g., 'docs/context/...')
            
        Returns:
            Relative path from report directory to the target file
        """
        # If docs_base is explicitly provided as override, use legacy behavior
        if self.docs_base is not None:
            file_p = Path(file_path)
            if str(self.docs_base) in ('.', ''):
                return file_path
            return str(self.docs_base / file_p)
        
        # If no report directory is set, return as-is (fallback for backward compatibility)
        if self.report_dir is None:
            return file_path
        
        # Compute absolute path to the target file (file_path is repo-root relative)
        target_file = self.repo_root / file_path
        
        # Compute relative path from report directory to target file
        try:
            relative_path = os.path.relpath(target_file, self.report_dir)
            return relative_path
        except ValueError:
            # Fallback if paths are on different drives (Windows edge case)
            return file_path


    def load_json_data(self, frontmatter_path: Optional[str], links_path: Optional[str],
                      duplicates_path: Optional[str]) -> None:
        """Load JSON data from validation scripts."""
        if frontmatter_path:
            try:
                with open(frontmatter_path, 'r', encoding='utf-8') as f:
                    self.frontmatter_data = json.load(f)
            except Exception as e:
                print(f"Warning: Could not load frontmatter data: {e}")
                self.frontmatter_data = None

        if links_path:
            try:
                with open(links_path, 'r', encoding='utf-8') as f:
                    self.links_data = json.load(f)
            except Exception as e:
                print(f"Warning: Could not load links data: {e}")
                self.links_data = None

        if duplicates_path:
            try:
                with open(duplicates_path, 'r', encoding='utf-8') as f:
                    self.duplicates_data = json.load(f)
            except Exception as e:
                print(f"Warning: Could not load duplicates data: {e}")
                self.duplicates_data = None

    def calculate_overall_health_score(self) -> Dict[str, Any]:
        """Calculate overall documentation health score."""
        scores = []
        weights = []

        if self.frontmatter_data:
            summary = self.frontmatter_data.get('summary', {})
            total_files = summary.get('total_files', 0)
            files_with_issues = summary.get('files_with_issues', 0)

            if total_files > 0:
                frontmatter_score = (total_files - files_with_issues) / total_files * 100
                scores.append(frontmatter_score)
                weights.append(0.4)  # 40% weight for frontmatter

        if self.links_data:
            summary = self.links_data.get('summary', {})
            total_links = summary.get('total_links', 0)
            broken_links = summary.get('broken_links', 0)

            if total_links > 0:
                link_score = (total_links - broken_links) / total_links * 100
                scores.append(link_score)
                weights.append(0.3)  # 30% weight for links

        if self.duplicates_data:
            summary = self.duplicates_data.get('summary', {})
            total_files = summary.get('total_files', 0)
            duplicate_files = summary.get('total_exact_duplicate_files', 0) + \
                            summary.get('similar_titles', 0) + \
                            summary.get('similar_summaries', 0)

            if total_files > 0:
                duplicate_score = max(0, (total_files - duplicate_files) / total_files * 100)
                scores.append(duplicate_score)
                weights.append(0.3)  # 30% weight for duplicates

        if not scores:
            return {"score": 0, "grade": "N/A", "status": "No Data"}

        # Calculate weighted average
        if sum(weights) > 0:
            overall_score = sum(s * w for s, w in zip(scores, weights)) / sum(weights)
        else:
            overall_score = sum(scores) / len(scores)

        # Determine grade
        if overall_score >= 90:
            grade = "A"
            status = "Excellent"
        elif overall_score >= 80:
            grade = "B"
            status = "Good"
        elif overall_score >= 70:
            grade = "C"
            status = "Fair"
        elif overall_score >= 60:
            grade = "D"
            status = "Poor"
        else:
            grade = "F"
            status = "Critical"

        return {
            "score": round(overall_score, 1),
            "grade": grade,
            "status": status
        }

    def generate_executive_summary(self) -> str:
        """Generate executive summary section."""
        health = self.calculate_overall_health_score()

        lines = [
            "# Documentation Audit Report",
            f"**Date:** {self.report_date}",
            "",
            "## Executive Summary",
            "",
            f"**Overall Health Score:** {health['score']}/100 (Grade: {health['grade']})",
            f"**Status:** {health['status']}",
            ""
        ]

        # Add summary statistics
        if self.frontmatter_data:
            summary = self.frontmatter_data['summary']
            lines.extend([
                "### Frontmatter Validation",
                f"- Total files audited: {summary['total_files']}",
                f"- Files with frontmatter: {summary['files_with_frontmatter']}",
                f"- Files missing frontmatter: {summary['files_missing_frontmatter']}",
                f"- Files with incomplete frontmatter: {summary['files_incomplete_frontmatter']}",
                ""
            ])

        if self.links_data:
            summary = self.links_data['summary']
            lines.extend([
                "### Link Validation",
                f"- Total links found: {summary['total_links']}",
                f"- Internal links: {summary['internal_links']}",
                f"- External links: {summary['external_links']}",
                f"- Broken links: {summary['broken_links']}",
                f"- Success rate: {summary['success_rate']}%",
                ""
            ])

        if self.duplicates_data:
            summary = self.duplicates_data['summary']
            lines.extend([
                "### Duplicate Detection",
                f"- Total files analyzed: {summary['total_files']}",
                f"- Exact duplicate groups: {summary['exact_duplicates']}",
                f"- Files in exact duplicates: {summary['total_exact_duplicate_files']}",
                f"- Similar title pairs: {summary['similar_titles']}",
                f"- Similar summary pairs: {summary['similar_summaries']}",
                f"- Cross-domain duplicates: {summary['cross_domain_duplicates']}",
                ""
            ])

        # Add key findings
        lines.extend([
            "### Key Findings",
            ""
        ])

        critical_issues = []
        high_issues = []
        medium_issues = []

        # Collect issues from all sources
        if self.frontmatter_data:
            if self.frontmatter_data['summary']['files_missing_frontmatter'] > 0:
                critical_issues.append(f"{self.frontmatter_data['summary']['files_missing_frontmatter']} files missing frontmatter")

        if self.links_data:
            if self.links_data['summary']['broken_links'] > 0:
                critical_issues.append(f"{self.links_data['summary']['broken_links']} broken links")

        if self.duplicates_data:
            if self.duplicates_data['summary']['total_exact_duplicate_files'] > 0:
                high_issues.append(f"{self.duplicates_data['summary']['total_exact_duplicate_files']} exact duplicate files")

        if critical_issues:
            lines.append("**🚨 Critical Issues:**")
            for issue in critical_issues:
                lines.append(f"- {issue}")
            lines.append("")

        if high_issues:
            lines.append("**⚠️ High Priority Issues:**")
            for issue in high_issues:
                lines.append(f"- {issue}")
            lines.append("")

        if medium_issues:
            lines.append("**📋 Medium Priority Issues:**")
            for issue in medium_issues:
                lines.append(f"- {issue}")
            lines.append("")

        return "\n".join(lines)

    def generate_frontmatter_section(self) -> str:
        """Generate frontmatter validation section."""
        if not self.frontmatter_data:
            return ""

        lines = [
            "## 1. Frontmatter Validation Results",
            ""
        ]

        summary = self.frontmatter_data['summary']

        # Missing frontmatter
        missing = self.frontmatter_data.get('missing_frontmatter', [])
        if missing:
            lines.extend([
                f"### 1.1 Files Missing Frontmatter ({len(missing)} files)",
                "",
                "The following files have no YAML frontmatter:",
                ""
            ])

            for file_path in missing[:20]:  # Show first 20
                lines.append(f"- [`{file_path}`]({self._format_path(file_path)})")

            if len(missing) > 20:
                lines.append(f"- ... and {len(missing) - 20} more files")

            lines.append("")

        # Incomplete frontmatter
        incomplete = self.frontmatter_data.get('incomplete_frontmatter', [])
        if incomplete:
            lines.extend([
                f"### 1.2 Files with Incomplete Frontmatter ({len(incomplete)} files)",
                "",
                "The following files are missing required frontmatter fields:",
                ""
            ])

            for item in incomplete[:20]:  # Show first 20
                missing_fields = ", ".join(item['missing_fields'])
                lines.append(f"- [`{item['file']}`]({self._format_path(item['file'])}) - Missing: {missing_fields}")

            if len(incomplete) > 20:
                lines.append(f"- ... and {len(incomplete) - 20} more files")

            lines.append("")

        # Invalid values
        invalid = self.frontmatter_data.get('invalid_values', [])
        if invalid:
            lines.extend([
                f"### 1.3 Files with Invalid Field Values ({len(invalid)} files)",
                "",
                "The following files have invalid field values:",
                ""
            ])

            for item in invalid[:20]:  # Show first 20
                lines.append(f"- [`{item['file']}`]({self._format_path(item['file'])}) - {item['message']}")

            if len(invalid) > 20:
                lines.append(f"- ... and {len(invalid) - 20} more files")

            lines.append("")

        # Outdated documents
        freshness = self.frontmatter_data.get('freshness_analysis', {})
        outdated = freshness.get('outdated_documents', [])
        if outdated:
            threshold = freshness.get('threshold_days', 90)
            lines.extend([
                f"### 1.4 Outdated Documents ({len(outdated)} files)",
                f"",
                f"The following documents haven't been reviewed in over {threshold} days:",
                ""
            ])

            for doc in outdated[:20]:  # Show first 20
                priority_emoji = "🔴" if doc['priority'] == 'high' else "🟡"
                lines.append(f"- {priority_emoji} [`{doc['file']}`]({self._format_path(doc['file'])}) - Last reviewed: {doc['last_review']} ({doc['days_old']} days ago)")

            if len(outdated) > 20:
                lines.append(f"- ... and {len(outdated) - 20} more files")

            lines.append("")

        # Domain distribution
        domain_dist = summary.get('domain_distribution', {})
        if domain_dist:
            lines.extend([
                "### 1.5 Document Distribution by Domain",
                ""
            ])

            for domain, count in sorted(domain_dist.items()):
                lines.append(f"- **{domain}**: {count} files")

            lines.append("")

        return "\n".join(lines)

    def generate_links_section(self) -> str:
        """Generate link validation section."""
        if not self.links_data:
            return ""

        lines = [
            "## 2. Link Validation Results",
            ""
        ]

        summary = self.links_data['summary']
        broken = self.links_data.get('broken_links', [])

        if broken:
            lines.extend([
                f"### 2.1 Broken Links ({len(broken)} links)",
                "",
                "The following links are broken or unreachable:",
                ""
            ])

            # Group by file
            by_file = {}
            for link in broken:
                file_path = link['file']
                if file_path not in by_file:
                    by_file[file_path] = []
                by_file[file_path].append(link)

            for file_path, links in list(by_file.items())[:20]:  # Show first 20 files
                lines.append(f"#### [`{file_path}`]({self._format_path(file_path)})")
                for link in links[:5]:  # Show first 5 links per file
                    error_emoji = "🔴" if link['error_type'] in ['file_not_found', 'anchor_not_found'] else "🟡"
                    lines.append(f"- {error_emoji} Line {link['line']}: [{link['link_text']}]({link['link_url']}) - {link['error']}")

                if len(links) > 5:
                    lines.append(f"- ... and {len(links) - 5} more broken links in this file")

                lines.append("")

            if len(by_file) > 20:
                lines.append(f"- ... and {len(by_file) - 20} more files with broken links")
                lines.append("")

        # Link statistics
        lines.extend([
            "### 2.2 Link Statistics",
            "",
            f"- **Total links found:** {summary['total_links']}",
            f"- **Internal links:** {summary['internal_links']}",
            f"- **External links:** {summary['external_links']}",
            f"- **Broken links:** {summary['broken_links']}",
            f"- **Success rate:** {summary['success_rate']}%",
            ""
        ])

        return "\n".join(lines)

    def generate_duplicates_section(self) -> str:
        """Generate duplicate detection section."""
        if not self.duplicates_data:
            return ""

        lines = [
            "## 3. Duplicate Detection Results",
            ""
        ]

        summary = self.duplicates_data['summary']

        # Exact duplicates
        exact = self.duplicates_data.get('exact_duplicates', [])
        if exact:
            lines.extend([
                f"### 3.1 Exact Duplicates ({len(exact)} groups)",
                "",
                "The following files have identical content:",
                ""
            ])

            for group in exact[:10]:  # Show first 10 groups
                lines.append(f"**Hash: `{group['content_hash'][:8]}...`**")
                for file_info in group['files']:
                    lines.append(f"- [`{file_info['file_path']}`]({self._format_path(file_info['file_path'])})")
                lines.append("")

            if len(exact) > 10:
                lines.append(f"- ... and {len(exact) - 10} more duplicate groups")
                lines.append("")

        # Similar titles
        similar_titles = self.duplicates_data.get('similar_titles', [])
        if similar_titles:
            lines.extend([
                f"### 3.2 Similar Titles ({len(similar_titles)} pairs)",
                "",
                "The following files have similar titles and may need consolidation:",
                ""
            ])

            for pair in similar_titles[:15]:  # Show first 15 pairs
                lines.append(f"- **Similarity: {pair['title_similarity']*100:.1f}%**")
                lines.append(f"  - [`{pair['file1']['file_path']}`]({self._format_path(pair['file1']['file_path'])}) - {pair['title1']}")
                lines.append(f"  - [`{pair['file2']['file_path']}`]({self._format_path(pair['file2']['file_path'])}) - {pair['title2']}")
                lines.append("")

            if len(similar_titles) > 15:
                lines.append(f"- ... and {len(similar_titles) - 15} more similar title pairs")
                lines.append("")

        # Similar summaries
        similar_summaries = self.duplicates_data.get('similar_summaries', [])
        if similar_summaries:
            lines.extend([
                f"### 3.3 Similar Summaries ({len(similar_summaries)} pairs)",
                "",
                "The following files have similar summaries:",
                ""
            ])

            for pair in similar_summaries[:10]:  # Show first 10 pairs
                lines.append(f"- **Similarity: {pair['summary_similarity']*100:.1f}%**")
                lines.append(f"  - [`{pair['file1']['file_path']}`]({self._format_path(pair['file1']['file_path'])})")
                lines.append(f"  - [`{pair['file2']['file_path']}`]({self._format_path(pair['file2']['file_path'])})")
                lines.append("")

            if len(similar_summaries) > 10:
                lines.append(f"- ... and {len(similar_summaries) - 10} more similar summary pairs")
                lines.append("")

        # Similar filenames
        similar_filenames = self.duplicates_data.get('similar_filenames', [])
        if similar_filenames:
            lines.extend([
                f"### 3.4 Similar Filenames ({len(similar_filenames)} groups)",
                "",
                "The following files have identical names in different directories:",
                ""
            ])

            for group in similar_filenames[:10]:  # Show first 10 groups
                lines.append(f"**Filename: `{group['filename']}`** ({group['count']} files)")
                for file_info in group['files']:
                    lines.append(f"- [`{file_info['file_path']}`]({self._format_path(file_info['file_path'])})")
                lines.append("")

            if len(similar_filenames) > 10:
                lines.append(f"- ... and {len(similar_filenames) - 10} more filename groups")
                lines.append("")

        return "\n".join(lines)

    def generate_recommendations_section(self) -> str:
        """Generate recommendations section."""
        lines = [
            "## 4. Recommendations",
            ""
        ]

        # Collect all recommendations
        all_recommendations = []

        if self.duplicates_data:
            all_recommendations.extend(self.duplicates_data.get('recommendations', []))

        # Add our own recommendations based on findings
        if self.frontmatter_data:
            missing = len(self.frontmatter_data.get('missing_frontmatter', []))
            if missing > 0:
                all_recommendations.append({
                    'priority': 'critical',
                    'category': 'frontmatter_completeness',
                    'description': f"Add frontmatter to {missing} files missing it",
                    'action': 'Add required YAML frontmatter fields to all markdown files',
                    'estimated_effort': f"{missing} files"
                })

        if self.links_data:
            broken = self.links_data['summary']['broken_links']
            if broken > 0:
                all_recommendations.append({
                    'priority': 'critical',
                    'category': 'link_integrity',
                    'description': f"Fix {broken} broken links",
                    'action': 'Update or remove broken internal and external links',
                    'estimated_effort': f"{broken} links"
                })

        if self.frontmatter_data:
            outdated = len(self.frontmatter_data.get('freshness_analysis', {}).get('outdated_documents', []))
            if outdated > 0:
                all_recommendations.append({
                    'priority': 'medium',
                    'category': 'content_freshness',
                    'description': f"Review and update {outdated} outdated documents",
                    'action': 'Update last_review dates and content as needed',
                    'estimated_effort': f"{outdated} documents"
                })

        # Sort by priority
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        all_recommendations.sort(key=lambda x: priority_order.get(x.get('priority', 'low'), 3))

        # Group by priority
        by_priority = {}
        for rec in all_recommendations:
            priority = rec.get('priority', 'low')
            if priority not in by_priority:
                by_priority[priority] = []
            by_priority[priority].append(rec)

        # Generate sections
        priority_emojis = {
            'critical': '🚨',
            'high': '⚠️',
            'medium': '📋',
            'low': 'ℹ️'
        }

        for priority in ['critical', 'high', 'medium', 'low']:
            if priority in by_priority:
                lines.append(f"### 4.{['1', '2', '3', '4'][['critical', 'high', 'medium', 'low'].index(priority)]} {priority.title()} Priority {priority_emojis[priority]}")
                lines.append("")

                for rec in by_priority[priority]:
                    lines.extend([
                        f"**{rec['description']}**",
                        f"- **Action:** {rec['action']}",
                        f"- **Estimated Effort:** {rec.get('estimated_effort', 'Unknown')}",
                        ""
                    ])

        # Add structural recommendations
        lines.extend([
            "### 4.5 Structural Improvements for AI Consumption",
            "",
            "To improve documentation quality for AI agents and search:",
            "",
            "**Standardization:**",
            "- Ensure all files have complete YAML frontmatter with required fields",
            "- Use consistent naming conventions for files and directories",
            "- Implement a standard template for different document types",
            "",
            "**Organization:**",
            "- Review and consolidate duplicate content across domains",
            "- Establish clear ownership and review processes for each domain",
            "- Implement automated validation in CI/CD pipeline",
            "",
            "**Accessibility:**",
            "- Add internal links between related documents",
            "- Ensure all external links are working and relevant",
            "- Use descriptive anchor text for better navigation",
            ""
        ])

        return "\n".join(lines)

    def generate_action_items_section(self) -> str:
        """Generate actionable checklist section."""
        lines = [
            "## 5. Action Items",
            "",
            "### 5.1 Immediate Actions (Critical Priority)",
            ""
        ]

        action_items = []

        # Collect action items from all findings
        if self.frontmatter_data:
            missing = len(self.frontmatter_data.get('missing_frontmatter', []))
            if missing > 0:
                action_items.append(("[ ] Add frontmatter to all markdown files", "critical"))

        if self.links_data:
            broken = self.links_data['summary']['broken_links']
            if broken > 0:
                action_items.append(("[ ] Fix all broken internal and external links", "critical"))

        if self.duplicates_data:
            exact = self.duplicates_data['summary']['exact_duplicates']
            if exact > 0:
                action_items.append(("[ ] Review and consolidate exact duplicate files", "high"))

            similar_titles = self.duplicates_data['summary']['similar_titles']
            if similar_titles > 0:
                action_items.append(("[ ] Review similar title pairs for consolidation", "medium"))

        if self.frontmatter_data:
            outdated = len(self.frontmatter_data.get('freshness_analysis', {}).get('outdated_documents', []))
            if outdated > 0:
                action_items.append(("[ ] Update last_review dates for outdated documents", "medium"))

        # Add general improvement items
        action_items.extend([
            ("[ ] Set up automated documentation validation in CI/CD", "medium"),
            ("[ ] Create documentation templates for different types", "low"),
            ("[ ] Establish regular documentation review schedule", "low"),
            ("[ ] Add internal cross-references between related documents", "low")
        ])

        # Sort by priority and add to report
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        action_items.sort(key=lambda x: priority_order.get(x[1], 3))

        for item, priority in action_items:
            lines.append(f"{item}")

        lines.extend([
            "",
            "### 5.2 Estimated Timeline",
            "",
            "**Week 1:** Critical fixes (frontmatter, broken links)",
            "**Week 2-3:** High priority items (duplicate consolidation)",
            "**Week 4:** Medium priority items (content updates)",
            "**Ongoing:** Low priority improvements and maintenance",
            ""
        ])

        return "\n".join(lines)

    def generate_appendix_section(self) -> str:
        """Generate appendix with methodology and references."""
        lines = [
            "## Appendix",
            "",
            "### A. Validation Methodology",
            "",
            "**Frontmatter Validation:**",
            "- Scans all `.md` files for YAML frontmatter",
            "- Validates required fields: title, sidebar_position, tags, domain, type, summary, status, last_review",
            "- Checks field types and allowed values",
            "- Identifies outdated documents based on last_review dates",
            "",
            "**Link Validation:**",
            "- Extracts all markdown links `[text](url)` and image links `![alt](url)`",
            "- Validates internal links by checking file existence",
            "- Checks external URLs with HTTP HEAD requests",
            "- Validates anchor links against document headers",
            "",
            "**Duplicate Detection:**",
            "- Calculates content hashes for exact duplicate detection",
            "- Uses fuzzy string matching for title and summary similarity",
            "- Identifies files with similar names in different directories",
            "- Analyzes cross-domain duplicate patterns",
            "",
            "### B. Tools and Scripts",
            "",
            "This audit was generated using the following scripts:",
            "",
            "- `validate-frontmatter.py` - Frontmatter validation",
            "- `check-links.py` - Link validation",
            "- `detect-duplicates.py` - Duplicate detection",
            "- `generate-audit-report.py` - Report generation",
            "",
            "### C. References",
            "",
            "- Documentation Standard: `DOCUMENTATION-STANDARD.md`",
            "- Project Structure: `docs/context/` directory organization",
            "- CI/CD Integration: `.github/workflows/` validation scripts",
            ""
        ]

        return "\n".join(lines)

    def generate_full_report(self) -> str:
        """Generate the complete audit report."""
        sections = [
            self.generate_executive_summary(),
            self.generate_frontmatter_section(),
            self.generate_links_section(),
            self.generate_duplicates_section(),
            self.generate_recommendations_section(),
            self.generate_action_items_section(),
            self.generate_appendix_section()
        ]

        # Add footer
        sections.extend([
            "---",
            f"*Report generated on {self.report_date} by Documentation Audit System v1.0.0*"
        ])

        return "\n".join(filter(None, sections)) + "\n"


def main():
    """Main script execution."""
    parser = argparse.ArgumentParser(description='Generate documentation audit report')
    parser.add_argument(
        '--frontmatter-json',
        type=str,
        help='Path to frontmatter validation JSON output'
    )
    parser.add_argument(
        '--links-json',
        type=str,
        help='Path to link validation JSON output'
    )
    parser.add_argument(
        '--duplicates-json',
        type=str,
        help='Path to duplicate detection JSON output'
    )
    parser.add_argument(
        '--output',
        type=str,
        required=True,
        help='Output markdown file path'
    )
    parser.add_argument(
        '--date',
        type=str,
        help='Report date (YYYY-MM-DD format)'
    )
    parser.add_argument(
        '--docs-base',
        type=str,
        default=None,
        help='(Legacy) Base path to prefix file links. If provided, overrides automatic relative path computation.'
    )
    parser.add_argument(
        '--strip-prefix',
        type=str,
        default='',
        help='Prefix to strip from file paths before computing relative paths (e.g., "docs/")'
    )

    args = parser.parse_args()

    # Validate that at least one input is provided
    if not any([args.frontmatter_json, args.links_json, args.duplicates_json]):
        print("Error: At least one input JSON file must be provided")
        sys.exit(1)

    # Capture report output directory
    output_path = Path(args.output).resolve()
    report_dir = output_path.parent

    # Create generator with report directory for automatic relative path computation
    generator = AuditReportGenerator(
        report_dir=report_dir,
        strip_prefix=args.strip_prefix,
        docs_base=args.docs_base  # Only used if explicitly provided
    )

    # Set report date
    if args.date:
        generator.report_date = args.date

    # Load data
    generator.load_json_data(
        args.frontmatter_json,
        args.links_json,
        args.duplicates_json
    )

    # Generate report
    report = generator.generate_full_report()

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write report
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"✅ Audit report generated: {output_path}")

    # Print summary
    health = generator.calculate_overall_health_score()
    print(f"📊 Overall Health Score: {health['score']}/100 (Grade: {health['grade']})")
    print(f"📈 Status: {health['status']}")


if __name__ == '__main__':
    main()