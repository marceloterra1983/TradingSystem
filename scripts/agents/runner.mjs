#!/usr/bin/env node
// Agents runner: list, describe, run local agents from config/agents/*.json
import {readdirSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT = process.cwd();
const AGENTS_DIR = join(ROOT, 'config', 'agents');

function loadAgents() {
  const files = readdirSync(AGENTS_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => JSON.parse(readFileSync(join(AGENTS_DIR, f), 'utf8')));
}

function print(obj) { process.stdout.write(obj + '\n'); }

function usage() {
  print('Usage: node scripts/agents/runner.mjs <list|describe|run> [agentId] [--args JSON]');
}

function listAgents() {
  const agents = loadAgents();
  agents.forEach(a => {
    print(`${a.id}\t${a.name}\t${a.runtime}\t${a.entry}`);
  });
}

function describeAgent(id) {
  const agent = loadAgents().find(a => a.id === id);
  if (!agent) {
    print(`Agent not found: ${id}`);
    process.exit(1);
  }
  print(JSON.stringify({
    id: agent.id,
    name: agent.name,
    version: agent.version,
    role: agent.role,
    instructions: agent.instructions,
    runtime: agent.runtime,
    entry: agent.entry,
    env: agent.env || [],
    argsSchema: agent.argsSchema || {},
    schedule: agent.schedule || null
  }, null, 2));
}

function runAgent(id, argsJSON) {
  const agent = loadAgents().find(a => a.id === id);
  if (!agent) {
    print(`Agent not found: ${id}`);
    process.exit(1);
  }
  const entryPath = resolve(ROOT, agent.entry);
  const runtime = agent.runtime || 'node';
  const args = argsJSON ? JSON.parse(argsJSON) : {};

  // Pass args as CLI flags: --key value or boolean flags
  const cli = [];
  for (const [k, v] of Object.entries(args)) {
    if (typeof v === 'boolean') {
      if (v) cli.push(`--${k}`);
    } else {
      cli.push(`--${k}`, String(v));
    }
  }

  const cmd = runtime === 'python' ? 'python3' : 'node';
  const runArgs = runtime === 'python' ? [entryPath, ...cli] : [entryPath, ...cli];

  const res = spawnSync(cmd, runArgs, {stdio: 'inherit', env: process.env});
  process.exit(res.status || 0);
}

const [, , sub, arg1, arg2, ...rest] = process.argv;
switch (sub) {
  case 'list':
    listAgents();
    break;
  case 'describe':
    if (!arg1) { usage(); process.exit(1); }
    describeAgent(arg1);
    break;
  case 'run':
    if (!arg1) { usage(); process.exit(1); }
    // find --args JSON
    let json = null;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '--args') { json = rest[i+1]; break; }
    }
    runAgent(arg1, json);
    break;
  default:
    usage();
    process.exit(1);
}

