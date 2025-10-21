import { config } from '../config.js';
import { LowdbClient } from './lowdb.js';
import { TimescaleDBClient } from './timescaledb.js';

let clientInstance;

export const getDbClient = () => {
  if (!clientInstance) {
    switch (config.dbStrategy) {
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
