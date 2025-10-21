# LangGraph Development Guide

**Version:** 2.1.0
**Last Updated:** 2025-10-18
**Purpose:** Development vs Production workflow comparison

## Overview

The TradingSystem's LangGraph service supports a dual deployment model designed for both production workloads and local development. This hybrid approach enables seamless workflow debugging with LangSmith Studio while maintaining production-ready performance and reliability.

**Architecture Philosophy:**
- **Production Mode (Port 8111)** - Optimized for integration testing and production deployment
- **Development Mode (Port 8112)** - Isolated environment for debugging and Studio integration
- **Shared Infrastructure** - Common external services (Agno, DocsAPI, Firecrawl)
- **Isolated Data** - Separate databases and state management for safety

## Quick Comparison

| Feature | Production Mode (8111) | Development Mode (8112) |
|---------|------------------------|-------------------------|
| **Port** | 8111 | 8112 |
| **Purpose** | Production workloads, integration testing | Local debugging, Studio testing |
| **Command** | `docker compose -f infrastructure/compose/docker-compose.infra.yml up -d langgraph` | `bash scripts/langgraph/start-dev.sh` |
| **State Storage** | PostgreSQL (shared, port 5432) | PostgreSQL (isolated, port 5443) |
| **Redis** | Not used (stateless HTTP API) | Required (isolated, port 6380) |
| **LangSmith Tracing** | Optional (manual config) | Enabled by default |
| **Data Isolation** | Shared with other services | Completely isolated |
| **Hot Reload** | No | Yes (rebuild container) |
| **Use Case** | Integration testing, production deployment | Workflow debugging, Studio UI testing |
| **Performance** | Optimized for production | Debugging overhead acceptable |

## Production Mode (Port 8111)

### When to Use

- **Integration Testing** - Testing workflow integration with other services
- **Production Deployment** - Running workflows in production environment
- **CI/CD Pipelines** - Automated testing and deployment
- **Performance Validation** - Measuring production-ready performance

### Setup

1. **Environment Configuration** in root `.env`:
   ```bash
   # Production Settings
   LANGGRAPH_ENV=production
   DATABASE_URI=postgresql://postgres:password@postgres:5432/langgraph
   QUESTDB_URI=http://questdb:9000

   # Optional LangSmith (disable unless debugging)
   LANGSMITH_TRACING=false
   LANGSMITH_PROJECT=langgraph-production
   ```

2. **Start Production Service**:
   ```bash
   docker compose -f infrastructure/compose/docker-compose.infra.yml up -d langgraph
   ```

3. **Verify Health**:
   ```bash
   curl http://localhost:8111/health
   # Expected: {"status": "healthy", "environment": "production"}
   ```

### State Management

- **PostgreSQL Checkpoints**: Shared database (port 5432)
  - Database: `langgraph`
  - Shared with other services for data consistency
  - Managed by PostgreSQL container in main infrastructure

- **QuestDB Events**: Shared time-series database (port 9000)
  - Used for workflow event storage and analytics
  - Integration with monitoring and metrics systems

- **Redis**: Not used in production mode
  - Stateless HTTP API design
  - Improved reliability and simplicity

### Tracing Configuration

Production tracing is **optional** and should be enabled only when debugging:

```bash
# Enable temporarily for debugging
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_your_api_key_here
LANGSMITH_PROJECT=langgraph-production

# Restart service to apply changes
docker compose -f infrastructure/compose/docker-compose.infra.yml restart langgraph
```

**Recommendation**: Keep tracing disabled in production for optimal performance.

### Monitoring and Observability

- **Health Check**: `http://localhost:8111/health`
- **Prometheus Metrics**: `http://localhost:8111/metrics`
- **Service Logs**: `docker logs infra-langgraph -f`
- **Error Tracking**: Monitor container logs for errors and warnings

## Development Mode (Port 8112)

### When to Use

- **Workflow Debugging** - Step-by-step analysis of workflow execution
- **Studio UI Testing** - LangSmith Studio integration and trace analysis
- **Local Development** - Iterative development and testing
- **Trace Analysis** - Performance bottleneck identification

### Setup

1. **Environment Configuration** in root `.env`:
   ```bash
   # Development Settings (same file as production)
   LANGSMITH_TRACING=true
   LANGSMITH_API_KEY=lsv2_your_api_key_here
   LANGSMITH_PROJECT=langgraph-dev
   ```

2. **Start Development Stack**:
   ```bash
   bash scripts/langgraph/start-dev.sh
   ```

3. **Verify Development Service**:
   ```bash
   curl http://localhost:8112/health
   # Expected: {"status": "healthy", "environment": "development"}
   ```

### State Management

- **PostgreSQL Checkpoints**: Isolated database (port 5443)
  - Database: `langgraph_dev`
  - Completely separate from production data
  - Safe to reset and delete during development

- **Redis Pub/Sub**: Isolated Redis (port 6380)
  - Required for development mode coordination
  - Used for state management and pub/sub operations
  - Isolated from production Redis instances

- **Data Safety**: Development data is completely isolated
  - No risk of affecting production data
  - Easy to reset: `docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml down -v`

### Tracing Configuration

Development tracing is **enabled by default**:

```bash
# Automatically configured in development mode
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=langgraph-dev
```

**Studio Integration**:
- Navigate to: https://smith.langchain.com/studio
- Select project: `langgraph-dev`
- Real-time trace visualization and debugging

### Development Workflow

1. **Make Code Changes** in `infrastructure/langgraph/src/`
2. **Rebuild Container**:
   ```bash
   docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml up -d --build
   ```
3. **Test Workflows** via API calls
4. **Analyze Traces** in LangSmith Studio
5. **Iterate** based on insights

## Architecture Diagrams

### Hybrid Architecture

```plantuml
@startuml
title LangGraph Hybrid Architecture - Production + Development

package "Production Environment (Port 8111)" {
  component "LangGraph Service\n(FastAPI)" as ProdLG

  package "Shared Infrastructure" {
    database "PostgreSQL\n(Port 5432)" as ProdPG
    database "QuestDB\n(Port 9000)" as ProdQDB
  }

  ProdLG --> ProdPG : Checkpoints
  ProdLG --> ProdQDB : Events
}

package "Development Environment (Port 8112)" {
  component "LangGraph Dev\n(FastAPI + Tracing)" as DevLG

  package "Isolated Infrastructure" {
    database "PostgreSQL Dev\n(Port 5443)" as DevPG
    database "Redis Dev\n(Port 6380)" as DevRedis
  }

  DevLG --> DevPG : Checkpoints
  DevLG --> DevRedis : Pub/Sub
}

package "External Services" {
  component "Agno Agents\n(Port 8200)" as Agno
  component "DocsAPI\n(Port 3400)" as Docs
  component "Firecrawl\n(Port 3600)" as Fire
}

package "Observability" {
  cloud "LangSmith API\n(api.smith.langchain.com)" as LangSmithAPI
  cloud "LangSmith Studio\n(smith.langchain.com)" as Studio
}

ProdLG --> Agno : HTTP
ProdLG --> Docs : HTTP
ProdLG --> Fire : HTTP

DevLG --> Agno : HTTP
DevLG --> Docs : HTTP
DevLG --> Fire : HTTP

DevLG ..> LangSmithAPI : Traces\n(async)
ProdLG ..> LangSmithAPI : Traces\n(optional)

LangSmithAPI --> Studio : Display

actor Developer
Developer --> DevLG : Debug workflows
Developer --> Studio : View traces

actor "CI/CD" as CI
CI --> ProdLG : Integration tests

note right of DevLG
  Development Mode:
  - Isolated data
  - LangSmith enabled
  - Hot reload support
  - Studio integration
end note

note right of ProdLG
  Production Mode:
  - Shared databases
  - Tracing optional
  - Optimized for performance
  - Integration testing
end note

note bottom of LangSmithAPI
  Async trace sending
  Non-blocking workflow execution
  ~10-50ms overhead
end note

@enduml
```

### Development Workflow

```plantuml
@startuml
title LangGraph Development Workflow - Iterative Debugging Cycle

start

:Developer makes code changes\nin infrastructure/langgraph/src/;

:Rebuild dev container;
note right
  docker compose -f docker-compose.langgraph-dev.yml \
    up -d --build
end note

:Execute workflow via API;
note right
  curl -X POST http://localhost:8112/workflows/trading/execute \
    -H "Content-Type: application/json" \
    -d '{"symbol":"WINZ25","mode":"paper"}'
end note

if (Workflow successful?) then (yes)
  :View trace in LangSmith Studio;

  if (Performance acceptable?) then (yes)
    :Test in production mode (8111);

    if (Production test passed?) then (yes)
      :Deploy to production;
      stop
    else (no)
      :Analyze production logs;
    endif
  else (no)
    :Identify bottleneck in Studio;
    note right
      - Check node durations
      - Inspect inputs/outputs
      - Analyze timing histogram
    end note
  endif
else (no)
  :View error trace in Studio;
  note right
    - Check error message
    - Inspect failed node
    - Review input data
  end note

  :Check container logs;
  note right
    docker logs langgraph-dev -f
  end note
endif

:Identify issue and plan fix;

backward :Return to code changes;

@enduml
```

## Common Workflows

### Testing New Workflow

1. **Develop in Development Mode**:
   ```bash
   # Start development environment
   bash scripts/langgraph/start-dev.sh

   # Test new workflow
   curl -X POST http://localhost:8112/workflows/new-feature/execute \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'

   # Analyze traces in Studio
   # Navigate to: https://smith.langchain.com/studio?project=langgraph-dev
   ```

2. **Verify in Production Mode**:
   ```bash
   # Switch to production testing
   docker compose -f infrastructure/compose/docker-compose.infra.yml up -d langgraph

   # Test production compatibility
   curl -X POST http://localhost:8111/workflows/new-feature/execute \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

### Debugging Production Issues

1. **Enable Production Tracing** (temporary):
   ```bash
   # Add to .env
   LANGSMITH_TRACING=true
   LANGSMITH_API_KEY=lsv2_your_api_key_here

   # Restart production service
   docker compose -f infrastructure/compose/docker-compose.infra.yml restart langgraph
   ```

2. **Reproduce Issue**:
   ```bash
   # Execute workflow that reproduces the issue
   curl -X POST http://localhost:8111/workflows/problematic/execute \
     -H "Content-Type: application/json" \
     -d '{"problematic": "data"}'
   ```

3. **Analyze in Studio**:
   - Select project: `langgraph-production`
   - Filter by time range around issue occurrence
   - Analyze error traces and performance metrics

4. **Disable Tracing** after debugging:
   ```bash
   # Remove from .env
   LANGSMITH_TRACING=false

   # Restart service
   docker compose -f infrastructure/compose/docker-compose.infra.yml restart langgraph
   ```

### Performance Optimization

1. **Baseline Measurement**:
   ```bash
   # Measure in development mode
   time curl -X POST http://localhost:8112/workflows/trading/execute \
     -H "Content-Type: application/json" \
     -d '{"symbol":"WINZ25","mode":"paper"}'
   ```

2. **Identify Bottlenecks** in Studio:
   - Check node duration histograms
   - Identify slow operations
   - Analyze input/output sizes

3. **Optimize and Re-test**:
   ```bash
   # After optimization
   docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml up -d --build

   # Verify improvements
   time curl -X POST http://localhost:8112/workflows/trading/execute \
     -H "Content-Type: application/json" \
     -d '{"symbol":"WINZ25","mode":"paper"}'
   ```

## Environment Variables Reference

### Core Configuration

| Variable | Production (8111) | Development (8112) | Description |
|----------|-------------------|--------------------|-------------|
| `LANGGRAPH_PORT` | 8111 | 8112 | External service port |
| `LANGGRAPH_ENV` | `production` | `development` | Environment identifier |
| `DATABASE_URI` | Shared PostgreSQL | Isolated PostgreSQL | Database connection string |
| `REDIS_URI` | Not set | `redis://langgraph-redis-dev:6379` | Redis connection for dev mode |

### LangSmith Configuration

| Variable | Production (8111) | Development (8112) | Description |
|----------|-------------------|--------------------|-------------|
| `LANGSMITH_TRACING` | `false` (optional) | `true` (default) | Enable trace collection |
| `LANGSMITH_API_KEY` | Required if tracing enabled | Required | LangSmith API authentication |
| `LANGSMITH_PROJECT` | `langgraph-production` | `langgraph-dev` | Project name in Studio |

### External Service URLs

| Variable | Value | Description |
|----------|-------|-------------|
| `AGNO_BASE_URL` | `http://agno-agents:8200` | Agno Agents service |
| `DOCS_API_URL` | `http://docs-api:3400` | Documentation API service |
| `FIRECRAWL_API_URL` | `http://firecrawl-proxy:3600` | Firecrawl proxy service |

## Troubleshooting

### Port Conflicts

**Issue**: Services fail to start due to port conflicts

**Solutions**:
- Development mode uses different ports (8112, 6380, 5443) to avoid conflicts
- Check port availability: `netstat -tulpn | grep :8112`
- Stop conflicting services and retry

### Data Isolation Issues

**Issue**: Development data affecting production

**Solutions**:
- Verify development database isolation: `docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml ps`
- Check database connection strings in container logs
- Reset development environment: `docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml down -v`

### Mode Switching

**Issue**: Difficulties switching between modes

**Solutions**:
- Can run both modes simultaneously (different ports)
- Stop one mode before starting the other if resource constraints
- Use health checks to verify mode: `curl http://localhost:8111/health` or `curl http://localhost:8112/health`

### Studio Connection Problems

**Issue**: LangSmith Studio not showing traces

**Solutions**:
1. **Verify API Key**: Check `LANGSMITH_API_KEY` in `.env`
2. **Check Network**: Ensure service can reach `api.smith.langchain.com`
3. **Verify Project Name**: Confirm `LANGSMITH_PROJECT` matches Studio project
4. **Check Tracing Flag**: Ensure `LANGSMITH_TRACING=true`
5. **Review Logs**: `docker logs langgraph-dev -f | grep langsmith`

### Database Connection Issues

**Issue**: Database connection failures

**Solutions**:
1. **Check Container Health**: `docker compose ps`
2. **Verify Database URI**: Check environment variables
3. **Test Database Connection**:
   ```bash
   # Development database
   docker exec langgraph-postgres-dev psql -U postgres -d langgraph_dev -c "SELECT 1;"

   # Production database
   docker exec postgres psql -U postgres -d langgraph -c "SELECT 1;"
   ```
4. **Check Network**: Verify containers can communicate
5. **Review Logs**: Database container logs for connection errors

## Best Practices

### Development Workflow

1. **Always develop in development mode (8112) first**
2. **Use Studio tracing for debugging** (don't rely on logs alone)
3. **Keep production tracing disabled** unless debugging specific issues
4. **Regularly clean development data** to avoid conflicts:
   ```bash
   docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml down -v
   ```
5. **Test in production mode (8111)** before deploying to ensure compatibility

### Project Organization

1. **Use separate LangSmith projects** for dev and production
2. **Maintain consistent naming conventions** across environments
3. **Document environment-specific configurations** for team reference
4. **Use environment variables** for all configuration differences

### Performance Management

1. **Monitor tracing overhead** in development (~10-50ms per trace)
2. **Disable production tracing** after debugging to optimize performance
3. **Use Studio metrics** to identify optimization opportunities
4. **Profile workflows** regularly to catch performance regressions

### Data Safety

1. **Never use production data** for development testing
2. **Reset development environment** regularly to ensure clean state
3. **Back up production data** before making configuration changes
4. **Use separate database credentials** for different environments

## Migration Guide

### From Local Python to Docker Development

1. **Copy Environment Configuration**:
   ```bash
   # Ensure .env contains LangSmith API key
   LANGSMITH_API_KEY=lsv2_your_api_key_here
   LANGSMITH_PROJECT=langgraph-dev
   ```

2. **Start Development Stack**:
   ```bash
   bash scripts/langgraph/start-dev.sh
   ```

3. **Verify Migration**:
   ```bash
   curl http://localhost:8112/health
   # Expected: {"status": "healthy", "environment": "development"}
   ```

4. **Test Workflows**:
   ```bash
   curl -X POST http://localhost:8112/workflows/trading/execute \
     -H "Content-Type: application/json" \
     -d '{"symbol":"WINZ25","mode":"paper"}'
   ```

### From Development to Production

1. **Update Environment Configuration**:
   ```bash
   # In .env
   LANGGRAPH_ENV=production
   LANGSMITH_TRACING=false  # Optional, disable for performance
   ```

2. **Stop Development Services**:
   ```bash
   docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml down
   ```

3. **Start Production Services**:
   ```bash
   docker compose -f infrastructure/compose/docker-compose.infra.yml up -d langgraph
   ```

4. **Verify Production Deployment**:
   ```bash
   curl http://localhost:8111/health
   # Expected: {"status": "healthy", "environment": "production"}
   ```

### Rollback Procedures

1. **Keep Development Environment Running** during production deployment
2. **Monitor Production Health** after deployment
3. **Rollback if Issues Detected**:
   ```bash
   # Stop production
   docker compose -f infrastructure/compose/docker-compose.infra.yml stop langgraph

   # Continue using development mode
   # Investigate issues using development environment
   ```

## Related Documentation

- **[LangGraph Service README](./README.md)** - Complete service documentation and setup
- **[LangSmith Studio Guide](../../docs/context/backend/guides/langgraph-studio-guide.md)** - Studio integration and debugging
- **[LangGraph Implementation Guide](../../docs/context/backend/guides/langgraph-implementation-guide.md)** - Architecture and implementation details
- **[Docker Compose Files](../../infrastructure/compose/)** - Infrastructure configuration
- **[Environment Configuration](../../docs/context/ops/ENVIRONMENT-CONFIGURATION.md)** - Environment variable management

## Quick Reference

### Development Commands

```bash
# Start development environment
bash scripts/langgraph/start-dev.sh

# Rebuild after changes
docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml up -d --build

# View development logs
docker logs langgraph-dev -f

# Clean development environment
docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml down -v

# Execute test workflow
curl -X POST http://localhost:8112/workflows/trading/execute \
  -H "Content-Type: application/json" \
  -d '{"symbol":"WINZ25","mode":"paper"}'
```

### Production Commands

```bash
# Start production environment
docker compose -f infrastructure/compose/docker-compose.infra.yml up -d langgraph

# View production logs
docker logs infra-langgraph -f

# Enable temporary tracing
# Add to .env: LANGSMITH_TRACING=true
docker compose -f infrastructure/compose/docker-compose.infra.yml restart langgraph

# Execute production workflow
curl -X POST http://localhost:8111/workflows/trading/execute \
  -H "Content-Type: application/json" \
  -d '{"symbol":"WINZ25","mode":"paper"}'
```

### Health Checks

```bash
# Development health
curl http://localhost:8112/health

# Production health
curl http://localhost:8111/health

# Check services status
docker compose -f infrastructure/compose/docker-compose.infra.yml ps
docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml ps
```

### Studio Access

- **Development Project**: https://smith.langchain.com/studio?project=langgraph-dev
- **Production Project**: https://smith.langchain.com/studio?project=langgraph-production
- **API Settings**: https://smith.langchain.com/settings