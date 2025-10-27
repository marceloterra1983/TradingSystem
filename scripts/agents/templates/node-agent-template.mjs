#!/usr/bin/env node
// Node Agent Template – local CLI agent
import {execSync} from 'node:child_process';

function parseArgs(argv) {
  const args = {}; // fill with your specific flags
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = i + 1 < argv.length ? argv[i+1] : undefined;
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      if (next && !next.startsWith('--')) { args[key] = next; i++; }
      else { args[key] = true; }
    }
  }
  return args;
}

function sh(cmd) {
  return execSync(cmd, {stdio: ['ignore', 'pipe', 'pipe']}).toString().trim();
}

async function main() {
  const args = parseArgs(process.argv);
  // Implement your agent logic here. Example:
  console.log('[agent] Running with args:', JSON.stringify(args));
  // example shell use: const gitStatus = sh('git status --porcelain || true');
  // console.log(gitStatus);
}

main().catch(err => { console.error(err); process.exit(1); });

