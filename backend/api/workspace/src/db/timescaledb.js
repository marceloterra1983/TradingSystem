/**
 * TimescaleDB Client
 * 
 * Client for TimescaleDB (PostgreSQL with time-series extensions).
 * Inherits all CRUD operations from BasePostgreSQLClient.
 * 
 * Note: TimescaleDB is PostgreSQL-compatible, so no special overrides needed
 * for Workspace app (we don't use time-series features).
 * 
 * @module db/timescaledb
 */

import { BasePostgreSQLClient } from './base-postgresql-client.js';
import { timescaledbConfig } from '../config.js';

export class TimescaleDBClient extends BasePostgreSQLClient {
  constructor() {
    super(timescaledbConfig);
  }
  
  // All CRUD methods inherited from BasePostgreSQLClient
  // TimescaleDB is PostgreSQL-compatible, no overrides needed for CRUD
}
