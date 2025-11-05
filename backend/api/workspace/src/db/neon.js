/**
 * Neon PostgreSQL Client
 * 
 * Database client for Neon (serverless PostgreSQL) with branching support.
 * Compatible with standard PostgreSQL protocol but optimized for Neon's
 * separated storage and compute architecture.
 * 
 * Inherits all CRUD operations from BasePostgreSQLClient.
 * Customizes only configuration (adds Neon-specific timeouts).
 * 
 * @module db/neon
 */

import { BasePostgreSQLClient } from './base-postgresql-client.js';
import { neonConfig } from '../config.js';

export class NeonClient extends BasePostgreSQLClient {
  constructor() {
    super(neonConfig);
  }

  // All CRUD methods inherited from BasePostgreSQLClient
  // Neon uses same PostgreSQL protocol, no custom overrides needed
}

