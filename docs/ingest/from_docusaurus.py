#!/usr/bin/env python3
"""
Docusaurus Ingestion Pipeline for TradingSystem

This script extracts knowledge from Docusaurus MD/MDX files and enriches
OpenAPI/AsyncAPI specifications with contextual information.

Usage:
    python from_docusaurus.py --root ./docs/docusaurus --symbols ./docs/ingest/assets/symbols.yaml --out ./docs/spec
"""

import argparse
import json
import os
import re
import sys
import yaml
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import yaml


class DocusaurusIngestor:
    """Main class for ingesting Docusaurus content into API specifications."""
    
    def __init__(self, root_dir: str, symbols_file: str, output_dir: str):
        self.root_dir = Path(root_dir)
        self.symbols_file = Path(symbols_file)
        self.output_dir = Path(output_dir)
        self.symbols_data = {}
        self.extracted_data = {
            "endpoints": {},
            "schemas": {},
            "examples": {},
            "descriptions": {},
            "metadata": {
                "ingested_at": datetime.utcnow().isoformat(),
                "source_files": [],
                "total_files": 0,
                "processed_files": 0
            }
        }
        
        # Load symbols heuristics
        self._load_symbols()
        
        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def _load_symbols(self):
        """Load market symbols heuristics from YAML file."""
        try:
            with open(self.symbols_file, 'r', encoding='utf-8') as f:
                self.symbols_data = yaml.safe_load(f)
            print(f"✅ Loaded symbols data from {self.symbols_file}")
        except Exception as e:
            print(f"⚠️  Warning: Could not load symbols file: {e}")
            self.symbols_data = {}
    
    def _process_frontmatter(self, content: str) -> Tuple[Dict, str]:
        """Extract frontmatter from MD/MDX content."""
        if content.startswith('---'):
            try:
                end_idx = content.find('---', 3)
                if end_idx != -1:
                    frontmatter_text = content[3:end_idx].strip()
                    frontmatter = yaml.safe_load(frontmatter_text)
                    content = content[end_idx + 3:].strip()
                    return frontmatter, content
            except yaml.YAMLError:
                pass
        return {}, content
    
    def _should_process_file(self, frontmatter: Dict, file_path: Path) -> bool:
        """Determine if a file should be processed based on frontmatter."""
        # Skip if explicitly marked as spec: false
        if frontmatter.get('spec') is False:
            return False
        
        # Process if explicitly marked as spec: true or specOnly: true
        if frontmatter.get('spec') or frontmatter.get('specOnly'):
            return True
        
        # Auto-detect based on content and file location
        content_indicators = [
            'api', 'endpoint', 'schema', 'example', 'request', 'response',
            'websocket', 'stream', 'event', 'message', 'payload'
        ]
        
        # Check directory structure
        path_parts = str(file_path).lower()
        if any(part in path_parts for part in ['api', 'backend', 'integration']):
            return True
        
        return False
    
    def _extract_api_endpoints(self, content: str, file_path: Path) -> Dict:
        """Extract API endpoint information from content."""
        endpoints = {}
        
        # HTTP endpoint patterns
        http_patterns = [
            r'(?:GET|POST|PUT|DELETE|PATCH)\s+`/([^`]+)`',
            r'Endpoint:\s*`/([^`]+)`',
            r'Path:\s*`/([^`]+)`',
            r'\[.*?\]\(/api/([^)]+)\)',
        ]
        
        for pattern in http_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                endpoint = match.group(1)
                if endpoint not in endpoints:
                    endpoints[endpoint] = {
                        "methods": [],
                        "description": "",
                        "parameters": [],
                        "examples": [],
                        "source_file": str(file_path)
                    }
        
        # Extract HTTP methods
        method_pattern = r'(GET|POST|PUT|DELETE|PATCH)\s+`/([^`]+)`'
        for match in re.finditer(method_pattern, content, re.IGNORECASE):
            method = match.group(1).upper()
            endpoint = match.group(2)
            if endpoint in endpoints and method not in endpoints[endpoint]["methods"]:
                endpoints[endpoint]["methods"].append(method)
        
        # Extract WebSocket channels
        ws_patterns = [
            r'(?:Channel|Topic):\s*`([^`]+)`',
            r'Subscribe to:\s*`([^`]+)`',
            r'ws://[^/]+/([^`\s]+)',
        ]
        
        for pattern in ws_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                channel = match.group(1)
                if channel not in endpoints:
                    endpoints[channel] = {
                        "type": "websocket",
                        "description": "",
                        "messages": [],
                        "examples": [],
                        "source_file": str(file_path)
                    }
        
        return endpoints
    
    def _extract_schemas(self, content: str, file_path: Path) -> Dict:
        """Extract schema information from content."""
        schemas = {}
        
        # JSON schema patterns
        schema_patterns = [
            r'```json\s*\n(\{.*?\})\n```',
            r'Schema:\s*\n```json\s*\n(\{.*?\})\n```',
            r'```typescript\s*\n(interface|type)\s+(\w+).*?\{([^}]+)\}.*?```',
        ]
        
        for pattern in schema_patterns:
            matches = re.finditer(pattern, content, re.DOTALL | re.IGNORECASE)
            for match in matches:
                if match.group(1).startswith('{'):
                    # JSON schema
                    try:
                        schema = json.loads(match.group(1))
                        schema_name = self._generate_schema_name(schema, file_path)
                        schemas[schema_name] = {
                            "type": "json",
                            "schema": schema,
                            "source_file": str(file_path)
                        }
                    except json.JSONDecodeError:
                        continue
                else:
                    # TypeScript interface
                    schema_type = match.group(2)
                    schema_name = match.group(3)
                    schema_body = match.group(4)
                    
                    # Convert TypeScript to JSON schema (simplified)
                    json_schema = self._typescript_to_json_schema(schema_name, schema_body)
                    schemas[schema_name] = {
                        "type": "typescript",
                        "original_type": schema_type,
                        "schema": json_schema,
                        "source_file": str(file_path)
                    }
        
        return schemas
    
    def _typescript_to_json_schema(self, name: str, body: str) -> Dict:
        """Convert TypeScript interface to simple JSON schema."""
        # Simplified conversion - in production, use a proper parser
        properties = {}
        
        # Extract properties
        prop_pattern = r'(\w+)(\?)?:\s*([^;]+);'
        for match in re.finditer(prop_pattern, body):
            prop_name = match.group(1)
            is_optional = bool(match.group(2))
            prop_type = match.group(3).strip()
            
            # Map TypeScript types to JSON schema types
            json_type = "string"
            if "number" in prop_type or "int" in prop_type:
                json_type = "number"
            elif "bool" in prop_type:
                json_type = "boolean"
            elif prop_type.endswith("[]"):
                json_type = "array"
            
            properties[prop_name] = {
                "type": json_type,
                "optional": is_optional
            }
        
        return {
            "type": "object",
            "properties": properties,
            "required": [p for p in properties if not properties[p]["optional"]]
        }
    
    def _extract_examples(self, content: str, file_path: Path) -> Dict:
        """Extract code examples from content."""
        examples = {}
        
        # Code block patterns
        code_patterns = [
            (r'```json\s*\n({.*?})\n```', 'json'),
            (r'```bash\s*\n(.*?)\n```', 'bash'),
            (r'```javascript\s*\n(.*?)\n```', 'javascript'),
            (r'```python\s*\n(.*?)\n```', 'python'),
            (r'```curl\s*\n(.*?)\n```', 'curl'),
        ]
        
        for pattern, lang in code_patterns:
            matches = re.finditer(pattern, content, re.DOTALL)
            for i, match in enumerate(matches):
                example_name = f"{file_path.stem}_{lang}_{i}"
                examples[example_name] = {
                    "language": lang,
                    "code": match.group(1).strip(),
                    "description": self._extract_description_around_code(content, match.start()),
                    "source_file": str(file_path)
                }
        
        return examples
    
    def _extract_description_around_code(self, content: str, position: int) -> str:
        """Extract description text around a code block."""
        # Look for text before the code block
        before_start = max(0, position - 500)
        before_text = content[before_start:position]
        
        # Extract the last paragraph before the code
        paragraphs = re.split(r'\n\s*\n', before_text)
        if paragraphs:
            last_paragraph = paragraphs[-1].strip()
            # Remove markdown formatting
            last_paragraph = re.sub(r'[#*`\[\]()]', '', last_paragraph)
            return last_paragraph[:200]  # Limit length
        
        return ""
    
    def _generate_schema_name(self, schema: Dict, file_path: Path) -> str:
        """Generate a meaningful schema name from JSON schema."""
        if "title" in schema:
            return schema["title"]
        elif "$ref" in schema:
            return schema["$ref"].split("/")[-1]
        else:
            return f"{file_path.stem}_schema"
    
    def _enhance_with_symbols(self, data: Dict) -> Dict:
        """Enhance extracted data with symbols heuristics."""
        if not self.symbols_data:
            return data
        
        # Add symbols context to schemas
        for schema_name, schema_info in data.get("schemas", {}).items():
            schema = schema_info.get("schema", {})
            if isinstance(schema, dict) and "properties" in schema:
                for prop_name, prop_def in schema["properties"].items():
                    # Add symbol validation if property looks like a symbol
                    if prop_name.lower() in ["symbol", "asset", "instrument", "ticker"]:
                        prop_def["x-trading-system"] = {
                            "type": "market-symbol",
                            "validation": self.symbols_data.get("normalization", {}).get("patterns", {}),
                            "examples": self._get_symbol_examples()
                        }
        
        return data
    
    def _get_symbol_examples(self) -> List[str]:
        """Get symbol examples from symbols data."""
        examples = []
        for category, symbols in self.symbols_data.get("markets", {}).items():
            for symbol_info in symbols:
                if "examples" in symbol_info:
                    examples.extend(symbol_info["examples"])
                else:
                    examples.append(symbol_info["symbol"])
        return examples[:10]  # Limit to 10 examples
    
    def process_files(self) -> Dict:
        """Process all MD/MDX files in the Docusaurus directory."""
        print(f"🔍 Scanning directory: {self.root_dir}")
        
        # Find all MD/MDX files
        md_files = list(self.root_dir.rglob("*.md")) + list(self.root_dir.rglob("*.mdx"))
        self.extracted_data["metadata"]["total_files"] = len(md_files)
        
        print(f"📄 Found {len(md_files)} markdown files")
        
        for file_path in md_files:
            try:
                # Skip certain directories
                if any(skip in str(file_path) for skip in ['node_modules', '.git', 'build', 'dist']):
                    continue
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                frontmatter, content = self._process_frontmatter(content)
                
                if not self._should_process_file(frontmatter, file_path):
                    continue
                
                print(f"📖 Processing: {file_path.relative_to(self.root_dir)}")
                
                # Extract information
                endpoints = self._extract_api_endpoints(content, file_path)
                schemas = self._extract_schemas(content, file_path)
                examples = self._extract_examples(content, file_path)
                
                # Merge into extracted data
                self.extracted_data["endpoints"].update(endpoints)
                self.extracted_data["schemas"].update(schemas)
                self.extracted_data["examples"].update(examples)
                
                # Store descriptions by file
                self.extracted_data["descriptions"][str(file_path)] = {
                    "title": frontmatter.get("title", ""),
                    "description": frontmatter.get("description", ""),
                    "content_preview": content[:500] + "..." if len(content) > 500 else content,
                    "frontmatter": frontmatter
                }
                
                self.extracted_data["metadata"]["source_files"].append(str(file_path))
                self.extracted_data["metadata"]["processed_files"] += 1
                
            except Exception as e:
                print(f"❌ Error processing {file_path}: {e}")
                continue
        
        # Enhance with symbols data
        self.extracted_data = self._enhance_with_symbols(self.extracted_data)
        
        print(f"✅ Processed {self.extracted_data['metadata']['processed_files']} files")
        return self.extracted_data
    
    def save_output(self):
        """Save extracted data to output files."""
        # Save main extracted data
        output_file = self.output_dir / "extracted_data.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.extracted_data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved extracted data to {output_file}")
        
        # Save separate files for different types
        self._save_endpoints()
        self._save_schemas()
        self._save_examples()
        
        # Generate changelog
        self._generate_changelog()
    
    def _save_endpoints(self):
        """Save extracted endpoints to a separate file."""
        endpoints_file = self.output_dir / "extracted_endpoints.json"
        with open(endpoints_file, 'w', encoding='utf-8') as f:
            json.dump(self.extracted_data["endpoints"], f, indent=2, ensure_ascii=False)
        print(f"📋 Saved endpoints to {endpoints_file}")
    
    def _save_schemas(self):
        """Save extracted schemas to separate files."""
        schemas_dir = self.output_dir / "schemas"
        schemas_dir.mkdir(exist_ok=True)
        
        for schema_name, schema_info in self.extracted_data["schemas"].items():
            schema_file = schemas_dir / f"{schema_name}.json"
            with open(schema_file, 'w', encoding='utf-8') as f:
                json.dump(schema_info, f, indent=2, ensure_ascii=False)
        
        print(f"📋 Saved {len(self.extracted_data['schemas'])} schemas to {schemas_dir}")
    
    def _save_examples(self):
        """Save extracted examples to separate files."""
        examples_dir = self.output_dir / "examples"
        examples_dir.mkdir(exist_ok=True)
        
        for example_name, example_info in self.extracted_data["examples"].items():
            example_file = examples_dir / f"{example_name}.{example_info['language']}"
            with open(example_file, 'w', encoding='utf-8') as f:
                f.write(example_info["code"])
            
            # Save metadata
            metadata_file = examples_dir / f"{example_name}.json"
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "language": example_info["language"],
                    "description": example_info["description"],
                    "source_file": example_info["source_file"]
                }, f, indent=2, ensure_ascii=False)
        
        print(f"📋 Saved {len(self.extracted_data['examples'])} examples to {examples_dir}")
    
    def _generate_changelog(self):
        """Generate changelog for the ingestion process."""
        changelog = {
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "summary": {
                "total_files": self.extracted_data["metadata"]["total_files"],
                "processed_files": self.extracted_data["metadata"]["processed_files"],
                "endpoints_extracted": len(self.extracted_data["endpoints"]),
                "schemas_extracted": len(self.extracted_data["schemas"]),
                "examples_extracted": len(self.extracted_data["examples"])
            },
            "source_files": self.extracted_data["metadata"]["source_files"],
            "changes": [
                {
                    "type": "ingestion",
                    "description": f"Ingested {self.extracted_data['metadata']['processed_files']} files from Docusaurus",
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        }
        
        changelog_file = self.output_dir / "CHANGELOG_SPEC.json"
        with open(changelog_file, 'w', encoding='utf-8') as f:
            json.dump(changelog, f, indent=2, ensure_ascii=False)
        
        print(f"📋 Generated changelog at {changelog_file}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Docusaurus Ingestion Pipeline")
    parser.add_argument("--root", required=True, help="Docusaurus root directory")
    parser.add_argument("--symbols", required=True, help="Symbols YAML file path")
    parser.add_argument("--out", required=True, help="Output directory")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    try:
        ingestor = DocusaurusIngestor(args.root, args.symbols, args.out)
        data = ingestor.process_files()
        ingestor.save_output()
        
        print("\n🎉 Docusaurus ingestion completed successfully!")
        print(f"📊 Summary: {data['metadata']['processed_files']} files processed")
        print(f"   - Endpoints: {len(data['endpoints'])}")
        print(f"   - Schemas: {len(data['schemas'])}")
        print(f"   - Examples: {len(data['examples'])}")
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()