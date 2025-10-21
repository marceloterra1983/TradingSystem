#!/bin/bash
set -e

# Este script funciona como um wrapper para comandos buildctl
# Ele usa sudo quando necessário e gerencia as permissões adequadamente

# Criar diretório temporário com permissões corretas
TEMP_DIR="/tmp/buildkit-tmp"
sudo mkdir -p "$TEMP_DIR"
sudo chmod 777 "$TEMP_DIR"

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

# Função para build com BuildKit
buildkit_build() {
    local context=$1
    local dockerfile=$2
    local tag=$3
    local output_file="$TEMP_DIR/image.tar"

    echo "Building image from $dockerfile with BuildKit..."
    run_buildctl build \
        --frontend=dockerfile.v0 \
        --local context="$context" \
        --local dockerfile="$dockerfile" \
        --output "type=docker,name=$tag,dest=${output_file}"

    echo "Loading image into Docker..."
    sudo docker load < "${output_file}"
    sudo rm -f "${output_file}"

    echo "Build completed successfully!"
}

# Se nenhum argumento for fornecido, mostrar ajuda
if [ $# -eq 0 ]; then
    echo "BuildKit Wrapper - Uso:"
    echo "  $0 build <context> <dockerfile> <tag>  : Build uma imagem"
    echo "  $0 debug                              : Mostrar informações de debug"
    echo "  $0 workers                            : Listar workers"
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