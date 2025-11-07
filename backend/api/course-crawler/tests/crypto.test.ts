import { describe, expect, it } from 'vitest';
import { encryptSecret, decryptSecret } from '../src/lib/crypto.js';

describe('crypto helpers', () => {
  it('encrypts and decrypts secrets', () => {
    const cipher = encryptSecret('testing');
    expect(decryptSecret(cipher)).toBe('testing');
  });
});
