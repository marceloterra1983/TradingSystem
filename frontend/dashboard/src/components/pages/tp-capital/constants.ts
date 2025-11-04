/**
 * TP-Capital Constants
 * 
 * Centralized constants for configuration and options
 * 
 * @module tp-capital/constants
 */

export const LIMIT_OPTIONS = [10, 20, 50, 100, 200] as const;

export const DEFAULT_LIMIT = 10;

export const FALLBACK_SAMPLE_SIGNALS = [
  {
    id: 1,
    ts: Date.now() - 3600000,
    channel: 'TP Capital (exemplo)',
    signal_type: 'Swing Trade',
    asset: 'PETR4',
    buy_min: 28.5,
    buy_max: 29.0,
    target_1: 30.0,
    target_2: 31.0,
    target_final: 32.0,
    stop: 27.5,
    raw_message: 'Exemplo de sinal - serviço offline',
    source: 'telegram',
    ingested_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    ts: Date.now() - 7200000,
    channel: 'TP Capital (exemplo)',
    signal_type: 'Day Trade',
    asset: 'VALE3',
    buy_min: 70.0,
    buy_max: 71.0,
    target_1: 72.0,
    target_2: 73.0,
    target_final: 74.0,
    stop: 69.0,
    raw_message: 'Exemplo de sinal - serviço offline',
    source: 'telegram',
    ingested_at: new Date(Date.now() - 7200000).toISOString(),
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
];
