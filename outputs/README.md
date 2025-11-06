# Output Artifacts Hub

Centraliza todos os artefatos produzidos por agentes e automações de IA. Para manter a raiz do repositório limpa, **nenhum arquivo gerado automaticamente pode ser salvo fora deste diretório**.

## Regras rápidas

1. Gere arquivos apenas dentro de `outputs/`.
2. Sempre crie/acuse uma subpasta temática (ex.: `reports`, `logs`, `datasets`).
3. Use nomes ASCII em `kebab-case` e timestamps (`YYYYMMDD`) quando precisar distinguir execuções.
4. Remova arquivos temporários quando não forem mais necessários ou mova-os para `reports/` permanentes.

## Estrutura recomendada

```
outputs/
├── logs/        # Execuções, traces e dumps temporários
├── reports/     # Artefatos consolidados e prontos para revisão
└── <custom>/    # Crie novas subpastas conforme o assunto (ex.: `datasets/`, `experiments/`)
```

> Caso um agente precise de outra categoria, crie a subpasta antes de gravar arquivos para evitar lixo na raiz.

## Boas práticas para scripts/agentes

- Valide o caminho de saída (`path.startsWith("outputs/")`) e falhe se estiver fora desse diretório.
- Mantenha logs verbosos em `outputs/logs/` e resumos finais em `outputs/reports/`.
- Documente no PR ou no relatório final onde o artefato foi salvo (`outputs/<subpasta>/<arquivo>`).
