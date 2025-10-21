# Laucher Specification

## Purpose
Expose orchestration and health status for auxiliary services managed alongside the trading platform.

## Requirements

### Requirement: Report Individual Service Status
The system SHALL return the status of each managed service when queried.

#### Scenario: GET /api/status succeeds
- WHEN a client sends `GET /api/status`
- THEN the response status is `200 OK`
- AND the body includes an array of services with `name`, `status`, and `updatedAt` fields.
