import { z } from 'zod';

/**
 * Database Configuration Schema with Zod Validation
 * 
 * Validates database configuration at startup to catch errors early.
 * Enforces protected port range (7000-7999) for databases.
 */

const DatabaseConfigSchema = z.object({
  host: z.string().min(1, 'Database host is required').default('localhost'),
  
  port: z
    .number()
    .int()
    .min(7000, 'Database port must be in protected range (7000-7999)')
    .max(7999, 'Database port must be in protected range (7000-7999)')
    .default(7000),
  
  user: z.string().min(1, 'Database user is required'),
  
  password: z.string().min(1, 'Database password is required'),
  
  database: z.string().min(1, 'Database name is required'),
  
  ssl: z.boolean().default(false),
  
  schema: z.string().optional(),
  
  pool: z.object({
    max: z
      .number()
      .int()
      .min(1, 'Pool max must be at least 1')
      .max(100, 'Pool max should not exceed 100')
      .default(10),
    
    idleTimeoutMillis: z
      .number()
      .int()
      .min(1000, 'Idle timeout must be at least 1000ms')
      .default(30000),
    
    connectionTimeoutMillis: z
      .number()
      .int()
      .min(1000, 'Connection timeout must be at least 1000ms')
      .default(10000),
  }).default({}),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

/**
 * Load and validate database configuration from environment variables
 * 
 * @param prefix - Environment variable prefix (e.g., 'TIMESCALEDB', 'QUESTDB')
 * @returns Validated database configuration
 * @throws Error if configuration is invalid
 * 
 * @example
 * ```typescript
 * // Load TimescaleDB config
 * const config = loadDatabaseConfig('TIMESCALEDB');
 * 
 * // Use config
 * const pool = new pg.Pool({
 *   host: config.host,
 *   port: config.port,
 *   user: config.user,
 *   password: config.password,
 *   database: config.database,
 * });
 * ```
 */
export function loadDatabaseConfig(prefix: string = 'TIMESCALEDB'): DatabaseConfig {
  const raw = {
    host: process.env[`${prefix}_HOST`],
    port: process.env[`${prefix}_PORT`] ? parseInt(process.env[`${prefix}_PORT`]) : undefined,
    user: process.env[`${prefix}_USER`],
    password: process.env[`${prefix}_PASSWORD`],
    database: process.env[`${prefix}_DATABASE`],
    ssl: process.env[`${prefix}_SSL`] === 'true',
    schema: process.env[`${prefix}_SCHEMA`],
    pool: {
      max: process.env[`${prefix}_POOL_MAX`] 
        ? parseInt(process.env[`${prefix}_POOL_MAX`]) 
        : undefined,
      idleTimeoutMillis: process.env[`${prefix}_POOL_IDLE`]
        ? parseInt(process.env[`${prefix}_POOL_IDLE`])
        : undefined,
      connectionTimeoutMillis: process.env[`${prefix}_POOL_TIMEOUT`]
        ? parseInt(process.env[`${prefix}_POOL_TIMEOUT`])
        : undefined,
    },
  };

  try {
    const validated = DatabaseConfigSchema.parse(raw);
    
    console.log(`✅ Database config validated: ${prefix}`);
    console.log(`   Host: ${validated.host}:${validated.port}`);
    console.log(`   Database: ${validated.database}`);
    console.log(`   Pool: max=${validated.pool.max}, idle=${validated.pool.idleTimeoutMillis}ms`);
    
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ Database configuration invalid for ${prefix}:`);
      error.errors.forEach(err => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error(`Invalid database configuration for ${prefix}`);
    }
    throw error;
  }
}

/**
 * Validate port is in protected database range
 */
export function validateDatabasePort(port: number, serviceName: string): void {
  if (port < 7000 || port > 7999) {
    throw new Error(
      `Service '${serviceName}' port ${port} is outside protected database range (7000-7999). ` +
      `Please use a port in the protected range for database services.`
    );
  }
}

/**
 * Get database connection string
 */
export function getDatabaseConnectionString(config: DatabaseConfig): string {
  const auth = `${config.user}:${config.password}`;
  const hostPort = `${config.host}:${config.port}`;
  const dbName = config.database;
  const params = new URLSearchParams();
  
  if (config.ssl) params.set('sslmode', 'require');
  if (config.schema) params.set('schema', config.schema);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  return `postgres://${auth}@${hostPort}/${dbName}${queryString}`;
}

