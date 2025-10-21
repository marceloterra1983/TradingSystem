#!/bin/bash
set -e

echo "Testando BuildKit..."

# Criar diretório de teste
TEST_DIR="infrastructure/tests/buildkit-test"
mkdir -p $TEST_DIR

# Criar arquivo temporário para output
OUTPUT_FILE=$(mktemp)

# Executar build com BuildKit
echo "Executando build de teste..."
buildctl build \
    --frontend=dockerfile.v0 \
    --local context=$TEST_DIR \
    --local dockerfile=$TEST_DIR \
    --output "type=docker,name=buildkit-test:latest,dest=${OUTPUT_FILE}"

echo "Carregando imagem no Docker..."
docker load < "${OUTPUT_FILE}"
rm "${OUTPUT_FILE}"

echo "Verificando imagem criada..."
docker images | grep buildkit-test

echo "Testando execução da imagem..."
docker run --rm buildkit-test:latest

echo "Teste do BuildKit concluído!"

# Exibir métricas do BuildKit
echo "Métricas do BuildKit:"
buildctl debug info

# Exibir workers disponíveis
echo "Workers BuildKit:"
buildctl debug workers