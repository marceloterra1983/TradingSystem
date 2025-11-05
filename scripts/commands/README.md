# Commands Catalogue Automation

Ferramentas para manter o catálogo de comandos (`commands-db.json`) sincronizado com a pasta `.claude/commands`.

## Geração manual

```bash
npm run commands:generate
```

Executa `scripts/commands/generate-commands-db.mjs`, valida o conteúdo de `.claude/commands/commands-raiox.md`, atualiza `frontend/dashboard/src/data/commands-db.json` (com `schemaVersion`) e registra o log estruturado em `reports/commands/last-run.json`. Use sempre que editar o `commands-raiox.md` ou os arquivos `.md` individuais e não estiver rodando o watcher.

### Opção `--include-auto`

Para enxergar placeholders automáticos (em Português + tag `[hidden]`) execute:

```bash
npm run commands:generate -- --include-auto
```

As entradas são inseridas entre `<!-- AUTO-COMMANDS:START -->` e `<!-- AUTO-COMMANDS:END -->`. Rode sem a flag para remover novamente a seção enquanto não houver curadoria.

## Modo watch

```bash
npm run commands:watch
```

Mantém um watcher (via `node --watch`) observando `.claude/commands/**/*.md`. A cada alteração o banco é regenerado automaticamente.

> **Dica**: deixe esse comando rodando em uma aba do terminal enquanto trabalha em novos comandos para garantir que o dashboard reflita as mudanças sem passos extras.

## Testes e CI

- `npm run commands:test` valida o parser de frontmatter/multiline.
- `npm run commands:ci` executa os testes e a geração. O workflow `commands-directory.yml` roda automaticamente em PRs relevantes.
