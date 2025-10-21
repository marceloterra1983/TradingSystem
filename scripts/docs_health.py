#!/usr/bin/env python3
"""
Documentation Health Monitoring Script

This script monitors the health of documentation systems and generates
status reports for the DocsSPECS interface.

Usage:
T    python scripts/docs_health.py --spec ./docs/spec/openapi.yaml --asyncapi ./docs/spec/asyncapi.yaml --out ./docs/public/status.json
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

import yaml


class DocsHealthMonitor:
    """Monitor documentation health and generate status reports."""
    
    def __init__(self, openapi_path: str, asyncapi_path: str, output_path: str):
        self.openapi_path = Path(openapi_path)
        self.asyncapi_path = Path(asyncapi_path)
        self.output_path = Path(output_path)
        
        # Ensure output directory exists
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
    
    def load_yaml_file(self, file_path: Path) -> Dict[str, Any]:
        """Load and parse a YAML file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"⚠️  Warning: Could not load {file_path}: {e}")
            return {}
    
    def check_openapi_health(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Check OpenAPI specification health."""
        health = {
            "status": "healthy",
            "issues": [],
            "metrics": {}
        }
        
        if not spec:
            health["status"] = "error"
            health["issues"].append("Could not load OpenAPI specification")
            return health
        
        # Check required fields
        required_fields = ["openapi", "info", "paths"]
        for field in required_fields:
            if field not in spec:
                health["status"] = "warning"
                health["issues"].append(f"Missing required field: {field}")
        
        # Check version
        if "info" in spec and "version" in spec["info"]:
            health["metrics"]["version"] = spec["info"]["version"]
        else:
            health["status"] = "warning"
            health["issues"].append("Missing version in info section")
        
        # Count endpoints
        if "paths" in spec:
            endpoint_count = 0
            for path, methods in spec["paths"].items():
                for method in methods:
                    if method in ["get", "post", "put", "delete", "patch"]:
                        endpoint_count += 1
            health["metrics"]["endpoints"] = endpoint_count
        else:
            health["metrics"]["endpoints"] = 0
        
        # Check for servers
        if "servers" not in spec or not spec["servers"]:
            health["status"] = "warning"
            health["issues"].append("No servers defined")
        
        # Check components
        if "components" in spec:
            health["metrics"]["schemas"] = len(spec["components"].get("schemas", {}))
            health["metrics"]["responses"] = len(spec["components"].get("responses", {}))
            health["metrics"]["parameters"] = len(spec["components"].get("parameters", {}))
        else:
            health["metrics"]["schemas"] = 0
            health["metrics"]["responses"] = 0
            health["metrics"]["parameters"] = 0
        
        return health
    
    def check_asyncapi_health(self, spec: Dict[str, Any]) -> Dict[str, Any]:
        """Check AsyncAPI specification health."""
        health = {
            "status": "healthy",
            "issues": [],
            "metrics": {}
        }
        
        if not spec:
            health["status"] = "error"
            health["issues"].append("Could not load AsyncAPI specification")
            return health
        
        # Check required fields
        required_fields = ["asyncapi", "info", "channels"]
        for field in required_fields:
            if field not in spec:
                health["status"] = "warning"
                health["issues"].append(f"Missing required field: {field}")
        
        # Check version
        if "info" in spec and "version" in spec["info"]:
            health["metrics"]["version"] = spec["info"]["version"]
        else:
            health["status"] = "warning"
            health["issues"].append("Missing version in info section")
        
        # Count channels
        if "channels" in spec:
            health["metrics"]["channels"] = len(spec["channels"])
            
            # Count messages
            message_count = 0
            for channel, channel_spec in spec["channels"].items():
                if "messages" in channel_spec:
                    message_count += len(channel_spec["messages"])
            health["metrics"]["messages"] = message_count
        else:
            health["metrics"]["channels"] = 0
            health["metrics"]["messages"] = 0
        
        # Check components
        if "components" in spec:
            health["metrics"]["schemas"] = len(spec["components"].get("schemas", {}))
            health["metrics"]["messages"] = len(spec["components"].get("messages", {}))
        else:
            health["metrics"]["schemas"] = 0
            health["metrics"]["messages"] = 0
        
        return health
    
    def check_ingestion_health(self) -> Dict[str, Any]:
        """Check Docusaurus ingestion pipeline health."""
        health = {
            "status": "healthy",
            "issues": [],
            "metrics": {}
        }
        
        # Check for extracted data
        extracted_data_path = Path("docs/spec/extracted_data.json")
        if extracted_data_path.exists():
            try:
                with open(extracted_data_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                metadata = data.get("metadata", {})
                health["metrics"]["processed_files"] = metadata.get("processed_files", 0)
                health["metrics"]["total_files"] = metadata.get("total_files", 0)
                health["metrics"]["endpoints_extracted"] = len(data.get("endpoints", {}))
                health["metrics"]["schemas_extracted"] = len(data.get("schemas", {}))
                health["metrics"]["examples_extracted"] = len(data.get("examples", {}))
                
                if metadata.get("processed_files", 0) == 0:
                    health["status"] = "warning"
                    health["issues"].append("No files have been processed")
                
                # Check last ingestion time
                if "ingested_at" in metadata:
                    last_ingestion = datetime.fromisoformat(metadata["ingested_at"])
                    time_diff = datetime.now() - last_ingestion
                    
                    if time_diff.days > 7:
                        health["status"] = "warning"
                        health["issues"].append(f"Last ingestion was {time_diff.days} days ago")
                
            except Exception as e:
                health["status"] = "error"
                health["issues"].append(f"Could not read extracted data: {e}")
        else:
            health["status"] = "warning"
            health["issues"].append("No extracted data found - run ingestion pipeline")
        
        return health
    
    def check_file_health(self) -> Dict[str, Any]:
        """Check for required files and their accessibility."""
        health = {
            "status": "healthy",
            "issues": [],
            "metrics": {}
        }
        
        required_files = [
            "docs/spec/openapi.yaml",
            "docs/spec/asyncapi.yaml",
            "docs/ingest/assets/symbols.yaml",
            "docs/public/redoc.html",
            "docs/spectral.yaml"
        ]
        
        missing_files = []
        existing_files = []
        
        for file_path in required_files:
            path = Path(file_path)
            if path.exists():
                existing_files.append(file_path)
                # Check file size
                size = path.stat().st_size
                if size == 0:
                    health["status"] = "warning"
                    health["issues"].append(f"File is empty: {file_path}")
            else:
                missing_files.append(file_path)
                health["status"] = "error"
                health["issues"].append(f"Missing file: {file_path}")
        
        health["metrics"]["required_files"] = len(required_files)
        health["metrics"]["existing_files"] = len(existing_files)
        health["metrics"]["missing_files"] = len(missing_files)
        
        return health
    
    def generate_overall_health(self, openapi_health: Dict, asyncapi_health: Dict, 
                              ingestion_health: Dict, file_health: Dict) -> str:
        """Generate overall health status."""
        statuses = [
            openapi_health["status"],
            asyncapi_health["status"],
            ingestion_health["status"],
            file_health["status"]
        ]
        
        if "error" in statuses:
            return "error"
        elif "warning" in statuses:
            return "warning"
        else:
            return "healthy"
    
    def generate_status_report(self) -> Dict[str, Any]:
        """Generate comprehensive status report."""
        # Load specifications
        openapi_spec = self.load_yaml_file(self.openapi_path)
        asyncapi_spec = self.load_yaml_file(self.asyncapi_path)
        
        # Check health of different components
        openapi_health = self.check_openapi_health(openapi_spec)
        asyncapi_health = self.check_asyncapi_health(asyncapi_spec)
        ingestion_health = self.check_ingestion_health()
        file_health = self.check_file_health()
        
        # Generate overall status
        overall_status = self.generate_overall_health(
            openapi_health, asyncapi_health, ingestion_health, file_health
        )
        
        # Count total issues
        total_issues = (len(openapi_health["issues"]) + 
                       len(asyncapi_health["issues"]) + 
                       len(ingestion_health["issues"]) + 
                       len(file_health["issues"]))
        
        # Combine metrics
        metrics = {
            "openapi": openapi_health["metrics"],
            "asyncapi": asyncapi_health["metrics"],
            "ingestion": ingestion_health["metrics"],
            "files": file_health["metrics"]
        }
        
        # Generate status report
        report = {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "summary": {
                "total_issues": total_issues,
                "components": {
                    "openapi": openapi_health["status"],
                    "asyncapi": asyncapi_health["status"],
                    "ingestion": ingestion_health["status"],
                    "files": file_health["status"]
                }
            },
            "metrics": metrics,
            "issues": {
                "openapi": openapi_health["issues"],
                "asyncapi": asyncapi_health["issues"],
                "ingestion": ingestion_health["issues"],
                "files": file_health["issues"]
            },
            "endpoints": openapi_health["metrics"].get("endpoints", 0),
            "channels": asyncapi_health["metrics"].get("channels", 0)
        }
        
        return report
    
    def save_status_report(self, report: Dict[str, Any]):
        """Save status report to output file."""
        try:
            with open(self.output_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            print(f"✅ Status report saved to {self.output_path}")
        except Exception as e:
            print(f"❌ Error saving status report: {e}")
            sys.exit(1)
    
    def print_summary(self, report: Dict[str, Any]):
        """Print a summary of the health check."""
        print(f"\n📊 Documentation Health Report")
        print(f"=============================")
        print(f"Overall Status: {report['status'].upper()}")
        print(f"Total Issues: {report['summary']['total_issues']}")
        print(f"Timestamp: {report['timestamp']}")
        
        print(f"\nComponents:")
        for component, status in report['summary']['components'].items():
            icon = "✅" if status == "healthy" else "⚠️" if status == "warning" else "❌"
            print(f"  {icon} {component.title()}: {status}")
        
        print(f"\nMetrics:")
        print(f"  - OpenAPI Endpoints: {report['endpoints']}")
        print(f"  - AsyncAPI Channels: {report['channels']}")
        print(f"  - Files Present: {report['metrics']['files']['existing_files']}/{report['metrics']['files']['required_files']}")
        
        if report['summary']['total_issues'] > 0:
            print(f"\nIssues Found:")
            for component, issues in report['issues'].items():
                if issues:
                    print(f"  {component.title()}:")
                    for issue in issues:
                        print(f"    - {issue}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Documentation Health Monitor")
    parser.add_argument("--spec", required=True, help="OpenAPI specification file")
    parser.add_argument("--asyncapi", dest="asyncapi", required=True, help="AsyncAPI specification file")
    parser.add_argument("--out", required=True, help="Output status file")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    try:
        monitor = DocsHealthMonitor(args.spec, args.asyncapi, args.out)
        report = monitor.generate_status_report()
        
        # Save report
        monitor.save_status_report(report)
        
        # Print summary
        if args.verbose:
            monitor.print_summary(report)
        
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