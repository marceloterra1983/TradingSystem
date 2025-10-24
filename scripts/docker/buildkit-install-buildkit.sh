#!/bin/bash
set -e

# Add Moby BuildKit repository
. /etc/os-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/${ID}/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} \
  ${VERSION_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install BuildKit
sudo apt-get update
sudo apt-get install -y buildkit

# Create BuildKit daemon configuration
sudo mkdir -p /etc/buildkit
cat << EOF | sudo tee /etc/buildkit/buildkitd.toml
[worker.oci]
  max-parallelism = 4

[worker.containerd]
  enabled = true
  snapshotter = "overlayfs"

[registry."docker.io"]
  mirrors = ["https://registry-1.docker.io"]

# Cache configuration
[worker.oci.gc]
  enabled = true
  policy = [
    { keepDuration = "48h", filters = [ "type==source.local", "type==exec.cachemount", "type==source.git.checkout" ] },
    { keepDuration = "1440h", keepBytes = "100GB" },
  ]

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

# Create systemd service
cat << EOF | sudo tee /etc/systemd/system/buildkit.service
[Unit]
Description=BuildKit daemon
Documentation=https://github.com/moby/buildkit
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/buildkitd --config /etc/buildkit/buildkitd.toml
Restart=always
RestartSec=5
LimitNOFILE=1048576
LimitNPROC=infinity
LimitCORE=infinity

[Install]
WantedBy=multi-user.target
EOF

# Start and enable service
sudo systemctl daemon-reload
sudo systemctl enable buildkit
sudo systemctl start buildkit

# Install buildctl (client)
sudo apt-get install -y buildctl

echo "BuildKit installation completed!"
echo "Checking service status..."
sudo systemctl status buildkit

echo "Testing buildctl..."
buildctl debug workers