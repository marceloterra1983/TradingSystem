import crypto from 'node:crypto';

export function createStableId(prefix: string, input: string): string {
  const hash = crypto.createHash('sha256').update(input).digest('hex').slice(0, 12);
  return `${prefix}_${hash}`;
}
