import promClient from 'prom-client';

// Counter: Total messages processed from Gateway
export const messagesProcessed = new promClient.Counter({
  name: 'tpcapital_gateway_messages_processed_total',
  help: 'Total messages processed from Gateway database',
  labelNames: ['status'] // Status: published, duplicate, failed, parse_failed
});

// Gauge: Polling lag in seconds
export const pollingLagSeconds = new promClient.Gauge({
  name: 'tpcapital_gateway_polling_lag_seconds',
  help: 'Time since last successful poll in seconds'
});

// Histogram: Message processing duration
export const processingDuration = new promClient.Histogram({
  name: 'tpcapital_gateway_processing_duration_seconds',
  help: 'Time to process a single message',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5] // 10ms to 5s
});

// Gauge: Messages waiting to be processed
export const messagesWaiting = new promClient.Gauge({
  name: 'tpcapital_gateway_messages_waiting',
  help: 'Number of messages in received status waiting to be processed'
});

// Counter: Polling errors
export const pollingErrors = new promClient.Counter({
  name: 'tpcapital_gateway_polling_errors_total',
  help: 'Total polling errors',
  labelNames: ['type'] // Type: connection, database, etc.
});

// Export all metrics as a single object for easy injection
export const gatewayMetrics = {
  messagesProcessed,
  pollingLagSeconds,
  processingDuration,
  messagesWaiting,
  pollingErrors
};
