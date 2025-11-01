#!/usr/bin/env node
/**
 * Lightweight OpenSpec helper CLI.
 *
 * Implementa subconjunto mínimo dos comandos usados no projeto:
 *   - list
 *   - validate <change-id> [--strict]
 *
 * Objetivo é permitir uso local mesmo sem instalar o pacote openspec oficial.
 */

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const openspecRoot = join(repoRoot, 'tools', 'openspec');
const changesRoot = join(openspecRoot, 'changes');

function usage(exitCode = 0) {
  console.log(`Usage: npm run openspec -- <command>

Commands:
  list                         Lista change-ids disponíveis em tools/openspec/changes
  validate <change-id> [opts]  Valida se a mudança possui arquivos mínimos

Options:
  --strict     (opcional) Alias aceito apenas para compatibilidade
  -h, --help   Mostra esta mensagem
`);
  process.exit(exitCode);
}

function assertDirectoryExists(dir, message) {
  if (!existsSync(dir)) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
}

function listChanges() {
  assertDirectoryExists(changesRoot, `Diretório ${changesRoot} não encontrado.`);
  const entries = readdirSync(changesRoot, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort();
  if (!entries.length) {
    console.log('Nenhuma mudança encontrada em tools/openspec/changes.');
    return;
  }
  console.log('Changes disponíveis:');
  for (const name of entries) {
    console.log(` • ${name}`);
  }
}

function validateChange(changeId) {
  if (!changeId) {
    console.error('❌ Informe o change-id: npm run openspec -- validate <change-id>');
    process.exit(1);
  }

  assertDirectoryExists(changesRoot, `Diretório ${changesRoot} não encontrado.`);

  const changeDir = join(changesRoot, changeId);
  if (!existsSync(changeDir)) {
    console.error(`❌ Change '${changeId}' não encontrado em tools/openspec/changes.`);
    process.exit(1);
  }

  const requiredFiles = ['proposal.md', 'tasks.md'];
  const missing = requiredFiles.filter((file) => !existsSync(join(changeDir, file)));
  if (missing.length > 0) {
    console.error(`❌ Arquivos obrigatórios ausentes em ${changeDir}: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Valida conteúdo mínimo do proposal/tasks.
  const proposal = readFileSync(join(changeDir, 'proposal.md'), 'utf-8');
  if (!proposal.trim()) {
    console.error('❌ proposal.md está vazio.');
    process.exit(1);
  }
  if (!proposal.includes('## Change Proposal')) {
    console.warn('⚠️  proposal.md não contém o heading "## Change Proposal".');
  }

  const tasks = readFileSync(join(changeDir, 'tasks.md'), 'utf-8');
  if (!tasks.trim()) {
    console.error('❌ tasks.md está vazio.');
    process.exit(1);
  }
  if (!tasks.includes('##')) {
    console.warn('⚠️  tasks.md não contém nenhum heading "##".');
  }

  console.log(`✅ Change '${changeId}' validado com sucesso.`);
}

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length === 0 || ['-h', '--help'].includes(args[0])) {
  usage(0);
}

const command = args.shift();

switch (command) {
  case 'list':
    listChanges();
    break;
  case 'validate': {
    const changeId = args.shift();
    // Ignora opções adicionais (ex.: --strict)
    validateChange(changeId);
    break;
  }
  default:
    console.error(`❌ Comando desconhecido: ${command}`);
    usage(1);
}
