import commandsDatabase from './commands-db.json' with { type: 'json' };

const SUPPORTED_COMMAND_SCHEMA_VERSION = '1.1.0';

type CommandsDatabase = typeof commandsDatabase;

function validateCommandsDatabase(db: CommandsDatabase) {
  if (db.schemaVersion !== SUPPORTED_COMMAND_SCHEMA_VERSION) {
    throw new Error(
      `Catálogo de comandos desatualizado. Execute "npm run commands:generate" para alinhar ao schema ${SUPPORTED_COMMAND_SCHEMA_VERSION}.`,
    );
  }

  if (!Array.isArray(db.commands) || db.commands.length === 0) {
    throw new Error('commands-db.json está vazio ou inválido.');
  }
}

validateCommandsDatabase(commandsDatabase);

export { commandsDatabase, SUPPORTED_COMMAND_SCHEMA_VERSION };
export type { CommandsDatabase };
