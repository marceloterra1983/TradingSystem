const DEFAULT_MAX_LOGS = Number(process.env.LOG_HISTORY_SIZE || 200);
const MAX_LOGS = Number.isFinite(DEFAULT_MAX_LOGS) && DEFAULT_MAX_LOGS > 0 ? DEFAULT_MAX_LOGS : 200;
const logs = [];

export function addLogEntry(entry) {
  logs.push(entry);
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }
}

export function getLogs({ limit, level } = {}) {
  const normalizedLevel = level ? String(level).toLowerCase() : undefined;
  const candidate = normalizedLevel ? logs.filter((log) => log.level === normalizedLevel) : logs;
  const normalizedLimit = limit && Number.isFinite(Number(limit)) ? Number(limit) : undefined;
  const subset = normalizedLimit ? candidate.slice(-normalizedLimit) : candidate;
  return subset.slice().reverse();
}
