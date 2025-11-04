# Qdrant Cluster Configuration

**Version:** 2.0.0  
**Topology:** 3-node cluster with Raft consensus  
**Load Balancer:** NGINX (least_conn algorithm)  
**Purpose:** High Availability vector database for RAG embeddings  
**Last Updated:** 2025-11-03

---

## Cluster Topology

```
┌──────────────┐
│ Applications │
│ (LlamaIndex) │
└──────┬───────┘
       │ gRPC :6333
       ↓
┌──────────────────┐
│ NGINX Load       │  Algorithm: least_conn
│ Balancer         │  Health checks: 5s interval
└──────┬───────────┘
       │
       ├─────────────┬─────────────┐
       ↓             ↓             ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Node 1       │ │ Node 2       │ │ Node 3       │
│ (Leader)     │ │ (Follower)   │ │ (Follower)   │
│ :6333, :6335 │ │ :6334, :6336 │ │ :6337, :6338 │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┴────────────────┘
            Raft Consensus Protocol
            (Leader election, replication)
```

---

## Quick Start

### Deploy Cluster

```bash
# Automated setup
bash scripts/qdrant/init-cluster.sh

# Or manual
docker compose -f tools/compose/docker-compose.qdrant-cluster.yml up -d
```

### Verify Cluster

```bash
# Check cluster status
curl http://localhost:6333/cluster | jq

# Expected output:
# {
#   "status": "enabled",
#   "peer_id": "...",
#   "peers": {
#     "...": { "uri": "http://qdrant-node-2:6335" },
#     "...": { "uri": "http://qdrant-node-3:6335" }
#   },
#   "raft_info": {
#     "role": "Leader",
#     "term": 1,
#     "commit": 123,
#     "pending_operations": 0
#   }
# }
```

### Test Load Balancing

```bash
# Send 10 requests, observe round-robin distribution
for i in {1..10}; do
  curl -s http://localhost:6333/health
  echo "Request $i routed"
done

# Check NGINX access logs
docker logs qdrant-lb 2>&1 | tail -20
```

---

## Cluster Operations

### Add Collection

```bash
# Create collection (via load balancer)
curl -X PUT http://localhost:6333/collections/test_collection \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    },
    "replication_factor": 3
  }'
```

### Check Replication Status

```bash
# Query each node for collection info
for port in 6333 6334 6337; do
  echo "Node on port $port:"
  curl -s http://localhost:$port/collections/test_collection | jq '.result.points_count'
done

# All nodes should report same point count
```

### Failover Test

```bash
# 1. Stop leader node
docker stop qdrant-node-1

# 2. Wait for election (~ 1-2 seconds)
sleep 3

# 3. Check new leader via Node 2
curl http://localhost:6334/cluster | jq '.raft_info.role'
# Expected: "Leader"

# 4. Verify load balancer still works
curl http://localhost:6333/health
# Expected: 200 OK (routes to healthy nodes)

# 5. Restart original node
docker start qdrant-node-1

# 6. Verify re-join
sleep 10
curl http://localhost:6333/cluster | jq '.peers | length'
# Expected: 2 (3 total nodes)
```

---

## Configuration

### Cluster Settings

| Parameter | Value | Description |
|-----------|-------|-------------|
| `QDRANT__CLUSTER__ENABLED` | `true` | Enable cluster mode |
| `QDRANT__CLUSTER__P2P__PORT` | `6335` | Raft consensus port |
| `QDRANT__CLUSTER__CONSENSUS__TICK_PERIOD_MS` | `100` | Heartbeat interval |
| `QDRANT__CLUSTER__CONSENSUS__BOOTSTRAP` | `http://qdrant-node-1:6335` | Initial leader for nodes 2 & 3 |

### Load Balancer Settings

| Parameter | Value | Description |
|-----------|-------|-------------|
| Algorithm | `least_conn` | Route to least busy node |
| Health Check Interval | `5s` | Active health checks |
| Fail Timeout | `30s` | Mark unhealthy after 3 failures |
| Max Fails | `3` | Failures before marking down |

---

## Performance

### Expected Metrics

```
Search Latency:
  - P50: 5-6ms
  - P95: 7-8ms
  - P99: 10-12ms

Throughput:
  - Single node: 300-400 qps
  - Cluster (3 nodes): 900-1200 qps
  - Load balanced: ~1000 qps sustained

Replication Lag:
  - Typical: < 50ms
  - Max observed: < 200ms
  - Acceptable for RAG use case
```

### Resource Utilization

```
Per Node:
  - RAM: 2GB
  - CPU: 1 core
  - Storage: 30GB

Total Cluster:
  - RAM: 6GB (3 nodes) + 256MB (NGINX) = 6.25GB
  - CPU: 3 cores + 0.25 core = 3.25 cores
  - Storage: 90GB (3x30GB)
```

---

## Monitoring

### Health Checks

```bash
# All nodes via load balancer
curl http://localhost:6333/health

# Individual nodes
curl http://localhost:6333/health  # Node 1
curl http://localhost:6334/health  # Node 2
curl http://localhost:6337/health  # Node 3

# NGINX load balancer
curl http://localhost:6333/health  # Returns "NGINX LB Healthy"
```

### Cluster Metrics

```bash
# Cluster-wide statistics
curl http://localhost:6333/cluster | jq '{
  role: .raft_info.role,
  term: .raft_info.term,
  peers: (.peers | length),
  pending_ops: .raft_info.pending_operations
}'

# Per-collection statistics
curl http://localhost:6333/collections/docs_index_mxbai | jq '{
  points_count: .result.points_count,
  segments_count: .result.segments_count,
  status: .result.status
}'
```

---

## Backup & Recovery

### Create Snapshot

```bash
# Create snapshot on each node
for port in 6333 6334 6337; do
  echo "Creating snapshot on node :$port"
  curl -X POST http://localhost:$port/collections/docs_index_mxbai/snapshots
done
```

### List Snapshots

```bash
# List snapshots
curl http://localhost:6333/collections/docs_index_mxbai/snapshots | jq
```

### Restore from Snapshot

```bash
# Download snapshot
curl http://localhost:6333/collections/docs_index_mxbai/snapshots/snapshot-name \
  -o /tmp/qdrant_snapshot.snapshot

# Restore (requires Qdrant CLI or API)
# See: https://qdrant.tech/documentation/guides/administration/#snapshots
```

---

## Troubleshooting

### Cluster Not Forming

```bash
# Check if nodes can reach each other
docker exec qdrant-node-2 ping -c 3 qdrant-node-1
docker exec qdrant-node-3 ping -c 3 qdrant-node-1

# Check P2P ports
docker exec qdrant-node-1 netstat -tuln | grep 6335
```

### Split Brain Detection

```bash
# Check Raft role on all nodes (should have only 1 leader)
for port in 6333 6334 6337; do
  echo "Node :$port role:"
  curl -s http://localhost:$port/cluster | jq -r '.raft_info.role'
done

# Expected output:
# Leader
# Follower
# Follower
```

### Performance Degradation

```bash
# Check segment count (high = needs optimization)
curl http://localhost:6333/collections/docs_index_mxbai | jq '.result.segments_count'

# Trigger optimization if needed
curl -X POST http://localhost:6333/collections/docs_index_mxbai/optimizer
```

---

## References

- [Qdrant Clustering Guide](https://qdrant.tech/documentation/guides/distributed_deployment/)
- [Raft Consensus Algorithm](https://raft.github.io/)
- [NGINX Load Balancing](https://nginx.org/en/docs/http/load_balancing.html)

---

**Maintained By:** TradingSystem Infrastructure Team  
**Support:** #infrastructure (Slack)  
**Last Review:** 2025-11-03


