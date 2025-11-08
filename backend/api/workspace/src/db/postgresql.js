/**
 * PostgreSQL Client (Vanilla)
 *
 * Standard PostgreSQL 17 client for Workspace application.
 * This is a simpler alternative to Neon when you don't need:
 * - Database branching
 * - Scale-to-zero
 * - Separated storage/compute
 *
 * Inherits all CRUD operations from BasePostgreSQLClient.
 * Customizes only configuration.
 *
 * @module db/postgresql
 */

import { BasePostgreSQLClient } from "./base-postgresql-client.js";
import { postgresqlConfig } from "../config.js";

export class PostgreSQLClient extends BasePostgreSQLClient {
  constructor() {
    super(postgresqlConfig);
  }

  // All CRUD methods inherited from BasePostgreSQLClient
  // No need to override unless PostgreSQL-specific behavior needed
}
