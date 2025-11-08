#!/usr/bin/env node

/**
 * Convert aiAgentsDirectory.ts to JSON format
 *
 * Performance optimization: Converting large TypeScript file to JSON
 * saves TypeScript compilation time (~2s) and reduces bundle size.
 *
 * Usage: node scripts/convert-agents-to-json.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TS_FILE = path.join(__dirname, '../src/data/aiAgentsDirectory.ts');
const JSON_FILE = path.join(__dirname, '../src/data/aiAgentsDirectory.json');
const TYPES_FILE = path.join(__dirname, '../src/data/aiAgentsDirectory.types.ts');

console.log('🔄 Converting aiAgentsDirectory.ts to JSON...');

// Import the TypeScript module dynamically
async function convertToJson() {
  try {
    // Read the TypeScript file content
    const tsContent = fs.readFileSync(TS_FILE, 'utf-8');

    // Extract the data using regex (safer than eval)
    const schemaVersionMatch = tsContent.match(/export const AGENT_CATALOG_SCHEMA_VERSION = "(.+?)"/);
    const categoryOrderMatch = tsContent.match(/export const AGENT_CATEGORY_ORDER: AgentCategory\[\] = \[([\s\S]+?)\];/);
    const directoryMatch = tsContent.match(/export const AI_AGENTS_DIRECTORY: AgentDirectoryEntry\[\] = \[([\s\S]+)\];/);

    if (!schemaVersionMatch || !categoryOrderMatch || !directoryMatch) {
      throw new Error('Failed to parse TypeScript file structure');
    }

    const schemaVersion = schemaVersionMatch[1];

    // Parse category order (simple string array)
    const categoryOrderStr = categoryOrderMatch[1];
    const categoryOrder = categoryOrderStr
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('"'))
      .map(line => line.replace(/[",]/g, ''));

    // Parse agent entries (complex array of objects)
    // Strategy: Extract each complete object block
    const entriesStr = directoryMatch[1];
    const entries = [];

    let braceDepth = 0;
    let currentBlock = '';

    for (let i = 0; i < entriesStr.length; i++) {
      const char = entriesStr[i];

      if (char === '{') {
        braceDepth++;
        if (braceDepth === 1) {
          currentBlock = '{';
          continue;
        }
      } else if (char === '}') {
        braceDepth--;
        currentBlock += char;

        if (braceDepth === 0) {
          // Parse this object
          try {
            const entryObj = parseAgentEntry(currentBlock);
            if (entryObj) {
              entries.push(entryObj);
            }
          } catch (err) {
            console.error('Error parsing entry:', err.message);
          }
          currentBlock = '';
          continue;
        }
      }

      if (braceDepth > 0) {
        currentBlock += char;
      }
    }

    console.log(`✅ Parsed ${entries.length} agent entries`);

    // Create JSON structure
    const jsonData = {
      schemaVersion,
      categoryOrder,
      agents: entries
    };

    // Write JSON file
    fs.writeFileSync(JSON_FILE, JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log(`✅ Created ${JSON_FILE} (${(fs.statSync(JSON_FILE).size / 1024).toFixed(2)} KB)`);

    // Create types file (keep type definitions separate)
    const typesContent = `// Type definitions for AI Agents Directory
// This file is kept in TypeScript for type safety

export const AGENT_CATALOG_SCHEMA_VERSION = "${schemaVersion}";

export type AgentCategory =
  | "Arquitetura & Plataforma"
  | "Backend & Serviços"
  | "Frontend & UX"
  | "Dados & Analytics"
  | "IA, ML & RAG"
  | "Documentação & Conteúdo"
  | "Pesquisa & Estratégia"
  | "QA & Observabilidade"
  | "MCP & Automação";

export interface AgentDirectoryEntry {
  id: string;
  name: string;
  category: AgentCategory;
  capabilities: string;
  usage: string;
  example: string;
  shortExample?: string;
  outputType: string;
  tags: string[];
  filePath: string;
  fileContent: string;
}

export interface AgentDirectory {
  schemaVersion: string;
  categoryOrder: AgentCategory[];
  agents: AgentDirectoryEntry[];
}
`;

    fs.writeFileSync(TYPES_FILE, typesContent, 'utf-8');
    console.log(`✅ Created ${TYPES_FILE} (type definitions)`);

    console.log('\n📊 Conversion Summary:');
    console.log(`   Schema Version: ${schemaVersion}`);
    console.log(`   Categories: ${categoryOrder.length}`);
    console.log(`   Agents: ${entries.length}`);
    console.log(`   JSON Size: ${(fs.statSync(JSON_FILE).size / 1024).toFixed(2)} KB`);
    console.log(`   Original TS Size: ${(fs.statSync(TS_FILE).size / 1024).toFixed(2)} KB`);

    return true;
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

function parseAgentEntry(blockStr) {
  const entry = {};

  // Helper to extract field value
  const extractField = (fieldName, isArray = false) => {
    // Match: fieldName: "value" or fieldName: value
    const regex = new RegExp(`${fieldName}:\\s*(.+?)(?:,\\s*$|,\\s*(?=\\w+:)|$)`, 'm');
    const match = blockStr.match(regex);

    if (!match) return null;

    let value = match[1].trim();

    if (isArray) {
      // Parse array: ["item1", "item2"]
      const arrayMatch = value.match(/\[([\s\S]*?)\]/);
      if (arrayMatch) {
        return arrayMatch[1]
          .split(',')
          .map(item => item.trim().replace(/^["']|["']$/g, ''))
          .filter(item => item.length > 0);
      }
      return [];
    }

    // Parse string (remove quotes and handle multiline)
    if (value.startsWith('"') || value.startsWith("'")) {
      // Handle multiline strings
      const quoteChar = value[0];
      let endIndex = 1;
      let escaped = false;

      while (endIndex < value.length) {
        if (escaped) {
          escaped = false;
          endIndex++;
          continue;
        }

        if (value[endIndex] === '\\') {
          escaped = true;
        } else if (value[endIndex] === quoteChar) {
          break;
        }

        endIndex++;
      }

      return value.substring(1, endIndex).replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }

    return value;
  };

  entry.id = extractField('id');
  entry.name = extractField('name');
  entry.category = extractField('category');
  entry.capabilities = extractField('capabilities');
  entry.usage = extractField('usage');
  entry.example = extractField('example');
  entry.shortExample = extractField('shortExample');
  entry.outputType = extractField('outputType');
  entry.tags = extractField('tags', true);
  entry.filePath = extractField('filePath');
  entry.fileContent = extractField('fileContent');

  // Validate required fields
  if (!entry.id || !entry.name) {
    throw new Error(`Missing required fields in entry: ${entry.id || 'unknown'}`);
  }

  // Remove undefined fields
  Object.keys(entry).forEach(key => {
    if (entry[key] === null || entry[key] === undefined) {
      delete entry[key];
    }
  });

  return entry;
}

// Run conversion
convertToJson().then(success => {
  process.exit(success ? 0 : 1);
});
