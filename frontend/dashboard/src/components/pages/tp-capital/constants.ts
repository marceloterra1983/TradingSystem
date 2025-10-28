import { SignalRow, LogEntry } from './types';

export const LIMIT_OPTIONS = [10, 25, 50, 100, 250, 500, 1000];
export const LOG_LIMIT_OPTIONS = [50, 100, 200];

export const SAMPLE_SIGNALS: SignalRow[] = [
  {
    ts: '2025-01-10T13:45:00.000Z',
    channel: 'tp-capital-premium',
    signal_type: 'Swing Trade',
    asset: 'PETR4',
    buy_min: 32.15,
    buy_max: 32.45,
    target_1: 32.9,
    target_2: 33.25,
    target_final: 33.7,
    stop: 31.6,
    raw_message: 'Compra em PETR4 entre 32,15 e 32,45 com alvos em 32,90 / 33,25 / 33,70',
    source: 'sample',
    ingested_at: '2025-01-10T13:45:03.000Z',
  },
  {
    ts: '2025-01-10T14:05:00.000Z',
    channel: 'tp-capital-premium',
    signal_type: 'Day Trade',
    asset: 'WINJ25',
    buy_min: 130450,
    buy_max: 130520,
    target_1: 130700,
    target_2: 130820,
    target_final: 130980,
    stop: 130260,
    raw_message: 'Compra em WINJ25 acima de 130.450 com proteção curta, alvos 130.700/130.820/130.980',
    source: 'sample',
    ingested_at: '2025-01-10T14:05:04.000Z',
  },
];

export const SAMPLE_LOGS: LogEntry[] = [
  {
    timestamp: '2025-01-10T14:09:12.000Z',
    level: 'warn',
    message: 'API de sinais indisponível. Ativando dados de exemplo.',
    context: { service: 'tp-capital-signals', hint: 'Verifique se o backend está rodando na porta 3201.' },
  },
  {
    timestamp: '2025-01-10T14:09:11.000Z',
    level: 'info',
    message: 'Nenhuma atualização em tempo real. Aguardando serviço retornar.',
  },
];

