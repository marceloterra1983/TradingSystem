#!/usr/bin/env python3
"""
Specification Versioning Script

This script manages independent versioning for OpenAPI and AsyncAPI specifications,
handling version bumps, changelog generation, and cross-references.

Usage:
    python scripts/version_specs.py --bump patch|minor|major --spec openapi|asyncapi|all
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

import yaml


class SpecVersionManager:
    """Manage independent versioning for API specifications."""
    
    def __init__(self, spec_dir: str):
        self.spec_dir = Path(spec_dir)
        self.openapi_file = self.spec_dir / "openapi.yaml"
        self.asyncapi_file = self.spec_dir / "asyncapi.yaml"
        self.changelog_file = self.spec_dir / "CHANGELOG_SPEC.md"
        self.metadata_file = self.spec_dir / "version_metadata.json"
        
        # Load version metadata
        self.metadata = self.load_metadata()
    
    def load_metadata(self) -> Dict[str, Any]:
        """Load version metadata from file."""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️  Warning: Could not load metadata file: {e}")
        
        # Default metadata
        return {
            "openapi": {
                "version": "1.0.0",
                "last_updated": datetime.utcnow().isoformat(),
                "changelog": []
            },
            "asyncapi": {
                "version": "1.0.0",
                "last_updated": datetime.utcnow().isoformat(),
                "changelog": []
            },
            "global": {
                "created_at": datetime.utcnow().isoformat(),
                "last_sync": datetime.utcnow().isoformat()
            }
        }
    
    def save_metadata(self):
        """Save version metadata to file."""
        try:
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.metadata, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"❌ Error saving metadata file: {e}")
            sys.exit(1)
    
    def load_spec(self, spec_file: Path) -> Dict[str, Any]:
        """Load specification from YAML file."""
        try:
            with open(spec_file, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"❌ Error loading {spec_file}: {e}")
            sys.exit(1)
    
    def save_spec(self, spec_file: Path, spec: Dict[str, Any]):
        """Save specification to YAML file."""
        try:
            with open(spec_file, 'w', encoding='utf-8') as f:
                yaml.dump(spec, f, default_flow_style=False, sort_keys=False)
        except Exception as e:
            print(f"❌ Error saving {spec_file}: {e}")
            sys.exit(1)
    
    def parse_version(self, version: str) -> Tuple[int, int, int]:
        """Parse semantic version string."""
        match = re.match(r'^(\d+)\.(\d+)\.(\d+)$', version)
        if not match:
            raise ValueError(f"Invalid version format: {version}")
        
        return tuple(map(int, match.groups()))
    
    def format_version(self, version: Tuple[int, int, int]) -> str:
        """Format version tuple as string."""
        return f"{version[0]}.{version[1]}.{version[2]}"
    
    def bump_version(self, current_version: str, bump_type: str) -> str:
        """Bump version according to semantic versioning."""
        version = self.parse_version(current_version)
        
        if bump_type == "patch":
            version = (version[0], version[1], version[2] + 1)
        elif bump_type == "minor":
            version = (version[0], version[1] + 1, 0)
        elif bump_type == "major":
            version = (version[0] + 1, 0, 0)
        else:
            raise ValueError(f"Invalid bump type: {bump_type}")
        
        return self.format_version(version)
    
    def update_spec_version(self, spec_file: Path, new_version: str, spec_type: str) -> Dict[str, Any]:
        """Update version in specification file."""
        spec = self.load_spec(spec_file)
        old_version = spec.get("info", {}).get("version", "unknown")
        
        # Update version
        if "info" not in spec:
            spec["info"] = {}
        spec["info"]["version"] = new_version
        
        # Save updated spec
        self.save_spec(spec_file, spec)
        
        print(f"✅ Updated {spec_type} version: {old_version} → {new_version}")
        
        return spec
    
    def add_changelog_entry(self, spec_type: str, old_version: str, new_version: str, 
                           bump_type: str, changes: Optional[str] = None):
        """Add changelog entry for version change."""
        timestamp = datetime.utcnow().isoformat()
        
        entry = {
            "version": new_version,
            "previous_version": old_version,
            "bump_type": bump_type,
            "timestamp": timestamp,
            "changes": changes or f"Bumped {spec_type} version ({bump_type})"
        }
        
        # Add to metadata changelog
        if spec_type not in self.metadata:
            self.metadata[spec_type] = {"changelog": []}
        
        self.metadata[spec_type]["changelog"].insert(0, entry)
        self.metadata[spec_type]["last_updated"] = timestamp
        
        # Keep only last 20 entries
        if len(self.metadata[spec_type]["changelog"]) > 20:
            self.metadata[spec_type]["changelog"] = self.metadata[spec_type]["changelog"][:20]
        
        print(f"📝 Added changelog entry for {spec_type} {new_version}")
    
    def update_markdown_changelog(self):
        """Update markdown changelog file."""
        try:
            changelog_content = ["# API Specification Changelog\n"]
            changelog_content.append("This document tracks version changes for OpenAPI and AsyncAPI specifications.\n")
            
            # OpenAPI changelog
            if "openapi" in self.metadata:
                changelog_content.append("## OpenAPI Specification\n")
                for entry in self.metadata["openapi"].get("changelog", []):
                    timestamp = datetime.fromisoformat(entry["timestamp"]).strftime("%Y-%m-%d %H:%M UTC")
                    changelog_content.append(f"### v{entry['version']} ({timestamp})")
                    changelog_content.append(f"- **Previous:** v{entry['previous_version']}")
                    changelog_content.append(f"- **Type:** {entry['bump_type']}")
                    changelog_content.append(f"- **Changes:** {entry['changes']}\n")
            
            # AsyncAPI changelog
            if "asyncapi" in self.metadata:
                changelog_content.append("## AsyncAPI Specification\n")
                for entry in self.metadata["asyncapi"].get("changelog", []):
                    timestamp = datetime.fromisoformat(entry["timestamp"]).strftime("%Y-%m-%d %H:%M UTC")
                    changelog_content.append(f"### v{entry['version']} ({timestamp})")
                    changelog_content.append(f"- **Previous:** v{entry['previous_version']}")
                    changelog_content.append(f"- **Type:** {entry['bump_type']}")
                    changelog_content.append(f"- **Changes:** {entry['changes']}\n")
            
            # Write changelog
            with open(self.changelog_file, 'w', encoding='utf-8') as f:
                f.write('\n'.join(changelog_content))
            
            print(f"📄 Updated markdown changelog: {self.changelog_file}")
            
        except Exception as e:
            print(f"⚠️  Warning: Could not update markdown changelog: {e}")
    
    def get_current_versions(self) -> Dict[str, str]:
        """Get current versions of all specifications."""
        versions = {}
        
        if self.openapi_file.exists():
            spec = self.load_spec(self.openapi_file)
            versions["openapi"] = spec.get("info", {}).get("version", "unknown")
        
        if self.asyncapi_file.exists():
            spec = self.load_spec(self.asyncapi_file)
            versions["asyncapi"] = spec.get("info", {}).get("version", "unknown")
        
        return versions
    
    def bump_spec_version(self, spec_type: str, bump_type: str, changes: Optional[str] = None):
        """Bump version for a specific specification."""
        if spec_type not in ["openapi", "asyncapi"]:
            raise ValueError(f"Invalid spec type: {spec_type}")
        
        # Determine which file to update
        spec_file = self.openapi_file if spec_type == "openapi" else self.asyncapi_file
        
        if not spec_file.exists():
            raise FileNotFoundError(f"Specification file not found: {spec_file}")
        
        # Get current version from metadata or file
        current_version = self.metadata[spec_type].get("version", "1.0.0")
        
        # Load actual version from file
        spec = self.load_spec(spec_file)
        file_version = spec.get("info", {}).get("version", current_version)
        
        # Use file version if it differs from metadata
        if file_version != current_version:
            print(f"📋 Using file version: {file_version} (metadata had {current_version})")
            current_version = file_version
        
        # Calculate new version
        new_version = self.bump_version(current_version, bump_type)
        
        # Update specification file
        self.update_spec_version(spec_file, new_version, spec_type)
        
        # Add changelog entry
        self.add_changelog_entry(spec_type, current_version, new_version, bump_type, changes)
        
        # Update global metadata
        self.metadata["global"]["last_sync"] = datetime.utcnow().isoformat()
        
        # Save metadata
        self.save_metadata()
        
        # Update markdown changelog
        self.update_markdown_changelog()
        
        return new_version
    
    def sync_versions(self):
        """Synchronize versions between metadata and specification files."""
        print("🔄 Syncing versions between metadata and specification files...")
        
        versions = self.get_current_versions()
        
        for spec_type, version in versions.items():
            if spec_type in self.metadata:
                metadata_version = self.metadata[spec_type].get("version", "1.0.0")
                if version != metadata_version:
                    print(f"📋 Syncing {spec_type}: {metadata_version} → {version}")
                    self.metadata[spec_type]["version"] = version
        
        self.metadata["global"]["last_sync"] = datetime.utcnow().isoformat()
        self.save_metadata()
        
        print("✅ Version synchronization completed")
    
    def print_status(self):
        """Print current version status."""
        print(f"\n📋 Specification Version Status")
        print(f"===============================")
        
        versions = self.get_current_versions()
        
        for spec_type, version in versions.items():
            metadata_version = self.metadata.get(spec_type, {}).get("version", "unknown")
            last_updated = self.metadata.get(spec_type, {}).get("last_updated", "unknown")
            
            status = "✅" if version == metadata_version else "⚠️"
            print(f"{status} {spec_type.title()}: {version}")
            print(f"   Metadata: {metadata_version}")
            print(f"   Updated: {last_updated}")
            print()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Specification Versioning Script")
    parser.add_argument("--bump", choices=["patch", "minor", "major"], 
                       help="Version bump type")
    parser.add_argument("--spec", choices=["openapi", "asyncapi", "all"], 
                       default="all", help="Specification to version")
    parser.add_argument("--changes", help="Description of changes")
    parser.add_argument("--sync", action="store_true", help="Sync versions between files")
    parser.add_argument("--status", action="store_true", help="Show current version status")
    parser.add_argument("--spec-dir", default="docs/spec", help="Specification directory")
    
    args = parser.parse_args()
    
    try:
        manager = SpecVersionManager(args.spec_dir)
        
        if args.status:
            manager.print_status()
            return
        
        if args.sync:
            manager.sync_versions()
            return
        
        if args.bump:
            specs_to_bump = ["openapi", "asyncapi"] if args.spec == "all" else [args.spec]
            
            for spec_type in specs_to_bump:
                try:
                    new_version = manager.bump_spec_version(
                        spec_type, args.bump, args.changes
                    )
                    print(f"🎉 {spec_type.title()} bumped to v{new_version}")
                except Exception as e:
                    print(f"❌ Failed to bump {spec_type}: {e}")
                    sys.exit(1)
        else:
            # Just show status if no action specified
            manager.print_status()
    
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()