# Commands Catalogue Automation

Ferramentas para manter o catálogo de comandos (`commands-db.json`) sincronizado com a pasta `.claude/commands`.

## Geração manual

```bash
npm run commands:build
```

Executa `scripts/commands/generate-commands-db.mjs` e atualiza `frontend/dashboard/src/data/commands-db.json`. Use sempre que editar o `commands-raiox.md` ou os arquivos `.md` individuais e não estiver rodando o watcher.

> Desde o Plano B implementado em 2025-11-02, o build também garante que qualquer arquivo `.md` novo em `.claude/commands` gere automaticamente uma entrada inicial em `.claude/commands/commands-raiox.md` (seção **Novos Comandos Automatizados**). Revise e mova essas entradas para as categorias definitivas assim que preencher as descrições.

## Modo watch

```bash
npm run commands:watch
```

Mantém um watcher (via `node --watch`) observando `.claude/commands/**/*.md`. A cada alteração o banco é regenerado automaticamente.

> **Dica**: deixe esse comando rodando em uma aba do terminal enquanto trabalha em novos comandos para garantir que o dashboard reflita as mudanças sem passos extras.
