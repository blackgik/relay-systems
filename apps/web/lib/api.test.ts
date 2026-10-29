import { ApiError, api, setTokenRenewer } from './api';

const reply = (status: number, body: unknown) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);

describe('api token renewal', () => {
  afterEach(() => setTokenRenewer(null));

  it('renews an expired token once and retries the request with the new one', async () => {
    const fetchMock = jest
      .fn()
      .mockReturnValueOnce(reply(401, { message: 'Invalid token' }))
      .mockReturnValueOnce(reply(200, { ok: true }));
    global.fetch = fetchMock as never;
    const renewer = jest.fn().mockResolvedValue('fresh');
    setTokenRenewer(renewer);

    await expect(api('/trips', { token: 'stale' })).resolves.toEqual({ ok: true });
    expect(renewer).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh');
  });

  it('shares one renewal between requests that fail together', async () => {
    global.fetch = jest.fn((_url: string, init: RequestInit) =>
      (init.headers as Record<string, string>).Authorization === 'Bearer fresh' ? reply(200, 1) : reply(401, {})
    ) as never;
    const renewer = jest.fn(() => new Promise<string>((r) => setTimeout(() => r('fresh'), 5)));
    setTokenRenewer(renewer);

    await Promise.all([api('/a', { token: 'stale' }), api('/b', { token: 'stale' })]);
    expect(renewer).toHaveBeenCalledTimes(1);
  });

  it('surfaces the 401 when renewal fails, and never renews for auth calls', async () => {
    global.fetch = jest.fn(() => reply(401, { message: 'Invalid token' })) as never;
    setTokenRenewer(jest.fn().mockResolvedValue(null));
    await expect(api('/trips', { token: 'stale' })).rejects.toBeInstanceOf(ApiError);

    const renewer = jest.fn();
    setTokenRenewer(renewer);
    await expect(api('/auth/refresh', { method: 'POST', token: 'x' })).rejects.toThrow('Invalid token');
    expect(renewer).not.toHaveBeenCalled();
  });
});
