import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

export type LatencyOperation = 'query' | 'ingestion';

export interface LatencySample {
  collection: string;
  operation: LatencyOperation;
  durationMs: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface LatencyAlert {
  id: string;
  collection: string;
  operation: LatencyOperation;
  breachRatio: number;
  thresholdMs: number;
  sampleSize: number;
  p95DurationMs: number;
  triggeredAt: string;
  metadata?: Record<string, unknown>;
}

export interface LatencyMonitorOptions {
  enabled?: boolean;
  thresholdMs?: number;
  breachRatio?: number;
  minSamples?: number;
  sampleSize?: number;
  cooldownMs?: number;
  alertsFilePath?: string | null;
}

const DEFAULT_ALERTS_FILE = path.join(process.cwd(), 'data', 'latency-alerts.jsonl');

/**
 * Tracks request latency statistics and emits alerts when thresholds are exceeded.
 */
export class LatencyMonitor {
  private readonly enabled: boolean;
  private readonly thresholdMs: number;
  private readonly breachRatio: number;
  private readonly minSamples: number;
  private readonly sampleSize: number;
  private readonly cooldownMs: number;
  private readonly alertsFilePath?: string | null;

  private readonly samples = new Map<string, LatencySample[]>();
  private readonly lastAlertAt = new Map<string, number>();
  private readonly alerts: LatencyAlert[] = [];
  private readonly alertsLimit = 200;

  constructor(options: LatencyMonitorOptions = {}) {
    this.enabled = options.enabled ?? (process.env.RAG_LATENCY_GUARD_ENABLED !== 'false');
    this.thresholdMs = options.thresholdMs ?? parseInt(process.env.RAG_LATENCY_GUARD_MS || '400', 10);
    this.breachRatio = options.breachRatio ?? parseFloat(process.env.RAG_LATENCY_BREACH_RATIO || '0.05');
    this.minSamples = options.minSamples ?? parseInt(process.env.RAG_LATENCY_MIN_SAMPLES || '20', 10);
    this.sampleSize = options.sampleSize ?? parseInt(process.env.RAG_LATENCY_SAMPLE_SIZE || '100', 10);
    this.cooldownMs = options.cooldownMs ?? parseInt(process.env.RAG_LATENCY_ALERT_COOLDOWN_MS || '300000', 10); // 5 minutes
    this.alertsFilePath = options.alertsFilePath ?? DEFAULT_ALERTS_FILE;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getConfig(): Record<string, number | boolean> {
    return {
      enabled: this.enabled,
      thresholdMs: this.thresholdMs,
      breachRatio: this.breachRatio,
      minSamples: this.minSamples,
      sampleSize: this.sampleSize,
      cooldownMs: this.cooldownMs,
    };
  }

  public recordSample(sample: LatencySample): void {
    if (!this.enabled || !sample.collection) {
      return;
    }

    const key = this.getBucketKey(sample);
    const bucket = this.samples.get(key) ?? [];
    const timestamp = sample.timestamp ?? new Date().toISOString();

    bucket.push({ ...sample, timestamp });
    if (bucket.length > this.sampleSize) {
      bucket.shift();
    }

    this.samples.set(key, bucket);
    this.evaluateBucket(key, bucket, sample.metadata);
  }

  public getAlerts(filter: {
    collection?: string;
    operation?: LatencyOperation;
    since?: number;
  } = {}): LatencyAlert[] {
    return this.alerts
      .filter((alert) => {
        if (filter.collection && alert.collection !== filter.collection) {
          return false;
        }
        if (filter.operation && alert.operation !== filter.operation) {
          return false;
        }
        if (filter.since && Date.parse(alert.triggeredAt) < filter.since) {
          return false;
        }
        return true;
      })
      .sort((a, b) => Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt));
  }

  private getBucketKey(sample: LatencySample): string {
    return `${sample.operation}:${sample.collection}`;
  }

  private evaluateBucket(key: string, bucket: LatencySample[], metadata?: Record<string, unknown>): void {
    if (bucket.length < this.minSamples) {
      return;
    }

    const breaches = bucket.filter((sample) => sample.durationMs >= this.thresholdMs).length;
    const ratio = breaches / bucket.length;
    if (ratio < this.breachRatio) {
      return;
    }

    const now = Date.now();
    const lastAlert = this.lastAlertAt.get(key) ?? 0;
    if (now - lastAlert < this.cooldownMs) {
      return;
    }

    const sortedDurations = bucket
      .map((sample) => sample.durationMs)
      .sort((a, b) => a - b);
    const p95Index = Math.max(0, Math.floor(sortedDurations.length * 0.95) - 1);
    const p95DurationMs = sortedDurations[p95Index] ?? sortedDurations[sortedDurations.length - 1];

    const [operation, collection] = key.split(':') as [LatencyOperation, string];
    const alert: LatencyAlert = {
      id: randomUUID(),
      collection,
      operation,
      breachRatio: parseFloat(ratio.toFixed(3)),
      thresholdMs: this.thresholdMs,
      sampleSize: bucket.length,
      p95DurationMs,
      triggeredAt: new Date(now).toISOString(),
      metadata,
    };

    this.alerts.push(alert);
    if (this.alerts.length > this.alertsLimit) {
      this.alerts.shift();
    }

    this.lastAlertAt.set(key, now);
    logger.warn('Latency guard alert triggered', {
      collection: alert.collection,
      operation: alert.operation,
      breachRatio: alert.breachRatio,
      sampleSize: alert.sampleSize,
      p95DurationMs: alert.p95DurationMs,
    });

    if (this.alertsFilePath) {
      this.persistAlert(alert).catch((error) => {
        logger.warn('Failed to persist latency alert', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }
  }

  private async persistAlert(alert: LatencyAlert): Promise<void> {
    if (!this.alertsFilePath) {
      return;
    }

    const dir = path.dirname(this.alertsFilePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(this.alertsFilePath, `${JSON.stringify(alert)}\n`, 'utf-8');
  }
}

export const latencyMonitor = new LatencyMonitor();
