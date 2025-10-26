---
title: Documentation API Guide
sidebar_position: 40
tags: [documentation-api, express, lowdb, backend]
domain: backend
type: guide
summary: Guide for the documentation API (systems registry, ideas, uploads)
status: active
last_review: "2025-10-17"
---

# Documentation API Guide

## 1. Overview

Node 18 + Express API responsible for:
- Registering documentation systems (name, port, status, colour, icon).
- Managing documentation ideas (shared with the dashboard).
- Handling file uploads via multer (documents, images).

Persistence: LowDB (`db/db.json`). Responses set `Content-Type: application/json; charset=utf-8` by default.

## 2. Setup

```powershell
cd backend/api/documentation-api/src
npm install
npm start      # default port 5175
```

Sample `.env`:
```
PORT=5175
NODE_ENV=development
DB_PATH=../db/db.json
UPLOAD_DIR=../uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:5173,http://localhost:3200
LOG_LEVEL=info
```

## 3. Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/health | Health check. |
| GET/POST | /api/systems | List or create documentation systems. |
| GET/POST/PUT/DELETE | /api/items | CRUD for documentation ideas. |
| POST | /api/items/:id/files | Upload file for an idea. |
| DELETE | /api/files/:id | Delete file metadata. |
| GET | /api/stats | Aggregated stats (status, category, priority). |

## 4. Uploads

- Default directory: `../uploads` (auto-created).
- Files renamed `timestamp-random-originalname` to avoid collisions.
- Ensure Windows permissions allow the Node process to write/read.

## 5. Logging

- Current logging uses console; migrate to pino for parity with Idea Bank.
- Errors return payload `{ success: false, error }` with status code.

## 6. Dashboard integration

- ConnectionsPage consumes `/api/health`.
- Future modules can use `/api/systems` and `/api/items` to display documentation data.

## 7. Roadmap

- Adopt pino logging.
- Move persistence to PostgreSQL/Timescale.
- Implement authentication and quotas for uploads.
- Maintain `documentation-api.openapi.yaml` alongside code changes (veja `../api/specs/documentation-api.openapi.yaml`).
