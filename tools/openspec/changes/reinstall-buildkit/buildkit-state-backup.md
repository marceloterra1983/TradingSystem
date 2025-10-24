# BuildKit State Backup

**Timestamp**: 2025-10-16T04:51:50+0000 UTC
**Purpose**: Backup before BuildKit reinstallation

## Current BuildKit Configuration

### BuildX Version
```
github.com/docker/buildx v0.11.2 9872040b6626fb7d87ef7296fd5b832e8cc2ad17
```

### Builder Status
```
NAME/NODE     DRIVER/ENDPOINT STATUS  BUILDKIT PLATFORMS
default *     docker
  default     default         running v0.22.0  linux/amd64, linux/amd64/v2, linux/amd64/v3, linux/amd64/v4, linux/386
desktop-linux                 error

Cannot load builder desktop-linux: protocol not available
```

### Default Builder Details
- **Name**: default
- **Driver**: docker
- **Last Activity**: 2025-10-16 04:51:50 +0000 UTC
- **BuildKit Version**: v0.22.0
- **Platforms**: linux/amd64, linux/amd64/v2, linux/amd64/v3, linux/amd64/v4, linux/386
- **Host Gateway IP**: 172.18.0.1

### GC Policy Rules
- **Rule #0**: Source/local, exec/cachemount, git/checkout - Keep 48h
- **Rule #1**: General - Keep 1440h (60 days), max 94.06GiB
- **Rule #2**: General - Max 94.06GiB
- **Rule #3**: All - Max 94.06GiB

### Cache Storage
- **~/.buildkit/**: Not found (no directory exists)
- **Cache managed by Docker daemon**

### Issues Identified
1. **desktop-linux builder corruption**: "protocol not available" error
2. **No local BuildKit cache directory**: Cache managed entirely by Docker
3. **Plugin warnings**: Multiple Docker CLI plugins showing validation errors

### Docker Daemon BuildKit Status
- BuildKit appears to be integrated with Docker daemon
- BuildKit v0.22.0 running with default builder
- No separate BuildKit daemon configuration found

## Next Steps
1. Backup existing builder configurations
2. Remove corrupted desktop-linux builder
3. Clean reinstallation of BuildKit
4. Validate functionality after reinstallation