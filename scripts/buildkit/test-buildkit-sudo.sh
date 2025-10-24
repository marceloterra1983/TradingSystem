#!/bin/bash
set -e

echo "Testando BuildKit com wrapper..."

# Criar diretório de teste
TEST_DIR="tools/tests/buildkit-test"
mkdir -p $TEST_DIR

# Executar build com wrapper
echo "Executando build de teste..."
./scripts/buildkit/buildkit-wrapper.sh build \
    "$TEST_DIR" \
    "$TEST_DIR" \
    "buildkit-test:latest"

echo "Verificando imagem criada..."
docker images | grep buildkit-test

echo "Testando execução da imagem..."
docker run --rm buildkit-test:latest

echo "Teste do BuildKit concluído!"

# Exibir informações do BuildKit
echo "Informações do BuildKit:"
./scripts/buildkit/buildkit-wrapper.sh debug

echo "Workers do BuildKit:"
./scripts/buildkit/buildkit-wrapper.sh workers