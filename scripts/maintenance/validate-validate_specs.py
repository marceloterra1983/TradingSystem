#!/usr/bin/env python3
"""
Specification Validation Script

This script validates OpenAPI and AsyncAPI specifications using Spectral
and generates validation reports.

Usage:
    python scripts/validate_specs.py --spec-dir ./docs/spec --output ./docs/validation-report.json
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any


class SpecValidator:
    """Validate API specifications using Spectral."""
    
    def __init__(self, spec_dir: str, output_path: str):
        self.spec_dir = Path(spec_dir)
        self.output_path = Path(output_path)
        self.spectral_config = Path("docs/spectral.yaml")
        
        # Ensure output directory exists
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
    
    def check_spectral_available(self) -> bool:
        """Check if Spectral CLI is available."""
        try:
            result = subprocess.run(
                ["spectral", "--version"],
                capture_output=True,
                text=True,
                check=True
            )
            print(f"✅ Found Spectral CLI: {result.stdout.strip()}")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Spectral CLI not found. Install with: npm install -g @stoplight/spectral-cli")
            return False
    
    def run_spectral_validation(self, spec_file: Path) -> Dict[str, Any]:
        """Run Spectral validation on a specification file."""
        try:
            cmd = [
                "spectral",
                "lint",
                str(spec_file),
                "--ruleset",
                str(self.spectral_config),
                "--format",
                "json"
            ]
            
            print(f"🔍 Validating {spec_file.name}...")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(self.spec_dir.parent)
            )
            
            # Parse results
            if result.returncode == 0:
                spectral_results = json.loads(result.stdout)
                return {
                    "file": str(spec_file),
                    "status": "success",
                    "issues": spectral_results or [],
                    "error": None
                }
            else:
                # Try to parse partial results even on error
                try:
                    spectral_results = json.loads(result.stdout)
                    return {
                        "file": str(spec_file),
                        "status": "error",
                        "issues": spectral_results or [],
                        "error": result.stderr
                    }
                except json.JSONDecodeError:
                    return {
                        "file": str(spec_file),
                        "status": "error",
                        "issues": [],
                        "error": result.stderr
                    }
        
        except Exception as e:
            return {
                "file": str(spec_file),
                "status": "error",
                "issues": [],
                "error": str(e)
            }
    
    def validate_all_specs(self) -> Dict[str, Any]:
        """Validate all specification files in the directory."""
        # Find all specification files
        spec_files = list(self.spec_dir.glob("*.yaml")) + list(self.spec_dir.glob("*.yml"))
        
        if not spec_files:
            return {
                "status": "error",
                "error": "No specification files found",
                "results": []
            }
        
        print(f"📁 Found {len(spec_files)} specification files")
        
        # Validate each file
        results = []
        total_issues = 0
        total_errors = 0
        total_warnings = 0
        total_info = 0
        
        for spec_file in spec_files:
            validation_result = self.run_spectral_validation(spec_file)
            results.append(validation_result)
            
            # Count issues
            issues = validation_result.get("issues", [])
            total_issues += len(issues)
            
            for issue in issues:
                severity = issue.get("severity", 0)
                if severity == 0:  # error
                    total_errors += 1
                elif severity == 1:  # warning
                    total_warnings += 1
                elif severity == 2:  # info
                    total_info += 1
        
        # Determine overall status
        if total_errors > 0:
            overall_status = "error"
        elif total_warnings > 0:
            overall_status = "warning"
        else:
            overall_status = "success"
        
        # Generate report
        report = {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "total_files": len(spec_files),
                "total_issues": total_issues,
                "total_errors": total_errors,
                "total_warnings": total_warnings,
                "total_info": total_info,
                "files_passed": sum(1 for r in results if r["status"] == "success"),
                "files_failed": sum(1 for r in results if r["status"] == "error")
            },
            "results": results,
            "config": str(self.spectral_config)
        }
        
        return report
    
    def generate_validation_report(self) -> Dict[str, Any]:
        """Generate comprehensive validation report."""
        if not self.check_spectral_available():
            return {
                "status": "error",
                "error": "Spectral CLI not available",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Check if config exists
        if not self.spectral_config.exists():
            print(f"⚠️  Warning: Spectral config not found at {self.spectral_config}")
        
        # Validate all specs
        validation_report = self.validate_all_specs()
        
        # Add additional metadata
        validation_report["metadata"] = {
            "spectral_config": str(self.spectral_config),
            "spec_directory": str(self.spec_dir),
            "validation_tool": "Spectral CLI",
            "trading_system_version": "1.0.0"
        }
        
        return validation_report
    
    def save_report(self, report: Dict[str, Any]):
        """Save validation report to output file."""
        try:
            with open(self.output_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            print(f"✅ Validation report saved to {self.output_path}")
        except Exception as e:
            print(f"❌ Error saving validation report: {e}")
            sys.exit(1)
    
    def print_summary(self, report: Dict[str, Any]):
        """Print validation summary."""
        print(f"\n🔍 API Specification Validation Report")
        print(f"=====================================")
        print(f"Overall Status: {report['status'].upper()}")
        print(f"Timestamp: {report['timestamp']}")
        
        if "summary" in report:
            summary = report["summary"]
            print(f"\nSummary:")
            print(f"  - Total Files: {summary['total_files']}")
            print(f"  - Files Passed: {summary['files_passed']}")
            print(f"  - Files Failed: {summary['files_failed']}")
            print(f"  - Total Issues: {summary['total_issues']}")
            print(f"    - Errors: {summary['total_errors']}")
            print(f"    - Warnings: {summary['total_warnings']}")
            print(f"    - Info: {summary['total_info']}")
        
        # Show detailed issues if any
        if "results" in report:
            print(f"\nDetailed Results:")
            for result in report["results"]:
                file_name = Path(result["file"]).name
                status_icon = "✅" if result["status"] == "success" else "❌"
                print(f"  {status_icon} {file_name}: {result['status']}")
                
                issues = result.get("issues", [])
                if issues:
                    for issue in issues[:5]:  # Show first 5 issues
                        severity = issue.get("severity", "unknown")
                        message = issue.get("message", "No message")
                        path = issue.get("path", "unknown path")
                        print(f"    [{severity}] {path}: {message}")
                    
                    if len(issues) > 5:
                        print(f"    ... and {len(issues) - 5} more issues")
        
        # Show errors if any
        if "results" in report:
            error_results = [r for r in report["results"] if r.get("error")]
            if error_results:
                print(f"\nErrors:")
                for result in error_results:
                    file_name = Path(result["file"]).name
                    print(f"  ❌ {file_name}: {result['error']}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Specification Validation Script")
    parser.add_argument("--spec-dir", required=True, help="Specification directory")
    parser.add_argument("--output", required=True, help="Output validation report file")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    try:
        validator = SpecValidator(args.spec_dir, args.output)
        report = validator.generate_validation_report()
        
        # Save report
        validator.save_report(report)
        
        # Print summary
        if args.verbose:
            validator.print_summary(report)
        
        # Exit with appropriate code
        if report['status'] == 'error':
            sys.exit(1)
        elif report['status'] == 'warning':
            sys.exit(2)
        else:
            sys.exit(0)
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()