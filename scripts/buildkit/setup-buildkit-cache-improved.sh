#!/bin/bash

echo "BuildKit Cache Setup - Pre-requisites Check"
echo "----------------------------------------"
echo "This script requires sudo access. Please run the following commands manually:"
echo
echo "1. Criar diretório BuildKit:"
echo "   sudo mkdir -p /etc/buildkit"
echo
echo "2. Ajustar permissões:"
echo "   sudo chown root:root /etc/buildkit"
echo
echo "3. Criar arquivo de configuração:"
echo "   sudo tee /etc/buildkit/buildkitd.toml << 'EOF'
[worker.oci]
  max-parallelism = 4

[worker.containerd]
  enabled = true
  snapshotter = \"overlayfs\"

[registry.\"docker.io\"]
  mirrors = [\"https://registry-1.docker.io\"]

[registry.\"localhost:5000\"]
  http = true
  insecure = true

# Cache configuration
[worker.oci.gc]
  enabled = true
  policy = [
    { keepDuration = \"48h\", filters = [ \"type==source.local\", \"type==exec.cachemount\", \"type==source.git.checkout\" ] },
    { keepDuration = \"1440h\", keepBytes = \"100GB\" },
  ]

# Cache exporters
[[worker.oci.gcpolicy]]
  keepBytes = \"100GB\"
  keepDuration = \"1440h\"
  filters = [ \"type==source.local\" ]
[[worker.oci.gcpolicy]]
  keepBytes = \"100GB\"
  keepDuration = \"1440h\"
  filters = [ \"type==exec.cachemount\" ]

# Resource limits
[limits]
  memory = \"8GB\"
  cpu = 4.0

# Logging configuration
[debug]
  address = \"tcp://127.0.0.1:6060\"
  enabled = true
  format = \"json\"
  level = \"info\"
EOF"
echo
echo "4. Iniciar registry local (não requer sudo):"
echo "   docker compose --env-file .env -f tools/docker-compose.cache.yml up -d"
echo
echo "5. Reiniciar serviço BuildKit:"
echo "   sudo systemctl restart buildkit"
echo
echo "6. Verificar status:"
echo "   sudo systemctl status buildkit"
echo "   curl -s http://localhost:5000/v2/_catalog"
echo
echo "7. Testar cache (exemplo):"
echo "   buildctl build --frontend=dockerfile.v0 \\"
echo "     --local context=. \\"
echo "     --local dockerfile=. \\"
echo "     --export-cache type=registry,ref=localhost:5000/cache,mode=max \\"
echo "     --import-cache type=registry,ref=localhost:5000/cache"
echo
echo "Deseja executar a parte não-privilegiada do script (setup do registry)? [y/N]"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
then
    echo "Iniciando registry local..."
    docker compose --env-file .env -f tools/docker-compose.cache.yml up -d

    echo "Aguardando registry ficar disponível..."
    timeout 30 bash -c 'until curl -s -f http://localhost:5000/v2/ > /dev/null 2>&1; do sleep 1; done'

    echo "Registry está pronto!"
    echo "Execute os comandos sudo manualmente para completar a configuração."
else
    echo "Script finalizado. Execute os comandos manualmente quando estiver pronto."
fi
