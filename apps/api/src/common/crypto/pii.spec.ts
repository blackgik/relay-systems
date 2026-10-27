import { decrypt, encrypt, fingerprint, last4 } from './pii';

describe('pii', () => {
  beforeAll(() => {
    process.env.KYC_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  });

  it('round-trips and never stores the plaintext', () => {
    const sealed = encrypt('22212345678');
    expect(sealed).not.toContain('22212345678');
    expect(decrypt(sealed)).toBe('22212345678');
  });

  it('uses a fresh IV per encryption', () => {
    expect(encrypt('22212345678')).not.toBe(encrypt('22212345678'));
  });

  it('rejects tampered ciphertext', () => {
    const [v, iv, tag, data] = encrypt('22212345678').split(':');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 1;
    expect(() => decrypt([v, iv, tag, flipped.toString('base64')].join(':'))).toThrow();
  });

  it('fingerprints are stable and scoped by kind', () => {
    expect(fingerprint('BVN', '22212345678')).toBe(fingerprint('BVN', '22212345678'));
    expect(fingerprint('BVN', '22212345678')).not.toBe(fingerprint('NIN', '22212345678'));
    expect(last4('22212345678')).toBe('5678');
  });
});
