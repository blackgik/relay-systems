import { isWebhookAuthorized } from './webhook-auth';

describe('isWebhookAuthorized', () => {
  const ENV = 'TEST_WEBHOOK_SECRET';
  const savedSecret = process.env[ENV];

  afterEach(() => {
    if (savedSecret === undefined) delete process.env[ENV];
    else process.env[ENV] = savedSecret;
  });

  it('accepts the configured secret and rejects wrong or missing ones', () => {
    process.env[ENV] = 's3cr3t-value';
    expect(isWebhookAuthorized({ 'x-webhook-secret': 's3cr3t-value' }, ENV, 'production')).toBe(true);
    expect(isWebhookAuthorized({ 'x-webhook-secret': 'wrong' }, ENV, 'production')).toBe(false);
    expect(isWebhookAuthorized({}, ENV, 'production')).toBe(false);
  });

  it('fails closed in production when no secret is configured', () => {
    delete process.env[ENV];
    expect(isWebhookAuthorized({ 'x-webhook-secret': 'anything' }, ENV, 'production')).toBe(false);
  });

  it('stays open in local development when no secret is configured', () => {
    delete process.env[ENV];
    expect(isWebhookAuthorized({}, ENV, 'development')).toBe(true);
  });
});
