#!/bin/bash
set -e

echo "Configurando BuildKit (configuração simplificada)..."

# Parar o serviço
sudo systemctl stop buildkit || true

# Atualizar configuração do BuildKit
sudo tee /etc/buildkit/buildkitd.toml << 'EOF'
debug = true
# Root directory for buildkit state
root = "/var/lib/buildkit"
[worker.oci]
  enabled = true
  # Use overlayfs snapshotter
  snapshotter = "overlayfs"
  gc = true
  gckeepstorage = 50000

[registry."docker.io"]
  mirrors = ["https://registry-1.docker.io"]
EOF

# Atualizar serviço systemd
sudo tee /etc/systemd/system/buildkit.service << 'EOF'
[Unit]
Description=BuildKit daemon
Documentation=https://github.com/moby/buildkit
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/buildkitd --debug --root /var/lib/buildkit
Restart=always
RestartSec=5
LimitNOFILE=1048576
LimitNPROC=infinity
LimitCORE=infinity

[Install]
WantedBy=multi-user.target
EOF

# Criar diretório para dados do BuildKit
sudo mkdir -p /var/lib/buildkit
sudo chown root:root /var/lib/buildkit
sudo chmod 755 /var/lib/buildkit

# Recarregar configurações
echo "Recarregando daemon systemd..."
sudo systemctl daemon-reload

# Reiniciar serviço
echo "Reiniciando serviço BuildKit..."
sudo systemctl restart buildkit

# Aguardar serviço iniciar
echo "Aguardando serviço iniciar..."
sleep 5

# Verificar status
echo "Verificando status do serviço..."
sudo systemctl status buildkit

echo "Testando conexão buildctl..."
buildctl debug workers || echo "Aguardando BuildKit inicializar..."
sleep 5
buildctl debug workers

echo "Verificando logs..."
sudo journalctl -u buildkit --no-pager -n 20