#!/bin/bash
set -e

echo "Setting up BuildKit distributed cache..."

# Start registry container
docker compose --env-file .env -f tools/docker-compose.cache.yml up -d

# Wait for registry to be ready
echo "Waiting for registry to be ready..."
timeout 30 bash -c 'until curl -s -f http://localhost:5000/v2/ > /dev/null 2>&1; do sleep 1; done'

# Update BuildKit configuration to use the registry cache
cat << EOF | sudo tee /etc/buildkit/buildkitd.toml
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

# Restart BuildKit to apply new configuration
sudo systemctl restart buildkit

# Create cache monitoring configuration
cat << EOF | sudo tee /etc/buildkit/monitoring.toml
[metrics]
  [metrics.prometheus]
    enabled = true
    address = ":9502"

[cache]
  [cache.monitoring]
    enabled = true
    interval = "1m"
    retention = "24h"
EOF

echo "Testing cache configuration..."
buildctl debug workers

echo "Cache setup completed! You can now use the cache with:"
echo "buildctl build --frontend=dockerfile.v0 --local context=. --local dockerfile=. --export-cache type=registry,ref=localhost:5000/cache,mode=max --import-cache type=registry,ref=localhost:5000/cache"

# Setup Prometheus monitoring for cache metrics
cat << EOF > tools/monitoring/prometheus/buildkit.yml
scrape_configs:
  - job_name: 'buildkit'
    static_configs:
      - targets: ['localhost:9502']
    metrics_path: '/metrics'
    scheme: 'http'
EOF

echo "Cache monitoring configuration created. Add to your Prometheus configuration."
