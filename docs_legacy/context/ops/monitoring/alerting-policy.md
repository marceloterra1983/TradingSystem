---
title: Alerting Policy
sidebar_position: 30
tags: [ops, alerting, monitoring, policy]
domain: ops
type: reference
summary: Define alert rules and escalation procedures
status: active
last_review: "2025-10-17"
---

# Alerting Policy

- Critical alerts: service down, ProfitDLL disconnect, order manager failure.
- Warning alerts: API latency > 500 ms, queue depth or error rate spikes.
- Escalation path: on-call engineer -> lead -> stakeholders.
- Notification channels: email, Teams/Slack (to be determined).