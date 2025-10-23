#!/bin/bash
set -e

echo "Configurando BuildKit..."

# Criar arquivo de configuração buildkitd
echo "Criando arquivo de configuração buildkitd.toml..."
sudo tee /etc/buildkit/buildkitd.toml << 'EOF'
[worker.oci]
  max-parallelism = 4

[worker.containerd]
  enabled = true
  snapshotter = "overlayfs"

[registry."docker.io"]
  mirrors = ["https://registry-1.docker.io"]

[registry."localhost:5000"]
  http = true
  insecure = true

# Cache configuration
[worker.oci.gc]
  enabled = true
  policy = [
    { keepDuration = "48h", filters = [ "type==source.local", "type==exec.cachemount", "type==source.git.checkout" ] },
    { keepDuration = "1440h", keepBytes = "100GB" },
  ]

# Cache exporters
[[worker.oci.gcpolicy]]
  keepBytes = "100GB"
  keepDuration = "1440h"
  filters = [ "type==source.local" ]
[[worker.oci.gcpolicy]]
  keepBytes = "100GB"
  keepDuration = "1440h"
  filters = [ "type==exec.cachemount" ]

# Resource limits
[limits]
  memory = "8GB"
  cpu = 4.0

# Logging configuration
[debug]
  address = "tcp://127.0.0.1:6060"
  enabled = true
  format = "json"
  level = "info"
EOF

echo "Criando serviço systemd..."
# Criar serviço systemd
sudo tee /etc/systemd/system/buildkit.service << 'EOF'
[Unit]
Description=BuildKit daemon
Documentation=https://github.com/moby/buildkit
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/buildkitd --config /etc/buildkit/buildkitd.toml
Restart=always
RestartSec=5
LimitNOFILE=1048576
LimitNPROC=infinity
LimitCORE=infinity

[Install]
WantedBy=multi-user.target
EOF

echo "Recarregando daemon systemd..."
sudo systemctl daemon-reload

echo "Habilitando serviço BuildKit..."
sudo systemctl enable buildkit

echo "Iniciando serviço BuildKit..."
sudo systemctl start buildkit

echo "Verificando status do serviço..."
sudo systemctl status buildkit

echo "Verificando conexão com buildctl..."
buildctl debug workers

echo "Configuração do BuildKit concluída!"
echo "Para verificar os logs: sudo journalctl -u buildkit"
echo "Para verificar o status: sudo systemctl status buildkit"