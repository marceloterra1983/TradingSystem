#!/bin/bash
set -e

echo "Testando BuildKit com cache..."

# Criar diretório de teste
TEST_DIR="tools/tests/buildkit-test"
mkdir -p $TEST_DIR

# Criar Dockerfile com múltiplas camadas para testar cache
cat > $TEST_DIR/Dockerfile << 'EOF'
FROM alpine:latest as builder

# Primeira camada - instalação de dependências
RUN apk add --no-cache curl

# Segunda camada - download de arquivo
RUN curl -o /tmp/example.txt https://example.com/

# Terceira camada - processamento
RUN echo "BuildKit Cache Test" > /tmp/test.txt && \
    cat /tmp/example.txt >> /tmp/test.txt

# Imagem final
FROM alpine:latest
COPY --from=builder /tmp/test.txt /app/test.txt
CMD ["cat", "/app/test.txt"]
EOF

echo "Primeira build (sem cache)..."
time ./scripts/buildkit/buildkit-wrapper-cached.sh build \
    "$TEST_DIR" \
    "$TEST_DIR" \
    "buildkit-cache-test:latest"

echo "Segunda build (com cache)..."
time ./scripts/buildkit/buildkit-wrapper-cached.sh build \
    "$TEST_DIR" \
    "$TEST_DIR" \
    "buildkit-cache-test:v2"

echo "Verificando imagens criadas..."
docker images | grep buildkit-cache-test

echo "Testando execução da imagem..."
docker run --rm buildkit-cache-test:latest

echo "Teste do cache BuildKit concluído!"

# Testar build com cache do registry
echo "Testando build com cache do registry..."
time ./scripts/buildkit/buildkit-wrapper-cached.sh build-registry \
    "$TEST_DIR" \
    "$TEST_DIR" \
    "buildkit-cache-test:registry"

echo "Teste completo do BuildKit com cache concluído!"