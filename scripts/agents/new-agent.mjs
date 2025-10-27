#!/usr/bin/env node
// Scaffolds a new local agent: manifest + script from template
import {existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync} from 'node:fs';
import {join} from 'node:path';

function usage() {
  console.log('Usage: node scripts/agents/new-agent.mjs --id <id> --name <name> [--runtime node|python] [--entry <path>]');
}

function parseArgs(argv) {
  const out = {id: null, name: null, runtime: 'node', entry: null};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = i + 1 < argv.length ? argv[i+1] : undefined;
    if (a === '--id' && next) { out.id = next; i++; continue; }
    if (a === '--name' && next) { out.name = next; i++; continue; }
    if (a === '--runtime' && next) { out.runtime = next; i++; continue; }
    if (a === '--entry' && next) { out.entry = next; i++; continue; }
  }
  return out;
}

const ROOT = process.cwd();
const args = parseArgs(process.argv);
if (!args.id || !args.name) { usage(); process.exit(1); }

const scriptsDir = join(ROOT, 'scripts', 'agents');
const configDir = join(ROOT, 'config', 'agents');
if (!existsSync(configDir)) mkdirSync(configDir, {recursive: true});

let entry = args.entry;
if (!entry) {
  entry = `scripts/agents/${args.id}.mjs`;
  const tpl = join(scriptsDir, 'templates', 'node-agent-template.mjs');
  copyFileSync(tpl, join(ROOT, entry));
}

const manifest = {
  id: args.id,
  name: args.name,
  version: '0.1.0',
  role: 'Describe the purpose here',
  instructions: 'Write the agent instructions here',
  runtime: args.runtime,
  entry,
  env: [],
  argsSchema: {},
  schedule: { cron: '' }
};

const outPath = join(configDir, `${args.id}.json`);
writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`Created agent manifest: ${outPath}`);
console.log(`Entry script: ${join(ROOT, entry)}`);

