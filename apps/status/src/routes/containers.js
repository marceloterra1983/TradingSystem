/**
 * Containers Router
 *
 * HTTP API for managing Docker containers (start, status).
 * Security: Enforces whitelist validation, audit logging, CORS.
 *
 * @module routes/containers
 */

const express = require('express');
const containerService = require('../services/containerService');

const router = express.Router();

/**
 * POST /api/containers/:containerName/start
 *
 * Start a Docker container via Docker Compose.
 *
 * Security:
 * - Validates container name against whitelist
 * - Logs all attempts (success + failure)
 * - Returns actionable error messages
 *
 * @param {string} containerName - Name of container (pgadmin, pgweb, adminer, questdb)
 * @returns {200} Container started successfully
 * @returns {400} Invalid container name (not in whitelist)
 * @returns {500} Docker Compose command failed
 *
 * @example
 * // Success
 * POST /api/containers/pgadmin/start
 * {
 *   "success": true,
 *   "containerName": "pgadmin",
 *   "message": "Container started successfully",
 *   "healthy": true,
 *   "healthCheckUrl": "http://localhost:5050"
 * }
 *
 * @example
 * // Error - Invalid container
 * POST /api/containers/invalid/start
 * {
 *   "success": false,
 *   "error": "Invalid container name",
 *   "details": {
 *     "allowedContainers": ["pgadmin", "pgweb", "adminer", "questdb"]
 *   }
 * }
 *
 * @example
 * // Error - Docker daemon down
 * POST /api/containers/pgadmin/start
 * {
 *   "success": false,
 *   "error": "Docker daemon is not running",
 *   "category": "docker-down",
 *   "fallbackCommand": "sudo systemctl start docker",
 *   "details": { "stderr": "..." }
 * }
 */
router.post('/:containerName/start', async (req, res) => {
  const { containerName } = req.params;
  const clientIp = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent') || 'unknown';

  // Audit log: Start request received
  console.log(`[ContainerAPI] Start request: container=${containerName} ip=${clientIp} ua=${userAgent.substring(0, 100)}`);

  // Validation: Check whitelist
  if (!containerService.isAllowedContainer(containerName)) {
    console.warn(`[ContainerAPI] Rejected: Invalid container name "${containerName}"`);

    return res.status(400).json({
      success: false,
      error: 'Invalid container name',
      details: {
        requested: containerName,
        allowedContainers: containerService.getAllowedContainers()
      },
      timestamp: new Date().toISOString()
    });
  }

  // Execute container start
  try {
    const result = await containerService.startContainer(containerName);

    // Audit log: Success
    console.log(`[ContainerAPI] Success: container=${containerName} healthy=${result.healthy}`);

    res.status(200).json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Categorize error and provide helpful feedback
    console.error(`[ContainerAPI] Failed: container=${containerName} category=${error.category} error=${error.message}`);

    // Determine HTTP status code based on error category
    const statusCode = error.category === 'port-conflict' ? 409 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message,
      category: error.category || 'unknown',
      fallbackCommand: error.fallbackCommand,
      details: {
        stderr: error.stderr?.substring(0, 500) // Limit stderr to 500 chars
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/containers
 *
 * Get list of allowed containers (for discovery/documentation).
 *
 * @returns {200} List of allowed containers with configuration
 *
 * @example
 * GET /api/containers
 * {
 *   "success": true,
 *   "containers": {
 *     "pgadmin": {
 *       "port": 5050,
 *       "healthCheck": "http://localhost:5050"
 *     },
 *     ...
 *   }
 * }
 */
router.get('/', (req, res) => {
  const containers = {};

  // Return public info (omit internal details like compose path, service name)
  for (const [name, config] of Object.entries(containerService.ALLOWED_CONTAINERS)) {
    containers[name] = {
      port: config.port,
      healthCheck: config.healthCheck
    };
  }

  res.status(200).json({
    success: true,
    containers,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
