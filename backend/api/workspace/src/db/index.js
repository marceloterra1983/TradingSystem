import { config } from '../config.js';
import { LowdbClient } from './lowdb.js';
import { TimescaleDBClient } from './timescaledb.js';
import { NeonClient } from './neon.js';

let clientInstance;

export const getDbClient = () => {
  if (!clientInstance) {
    switch (config.dbStrategy) {
      case 'neon':
        clientInstance = new NeonClient();
        break;
      case 'timescaledb':
        clientInstance = new TimescaleDBClient();
        break;
      case 'lowdb':
      default:
        clientInstance = new LowdbClient();
        break;
    }
  }
  return clientInstance;
};

/**
 * Reset database client instance
 * Useful for testing and switching strategies
 */
export const resetDbClient = async () => {
  if (clientInstance && typeof clientInstance.close === 'function') {
    await clientInstance.close();
  }
  clientInstance = null;
};
