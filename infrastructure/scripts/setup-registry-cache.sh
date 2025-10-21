#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "Configurando Registry Local para BuildKit Cache..."

# Garantir diretório de configuração
mkdir -p "${ROOT_DIR}/infrastructure/registry"

# Configurar registry com suporte a cache
cat > "${ROOT_DIR}/infrastructure/registry/config.yml" << 'EOF'
version: 0.1
log:
  fields:
    service: registry
storage:
  cache:
    blobdescriptor: inmemory
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: true
http:
  addr: :5000
  headers:
    X-Content-Type-Options: [nosniff]
maintenance:
  uploadpurging:
    enabled: true
    age: 168h
    interval: 24h
    dryrun: false
health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3
EOF

CONTAINER_NAME="outros-containers-registry"
VOLUME_NAME="outros-containers_registry-data"

echo "Parando registry local (se existente)..."
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo "Iniciando registry local..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart always \
  -p 5000:5000 \
  -v "${ROOT_DIR}/infrastructure/registry/config.yml:/etc/docker/registry/config.yml:ro" \
  -v "${VOLUME_NAME}:/var/lib/registry" \
  registry:2

# Esperar registry ficar disponível
echo "Aguardando registry inicializar..."
until curl -s -f http://localhost:5000/v2/ > /dev/null 2>&1; do
    echo "Aguardando registry..."
    sleep 1
done

echo "Configurando Docker para usar registry inseguro..."
# Configurar Docker para aceitar registry inseguro
cat << EOF | sudo tee /etc/docker/daemon.json
{
    "insecure-registries": ["localhost:5000"]
}
EOF

# Reiniciar Docker daemon
echo "Reiniciando Docker daemon..."
sudo systemctl restart docker

# Esperar Docker reiniciar
sleep 5

echo "Testando registry..."
curl -s http://localhost:5000/v2/_catalog

echo "Registry configurado com sucesso!"
echo
echo "Para usar o cache do registry em seus builds:"
echo "buildctl build ... --export-cache type=registry,ref=localhost:5000/cache --import-cache type=registry,ref=localhost:5000/cache"
