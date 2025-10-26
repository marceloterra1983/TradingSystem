import { logger } from '../logger.js';
import { config } from '../config.js';

/**
 * Middleware to authenticate requests from Telegram Gateway
 * Validates X-Gateway-Token header against configured secret
 */
export function authGateway(req, res, next) {
  const token = req.headers['x-gateway-token'];
  const expectedToken = config.gateway.secretToken;

  if (!expectedToken) {
    logger.error('GATEWAY_SECRET_TOKEN not configured');
    return res.status(500).json({
      error: 'Server configuration error',
    });
  }

  if (!token) {
    logger.warn({ ip: req.ip }, 'Unauthorized ingestion attempt - missing token');
    return res.status(401).json({
      error: 'Invalid or missing authentication token',
    });
  }

  if (token !== expectedToken) {
    logger.warn({ ip: req.ip, tokenPrefix: token.substring(0, 8) }, 'Unauthorized ingestion attempt - invalid token');
    return res.status(401).json({
      error: 'Invalid or missing authentication token',
    });
  }

  // Token is valid, proceed
  next();
}
