---
title: Monitoring Guide
sidebar_position: 1
tags: [ops, monitoring, overview, index]
domain: ops
type: index
summary: Central place to understand observability coverage and alert routing
status: active
last_review: "2025-10-17"
---

# Monitoring Guide

Monitoring marries Prometheus metrics, Grafana dashboards, and alert routing to keep the trading desk informed.

| Doc | Focus |
|-----|-------|
| [prometheus-setup.md](prometheus-setup.md) | How metrics are scraped, retention policies, and scrape intervals. |
| [grafana-dashboards.md](grafana-dashboards.md) | Dashboard inventory with panels and ownership. |
| [alerting-policy.md](alerting-policy.md) | Alert severity levels, notification channels, and escalation paths. |

## Maintaining Signal Quality

- Review alert fatigue metrics monthly and tune thresholds accordingly.
- Keep dashboard screenshots in change requests so reviewers see the impact.
- Sync with backend data team before modifying histogram buckets or quantiles.
