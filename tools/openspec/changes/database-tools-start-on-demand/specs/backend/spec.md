# Backend Specification: Container Management API

## ADDED Requirements

### Requirement: Container Start Endpoint

The Service Launcher API SHALL provide an HTTP endpoint to start database tool containers via Docker Compose, with validation, error handling, and health check integration.

#### Scenario: Start valid container successfully

- **GIVEN** the Service Launcher API is running on port 3500
- **AND** a database tool container (pgadmin) is currently stopped
- **WHEN** a client sends `POST /api/containers/pgadmin/start`
- **THEN** the API validates "pgadmin" is in the whitelist
- **AND** the API executes `docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb-pgadmin`
- **AND** the command completes successfully (exit code 0)
- **AND** the API waits for container health check to pass (max 60 seconds)
- **AND** the API returns HTTP 200 with response:
  ```json
  {
    "success": true,
    "containerName": "pgadmin",
    "message": "Container started successfully",
    "healthy": true,
    "healthCheckUrl": "http://localhost:5050"
  }
  ```

#### Scenario: Reject invalid container name

- **GIVEN** a client sends `POST /api/containers/invalid-name/start`
- **WHEN** the API receives the request
- **THEN** the API checks if "invalid-name" exists in ALLOWED_CONTAINERS whitelist
- **AND** the check fails (not in whitelist)
- **AND** the API returns HTTP 400 with response:
  ```json
  {
    "success": false,
    "error": "Invalid container name",
    "details": {
      "allowedContainers": ["pgadmin", "pgweb", "adminer", "questdb"]
    }
  }
  ```
- **AND** no Docker command is executed (security: prevent arbitrary container starts)

#### Scenario: Handle Docker Compose failure

- **GIVEN** a client sends `POST /api/containers/pgadmin/start`
- **AND** Docker daemon is not running
- **WHEN** the API executes the docker compose command
- **THEN** the command fails with stderr: "Cannot connect to the Docker daemon"
- **AND** the API categorizes the error as "docker-down"
- **AND** the API returns HTTP 500 with response:
  ```json
  {
    "success": false,
    "error": "Docker daemon is not running",
    "category": "docker-down",
    "fallbackCommand": "sudo systemctl start docker",
    "details": {
      "stderr": "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?"
    }
  }
  ```

#### Scenario: Handle port conflict error

- **GIVEN** another container is already using port 5050
- **WHEN** a client sends `POST /api/containers/pgadmin/start`
- **AND** Docker Compose attempts to start pgAdmin
- **THEN** the command fails with stderr containing "port is already allocated"
- **AND** the API categorizes the error as "port-conflict"
- **AND** the API returns HTTP 409 with response:
  ```json
  {
    "success": false,
    "error": "Port 5050 is already in use",
    "category": "port-conflict",
    "fallbackCommand": "docker ps | grep 5050",
    "details": {
      "port": 5050,
      "stderr": "bind: address already in use"
    }
  }
  ```

#### Scenario: Start container that is already running (idempotent)

- **GIVEN** pgAdmin container is already running
- **WHEN** a client sends `POST /api/containers/pgadmin/start`
- **THEN** the API executes `docker compose up -d timescaledb-pgadmin`
- **AND** Docker Compose detects container is already running (no-op)
- **AND** the command completes successfully (exit code 0)
- **AND** the API returns HTTP 200 with `{ success: true }` (idempotent operation)

---

### Requirement: Container Whitelist Validation

The Service Launcher API SHALL enforce a strict whitelist of allowed containers to prevent security vulnerabilities from arbitrary container starts.

#### Scenario: Define whitelist constant

- **WHEN** the Service Launcher API initializes
- **THEN** the following whitelist is defined in containerService.js:
  ```javascript
  const ALLOWED_CONTAINERS = {
    'pgadmin': {
      composePath: 'tools/compose/docker-compose.database.yml',
      service: 'timescaledb-pgadmin',
      port: 5050,
      healthCheck: 'http://localhost:5050'
    },
    'pgweb': {
      composePath: 'tools/compose/docker-compose.database.yml',
      service: 'timescaledb-pgweb',
      port: 8081,
      healthCheck: 'http://localhost:8081'
    },
    'adminer': {
      composePath: 'tools/compose/docker-compose.database.yml',
      service: 'timescaledb-adminer',
      port: 8080,
      healthCheck: 'http://localhost:8080'
    },
    'questdb': {
      composePath: 'tools/compose/docker-compose.database.yml',
      service: 'questdb',
      port: 9000,
      healthCheck: 'http://localhost:9000'
    }
  };
  ```

#### Scenario: Validate container name on every request

- **GIVEN** a client sends `POST /api/containers/:containerName/start`
- **WHEN** the route handler receives the request
- **THEN** the handler extracts `:containerName` from URL params
- **AND** the handler checks if ALLOWED_CONTAINERS has key `:containerName`
- **IF** whitelist check passes, proceed with container start
- **IF** whitelist check fails, return 400 Bad Request immediately (no further processing)

#### Scenario: Security audit logging

- **GIVEN** any request to `POST /api/containers/:containerName/start`
- **WHEN** the request is received
- **THEN** the following data is logged:
  - Timestamp (ISO 8601)
  - Container name (requested)
  - Result (success | validation_failed | start_failed)
  - Client IP address (req.ip)
  - User agent (req.headers['user-agent'])
- **AND** logs are written to `apps/service-launcher/logs/containers.log`

---

### Requirement: Health Check Polling

The Service Launcher API SHALL poll container health status after starting a container to verify readiness before returning success to the client.

#### Scenario: Poll health check until healthy

- **GIVEN** a container has been started via `docker compose up -d`
- **AND** the container defines a health check endpoint at http://localhost:5050
- **WHEN** the API executes health check polling
- **THEN** the API sends HTTP GET to http://localhost:5050 every 2 seconds
- **AND** continues polling until response status is 200 OK
- **AND** returns `{ healthy: true }` when 200 OK is received
- **AND** stops polling after max 60 seconds even if health check not passing

#### Scenario: Health check timeout (partial success)

- **GIVEN** a container has been started
- **AND** 60 seconds have elapsed
- **AND** health check still returns non-200 status (e.g., 503 Service Unavailable)
- **WHEN** the timeout is reached
- **THEN** the API stops polling
- **AND** the API returns HTTP 200 with response:
  ```json
  {
    "success": true,
    "containerName": "pgadmin",
    "message": "Container started but health check timeout",
    "healthy": false,
    "timeout": true,
    "note": "Container may still be initializing. Refresh page to retry."
  }
  ```

#### Scenario: Health check not reachable

- **GIVEN** a container has been started
- **AND** the health check URL is http://localhost:5050
- **WHEN** the API sends HTTP GET to the URL
- **AND** the request fails with network error (connection refused)
- **THEN** the API treats this as "not healthy yet" (container still starting)
- **AND** the API continues polling (does NOT fail immediately)
- **AND** the API retries every 2 seconds until timeout

---

### Requirement: Docker Compose Integration

The Service Launcher API SHALL execute Docker Compose commands via Node.js child_process module with proper error handling and output capture.

#### Scenario: Execute docker compose command

- **GIVEN** a valid container configuration:
  ```javascript
  const config = ALLOWED_CONTAINERS['pgadmin'];
  // composePath: 'tools/compose/docker-compose.database.yml'
  // service: 'timescaledb-pgadmin'
  ```
- **WHEN** the API executes the start command
- **THEN** the API uses child_process.spawn() to execute:
  ```bash
  docker compose -f tools/compose/docker-compose.database.yml up -d timescaledb-pgadmin
  ```
- **AND** the API sets working directory to project root (`process.cwd()`)
- **AND** the API captures stdout and stderr streams
- **AND** the API waits for process exit event
- **AND** the API checks exit code (0 = success, non-zero = failure)

#### Scenario: Capture command output for debugging

- **GIVEN** the docker compose command is executed
- **WHEN** the command produces stdout or stderr
- **THEN** the API captures all output in buffers:
  ```javascript
  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (data) => { stdout += data; });
  child.stderr.on('data', (data) => { stderr += data; });
  ```
- **AND** on command exit, the API logs the output:
  ```javascript
  console.log('[ContainerService] docker compose stdout:', stdout);
  console.error('[ContainerService] docker compose stderr:', stderr);
  ```
- **AND** if exit code is non-zero, stderr is included in error response

#### Scenario: Timeout long-running commands

- **GIVEN** a docker compose command is executed
- **WHEN** the command runs for more than 120 seconds (timeout threshold)
- **THEN** the API kills the child process (child.kill('SIGTERM'))
- **AND** the API returns HTTP 500 with error:
  ```json
  {
    "success": false,
    "error": "Docker Compose command timeout (120 seconds)",
    "category": "timeout"
  }
  ```

---

### Requirement: Error Categorization

The Service Launcher API SHALL categorize Docker Compose errors into actionable categories to provide helpful feedback to users.

#### Scenario: Categorize "Docker daemon not running"

- **GIVEN** docker compose command fails
- **AND** stderr contains "Cannot connect to the Docker daemon"
- **WHEN** the API categorizes the error
- **THEN** the category is "docker-down"
- **AND** the error message is "Docker daemon is not running"
- **AND** the fallback command is "sudo systemctl start docker"

#### Scenario: Categorize "Port already allocated"

- **GIVEN** stderr contains "port is already allocated"
- **WHEN** the API categorizes the error
- **THEN** the category is "port-conflict"
- **AND** the API extracts port number from stderr (regex: `:(\d+)`)
- **AND** the error message is "Port {port} is already in use"
- **AND** the fallback command is "docker ps | grep {port}"

#### Scenario: Categorize "Permission denied"

- **GIVEN** stderr contains "permission denied" or "Got permission denied while trying to connect"
- **WHEN** the API categorizes the error
- **THEN** the category is "permission"
- **AND** the error message is "Permission denied. Add your user to docker group."
- **AND** the fallback command is "sudo usermod -aG docker $USER && newgrp docker"

#### Scenario: Unknown error (fallback)

- **GIVEN** stderr does not match any known error pattern
- **WHEN** the API categorizes the error
- **THEN** the category is "unknown"
- **AND** the error message is first 200 characters of stderr
- **AND** the fallback command includes the full docker compose command user can copy

---

### Requirement: CORS and Request Validation

The Service Launcher API SHALL configure CORS to allow requests from the dashboard frontend and validate all incoming requests.

#### Scenario: Accept requests from dashboard origin

- **GIVEN** the dashboard is running on http://localhost:3103
- **WHEN** the dashboard sends `POST /api/containers/pgadmin/start`
- **THEN** the API checks the Origin header
- **AND** the Origin is http://localhost:3103 (allowed)
- **AND** the API responds with CORS headers:
  ```http
  Access-Control-Allow-Origin: http://localhost:3103
  Access-Control-Allow-Methods: GET, POST
  Access-Control-Allow-Headers: Content-Type
  ```
- **AND** the request is processed normally

#### Scenario: Reject requests from unknown origins

- **GIVEN** a request is sent from origin http://malicious-site.com
- **WHEN** the API receives the request
- **THEN** the API checks the Origin header
- **AND** the Origin is NOT in the allowed list
- **AND** the browser blocks the response (CORS policy enforcement)

#### Scenario: Validate HTTP method

- **GIVEN** a client sends `GET /api/containers/pgadmin/start` (wrong method)
- **WHEN** the API receives the request
- **THEN** the API responds with HTTP 405 Method Not Allowed
- **AND** the response includes header: `Allow: POST`

---

## Implementation Notes

### Express Route Handler

**File:** `apps/service-launcher/src/routes/containers.js`

```javascript
const express = require('express');
const containerService = require('../services/containerService');

const router = express.Router();

router.post('/:containerName/start', async (req, res) => {
  const { containerName } = req.params;

  // Validation
  if (!containerService.isAllowedContainer(containerName)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid container name',
      details: {
        allowedContainers: containerService.getAllowedContainers()
      }
    });
  }

  // Audit log
  console.log(`[ContainerAPI] Start request: ${containerName} from ${req.ip}`);

  // Execute start
  try {
    const result = await containerService.startContainer(containerName);
    res.status(200).json(result);
  } catch (error) {
    console.error(`[ContainerAPI] Start failed: ${containerName}`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      category: error.category || 'unknown',
      fallbackCommand: error.fallbackCommand,
      details: { stderr: error.stderr }
    });
  }
});

module.exports = router;
```

### Container Service

**File:** `apps/service-launcher/src/services/containerService.js`

```javascript
const { spawn } = require('child_process');
const path = require('path');

const ALLOWED_CONTAINERS = {
  'pgadmin': {
    composePath: 'tools/compose/docker-compose.database.yml',
    service: 'timescaledb-pgadmin',
    port: 5050,
    healthCheck: 'http://localhost:5050'
  },
  'pgweb': {
    composePath: 'tools/compose/docker-compose.database.yml',
    service: 'timescaledb-pgweb',
    port: 8081,
    healthCheck: 'http://localhost:8081'
  },
  'adminer': {
    composePath: 'tools/compose/docker-compose.database.yml',
    service: 'timescaledb-adminer',
    port: 8080,
    healthCheck: 'http://localhost:8080'
  },
  'questdb': {
    composePath: 'tools/compose/docker-compose.database.yml',
    service: 'questdb',
    port: 9000,
    healthCheck: 'http://localhost:9000'
  }
};

function isAllowedContainer(containerName) {
  return ALLOWED_CONTAINERS.hasOwnProperty(containerName);
}

function getAllowedContainers() {
  return Object.keys(ALLOWED_CONTAINERS);
}

async function startContainer(containerName) {
  const config = ALLOWED_CONTAINERS[containerName];
  const projectRoot = process.cwd();
  const composePath = path.join(projectRoot, config.composePath);

  // Execute docker compose command
  const result = await executeDockerCompose(composePath, config.service);
  if (!result.success) {
    throw createCategorizedError(result.stderr);
  }

  // Wait for health check
  const healthResult = await waitForHealthy(config.healthCheck, 60000);

  return {
    success: true,
    containerName,
    message: healthResult.healthy
      ? 'Container started successfully'
      : 'Container started but health check timeout',
    healthy: healthResult.healthy,
    timeout: !healthResult.healthy,
    healthCheckUrl: config.healthCheck
  };
}

function executeDockerCompose(composePath, service) {
  return new Promise((resolve) => {
    const child = spawn('docker', [
      'compose',
      '-f', composePath,
      'up', '-d',
      service
    ]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });

    child.on('close', (code) => {
      console.log(`[ContainerService] docker compose exit code: ${code}`);
      resolve({
        success: code === 0,
        stdout,
        stderr
      });
    });
  });
}

async function waitForHealthy(healthCheckUrl, timeout = 60000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(healthCheckUrl);
      if (response.ok) return { healthy: true };
    } catch (err) {
      // Container not ready yet, continue polling
    }

    await sleep(2000); // 2 second intervals
  }

  return { healthy: false };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createCategorizedError(stderr) {
  if (stderr.includes('Cannot connect to the Docker daemon')) {
    const error = new Error('Docker daemon is not running');
    error.category = 'docker-down';
    error.fallbackCommand = 'sudo systemctl start docker';
    error.stderr = stderr;
    return error;
  }

  if (stderr.includes('port is already allocated')) {
    const portMatch = stderr.match(/:(\d+)/);
    const port = portMatch ? portMatch[1] : 'unknown';
    const error = new Error(`Port ${port} is already in use`);
    error.category = 'port-conflict';
    error.fallbackCommand = `docker ps | grep ${port}`;
    error.stderr = stderr;
    return error;
  }

  if (stderr.includes('permission denied')) {
    const error = new Error('Permission denied. Add your user to docker group.');
    error.category = 'permission';
    error.fallbackCommand = 'sudo usermod -aG docker $USER && newgrp docker';
    error.stderr = stderr;
    return error;
  }

  // Unknown error
  const error = new Error(stderr.substring(0, 200));
  error.category = 'unknown';
  error.fallbackCommand = 'See stderr for details';
  error.stderr = stderr;
  return error;
}

module.exports = {
  isAllowedContainer,
  getAllowedContainers,
  startContainer
};
```

### Validation Checklist

- [ ] Endpoint validates container name against whitelist
- [ ] Endpoint returns 400 for invalid container names
- [ ] Endpoint executes docker compose command correctly
- [ ] Endpoint captures stdout and stderr
- [ ] Endpoint categorizes errors (docker-down, port-conflict, permission, unknown)
- [ ] Endpoint polls health check every 2 seconds
- [ ] Endpoint returns success when health check passes
- [ ] Endpoint returns partial success on health check timeout
- [ ] Endpoint is idempotent (starting running container succeeds)
- [ ] CORS allows requests from dashboard origin
- [ ] All operations are logged for auditing
