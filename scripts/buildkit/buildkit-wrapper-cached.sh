#!/bin/bash
set -e

# Este script funciona como um wrapper para comandos buildctl
# com suporte a cache avançado

# Configuração do cache
CACHE_DIR="/var/cache/buildkit-cache"
REGISTRY_CACHE="localhost:5000/cache"

# Criar diretório temporário com permissões corretas
TEMP_DIR="/tmp/buildkit-tmp"
sudo mkdir -p "$TEMP_DIR"
sudo chmod 777 "$TEMP_DIR"

# Criar diretório de cache local
sudo mkdir -p "$CACHE_DIR"
sudo chmod 777 "$CACHE_DIR"

# Função para limpar arquivos temporários
cleanup() {
    echo "Limpando arquivos temporários..."
    sudo rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Função para executar buildctl com sudo
run_buildctl() {
    sudo buildctl "$@"
}

# Função para build com BuildKit e cache
buildkit_build() {
    local context=$1
    local dockerfile=$2
    local tag=$3
    local output_file="$TEMP_DIR/image.tar"

    echo "Building image from $dockerfile with BuildKit (cached)..."
    run_buildctl build \
        --frontend=dockerfile.v0 \
        --local context="$context" \
        --local dockerfile="$dockerfile" \
        --output "type=docker,name=$tag,dest=${output_file}" \
        --export-cache type=local,dest="$CACHE_DIR" \
        --import-cache type=local,src="$CACHE_DIR"

    echo "Loading image into Docker..."
    sudo docker load < "${output_file}"
    sudo rm -f "${output_file}"

    echo "Build completed successfully!"
}

# Função para build com cache do registry
buildkit_build_registry() {
    local context=$1
    local dockerfile=$2
    local tag=$3
    local output_file="$TEMP_DIR/image.tar"

    echo "Building image from $dockerfile with BuildKit (registry cache)..."
    run_buildctl build \
        --frontend=dockerfile.v0 \
        --local context="$context" \
        --local dockerfile="$dockerfile" \
        --output "type=docker,name=$tag,dest=${output_file}" \
        --export-cache type=registry,ref="$REGISTRY_CACHE" \
        --import-cache type=registry,ref="$REGISTRY_CACHE"

    echo "Loading image into Docker..."
    sudo docker load < "${output_file}"
    sudo rm -f "${output_file}"

    echo "Build completed successfully!"
}

# Função para limpar cache
clean_cache() {
    echo "Limpando cache local..."
    sudo rm -rf "$CACHE_DIR"/*
    sudo mkdir -p "$CACHE_DIR"
    sudo chmod 777 "$CACHE_DIR"
}

# Se nenhum argumento for fornecido, mostrar ajuda
if [ $# -eq 0 ]; then
    echo "BuildKit Wrapper with Cache - Uso:"
    echo "  $0 build <context> <dockerfile> <tag>     : Build com cache local"
    echo "  $0 build-registry <context> <dockerfile> <tag> : Build com cache do registry"
    echo "  $0 clean-cache                           : Limpar cache local"
    echo "  $0 debug                                 : Mostrar informações de debug"
    echo "  $0 workers                               : Listar workers"
    exit 1
fi

# Processar comandos
case "$1" in
    "build")
        if [ $# -ne 4 ]; then
            echo "Uso: $0 build <context> <dockerfile> <tag>"
            exit 1
        fi
        buildkit_build "$2" "$3" "$4"
        ;;
    "build-registry")
        if [ $# -ne 4 ]; then
            echo "Uso: $0 build-registry <context> <dockerfile> <tag>"
            exit 1
        fi
        buildkit_build_registry "$2" "$3" "$4"
        ;;
    "clean-cache")
        clean_cache
        ;;
    "debug")
        run_buildctl debug info
        ;;
    "workers")
        run_buildctl debug workers
        ;;
    *)
        echo "Comando desconhecido: $1"
        exit 1
        ;;
esac