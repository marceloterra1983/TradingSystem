/**
 * Logger utility - Re-exports logger from config
 * This file exists to maintain compatibility with modules that import from utils/logger.js
 */
import { logger } from "../config/logger.js";

export { logger };
export default logger;
