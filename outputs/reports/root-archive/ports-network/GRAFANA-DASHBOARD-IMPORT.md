# 📊 Grafana Dashboard Import Guide

**Dashboard**: RAG Services Overview  
**Panels**: 4 (Circuit Breakers, Latency, Failures, Kong Requests)  
**Datasource**: Prometheus

---

## 🚀 Quick Import (3 Steps)

### Step 1: Access Grafana
```
URL: http://localhost:3100
Username: admin
Password: admin (change in production!)
```

### Step 2: Import Dashboard
1. Click **"+"** (left sidebar) → **"Import"**
2. Click **"Upload JSON file"**
3. Select: `tools/monitoring/dashboards/rag-services-overview.json`
4. Select Datasource: **"Prometheus"**
5. Click **"Import"**

### Step 3: Verify Panels
Dashboard should show:
- ✅ Circuit Breaker States (stat panel)
- ✅ RAG Query Latency P95 (graph)
- ✅ Circuit Breaker Failures (graph)
- ✅ Kong Request Rate (graph)

---

## 📊 Dashboard Panels Explained

### Panel 1: Circuit Breaker States
**Metric**: `circuit_breaker_state`  
**Values**:
- 0 = Closed (healthy) ✅
- 1 = Open (failing) ❌
- 2 = Half-Open (recovering) ⚠️

**What to watch**: All should be 0 (closed)

---

### Panel 2: RAG Query Latency P95
**Metric**: `histogram_quantile(0.95, rate(rag_query_duration_seconds_bucket[5m]))`  
**Threshold**: < 500ms
**Current Baseline**: ~6-10ms

**What to watch**: Spikes > 500ms indicate performance issues

---

### Panel 3: Circuit Breaker Failures (Rate)
**Metric**: `rate(circuit_breaker_failures_total[5m])`  
**Threshold**: Should be near 0

**What to watch**: Sustained failures indicate upstream service issues

---

### Panel 4: Kong Request Rate
**Metric**: `rate(kong_http_requests_total[5m])`  
**Shows**: Requests per second through Kong Gateway

**What to watch**: Traffic patterns, rate limit triggers

---

## 🔧 Prometheus Configuration

**Already configured** in `tools/monitoring/prometheus-rag.yml`:

```yaml
scrape_configs:
  - job_name: 'rag-service'
    targets: ['rag-service:3000']
    metrics_path: '/prometheus-metrics'
    
  - job_name: 'llamaindex-query'
    targets: ['rag-llamaindex-query:8000']
    
  - job_name: 'kong'
    targets: ['kong-gateway:8001']
    
  - job_name: 'qdrant'
    targets: ['data-qdrant:6333']
```

---

## ✅ Verify Metrics Are Flowing

### Check Prometheus Targets
```
http://localhost:9090/targets

Expected: All targets "UP"
```

### Query Metrics
```bash
# Circuit breaker states
curl 'http://localhost:9090/api/v1/query?query=circuit_breaker_state' | jq '.data.result'

# Query duration
curl 'http://localhost:9090/api/v1/query?query=rag_query_duration_seconds' | jq '.data.result'
```

---

## 🎯 Recommended Alerts

### Critical Alerts
```yaml
# Alert if circuit breaker open > 5 minutes
- alert: CircuitBreakerOpen
  expr: circuit_breaker_state == 1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Circuit breaker {{ $labels.breaker_name }} is open"

# Alert if P95 latency > 1 second
- alert: HighLatency
  expr: histogram_quantile(0.95, rate(rag_query_duration_seconds_bucket[5m])) > 1
  for: 5m
  labels:
    severity: warning
```

---

## 📱 Optional: Configure Alerting

### Email Alerts (Prometheus Alertmanager)
```yaml
# alertmanager.yml
receivers:
  - name: 'email'
    email_configs:
      - to: 'ops@tradingsystem.local'
        from: 'prometheus@tradingsystem.local'
        smarthost: 'smtp.gmail.com:587'
```

### Slack Alerts
```yaml
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
```

---

## 🎨 Grafana Tips

### Customize Dashboard
- **Edit Panel**: Click panel title → "Edit"
- **Adjust Time Range**: Top right (Last 1h, 6h, 24h, 7d)
- **Add Variables**: Dashboard settings → Variables
- **Clone Dashboard**: Dashboard settings → "Save As"

### Best Practices
- Set refresh to 10s for real-time monitoring
- Create alerts for critical thresholds
- Export dashboard JSON for version control
- Use annotations for deployments

---

## ✅ Success Checklist

- [ ] Grafana accessible at http://localhost:3100
- [ ] Prometheus datasource connected
- [ ] RAG Services dashboard imported
- [ ] All 4 panels showing data
- [ ] Circuit breaker metrics visible
- [ ] Query latency graph populating
- [ ] Kong requests being tracked
- [ ] Refresh rate set to 10s

---

**Grafana Version**: Latest (from native install)  
**Dashboard Version**: 1.0  
**Last Updated**: 2025-11-03  
**Status**: ✅ Ready to import

