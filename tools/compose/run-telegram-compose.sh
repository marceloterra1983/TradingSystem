#!/bin/bash
# Wrapper para Docker Compose com variáveis exportadas

# Carregar variáveis do .env da raiz
set -a
source ../../.env
set +a

# Executar docker compose com argumentos passados
docker compose -f docker-compose.telegram.yml "$@"
