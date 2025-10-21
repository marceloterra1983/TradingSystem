#!/bin/bash
set -e

echo "Testando BuildKit..."

# Criar diretório de teste
TEST_DIR="infrastructure/tests/buildkit-test"
mkdir -p $TEST_DIR

# Executar build com BuildKit
echo "Executando build de teste..."
buildctl build \
    --frontend=dockerfile.v0 \
    --local context=$TEST_DIR \
    --local dockerfile=$TEST_DIR \
    --output type=docker,name=buildkit-test:latest

echo "Verificando imagem criada..."
docker images | grep buildkit-test

echo "Testando execução da imagem..."
docker run --rm buildkit-test:latest

echo "Teste do BuildKit concluído!"

# Exibir métricas do BuildKit
echo "Métricas do BuildKit:"
buildctl debug info