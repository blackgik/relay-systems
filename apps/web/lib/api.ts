const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Access tokens live 15 minutes. The auth provider registers how to get a
// fresh one; a request that comes back 401 renews once and retries, so a page
// left open never gets stuck on "Invalid token".
type Renew = () => Promise<string | null>;
let renew: Renew | null = null;
let renewing: Promise<string | null> | null = null;

export function setTokenRenewer(fn: Renew | null) {
  renew = fn;
}

/** One renewal at a time, however many requests failed together. */
export function renewToken(): Promise<string | null> {
  if (!renew) return Promise.resolve(null);
  renewing ??= renew().finally(() => {
    renewing = null;
  });
  return renewing;
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {}
): Promise<T> {
  const send = (token: string | null | undefined) =>
    fetch(`${BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  let res = await send(opts.token);
  if (res.status === 401 && opts.token && !path.startsWith('/auth/')) {
    const fresh = await renewToken();
    if (fresh) res = await send(fresh);
  }
  const data = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const message =
      typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(', ')
          : 'Request failed';
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

export function apiBase() {
  return BASE;
}
