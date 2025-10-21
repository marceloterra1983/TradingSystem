import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import '../../../../shared/config/load-env.js';
import dotenv from 'dotenv';
import { mockedMetrics, resetDatabase, prisma } from './testUtils.js';
import { disconnect } from '../config/database.js';

process.env.NODE_ENV = 'test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../../');
dotenv.config({ path: path.join(projectRoot, '.env.test'), override: true });

const axiosMock = {
  post: vi.fn(),
  get: vi.fn(),
  create: () => axiosMock,
  isAxiosError: vi.fn(error => Boolean(error?.isAxiosError))
};

vi.mock('axios', () => ({
  default: axiosMock,
  post: axiosMock.post,
  get: axiosMock.get,
  create: axiosMock.create,
  isAxiosError: axiosMock.isAxiosError
}));

vi.mock('../config/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis()
  }
}));

vi.mock('../metrics.js', () => mockedMetrics);

beforeAll(async () => {
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'inherit'
  });
  await resetDatabase();
});

afterEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
});

afterAll(async () => {
  await disconnect();
});

Object.assign(globalThis, {
  prisma,
  resetDatabase,
  mockedMetrics
});
