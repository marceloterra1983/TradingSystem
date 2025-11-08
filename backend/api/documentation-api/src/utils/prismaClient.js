import { PrismaClient } from "@prisma/client";
import { config } from "../config/appConfig.js";
import { logger } from "../config/logger.js";

let prisma;
let connectingPromise = null;

function buildPrismaClient() {
  if (!config.postgres.url) {
    throw new Error(
      "DOCUMENTATION_DATABASE_URL must be configured to use the postgres strategy",
    );
  }

  // Parse connection string and add connection pooling parameters
  const url = new URL(config.postgres.url);

  // Add connection pooling parameters if not already present
  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set(
      "connection_limit",
      process.env.DATABASE_CONNECTION_LIMIT || "10",
    );
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set(
      "pool_timeout",
      process.env.DATABASE_POOL_TIMEOUT || "10",
    );
  }
  if (!url.searchParams.has("connect_timeout")) {
    url.searchParams.set(
      "connect_timeout",
      process.env.DATABASE_CONNECT_TIMEOUT || "10",
    );
  }

  const optimizedUrl = url.toString();

  logger.info("Initializing Prisma with connection pooling", {
    connectionLimit: url.searchParams.get("connection_limit"),
    poolTimeout: url.searchParams.get("pool_timeout"),
    connectTimeout: url.searchParams.get("connect_timeout"),
  });

  return new PrismaClient({
    log: process.env.PRISMA_LOG_LEVEL
      ? process.env.PRISMA_LOG_LEVEL.split(",")
      : ["error"],
    datasources: {
      db: {
        url: optimizedUrl,
      },
    },
  });
}

export function getPrismaClient() {
  if (!prisma) {
    prisma = buildPrismaClient();
  }

  return prisma;
}

export async function ensurePrismaConnection() {
  const client = getPrismaClient();

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = client
    .$connect()
    .then(() => {
      logger.info("Connected to PostgreSQL via Prisma");
    })
    .catch((error) => {
      logger.error(
        { err: error },
        "Failed to connect to PostgreSQL via Prisma",
      );
      throw error;
    })
    .finally(() => {
      connectingPromise = null;
    });

  return connectingPromise;
}

export async function disconnectPrismaClient() {
  if (!prisma) {
    return;
  }

  await prisma.$disconnect();
  prisma = null;
}
