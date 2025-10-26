/**
 * Container Service
 *
 * Manages Docker container lifecycle for database tools.
 * Provides secure, whitelisted container start functionality via Docker Compose.
 *
 * @module services/containerService
 */

const { spawn } = require('child_process');
const path = require('path');

/**
 * Whitelist of allowed containers with their configuration.
 * Only these containers can be started via the API (security measure).
 */
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

/**
 * Check if a container name is in the allowed whitelist.
 *
 * @param {string} containerName - Name of the container
 * @returns {boolean} True if container is allowed
 */
function isAllowedContainer(containerName) {
  return ALLOWED_CONTAINERS.hasOwnProperty(containerName);
}

/**
 * Get list of all allowed container names.
 *
 * @returns {string[]} Array of allowed container names
 */
function getAllowedContainers() {
  return Object.keys(ALLOWED_CONTAINERS);
}

/**
 * Start a Docker container via Docker Compose.
 *
 * @param {string} containerName - Name of the container (must be in whitelist)
 * @returns {Promise<object>} Result object with success status and details
 * @throws {Error} If container start fails
 */
async function startContainer(containerName) {
  const config = ALLOWED_CONTAINERS[containerName];
  if (!config) {
    throw new Error(`Container "${containerName}" is not in allowed whitelist`);
  }

  // Navigate to project root (src/services -> TradingSystem)
  // __dirname = .../apps/status/src/services
  // ../../../../ = .../TradingSystem
  const projectRoot = path.resolve(__dirname, '../../../../');
  const composePath = path.join(projectRoot, config.composePath);

  console.log(`[ContainerService] Starting container: ${containerName} (${config.service})`);

  // Execute docker compose command
  const result = await executeDockerCompose(composePath, config.service);

  if (!result.success) {
    throw createCategorizedError(result.stderr, composePath, config.service);
  }

  console.log(`[ContainerService] Container started: ${containerName}`);

  // Wait for health check
  console.log(`[ContainerService] Polling health check: ${config.healthCheck}`);
  const healthResult = await waitForHealthy(config.healthCheck, 60000);

  return {
    success: true,
    containerName,
    message: healthResult.healthy
      ? 'Container started successfully'
      : 'Container started but health check timeout',
    healthy: healthResult.healthy,
    timeout: !healthResult.healthy,
    healthCheckUrl: config.healthCheck,
    note: !healthResult.healthy
      ? 'Container may still be initializing. Refresh page to retry.'
      : undefined
  };
}

/**
 * Execute Docker Compose command to start a service.
 *
 * @param {string} composePath - Absolute path to compose file
 * @param {string} service - Service name in compose file
 * @returns {Promise<object>} Object with success flag, stdout, stderr
 */
function executeDockerCompose(composePath, service) {
  return new Promise((resolve) => {
    // Use full path to docker binary to avoid PATH issues
    const dockerBin = '/usr/bin/docker';
    const child = spawn(dockerBin, [
      'compose',
      '-f', composePath,
      'up', '-d',
      service
    ], {
      cwd: path.dirname(composePath),
      env: {
        ...process.env,
        PATH: process.env.PATH + ':/usr/local/bin:/usr/bin'
      }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      console.log(`[ContainerService] docker compose exit code: ${code}`);

      // Log output for debugging
      if (stdout) console.log('[ContainerService] stdout:', stdout.substring(0, 500));
      if (stderr) console.error('[ContainerService] stderr:', stderr.substring(0, 500));

      resolve({
        success: code === 0,
        exitCode: code,
        stdout,
        stderr
      });
    });

    child.on('error', (error) => {
      console.error('[ContainerService] spawn error:', error);
      resolve({
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: error.message
      });
    });
  });
}

/**
 * Wait for container to become healthy by polling health check endpoint.
 *
 * @param {string} healthCheckUrl - URL to poll for health
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 60000)
 * @returns {Promise<object>} Object with healthy flag
 */
async function waitForHealthy(healthCheckUrl, timeout = 60000) {
  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < timeout) {
    attempts++;

    try {
      const response = await fetch(healthCheckUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout per request
      });

      if (response.ok) {
        console.log(`[ContainerService] Health check passed after ${attempts} attempts (${Date.now() - startTime}ms)`);
        return { healthy: true, attempts };
      }

      console.log(`[ContainerService] Health check attempt ${attempts}: status ${response.status}`);
    } catch (err) {
      // Container not ready yet (connection refused, timeout, etc.)
      console.log(`[ContainerService] Health check attempt ${attempts}: ${err.message}`);
    }

    // Wait 2 seconds before next attempt
    await sleep(2000);
  }

  console.warn(`[ContainerService] Health check timeout after ${attempts} attempts (${timeout}ms)`);
  return { healthy: false, attempts, timeout: true };
}

/**
 * Sleep for specified milliseconds.
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a categorized error with helpful feedback and fallback command.
 *
 * @param {string} stderr - Standard error output from docker compose
 * @param {string} composePath - Path to compose file
 * @param {string} service - Service name
 * @returns {Error} Categorized error object
 */
function createCategorizedError(stderr, composePath, service) {
  const stderrLower = stderr.toLowerCase();

  // Docker daemon not running
  if (stderrLower.includes('cannot connect to the docker daemon')) {
    const error = new Error('Docker daemon is not running');
    error.category = 'docker-down';
    error.fallbackCommand = 'sudo systemctl start docker';
    error.stderr = stderr;
    return error;
  }

  // Port conflict
  if (stderrLower.includes('port is already allocated') || stderrLower.includes('address already in use')) {
    const portMatch = stderr.match(/:(\d+)/);
    const port = portMatch ? portMatch[1] : 'unknown';
    const error = new Error(`Port ${port} is already in use`);
    error.category = 'port-conflict';
    error.fallbackCommand = `docker ps | grep ${port}`;
    error.stderr = stderr;
    return error;
  }

  // Permission denied
  if (stderrLower.includes('permission denied') || stderrLower.includes('got permission denied')) {
    const error = new Error('Permission denied. Add your user to docker group.');
    error.category = 'permission';
    error.fallbackCommand = 'sudo usermod -aG docker $USER && newgrp docker';
    error.stderr = stderr;
    return error;
  }

  // Unknown error
  const errorMessage = stderr.substring(0, 200) || 'Docker Compose command failed';
  const error = new Error(errorMessage);
  error.category = 'unknown';
  error.fallbackCommand = `docker compose -f ${composePath} up -d ${service}`;
  error.stderr = stderr;
  return error;
}

module.exports = {
  isAllowedContainer,
  getAllowedContainers,
  startContainer,
  ALLOWED_CONTAINERS
};
