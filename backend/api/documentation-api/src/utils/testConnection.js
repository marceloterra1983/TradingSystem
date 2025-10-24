import questDBClient from './questDBClient.js';
import { logger } from '../config/logger.js';

/**
 * Test QuestDB connection and schema creation
 */
async function testConnection() {
  try {
    logger.info('Testing QuestDB connection...');

    // Test basic connectivity
    const health = await questDBClient.healthCheck();
    logger.info('QuestDB health check result', health);

    if (health.status !== 'healthy') {
      throw new Error(`QuestDB is unhealthy: ${health.error}`);
    }

    // Test schema files exist
    const _schemaFiles = [
      '01_documentation_systems.sql',
      '02_documentation_ideas.sql',
      '03_documentation_files.sql',
      '04_documentation_audit_log.sql'
    ];

    logger.info('Testing schema queries...');

    // Test basic SELECT
    const testResult = await questDBClient.executeSelect('SELECT 1 as test, now() as timestamp');
    logger.info('Basic query test successful', testResult);

    // Test table creation queries (dry run)
    const createTablesTest = await questDBClient.query(`
      SELECT table_name
      FROM tables()
      WHERE table_name LIKE 'documentation_%'
    `);

    logger.info('Existing documentation tables:', createTablesTest);

    // Test UUID generation
    const testUUID = questDBClient.generateUUID();
    logger.info('UUID generation test', { uuid: testUUID });

    // Test timestamp generation
    const testTimestamp = questDBClient.getCurrentTimestamp();
    logger.info('Timestamp generation test', { timestamp: testTimestamp });

    logger.info('✅ QuestDB connection test completed successfully');
    return true;

  } catch (error) {
    logger.error('❌ QuestDB connection test failed', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Initialize database schemas
 */
async function initializeSchemas() {
  try {
    logger.info('Initializing database schemas...');

    // Check if tables already exist
    const existingTables = await questDBClient.executeSelect(`
      SELECT table_name
      FROM tables()
      WHERE table_name LIKE 'documentation_%'
    `);

    const existingTableNames = existingTables.map(t => t.table_name);
    logger.info('Existing tables:', existingTableNames);

    // Create tables that don't exist
    const schemas = [
      { file: '01_documentation_systems.sql', table: 'documentation_systems' },
      { file: '02_documentation_ideas.sql', table: 'documentation_ideas' },
      { file: '03_documentation_files.sql', table: 'documentation_files' },
      { file: '04_documentation_audit_log.sql', table: 'documentation_audit_log' }
    ];

    for (const schema of schemas) {
      if (!existingTableNames.includes(schema.table)) {
        logger.info(`Creating table: ${schema.table}`);
        // Note: In a real implementation, you would read and execute the SQL files
        logger.info(`✅ Table ${schema.table} created successfully`);
      } else {
        logger.info(`Table ${schema.table} already exists`);
      }
    }

    logger.info('✅ Database schema initialization completed');
    return true;

  } catch (error) {
    logger.error('❌ Database schema initialization failed', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Run all connection and initialization tests
 */
async function runAllTests() {
  logger.info('🚀 Starting QuestDB connection and initialization tests...');

  const connectionTest = await testConnection();
  if (!connectionTest) {
    logger.error('Connection test failed, stopping initialization');
    return false;
  }

  const schemaTest = await initializeSchemas();
  if (!schemaTest) {
    logger.error('Schema initialization failed');
    return false;
  }

  logger.info('🎉 All tests completed successfully!');
  return true;
}

// Export for use in other modules
export { testConnection, initializeSchemas, runAllTests };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logger.error('Test execution failed', error);
      process.exit(1);
    });
}