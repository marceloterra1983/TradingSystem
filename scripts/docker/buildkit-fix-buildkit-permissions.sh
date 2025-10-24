#!/bin/bash
set -e

echo "Configurando permissões do BuildKit..."

# Criar grupo buildkit
echo "Criando grupo buildkit..."
sudo groupadd -f buildkit

# Adicionar usuário atual ao grupo
echo "Adicionando usuário ao grupo buildkit..."
sudo usermod -aG buildkit $USER

# Atualizar serviço systemd com permissões corretas
echo "Atualizando configuração do serviço..."
sudo tee /etc/systemd/system/buildkit.service << 'EOF'
[Unit]
Description=BuildKit daemon
Documentation=https://github.com/moby/buildkit
After=network.target

[Service]
Type=simple
ExecStartPre=/bin/mkdir -p /run/buildkit
ExecStartPre=/bin/chown root:buildkit /run/buildkit
ExecStartPre=/bin/chmod 2775 /run/buildkit
ExecStartPre=/bin/mkdir -p /var/lib/buildkit
ExecStartPre=/bin/chown root:buildkit /var/lib/buildkit
ExecStartPre=/bin/chmod 2775 /var/lib/buildkit
ExecStart=/usr/local/bin/buildkitd --debug --root /var/lib/buildkit --addr unix:///run/buildkit/buildkitd.sock --group buildkit
Restart=always
RestartSec=5
LimitNOFILE=1048576
LimitNPROC=infinity
LimitCORE=infinity

[Install]
WantedBy=multi-user.target
EOF

# Recarregar configurações
echo "Recarregando daemon systemd..."
sudo systemctl daemon-reload

# Reiniciar serviço
echo "Reiniciando serviço BuildKit..."
sudo systemctl restart buildkit

# Aguardar serviço iniciar
echo "Aguardando serviço iniciar..."
sleep 5

echo "Configurando permissões do socket..."
sudo chown root:buildkit /run/buildkit/buildkitd.sock
sudo chmod 660 /run/buildkit/buildkitd.sock

echo "Verificando status do serviço..."
sudo systemctl status buildkit

echo "⚠️  IMPORTANTE: Para que as novas permissões tenham efeito, você precisa fazer logout e login novamente"
echo "                ou executar: 'newgrp buildkit' no terminal atual."
echo
echo "Execute o seguinte comando para ativar o novo grupo sem fazer logout:"
echo "newgrp buildkit"