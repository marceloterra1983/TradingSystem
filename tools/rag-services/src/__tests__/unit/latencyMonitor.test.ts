import { LatencyMonitor } from '../../services/latencyMonitor';

describe('LatencyMonitor', () => {
  it('emits alert when breach ratio is exceeded', () => {
    const monitor = new LatencyMonitor({
      enabled: true,
      thresholdMs: 100,
      breachRatio: 0.2,
      minSamples: 5,
      sampleSize: 10,
      cooldownMs: 0,
      alertsFilePath: null,
    });

    // 4 fast samples, 1 slow sample (20% over threshold)
    for (let i = 0; i < 4; i += 1) {
      monitor.recordSample({
        collection: 'docs',
        operation: 'query',
        durationMs: 50,
      });
    }

    monitor.recordSample({
      collection: 'docs',
      operation: 'query',
      durationMs: 250,
    });

    const alerts = monitor.getAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].collection).toBe('docs');
    expect(alerts[0].operation).toBe('query');
    expect(alerts[0].breachRatio).toBeGreaterThanOrEqual(0.2);
  });

  it('respects cooldown between alerts', () => {
    const monitor = new LatencyMonitor({
      enabled: true,
      thresholdMs: 10,
      breachRatio: 0.5,
      minSamples: 2,
      sampleSize: 5,
      cooldownMs: 1000,
      alertsFilePath: null,
    });

    monitor.recordSample({
      collection: 'docs',
      operation: 'ingestion',
      durationMs: 20,
    });
    monitor.recordSample({
      collection: 'docs',
      operation: 'ingestion',
      durationMs: 25,
    });

    // Second set should be ignored because of cooldown
    monitor.recordSample({
      collection: 'docs',
      operation: 'ingestion',
      durationMs: 30,
    });
    monitor.recordSample({
      collection: 'docs',
      operation: 'ingestion',
      durationMs: 40,
    });

    const alerts = monitor.getAlerts({ operation: 'ingestion' });
    expect(alerts).toHaveLength(1);
  });
});
