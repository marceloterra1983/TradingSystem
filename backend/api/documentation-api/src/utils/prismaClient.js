import { PrismaClient } from '@prisma/client';
import { config } from '../config/appConfig.js';
import { logger } from '../config/logger.js';

let prisma;
let connectingPromise = null;

function buildPrismaClient() {
  if (!config.postgres.url) {
    throw new Error('DOCUMENTATION_DATABASE_URL must be configured to use the postgres strategy');
  }

  return new PrismaClient({
    log: process.env.PRISMA_LOG_LEVEL ? process.env.PRISMA_LOG_LEVEL.split(',') : ['error'],
    datasources: {
      db: {
        url: config.postgres.url
      }
    }
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

  connectingPromise = client.$connect().then(() => {
    logger.info('Connected to PostgreSQL via Prisma');
  }).catch((error) => {
    logger.error({ err: error }, 'Failed to connect to PostgreSQL via Prisma');
    throw error;
  }).finally(() => {
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
