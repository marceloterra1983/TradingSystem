# scripts/presets

Coleção de startups especializadas que existiam soltas na raiz. Todas dependem do
`scripts/start.sh`, mas mantivemos como presets para investigações rápidas.

| Script | Descrição |
| ------ | --------- |
| `start-minimal.sh` | Sobe apenas RAG + Dashboard (zero dependências pesadas). |
| `start-clean.sh` | Inicializa RAG, Kong e Dashboard sem stacks de banco. |
| `start-with-gateway.sh` | Executa o `start-minimal` e adiciona o Kong Gateway. |
| `start-all-fixed.sh` | Liga todas as stacks docker em ordem e fecha com o Dashboard. |
| `startup-all-services.sh` | Variação legacy que sobe Docker + Node.js com health checks básicos. |
| `startup-everything.sh` | Versão agressiva que limpa portas antes de iniciar tudo (inclui Firecrawl). |
| `ultimate-startup.sh` | Fluxo máximo que tenta iniciar cada stack conhecida do repositório. |

> Os presets não recebem novas features; qualquer melhoria deve ir para `scripts/start.sh`
e depois ser refletida aqui se fizer sentido.
