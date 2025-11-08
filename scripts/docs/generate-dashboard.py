#!/usr/bin/env python3
"""
Documentation Quality Assurance Dashboard Generator
Creates comprehensive HTML dashboard with metrics and visualizations
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List

def load_reports(reports_dir: Path) -> Dict:
    """Load all available reports"""
    reports = {}

    # Load frontmatter validation
    fm_file = reports_dir / 'frontmatter-validation.json'
    if fm_file.exists():
        with open(fm_file) as f:
            reports['frontmatter'] = json.load(f)

    # Load optimization report
    opt_files = list(reports_dir.glob('optimization-report-*.md'))
    if opt_files:
        reports['optimization_file'] = opt_files[-1]

    # Load readability report
    read_files = list(reports_dir.glob('readability-report-*.json'))
    if read_files:
        with open(read_files[-1]) as f:
            reports['readability'] = json.load(f)

    # Load audit report
    audit_files = list(reports_dir.glob('audit-report-*.json'))
    if audit_files:
        with open(audit_files[-1]) as f:
            reports['audit'] = json.load(f)

    return reports

def calculate_health_score(reports: Dict) -> Dict:
    """Calculate overall health score from reports"""
    scores = {}

    # Frontmatter score
    if 'frontmatter' in reports:
        fm = reports['frontmatter']['summary']
        total = fm.get('total_files', 1)
        valid = fm.get('files_with_frontmatter', 0)
        scores['frontmatter'] = (valid / total * 100) if total > 0 else 0

    # Optimization score
    if 'optimization_file' in reports:
        with open(reports['optimization_file']) as f:
            content = f.read()
            import re
            match = re.search(r'Optimization Score: (\d+)/100', content)
            if match:
                scores['optimization'] = int(match.group(1))

    # Readability score
    if 'readability' in reports:
        scores['readability'] = reports['readability'].get('average_score', 0)

    # Calculate overall
    if scores:
        overall = sum(scores.values()) / len(scores)
    else:
        overall = 0

    return {
        'overall': overall,
        'components': scores
    }

def generate_html_dashboard(reports: Dict, scores: Dict, output_file: Path):
    """Generate HTML dashboard"""

    # Get statistics
    fm_summary = reports.get('frontmatter', {}).get('summary', {})
    read_summary = reports.get('readability', {})

    overall_score = scores['overall']
    status_color = '#10B981' if overall_score >= 90 else '#F59E0B' if overall_score >= 75 else '#EF4444'
    status_text = 'EXCELLENT' if overall_score >= 90 else 'GOOD' if overall_score >= 75 else 'FAIR' if overall_score >= 60 else 'NEEDS ATTENTION'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Quality Dashboard</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        .header {{
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .header h1 {{
            color: #1f2937;
            margin-bottom: 0.5rem;
        }}
        .header p {{
            color: #6b7280;
        }}
        .score-card {{
            background: white;
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
            margin-bottom: 2rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .score-value {{
            font-size: 4rem;
            font-weight: bold;
            color: {status_color};
            line-height: 1;
        }}
        .score-label {{
            font-size: 1.5rem;
            color: {status_color};
            margin-top: 0.5rem;
            font-weight: 600;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }}
        .metric-card {{
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .metric-title {{
            color: #6b7280;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }}
        .metric-value {{
            color: #1f2937;
            font-size: 2rem;
            font-weight: bold;
        }}
        .metric-subtitle {{
            color: #9ca3af;
            font-size: 0.875rem;
            margin-top: 0.25rem;
        }}
        .progress-bar {{
            background: #e5e7eb;
            height: 8px;
            border-radius: 4px;
            margin-top: 1rem;
            overflow: hidden;
        }}
        .progress-fill {{
            background: linear-gradient(90deg, #10b981, #059669);
            height: 100%;
            transition: width 1s ease;
        }}
        .components-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }}
        .component-card {{
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .component-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }}
        .component-name {{
            font-size: 1.125rem;
            font-weight: 600;
            color: #1f2937;
        }}
        .component-score {{
            font-size: 1.5rem;
            font-weight: bold;
            color: #667eea;
        }}
        .footer {{
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            color: #6b7280;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .badge {{
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
        }}
        .badge-success {{
            background: #d1fae5;
            color: #065f46;
        }}
        .badge-warning {{
            background: #fef3c7;
            color: #92400e;
        }}
        .badge-danger {{
            background: #fee2e2;
            color: #991b1b;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Documentation Quality Dashboard</h1>
            <p>Real-time metrics and health monitoring</p>
        </div>

        <div class="score-card">
            <div class="score-value">{overall_score:.0f}</div>
            <div class="score-label">{status_text}</div>
            <p style="color: #6b7280; margin-top: 1rem;">Overall Documentation Health Score</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-title">Total Files</div>
                <div class="metric-value">{fm_summary.get('total_files', 0)}</div>
                <div class="metric-subtitle">Documentation files</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Frontmatter Compliance</div>
                <div class="metric-value">{fm_summary.get('files_with_frontmatter', 0)}/{fm_summary.get('total_files', 0)}</div>
                <div class="metric-subtitle">{(fm_summary.get('files_with_frontmatter', 0) / max(fm_summary.get('total_files', 1), 1) * 100):.1f}% complete</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {(fm_summary.get('files_with_frontmatter', 0) / max(fm_summary.get('total_files', 1), 1) * 100):.1f}%"></div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Average Readability</div>
                <div class="metric-value">{read_summary.get('average_score', 0):.1f}</div>
                <div class="metric-subtitle">Flesch Reading Ease</div>
            </div>
            <div class="metric-card">
                <div class="metric-title">Files with Issues</div>
                <div class="metric-value">{fm_summary.get('files_with_issues', 0)}</div>
                <div class="metric-subtitle">Requiring attention</div>
            </div>
        </div>

        <div class="components-grid">
"""

    # Add component scores
    for name, score in scores['components'].items():
        badge_class = 'badge-success' if score >= 90 else 'badge-warning' if score >= 75 else 'badge-danger'
        badge_text = 'Excellent' if score >= 90 else 'Good' if score >= 75 else 'Needs Work'

        html += f"""
            <div class="component-card">
                <div class="component-header">
                    <div class="component-name">{name.capitalize()}</div>
                    <div class="component-score">{score:.0f}</div>
                </div>
                <span class="badge {badge_class}">{badge_text}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {score}%"></div>
                </div>
            </div>
"""

    html += f"""
        </div>

        <div class="footer">
            <p>Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p style="margin-top: 0.5rem;">Generated by Documentation Quality Dashboard v1.0</p>
        </div>
    </div>

    <script>
        // Animate progress bars on load
        window.addEventListener('load', function() {{
            const fills = document.querySelectorAll('.progress-fill');
            fills.forEach(fill => {{
                const width = fill.style.width;
                fill.style.width = '0%';
                setTimeout(() => {{
                    fill.style.width = width;
                }}, 100);
            }});
        }});
    </script>
</body>
</html>
"""

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(html)
    print(f"Dashboard generated: {output_file}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 generate-dashboard.py <reports-dir> [output-file]")
        sys.exit(1)

    reports_dir = Path(sys.argv[1])
    output_file = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('docs/reports/dashboard.html')

    if not reports_dir.exists():
        print(f"Error: Reports directory not found: {reports_dir}")
        sys.exit(1)

    print("Loading reports...")
    reports = load_reports(reports_dir)

    print("Calculating health scores...")
    scores = calculate_health_score(reports)

    print("Generating dashboard...")
    generate_html_dashboard(reports, scores, output_file)

    print("\n" + "="*60)
    print(f"Dashboard generated successfully!")
    print(f"Overall Score: {scores['overall']:.0f}/100")
    print(f"Open in browser: file://{output_file.absolute()}")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
