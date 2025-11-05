import test from 'node:test';
import assert from 'node:assert/strict';

import { extractFrontMatter } from '../generate-commands-db.mjs';

test('extractFrontMatter parses multiline descriptions with pipes and colons', () => {
  const document = `---
name: example-command
description: Use este comando para sincronizar artefatos: docs | api | dashboards
argument-hint: [context] | --dry-run | --force
--- 
# Example Command
Corpo`;

  const { attributes, body } = extractFrontMatter(document, {
    file: '.claude/commands/example-command.md',
  });

  assert.equal(attributes.name, 'example-command');
  assert.equal(
    attributes.description.trim(),
    'Use este comando para sincronizar artefatos: docs | api | dashboards',
  );
  assert.equal(attributes['argument-hint'], '[context] | --dry-run | --force');
  assert.equal(body.trim(), '# Example Command\nCorpo'.trim());
});

test('extractFrontMatter tolerates YAML objects and arrays', () => {
  const document = `---
name: yaml-heavy
metadata:
  owner: plataforma
  tags:
    - observabilidade
    - docs
examples:
  - "/yaml-heavy --docs"
  - "/yaml-heavy --dry-run"
description: |
  Verifique configuracoes complexas:
    - pipelines
    - notificacoes
--- 
Conteudo`;

  const { attributes } = extractFrontMatter(document, {
    file: '.claude/commands/yaml-heavy.md',
  });

  assert.equal(attributes.metadata.owner, 'plataforma');
  assert.deepEqual(attributes.metadata.tags, ['observabilidade', 'docs']);
  assert.equal(attributes.description.includes('pipelines'), true);
  assert.equal(attributes.examples[0], '/yaml-heavy --docs');
});
