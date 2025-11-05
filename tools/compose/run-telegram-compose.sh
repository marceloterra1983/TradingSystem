#!/bin/bash
# Wrapper para Docker Compose com variáveis exportadas

# Carregar variáveis do .env da raiz
set -a
source ../../.env
set +a

# Executar docker compose com argumentos passados
# NOTA: O nome do projeto (telegram-stack) está definido no YAML via propriedade 'name'
docker compose -f docker-compose.telegram.yml "$@"
