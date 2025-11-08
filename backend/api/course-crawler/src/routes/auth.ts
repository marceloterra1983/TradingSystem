import type { Express, Request, Response } from "express";
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { validateBody } from "../middleware/validation.js";
import { generateToken } from "../middleware/auth.js";
import { env } from "../config/environment.js";

const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Simple in-memory user store for demo purposes
 * In production, this should be a proper database table
 */
const users = new Map<
  string,
  { id: string; username: string; passwordHash: string }
>();

/**
 * Initialize default admin user if not exists
 */
async function initializeDefaultUser() {
  const adminUsername = env.COURSE_CRAWLER_ADMIN_USERNAME || "admin";
  const adminPassword = env.COURSE_CRAWLER_ADMIN_PASSWORD || "changeme";

  if (!users.has(adminUsername)) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    users.set(adminUsername, {
      id: "admin-001",
      username: adminUsername,
      passwordHash,
    });
    console.log(`[Auth] ✅ Default admin user initialized: ${adminUsername}`);
  }
}

export function registerAuthRoutes(app: Express) {
  const router = Router();

  // Initialize default user on startup
  initializeDefaultUser().catch((error) => {
    console.error("[Auth] ❌ Failed to initialize default user:", error);
  });

  /**
   * POST /auth/login
   * Authenticate user and return JWT token
   */
  router.post(
    "/login",
    validateBody(LoginSchema),
    async (req: Request, res: Response) => {
      try {
        const { username, password } = req.body;

        const user = users.get(username);
        if (!user) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = generateToken({
          userId: user.id,
          username: user.username,
        });

        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
          },
        });
      } catch (error) {
        console.error("[Auth] ❌ Login error:", error);
        res.status(500).json({ error: "Login failed" });
      }
    },
  );

  /**
   * POST /auth/verify
   * Verify token validity (for client-side checks)
   */
  router.post("/verify", (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res
        .status(401)
        .json({ valid: false, error: "Missing authorization header" });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res
        .status(401)
        .json({ valid: false, error: "Invalid authorization header format" });
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, env.COURSE_CRAWLER_JWT_SECRET);
      res.json({ valid: true, user: decoded });
    } catch (_error) {
      res.status(401).json({ valid: false, error: "Invalid or expired token" });
    }
  });

  app.use("/auth", router);
}
