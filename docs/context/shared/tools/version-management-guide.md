---
title: Documentation Version Management Guide
sidebar_position: 30
tags: [documentation, versioning, guide, shared]
domain: shared
type: guide
summary: Guide for tracking and managing changes to API specifications and documentation versions
status: active
last_review: 2025-10-17
---

# Documentation Version Management Guide

## Overview

The TradingSystem documentation version management system provides a robust way to track and manage changes to our API specifications and documentation. This guide explains how to use the versioning system effectively.

## Key Concepts

### Version Types

- **Major Version (X.0.0)**: Incompatible API changes
- **Minor Version (0.X.0)**: Backwards-compatible feature additions
- **Patch Version (0.0.X)**: Backwards-compatible bug fixes

### Special References

- **latest**: Always points to the most recent version
- **stable**: Points to the most recent minor or patch version

## Using Version Management

### 1. Viewing Documentation Versions

Use the version selector in the documentation UI to:
- Switch between versions
- Compare version changes
- View version history

```typescript
// Example: Version selection
const VersionSelector = () => {
  const [version, setVersion] = useState('stable');

  return (
    <Select
      value={version}
      onValueChange={setVersion}
      options={[
        { value: 'latest', label: 'Latest (2.1.0)' },
        { value: 'stable', label: 'Stable (2.0.1)' },
        { value: '2.0.0', label: '2.0.0' },
        { value: '1.1.0', label: '1.1.0' }
      ]}
    />
  );
};
```

### 2. Creating New Versions

New versions can be created through:
- API endpoint (`POST /api/v1/versions`)
- Documentation UI
- CI/CD pipeline

#### When to Create Versions

- **Major (X.0.0)**:
  - Breaking API changes
  - Incompatible schema changes
  - Major feature overhaul

- **Minor (0.X.0)**:
  - New endpoints
  - New optional fields
  - Feature additions

- **Patch (0.0.X)**:
  - Documentation fixes
  - Example updates
  - Schema clarifications

```bash
# Create new version via API
curl -X POST http://localhost:3400/api/v1/versions \
  -H "Content-Type: application/json" \
  -d '{"type": "minor"}'
```

### 3. Comparing Versions

The version comparison tool helps track changes between versions:

```typescript
// Example: Version comparison
const VersionComparison = () => {
  const [v1, v2] = useState(['2.0.0', '2.1.0']);
  const changes = useVersionComparison(v1, v2);

  return (
    <div>
      <h3>Changes from {v1} to {v2}</h3>
      <ChangeList
        added={changes.paths.added}
        modified={changes.paths.modified}
        removed={changes.paths.removed}
      />
    </div>
  );
};
```

### 4. Version-Aware Features

The documentation system provides version-aware:
- Search functionality
- API examples
- Schema validation
- OpenAPI/AsyncAPI specs

```typescript
// Example: Version-aware search
const search = async (query: string, version = 'stable') => {
  const response = await fetch(
    `/api/v1/search?q=${query}&version=${version}`
  );
  return response.json();
};
```

## Best Practices

1. **Version Naming**
   - Use semantic versioning (MAJOR.MINOR.PATCH)
   - Include version in API examples
   - Reference specific versions in documentation

2. **Change Management**
   - Document breaking changes clearly
   - Provide migration guides between versions
   - Keep changelog updated

3. **Version Lifecycle**
   - Mark deprecated versions
   - Set end-of-life dates
   - Maintain at least one previous major version

## Integration Examples

### Fetching Versioned Specs

```typescript
// Fetch specific version
const getSpec = async (version = 'stable') => {
  const response = await fetch(
    `/api/v1/versions/${version}/spec/openapi`
  );
  return response.text();
};

// Compare versions
const compareVersions = async (v1: string, v2: string) => {
  const response = await fetch(
    `/api/v1/versions/compare/${v1}/${v2}`
  );
  return response.json();
};
```

### Version Selection Component

```typescript
import { useState, useEffect } from 'react';

export function VersionSelector({
  onVersionChange,
  currentVersion
}: VersionSelectorProps) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVersions() {
      const response = await fetch('/api/v1/versions');
      const data = await response.json();
      setVersions(data.all);
      setLoading(false);
    }
    loadVersions();
  }, []);

  if (loading) return <div>Loading versions...</div>;

  return (
    <div className="version-selector">
      <Select
        value={currentVersion}
        onValueChange={onVersionChange}
      >
        <Option value="latest">Latest Version</Option>
        <Option value="stable">Stable Version</Option>
        {versions.map(v => (
          <Option key={v} value={v}>Version {v}</Option>
        ))}
      </Select>
    </div>
  );
}
```

### Version Comparison View

```typescript
import { useState, useEffect } from 'react';

export function VersionComparisonView({
  v1,
  v2
}: VersionComparisonProps) {
  const [changes, setChanges] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadComparison() {
      const response = await fetch(
        `/api/v1/versions/compare/${v1}/${v2}`
      );
      const data = await response.json();
      setChanges(data.changes);
      setLoading(false);
    }
    loadComparison();
  }, [v1, v2]);

  if (loading) return <div>Loading comparison...</div>;

  return (
    <div className="version-comparison">
      <h3>Changes from {v1} to {v2}</h3>

      <section>
        <h4>Added Endpoints</h4>
        <ul>
          {changes.paths.added.map(path => (
            <li key={path}>{path}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4>Modified Endpoints</h4>
        <ul>
          {changes.paths.modified.map(path => (
            <li key={path}>{path}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4>Removed Endpoints</h4>
        <ul>
          {changes.paths.removed.map(path => (
            <li key={path}>{path}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Documentation Version Management

on:
  push:
    paths:
      - 'docs/spec/**'
      - 'openapi.yaml'
      - 'asyncapi.yaml'

jobs:
  version-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Check for version changes
        id: version
        run: |
          changes=$(git diff --name-only ${{ github.event.before }} ${{ github.sha }})
          if echo "$changes" | grep -q "openapi.yaml\|asyncapi.yaml"; then
            echo "::set-output name=update_needed::true"
          fi

      - name: Create new version
        if: steps.version.outputs.update_needed == 'true'
        run: |
          curl -X POST http://api.tradingsystem.local/api/v1/versions \
            -H "Content-Type: application/json" \
            -d '{"type":"minor"}'
```

## Troubleshooting

### Common Issues

1. **Version Conflicts**
   - Ensure no parallel version creation
   - Use proper semver increments
   - Check version history before creating

2. **Missing Changes**
   - Verify all files are included
   - Check file permissions
   - Validate spec syntax

3. **UI Issues**
   - Clear browser cache
   - Check version compatibility
   - Verify API connectivity

## Support

For additional help:
- Check API documentation at `/docs`
- Use health check endpoint `/health`
- Contact support team