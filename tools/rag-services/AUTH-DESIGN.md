# Authentication & Authorization Design

**Date:** 2025-11-01
**Status:** ✅ IMPLEMENTED
**Version:** 1.0.0

## Summary

The RAG Services API uses **JWT (JSON Web Tokens)** for authentication and **RBAC (Role-Based Access Control)** for authorization. This document describes the current implementation and best practices.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [JWT Token Structure](#jwt-token-structure)
4. [Role-Based Access Control](#role-based-access-control)
5. [Middleware Implementation](#middleware-implementation)
6. [Protected Routes](#protected-routes)
7. [Security Best Practices](#security-best-practices)
8. [Testing Authentication](#testing-authentication)
9. [Future Enhancements](#future-enhancements)

---

## Overview

### Authentication Mechanism
- **Method:** Bearer Token (JWT)
- **Header:** `Authorization: Bearer <token>`
- **Algorithm:** HS256 (HMAC with SHA-256)
- **Secret:** Environment variable `JWT_SECRET`
- **Expiration:** Configurable via `JWT_EXPIRES_IN` (default: "24h")

### Authorization Mechanism
- **Model:** Role-Based Access Control (RBAC)
- **Roles:** `admin`, `user`, `viewer`
- **Enforcement:** Route-level middleware decorators
- **Hierarchy:** admin > user > viewer

### Public vs Protected Endpoints

**Public Endpoints (No Auth Required):**
- Collection queries (GET)
- Model information (GET)
- Directory browsing (GET)
- Health check (GET)

**Protected Endpoints (JWT Required):**
- Collection mutations (POST, PUT, DELETE)
- Ingestion operations (POST)
- Admin operations (all `/admin/*`)
- Cache management (DELETE, POST)

---

## Authentication Flow

### 1. Token Generation (Server-Side)

The Documentation API (`backend/api/documentation-api`) generates JWT tokens for backend services:

```typescript
// src/routes/rag-status.js (Documentation API)
import jwt from 'jsonwebtoken';

const ragToken = jwt.sign(
  {
    userId: 'documentation-api',
    role: 'admin',
    service: 'documentation-api',
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
);
```

**Token Claims:**
```json
{
  "userId": "documentation-api",
  "role": "admin",
  "service": "documentation-api",
  "iat": 1698764400,
  "exp": 1698850800
}
```

### 2. Token Verification (RAG Services)

```typescript
// src/middleware/auth.ts
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;
const decoded = jwt.verify(token, secret) as JWTPayload;

// Token is valid, user authenticated
req.user = decoded;
```

### 3. Authorization Check

```typescript
// Check user role against required roles
if (!allowedRoles.includes(user.role)) {
  return sendError(res, 'FORBIDDEN', 'Insufficient permissions', 403);
}
```

---

## JWT Token Structure

### Payload Interface

```typescript
interface JWTPayload {
  userId: string;      // User or service identifier
  role: UserRole;      // 'admin' | 'user' | 'viewer'
  service?: string;    // Optional service name
  iat: number;         // Issued at timestamp
  exp: number;         // Expiration timestamp
}

type UserRole = 'admin' | 'user' | 'viewer';
```

### Environment Configuration

```bash
# .env
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
```

**Security Requirements:**
- Minimum secret length: 32 characters
- Recommendation: Use crypto.randomBytes(64).toString('hex')
- Production: Store in secrets manager (e.g., AWS Secrets Manager)

---

## Role-Based Access Control

### Role Hierarchy

| Role   | Level | Permissions                                    |
|--------|-------|------------------------------------------------|
| admin  | 3     | Full access to all endpoints                   |
| user   | 2     | Read/write collections, trigger ingestion      |
| viewer | 1     | Read-only access to collections and stats      |

### Role Assignment

**Current Implementation:**
- Service-to-service calls use `admin` role
- Frontend users would use `user` or `viewer` roles
- Roles are embedded in JWT during token generation

**Future Enhancement:**
- User registration and role management
- Database-backed role assignments
- Dynamic permission updates

### Permission Matrix

| Endpoint                           | viewer | user | admin |
|------------------------------------|--------|------|-------|
| GET /rag/collections               | ✅     | ✅   | ✅    |
| GET /rag/collections/{name}        | ✅     | ✅   | ✅    |
| GET /rag/collections/{name}/stats  | ✅     | ✅   | ✅    |
| POST /rag/collections              | ❌     | ✅   | ✅    |
| PUT /rag/collections/{name}        | ❌     | ✅   | ✅    |
| DELETE /rag/collections/{name}     | ❌     | ❌   | ✅    |
| POST /rag/collections/{name}/ingest| ❌     | ✅   | ✅    |
| GET /rag/models                    | ✅     | ✅   | ✅    |
| GET /rag/directories/*             | ✅     | ✅   | ✅    |
| GET /admin/cache/stats             | ❌     | ❌   | ✅    |
| DELETE /admin/cache/*              | ❌     | ❌   | ✅    |
| POST /admin/cache/cleanup          | ❌     | ❌   | ✅    |

---

## Middleware Implementation

### Available Middleware

#### 1. verifyJWT
**Purpose:** Require valid JWT token
**Usage:** Apply to protected routes

```typescript
import { verifyJWT } from '../middleware/auth';

router.post('/rag/collections', verifyJWT, async (req, res) => {
  // req.user is available
  const { userId, role } = req.user;
  // ... handle request
});
```

**Behavior:**
- Extracts token from `Authorization: Bearer <token>` header
- Validates token signature and expiration
- Attaches decoded payload to `req.user`
- Returns 401 if token missing/invalid
- Returns 401 if token expired

#### 2. requireRole
**Purpose:** Enforce role-based access
**Usage:** Apply after verifyJWT

```typescript
import { requireRole } from '../middleware/auth';

router.delete(
  '/rag/collections/:name',
  verifyJWT,
  requireRole(['admin']),
  async (req, res) => {
    // Only admins reach here
  }
);
```

**Behavior:**
- Checks `req.user.role` against allowed roles
- Returns 403 if role not allowed
- Supports multiple roles: `requireRole(['admin', 'user'])`

#### 3. optionalJWT
**Purpose:** Authenticate if token present, allow without
**Usage:** Endpoints with different behavior for authenticated users

```typescript
import { optionalJWT } from '../middleware/auth';

router.get('/rag/collections', optionalJWT, async (req, res) => {
  if (req.user) {
    // Authenticated - show private collections
  } else {
    // Anonymous - show public collections only
  }
});
```

**Behavior:**
- Validates token if present
- Does NOT return error if token missing
- Sets `req.user` to undefined if not authenticated

---

## Protected Routes

### Current Implementation

```typescript
// src/routes/collections.ts
import { verifyJWT, requireRole } from '../middleware/auth';

const router = Router();

// Public - No auth required
router.get('/', async (req, res) => { /* ... */ });
router.get('/:name', async (req, res) => { /* ... */ });
router.get('/:name/stats', async (req, res) => { /* ... */ });

// Protected - JWT required, any role
router.post('/', verifyJWT, async (req, res) => { /* ... */ });
router.put('/:name', verifyJWT, async (req, res) => { /* ... */ });
router.post('/:name/ingest', verifyJWT, async (req, res) => { /* ... */ });

// Protected - Admin only
router.delete('/:name', verifyJWT, requireRole(['admin']), async (req, res) => {
  /* ... */
});
```

```typescript
// src/routes/admin.ts
import { verifyJWT } from '../middleware/auth';

const router = Router();

// ALL admin routes require JWT
router.use(verifyJWT);

router.get('/cache/stats', async (req, res) => { /* ... */ });
router.delete('/cache/:key', async (req, res) => { /* ... */ });
router.delete('/cache', async (req, res) => { /* ... */ });
router.post('/cache/cleanup', async (req, res) => { /* ... */ });
```

---

## Security Best Practices

### ✅ Implemented

1. **JWT Secret Management**
   - Loaded from environment variables
   - Minimum 32 character requirement (validated at startup)
   - No secrets in code or version control

2. **Token Expiration**
   - Default: 24 hours
   - Configurable via `JWT_EXPIRES_IN`
   - Enforced by jwt.verify()

3. **Authorization Header Validation**
   - Strict format check: `Bearer <token>`
   - Rejects malformed headers
   - Clear error messages

4. **Role-Based Access**
   - Hierarchical role system
   - Fine-grained permission control
   - Explicit role checks in middleware

5. **Error Handling**
   - No token leakage in error messages
   - Consistent error codes (401, 403)
   - Structured error responses

### ⏳ Recommended Enhancements

1. **Token Refresh**
   - Implement refresh token mechanism
   - Shorter access token expiry (15 minutes)
   - Longer refresh token expiry (7 days)

2. **Token Revocation**
   - Maintain revoked token blacklist in Redis
   - Check on each request
   - Expire list entries after token expiry

3. **Rate Limiting**
   - Limit failed authentication attempts
   - Per-IP and per-user rate limits
   - Exponential backoff

4. **Audit Logging**
   - Log all authentication attempts
   - Track role changes
   - Monitor suspicious patterns

5. **HTTPS Enforcement**
   - Reject HTTP requests in production
   - HSTS headers
   - Secure cookie flags

6. **CORS Configuration**
   - Whitelist allowed origins
   - Validate origin headers
   - Restrict methods and headers

---

## Testing Authentication

### Manual Testing

#### 1. Generate JWT Token (Node.js REPL)

```bash
node
```

```javascript
const jwt = require('jsonwebtoken');

const secret = 'your-jwt-secret-from-env';

// Admin token
const adminToken = jwt.sign(
  { userId: 'test-admin', role: 'admin' },
  secret,
  { expiresIn: '24h' }
);
console.log('Admin Token:', adminToken);

// User token
const userToken = jwt.sign(
  { userId: 'test-user', role: 'user' },
  secret,
  { expiresIn: '24h' }
);
console.log('User Token:', userToken);

// Viewer token
const viewerToken = jwt.sign(
  { userId: 'test-viewer', role: 'viewer' },
  secret,
  { expiresIn: '24h' }
);
console.log('Viewer Token:', viewerToken);
```

#### 2. Test Protected Endpoint

```bash
# Without token (should fail with 401)
curl -X POST http://localhost:3401/api/v1/rag/collections \
  -H "Content-Type: application/json" \
  -d '{"name":"test","directory":"/data","embeddingModel":"mxbai-embed-large"}'

# With admin token (should succeed)
curl -X POST http://localhost:3401/api/v1/rag/collections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"name":"test","directory":"/data","embeddingModel":"mxbai-embed-large"}'

# With viewer token (should fail with 403)
curl -X DELETE http://localhost:3401/api/v1/rag/collections/test \
  -H "Authorization: Bearer YOUR_VIEWER_TOKEN"
```

### Automated Testing

```typescript
// src/__tests__/unit/auth.test.ts
import { verifyJWT, requireRole } from '../middleware/auth';
import jwt from 'jsonwebtoken';

describe('verifyJWT middleware', () => {
  it('should authenticate valid token', async () => {
    const token = jwt.sign(
      { userId: 'test', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const req = {
      headers: { authorization: `Bearer ${token}` }
    };

    await verifyJWT(req, res, next);
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe('test');
    expect(req.user.role).toBe('admin');
  });

  it('should reject expired token', async () => {
    const token = jwt.sign(
      { userId: 'test', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    const req = {
      headers: { authorization: `Bearer ${token}` }
    };

    await verifyJWT(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(401);
  });
});
```

---

## Future Enhancements

### 1. OAuth 2.0 Integration
**Priority:** P2
**Effort:** Large

```typescript
// Allow third-party authentication
router.get('/auth/google', passport.authenticate('google'));
router.get('/auth/github', passport.authenticate('github'));
```

### 2. API Key Authentication
**Priority:** P3
**Effort:** Medium

```typescript
// Alternative authentication for CLI/scripts
router.get('/collections', apiKeyAuth, async (req, res) => {
  // Authenticate via X-API-Key header
});
```

### 3. Multi-Factor Authentication (MFA)
**Priority:** P3
**Effort:** Large

```typescript
// Require TOTP for admin operations
router.delete('/collections/:name',
  verifyJWT,
  requireMFA,
  requireRole(['admin']),
  async (req, res) => { /* ... */ }
);
```

### 4. Session Management
**Priority:** P2
**Effort:** Medium

- Store active sessions in Redis
- Allow session termination
- Multi-device session tracking
- Concurrent session limits

### 5. Fine-Grained Permissions
**Priority:** P3
**Effort:** Large

```typescript
// Permission-based instead of role-based
router.delete('/collections/:name',
  verifyJWT,
  requirePermission('collections.delete'),
  async (req, res) => { /* ... */ }
);
```

---

## Configuration Reference

### Environment Variables

```bash
# Required
JWT_SECRET=your-secret-key-here-min-32-chars

# Optional
JWT_EXPIRES_IN=24h                    # Token expiry
JWT_ALGORITHM=HS256                   # Signing algorithm
JWT_ISSUER=rag-services               # Token issuer
JWT_AUDIENCE=rag-api                  # Token audience

# Security
REQUIRE_HTTPS=true                    # Enforce HTTPS in production
CORS_ORIGIN=http://localhost:3103     # Allowed CORS origins
RATE_LIMIT_MAX=100                    # Max requests per window
RATE_LIMIT_WINDOW=15                  # Window in minutes
```

### Validation at Startup

```typescript
// src/server.ts
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

logger.info('JWT authentication configured', {
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  algorithm: process.env.JWT_ALGORITHM || 'HS256',
});
```

---

## Related Documentation

- **[src/middleware/auth.ts](./src/middleware/auth.ts)** - Complete middleware implementation
- **[src/__tests__/unit/auth.test.ts](./src/__tests__/unit/auth.test.ts)** - Authentication tests
- **[API-DESIGN-V1.md](./API-DESIGN-V1.md)** - API design with auth requirements
- **[openapi.yaml](./openapi.yaml)** - OpenAPI spec with security schemes
- **[CODE-REVIEW-RAG-SERVICES-2025-11-01.md](./CODE-REVIEW-RAG-SERVICES-2025-11-01.md)** - Security review

---

**Prepared by:** Claude Code
**Review Status:** Ready for security audit
**Last Updated:** 2025-11-01
