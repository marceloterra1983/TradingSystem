import './env.js';
import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.WEBSCRAPER_DATABASE_URL
    }
  }
});

prisma.$use(async (params, next) => {
  const start = performance.now();
  const result = await next(params);
  const duration = performance.now() - start;
  if (duration > 200) {
    logger.warn({ model: params.model, action: params.action, duration }, 'Slow database query detected');
  }
  return result;
});

export async function testDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}

export async function disconnect() {
  await prisma.$disconnect();
}

export default prisma;
