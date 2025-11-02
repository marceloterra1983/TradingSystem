#!/usr/bin/env node

/**
 * Monitora `.claude/agents` e reexecuta o gerador do catálogo
 * sempre que algum arquivo Markdown for alterado/adicionado.
 *
 * Uso:
 *   node scripts/agents/watch-agents.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');

const generateScript = 'scripts/agents/generate-agents-directory.mjs';
const watchPath = resolve(repoRoot, '.claude/agents');

const watcher = spawn(
  process.execPath,
  ['--watch', `--watch-path=${watchPath}`, generateScript],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  },
);

watcher.on('exit', (code) => {
  if (code !== null) {
    console.log(`Watcher dos agentes encerrado com código ${code}`);
  }
});

process.on('SIGINT', () => {
  watcher.kill('SIGINT');
  process.exit(0);
});
