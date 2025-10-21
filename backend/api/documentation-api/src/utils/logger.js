// Re-export shared logger configuration for legacy import paths.
import logger, { logger as namedLogger } from '../config/logger.js';

export { namedLogger as logger };
export default logger;
