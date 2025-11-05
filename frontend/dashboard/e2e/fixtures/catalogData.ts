import { AI_AGENTS_DIRECTORY } from '../../src/data/aiAgentsDirectory';
import { commandsDatabase } from '../../src/data/commandsCatalog';

/**
 * Catalog fixtures derive from the real data sources to keep the tests
 * resilient to curated content updates.
 */

const defaultAgent =
  AI_AGENTS_DIRECTORY.find((agent) => agent.tags?.length) ||
  AI_AGENTS_DIRECTORY[0];

const defaultCommand =
  commandsDatabase.commands.find((command) => (command.tags ?? []).length) ||
  commandsDatabase.commands[0];

export const catalogFixtures = {
  agent: {
    id: defaultAgent.id,
    name: defaultAgent.name,
    category: defaultAgent.category,
    tag: defaultAgent.tags?.[0] ?? '',
    example: defaultAgent.shortExample || defaultAgent.example,
  },
  command: {
    name: defaultCommand.command,
    category: defaultCommand.category ?? 'Novos Comandos Automatizados',
    tag: defaultCommand.tags?.[0] ?? '',
  },
  unmatchedQuery: '__catalog-no-results__',
};

export type CatalogFixtures = typeof catalogFixtures;
