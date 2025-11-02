#!/usr/bin/env node

// Usa a flag `--watch` do Node para monitorar `.claude/commands`
// e regenerar o banco de dados sempre que houver mudanças.

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');
const generateScript = 'scripts/commands/generate-commands-db.mjs';
const watchPath = resolve(repoRoot, '.claude/commands');

const watcher = spawn(
  process.execPath,
  ['--watch', `--watch-path=${watchPath}`, generateScript],
  { cwd: repoRoot, stdio: 'inherit' },
);

watcher.on('exit', (code) => {
  if (code !== null) {
    console.log(`Watcher encerrado com código ${code}`);
  }
});

process.on('SIGINT', () => {
  watcher.kill('SIGINT');
  process.exit(0);
});
