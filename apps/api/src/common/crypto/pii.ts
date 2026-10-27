import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

// Field-level protection for government identifiers and bank numbers.
// - encrypt/decrypt: AES-256-GCM, so a database dump alone reveals nothing.
// - fingerprint: keyed HMAC, so we can enforce "one BVN, one account" with a
//   unique index without storing anything reversible.

let warned = false;

function key(): Buffer {
  const raw = process.env.KYC_ENCRYPTION_KEY;
  if (raw) {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length !== 32) throw new Error('KYC_ENCRYPTION_KEY must be 32 bytes, base64-encoded');
    return buf;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('KYC_ENCRYPTION_KEY is required in production');
  }
  if (!warned) {
    warned = true;
    // eslint-disable-next-line no-console
    console.warn('KYC_ENCRYPTION_KEY not set — deriving a dev key from JWT_SECRET');
  }
  return createHash('sha256').update(`kyc:${process.env.JWT_SECRET ?? 'relay-dev-secret'}`).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

export function decrypt(payload: string): string {
  const [version, iv, tag, data] = payload.split(':');
  if (version !== 'v1') throw new Error('Unknown ciphertext version');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}

export function fingerprint(kind: string, value: string): string {
  return createHmac('sha256', key()).update(`${kind}:${value}`).digest('hex');
}

export function last4(value: string): string {
  return value.slice(-4);
}
