#!/bin/bash
set -e

echo "Corrigindo configuração do BuildKit..."

# Parar o serviço
sudo systemctl stop buildkit || true

# Criar diretório para o socket
sudo mkdir -p /run/buildkit
sudo chown root:root /run/buildkit
sudo chmod 755 /run/buildkit

# Atualizar serviço systemd para garantir diretório
sudo tee /etc/systemd/system/buildkit.service << 'EOF'
[Unit]
Description=BuildKit daemon
Documentation=https://github.com/moby/buildkit
After=network.target

[Service]
Type=simple
ExecStartPre=/bin/mkdir -p /run/buildkit
ExecStartPre=/bin/chown root:root /run/buildkit
ExecStartPre=/bin/chmod 755 /run/buildkit
ExecStart=/usr/local/bin/buildkitd --addr unix:///run/buildkit/buildkitd.sock --root /var/lib/buildkit --config /etc/buildkit/buildkitd.toml
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
sleep 3

# Verificar status
echo "Verificando status do serviço..."
sudo systemctl status buildkit

echo "Verificando logs do serviço..."
sudo journalctl -u buildkit --no-pager -n 20

echo "Verificando conexão com buildctl..."
buildctl debug workers

echo "Correção do BuildKit concluída!"