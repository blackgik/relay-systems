import { createHash, timingSafeEqual } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

// Webhook caller authentication.
//
// Neither webhook provider is signature-verified yet (the PSP route only
// accepts the mock provider; KYC providers are not integrated), so until
// real provider signatures land, webhooks authenticate with a shared
// secret in the `x-webhook-secret` header. Rules:
//   - Secret configured  → the header must match it (timing-safe).
//   - No secret + production → reject. Fail closed, never open.
//   - No secret + local dev  → allow, so `yarn dev` keeps working.

function secretsEqual(a: string, b: string): boolean {
  // Hash both sides so timingSafeEqual always compares equal-length buffers.
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isWebhookAuthorized(
  headers: Record<string, string | string[] | undefined>,
  envName: string,
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  const secret = process.env[envName];
  if (!secret) return nodeEnv !== 'production';
  const presented = headers['x-webhook-secret'];
  return typeof presented === 'string' && secretsEqual(presented, secret);
}

export function assertWebhookAuthorized(
  headers: Record<string, string | string[] | undefined>,
  envName: string
): void {
  if (!isWebhookAuthorized(headers, envName)) {
    throw new UnauthorizedException('Webhook authentication failed');
  }
}
