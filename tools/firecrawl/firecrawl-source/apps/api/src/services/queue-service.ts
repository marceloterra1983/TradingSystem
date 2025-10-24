import { Queue } from "bullmq";
import { logger } from "../lib/logger";
import IORedis from "ioredis";
import { BullMQOtel } from "bullmq-otel";
import type { DeepResearchServiceOptions } from "../lib/deep-research/deep-research-service";

let extractQueue: Queue;
let loggingQueue: Queue;
let indexQueue: Queue;
let deepResearchQueue: Queue;
let generateLlmsTxtQueue: Queue;
let billingQueue: Queue;
let precrawlQueue: Queue;
let redisConnection: IORedis;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
    });
    redisConnection.on("connect", () => logger.info("Redis connected"));
    redisConnection.on("reconnecting", () => logger.warn("Redis reconnecting"));
    redisConnection.on("error", err => logger.warn("Redis error", { err }));
  }
  return redisConnection;
}

const extractQueueName = "{extractQueue}";
const generateLlmsTxtQueueName = "{generateLlmsTxtQueue}";
const deepResearchQueueName = "{deepResearchQueue}";
const billingQueueName = "{billingQueue}";
export const precrawlQueueName = "{precrawlQueue}";

export function getExtractQueue() {
  if (!extractQueue) {
    extractQueue = new Queue(extractQueueName, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: {
          age: 90000, // 25 hours
        },
        removeOnFail: {
          age: 90000, // 25 hours
        },
      },
      telemetry: new BullMQOtel("firecrawl-bullmq"),
    });
  }
  return extractQueue;
}

export function getGenerateLlmsTxtQueue() {
  if (!generateLlmsTxtQueue) {
    generateLlmsTxtQueue = new Queue(generateLlmsTxtQueueName, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: {
          age: 90000, // 25 hours
        },
        removeOnFail: {
          age: 90000, // 25 hours
        },
      },
      telemetry: new BullMQOtel("firecrawl-bullmq"),
    });
  }
  return generateLlmsTxtQueue;
}

export function getDeepResearchQueue() {
  if (!deepResearchQueue) {
    deepResearchQueue = new Queue<DeepResearchServiceOptions>(
      deepResearchQueueName,
      {
        connection: getRedisConnection(),
        defaultJobOptions: {
          removeOnComplete: {
            age: 90000, // 25 hours
          },
          removeOnFail: {
            age: 90000, // 25 hours
          },
        },
        telemetry: new BullMQOtel("firecrawl-bullmq"),
      },
    );
  }
  return deepResearchQueue;
}

export function getBillingQueue() {
  if (!billingQueue) {
    billingQueue = new Queue(billingQueueName, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: {
          age: 60, // 1 minute
        },
        removeOnFail: {
          age: 3600, // 1 hour
        },
      },
      telemetry: new BullMQOtel("firecrawl-bullmq"),
    });
  }
  return billingQueue;
}

export function getPrecrawlQueue() {
  if (!precrawlQueue) {
    precrawlQueue = new Queue(precrawlQueueName, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: {
          age: 24 * 60 * 60, // 1 day
        },
        removeOnFail: {
          age: 24 * 60 * 60, // 1 day
        },
      },
      telemetry: new BullMQOtel("firecrawl-bullmq"),
    });
  }
  return precrawlQueue;
}
