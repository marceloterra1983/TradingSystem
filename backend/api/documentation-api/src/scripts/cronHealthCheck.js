import cron from 'node-cron';
import path from 'path';
import { promises as fs } from 'fs';
import pino from 'pino';
import { fileURLToPath } from 'url';
import DocsHealthChecker from '../services/docsHealthChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../../');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

class HealthCheckCron {
  constructor(options = {}) {
    this.specsDir = options.specsDir || path.join(projectRoot, 'docs/spec');
    this.outputDir = options.outputDir || path.join(projectRoot, 'docs/public');
    this.historyFile = path.join(this.outputDir, 'health-history.json');
    this.schedule = options.schedule || '*/15 * * * *';
    this.maxHistory = options.maxHistory || 100;
    this.notifyOnError = options.notifyOnError || false;
    this.healthChecker = new DocsHealthChecker(this.specsDir);
    this.history = [];
  }

  async start() {
    logger.info({ specsDir: this.specsDir, schedule: this.schedule }, 'Starting documentation health check cron');

    await fs.mkdir(this.outputDir, { recursive: true });
    await this.loadHistory();

    cron.schedule(this.schedule, async () => {
      try {
        await this.runHealthCheck();
      } catch (error) {
        logger.error({ err: error }, 'Health check cron job failed');
        if (this.notifyOnError) {
          await this.notifyError(error);
        }
      }
    });

    await this.runHealthCheck();
  }

  async runHealthCheck() {
    logger.info('Running scheduled documentation health check');

    try {
      const results = await this.healthChecker.checkHealth();

      const check = {
        timestamp: new Date().toISOString(),
        ...results,
      };

      await this.updateHistory(check);

      await fs.writeFile(path.join(this.outputDir, 'status.json'), JSON.stringify(check, null, 2));

      logger.info({ status: results.status }, 'Health check completed');
      return check;
    } catch (error) {
      logger.error({ err: error }, 'Health check failed');
      throw error;
    }
  }

  async loadHistory() {
    try {
      const history = await fs.readFile(this.historyFile, 'utf8');
      this.history = JSON.parse(history);
    } catch (_error) {
      logger.info('No existing health check history found');
      this.history = [];
    }
  }

  async updateHistory(check) {
    this.history.unshift(check);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }

    await fs.writeFile(this.historyFile, JSON.stringify(this.history, null, 2));
  }

  async notifyError(error) {
    logger.warn({ err: error }, 'Error notification not implemented');
  }

  async getHealthHistory() {
    return this.history;
  }

  async getStatusSummary() {
    if (!this.history.length) {
      return {
        status: 'unknown',
        lastCheck: null,
        checksLastDay: 0,
        uptime: 0,
      };
    }

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const checksLastDay = this.history.filter((check) => new Date(check.timestamp) > dayAgo);

    const uptimeChecks = checksLastDay.filter((check) => check.status === 'healthy');

    return {
      status: this.history[0].status,
      lastCheck: this.history[0].timestamp,
      checksLastDay: checksLastDay.length,
      uptime: checksLastDay.length ? (uptimeChecks.length / checksLastDay.length) * 100 : 0,
    };
  }
}

export default HealthCheckCron;

if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new HealthCheckCron({
    schedule: process.env.HEALTH_CHECK_SCHEDULE || '*/15 * * * *',
    notifyOnError: process.env.NOTIFY_ON_ERROR === 'true',
  });

  checker.start().catch((error) => {
    logger.error({ err: error }, 'Failed to start health check cron');
    process.exit(1);
  });
}
