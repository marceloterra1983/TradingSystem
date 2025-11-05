import test from 'node:test';
import assert from 'node:assert/strict';

import { extractFrontMatter } from '../generate-agents-directory.mjs';

test('extractFrontMatter parses complex values with colons and pipes', () => {
  const document = `---
name: complex-agent
description: "Pipeline: validação | com pipes"
metadata:
  owner: plataforma
  nested:
    label: "valor:com:colons"
    notes: |
      Linha 1: valor
      Linha 2 | pipe
tags:
  - arquitetura
  - dados-analytics
tools:
  - bash
  - write
examples:
  - step: 1
    title: "Exemplo: 1"
--- 
conteúdo principal`;

  const { attributes, body } = extractFrontMatter(document, { file: 'complex.md' });

  assert.equal(attributes.name, 'complex-agent');
  assert.equal(attributes.description, 'Pipeline: validação | com pipes');
  assert.equal(attributes.metadata.owner, 'plataforma');
  assert.equal(attributes.metadata.nested.label, 'valor:com:colons');
  assert.ok(attributes.metadata.nested.notes.includes('Linha 2 | pipe'));
  assert.deepEqual(attributes.tags, ['arquitetura', 'dados-analytics']);
  assert.deepEqual(attributes.tools, ['bash', 'write']);
  assert.equal(attributes.examples[0].title, 'Exemplo: 1');
  assert.equal(body.trim(), 'conteúdo principal');
});

test('extractFrontMatter handles arrays and nested objects without re-quoting', () => {
  const document = `---
name: pipe-agent
description: |
  Valor com dois pontos: ok
  Linha seguinte | com pipe
schema:
  nested:
    enabled: true
    url: "tcp://localhost:5432"
aliases: ["alpha:beta", "gamma|delta"]
--- 
body`;

  const { attributes } = extractFrontMatter(document, { file: 'pipe.md' });

  assert.equal(attributes.name, 'pipe-agent');
  assert.ok(attributes.description.includes('Linha seguinte | com pipe'));
  assert.equal(attributes.schema.nested.url, 'tcp://localhost:5432');
  assert.deepEqual(attributes.aliases, ['alpha:beta', 'gamma|delta']);
});
